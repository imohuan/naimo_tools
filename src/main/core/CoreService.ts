/**
 * 核心服务 - 管理应用的核心生命周期
 */

import { app } from 'electron'
import log from 'electron-log'
import { LogConfigManager } from '../config/logConfig'
import { cleanupIpcRouter, initializeIpcRouter } from '../ipc-router'
import { createIconWorker, getApps } from '@libs/app-search'
import { resolve } from 'path'
import { tmpdir } from 'os'
import { existsSync, rmSync } from 'fs'
import { getDirname } from '../utils'
import { processEventCoordinator } from './ProcessEventCoordinator'
import type { Service, ServiceContainer } from './ServiceContainer'

/**
 * 核心服务配置
 */
/**
 * 核心服务配置接口
 * @property enableIconWorker 是否启用图标工作进程
 * @property tempDirCleanup 是否清理临时目录
 */
export interface CoreServiceConfig {
  /** 是否启用图标工作进程 */
  enableIconWorker?: boolean
  /** 是否清理临时目录 */
  tempDirCleanup?: boolean
}

/**
 * 核心服务 - 管理应用的基础生命周期和核心功能
 */
export class CoreService implements Service {
  private serviceContainer: ServiceContainer
  private config: CoreServiceConfig
  private isInitialized = false

  constructor(
    serviceContainer: ServiceContainer,
    config: CoreServiceConfig = {}
  ) {
    this.serviceContainer = serviceContainer
    this.config = {
      enableIconWorker: true,
      tempDirCleanup: true,
      ...config
    }
  }

  /**
   * 初始化核心服务
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.warn('核心服务已经初始化')
      return
    }

    log.info('初始化核心服务...')

    try {
      // 初始化日志系统
      this.initializeLogging()

      // 设置应用事件监听器
      this.setupAppEvents()

      // 等待应用准备就绪
      await this.waitForAppReady()

      // 初始化图标工作进程（必须在 app ready 后）
      if (this.config.enableIconWorker) {
        this.initializeIconWorker()
      }

      // 初始化 IPC 处理器
      this.initializeIpcHandlers()

      // 初始化事件转发管理器
      this.initializeEventForwarding()

      this.isInitialized = true
      log.info('核心服务初始化完成')
    } catch (error) {
      log.error('核心服务初始化失败:', error)
      throw error
    }
  }

  /**
   * 初始化日志系统
   */
  private initializeLogging(): void {
    try {
      LogConfigManager.initialize()
      log.info('日志系统初始化完成')
    } catch (error) {
      log.error('日志系统初始化失败:', error)
      throw error
    }
  }

  /**
   * 等待应用准备就绪
   */
  private async waitForAppReady(): Promise<void> {
    if (app.isReady()) {
      log.info('Electron 应用已准备就绪')
      return
    }

    return new Promise((resolve) => {
      app.whenReady().then(() => {
        log.info('Electron 应用准备就绪')
        resolve()
      })
    })
  }

  /**
   * 初始化图标工作进程
   */
  private initializeIconWorker(): void {
    try {
      // 确定图标工作进程的路径
      const workerPath = resolve(getDirname(import.meta.url), 'iconWorker.js')
      log.info('🖼️ 初始化图标工作进程:', workerPath)

      createIconWorker(workerPath, log)
      log.info('✅ 图标工作进程初始化完成')

      getApps(resolve(app.getPath('userData'), 'icons'))
    } catch (error) {
      log.error('❌ 图标工作进程初始化失败:', error)
    }
  }

  /**
   * 初始化 IPC 处理器
   */
  private initializeIpcHandlers(): void {
    try {
      log.info('🔄 初始化 IPC 路由系统...')
      initializeIpcRouter()
      log.info('✅ IPC 路由系统初始化完成')
    } catch (error) {
      log.error('❌ IPC 路由系统初始化失败:', error)
      throw error
    }
  }

  /**
   * 初始化进程事件协调器
   */
  private initializeEventForwarding(): void {
    try {
      log.info('🔄 初始化进程事件协调器...')
      processEventCoordinator.initialize()
      log.info('✅ 进程事件协调器初始化完成')
    } catch (error) {
      log.error('❌ 进程事件协调器初始化失败:', error)
      throw error
    }
  }

  /**
   * 设置应用事件监听器
   */
  private setupAppEvents(): void {
    // 所有窗口关闭时退出应用
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        log.info('所有窗口已关闭，退出应用')
        app.quit()
      }
    })

    // 应用即将退出
    app.on('before-quit', () => {
      log.info('应用即将退出')
      this.cleanup()
    })

    // macOS 特有的激活事件
    app.on('activate', () => {
      log.info('应用被激活')
      // 在 macOS 上，当点击dock图标时重新创建窗口
      // 这个逻辑由 WindowService 处理
    })

    // 第二个实例尝试启动
    app.on('second-instance', () => {
      log.info('检测到第二个应用实例')
      // 聚焦到现有窗口
      const windowService = this.serviceContainer.get('windowService')
      if (windowService) {
        const mainWindow = windowService.getMainWindow()
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.focus()
        }
      }
    })

    // 设置进程信号处理
    this.setupProcessSignalHandlers()
  }

  /**
   * 设置进程信号处理
   */
  private setupProcessSignalHandlers(): void {
    // 处理 SIGTERM 信号（优雅关闭）
    process.on('SIGTERM', () => {
      log.info('收到 SIGTERM 信号，正在清理...')
      this.cleanup()
      process.exit(0)
    })

    // 处理 SIGINT 信号（Ctrl+C）
    process.on('SIGINT', () => {
      log.info('收到 SIGINT 信号，正在清理...')
      this.cleanup()
      process.exit(0)
    })

    // 处理 SIGHUP 信号（挂起）
    process.on('SIGHUP', () => {
      log.info('收到 SIGHUP 信号，正在清理...')
      this.cleanup()
      process.exit(0)
    })
  }

  /**
   * 清理核心服务
   */
  cleanup(): void {
    if (!this.isInitialized) {
      return
    }

    log.info('清理核心服务...')

    try {
      // 清理 IPC 路由
      cleanupIpcRouter()

      // 清空临时目录
      if (this.config.tempDirCleanup) {
        this.cleanupTempDirectory()
      }

      this.isInitialized = false
      log.info('核心服务清理完成')
    } catch (error) {
      log.error('清理核心服务时出错:', error)
    }
  }

  /**
   * 清空临时目录
   */
  private cleanupTempDirectory(): void {
    try {
      const tempDir = resolve(tmpdir(), 'naimo-preloads')
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true })
        log.info(`已清空临时目录: ${tempDir}`)
      }
    } catch (error) {
      log.error('清空临时目录失败:', error)
    }
  }

  /**
   * 检查核心服务是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * 获取核心服务配置
   */
  getConfig(): CoreServiceConfig {
    return { ...this.config }
  }

  /**
   * 更新核心服务配置
   */
  updateConfig(config: Partial<CoreServiceConfig>): void {
    this.config = { ...this.config, ...config }
    log.info('核心服务配置已更新:', config)
  }
}
