/**
 * Naimo Tools 插件 API 类型声明
 * 
 * @version 2.0
 * @date 2025-10-09
 * 
 * 本文件由脚本自动生成，请勿手动修改
 * 生成脚本: scripts/generate-naimo-types.js
 * 源文件: src/main/preloads/webpagePreload.ts (动态分析提取)
 */

// ==================== 依赖类型定义 ====================

// 从 shared/typings/naimoApiTypes.ts 提取的类型

/**
 * 数据库操作结果
 * 执行数据库操作后返回的结果对象
 */
interface DbResult {
  /** 文档 ID */
  id: string;
  /** 文档修订版本号 */
  rev?: string;
  /** 操作是否成功 */
  ok?: boolean;
  /** 是否发生错误 */
  error?: boolean;
  /** 错误名称 */
  name?: string;
  /** 错误消息 */
  message?: string;
}

/**
 * Naimo API 类型定义
 * 兼容 uTools API 风格
 */
/**
 * 数据库文档接口
 * 文档数据库中存储的数据结构
 */
interface DbDoc {
  /** 文档唯一标识符 */
  _id: string;
  /** 文档修订版本号（用于冲突检测） */
  _rev?: string;
  /** 其他自定义字段 */
  [key: string]: any;
}

/**
 * 显示器信息接口
 * 包含显示器的物理属性和工作区信息
 */
interface Display {
  /** 显示器唯一标识符 */
  id: number;
  /** 显示器边界（屏幕在桌面坐标系中的位置和大小） */
  bounds: { x: number; y: number; width: number; height: number };
  /** 工作区域（不包含任务栏等系统UI的可用区域） */
  workArea: { x: number; y: number; width: number; height: number };
  /** 缩放因子（如 1.0 表示 100%，1.5 表示 150%） */
  scaleFactor: number;
  /** 旋转角度（0, 90, 180, 270） */
  rotation: number;
  /** 是否为内置显示器（笔记本屏幕为 true） */
  internal: boolean;
}

// 从 libs/auto-puppeteer/typings.ts 提取的类型

/**
 * HTML 获取结果接口
 */
interface HtmlFetchResult {
  /** 原始HTML内容 */
  html: string;
  /** 根据配置解析数据 */
  getConfig: (config: DomParserConfig | DomParserConfig[]) => any;
  /** 获取页面标题 */
  getTitle: () => any;
  /** 获取所有链接 */
  getLinks: () => any;
  /** 获取所有图片 */
  getImages: () => any;
}

/**
 * DOM 解析配置接口
 */
interface DomParserConfig {
  /** CSS 选择器表达式 */
  cls: string;
  /** 字段描述 */
  desc?: string;
  /** 后处理函数 */
  process?: (value: any) => any;
  /** 子节点配置 */
  children?: DomParserConfig[];
  /** 字段名称 */
  name?: string;
}

// 插件系统辅助类型

/**
 * 窗口配置接口
 * 用于配置 UBrowser 浏览器窗口的外观和行为
 */
interface WindowConfig {
  // 窗口基本设置
  /** 是否显示窗口（默认 true） */
  show?: boolean;
  /** 窗口宽度（像素） */
  width?: number;
  /** 窗口高度（像素） */
  height?: number;
  /** 窗口 X 坐标 */
  x?: number;
  /** 窗口 Y 坐标 */
  y?: number;
  /** 是否居中显示 */
  center?: boolean;
  /** 最小宽度 */
  minWidth?: number;
  /** 最小高度 */
  minHeight?: number;
  /** 最大宽度 */
  maxWidth?: number;
  /** 最大高度 */
  maxHeight?: number;
  /** 是否可调整大小 */
  resizable?: boolean;
  /** 是否可移动 */
  movable?: boolean;
  /** 是否可最小化 */
  minimizable?: boolean;
  /** 是否可最大化 */
  maximizable?: boolean;
  /** 是否始终置顶 */
  alwaysOnTop?: boolean;
  /** 是否全屏 */
  fullscreen?: boolean;
  /** 是否可切换全屏 */
  fullscreenable?: boolean;
  /** 是否允许窗口大于屏幕 */
  enableLargerThanScreen?: boolean;
  /** 窗口透明度（0.0 - 1.0） */
  opacity?: number;
  /** 是否显示窗口边框 */
  frame?: boolean;

