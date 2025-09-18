import { onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSearchStore } from '@/store/modules/search'
import type { SearchProvider, SearchOptions } from '@/typings/core-types'
import { searchEngine } from '@/core/search/SearchEngine'
import type { SearchCategory } from '@/typings/search-types'

/**
 * 搜索功能 Composable
 * 提供 Vue 组件友好的搜索接口
 */
export function useSearch() {
  const searchStore = useSearchStore()

  // 解构响应式状态
  const {
    loading,
    error,
    searchState,
    originalCategories,
    selectedIndex,
    flatItems,
    totalItems,
    hasResults,
    currentItem
  } = storeToRefs(searchStore)

  // 解构方法
  const {
    clearError,
    setSearchText,
    setSearchCategories,
    setOriginalCategories,
    setSelectedIndex,
    performSearch,
    handleSearch,
    clearSearch,
    selectNext,
    selectPrevious,
    selectFirst,
    selectLast,
    executeCurrentItem,
    toggleCategoryExpansion,
    updateCategoryDisplayCount,
    getDefaultCategories,
    loadAppsFromElectron,
    executeApp,
    pinApp,
    unpinApp,
    initialize,
    reset,
    destroy
  } = searchStore

  /**
   * 注册搜索数据
   */
  const registerSearchData = (_data: any[], type: string) => {
    const provider: SearchProvider = {
      type,
      name: `${type} 搜索提供者`,
      priority: 1,
      search: (query: string, items: any[]) => {
        return items.filter(item =>
          item.name?.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase())
        )
      }
    }

    searchEngine.registerProvider(provider)
    console.log(`🔍 注册搜索数据: ${type}`)
  }

  /**
   * 注册搜索提供者
   */
  const registerSearchProvider = (provider: SearchProvider) => {
    searchEngine.registerProvider(provider)
    console.log(`🔍 注册搜索提供者: ${provider.type}`)
  }

  /**
   * 设置搜索选项
   */
  const setSearchOptions = (options: SearchOptions) => {
    // 这里可以扩展搜索选项的设置逻辑
    console.log('🔍 设置搜索选项:', options)
  }

  /**
   * 键盘导航处理
   */
  const handleKeyboardNavigation = (event: KeyboardEvent) => {
    if (!hasResults.value) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        selectNext()
        break
      case 'ArrowUp':
        event.preventDefault()
        selectPrevious()
        break
      case 'Home':
        event.preventDefault()
        selectFirst()
        break
      case 'End':
        event.preventDefault()
        selectLast()
        break
      case 'Enter':
        event.preventDefault()
        executeCurrentItem()
        break
      case 'Escape':
        event.preventDefault()
        clearSearch()
        break
    }
  }

  /**
   * 搜索建议
   */
  const getSearchSuggestions = (query: string): string[] => {
    if (!query.trim()) return []

    const suggestions: string[] = []
    const lowerQuery = query.toLowerCase()

    // 从原始分类中提取建议
    for (const category of originalCategories.value) {
      for (const item of category.items) {
        if (item.name.toLowerCase().includes(lowerQuery)) {
          suggestions.push(item.name)
        }
      }
    }

    // 去重并限制数量
    return [...new Set(suggestions)].slice(0, 5)
  }

  /**
   * 搜索历史
   */
  const addToSearchHistory = (query: string) => {
    if (!query.trim()) return

    try {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]')
      const newHistory = [query, ...history.filter((item: string) => item !== query)].slice(0, 10)
      localStorage.setItem('searchHistory', JSON.stringify(newHistory))
    } catch (error) {
      console.error('🔍 保存搜索历史失败:', error)
    }
  }

  /**
   * 获取搜索历史
   */
  const getSearchHistory = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem('searchHistory') || '[]')
    } catch (error) {
      console.error('🔍 获取搜索历史失败:', error)
      return []
    }
  }

  /**
   * 清除搜索历史
   */
  const clearSearchHistory = () => {
    localStorage.removeItem('searchHistory')
  }

  /**
   * 搜索统计
   */
  const getSearchStats = () => {
    return searchEngine.getSearchStats(searchState.value.searchCategories as SearchCategory[])
  }

  /**
   * 导出搜索结果
   */
  const exportSearchResults = () => {
    const results = {
      query: searchState.value.searchText,
      timestamp: new Date().toISOString(),
      categories: searchState.value.searchCategories.map(category => ({
        id: category.id,
        name: category.name,
        itemsCount: category.items.length,
        items: category.items.map(item => ({
          name: item.name,
          path: item.path,
          description: item.description
        }))
      }))
    }

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `search-results-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * 执行应用程序（简化接口）
   */
  const execute = async (appItem: any) => {
    await executeApp(appItem)
  }

  /**
   * 添加到收藏（简化接口）
   */
  const pin = async (appItem: any) => {
    await pinApp(appItem)
  }

  /**
   * 从收藏中移除（简化接口）
   */
  const unpin = async (appItem: any) => {
    await unpinApp(appItem)
  }

  /**
   * 刷新应用程序数据
   */
  const refreshApps = async () => {
    await loadAppsFromElectron()
  }

  /**
   * 生命周期管理
   */
  onMounted(async () => {
    await initialize()

    // 添加键盘事件监听
    document.addEventListener('keydown', handleKeyboardNavigation)
  })

  onUnmounted(async () => {
    // 移除键盘事件监听
    document.removeEventListener('keydown', handleKeyboardNavigation)

    await destroy()
  })

  return {
    // 状态
    loading,
    error,
    searchState,
    originalCategories,
    selectedIndex,
    flatItems,
    totalItems,
    hasResults,
    currentItem,

    // 基础方法
    clearError,
    setSearchText,
    setSearchCategories,
    setOriginalCategories,
    setSelectedIndex,
    performSearch,
    handleSearch,
    clearSearch,
    selectNext,
    selectPrevious,
    selectFirst,
    selectLast,
    executeCurrentItem,
    toggleCategoryExpansion,
    updateCategoryDisplayCount,
    getDefaultCategories,

    // 扩展方法
    registerSearchData,
    registerSearchProvider,
    setSearchOptions,
    handleKeyboardNavigation,
    getSearchSuggestions,
    addToSearchHistory,
    getSearchHistory,
    clearSearchHistory,
    getSearchStats,
    exportSearchResults,

    // 应用程序操作方法
    execute,
    pin,
    unpin,
    refreshApps,

    // 生命周期
    initialize,
    reset,
    destroy
  }
}
