import { contextBridge, ipcRenderer } from "electron";
import log from "electron-log/renderer";
import { RendererErrorHandler } from "@libs/unhandled/renderer";
import { ipcRouter } from "@shared/utils/ipcRouterClient";
import { eventRouter } from "@shared/utils/eventRouterClient";

// @ts-ignore
const prefix = `${__METADATA__['fullPath']?.split(':')?.[0] || __METADATA__['title']}`;

const naimo = {
  log: {
    error: (message: string, ...args: any[]) => log.error(prefix + message, ...args),
    warn: (message: string, ...args: any[]) => log.warn(prefix + message, ...args),
    info: (message: string, ...args: any[]) => log.info(prefix + message, ...args),
    debug: (message: string, ...args: any[]) => log.debug(prefix + message, ...args),
    throw_error: (error: any, options?: { title?: string }) => {
      RendererErrorHandler.getInstance().logError(error, options);
    },
  },
}

contextBridge.exposeInMainWorld("naimo", naimo);

eventRouter.onPluginMessage((event, data) => {
  try {
    const targetKey = data.fullPath.split(":").slice(1).join(":")
    const targetFunc = module.exports[targetKey]
    if (targetFunc && targetFunc?.onEnter) return targetFunc.onEnter(data.data)
    console.log('PRELOAD 收到主进程传递的参数失败:', { fullPath: data.fullPath, modules: module.exports, targetKey, targetFunc });
  } catch (error) {
    console.log(error, { fullPath: data.fullPath, modules: module.exports });
    log.error("PRELOAD 收到主进程传递的参数失败:", error);
  }
});
