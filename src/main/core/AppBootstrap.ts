/**
 * 应用启动器 - 负责应用的完整启动流程
 */

import log from 'electron-log'
import { ServiceContainer } from './ServiceContainer'
import { CoreService } from './CoreService'
import { ErrorService } from '../services/ErrorService'
import { UpdateService } from '../services/UpdateService'
import { WindowService } from '../services/WindowService'
import { TrayService } from '../services/TrayService'
import { AppConfigManager } from '../config/appConfig'

/**
 * 应用启动器配置
 */
export interface AppBootstrapConfig {
  core?: {
    enableIconWorker?: boolean
    tempDirCleanup?: boolean
  }
  error?: {
    showDialog?: boolean
    enableReporting?: boolean
  }
  update?: {
    enabled?: boolean
    repo?: string
    updateInterval?: string
  }
  window?: {
    mainWindow?: {
      width?: number
      height?: number
      centerY?: number
    }
    download?: {
      enableDownloadWindow?: boolean
    }
  }
  tray?: {
    enabled?: boolean
    iconPath?: string
  }
}

/**
 * 应用启动器
 * 负责整个应用的初始化和服务协调
 */
export class AppBootstrap {
  private serviceContainer: ServiceContainer
  private config: AppBootstrapConfig
  private isInitialized = false

  constructor(config: AppBootstrapConfig = {}) {
    this.config = {
      core: {
        enableIconWorker: true,
        tempDirCleanup: true,
        ...config.core
      },
      error: {
        showDialog: false, // 默认不显示对话框
        enableReporting: true,
        ...config.error
      },
      update: {
        enabled: true,
        repo: 'imohuan/electron-vue3-template',
        updateInterval: '1 hour',
        ...config.update
      },
      window: {
        mainWindow: {
          width: 800,
          height: 600,
          centerY: 200,
          ...config.window?.mainWindow
        },
        download: {
          enableDownloadWindow: true,
          ...config.window?.download
        }
      },
      tray: {
        enabled: true,
        ...config.tray
      }
    }

    this.serviceContainer = new ServiceContainer()
    this.registerServices()
  }

  /**
   * 注册所有服务
   */
  private registerServices(): void {
    log.info('注册应用服务...')

    // 注册配置管理器
    this.serviceContainer.register({
      name: 'configManager',
      factory: () => AppConfigManager.getInstance(),
      singleton: true
    })

    // 注册核心服务
    this.serviceContainer.register({
      name: 'coreService',
      factory: (container) => new CoreService(container, this.config.core),
      singleton: true
    })

    // 注册错误服务
    this.serviceContainer.register({
      name: 'errorService',
      factory: () => new ErrorService(this.config.error),
      singleton: true
    })

    // 注册更新服务
    this.serviceContainer.register({
      name: 'updateService',
      factory: () => new UpdateService(this.config.update),
      singleton: true
    })

    // 注册窗口服务
    this.serviceContainer.register({
      name: 'windowService',
      factory: (container) => new WindowService(
        container.get('configManager'),
        this.config.window
      ),
      singleton: true,
      dependencies: ['configManager']
    })

    // 注册托盘服务
    this.serviceContainer.register({
      name: 'trayService',
      factory: (container) => new TrayService(container, this.config.tray),
      singleton: true
    })

    log.info('所有服务注册完成')
  }

  /**
   * 启动应用
   */
  async start(): Promise<void> {
    if (this.isInitialized) {
      log.warn('应用已经启动')
      return
    }

    const startTime = Date.now()
    log.info('🚀 应用启动中...')
    log.info('启动时间:', new Date(startTime).toLocaleTimeString())

    try {
      // 按顺序初始化服务
      await this.initializeServicesInOrder()

      const endTime = Date.now()
      this.isInitialized = true

      log.info('✅ 应用启动完成，耗时:', endTime - startTime, 'ms')
    } catch (error) {
      log.error('❌ 应用启动失败:', error)
      await this.cleanup()
      throw error
    }
  }

  /**
   * 按正确顺序初始化服务
   */
  private async initializeServicesInOrder(): Promise<void> {
    const initOrder = [
      'coreService',     // 核心服务 - 最先初始化
      'errorService',    // 错误服务 - 尽早初始化以捕获错误
      'updateService',   // 更新服务 - 在核心功能之后
      'windowService',   // 窗口服务
      'trayService'      // 托盘服务 - 最后初始化
    ]

    for (const serviceName of initOrder) {
      try {
        log.info(`初始化 ${serviceName}...`)
        const service = this.serviceContainer.get(serviceName)

        if (service && typeof service.initialize === 'function') {
          await service.initialize()
        }

        log.info(`${serviceName} 初始化完成`)
      } catch (error) {
        log.error(`${serviceName} 初始化失败:`, error)
        throw error
      }
    }
  }

  /**
   * 获取服务容器
   */
  getServiceContainer(): ServiceContainer {
    return this.serviceContainer
  }

  /**
   * 获取指定服务
   */
  getService<T = any>(name: string): T {
    return this.serviceContainer.get<T>(name)
  }

  /**
   * 检查应用是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * 更新应用配置
   */
  updateConfig(config: Partial<AppBootstrapConfig>): void {
    this.config = { ...this.config, ...config }
    log.info('应用配置已更新:', config)

    // 将配置更新传播到相应的服务
    this.propagateConfigUpdates(config)
  }

  /**
   * 将配置更新传播到服务
   */
  private propagateConfigUpdates(config: Partial<AppBootstrapConfig>): void {
    try {
      if (config.core && this.serviceContainer.has('coreService')) {
        const coreService = this.serviceContainer.get('coreService')
        if (coreService && typeof coreService.updateConfig === 'function') {
          coreService.updateConfig(config.core)
        }
      }

      if (config.update && this.serviceContainer.has('updateService')) {
        const updateService = this.serviceContainer.get('updateService')
        if (updateService && typeof updateService.updateConfig === 'function') {
          updateService.updateConfig(config.update)
        }
      }

      if (config.window && this.serviceContainer.has('windowService')) {
        const windowService = this.serviceContainer.get('windowService')
        if (windowService && typeof windowService.updateConfig === 'function') {
          windowService.updateConfig(config.window)
        }
      }

      if (config.tray && this.serviceContainer.has('trayService')) {
        const trayService = this.serviceContainer.get('trayService')
        if (trayService && typeof trayService.updateConfig === 'function') {
          trayService.updateConfig(config.tray)
        }
      }
    } catch (error) {
      log.error('传播配置更新时出错:', error)
    }
  }

  /**
   * 清理应用
   */
  async cleanup(): Promise<void> {
    if (!this.isInitialized) {
      return
    }

    log.info('🧹 清理应用...')

    try {
      // 清理所有服务
      this.serviceContainer.cleanup()

      this.isInitialized = false
      log.info('✅ 应用清理完成')
    } catch (error) {
      log.error('❌ 应用清理失败:', error)
    }
  }

  /**
   * 重启应用
   */
  async restart(): Promise<void> {
    log.info('重启应用...')

    await this.cleanup()
    await this.start()

    log.info('应用重启完成')
  }
}
