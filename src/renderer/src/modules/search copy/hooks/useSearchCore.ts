import { ref, computed, type Ref } from 'vue'
import type { AppItem } from '@shared/types'
import type { SearchCategory, SearchState } from '@/typings/search-types'
import { PinyinSearch } from '@/utils/pinyin-search'

// 在开发环境下导入测试文件
if (import.meta.env.DEV) {
  import('@/utils/pinyin-search.test')
}

export function useSearchCore(originalCategories: Ref<SearchCategory[]>) {
  const searchState = ref<SearchState>({
    searchText: '',
    searchCategories: [],
    isSearching: false,
  })

  // 扁平化的所有项目列表，包含分类信息
  const flatItems = computed(() => {
    const items: Array<AppItem & { categoryId: string }> = []
    console.log('🔄 计算 flatItems:', {
      categoriesCount: searchState.value.searchCategories.length,
      categories: searchState.value.searchCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        itemsCount: cat.items.length
      }))
    })

    for (const category of searchState.value.searchCategories) {
      const displayItems = category.isExpanded || category.items.length <= category.maxDisplayCount
        ? category.items
        : category.items.slice(0, category.maxDisplayCount)

      console.log(`📂 处理分类 ${category.name}:`, {
        totalItems: category.items.length,
        displayItems: displayItems.length,
        isExpanded: category.isExpanded,
        maxDisplayCount: category.maxDisplayCount
      })

      const itemsWithCategory = displayItems.map((item) => ({
        ...item,
        categoryId: category.id,
      }))
      items.push(...itemsWithCategory)
    }

    console.log('✅ flatItems 计算结果:', { totalItems: items.length })
    return items
  })

  // 执行搜索
  const performSearch = async (
    getDefaultCategories: (allCategories: SearchCategory[]) => SearchCategory[],
    getSearchCategories: (allCategories: SearchCategory[]) => SearchCategory[],
    attachedFiles?: any[]
  ) => {
    try {
      searchState.value.isSearching = true
      const searchQuery = searchState.value.searchText.trim()

      console.log('🔍 执行搜索:', {
        searchQuery,
        originalCategoriesCount: originalCategories.value.length,
        attachedFilesCount: attachedFiles?.length || 0
      })

      // 根据搜索状态选择不同的分类配置
      const baseCategories = searchQuery.length === 0
        ? getDefaultCategories(originalCategories.value)
        : getSearchCategories(originalCategories.value)

      // 如果有附加文件，创建一个新的分类来包含这些文件
      if (attachedFiles && attachedFiles.length > 0) {
        const attachedFilesCategory: SearchCategory = {
          id: 'attached-files',
          name: '附加文件',
          items: attachedFiles.map(file => ({
            name: file.name,
            path: file.path,
            icon: file.icon || null,
            lastUsed: Date.now(),
            usageCount: 1,
          })),
          isDragEnabled: false,
          maxDisplayCount: 10,
          isExpanded: false,
        }

        // 将附加文件分类添加到基础分类的开头
        baseCategories.unshift(attachedFilesCategory)

        console.log('📎 添加附加文件分类:', {
          id: attachedFilesCategory.id,
          name: attachedFilesCategory.name,
          itemsCount: attachedFilesCategory.items.length
        })
      }

      console.log('📂 基础分类:', baseCategories.map(cat => ({ id: cat.id, name: cat.name, itemsCount: cat.items.length })))

      const filteredCategories: SearchCategory[] = []

      for (const category of baseCategories) {
        let filteredItems: AppItem[] = []

        console.log(`🔍 处理分类 ${category.name}:`, {
          id: category.id,
          originalItemsCount: category.items.length,
          hasCustomSearch: !!category.customSearch,
          searchQuery
        })

        if (searchQuery.length === 0) {
          // 无搜索词时，显示所有项目
          filteredItems = [...category.items]
        } else {
          // 有搜索词时，进行过滤
          if (category.customSearch) {
            filteredItems = category.customSearch(searchQuery, category.items)
            console.log(`🔍 使用自定义搜索:`, {
              originalCount: category.items.length,
              filteredCount: filteredItems.length
            })
          } else {
            filteredItems = category.items.filter((item) => {
              // 使用拼音搜索进行匹配
              const matches = PinyinSearch.match(item.name, searchQuery)
              if (matches) {
                console.log(`✅ 匹配项目:`, {
                  name: item.name,
                  path: item.path,
                  pinyin: PinyinSearch.getPinyin(item.name),
                  initials: PinyinSearch.getInitials(item.name)
                })
              }
              return matches
            })
            console.log(`🔍 使用拼音搜索:`, {
              originalCount: category.items.length,
              filteredCount: filteredItems.length,
              searchQuery
            })
          }
        }

        console.log(`📊 分类 ${category.name} 过滤结果:`, {
          filteredItemsCount: filteredItems.length,
          filteredItems: filteredItems.map(item => ({ name: item.name, path: item.path }))
        })

        // 对于搜索时的分类，即使没有匹配项也要显示分类
        // 对于默认显示的分类，只有在有项目时才显示
        if (searchQuery.length === 0) {
          // 默认显示：只有有项目的分类才显示
          if (filteredItems.length > 0) {
            filteredCategories.push({
              ...category,
              items: filteredItems,
            })
          }
        } else {
          // 搜索时：显示所有分类，即使没有匹配项
          if (filteredItems.length > 0) {
            filteredCategories.push({
              ...category,
              items: filteredItems,
            })
          }
        }
      }

      console.log('✅ 搜索结果:', filteredCategories.map(cat => ({ id: cat.id, name: cat.name, itemsCount: cat.items.length })))

      // 详细检查每个分类的数据
      filteredCategories.forEach(category => {
        console.log(`📋 分类 ${category.name} 详细信息:`, {
          id: category.id,
          itemsCount: category.items.length,
          items: category.items.map(item => ({ name: item.name, path: item.path }))
        })
      })

      searchState.value.searchCategories = filteredCategories
    } catch (error) {
      console.error('❌ 搜索失败:', error)
      searchState.value.searchCategories = []
    } finally {
      searchState.value.isSearching = false
    }
  }

  // 处理搜索
  const handleSearch = async (
    value: string,
    getDefaultCategories: (allCategories: SearchCategory[]) => SearchCategory[],
    getSearchCategories: (allCategories: SearchCategory[]) => SearchCategory[],
    attachedFiles?: any[]
  ) => {
    console.log('🔍 handleSearch 被调用:', {
      value,
      currentSearchText: searchState.value.searchText,
      attachedFilesCount: attachedFiles?.length || 0
    })
    searchState.value.searchText = value
    await performSearch(getDefaultCategories, getSearchCategories, attachedFiles)
  }

  /**
   * 更新分类 （搜索分类和原始分类都更新）
   * @param categoryId 分类id
   * @param updater 自定义的更新函数，传入对应分类对象
   */
  const updateCategoryInBoth = (
    categoryId: string,
    updater: (category: SearchCategory) => void
  ) => {
    const originalCategory = originalCategories.value.find((cat) => cat.id === categoryId)
    if (originalCategory) {
      updater(originalCategory)
    }

    const searchCategory = searchState.value.searchCategories.find((cat) => cat.id === categoryId)
    if (searchCategory) {
      updater(searchCategory)
    }
  }

  return {
    searchState,
    flatItems,
    performSearch,
    handleSearch,
    updateCategoryInBoth,
  }
}
