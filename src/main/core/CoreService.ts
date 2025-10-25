/**
 * 核心服务 - 管理应用的核心生命周期
 */

import { app, shell, UtilityProcess } from 'electron'
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
import { autoPuppeteerMain } from '@libs/auto-puppeteer/main'

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
  private iconWorker: UtilityProcess | null = null

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

      // 初始化 auto-puppeteer
      autoPuppeteerMain.setLog(log)

      // 设置应用事件监听器
      this.setupAppEvents()

      // 等待应用准备就绪
      await this.waitForAppReady()

      // 初始化图标工作进程（必须在 app ready 后）
      // 这里会等待应用列表加载完成
      if (this.config.enableIconWorker) {
        await this.initializeIconWorker()
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
      // 在应用准备就绪后创建桌面快捷方式
      this.createDesktopShortcut()
      return
    }

    return new Promise((resolve) => {
      app.whenReady().then(() => {
        log.info('Electron 应用准备就绪')
        // 在应用准备就绪后创建桌面快捷方式
        this.createDesktopShortcut()
        resolve()
      })
    })
  }

  /**
   * 创建桌面快捷方式（仅在 Windows 生产环境首次运行时）
   */
  private createDesktopShortcut(): void {
    // 仅在 Windows 平台且为打包版本时执行
    if (process.platform !== 'win32' || !app.isPackaged) {
      return
    }

    try {
      const desktopPath = app.getPath('desktop')
      const shortcutPath = resolve(desktopPath, 'Naimo Tools.lnk')

      // 如果快捷方式已存在，不重复创建
      if (existsSync(shortcutPath)) {
        log.info('桌面快捷方式已存在')
        return
      }

      // 使用 shell.writeShortcutLink 创建快捷方式
      const success = shell.writeShortcutLink(shortcutPath, {
        target: process.execPath,
        description: 'Naimo Tools',
        icon: process.execPath,
        iconIndex: 0
      })

      if (success) {
        log.info('✅ 桌面快捷方式创建成功:', shortcutPath)
      } else {
        log.warn('⚠️ 桌面快捷方式创建失败')
      }
    } catch (error) {
      log.error('❌ 创建桌面快捷方式时出错:', error)
    }
  }

  /**
   * 初始化图标工作进程
   * @returns Promise，在应用列表加载完成后 resolve
   */
  private async initializeIconWorker(): Promise<void> {
    try {
      // 确定图标工作进程的路径
      const workerPath = resolve(getDirname(import.meta.url), 'iconWorker.js')
      const cacheIconsDir = resolve(app.getPath('userData'), 'icons')

      log.info('🖼️ 初始化图标工作进程:', workerPath)
      log.info('📁 图标缓存目录:', cacheIconsDir)

      // 创建图标工作进程并传递缓存目录（会自动初始化预缓存）
      this.iconWorker = createIconWorker(workerPath, log, cacheIconsDir)
      log.info('✅ 图标工作进程初始化完成')

      // 等待应用列表加载完成
      log.info('🔄 开始加载应用列表...')
      const startTime = Date.now()
      await getApps(cacheIconsDir)
      const duration = Date.now() - startTime
      log.info(`✅ 应用列表加载完成，耗时: ${duration}ms`)
    } catch (error) {
      log.error('❌ 图标工作进程初始化失败:', error)
      throw error
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
    // 所有窗口关闭时的处理
    // 注意：主窗口关闭时会直接调用 app.quit()，所以这里主要处理 macOS 的情况
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        log.info('所有窗口已关闭，退出应用')
        // app.quit()
      }
    })

    // 应用即将退出
    // app.on('before-quit', () => {
    //   log.info('应用即将退出')
    //   this.cleanup()
    // })

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

      // 清理图标工作进程
      if (this.iconWorker) {
        this.iconWorker.kill()
        this.iconWorker = null
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
      const tempDir = resolve(tmpdir(), 'naimo')
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
