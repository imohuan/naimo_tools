/**
 * LifecycleManager - 视图生命周期管理器
 * 负责管理 WebContentsView 的生命周期策略，包括前台/后台运行模式、内存管理和资源清理
 */

import log from 'electron-log'
import { emitEvent } from '@main/core/ProcessEvent'
import type {
  WebContentsViewInfo,
  ViewOperationResult,
  WindowPerformanceMetrics,
  CleanupStrategyConfig,
  WindowManagerEventData
} from '../typings/windowTypes'
import type {
  ViewState,
  LifecycleStrategy,
  ViewType,
  PerformanceMetrics,
  WindowManagerError,
  WindowManagerErrorType
} from '@renderer/src/typings/windowTypes'
import { LifecycleType } from '@renderer/src/typings/windowTypes'
import type { PluginItem } from '@renderer/src/typings/pluginTypes'

/**
 * 生命周期管理器配置
 */
export interface LifecycleManagerConfig {
  /** 默认生命周期策略 */
  defaultLifecycle: LifecycleStrategy
  /** 最大同时活跃视图数 */
  maxActiveViews: number
  /** 内存回收阈值（MB） */
  memoryRecycleThreshold: number
  /** 自动回收间隔（毫秒） */
  autoRecycleInterval: number
  /** 最大空闲时间（毫秒） */
  maxIdleTime: number
  /** 启用自动清理 */
  enableAutoCleanup: boolean
}

/**
 * 视图生命周期状态
 */
interface ViewLifecycleState {
  /** 视图ID */
  viewId: string
  /** 生命周期策略 */
  strategy: LifecycleStrategy
  /** 最后访问时间 */
  lastAccessTime: number
  /** 暂停时间 */
  pausedAt?: number
  /** 是否已暂停 */
  isPaused: boolean
  /** 内存使用量（MB） */
  memoryUsage: number
  /** 关联的插件信息 */
  pluginItem?: PluginItem
}

/**
 * 内存清理报告
 */
interface MemoryCleanupReport {
  /** 清理前内存使用（MB） */
  beforeCleanup: number
  /** 清理后内存使用（MB） */
  afterCleanup: number
  /** 释放的内存（MB） */
  freedMemory: number
  /** 清理的视图ID列表 */
  cleanedViews: string[]
  /** 清理时间 */
  cleanupTime: number
}

/**
 * LifecycleManager 类
 * 管理视图的生命周期策略和资源优化
 */
export class LifecycleManager {
  private static instance: LifecycleManager
  private config: LifecycleManagerConfig
  private viewStates: Map<string, ViewLifecycleState> = new Map()
  private cleanupTimer?: NodeJS.Timeout
  private performanceMetrics: PerformanceMetrics

  private constructor(config?: Partial<LifecycleManagerConfig>) {
    this.config = {
      defaultLifecycle: {
        type: LifecycleType.FOREGROUND,
        persistOnClose: false,
        maxIdleTime: 5 * 60 * 1000, // 5分钟
        memoryThreshold: 100 // 100MB
      },
      maxActiveViews: 5,
      memoryRecycleThreshold: 500, // 500MB
      autoRecycleInterval: 30 * 1000, // 30秒
      maxIdleTime: 10 * 60 * 1000, // 10分钟
      enableAutoCleanup: true,
      ...config
    }

    this.performanceMetrics = {
      switchTime: 0,
      memoryUsage: 0,
      activeViewCount: 0,
      cpuUsage: 0,
      lastUpdated: Date.now()
    }

    this.initializeAutoCleanup()
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: Partial<LifecycleManagerConfig>): LifecycleManager {
    if (!LifecycleManager.instance) {
      LifecycleManager.instance = new LifecycleManager(config)
    }
    return LifecycleManager.instance
  }

