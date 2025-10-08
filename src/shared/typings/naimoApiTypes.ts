/**
 * Naimo API 类型定义
 * 兼容 uTools API 风格
 */

// ============ 数据库相关 ============
export interface DbDoc {
  _id: string;
  _rev?: string;
  [key: string]: any;
}

export interface DbResult {
  id: string;
  rev?: string;
  ok?: boolean;
  error?: boolean;
  name?: string;
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
export interface Display {
  id: number;
  bounds: { x: number; y: number; width: number; height: number };
  workArea: { x: number; y: number; width: number; height: number };
  scaleFactor: number;
  rotation: number;
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

