/**
 * 增强版搜索组合式函数
 * 提供更高效和功能丰富的搜索体验
 */

import { ref, computed, watch, nextTick, type Ref } from 'vue'
import { SearchEngineEnhanced, type SearchEngineConfig } from './SearchEngineEnhanced'
import { useAppActions } from '../hooks/useAppActions'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { useSmartCache } from '@/core/cache/SmartCacheManager'
import type { SearchCategory, SearchState, SearchItem } from '@/typings/searchTypes'
import type { AttachedFile } from '@/typings/composableTypes'

/**
 * 搜索选项接口
 */
export interface SearchOptions {
  /** 搜索引擎配置 */
  engineConfig?: Partial<SearchEngineConfig>
  /** 是否启用键盘导航 */
  enableKeyboardNav?: boolean
  /** 是否启用搜索历史 */
  enableSearchHistory?: boolean
  /** 最大搜索历史数量 */
  maxHistorySize?: number
  /** 是否启用搜索建议 */
  enableSearchSuggestions?: boolean
}

/**
 * 搜索历史项接口
 */
export interface SearchHistoryItem {
  /** 搜索查询 */
  query: string
  /** 搜索时间 */
  timestamp: number
  /** 结果数量 */
  resultCount: number
}

/**
 * 搜索建议项接口
 */
export interface SearchSuggestion {
  /** 建议文本 */
  text: string
  /** 建议类型 */
  type: 'history' | 'keyword' | 'category' | 'smart'
  /** 匹配分数 */
  score: number
}

/**
 * 增强版搜索组合式函数
 */
