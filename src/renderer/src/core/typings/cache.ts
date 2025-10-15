/**
 * 缓存项接口
 */
export interface CacheItem<T = any> {
  /** 缓存的值 */
  value: T
  /** 时间戳 */
  timestamp: number
  /** 过期时间（毫秒），可选 */
  ttl?: number
}

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  /** 默认过期时间（毫秒） */
  defaultTTL?: number
  /** 缓存键前缀 */
  prefix?: string
}

