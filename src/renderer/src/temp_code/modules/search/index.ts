import { defineStore } from 'pinia'
import { ref, shallowRef, computed, triggerRef } from 'vue'
import type { AppItem, AttachedInfo, SearchModule } from '@/temp_code/typings/search'

import { loadAppIcons } from '@/temp_code/utils/search'
import { PinyinSearch } from '@/utils/pinyinSearch'

/** 动态导入所有模块 */
const moduleFiles = import.meta.glob<{ [key: string]: any }>('./modules/*.ts', { eager: true })
/** 模块列表 */
export const modules: Record<string, SearchModule> = {}
// 实例化所有导入的模块
for (const path in moduleFiles) {
  const moduleName = path.replace('./modules/', '').replace('.ts', '')
  const moduleExports = moduleFiles[path]

  // 查找模块导出的类（通常是首字母大写的导出）
  for (const exportName in moduleExports) {
    const ExportClass = moduleExports[exportName]
    // 检查是否是类构造函数
    if (
      typeof ExportClass === 'function' &&
      /^[A-Z]/.test(exportName)
    ) {
      const instance = new ExportClass()
      // 判断是否实现了 SearchModule 的必要方法
      if (
        instance &&
        typeof instance.getItems === 'function' &&
        typeof instance.deleteItem === 'function' &&
        typeof instance.addItem === 'function'
      ) {
        const oldGetItems = modules[moduleName].getItems
        modules[moduleName].getItems = async () => {
          const items = await oldGetItems()
          const newItems = items.map(item => ({ ...item, category: moduleName }))
          return newItems
        }
        modules[moduleName] = instance
        break // 每个文件只取第一个符合条件的类
      }
    }
  }
}

/**
 * 搜索管理 Store（优化版）
 * 直接在 items 中搜索，不使用分类
 */
