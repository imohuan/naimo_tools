// 共享类型定义
import { PluginSetting, } from '@renderer/src/temp_code/typings/plugin';
import type { AppItem } from '@renderer/src/temp_code/typings/search'

export interface AppConfig {
  /** 主题模式，支持 light 或 dark */
  theme: "light" | "dark";
  /** 语言设置 */
  language: string;
  /** 日志级别 */
  logLevel: "error" | "warn" | "info" | "debug";
  /** UI常量配置 */
  /** 窗口尺寸 */
  windowSize: {
    /** 窗口宽度 */
    width: number;
    /** 窗口高度 */
    height: number;
  };
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
  /** 插件设置，自启动，自分离，后台运行 */
  pluginSetting?: Record<string, PluginSetting>;
  /** 临时插件列表 */
  temporaryPlugins?: string[];
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
