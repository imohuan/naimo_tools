import { ref, computed } from 'vue'
import type { AppItem } from '../../../shared/types'

export interface SearchCategory {
  id: string
  name: string
  items: AppItem[]
  isDragEnabled: boolean
  maxDisplayCount: number
  isExpanded: boolean
  customSearch?: (searchText: string, items: AppItem[]) => AppItem[]
}

export function useSearch(
  getDefaultCategories: (allCategories: SearchCategory[]) => SearchCategory[],
  getSearchCategories: (allCategories: SearchCategory[]) => SearchCategory[]
) {
  const searchText = ref('')
  const searchCategories = ref<SearchCategory[]>([])
  const originalCategories = ref<SearchCategory[]>([])
  const isSearching = ref(false)

  // 扁平化的所有项目列表，包含分类信息
  const flatItems = computed(() => {
    const items: Array<AppItem & { categoryId: string }> = []
    for (const category of searchCategories.value) {
      const displayItems = category.isExpanded || category.items.length <= category.maxDisplayCount
        ? category.items
        : category.items.slice(0, category.maxDisplayCount)

      const itemsWithCategory = displayItems.map((item) => ({
        ...item,
        categoryId: category.id,
      }))
      items.push(...itemsWithCategory)
    }
    return items
  })

  // 执行搜索
  const performSearch = async () => {
    try {
      isSearching.value = true
      const searchQuery = searchText.value.trim()

      // 根据搜索状态选择不同的分类配置
      const baseCategories = searchQuery.length === 0
        ? getDefaultCategories(originalCategories.value)
        : getSearchCategories(originalCategories.value)

      const filteredCategories: SearchCategory[] = []

      for (const category of baseCategories) {
        let filteredItems: AppItem[] = []

        if (searchQuery.length === 0) {
          filteredItems = [...category.items]
        } else {
          if (category.customSearch) {
            filteredItems = category.customSearch(searchQuery, category.items)
          } else {
            filteredItems = category.items.filter((item) =>
              item.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
          }
        }

        if (filteredItems.length > 0) {
          filteredCategories.push({
            ...category,
            items: filteredItems,
          })
        }
      }

      searchCategories.value = filteredCategories
    } catch (error) {
      console.error('搜索失败:', error)
      searchCategories.value = []
    } finally {
      isSearching.value = false
    }
  }

  // 处理搜索
  const handleSearch = async (value: string) => {
    searchText.value = value
    await performSearch()
  }

  // 更新分类数据
  const updateCategoryInBoth = (
    categoryId: string,
    updater: (category: SearchCategory) => void
  ) => {
    const originalCategory = originalCategories.value.find((cat) => cat.id === categoryId)
    if (originalCategory) {
      updater(originalCategory)
    }

    const searchCategory = searchCategories.value.find((cat) => cat.id === categoryId)
    if (searchCategory) {
      updater(searchCategory)
    }
  }

  return {
    searchText,
    searchCategories,
    originalCategories,
    isSearching,
    flatItems,
    performSearch,
    handleSearch,
    updateCategoryInBoth,
  }
}
