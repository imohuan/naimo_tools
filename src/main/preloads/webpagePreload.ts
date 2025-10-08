import { contextBridge, ipcRenderer } from "electron";
import log from "electron-log/renderer";
import { RendererErrorHandler } from "@libs/unhandled/renderer";
import { ipcRouter } from "@shared/utils/ipcRouterClient";
import { eventRouter } from "@shared/utils/eventRouterClient";

// @ts-ignore
const prefix = `${__METADATA__['fullPath']?.split(':')?.[0] || __METADATA__['title']}`;

/**
 * Naimo API - uTools 兼容层
 * 提供插件开发所需的所有 API
 */
const naimo = {
  // ========== 日志系统 ==========
  log: {
    error: (message: string, ...args: any[]) => log.error(prefix + message, ...args),
    warn: (message: string, ...args: any[]) => log.warn(prefix + message, ...args),
    info: (message: string, ...args: any[]) => log.info(prefix + message, ...args),
    debug: (message: string, ...args: any[]) => log.debug(prefix + message, ...args),
    throw_error: (error: any, options?: { title?: string }) => {
      RendererErrorHandler.getInstance().logError(error, options);
    },
  },

  // ========== 窗口管理 ==========
  window: {
    hide: () => ipcRouter.windowHide(),
    show: () => ipcRouter.windowShow(),
    close: () => ipcRouter.windowClose(),
    minimize: () => ipcRouter.windowMinimize(),
    maximize: () => ipcRouter.windowMaximize(),
    setHeight: (height: number) => ipcRouter.windowAdjustHeight(height),
    setSize: (width: number, height: number) => ipcRouter.windowSetSize(width, height),
    create: (url: string, options?: any) => {
      // 使用插件视图创建窗口
      return ipcRouter.windowCreatePluginView({ url, ...options });
    },
  },

  // ========== 文档数据库 (db) ==========
  db: {
    put: (doc: any) => ipcRouter.dbPut(doc, prefix),
    get: (id: string) => ipcRouter.dbGet(id, prefix),
    remove: (id: string) => ipcRouter.dbRemove(id, prefix),
    allDocs: (docPrefix?: string) => ipcRouter.dbAllDocs(docPrefix, prefix),
    bulkDocs: (docs: any[]) => ipcRouter.dbBulkDocs(docs, prefix),
    putAttachment: (id: string, data: Buffer, type: string) =>
      ipcRouter.dbPutAttachment(id, data, type, prefix),
    getAttachment: (id: string) => ipcRouter.dbGetAttachment(id, prefix),
  },

  // ========== 简单键值存储 (storage - 兼容 localStorage) ==========
  storage: {
    setItem: (key: string, value: any) => ipcRouter.storeSet(['pluginSettings', prefix, key].join(".") as any, value),
    getItem: (key: string) => ipcRouter.storeGet(['pluginSettings', prefix, key].join(".") as any),
    removeItem: (key: string) => ipcRouter.storeDeleteKey(['pluginSettings', prefix, key].join(".") as any),
    clear: () => ipcRouter.storeClear(),
    getAllItems: () => ipcRouter.storeGetAllByPrefix(['pluginSettings', prefix].join(".")),
  },

  // ========== 剪贴板 ==========
  clipboard: {
    readText: () => ipcRouter.clipboardReadText(),
    writeText: (text: string) => ipcRouter.clipboardWriteText(text),
    readImage: () => ipcRouter.clipboardReadImageAsBase64(),
    writeImage: (imageData: string) => ipcRouter.clipboardWriteImage(imageData),
    hasText: () => ipcRouter.clipboardHasText(),
    hasImage: () => ipcRouter.clipboardHasImage(),
    clear: () => ipcRouter.clipboardClear(),
  },

  // ========== Shell 操作 ==========
  shell: {
    openPath: (path: string) => ipcRouter.shellOpenPath(path),
    openUrl: (url: string) => ipcRouter.shellOpenUrl(url),
    showInFolder: (path: string) => ipcRouter.shellShowInFolder(path),
    moveToTrash: (path: string) => ipcRouter.shellMoveToTrash(path),
    beep: () => ipcRouter.shellBeep(),
  },

  // ========== 系统信息与操作 ==========
  system: {
    notify: (message: string, title?: string) =>
      ipcRouter.shellShowNotification(message, title),
    getPath: (name: string) => ipcRouter.shellGetPath(name as any),
    getDeviceId: () => ipcRouter.shellGetDeviceId(),
    getVersion: () => ipcRouter.appGetVersion(),
    getName: () => ipcRouter.appGetName(),
    getFileIcon: (path: string) => ipcRouter.appExtractFileIcon(path),
    isMac: () => ipcRouter.appGetSystemInfo()
      .then((info: any) => info.platform === "darwin"),
    isWindows: () => ipcRouter.appGetSystemInfo()
      .then((info: any) => info.platform === "win32"),
    isLinux: () => ipcRouter.appGetSystemInfo()
      .then((info: any) => info.platform === "linux"),
  },

  // ========== 屏幕与显示器 ==========
  screen: {
    capture: (options?: { sourceId?: string }) =>
      ipcRouter.screenCaptureCaptureAndGetFilePath(options || {}),
    getSources: (options: { types: ("screen" | "window")[]; thumbnailSize?: { width: number; height: number } }) =>
      ipcRouter.screenCaptureGetSources(options),
    getCursorPosition: () => ipcRouter.displayGetCursorPosition(),
    getPrimaryDisplay: () => ipcRouter.displayGetPrimaryDisplay(),
    getAllDisplays: () => ipcRouter.displayGetAllDisplays(),
    getDisplayNearestPoint: (point: { x: number; y: number }) =>
      ipcRouter.displayGetDisplayNearestPoint(point),
    screenToDipPoint: (point: { x: number; y: number }) =>
      ipcRouter.displayScreenToDipPoint(point),
    dipToScreenPoint: (point: { x: number; y: number }) =>
      ipcRouter.displayDipToScreenPoint(point),
  },

  // ========== 对话框 ==========
  dialog: {
    showOpen: (options?: any) => ipcRouter.dialogShowOpenDialog(options),
    showSave: (options?: any) => ipcRouter.dialogShowSaveDialog(options),
    showMessage: (options: any) => ipcRouter.dialogShowMessageBox(options),
    showError: (title: string, content: string) =>
      ipcRouter.dialogShowErrorBox(title, content),
  },

  // ========== 输入模拟 ==========
  input: {
    pasteText: (text: string) => ipcRouter.inputPasteText(text),
    pasteImage: (imageData: string) => ipcRouter.inputPasteImage(imageData),
    pasteFile: (filePath: string | string[]) =>
      ipcRouter.inputPasteFile(filePath),
    simulateKeyPress: (key: string) => ipcRouter.inputSimulateKeyPress(key),
    simulateHotkey: (modifiers: string[], key: string) =>
      ipcRouter.inputSimulateHotkey(modifiers, key),
  },

  // ========== 事件系统 ==========
  onEnter: (callback: (params: any) => void) => {
    console.warn("请使用 module.exports 导出 onEnter 函数");
  },

  onExit: (callback: () => void) => {
    // 使用 eventRouter 监听退出事件
    // TODO: 实现插件退出事件监听
    console.warn("插件退出事件尚未实现");
  },
};

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