  // goto 相关设置
  /** 页面加载超时时间（毫秒） */
  timeout?: number;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 是否可关闭 */
  closable?: boolean;
  /** 是否可获取焦点 */
  focusable?: boolean;
  /** 是否在任务栏中隐藏 */
  skipTaskbar?: boolean;
  /** 背景颜色（十六进制格式，如 '#ffffff'） */
  backgroundColor?: string;
  /** 是否显示阴影 */
  hasShadow?: boolean;
  /** 是否透明背景 */
  transparent?: boolean;
  /** 标题栏样式 */
  titleBarStyle?: string;
  /** 是否使用厚边框（Windows） */
  thickFrame?: boolean;

  // 请求拦截配置
  /** 请求拦截配置 */
  requestInterception?: {
    /** 是否启用请求拦截 */
    enabled: boolean;
    /** 拦截规则正则表达式数组 */
    regex?: RegExp[];
  };

  // 自定义webPreferences
  /** 自定义 webPreferences 配置 */
  webPreferences?: any;
}

/**
 * 设备模拟选项
 * 用于模拟移动设备或其他设备的浏览器环境
 */
interface DeviceOptions {
  /** 用户代理字符串（User-Agent） */
  userAgent: string;
  /** 视口尺寸 */
  size: {
    /** 宽度（像素） */
    width: number;
    /** 高度（像素） */
    height: number;
  };
}

/**
 * UBrowser 浏览器实例
 * 可编程浏览器，用于自动化操作网页
 * 
 * 通过链式调用构建操作队列，最后调用 run() 执行
 * @example
 * await naimo.ubrowser.goto("https://example.com").wait("#content").click(".button").run()
 */
interface UBrowser {
  /** 导航到指定 URL */
  goto(url: string, options?: WindowConfig): UBrowser;
  /** 设置用户代理（User-Agent） */
  useragent(ua: string): UBrowser;
  /** 设置视口大小 */
  viewport(width: number, height: number): UBrowser;
  /** 隐藏浏览器窗口 */
  hide(): UBrowser;
  /** 显示浏览器窗口 */
  show(): UBrowser;
  /** 注入自定义 CSS 样式 */
  css(css: string): UBrowser;
  /** 在页面上下文中执行 JavaScript 代码或函数 */
  evaluate(func: Function | string, ...params?: any[]): UBrowser;
  /** 模拟按键操作 */
  press(key: string, options?: { delay?: number }): UBrowser;
  /** 点击指定选择器的元素 */
  click(selector: string): UBrowser;
  /** 在指定元素上按下鼠标 */
  mousedown(selector: string): UBrowser;
  /** 释放鼠标按键 */
  mouseup(): UBrowser;
  /** 上传文件到文件输入框 */
  file(selector: string, payload: string | string[] | Buffer): UBrowser;
  /** 在输入框中输入文本（模拟逐字输入） */
  type(selector: string, text: string, options?: { delay?: number }): UBrowser;
  /** 直接设置输入框的值（不触发输入事件） */
  value(selector: string, value: string): UBrowser;
  /** 选择下拉框选项 */
  select(selector: string, ...values?: string[]): UBrowser;
  /** 设置复选框或单选框的选中状态 */
  check(selector: string, checked: boolean): UBrowser;
  /** 聚焦到指定元素 */
  focus(selector: string): UBrowser;
  /** 滚动到指定元素或坐标位置 */
  scroll(selectorOrX: string | number, y?: number): UBrowser;
  /** 粘贴文本内容 */
  paste(text: string): UBrowser;
  /** 截取页面截图 */
  screenshot(options?: any): UBrowser;
  /** 生成页面 PDF */
  pdf(options?: any): UBrowser;
  /** 模拟设备环境（如手机、平板） */
  device(options: DeviceOptions): UBrowser;
  /** 等待指定时间、选择器或函数条件满足 */
  wait(msOrSelectorOrFunc: number | string | Function, timeout?: number, ...params?: any[]): UBrowser;
  /** 等待选择器元素出现 */
  waitForSelector(selector: string, options?: { visible?: boolean; hidden?: boolean; timeout?: number }): UBrowser;
  /** 等待选择器元素出现（简化版） */
  when(selector: string): UBrowser;
  /** 标记任务结束 */
  end(): UBrowser;
  /** 打开开发者工具 */
  devTools(mode?: 'right' | 'bottom' | 'undocked' | 'detach'): UBrowser;
  /** 获取指定 URL 的 Cookies */
  cookies(...urls?: string[]): UBrowser;
  /** 设置 Cookies */
  setCookie(...cookies?: any[]): UBrowser;
  /** 删除 Cookies */
  deleteCookie(...cookies?: any[]): UBrowser;
  /** 执行所有操作队列并返回结果 */
  run(options?: WindowConfig): Promise<[...any[], BrowserInstance]>;
}

