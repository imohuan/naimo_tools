import { ref } from 'vue'
import type { AppItem } from '@shared/types'
import type { SearchCategory } from '@/typings/search-types'
import { categoryConfig } from '../config/search.config'
import { pluginManager } from "@/core/plugin/PluginManager"

import type { PluginItem } from '@/typings/plugin-types'

export function useAppData() {
  const originalCategories = ref<SearchCategory[]>([])

  // 序列化应用项目，确保只包含可序列化的属性
  const serializeAppItems = (items: AppItem[]): AppItem[] => {
    return items.map((item) => {
      const serialized: any = {
        name: item.name,
        path: item.path,
        icon: null,
        ...(item.lastUsed && { lastUsed: item.lastUsed }),
        ...(item.usageCount && { usageCount: item.usageCount }),
      }

      // 如果是插件项目，保留插件相关字段
      if ('pluginId' in item && 'executeType' in item) {
        serialized.pluginId = (item as any).pluginId
        serialized.executeType = (item as any).executeType
        if ((item as any).executeParams) {
          serialized.executeParams = (item as any).executeParams
        }
      }

      return serialized
    })
  }

  // 为应用项目重新获取图标
  const loadAppIcons = async (items: AppItem[]): Promise<AppItem[]> => {
    const itemsWithIcons = await Promise.all(
      items.map(async (item) => {
        if (item.icon) return item
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

  // 加载插件数据
  const loadPluginData = async (): Promise<SearchCategory[]> => {
    console.log('🔌 开始加载插件数据...')

    try {
      const plugins = Array.from(pluginManager.allAvailablePlugins.values())
      console.log('📦 加载到的插件:', plugins.map(p => ({ id: p.id, name: p.name, itemsCount: p.items.length })))

      const pluginCategories: SearchCategory[] = []

      // 为每个启用的插件创建分类
      for (const plugin of plugins) {
        if (!plugin.enabled) continue

        // 将插件项目转换为AppItem格式
        const pluginItems: AppItem[] = plugin.items
          .filter(item => item.visible)
          .map(item => ({
            name: item.name,
            path: item.path,
            icon: item.icon,
            lastUsed: item.lastUsed,
            usageCount: item.usageCount,
            // 添加插件相关的元数据
            pluginId: item.pluginId,
            executeType: item.executeType,
            executeParams: item.executeParams
          } as AppItem & { pluginId: string; executeType: number; executeParams?: any }))

        if (pluginItems.length > 0) {
          pluginCategories.push({
            id: `plugin-${plugin.id}`,
            name: plugin.name,
            items: pluginItems,
            isDragEnabled: false,
            maxDisplayCount: 16,
            isExpanded: false,
            // 插件分类的特殊标识
            isPluginCategory: true,
            pluginId: plugin.id
          } as SearchCategory & { isPluginCategory: boolean; pluginId: string })
        }
      }

      console.log('✅ 插件分类创建完成:', pluginCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        itemsCount: cat.items.length
      })))

      return pluginCategories
    } catch (error) {
      console.error('❌ 加载插件数据失败:', error)
      return []
    }
  }

  // 初始化所有应用数据
  const initAppApps = async (): Promise<SearchCategory[]> => {
    console.log('🚀 开始初始化应用数据...')

    // 并行获取所有数据
    const [appApps, recentApps, pinnedApps, fileList, pluginCategories] = await Promise.all([
      api.ipcRouter.appSearchApps(),
      api.ipcRouter.storeGet('recentApps') || [],
      api.ipcRouter.storeGet('pinnedApps') || [],
      api.ipcRouter.storeGet('fileList') || [],
      loadPluginData()
    ])

    console.log('📊 获取到的原始数据:', {
      appApps: appApps.length,
      recentApps: recentApps.length,
      pinnedApps: pinnedApps.length,
      fileList: fileList.length,
      pluginCategories: pluginCategories.length
    })

    // 为所有应用重新获取图标
    const [appAppsWithIcons, recentAppsWithIcons, pinnedAppsWithIcons, fileListWithIcons] = await Promise.all([
      loadAppIcons(appApps),
      loadAppIcons(recentApps),
      loadAppIcons(pinnedApps),
      loadAppIcons(fileList)
    ])

    const categories = [
      {
        ...categoryConfig.recent,
        items: recentAppsWithIcons,
      },
      {
        ...categoryConfig.pinned,
        items: pinnedAppsWithIcons,
      },
      {
        ...categoryConfig.files,
        items: fileListWithIcons,
        customSearch: categoryConfig.files.customSearch,
      },
      {
        ...categoryConfig.applications,
        items: [...appAppsWithIcons],
      },
      // 添加插件分类
      ...pluginCategories
    ]

    console.log('✅ 初始化完成，分类数据:', categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      itemsCount: cat.items.length,
      isPlugin: (cat as any).isPluginCategory || false
    })))

    return categories
  }

  // 获取默认显示的分类（最近和已固定）
  const getDefaultCategories = (allCategories: SearchCategory[]): SearchCategory[] => {
    const enabledPlugins = Array.from(pluginManager.installedPlugins.values()).filter(plugin => plugin.enabled)
    const pluginIds = enabledPlugins.map(plugin => plugin.id)
    const categories = allCategories.filter(category =>
      category.id === 'recent' || category.id === 'pinned'
    ).map(category => {
      const items = category.items.filter(item => {
        const pluginId = (item as PluginItem).pluginId
        return pluginId ? pluginIds.includes(pluginId) : true
      })
      return { ...category, items }
    })
    return categories
  }

  // 获取搜索时的分类配置
  const getSearchCategories = (allCategories: SearchCategory[]): SearchCategory[] => {
    console.log('🔍 getSearchCategories 被调用:', {
      allCategoriesCount: allCategories.length,
      allCategories: allCategories.map(cat => ({ id: cat.id, name: cat.name, itemsCount: cat.items.length }))
    })

    // 获取所有分类的数据
    const applicationsCategory = allCategories.find(cat => cat.id === 'applications')
    const filesCategory = allCategories.find(cat => cat.id === 'files')
    // const recentCategory = allCategories.find(cat => cat.id === 'recent')
    const pinnedCategory = allCategories.find(cat => cat.id === 'pinned')

    // 获取所有插件分类
    const pluginCategories = allCategories.filter(cat => {
      return cat.isPluginCategory && cat.items.length > 0
    })

    console.log('📂 找到的分类:', {
      applications: applicationsCategory ? { itemsCount: applicationsCategory.items.length } : null,
      files: filesCategory ? { itemsCount: filesCategory.items.length } : null,
      // recent: recentCategory ? { itemsCount: recentCategory.items.length } : null,
      pinned: pinnedCategory ? { itemsCount: pinnedCategory.items.length } : null,
      plugins: pluginCategories.map(cat => ({ id: cat.id, name: cat.name, itemsCount: cat.items.length }))
    })

    // 合并所有分类的数据用于最佳搜索结果
    const allApps = [
      ...(applicationsCategory?.items || []),
      ...(filesCategory?.items || []),
      // ...(recentCategory?.items || []),
      ...(pinnedCategory?.items || []),
      // 展开所有插件分类的项目
      ...pluginCategories.flatMap(cat => cat.items)
    ]

    // 去重（基于路径）
    const uniqueApps = allApps.filter((app, index, self) =>
      index === self.findIndex(a => a.path === app.path)
    )

    console.log('🔄 合并后的应用数据:', {
      totalApps: allApps.length,
      uniqueApps: uniqueApps.length,
      pluginApps: pluginCategories.flatMap(cat => cat.items).length,
      uniqueAppNames: uniqueApps.map(app => app.name)
    })

    const searchCategories = [
      {
        id: 'best-match',
        name: '最佳搜索结果',
        items: uniqueApps,
        isDragEnabled: false,
        maxDisplayCount: 24,
        isExpanded: false,
      },
      {
        id: 'recommended',
        name: '匹配推荐',
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

    console.log('✅ 搜索分类配置:', searchCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      itemsCount: cat.items.length
    })))

    return searchCategories
  }


  return {
    originalCategories,
    serializeAppItems,
    loadAppIcons,
    initAppApps,
    getDefaultCategories,
    getSearchCategories,
  }
}
