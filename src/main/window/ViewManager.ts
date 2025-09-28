/**
 * ViewManager - WebContentsView 管理器
 * 负责 WebContentsView 的创建、切换、布局和生命周期管理
 */

import { BaseWindow, WebContentsView, screen } from 'electron'
import { resolve } from 'path'
import log from 'electron-log'
import { DEFAULT_WINDOW_LAYOUT } from '@shared/constants'
import {
  calculateSettingsViewBounds,
  calculateMainViewBounds
} from '@shared/config/windowLayoutConfig'
import type {
  WebContentsViewConfig,
  WebContentsViewInfo,
  ViewOperationResult,
  WindowPerformanceMetrics,
  WindowManagerEventData
} from '../typings/windowTypes'
import { isProduction } from '@shared/utils'
import { getDirname } from '@main/utils'
import { getRendererUrl } from './windowConfig'
import { BaseWindowController } from './BaseWindowController'
import { DetachManager } from './DetachManager'
import { sendViewRestoreRequested, sendViewDetached } from '@main/ipc-router/mainEvents'
import { mainProcessEventManager } from './MainProcessEventManager'

/**
 * ViewManager 类
 * 管理 WebContentsView 的创建、切换和布局
 */
export class ViewManager {
  private static instance: ViewManager
  private views: Map<string, WebContentsViewInfo> = new Map()
  private windowViews: Map<number, Set<string>> = new Map() // 窗口ID -> 视图ID集合
  private activeViews: Map<number, string> = new Map() // 窗口ID -> 活跃视图ID
  private performanceMetrics: Map<number, WindowPerformanceMetrics> = new Map()
  private baseWindowController: BaseWindowController
  private detachManager: DetachManager

