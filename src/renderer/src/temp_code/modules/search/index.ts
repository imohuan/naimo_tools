import { defineStore } from 'pinia'
import { ref, shallowRef, computed, triggerRef, reactive } from 'vue'
import type { AppItem, AttachedInfo, SearchModule } from '@/temp_code/typings/search'

import { loadAppIcons } from '@/temp_code/utils/search'
import { PinyinSearch } from '@/temp_code/utils/pinyinSearch'
import type { AttachedFile } from '@/typings/composableTypes'
import { usePluginStoreNew } from '../plugin'
import type { PluginItem } from '@/typings'

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
      const instance: SearchModule = new ExportClass()
      // 判断是否实现了 SearchModule 的必要方法
      if (
        instance &&
        typeof instance.getItems === 'function' &&
        typeof instance.deleteItem === 'function' &&
        typeof instance.addItem === 'function' &&
        typeof instance.setItems === 'function'
      ) {
        const oldGetItems = instance.getItems.bind(instance)
        instance.getItems = async () => {
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
  /** 展开的分类 ID 映射（用于动态控制分类展开/折叠） */
  const expandedCategories = reactive<Record<string, boolean>>({})

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
        isExpanded: expandedCategories[category] || false, // 从状态中读取展开状态
        items: items
      })
    })

    return categories
  })

  // ==================== 核心方法 ====================

  /**
   * 更新搜索项数据（在菜单中固定或删除，或者在最近使用添加）
   */
  const initItems = async () => {
    // 重新获取所有模块的搜索项
    const items: AppItem[] = []
    for (const module of Object.values(modules)) {
      items.push(...await module.getItems());
    }

    // 加载图标
    const itemsWithIcons = await loadAppIcons(items)
    searchItems.value = itemsWithIcons
    triggerRef(searchItems)

    // 重新执行搜索
    await performSearch(searchText.value)
  }

  const getItemModule = (item: AppItem) => {
    return modules[item.category || '']
  }

  /**
   * 执行模块方法的通用函数
   * @param moduleKey - 模块的 category 字符串或 AppItem 对象
   * @param methodName - 要执行的方法名
   * @param args - 方法参数数组
   * @param options - 配置选项
   */
  const executeModuleMethod = async <T extends keyof SearchModule>(
    moduleKey: string | AppItem,
    methodName: T,
    args: any[],
    options: {
      /** 是否克隆参数（深拷贝） */
      cloneArgs?: boolean
      /** 是否重新加载所有项，默认 true */
      reloadItems?: boolean
      /** 错误提示信息 */
      errorMessage?: string
      /** 抛出错误 */
      throwError?: boolean
    } = {}
  ) => {
    // 获取模块
    const module = typeof moduleKey === 'string'
      ? modules[moduleKey]
      : getItemModule(moduleKey)

    // 获取分类名称用于错误提示
    const category = typeof moduleKey === 'string'
      ? moduleKey
      : moduleKey.category

    if (!module) {
      console.error(`未找到分类: ${category}`)
      return
    }

    try {
      // 克隆参数（如果需要）
      const finalArgs = options.cloneArgs
        ? args.map(arg => JSON.parse(JSON.stringify(arg)))
        : args
      // 执行模块方法
      await (module[methodName] as any)(...finalArgs)
      // 重新加载所有搜索项（如果需要）
      if (options.reloadItems !== false) await initItems()
    } catch (error) {
      console.error(options.errorMessage || "执行模块方法失败", error)
      if (options.throwError) throw error
    }
  }

  const deleteItem = async (item: AppItem) => {
    await executeModuleMethod(item, 'deleteItem', [item], {
      reloadItems: true,
      errorMessage: '删除搜索项失败'
    })
  }

  const addItem = async (item: AppItem) => {
    await executeModuleMethod(item, 'addItem', [item], {
      cloneArgs: true,
      reloadItems: true,
      errorMessage: '添加搜索项失败'
    })
  }

  const setItems = async (category: string, items: AppItem[]) => {
    await executeModuleMethod(category, 'setItems', [items], {
      cloneArgs: true,
      reloadItems: true,
      errorMessage: '批量设置搜索项失败'
    })
  }

  /**
   * 初始化搜索引擎
   */
  const initialize = async () => {
    if (isInitialized.value) return
    await initItems()
    await _setupEventListeners()
    isInitialized.value = true
  }

  // 显示默认结果
  const showDefaultResults = () => {
    // searchResults.value = searchItems.value.filter(item => {
    //   const includeCategory = ['applications', 'pinned', 'recent', 'files'].includes(item.category || '')
    //   return includeCategory
    // }).sort((a, b) => {
    //   return (getItemModule(a)?.weight) - (getItemModule(b)?.weight)
    // })
    searchResults.value = searchItems.value
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

      if (item.notVisibleSearch && !attachedInfo) {
        return { matched: false, score: 0 }
      }

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
            if (['file', 'text', 'img'].includes(attachedInfo?.type || '')) {

              let files: AttachedFile[] = []
              switch (attachedInfo?.type) {
                case 'file':
                  files = attachedInfo.data
                  break
                case 'text':
                  files = [attachedInfo.originalFile]
                  break
                case 'img':
                  files = [attachedInfo.originalFile]
                  break
              }

              // 根据 item.fileType 过滤文件列表
              let filteredFiles = files
              if (item.fileType === 'file') {
                // 只保留文件（排除文件夹）
                filteredFiles = files.filter(file => file.type !== 'directory')
              } else if (item.fileType === 'directory') {
                // 只保留文件夹
                filteredFiles = files.filter(file => file.type === 'directory')
              }

              // 检查文件数量限制
              const fileCountValid =
                (filteredFiles.length > (item.minLength || 0)) &&
                (item.maxLength === undefined || filteredFiles.length <= item.maxLength)

              if (fileCountValid) {
                // 对于文件夹，直接匹配（不使用 extensions 和 match）
                if (item.fileType === 'directory') {
                  matched = true
                  score = 20
                } else if (item.fileType === 'file') {
                  // 对于文件，检查扩展名或正则匹配
                  if (item.extensions) {
                    // 优先检查扩展名
                    const hasMatchingExt = filteredFiles.some(file => {
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
                      const hasMatchingName = filteredFiles.every(file => regex.test(file.name))
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
            // 检查长度限制D
            const textLengthValid =
              (query.length > (item.minLength || 0)) &&
              (item.maxLength === undefined || query.length <= item.maxLength)

            matched = false
            // 如果不满足长度限制，不匹配
            if (textLengthValid && !attachedInfo) {
              // 文本搜索类型：默认执行通用文本搜索
              const textResult = performTextSearch(item)
              matched = textResult.matched
              score = textResult.score
            }
            break
          // console.warn('未知的搜索类型:', (item as any).type)
          // break
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
    if (!trimmedQuery && !attachedInfo) {
      showDefaultResults()
    } else {
      await showSearchResults(query, attachedInfo)
    }
  }

  // ==================== 辅助方法 ====================
  /**
   * 切换分类的展开/折叠状态
   */
  const toggleCategory = (categoryId: string) => {
    expandedCategories[categoryId] = !expandedCategories[categoryId]
    console.log('🔄 切换分类展开状态:', {
      categoryId,
      isExpanded: expandedCategories[categoryId],
      allExpanded: { ...expandedCategories }
    })
  }

  const clearResults = () => {
    searchResults.value = []
    triggerRef(searchResults)
  }

  const reset = () => {
    searchText.value = ''
    // 清空展开状态
    Object.keys(expandedCategories).forEach(key => {
      delete expandedCategories[key]
    })
    showDefaultResults()
  }

  // ==================== 事件监听 ====================
  const _setupEventListeners = async () => {
    naimo.event.onPluginUninstalled(async (_event, _data) => {
      // 更新最近使用的列表，因为如果插件卸载了，那么最近使用的列表中应该删除这个插件
      const plugin = usePluginStoreNew()
      searchItems.value.filter(item => item.category === "recent").forEach(item => {
        // 判断是否是插件，判断插件是否卸载了
        if (plugin.isPluginItem(item)) {
          const pluginId = (item as PluginItem).pluginId
          // 如果插件ID存在，并且插件不存在，则删除这个插件在搜索列表中的项
          if (pluginId && !plugin.getInstalledPluginItem(pluginId, item.path)) {
            deleteItem(item)
          }
        }
      })
    });
  };
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
    setItems,
    getItemModule,

    // 辅助方法
    toggleCategory,
    clearResults,
    reset
  }
})

