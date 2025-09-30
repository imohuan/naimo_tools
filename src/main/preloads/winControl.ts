import { contextBridge, ipcRenderer } from "electron";
import log from "electron-log/renderer";

async function invokeWindowRoute<T = any>(route: string, ...args: any[]): Promise<T> {
  try {
    const result = await ipcRenderer.invoke(`window-${route}`, ...args)
    return result as T
  } catch (error) {
    log.error(`[winControl] 调用 window-${route} 失败`, error)
    throw error
  }
}

const windowControl = {
  minimize: () => invokeWindowRoute<boolean>("minimize"),
  maximize: () => invokeWindowRoute<boolean>("maximize"),
  close: () => invokeWindowRoute<boolean>("close"),
  reattach: async () => {
    const viewInfo = await windowControl.getCurrentViewInfo()
    if (!viewInfo?.windowId) {
      throw new Error("无法获取当前分离窗口ID")
    }
    return invokeWindowRoute<boolean>("reattach-new-view", viewInfo.windowId)
  },
  isFullscreen: () => invokeWindowRoute<boolean>("is-fullscreen"),
  getCurrentViewInfo: async () => {
    try {
      const result = await invokeWindowRoute<any>("get-current-view-info")
      if (!result) return null

      return {
        viewId: result.id ?? null,
        windowId: result.parentWindowId ?? null,
        isDetached: result.config?.type === "detached"
      }
    } catch (error) {
      log.warn("[winControl] 获取视图信息失败", error)
      return null
    }
  }
}

contextBridge.exposeInMainWorld("naimo", windowControl)
