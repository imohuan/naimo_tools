
// 类型声明
import type { AllIpcRouter } from './ipc-routes';
import type { DomParserConfig, AutomationConfig, HtmlFetchResult } from '../../libs/auto-puppeteer/typings';

interface WebUtils {
  /**
   * 获取文件的实际路径
   * @param file 文件对象
   * @returns 文件的实际路径
   */
  getPathForFile: (file: File) => string;
  /**
   * 安全地加载插件配置文件
   * @param configPath 配置文件路径
   * @returns 插件配置对象
   */
  loadPluginConfig: (configPath: string) => Promise<any>;
}

interface ElectronAPI {
  log: {
    error: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
    throw_error: (error: any, options?: { title?: string }) => void;
  };
  sendTo: {
    windowMove: (id: number, x: number, y: number, width: number, height: number) => void;
  };
  router: AllIpcRouter;
  webUtils: WebUtils;
  auto: {
    parseHtmlByConfig: (config: DomParserConfig | DomParserConfig[], html: string) => any;
    fetchHTML: (url: string, asyncConfig?: AutomationConfig | null) => Promise<HtmlFetchResult>;
    fetchJSON: (url: string) => Promise<any>;
    automateWithJson: (config: AutomationConfig) => Promise<string>;
  };
  download: {
    startDownload: (params: { url: string; saveAsFilename?: string; directory?: string }) => Promise<string>;
    pauseDownload: (id: string) => Promise<boolean>;
    resumeDownload: (id: string) => Promise<boolean>;
    cancelDownload: (id: string) => Promise<boolean>;
    getAllDownloads: () => Promise<any[]>;
    selectDownloadDirectory: () => Promise<string | null>;
    openDownloadFolder: (filePath: string) => Promise<boolean>;
    deleteDownload: (id: string) => Promise<boolean>;
    onDownloadStarted: (callback: (data: any) => void) => void;
    onDownloadProgress: (callback: (data: any) => void) => void;
    onDownloadCompleted: (callback: (data: any) => void) => void;
    onDownloadError: (callback: (data: any) => void) => void;
    onDownloadPaused: (callback: (data: any) => void) => void;
    onDownloadResumed: (callback: (data: any) => void) => void;
    onDownloadCancelled: (callback: (data: any) => void) => void;
    onDownloadDeleted: (callback: (data: { id: string }) => void) => void;
    removeAllListeners: () => void;
  };
}


declare interface PluginApi {
  /**
   * 获取插件资源的实际路径
   * @param path 资源路径
   * @returns 资源实际路径
   */
  getResourcePath: (path: string) => string | null;

  /** 
   * 注册钩子事件处理器
   * @param event 事件名称
   * @param handler 钩子处理函数
   */
  onHook: (event: string, handler: (...args: any[]) => void | Promise<void>) => void

  /**
   * 获取插件设置的值
   * @param settingName 设置项名称（可选）
   * @returns 返回设置项的值
   */
  getSettingValue: (settingName?: string) => Promise<any>

  /**
   * 设置插件设置的值
   * @param settingName 设置项名称
   * @param value 设置项的值
   * @returns 设置是否成功
   */
  setSettingValue: (settingName: string, value: any) => Promise<boolean>

  /**
   * 注册命令事件处理器
   * @param event 命令事件名称
   * @param description 命令描述
   * @param handler 命令处理函数
   */
  onCommand: (event: string, description: string, handler: (...args: any[]) => void | Promise<void>) => void

  /**
   * 触发命令事件
   * @param event 命令事件名称
   * @param args 命令参数
   */
  emitCommand: (event: string, ...args: any[]) => void

  /**
   * 切换输入框显示状态
   * @param value 是否显示输入框（可选）
   */
  toggleInput: (value?: boolean) => void

  /**
   * 打开插件窗口
   */
  openPluginWindow: () => void

  /**
   * 添加文件路径到文件列表
   * @param name 文件名称
   * @param path 文件路径
   */
  addPathToFileList: (name: string, path: string) => Promise<void>

  /**
   * 打开网页窗口
   * @param url 网页地址
   * @param options 其他选项（可选）
   */
  openWebPageWindow: (url: string, options?: any) => Promise<void>

  /**
   * 插件管理对象
   */
  plugin: {
    /**
     * 通过 zip 包安装插件
     * @param zipPath zip 文件路径
     * @returns 安装是否成功
     */
    installZip: (zipPath: string) => Promise<boolean>
    /**
     * 安装插件
     * @param pluginData 插件配置信息
     * @returns 安装是否成功
     */
    install: (pluginData: any) => Promise<boolean>
    /**
     * 卸载插件
     * @param pluginId 插件ID
     * @returns 卸载是否成功
     */
    uninstall: (pluginId: string) => Promise<boolean>
    /**
     * 启用或禁用插件
     * @param pluginId 插件ID
     * @param enabled 是否启用
     * @returns 操作是否成功
     */
    toggle: (pluginId: string, enabled: boolean) => Promise<boolean>
  }
}

declare global {
  const naimo: ElectronAPI
  interface Window {
    id: number | null;
    naimo: ElectronAPI;
    electronAPI: ElectronAPI;
  }
}