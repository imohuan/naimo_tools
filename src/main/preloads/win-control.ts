import { ipcRouter } from "@shared/ipc-router-client";
import { contextBridge } from "electron";

const naimo = {
  close: () => ipcRouter.windowClose(),
  maximize: () => ipcRouter.windowMaximize(),
  minimize: () => ipcRouter.windowMinimize(),
  reattach: async () => {
    // 获取当前窗口ID并调用重新附加
    try {
      const viewInfo = await ipcRouter.windowGetCurrentViewInfo()
      if (viewInfo && viewInfo.parentWindowId) {
        return await ipcRouter.windowReattachNewView(viewInfo.parentWindowId)
      }
      throw new Error('无法获取当前窗口ID')
    } catch (error) {
      console.error('重新附加失败:', error)
      throw error
    }
  },
}

contextBridge.exposeInMainWorld("naimo", naimo);


