/**
 * 智能缓存管理器
 * 提供多层缓存、智能清理、缓存分析等高级功能
 */

import { ref, computed, watch } from 'vue'

/**
 * 缓存策略枚举
 */
export enum CacheStrategy {
  LRU = 'lru',           // 最近最少使用
  LFU = 'lfu',           // 最少频次使用
  FIFO = 'fifo',         // 先进先出
  TTL = 'ttl',           // 基于时间过期
  ADAPTIVE = 'adaptive'   // 自适应策略
}

/**
 * 缓存项接口
 */
export interface CacheItem<T = any> {
  /** 缓存键 */
  key: string
  /** 缓存值 */
  value: T
  /** 创建时间 */
  createdAt: number
  /** 最后访问时间 */
  lastAccessedAt: number
  /** 访问次数 */
  accessCount: number
  /** 过期时间 */
  expiresAt?: number
  /** 数据大小（字节） */
  size: number
  /** 优先级 */
  priority: number
  /** 标签 */
  tags: string[]
}

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  /** 最大缓存大小（字节） */
  maxSize: number
  /** 最大缓存项数量 */
  maxItems: number
  /** 默认过期时间（毫秒） */
  defaultTTL: number
  /** 缓存策略 */
  strategy: CacheStrategy
  /** 是否启用压缩 */
  enableCompression: boolean
  /** 是否启用持久化 */
  enablePersistence: boolean
  /** 清理间隔（毫秒） */
  cleanupInterval: number
}

/**
 * 缓存统计信息接口
 */
export interface CacheStats {
  /** 总请求次数 */
  totalRequests: number
  /** 命中次数 */
  hits: number
  /** 未命中次数 */
  misses: number
  /** 命中率 */
  hitRate: number
  /** 当前项目数量 */
  itemCount: number
  /** 当前缓存大小 */
  currentSize: number
  /** 平均访问时间 */
  averageAccessTime: number
  /** 内存使用率 */
  memoryUsage: number
}

/**
 * 智能缓存管理器
 */
