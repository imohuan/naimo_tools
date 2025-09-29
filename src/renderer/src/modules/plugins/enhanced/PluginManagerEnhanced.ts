/**
 * 增强版插件管理器
 * 提供更高效的插件加载、管理和监控功能
 */

import { ref, computed, watch, nextTick } from 'vue'
import { SmartCacheManager, CacheStrategy } from '@/core/cache/SmartCacheManager'
import { useDebounceFn, useThrottleFn } from '@/utils/performance'
import type { PluginConfig, PluginItem, PluginCategory } from '@/typings/pluginTypes'

/**
 * 插件状态枚举
 */
export enum PluginStatus {
  UNLOADED = 'unloaded',     // 未加载
  LOADING = 'loading',       // 加载中
  LOADED = 'loaded',         // 已加载
  ERROR = 'error',           // 加载错误
  DISABLED = 'disabled',     // 已禁用
  UPDATING = 'updating'      // 更新中
}

/**
 * 插件性能指标接口
 */
export interface PluginPerformanceMetrics {
  /** 加载时间（毫秒） */
  loadTime: number
  /** 内存使用量（字节） */
  memoryUsage: number
  /** 执行次数 */
  executionCount: number
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number
  /** 错误次数 */
  errorCount: number
  /** 最后执行时间 */
  lastExecutionTime: number
}

/**
 * 增强版插件项接口
 */
export interface PluginItemEnhanced extends PluginItem {
  /** 插件状态 */
  status: PluginStatus
  /** 性能指标 */
  metrics: PluginPerformanceMetrics
  /** 依赖项 */
  dependencies: string[]
  /** 版本信息 */
  version: string
  /** 作者信息 */
  author: string
  /** 最后更新时间 */
  lastUpdated: number
  /** 是否为内置插件 */
  isBuiltIn: boolean
  /** 插件配置 */
  config: Record<string, any>
  /** 权重（用于排序） */
  weight: number
}

/**
 * 插件管理器配置接口
 */
export interface PluginManagerConfig {
  /** 最大并发加载数 */
  maxConcurrentLoads: number
  /** 加载超时时间（毫秒） */
  loadTimeout: number
  /** 是否启用性能监控 */
  enablePerformanceMonitoring: boolean
  /** 是否启用缓存 */
  enableCaching: boolean
  /** 缓存大小（MB） */
  cacheSize: number
  /** 是否启用依赖检查 */
  enableDependencyCheck: boolean
  /** 是否启用热重载 */
  enableHotReload: boolean
  /** 插件搜索防抖延迟（毫秒） */
  searchDebounceDelay: number
}

/**
 * 插件统计信息接口
 */
export interface PluginStats {
  /** 总插件数 */
  totalPlugins: number
  /** 已加载插件数 */
  loadedPlugins: number
  /** 启用的插件数 */
  enabledPlugins: number
  /** 错误插件数 */
  errorPlugins: number
  /** 平均加载时间 */
  averageLoadTime: number
  /** 总内存使用量 */
  totalMemoryUsage: number
  /** 按分类统计 */
  byCategory: Record<string, number>
  /** 按状态统计 */
  byStatus: Record<PluginStatus, number>
}

/**
 * 插件搜索结果接口
 */
export interface PluginSearchResult {
  /** 匹配的插件 */
  plugins: PluginItemEnhanced[]
  /** 匹配分数 */
  scores: Map<string, number>
  /** 搜索用时 */
  searchTime: number
  /** 总匹配数 */
  totalMatches: number
}

/**
 * 增强版插件管理器类
 */
export class PluginManagerEnhanced {
  private plugins = new Map<string, PluginItemEnhanced>()
  private categories = ref<PluginCategory[]>([])
  private loadingQueue = new Set<string>()
  private loadingPromises = new Map<string, Promise<void>>()
  private cache: SmartCacheManager<PluginItemEnhanced[]>
  private config: PluginManagerConfig
  private stats = ref<PluginStats>({
    totalPlugins: 0,
    loadedPlugins: 0,
    enabledPlugins: 0,
    errorPlugins: 0,
    averageLoadTime: 0,
    totalMemoryUsage: 0,
    byCategory: {},
    byStatus: {} as Record<PluginStatus, number>
  })

  // 性能监控
  private performanceObserver?: PerformanceObserver
  private loadTimes: number[] = []

  // 搜索相关
  private searchIndex = new Map<string, Set<string>>()
  private debouncedSearch: (query: string) => Promise<PluginSearchResult>

