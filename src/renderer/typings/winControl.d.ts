/**
 * Window Control API 类型声明
 * 用于分离窗口的窗口控制功能
 */

import type { IpcRouter } from '@shared/utils/ipcRouterClient'

interface WindowControlAPI {
  /**
   * 最小化窗口
   */
  minimize: () => Promise<boolean>

  /**
   * 最大化/还原窗口
   */
  maximize: () => Promise<boolean>

  /**
   * 关闭窗口
   */
  close: () => Promise<boolean>

  /**
   * 重新附加到主窗口
   */
  reattach: () => Promise<boolean>

  /**
   * 检查窗口是否最大化
   */
  isMaximized: () => Promise<boolean>

  /**
   * 检查窗口是否全屏
   */
  isFullscreen: () => Promise<boolean>

  /**
   * 设置窗口置顶状态
   */
  setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<boolean>

  /**
   * 检查窗口是否置顶
   */
  isAlwaysOnTop: () => Promise<boolean>

  /**
   * 获取当前视图信息
   */
  getCurrentViewInfo: () => Promise<{
    viewId: string | null
    windowId: number | null
    isDetached: boolean
  } | null>

  /**
   * IPC 路由器
   */
  router: typeof IpcRouter

  /**
   * 监听分离窗口初始化事件
   * @param callback 初始化数据回调函数
   * @returns 取消监听的函数
   */
  onDetachedWindowInit: (callback: (data: any) => void) => () => void
}

declare global {
  interface Window {
    winControl?: WindowControlAPI
  }

  const winControl: WindowControlAPI | undefined
}

