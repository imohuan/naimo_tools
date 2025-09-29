/**
 * 优化的搜索引擎
 * 提供更好的性能和可维护性
 */

import type { CoreAPI } from '@/typings/coreTypes'
import { BaseSingleton } from '../BaseSingleton'
import { ElectronSearchBridge } from './ElectronSearchBridge'
import { categoryConfig } from '@/modules/search/config/searchConfig'
import type { SearchCategory } from '@/typings/searchTypes'
import { SearchMode } from '@/typings/searchTypes'
import type { AppItem } from '@shared/typings'
import { pluginManager } from '../plugin/PluginManager'
import type { AttachedFile } from '@/typings/composableTypes'
import { PinyinSearch } from '@/utils/pinyinSearch'
import type { PluginItem } from '@/typings/pluginTypes'

/**
 * 搜索配置接口
 */
export interface SearchConfig {
  /** 最大搜索结果数量 */
  maxResults: number
  /** 搜索延迟 (ms) */
  searchDelay: number
  /** 是否启用拼音搜索 */
  enablePinyinSearch: boolean
  /** 是否启用缓存 */
  enableCache: boolean
  /** 缓存过期时间 (ms) */
  cacheExpireTime: number
}

/**
 * 搜索缓存项
 */
interface SearchCacheItem {
  query: string
  results: SearchCategory[]
  timestamp: number
  attachedFiles: string[] // 文件路径的哈希
}

/**
 * 搜索统计信息
 */
export interface SearchStats {
  /** 总搜索次数 */
  totalSearches: number
  /** 缓存命中次数 */
  cacheHits: number
  /** 平均搜索时间 (ms) */
  averageSearchTime: number
  /** 最近搜索时间 */
  lastSearchTime: number
}

/**
 * 优化的搜索引擎核心类
 */
export class SearchEngineOptimized extends BaseSingleton implements CoreAPI {
  private bridge: ElectronSearchBridge
  private categories: SearchCategory[] = []
  private searchCache = new Map<string, SearchCacheItem>()
  private pinyinSearch: PinyinSearch

  // 配置
  private config: SearchConfig = {
    maxResults: 50,
    searchDelay: 100,
    enablePinyinSearch: true,
    enableCache: true,
    cacheExpireTime: 5 * 60 * 1000 // 5分钟
  }

  // 统计信息
  private stats: SearchStats = {
    totalSearches: 0,
    cacheHits: 0,
    averageSearchTime: 0,
    lastSearchTime: 0
  }

