
interface WindowSize {
  /**窗口宽度  -1表示不改变 */
  width?: number
  /**窗口高度  -1表示不改变 */
  height: number
}

export const useWindowManager = () => {
  /** 设置窗口大小 */
  const setSize = (options: Partial<WindowSize> = {}) => {
    naimo.router.windowSetSize(options.width ?? -1, options.height ?? -1)
  }


  /** 检查窗口是否显示 */
  const isWindowVisible = async (): Promise<boolean> => {
    const currentViewInfo = await naimo.router.windowGetCurrentViewInfo()
    if (!currentViewInfo) return false;
    return await naimo.router.windowIsWindowVisible()
  }

  /** 显示主窗口 */
  const show = async () => {
    try {
      const success = await naimo.router.windowShow()
      if (!success) {
        console.warn('显示窗口失败')
      }
    } catch (error) {
      console.warn('显示窗口失败:', error)
    }
  }

  /** 隐藏主窗口 */
  const hide = async () => {
    try {
      const success = await naimo.router.windowHide()
      if (!success) {
        console.warn('隐藏窗口失败')
      }
    } catch (error) {
      console.warn('隐藏窗口失败:', error)
    }
  }

  return { setSize, isWindowVisible, show, hide }
}
