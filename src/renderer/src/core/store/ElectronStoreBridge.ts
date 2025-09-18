import type { AppConfig } from '@shared/types'

/**
 * 通用存储桥接器
 * 提供统一的存储操作接口，支持类型安全的存储操作
 */
export class ElectronStoreBridge {
  private static instance: ElectronStoreBridge | null = null
  private cache = new Map<string, any>()

  private constructor() { }

  /**
   * 获取单例实例
   * @returns ElectronStoreBridge 单例实例
   */
  public static getInstance(): ElectronStoreBridge {
    if (!ElectronStoreBridge.instance) {
      ElectronStoreBridge.instance = new ElectronStoreBridge()
    }
    return ElectronStoreBridge.instance
  }

  /**
   * 获取存储数据
   * @param key 配置键名，如果不提供则返回完整配置
   * @returns 配置值或完整配置对象
   */
  public async get<K extends keyof AppConfig>(key?: K): Promise<AppConfig[K] | AppConfig | undefined> {
    try {
      const result = await api.ipcRouter.storeGet(key)

      // 更新缓存
      if (key) {
        this.cache.set(key, result)
      } else {
        // 如果是获取完整配置，更新整个缓存
        if (result && typeof result === 'object') {
          Object.entries(result).forEach(([k, v]) => {
            this.cache.set(k, v)
          })
        }
      }

      return result
    } catch (error) {
      console.error('获取存储数据失败:', error)
      return undefined
    }
  }

  /**
   * 设置存储数据
   * @param key 配置键名
   * @param value 配置值
   * @returns 是否设置成功
   */
  public async set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): Promise<boolean> {
    try {
      const success = await api.ipcRouter.storeSet(key, value)
      if (success) {
        this.cache.set(key, value)
      }
      return success
    } catch (error) {
      console.error('设置存储数据失败:', error)
      return false
    }
  }

  /**
   * 删除存储数据
   * @param key 配置键名
   * @returns 是否删除成功
   */
  public async delete<K extends keyof AppConfig>(key: K): Promise<boolean> {
    try {
      const success = await api.ipcRouter.storeDeleteKey(key)
      if (success) {
        this.cache.delete(key)
      }
      return success
    } catch (error) {
      console.error('删除存储数据失败:', error)
      return false
    }
  }

  /**
   * 清空存储数据
   * @returns 是否清空成功
   */
  public async clear(): Promise<boolean> {
    try {
      const success = await api.ipcRouter.storeClear()
      if (success) {
        this.cache.clear()
      }
      return success
    } catch (error) {
      console.error('清空存储数据失败:', error)
      return false
    }
  }

  /**
   * 检查键是否存在
   * @param key 配置键名
   * @returns 是否存在
   */
  public has<K extends keyof AppConfig>(key: K): boolean {
    return this.cache.has(key)
  }

  /**
   * 获取缓存数据
   * @param key 配置键名
   * @returns 缓存的值
   */
  public getCached<K extends keyof AppConfig>(key: K): AppConfig[K] | undefined {
    return this.cache.get(key)
  }

  /**
   * 获取所有缓存数据
   * @returns 完整的缓存对象
   */
  public getAllCached(): Partial<AppConfig> {
    return Object.fromEntries(this.cache) as Partial<AppConfig>
  }

  /**
   * 批量设置存储数据
   * @param data 包含多个键值对的对象
   * @returns 是否设置成功
   */
  public async setMultiple(data: Partial<AppConfig>): Promise<boolean> {
    try {
      const results = await Promise.all(
        Object.entries(data).map(([key, value]) =>
          this.set(key as keyof AppConfig, value)
        )
      )
      return results.every(result => result)
    } catch (error) {
      console.error('批量设置存储数据失败:', error)
      return false
    }
  }

  /**
   * 批量获取存储数据
   * @param keys 配置键名数组
   * @returns 键值对对象
   */
  public async getMultiple<K extends keyof AppConfig>(keys: K[]): Promise<Partial<Pick<AppConfig, K>>> {
    try {
      const results = await Promise.all(
        keys.map(async key => [key, await this.get(key)] as const)
      )
      return Object.fromEntries(results) as Partial<Pick<AppConfig, K>>
    } catch (error) {
      console.error('批量获取存储数据失败:', error)
      return {}
    }
  }

  /**
   * 重置到默认值
   * @param keys 要重置的键名数组，如果不提供则重置所有
   * @returns 是否重置成功
   */
  public async reset<K extends keyof AppConfig>(...keys: K[]): Promise<boolean> {
    try {
      if (keys.length === 0) {
        // 重置所有配置
        return await this.clear()
      } else {
        // 重置指定配置
        const results = await Promise.all(
          keys.map(key => this.delete(key))
        )
        return results.every(result => result)
      }
    } catch (error) {
      console.error('重置存储数据失败:', error)
      return false
    }
  }
}