  constructor(config?: Partial<SearchConfig>) {
    super()
    this.bridge = ElectronSearchBridge.getInstance()
    this.pinyinSearch = new PinyinSearch()

    if (config) {
      this.config = { ...this.config, ...config }
    }

    // 定期清理过期缓存
    this.startCacheCleanup()
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SearchConfig>): void {
    this.config = { ...this.config, ...config }

    // 如果禁用缓存，清空现有缓存
    if (!config.enableCache) {
      this.clearCache()
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): Readonly<SearchConfig> {
    return { ...this.config }
  }

  /**
   * 获取搜索统计信息
   */
  getStats(): Readonly<SearchStats> {
    return { ...this.stats }
  }

  /**
   * 初始化搜索引擎
   */
  async initialize(): Promise<void> {
    console.log('🔍 初始化搜索引擎...')
    const startTime = performance.now()

    try {
      // 并行初始化分类和插件
      await Promise.all([
        this.initCategories(),
        this.initPluginCategories()
      ])

      const endTime = performance.now()
      console.log(`✅ 搜索引擎初始化完成，耗时: ${(endTime - startTime).toFixed(2)}ms`)
    } catch (error) {
      console.error('❌ 搜索引擎初始化失败:', error)
      throw error
    }
  }

  /**
   * 初始化基础分类数据
   */
  private async initCategories(): Promise<void> {
    const appApps = await this.bridge.getApps()
    let [recentApps, pinnedApps, fileList] = await this.bridge.getStoreApps([
      'recentApps',
      'pinnedApps',
      'fileList'
    ])

    recentApps = recentApps || []
    pinnedApps = pinnedApps || []
    fileList = fileList || []

    // 批量加载图标以提高性能
    const [
      appAppsWithIcons,
      recentAppsWithIcons,
      pinnedAppsWithIcons,
      fileListWithIcons
    ] = await Promise.all([
      this.bridge.loadAppIcons(appApps),
      this.bridge.loadAppIcons(recentApps),
      this.bridge.loadAppIcons(pinnedApps),
      this.bridge.loadAppIcons(fileList)
    ])

    const categories: SearchCategory[] = [
      { ...categoryConfig.recent, items: recentAppsWithIcons },
      { ...categoryConfig.pinned, items: pinnedAppsWithIcons },
      { ...categoryConfig.files, items: fileListWithIcons },
      { ...categoryConfig.applications, items: appAppsWithIcons }
    ]

    this.categories = categories
  }

  /**
   * 初始化插件分类
   */
  private async initPluginCategories(): Promise<void> {
    const pluginCategories = this.getPluginCategories()
    this.addCategories(...pluginCategories)
  }

  /**
   * 获取插件分类
   */
  private getPluginCategories(): SearchCategory[] {
    try {
      const plugins = Array.from(pluginManager.installedPlugins.values())
      const pluginCategories: SearchCategory[] = []

      for (const plugin of plugins) {
        if (!plugin.enabled || plugin.items.length === 0) continue

        pluginCategories.push({
          id: `plugin-${plugin.id}`,
          name: plugin.name,
          items: plugin.items,
          isDragEnabled: false,
          maxDisplayCount: 16,
          isExpanded: false,
          isPluginCategory: true,
          pluginId: plugin.id
        } as SearchCategory & { isPluginCategory: boolean; pluginId: string })
      }

      return pluginCategories
    } catch (error) {
      console.error('❌ 加载插件数据失败:', error)
      return []
    }
  }

  /**
   * 添加分类
   */
  addCategories(...categories: SearchCategory[]): void {
    this.categories.push(...categories)
  }

  /**
   * 更新插件分类
   */
  updatePluginCategories(): void {
    // 移除旧的插件分类
    this.categories = this.categories.filter(cat => !cat.isPluginCategory)

    // 添加新的插件分类
    const pluginCategories = this.getPluginCategories()
    this.addCategories(...pluginCategories)

    // 清空相关缓存
    this.clearCache()
  }

  /**
   * 获取默认分类（首页显示）
   */
  getDefaultCategories(): SearchCategory[] {
    const defaultCategoryIds = ['recent', 'pinned']

    return this.categories
      .filter(cat => defaultCategoryIds.includes(cat.id))
      .filter(cat => cat.items.length > 0)
      .map(cat => this.filterEnabledPluginItems(cat))
  }

  /**
   * 过滤已启用的插件项目
   */
  private filterEnabledPluginItems(category: SearchCategory): SearchCategory {
    if (category.id !== 'recent') return category

    const enabledPluginIds = new Set(
      Array.from(pluginManager.installedPlugins.values())
        .filter(plugin => plugin.enabled)
        .map(plugin => plugin.id)
    )

    const filteredItems = category.items.filter(item => {
      const pluginId = (item as PluginItem).pluginId
      return pluginId ? enabledPluginIds.has(pluginId) : true
    })

    return { ...category, items: filteredItems }
  }

  /**
   * 执行搜索
   */
  async performSearch(
    query: string,
    attachedFiles: AttachedFile[] = []
  ): Promise<SearchCategory[]> {
    const startTime = performance.now()
    this.stats.totalSearches++

    try {
      // 检查缓存
      if (this.config.enableCache) {
        const cachedResult = this.getCachedResult(query, attachedFiles)
        if (cachedResult) {
          this.stats.cacheHits++
          return cachedResult
        }
      }

      // 执行搜索
      const results = await this.executeSearch(query, attachedFiles)

      // 缓存结果
      if (this.config.enableCache) {
        this.cacheResult(query, attachedFiles, results)
      }

      // 更新统计信息
      const endTime = performance.now()
      const searchTime = endTime - startTime
      this.updateStats(searchTime)

      return results
    } catch (error) {
      console.error('❌ 搜索执行失败:', error)
      return []
    }
  }

  /**
   * 执行实际搜索逻辑
   */
  private async executeSearch(
    query: string,
    attachedFiles: AttachedFile[]
  ): Promise<SearchCategory[]> {
    const trimmedQuery = query.trim()

    // 空查询返回默认分类
    if (!trimmedQuery && attachedFiles.length === 0) {
      return this.getDefaultCategories()
    }

    const results: SearchCategory[] = []

    // 如果有附件文件，添加文件分类
    if (attachedFiles.length > 0) {
      results.push(this.createAttachedFilesCategory(attachedFiles))
    }

    // 如果有查询文本，执行搜索
    if (trimmedQuery) {
      const searchResults = await this.searchInCategories(trimmedQuery)
      results.push(...searchResults)
    }

    return results
  }

  /**
   * 创建附件文件分类
   */
  private createAttachedFilesCategory(attachedFiles: AttachedFile[]): SearchCategory {
    const fileItems: AppItem[] = attachedFiles.map(file => ({
      name: file.name,
      path: file.path,
      icon: file.icon || null,
      lastUsed: Date.now(),
      usageCount: 1
    }))

    return {
      id: 'attached-files',
      name: '附件文件',
      items: fileItems,
      isDragEnabled: false,
      maxDisplayCount: 10,
      isExpanded: true
    }
  }

  /**
   * 在所有分类中搜索
   */
  private async searchInCategories(query: string): Promise<SearchCategory[]> {
    const searchPromises = this.categories.map(category =>
      this.searchInCategory(category, query)
    )

    const searchResults = await Promise.all(searchPromises)

    // 过滤空结果并按相关性排序
    return searchResults
      .filter(result => result.items.length > 0)
      .sort((a, b) => this.compareSearchResults(a, b, query))
  }

  /**
   * 在单个分类中搜索
   */
  private async searchInCategory(
    category: SearchCategory,
    query: string
  ): Promise<SearchCategory> {
    const searchResults = category.items.filter(item =>
      this.matchesSearchQuery(item, query)
    )

    // 按相关性排序
    const sortedResults = searchResults
      .sort((a, b) => this.calculateRelevanceScore(b, query) - this.calculateRelevanceScore(a, query))
      .slice(0, this.config.maxResults)

    return {
      ...category,
      items: sortedResults,
      isExpanded: sortedResults.length > 0
    }
  }

  /**
   * 检查项目是否匹配搜索查询
   */
  private matchesSearchQuery(item: AppItem, query: string): boolean {
    const lowerQuery = query.toLowerCase()
    const lowerName = item.name.toLowerCase()

    // 精确匹配
    if (lowerName.includes(lowerQuery)) return true

    // 拼音搜索
    if (this.config.enablePinyinSearch) {
      return this.pinyinSearch.match(item.name, query)
    }

    return false
  }

  /**
   * 计算相关性分数
   */
  private calculateRelevanceScore(item: AppItem, query: string): number {
    let score = 0
    const lowerQuery = query.toLowerCase()
    const lowerName = item.name.toLowerCase()

    // 精确匹配得分更高
    if (lowerName === lowerQuery) score += 100
    else if (lowerName.startsWith(lowerQuery)) score += 80
    else if (lowerName.includes(lowerQuery)) score += 60

    // 使用频率加分
    score += Math.min(item.usageCount || 0, 20)

    // 最近使用加分
    const daysSinceLastUsed = (Date.now() - (item.lastUsed || 0)) / (1000 * 60 * 60 * 24)
    if (daysSinceLastUsed < 1) score += 10
    else if (daysSinceLastUsed < 7) score += 5

    return score
  }

  /**
   * 比较搜索结果分类
   */
  private compareSearchResults(
    a: SearchCategory,
    b: SearchCategory,
    query: string
  ): number {
    // 优先级：best-match > recent > pinned > applications > plugins > files
    const priority = {
      'best-match': 1,
      'recent': 2,
      'pinned': 3,
      'applications': 4,
      'attached-files': 5
    }

    const aPriority = priority[a.id as keyof typeof priority] || 6
    const bPriority = priority[b.id as keyof typeof priority] || 6

    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }

    // 相同优先级按结果数量排序
    return b.items.length - a.items.length
  }

