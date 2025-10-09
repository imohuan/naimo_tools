/**
 * Naimo API 类型定义
 * 兼容 uTools API 风格
 */

// ============ 数据库相关 ============

/**
 * 数据库文档接口
 * 文档数据库中存储的数据结构
 */
export interface DbDoc {
  /** 文档唯一标识符 */
  _id: string;
  /** 文档修订版本号（用于冲突检测） */
  _rev?: string;
  /** 其他自定义字段 */
  [key: string]: any;
}

/**
 * 数据库操作结果
 * 执行数据库操作后返回的结果对象
 */
export interface DbResult {
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

// ============ 窗口相关 ============
export interface BrowserWindowOptions {
  width?: number;
  height?: number;
  title?: string;
  show?: boolean;
  frame?: boolean;
  transparent?: boolean;
  alwaysOnTop?: boolean;
  resizable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  closable?: boolean;
  webPreferences?: {
    nodeIntegration?: boolean;
    contextIsolation?: boolean;
    webSecurity?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

// ============ 事件相关 ============
export interface PluginEnterParams {
  code: string;
  type: "text" | "files" | "img" | "regex" | "window";
  payload: any;
}

// ============ 剪贴板相关 ============
export interface CopiedFile {
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  name: string;
}

// ============ 显示器相关 ============

/**
 * 显示器信息接口
 * 包含显示器的物理属性和工作区信息
 */
export interface Display {
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

// ============ 对话框相关 ============
export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: { name: string; extensions: string[] }[];
  properties?: (
    | "openFile"
    | "openDirectory"
    | "multiSelections"
    | "showHiddenFiles"
  )[];
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: { name: string; extensions: string[] }[];
}

export interface MessageBoxOptions {
  type?: "none" | "info" | "error" | "question" | "warning";
  buttons?: string[];
  defaultId?: number;
  title?: string;
  message: string;
  detail?: string;
  checkboxLabel?: string;
  checkboxChecked?: boolean;
  icon?: any;
  cancelId?: number;
  noLink?: boolean;
}

// ============ 系统路径相关 ============
export type SystemPathName =
  | "home"
  | "appData"
  | "userData"
  | "temp"
  | "desktop"
  | "documents"
  | "downloads"
  | "music"
  | "pictures"
  | "videos"
  | "logs";

