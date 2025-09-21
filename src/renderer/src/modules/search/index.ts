import { ref, computed, type Ref } from 'vue'
import { searchEngine } from '@/core/search/SearchEngine'
import { useAppActions } from './hooks/useAppActions'
import type { SearchCategory, SearchState } from '@/typings/search-types'
import type { AttachedFile } from '@/composables/useFileHandler'

export function useSearch(attachedFiles: Ref<AttachedFile[]>) {
  const selectedIndex = ref(0)

  // 搜索状态管理
  const searchState = ref<SearchState>({
    searchText: '',
    searchCategories: [],
    isSearching: false,
  })

  // 扁平化的所有项目列表，包含分类信息
  const flatItems = computed(() => {
    return searchEngine.flatItems(searchState.value.searchCategories)
  })

  const updateStoreCategory = async () => {
    await searchEngine.updateStoreCategory()
  }

  // 执行搜索 - 使用SearchEngine
  const performSearch = async (updateSearchState: boolean = false) => {
    try {
      searchState.value.isSearching = true
      const searchQuery = searchState.value.searchText.trim()

      console.log('🔍 执行搜索:', {
        searchQuery,
        attachedFilesCount: attachedFiles.value.length
      })

      if (updateSearchState) await updateStoreCategory()

      // 使用SearchEngine执行搜索
      const filteredCategories = await searchEngine.performSearch(searchQuery, attachedFiles.value)
      searchState.value.searchCategories = filteredCategories

      console.log('✅ 搜索结果:', filteredCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        itemsCount: cat.items.length
      })))
    } catch (error) {
      console.error('❌ 搜索失败:', error)
      searchState.value.searchCategories = []
    } finally {
      searchState.value.isSearching = false
    }
  }

  // 处理搜索
  const handleSearch = async (value: string) => {
    console.log('🔍 handleSearch 被调用:', {
      value,
      currentSearchText: searchState.value.searchText,
      attachedFilesCount: attachedFiles.value.length
    })
    searchState.value.searchText = value
    await performSearch()
  }

  /**
   * 更新分类 - 由于SearchEngine管理所有分类，这里主要更新搜索状态
   * @param categoryId 分类id
   * @param updater 自定义的更新函数，传入对应分类对象
   */
  const updateCategoryInBoth = (
    categoryId: string,
    updater: (category: SearchCategory) => void
  ) => {
    // 更新搜索状态中的分类
    const searchCategory = searchState.value.searchCategories.find((cat) => cat.id === categoryId)
    if (searchCategory) {
      updater(searchCategory)
    }

    // 注意：SearchEngine管理的原始分类数据会在下次搜索时重新获取
    // 如果需要持久化更改，应该通过SearchEngine的API进行
    console.log('⚠️ 分类更新仅影响当前搜索状态，SearchEngine管理的原始数据未更新')
  }

  /**
   * 处理分类展开/收起
   * @param categoryId 分类id
   */
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
  } = useAppActions(
    performSearch
  )

  // 初始化应用数据并设置默认显示
  const initAppAppsWithDefault = async () => {
    await searchEngine.initialize()

    // 设置默认显示的分类（最近和固定）
    const defaultCategories = searchEngine.getDefaultCategories()
    searchState.value.searchCategories = defaultCategories
    return defaultCategories
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
    updateStoreCategory
  }
}

// 导出键盘导航
export { useKeyboardNavigation } from './hooks/useKeyboardNavigation'

// 导出类型
export type { SearchCategory, SearchState } from '@/typings/search-types'