  constructor(config: Partial<PluginManagerConfig> = {}) {
    this.config = {
      maxConcurrentLoads: 5,
      loadTimeout: 10000,
      enablePerformanceMonitoring: true,
      enableCaching: true,
      cacheSize: 10,
      enableDependencyCheck: true,
      enableHotReload: false,
      searchDebounceDelay: 200,
      ...config
    }

    // 初始化缓存
    this.cache = new SmartCacheManager<PluginItemEnhanced[]>({
      maxSize: this.config.cacheSize * 1024 * 1024,
      maxItems: 100,
      strategy: CacheStrategy.LRU,
      enablePersistence: true
    })

    // 初始化防抖搜索
    this.debouncedSearch = useDebounceFn(
      this.performSearchInternal.bind(this),
      this.config.searchDebounceDelay
    )

    this.initializePerformanceMonitoring()
  }

  /**
   * 初始化性能监控
   */
  private initializePerformanceMonitoring(): void {
    if (!this.config.enablePerformanceMonitoring) return

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (entry.name.startsWith('plugin-load-')) {
            const pluginId = entry.name.replace('plugin-load-', '')
            this.updatePluginMetrics(pluginId, { loadTime: entry.duration })
          }
        })
      })

      this.performanceObserver.observe({ entryTypes: ['measure'] })
    } catch (error) {
      console.warn('性能监控初始化失败:', error)
    }
  }

  /**
   * 加载插件配置
   */
  async loadPlugins(pluginConfigs: PluginConfig[]): Promise<void> {
    console.log(`🔌 开始加载 ${pluginConfigs.length} 个插件...`)

    // 检查缓存
    const cacheKey = `plugins-${pluginConfigs.length}-${Date.now()}`
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey)
      if (cached) {
        console.log('🚀 从缓存加载插件')
        cached.forEach(plugin => this.plugins.set(plugin.id, plugin))
        this.updateStats()
        return
      }
    }

    // 转换为增强插件项
    const pluginItems = pluginConfigs.map(config => this.createEnhancedPluginItem(config))

    // 检查依赖关系
    if (this.config.enableDependencyCheck) {
      this.checkDependencies(pluginItems)
    }

    // 按依赖关系排序
    const sortedPlugins = this.sortByDependencies(pluginItems)

    // 批量加载
    await this.batchLoadPlugins(sortedPlugins)

    // 构建搜索索引
    this.buildSearchIndex()

    // 更新分类
    this.updateCategories()

    // 缓存结果
    if (this.config.enableCaching) {
      this.cache.set(cacheKey, Array.from(this.plugins.values()), {
        ttl: 10 * 60 * 1000, // 10分钟
        priority: 8
      })
    }

    console.log(`✅ 插件加载完成，共加载 ${this.plugins.size} 个插件`)
  }

  /**
   * 创建增强插件项
   */
  private createEnhancedPluginItem(config: PluginConfig): PluginItemEnhanced {
    return {
      id: config.id,
      name: config.name,
      description: config.description || '',
      icon: config.icon || 'plugin',
      keywords: config.keywords || [],
      category: config.category || 'other',
      type: config.type || 'tool',
      path: config.path || '',
      url: config.url || '',
      onEnter: config.onEnter,
      status: PluginStatus.UNLOADED,
      metrics: {
        loadTime: 0,
        memoryUsage: 0,
        executionCount: 0,
        averageExecutionTime: 0,
        errorCount: 0,
        lastExecutionTime: 0
      },
      dependencies: config.dependencies || [],
      version: config.version || '1.0.0',
      author: config.author || 'Unknown',
      lastUpdated: config.lastUpdated || Date.now(),
      isBuiltIn: config.isBuiltIn || false,
      config: config.config || {},
      weight: config.weight || 0
    }
  }

  /**
   * 检查依赖关系
   */
  private checkDependencies(plugins: PluginItemEnhanced[]): void {
    const pluginIds = new Set(plugins.map(p => p.id))

    plugins.forEach(plugin => {
      plugin.dependencies.forEach(depId => {
        if (!pluginIds.has(depId)) {
          console.warn(`插件 ${plugin.id} 依赖的插件 ${depId} 不存在`)
          plugin.status = PluginStatus.ERROR
        }
      })
    })
  }

  /**
   * 按依赖关系排序
   */
  private sortByDependencies(plugins: PluginItemEnhanced[]): PluginItemEnhanced[] {
    const sorted: PluginItemEnhanced[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (plugin: PluginItemEnhanced) => {
      if (visited.has(plugin.id)) return
      if (visiting.has(plugin.id)) {
        console.warn(`检测到循环依赖: ${plugin.id}`)
        return
      }

      visiting.add(plugin.id)

      // 先加载依赖项
      plugin.dependencies.forEach(depId => {
        const depPlugin = plugins.find(p => p.id === depId)
        if (depPlugin) {
          visit(depPlugin)
        }
      })

      visiting.delete(plugin.id)
      visited.add(plugin.id)
      sorted.push(plugin)
    }

    plugins.forEach(visit)
    return sorted
  }

  /**
   * 批量加载插件
   */
  private async batchLoadPlugins(plugins: PluginItemEnhanced[]): Promise<void> {
    const batches: PluginItemEnhanced[][] = []

    // 按批次分组
    for (let i = 0; i < plugins.length; i += this.config.maxConcurrentLoads) {
      batches.push(plugins.slice(i, i + this.config.maxConcurrentLoads))
    }

    // 逐批加载
    for (const batch of batches) {
      await Promise.all(batch.map(plugin => this.loadPlugin(plugin)))
    }
  }

  /**
   * 加载单个插件
   */
  private async loadPlugin(plugin: PluginItemEnhanced): Promise<void> {
    if (this.loadingQueue.has(plugin.id)) {
      return this.loadingPromises.get(plugin.id)
    }

    const loadPromise = this.performPluginLoad(plugin)
    this.loadingQueue.add(plugin.id)
    this.loadingPromises.set(plugin.id, loadPromise)

    try {
      await loadPromise
    } finally {
      this.loadingQueue.delete(plugin.id)
      this.loadingPromises.delete(plugin.id)
    }
  }

  /**
   * 执行插件加载
   */
  private async performPluginLoad(plugin: PluginItemEnhanced): Promise<void> {
    const startTime = performance.now()
    plugin.status = PluginStatus.LOADING

    try {
      // 开始性能测量
      if (this.config.enablePerformanceMonitoring) {
        performance.mark(`plugin-load-${plugin.id}-start`)
      }

      // 模拟插件加载过程
      await this.loadPluginCode(plugin)

      // 验证插件
      this.validatePlugin(plugin)

      // 结束性能测量
      if (this.config.enablePerformanceMonitoring) {
        performance.mark(`plugin-load-${plugin.id}-end`)
        performance.measure(
          `plugin-load-${plugin.id}`,
          `plugin-load-${plugin.id}-start`,
          `plugin-load-${plugin.id}-end`
        )
      }

      plugin.status = PluginStatus.LOADED
      plugin.metrics.loadTime = performance.now() - startTime
      this.plugins.set(plugin.id, plugin)

      console.log(`✅ 插件加载成功: ${plugin.id} (${plugin.metrics.loadTime.toFixed(2)}ms)`)
    } catch (error) {
      plugin.status = PluginStatus.ERROR
      plugin.metrics.errorCount++
      console.error(`❌ 插件加载失败: ${plugin.id}`, error)
    } finally {
      this.updateStats()
    }
  }

  /**
   * 加载插件代码
   */
  private async loadPluginCode(plugin: PluginItemEnhanced): Promise<void> {
    // 添加超时控制
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`插件 ${plugin.id} 加载超时`))
      }, this.config.loadTimeout)

      // 模拟异步加载
      setTimeout(() => {
        clearTimeout(timeout)
        resolve()
      }, Math.random() * 100 + 50) // 50-150ms 随机延迟
    })
  }

  /**
   * 验证插件
   */
  private validatePlugin(plugin: PluginItemEnhanced): void {
    if (!plugin.onEnter && !plugin.url && !plugin.path) {
      throw new Error(`插件 ${plugin.id} 缺少执行入口`)
    }
  }

  /**
   * 构建搜索索引
   */
  private buildSearchIndex(): void {
    this.searchIndex.clear()

    this.plugins.forEach(plugin => {
      const keywords = [
        plugin.name,
        plugin.description,
        plugin.category,
        plugin.author,
        ...plugin.keywords
      ].filter(Boolean).map(keyword => keyword.toLowerCase())

      keywords.forEach(keyword => {
        if (!this.searchIndex.has(keyword)) {
          this.searchIndex.set(keyword, new Set())
        }
        this.searchIndex.get(keyword)!.add(plugin.id)
      })
    })
  }

  /**
   * 更新分类
   */
  private updateCategories(): void {
    const categoryMap = new Map<string, PluginItemEnhanced[]>()

    this.plugins.forEach(plugin => {
      if (!categoryMap.has(plugin.category)) {
        categoryMap.set(plugin.category, [])
      }
      categoryMap.get(plugin.category)!.push(plugin)
    })

    this.categories.value = Array.from(categoryMap.entries()).map(([name, items]) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      items: items.sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name))
    }))
  }

  /**
   * 搜索插件
   */
  async searchPlugins(query: string): Promise<PluginSearchResult> {
    return this.debouncedSearch(query)
  }

  /**
   * 内部搜索实现
   */
  private async performSearchInternal(query: string): Promise<PluginSearchResult> {
    const startTime = performance.now()

    if (!query.trim()) {
      return {
        plugins: Array.from(this.plugins.values()),
        scores: new Map(),
        searchTime: performance.now() - startTime,
        totalMatches: this.plugins.size
      }
    }

    const queryLower = query.toLowerCase()
    const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 0)
    const scores = new Map<string, number>()

    // 搜索匹配
    this.plugins.forEach(plugin => {
      let score = 0

      // 名称匹配
      if (plugin.name.toLowerCase().includes(queryLower)) {
        score += plugin.name.toLowerCase() === queryLower ? 10 : 5
      }

      // 描述匹配
      if (plugin.description.toLowerCase().includes(queryLower)) {
        score += 3
      }

      // 关键词匹配
      plugin.keywords.forEach(keyword => {
        if (keyword.toLowerCase().includes(queryLower)) {
          score += 4
        }
      })

      // 分类匹配
      if (plugin.category.toLowerCase().includes(queryLower)) {
        score += 2
      }

      // 模糊匹配
      queryTerms.forEach(term => {
        const searchText = `${plugin.name} ${plugin.description} ${plugin.keywords.join(' ')}`.toLowerCase()
        if (searchText.includes(term)) {
          score += 1
        }
      })

      // 应用权重
      score *= (1 + plugin.weight * 0.1)

      if (score > 0) {
        scores.set(plugin.id, score)
      }
    })

    // 按分数排序
    const matchedPlugins = Array.from(this.plugins.values())
      .filter(plugin => scores.has(plugin.id))
      .sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0))

    return {
      plugins: matchedPlugins,
      scores,
      searchTime: performance.now() - startTime,
      totalMatches: matchedPlugins.length
    }
  }

  /**
   * 执行插件
   */
  async executePlugin(pluginId: string, context?: any): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`插件 ${pluginId} 不存在`)
    }

    if (plugin.status !== PluginStatus.LOADED) {
      throw new Error(`插件 ${pluginId} 未加载或状态异常`)
    }

    const startTime = performance.now()

    try {
      // 更新执行统计
      plugin.metrics.executionCount++
      plugin.metrics.lastExecutionTime = Date.now()

      // 执行插件
      if (plugin.onEnter) {
        await plugin.onEnter(context)
      }

      // 更新性能指标
      const executionTime = performance.now() - startTime
      plugin.metrics.averageExecutionTime =
        (plugin.metrics.averageExecutionTime * (plugin.metrics.executionCount - 1) + executionTime) /
        plugin.metrics.executionCount

      console.log(`🔌 插件执行成功: ${pluginId} (${executionTime.toFixed(2)}ms)`)
    } catch (error) {
      plugin.metrics.errorCount++
      console.error(`❌ 插件执行失败: ${pluginId}`, error)
      throw error
    } finally {
      this.updateStats()
    }
  }

  /**
   * 启用/禁用插件
   */
  togglePlugin(pluginId: string, enabled?: boolean): boolean {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return false

    const newStatus = enabled !== undefined ?
      (enabled ? PluginStatus.LOADED : PluginStatus.DISABLED) :
      (plugin.status === PluginStatus.DISABLED ? PluginStatus.LOADED : PluginStatus.DISABLED)

    plugin.status = newStatus
    this.updateStats()

    console.log(`🔌 插件 ${pluginId} 已${newStatus === PluginStatus.LOADED ? '启用' : '禁用'}`)
    return true
  }

  /**
   * 更新插件性能指标
   */
  private updatePluginMetrics(pluginId: string, metrics: Partial<PluginPerformanceMetrics>): void {
    const plugin = this.plugins.get(pluginId)
    if (plugin) {
      Object.assign(plugin.metrics, metrics)
      this.updateStats()
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    const plugins = Array.from(this.plugins.values())

    // 基础统计
    this.stats.value.totalPlugins = plugins.length
    this.stats.value.loadedPlugins = plugins.filter(p => p.status === PluginStatus.LOADED).length
    this.stats.value.enabledPlugins = plugins.filter(p => p.status !== PluginStatus.DISABLED).length
    this.stats.value.errorPlugins = plugins.filter(p => p.status === PluginStatus.ERROR).length

    // 性能统计
    const loadTimes = plugins.map(p => p.metrics.loadTime).filter(t => t > 0)
    this.stats.value.averageLoadTime = loadTimes.length > 0 ?
      loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length : 0

    this.stats.value.totalMemoryUsage = plugins.reduce((sum, p) => sum + p.metrics.memoryUsage, 0)

    // 分类统计
    this.stats.value.byCategory = plugins.reduce((acc, plugin) => {
      acc[plugin.category] = (acc[plugin.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // 状态统计
    this.stats.value.byStatus = plugins.reduce((acc, plugin) => {
      acc[plugin.status] = (acc[plugin.status] || 0) + 1
      return acc
    }, {} as Record<PluginStatus, number>)
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): PluginItemEnhanced[] {
    return Array.from(this.plugins.values())
  }

  /**
   * 获取插件按分类
   */
  getPluginsByCategory(category: string): PluginItemEnhanced[] {
    return Array.from(this.plugins.values()).filter(p => p.category === category)
  }

  /**
   * 获取插件按状态
   */
  getPluginsByStatus(status: PluginStatus): PluginItemEnhanced[] {
    return Array.from(this.plugins.values()).filter(p => p.status === status)
  }

  /**
   * 重新加载插件
   */
  async reloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`插件 ${pluginId} 不存在`)
    }

    plugin.status = PluginStatus.UNLOADED
    await this.loadPlugin(plugin)
  }

  /**
   * 卸载插件
   */
  unloadPlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return false

    plugin.status = PluginStatus.UNLOADED
    this.updateStats()

    console.log(`🔌 插件已卸载: ${pluginId}`)
    return true
  }

  /**
   * 获取统计信息
   */
  getStats(): PluginStats {
    return { ...this.stats.value }
  }

  /**
   * 获取分类
   */
  getCategories(): PluginCategory[] {
    return [...this.categories.value]
  }

  /**
   * 导出插件数据
   */
  exportPluginData(): string {
    return JSON.stringify({
      plugins: Array.from(this.plugins.values()),
      categories: this.categories.value,
      stats: this.stats.value,
      config: this.config,
      exportedAt: Date.now()
    }, null, 2)
  }

  /**
   * 导入插件数据
   */
  importPluginData(data: string): boolean {
    try {
      const imported = JSON.parse(data)

      if (imported.plugins) {
        this.plugins.clear()
        imported.plugins.forEach((plugin: PluginItemEnhanced) => {
          this.plugins.set(plugin.id, plugin)
        })
      }

      if (imported.categories) {
        this.categories.value = imported.categories
      }

      if (imported.config) {
        this.config = { ...this.config, ...imported.config }
      }

      this.buildSearchIndex()
      this.updateStats()

      return true
    } catch (error) {
      console.error('导入插件数据失败:', error)
      return false
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.plugins.clear()
    this.categories.value = []
    this.loadingQueue.clear()
    this.loadingPromises.clear()
    this.searchIndex.clear()
    this.cache.destroy()

    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }
  }
}

/**
 * Vue 组合式函数
 */
export function usePluginManagerEnhanced(config?: Partial<PluginManagerConfig>) {
  const manager = new PluginManagerEnhanced(config)

  return {
    manager,
    stats: computed(() => manager.getStats()),
    categories: computed(() => manager.getCategories()),

    // 方法
    loadPlugins: manager.loadPlugins.bind(manager),
    searchPlugins: manager.searchPlugins.bind(manager),
    executePlugin: manager.executePlugin.bind(manager),
    togglePlugin: manager.togglePlugin.bind(manager),
    reloadPlugin: manager.reloadPlugin.bind(manager),
    unloadPlugin: manager.unloadPlugin.bind(manager),
    getAllPlugins: manager.getAllPlugins.bind(manager),
    getPluginsByCategory: manager.getPluginsByCategory.bind(manager),
    getPluginsByStatus: manager.getPluginsByStatus.bind(manager),
    exportData: manager.exportPluginData.bind(manager),
    importData: manager.importPluginData.bind(manager)
  }
}
