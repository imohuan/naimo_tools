/**
 * 进程事件协调器
 * 监听内部事件，处理业务逻辑并转发到渲染进程
 */

import log from 'electron-log'
import { emitEvent } from './ProcessEvent'
import {
  sendViewDetached,
  sendViewRestoreRequested,
  sendWindowMainHide,
  sendWindowMainShow,
  sendAppFocus,
  sendAppBlur,
  sendDetachedWindowInit,
  sendDetachedWindowClosed
} from '@main/ipc-router/mainEvents'
import { NewWindowManager } from '@main/window/NewWindowManager'

/**
 * 进程事件协调器
 */
export class ProcessEventCoordinator {
  private static instance: ProcessEventCoordinator
  private mainWebContents: Electron.WebContents | null = null
  private newWindowManager: NewWindowManager | null = null // 避免循环依赖
  private isInitialized = false

  private constructor() {
    // 私有构造函数
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ProcessEventCoordinator {
    if (!ProcessEventCoordinator.instance) {
      ProcessEventCoordinator.instance = new ProcessEventCoordinator()
    }
    return ProcessEventCoordinator.instance
  }

  /**
   * 设置主渲染进程的 WebContents
   * @param webContents 主视图的 WebContents
   */
  public setMainWebContents(webContents: Electron.WebContents): void {
    this.mainWebContents = webContents
    log.info('已设置主渲染进程 WebContents')
  }

  /**
   * 设置 NewWindowManager 引用
   * @param newWindowManager NewWindowManager 实例
   */
  public setNewWindowManager(newWindowManager: NewWindowManager): void {
    this.newWindowManager = newWindowManager
    log.info('已设置 NewWindowManager 引用')
  }

  /**
   * 初始化事件监听
   */
  public initialize(): void {
    if (this.isInitialized) {
      log.warn('ProcessEventCoordinator 已经初始化过了')
      return
    }

    this.setupEventListeners()
    this.isInitialized = true
    log.info('ProcessEventCoordinator 初始化完成')
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 视图恢复请求事件 如果是设置视图关闭，通知主视图恢复状态
    emitEvent.on('view:restore-requested', (data) => {
      if (!this.mainWebContents || this.mainWebContents.isDestroyed()) return

      sendViewRestoreRequested(this.mainWebContents, {
        viewId: data.viewId,
        windowId: data.windowId,
        reason: data.reason,
        timestamp: data.timestamp
      })
    })

    // 视图分离事件
    emitEvent.on('view:detached', (data) => {
      if (!this.mainWebContents || this.mainWebContents.isDestroyed()) return

      // 发送视图分离通知
      sendViewDetached(this.mainWebContents, {
        detachedViewId: data.viewId,
        sourceWindowId: data.windowId,
        detachedWindowId: data.detachedWindowId,
        timestamp: data.timestamp,
        remainingViews: []
      })

      // 隐藏主窗口
      this.newWindowManager?.hideView(this.newWindowManager.getMainViewId())
    })

    // 主窗口关闭事件
    emitEvent.on('window:main-closed', (data) => {
      if (!this.mainWebContents || this.mainWebContents.isDestroyed()) return

      sendWindowMainHide(this.mainWebContents, {
        timestamp: data.timestamp,
        windowId: data.windowId
      })
    })

    // 主窗口创建事件
    emitEvent.on('window:main-created', (data) => {
      if (!this.mainWebContents || this.mainWebContents.isDestroyed()) return

      sendWindowMainShow(this.mainWebContents, {
        timestamp: data.timestamp,
        windowId: data.windowId
      })
    })

    // 主窗口聚焦事件
    emitEvent.on('window:main-focused', (data) => {
      if (!this.mainWebContents || this.mainWebContents.isDestroyed()) return

      sendAppFocus(this.mainWebContents, {
        timestamp: data.timestamp
      })
    })

    // 主窗口失焦事件
    emitEvent.on('window:main-blurred', (data) => {
      if (!this.mainWebContents || this.mainWebContents.isDestroyed()) return

      sendAppBlur(this.mainWebContents, {
        timestamp: data.timestamp
      })
    })

    // 控制栏动作事件
    emitEvent.on('control-bar:action', (data) => {
      if (!this.mainWebContents || this.mainWebContents.isDestroyed()) return
      if (data.action !== 'init' && data.action !== 'reattach') return

      sendDetachedWindowInit(this.mainWebContents, {
        sourceViewId: data.data.sourceViewId || '',
        sourceWindowId: data.data.sourceWindowId || 0,
        detachedWindowId: data.data.detachedWindowId || 0,
        config: {
          action: data.action,
          ...data.data
        },
        timestamp: data.timestamp
      })
    })


    // 重新附加请求事件
    emitEvent.on('view:reattach-requested', (data) => {
      if (!this.newWindowManager) return
      const viewManager = this.newWindowManager.getViewManager()
      const { viewId, targetWindowId } = data
      const viewInfo = viewManager.getViewInfo(viewId)

      if (viewInfo) {
        viewManager.addViewToWindow(targetWindowId, viewId)
        const switchResult = viewManager.switchToView(targetWindowId, viewId)
        if (switchResult.success) {
          log.info(`重新附加成功: ${viewId}`)
        }
      }
    })

    // 分离窗口关闭事件
    emitEvent.on('view:detached-window-closed', (data) => {
      // 发送 IPC 事件到渲染进程
      if (this.mainWebContents && !this.mainWebContents.isDestroyed()) {
        sendDetachedWindowClosed(this.mainWebContents, {
          viewId: data.viewId,
          detachedWindowId: data.detachedWindowId,
          timestamp: data.timestamp
        })
      }

      // 处理视图恢复逻辑
      if (!this.newWindowManager) return

      const viewManager = this.newWindowManager.getViewManager()
      const viewInfo = viewManager.getViewInfo(data.viewId)

      if (viewInfo) {
        viewManager.showView(viewInfo)
        const switchResult = viewManager.switchToView(viewInfo.parentWindowId, data.viewId)
        if (switchResult.success) {
          log.info(`已切换到恢复的视图: ${data.viewId}`)
        }
      }
    })

    log.info('事件监听器设置完成')
  }

  /**
   * 获取状态信息
   */
  public getStatus(): {
    initialized: boolean
    hasMainWebContents: boolean
    mainWebContentsValid: boolean
  } {
    return {
      initialized: this.isInitialized,
      hasMainWebContents: this.mainWebContents !== null,
      mainWebContentsValid: this.mainWebContents ? !this.mainWebContents.isDestroyed() : false
    }
  }

  /**
   * 销毁
   */
  public destroy(): void {
    log.info('销毁 ProcessEventCoordinator')

    // 移除所有事件监听器
    emitEvent.removeAllListeners('view:detached')
    emitEvent.removeAllListeners('view:restore-requested')
    emitEvent.removeAllListeners('view:reattach-requested')
    emitEvent.removeAllListeners('view:detached-window-closed')
    emitEvent.removeAllListeners('window:main-closed')
    emitEvent.removeAllListeners('window:main-created')
    emitEvent.removeAllListeners('window:main-focused')
    emitEvent.removeAllListeners('window:main-blurred')
    emitEvent.removeAllListeners('control-bar:action')

    this.mainWebContents = null
    this.isInitialized = false

    // 重置单例
    ProcessEventCoordinator.instance = null as any
  }
}

/**
 * 导出单例实例
 */
export const processEventCoordinator = ProcessEventCoordinator.getInstance()
