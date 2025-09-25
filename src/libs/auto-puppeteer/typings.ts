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
  steps: Array<{
    /** 动作名称 */
    action: string;
    /** 动作参数 */
    args: any[];
  }>;
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