/**
 * UBrowser 实例信息
 * 浏览器执行完成后返回的实例信息
 */
interface BrowserInstance {
  /** 浏览器实例 ID */
  id: number;
  /** 当前页面 URL */
  url: string;
  /** 当前页面标题 */
  title: string;
  /** 窗口宽度 */
  width: number;
  /** 窗口高度 */
  height: number;
  /** 窗口 X 坐标 */
  x: number;
  /** 窗口 Y 坐标 */
  y: number;
}

/**
 * 功能处理器接口
 */
interface FeatureHandler {
  /**
   * 功能进入钩子
   * @param params 触发参数
   * @param api 插件 API（预留，当前版本暂无可用方法）
   */
  onEnter?: (params: any, api?: any) => void | Promise<void>;
}

/**
 * 插件导出接口
 * 
 * 在 preload.js 中使用 module.exports 导出功能处理器
 */
interface PluginExports {
  [featurePath: string]: FeatureHandler;
}

// ==================== 动态生成的 API 接口 ====================

/**
 * 日志系统
 */
interface NaimoLog {
  /**
   * 记录错误日志
   * @param message string
   * @param ...args any[]
   */
  error(message: string, ...args?: any[]): void;

  /**
   * 记录警告日志
   * @param message string
   * @param ...args any[]
   */
  warn(message: string, ...args?: any[]): void;

  /**
   * 记录信息日志
   * @param message string
   * @param ...args any[]
   */
  info(message: string, ...args?: any[]): void;

  /**
   * 记录调试日志
   * @param message string
   * @param ...args any[]
   */
  debug(message: string, ...args?: any[]): void;

  /**
   * 抛出错误并显示错误对话框
   * @param error any
   * @param options { title?: string | undefined; } | undefined
   */
  throw_error(error: any, options?: { title?: string | undefined; } | undefined): any;

}

/**
 * 窗口管理
 */
interface NaimoWindow {
  /**
   * 隐藏当前窗口
   */
  hide(): Promise<any>;

  /**
   * 显示当前窗口
   */
  show(): Promise<any>;

  /**
   * 关闭当前窗口
   */
  close(): Promise<any>;

  /**
   * 最小化当前窗口
   */
  minimize(): Promise<any>;

  /**
   * 最大化当前窗口
   */
  maximize(): Promise<any>;

  /**
   * 设置窗口高度
   * @param height number
   */
  setHeight(height: number): Promise<any>;

  /**
   * 设置窗口尺寸
   * @param width number
   * @param height number
   */
  setSize(width: number, height: number): Promise<any>;

  /**
   * 创建新窗口
   * @param url string
   * @param options any
   */
  create(url: string, options?: any): Promise<any>;

}

/**
 * 文档数据库 (db)
 */
interface NaimoDb {
  /**
   * 存储文档（必须包含 _id 字段）
   * @param doc any
   * @param name string
   */
  put(doc: any, name?: string): Promise<any>;

  /**
   * 获取文档
   * @param id string
   * @param name string
   */
  get(id: string, name?: string): Promise<any>;

  /**
   * 删除文档
   * @param id string
   * @param name string
   */
  remove(id: string, name?: string): Promise<any>;

  /**
   * 获取所有文档
   * @param docPrefix string | undefined
   * @param name string
   */
  allDocs(docPrefix?: string | undefined, name?: string): Promise<any>;

  /**
   * 批量存储文档
   * @param docs any[]
   * @param name string
   */
  bulkDocs(docs: any[], name?: string): Promise<any>;

  /**
   * 存储附件
   * @param id string
   * @param data Buffer<ArrayBufferLike>
   * @param type string
   * @param name string
   */
  putAttachment(id: string, data: Buffer<ArrayBufferLike>, type: string, name?: string): Promise<any>;

  /**
   * 获取附件
   * @param id string
   * @param name string
   */
  getAttachment(id: string, name?: string): Promise<any>;

}

/**
 * 简单键值存储 (storage - 兼容 localStorage)
 */
