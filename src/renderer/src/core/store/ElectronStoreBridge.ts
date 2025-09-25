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
      const result = await naimo.router.storeGet(key)

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
      const success = await naimo.router.storeSet(key, value)
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
      const success = await naimo.router.storeDeleteKey(key)
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
      const success = await naimo.router.storeClear()
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

  // ==================== 列表项操作方法 ====================

  /**
   * 获取列表项
   * @param key 列表键名
   * @returns 列表项数组
   */
  public async getListItems<K extends keyof AppConfig>(key: K): Promise<any[]> {
    try {
      const items = await this.get(key) || []
      return Array.isArray(items) ? items : []
    } catch (error) {
      console.error(`获取列表项失败 (${String(key)}):`, error)
      return []
    }
  }

  /**
   * 设置列表项
   * @param key 列表键名
   * @param items 列表项数组
   * @returns 是否设置成功
   */
  public async setListItems<K extends keyof AppConfig>(key: K, items: any[]): Promise<boolean> {
    try {
      return await this.set(key, items as AppConfig[K])
    } catch (error) {
      console.error(`设置列表项失败 (${String(key)}):`, error)
      return false
    }
  }

  /**
   * 添加列表项
   * @param key 列表键名
   * @param item 要添加的项目
   * @param options 添加选项
   * @returns 是否添加成功
   */
  public async addListItem<K extends keyof AppConfig>(
    key: K,
    item: any,
    options: {
      /** 添加到开头还是末尾，默认末尾 */
      position?: 'start' | 'end'
      /** 是否去重，默认true */
      unique?: boolean
      /** 去重字段，默认使用path字段 */
      uniqueField?: string
      /** 最大长度限制 */
      maxLength?: number
    } = {}
  ): Promise<boolean> {
    try {
      const { position = 'end', unique = true, uniqueField = 'path', maxLength } = options
      const currentItems = await this.getListItems(key)

      let newItems = [...currentItems]

      // 去重检查
      if (unique && item && typeof item === 'object') {
        const existingIndex = newItems.findIndex(existingItem =>
          existingItem && typeof existingItem === 'object' &&
          (existingItem as any)[uniqueField] === (item as any)[uniqueField]
        )
        if (existingIndex >= 0) {
          // 如果存在，先删除旧的
          newItems.splice(existingIndex, 1)
        }
      }

      // 添加新项目
      if (position === 'start') {
        newItems.unshift(item)
      } else {
        newItems.push(item)
      }

      // 长度限制
      if (maxLength && newItems.length > maxLength) {
        newItems = newItems.slice(0, maxLength)
      }

      return await this.setListItems(key, newItems)
    } catch (error) {
      console.error(`添加列表项失败 (${String(key)}):`, error)
      return false
    }
  }

  /**
   * 删除列表项
   * @param key 列表键名
   * @param condition 删除条件函数或字段值
   * @param uniqueField 用于匹配的字段名，当condition为值时使用
   * @returns 是否删除成功
   */
  public async removeListItem<K extends keyof AppConfig>(
    key: K,
    condition: ((item: any) => boolean) | any,
    uniqueField: string = 'path'
  ): Promise<boolean> {
    try {
      const currentItems = await this.getListItems(key)

      let newItems: any[]
      if (typeof condition === 'function') {
        // 使用函数条件
        newItems = currentItems.filter(item => !condition(item))
      } else {
        // 使用字段值匹配
        newItems = currentItems.filter(item =>
          !(item && typeof item === 'object' && (item as any)[uniqueField] === condition)
        )
      }

      return await this.setListItems(key, newItems)
    } catch (error) {
      console.error(`删除列表项失败 (${String(key)}):`, error)
      return false
    }
  }

  /**
   * 更新列表项
   * @param key 列表键名
   * @param condition 查找条件函数或字段值
   * @param updates 更新数据
   * @param uniqueField 用于匹配的字段名，当condition为值时使用
   * @returns 是否更新成功
   */
  public async updateListItem<K extends keyof AppConfig>(
    key: K,
    condition: ((item: any) => boolean) | any,
    updates: any,
    uniqueField: string = 'path'
  ): Promise<boolean> {
    try {
      const currentItems = await this.getListItems(key)

      const newItems = currentItems.map(item => {
        let shouldUpdate = false

        if (typeof condition === 'function') {
          shouldUpdate = condition(item)
        } else {
          shouldUpdate = item && typeof item === 'object' && (item as any)[uniqueField] === condition
        }

        if (shouldUpdate) {
          return { ...item, ...updates }
        }
        return item
      })

      return await this.setListItems(key, newItems)
    } catch (error) {
      console.error(`更新列表项失败 (${String(key)}):`, error)
      return false
    }
  }

  /**
   * 重新排序列表项
   * @param key 列表键名
   * @param newOrder 新的排序数组
   * @returns 是否排序成功
   */
  public async reorderListItems<K extends keyof AppConfig>(
    key: K,
    newOrder: any[]
  ): Promise<boolean> {
    try {
      return await this.setListItems(key, newOrder)
    } catch (error) {
      console.error(`重新排序列表项失败 (${String(key)}):`, error)
      return false
    }
  }

  /**
   * 清空列表项
   * @param key 列表键名
   * @returns 是否清空成功
   */
  public async clearListItems<K extends keyof AppConfig>(key: K): Promise<boolean> {
    try {
      return await this.setListItems(key, [])
    } catch (error) {
      console.error(`清空列表项失败 (${String(key)}):`, error)
      return false
    }
  }

  /**
   * 批量操作列表项
   * @param key 列表键名
   * @param operations 操作数组
   * @returns 是否操作成功
   */
  public async batchListOperations<K extends keyof AppConfig>(
    key: K,
    operations: Array<{
      type: 'add' | 'remove' | 'update'
      item?: any
      condition?: any
      updates?: any
      options?: any
    }>
  ): Promise<boolean> {
    try {
      let currentItems = await this.getListItems(key)

      for (const operation of operations) {
        switch (operation.type) {
          case 'add':
            if (operation.item) {
              const { position = 'end', unique = true, uniqueField = 'path', maxLength } = operation.options || {}

              if (unique && operation.item && typeof operation.item === 'object') {
                const existingIndex = currentItems.findIndex(existingItem =>
                  existingItem && typeof existingItem === 'object' &&
                  (existingItem as any)[uniqueField] === (operation.item as any)[uniqueField]
                )
                if (existingIndex >= 0) {
                  currentItems.splice(existingIndex, 1)
                }
              }

              if (position === 'start') {
                currentItems.unshift(operation.item)
              } else {
                currentItems.push(operation.item)
              }

              if (maxLength && currentItems.length > maxLength) {
                currentItems = currentItems.slice(0, maxLength)
              }
            }
            break

          case 'remove':
            if (typeof operation.condition === 'function') {
              currentItems = currentItems.filter(item => !operation.condition!(item))
            } else if (operation.condition !== undefined) {
              const uniqueField = operation.options?.uniqueField || 'path'
              currentItems = currentItems.filter(item =>
                !(item && typeof item === 'object' && (item as any)[uniqueField] === operation.condition)
              )
            }
            break

          case 'update':
            if (operation.condition !== undefined && operation.updates) {
              const uniqueField = operation.options?.uniqueField || 'path'
              currentItems = currentItems.map(item => {
                let shouldUpdate = false

                if (typeof operation.condition === 'function') {
                  shouldUpdate = operation.condition(item)
                } else {
                  shouldUpdate = item && typeof item === 'object' && (item as any)[uniqueField] === operation.condition
                }

                if (shouldUpdate) {
                  return { ...item, ...operation.updates }
                }
                return item
              })
            }
            break
        }
      }

      return await this.setListItems(key, currentItems)
    } catch (error) {
      console.error(`批量操作列表项失败 (${String(key)}):`, error)
      return false
    }
  }
}


