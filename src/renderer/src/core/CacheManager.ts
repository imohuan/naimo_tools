/**
 * 缓存数据结构
 */
interface CacheData<T> {
  /** 时间戳 */
  timestamp: number
  /** 数据 */
  data: T
}

/**
 * 缓存管理器配置
 */
interface CacheManagerOptions {
  /** 缓存键名前缀 */
  prefix: string
  /** 缓存过期时间（毫秒），默认8小时 */
  expireTime?: number
}

/**
 * 通用缓存管理器
 * 基于 localStorage 的时效性缓存管理
 */
export class CacheManager {
  private readonly prefix: string
  private readonly expireTime: number

  constructor(options: CacheManagerOptions) {
    this.prefix = options.prefix
    this.expireTime = options.expireTime || 8 * 60 * 60 * 1000 // 默认8小时

    // 初始化时清理过期缓存
    this.clearExpiredCache()
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(...keyParts: (string | number)[]): string {
    return `${this.prefix}_${keyParts.join('_')}`
  }

  /**
   * 获取缓存数据
   */
  get<T>(...keyParts: (string | number)[]): T | null {
    const cacheKey = this.getCacheKey(...keyParts)
    const cacheData = localStorage.getItem(cacheKey)

    if (!cacheData) {
      return null
    }

    try {
      const parsed: CacheData<T> = JSON.parse(cacheData)
      const now = Date.now()

      // 检查缓存是否过期
      if (now - parsed.timestamp > this.expireTime) {
        localStorage.removeItem(cacheKey)
        return null
      }

      return parsed.data
    } catch (error) {
      console.error('解析缓存数据失败:', error)
      localStorage.removeItem(cacheKey)
      return null
    }
  }

  /**
   * 设置缓存数据
   */
  set<T>(data: T, ...keyParts: (string | number)[]): void {
    const cacheKey = this.getCacheKey(...keyParts)
    const cacheData: CacheData<T> = {
      timestamp: Date.now(),
      data: data
    }

    try {
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    } catch (error) {
      console.error('保存缓存数据失败:', error)
      // 如果localStorage空间不足，清理过期缓存后重试
      this.clearExpiredCache()
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheData))
      } catch (retryError) {
        console.error('重试保存缓存数据失败:', retryError)
      }
    }
  }

  /**
   * 删除指定缓存
   */
  remove(...keyParts: (string | number)[]): void {
    const cacheKey = this.getCacheKey(...keyParts)
    localStorage.removeItem(cacheKey)
  }

  /**
   * 检查缓存是否存在且未过期
   */
  has(...keyParts: (string | number)[]): boolean {
    return this.get(...keyParts) !== null
  }

  /**
   * 清理过期的缓存
   */
  clearExpiredCache(): void {
    const now = Date.now()
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix + '_')) {
        try {
          const data = localStorage.getItem(key)
          if (data) {
            const parsed: CacheData<any> = JSON.parse(data)
            if (now - parsed.timestamp > this.expireTime) {
              keysToRemove.push(key)
            }
          }
        } catch (error) {
          // 解析失败的缓存也清理掉
          keysToRemove.push(key)
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  /**
   * 清理所有相关的缓存
   */
  clearAllCache(): void {
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix + '_')) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { total: number; expired: number; valid: number } {
    const now = Date.now()
    let total = 0
    let expired = 0
    let valid = 0

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix + '_')) {
        total++
        try {
          const data = localStorage.getItem(key)
          if (data) {
            const parsed: CacheData<any> = JSON.parse(data)
            if (now - parsed.timestamp > this.expireTime) {
              expired++
            } else {
              valid++
            }
          }
        } catch (error) {
          expired++
        }
      }
    }

    return { total, expired, valid }
  }
}
