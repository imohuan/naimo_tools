/**
 * 加载窗口服务 - 在应用初始化期间显示加载窗口
 */

import { BrowserWindow, screen, app } from 'electron'
import log from 'electron-log'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { getDirname } from '../utils'
import type { Service } from '../core/ServiceContainer'

/**
 * 加载窗口服务配置
 */
export interface LoadingServiceConfig {
  width?: number
  height?: number
}

/**
 * 加载窗口服务
 */
export class LoadingService implements Service {
  private loadingWindow: BrowserWindow | null = null
  private config: LoadingServiceConfig

  constructor(config: LoadingServiceConfig) {
    this.config = {
      width: 400,
      height: 300,
      ...config
    }
  }

  /**
   * 初始化加载窗口服务
   */
  async initialize(): Promise<void> {
    log.info('初始化加载窗口服务...')
    await this.show()
    log.info('加载窗口服务初始化完成')
  }

  /**
   * 显示加载窗口
   */
  async show(): Promise<void> {
    // 确保 app 已经 ready
    if (!app.isReady()) {
      log.info('等待 Electron app ready...')
      await app.whenReady()
    }

    if (this.loadingWindow && !this.loadingWindow.isDestroyed()) {
      log.info('加载窗口已存在')
      this.loadingWindow.show()
      return
    }

    log.info('创建加载窗口')

    // 确定 preload 脚本路径
    const preloadPath = resolve(getDirname(import.meta.url), 'preloads/loadingWindow.js')
    log.info('Preload 脚本路径:', preloadPath)

    // 创建加载窗口
    this.loadingWindow = new BrowserWindow({
      width: this.config.width,
      height: this.config.height,
      frame: false, // 无边框
      transparent: true, // 透明背景
      resizable: false,
      skipTaskbar: true, // 不在任务栏显示
      alwaysOnTop: true, // 始终在最前
      center: true, // 居中显示
      webPreferences: {
        preload: preloadPath,
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
      }
    })

    // 加载页面
    try {
      if (process.env.NODE_ENV === 'development') {
        // 开发模式：加载开发服务器地址
        const devConfig = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')).config?.dev || {}
        const port = devConfig.rendererPort || 5173
        const host = devConfig.rendererHost || 'localhost'
        const url = `http://${host}:${port}/src/pages/loading-window/`
        log.info(`加载窗口页面（开发模式）: ${url}`)
        await this.loadingWindow.loadURL(url)
      } else {
        // 生产模式：加载构建后的 HTML 文件
        const htmlPath = resolve(getDirname(import.meta.url), '../renderer/loading-window.html')
        log.info(`加载窗口页面（生产模式）: ${htmlPath}`)
        await this.loadingWindow.loadFile(htmlPath)
      }

      this.loadingWindow.show()
      log.info(`加载窗口创建成功，ID: ${this.loadingWindow.id}`)
    } catch (error) {
      log.error('加载窗口页面加载失败:', error)
      throw error
    }

    // 监听窗口关闭
    this.loadingWindow.on('closed', () => {
      log.info('加载窗口已关闭')
      this.loadingWindow = null
    })
  }

  /**
   * 隐藏加载窗口
   */
  hide(): void {
    if (this.loadingWindow && !this.loadingWindow.isDestroyed()) {
      log.info('隐藏加载窗口')
      this.loadingWindow.hide()
    }
  }

  /**
   * 关闭并销毁加载窗口
   */
  close(): void {
    if (this.loadingWindow && !this.loadingWindow.isDestroyed()) {
      log.info('关闭加载窗口')
      this.loadingWindow.close()
      this.loadingWindow = null
    }
  }

  /**
   * 更新加载状态文本（可选）
   */
  updateStatus(status: string): void {
    if (this.loadingWindow && !this.loadingWindow.isDestroyed()) {
      this.loadingWindow.webContents.send('loading:status-update', status)
    }
  }

  /**
   * 更新进度（可选）
   */
  updateProgress(progress: number): void {
    if (this.loadingWindow && !this.loadingWindow.isDestroyed()) {
      this.loadingWindow.webContents.send('loading:progress-update', progress)
    }
  }

  /**
   * 获取加载窗口实例
   */
  getWindow(): BrowserWindow | null {
    return this.loadingWindow
  }

  /**
   * 清理加载窗口服务
   */
  cleanup(): void {
    log.info('清理加载窗口服务...')
    this.close()
    log.info('加载窗口服务清理完成')
  }
}

