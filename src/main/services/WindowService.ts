/**
 * 窗口服务 - 聚合和管理所有窗口相关的服务
 */

import { BaseWindow, BrowserWindow, screen } from 'electron'
import log from 'electron-log'
import { NewWindowManager } from '../window/NewWindowManager'
import { AppConfigManager } from '../config/appConfig'
import { DownloadManagerMain, StorageProvider } from '@libs/download-manager/main'
import type { Service } from '../core/ServiceContainer'
import type { WindowManagerConfig } from '@renderer/src/typings/windowTypes'
import { LifecycleType, ViewType } from '@renderer/src/typings/windowTypes'
import { WebContentsViewInfo } from '@main/typings/windowTypes'

/**
 * 窗口服务配置
 */
export interface WindowServiceConfig {
  mainWindow?: {
    width?: number
    height?: number
    centerY?: number
  }
  download?: {
    enableDownloadWindow?: boolean
  }
}

/**
 * 窗口服务 - 统一管理所有窗口相关功能
 */
export class WindowService implements Service {
  private windowManager: NewWindowManager | null = null
  private configManager: AppConfigManager
  private downloadManagerMain: DownloadManagerMain
  private downloadWindow: BrowserWindow | null = null
  private config: WindowServiceConfig

  constructor(
    configManager: AppConfigManager,
    config: WindowServiceConfig = {}
  ) {
    this.configManager = configManager
    this.downloadManagerMain = DownloadManagerMain.getInstance(this.configManager as StorageProvider)
    this.config = {
      mainWindow: {
        width: 800,
        height: 600,
        centerY: 200,
        ...config.mainWindow
      },
      download: {
        enableDownloadWindow: true,
        ...config.download
      }
    }
  }

  /**
   * 初始化窗口服务
   */
  async initialize(): Promise<void> {
    log.info('初始化窗口服务...')

    try {
      // 初始化下载管理器
      await this.initializeDownloadManager()

      // 初始化窗口管理器
      await this.initializeWindowManager()

      // 创建主窗口
      await this.createMainWindow()

      // 创建下载窗口（如果启用）
      if (this.config.download?.enableDownloadWindow) {
        this.createDownloadWindow()
      }

      log.info('窗口服务初始化完成')
    } catch (error) {
      log.error('窗口服务初始化失败:', error)
      throw error
    }
  }

  /**
   * 初始化下载管理器
   */
  private async initializeDownloadManager(): Promise<void> {
    try {
      // 设置自定义消息广播函数，用于向所有窗口和视图广播下载事件
      this.downloadManagerMain.setMessageBroadcaster((channel: string, data: any) => {
        this.broadcastToAllWindows(channel, data, {
          filter: (viewInfo) => {
            // 判断是否是设置窗口
            if (viewInfo.config.type === ViewType.SETTINGS) {
              return true
            }
            return false
          }
        })
      })

      this.downloadManagerMain.initialize()
      log.info('下载管理器初始化完成')
    } catch (error) {
      log.error('下载管理器初始化失败:', error)
      throw error
    }
  }

  /**
   * 初始化窗口管理器
   */
  private async initializeWindowManager(): Promise<void> {
    try {
      log.info('初始化新窗口管理器')

      // 创建窗口管理器配置
      const windowManagerConfig: WindowManagerConfig = {
        layout: {
          totalBounds: {
            x: 0,
            y: this.config.mainWindow?.centerY || 200,
            width: this.config.mainWindow?.width || 800,
            height: this.config.mainWindow?.height || 600
          },
          headerHeight: 60,
          contentBounds: {
            x: 0,
            y: 60,
            width: this.config.mainWindow?.width || 800,
            height: (this.config.mainWindow?.height || 600) - 60
          },
          padding: 0
        },
        defaultLifecycle: {
          type: LifecycleType.FOREGROUND,
          persistOnClose: false
        },
        memoryRecycleThreshold: 500, // 500MB
        autoRecycleInterval: 300000 // 5分钟
      }

      this.windowManager = NewWindowManager.getInstance(windowManagerConfig)
      await this.windowManager.initialize()

      log.info('新窗口管理器初始化完成')
    } catch (error) {
      log.error('初始化窗口管理器失败:', error)
      throw error
    }
  }

