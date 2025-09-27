import type { PluginItem } from "@/typings/plugin-types"

interface WindowSize {
  /**窗口宽度  -1表示不改变 */
  width?: number
  /**窗口高度  -1表示不改变 */
  height: number
}

export const useWindowManager = () => {
  /** 设置窗口大小 */
  const setSize = (options: Partial<WindowSize> = {}) => {
    naimo.router.windowSetSize(options.height ?? -1)
  }

  /** 根据插件项目配置来执行相应的操作：隐藏或关闭所有following窗口 */
  const manageFollowingWindows = (pluginItem: PluginItem | null, action?: 'hide' | 'close') => {
    const closeAction = action || pluginItem?.closeAction
    if (closeAction) {
      naimo.router.windowManageFollowingWindows()
    } else {
      naimo.router.windowCloseAllFollowingWindows()
    }
  }

  /** 打开当前插件项目的following窗口 */
  const openCurrentItemFollowingWindow = (pluginItem: PluginItem | null) => {
    if (!pluginItem) return
    if (!pluginItem.path) return
    naimo.router.windowShowSpecificFollowingWindow()
  }

  /** 检查窗口是否显示 */
  const isWindowVisible = async (): Promise<boolean> => {
    const currentViewInfo = await naimo.router.windowGetCurrentViewInfo()
    if (!currentViewInfo) return false;
    return await naimo.router.windowIsWindowVisible()
  }

  /** 显示主窗口和当前插件项目的following窗口 */
  const show = async (pluginItem: PluginItem | null) => {
    const currentViewInfo = await naimo.router.windowGetCurrentViewInfo()
    if (!currentViewInfo) return;
    naimo.router.windowToggleShow(true).catch(error => {
      console.warn('显示窗口失败:', error)
    })
    openCurrentItemFollowingWindow(pluginItem)
  }

  /** 隐藏主窗口和所有插件项目的following窗口 */
  const hide = async (pluginItem: PluginItem | null, action?: 'hide' | 'close') => {
    manageFollowingWindows(pluginItem, action)
    const currentViewInfo = await naimo.router.windowGetCurrentViewInfo()
    if (!currentViewInfo) return;
    naimo.router.windowToggleShow(false).catch(error => {
      console.warn('隐藏窗口失败:', error)
    })
  }

  return { setSize, manageFollowingWindows, openCurrentItemFollowingWindow, isWindowVisible, show, hide }
}
