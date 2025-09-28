/**
 * BaseWindow 控制器
 * 专门处理 BaseWindow 的创建和基本属性控制
 */

import { BaseWindow, screen } from 'electron'
import log from 'electron-log'
import type {
  BaseWindowConfig,
  MainWindowLayoutConfig,
  DetachedWindowConfig,
  WindowOperationResult,
  HiddenWindowPosition
} from './window-types'
import type { AppConfig } from '@shared/types'
import { isProduction } from '@shared/utils'

/**
 * BaseWindow 控制器类
 * 提供 BaseWindow 的底层创建和管理能力
 */
export class BaseWindowController {
  private static instance: BaseWindowController
  private createdWindows: Map<number, BaseWindow> = new Map()
  private hiddenWindowPositions: Map<number, HiddenWindowPosition> = new Map()
  private defaultConfig: Partial<BaseWindowConfig> = {}

  private constructor() {
    this.initializeDefaultConfig()
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): BaseWindowController {
    if (!BaseWindowController.instance) {
      BaseWindowController.instance = new BaseWindowController()
    }
    return BaseWindowController.instance
  }

  /**
   * 初始化默认配置
   */
  private initializeDefaultConfig(): void {
    this.defaultConfig = {
      frame: false,
      resizable: true,
      transparent: true,
      backgroundColor: 'rgba(0, 0, 0, 0)', // 完全透明背景
      skipTaskbar: isProduction() ? true : false,
      hasShadow: false, // 禁用系统阴影，使用 CSS 阴影
      alwaysOnTop: false,
    }
  }

