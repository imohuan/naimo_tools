/**
 * Auto Puppeteer 共享类型定义
 */

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

// 自定义函数步骤类型
export type WaitForTimeoutStep = {
  action: 'waitForTimeout';
  args: [timeout: number];
};

// 联合类型定义所有支持的步骤
export type AutomationStep =
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
  | WaitForTimeoutStep;

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
