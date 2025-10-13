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
  sendViewReattached,
  sendDetachedWindowClosed,
  sendViewEscPressed
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
    emitEvent.on('view:esc-pressed', (data) => {
      if (!this.mainWebContents || this.mainWebContents.isDestroyed()) return
      sendViewEscPressed(this.mainWebContents, {
        viewId: data.viewId,
        windowId: data.windowId,
        timestamp: data.timestamp
      })
    })

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

      const newData = {
        detachedViewId: data.viewId,
        sourceWindowId: data.windowId,
        detachedWindowId: data.detachedWindowId,
        timestamp: data.timestamp,
        remainingViews: []
      }

      // 发送视图分离通知
      sendViewDetached(this.mainWebContents, newData)

      // 发送给分离窗口的view中
      if (this.newWindowManager) {
        const viewManager = this.newWindowManager.getViewManager()
        const viewInfo = viewManager.getViewInfo(data.viewId)
        if (viewInfo) {
          setTimeout(() => {
            sendViewDetached(viewInfo.view.webContents, newData)
          }, 0);
        }
      }

      // 隐藏主窗口
      // this.newWindowManager?.hideView(this.newWindowManager.getMainViewId())
      if (!this.newWindowManager) return
      const id = this.newWindowManager.getMainWindow()?.id || 1
      const baseWindow = this.newWindowManager.getBaseWindowController()
      const window = baseWindow.getWindow(id)
      if (window) baseWindow.hideWindow(window)
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

    // 重新附加请求事件 - 用于更新 ViewManager 的映射关系
    emitEvent.on('view:reattach-requested', (data) => {
      if (!this.newWindowManager) return

      const viewManager = this.newWindowManager.getViewManager()
      const { viewId, targetWindowId } = data
      const viewInfo = viewManager.getViewInfo(viewId)

      if (viewInfo) {
        // 更新窗口-视图映射关系
        viewManager.addViewToWindow(targetWindowId, viewId)

        // 切换到重新附加的视图
        const switchResult = viewManager.switchToView(targetWindowId, viewId)
        if (switchResult.success) {
          log.info(`重新附加并切换视图成功: ${viewId}`)
        }
      }
    })

    emitEvent.on('view:reattached', (data) => {
      if (!this.mainWebContents || this.mainWebContents.isDestroyed()) return

      const pluginInfo = data.pluginInfo || this.newWindowManager?.getViewManager()?.getViewInfo(data.viewId)?.config?.pluginMetadata

      const newData = {
        sourceViewId: data.viewId,
        sourceWindowId: data.toWindowId,
        detachedWindowId: data.fromWindowId,
        config: {
          action: 'reattached',
          pluginInfo: pluginInfo || {},
          fullPath: pluginInfo?.fullPath || ''
        },
        timestamp: data.timestamp
      }
      sendViewReattached(this.mainWebContents, newData)

      // 发送给分离窗口的view中
      if (this.newWindowManager) {
        const viewManager = this.newWindowManager.getViewManager()
        const viewInfo = viewManager.getViewInfo(data.viewId)
        if (viewInfo) {
          setTimeout(() => {
            sendViewReattached(viewInfo.view.webContents, newData)
          }, 0);
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
