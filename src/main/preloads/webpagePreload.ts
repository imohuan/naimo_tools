import { contextBridge, ipcRenderer } from "electron";
import log from "electron-log/renderer";
import { set } from "lodash-es"
import { readFile } from 'fs/promises'
import { downloadManagerRenderer } from "@libs/download-manager/renderer";
import { RendererErrorHandler } from "@libs/unhandled/renderer";
import { ipcRouter } from "@shared/utils/ipcRouterClient";
import { eventRouter } from "@shared/utils/eventRouterClient";
import { isFunction } from "@shared/utils/common/typeUtils";
import { automateWithJson, fetchHTML, fetchJSON, parseHtmlByConfig, createRendererUBrowser, createInstantUBrowser } from "@libs/auto-puppeteer/renderer";
import { PluginItemData, PluginItem } from "@renderer/src/typings";

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
    /** 记录错误日志 */
    error: (message: string, ...args: any[]) => log.error(prefix + message, ...args),
    /** 记录警告日志 */
    warn: (message: string, ...args: any[]) => log.warn(prefix + message, ...args),
    /** 记录信息日志 */
    info: (message: string, ...args: any[]) => log.info(prefix + message, ...args),
    /** 记录调试日志 */
    debug: (message: string, ...args: any[]) => log.debug(prefix + message, ...args),
    /** 抛出错误并显示错误对话框 */
    throw_error: (error: any, options?: { title?: string }) => {
      RendererErrorHandler.getInstance().logError(error, options);
    },
  },

  // ========== 下载管理 ==========
  /** 下载管理 */
  download: downloadManagerRenderer,

  // ========== 窗口管理 ==========
  window: {
    /** 隐藏当前窗口 */
    hide: () => ipcRouter.windowHide(),
    /** 显示当前窗口 */
    show: () => ipcRouter.windowShow(),
    /** 关闭当前窗口 */
    close: () => ipcRouter.windowClose(),
    /** 最小化当前窗口 */
    minimize: () => ipcRouter.windowMinimize(),
    /** 最大化当前窗口 */
    maximize: () => ipcRouter.windowMaximize(),
    /** 设置窗口高度 */
    setHeight: (height: number) => ipcRouter.windowAdjustHeight(height),
    /** 设置窗口尺寸 */
    setSize: (width: number, height: number) => ipcRouter.windowSetSize(width, height),
    /** 创建新窗口 */
    create: (url: string, options?: any) => {
      return ipcRouter.windowCreatePluginView({ url, ...options });
    },
  },

  // ========== 文档数据库 (db) ==========
  db: {
    /** 存储文档（必须包含 _id 字段） */
    put: (doc: any, name = "") => ipcRouter.dbPut(doc, [prefix, name].join("_")),
    /** 获取文档 */
    get: (id: string, name = "") => ipcRouter.dbGet(id, [prefix, name].join("_")),
    /** 删除文档 */
    remove: (id: string, name = "") => ipcRouter.dbRemove(id, [prefix, name].join("_")),
    /** 获取所有文档 */
    allDocs: (docPrefix?: string, name = "") => ipcRouter.dbAllDocs(docPrefix, [prefix, name].join("_")),
    /** 批量存储文档 */
    bulkDocs: (docs: any[], name = "") => ipcRouter.dbBulkDocs(docs, [prefix, name].join("_")),
    /** 存储附件 */
    putAttachment: (id: string, data: Buffer, type: string, name = "") =>
      ipcRouter.dbPutAttachment(id, data, type, [prefix, name].join("_")),
    /** 获取附件 */
    getAttachment: (id: string, name = "") => ipcRouter.dbGetAttachment(id, [prefix, name].join("_")),
  },

  // ========== 简单键值存储 (storage - 兼容 localStorage) ==========
  storage: {
    /** 存储键值对（支持任意类型，会自动序列化） */
    setItem: (key: string, value: any) => ipcRouter.storeSet(['pluginSettings', prefix, key].join(".") as any, value),
    /** 获取值 */
    getItem: (key: string) => ipcRouter.storeGet(['pluginSettings', prefix, key].join(".") as any),
    /** 删除键值对 */
    removeItem: (key: string) => ipcRouter.storeDeleteKey(['pluginSettings', prefix, key].join(".") as any),
    /** 清空所有存储 */
    clear: () => ipcRouter.storeClear(),
    /** 获取所有键值对 */
    getAllItems: () => ipcRouter.storeGetAllByPrefix(['pluginSettings', prefix].join(".")),
  },

  // ========== 剪贴板 ==========
  clipboard: {
    /** 读取剪贴板文本 */
    readText: () => ipcRouter.clipboardReadText(),
    /** 写入文本到剪贴板 */
    writeText: (text: string) => ipcRouter.clipboardWriteText(text),
    /** 读取剪贴板图片（base64 格式） */
    readImage: () => ipcRouter.clipboardReadImageAsBase64(),
    /** 写入图片到剪贴板 */
    writeImage: (imageData: string) => ipcRouter.clipboardWriteImage(imageData),
    /** 检查剪贴板是否有文本 */
    hasText: () => ipcRouter.clipboardHasText(),
    /** 检查剪贴板是否有图片 */
    hasImage: () => ipcRouter.clipboardHasImage(),
    /** 清空剪贴板 */
    clear: () => ipcRouter.clipboardClear(),
  },

  // ========== Shell 操作 ==========
  shell: {
    /** 打开文件或目录 */
    openPath: (path: string) => ipcRouter.shellOpenPath(path),
    /** 打开 URL */
    openUrl: (url: string) => ipcRouter.shellOpenUrl(url),
    /** 在文件管理器中显示文件 */
    showInFolder: (path: string) => ipcRouter.shellShowInFolder(path),
    /** 移动到回收站 */
    moveToTrash: (path: string) => ipcRouter.shellMoveToTrash(path),
    /** 系统提示音 */
    beep: () => ipcRouter.shellBeep(),
  },

  // ========== 系统信息与操作 ==========
  system: {
    /** 显示系统通知 */
    notify: (message: string, title?: string) =>
      ipcRouter.shellShowNotification(message, title),
    /** 获取系统路径（如 'home', 'appData', 'userData', 'temp', 'downloads' 等） */
    getPath: (name: string) => ipcRouter.shellGetPath(name as any),
    /** 获取设备唯一标识 */
    getDeviceId: () => ipcRouter.shellGetDeviceId(),
    /** 获取应用版本号 */
    getVersion: () => ipcRouter.appGetVersion(),
    /** 获取应用名称 */
    getName: () => ipcRouter.appGetName(),
    /** 获取文件图标 */
    getFileIcon: (path: string) => ipcRouter.appExtractFileIcon(path),
    /** 获取本地地址图片 */
    getLocalImage: (path: string) => ipcRouter.filesystemReadFileContent(path, 'base64'),
    /** 判断是否为 macOS 系统 */
    isMac: () => ipcRouter.appGetSystemInfo()
      .then((info: any) => info.platform === "darwin"),
    /** 判断是否为 Windows 系统 */
    isWindows: () => ipcRouter.appGetSystemInfo()
      .then((info: any) => info.platform === "win32"),
    /** 判断是否为 Linux 系统 */
    isLinux: () => ipcRouter.appGetSystemInfo()
      .then((info: any) => info.platform === "linux"),
  },

  // ========== 屏幕与显示器 ==========
  screen: {
    /** 截屏并获取文件路径 */
    capture: (options?: { sourceId?: string }) =>
      ipcRouter.screenCaptureCaptureAndGetFilePath(options || {}),
    /** 获取屏幕源列表 */
    getSources: (options: { types: ("screen" | "window")[]; thumbnailSize?: { width: number; height: number } }) =>
      ipcRouter.screenCaptureGetSources(options),
    /** 获取鼠标位置 */
    getCursorPosition: () => ipcRouter.displayGetCursorPosition(),
    /** 获取主显示器信息 */
    getPrimaryDisplay: () => ipcRouter.displayGetPrimaryDisplay(),
    /** 获取所有显示器信息 */
    getAllDisplays: () => ipcRouter.displayGetAllDisplays(),
    /** 获取指定点附近的显示器 */
    getDisplayNearestPoint: (point: { x: number; y: number }) =>
      ipcRouter.displayGetDisplayNearestPoint(point),
    /** 将屏幕坐标转换为 DIP 坐标 */
    screenToDipPoint: (point: { x: number; y: number }) =>
      ipcRouter.displayScreenToDipPoint(point),
    /** 将 DIP 坐标转换为屏幕坐标 */
    dipToScreenPoint: (point: { x: number; y: number }) =>
      ipcRouter.displayDipToScreenPoint(point),
  },

  // ========== 对话框 ==========
  dialog: {
    /** 显示打开文件对话框 */
    showOpen: (options?: any) => ipcRouter.dialogShowOpenDialog(options),
    /** 显示保存文件对话框 */
    showSave: (options?: any) => ipcRouter.dialogShowSaveDialog(options),
    /** 显示消息框 */
    showMessage: (options: any) => ipcRouter.dialogShowMessageBox(options),
    /** 显示错误框 */
    showError: (title: string, content: string) =>
      ipcRouter.dialogShowErrorBox(title, content),
  },

  // ========== 输入模拟 ==========
  input: {
    /** 粘贴文本到当前活动窗口 */
    pasteText: (text: string) => ipcRouter.inputPasteText(text),
    /** 粘贴图片到当前活动窗口 */
    pasteImage: (imageData: string) => ipcRouter.inputPasteImage(imageData),
    /** 粘贴文件到当前活动窗口 */
    pasteFile: (filePath: string | string[]) =>
      ipcRouter.inputPasteFile(filePath),
    /** 模拟按键 */
    simulateKeyPress: (key: string) => ipcRouter.inputSimulateKeyPress(key),
    /** 模拟快捷键 */
    simulateHotkey: (modifiers: string[], key: string) =>
      ipcRouter.inputSimulateHotkey(modifiers, key),
  },

  // ========== 网页自动化 (auto-puppeteer) ==========
  automation: {
    /** 使用 JSON 配置执行自动化任务 */
    automateWithJson: (config: any) => automateWithJson(config),
    /** 使用配置解析 HTML */
    parseHtmlByConfig: (config: any, html: string) => parseHtmlByConfig(config, html),
    /** 获取网页 HTML */
    fetchHTML: (url: string, asyncConfig: any = null) => fetchHTML(url, asyncConfig),
    /** 获取 JSON 数据 */
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
  /** 注册功能进入钩子（当功能被触发时调用） */
  onEnter: (callback: (params: PluginItemData) => void) => {
    hooks.enter.push(callback);
  },

  /** 注册功能退出钩子（当功能窗口关闭时调用） */
  onExit: (callback: () => void) => {
    hooks.exit.push(callback);
  },

  /** 注册搜索钩子（当用户在搜索框输入时调用） */
  onSearch: (callback: (params: any) => void) => {
    hooks.search.push(callback);
  },

  /**
   * 获取所有已安装插件的功能列表
   * @param codes 功能代码数组（可选，为空则返回所有功能）
   * @returns 插件功能列表
   */
  getFeatures: async (codes: string[]): Promise<PluginItem[]> => {
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
  },

  // ========== 插件管理 ==========

  /**
   * 热更新
   * @returns 执行结束后的回调
   */
  hot() {
    log.info(`热重载::::: plugin:${prefix}-hot-reload`)
    // @ts-ignore
    return ipcRenderer.invoke(`plugin:${prefix}-hot-reload`)
  },

  /**
   * 设置搜索框可见性 (主窗口接收)
   * @param value 
   */
  visibleInput(value: boolean) {
    ipcRouter.appForwardMessageToMainView("set-visible-input", { value })
  },
};

