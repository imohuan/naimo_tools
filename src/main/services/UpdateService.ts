/**
 * 自动更新服务 - 管理应用的自动更新功能
 */

import log from 'electron-log'
import { updateElectronApp, UpdateSourceType } from '@libs/update'
import { isProduction } from '@shared/utils'
import type { Service } from '../core/ServiceContainer'

export interface UpdateServiceConfig {
  enabled?: boolean
  repo?: string
  updateInterval?: string
  notifyUser?: boolean
}

/**
 * 自动更新服务
 */
export class UpdateService implements Service {
  private config: UpdateServiceConfig
  private updateCheckInterval?: NodeJS.Timeout

  constructor(config: UpdateServiceConfig = {}) {
    this.config = {
      enabled: isProduction(),
      repo: 'imohuan/naimo_tools',
      updateInterval: '1 hour',
      notifyUser: true,
      ...config
    }
  }

  /**
   * 初始化自动更新服务
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      log.info('自动更新服务已禁用')
      return
    }

    log.info('初始化自动更新服务...')

    try {
      await this.setupAutoUpdater()
      log.info('自动更新服务初始化完成')
    } catch (error) {
      log.error('自动更新服务初始化失败:', error)
      // 更新失败不应该阻止应用启动
    }
  }

  /**
   * 设置自动更新器
   */
  private async setupAutoUpdater(): Promise<void> {
    if (!isProduction()) {
      log.info('开发环境，跳过自动更新设置')
      return
    }

    if (!this.config.repo) {
      log.warn('未配置更新仓库，跳过自动更新设置')
      return
    }

    try {
      updateElectronApp({
        updateSource: {
          type: UpdateSourceType.ElectronPublicUpdateService,
          repo: this.config.repo,
        },
        notifyUser: this.config.notifyUser,
        updateInterval: this.config.updateInterval,
        logger: log,
      })

      log.info(`自动更新已启用: ${this.config.repo}`)
    } catch (error) {
      log.error('设置自动更新失败:', error)
      throw error
    }
  }

  /**
   * 手动检查更新
   */
  async checkForUpdates(): Promise<void> {
    if (!this.config.enabled) {
      log.info('自动更新已禁用，无法检查更新')
      return
    }

    log.info('手动检查更新...')

    try {
      // 这里可以添加手动检查更新的逻辑
      // 目前 updateElectronApp 库会自动处理
      log.info('更新检查完成')
    } catch (error) {
      log.error('检查更新失败:', error)
      throw error
    }
  }

  /**
   * 启用自动更新
   */
  enable(): void {
    if (this.config.enabled) {
      log.info('自动更新已经启用')
      return
    }

    this.config.enabled = true
    log.info('自动更新已启用')

    // 重新初始化
    this.initialize().catch(error => {
      log.error('启用自动更新时初始化失败:', error)
    })
  }

  /**
   * 禁用自动更新
   */
  disable(): void {
    if (!this.config.enabled) {
      log.info('自动更新已经禁用')
      return
    }

    this.config.enabled = false
    log.info('自动更新已禁用')

    // 清理定时器
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval)
      this.updateCheckInterval = undefined
    }
  }

  /**
   * 获取更新配置
   */
  getConfig(): UpdateServiceConfig {
    return { ...this.config }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<UpdateServiceConfig>): void {
    this.config = { ...this.config, ...config }
    log.info('更新服务配置已更新:', config)

    // 如果更新了关键配置，重新初始化
    if (config.enabled !== undefined || config.repo || config.updateInterval) {
      this.initialize().catch(error => {
        log.error('更新配置后重新初始化失败:', error)
      })
    }
  }

  /**
   * 清理更新服务
   */
  cleanup(): void {
    log.info('清理自动更新服务...')

    // 清理定时器
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval)
      this.updateCheckInterval = undefined
    }

    this.config.enabled = false
  }
}
