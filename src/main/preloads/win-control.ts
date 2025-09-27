import { ipcRouter } from "@shared/ipc-router-client";
import { contextBridge } from "electron";

const naimo = {
  close: () => ipcRouter.windowClose(),
  maximize: () => ipcRouter.windowMaximize(),
  minimize: () => ipcRouter.windowMinimize(),
}

contextBridge.exposeInMainWorld("naimo", naimo);




