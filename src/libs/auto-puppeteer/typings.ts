/**
 * Auto Puppeteer 共享类型定义
 */

import type { BrowserWindow } from "electron";
import type { Page, Browser } from 'puppeteer-core';

/**
 * 日志工具接口
 */
export interface Logger {
  info: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
}

/**
 * 执行上下文接口
 * 自定义函数的第一个参数
 */
export interface BrowserSession {
  window: BrowserWindow;
  page: Page;
  browser: Browser;
}

/**
 * DOM 解析配置接口
 */
export interface DomParserConfig {
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

// Puppeteer 相关类型定义
export interface ClickOptions {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  delay?: number;
}

export interface TypeOptions {
  delay?: number;
}

export interface WaitForSelectorOptions {
  visible?: boolean;
  hidden?: boolean;
  timeout?: number;
}

export interface NavigationOptions {
  timeout?: number;
  headers?: Record<string, string>;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
}

export interface EvaluateOptions {
  timeout?: number;
}

// 基础步骤类型
export type ClickStep = {
  action: 'click';
  args: [selector: string, options?: ClickOptions];
};

export type TypeStep = {
  action: 'type';
  args: [selector: string, text: string, options?: TypeOptions];
};

export type WaitForSelectorStep = {
  action: 'waitForSelector';
  args: [selector: string, options?: WaitForSelectorOptions];
};

export type GoToStep = {
  action: 'goto';
  args: [url: string, options?: NavigationOptions];
};

export type EvaluateStep = {
  action: 'evaluate';
  args: [pageFunction: string | ((...args: any[]) => any), ...args: any[]];
};

export type ReloadStep = {
  action: 'reload';
  args: [options?: NavigationOptions];
};

export type GoBackStep = {
  action: 'goBack';
  args: [options?: NavigationOptions];
};

export type GoForwardStep = {
  action: 'goForward';
  args: [options?: NavigationOptions];
};

export type FocusStep = {
  action: 'focus';
  args: [selector: string];
};

export type HoverStep = {
  action: 'hover';
  args: [selector: string];
};

export type SelectStep = {
  action: 'select';
  args: [selector: string, ...values: string[]];
};

export type KeyboardPressStep = {
  action: 'keyboard.press';
  args: [key: string, options?: { delay?: number }];
};

export type KeyboardTypeStep = {
  action: 'keyboard.type';
  args: [text: string, options?: { delay?: number }];
};

export type MouseClickStep = {
  action: 'mouse.click';
  args: [x: number, y: number, options?: ClickOptions];
};

export type MouseMoveStep = {
  action: 'mouse.move';
  args: [x: number, y: number, options?: { steps?: number }];
};

// ========== 自定义函数步骤类型 ==========

// 工具函数
export type WaitForTimeoutStep = {
  action: 'waitForTimeout';
  args: [timeout: number];
};

// 窗口控制
export type ShowStep = {
  action: 'show';
  args: [];
};

export type HideStep = {
  action: 'hide';
  args: [];
};

export type CloseStep = {
  action: 'close';
  args: [];
};

export type GetInfoStep = {
  action: 'getInfo';
  args: [];
};

// 页面操作
export type CssStep = {
  action: 'css';
  args: [css: string];
};

export type MouseDownStep = {
  action: 'mousedown';
  args: [selector: string];
};

export type MouseUpStep = {
  action: 'mouseup';
  args: [];
};

export type FileStep = {
  action: 'file';
  args: [selector: string, ...paths: string[]];
};

export type CheckStep = {
  action: 'check';
  args: [selector: string, checked: boolean];
};

export type PasteStep = {
  action: 'paste';
  args: [text: string];
};

export type DeviceStep = {
  action: 'device';
  args: [deviceOption: DeviceOptions];
};

// 视窗设置
export type ViewportStep = {
  action: 'viewport';
  args: [width: number, height: number];
};

export type UserAgentStep = {
  action: 'useragent';
  args: [userAgent: string];
};

// 其他操作
export type WaitStep = {
  action: 'wait';
  args: [msOrSelectorOrFunc: number | string | Function, timeout?: number, ...params: any[]];
};

export type ScrollStep = {
  action: 'scroll';
  args: [selectorOrX: string | number, y?: number];
};

export type DevToolsStep = {
  action: 'devTools';
  args: [mode?: 'right' | 'bottom' | 'undocked' | 'detach'];
};

export type EndStep = {
  action: 'end';
  args: [];
};

// ========== 联合类型定义所有支持的步骤 ==========

export type AutomationStep =
  // Puppeteer 原生方法
  | ClickStep
  | TypeStep
  | WaitForSelectorStep
  | GoToStep
  | EvaluateStep
  | ReloadStep
  | GoBackStep
  | GoForwardStep
  | FocusStep
  | HoverStep
  | SelectStep
  | KeyboardPressStep
  | KeyboardTypeStep
  | MouseClickStep
  | MouseMoveStep
  // 自定义函数 - 工具函数
  | WaitForTimeoutStep
  | WaitStep
  // 自定义函数 - 窗口控制
  | ShowStep
  | HideStep
  | CloseStep
  | GetInfoStep
  // 自定义函数 - 页面操作
  | CssStep
  | MouseDownStep
  | MouseUpStep
  | FileStep
  | CheckStep
  | PasteStep
  | DeviceStep
  | ScrollStep
  // 自定义函数 - 视窗设置
  | ViewportStep
  | UserAgentStep
  // 自定义函数 - 其他
  | DevToolsStep
  | EndStep;

/**
 * 自动化配置接口
 */
export interface AutomationConfig {
  /** 目标网页URL */
  url?: string;
  /** 是否显示浏览器窗口 */
  show?: boolean;
  /** 任务超时时间（毫秒） */
  timeout?: number;
  /** 请求拦截配置 */
  requestInterception?: {
    /** 是否启用请求拦截 */
    enabled: boolean;
    /** 拦截规则正则表达式数组 */
    regex?: RegExp[];
  };
  /** 自动化步骤数组 */
  steps: AutomationStep[];
}

/**
 * HTML 获取结果接口
 */
export interface HtmlFetchResult {
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
 * 系统信息接口
 */
export interface SystemInfo {
  /** 系统架构 */
  arch: string;
  /** 系统平台 */
  platform: string;
}

// ========== UBrowser 相关类型定义 ==========

/**
 * 窗口配置接口
 * 用于配置 UBrowser 浏览器窗口的外观和行为
 */
export interface WindowConfig {
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
 * UBrowser 实例信息
 * 浏览器执行完成后返回的实例信息
 */
export interface BrowserInstance {
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
 * Cookie 过滤器
 */
export interface CookieFilter {
  url?: string;
  name?: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  session?: boolean;
  httpOnly?: boolean;
}

/**
 * 设备模拟选项
 * 用于模拟移动设备或其他设备的浏览器环境
 */
export interface DeviceOptions {
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
 * 矩形区域
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * UBrowser API 接口
 * 链式调用模式的浏览器自动化 API
 * 所有方法（除了 run）都返回自身以支持链式调用
 */
export interface UBrowserAPI {
  // ========== 基础操作 ==========

