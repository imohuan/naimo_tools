import type { CoreAPI } from '@/typings/core-types'
import { BaseSingleton } from '../BaseSingleton'
import { ElectronSearchBridge } from './ElectronSearchBridge'
import { categoryConfig } from '@/modules/search/config/search.config'
import type { SearchCategory } from '@/typings/search-types'
import type { AppItem } from '@shared/types'
import { pluginManager } from '../plugin/PluginManager'
import type { AttachedFile } from '@/composables/useFileHandler'
import { PinyinSearch } from '@/utils/pinyin-search'
import type { PluginItem } from '@/typings/plugin-types'

/**
 * 搜索引擎核心类
 * 处理搜索逻辑，不依赖Vue框架
 */
export class SearchEngine extends BaseSingleton implements CoreAPI {
  private bridge: ElectronSearchBridge
  /** 分类数据 */
  private categories: SearchCategory[] = []

  constructor() {
    super()
    this.bridge = ElectronSearchBridge.getInstance()
  }

  async initialize(): Promise<void> {
    await this.initCategories()
    const pluginCategories = this.getPluginCategories()
    this.addCategories(...pluginCategories)
  }

  getPluginCategories(): SearchCategory[] {
    console.log('🔌 开始加载插件数据...')
    try {
      const plugins = Array.from(pluginManager.installedPlugins.values())
      console.log('📦 加载到的插件:', plugins.map(p => ({ id: p.id, name: p.name, itemsCount: p.items.length })))
      const pluginCategories: SearchCategory[] = []

      // 为每个启用的插件创建分类
      for (const plugin of plugins) {
        if (!plugin.enabled) continue

        // 将插件项目转换为AppItem格式
        // const pluginItems: AppItem[] = plugin.items
        //   .filter(item => item.visible)
        //   .map(item => ({
        //     name: item.name,
        //     path: item.path,
        //     icon: item.icon,
        //     lastUsed: item.lastUsed,
        //     usageCount: item.usageCount,
        //     // 添加插件相关的元数据
        //     pluginId: item.pluginId,
        //     executeType: item.executeType,
        //     executeParams: item.executeParams
        //   } as AppItem & { pluginId: string; executeType: number; executeParams?: any }))

        if (plugin.items.length > 0) {
          pluginCategories.push({
            id: `plugin-${plugin.id}`,
            name: plugin.name,
            items: plugin.items,
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

  /** 初始化分类数据 */
  async initCategories(): Promise<SearchCategory[]> {
    const appApps = await this.bridge.getApps()
    const [recentApps, pinnedApps, fileList] = await this.bridge.getStoreApps(['recentApps', 'pinnedApps', 'fileList'])

    console.log('📊 获取到的原始数据:', {
      appApps: appApps.length,
      recentApps: recentApps.length,
      pinnedApps: pinnedApps.length,
      fileList: fileList.length,
    })

    // 为所有应用重新获取图标
    const [appAppsWithIcons, recentAppsWithIcons, pinnedAppsWithIcons, fileListWithIcons] = await Promise.all([
      this.bridge.loadAppIcons(appApps),
      this.bridge.loadAppIcons(recentApps),
      this.bridge.loadAppIcons(pinnedApps),
      this.bridge.loadAppIcons(fileList)
    ])

    const categories = [
      { ...categoryConfig.recent, items: recentAppsWithIcons, },
      { ...categoryConfig.pinned, items: pinnedAppsWithIcons, },
      {
        ...categoryConfig.files, items: fileListWithIcons, customSearch: categoryConfig.files.customSearch,
      },
      { ...categoryConfig.applications, items: [...appAppsWithIcons], },
    ]

    this.categories = categories
    return categories
  }

  /** 添加分类数据(自定义分类) */
  addCategories(...categories: SearchCategory[]): void {
    this.categories.push(...categories)
  }

  /** 获取默认分类 */
  getDefaultCategories(): SearchCategory[] {
    const recentCategory = this.categories.find(cat => cat.id === 'recent')
    const pinnedCategory = this.categories.find(cat => cat.id === 'pinned')
    const applicationsCategory = this.categories.find(cat => cat.id === 'applications')

    if (recentCategory && recentCategory.items.length > 0) {
      const enabledPluginIds = new Set(Array.from(pluginManager.installedPlugins.values()).filter(plugin => plugin.enabled).map(plugin => plugin.id))
      recentCategory.items = recentCategory.items.filter(item => {
        const pluginId = (item as PluginItem).pluginId
        return pluginId ? enabledPluginIds.has(pluginId) : true
      }) || []
    }
    return [recentCategory, pinnedCategory, applicationsCategory].filter(category => category !== undefined)
  }

  /** 获取搜索分类 */
  getSearchCategories(): SearchCategory[] {
    console.log('🔍 getSearchCategories 被调用:', {
      allCategoriesCount: this.categories.length,
      allCategories: this.categories.map(cat => ({ id: cat.id, name: cat.name, itemsCount: cat.items.length }))
    })

    // 获取所有分类的数据
    const applicationsCategory = this.categories.find(cat => cat.id === 'applications')
    const filesCategory = this.categories.find(cat => cat.id === 'files')
    const pinnedCategory = this.categories.find(cat => cat.id === 'pinned')

    // 获取所有插件分类
    const pluginCategories = this.categories.filter(cat => {
      return cat.isPluginCategory && cat.items.length > 0
    })

    console.log('📂 找到的分类:', {
      applications: applicationsCategory ? { itemsCount: applicationsCategory.items.length } : null,
      files: filesCategory ? { itemsCount: filesCategory.items.length } : null,
      pinned: pinnedCategory ? { itemsCount: pinnedCategory.items.length } : null,
      plugins: pluginCategories.map(cat => ({ id: cat.id, name: cat.name, itemsCount: cat.items.length }))
    })

    // 合并所有分类的数据用于最佳搜索结果
    const allApps = [
      ...(applicationsCategory?.items || []),
      ...(filesCategory?.items || []),
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

  /** 获取附加文件分类 */
  getAttachedFilesCategory(items: AppItem[], attachedFiles: AttachedFile[]): SearchCategory {
    const text = `files:(${attachedFiles.map(file => file.name).join('|')});file_length:${attachedFiles.length}`
    const filterItems = items.filter(item => (item as PluginItem).onSearch && (item as PluginItem).onSearch!(text, attachedFiles))

    return {
      id: 'file_tools',
      name: '匹配工具',
      items: filterItems,
      isDragEnabled: false,
      maxDisplayCount: 20,
      isExpanded: false,
    }
  }

  /** 
   * 扁平化所有项目列表，包含分类信息
   * @param searchCategories 搜索分类
   * @returns 扁平化后的项目列表
  */
  flatItems(searchCategories: SearchCategory[]) {
    const items: Array<AppItem & { categoryId: string }> = []
    console.log('🔄 计算 flatItems:', {
      categoriesCount: searchCategories.length,
      categories: searchCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        itemsCount: cat.items.length
      }))
    })

    for (const category of searchCategories) {
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
  }

  /**
   * 执行搜索
   * @param searchText 搜索词
   * @param attachedFiles 附加文件
   * @param attachedPluginItems 附加插件项目
   * @returns 搜索结果
   */
  async performSearch(searchText: string, attachedFiles?: AttachedFile[], attachedPluginItems?: AppItem[]) {
    try {
      const searchQuery = searchText.trim()

      console.log('🔍 执行搜索:', {
        searchQuery,
        originalCategoriesCount: this.categories.length,
        attachedFilesCount: attachedFiles?.length || 0,
        attachedPluginItemsCount: attachedPluginItems?.length || 0
      })

      // 根据搜索状态选择不同的分类配置
      let categories: SearchCategory[] = []
      if (searchQuery.length === 0) {
        categories = this.getDefaultCategories()
      } else {
        categories = this.getSearchCategories()
      }

      const items = this.categories.filter(cat => cat.isPluginCategory).flatMap(cat => cat.items)

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
        categories = [this.getAttachedFilesCategory(items, attachedFiles), attachedFilesCategory]

        console.log('📎 添加附加文件分类:', {
          id: attachedFilesCategory.id,
          name: attachedFilesCategory.name,
          itemsCount: attachedFilesCategory.items.length
        })
      }

      console.log('📂 基础分类:', categories.map(cat => ({ id: cat.id, name: cat.name, itemsCount: cat.items.length })))
      const filteredCategories: SearchCategory[] = []

      for (const category of categories) {
        let filteredItems: AppItem[] = []

        console.log(`🔍 处理分类 ${category.name}:`, {
          id: category.id,
          originalItemsCount: category.items.length,
          hasCustomSearch: !!category.customSearch,
          searchQuery
        })

        category.items = category.items.filter(item => !item.hidden)

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

        // 对于默认显示的分类，只有在有项目时才显示
        if (filteredItems.length > 0) filteredCategories.push({ ...category, items: filteredItems, })
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

      return filteredCategories
    } catch (error) {
      console.error('❌ 搜索失败:', error)
      return []
    }
  }

  async reset(): Promise<void> {
    this.categories = []
  }

  async destroy(): Promise<void> {
    this.reset()
  }
}

// 导出单例实例
export const searchEngine = SearchEngine.getInstance()
