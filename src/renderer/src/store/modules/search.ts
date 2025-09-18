import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { SearchCategory, SearchState } from '@/typings/search-types'
import { searchEngine } from '@/core/search/SearchEngine'
import { electronSearchBridge } from '@/core/search/ElectronSearchBridge'

/**
 * 搜索状态管理
 */
export const useSearchStore = defineStore('search', () => {
  // 状态
  const loading = ref(false)
  const error = ref<string | null>(null)
  const searchState = ref<SearchState>({
    searchText: '',
    searchCategories: [],
    isSearching: false
  })
  const originalCategories = ref<SearchCategory[]>([])
  const selectedIndex = ref(0)

  // 计算属性
  const flatItems = computed(() => {
    const items: any[] = []
    for (const category of searchState.value.searchCategories) {
      items.push(...category.items)
    }
    return items
  })

  const totalItems = computed(() => {
    return searchState.value.searchCategories.reduce((sum, cat) => sum + cat.items.length, 0)
  })

  const hasResults = computed(() => {
    return searchState.value.searchCategories.some(cat => cat.items.length > 0)
  })

  const currentItem = computed(() => {
    const items = flatItems.value
    return items[selectedIndex.value] || null
  })

  // 方法
  const clearError = () => {
    error.value = null
  }

  const setLoading = (value: boolean) => {
    loading.value = value
  }

  const setError = (err: string) => {
    error.value = err
    console.error('🔍 搜索错误:', err)
  }

  const setSearchText = (text: string) => {
    searchState.value.searchText = text
  }

  const setSearchCategories = (categories: SearchCategory[]) => {
    searchState.value.searchCategories = categories
  }

  const setOriginalCategories = (categories: SearchCategory[]) => {
    originalCategories.value = categories
    // 构建搜索索引
    searchEngine.buildIndex(categories)
  }

  const setSelectedIndex = (index: number) => {
    const maxIndex = flatItems.value.length - 1
    selectedIndex.value = Math.max(0, Math.min(index, maxIndex))
  }

  const setSearching = (isSearching: boolean) => {
    searchState.value.isSearching = isSearching
  }

  /**
   * 执行搜索
   */
  const performSearch = async (_attachedFiles?: any[]) => {
    try {
      setLoading(true)
      setError('')
      setSearching(true)

      const query = searchState.value.searchText
      const categories = await searchEngine.search(query, originalCategories.value, {
        maxResults: 50,
        enablePinyin: true,
        enableFuzzy: true
      })

      setSearchCategories(categories)

      // 重置选中索引
      setSelectedIndex(0)

      console.log(`🔍 搜索完成: "${query}" -> ${categories.length} 个分类`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '搜索失败'
      setError(errorMessage)
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  /**
   * 处理搜索输入
   */
  const handleSearch = async (value: string, attachedFiles?: any[]) => {
    setSearchText(value)
    await performSearch(attachedFiles)
  }

  /**
   * 清除搜索
   */
  const clearSearch = () => {
    setSearchText('')
    setSearchCategories([])
    setSelectedIndex(0)
    setSearching(false)
  }

  /**
   * 选择下一个项目
   */
  const selectNext = () => {
    const maxIndex = flatItems.value.length - 1
    if (selectedIndex.value < maxIndex) {
      setSelectedIndex(selectedIndex.value + 1)
    }
  }

  /**
   * 选择上一个项目
   */
  const selectPrevious = () => {
    if (selectedIndex.value > 0) {
      setSelectedIndex(selectedIndex.value - 1)
    }
  }

  /**
   * 选择第一个项目
   */
  const selectFirst = () => {
    setSelectedIndex(0)
  }

  /**
   * 选择最后一个项目
   */
  const selectLast = () => {
    const maxIndex = flatItems.value.length - 1
    setSelectedIndex(maxIndex)
  }

  /**
   * 执行当前选中的项目
   */
  const executeCurrentItem = async () => {
    const item = currentItem.value
    if (item) {
      try {
        // 这里需要调用相应的执行逻辑
        console.log('🔍 执行项目:', item.name)
        // TODO: 实现项目执行逻辑
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '执行失败'
        setError(errorMessage)
      }
    }
  }

  /**
   * 切换分类展开状态
   */
  const toggleCategoryExpansion = (categoryId: string) => {
    const category = searchState.value.searchCategories.find(cat => cat.id === categoryId)
    if (category) {
      category.isExpanded = !category.isExpanded
    }
  }

  /**
   * 更新分类显示数量
   */
  const updateCategoryDisplayCount = (categoryId: string, count: number) => {
    const category = searchState.value.searchCategories.find(cat => cat.id === categoryId)
    if (category) {
      category.maxDisplayCount = count
    }
  }

  /**
   * 获取默认分类
   */
  const getDefaultCategories = (categories: SearchCategory[]): SearchCategory[] => {
    return categories.filter(category =>
      category.id === 'recent' ||
      category.id === 'pinned' ||
      category.isExpanded
    )
  }

  /**
   * 从Electron获取应用程序数据
   */
  const loadAppsFromElectron = async () => {
    try {
      setLoading(true)
      clearError()

      const [allApps, recentApps, pinnedApps] = await Promise.all([
        electronSearchBridge.getAllApps(),
        electronSearchBridge.getRecentApps(10),
        electronSearchBridge.getPinnedApps()
      ])

      // 构建搜索分类
      const categories: SearchCategory[] = [
        {
          id: 'recent',
          name: '最近使用',
          items: recentApps,
          isDragEnabled: false,
          maxDisplayCount: 10,
          isExpanded: true
        },
        {
          id: 'pinned',
          name: '收藏',
          items: pinnedApps,
          isDragEnabled: true,
          maxDisplayCount: 20,
          isExpanded: true
        },
        {
          id: 'all',
          name: '所有应用',
          items: allApps,
          isDragEnabled: true,
          maxDisplayCount: 50,
          isExpanded: false
        }
      ]

      setOriginalCategories(categories)
      console.log('🔍 从Electron加载应用程序数据完成')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载应用程序数据失败'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 执行应用程序
   */
  const executeApp = async (appItem: any) => {
    try {
      setLoading(true)
      clearError()

      const success = await electronSearchBridge.executeApp(appItem)
      if (success) {
        console.log(`🔍 执行应用程序成功: ${appItem.name}`)
        // 刷新最近使用的应用程序
        await loadAppsFromElectron()
      } else {
        setError(`执行应用程序失败: ${appItem.name}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '执行应用程序失败'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 添加到收藏
   */
  const pinApp = async (appItem: any) => {
    try {
      setLoading(true)
      clearError()

      const success = await electronSearchBridge.pinApp(appItem)
      if (success) {
        console.log(`🔍 添加到收藏成功: ${appItem.name}`)
        // 刷新收藏列表
        await loadAppsFromElectron()
      } else {
        setError(`添加到收藏失败: ${appItem.name}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '添加到收藏失败'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 从收藏中移除
   */
  const unpinApp = async (appItem: any) => {
    try {
      setLoading(true)
      clearError()

      const success = await electronSearchBridge.unpinApp(appItem)
      if (success) {
        console.log(`🔍 从收藏中移除成功: ${appItem.name}`)
        // 刷新收藏列表
        await loadAppsFromElectron()
      } else {
        setError(`从收藏中移除失败: ${appItem.name}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '从收藏中移除失败'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 初始化搜索
   */
  const initialize = async () => {
    try {
      setLoading(true)
      await searchEngine.initialize()

      // 从Electron加载应用程序数据
      await loadAppsFromElectron()

      console.log('🔍 搜索Store初始化完成')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '初始化失败'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 重置状态
   */
  const reset = () => {
    searchState.value = {
      searchText: '',
      searchCategories: [],
      isSearching: false
    }
    originalCategories.value = []
    selectedIndex.value = 0
    error.value = null
    loading.value = false
  }

  /**
   * 销毁
   */
  const destroy = async () => {
    await searchEngine.destroy()
    reset()
    console.log('🔍 搜索Store已销毁')
  }

  return {
    // 状态
    loading: readonly(loading),
    error: readonly(error),
    searchState: readonly(searchState),
    originalCategories: readonly(originalCategories),
    selectedIndex: readonly(selectedIndex),

    // 计算属性
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

    // Electron集成方法
    loadAppsFromElectron,
    executeApp,
    pinApp,
    unpinApp,

    // 生命周期
    initialize,
    reset,
    destroy
  }
})

