import { contextBridge, ipcRenderer } from "electron";
import log from "electron-log/renderer";
import { readFile } from 'fs/promises'
import { RendererErrorHandler } from "@libs/unhandled/renderer";
import { ipcRouter } from "@shared/utils/ipcRouterClient";
import { eventRouter } from "@shared/utils/eventRouterClient";
import { isFunction } from "@shared/utils/common/typeUtils";
import { automateWithJson, fetchHTML, fetchJSON, parseHtmlByConfig, createRendererUBrowser, createInstantUBrowser } from "@libs/auto-puppeteer/renderer";

// @ts-ignore
const prefix = `${__METADATA__['fullPath']?.split(':')?.[0] || __METADATA__['title']}`;
const hooks: Record<string, ((params: any) => void)[]> = { enter: [], exit: [], search: [] }

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
    put: (doc: any, name = "") => ipcRouter.dbPut(doc, [prefix, name].join("_")),
    get: (id: string, name = "") => ipcRouter.dbGet(id, [prefix, name].join("_")),
    remove: (id: string, name = "") => ipcRouter.dbRemove(id, [prefix, name].join("_")),
    allDocs: (docPrefix?: string, name = "") => ipcRouter.dbAllDocs(docPrefix, [prefix, name].join("_")),
    bulkDocs: (docs: any[], name = "") => ipcRouter.dbBulkDocs(docs, [prefix, name].join("_")),
    putAttachment: (id: string, data: Buffer, type: string, name = "") =>
      ipcRouter.dbPutAttachment(id, data, type, [prefix, name].join("_")),
    getAttachment: (id: string, name = "") => ipcRouter.dbGetAttachment(id, [prefix, name].join("_")),
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

  // ========== 网页自动化 (auto-puppeteer) ==========
  automation: {
    automateWithJson: (config: any) => automateWithJson(config),
    parseHtmlByConfig: (config: any, html: string) => parseHtmlByConfig(config, html),
    fetchHTML: (url: string, asyncConfig: any = null) => fetchHTML(url, asyncConfig),
    fetchJSON: (url: string) => fetchJSON(url),
  },

  // ========== 可编程浏览器 (ubrowser) ==========
  ubrowser: createRendererUBrowser((channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args)
  ),

  // ========== 即时执行浏览器 (ibrowser) ==========
  ibrowser: createInstantUBrowser((channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args)
  ),

  // ========== 事件系统 ==========
  onEnter: (callback: (params: any) => void) => {
    hooks.enter.push(callback);
  },

  onExit: (callback: () => void) => {
    hooks.exit.push(callback);
  },

  onSearch: (callback: (params: any) => void) => {
    hooks.search.push(callback);
  },

  getFeatures: async (codes: string[]) => {
    try {
      // 获取所有已安装的插件
      const plugins = await ipcRouter.pluginGetAllInstalledPlugins();

      // 读取所有插件的配置文件
      const configContents = await Promise.all(
        plugins.map(plugin => readFile(plugin.configPath, 'utf-8'))
      );

      // 解析配置文件并提取所有 features
      const allFeatures = configContents
        .map(content => {
          try {
            const config = JSON.parse(content);
            if (config.feature) {
              config.feature.map((feature: any) => ({
                ...feature,
                fullPath: config.id + ':' + feature.path,
              }));
            }
            return config;
          } catch (error) {
            console.error('Failed to parse plugin config:', error);
            return null;
          }
        })
        .filter(config => config && config.feature) // 过滤掉解析失败或没有 feature 的配置
        .flatMap(config => config.feature); // 展平所有 features

      // 如果没有提供 codes 参数或为空数组，返回所有 features
      if (!codes || codes.length === 0) {
        return allFeatures;
      }

      // 根据 codes 过滤匹配的 features
      return allFeatures.filter(feature => codes.includes(feature.path));
    } catch (error) {
      console.error('Failed to get features:', error);
      return [];
    }
  }
};

contextBridge.exposeInMainWorld("naimo", naimo);

eventRouter.onPluginSearch((event, data) => {
  try {
    hooks.search.forEach(callback => isFunction(callback) && callback(data.searchText));
  } catch (error) {
    console.error("PRELOAD Hooks 执行失败:", error);
    log.error("PRELOAD Hooks 执行失败:", error);
  }
});

eventRouter.onPluginMessage((event, data) => {
  try {
    const targetKey = data.fullPath.split(":").slice(1).join(":")
    const targetFunc = module.exports[targetKey]
    if (targetFunc && targetFunc?.onEnter) {
      targetFunc.onEnter(data.data)
      try {
        hooks.enter.forEach(callback => isFunction(callback) && callback(data.data));
      } catch (error) {
        console.error("PRELOAD Hooks 执行失败:", error);
        log.error("PRELOAD Hooks 执行失败:", error);
      }
    } else {
      console.log('PRELOAD 收到主进程传递的参数失败:', { fullPath: data.fullPath, modules: module.exports, targetKey, targetFunc });
    }
  } catch (error) {
    console.log(error, { fullPath: data.fullPath, modules: module.exports, });
    log.error("PRELOAD 收到主进程传递的参数失败:", error);
  }
});