  /**
   * 创建主窗口
   * @param config 应用配置
   * @param layoutConfig 布局配置
   * @returns 窗口操作结果
   */
  public createMainWindow(
    config: AppConfig,
    layoutConfig?: MainWindowLayoutConfig
  ): WindowOperationResult {
    try {
      log.info('开始创建 BaseWindow 主窗口')

      const windowConfig: BaseWindowConfig = {
        bounds: {
          x: 0,
          y: 0,
          width: config.windowSize.width,
          height: config.windowSize.height
        },
        title: 'Naimo Tools',
        ...this.defaultConfig
      }

      // 如果有布局配置，使用布局配置的边界
      if (layoutConfig) {
        windowConfig.bounds = layoutConfig.totalBounds
      }

      const window = this.createBaseWindow(windowConfig)

      if (!window) {
        throw new Error('BaseWindow 创建失败')
      }

      // 设置窗口位置为屏幕居中
      this.centerWindow(window)

      // 应用窗口样式（圆角和阴影）
      this.applyWindowStyling(window)

      // 设置窗口事件
      this.setupMainWindowEvents(window)

      // 记录创建的窗口
      this.createdWindows.set(window.id, window)

      log.info(`BaseWindow 主窗口创建成功，ID: ${window.id}`)

      return {
        success: true,
        windowId: window.id,
        data: { window, config: windowConfig }
      }
    } catch (error) {
      log.error('创建 BaseWindow 主窗口失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 创建分离窗口
   * @param config 分离窗口配置
   * @returns 窗口操作结果
   */
  public createDetachedWindow(config: DetachedWindowConfig): WindowOperationResult {
    try {
      log.info(`开始创建分离窗口: ${config.title}`)

      const windowConfig: BaseWindowConfig = {
        bounds: config.bounds,
        title: config.title,
        frame: config.showControlBar,
        resizable: true,
        alwaysOnTop: false,
        ...this.defaultConfig
      }

      const window = this.createBaseWindow(windowConfig)

      if (!window) {
        throw new Error('分离窗口创建失败')
      }

      // 设置分离窗口事件
      this.setupDetachedWindowEvents(window, config)

      // 记录创建的窗口
      this.createdWindows.set(window.id, window)

      log.info(`分离窗口创建成功，ID: ${window.id}`)

      return {
        success: true,
        windowId: window.id,
        data: { window, config: windowConfig }
      }
    } catch (error) {
      log.error('创建分离窗口失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 创建 BaseWindow 实例
   * @param config BaseWindow 配置
   * @returns BaseWindow 实例或 null
   */
  private createBaseWindow(config: BaseWindowConfig): BaseWindow | null {
    try {
      const options: any = {
        x: config.bounds.x,
        y: config.bounds.y,
        width: config.bounds.width,
        height: config.bounds.height,
        title: config.title,
        resizable: config.resizable,
        frame: config.frame,
        alwaysOnTop: config.alwaysOnTop,
        transparent: config.transparent,
        backgroundColor: config.backgroundColor,
        skipTaskbar: config.skipTaskbar,
        hasShadow: config.hasShadow,
      }

      // 移除 undefined 值
      Object.keys(options).forEach(key => {
        if (options[key] === undefined) {
          delete options[key]
        }
      })

      const window = new BaseWindow(options)
      log.debug(`BaseWindow 创建成功: ${JSON.stringify(options)}`)

      return window
    } catch (error) {
      log.error('BaseWindow 创建失败:', error)
      return null
    }
  }

  /**
   * 设置窗口边界
   * @param window BaseWindow 实例
   * @param bounds 新边界
   * @returns 操作结果
   */
  public setWindowBounds(window: BaseWindow, bounds: Partial<{
    x: number, y: number, width: number, height: number
  }>): WindowOperationResult {
    try {
      const currentBounds = window.getBounds()
      const newBounds = {
        x: bounds.x ?? currentBounds.x,
        y: bounds.y ?? currentBounds.y,
        width: bounds.width ?? currentBounds.width,
        height: bounds.height ?? currentBounds.height
      }

      window.setBounds(newBounds)

      log.debug(`窗口边界已更新: ID=${window.id}, bounds=${JSON.stringify(newBounds)}`)

      return {
        success: true,
        windowId: window.id,
        data: newBounds
      }
    } catch (error) {
      log.error('设置窗口边界失败:', error)
      return {
        success: false,
        windowId: window.id,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 居中窗口
   * @param window BaseWindow 实例
   */
  public centerWindow(window: BaseWindow): void {
    try {
      const bounds = window.getBounds()
      const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

      const x = Math.floor((screenWidth - bounds.width) / 2)
      const y = Math.floor((screenHeight - bounds.height) / 2)

      window.setPosition(x, y)

      log.debug(`窗口已居中: ID=${window.id}, position=(${x}, ${y})`)
    } catch (error) {
      log.error('居中窗口失败:', error)
    }
  }

  /**
   * 显示窗口
   * @param window BaseWindow 实例
   */
  public showWindow(window: BaseWindow): void {
    try {
      const [currentX] = window.getPosition()

      // 如果窗口当前是隐藏状态（x < 0），恢复到之前的可见位置
      if (currentX < 0) {
        const cachedPosition = this.hiddenWindowPositions.get(window.id)
        if (cachedPosition) {
          window.setPosition(cachedPosition.x, cachedPosition.y)
          this.hiddenWindowPositions.delete(window.id) // 清除缓存
          log.debug(`窗口已显示并恢复位置: ID=${window.id}, position=(${cachedPosition.x}, ${cachedPosition.y})`)
        } else {
          // 没有缓存位置，居中显示
          this.centerWindow(window)
          log.debug(`窗口已显示并居中: ID=${window.id}`)
        }
      } else {
        log.debug(`窗口已是显示状态: ID=${window.id}`)
      }
    } catch (error) {
      log.error('显示窗口失败:', error)
    }
  }

  /**
   * 隐藏窗口
   * @param window BaseWindow 实例
   */
  public hideWindow(window: BaseWindow): void {
    try {
      const [x, y] = window.getPosition()

      // 只有当窗口当前是可见状态时才缓存位置
      if (x >= 0) {
        this.hiddenWindowPositions.set(window.id, { x, y })
        log.debug(`缓存窗口显示位置: ID=${window.id}, position=(${x}, ${y})`)
      }

      // 将窗口移到屏幕外隐藏
      const hiddenX = x - 8000
      window.setPosition(hiddenX, y)

      log.debug(`窗口已隐藏: ID=${window.id}`)
    } catch (error) {
      log.error('隐藏窗口失败:', error)
    }
  }

  /**
   * 检查窗口是否可见
   * @param window BaseWindow 实例
   * @returns 是否可见
   */
  public isWindowVisible(window: BaseWindow): boolean {
    try {
      const [x] = window.getPosition()
      return x >= 0
    } catch (error) {
      log.error('检查窗口可见性失败:', error)
      return false
    }
  }

  /**
   * 销毁窗口
   * @param windowId 窗口ID
   * @returns 操作结果
   */
  public destroyWindow(windowId: number): WindowOperationResult {
    try {
      const window = this.createdWindows.get(windowId)
      if (!window) return { success: false, windowId, error: '窗口不存在' }
      if (!window.isDestroyed()) window.destroy()
      this.createdWindows.delete(windowId)
      this.hiddenWindowPositions.delete(windowId)
      log.info(`窗口已销毁: ID=${windowId}`)
      return { success: true, windowId }
    } catch (error) {
      log.error('销毁窗口失败:', error)
      return { success: false, windowId, error: error instanceof Error ? error.message : '未知错误' }
    }
  }

  /**
   * 获取窗口实例
   * @param windowId 窗口ID
   * @returns BaseWindow 实例或 undefined
   */
  public getWindow(windowId: number): BaseWindow | undefined {
    return this.createdWindows.get(windowId)
  }

  /**
   * 获取所有创建的窗口
   * @returns 窗口映射
   */
  public getAllWindows(): Map<number, BaseWindow> {
    return new Map(this.createdWindows)
  }


  /**
   * 应用窗口样式（透明背景，为 CSS 阴影做准备）
   * @param window BaseWindow 实例
   */
  private applyWindowStyling(window: BaseWindow): void {
    try {
      // 设置完全透明背景，让 CSS 阴影可见
      window.setBackgroundColor('rgba(0, 0, 0, 0)')

      log.debug(`窗口透明背景设置完成: ${window.id}`)
    } catch (error) {
      log.error('应用窗口样式失败:', error)
    }
  }

  /**
   * 设置主窗口事件
   * @param window BaseWindow 实例
   */
  private setupMainWindowEvents(window: BaseWindow): void {
    // 窗口关闭处理
    window.on('closed', () => {
      log.info(`BaseWindow 主窗口已关闭: ID=${window.id}`)
      this.createdWindows.delete(window.id)
      this.hiddenWindowPositions.delete(window.id)
    })

    // 开发环境下的额外设置
    if (!isProduction()) {
      log.debug('BaseWindow 主窗口开发模式设置')
    }

    log.info('BaseWindow 主窗口事件设置完成')
  }

  /**
   * 设置分离窗口事件
   * @param window BaseWindow 实例
   * @param config 分离窗口配置
   */
  private setupDetachedWindowEvents(window: BaseWindow, config: DetachedWindowConfig): void {
    // 窗口关闭处理
    window.on('closed', () => {
      log.info(`分离窗口已关闭: ${config.title}, ID=${window.id}`)
      this.createdWindows.delete(window.id)
      this.hiddenWindowPositions.delete(window.id)
    })

    log.info(`分离窗口事件设置完成: ${config.title}`)
  }

  /**
   * 清理所有窗口
   */
  public cleanup(): void {
    log.info('开始清理所有 BaseWindow')

    this.createdWindows.forEach((window, id) => {
      try {
        if (!window.isDestroyed()) {
          window.destroy()
        }
      } catch (error) {
        log.error(`清理窗口失败 ID=${id}:`, error)
      }
    })

    this.createdWindows.clear()
    this.hiddenWindowPositions.clear()

    log.info('BaseWindow 清理完成')
  }
}
