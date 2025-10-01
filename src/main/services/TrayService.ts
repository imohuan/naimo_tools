/**
 * 托盘服务 - 管理系统托盘图标和菜单
 */

import { app, Tray, Menu, nativeImage } from 'electron'
import log from 'electron-log'
import { resolve, join } from 'path'
import { existsSync } from 'fs'
import type { Service, ServiceContainer } from '../core/ServiceContainer'

/**
 * 托盘服务配置
 */
export interface TrayServiceConfig {
  /** 是否启用托盘 */
  enabled?: boolean
  /** 托盘图标路径 */
  iconPath?: string
}

/**
 * 托盘服务 - 管理系统托盘
 */
export class TrayService implements Service {
  private tray: Tray | null = null
  private serviceContainer: ServiceContainer
  private config: TrayServiceConfig
  private isInitialized = false

  constructor(
    serviceContainer: ServiceContainer,
    config: TrayServiceConfig = {}
  ) {
    this.serviceContainer = serviceContainer

    // 获取正确的图标路径（开发环境和打包后都能正确定位）
    const getIconPath = () => {
      if (app.isPackaged) {
        // 打包后：使用复制到 resources 目录的图标文件
        // resources 目录在 asar 外部，可以正常访问
        return join(process.resourcesPath, 'app-icon.ico')
      } else {
        // 开发环境：使用项目中的图标文件
        return resolve(process.cwd(), 'setup/exe.ico')
      }
    }

    this.config = {
      enabled: true,
      iconPath: getIconPath(),
      ...config
    }
  }

  /**
   * 初始化托盘服务
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.warn('托盘服务已经初始化')
      return
    }

    if (!this.config.enabled) {
      log.info('托盘服务已禁用')
      return
    }

    log.info('初始化托盘服务...')

    try {
      await this.createTray()
      this.isInitialized = true
      log.info('托盘服务初始化完成')
    } catch (error) {
      log.error('托盘服务初始化失败:', error)
      throw error
    }
  }

  /**
   * 创建系统托盘
   */
  private async createTray(): Promise<void> {
    try {
      log.info('正在创建系统托盘，图标路径:', this.config.iconPath)
      log.info('图标文件是否存在:', existsSync(this.config.iconPath!))

      // 创建托盘图标
      let icon = nativeImage.createFromPath(this.config.iconPath!)

      // 检查图标是否为空
      if (icon.isEmpty()) {
        log.warn('⚠️ 图标文件无效或不存在:', this.config.iconPath)

        // 降级方案：使用 Windows exe 内置图标
        if (process.platform === 'win32' && app.isPackaged) {
          log.info('尝试使用 exe 文件图标作为降级方案')
          // 在 Windows 上，我们需要使用 app.getFileIcon 而不是直接从 exe 提取
          try {
            icon = await app.getFileIcon(process.execPath, { size: 'normal' })
            if (!icon.isEmpty()) {
              log.info('✅ 成功使用 exe 文件图标')
            }
          } catch (err) {
            log.error('获取 exe 图标失败:', err)
          }
        }

        // 如果仍然为空，创建一个简单的占位符图标
        if (icon.isEmpty()) {
          log.warn('⚠️ 无法加载任何图标，托盘将使用默认图标')
          // 不要抛出错误，让托盘服务继续运行
        }
      } else {
        log.info('✅ 图标加载成功，尺寸:', icon.getSize())
      }

      this.tray = new Tray(icon)

      // 设置托盘提示文本
      this.tray.setToolTip('Naimo Tools')

      // 创建托盘菜单
      this.updateTrayMenu()

      // 双击托盘图标显示主窗口
      this.tray.on('double-click', () => {
        this.showMainWindow()
      })

      log.info('✅ 系统托盘创建成功')
    } catch (error) {
      log.error('❌ 创建系统托盘失败:', error)
      // 不要抛出错误，让应用继续运行
      log.warn('⚠️ 托盘服务将被禁用，应用继续运行')
    }
  }

  /**
   * 更新托盘菜单
   */
  private updateTrayMenu(): void {
    if (!this.tray) {
      return
    }

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          this.showMainWindow()
        }
      },
      {
        type: 'separator'
      },
      {
        label: '重启应用',
        click: () => {
          this.restartApp()
        }
      },
      {
        type: 'separator'
      },
      {
        label: '退出',
        click: () => {
          this.quitApp()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }

  /**
   * 显示主窗口
   */
  private showMainWindow(): void {
    try {
      const windowService = this.serviceContainer.get('windowService')
      if (!windowService) {
        log.warn('窗口服务未找到')
        return
      }

      const mainWindow = windowService.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        mainWindow.show()
        mainWindow.focus()
        log.info('主窗口已显示')
      } else {
        log.warn('主窗口不存在或已销毁')
      }
    } catch (error) {
      log.error('显示主窗口失败:', error)
    }
  }

  /**
   * 重启应用
   */
  private restartApp(): void {
    try {
      log.info('正在重启应用...')
      app.relaunch()
      app.exit(0)
    } catch (error) {
      log.error('重启应用失败:', error)
    }
  }

  /**
   * 退出应用
   */
  private quitApp(): void {
    try {
      log.info('正在退出应用...')
      // 先清理托盘,避免在退出过程中出现错误
      if (this.tray && !this.tray.isDestroyed()) {
        this.tray.destroy()
        this.tray = null
      }
      app.quit()
    } catch (error) {
      log.error('退出应用失败:', error)
    }
  }

  /**
   * 清理托盘服务
   */
  cleanup(): void {
    if (!this.isInitialized) {
      return
    }

    log.info('清理托盘服务...')

    try {
      if (this.tray && !this.tray.isDestroyed()) {
        this.tray.destroy()
        this.tray = null
      }

      this.isInitialized = false
      log.info('托盘服务清理完成')
    } catch (error) {
      log.error('清理托盘服务时出错:', error)
    }
  }

  /**
   * 检查托盘服务是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * 获取托盘实例
   */
  getTray(): Tray | null {
    return this.tray
  }

  /**
   * 更新托盘配置
   */
  updateConfig(config: Partial<TrayServiceConfig>): void {
    this.config = { ...this.config, ...config }
    log.info('托盘服务配置已更新:', config)

    // 如果托盘已创建，更新菜单
    if (this.tray) {
      this.updateTrayMenu()
    }
  }
}