  /**
   * 创建主窗口
   */
  private async createMainWindow(): Promise<void> {
    try {
      // 确保窗口管理器已初始化
      if (!this.windowManager) {
        throw new Error('窗口管理器未初始化')
      }

      // 简单检查：如果主窗口已存在且未销毁，直接返回
      const mainWindow = this.windowManager.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        return
      }

      log.info('开始创建主窗口 (使用新架构)')

      // 设置窗口大小配置
      this.configManager.set('windowSize', {
        width: this.config.mainWindow?.width || 800,
        height: this.config.mainWindow?.height || 600
      })
      const config = this.configManager.getConfig()

      // 使用新的窗口管理器创建主窗口
      const result = await this.windowManager.createMainWindow(config)

      if (!result.success || !result.data?.window) {
        throw new Error(result.error || '主窗口创建失败')
      }

      const createdWindow = result.data.window as BaseWindow

      // 设置窗口居中
      this.setWindowCenter(createdWindow, this.config.mainWindow?.centerY || 200)

      log.info(`主窗口创建成功，ID: ${createdWindow.id}`)
    } catch (error) {
      log.error('创建主窗口失败:', error)
      throw error
    }
  }

  /**
   * 创建下载专用窗口
   */
  private createDownloadWindow(): void {
    try {
      if (this.downloadWindow && !this.downloadWindow.isDestroyed()) {
        log.info('下载窗口已存在')
        return
      }

      log.info('创建下载专用窗口')

      // 创建隐藏的 BrowserWindow 专门用于下载管理
      this.downloadWindow = new BrowserWindow({
        width: 1,
        height: 1,
        show: false, // 隐藏窗口，仅用于下载功能
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: true,
          webSecurity: true,
        },
        skipTaskbar: true, // 不在任务栏显示
        transparent: true, // 透明窗口
        frame: false, // 无边框
        alwaysOnTop: false,
        resizable: false,
        minimizable: false,
        maximizable: false,
        closable: false // 防止意外关闭
      })

      // 设置下载管理器的主窗口引用
      this.downloadManagerMain.setMainWindow(this.downloadWindow)

      // 监听窗口关闭
      this.downloadWindow.on('closed', () => {
        log.info('下载专用窗口已关闭')
        this.downloadWindow = null
      })

      // 防止窗口被意外显示
      this.downloadWindow.on('show', () => {
        if (this.downloadWindow && !this.downloadWindow.isDestroyed()) {
          this.downloadWindow.hide()
          log.debug('下载专用窗口被隐藏（保持后台运行）')
        }
      })

      log.info(`下载专用窗口创建成功，ID: ${this.downloadWindow.id}`)
    } catch (error) {
      log.error('创建下载专用窗口失败:', error)
    }
  }

  /**
   * 设置窗口居中位置
   */
  private setWindowCenter(window: BaseWindow, y: number): void {
    const { width } = window.getBounds()
    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize
    const centerX = Math.floor((screenWidth - width) / 2)
    window.setPosition(centerX, y)
  }

  /**
   * 获取主窗口实例
   */
  getMainWindow(): BaseWindow | null {
    if (!this.windowManager) {
      return null
    }
    return this.windowManager.getMainWindow()
  }

  /**
   * 获取窗口管理器实例
   */
  getWindowManager(): NewWindowManager {
    if (!this.windowManager) {
      throw new Error('窗口管理器未初始化，请确保应用已正确启动')
    }
    return this.windowManager
  }

  /**
   * 获取下载专用窗口
   */
  getDownloadWindow(): BrowserWindow | null {
    return this.downloadWindow
  }

  /**
   * 获取下载管理器
   */
  getDownloadManager(): DownloadManagerMain {
    return this.downloadManagerMain
  }

  /**
   * 向所有窗口和视图广播消息
   * @param channel 消息通道
   * @param data 消息数据
   * @param options 可选配置
   * @param options.filter 视图过滤函数，返回 true 表示发送到该视图
   * @param options.includeDownloadWindow 是否包含下载窗口，默认为 false
   */
  private broadcastToAllWindows(
    channel: string,
    data: any,
    options?: {
      filter?: (viewInfo: WebContentsViewInfo) => boolean
      includeDownloadWindow?: boolean
    }
  ): void {
    try {
      if (!this.windowManager) {
        log.warn('[WindowService] 窗口管理器未初始化，无法广播消息')
        return
      }

      const { filter, includeDownloadWindow = false } = options || {}
      let sentCount = 0

      // 获取所有视图（包括主窗口视图和分离窗口视图）
      const allViews = this.windowManager.getViewManager().getAllViews()

      allViews.forEach((viewInfo) => {
        try {
          // 应用过滤器
          if (filter && !filter(viewInfo)) {
            return
          }

          if (viewInfo.view && viewInfo.view.webContents && !viewInfo.view.webContents.isDestroyed()) {
            viewInfo.view.webContents.send(channel, data)
            sentCount++
          }
        } catch (error) {
          log.error(`[WindowService] 向视图 ${viewInfo.id} 发送消息失败:`, error)
        }
      })

      // 额外向下载窗口广播（如果存在且不在视图管理器中）
      if (includeDownloadWindow && this.downloadWindow && !this.downloadWindow.isDestroyed()) {
        try {
          this.downloadWindow.webContents.send(channel, data)
          sentCount++
        } catch (error) {
          log.error('[WindowService] 向下载窗口发送消息失败:', error)
        }
      }

      log.info(
        `[WindowService] 已向 ${sentCount} 个视图广播事件: ${channel}`,
        data.id ? `(ID: ${data.id})` : ''
      )
    } catch (error) {
      log.error('[WindowService] 广播消息失败:', error)
    }
  }

  /**
   * 更新窗口服务配置
   */
  updateConfig(config: Partial<WindowServiceConfig>): void {
    this.config = { ...this.config, ...config }
    log.info('窗口服务配置已更新:', config)
  }

  /**
   * 清理窗口服务
   */
  cleanup(): void {
    log.info('清理窗口服务...')

    try {
      // 1. 先清理窗口管理器（包括所有插件视图和分离窗口）
      if (this.windowManager) {
        log.info('正在清理窗口管理器...')
        this.windowManager.destroy()
        this.windowManager = null
        log.info('窗口管理器清理完成')
      }

      // 2. 清理下载窗口
      if (this.downloadWindow && !this.downloadWindow.isDestroyed()) {
        log.info('清理下载专用窗口')
        this.downloadWindow.destroy()
        this.downloadWindow = null
      }

      log.info('窗口服务清理完成')
    } catch (error) {
      log.error('清理窗口服务时出错:', error)
    }
  }
}
