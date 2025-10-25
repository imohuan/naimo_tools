/**
 * Loading Window API 类型声明
 */

interface LoadingWindowAPI {
  /**
   * 监听状态更新
   * @param callback 状态更新回调函数
   * @returns 取消监听的函数
   */
  onStatusUpdate: (callback: (status: string) => void) => () => void

  /**
   * 监听进度更新
   * @param callback 进度更新回调函数
   * @returns 取消监听的函数
   */
  onProgressUpdate: (callback: (progress: number) => void) => () => void
}

interface Window {
  loadingWindow?: LoadingWindowAPI
}

