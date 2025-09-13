/**
 * 自动生成的 IPC 类型定义
 * 生成时间: 2025-09-13T01:11:09.220Z
 * 请勿手动修改此文件
 */

import { AppConfig } from '../types';

// 各个模块的接口定义
interface appInterface {
  /** 获取应用版本 */
  "app-get-version": () => Promise<string>;
  /** 获取应用版本 */
  "appGetVersion": () => Promise<string>;

  /** 获取应用名称 */
  "app-get-name": () => Promise<string>;
  /** 获取应用名称 */
  "appGetName": () => Promise<string>;

  /** 获取应用路径 */
  "app-get-app-path": () => Promise<string>;
  /** 获取应用路径 */
  "appGetAppPath": () => Promise<string>;

  /** 获取用户数据路径 */
  "app-get-user-data-path": () => Promise<string>;
  /** 获取用户数据路径 */
  "appGetUserDataPath": () => Promise<string>;

  /** 检查应用是否打包 */
  "app-is-packaged": () => Promise<boolean>;
  /** 检查应用是否打包 */
  "appIsPackaged": () => Promise<boolean>;

  /** 获取系统信息 */
  "app-get-system-info": () => Promise<{
  platform: string;
  arch: string;
  version: string;
  uptime: number;
}>;
  /** 获取系统信息 */
  "appGetSystemInfo": () => Promise<{
  platform: string;
  arch: string;
  version: string;
  uptime: number;
}>;

  /** 退出应用 */
  "app-quit": () => Promise<void>;
  /** 退出应用 */
  "appQuit": () => Promise<void>;

  /** 重启应用 */
  "app-restart": () => Promise<void>;
  /** 重启应用 */
  "appRestart": () => Promise<void>;

  /** 显示关于对话框 */
  "app-show-about": () => Promise<void>;
  /** 显示关于对话框 */
  "appShowAbout": () => Promise<void>;

  /** 获取应用配置 */
  "app-get-config": () => Promise<Record<string, any>>;
  /** 获取应用配置 */
  "appGetConfig": () => Promise<Record<string, any>>;
}

interface filesystemInterface {
  /**
 * 选择文件
 * @param 对话框选项
 * @returns 选择的文件路径数组，如果取消则返回null
 */
  "filesystem-select-file": (options: Electron.OpenDialogOptions) => Promise<string[] | null>;
  /**
 * 选择文件
 * @param 对话框选项
 * @returns 选择的文件路径数组，如果取消则返回null
 */
  "filesystemSelectFile": (options: Electron.OpenDialogOptions) => Promise<string[] | null>;

  /**
 * 选择文件夹
 * @param 对话框选项
 * @returns 选择的文件夹路径数组，如果取消则返回null
 */
  "filesystem-select-folder": (options: Electron.OpenDialogOptions) => Promise<string[] | null>;
  /**
 * 选择文件夹
 * @param 对话框选项
 * @returns 选择的文件夹路径数组，如果取消则返回null
 */
  "filesystemSelectFolder": (options: Electron.OpenDialogOptions) => Promise<string[] | null>;

  /**
 * 保存文件
 * @param 保存对话框选项
 * @returns 选择的保存路径，如果取消则返回null
 */
  "filesystem-save-file": (options: Electron.SaveDialogOptions) => Promise<string | null>;
  /**
 * 保存文件
 * @param 保存对话框选项
 * @returns 选择的保存路径，如果取消则返回null
 */
  "filesystemSaveFile": (options: Electron.SaveDialogOptions) => Promise<string | null>;
}

interface logInterface {
  /**
 * 获取日志数据
 * @returns 日志数据数组
 */
  "log-get-logs": () => Promise<any[]>;
  /**
 * 获取日志数据
 * @returns 日志数据数组
 */
  "logGetLogs": () => Promise<any[]>;

  /**
 * 获取原始日志文件内容
 * @returns 原始日志文件内容
 */
  "log-get-raw-log-content": () => Promise<string>;
  /**
 * 获取原始日志文件内容
 * @returns 原始日志文件内容
 */
  "logGetRawLogContent": () => Promise<string>;

  /** 清空日志 */
  "log-clear-logs": () => Promise<void>;
  /** 清空日志 */
  "logClearLogs": () => Promise<void>;

  /**
 * 导出日志
 * @param 导出格式 (txt, json)
 */
  "log-export-logs": (format: 'txt' | 'json') => Promise<string>;
  /**
 * 导出日志
 * @param 导出格式 (txt, json)
 */
  "logExportLogs": (format: 'txt' | 'json') => Promise<string>;

  /** 获取日志文件信息 */
  "log-get-log-info": () => Promise<{
  path: string;
  size: number;
  lastModified: Date;
  lineCount: number;
}>;
  /** 获取日志文件信息 */
  "logGetLogInfo": () => Promise<{
  path: string;
  size: number;
  lastModified: Date;
  lineCount: number;
}>;
}

interface storeInterface {
  /**
 * 获取存储数据
 * @param 配置键名，如果不提供则返回完整配置
 * @returns 配置值或完整配置对象
 */
  "store-get": (key: keyof AppConfig) => Promise<any>;
  /**
 * 获取存储数据
 * @param 配置键名，如果不提供则返回完整配置
 * @returns 配置值或完整配置对象
 */
  "storeGet": (key: keyof AppConfig) => Promise<any>;

  /**
 * 设置存储数据
 * @param 配置键名
 * @param 配置值
 * @returns 是否设置成功
 */
  "store-set": (key: keyof AppConfig, value: any) => Promise<boolean>;
  /**
 * 设置存储数据
 * @param 配置键名
 * @param 配置值
 * @returns 是否设置成功
 */
  "storeSet": (key: keyof AppConfig, value: any) => Promise<boolean>;