  /**
   * 设置视图的生命周期策略
   * @param viewId 视图ID
   * @param strategy 生命周期策略
   * @param pluginItem 关联的插件信息（可选）
   */
  public setLifecycleStrategy(
    viewId: string,
    strategy: LifecycleStrategy,
    pluginItem?: PluginItem
  ): void {
    log.info(`设置视图生命周期策略: ${viewId}, 类型: ${strategy.type}`)

    const lifecycleState: ViewLifecycleState = {
      viewId,
      strategy,
      lastAccessTime: Date.now(),
      isPaused: false,
      memoryUsage: 0,
      pluginItem
    }

    this.viewStates.set(viewId, lifecycleState)
    this.updatePerformanceMetrics()

    // 触发事件
    emitEvent.emit('lifecycle:strategy-set', {
      windowId: 0, // TODO: 需要从 viewInfo 中获取 windowId
      strategy: strategy.type,
      timestamp: Date.now()
    })
  }

  /**
   * 从插件配置推断生命周期策略
   * @param pluginItem 插件项目信息
   * @returns 生命周期策略
   */
  public inferLifecycleFromPlugin(pluginItem: PluginItem): LifecycleStrategy {
    // 根据插件的 lifecycleType 属性确定生命周期策略
    const lifecycleType = pluginItem.lifecycleType || LifecycleType.FOREGROUND
    const isBackgroundMode = lifecycleType === LifecycleType.BACKGROUND

    return {
      type: lifecycleType,
      persistOnClose: isBackgroundMode,
      maxIdleTime: isBackgroundMode ? this.config.maxIdleTime : undefined,
      memoryThreshold: this.config.defaultLifecycle.memoryThreshold
    }
  }