export class SmartCacheManager<T = any> {
  private cache = new Map<string, CacheItem<T>>()
  private config: CacheConfig
  private stats = ref<CacheStats>({
    totalRequests: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
    itemCount: 0,
    currentSize: 0,
    averageAccessTime: 0,
    memoryUsage: 0
  })
  private cleanupTimer: NodeJS.Timeout | null = null
  private accessTimes: number[] = []

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxItems: 1000,
      defaultTTL: 5 * 60 * 1000, // 5分钟
      strategy: CacheStrategy.ADAPTIVE,
      enableCompression: false,
      enablePersistence: false,
      cleanupInterval: 60 * 1000, // 1分钟
      ...config
    }

    this.startCleanupTimer()
  }

  /**
   * 获取缓存项
   */
  get(key: string): T | null {
    const startTime = performance.now()
    this.stats.value.totalRequests++

    const item = this.cache.get(key)

    if (!item) {
      this.stats.value.misses++
      this.updateStats()
      return null
    }

    // 检查是否过期
    if (this.isExpired(item)) {
      this.cache.delete(key)
      this.stats.value.misses++
      this.updateStats()
      return null
    }

    // 更新访问信息
    item.lastAccessedAt = Date.now()
    item.accessCount++
    this.stats.value.hits++

    // 记录访问时间
    const accessTime = performance.now() - startTime
    this.accessTimes.push(accessTime)
    if (this.accessTimes.length > 100) {
      this.accessTimes.shift()
    }

    this.updateStats()
    return item.value
  }

  /**
   * 设置缓存项
   */
  set(key: string, value: T, options: {
    ttl?: number
    priority?: number
    tags?: string[]
  } = {}): boolean {
    const now = Date.now()
    const size = this.calculateSize(value)

    // 检查是否需要清理空间
    if (!this.hasSpace(size)) {
      this.makeSpace(size)
    }

    const item: CacheItem<T> = {
      key,
      value,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      expiresAt: options.ttl ? now + options.ttl : now + this.config.defaultTTL,
      size,
      priority: options.priority || 1,
      tags: options.tags || []
    }

    // 如果启用压缩
    if (this.config.enableCompression) {
      item.value = this.compress(value)
    }

    this.cache.set(key, item)
    this.updateStats()

    // 持久化（如果启用）
    if (this.config.enablePersistence) {
      this.persistItem(item)
    }

    return true
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      this.updateStats()

      // 从持久化存储中删除
      if (this.config.enablePersistence) {
        this.removePersistedItem(key)
      }
    }
    return deleted
  }

  /**
   * 批量删除（按标签）
   */
  deleteByTags(tags: string[]): number {
    let deletedCount = 0

    for (const [key, item] of this.cache.entries()) {
      if (tags.some(tag => item.tags.includes(tag))) {
        this.cache.delete(key)
        deletedCount++
      }
    }

    if (deletedCount > 0) {
      this.updateStats()
    }

    return deletedCount
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
    this.updateStats()

    if (this.config.enablePersistence) {
      this.clearPersistence()
    }
  }

  /**
   * 检查缓存项是否存在
   */
  has(key: string): boolean {
    const item = this.cache.get(key)
    return item ? !this.isExpired(item) : false
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size
  }

  /**
   * 检查项目是否过期
   */
  private isExpired(item: CacheItem<T>): boolean {
    return item.expiresAt ? Date.now() > item.expiresAt : false
  }

  /**
   * 检查是否有足够空间
   */
  private hasSpace(newItemSize: number): boolean {
    return (
      this.cache.size < this.config.maxItems &&
      this.stats.value.currentSize + newItemSize <= this.config.maxSize
    )
  }

  /**
   * 为新项目腾出空间
   */
  private makeSpace(requiredSize: number): void {
    const itemsToRemove: string[] = []
    let freedSize = 0

    // 根据策略选择要移除的项目
    switch (this.config.strategy) {
      case CacheStrategy.LRU:
        itemsToRemove.push(...this.getLRUItems(requiredSize))
        break
      case CacheStrategy.LFU:
        itemsToRemove.push(...this.getLFUItems(requiredSize))
        break
      case CacheStrategy.FIFO:
        itemsToRemove.push(...this.getFIFOItems(requiredSize))
        break
      case CacheStrategy.TTL:
        itemsToRemove.push(...this.getExpiredItems())
        break
      case CacheStrategy.ADAPTIVE:
        itemsToRemove.push(...this.getAdaptiveItems(requiredSize))
        break
    }

    // 移除选中的项目
    for (const key of itemsToRemove) {
      const item = this.cache.get(key)
      if (item) {
        freedSize += item.size
        this.cache.delete(key)
      }

      if (freedSize >= requiredSize) break
    }
  }

  /**
   * 获取LRU项目
   */
  private getLRUItems(requiredSize: number): string[] {
    const items = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessedAt - b.lastAccessedAt)

    const toRemove: string[] = []
    let freedSize = 0

    for (const [key, item] of items) {
      toRemove.push(key)
      freedSize += item.size
      if (freedSize >= requiredSize) break
    }

    return toRemove
  }

  /**
   * 获取LFU项目
   */
  private getLFUItems(requiredSize: number): string[] {
    const items = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.accessCount - b.accessCount)

    const toRemove: string[] = []
    let freedSize = 0

    for (const [key, item] of items) {
      toRemove.push(key)
      freedSize += item.size
      if (freedSize >= requiredSize) break
    }

    return toRemove
  }

  /**
   * 获取FIFO项目
   */
  private getFIFOItems(requiredSize: number): string[] {
    const items = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.createdAt - b.createdAt)

    const toRemove: string[] = []
    let freedSize = 0

    for (const [key, item] of items) {
      toRemove.push(key)
      freedSize += item.size
      if (freedSize >= requiredSize) break
    }

    return toRemove
  }

  /**
   * 获取过期项目
   */
  private getExpiredItems(): string[] {
    const toRemove: string[] = []

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        toRemove.push(key)
      }
    }

    return toRemove
  }

  /**
   * 获取自适应项目
   */
  private getAdaptiveItems(requiredSize: number): string[] {
    // 自适应策略：综合考虑访问频率、时间和优先级
    const items = Array.from(this.cache.entries())
      .map(([key, item]) => {
        const age = Date.now() - item.createdAt
        const timeSinceAccess = Date.now() - item.lastAccessedAt
        const score = (item.accessCount / (age + 1)) * item.priority - (timeSinceAccess / 1000)
        return { key, item, score }
      })
      .sort((a, b) => a.score - b.score)

    const toRemove: string[] = []
    let freedSize = 0

    for (const { key, item } of items) {
      toRemove.push(key)
      freedSize += item.size
      if (freedSize >= requiredSize) break
    }

    return toRemove
  }

  /**
   * 计算数据大小
   */
  private calculateSize(value: T): number {
    try {
      return new Blob([JSON.stringify(value)]).size
    } catch {
      return 1024 // 默认1KB
    }
  }

  /**
   * 压缩数据
   */
  private compress(value: T): T {
    // 这里可以实现数据压缩逻辑
    // 暂时直接返回原值
    return value
  }

  /**
   * 持久化项目
   */
  private persistItem(item: CacheItem<T>): void {
    try {
      const key = `cache_${item.key}`
      const data = JSON.stringify(item)
      localStorage.setItem(key, data)
    } catch (error) {
      console.warn('缓存持久化失败:', error)
    }
  }

  /**
   * 移除持久化项目
   */
  private removePersistedItem(key: string): void {
    try {
      localStorage.removeItem(`cache_${key}`)
    } catch (error) {
      console.warn('移除持久化缓存失败:', error)
    }
  }

  /**
   * 清空持久化
   */
  private clearPersistence(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'))
      keys.forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.warn('清空持久化缓存失败:', error)
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    const totalRequests = this.stats.value.totalRequests
    const hits = this.stats.value.hits

    this.stats.value.hitRate = totalRequests > 0 ? (hits / totalRequests) * 100 : 0
    this.stats.value.itemCount = this.cache.size

    // 计算当前缓存大小
    let currentSize = 0
    for (const item of this.cache.values()) {
      currentSize += item.size
    }
    this.stats.value.currentSize = currentSize

    // 计算内存使用率
    this.stats.value.memoryUsage = (currentSize / this.config.maxSize) * 100

    // 计算平均访问时间
    if (this.accessTimes.length > 0) {
      const total = this.accessTimes.reduce((sum, time) => sum + time, 0)
      this.stats.value.averageAccessTime = total / this.accessTimes.length
    }
  }

  /**
   * 开始清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * 清理过期项目
   */
  private cleanup(): void {
    const expiredKeys = this.getExpiredItems()
    for (const key of expiredKeys) {
      this.cache.delete(key)
    }

    if (expiredKeys.length > 0) {
      this.updateStats()
      console.log(`🧹 清理了 ${expiredKeys.length} 个过期缓存项`)
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats.value }
  }

  /**
   * 获取配置
   */
  getConfig(): CacheConfig {
    return { ...this.config }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // 重启清理定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.startCleanupTimer()
  }

  /**
   * 导出缓存数据
   */
  export(): string {
    const data = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      value: item.value,
      metadata: {
        createdAt: item.createdAt,
        expiresAt: item.expiresAt,
        priority: item.priority,
        tags: item.tags
      }
    }))

    return JSON.stringify(data, null, 2)
  }

  /**
   * 导入缓存数据
   */
  import(data: string): boolean {
    try {
      const items = JSON.parse(data)

      for (const item of items) {
        this.set(item.key, item.value, {
          ttl: item.metadata.expiresAt - Date.now(),
          priority: item.metadata.priority,
          tags: item.metadata.tags
        })
      }

      return true
    } catch (error) {
      console.error('导入缓存数据失败:', error)
      return false
    }
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }

    this.clear()
  }
}

/**
 * 创建智能缓存管理器的工厂函数
 */
export function createSmartCache<T = any>(config?: Partial<CacheConfig>): SmartCacheManager<T> {
  return new SmartCacheManager<T>(config)
}

/**
 * 全局缓存实例
 */
export const globalCache = createSmartCache({
  maxSize: 100 * 1024 * 1024, // 100MB
  maxItems: 2000,
  strategy: CacheStrategy.ADAPTIVE,
  enablePersistence: true
})

/**
 * Vue 组合式函数
 */
export function useSmartCache<T = any>(name: string, config?: Partial<CacheConfig>) {
  const cache = createSmartCache<T>(config)

  const stats = computed(() => cache.getStats())

  return {
    cache,
    stats,
    get: cache.get.bind(cache),
    set: cache.set.bind(cache),
    delete: cache.delete.bind(cache),
    clear: cache.clear.bind(cache),
    has: cache.has.bind(cache)
  }
}