export const useSearchStore = defineStore('search', () => {
  // ==================== 状态 ====================
  /** 所有搜索项（初始化时加载） */
  const searchItems = shallowRef<AppItem[]>([])
  /** 搜索结果列表（每次搜索后更新） */
  const searchResults = shallowRef<AppItem[]>([])

  /** 当前搜索文本 */
  const searchText = ref('')
  /** 是否已初始化（防止重复初始化） */
  const isInitialized = ref(false)

  // ==================== 计算属性 ====================
  /** 是否有结果 */
  const hasResults = computed(() => searchResults.value.length > 0)

  /** 结果总数 */
  const totalResults = computed(() => searchResults.value.length)

  /** 将items转为category格式 */
  const categories = computed(() => {
    // 根据 item 中的cateory进行分组
    const categorieMap = new Map()
    for (const item of searchResults.value) {
      const category = item.category || 'default'
      if (!categorieMap.has(category)) {
        categorieMap.set(category, [])
      }
      const items = categorieMap.get(category)
      items.push(item)
      categorieMap.set(category, items)
    }

    const categories: any[] = []
    Array.from(categorieMap.entries()).map(([category, items]) => {
      const module = modules[category || '']
      if (!module) return
      categories.push({
        id: category,
        name: module.name,
        isDragEnabled: module.isDragEnabled,
        maxDisplayCount: module.maxDisplayCount,
        isExpanded: module.isExpanded,
        items: items
      })
    })
  })

  // ==================== 核心方法 ====================

  /**
   * 更新搜索项数据（在菜单中固定或删除，或者在最近使用添加）
   */
  const initItems = async () => {
    // 重新获取所有模块的搜索项
    const items: AppItem[] = []
    for (const module of Object.values(modules)) {
      items.push(...await module.getItems())
    }

    // 加载图标
    const itemsWithIcons = await loadAppIcons(items)
    searchItems.value = itemsWithIcons
    triggerRef(searchItems)

    // 重新执行搜索
    performSearch(searchText.value)
  }

  const getItemModule = (item: AppItem) => {
    return modules[item.category || '']
  }

  const deleteItem = async (item: AppItem) => {
    const index = searchItems.value.findIndex(i => i.path === item.path)
    if (index !== -1) {
      getItemModule(item)?.deleteItem(item)
      searchItems.value.splice(index, 1)
      triggerRef(searchItems)
    }
  }

  const addItem = async (item: AppItem) => {
    try {
      searchItems.value = [...searchItems.value, item]
      triggerRef(searchItems)
      const copyItem = JSON.parse(JSON.stringify(item))
      getItemModule(item)?.addItem(copyItem)
    } catch (error) {
      console.error("添加搜索项失败", error)
    }
  }

  /**
   * 初始化搜索引擎
   */
  const initialize = async () => {
    if (isInitialized.value) return
    initItems()
    isInitialized.value = true
  }

  // 显示默认结果
  const showDefaultResults = () => {
    searchResults.value = searchItems.value.filter(item => {
      const includeCategory = ['applications', 'pinned', 'recent', 'files'].includes(item.category || '')
      return includeCategory
    }).sort((a, b) => {
      return (getItemModule(a)?.weight) - (getItemModule(b)?.weight)
    })
    triggerRef(searchResults)
  }

  const showSearchResults = async (query: string, attachedInfo?: AttachedInfo) => {
    const lowerQuery = query.toLowerCase()

    /**
     * 通用文本搜索逻辑（用于 text 和 over 类型）
     */
    const performTextSearch = (item: AppItem): { matched: boolean; score: number } => {
      let score = 0
      let matched = false

      // 1. 搜索 name 字段
      if (PinyinSearch.match(item.name, query)) {
        matched = true
        // 完全匹配给更高分
        if (item.name.toLowerCase() === lowerQuery) {
          score += 100
        } else if (item.name.toLowerCase().startsWith(lowerQuery)) {
          score += 50
        } else {
          score += 30
        }
      }

      // 2. 搜索 path 字段
      if (item.path && item.path.toLowerCase().includes(lowerQuery)) {
        matched = true
        score += 10
      }

      // 3. 搜索 description 字段
      if (item.description && PinyinSearch.match(item.description, query)) {
        matched = true
        score += 15
      }

      // 4. 搜索 anonymousSearchFields（匿名搜索字段）
      if (item.anonymousSearchFields) {
        for (const field of item.anonymousSearchFields) {
          if (PinyinSearch.match(field, query)) {
            matched = true
            score += 20
            break
          }
        }
      }

      return { matched, score }
    }

    // 过滤并评分搜索项
    const scoredResults = searchItems.value
      .map(item => {
        let score = 0
        let matched = false

        // 根据不同类型执行不同的搜索逻辑
        switch (item.type) {
          case 'text':
            // 检查长度限制
            const textLengthValid =
              (item.minLength === undefined || query.length >= item.minLength) &&
              (item.maxLength === undefined || query.length <= item.maxLength)
            // 如果不满足长度限制，不匹配
            if (!textLengthValid) {
              matched = false
            } else {
              // 文本搜索类型：默认执行通用文本搜索
              const textResult = performTextSearch(item)
              matched = textResult.matched
              score = textResult.score
            }
            break

          case 'regex':
            // 正则搜索类型：用正则匹配 query
            if (item.match) {
              try {
                const regex = new RegExp(item.match, 'i')
                let testContent = query

                if (attachedInfo?.type === 'text') {
                  testContent = attachedInfo.data
                }

                // 检查长度限制
                const lengthValid =
                  (item.minLength === undefined || testContent.length >= item.minLength) &&
                  (item.maxLength === undefined || testContent.length <= item.maxLength)

                if (lengthValid && regex.test(testContent)) {
                  matched = true
                  score = 40
                }
              } catch (e) {
                // 正则表达式错误，忽略
                console.warn('正则表达式错误:', e)
              }

              if (matched && query.length > 0 && attachedInfo?.type === 'text') {
                const textResult = performTextSearch(item)
                if (textResult.matched) {
                  score += textResult.score
                }
              }
            }
            break

          case 'files':
            // 文件搜索类型：匹配文件扩展名、正则或数量
            if (attachedInfo?.type === 'file') {
              const files = attachedInfo.data

              // 检查文件数量限制
              const fileCountValid =
                (files.length > (item.minLength || 0)) &&
                (item.maxLength === undefined || files.length <= item.maxLength)

              if (fileCountValid) {
                // 检查文件扩展名或正则匹配（两者满足其一即可）
                if (item.extensions) {
                  // 优先检查扩展名
                  const hasMatchingExt = files.some(file => {
                    const fileName = file.name.toLowerCase()
                    return item.extensions!.some(ext =>
                      fileName.endsWith(ext.toLowerCase())
                    )
                  })

                  if (hasMatchingExt) {
                    matched = true
                    score = 25
                  }
                } else if (item.match) {
                  // 如果没有 extensions，使用正则匹配文件名
                  try {
                    const regex = new RegExp(item.match, 'i')
                    const hasMatchingName = files.every(file => regex.test(file.name))
                    if (hasMatchingName) {
                      matched = true
                      score = 25
                    }
                  } catch (e) {
                    console.warn('文件名正则表达式错误:', e)
                  }
                } else {
                  // 没有指定扩展名和正则限制，只要文件数量符合就匹配
                  matched = true
                  score = 20
                }

                // 最终也要执行通用文本搜索并叠加分数
                if (matched && query.length > 0) {
                  const textResult = performTextSearch(item)
                  if (textResult.matched) {
                    score += textResult.score
                  }
                }
              }
            }
            break

          case 'img':
            // 图片搜索类型：只匹配图片 attachedInfo
            if (attachedInfo?.type === 'img') {
              matched = true
              score = 60
            }

            // 最终也要执行通用文本搜索并叠加分数
            if (matched && query.length > 0) {
              const textResult = performTextSearch(item)
              if (textResult.matched) {
                score += textResult.score
              }
            }
            break

          default:
            console.warn('未知的搜索类型:', (item as any).type)
            break
        }

        // 应用 item 的权重（如果存在）
        if (item.weight !== undefined) {
          score += item.weight
        }

        return { item, score, matched }
      })
      .filter(result => result.matched) // 只保留匹配的项
      .sort((a, b) => {
        // 先按分数排序
        if (b.score !== a.score) {
          return b.score - a.score
        }
        // 分数相同时按模块权重排序
        const moduleWeightA = getItemModule(a.item)?.weight || 0
        const moduleWeightB = getItemModule(b.item)?.weight || 0
        return moduleWeightA - moduleWeightB
      })
      .map(result => result.item)

    searchResults.value = scoredResults
    triggerRef(searchResults)
  }

  /**
   * 执行搜索 - 直接在 searchItems 中过滤
   */
  const performSearch = async (query: string, attachedInfo?: AttachedInfo) => {
    searchText.value = query
    const trimmedQuery = query.trim().toLowerCase()
    // 无搜索词时显示所有项
    if (!trimmedQuery) {
      showDefaultResults()
    } else {
      await showSearchResults(query, attachedInfo)
    }
  }

  // ==================== 辅助方法 ====================
  const clearResults = () => {
    searchResults.value = []
    triggerRef(searchResults)
  }

  const reset = () => {
    searchText.value = ''
    showDefaultResults()
  }


  // ==================== 返回 ====================
  return {
    // 状态
    searchItems,
    searchResults,
    searchText,
    isInitialized,

    // 计算属性
    hasResults,
    totalResults,
    categories,

    // 核心方法
    initialize,
    performSearch,
    initItems,
    deleteItem,
    addItem,
    getItemModule,

    // 辅助方法
    clearResults,
    reset
  }
})

