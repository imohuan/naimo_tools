/**
 * NewWindowManager - 新一代窗口管理器
 * 统一管理所有窗口和视图操作，集成 BaseWindowController、ViewManager、LifecycleManager、DetachManager
 * 提供统一的窗口管理接口，支持 BaseWindow + WebContentsView 架构
 */

import { BaseWindow, } from 'electron'
import { resolve } from 'path'
import log from 'electron-log'
import { sendPluginViewOpened, sendPluginViewClosed } from '@main/ipc-router/mainEvents'
import { emitEvent } from '@main/core/ProcessEvent'
import { processEventCoordinator } from '@main/core/ProcessEventCoordinator'
import { DEFAULT_WINDOW_LAYOUT } from '@shared/constants'
import { calculateSettingsViewBounds } from '@shared/config/windowLayoutConfig'
import type { AppConfig } from '@shared/typings/appTypes'
import type {
  WebContentsViewConfig,
  WebContentsViewInfo,
  WindowOperationResult,
  ViewOperationResult,
  MainWindowLayoutConfig,
} from '../typings/windowTypes'
import {
  ViewConfig,
  DetachedWindowConfig,
  LifecycleStrategy,
  Rectangle,
  WindowManagerConfig,
  PerformanceMetrics,
  LifecycleType
} from '@renderer/src/typings/windowTypes'
import {
  ViewType
} from '@renderer/src/typings/windowTypes'
import type { PluginItem } from '@renderer/src/typings/pluginTypes'

// 导入子管理器
import { BaseWindowController } from './BaseWindowController'
import { ViewManager } from './ViewManager'
import { LifecycleManager } from './LifecycleManager'
import { DetachManager } from './DetachManager'
import { getDirname, createCombinedPreloadScript } from '@main/utils'

/**
 * 窗口管理器操作选项
 */
export interface WindowManagerOptions {
  /** 是否启用自动清理 */
  enableAutoCleanup?: boolean
  /** 是否启用详细日志 */
  enableVerboseLogging?: boolean
  /** 性能监控间隔（毫秒） */
  performanceMonitorInterval?: number
  /** 最大窗口数量限制 */
  maxWindows?: number
  /** 内存管理配置 */
  memoryManagement?: {
    /** 内存阈值（MB） */
    threshold: number
    /** 检查间隔（毫秒） */
    checkInterval: number
  }
}

/**
 * 视图操作参数
 */
export interface ViewOperationParams {
  /** 视图类型 */
  type: ViewType
  /** 视图配置 */
  config?: Partial<ViewConfig>
  /** 插件信息（用于插件视图） */
  pluginItem?: PluginItem
  /** 是否强制创建新视图 */
  forceNew?: boolean
  /** 自定义生命周期策略 */
  lifecycleStrategy?: LifecycleStrategy
}

/**
 * NewWindowManager 类
 * 新一代窗口管理器主类
 */
export class NewWindowManager {
  private static instance: NewWindowManager
  private config: WindowManagerConfig
  private options: WindowManagerOptions

  // 子管理器实例
  private baseWindowController!: BaseWindowController
  private viewManager!: ViewManager
  private lifecycleManager!: LifecycleManager
  private detachManager!: DetachManager
  private resizeTimeout: NodeJS.Timeout | null = null // 防抖定时器

  // 内部状态
  private mainWindow: BaseWindow | null = null
  private activeViewId: string | null = null
  private performanceTimer?: NodeJS.Timeout
  private isInitialized = false

  private constructor(config: WindowManagerConfig, options: WindowManagerOptions = {}) {
    this.config = config
    this.options = {
      enableAutoCleanup: true,
      enableVerboseLogging: false,
      performanceMonitorInterval: 30000, // 30秒
      maxWindows: 10,
      memoryManagement: {
        threshold: 1000, // 1GB
        checkInterval: 60000 // 1分钟
      },
      ...options
    }

    this.initializeSubManagers()
    this.setupEventHandlers()
    this.startPerformanceMonitoring()
  }

  /**
   * 获取单例实例
   */
  public static getInstance(
    config?: WindowManagerConfig,
    options?: WindowManagerOptions
  ): NewWindowManager {
    if (!NewWindowManager.instance) {
      if (!config) {
        throw new Error('首次创建 NewWindowManager 实例时必须提供配置')
      }
      NewWindowManager.instance = new NewWindowManager(config, options)
    }
    return NewWindowManager.instance
  }

