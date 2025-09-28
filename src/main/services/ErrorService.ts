/**
 * 错误处理服务 - 统一管理所有错误处理逻辑
 */

import { app } from 'electron'
import log from 'electron-log'
import { MainErrorHandler } from '@libs/unhandled/main'
import { isProduction } from '@shared/utils'
import type { Service } from '../core/ServiceContainer'

export interface ErrorServiceConfig {
  showDialog?: boolean
  enableReporting?: boolean
  onError?: (error: Error) => void
}

/**
 * 错误处理服务
 */
export class ErrorService implements Service {
  private config: ErrorServiceConfig
  private errorHandler: MainErrorHandler

  constructor(config: ErrorServiceConfig = {}) {
    this.config = {
      showDialog: !isProduction(),
      enableReporting: true,
      ...config
    }

    this.errorHandler = MainErrorHandler.getInstance()
  }

  /**
   * 初始化错误处理
   */
  async initialize(): Promise<void> {
    log.info('初始化错误处理服务...')

    // 安装主进程错误处理器
    this.errorHandler.install({
      logger: log.error,
      showDialog: this.config.showDialog,
      reportButton: this.config.enableReporting ? this.handleErrorReport.bind(this) : undefined,
    })

    // 设置应用级错误监听
    this.setupAppErrorHandlers()

    // 设置进程级错误监听
    this.setupProcessErrorHandlers()

    log.info('错误处理服务初始化完成')
  }

  /**
   * 设置应用级错误处理
   */
  private setupAppErrorHandlers(): void {
    // 监听渲染进程崩溃
    app.on('render-process-gone', (event, webContents, details) => {
      const error = new Error(`渲染进程崩溃: ${details.reason}`)
      this.handleRenderProcessCrash(error, details)
    })

    // 监听子进程崩溃
    app.on('child-process-gone', (event, details) => {
      const error = new Error(`子进程崩溃: ${details.type}`)
      this.handleChildProcessCrash(error, details)
    })

    // 监听证书错误
    app.on('certificate-error', (event, webContents, url, error, certificate) => {
      log.error('证书错误:', { url, error: error })
      // 在生产环境中，可能需要更严格的证书验证
      if (!isProduction()) {
        event.preventDefault()
      }
    })
  }

  /**
   * 设置进程级错误处理
   */
  private setupProcessErrorHandlers(): void {
    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      this.handleCriticalError('未捕获的异常', error)
    })

    // 处理未处理的 Promise 拒绝
    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason))
      this.handleCriticalError('未处理的 Promise 拒绝', error, { promise })
    })

    // 处理警告
    process.on('warning', (warning) => {
      log.warn('进程警告:', warning)
    })
  }

  /**
   * 处理渲染进程崩溃
   */
  private handleRenderProcessCrash(error: Error, details: any): void {
    log.error('渲染进程崩溃:', { error, details })

    if (this.config.onError) {
      this.config.onError(error)
    }

    // 可以在这里添加自动恢复逻辑
    // 例如重新创建窗口或重新加载页面
  }

  /**
   * 处理子进程崩溃
   */
  private handleChildProcessCrash(error: Error, details: any): void {
    log.error('子进程崩溃:', { error, details })

    if (this.config.onError) {
      this.config.onError(error)
    }
  }

  /**
   * 处理关键错误
   */
  private handleCriticalError(type: string, error: Error, context?: any): void {
    log.error(`${type}:`, { error, context })

    if (this.config.onError) {
      this.config.onError(error)
    }

    // 关键错误可能需要退出应用
    if (isProduction()) {
      log.error('关键错误导致应用退出')
      process.exit(1)
    }
  }

  /**
   * 处理错误报告
   */
  private handleErrorReport(error: Error): void {
    log.error('用户报告错误:', error)

    // 在这里可以添加错误报告逻辑
    // 例如发送到错误监控服务
    if (this.config.enableReporting) {
      this.sendErrorReport(error)
    }
  }

  /**
   * 发送错误报告到监控服务
   */
  private sendErrorReport(error: Error): void {
    // TODO: 实现错误报告功能
    // 可以集成 Sentry、Bugsnag 等错误监控服务
    log.debug('错误报告功能待实现:', error.message)
  }

  /**
   * 手动报告错误
   */
  reportError(error: Error, context?: any): void {
    log.error('手动报告错误:', { error, context })

    if (this.config.onError) {
      this.config.onError(error)
    }

    if (this.config.enableReporting) {
      this.sendErrorReport(error)
    }
  }

  /**
   * 清理错误处理服务
   */
  cleanup(): void {
    log.info('清理错误处理服务...')
    // 移除监听器等清理工作
    // Electron 的 app 事件监听器会在应用退出时自动清理
  }
}
