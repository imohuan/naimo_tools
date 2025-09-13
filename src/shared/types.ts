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
}

export interface AppItem {
  /** 应用名称 */
  name: string;
  /** 应用路径 */
  path: string;
  /** 应用图标，null 表示无图标 */
  icon: string | null;
  /** 最后一次使用时间（时间戳） */
  lastUsed?: number;
  /** 使用次数 */
  usageCount?: number;
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
