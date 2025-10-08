/**
 * DetachManager - 视图分离管理器
 * 负责处理 WebContentsView 从主窗口分离到独立窗口的逻辑
 * 包括 Alt+D 快捷键处理、分离窗口创建和管理
 */

import { BaseWindow, WebContentsView, screen, globalShortcut } from 'electron'
import { resolve } from 'path'
import log from 'electron-log'
import type {
  WebContentsViewInfo,
  WindowOperationResult,
  ViewOperationResult,
  WebContentsViewConfig
} from '../typings/windowTypes'
import { ViewCategory } from '../typings/windowTypes'
import type {
  DetachedWindowConfig,
  Rectangle,
  DetachedWindowControlEvent
} from '@renderer/src/typings/windowTypes'
import {
  DetachedWindowAction
} from '@renderer/src/typings/windowTypes'
import { BaseWindowController } from './BaseWindowController'
import { getDirname } from '@main/utils'
import { emitEvent } from '@main/core/ProcessEvent'
import { DEFAULT_WINDOW_LAYOUT, calculateDetachedControlBarBounds, calculateDetachedContentBounds } from '@shared/config/windowLayoutConfig'
import { isProduction } from '@shared/utils'
import type { ViewManager } from './ViewManager'

/**
 * 分离窗口信息
 */
export interface DetachedWindowInfo {
  /** 窗口ID */
  windowId: number
  /** BaseWindow 实例 */
  window: BaseWindow
  /** 关联的原始 WebContentsView（被分离的视图） */
  view: WebContentsView
  /** 控制栏 WebContentsView */
  controlBarView?: WebContentsView
  /** 源视图ID */
  sourceViewId: string
  /** 源窗口ID */
  sourceWindowId: number
  /** 分离配置 */
  config: DetachedWindowConfig
  /** 分离时间 */
  detachedAt: Date
  /** 是否有控制栏 */
  hasControlBar: boolean
  /** 插件信息 */
  pluginInfo?: {
    fullPath: string  // 格式: "pluginId:path"
    name: string
  }
}

/**
 * 分离结果
 */
export interface DetachResult {
  /** 是否成功 */
  success: boolean
  /** 错误消息 */
  error?: string
  /** 分离的窗口信息 */
  detachedWindow?: DetachedWindowInfo
  /** 原始视图ID */
  sourceViewId: string
}

/**
 * DetachManager 配置
 */
export interface DetachManagerConfig {
  /** 默认分离窗口大小 */
  defaultWindowSize: { width: number; height: number }
  /** 分离窗口偏移量 */
  windowOffset: { x: number; y: number }
  /** 是否启用全局快捷键 */
  enableGlobalShortcuts: boolean
  /** 是否自动显示控制栏 */
  autoShowControlBar: boolean
  /** 分离窗口的最小尺寸 */
  minWindowSize: { width: number; height: number }
  /** 是否启用窗口阴影 */
  enableWindowShadow: boolean
}

/**
 * DetachManager 类
 * 管理视图分离和独立窗口
 */
export class DetachManager {
  private static instance: DetachManager
  private config: DetachManagerConfig
  private detachedWindows: Map<number, DetachedWindowInfo> = new Map()
  private sourceViewMapping: Map<string, number> = new Map() // 源视图ID -> 分离窗口ID
  private baseWindowController: BaseWindowController
  private viewManager?: ViewManager // 避免循环依赖，延迟设置

  private constructor(config?: Partial<DetachManagerConfig>) {
    this.config = {
      defaultWindowSize: { width: 800, height: 600 },
      windowOffset: { x: 50, y: 50 },
      enableGlobalShortcuts: true,
      autoShowControlBar: true,
      minWindowSize: { width: 400, height: 300 },
      enableWindowShadow: true,
      ...config
    }

    this.baseWindowController = BaseWindowController.getInstance()
    this.initializeGlobalShortcuts()
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: Partial<DetachManagerConfig>): DetachManager {
    if (!DetachManager.instance) {
      DetachManager.instance = new DetachManager(config)
    }
    return DetachManager.instance
  }

  /**
   * 设置 ViewManager 实例（避免循环依赖）
   * @param viewManager ViewManager 实例
   */
  public setViewManager(viewManager: any): void {
    this.viewManager = viewManager
  }