interface NaimoStorage {
  /**
   * 存储键值对（支持任意类型，会自动序列化）
   * @param key string
   * @param value any
   */
  setItem(key: string, value: any): Promise<any>;

  /**
   * 获取值
   * @param key string
   */
  getItem(key: string): Promise<any>;

  /**
   * 删除键值对
   * @param key string
   */
  removeItem(key: string): Promise<any>;

  /**
   * 清空所有存储
   */
  clear(): Promise<any>;

  /**
   * 获取所有键值对
   */
  getAllItems(): Promise<any>;

}

/**
 * 剪贴板
 */
interface NaimoClipboard {
  /**
   * 读取剪贴板文本
   */
  readText(): Promise<any>;

  /**
   * 写入文本到剪贴板
   * @param text string
   */
  writeText(text: string): Promise<any>;

  /**
   * 读取剪贴板图片（base64 格式）
   */
  readImage(): Promise<any>;

  /**
   * 写入图片到剪贴板
   * @param imageData string
   */
  writeImage(imageData: string): Promise<any>;

  /**
   * 检查剪贴板是否有文本
   */
  hasText(): Promise<any>;

  /**
   * 检查剪贴板是否有图片
   */
  hasImage(): Promise<any>;

  /**
   * 清空剪贴板
   */
  clear(): Promise<any>;

}

/**
 * Shell 操作
 */
interface NaimoShell {
  /**
   * 打开文件或目录
   * @param path string
   */
  openPath(path: string): Promise<any>;

  /**
   * 打开 URL
   * @param url string
   */
  openUrl(url: string): Promise<any>;

  /**
   * 在文件管理器中显示文件
   * @param path string
   */
  showInFolder(path: string): Promise<any>;

  /**
   * 移动到回收站
   * @param path string
   */
  moveToTrash(path: string): Promise<any>;

  /**
   * 系统提示音
   */
  beep(): Promise<any>;

}

/**
 * 系统信息与操作
 */
interface NaimoSystem {
  /**
   * 显示系统通知
   * @param message string
   * @param title string | undefined
   */
  notify(message: string, title?: string | undefined): Promise<any>;

  /**
   * 获取系统路径（如 'home', 'appData', 'userData', 'temp', 'downloads' 等）
   * @param name string
   */
  getPath(name: string): Promise<any>;

  /**
   * 获取设备唯一标识
   */
  getDeviceId(): Promise<any>;

  /**
   * 获取应用版本号
   */
  getVersion(): Promise<any>;

  /**
   * 获取应用名称
   */
  getName(): Promise<any>;

  /**
   * 获取文件图标
   * @param path string
   */
  getFileIcon(path: string): Promise<any>;

  /**
   * 判断是否为 macOS 系统
   */
  isMac(): Promise<any>;

  /**
   * 判断是否为 Windows 系统
   */
  isWindows(): Promise<any>;

  /**
   * 判断是否为 Linux 系统
   */
  isLinux(): Promise<any>;

}

/**
 * 屏幕与显示器
 */
interface NaimoScreen {
  /**
   * 截屏并获取文件路径
   * @param options { sourceId?: string | undefined; } | undefined
   */
  capture(options?: { sourceId?: string | undefined; } | undefined): Promise<any>;

  /**
   * 获取屏幕源列表
   * @param options { types: ("screen" | "window")[]; thumbnailSize?: { width: number; height: number; } | undefined; }
   */
  getSources(options: { types: ("screen" | "window")[]; thumbnailSize?: { width: number; height: number; } | undefined; }): Promise<any>;

  /**
   * 获取鼠标位置
   */
  getCursorPosition(): Promise<any>;

  /**
   * 获取主显示器信息
   */
  getPrimaryDisplay(): Promise<any>;

  /**
   * 获取所有显示器信息
   */
  getAllDisplays(): Promise<any>;

  /**
   * 获取指定点附近的显示器
   * @param point { x: number; y: number; }
   */
  getDisplayNearestPoint(point: { x: number; y: number; }): Promise<any>;

  /**
   * 将屏幕坐标转换为 DIP 坐标
   * @param point { x: number; y: number; }
   */
  screenToDipPoint(point: { x: number; y: number; }): Promise<any>;

  /**
   * 将 DIP 坐标转换为屏幕坐标
   * @param point { x: number; y: number; }
   */
  dipToScreenPoint(point: { x: number; y: number; }): Promise<any>;

}

