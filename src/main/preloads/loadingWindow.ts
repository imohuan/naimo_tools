/**
 * Loading Window Preload Script
 * 用于加载窗口的预加载脚本，提供主进程通信桥接
 */

import { contextBridge, ipcRenderer } from 'electron'
import log from 'electron-log/renderer'

// 加载窗口 API
const loadingWindowApi = {
  /**
   * 监听状态更新
   */
  onStatusUpdate: (callback: (status: string) => void) => {
    const channel = 'loading:status-update'
    const listener = (_event: any, status: string) => {
      log.debug('[LoadingWindow] 状态更新:', status)
      callback(status)
    }
    ipcRenderer.on(channel, listener)

    // 返回取消监听的函数
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  },

  /**
   * 监听进度更新
   */
  onProgressUpdate: (callback: (progress: number) => void) => {
    const channel = 'loading:progress-update'
    const listener = (_event: any, progress: number) => {
      log.debug('[LoadingWindow] 进度更新:', progress)
      callback(progress)
    }
    ipcRenderer.on(channel, listener)

    // 返回取消监听的函数
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  }
}

// 暴露到渲染进程
contextBridge.exposeInMainWorld('loadingWindow', loadingWindowApi)