  /** 导航到指定 URL */
  goto(url: string, options?: WindowConfig): UBrowserAPI;

  /** 设置用户代理（User-Agent） */
  useragent(ua: string): UBrowserAPI;

  /** 设置视口大小 */
  viewport(width: number, height: number): UBrowserAPI;

  /** 隐藏浏览器窗口 */
  hide(): UBrowserAPI;

  /** 显示浏览器窗口 */
  show(): UBrowserAPI;

  // ========== 网页操作 ==========

  /** 注入自定义 CSS 样式 */
  css(css: string): UBrowserAPI;

  /** 在页面上下文中执行 JavaScript 代码或函数 */
  evaluate(func: Function | string, ...params: any[]): UBrowserAPI;

  /** 模拟按键操作 */
  press(key: string, options?: { delay?: number }): UBrowserAPI;

  /** 点击指定选择器的元素 */
  click(selector: string): UBrowserAPI;

  /** 在指定元素上按下鼠标 */
  mousedown(selector: string): UBrowserAPI;

  /** 释放鼠标按键 */
  mouseup(): UBrowserAPI;

  /** 上传文件到文件输入框 */
  file(selector: string, payload: string | string[] | Buffer): UBrowserAPI;

  /** 在输入框中输入文本（模拟逐字输入） */
  type(selector: string, text: string, options?: { delay?: number }): UBrowserAPI;

