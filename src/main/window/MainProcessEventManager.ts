/**
 * 主进程事件管理器
 * 提供统一的事件发布/订阅机制，替代各个类的独立 EventEmitter
 */

import { EventEmitter } from 'events'
import log from 'electron-log'

/**
 * 主进程事件类型定义
 * 集中定义所有主进程内部事件
 */
export interface MainProcessEvents {
  // 窗口相关事件
  'window:main-created': { windowId: number; timestamp: number }
  'window:main-closed': { windowId: number; timestamp: number }
  'window:main-focused': { windowId: number; timestamp: number }
  'window:main-blurred': { windowId: number; timestamp: number }

  // 视图相关事件
  'view:created': { viewId: string; windowId: number; config: any; timestamp: number }
  'view:removed': { viewId: string; windowId: number; timestamp: number }
  'view:switched': { fromViewId?: string; toViewId: string; windowId: number; timestamp: number }
  'view:activated': { viewId: string; windowId: number; timestamp: number }
  'view:detached': { viewId: string; windowId: number; detachedWindowId: number; timestamp: number }
  'view:reattached': { viewId: string; fromWindowId: number; toWindowId: number; timestamp: number }
  'view:detach-success': { viewId: string; sourceWindowId: number; detachedWindowId: number; timestamp: number }
  'view:detach-failed': { viewId: string; windowId: number; error: string; timestamp: number }
  'view:detach-error': { viewId: string; windowId: number; error: Error; timestamp: number }
  'view:closed': { viewId: string; windowId: number; reason: string; timestamp: number }
  'view:parent-window-updated': { viewId: string; oldWindowId: number; newWindowId: number; timestamp: number }
  'view:reattach-requested': { viewId: string; targetWindowId: number; timestamp: number }
  'view:detached-window-closed': { viewId: string; detachedWindowId: number; timestamp: number }

  // 分离窗口事件
  'detached-window:focused': { windowId: number; timestamp: number }
  'detached-window:blurred': { windowId: number; timestamp: number }

  // 生命周期事件
  'lifecycle:strategy-set': { windowId: number; strategy: string; timestamp: number }
  'lifecycle:view-paused': { viewId: string; windowId: number; timestamp: number }
  'lifecycle:view-resumed': { viewId: string; windowId: number; timestamp: number }
  'lifecycle:view-destroyed': { viewId: string; windowId: number; timestamp: number }
  'lifecycle:cleanup-completed': { report: any; timestamp: number }

  // 管理器事件
  'manager:initialized': { timestamp: number }
  'cleanup:completed': { report?: any; timestamp: number }

  // 性能监控事件
  'performance:metrics': { windowId: number; metrics: any; timestamp: number }

  // 控制栏事件
  'control-bar:action': { action: string; data: any; timestamp: number }
}

/**
 * 事件处理器类型
 */
export type EventHandler<T extends keyof MainProcessEvents> = (data: MainProcessEvents[T]) => void

/**
 * 主进程事件管理器单例类
 */
export class MainProcessEventManager {
  private static instance: MainProcessEventManager
  private emitter: EventEmitter
  private eventStats: Map<string, { count: number; lastEmitted: number }> = new Map()

  private constructor() {
    this.emitter = new EventEmitter()
    this.emitter.setMaxListeners(100) // 设置更高的监听器限制
    this.setupEventStatsTracking()
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): MainProcessEventManager {
    if (!MainProcessEventManager.instance) {
      MainProcessEventManager.instance = new MainProcessEventManager()
    }
    return MainProcessEventManager.instance
  }

  /**
   * 发布事件
   * @param eventName 事件名
   * @param data 事件数据
   */
  public emit<T extends keyof MainProcessEvents>(
    eventName: T,
    data: MainProcessEvents[T]
  ): void {
    try {
      // 更新统计信息
      this.updateEventStats(eventName as string)

      // 发布事件
      this.emitter.emit(eventName as string, data)

      log.debug(`主进程事件已发布: ${eventName as string}`, { data, timestamp: Date.now() })
    } catch (error) {
      log.error(`发布事件失败: ${eventName as string}`, error)
    }
  }

  /**
   * 订阅事件
   * @param eventName 事件名
   * @param handler 事件处理器
   */
  public on<T extends keyof MainProcessEvents>(
    eventName: T,
    handler: EventHandler<T>
  ): void {
    this.emitter.on(eventName as string, handler)
    log.debug(`已添加事件监听器: ${eventName as string}`)
  }

  /**
   * 订阅一次性事件
   * @param eventName 事件名
   * @param handler 事件处理器
   */
  public once<T extends keyof MainProcessEvents>(
    eventName: T,
    handler: EventHandler<T>
  ): void {
    this.emitter.once(eventName as string, handler)
    log.debug(`已添加一次性事件监听器: ${eventName as string}`)
  }

  /**
   * 移除事件监听器
   * @param eventName 事件名
   * @param handler 事件处理器
   */
  public off<T extends keyof MainProcessEvents>(
    eventName: T,
    handler: EventHandler<T>
  ): void {
    this.emitter.off(eventName as string, handler)
    log.debug(`已移除事件监听器: ${eventName as string}`)
  }

  /**
   * 移除所有监听器
   * @param eventName 事件名（可选）
   */
  public removeAllListeners(eventName?: keyof MainProcessEvents): void {
    if (eventName) {
      this.emitter.removeAllListeners(eventName as string)
      log.debug(`已移除所有监听器: ${eventName as string}`)
    } else {
      this.emitter.removeAllListeners()
      log.debug('已移除所有事件监听器')
    }
  }

  /**
   * 获取事件监听器数量
   * @param eventName 事件名
   */
  public listenerCount(eventName: keyof MainProcessEvents): number {
    return this.emitter.listenerCount(eventName as string)
  }

  /**
   * 获取所有事件名
   */
  public eventNames(): (string | symbol)[] {
    return this.emitter.eventNames()
  }

  /**
   * 获取事件统计信息
   */
  public getEventStats(): Map<string, { count: number; lastEmitted: number }> {
    return new Map(this.eventStats)
  }

  /**
   * 清除事件统计信息
   */
  public clearEventStats(): void {
    this.eventStats.clear()
    log.debug('事件统计信息已清除')
  }

  /**
   * 设置事件统计跟踪
   */
  private setupEventStatsTracking(): void {
    // 监听所有事件来更新统计
    this.emitter.on('newListener', (eventName: string) => {
      log.debug(`新的事件监听器注册: ${eventName}`)
    })

    this.emitter.on('removeListener', (eventName: string) => {
      log.debug(`事件监听器已移除: ${eventName}`)
    })
  }

  /**
   * 更新事件统计信息
   */
  private updateEventStats(eventName: string): void {
    const stats = this.eventStats.get(eventName) || { count: 0, lastEmitted: 0 }
    stats.count++
    stats.lastEmitted = Date.now()
    this.eventStats.set(eventName, stats)
  }

  /**
   * 销毁事件管理器（用于测试和清理）
   */
  public destroy(): void {
    this.emitter.removeAllListeners()
    this.eventStats.clear()
    log.debug('主进程事件管理器已销毁')
  }
}

/**
 * 导出单例实例
 */
export const mainProcessEventManager = MainProcessEventManager.getInstance()

/**
 * 便捷方法导出
 */
export const { emit, on, once, off, removeAllListeners } = mainProcessEventManager