/**
 * 对话框
 */
interface NaimoDialog {
  /**
   * 显示打开文件对话框
   * @param options any
   */
  showOpen(options?: any): Promise<any>;

  /**
   * 显示保存文件对话框
   * @param options any
   */
  showSave(options?: any): Promise<any>;

  /**
   * 显示消息框
   * @param options any
   */
  showMessage(options: any): Promise<any>;

  /**
   * 显示错误框
   * @param title string
   * @param content string
   */
  showError(title: string, content: string): Promise<any>;

}

/**
 * 输入模拟
 */
interface NaimoInput {
  /**
   * 粘贴文本到当前活动窗口
   * @param text string
   */
  pasteText(text: string): Promise<any>;

  /**
   * 粘贴图片到当前活动窗口
   * @param imageData string
   */
  pasteImage(imageData: string): Promise<any>;

  /**
   * 粘贴文件到当前活动窗口
   * @param filePath string | string[]
   */
  pasteFile(filePath: string | string[]): Promise<any>;

  /**
   * 模拟按键
   * @param key string
   */
  simulateKeyPress(key: string): Promise<any>;

  /**
   * 模拟快捷键
   * @param modifiers string[]
   * @param key string
   */
  simulateHotkey(modifiers: string[], key: string): Promise<any>;

}

/**
 * 网页自动化 (auto-puppeteer)
 */
interface NaimoAutomation {
  /**
   * 使用 JSON 配置执行自动化任务
   * @param config any
   */
  automateWithJson(config: any): any;

  /**
   * 使用配置解析 HTML
   * @param config any
   * @param html string
   */
  parseHtmlByConfig(config: any, html: string): any;

  /**
   * 获取网页 HTML
   * @param url string
   * @param asyncConfig any
   */
  fetchHTML(url: string, asyncConfig?: any): any;

  /**
   * 获取 JSON 数据
   * @param url string
   */
  fetchJSON(url: string): any;

}

// ==================== Naimo 主接口 ====================

/**
 * Naimo Tools 插件 API
 * 
 * 提供插件开发所需的所有 API
 */
interface Naimo {
  /** 日志系统 */
  log: NaimoLog;

  /** 窗口管理 */
  window: NaimoWindow;

  /** 文档数据库 (db) */
  db: NaimoDb;

  /** 简单键值存储 (storage - 兼容 localStorage) */
  storage: NaimoStorage;

  /** 剪贴板 */
  clipboard: NaimoClipboard;

  /** Shell 操作 */
  shell: NaimoShell;

  /** 系统信息与操作 */
  system: NaimoSystem;

  /** 屏幕与显示器 */
  screen: NaimoScreen;

  /** 对话框 */
  dialog: NaimoDialog;

  /** 输入模拟 */
  input: NaimoInput;

  /** 网页自动化 (auto-puppeteer) */
  automation: NaimoAutomation;

  /** 可编程浏览器 (ubrowser) */
  ubrowser: UBrowser;

  /** 即时执行浏览器 (ibrowser) */
  ibrowser: UBrowser;

  /**
   * 注册功能进入钩子（当功能被触发时调用）
   */
  onEnter(callback: (params: any) => void): void;

  /**
   * 注册功能退出钩子（当功能窗口关闭时调用）
   */
  onExit(callback: () => void): void;

  /**
   * 注册搜索钩子（当用户在搜索框输入时调用）
   */
  onSearch(callback: (params: any) => void): void;

  /**
   * 获取所有已安装插件的功能列表
   */
  getFeatures(codes: string[]): Promise<Feature[]>;
}

// ==================== 全局声明 ====================

declare global {
  interface Window {
    /**
     * Naimo Tools 插件 API
     * 
     * 可在插件的 HTML 页面中通过 window.naimo 访问
     */
    naimo: Naimo;
  }
}

// ==================== 导出 ====================

export {
  Naimo,
  NaimoLog,
  NaimoWindow,
  NaimoDb,
  NaimoStorage,
  NaimoClipboard,
  NaimoShell,
  NaimoSystem,
  NaimoScreen,
  NaimoDialog,
  NaimoInput,
  NaimoAutomation,
  DbResult,
  DbDoc,
  Display,
  HtmlFetchResult,
  DomParserConfig,
  WindowConfig,
  DeviceOptions,
  UBrowser,
  BrowserInstance,
  FeatureHandler,
  PluginExports,
};
