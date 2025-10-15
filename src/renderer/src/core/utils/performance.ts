/**
 * 性能优化工具集
 * 提供各种性能优化相关的工具函数和组合式函数
 */

import { ref, computed, watch, nextTick, onUnmounted, type Ref } from 'vue'

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }

    const callNow = immediate && !timeout

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)

    if (callNow) func(...args)
  }
}

/**
 * Vue组合式函数版本的防抖
 * @param fn 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function useDebounceFn<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  return debounce(fn, delay)
}

/**
 * Vue组合式函数版本的节流
 * @param fn 要节流的函数
 * @param limit 限制时间（毫秒）
 * @returns 节流后的函数
 */
export function useThrottleFn<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  return throttle(fn, limit)
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 请求动画帧节流
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null

  return function executedFunction(...args: Parameters<T>) {
    if (rafId) return

    rafId = requestAnimationFrame(() => {
      func(...args)
      rafId = null
    })
  }
}

/**
 * 空闲时间执行
 */
export function runWhenIdle<T extends (...args: any[]) => any>(
  func: T,
  timeout = 5000
): (...args: Parameters<T>) => void {
  return function executedFunction(...args: Parameters<T>) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => func(...args), { timeout })
    } else {
      setTimeout(() => func(...args), 0)
    }
  }
}

/**
 * 批处理函数
 */
export class BatchProcessor<T> {
  private batch: T[] = []
  private timer: NodeJS.Timeout | null = null

  constructor(
    private processor: (items: T[]) => void | Promise<void>,
    private delay = 100,
    private maxBatchSize = 50
  ) { }

  add(item: T): void {
    this.batch.push(item)

    if (this.batch.length >= this.maxBatchSize) {
      this.flush()
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.delay)
    }
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (this.batch.length > 0) {
      const items = [...this.batch]
      this.batch = []
      this.processor(items)
    }
  }

  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.batch = []
  }
}

/**
 * 虚拟滚动计算
 */
export function useVirtualScroll<T>(
  items: Ref<T[]>,
  containerHeight: Ref<number>,
  itemHeight: number,
  buffer = 5
) {
  const scrollTop = ref(0)

  const visibleRange = computed(() => {
    const start = Math.floor(scrollTop.value / itemHeight)
    const end = Math.min(
      items.value.length - 1,
      Math.ceil((scrollTop.value + containerHeight.value) / itemHeight)
    )

    return {
      start: Math.max(0, start - buffer),
      end: Math.min(items.value.length - 1, end + buffer)
    }
  })

  const visibleItems = computed(() => {
    const { start, end } = visibleRange.value
    return items.value.slice(start, end + 1).map((item, index) => ({
      item,
      index: start + index,
      top: (start + index) * itemHeight
    }))
  })

  const totalHeight = computed(() => items.value.length * itemHeight)

  const updateScrollTop = (newScrollTop: number) => {
    scrollTop.value = newScrollTop
  }

  return {
    visibleItems,
    visibleRange,
    totalHeight,
    updateScrollTop
  }
}

/**
 * 内存泄漏检测
 */
export class MemoryLeakDetector {
  private listeners: Map<string, number> = new Map()
  private timers: Set<NodeJS.Timeout> = new Set()
  private intervals: Set<NodeJS.Timeout> = new Set()
  private observers: Set<any> = new Set()

  /**
   * 记录事件监听器
   */
  trackEventListener(element: EventTarget, event: string): void {
    const key = `${element.constructor.name}:${event}`
    this.listeners.set(key, (this.listeners.get(key) || 0) + 1)
  }

  /**
   * 移除事件监听器记录
   */
  untrackEventListener(element: EventTarget, event: string): void {
    const key = `${element.constructor.name}:${event}`
    const count = this.listeners.get(key) || 0
    if (count <= 1) {
      this.listeners.delete(key)
    } else {
      this.listeners.set(key, count - 1)
    }
  }

  /**
   * 记录定时器
   */
  trackTimer(timer: NodeJS.Timeout, isInterval = false): void {
    if (isInterval) {
      this.intervals.add(timer)
    } else {
      this.timers.add(timer)
    }
  }

  /**
   * 清除定时器
   */
  clearTimer(timer: NodeJS.Timeout, isInterval = false): void {
    if (isInterval) {
      clearInterval(timer)
      this.intervals.delete(timer)
    } else {
      clearTimeout(timer)
      this.timers.delete(timer)
    }
  }

  /**
   * 记录观察者
   */
  trackObserver(observer: any): void {
    this.observers.add(observer)
  }

  /**
   * 断开观察者
   */
  disconnectObserver(observer: any): void {
    if (observer.disconnect) {
      observer.disconnect()
    }
    this.observers.delete(observer)
  }

  /**
   * 清理所有资源
   */
  cleanup(): void {
    // 清理定时器
    this.timers.forEach(timer => clearTimeout(timer))
    this.intervals.forEach(interval => clearInterval(interval))

    // 断开观察者
    this.observers.forEach(observer => {
      if (observer.disconnect) observer.disconnect()
    })

    // 清空记录
    this.listeners.clear()
    this.timers.clear()
    this.intervals.clear()
    this.observers.clear()
  }

  /**
   * 获取泄漏报告
   */
  getLeakReport(): {
    listeners: Record<string, number>
    timers: number
    intervals: number
    observers: number
  } {
    return {
      listeners: Object.fromEntries(this.listeners),
      timers: this.timers.size,
      intervals: this.intervals.size,
      observers: this.observers.size
    }
  }
}