  /**
   * 获取缓存结果
   */
  private getCachedResult(
    query: string,
    attachedFiles: AttachedFile[]
  ): SearchCategory[] | null {
    const cacheKey = this.generateCacheKey(query, attachedFiles)
    const cached = this.searchCache.get(cacheKey)

    if (!cached) return null

    // 检查是否过期
    if (Date.now() - cached.timestamp > this.config.cacheExpireTime) {
      this.searchCache.delete(cacheKey)
      return null
    }

    return cached.results
  }

  /**
   * 缓存搜索结果
   */
  private cacheResult(
    query: string,
    attachedFiles: AttachedFile[],
    results: SearchCategory[]
  ): void {
    const cacheKey = this.generateCacheKey(query, attachedFiles)
    const cacheItem: SearchCacheItem = {
      query,
      results: JSON.parse(JSON.stringify(results)), // 深拷贝
      timestamp: Date.now(),
      attachedFiles: attachedFiles.map(f => f.path)
    }

    this.searchCache.set(cacheKey, cacheItem)

    // 限制缓存大小
    if (this.searchCache.size > 100) {
      const oldestKey = this.searchCache.keys().next().value
      this.searchCache.delete(oldestKey)
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(query: string, attachedFiles: AttachedFile[]): string {
    const filesHash = attachedFiles.map(f => f.path).sort().join('|')
    return `${query}:${filesHash}`
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.searchCache.clear()
  }

  /**
   * 更新统计信息
   */
  private updateStats(searchTime: number): void {
    this.stats.lastSearchTime = Date.now()

    // 计算平均搜索时间
    const totalTime = this.stats.averageSearchTime * (this.stats.totalSearches - 1) + searchTime
    this.stats.averageSearchTime = totalTime / this.stats.totalSearches
  }

  /**
   * 启动缓存清理
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      for (const [key, cached] of this.searchCache.entries()) {
        if (now - cached.timestamp > this.config.cacheExpireTime) {
          this.searchCache.delete(key)
        }
      }
    }, this.config.cacheExpireTime)
  }

  /**
   * 扁平化搜索结果
   */
  flatItems(categories: SearchCategory[]): AppItem[] {
    return categories.flatMap(category => category.items)
  }

  /**
   * 更新存储分类
   */
  async updateStoreCategory(): Promise<void> {
    await this.bridge.updateStoreCategory()

    // 重新初始化分类数据
    await this.initCategories()

    // 清空缓存以确保数据一致性
    this.clearCache()
  }

  /**
   * 销毁搜索引擎
   */
  destroy(): void {
    this.clearCache()
    super.destroy()
  }
}

// 创建单例实例
export const searchEngineOptimized = new SearchEngineOptimized()