  /**
   * 处理视图关闭事件
   * @param viewId 视图ID
   * @returns 操作结果
   */
  public async handleViewClose(viewId: string): Promise<ViewOperationResult> {
    try {
      log.info(`处理视图关闭: ${viewId}`)

      const lifecycleState = this.viewStates.get(viewId)
      if (!lifecycleState) {
        return {
          success: false,
          viewId,
          error: '视图生命周期状态不存在'
        }
      }

      const { strategy } = lifecycleState

      if (strategy.type === LifecycleType.BACKGROUND && strategy.persistOnClose) {
        // 后台模式：暂停视图但保持状态
        const pauseResult = await this.pauseView(viewId)

        log.info(`视图已暂停（后台模式）: ${viewId}`)
        return pauseResult
      } else {
        // 前台模式：完全销毁视图
        const destroyResult = await this.destroyView(viewId)

        log.info(`视图已销毁（前台模式）: ${viewId}`)
        return destroyResult
      }
    } catch (error) {
      log.error(`处理视图关闭失败: ${viewId}`, error)
      return {
        success: false,
        viewId,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 暂停视图（后台模式）
   * @param viewId 视图ID
   * @returns 操作结果
   */
  public async pauseView(viewId: string): Promise<ViewOperationResult> {
    try {
      const lifecycleState = this.viewStates.get(viewId)
      if (!lifecycleState) {
        throw new Error('视图生命周期状态不存在')
      }

      // 更新状态为暂停
      lifecycleState.isPaused = true
      lifecycleState.pausedAt = Date.now()

      // 触发暂停事件
      emitEvent.emit('lifecycle:view-paused', {
        viewId,
        windowId: 0, // TODO: 需要从 viewInfo 中获取 windowId
        timestamp: lifecycleState.pausedAt || Date.now()
      })

      log.info(`视图已暂停: ${viewId}`)

      return {
        success: true,
        viewId,
        data: { isPaused: true, pausedAt: lifecycleState.pausedAt }
      }
    } catch (error) {
      log.error(`暂停视图失败: ${viewId}`, error)
      return {
        success: false,
        viewId,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 恢复视图（从暂停状态）
   * @param viewId 视图ID
   * @returns 操作结果
   */
  public async resumeView(viewId: string): Promise<ViewOperationResult> {
    try {
      const lifecycleState = this.viewStates.get(viewId)
      if (!lifecycleState) {
        throw new Error('视图生命周期状态不存在')
      }

      if (!lifecycleState.isPaused) {
        return {
          success: true,
          viewId,
          data: { message: '视图未暂停，无需恢复' }
        }
      }

      // 更新状态为活跃
      lifecycleState.isPaused = false
      lifecycleState.lastAccessTime = Date.now()
      delete lifecycleState.pausedAt

      // 触发恢复事件
      emitEvent.emit('lifecycle:view-resumed', {
        viewId,
        windowId: 0, // TODO: 需要从 viewInfo 中获取 windowId
        timestamp: lifecycleState.lastAccessTime
      })

      log.info(`视图已恢复: ${viewId}`)

      return {
        success: true,
        viewId,
        data: { isPaused: false, resumedAt: lifecycleState.lastAccessTime }
      }
    } catch (error) {
      log.error(`恢复视图失败: ${viewId}`, error)
      return {
        success: false,
        viewId,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 销毁视图（前台模式或强制清理）
   * @param viewId 视图ID
   * @returns 操作结果
   */
  public async destroyView(viewId: string): Promise<ViewOperationResult> {
    try {
      const lifecycleState = this.viewStates.get(viewId)
      if (!lifecycleState) {
        // 视图状态不存在，可能已经被销毁
        return {
          success: true,
          viewId,
          data: { message: '视图状态不存在，可能已销毁' }
        }
      }

      // 移除生命周期状态
      this.viewStates.delete(viewId)

      // 触发销毁事件
      emitEvent.emit('lifecycle:view-destroyed', {
        viewId,
        windowId: 0, // TODO: 需要从 viewInfo 中获取 windowId
        timestamp: Date.now()
      })

      this.updatePerformanceMetrics()

      log.info(`视图已销毁: ${viewId}`)

      return {
        success: true,
        viewId,
        data: { destroyed: true, destroyedAt: Date.now() }
      }
    } catch (error) {
      log.error(`销毁视图失败: ${viewId}`, error)
      return {
        success: false,
        viewId,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 更新视图访问时间
   * @param viewId 视图ID
   */
  public updateViewAccess(viewId: string): void {
    const lifecycleState = this.viewStates.get(viewId)
    if (lifecycleState) {
      lifecycleState.lastAccessTime = Date.now()

      // 如果视图被暂停，自动恢复
      if (lifecycleState.isPaused) {
        this.resumeView(viewId)
      }
    }
  }

  /**
   * 获取视图状态
   * @param viewId 视图ID
   * @returns 视图状态或 undefined
   */
  public getViewState(viewId: string): ViewLifecycleState | undefined {
    return this.viewStates.get(viewId)
  }

  /**
   * 获取所有活跃视图
   * @returns 活跃视图ID列表
   */
  public getActiveViews(): string[] {
    return Array.from(this.viewStates.entries())
      .filter(([_, state]) => !state.isPaused)
      .map(([viewId]) => viewId)
  }

  /**
   * 获取所有暂停视图
   * @returns 暂停视图ID列表
   */
  public getPausedViews(): string[] {
    return Array.from(this.viewStates.entries())
      .filter(([_, state]) => state.isPaused)
      .map(([viewId]) => viewId)
  }

  /**
   * 清理后台视图（基于内存和时间策略）
   * @returns 清理报告
   */
  public async cleanupBackgroundViews(): Promise<MemoryCleanupReport> {
    const startTime = Date.now()
    const beforeMemory = this.getTotalMemoryUsage()
    const cleanedViews: string[] = []

    try {
      log.info('开始清理后台视图')

      // 获取需要清理的视图
      const viewsToCleanup = this.identifyViewsForCleanup()

      // 执行清理
      for (const viewId of viewsToCleanup) {
        const result = await this.destroyView(viewId)
        if (result.success) {
          cleanedViews.push(viewId)
        }
      }

      const afterMemory = this.getTotalMemoryUsage()
      const freedMemory = beforeMemory - afterMemory

      const report: MemoryCleanupReport = {
        beforeCleanup: beforeMemory,
        afterCleanup: afterMemory,
        freedMemory: Math.max(0, freedMemory),
        cleanedViews,
        cleanupTime: Date.now() - startTime
      }

      // 触发清理完成事件
      emitEvent.emit('lifecycle:cleanup-completed', {
        report,
        timestamp: Date.now()
      })

      log.info(`后台视图清理完成: 清理了 ${cleanedViews.length} 个视图，释放 ${report.freedMemory.toFixed(1)}MB 内存`)

      return report
    } catch (error) {
      log.error('清理后台视图失败:', error)

      const report: MemoryCleanupReport = {
        beforeCleanup: beforeMemory,
        afterCleanup: this.getTotalMemoryUsage(),
        freedMemory: 0,
        cleanedViews,
        cleanupTime: Date.now() - startTime
      }

      return report
    }
  }

  /**
   * 识别需要清理的视图
   * @returns 需要清理的视图ID列表
   */
  private identifyViewsForCleanup(): string[] {
    const now = Date.now()
    const viewsToCleanup: string[] = []

    // 按优先级排序需要清理的视图
    const pausedViews = Array.from(this.viewStates.entries())
      .filter(([_, state]) => state.isPaused) // 只清理暂停的视图

    if (pausedViews.length === 0) {
      log.debug('没有暂停的视图需要清理')
      return viewsToCleanup
    }

    // 智能评分算法：综合考虑内存使用、空闲时间和插件重要性
    const scoredViews = pausedViews.map(([viewId, state]) => {
      const idleTime = now - state.lastAccessTime
      const maxIdleTime = state.strategy.maxIdleTime || this.config.maxIdleTime

      // 基础分数：内存使用量 + 空闲时间权重
      let score = state.memoryUsage * 0.6 + (idleTime / 1000) * 0.4

      // 如果超过最大空闲时间，大幅提升清理优先级
      if (idleTime > maxIdleTime) {
        score += 1000
      }

      // 如果是后台模式的插件，降低清理优先级（保护重要后台任务）
      if (state.strategy.type === LifecycleType.BACKGROUND && state.strategy.persistOnClose) {
        score *= 0.7
      }

      return { viewId, state, score, idleTime, maxIdleTime }
    })

    // 按分数降序排列
    const sortedViews = scoredViews.sort((a, b) => b.score - a.score)

    // 检查内存阈值
    const totalMemory = this.getTotalMemoryUsage()
    const memoryPressure = totalMemory / this.config.memoryRecycleThreshold

    if (memoryPressure > 1.0) {
      log.info(`内存压力: ${(memoryPressure * 100).toFixed(1)}% (${totalMemory}MB > ${this.config.memoryRecycleThreshold}MB)`)

      // 根据内存压力动态决定清理数量
      let cleanupCount: number
      if (memoryPressure > 1.5) {
        // 高内存压力：清理大部分视图
        cleanupCount = Math.ceil(sortedViews.length * 0.8)
      } else if (memoryPressure > 1.2) {
        // 中等内存压力：清理一半视图
        cleanupCount = Math.ceil(sortedViews.length * 0.5)
      } else {
        // 轻微内存压力：清理最高分的几个视图
        cleanupCount = Math.min(3, Math.ceil(sortedViews.length * 0.3))
      }

      viewsToCleanup.push(...sortedViews.slice(0, cleanupCount).map(item => item.viewId))
      log.info(`内存压力清理: 计划清理 ${cleanupCount} 个视图`)
    }

    // 检查空闲时间超限的视图
    for (const item of sortedViews) {
      if (item.idleTime > item.maxIdleTime && !viewsToCleanup.includes(item.viewId)) {
        viewsToCleanup.push(item.viewId)
        log.info(`空闲时间清理: ${item.viewId} (${Math.round(item.idleTime / 1000)}s > ${Math.round(item.maxIdleTime / 1000)}s)`)
      }
    }

    // 限制单次清理数量，避免一次性清理太多影响用户体验
    const maxCleanupPerCycle = Math.max(1, Math.ceil(pausedViews.length * 0.6))
    if (viewsToCleanup.length > maxCleanupPerCycle) {
      const originalCount = viewsToCleanup.length
      viewsToCleanup.splice(maxCleanupPerCycle)
      log.info(`限制单次清理数量: ${originalCount} -> ${viewsToCleanup.length}`)
    }

    return viewsToCleanup
  }

  /**
   * 获取总内存使用量
   * @returns 内存使用量（MB）
   */
  private getTotalMemoryUsage(): number {
    return Array.from(this.viewStates.values())
      .reduce((total, state) => total + state.memoryUsage, 0)
  }

  /**
   * 更新视图内存使用量
   * @param viewId 视图ID
   * @param memoryUsage 内存使用量（MB）
   */
  public updateViewMemoryUsage(viewId: string, memoryUsage: number): void {
    const lifecycleState = this.viewStates.get(viewId)
    if (lifecycleState) {
      lifecycleState.memoryUsage = memoryUsage
      this.updatePerformanceMetrics()
    }
  }

  /**
   * 获取性能指标
   * @returns 性能指标
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics }
  }

  /**
   * 更新性能指标
   */
  updatePerformanceMetrics(): void {
    const startTime = performance.now()

    try {
      const memoryUsage = this.getTotalMemoryUsage()
      const activeViewCount = this.getActiveViews().length
      const totalViewCount = this.viewStates.size

      this.performanceMetrics = {
        switchTime: this.performanceMetrics.switchTime, // 保持之前的值
        memoryUsage,
        activeViewCount,
        cpuUsage: this.performanceMetrics.cpuUsage, // 保持之前的值
        lastUpdated: Date.now()
      }

      const updateTime = performance.now() - startTime
      if (updateTime > 10) { // 如果更新时间超过10ms，记录警告
        log.warn(`性能指标更新耗时较长: ${updateTime.toFixed(2)}ms, 视图数量: ${totalViewCount}`)
      }

      // 触发性能指标更新事件 - 移除自定义事件，统一使用 ProcessEvent
      // 性能指标更新通过其他方式处理
    } catch (error) {
      log.error('更新性能指标失败:', error)
    }
  }

  /**
   * 初始化自动清理
   */
  private initializeAutoCleanup(): void {
    if (!this.config.enableAutoCleanup) {
      return
    }

    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupBackgroundViews()
      } catch (error) {
        log.error('自动清理失败:', error)
      }
    }, this.config.autoRecycleInterval)

    log.info(`自动清理已启用，间隔: ${this.config.autoRecycleInterval / 1000}秒`)
  }

  /**
   * 停止自动清理
   */
  public stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
      log.info('自动清理已停止')
    }
  }

  /**
   * 重新启动自动清理
   */
  public restartAutoCleanup(): void {
    this.stopAutoCleanup()
    this.initializeAutoCleanup()
  }

  /**
   * 更新配置
   * @param newConfig 新配置
   */
  public updateConfig(newConfig: Partial<LifecycleManagerConfig>): void {
    this.config = { ...this.config, ...newConfig }

    if (newConfig.autoRecycleInterval || newConfig.enableAutoCleanup !== undefined) {
      this.restartAutoCleanup()
    }

    log.info('生命周期管理器配置已更新')
  }

  /**
   * 获取当前配置
   * @returns 当前配置
   */
  public getConfig(): LifecycleManagerConfig {
    return { ...this.config }
  }


  /**
   * 销毁生命周期管理器
   */
  public destroy(): void {
    log.info('销毁生命周期管理器')

    this.stopAutoCleanup()
    this.viewStates.clear()

    // 重置单例
    LifecycleManager.instance = null as any
  }

  /**
   * 获取统计信息
   * @returns 统计信息
   */
  public getStatistics(): {
    totalViews: number
    activeViews: number
    pausedViews: number
    totalMemoryUsage: number
    averageMemoryPerView: number
  } {
    const totalViews = this.viewStates.size
    const activeViews = this.getActiveViews().length
    const pausedViews = this.getPausedViews().length
    const totalMemoryUsage = this.getTotalMemoryUsage()

    return {
      totalViews,
      activeViews,
      pausedViews,
      totalMemoryUsage,
      averageMemoryPerView: totalViews > 0 ? totalMemoryUsage / totalViews : 0
    }
  }
}
