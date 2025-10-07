import { contextBridge, ipcRenderer } from "electron";
import log from "electron-log/renderer";
import { RendererErrorHandler } from "@libs/unhandled/renderer";

const prefix = "[webpagePreload] ";

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