  /** 直接设置输入框的值（不触发输入事件） */
  value(selector: string, value: string): UBrowserAPI;

  /** 选择下拉框选项 */
  select(selector: string, ...values: string[]): UBrowserAPI;

  /** 设置复选框或单选框的选中状态 */
  check(selector: string, checked: boolean): UBrowserAPI;

  /** 聚焦到指定元素 */
  focus(selector: string): UBrowserAPI;

  /** 滚动到指定元素或坐标位置 */
  scroll(selectorOrX: string | number, y?: number): UBrowserAPI;

  /** 粘贴文本内容 */
  paste(text: string): UBrowserAPI;

  /** 截取页面截图 */
  screenshot(options?: any): UBrowserAPI;

  /** 生成页面 PDF */
  pdf(options?: any): UBrowserAPI;

  /** 模拟设备环境（如手机、平板） */
  device(options: DeviceOptions): UBrowserAPI;

  /** 等待指定时间、选择器或函数条件满足 */
  wait(msOrSelectorOrFunc: number | string | Function, timeout?: number, ...params: any[]): UBrowserAPI;

  /** 等待选择器元素出现 */
  waitForSelector(selector: string, options?: { visible?: boolean; hidden?: boolean; timeout?: number }): UBrowserAPI;

  /** 等待选择器元素出现（简化版） */
  when(selector: string): UBrowserAPI;

  /** 标记任务结束 */
  end(): UBrowserAPI;

  /** 打开开发者工具 */
  devTools(mode?: 'right' | 'bottom' | 'undocked' | 'detach'): UBrowserAPI;

  // ========== Cookie 操作 ==========

  /** 获取指定 URL 的 Cookies */
  cookies(...urls: string[]): UBrowserAPI;

  /** 设置 Cookies */
  setCookie(...cookies: any[]): UBrowserAPI;

  /** 删除 Cookies */
  deleteCookie(...cookies: any[]): UBrowserAPI;

  // ========== 执行 ==========

  /** 执行所有操作队列并返回结果 */
  run(options?: WindowConfig): Promise<[...any[], BrowserInstance]>;
}

/**
 * 即时执行浏览器 API 接口
 * 与 UBrowserAPI 不同，这些方法会立即执行而不是添加到队列中
 * 所有方法都返回 Promise
 */
export interface InstantBrowserAPI {
  /** 打开浏览器并跳转到指定网页 */
  goto(url: string, options?: WindowConfig): Promise<BrowserInstance>;

  /** 等待（毫秒或选择器） */
  wait(msOrSelector: number | string, timeout?: number): Promise<void>;

  /** 点击元素 */
  click(selector: string): Promise<void>;

  /** 输入文本 */
  type(selector: string, text: string, options?: { delay?: number }): Promise<void>;

  /** 设置输入框的值 */
  value(selector: string, value: string): Promise<void>;

  /** 选择下拉框选项 */
  select(selector: string, ...values: string[]): Promise<string[]>;

  /** 模拟键盘按键 */
  press(key: string, options?: { delay?: number }): Promise<void>;

  /** 执行自定义 JS 代码 */
  evaluate(func: Function | string, ...params: any[]): Promise<any>;

  /** 滚动页面 */
  scroll(selectorOrX: string | number, y?: number): Promise<void>;

  /** 截图 */
  screenshot(options?: any): Promise<Buffer>;

  /** 聚焦元素 */
  focus(selector: string): Promise<void>;

  /** 获取 Cookies */
  cookies(...urls: string[]): Promise<any>;

  /** 设置 Cookies */
  setCookie(...cookies: any[]): Promise<void>;

  /** 删除 Cookies */
  deleteCookie(...cookies: any[]): Promise<void>;

  /** 显示窗口 */
  show(): Promise<void>;

  /** 隐藏窗口 */
  hide(): Promise<void>;

  /** 关闭浏览器 */
  close(): Promise<void>;

  /** 获取浏览器信息 */
  getInfo(): Promise<BrowserInstance>;
}
