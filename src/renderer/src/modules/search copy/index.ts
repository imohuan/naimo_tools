import { ref, computed } from 'vue'
import { useSearchCore } from './hooks/useSearchCore'
import { useAppData } from './hooks/useAppData'
import { useAppActions } from './hooks/useAppActions'

export function useSearch() {
  const selectedIndex = ref(0)

  // 应用数据管理 (提供初始数据和搜索分类配置)
  const {
    originalCategories,
    serializeAppItems,
    initAppApps,
    getDefaultCategories,
    getSearchCategories,
  } = useAppData()

  // 核心搜索功能
  const {
    searchState,
    flatItems,
    performSearch: performSearchCore,
    handleSearch: handleSearchCore,
    updateCategoryInBoth,
  } = useSearchCore(originalCategories)

  // 执行搜索（包装核心搜索功能）
  const performSearch = async (attachedFiles?: any[]) => {
    await performSearchCore(getDefaultCategories, getSearchCategories, attachedFiles)
  }

  // 处理搜索（包装核心搜索功能）
  const handleSearch = async (value: string, attachedFiles?: any[]) => {
    await handleSearchCore(value, getDefaultCategories, getSearchCategories, attachedFiles)
  }

  // 应用操作
  const {
    executeItem,
    handleCategoryToggle,
    handleCategoryDragEnd,
    handleAppDelete,
    handleAppPin,
  } = useAppActions(
    originalCategories,
    updateCategoryInBoth,
    serializeAppItems,
    performSearch
  )

  // 初始化应用数据并设置默认显示
  const initAppAppsWithDefault = async () => {
    const categories = await initAppApps()
    originalCategories.value = categories

    // 设置默认显示的分类（最近和固定）
    const defaultCategories = getDefaultCategories(categories)
    searchState.value.searchCategories = defaultCategories
    return categories
  }

  return {
    // 状态
    selectedIndex,
    searchText: computed({
      get: () => searchState.value.searchText,
      set: (value: string) => { searchState.value.searchText = value }
    }),
    searchCategories: computed(() => searchState.value.searchCategories),
    originalCategories,
    flatItems,
    isSearching: computed(() => searchState.value.isSearching),

    // 方法
    initAppApps: initAppAppsWithDefault,
    performSearch,
    handleSearch,
    updateCategoryInBoth,
    executeItem,
    handleCategoryToggle,
    handleCategoryDragEnd,
    handleAppDelete,
    handleAppPin,
  }
}

// 导出键盘导航
export { useKeyboardNavigation } from './hooks/useKeyboardNavigation'

// 导出类型
export type { SearchCategory, SearchState } from '@/typings/search-types'
