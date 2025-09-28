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
    naimo.router.windowSetSize(options.width ?? -1, options.height ?? -1)
  }

  /** 根据插件项目配置执行视图生命周期策略 */
  const manageFollowingWindows = (pluginItem: PluginItem | null, action?: 'hide' | 'close') => {
    const closeAction = action || pluginItem?.closeAction
    const viewId = pluginItem?.path
    if (!viewId) return

    if (closeAction === 'hide') {
      naimo.router.windowHideNewView(viewId).catch(err => {
        console.warn('隐藏插件视图失败:', err)
      })
    } else {
      naimo.router.windowClosePluginView(viewId).catch(err => {
        console.warn('关闭插件视图失败:', err)
      })
    }
  }

  /** 打开当前插件项目的插件视图 */
  const openCurrentItemFollowingWindow = (pluginItem: PluginItem | null) => {
    if (!pluginItem?.path) return
    naimo.router.windowShowNewView({
      type: 'plugin',
      path: pluginItem.path,
      pluginItem,
      lifecycleType: pluginItem.closeAction === 'hide' ? 'background' : 'foreground'
    }).catch(err => {
      console.warn('显示插件视图失败:', err)
    })
  }

  /** 检查窗口是否显示 */
  const isWindowVisible = async (): Promise<boolean> => {
    const currentViewInfo = await naimo.router.windowGetCurrentViewInfo()
    if (!currentViewInfo) return false;
    return await naimo.router.windowIsWindowVisible()
  }

  /** 显示主窗口并恢复插件视图 */
  const show = async (pluginItem: PluginItem | null) => {
    const currentViewInfo = await naimo.router.windowGetCurrentViewInfo()
    if (!currentViewInfo) return;
    naimo.router.windowToggleShow(undefined, true).catch(error => {
      console.warn('显示窗口失败:', error)
    })
    openCurrentItemFollowingWindow(pluginItem)
  }

  /** 隐藏主窗口并根据策略处理插件视图 */
  const hide = async (pluginItem: PluginItem | null, action?: 'hide' | 'close') => {
    manageFollowingWindows(pluginItem, action)
    const currentViewInfo = await naimo.router.windowGetCurrentViewInfo()
    if (!currentViewInfo) return;
    naimo.router.windowToggleShow(undefined, false).catch(error => {
      console.warn('隐藏窗口失败:', error)
    })
  }

  return { setSize, manageFollowingWindows, openCurrentItemFollowingWindow, isWindowVisible, show, hide }
}
