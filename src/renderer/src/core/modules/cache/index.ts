import { defineStore } from 'pinia'
import { shallowReactive } from 'vue'
import type { CacheItem } from '@/core/typings/cache'

/**
 * 缓存管理 Store
 * 使用 shallowReactive 优化性能
 */
export const useCacheStore = defineStore('cache', () => {
  // ==================== 状态 ====================
  /** 缓存数据 - 使用 shallowReactive 优化性能 */
  const caches = shallowReactive<Map<string, CacheItem>>(new Map())

  // ==================== 方法 ====================
  /**
   * 设置缓存项
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒），可选
   */
  const set = <T>(key: string, value: T, ttl?: number) => {
    const item: CacheItem<T> = {
      value,
      timestamp: Date.now(),
      ttl
    }
    caches.set(key, item)
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存值，如果不存在或已过期则返回 null
   */
  const get = <T>(key: string): T | null => {
    const item = caches.get(key)
    if (!item) return null

    // 检查是否过期
    if (item.ttl && Date.now() - item.timestamp > item.ttl) {
      caches.delete(key)
      return null
    }

    return item.value as T
  }

  /**
   * 删除指定缓存项
   * @param key 缓存键
   */
  const remove = (key: string) => {
    caches.delete(key)
  }

  /**
   * 清空所有缓存
   */
  const clear = () => {
    caches.clear()
  }

  /**
   * 检查缓存项是否存在且未过期
   * @param key 缓存键
   */
  const has = (key: string): boolean => {
    const item = caches.get(key)
    if (!item) return false

    // 检查是否过期
    if (item.ttl && Date.now() - item.timestamp > item.ttl) {
      caches.delete(key)
      return false
    }

    return true
  }

  /**
   * 获取所有缓存键
   */
  const keys = (): string[] => {
    return Array.from(caches.keys())
  }

  /**
   * 获取缓存数量
   */
  const size = (): number => {
    return caches.size
  }

  /**
   * 清理过期的缓存项
   */
  const clearExpired = () => {
    const now = Date.now()
    const keysToRemove: string[] = []

    caches.forEach((item, key) => {
      if (item.ttl && now - item.timestamp > item.ttl) {
        keysToRemove.push(key)
      }
    })

    keysToRemove.forEach(key => caches.delete(key))

    return keysToRemove.length
  }

  /**
   * 获取缓存统计信息
   */
  const getStats = () => {
    const now = Date.now()
    let expired = 0
    let valid = 0

    caches.forEach(item => {
      if (item.ttl && now - item.timestamp > item.ttl) {
        expired++
      } else {
        valid++
      }
    })

    return {
      total: caches.size,
      expired,
      valid
    }
  }

  // ==================== 返回 ====================
  return {
    // 方法
    set,
    get,
    remove,
    clear,
    has,
    keys,
    size,
    clearExpired,
    getStats
  }
})