export type Naimo = typeof naimo;
set(window, "naimo", naimo);

contextBridge.exposeInMainWorld("naimo", naimo);

eventRouter.onPluginSearch((event, data) => {
  try {
    hooks.search.forEach(callback => isFunction(callback) && callback(data.searchText));
  } catch (error) {
    console.error("PRELOAD Hooks 执行失败:", error);
    log.error("PRELOAD Hooks 执行失败:", error);
  }
});



eventRouter.onPluginExit(() => {
  try {
    hooks.exit.forEach(callback => isFunction(callback) && callback(null));
  } catch (error) {
    console.error("PRELOAD Hooks 执行失败:", error);
    log.error("PRELOAD Hooks 执行失败:", error);
  }
});

const loaded = new Promise((resolve) => window.addEventListener('DOMContentLoaded', () => resolve(true)));

eventRouter.onPluginMessage(async (event, data) => {
  await loaded;
  await naimo.visibleInput(false)

  try {
    const targetKey = data.fullPath.split(":").slice(1).join(":")
    const targetFunc = module.exports[targetKey]
    if (targetFunc && targetFunc?.onEnter) {
      await targetFunc.onEnter(data.data)
    } else {
      console.log('PRELOAD 收到主进程传递的参数失败:', { fullPath: data.fullPath, modules: module.exports, targetKey, targetFunc });
    }
  } catch (error) {
    console.log(error, { fullPath: data.fullPath, modules: module.exports, });
    log.error("PRELOAD 收到主进程传递的参数失败:", error);
  }

  try {
    hooks.enter.forEach(callback => isFunction(callback) && callback(data.data));
  } catch (error) {
    console.error("PRELOAD Hooks 执行失败:", error);
    log.error("PRELOAD Hooks 执行失败:", error);
  }
});
