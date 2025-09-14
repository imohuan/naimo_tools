import { ref, computed } from 'vue'
import type { AppItem } from '../../../shared/types'
import type { SearchCategory } from './useSearch'

export function useAppManagement() {
  const selectedIndex = ref(0)
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

  // 序列化应用项目，确保只包含可序列化的属性
  const serializeAppItems = (items: AppItem[]): AppItem[] => {
    return items.map((item) => ({
      name: item.name,
      path: item.path,
      icon: null,
      ...(item.lastUsed && { lastUsed: item.lastUsed }),
      ...(item.usageCount && { usageCount: item.usageCount }),
    }))
  }

  // 为应用项目重新获取图标
  const loadAppIcons = async (items: AppItem[]): Promise<AppItem[]> => {
    const itemsWithIcons = await Promise.all(
      items.map(async (item) => {
        if (item.icon) {
          return item
        }

        try {
          const icon = await api.ipcRouter.appExtractFileIcon(item.path)
          return { ...item, icon }
        } catch (error) {
          console.warn(`获取应用图标失败: ${item.name}`, error)
          return { ...item, icon: null }
        }
      })
    )

    return itemsWithIcons
  }

  // 初始化所有应用数据
  const initAppApps = async (): Promise<SearchCategory[]> => {
    // 并行获取所有数据
    const [appApps, recentApps, pinnedApps, fileList] = await Promise.all([
      api.ipcRouter.appSearchApps(),
      api.ipcRouter.storeGet('recentApps') || [],
      api.ipcRouter.storeGet('pinnedApps') || [],
      api.ipcRouter.storeGet('fileList') || []
    ])

    // 为所有应用重新获取图标
    const [recentAppsWithIcons, pinnedAppsWithIcons, fileListWithIcons] = await Promise.all([
      loadAppIcons(recentApps),
      loadAppIcons(pinnedApps),
      loadAppIcons(fileList)
    ])

    return [
      {
        id: 'recent',
        name: '最近使用',
        items: recentAppsWithIcons,
        isDragEnabled: false,
        maxDisplayCount: 16,
        isExpanded: false,
      },
      {
        id: 'pinned',
        name: '已固定',
        items: pinnedAppsWithIcons,
        isDragEnabled: true,
        maxDisplayCount: 16,
        isExpanded: false,
      },
      {
        id: 'files',
        name: '文件',
        items: fileListWithIcons,
        isDragEnabled: true,
        maxDisplayCount: 16,
        isExpanded: false,
        customSearch: (searchText: string, items: AppItem[]) => {
          return items.filter((item) => {
            const name = item.name.toLowerCase()
            const query = searchText.toLowerCase()
            return name.includes(query) || name.split('.').pop()?.includes(query)
          })
        },
      },
      {
        id: 'applications',
        name: '应用',
        items: [...appApps],
        isDragEnabled: false,
        maxDisplayCount: 24,
        isExpanded: false,
      },
    ]
  }

  // 获取默认显示的分类（最近和已固定）
  const getDefaultCategories = (allCategories: SearchCategory[]): SearchCategory[] => {
    return allCategories.filter(category =>
      category.id === 'recent' || category.id === 'pinned'
    )
  }

  // 获取搜索时的分类配置
  const getSearchCategories = (allCategories: SearchCategory[]): SearchCategory[] => {
    const applicationsCategory = allCategories.find(cat => cat.id === 'applications')
    const filesCategory = allCategories.find(cat => cat.id === 'files')

    return [
      {
        id: 'best-match',
        name: '最佳搜索结果',
        items: applicationsCategory ? [...applicationsCategory.items] : [],
        isDragEnabled: false,
        maxDisplayCount: 24,
        isExpanded: false,
      },
      {
        id: 'recommended',
        name: '匹配最佳(推荐)',
        items: filesCategory ? [...filesCategory.items] : [],
        isDragEnabled: true,
        maxDisplayCount: 16,
        isExpanded: false,
        customSearch: filesCategory?.customSearch || ((searchText: string, items: AppItem[]) => {
          return items.filter((item) => {
            const name = item.name.toLowerCase()
            const query = searchText.toLowerCase()
            return name.includes(query) || name.split('.').pop()?.includes(query)
          })
        }),
      },
    ]
  }

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

  // 启动应用
  const launchApp = async (app: AppItem) => {
    try {
      const success = await api.ipcRouter.appLaunchApp(app.path)
      if (success) {
        await updateRecentApps(app)
        return true
      }
      return false
    } catch (error) {
      console.error('启动应用失败:', error)
      return false
    }
  }

  // 更新最近使用应用记录
  const updateRecentApps = async (app: AppItem) => {
    try {
      const appWithUsage: AppItem = {
        ...app,
        lastUsed: Date.now(),
        usageCount: 1,
      }

      updateCategoryInBoth('recent', (recentCategory) => {
        const existingIndex = recentCategory.items.findIndex(
          (item) => item.path === app.path
        )
        if (existingIndex >= 0) {
          recentCategory.items[existingIndex].lastUsed = Date.now()
          recentCategory.items[existingIndex].usageCount =
            (recentCategory.items[existingIndex].usageCount || 0) + 1

          const updatedApp = recentCategory.items.splice(existingIndex, 1)[0]
          recentCategory.items.unshift(updatedApp)
        } else {
          recentCategory.items.unshift(appWithUsage)
        }

        if (recentCategory.items.length > recentCategory.maxDisplayCount) {
          recentCategory.items = recentCategory.items.slice(0, recentCategory.maxDisplayCount)
        }
      })

      const originalRecentCategory = originalCategories.value.find(
        (cat: any) => cat.id === 'recent'
      )
      if (originalRecentCategory) {
        await api.ipcRouter.storeSet(
          'recentApps',
          serializeAppItems(originalRecentCategory.items)
        )
      }
    } catch (error) {
      console.error('更新最近使用应用记录失败:', error)
    }
  }

  // 处理分类展开/收起
  const handleCategoryToggle = (categoryId: string) => {
    updateCategoryInBoth(categoryId, (category) => {
      category.isExpanded = !category.isExpanded
    })
  }

  // 处理分类内拖拽排序
  const handleCategoryDragEnd = async (categoryId: string, newItems: AppItem[]) => {
    updateCategoryInBoth(categoryId, (category) => {
      category.items = newItems
    })

    try {
      const serializableItems = serializeAppItems(newItems)

      switch (categoryId) {
        case 'pinned':
          await api.ipcRouter.storeSet('pinnedApps', serializableItems)
          break
        case 'recent':
          await api.ipcRouter.storeSet('recentApps', serializableItems)
          break
        case 'files':
          await api.ipcRouter.storeSet('fileList', serializableItems)
          break
      }
    } catch (error) {
      console.error(`保存分类 ${categoryId} 排序失败:`, error)
    }
  }

  // 处理应用删除
  const handleAppDelete = async (app: AppItem, categoryId: string) => {
    updateCategoryInBoth(categoryId, (category) => {
      const index = category.items.findIndex((item) => item.path === app.path)
      if (index > -1) {
        category.items.splice(index, 1)
      }
    })

    try {
      const category = originalCategories.value.find((cat: any) => cat.id === categoryId)
      if (category) {
        const serializableItems = serializeAppItems(category.items)

        switch (categoryId) {
          case 'pinned':
            await api.ipcRouter.storeSet('pinnedApps', serializableItems)
            break
          case 'recent':
            await api.ipcRouter.storeSet('recentApps', serializableItems)
            break
          case 'files':
            await api.ipcRouter.storeSet('fileList', serializableItems)
            break
        }
      }
    } catch (error) {
      console.error(`保存分类 ${categoryId} 删除后状态失败:`, error)
    }

    await performSearch()
  }

  // 处理应用固定
  const handleAppPin = async (app: AppItem) => {
    const appCopy = {
      name: app.name,
      path: app.path,
      icon: app.icon,
      ...(app.lastUsed && { lastUsed: app.lastUsed }),
      ...(app.usageCount && { usageCount: app.usageCount }),
    }

    updateCategoryInBoth('pinned', (pinnedCategory) => {
      const existingIndex = pinnedCategory.items.findIndex(
        (item) => item.path === app.path
      )
      if (existingIndex === -1) {
        pinnedCategory.items.unshift(appCopy)
      }
    })

    try {
      const pinnedCategory = originalCategories.value.find((cat: any) => cat.id === 'pinned')
      if (pinnedCategory) {
        const serializableItems = serializeAppItems(pinnedCategory.items)
        await api.ipcRouter.storeSet('pinnedApps', serializableItems)
      }
    } catch (error) {
      console.error('保存应用固定状态失败:', error)
    }

    await performSearch()
  }

  return {
    selectedIndex,
    searchText,
    searchCategories,
    originalCategories,
    flatItems,
    performSearch,
    handleSearch,
    updateCategoryInBoth,
    initAppApps,
    getDefaultCategories,
    getSearchCategories,
    launchApp,
    handleCategoryToggle,
    handleCategoryDragEnd,
    handleAppDelete,
    handleAppPin,
  }
}
