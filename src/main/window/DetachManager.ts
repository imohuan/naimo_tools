/**
 * DetachManager - 视图分离管理器
 * 负责处理 WebContentsView 从主窗口分离到独立窗口的逻辑
 * 包括 Alt+D 快捷键处理、分离窗口创建和管理
 */

import { BaseWindow, WebContentsView, screen, globalShortcut } from 'electron'
import { resolve } from 'path'
import log from 'electron-log'
import type {
  BaseWindowConfig,
  WebContentsViewInfo,
  WebContentsViewConfig,
  DetachedWindowMetadata,
  WindowOperationResult,
  ViewOperationResult,
  WindowManagerEventData
} from './window-types'
import type {
  DetachedWindowConfig,
  Rectangle,
  ViewType,
  DetachedWindowControlEvent
} from '@renderer/src/typings/window-types'
import {
  DetachedWindowAction
} from '@renderer/src/typings/window-types'
import type { PluginItem } from '@renderer/src/typings/plugin-types'
import { BaseWindowController } from './BaseWindowController'
import { getDirname } from '@main/utils'

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
    pluginId: string
    name: string
    path: string
    version?: string
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
  private eventHandlers: Map<string, Function[]> = new Map()
  private viewManager?: any // 避免循环依赖，延迟设置

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
    try {
      log.info(`开始分离视图: ${sourceView.id} 从窗口 ${parentWindowId}`)

      // 检查视图是否已经分离
      if (this.sourceViewMapping.has(sourceView.id)) {
        const existingWindowId = this.sourceViewMapping.get(sourceView.id)!
        const existingWindow = this.detachedWindows.get(existingWindowId)

        if (existingWindow) {
          log.warn(`视图已分离: ${sourceView.id}`)
          existingWindow.window.focus()
          return {
            success: true,
            sourceViewId: sourceView.id,
            detachedWindow: existingWindow
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
      const controlBarView = await this.createControlBarView(detachConfig)
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

        detachedWindow.contentView.addChildView(originalView)
        detachedWindow.contentView.addChildView(controlBarView)
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
      this.emit('view:detached', {
        sourceViewId: sourceView.id,
        sourceWindowId: parentWindowId,
        detachedWindowId: detachedWindow.id,
        timestamp: Date.now()
      })

      log.info(`视图分离成功: ${sourceView.id} -> 窗口 ${detachedWindow.id}`)

      return {
        success: true,
        sourceViewId: sourceView.id,
        detachedWindow: detachedWindowInfo
      }
    } catch (error) {
      log.error(`分离视图失败: ${sourceView.id}`, error)
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
    try {
      const detachedWindowInfo = this.detachedWindows.get(detachedWindowId)
      if (!detachedWindowInfo) {
        throw new Error('分离窗口不存在')
      }

      log.info(`重新附加视图: ${detachedWindowInfo.sourceViewId} 到窗口 ${targetWindowId}`)

      // 获取目标窗口
      const targetWindow = this.getSourceWindow(targetWindowId)
      if (!targetWindow) {
        throw new Error('目标窗口不存在')
      }

      // 从分离窗口移除原始视图并将其添加回目标窗口
      const originalView = detachedWindowInfo.view
      if (originalView.webContents.isDestroyed()) {
        throw new Error('无法重新附加已销毁的视图')
      }
      // This implicitly removes it from its previous parent (the detached window)
      targetWindow.contentView.addChildView(originalView)

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

      // 触发重新附加事件，通知 ViewManager 更新状态
      this.emit('view:reattach-requested', {
        sourceViewId: detachedWindowInfo.sourceViewId,
        detachedWindowId,
        targetWindowId,
        originalView,
        timestamp: Date.now()
      })

      // 关闭分离窗口
      await this.closeDetachedWindow(detachedWindowId)

      log.info(`视图重新附加完成: ${detachedWindowInfo.sourceViewId}`)

      return {
        success: true,
        viewId: detachedWindowInfo.sourceViewId,
        data: { reattachedTo: targetWindowId, view: originalView }
      }
    } catch (error) {
      log.error(`重新附加视图失败: 窗口ID ${detachedWindowId}`, error)
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

      // 清理映射关系
      this.sourceViewMapping.delete(detachedWindowInfo.sourceViewId)
      this.detachedWindows.delete(windowId)

      // 关闭窗口
      const windowToClose = detachedWindowInfo.window
      if (windowToClose && !windowToClose.isDestroyed()) {
        windowToClose.removeAllListeners()
        windowToClose.close()
      }

      // 触发关闭事件
      this.emit('view:detached-window-closed', {
        windowId,
        sourceViewId: detachedWindowInfo.sourceViewId,
        timestamp: Date.now()
      })

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
   * 处理分离窗口控制栏事件
   * @param windowId 分离窗口ID
   * @param action 控制操作
   * @returns 操作结果
   */
  public async handleControlBarAction(
    windowId: number,
    action: DetachedWindowAction
  ): Promise<ViewOperationResult> {
    try {
      const detachedWindowInfo = this.detachedWindows.get(windowId)
      if (!detachedWindowInfo) {
        throw new Error('分离窗口不存在')
      }

      const { window } = detachedWindowInfo

      switch (action) {
        case DetachedWindowAction.MINIMIZE:
          window.minimize()
          break

        case DetachedWindowAction.MAXIMIZE:
          if (window.isMaximized()) {
            window.unmaximize()
          } else {
            window.maximize()
          }
          break

        case DetachedWindowAction.CLOSE:
          await this.closeDetachedWindow(windowId)
          break

        case DetachedWindowAction.REATTACH:
          // 需要获取目标窗口ID，这里触发事件让外部处理
          this.emit('view:reattach-requested', {
            sourceViewId: detachedWindowInfo.sourceViewId,
            detachedWindowId: windowId,
            action,
            timestamp: Date.now()
          })
          break

        default:
          throw new Error(`不支持的控制操作: ${action}`)
      }

      // 触发控制栏事件
      const controlEvent: DetachedWindowControlEvent = {
        action,
        windowId,
        viewId: detachedWindowInfo.sourceViewId,
        timestamp: Date.now()
      }

      this.emit('control-bar:action', controlEvent)

      return {
        success: true,
        viewId: detachedWindowInfo.sourceViewId,
        data: { action, windowId }
      }
    } catch (error) {
      log.error(`处理控制栏操作失败: ${windowId}, 操作: ${action}`, error)
      return {
        success: false,
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
    // 获取当前鼠标位置作为新窗口位置参考
    const mousePosition = screen.getCursorScreenPoint()

    // 计算默认窗口位置
    const defaultBounds: Rectangle = {
      x: mousePosition.x + this.config.windowOffset.x,
      y: mousePosition.y + this.config.windowOffset.y,
      width: Math.max(
        sourceView.config.bounds.width,
        this.config.defaultWindowSize.width
      ),
      height: Math.max(
        sourceView.config.bounds.height,
        this.config.defaultWindowSize.height
      )
    }

    // 确保窗口在屏幕范围内
    const display = screen.getDisplayNearestPoint(mousePosition)
    const workArea = display.workArea

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
        pluginId: pluginInfo?.pluginId,
        path: pluginInfo?.path,
        name: pluginInfo?.name,
        originalConfig: sourceView.config,
        detachedAt: Date.now()
      },
      ...userConfig
    }
  }

  /**
   * 创建控制栏视图
   * @param config 分离配置
   * @returns 控制栏 WebContentsView
   */
  private async createControlBarView(config: DetachedWindowConfig): Promise<WebContentsView | null> {
    try {
      // 构建preload文件路径
      let preloadPath: string
      try {
        preloadPath = resolve(getDirname(import.meta.url), './preloads/win-control.js')
      } catch {
        // 如果找不到，使用基础preload
        preloadPath = resolve(getDirname(import.meta.url), './preloads/basic.js')
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
    try {
      // 检查控制栏视图状态
      if (!controlBarView || controlBarView.webContents.isDestroyed()) {
        throw new Error('控制栏视图已被销毁')
      }

      // 加载控制栏页面
      if (process.env.NODE_ENV === 'development') {
        const controlBarURL = 'http://localhost:5173/src/pages/detached-window/index.html'
        await controlBarView.webContents.loadURL(controlBarURL)
      } else {
        const controlBarPath = resolve(
          getDirname(import.meta.url),
          '../renderer/pages/detached-window/index.html'
        )
        await controlBarView.webContents.loadFile(controlBarPath)
      }

      // 等待页面加载完成后发送初始化数据
      const initializeData = () => {
        // 再次检查状态
        if (controlBarView.webContents.isDestroyed()) {
          log.warn('控制栏webContents已销毁，跳过初始化数据发送')
          return
        }

        try {
          const sourceUrl = sourceView.view.webContents.getURL()
          log.info('发送控制栏初始化数据', {
            windowId: detachedWindowId,
            viewId: sourceView.id,
            sourceUrl,
            title: this.extractPluginInfo(sourceView)?.name || sourceView.config.type || '分离窗口'
          })

          controlBarView.webContents.send('detached-window:init', {
            windowId: detachedWindowId,
            viewId: sourceView.id,
            sourceUrl,
            windowTitle: this.extractPluginInfo(sourceView)?.name || sourceView.config.type || '分离窗口',
            timestamp: Date.now()
          })
        } catch (error) {
          log.warn('发送控制栏初始化数据失败:', error)
        }
      }

      // 如果页面已经加载完成，直接发送
      if (controlBarView.webContents.isLoading() === false) {
        setTimeout(initializeData, 100) // 稍微延迟确保页面准备好
      } else {
        controlBarView.webContents.once('did-finish-load', initializeData)
      }

      log.info('控制栏初始化完成')
      return true
    } catch (error) {
      log.error('初始化控制栏失败:', error)
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
    if (metadata?.pluginId) {
      return {
        pluginId: metadata.pluginId,
        name: metadata.name || metadata.pluginId,
        path: metadata.path || '',
        version: metadata.version
      }
    }
    return undefined
  }

  /**
   * 设置分离窗口事件
   * @param detachedWindowInfo 分离窗口信息
   */
  private setupDetachedWindowEvents(detachedWindowInfo: DetachedWindowInfo): void {
    const { window, view, windowId } = detachedWindowInfo

    // 窗口关闭事件
    window.on('closed', () => {
      this.handleWindowClosed(windowId)
    })

    // 窗口聚焦事件
    window.on('focus', () => {
      this.emit('detached-window:focused', {
        windowId,
        sourceViewId: detachedWindowInfo.sourceViewId,
        timestamp: Date.now()
      })
    })

    // 窗口失焦事件
    window.on('blur', () => {
      this.emit('detached-window:blurred', {
        windowId,
        sourceViewId: detachedWindowInfo.sourceViewId,
        timestamp: Date.now()
      })
    })

    // 视图快捷键事件
    view.webContents.on('before-input-event', (event, input) => {
      this.handleViewShortcuts(event, input, detachedWindowInfo)
    })

    // 视图页面加载完成
    view.webContents.on('did-finish-load', () => {
      log.info(`分离视图加载完成: ${detachedWindowInfo.sourceViewId}`)
    })
  }

  /**
   * 处理窗口关闭
   * @param windowId 窗口ID
   */
  private handleWindowClosed(windowId: number): void {
    const detachedWindowInfo = this.detachedWindows.get(windowId)
    if (detachedWindowInfo) {
      log.info(`分离窗口已关闭: ${windowId}`)

      // 清理映射关系
      this.sourceViewMapping.delete(detachedWindowInfo.sourceViewId)
      this.detachedWindows.delete(windowId)

      // 触发关闭事件
      this.emit('view:detached-window-closed', {
        windowId,
        sourceViewId: detachedWindowInfo.sourceViewId,
        timestamp: Date.now()
      })
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
      this.emit('view:reattach-requested', {
        sourceViewId: detachedWindowInfo.sourceViewId,
        detachedWindowId: detachedWindowInfo.windowId,
        action: DetachedWindowAction.REATTACH,
        timestamp: Date.now()
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
   * 添加事件监听器
   * @param event 事件名
   * @param handler 事件处理器
   */
  public on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  /**
   * 移除事件监听器
   * @param event 事件名
   * @param handler 事件处理器
   */
  public off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index !== -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * 触发事件
   * @param event 事件名
   * @param data 事件数据
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          log.error(`事件处理器执行失败: ${event}`, error)
        }
      })
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
    this.eventHandlers.clear()

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
    if (controlBarView && !controlBarView.webContents.isDestroyed()) {
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
      return
    }

    const controlBarHeight = 32 // Control bar height
    const windowBounds = detachedWindow.getBounds()

    if (!this.isInvalid(originalView)) {
      originalView.setBounds({
        x: 0,
        y: controlBarHeight,
        width: windowBounds.width,
        height: Math.max(windowBounds.height - controlBarHeight, 0)
      })
    }

    if (!this.isInvalid(controlBarView)) {
      controlBarView.setBounds({
        x: 0,
        y: 0,
        width: windowBounds.width,
        height: controlBarHeight
      })
    }
  }
}
