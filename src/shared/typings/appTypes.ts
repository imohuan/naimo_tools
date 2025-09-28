// 共享类型定义
export interface AppConfig {
  /** 主题模式，支持 light 或 dark */
  theme: "light" | "dark";
  /** 语言设置 */
  language: string;
  /** 窗口尺寸 */
  windowSize: {
    /** 窗口宽度 */
    width: number;
    /** 窗口高度 */
    height: number;
  };
  /** 日志级别 */
  logLevel: "error" | "warn" | "info" | "debug";
  /** UI常量配置 */
  uiConstants: {
    /** 头部高度 */
    headerHeight: number;
    /** 最大高度 */
    maxHeight: number;
    /** 内边距 */
    padding: number;
  };
  /** 是否开机自启 */
  autoStart?: boolean;
  /** 是否窗口置顶 */
  alwaysOnTop?: boolean;
  /** 最近使用的应用列表 */
  recentApps?: AppItem[];
  /** 已固定的应用列表 */
  pinnedApps?: AppItem[];
  /** 文件列表 */
  fileList?: AppItem[];
  /** 已安装的插件列表 */
  installedPlugins?: string[];
  /** 快捷键配置 */
  hotkeys?: {
    /** 全局快捷键配置 */
    global: any[];
    /** 应用内快捷键配置 */
    application: any[];
  };
  /** 自定义快捷键列表 */
  customHotkeys?: any[];
  /** 插件设置存储 */
  pluginSettings?: Record<string, Record<string, any>>;
}

export interface AppItem {
  /** 应用名称 */
  name: string;
  /** 应用路径 英文 */
  path: string;
  /** 应用图标，null 表示无图标 */
  icon: string | null;
  /** 最后一次使用时间（时间戳） */
  lastUsed?: number;
  /** 使用次数 */
  usageCount?: number;
  /** 应用描述 */
  description?: string;
  /** 不允许加入最近访问 */
  notAddToRecent?: boolean
  /** 是否在分类中显示 */
  hidden?: boolean
}

export interface LogLevel {
  /** 错误日志 */
  error: string;
  /** 警告日志 */
  warn: string;
  /** 信息日志 */
  info: string;
  /** 调试日志 */
  debug: string;
}

// CommonJS 兼容性导出
if (typeof module !== "undefined" && module.exports) {
  module.exports = {};
}