  private constructor() {
    this.baseWindowController = BaseWindowController.getInstance()
    this.detachManager = DetachManager.getInstance()

    // 设置 DetachManager 的 ViewManager 引用（避免循环依赖）
    this.detachManager.setViewManager(this)

    this.setupDetachManagerEvents()
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ViewManager {
    if (!ViewManager.instance) {
      ViewManager.instance = new ViewManager()
    }
    return ViewManager.instance
  }

  /**
   * 创建 WebContentsView
   * @param window 父窗口
   * @param config 视图配置
   * @returns 操作结果
   */
  public createView(window: BaseWindow, config: WebContentsViewConfig): ViewOperationResult {
    try {
      log.info(`开始创建视图: ${config.id}, 类型: ${config.type}`)

      // 检查视图是否已存在
      if (this.views.has(config.id)) {
        log.warn(`视图已存在: ${config.id}`)
        return {
          success: false,
          viewId: config.id,
          error: '视图已存在'
        }
      }

      // 创建 WebContentsView
      const view = this.createWebContentsView(config)
      if (!view) {
        throw new Error('WebContentsView 创建失败')
      }

      // 添加到父窗口
      window.contentView.addChildView(view)

      // 仅在开发环境下打开开发者工具
      if (process.env.NODE_ENV === 'development') {
        view.webContents.openDevTools({ mode: 'detach' })
      }

      // 设置边界
      view.setBounds(config.bounds)

      // 异步加载内容（避免阻塞调试器）
      setTimeout(() => {
        this.loadViewContent(view, config)
      }, 0)

      // 创建视图信息
      const viewInfo: WebContentsViewInfo = {
        id: config.id,
        view,
        config,
        state: {
          isVisible: true,
          isActive: false,
          lastAccessTime: Date.now()
        },
        createdAt: new Date(),
        parentWindowId: window.id
      }

      // 设置视图事件
      this.setupViewEvents(viewInfo)

      // 保存视图信息
      this.views.set(config.id, viewInfo)

      // 更新窗口-视图映射
      this.addViewToWindow(window.id, config.id)

      // 触发事件
      mainProcessEventManager.emit('view:created', {
        viewId: config.id,
        windowId: window.id,
        config,
        timestamp: Date.now()
      })

      // 更新性能指标
      this.updatePerformanceMetrics(window.id)

      log.info(`视图创建成功: ${config.id}`)

      return {
        success: true,
        viewId: config.id,
        data: { view, viewInfo }
      }
    } catch (error) {
      log.error(`创建视图失败: ${config.id}`, error)
      return {
        success: false,
        viewId: config.id,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 切换到指定视图
   * @param windowId 窗口ID
   * @param viewId 视图ID
   * @returns 操作结果
   */
  public switchToView(windowId: number, viewId: string): ViewOperationResult {
    try {
      log.info(`切换视图: 窗口=${windowId}, 视图=${viewId}`)

      const viewInfo = this.views.get(viewId)
      if (!viewInfo) {
        return { success: false, viewId, error: '视图不存在' }
      }

      if (viewInfo.parentWindowId !== windowId) {
        return { success: false, viewId, error: '视图不属于指定窗口' }
      }

      // 使用多视图布局管理
      return this.switchToViewWithLayout(windowId, viewId)
    } catch (error) {
      log.error(`切换视图失败: ${viewId}`, error)
      return {
        success: false,
        viewId,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 使用多视图布局切换视图
   * 主视图（搜索框）始终可见，其他视图在下方显示
   * @param windowId 窗口ID
   * @param viewId 视图ID
   * @returns 操作结果
   */
  private switchToViewWithLayout(windowId: number, viewId: string): ViewOperationResult {
    try {
      const viewInfo = this.views.get(viewId)
      if (!viewInfo) {
        return { success: false, viewId, error: '视图不存在' }
      }

      const currentActiveViewId = this.activeViews.get(windowId)
      const mainViewId = 'main-view'

      // 如果切换到主视图，隐藏其他非主视图
      if (viewId === mainViewId) {
        // 隐藏当前活跃的非主视图
        if (currentActiveViewId && currentActiveViewId !== mainViewId) {
          const currentViewInfo = this.views.get(currentActiveViewId)
          if (currentViewInfo) {
            this.hideView(currentViewInfo)
          }
        }
        // 显示主视图并调整为全窗口大小
        this.showMainViewFullSize(windowId, viewInfo)
      } else {
        // 切换到非主视图（如设置、插件等）
        // 确保主视图始终可见
        const mainViewInfo = this.views.get(mainViewId)
        if (mainViewInfo) {
          this.showView(mainViewInfo)
        }

        // 隐藏其他非主视图
        if (currentActiveViewId && currentActiveViewId !== mainViewId && currentActiveViewId !== viewId) {
          const currentViewInfo = this.views.get(currentActiveViewId)
          if (currentViewInfo) {
            this.hideView(currentViewInfo)
          }
        }

        // 显示目标视图
        this.showView(viewInfo)

        // 重新计算布局
        this.updateMultiViewLayout(windowId, mainViewId, viewId)
      }

      // 更新活跃视图
      this.activeViews.set(windowId, viewId)

      // 更新访问时间
      viewInfo.state.lastAccessTime = Date.now()
      viewInfo.state.isActive = true

      // 触发事件
      mainProcessEventManager.emit('view:switched', {
        fromViewId: currentActiveViewId,
        toViewId: viewId,
        windowId: windowId,
        timestamp: Date.now()
      })

      // 更新性能指标
      this.updatePerformanceMetrics(windowId)

      log.info(`视图切换成功: ${viewId}`)
      return {
        success: true,
        viewId,
        data: { previousViewId: currentActiveViewId }
      }
    } catch (error) {
      log.error(`使用多视图布局切换视图失败: ${viewId}`, error)
      return {
        success: false,
        viewId,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 显示主视图并调整为全窗口大小
   * 考虑窗口内边距，确保内容被限制在圆角内
   * @param windowId 窗口ID
   * @param mainViewInfo 主视图信息
   */
  private showMainViewFullSize(windowId: number, mainViewInfo: WebContentsViewInfo): void {
    try {
      const window = this.baseWindowController.getWindow(windowId)
      if (!window) {
        log.error(`窗口不存在: ${windowId}`)
        return
      }

      const windowBounds = window.getBounds()

      const fullSizeBounds = {
        x: 0,
        y: 0,
        width: windowBounds.width,
        height: windowBounds.height
      }

      mainViewInfo.view.setBounds(fullSizeBounds)
      mainViewInfo.config.bounds = fullSizeBounds
      mainViewInfo.state.isVisible = true

      // 应用基础样式，移除边框和阴影
      mainViewInfo.view.webContents.insertCSS(`
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: transparent;
          border: none;
          box-shadow: none;
        }
      `)

      log.debug('主视图已调整为全窗口大小（考虑内边距）')
    } catch (error) {
      log.error('调整主视图大小失败:', error)
    }
  }

  /**
   * 更新多视图布局
   * 主搜索框始终可见，设置/插件视图在下方显示
   * WebContentsView 被限制在 BaseWindow 的圆角和阴影内
   * @param windowId 窗口ID
   * @param mainViewId 主视图ID
   * @param secondaryViewId 次要视图ID
   */
  public updateMultiViewLayout(windowId: number, mainViewId: string, secondaryViewId: string): void {
    try {
      const window = this.baseWindowController.getWindow(windowId)
      if (!window) {
        log.error(`窗口不存在: ${windowId}`)
        return
      }

      const mainViewInfo = this.views.get(mainViewId)
      const secondaryViewInfo = this.views.get(secondaryViewId)

      if (!mainViewInfo || !secondaryViewInfo) {
        log.error('主视图或次要视图不存在')
        return
      }

      const windowBounds = window.getBounds()

      // 主视图（搜索框）布局 - 使用统一配置计算
      // 在设置模式或插件模式下，主视图都应该占满整个窗口作为背景
      const isOverlayMode = secondaryViewId === 'settings-view' || secondaryViewId.startsWith('plugin:')
      const mainViewBounds = calculateMainViewBounds(windowBounds, isOverlayMode)

      // 次要视图布局 - 根据视图类型设置不同的边界
      let secondaryViewBounds
      if (secondaryViewId === 'settings-view') {
        // 设置视图：使用统一配置计算边界
        secondaryViewBounds = calculateSettingsViewBounds(windowBounds)
      } else {
        // 其他视图（如插件视图）：使用与设置视图相同的padding设置
        secondaryViewBounds = calculateSettingsViewBounds(windowBounds)
      }

      // 更新视图边界
      mainViewInfo.view.setBounds(mainViewBounds)
      mainViewInfo.config.bounds = mainViewBounds

      secondaryViewInfo.view.setBounds(secondaryViewBounds)
      secondaryViewInfo.config.bounds = secondaryViewBounds

      // 应用基础样式，添加分隔线
      this.applyBasicStyles(mainViewInfo, secondaryViewInfo)

      log.debug(`多视图布局更新完成: 主视图=${mainViewId}, 次要视图=${secondaryViewId}`)
    } catch (error) {
      log.error('更新多视图布局失败:', error)
    }
  }

  /**
   * 应用基础样式
   * @param mainViewInfo 主视图信息
   * @param secondaryViewInfo 次要视图信息
   */
  private applyBasicStyles(mainViewInfo: WebContentsViewInfo, secondaryViewInfo: WebContentsViewInfo): void {
    try {
      // 为主视图应用基础样式
      mainViewInfo.view.webContents.insertCSS(`
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `)

      // 为次要视图应用基础样式，添加顶部分隔线
      secondaryViewInfo.view.webContents.insertCSS(`
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          border-top: 1px solid #e5e7eb;
        }
      `)

      log.debug('基础样式应用完成')
    } catch (error) {
      log.error('应用基础样式失败:', error)
    }
  }

  /**
   * 移除视图
   * @param viewId 视图ID
   * @returns 操作结果
   */
  public removeView(viewId: string): ViewOperationResult {
    try {
      log.info(`移除视图: ${viewId}`)

      const viewInfo = this.views.get(viewId)
      if (!viewInfo) {
        return {
          success: false,
          viewId,
          error: '视图不存在'
        }
      }

      const windowId = viewInfo.parentWindowId

      // 从父窗口移除视图
      const parentWindow = this.getWindowById(windowId)
      if (parentWindow) {
        parentWindow.contentView.removeChildView(viewInfo.view)
      }

      // 销毁 WebContentsView
      if (!viewInfo.view.webContents.isDestroyed()) {
        viewInfo.view.webContents.close()
      }

      // 从映射中移除
      this.views.delete(viewId)
      this.removeViewFromWindow(windowId, viewId)

      // 如果是当前活跃视图，清除活跃状态
      if (this.activeViews.get(windowId) === viewId) {
        this.activeViews.delete(windowId)
      }

      // 触发事件
      mainProcessEventManager.emit('view:removed', {
        viewId,
        windowId,
        timestamp: Date.now()
      })

      // 更新性能指标
      this.updatePerformanceMetrics(windowId)

      log.info(`视图移除成功: ${viewId}`)

      return {
        success: true,
        viewId
      }
    } catch (error) {
      log.error(`移除视图失败: ${viewId}`, error)
      return {
        success: false,
        viewId,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 获取活跃视图WebContentsView实例
   * @param windowId 窗口ID
   * @returns WebContentsView 实例或 null
   */
  public getActiveViewInstance(windowId: number): WebContentsView | null {
    const activeViewId = this.activeViews.get(windowId)
    if (!activeViewId) return null

    const viewInfo = this.views.get(activeViewId)
    return viewInfo?.view || null
  }

  /**
   * 获取活跃视图信息
   * @param windowId 窗口ID
   * @returns 视图信息或 undefined
   */
  public getActiveViewInfo(windowId: number): WebContentsViewInfo | undefined {
    const activeViewId = this.activeViews.get(windowId)
    if (!activeViewId) return undefined

    return this.views.get(activeViewId)
  }

  /**
   * 获取视图信息
   * @param viewId 视图ID
   * @returns 视图信息或 undefined
   */
  public getViewInfo(viewId: string): WebContentsViewInfo | undefined {
    return this.views.get(viewId)
  }

  /**
   * 获取窗口的活跃视图ID
   * @param windowId 窗口ID
   * @returns 活跃视图ID或 undefined
   */
  public getActiveViewId(windowId: number): string | undefined {
    return this.activeViews.get(windowId)
  }

  /**
   * 获取窗口的所有视图
   * @param windowId 窗口ID
   * @returns 视图信息数组
   */
  public getWindowViews(windowId: number): WebContentsViewInfo[] {
    const viewIds = this.windowViews.get(windowId) || new Set()
    return Array.from(viewIds)
      .map((id) => this.views.get(id))
      .filter((info): info is WebContentsViewInfo => info !== undefined)
  }

  /**
   * 重新排列窗口中的视图布局
   * @param window 窗口实例
   * @param layoutConfig 布局配置
   * @returns 操作结果
   */
  public rearrangeViews(
    window: BaseWindow,
    layoutConfig?: {
      headerHeight?: number
      padding?: number
    }
  ): ViewOperationResult {
    try {
      const windowId = window.id
      const viewInfos = this.getWindowViews(windowId)

      if (viewInfos.length === 0) {
        return { success: true, windowId }
      }

      const windowBounds = window.getBounds()
      const headerHeight = layoutConfig?.headerHeight || 0
      const padding = layoutConfig?.padding || 0

      // 计算内容区域
      const contentArea = {
        x: padding,
        y: headerHeight + padding,
        width: windowBounds.width - padding * 2,
        height: windowBounds.height - headerHeight - padding * 2
      }

      // 为每个视图分配区域（这里使用简单的垂直堆叠）
      const viewHeight = contentArea.height / viewInfos.length

      viewInfos.forEach((viewInfo, index) => {
        const newBounds = {
          x: contentArea.x,
          y: contentArea.y + index * viewHeight,
          width: contentArea.width,
          height: viewHeight
        }

        viewInfo.view.setBounds(newBounds)
        viewInfo.config.bounds = newBounds
      })

      log.info(`重新排列视图完成: 窗口=${windowId}, 视图数量=${viewInfos.length}`)

      return { success: true, windowId }
    } catch (error) {
      log.error(`重新排列视图失败: 窗口=${window.id}`, error)
      return {
        success: false,
        windowId: window.id,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 隐藏视图
   * @param viewInfo 视图信息
   */
  private hideView(viewInfo: WebContentsViewInfo): void {
    try {
      // 通过设置不可见的边界来隐藏视图
      viewInfo.view.setBounds({ x: -10000, y: -10000, width: 1, height: 1 })
      viewInfo.state.isVisible = false
      viewInfo.state.isActive = false
      log.debug(`视图已隐藏: ${viewInfo.id}`)
    } catch (error) {
      log.error(`隐藏视图失败: ${viewInfo.id}`, error)
    }
  }

  /**
   * 显示视图
   * @param viewInfo 视图信息
   */
  private showView(viewInfo: WebContentsViewInfo): void {
    try {
      // 恢复视图的正常边界
      viewInfo.view.setBounds(viewInfo.config.bounds)
      viewInfo.state.isVisible = true

      log.debug(`视图已显示: ${viewInfo.id}`)
    } catch (error) {
      log.error(`显示视图失败: ${viewInfo.id}`, error)
    }
  }

  /**
   * 创建 WebContentsView 实例
   * @param config 视图配置
   * @returns WebContentsView 实例或 null
   */
  private createWebContentsView(config: WebContentsViewConfig): WebContentsView | null {
    try {
      const options: any = {
        webPreferences: {
          nodeIntegration: config.webPreferences?.nodeIntegration ?? false,
          contextIsolation: config.webPreferences?.contextIsolation ?? true,
          webSecurity: config.webPreferences?.webSecurity ?? true,
          preload: config.webPreferences?.preload,
          additionalArguments: config.webPreferences?.additionalArguments,
          // 移除 sandbox 配置，使用默认值
          transparent: true, // 启用透明
          backgroundThrottling: false // 禁用背景节流
        }
      }

      // 移除 undefined 值
      Object.keys(options.webPreferences).forEach((key) => {
        if (options.webPreferences[key] === undefined) {
          delete options.webPreferences[key]
        }
      })

      const view = new WebContentsView(options)
      log.debug(`WebContentsView 创建成功: ${config.id}`)
      return view
    } catch (error) {
      log.error(`WebContentsView 创建失败: ${config.id}`, error)
      return null
    }
  }

  /**
   * 加载视图内容
   * @param view WebContentsView 实例
   * @param config 视图配置
   */
  private async loadViewContent(view: WebContentsView, config: WebContentsViewConfig): Promise<void> {
    try {
      if (config.url) {
        if (config.url.startsWith('http') || config.url.startsWith('file://')) {
          await this.safeLoadURL(view, config.url, config.id)
        } else {
          await this.safeLoadFile(view, config.url, config.id)
        }
      } else if (config.filePath) {
        await this.safeLoadFile(view, config.filePath, config.id)
      } else {
        // 默认加载主应用内容
        if (isProduction()) {
          const __dirname = getDirname(import.meta.url)
          const indexPath = resolve(__dirname, '../renderer/index.html')
          await this.safeLoadFile(view, indexPath, config.id)
          log.debug(`加载生产环境文件: ${indexPath}`)
        } else {
          const url = getRendererUrl()
          await this.safeLoadURL(view, url, config.id)
          log.debug(`加载开发环境URL: ${url}`)
        }
        log.debug('加载默认应用内容')
      }
    } catch (error) {
      log.error(`加载视图内容失败: ${config.id}`, error)
    }
  }

  /**
   * 安全加载URL（带超时机制）
   */
  private async safeLoadURL(view: WebContentsView, url: string, viewId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        log.warn(`加载URL超时: ${url}, 视图: ${viewId}`)
        resolve() // 不要reject，避免阻塞整个流程
      }, 10000) // 10秒超时

      view.webContents
        .loadURL(url)
        .then(() => {
          clearTimeout(timeoutId)
          log.debug(`加载URL成功: ${url}`)
          resolve()
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          log.error(`加载URL失败: ${url}, 错误: ${error.message}`)
          resolve() // 不要reject，避免阻塞整个流程
        })
    })
  }

  /**
   * 安全加载文件（带超时机制）
   */
  private async safeLoadFile(view: WebContentsView, filePath: string, viewId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        log.warn(`加载文件超时: ${filePath}, 视图: ${viewId}`)
        resolve() // 不要reject，避免阻塞整个流程
      }, 5000) // 5秒超时

      view.webContents
        .loadFile(filePath)
        .then(() => {
          clearTimeout(timeoutId)
          log.debug(`加载文件成功: ${filePath}`)
          resolve()
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          log.error(`加载文件失败: ${filePath}, 错误: ${error.message}`)
          resolve() // 不要reject，避免阻塞整个流程
        })
    })
  }

  /**
   * 设置视图事件
   * @param viewInfo 视图信息
   */
  private setupViewEvents(viewInfo: WebContentsViewInfo): void {
    const { view, id } = viewInfo

    // 页面加载完成
    view.webContents.on('did-finish-load', () => {
      log.debug(`视图页面加载完成: ${id}`)
    })

    // 页面加载失败
    view.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      log.error(`视图页面加载失败: ${id}, 错误: ${errorDescription}`)
    })

    // 崩溃处理
    view.webContents.on('render-process-gone', () => {
      log.error(`视图渲染进程崩溃: ${id}`)
    })

    // 无响应处理
    view.webContents.on('unresponsive', () => {
      log.warn(`视图无响应: ${id}`)
    })

    // 响应恢复
    view.webContents.on('responsive', () => {
      log.info(`视图响应恢复: ${id}`)
    })

    // WebContentsView关闭事件
    view.webContents.on('destroyed', () => {
      log.info(`视图WebContents已销毁: ${id}`)
      this.handleViewClosed(viewInfo)
    })

    // 为非搜索框视图添加 Alt+D 快捷键监听
    if (id !== 'main-view') {
      this.setupDetachShortcuts(viewInfo)
    }
  }

  /**
   * 设置视图分离快捷键
   * @param viewInfo 视图信息
   */
  private setupDetachShortcuts(viewInfo: WebContentsViewInfo): void {
    const { view, id } = viewInfo

    // 监听键盘事件，处理 Alt+D 快捷键
    view.webContents.on('before-input-event', (event, input) => {
      // 在调试模式下记录键盘事件
      if (process.env.NODE_ENV === 'development') {
        log.debug(
          `[${id}] 键盘事件: key=${input.key}, code=${input.code}, type=${input.type}, alt=${input.alt}, ctrl=${input.control}, shift=${input.shift}, meta=${input.meta}`
        )
      }

      // Alt + D 快捷键检测
      const isAltPressed = input.alt || input.modifiers?.includes?.('alt')
      const isDKey = input.key === 'D' || input.key === 'd' || input.code === 'KeyD'
      const isKeyDown = input.type === 'keyDown'

      if (isDKey && isKeyDown && isAltPressed) {
        log.info(`[${id}] 触发 Alt+D 快捷键，开始分离视图`)

        // 阻止默认行为
        event.preventDefault()

        // 执行视图分离
        this.handleViewDetach(viewInfo)
        return
      }
    })

    log.debug(`[${id}] Alt+D 快捷键监听器已设置`)
  }

  /**
   * 处理视图分离
   * @param viewInfo 视图信息
   */
  private async handleViewDetach(viewInfo: WebContentsViewInfo): Promise<void> {
    try {
      const { id, parentWindowId } = viewInfo

      log.info(`开始分离视图: ${id} 从窗口 ${parentWindowId}`)

      // 使用 DetachManager 执行分离
      const detachResult = await this.detachManager.detachView(viewInfo, parentWindowId)

      if (detachResult.success) {
        log.info(`视图分离成功: ${id}`)

        // 触发分离成功事件
        mainProcessEventManager.emit('view:detach-success', {
          viewId: id,
          sourceWindowId: parentWindowId,
          detachedWindowId: detachResult.detachedWindow?.windowId || 0,
          timestamp: Date.now()
        })

        // 视图已被DetachManager移动到分离窗口，但不从ViewManager完全移除
        // 保持视图信息，只更新状态
        viewInfo.state.isVisible = false
        viewInfo.state.isActive = false

        // 从窗口-视图映射中临时移除（但保留在主映射中）
        this.removeViewFromWindow(parentWindowId, id)

        // 如果分离的是当前活跃视图，切换回主视图
        const currentActiveViewId = this.activeViews.get(parentWindowId)
        if (currentActiveViewId === id) {
          // 清除活跃视图状态
          this.activeViews.delete(parentWindowId)

          // 切换回主视图
          const switchResult = this.switchToView(parentWindowId, 'main-view')
          if (switchResult.success) {
            log.info(`已切换回主视图，因为活跃视图 ${id} 被分离`)
          }
        }

        // 通知搜索栏WebContentsView显示空状态
        this.notifyMainViewOfDetachment(parentWindowId, id)

        log.info(`视图 ${id} 已分离到独立窗口，完成分离操作`)
      } else {
        log.error(`视图分离失败: ${id}, 错误: ${detachResult.error}`)

        // 触发分离失败事件
        mainProcessEventManager.emit('view:detach-failed', {
          viewId: id,
          windowId: parentWindowId,
          error: detachResult.error || '未知错误',
          timestamp: Date.now()
        })
      }
    } catch (error) {
      log.error(`处理视图分离失败: ${viewInfo.id}`, error)

      // 触发分离错误事件
      mainProcessEventManager.emit('view:detach-error', {
        viewId: viewInfo.id,
        windowId: viewInfo.parentWindowId,
        error: error instanceof Error ? error : new Error('未知错误'),
        timestamp: Date.now()
      })
    }
  }

  /**
   * 处理视图关闭事件
   * @param viewInfo 视图信息
   */
  private handleViewClosed(viewInfo: WebContentsViewInfo): void {
    try {
      const { id, parentWindowId } = viewInfo

      // 分离窗口不需要通知搜索栏
      if (this.detachManager.isViewDetached(id)) {
        log.info(`视图关闭时跳过主视图通知，因为视图已分离: ${id}`)
        return
      }

      // 如果是设置视图关闭，通知主视图恢复状态
      if (id === 'settings-view') {
        this.notifyMainViewToRestore(parentWindowId, 'settings-closed')
      } else if (id.startsWith('plugin-')) {
        // 如果是插件视图关闭，通知主视图恢复状态
        this.notifyMainViewToRestore(parentWindowId, 'plugin-closed')
      }

      // 触发视图关闭事件
      mainProcessEventManager.emit('view:closed', {
        viewId: id,
        windowId: parentWindowId,
        reason: '用户关闭',
        timestamp: Date.now()
      })

      log.info(`视图关闭事件处理完成: ${id}`)
    } catch (error) {
      log.error(`处理视图关闭事件失败: ${viewInfo.id}`, error)
    }
  }

  /**
   * 通知主视图恢复状态
   * @param windowId 窗口ID
   * @param reason 恢复原因
   */
  private notifyMainViewToRestore(windowId: number, reason: string): void {
    try {
      const mainViewInfo = this.views.get('main-view')
      if (!mainViewInfo) {
        log.warn('主视图不存在，无法发送恢复通知')
        return
      }

      if (!mainViewInfo.view.webContents || mainViewInfo.view.webContents.isDestroyed()) {
        log.warn('主视图 WebContents 已销毁，无法发送恢复通知')
        return
      }

      sendViewRestoreRequested(mainViewInfo.view.webContents, {
        viewId: sourceViewId || '',
        windowId,
        reason,
        timestamp: Date.now()
      })

      log.info(`已通知主视图恢复状态: ${reason}`)
    } catch (error) {
      log.error('通知主视图恢复状态失败:', error)
    }
  }

  /**
   * 添加视图到窗口映射
   * @param windowId 窗口ID
   * @param viewId 视图ID
   */
  private addViewToWindow(windowId: number, viewId: string): void {
    if (!this.windowViews.has(windowId)) {
      this.windowViews.set(windowId, new Set())
    }
    this.windowViews.get(windowId)!.add(viewId)
  }

  /**
   * 从窗口映射中移除视图
   * @param windowId 窗口ID
   * @param viewId 视图ID
   */
  private removeViewFromWindow(windowId: number, viewId: string): void {
    const viewSet = this.windowViews.get(windowId)
    if (viewSet) {
      viewSet.delete(viewId)
      if (viewSet.size === 0) {
        this.windowViews.delete(windowId)
      }
    }
  }

  /**
   * 根据ID获取窗口实例
   * @param windowId 窗口ID
   * @returns BaseWindow 实例或 undefined
   */
  private getWindowById(windowId: number): BaseWindow | undefined {
    // 通过 BaseWindowController 获取窗口实例
    return this.baseWindowController.getWindow(windowId)
  }

  /**
   * 更新性能指标
   * @param windowId 窗口ID
   */
  private updatePerformanceMetrics(windowId: number): void {
    try {
      const viewInfos = this.getWindowViews(windowId)
      const activeViewCount = viewInfos.filter((info) => info.state.isActive).length

      // 计算内存使用量（简化版本）
      let totalMemory = 0
      viewInfos.forEach((info) => {
        if (info.state.memoryUsage) {
          totalMemory += info.state.memoryUsage
        }
      })

      const metrics: WindowPerformanceMetrics = {
        windowId,
        viewCount: viewInfos.length,
        memoryUsage: totalMemory / (1024 * 1024), // 转换为 MB
        cpuUsage: 0, // 需要外部提供 CPU 使用率数据
        activeViewCount,
        lastUpdated: new Date()
      }

      this.performanceMetrics.set(windowId, metrics)
    } catch (error) {
      log.error(`更新性能指标失败: 窗口=${windowId}`, error)
    }
  }


  /**
   * 设置DetachManager事件监听
   */
  private setupDetachManagerEvents(): void {
    // 监听视图分离事件，通知主视图
    this.detachManager.on('view:detached', (data: any) => {
      this.handleViewDetached(data)
    })

    // 监听分离窗口关闭事件，恢复原视图显示
    this.detachManager.on('view:detached-window-closed', (data: any) => {
      this.handleDetachedWindowClosed(data)
    })

    // 监听重新附加请求事件
    this.detachManager.on('view:reattach-requested', (data: any) => {
      this.handleReattachRequested(data)
    })

    log.info('DetachManager 事件监听器已设置')
  }

  /**
   * 处理视图分离事件
   * @param data 分离事件数据
   */
  private handleViewDetached(data: {
    sourceViewId: string;
    sourceWindowId: number;
    detachedWindowId: number;
    timestamp: number;
  }): void {
    log.info(`处理视图分离事件: ${data.sourceViewId} 从窗口 ${data.sourceWindowId} 分离到窗口 ${data.detachedWindowId}`)

    // 通知主视图分离事件
    this.notifyMainViewOfDetachment(data.sourceWindowId, data.sourceViewId)
  }

  /**
   * 处理分离窗口关闭事件
   * @param data 事件数据
   */
  private handleDetachedWindowClosed(data: { windowId: number; sourceViewId: string; timestamp: number }): void {
    try {
      const { sourceViewId } = data
      const viewInfo = this.views.get(sourceViewId)

      if (viewInfo) {
        log.info(`分离窗口已关闭，恢复视图显示: ${sourceViewId}`)

        // 恢复视图显示
        this.showView(viewInfo)

        // 切换到该视图
        const switchResult = this.switchToView(viewInfo.parentWindowId, sourceViewId)
        if (switchResult.success) {
          log.info(`已切换到恢复的视图: ${sourceViewId}`)
        }
      } else {
        log.warn(`无法找到要恢复的视图: ${sourceViewId}`)
      }
    } catch (error) {
      log.error('处理分离窗口关闭事件失败:', error)
    }
  }

  /**
   * 处理重新附加请求事件
   * @param data 事件数据
   */
  private handleReattachRequested(data: any): void {
    try {
      const { sourceViewId, targetWindowId } = data
      const viewInfo = this.views.get(sourceViewId)

      if (viewInfo) {
        log.info(`处理重新附加请求: ${sourceViewId} 到窗口 ${targetWindowId}`)

        // 重新将视图添加到窗口映射
        this.addViewToWindow(targetWindowId, sourceViewId)

        // 切换到该视图
        const switchResult = this.switchToView(targetWindowId, sourceViewId)
        if (switchResult.success) {
          log.info(`重新附加成功: ${sourceViewId}`)
        }
      } else {
        log.warn(`无法找到要重新附加的视图: ${sourceViewId}`)
      }
    } catch (error) {
      log.error('处理重新附加请求失败:', error)
    }
  }

  /**
   * 通知主视图有视图被分离
   * @param windowId 窗口ID
   * @param detachedViewId 被分离的视图ID
   */
  private notifyMainViewOfDetachment(windowId: number, detachedViewId: string): void {
    try {
      if (this.detachManager.isViewDetached(detachedViewId)) {
        log.info(`跳过通知主视图分离事件，因为视图已分离窗口管理: ${detachedViewId}`)
        return
      }

      const mainViewInfo = this.views.get('main-view')
      if (!mainViewInfo) {
        log.warn('主视图不存在，无法发送分离通知')
        return
      }

      if (!mainViewInfo.view.webContents || mainViewInfo.view.webContents.isDestroyed()) {
        log.warn('主视图 WebContents 已销毁，无法发送分离通知')
        return
      }

      sendViewDetached(mainViewInfo.view.webContents, {
        detachedViewId,
        windowId,
        timestamp: Date.now(),
        remainingViews: this.getWindowViews(windowId).map((view) => view.id)
      })

      log.info(`已通知搜索栏WebContentsView，视图 ${detachedViewId} 已分离`)
    } catch (error) {
      log.error('通知主视图分离事件失败:', error)
    }
  }


  /**
   * 获取性能指标
   * @param windowId 窗口ID
   * @returns 性能指标或 undefined
   */
  public getPerformanceMetrics(windowId: number): WindowPerformanceMetrics | undefined {
    return this.performanceMetrics.get(windowId)
  }

  /**
   * 获取所有视图信息
   * @returns 所有视图信息的数组
   */
  public getAllViews(): WebContentsViewInfo[] {
    return Array.from(this.views.values())
  }

  /**
   * 清理指定窗口的所有视图
   * @param windowId 窗口ID
   * @returns 操作结果
   */
  public cleanupWindowViews(windowId: number): ViewOperationResult {
    try {
      const viewIds = Array.from(this.windowViews.get(windowId) || [])

      for (const viewId of viewIds) {
        this.removeView(viewId)
      }

      this.activeViews.delete(windowId)
      this.performanceMetrics.delete(windowId)

      log.info(`清理窗口视图完成: 窗口=${windowId}, 清理视图数=${viewIds.length}`)

      return {
        success: true,
        windowId,
        data: { cleanedViewCount: viewIds.length }
      }
    } catch (error) {
      log.error(`清理窗口视图失败: 窗口=${windowId}`, error)
      return {
        success: false,
        windowId,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 更新视图的父窗口ID
   * @param viewId 视图ID
   * @param newParentWindowId 新的父窗口ID
   * @returns 操作结果
   */
  public updateViewParentWindow(viewId: string, newParentWindowId: number): ViewOperationResult {
    try {
      const viewInfo = this.views.get(viewId)
      if (!viewInfo) {
        return {
          success: false,
          viewId,
          error: '视图不存在'
        }
      }

      const oldParentWindowId = viewInfo.parentWindowId

      // 更新视图信息中的父窗口ID
      viewInfo.parentWindowId = newParentWindowId

      // 从旧窗口的视图映射中移除
      this.removeViewFromWindow(oldParentWindowId, viewId)

      // 添加到新窗口的视图映射中
      this.addViewToWindow(newParentWindowId, viewId)

      // 如果该视图是旧窗口的活跃视图，清除活跃状态
      if (this.activeViews.get(oldParentWindowId) === viewId) {
        this.activeViews.delete(oldParentWindowId)
      }

      log.info(`视图父窗口ID已更新: ${viewId}, ${oldParentWindowId} -> ${newParentWindowId}`)

      // 触发事件
      mainProcessEventManager.emit('view:parent-window-updated', {
        viewId,
        oldWindowId: oldParentWindowId,
        newWindowId: newParentWindowId,
        timestamp: Date.now()
      })

      return {
        success: true,
        viewId,
        data: { oldParentWindowId, newParentWindowId }
      }
    } catch (error) {
      log.error(`更新视图父窗口ID失败: ${viewId}`, error)
      return {
        success: false,
        viewId,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 获取当前WebContentsView的完整信息
   * 通过webContents查找对应的WebContentsViewInfo，并返回序列化后的信息
   * @param webContents WebContents 实例
   * @returns 序列化后的视图信息，如果找不到则返回null
   */
  public getCurrentViewInfo(webContents: Electron.WebContents): {
    id: string;
    parentWindowId: number;
    config: any;
    state: {
      isVisible: boolean;
      isActive: boolean;
      lastAccessTime: number;
      memoryUsage?: number;
    };
    createdAt: string; // 序列化为ISO字符串
  } | null {
    try {
      // 遍历所有视图
      const allViews = this.getAllViews()

      for (const viewInfo of allViews) {
        if (viewInfo.view.webContents === webContents) {
          // 找到匹配的WebContentsView，返回序列化后的信息
          log.debug(`找到当前WebContentsView: ${viewInfo.id}, 父窗口ID: ${viewInfo.parentWindowId}`)

          return {
            id: viewInfo.id,
            parentWindowId: viewInfo.parentWindowId,
            config: viewInfo.config,
            state: {
              isVisible: viewInfo.state.isVisible,
              isActive: viewInfo.state.isActive,
              lastAccessTime: viewInfo.state.lastAccessTime,
              memoryUsage: viewInfo.state.memoryUsage
            },
            createdAt: viewInfo.createdAt.toISOString()
          }
        }
      }

      log.warn('无法找到当前webContents对应的视图信息')
      return null
    } catch (error) {
      log.error('获取当前视图信息时发生错误:', error)
      return null
    }
  }

  /**
   * 清理所有资源
   */
  public cleanup(): void {
    log.info('开始清理 ViewManager 资源')

    // 清理所有视图
    const allViewIds = Array.from(this.views.keys())
    for (const viewId of allViewIds) {
      this.removeView(viewId)
    }

    // 清理所有映射
    this.views.clear()
    this.windowViews.clear()
    this.activeViews.clear()
    this.performanceMetrics.clear()
    this.eventHandlers.clear()

    log.info('ViewManager 资源清理完成')
  }
}