  /**
   * 分离视图到独立窗口
   * @param sourceView 源 WebContentsView 信息
   * @param parentWindowId 父窗口ID
   * @param config 分离配置（可选）
   * @returns 分离结果
   */
  public async detachView(
    sourceView: WebContentsViewInfo,
    parentWindowId: number,
    config?: Partial<DetachedWindowConfig>
  ): Promise<DetachResult> {
    const startTime = performance.now()

    try {
      log.info(`开始分离视图: ${sourceView.id} 从窗口 ${parentWindowId}`)

      // 参数验证
      if (!sourceView?.id || !sourceView.view) {
        throw new Error('无效的源视图信息')
      }

      if (parentWindowId <= 0) {
        throw new Error('无效的父窗口ID')
      }

      // 检查视图是否已经分离
      if (this.sourceViewMapping.has(sourceView.id)) {
        const existingWindowId = this.sourceViewMapping.get(sourceView.id)!
        const existingWindow = this.detachedWindows.get(existingWindowId)

        if (existingWindow && !existingWindow.window.isDestroyed()) {
          log.warn(`视图已分离: ${sourceView.id}，聚焦到现有窗口`)
          existingWindow.window.focus()
          return {
            success: true,
            sourceViewId: sourceView.id,
            detachedWindow: existingWindow
          }
        } else {
          // 清理无效的映射
          log.warn(`清理无效的分离窗口映射: ${sourceView.id}`)
          this.sourceViewMapping.delete(sourceView.id)
          if (existingWindow) {
            this.detachedWindows.delete(existingWindowId)
          }
        }
      }

      // 准备分离配置
      const detachConfig = this.prepareDetachConfig(sourceView, config)

      // 创建分离窗口
      const windowResult = this.baseWindowController.createDetachedWindow(detachConfig)
      if (!windowResult.success || !windowResult.data?.window) {
        throw new Error(windowResult.error || '分离窗口创建失败')
      }

      const detachedWindow = windowResult.data.window as BaseWindow

      // --- Views Setup ---
      const controlBarView = await this.createControlBarView(detachConfig, detachedWindow.id)
      const originalView = sourceView.view

      // --- Pre-flight Checks ---
      if (!controlBarView) {
        this.cleanupOnFailure(detachedWindow)
        throw new Error('控制栏视图创建失败')
      }
      if (this.isInvalid(originalView)) {
        this.cleanupOnFailure(detachedWindow, controlBarView)
        throw new Error('源视图已被销毁或无效')
      }
      const sourceWindow = this.getSourceWindow(sourceView.parentWindowId)
      if (this.isInvalid(sourceWindow)) {
        this.cleanupOnFailure(detachedWindow, controlBarView)
        throw new Error('源窗口已被销毁或无效')
      }

      // --- Core Operation: Reparenting ---
      try {
        const sourceContentView = sourceWindow?.contentView
        if (!sourceContentView) {
          throw new Error('源窗口的内容视图无效')
        }

        // Remove from source window first
        sourceContentView.removeChildView(originalView)

        // Ensure the detached window is still valid, then add views in the correct order
        if (detachedWindow.isDestroyed()) {
          throw new Error('分离窗口在添加视图前被销毁')
        }

        // 重要：视图添加顺序（后添加的在上层）
        // 1. 先添加 controlBarView（控制栏UI）- 在底层，提供边框、圆角、阴影和控制栏
        // 2. 再添加 originalView（插件内容）- 在上层，显示在内容区域
        detachedWindow.contentView.addChildView(controlBarView)
        detachedWindow.contentView.addChildView(originalView)
        log.info(`已将视图 ${sourceView.id} 从窗口 ${sourceView.parentWindowId} 移动到分离窗口 ${detachedWindow.id}`)
      } catch (error) {
        log.error('将视图添加到分离窗口失败:', error)
        this.cleanupOnFailure(detachedWindow, controlBarView)

        // Attempt to recover by re-attaching the view to its original window
        if (!this.isInvalid(sourceWindow) && !this.isInvalid(originalView)) {
          try {
            sourceWindow?.contentView?.addChildView(originalView)
          } catch (reattachError) {
            log.error('恢复原始视图到源窗口失败:', reattachError)
          }
        }
        throw error
      }

      // --- Layout and Initialization ---
      this.layoutViews(detachedWindow, originalView, controlBarView)
      const controlBarInitialized = await this.initializeControlBar(controlBarView, sourceView, detachedWindow.id)

      if (!controlBarInitialized) {
        log.warn('控制栏初始化失败，直接加载原始视图内容')
        try {
          const url = originalView.webContents.getURL()
          if (url) {
            await controlBarView.webContents.loadURL(url)
          } else if (sourceView.config.url) {
            await controlBarView.webContents.loadURL(sourceView.config.url)
          }
        } catch (fallbackError) {
          log.error('回退加载原始视图内容失败:', fallbackError)
        }
      }

      // --- State Management ---
      const detachedWindowInfo: DetachedWindowInfo = {
        windowId: detachedWindow.id,
        window: detachedWindow,
        view: originalView, // 使用原始视图，不是新创建的
        sourceViewId: sourceView.id,
        sourceWindowId: parentWindowId,
        config: detachConfig,
        detachedAt: new Date(),
        hasControlBar: detachConfig.showControlBar,
        pluginInfo: this.extractPluginInfo(sourceView),
        controlBarView // 添加控制栏视图引用
      }

      // 设置分离窗口事件
      this.setupDetachedWindowEvents(detachedWindowInfo)

      // 保存分离窗口信息
      this.detachedWindows.set(detachedWindow.id, detachedWindowInfo)
      this.sourceViewMapping.set(sourceView.id, detachedWindow.id)

      // 更新 ViewManager 中视图的父窗口ID
      if (this.viewManager && typeof this.viewManager.updateViewParentWindow === 'function') {
        const updateResult = this.viewManager.updateViewParentWindow(sourceView.id, detachedWindow.id)
        if (updateResult.success) {
          log.info(`已更新视图 ${sourceView.id} 的父窗口ID: ${parentWindowId} -> ${detachedWindow.id}`)
        } else {
          log.warn(`更新视图父窗口ID失败: ${sourceView.id}, 错误: ${updateResult.error}`)
        }
      } else {
        log.warn('ViewManager 未设置或不支持 updateViewParentWindow 方法')
      }

      // 显示分离窗口
      detachedWindow.show()

      // 触发分离事件
      const detachData = {
        viewId: sourceView.id,
        windowId: parentWindowId,
        detachedWindowId: detachedWindow.id,
        timestamp: Date.now()
      }
      emitEvent.emit('view:detached', detachData)

      const detachTime = performance.now() - startTime
      log.info(`视图分离成功: ${sourceView.id} -> 窗口 ${detachedWindow.id}, 耗时: ${detachTime.toFixed(2)}ms`)

      // 触发性能事件 - 移除重复的性能事件，统一使用 ProcessEvent
      // 性能监控通过其他方式处理

      return {
        success: true,
        sourceViewId: sourceView.id,
        detachedWindow: detachedWindowInfo
      }
    } catch (error) {
      const detachTime = performance.now() - startTime
      log.error(`分离视图失败: ${sourceView.id}, 耗时: ${detachTime.toFixed(2)}ms`, error)

      // 触发错误事件 - 移除重复的性能事件，统一使用 ProcessEvent
      // 错误已通过日志记录

      return {
        success: false,
        sourceViewId: sourceView.id,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 重新附加视图到主窗口
   * @param detachedWindowId 分离窗口ID
   * @param targetWindowId 目标主窗口ID
   * @returns 操作结果
   */
  public async reattachView(
    detachedWindowId: number,
    targetWindowId: number
  ): Promise<ViewOperationResult> {
    const startTime = performance.now()

    try {
      // 参数验证
      if (detachedWindowId <= 0 || targetWindowId <= 0) {
        throw new Error('无效的窗口ID参数')
      }

      const detachedWindowInfo = this.detachedWindows.get(detachedWindowId)
      if (!detachedWindowInfo) {
        throw new Error(`分离窗口不存在: ${detachedWindowId}`)
      }

      log.info(`重新附加视图: ${detachedWindowInfo.sourceViewId} 从窗口 ${detachedWindowId} 到窗口 ${targetWindowId}`)

      // 检查分离窗口状态
      if (detachedWindowInfo.window.isDestroyed()) {
        log.warn(`分离窗口已销毁: ${detachedWindowId}，清理映射关系`)
        this.sourceViewMapping.delete(detachedWindowInfo.sourceViewId)
        this.detachedWindows.delete(detachedWindowId)
        throw new Error('分离窗口已销毁')
      }

      // 获取目标窗口
      const targetWindow = this.getSourceWindow(targetWindowId)
      if (!targetWindow || targetWindow.isDestroyed()) {
        throw new Error(`目标窗口不存在或已销毁: ${targetWindowId}`)
      }

      // 检查原始视图状态
      const originalView = detachedWindowInfo.view
      if (!originalView || originalView.webContents.isDestroyed()) {
        throw new Error('无法重新附加已销毁的视图')
      }

      // 安全地重新附加视图
      try {
        // This implicitly removes it from its previous parent (the detached window)
        targetWindow.contentView.addChildView(originalView)
        log.info(`视图已重新附加: ${detachedWindowInfo.sourceViewId}`)
      } catch (attachError) {
        log.error('重新附加视图到目标窗口失败:', attachError)
        throw new Error(`重新附加失败: ${attachError instanceof Error ? attachError.message : '未知错误'}`)
      }

      // 重新计算视图边界（根据目标窗口的布局）
      // 通过 ViewManager 更新布局
      try {
        // 触发窗口布局更新
        const bounds = targetWindow.getBounds();
        targetWindow.setBounds(bounds);
      } catch (error) {
        log.warn('更新视图布局失败:', error);
      }
      log.info(`已将视图 ${detachedWindowInfo.sourceViewId} 重新附加到窗口 ${targetWindowId}`)

      // 更新 ViewManager 中视图的父窗口ID
      if (this.viewManager && typeof this.viewManager.updateViewParentWindow === 'function') {
        const updateResult = this.viewManager.updateViewParentWindow(detachedWindowInfo.sourceViewId, targetWindowId)
        if (updateResult.success) {
          log.info(`已恢复视图 ${detachedWindowInfo.sourceViewId} 的父窗口ID: ${detachedWindowId} -> ${targetWindowId}`)
        } else {
          log.warn(`恢复视图父窗口ID失败: ${detachedWindowInfo.sourceViewId}, 错误: ${updateResult.error}`)
        }
      } else {
        log.warn('ViewManager 未设置或不支持 updateViewParentWindow 方法')
      }

      // 触发重新附加请求事件，通知 ProcessEventCoordinator 更新窗口-视图映射
      emitEvent.emit('view:reattach-requested', {
        viewId: detachedWindowInfo.sourceViewId,
        targetWindowId,
        detachedWindowId,
        timestamp: Date.now(),
        pluginInfo: detachedWindowInfo.pluginInfo
      })

      // 关闭分离窗口
      await this.closeDetachedWindow(detachedWindowId)

      const reattachTime = performance.now() - startTime
      log.info(`视图重新附加完成: ${detachedWindowInfo.sourceViewId}, 耗时: ${reattachTime.toFixed(2)}ms`)

      // 触发性能事件 - 移除重复的性能事件，统一使用 ProcessEvent
      // 性能监控通过其他方式处理

      emitEvent.emit('view:reattached', {
        viewId: detachedWindowInfo.sourceViewId,
        fromWindowId: detachedWindowId,
        toWindowId: targetWindowId,
        timestamp: Date.now(),
        pluginInfo: detachedWindowInfo.pluginInfo
      })

      return {
        success: true,
        viewId: detachedWindowInfo.sourceViewId,
        data: {
          reattachedTo: targetWindowId,
          view: originalView,
          pluginInfo: detachedWindowInfo.pluginInfo
        }
      }
    } catch (error) {
      const reattachTime = performance.now() - startTime
      log.error(`重新附加视图失败: 窗口ID ${detachedWindowId}, 耗时: ${reattachTime.toFixed(2)}ms`, error)

      // 触发错误事件 - 移除重复的性能事件，统一使用 ProcessEvent
      // 错误已通过日志记录

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 关闭分离窗口
   * @param windowId 分离窗口ID
   * @returns 操作结果
   */
  public async closeDetachedWindow(windowId: number): Promise<WindowOperationResult> {
    try {
      const detachedWindowInfo = this.detachedWindows.get(windowId)
      if (!detachedWindowInfo) {
        return {
          success: true,
          windowId,
          data: { message: '分离窗口不存在，可能已关闭' }
        }
      }

      log.info(`关闭分离窗口: ${windowId}`)

      // 关闭窗口（会触发 window.on('closed') 事件，由 handleWindowClosed 处理清理和事件触发）
      const windowToClose = detachedWindowInfo.window
      if (windowToClose && !windowToClose.isDestroyed()) {
        // 不移除监听器，让 'closed' 事件正常触发 handleWindowClosed
        windowToClose.close()
      } else {
        // 如果窗口已销毁，直接清理映射关系并触发事件
        this.sourceViewMapping.delete(detachedWindowInfo.sourceViewId)
        this.detachedWindows.delete(windowId)

        // 触发关闭事件
        const closeData = {
          viewId: detachedWindowInfo.sourceViewId,
          detachedWindowId: windowId,
          timestamp: Date.now()
        }
        emitEvent.emit('view:detached-window-closed', closeData)
      }

      log.info(`分离窗口关闭完成: ${windowId}`)

      return {
        success: true,
        windowId,
        data: { closed: true }
      }
    } catch (error) {
      log.error(`关闭分离窗口失败: ${windowId}`, error)
      return {
        success: false,
        windowId,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 获取分离窗口信息
   * @param windowId 窗口ID
   * @returns 分离窗口信息或 undefined
   */
  public getDetachedWindowInfo(windowId: number): DetachedWindowInfo | undefined {
    return this.detachedWindows.get(windowId)
  }

  /**
   * 获取所有分离窗口
   * @returns 分离窗口信息数组
   */
  public getAllDetachedWindows(): DetachedWindowInfo[] {
    return Array.from(this.detachedWindows.values())
  }

  /**
   * 检查视图是否已分离
   * @param viewId 视图ID
   * @returns 是否已分离
   */
  public isViewDetached(viewId: string): boolean {
    return this.sourceViewMapping.has(viewId)
  }

  /**
   * 获取视图的分离窗口ID
   * @param viewId 视图ID
   * @returns 分离窗口ID或 undefined
   */
  public getDetachedWindowId(viewId: string): number | undefined {
    return this.sourceViewMapping.get(viewId)
  }

  /**
   * 准备分离配置
   * @param sourceView 源视图信息
   * @param userConfig 用户配置
   * @returns 分离配置
   */
  private prepareDetachConfig(
    sourceView: WebContentsViewInfo,
    userConfig?: Partial<DetachedWindowConfig>
  ): DetachedWindowConfig {
    // 获取当前鼠标所在屏幕
    const mousePosition = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(mousePosition)
    const workArea = display.workArea

    // 计算窗口尺寸
    const windowWidth = Math.max(
      sourceView.config.bounds.width,
      this.config.defaultWindowSize.width
    )
    const windowHeight = Math.max(
      sourceView.config.bounds.height,
      this.config.defaultWindowSize.height
    )

    // 居中计算窗口位置
    const defaultBounds: Rectangle = {
      x: workArea.x + Math.floor((workArea.width - windowWidth) / 2),
      y: workArea.y + Math.floor((workArea.height - windowHeight) / 2),
      width: windowWidth,
      height: windowHeight
    }

    // 确保窗口完全在屏幕范围内
    if (defaultBounds.x < workArea.x) {
      defaultBounds.x = workArea.x
    }
    if (defaultBounds.y < workArea.y) {
      defaultBounds.y = workArea.y
    }
    if (defaultBounds.x + defaultBounds.width > workArea.x + workArea.width) {
      defaultBounds.x = workArea.x + workArea.width - defaultBounds.width
    }
    if (defaultBounds.y + defaultBounds.height > workArea.y + workArea.height) {
      defaultBounds.y = workArea.y + workArea.height - defaultBounds.height
    }

    const pluginInfo = this.extractPluginInfo(sourceView)
    const title = pluginInfo?.name || sourceView.config.type || '分离窗口'

    return {
      title,
      bounds: defaultBounds,
      sourceViewId: sourceView.id,
      showControlBar: this.config.autoShowControlBar,
      parentWindowId: sourceView.parentWindowId,
      metadata: {
        fullPath: pluginInfo?.fullPath,
        name: pluginInfo?.name,
        originalConfig: sourceView.config,
        detachedAt: Date.now()
      },
      ...userConfig
    }
  }

  /**
   * 创建控制栏视图并注册到 ViewManager
   * @param config 分离配置
   * @param detachedWindowId 分离窗口ID
   * @returns 控制栏 WebContentsView
   */
  private async createControlBarView(config: DetachedWindowConfig, detachedWindowId: number): Promise<WebContentsView | null> {
    try {
      // 构建preload文件路径
      let preloadPath: string
      try {
        preloadPath = resolve(getDirname(import.meta.url), './preloads/winControl.js')
      } catch {
        // 如果找不到，使用基础preload
        preloadPath = resolve(getDirname(import.meta.url), './preloads/basic.js')
      }

      // 生成控制栏视图的唯一ID
      const controlBarViewId = `detached-control-${detachedWindowId}`

      // 创建控制栏视图配置
      const controlBarConfig: WebContentsViewConfig = {
        id: controlBarViewId,
        type: 'detached-control' as any, // 临时使用，需要在 ViewType 中添加
        category: ViewCategory.DETACHED_WINDOW,
        bounds: { x: 0, y: 0, width: config.bounds.width, height: 40 },
        lifecycle: {
          type: 'foreground' as any,
          persistOnClose: false,
          maxIdleTime: 0,
          memoryThreshold: 0
        },
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: true,
          webSecurity: true,
          preload: preloadPath
        }
      }

      const controlBarView = new WebContentsView({
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: true,
          webSecurity: true,
          preload: preloadPath,
          transparent: true,
          backgroundThrottling: false
        }
      })

      if (!isProduction()) {
        controlBarView.webContents.openDevTools()
      }

      // 如果 ViewManager 可用，注册控制栏视图
      if (this.viewManager && typeof this.viewManager.registerDetachedControlBar === 'function') {
        try {
          await this.viewManager.registerDetachedControlBar(detachedWindowId, controlBarViewId, controlBarView, controlBarConfig)
          log.info(`控制栏视图已注册到 ViewManager: ${controlBarViewId}`)
        } catch (error) {
          log.warn('注册控制栏视图到 ViewManager 失败:', error)
        }
      } else {
        log.warn('ViewManager 不支持 registerDetachedControlBar 方法，控制栏视图未注册')
      }

      return controlBarView
    } catch (error) {
      log.error('创建控制栏视图失败:', error)
      return null
    }
  }

  /**
   * 获取源窗口实例
   * @param windowId 窗口ID
   * @returns BaseWindow 实例
   */
  private getSourceWindow(windowId: number): BaseWindow | undefined {
    return this.baseWindowController.getWindow(windowId)
  }

  /**
   * 初始化控制栏
   * @param controlBarView 控制栏视图
   * @param sourceView 源视图信息
   * @param detachedWindowId 分离窗口ID
   */
  private async initializeControlBar(
    controlBarView: WebContentsView,
    sourceView: WebContentsViewInfo,
    detachedWindowId: number
  ): Promise<boolean> {
    const initStartTime = performance.now()

    try {
      // 检查控制栏视图状态
      if (!controlBarView || controlBarView.webContents.isDestroyed()) {
        throw new Error('控制栏视图已被销毁')
      }

      // 设置加载超时
      const loadTimeout = 10000 // 10秒超时
      let loadPromise: Promise<void>

      // 提取插件信息，用于后续IPC发送
      const pluginInfo = this.extractPluginInfo(sourceView)
      const pluginName = pluginInfo?.name || sourceView.config.type || '分离窗口'

      log.debug(`初始化控制栏，插件信息:`, {
        pluginInfo,
        pluginName,
        viewId: sourceView.id,
        configType: sourceView.config.type,
        metadata: sourceView.config.pluginMetadata
      })

      // 加载控制栏页面（不带URL参数）
      if (process.env.NODE_ENV === 'development') {
        const controlBarURL = `http://localhost:5173/src/pages/detached-window/index.html`
        log.debug(`加载开发环境控制栏页面: ${controlBarURL}`)
        loadPromise = controlBarView.webContents.loadURL(controlBarURL)
      } else {
        const controlBarPath = resolve(
          getDirname(import.meta.url),
          '../renderer/pages/detached-window/index.html'
        )
        log.debug(`加载生产环境控制栏页面: ${controlBarPath}`)
        loadPromise = controlBarView.webContents.loadFile(controlBarPath)
      }

      // 添加超时处理
      await Promise.race([
        loadPromise,
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('控制栏页面加载超时')), loadTimeout)
        })
      ])

      // 等待页面加载完成后发送初始化数据
      const initializeData = () => {
        // 严格检查状态（避免访问已销毁或undefined的对象）
        if (!controlBarView || !controlBarView.webContents || controlBarView.webContents.isDestroyed()) {
          log.warn('控制栏webContents已销毁或无效，跳过初始化数据发送')
          return
        }

        // 通过 IPC 发送初始化数据
        const initData = {
          windowId: detachedWindowId,
          viewId: sourceView.id,
          pluginId: pluginInfo?.fullPath?.split(':')[0] || '',
          pluginName: pluginName,
          pluginVersion: sourceView.config.pluginMetadata?.version || '',
          timestamp: Date.now()
        }

        controlBarView.webContents.send('detached-window-init', initData)

        log.info('控制栏初始化数据已通过 IPC 发送', initData)
      }

      controlBarView.webContents.on('did-finish-load', initializeData)

      // 等待页面加载完成后发送初始化数据
      if (!controlBarView.webContents.isLoading()) {
        // 页面已加载，立即发送数据
        setTimeout(initializeData, 100)
      } else {
        // 页面正在加载，等待完成
        // setTimeout(initializeData, 100)
      }

      const initTime = performance.now() - initStartTime
      log.info(`控制栏初始化完成, 耗时: ${initTime.toFixed(2)}ms`)

      // 触发初始化完成事件 - 移除重复的性能事件，统一使用 ProcessEvent
      // 控制栏初始化通过其他方式记录

      return true
    } catch (error) {
      const initTime = performance.now() - initStartTime
      log.error(`初始化控制栏失败, 耗时: ${initTime.toFixed(2)}ms:`, error)

      // 触发初始化失败事件 - 移除重复的性能事件，统一使用 ProcessEvent
      // 错误已通过日志记录

      return false
    }
  }


  /**
   * 计算视图边界（考虑控制栏）
   * @param config 分离配置
   * @returns 视图边界
   */
  private calculateViewBounds(config: DetachedWindowConfig): Rectangle {
    const controlBarHeight = config.showControlBar ? 30 : 0

    return {
      x: 0,
      y: controlBarHeight,
      width: config.bounds.width,
      height: config.bounds.height - controlBarHeight
    }
  }

  /**
   * 提取插件信息
   * @param viewInfo 视图信息
   * @returns 插件信息
   */
  private extractPluginInfo(viewInfo: WebContentsViewInfo): DetachedWindowInfo['pluginInfo'] | undefined {
    const metadata = viewInfo.config.pluginMetadata
    if (metadata?.fullPath) {
      return {
        fullPath: metadata.fullPath,
        name: metadata.name || '',
      }
    }
    return undefined
  }

  /**
   * 设置分离窗口事件
   * @param detachedWindowInfo 分离窗口信息
   */
  private setupDetachedWindowEvents(detachedWindowInfo: DetachedWindowInfo): void {
    const { window, view, windowId, controlBarView } = detachedWindowInfo
    const controlBarHeight = 40 // 与 layoutViews 中的高度保持一致

    // 窗口关闭事件
    window.on('closed', () => {
      this.handleWindowClosed(windowId)
    })

    // 窗口聚焦事件
    window.on('focus', () => {
      emitEvent.emit('detached-window:focused', {
        windowId,
        timestamp: Date.now()
      })
    })

    // 窗口失焦事件
    window.on('blur', () => {
      emitEvent.emit('detached-window:blurred', {
        windowId,
        timestamp: Date.now()
      })
    })

    // 窗口大小调整事件 - 实时更新视图边界
    const updateLayout = () => {
      // 严格检查所有对象是否有效（避免访问已销毁或undefined的对象）
      if (!window || !view || !controlBarView) {
        return
      }

      if (!this.isInvalid(window) && !this.isInvalid(view) && !this.isInvalid(controlBarView)) {
        try {
          this.updateViewBounds(window, view, controlBarView)
          log.debug(`分离窗口大小调整，视图边界已更新: 窗口ID=${windowId}`)
        } catch (error) {
          log.error(`更新分离窗口视图边界失败: 窗口ID=${windowId}`, error)
        }
      }
    }

    // 直接监听 resize 事件（实时调整过程中）
    window.on('resize', updateLayout)
    // 也监听 resized 事件作为后备（调整结束后）
    window.on('resized', updateLayout)

    // 视图快捷键事件
    view.webContents.on('before-input-event', (event, input) => {
      this.handleViewShortcuts(event, input, detachedWindowInfo)
    })

    // 视图页面加载完成
    view.webContents.on('did-finish-load', () => {
      log.info(`分离视图加载完成: ${detachedWindowInfo.sourceViewId}`)
    })

    log.debug(`分离窗口事件监听器已设置: 窗口ID=${windowId}`)
  }

  /**
   * 处理窗口关闭
   * @param windowId 窗口ID
   */
  private handleWindowClosed(windowId: number): void {
    const detachedWindowInfo = this.detachedWindows.get(windowId)
    if (detachedWindowInfo) {
      log.info(`分离窗口已关闭: ${windowId}`)

      const { window, view: originalView, controlBarView } = detachedWindowInfo

      // 1. 先从窗口中移除所有视图（避免访问已销毁的视图）
      if (window && !window.isDestroyed()) {
        try {
          const contentView = window.contentView
          if (contentView) {
            // 移除控制栏视图
            if (controlBarView && !controlBarView.webContents.isDestroyed()) {
              contentView.removeChildView(controlBarView)
              log.debug(`已从窗口移除控制栏视图`)
            }
            // 移除原始插件视图
            if (originalView && !originalView.webContents.isDestroyed()) {
              contentView.removeChildView(originalView)
              log.debug(`已从窗口移除插件视图: ${detachedWindowInfo.sourceViewId}`)
            }
          }
        } catch (error) {
          log.warn('从窗口移除视图时出错:', error)
        }
      }

      // 2. 清理窗口事件监听器
      if (window && !window.isDestroyed()) {
        try {
          window.removeAllListeners('resize')
          window.removeAllListeners('resized')
          window.removeAllListeners('focus')
          window.removeAllListeners('blur')
          log.debug(`已清理窗口事件监听器: ${windowId}`)
        } catch (error) {
          log.warn('清理窗口事件监听器时出错:', error)
        }
      }

      // 3. 清理视图事件监听器
      if (originalView && !originalView.webContents.isDestroyed()) {
        try {
          originalView.webContents.removeAllListeners('before-input-event')
          originalView.webContents.removeAllListeners('did-finish-load')
          log.debug(`已清理视图事件监听器`)
        } catch (error) {
          log.warn('清理视图事件监听器时出错:', error)
        }
      }

      // 4. 销毁原始插件视图（通过 ViewManager）
      if (originalView && !originalView.webContents.isDestroyed()) {
        try {
          log.info(`销毁分离窗口的插件视图: ${detachedWindowInfo.sourceViewId}`)

          // 通过 ViewManager 移除视图（会自动清理 webContents）
          if (this.viewManager && typeof this.viewManager.removeView === 'function') {
            const removeResult = this.viewManager.removeView(detachedWindowInfo.sourceViewId)
            if (removeResult.success) {
              log.info(`插件视图已成功销毁: ${detachedWindowInfo.sourceViewId}`)
            } else {
              log.warn(`插件视图销毁失败: ${removeResult.error}`)
            }
          } else {
            // 如果 ViewManager 不可用，直接关闭 webContents
            log.warn('ViewManager 不可用，直接关闭 webContents')
            originalView.webContents.close()
          }
        } catch (error) {
          log.error(`销毁插件视图时出错: ${detachedWindowInfo.sourceViewId}`, error)
        }
      }

      // 5. 销毁控制栏视图
      if (controlBarView && !controlBarView.webContents.isDestroyed()) {
        try {
          log.debug(`销毁控制栏视图: detached-control-${windowId}`)
          controlBarView.webContents.close()
        } catch (error) {
          log.error('销毁控制栏视图时出错:', error)
        }
      }

      // 6. 清理映射关系
      this.sourceViewMapping.delete(detachedWindowInfo.sourceViewId)
      this.detachedWindows.delete(windowId)

      // 7. 触发关闭事件  
      const closeData = {
        viewId: detachedWindowInfo.sourceViewId,
        detachedWindowId: windowId,
        timestamp: Date.now()
      }
      emitEvent.emit('view:detached-window-closed', closeData)

      log.info(`分离窗口清理完成: ${windowId}`)
    }
  }

  /**
   * 处理视图快捷键
   * @param event 事件对象
   * @param input 输入信息
   * @param detachedWindowInfo 分离窗口信息
   */
  private handleViewShortcuts(
    event: Electron.Event,
    input: Electron.Input,
    detachedWindowInfo: DetachedWindowInfo
  ): void {
    // ESC 关闭窗口
    if (input.key === 'Escape' && input.type === 'keyDown') {
      detachedWindowInfo.window.close()
      event.preventDefault()
      return
    }

    // Alt+R 重新附加
    if (input.key === 'r' && input.alt && input.type === 'keyDown') {
      // 直接调用 reattachView 方法，将视图重新附加回原窗口
      this.reattachView(
        detachedWindowInfo.windowId,
        detachedWindowInfo.sourceWindowId
      ).then(result => {
        if (result.success) {
          log.info(`快捷键重新附加成功: ${detachedWindowInfo.sourceViewId}`)
        } else {
          log.error(`快捷键重新附加失败: ${result.error}`)
        }
      }).catch(error => {
        log.error('快捷键重新附加异常:', error)
      })
      event.preventDefault()
      return
    }
  }

  /**
   * 初始化全局快捷键
   */
  private initializeGlobalShortcuts(): void {
    if (!this.config.enableGlobalShortcuts) {
      return
    }

    try {
      // 注册 Alt+D 全局快捷键（如果需要）
      // 注意：通常 Alt+D 在窗口内处理，这里预留全局快捷键功能

      log.info('全局快捷键初始化完成')
    } catch (error) {
      log.error('初始化全局快捷键失败:', error)
    }
  }

  /**
   * 更新配置
   * @param newConfig 新配置
   */
  public updateConfig(newConfig: Partial<DetachManagerConfig>): void {
    this.config = { ...this.config, ...newConfig }
    log.info('DetachManager 配置已更新')
  }

  /**
   * 获取当前配置
   * @returns 当前配置
   */
  public getConfig(): DetachManagerConfig {
    return { ...this.config }
  }

  /**
   * 获取统计信息
   * @returns 统计信息
   */
  public getStatistics(): {
    totalDetachedWindows: number
    detachedViews: string[]
    averageDetachTime: number
  } {
    const detachedViews = Array.from(this.sourceViewMapping.keys())

    return {
      totalDetachedWindows: this.detachedWindows.size,
      detachedViews,
      averageDetachTime: 0 // 可以实现平均分离时间统计
    }
  }


  /**
   * 销毁管理器
   */
  public destroy(): void {
    log.info('销毁 DetachManager')

    // 关闭所有分离窗口
    const windowIds = Array.from(this.detachedWindows.keys())
    windowIds.forEach(windowId => {
      this.closeDetachedWindow(windowId)
    })

    // 注销全局快捷键
    globalShortcut.unregisterAll()

    // 清理数据
    this.detachedWindows.clear()
    this.sourceViewMapping.clear()

    // 重置单例
    DetachManager.instance = null as any
  }

  /**
   * 清理失败时的资源
   * @param detachedWindow 分离窗口实例
   * @param controlBarView 控制栏视图实例（可选）
   */
  private cleanupOnFailure(detachedWindow: BaseWindow, controlBarView?: WebContentsView): void {
    log.warn('分离视图失败，清理资源')
    if (detachedWindow && !detachedWindow.isDestroyed()) {
      detachedWindow.removeAllListeners()
      detachedWindow.close()
    }
    if (controlBarView && controlBarView.webContents && !controlBarView.webContents.isDestroyed()) {
      controlBarView.webContents.close()
    }
  }

  /**
   * 检查对象是否无效（已销毁或为 null/undefined）
   * @param obj 对象
   * @returns 是否无效
   */
  private isInvalid(obj: any): boolean {
    if (obj === null || obj === undefined) {
      return true
    }

    if (typeof obj.isDestroyed === 'function') {
      return obj.isDestroyed()
    }

    // 对于 WebContentsView 等对象，检查其 webContents 状态
    if (obj.webContents && typeof obj.webContents.isDestroyed === 'function') {
      return obj.webContents.isDestroyed()
    }

    return false
  }

  /**
   * 布局视图（设置边界）
   * @param detachedWindow 分离窗口
   * @param originalView 原始视图
   * @param controlBarView 控制栏视图
   */
  private layoutViews(
    detachedWindow: BaseWindow,
    originalView: WebContentsView,
    controlBarView: WebContentsView
  ): void {
    if (this.isInvalid(detachedWindow) || this.isInvalid(originalView) || this.isInvalid(controlBarView)) {
      log.warn('布局视图时发现无效对象，跳过布局')
      return
    }

    try {
      // 执行初始布局
      this.updateViewBounds(detachedWindow, originalView, controlBarView)

      log.info(`分离窗口视图布局完成: 窗口ID=${detachedWindow.id}`)
    } catch (error) {
      log.error('布局分离窗口视图时发生错误:', error)
    }
  }

  /**
   * 更新视图边界
   * @param detachedWindow 分离窗口
   * @param originalView 原始视图
   * @param controlBarView 控制栏视图
   */
  private updateViewBounds(
    detachedWindow: BaseWindow,
    originalView: WebContentsView,
    controlBarView: WebContentsView
  ): void {
    if (this.isInvalid(detachedWindow) || this.isInvalid(originalView) || this.isInvalid(controlBarView)) {
      return
    }

    const windowBounds = detachedWindow.getBounds()
    const config = DEFAULT_WINDOW_LAYOUT.detachedWindow

    // 检查窗口是否最大化/全屏
    const isMaximized = detachedWindow.isMaximized()
    const isFullScreen = detachedWindow.isFullScreen?.() || false

    log.debug(`更新分离窗口视图边界, 窗口边界: ${JSON.stringify(windowBounds)}, 控制栏高度: ${config.controlBarHeight}, padding: ${config.padding}, 最大化: ${isMaximized}, 全屏: ${isFullScreen}`)

    // 使用配置文件中的计算函数获取控制栏边界
    const controlBarBounds = calculateDetachedControlBarBounds(windowBounds)
    controlBarView.setBounds(controlBarBounds)
    log.debug(`控制栏边界已更新: ${JSON.stringify(controlBarBounds)}`)

    // 使用配置文件中的计算函数获取内容视图边界，传入最大化状态
    const originalViewBounds = calculateDetachedContentBounds(windowBounds, isMaximized || isFullScreen)
    originalView.setBounds(originalViewBounds)
    log.debug(`原始视图边界已更新: ${JSON.stringify(originalViewBounds)}`)
  }
}
