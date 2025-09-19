import type { CoreAPI } from '@/typings/core-types'
import { BaseSingleton } from '../BaseSingleton'
import { ElectronSearchBridge } from './ElectronSearchBridge'
import { categoryConfig } from '@/modules/search/config/search.config'
import type { SearchCategory } from '@/typings/search-types'
import type { AppItem } from '@shared/types'

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
    return this.categories.filter(category => category.id === 'recent' || category.id === 'pinned')
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

  async reset(): Promise<void> {
    this.categories = []
  }

  async destroy(): Promise<void> {
    this.reset()
  }
}

// 导出单例实例
export const searchEngine = SearchEngine.getInstance()
