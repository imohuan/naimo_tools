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
 */
export interface WindowConfig {
  // 窗口基本设置
  show?: boolean;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  center?: boolean;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;
  movable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  alwaysOnTop?: boolean;
  fullscreen?: boolean;
  fullscreenable?: boolean;
  enableLargerThanScreen?: boolean;
  opacity?: number;
  frame?: boolean;

  // goto 相关设置
  timeout?: number;
  headers?: Record<string, string>;
  closable?: boolean;
  focusable?: boolean;
  skipTaskbar?: boolean;
  backgroundColor?: string;
  hasShadow?: boolean;
  transparent?: boolean;
  titleBarStyle?: string;
  thickFrame?: boolean;

  // 请求拦截配置
  requestInterception?: {
    enabled: boolean;
    regex?: RegExp[];
  };

  // 自定义webPreferences
  webPreferences?: any;
}

/**
 * UBrowser 实例信息
 */
export interface BrowserInstance {
  id: number;
  url: string;
  title: string;
  width: number;
  height: number;
  x: number;
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
 * 设备选项
 */
export interface DeviceOptions {
  userAgent: string;
  size: {
    width: number;
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