  /**
 * 删除存储数据
 * @param 配置键名
 * @returns 是否删除成功
 */
  "store-delete-key": (key: keyof AppConfig) => Promise<boolean>;
  /**
 * 删除存储数据
 * @param 配置键名
 * @returns 是否删除成功
 */
  "storeDeleteKey": (key: keyof AppConfig) => Promise<boolean>;

  /**
 * 清空存储数据
 * @returns 是否清空成功
 */
  "store-clear": () => Promise<boolean>;
  /**
 * 清空存储数据
 * @returns 是否清空成功
 */
  "storeClear": () => Promise<boolean>;
}

interface windowInterface {
  /** 最小化窗口 */
  "window-minimize": () => Promise<void>;
  /** 最小化窗口 */
  "windowMinimize": () => Promise<void>;

  /** 最大化/还原窗口 */
  "window-maximize": () => Promise<void>;
  /** 最大化/还原窗口 */
  "windowMaximize": () => Promise<void>;

  /** 关闭窗口 */
  "window-close": () => Promise<void>;
  /** 关闭窗口 */
  "windowClose": () => Promise<void>;

  /**
 * 检查窗口是否最大化
 * @returns 窗口是否最大化
 */
  "window-is-maximized": () => Promise<boolean>;
  /**
 * 检查窗口是否最大化
 * @returns 窗口是否最大化
 */
  "windowIsMaximized": () => Promise<boolean>;

  /** 打开日志查看器窗口 */
  "window-open-log-viewer": () => Promise<void>;
  /** 打开日志查看器窗口 */
  "windowOpenLogViewer": () => Promise<void>;
}

// 合并所有 IPC 路由类型
export interface AllIpcRouter extends appInterface, filesystemInterface, logInterface, storeInterface, windowInterface {}

// 路由信息类型
export interface RouteInfo {
  route: string;
  comment: string;
  module: string;
  function: string;
}

// 路由信息常量
export const ROUTE_INFO: RouteInfo[] = [
  {
    route: "app-get-version",
    comment: "获取应用版本",
    module: "app",
    function: "getVersion"
  },
  {
    route: "app-get-name",
    comment: "获取应用名称",
    module: "app",
    function: "getName"
  },
  {
    route: "app-get-app-path",
    comment: "获取应用路径",
    module: "app",
    function: "getAppPath"
  },
  {
    route: "app-get-user-data-path",
    comment: "获取用户数据路径",
    module: "app",
    function: "getUserDataPath"
  },
  {
    route: "app-is-packaged",
    comment: "检查应用是否打包",
    module: "app",
    function: "isPackaged"
  },
  {
    route: "app-get-system-info",
    comment: "获取系统信息",
    module: "app",
    function: "getSystemInfo"
  },
  {
    route: "app-quit",
    comment: "退出应用",
    module: "app",
    function: "quit"
  },
  {
    route: "app-restart",
    comment: "重启应用",
    module: "app",
    function: "restart"
  },
  {
    route: "app-show-about",
    comment: "显示关于对话框",
    module: "app",
    function: "showAbout"
  },
  {
    route: "app-get-config",
    comment: "获取应用配置",
    module: "app",
    function: "getConfig"
  },
  {
    route: "filesystem-select-file",
    comment: "选择文件",
    module: "filesystem",
    function: "selectFile"
  },
  {
    route: "filesystem-select-folder",
    comment: "选择文件夹",
    module: "filesystem",
    function: "selectFolder"
  },
  {
    route: "filesystem-save-file",
    comment: "保存文件",
    module: "filesystem",
    function: "saveFile"
  },
  {
    route: "log-get-logs",
    comment: "获取日志数据",
    module: "log",
    function: "getLogs"
  },
  {
    route: "log-get-raw-log-content",
    comment: "获取原始日志文件内容",
    module: "log",
    function: "getRawLogContent"
  },
  {
    route: "log-clear-logs",
    comment: "清空日志",
    module: "log",
    function: "clearLogs"
  },
  {
    route: "log-export-logs",
    comment: "导出日志",
    module: "log",
    function: "exportLogs"
  },
  {
    route: "log-get-log-info",
    comment: "获取日志文件信息",
    module: "log",
    function: "getLogInfo"
  },
  {
    route: "store-get",
    comment: "获取存储数据",
    module: "store",
    function: "get"
  },
  {
    route: "store-set",
    comment: "设置存储数据",
    module: "store",
    function: "set"
  },
  {
    route: "store-delete-key",
    comment: "删除存储数据",
    module: "store",
    function: "deleteKey"
  },
  {
    route: "store-clear",
    comment: "清空存储数据",
    module: "store",
    function: "clear"
  },
  {
    route: "window-minimize",
    comment: "最小化窗口",
    module: "window",
    function: "minimize"
  },
  {
    route: "window-maximize",
    comment: "最大化/还原窗口",
    module: "window",
    function: "maximize"
  },
  {
    route: "window-close",
    comment: "关闭窗口",
    module: "window",
    function: "close"
  },
  {
    route: "window-is-maximized",
    comment: "检查窗口是否最大化",
    module: "window",
    function: "isMaximized"
  },
  {
    route: "window-open-log-viewer",
    comment: "打开日志查看器窗口",
    module: "window",
    function: "openLogViewer"
  }
];

// 路由键类型
export type IpcRouteKey = keyof AllIpcRouter;

// 获取路由参数类型
export type IpcRouteParams<T extends IpcRouteKey> = Parameters<AllIpcRouter[T]>;

// 获取路由返回类型
export type IpcRouteReturn<T extends IpcRouteKey> = ReturnType<AllIpcRouter[T]>;