  /**
   * 初始化窗口管理器
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.warn('NewWindowManager 已经初始化')
      return
    }

    try {
      log.info('初始化 NewWindowManager')

      // 等待子管理器初始化完成（如果需要）
      await this.initializeMainWindow()

      this.isInitialized = true
      emitEvent.emit('manager:initialized', { timestamp: Date.now() })

      log.info('NewWindowManager 初始化完成')
    } catch (error) {
      log.error('NewWindowManager 初始化失败:', error)
      throw error
    }
  }

  /**
   * 创建主窗口
   */
  public async createMainWindow(appConfig?: AppConfig): Promise<WindowOperationResult> {
    try {
      log.info('创建主窗口')

      if (this.mainWindow) {
        log.warn('主窗口已存在')
        return {
          success: true,
          windowId: this.mainWindow.id,
          data: { window: this.mainWindow, message: '主窗口已存在' }
        }
      }

      // 使用 BaseWindowController 创建主窗口
      const layoutConfig: MainWindowLayoutConfig = {
        totalBounds: this.config.layout.totalBounds,
        headerHeight: this.config.layout.headerHeight,
        contentBounds: this.config.layout.contentBounds,
        padding: this.config.layout.padding
      }

      const result = this.baseWindowController.createMainWindow(
        appConfig || {} as AppConfig,
        layoutConfig
      )

      if (!result.success || !result.data?.window) {
        throw new Error(result.error || '主窗口创建失败')
      }

      this.mainWindow = result.data.window as BaseWindow

      // 设置主窗口事件
      this.setupMainWindowEvents()

      // 暂时禁用背景阴影视图，改用前端实现
      // await this.createBackgroundShadowView()

      // 创建主视图
      await this.createMainView()

      // 触发主窗口创建事件
      emitEvent.emit('window:main-created', {
        windowId: this.mainWindow.id,
        timestamp: Date.now()
      })

      log.info(`主窗口创建成功，ID: ${this.mainWindow.id}`)

      return {
        success: true,
        windowId: this.mainWindow.id,
        data: { window: this.mainWindow }
      }
    } catch (error) {
      log.error('创建主窗口失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }


  public getMainViewId(): string {
    return 'main-view'
  }

  /**
   * 创建主视图
   */
  private async createMainView(): Promise<void> {
    try {
      if (!this.mainWindow) {
        throw new Error('主窗口未创建')
      }

      log.info('创建主视图')

      const viewId = this.getMainViewId()

      // 检查是否已经存在主视图
      const existingView = this.viewManager.getViewInfo(viewId)
      if (existingView) {
        log.info('主视图已存在')
        return
      }

      // 计算主视图的边界（填满整个窗口）
      const windowBounds = this.mainWindow.getBounds()
      const bounds = {
        x: 0,
        y: 0,
        width: windowBounds.width,
        height: windowBounds.height
      }

      // 准备主视图配置
      const mainViewConfig: WebContentsViewConfig = {
        id: viewId,
        type: ViewType.MAIN,
        bounds,
        lifecycle: {
          type: LifecycleType.FOREGROUND,
          persistOnClose: true
        },
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: true,
          webSecurity: true,
          preload: resolve(getDirname(import.meta.url), './preloads/basic.js')
        }
      }

      // 设置主页面URL
      if (process.env.NODE_ENV === 'development') {
        // 开发模式：使用开发服务器
        mainViewConfig.url = 'http://localhost:5173'
        log.info('加载开发环境内容: http://localhost:5173')
      } else {
        // 生产模式：使用构建后的文件
        const indexPath = resolve(getDirname(import.meta.url), '../renderer/index.html')
        mainViewConfig.url = `file://${indexPath.replace(/\\/g, '/')}`
        log.info(`加载生产环境内容: ${indexPath}`)
      }

      // 创建主视图
      const createResult = this.viewManager.createView(this.mainWindow, mainViewConfig)
      if (!createResult.success) {
        throw new Error(`创建主视图失败: ${createResult.error}`)
      }

      // 设置生命周期策略
      this.lifecycleManager.setLifecycleStrategy(viewId, mainViewConfig.lifecycle)

      // 切换到主视图并激活
      const switchResult = this.viewManager.switchToView(this.mainWindow.id, viewId)
      if (switchResult.success) {
        await this.handleViewActivated(viewId)
      }

      // 设置主视图的 webContents 和管理器引用
      const mainViewInfo = this.viewManager.getViewInfo(viewId)
      if (mainViewInfo?.view.webContents) {
        processEventCoordinator.setMainWebContents(mainViewInfo.view.webContents)
        processEventCoordinator.setNewWindowManager(this)
        log.info('主视图已设置为事件协调器目标')
      }

      log.info('主视图创建完成')
    } catch (error) {
      log.error('创建主视图失败:', error)
      throw error
    }
  }

  /**
   * 显示视图
   */
  public async showView(params: ViewOperationParams): Promise<ViewOperationResult> {
    try {
      if (!this.mainWindow) {
        throw new Error('主窗口未创建')
      }

      log.info(`显示视图: 类型=${params.type}, 强制新建=${params.forceNew}`)

      // 生成视图ID
      const viewId = this.generateViewId(params.type, params.config?.path)

      // 检查视图是否已存在
      let viewInfo = this.viewManager.getViewInfo(viewId)

      if (viewInfo && !params.forceNew) {
        // 视图已存在，切换到该视图
        const switchResult = this.viewManager.switchToView(this.mainWindow.id, viewId)
        if (switchResult.success) {
          await this.handleViewActivated(viewId)
          return switchResult
        }
      }

      // 创建新视图
      const viewConfig = this.prepareViewConfig(viewId, params)
      const createResult = this.viewManager.createView(this.mainWindow, viewConfig)

      if (!createResult.success) {
        throw new Error(createResult.error || '视图创建失败')
      }

      // 设置生命周期策略
      if (params.pluginItem) {
        const lifecycleStrategy = params.lifecycleStrategy ||
          this.lifecycleManager.inferLifecycleFromPlugin(params.pluginItem)

        this.lifecycleManager.setLifecycleStrategy(viewId, lifecycleStrategy, params.pluginItem)
      }

      // 切换到新创建的视图
      const switchResult = this.viewManager.switchToView(this.mainWindow.id, viewId)
      if (switchResult.success) {
        await this.handleViewActivated(viewId)
      }

      log.info(`视图显示成功: ${viewId}`)

      return {
        success: true,
        viewId,
        data: { created: true, switched: switchResult.success }
      }
    } catch (error) {
      log.error('显示视图失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 创建设置页面 WebContentsView
   */
  public async createSettingsView(): Promise<ViewOperationResult> {
    try {
      if (!this.mainWindow) {
        throw new Error('主窗口未创建')
      }

      log.info('创建设置页面 WebContentsView')

      const viewId = 'settings-view'

      // 检查是否已经存在设置视图
      const existingView = this.viewManager.getViewInfo(viewId)
      if (existingView) {
        // 如果已存在，直接切换到设置视图
        const switchResult = this.viewManager.switchToView(this.mainWindow.id, viewId)
        if (switchResult.success) {
          await this.handleViewActivated(viewId)
          // 延迟调整窗口高度，确保所有视图都准备就绪
          setTimeout(async () => {
            await this.adjustWindowForMaxHeight()
          }, 100)
        }
        return switchResult
      }

      // 计算设置视图的边界 - 使用统一配置
      const windowBounds = this.mainWindow.getBounds()
      const settingsBounds = calculateSettingsViewBounds(windowBounds)

      // 准备设置页面配置
      const settingsConfig: WebContentsViewConfig = {
        id: viewId,
        type: ViewType.SETTINGS,
        bounds: settingsBounds,
        lifecycle: {
          type: 'FOREGROUND' as any,
          persistOnClose: false
        },
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: true,
          webSecurity: true,
          preload: resolve(getDirname(import.meta.url), './preloads/basic.js')
        }
      }

      // 设置页面URL - 使用独立的设置页面
      if (process.env.NODE_ENV === 'development') {
        // 开发模式：使用开发服务器的设置页面路径
        settingsConfig.url = 'http://localhost:5173/src/pages/settings/'
        log.info('加载开发环境设置页面: http://localhost:5173/src/pages/settings/')
      } else {
        // 生产模式：使用构建后的独立设置页面文件
        const settingsPath = resolve(getDirname(import.meta.url), '../renderer/settings.html')
        settingsConfig.url = `file://${settingsPath.replace(/\\/g, '/')}`
        log.info(`加载生产环境设置页面: ${settingsPath}`)
      }

      // 创建视图
      const createResult = this.viewManager.createView(this.mainWindow, settingsConfig)
      if (!createResult.success) {
        throw new Error(`创建设置视图失败: ${createResult.error}`)
      }

      // 设置生命周期策略
      this.lifecycleManager.setLifecycleStrategy(viewId, settingsConfig.lifecycle)

      // 等待视图完全创建
      await new Promise(resolve => setTimeout(resolve, 50))

      // 切换到设置视图（使用新的多视图布局）
      const switchResult = this.viewManager.switchToView(this.mainWindow.id, viewId)
      if (switchResult.success) {
        await this.handleViewActivated(viewId)

        // 延迟调整窗口高度，确保视图布局完成并避免与前端高度调整冲突
        setTimeout(async () => {
          log.info('延迟调整窗口到最大高度（设置模式）')
          await this.adjustWindowForMaxHeight()
        }, 150)
      }

      log.info('设置页面 WebContentsView 创建成功')

      return {
        success: true,
        viewId,
        data: { created: true, switched: switchResult.success }
      }
    } catch (error) {
      log.error('创建设置页面失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 调整窗口高度为最大高度模式
   * 用于设置页面和插件窗口
   * 优先级高于前端的高度调整请求
   */
  private async adjustWindowForMaxHeight(): Promise<void> {
    try {
      if (!this.mainWindow) {
        log.error('主窗口未创建')
        return
      }

      // 清除任何待处理的高度调整
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout)
        this.resizeTimeout = null
      }

      const currentBounds = this.mainWindow.getBounds()
      const maxHeight = DEFAULT_WINDOW_LAYOUT.contentMaxHeight + DEFAULT_WINDOW_LAYOUT.searchHeaderHeight + DEFAULT_WINDOW_LAYOUT.appPadding * 2

      const newBounds = {
        ...currentBounds,
        height: maxHeight,
        width: DEFAULT_WINDOW_LAYOUT.windowWidth
      }

      this.mainWindow.setBounds(newBounds)

      // 使用统一的视图布局更新方法
      this.updateAllViewsLayout(newBounds)

      log.info(`窗口高度已调整为最大高度模式: ${maxHeight}px（优先级调整）`)
    } catch (error) {
      log.error('调整窗口高度失败:', error)
    }
  }

  /**
   * 调整窗口高度为搜索模式（只有搜索框）
   */
  private async adjustWindowForSearchMode(): Promise<void> {
    try {
      if (!this.mainWindow) {
        log.error('主窗口未创建')
        return
      }

      const currentBounds = this.mainWindow.getBounds()
      const searchOnlyHeight = 60 // 只有搜索框的高度

      const newBounds = {
        ...currentBounds,
        height: searchOnlyHeight
      }

      this.mainWindow.setBounds(newBounds)
      log.info(`窗口高度已调整为搜索模式: ${searchOnlyHeight}px`)
    } catch (error) {
      log.error('调整窗口高度失败:', error)
    }
  }

  /**
   * 动态调整窗口高度
   * 直接使用前端传递的高度，并使用配置文件中的布局设置
   * 添加防抖机制避免频繁调整
   * @param targetHeight 前端计算的目标高度
   */
  public async adjustWindowHeight(targetHeight: number): Promise<void> {
    try {
      if (!this.mainWindow) {
        log.error('主窗口未创建')
        return
      }

      // 清除之前的定时器
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout)
      }

      // 使用防抖机制，延迟执行高度调整
      this.resizeTimeout = setTimeout(async () => {
        try {
          const currentBounds = this.mainWindow!.getBounds()

          // 直接使用前端传递的高度，不做额外的计算
          const finalHeight = targetHeight

          // 只有高度变化时才调整
          if (Math.abs(currentBounds.height - finalHeight) > 5) {
            const newBounds = {
              ...currentBounds,
              height: finalHeight,
              width: DEFAULT_WINDOW_LAYOUT.windowWidth // 确保宽度也符合配置
            }

            this.mainWindow!.setBounds(newBounds)

            // 使用统一的视图布局更新方法
            this.updateAllViewsLayout(newBounds)

            log.info(`窗口高度已调整: ${currentBounds.height} -> ${finalHeight}px (使用配置: ${DEFAULT_WINDOW_LAYOUT.windowWidth}x${finalHeight})`)
          }
        } catch (error) {
          log.error('防抖调整窗口高度失败:', error)
        }
      }, 50) // 50ms防抖延迟
    } catch (error) {
      log.error('动态调整窗口高度失败:', error)
    }
  }

  /**
   * 关闭设置页面 WebContentsView
   */
  public async closeSettingsView(): Promise<ViewOperationResult> {
    try {
      const viewId = 'settings-view'

      log.info('关闭设置页面 WebContentsView')

      // 移除视图
      const removeResult = this.viewManager.removeView(viewId)
      if (removeResult.success) {
        // TODO: 清理生命周期管理（需要检查LifecycleManager的API）
        // this.lifecycleManager.removeView(viewId)

        // 切换回主视图
        const switchResult = this.viewManager.switchToView(this.mainWindow!.id, 'main-view')
        if (switchResult.success) {
          await this.handleViewActivated('main-view')
          // 恢复窗口为搜索模式的高度
          await this.adjustWindowForSearchMode()
        }

        log.info('设置页面 WebContentsView 关闭成功')
      }

      return removeResult
    } catch (error) {
      log.error('关闭设置页面失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 隐藏视图
   */
  public async hideView(viewId: string): Promise<ViewOperationResult> {
    try {
      log.info(`隐藏视图: ${viewId}`)

      if (!this.mainWindow) {
        throw new Error('主窗口未创建')
      }

      // 隐藏视图（需要检查ViewManager的正确API）
      // TODO: 修复ViewManager.hideView方法调用
      try {
        // this.viewManager.hideView(viewId)
        log.info(`视图 ${viewId} 准备隐藏`)
      } catch (error) {
        log.warn(`隐藏视图时出现问题: ${error}`)
      }

      // 处理生命周期
      const lifecycleResult = await this.lifecycleManager.handleViewClose(viewId)
      if (!lifecycleResult.success) {
        log.warn(`生命周期处理失败: ${viewId}, 错误: ${lifecycleResult.error}`)
      }

      // 更新活跃视图
      if (this.activeViewId === viewId) {
        this.activeViewId = null
      }

      log.info(`视图隐藏成功: ${viewId}`)

      return {
        success: true,
        viewId,
        data: { hidden: true, lifecycleHandled: lifecycleResult.success }
      }
    } catch (error) {
      log.error(`隐藏视图失败: ${viewId}`, error)
      return {
        success: false,
        viewId,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 移除视图
   */
  public async removeView(viewId: string): Promise<ViewOperationResult> {
    try {
      log.info(`移除视图: ${viewId}`)

      if (!this.mainWindow) {
        throw new Error('主窗口未创建')
      }

      // 先处理生命周期（如果是前台模式，会销毁视图）
      const lifecycleResult = await this.lifecycleManager.handleViewClose(viewId)

      // 从视图管理器中移除
      const removeResult = this.viewManager.removeView(viewId)

      // 更新活跃视图
      if (this.activeViewId === viewId) {
        this.activeViewId = null
      }

      log.info(`视图移除完成: ${viewId}`)

      return {
        success: true,
        viewId,
        data: {
          removed: removeResult.success,
          lifecycleHandled: lifecycleResult.success
        }
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
   * 分离视图到独立窗口
   */
  public async detachView(viewId: string, config?: Partial<DetachedWindowConfig>): Promise<ViewOperationResult> {
    try {
      log.info(`分离视图: ${viewId}`)

      if (!this.mainWindow) {
        throw new Error('主窗口未创建')
      }

      // 获取视图信息
      const viewInfo = this.viewManager.getViewInfo(viewId)
      if (!viewInfo) {
        throw new Error('视图不存在')
      }

      // 执行分离操作
      const detachResult = await this.detachManager.detachView(
        viewInfo,
        this.mainWindow.id,
        config
      )

      if (!detachResult.success) {
        throw new Error(detachResult.error || '视图分离失败')
      }

      // 从主窗口移除视图
      await this.removeView(viewId)

      log.info(`视图分离成功: ${viewId}`)

      return {
        success: true,
        viewId,
        data: {
          detached: true,
          detachedWindowId: detachResult.detachedWindow?.windowId
        }
      }
    } catch (error) {
      log.error(`分离视图失败: ${viewId}`, error)
      return {
        success: false,
        viewId,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 重新附加分离的视图
   */
  public async reattachView(detachedWindowId: number): Promise<ViewOperationResult> {
    try {
      log.info(`重新附加视图: 窗口ID ${detachedWindowId}`)

      if (!this.mainWindow) {
        throw new Error('主窗口未创建')
      }

      // 执行重新附加操作
      const reattachResult = await this.detachManager.reattachView(
        detachedWindowId,
        this.mainWindow.id
      )

      if (!reattachResult.success) {
        throw new Error(reattachResult.error || '重新附加失败')
      }

      log.info(`视图重新附加成功: 窗口ID ${detachedWindowId}`)

      return reattachResult
    } catch (error) {
      log.error(`重新附加视图失败: 窗口ID ${detachedWindowId}`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 切换视图
   */
  public async switchToView(viewId: string): Promise<ViewOperationResult> {
    try {
      log.info(`切换到视图: ${viewId}`)

      if (!this.mainWindow) {
        throw new Error('主窗口未创建')
      }

      // 执行切换
      const switchResult = this.viewManager.switchToView(this.mainWindow.id, viewId)

      if (switchResult.success) {
        await this.handleViewActivated(viewId)
      }

      return switchResult
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
   * 获取活跃视图
   */
  public getActiveView(): WebContentsViewInfo | null {
    if (!this.activeViewId) {
      return null
    }
    return this.viewManager.getViewInfo(this.activeViewId) || null
  }

  /**
   * 获取所有视图
   */
  public getAllViews(): WebContentsViewInfo[] {
    return this.viewManager.getAllViews()
  }

  /**
   * 获取视图管理器
   */
  public getViewManager(): ViewManager {
    return this.viewManager
  }

  /**
   * 获取主窗口
   */
  public getMainWindow(): BaseWindow | null {
    return this.mainWindow
  }

  /**
   * 获取生命周期管理器
   */
  public getLifecycleManager(): LifecycleManager {
    return this.lifecycleManager
  }

  /**
   * 销毁主窗口及相关资源
   */
  public async destroyMainWindow(): Promise<WindowOperationResult> {
    try {
      if (!this.mainWindow) {
        return { success: true }
      }

      const windowId = this.mainWindow.id

      // 移除所有视图并处理生命周期
      const views = this.viewManager.getWindowViews(windowId)
      for (const viewInfo of views) {
        const lifecycleResult = await this.lifecycleManager.handleViewClose(viewInfo.id)
        if (!lifecycleResult.success) {
          log.warn(`视图生命周期结束失败: ${viewInfo.id} -> ${lifecycleResult.error}`)
        }

        const removeResult = this.viewManager.removeView(viewInfo.id)
        if (!removeResult.success) {
          log.warn(`移除视图失败: ${viewInfo.id} -> ${removeResult.error}`)
        }
      }

      // 销毁 BaseWindow
      const result = this.baseWindowController.destroyWindow(windowId)
      if (!result.success) {
        return result
      }

      // 完全销毁窗口管理器及资源
      this.destroy()

      log.info('主窗口及关联视图已销毁')
      return { success: true, windowId }
    } catch (error) {
      log.error('销毁主窗口失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 获取性能指标
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    // TODO: 修复性能指标获取API
    try {
      const lifecycleMetrics = this.lifecycleManager.getPerformanceMetrics()
      const mainWindowId = this.mainWindow?.id
      const viewMetrics = mainWindowId ? this.viewManager.getPerformanceMetrics(mainWindowId) : undefined

      // 整合 lifecycle 和 view 的性能指标
      const memoryUsage = Math.max(
        lifecycleMetrics.memoryUsage || 0,
        viewMetrics?.memoryUsage || 0
      )

      const activeViewCount = Math.max(
        lifecycleMetrics.activeViewCount || 0,
        viewMetrics?.activeViewCount || 0
      )

      const cpuUsage = Math.max(
        lifecycleMetrics.cpuUsage || 0,
        viewMetrics?.cpuUsage || 0
      )

      return {
        switchTime: 0, // TODO: 实现视图切换耗时统计
        memoryUsage,
        activeViewCount,
        cpuUsage,
        lastUpdated: Date.now()
      }
    } catch (error) {
      log.warn('获取性能指标失败:', error)
      return {
        switchTime: 0,
        memoryUsage: 0,
        activeViewCount: 0,
        cpuUsage: 0,
        lastUpdated: Date.now()
      }
    }
  }

  /**
   * 获取统计信息
   */
  public getStatistics(): {
    windows: { main: number; detached: number }
    views: { total: number; active: number; paused: number }
    memory: { usage: number; threshold: number }
    performance: PerformanceMetrics
  } {
    const lifecycleStats = this.lifecycleManager.getStatistics()
    const detachStats = this.detachManager.getStatistics()
    const performance = this.getPerformanceMetrics()

    return {
      windows: {
        main: this.mainWindow ? 1 : 0,
        detached: detachStats.totalDetachedWindows
      },
      views: {
        total: lifecycleStats.totalViews,
        active: lifecycleStats.activeViews,
        paused: lifecycleStats.pausedViews
      },
      memory: {
        usage: lifecycleStats.totalMemoryUsage,
        threshold: this.options.memoryManagement?.threshold || 1000
      },
      performance
    }
  }

  /**
   * 清理后台视图
   */
  public async cleanupBackgroundViews(): Promise<void> {
    try {
      log.info('开始清理后台视图')

      const report = await this.lifecycleManager.cleanupBackgroundViews()

      emitEvent.emit('cleanup:completed', {
        report,
        timestamp: Date.now()
      })

      log.info(`后台视图清理完成，释放内存: ${report.freedMemory.toFixed(1)}MB`)
    } catch (error) {
      log.error('清理后台视图失败:', error)
    }
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<WindowManagerConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // 更新子管理器配置
    this.lifecycleManager.updateConfig({
      memoryRecycleThreshold: newConfig.memoryRecycleThreshold,
      autoRecycleInterval: newConfig.autoRecycleInterval
    })

    log.info('窗口管理器配置已更新')
  }

  /**
   * 初始化子管理器
   */
  private initializeSubManagers(): void {
    this.baseWindowController = BaseWindowController.getInstance()
    this.viewManager = ViewManager.getInstance()
    this.lifecycleManager = LifecycleManager.getInstance()
    this.detachManager = DetachManager.getInstance()
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 设置分离管理器事件
    emitEvent.on('view:reattach-requested', async (data) => {
      // 处理重新附加请求
      await this.handleReattachRequest(data)
    })

    // 设置生命周期管理器事件
    emitEvent.on('lifecycle:cleanup-completed', (data) => {
      emitEvent.emit('cleanup:completed', { report: data.report, timestamp: Date.now() })
    })

    // 设置视图管理器事件
    emitEvent.on('view:switched', (data) => {
      this.handleViewSwitched(data)
    })
  }

  /**
   * 初始化主窗口（如果需要）
   */
  private async initializeMainWindow(): Promise<void> {
    // 这里可以添加主窗口的预初始化逻辑
    // 目前保持空实现，主窗口在需要时通过 createMainWindow 创建
  }

  /**
   * 设置主窗口事件
   */
  private setupMainWindowEvents(): void {
    if (!this.mainWindow) return

    // 窗口关闭事件
    this.mainWindow.on('closed', () => {
      this.handleMainWindowClosed()
    })

    // 窗口失焦事件
    this.mainWindow.on('blur', () => {
      emitEvent.emit('window:main-blurred', { windowId: this.mainWindow!.id, timestamp: Date.now() })
    })

    // 窗口聚焦事件
    this.mainWindow.on('focus', () => {
      emitEvent.emit('window:main-focused', { windowId: this.mainWindow!.id, timestamp: Date.now() })
    })
  }


  /**
   * 生成视图ID
   */
  private generateViewId(type: ViewType, path?: string): string {
    if (type === ViewType.PLUGIN && path) {
      return `plugin:${path}`
    }
    return `${type}:${Date.now()}`
  }

  /**
   * 准备视图配置
   */
  private prepareViewConfig(viewId: string, params: ViewOperationParams): WebContentsViewConfig {
    const bounds = this.calculateViewBounds()

    const config: WebContentsViewConfig = {
      id: viewId,
      type: params.type,
      bounds,
      lifecycle: params.lifecycleStrategy || this.config.defaultLifecycle,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        webSecurity: true,
        ...(params.config?.preload && { preload: params.config.preload })
      },
      ...params.config
    }


    // 添加插件元数据
    if (params.pluginItem) {
      config.pluginMetadata = {
        path: params.pluginItem.path,
        name: params.pluginItem.name
      }
    }

    return config
  }

  /**
   * 计算视图边界
   */
  private calculateViewBounds(): Rectangle {
    const layout = this.config.layout
    return {
      x: layout.contentBounds.x,
      y: layout.contentBounds.y,
      width: layout.contentBounds.width,
      height: layout.contentBounds.height
    }
  }

  /**
   * 更新所有视图的布局以适应新的窗口大小
   * 统一处理视图边界计算，避免重复代码
   * @param newBounds 新的窗口边界
   */
  private updateAllViewsLayout(newBounds: { width: number; height: number }): void {
    if (!this.mainWindow) return

    const windowViews = this.viewManager.getWindowViews(this.mainWindow.id)

    windowViews.forEach((viewInfo) => {
      // 跳过已分离的视图
      if (this.detachManager.isViewDetached(viewInfo.id)) {
        log.debug(`跳过已分离视图的布局更新: ${viewInfo.id}`)
        return
      }

      if (viewInfo.id === 'main-view') {
        // 主视图占满整个窗口
        const mainViewBounds = {
          x: 0,
          y: 0,
          width: newBounds.width,
          height: newBounds.height
        }
        viewInfo.view.setBounds(mainViewBounds)
        viewInfo.config.bounds = mainViewBounds
      } else {
        // 其他视图（设置页面、插件等）使用设置视图的布局计算
        const settingsBounds = calculateSettingsViewBounds(newBounds)
        viewInfo.view.setBounds(settingsBounds)
        viewInfo.config.bounds = settingsBounds
      }
    })

    log.debug(`已更新 ${windowViews.length} 个视图的布局`)
  }

  /**
   * 处理视图激活
   */
  private async handleViewActivated(viewId: string): Promise<void> {
    this.activeViewId = viewId

    // 更新生命周期管理器的访问时间
    this.lifecycleManager.updateViewAccess(viewId)

    emitEvent.emit('view:activated', {
      viewId,
      windowId: this.mainWindow?.id || 0,
      timestamp: Date.now()
    })
  }

  /**
   * 处理视图切换
   */
  private handleViewSwitched(data: any): void {
    this.activeViewId = data.toViewId
    // 注意：不要在这里重复发出 view:switched 事件，避免无限循环
    // 这个方法是响应 view:switched 事件的，不应该再发出同样的事件
    log.debug(`视图切换处理完成: ${data.fromViewId || 'unknown'} -> ${data.toViewId}`)
  }

  /**
   * 处理重新附加请求
   */
  private async handleReattachRequest(data: any): Promise<void> {
    try {
      // 这里可以实现重新附加的具体逻辑
      // 例如重新创建视图并加载内容
      log.info(`处理重新附加请求: ${data.sourceViewId}`)

      // 触发重新附加完成事件
      emitEvent.emit('view:reattached', {
        viewId: data.viewId,
        fromWindowId: data.detachedWindowId || 0,
        toWindowId: data.targetWindowId,
        timestamp: Date.now()
      })
    } catch (error) {
      log.error('处理重新附加请求失败:', error)
    }
  }

  /**
   * 处理主窗口关闭
   */
  private handleMainWindowClosed(): void {
    log.info('主窗口已关闭')


    emitEvent.emit('window:main-closed', {
      windowId: this.mainWindow!.id,
      timestamp: Date.now()
    })

    this.mainWindow = null
    this.activeViewId = null

    // 清理所有资源
    this.cleanup()
  }

  /**
   * 开始性能监控
   */
  private startPerformanceMonitoring(): void {
    if (!this.options.performanceMonitorInterval) return

    this.performanceTimer = setInterval(() => {
      this.checkPerformance()
    }, this.options.performanceMonitorInterval)
  }

  /**
   * 检查性能
   */
  private checkPerformance(): void {
    const metrics = this.getPerformanceMetrics()
    const memoryThreshold = this.options.memoryManagement?.threshold || 1000

    // 检查内存使用
    if (metrics.memoryUsage > memoryThreshold) {
      log.warn(`内存使用超过阈值: ${metrics.memoryUsage}MB > ${memoryThreshold}MB`)

      // 触发内存清理
      this.cleanupBackgroundViews()
    }

    // 触发性能监控事件
    emitEvent.emit('performance:metrics', {
      windowId: this.mainWindow?.id || 0,
      metrics,
      timestamp: Date.now()
    })
  }


  /**
   * 清理资源
   */
  private cleanup(): void {
    log.info('清理 NewWindowManager 资源')

    // 停止性能监控
    if (this.performanceTimer) {
      clearInterval(this.performanceTimer)
      this.performanceTimer = undefined
    }

  }

  /**
   * 创建插件视图
   * 这是一个为插件系统优化的便利函数
   */
  public async createPluginView(params: {
    path: string
    title: string
    url: string
    lifecycleType: LifecycleType
    preload?: string
  }): Promise<ViewOperationResult> {
    try {
      if (!this.mainWindow) throw new Error('主窗口未创建')

      // 构建插件项目信息
      const pluginItem: PluginItem = {
        path: params.path,
        name: params.title,
        icon: null,
        lifecycleType: params.lifecycleType
      }

      // 确定生命周期类型
      const lifecycleType = params.lifecycleType

      // 处理 preload 脚本合并
      const defaultPreloadPath = resolve(getDirname(import.meta.url), './preloads/basic.js')
      let finalPreloadPath: string = defaultPreloadPath
      if (params.preload) {
        try {
          // 创建合并的 preload 脚本
          finalPreloadPath = await createCombinedPreloadScript(params.preload, defaultPreloadPath)
          log.info(`插件 preload 脚本已合并: ${params.path} -> ${finalPreloadPath}`)
        } catch (error) {
          log.warn(`合并插件 preload 脚本失败，使用默认脚本: ${params.path}`, error)
          finalPreloadPath = defaultPreloadPath
        }
      }

      const result = await this.showView({
        type: ViewType.PLUGIN,
        config: {
          url: params.url,
          path: params.path,
          preload: finalPreloadPath
        },
        pluginItem,
        forceNew: false,
        lifecycleStrategy: {
          type: lifecycleType,
          persistOnClose: params.lifecycleType === LifecycleType.BACKGROUND,
          maxIdleTime: 5 * 60 * 1000,
          memoryThreshold: 100
        }
      })

      if (result.success) {
        log.info(`插件视图创建成功: ${result.viewId} (${params.title})`)

        // 通知主渲染进程插件视图已打开
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          // 获取主视图的 webContents
          const mainViewInfo = this.viewManager.getViewInfo('main-view')
          if (mainViewInfo) {
            sendPluginViewOpened(mainViewInfo.view.webContents, {
              pluginId: params.path,
              viewId: result.viewId!,
              windowId: this.mainWindow!.id,
              timestamp: Date.now()
            })
            log.debug(`已通知主渲染进程插件视图打开: ${result.viewId}`)
          }
        }
      }

      return result
    } catch (error) {
      log.error('创建插件视图失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 关闭插件视图
   */
  public async closePluginView(viewId: string): Promise<ViewOperationResult> {
    try {
      const result = await this.removeView(viewId)

      if (result.success) {
        log.info(`插件视图关闭成功: ${viewId}`)

        // 通知主渲染进程插件视图已关闭
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          // 获取主视图的 webContents
          const mainViewInfo = this.viewManager.getViewInfo('main-view')
          if (mainViewInfo) {
            sendPluginViewClosed(mainViewInfo.view.webContents, {
              pluginId: '', // 需要从视图信息中获取
              viewId,
              windowId: this.mainWindow!.id,
              timestamp: Date.now()
            })
          }
          log.debug(`已通知主渲染进程插件视图关闭: ${viewId}`)
        }
      }

      return result
    } catch (error) {
      log.error('关闭插件视图失败:', error)
      return {
        success: false,
        viewId,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    log.info('销毁 NewWindowManager')

    // 清理定时器
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout)
      this.resizeTimeout = null
    }

    // 清理资源
    this.cleanup()

    // 销毁子管理器
    this.lifecycleManager.destroy()
    this.detachManager.destroy()

    // 重置状态
    this.mainWindow = null
    this.activeViewId = null
    this.isInitialized = false

    // 重置单例
    NewWindowManager.instance = null as any
  }
}