export function useSearchEnhanced(
  attachedFiles: Ref<AttachedFile[]>,
  options: SearchOptions = {}
) {
  const {
    engineConfig = {},
    enableKeyboardNav = true,
    enableSearchHistory = true,
    maxHistorySize = 50,
    enableSearchSuggestions = true
  } = options

  // 搜索引擎实例
  const searchEngine = new SearchEngineEnhanced(engineConfig)

  // 状态管理
  const searchState = ref<SearchState>({
    searchText: '',
    searchCategories: [],
    isSearching: false,
  })

  const selectedIndex = ref(0)
  const searchHistory = ref<SearchHistoryItem[]>([])
  const searchSuggestions = ref<SearchSuggestion[]>([])
  const showSuggestions = ref(false)

  // 缓存管理
  const { cache: historyCache } = useSmartCache('search-history')

  // 计算属性
  const flatItems = computed(() => {
    const items: SearchItem[] = []
    searchState.value.searchCategories.forEach(category => {
      items.push(...category.items)
    })
    return items
  })

  const hasResults = computed(() => flatItems.value.length > 0)

  const searchStats = computed(() => searchEngine.getSearchStats())

  const cacheStats = computed(() => searchEngine.getCacheStats())

  // 搜索历史相关
  const loadSearchHistory = () => {
    if (!enableSearchHistory) return

    const cached = historyCache.get('history')
    if (cached) {
      searchHistory.value = cached
    }
  }

  const saveSearchHistory = () => {
    if (!enableSearchHistory) return

    historyCache.set('history', searchHistory.value, {
      ttl: 30 * 24 * 60 * 60 * 1000, // 30天
      priority: 3
    })
  }

  const addToHistory = (query: string, resultCount: number) => {
    if (!enableSearchHistory || !query.trim()) return

    // 移除重复项
    const existingIndex = searchHistory.value.findIndex(item => item.query === query)
    if (existingIndex !== -1) {
      searchHistory.value.splice(existingIndex, 1)
    }

    // 添加到开头
    searchHistory.value.unshift({
      query,
      timestamp: Date.now(),
      resultCount
    })

    // 限制历史大小
    if (searchHistory.value.length > maxHistorySize) {
      searchHistory.value = searchHistory.value.slice(0, maxHistorySize)
    }

    saveSearchHistory()
  }

  const clearSearchHistory = () => {
    searchHistory.value = []
    historyCache.delete('history')
  }

  // 搜索建议相关
  const generateSearchSuggestions = (query: string) => {
    if (!enableSearchSuggestions || !query.trim()) {
      searchSuggestions.value = []
      return
    }

    const suggestions: SearchSuggestion[] = []
    const queryLower = query.toLowerCase()

    // 历史搜索建议
    const historySuggestions = searchHistory.value
      .filter(item => item.query.toLowerCase().includes(queryLower))
      .slice(0, 5)
      .map(item => ({
        text: item.query,
        type: 'history' as const,
        score: 0.9
      }))

    suggestions.push(...historySuggestions)

    // 热门关键词建议
    const keywordSuggestions = searchStats.value.popularKeywords
      .filter(item => item.keyword.includes(queryLower))
      .slice(0, 3)
      .map(item => ({
        text: item.keyword,
        type: 'keyword' as const,
        score: 0.8
      }))

    suggestions.push(...keywordSuggestions)

    // 分类建议
    const categorySuggestions = searchState.value.searchCategories
      .filter(category => category.name.toLowerCase().includes(queryLower))
      .slice(0, 3)
      .map(category => ({
        text: category.name,
        type: 'category' as const,
        score: 0.7
      }))

    suggestions.push(...categorySuggestions)

    // 智能建议（基于当前结果）
    if (flatItems.value.length > 0) {
      const smartSuggestions = flatItems.value
        .slice(0, 3)
        .map(item => ({
          text: item.name,
          type: 'smart' as const,
          score: 0.6
        }))

      suggestions.push(...smartSuggestions)
    }

    // 去重并排序
    const uniqueSuggestions = suggestions
      .filter((suggestion, index, self) =>
        self.findIndex(s => s.text === suggestion.text) === index
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)

    searchSuggestions.value = uniqueSuggestions
  }

  // 核心搜索功能
  const performSearch = async (updateSearchState: boolean = false) => {
    try {
      searchState.value.isSearching = true
      const searchQuery = searchState.value.searchText.trim()

      console.log('🔍 执行增强搜索:', {
        searchQuery,
        attachedFilesCount: attachedFiles.value.length,
        engineStats: searchEngine.getSearchStats()
      })

      // 使用增强搜索引擎执行搜索
      const filteredCategories = await searchEngine.performSearch(searchQuery, attachedFiles.value)
      searchState.value.searchCategories = filteredCategories

      // 添加到搜索历史
      const resultCount = filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0)
      addToHistory(searchQuery, resultCount)

      // 重置选中索引
      selectedIndex.value = 0

      console.log('✅ 增强搜索结果:', {
        categoriesCount: filteredCategories.length,
        totalResults: resultCount,
        cacheStats: searchEngine.getCacheStats()
      })

      return filteredCategories
    } catch (error) {
      console.error('❌ 增强搜索失败:', error)
      searchState.value.searchCategories = []
      return []
    } finally {
      searchState.value.isSearching = false
    }
  }

  // 处理搜索输入
  const handleSearch = async (value: string) => {
    console.log('🔍 handleSearch 被调用:', {
      value,
      currentSearchText: searchState.value.searchText,
      attachedFilesCount: attachedFiles.value.length
    })

    searchState.value.searchText = value

    // 生成搜索建议
    generateSearchSuggestions(value)

    // 执行搜索
    await performSearch()
  }

  // 处理搜索建议选择
  const selectSuggestion = async (suggestion: SearchSuggestion) => {
    searchState.value.searchText = suggestion.text
    showSuggestions.value = false
    await performSearch()
  }

  // 显示/隐藏建议
  const handleSearchFocus = () => {
    if (enableSearchSuggestions && searchSuggestions.value.length > 0) {
      showSuggestions.value = true
    }
  }

  const handleSearchBlur = () => {
    // 延迟隐藏，允许点击建议
    setTimeout(() => {
      showSuggestions.value = false
    }, 200)
  }

  // 分类操作
  const updateCategoryInBoth = (
    categoryId: string,
    updater: (category: SearchCategory) => void
  ) => {
    const searchCategory = searchState.value.searchCategories.find((cat) => cat.id === categoryId)
    if (searchCategory) {
      updater(searchCategory)
    }
  }

  const handleCategoryToggle = (categoryId: string) => {
    const category = searchState.value.searchCategories.find((cat) => cat.id === categoryId)
    if (category) {
      category.isExpanded = !category.isExpanded
      console.log(`📂 分类 ${category.name} 展开状态切换为:`, category.isExpanded)
    } else {
      console.warn('⚠️ 未找到分类:', categoryId)
    }
  }

  // 应用操作
  const {
    executeItem,
    handleCategoryDragEnd,
    handleAppDelete,
    handleAppPin,
  } = useAppActions(performSearch)

  // 键盘导航
  const keyboardNav = enableKeyboardNav ? useKeyboardNavigation(
    flatItems,
    selectedIndex,
    executeItem
  ) : null

  // 初始化
  const initializeSearch = async (categories: SearchCategory[]) => {
    // 设置分类数据到搜索引擎
    searchEngine.setCategories(categories)

    // 加载搜索历史
    loadSearchHistory()

    // 设置默认显示的分类
    const defaultCategories = categories.filter(cat =>
      cat.id === 'recent' || cat.id === 'pinned' || cat.items.length > 0
    )
    searchState.value.searchCategories = defaultCategories

    console.log('🚀 增强搜索引擎初始化完成:', {
      categoriesCount: categories.length,
      historyCount: searchHistory.value.length,
      engineConfig: searchEngine.config
    })

    return defaultCategories
  }

  // 监听附加文件变化
  watch(attachedFiles, async () => {
    if (searchState.value.searchText.trim()) {
      await performSearch()
    }
  }, { deep: true })

  // 清理函数
  const cleanup = () => {
    searchEngine.destroy()
    clearSearchHistory()
  }

  // 导出搜索数据
  const exportSearchData = () => {
    return {
      engine: searchEngine.exportSearchData(),
      history: searchHistory.value,
      exportedAt: Date.now()
    }
  }

  // 导入搜索数据
  const importSearchData = (data: any) => {
    try {
      if (data.engine) {
        searchEngine.importSearchData(data.engine)
      }
      if (data.history) {
        searchHistory.value = data.history
        saveSearchHistory()
      }
      return true
    } catch (error) {
      console.error('导入搜索数据失败:', error)
      return false
    }
  }

  return {
    // 状态
    selectedIndex,
    searchText: computed({
      get: () => searchState.value.searchText,
      set: (value: string) => { searchState.value.searchText = value }
    }),
    searchCategories: computed(() => searchState.value.searchCategories),
    flatItems,
    isSearching: computed(() => searchState.value.isSearching),
    hasResults,
    searchHistory: computed(() => searchHistory.value),
    searchSuggestions: computed(() => searchSuggestions.value),
    showSuggestions,
    searchStats,
    cacheStats,

    // 搜索方法
    performSearch,
    handleSearch,
    initializeSearch: initializeSearch,

    // 建议相关
    selectSuggestion,
    handleSearchFocus,
    handleSearchBlur,
    generateSearchSuggestions,

    // 历史相关
    clearSearchHistory,

    // 分类操作
    updateCategoryInBoth,
    handleCategoryToggle,

    // 应用操作
    executeItem,
    handleCategoryDragEnd,
    handleAppDelete,
    handleAppPin,

    // 键盘导航
    ...(keyboardNav || {}),

    // 工具方法
    cleanup,
    exportSearchData,
    importSearchData,

    // 搜索引擎实例（用于高级操作）
    searchEngine
  }
}