/**
 * 性能监控
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map()
  private measures: Array<{ name: string; duration: number; timestamp: number }> = []

  /**
   * 开始性能标记
   */
  mark(name: string): void {
    this.marks.set(name, performance.now())
  }

  /**
   * 结束性能测量
   */
  measure(name: string, startMark?: string): number {
    const endTime = performance.now()
    const startTime = startMark ? this.marks.get(startMark) : this.marks.get(name)

    if (startTime === undefined) {
      console.warn(`Performance mark "${startMark || name}" not found`)
      return 0
    }

    const duration = endTime - startTime
    this.measures.push({
      name,
      duration,
      timestamp: endTime
    })

    return duration
  }

  /**
   * 获取性能报告
   */
  getReport(limit = 100): Array<{ name: string; duration: number; timestamp: number }> {
    return this.measures
      .slice(-limit)
      .sort((a, b) => b.duration - a.duration)
  }

  /**
   * 清理记录
   */
  clear(): void {
    this.marks.clear()
    this.measures = []
  }

  /**
   * 获取平均性能
   */
  getAveragePerformance(name: string): number {
    const measures = this.measures.filter(m => m.name === name)
    if (measures.length === 0) return 0

    const total = measures.reduce((sum, m) => sum + m.duration, 0)
    return total / measures.length
  }
}

/**
 * 组件性能分析 Hook
 */
export function usePerformanceAnalysis(componentName: string) {
  const monitor = new PerformanceMonitor()
  const leakDetector = new MemoryLeakDetector()

  // 组件挂载时开始监控
  monitor.mark(`${componentName}:mount:start`)

  const measureRender = () => {
    monitor.mark(`${componentName}:render:start`)

    return {
      end: () => monitor.measure(`${componentName}:render`, `${componentName}:render:start`)
    }
  }

  const measureUpdate = () => {
    monitor.mark(`${componentName}:update:start`)

    return {
      end: () => monitor.measure(`${componentName}:update`, `${componentName}:update:start`)
    }
  }

  // 清理资源
  onUnmounted(() => {
    monitor.measure(`${componentName}:mount`, `${componentName}:mount:start`)
    leakDetector.cleanup()

    // 输出性能报告
    const report = monitor.getReport()
    if (report.length > 0) {
      console.group(`🔍 ${componentName} 性能报告`)
      report.forEach(({ name, duration }) => {
        console.log(`${name}: ${duration.toFixed(2)}ms`)
      })
      console.groupEnd()
    }
  })

  return {
    monitor,
    leakDetector,
    measureRender,
    measureUpdate
  }
}

/**
 * 智能缓存 Hook
 */
export function useSmartCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number // 缓存时间 (ms)
    maxSize?: number // 最大缓存大小
    staleWhileRevalidate?: boolean // 使用旧数据同时重新验证
  } = {}
) {
  const { ttl = 5 * 60 * 1000, maxSize = 100, staleWhileRevalidate = true } = options

  // 简单的内存缓存实现
  const cache = new Map<string, { data: T; timestamp: number }>()
  const loading = ref(false)
  const data = ref<T>()
  const error = ref<Error>()

  const isExpired = (timestamp: number) => {
    return Date.now() - timestamp > ttl
  }

  const fetch = async (useCache = true) => {
    // 检查缓存
    if (useCache && cache.has(key)) {
      const cached = cache.get(key)!

      if (!isExpired(cached.timestamp)) {
        data.value = cached.data
        return cached.data
      }

      // 如果启用了 stale-while-revalidate，先返回旧数据
      if (staleWhileRevalidate) {
        data.value = cached.data
      }
    }

    // 获取新数据
    loading.value = true
    error.value = undefined

    try {
      const result = await fetcher()

      // 更新缓存
      cache.set(key, { data: result, timestamp: Date.now() })

      // 限制缓存大小
      if (cache.size > maxSize) {
        const firstKey: any = cache.keys().next().value
        cache.delete(firstKey)
      }

      data.value = result
      return result
    } catch (err) {
      error.value = err as Error
      throw err
    } finally {
      loading.value = false
    }
  }

  const invalidate = () => {
    cache.delete(key)
  }

  const refresh = () => fetch(false)

  return {
    data: computed(() => data.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetch,
    refresh,
    invalidate
  }
}

/**
 * 导出全局性能监控实例
 */
export const globalPerformanceMonitor = new PerformanceMonitor()
export const globalMemoryLeakDetector = new MemoryLeakDetector()

/**
 * 性能优化装饰器
 */
export function performanceOptimized<T extends (...args: any[]) => any>(
  target: T,
  options: {
    debounce?: number
    throttle?: number
    cache?: boolean
    measure?: boolean
  } = {}
): T {
  let optimizedFn = target

  // 添加防抖
  if (options.debounce) {
    optimizedFn = debounce(optimizedFn, options.debounce) as T
  }

  // 添加节流
  if (options.throttle) {
    optimizedFn = throttle(optimizedFn, options.throttle) as T
  }

  // 添加性能测量
  if (options.measure) {
    const originalFn = optimizedFn
    optimizedFn = ((...args: any[]) => {
      const start = performance.now()
      const result = originalFn(...args)
      const end = performance.now()

      console.log(`Function ${target.name} took ${(end - start).toFixed(2)}ms`)

      return result
    }) as T
  }

  return optimizedFn
}
