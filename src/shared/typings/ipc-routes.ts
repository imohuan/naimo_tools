/**
 * 自动生成的 IPC 类型定义
 * 生成时间: 2025-09-24T11:38:28.629Z
 * 请勿手动修改此文件
 */

import { AppPath } from '@libs/app-search';
import { AppConfig } from '@shared/types';
import { BasicWindowMetadata } from '../../main/config/window-manager';

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

  /**
 * 搜索已安装的应用
 * @returns 应用列表，包含名称、路径和图标
 */
  "app-search-apps": () => Promise<Array<AppPath>>;
  /**
 * 搜索已安装的应用
 * @returns 应用列表，包含名称、路径和图标
 */
  "appSearchApps": () => Promise<Array<AppPath>>;

  /**
 * 启动应用
 * @param 应用路径
 * @returns 是否启动成功
 */
  "app-launch-app": (appPath: string) => Promise<boolean>;
  /**
 * 启动应用
 * @param 应用路径
 * @returns 是否启动成功
 */
  "appLaunchApp": (appPath: string) => Promise<boolean>;

  /**
 * 提取文件图标
 * @param 文件路径
 * @returns 图标的 Data URL 或 null
 */
  "app-extract-file-icon": (filePath: string) => Promise<string | null>;
  /**
 * 提取文件图标
 * @param 文件路径
 * @returns 图标的 Data URL 或 null
 */
  "appExtractFileIcon": (filePath: string) => Promise<string | null>;
}

interface clipboardInterface {
  /**
 * 读取剪切板文本内容
 * @returns 剪切板中的文本内容
 */
  "clipboard-read-text": () => Promise<string>;
  /**
 * 读取剪切板文本内容
 * @returns 剪切板中的文本内容
 */
  "clipboardReadText": () => Promise<string>;

  /**
 * 写入文本到剪切板
 * @param 要写入的文本
 * @returns 是否写入成功
 */
  "clipboard-write-text": (text: string) => Promise<boolean>;
  /**
 * 写入文本到剪切板
 * @param 要写入的文本
 * @returns 是否写入成功
 */
  "clipboardWriteText": (text: string) => Promise<boolean>;

  /**
 * 清空剪切板
 * @returns 是否清空成功
 */
  "clipboard-clear": () => Promise<boolean>;
  /**
 * 清空剪切板
 * @returns 是否清空成功
 */
  "clipboardClear": () => Promise<boolean>;

  /**
 * 检查剪切板是否有文本内容
 * @returns 是否有文本内容
 */
  "clipboard-has-text": () => Promise<boolean>;
  /**
 * 检查剪切板是否有文本内容
 * @returns 是否有文本内容
 */
  "clipboardHasText": () => Promise<boolean>;

  /**
 * 检测剪切板内容是否为中文
 * @returns 是否包含中文字符
 */
  "clipboard-has-chinese-text": () => Promise<boolean>;
  /**
 * 检测剪切板内容是否为中文
 * @returns 是否包含中文字符
 */
  "clipboardHasChineseText": () => Promise<boolean>;

  /**
 * 获取剪切板中的中文文本
如果剪切板中包含中文，返回文本；否则返回空字符串
 * @returns 中文文本或空字符串
 */
  "clipboard-get-chinese-text": () => Promise<string>;
  /**
 * 获取剪切板中的中文文本
如果剪切板中包含中文，返回文本；否则返回空字符串
 * @returns 中文文本或空字符串
 */
  "clipboardGetChineseText": () => Promise<string>;

  /**
 * 检查剪切板是否有图片内容
 * @returns 是否有图片内容
 */
  "clipboard-has-image": () => Promise<boolean>;
  /**
 * 检查剪切板是否有图片内容
 * @returns 是否有图片内容
 */
  "clipboardHasImage": () => Promise<boolean>;

  /**
 * 读取剪切板图片内容并转换为base64
 * @returns base64格式的图片数据，如果没有图片则返回null
 */
  "clipboard-read-image-as-base64": () => Promise<string | null>;
  /**
 * 读取剪切板图片内容并转换为base64
 * @returns base64格式的图片数据，如果没有图片则返回null
 */
  "clipboardReadImageAsBase64": () => Promise<string | null>;

  /**
 * 写入图片到剪切板
 * @param base64格式的图片数据
 * @returns 是否写入成功
 */
  "clipboard-write-image": (imageData: string) => Promise<boolean>;
  /**
 * 写入图片到剪切板
 * @param base64格式的图片数据
 * @returns 是否写入成功
 */
  "clipboardWriteImage": (imageData: string) => Promise<boolean>;
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

  /** 获取插件目录路径 */
  "filesystem-get-plugins-directory": () => Promise<string>;
  /** 获取插件目录路径 */
  "filesystemGetPluginsDirectory": () => Promise<string>;

  /**
 * 获取所有已安装的插件（仅第三方插件）
 * @returns 插件信息数组，包含路径和配置文件路径
 */
  "filesystem-get-all-installed-plugins": () => Promise<any[]>;
  /**
 * 获取所有已安装的插件（仅第三方插件）
 * @returns 插件信息数组，包含路径和配置文件路径
 */
  "filesystemGetAllInstalledPlugins": () => Promise<any[]>;

  /**
 * 安装插件zip文件
 * @param zip文件路径
 * @returns 插件安装路径，如果安装失败则返回null
 */
  "filesystem-install-plugin-from-zip": (zipPath: string) => Promise<{ path: string, configPath: string, isDefault: boolean } | null>;
  /**
 * 安装插件zip文件
 * @param zip文件路径
 * @returns 插件安装路径，如果安装失败则返回null
 */
  "filesystemInstallPluginFromZip": (zipPath: string) => Promise<{ path: string, configPath: string, isDefault: boolean } | null>;

  /**
 * 卸载插件
 * @param 插件ID
 * @returns 是否卸载成功
 */
  "filesystem-uninstall-plugin": (pluginId: string) => Promise<boolean>;
  /**
 * 卸载插件
 * @param 插件ID
 * @returns 是否卸载成功
 */
  "filesystemUninstallPlugin": (pluginId: string) => Promise<boolean>;

  /**
 * 将文件夹打包为zip文件
 * @param 源文件夹路径
 * @param 输出zip文件路径
 * @returns 是否打包成功
 */
  "filesystem-zip-directory": (sourceDir: string, outputPath: string) => Promise<boolean>;
  /**
 * 将文件夹打包为zip文件
 * @param 源文件夹路径
 * @param 输出zip文件路径
 * @returns 是否打包成功
 */
  "filesystemZipDirectory": (sourceDir: string, outputPath: string) => Promise<boolean>;
}

interface hotkeyInterface {
  /**
 * 注册全局快捷键
 * @param 快捷键组合
 * @param 回调函数
 * @returns 是否注册成功
 */
  "hotkey-register-global-shortcut": (keys: string, callback: () => void) => Promise<boolean>;
  /**
 * 注册全局快捷键
 * @param 快捷键组合
 * @param 回调函数
 * @returns 是否注册成功
 */
  "hotkeyRegisterGlobalShortcut": (keys: string, callback: () => void) => Promise<boolean>;

  /**
 * 注销全局快捷键
 * @param 快捷键ID
 * @returns 是否注销成功
 */
  "hotkey-unregister-global-shortcut": (id: string) => Promise<boolean>;
  /**
 * 注销全局快捷键
 * @param 快捷键ID
 * @returns 是否注销成功
 */
  "hotkeyUnregisterGlobalShortcut": (id: string) => Promise<boolean>;

  /**
 * 检查全局快捷键是否已注册
 * @param 快捷键组合
 * @returns 是否已注册
 */
  "hotkey-is-global-shortcut-registered": (keys: string) => Promise<boolean>;
  /**
 * 检查全局快捷键是否已注册
 * @param 快捷键组合
 * @returns 是否已注册
 */
  "hotkeyIsGlobalShortcutRegistered": (keys: string) => Promise<boolean>;

  /**
 * 清除所有全局快捷键
 * @returns 是否清除成功
 */
  "hotkey-clear-all-global-shortcuts": () => Promise<boolean>;
  /**
 * 清除所有全局快捷键
 * @returns 是否清除成功
 */
  "hotkeyClearAllGlobalShortcuts": () => Promise<boolean>;
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

interface screenCaptureInterface {
  /**
 * 获取屏幕源列表
 * @param 获取屏幕源的选项
 * @returns 屏幕源列表
 */
  "screen-capture-get-sources": (options: {
  types: ("screen" | "window")[];
  thumbnailSize?: { width: number; height: number };
}) => Promise<Electron.DesktopCapturerSource[]>;
  /**
 * 获取屏幕源列表
 * @param 获取屏幕源的选项
 * @returns 屏幕源列表
 */
  "screenCaptureGetSources": (options: {
  types: ("screen" | "window")[];
  thumbnailSize?: { width: number; height: number };
}) => Promise<Electron.DesktopCapturerSource[]>;

  /**
 * 截图并裁剪，返回临时文件地址或复制到剪切板
 * @param 截图选项
 * @returns 操作结果
 */
  "screen-capture-capture-and-get-file-path": (options: { sourceId?: string; }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  /**
 * 截图并裁剪，返回临时文件地址或复制到剪切板
 * @param 截图选项
 * @returns 操作结果
 */
  "screenCaptureCaptureAndGetFilePath": (options: { sourceId?: string; }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
}

interface searchInterface {
  /**
 * 搜索应用程序
 * @param 搜索查询
 * @returns 匹配的应用程序列表
 */
  "search-search-apps": (query: string) => Promise<AppPath[]>;
  /**
 * 搜索应用程序
 * @param 搜索查询
 * @returns 匹配的应用程序列表
 */
  "searchSearchApps": (query: string) => Promise<AppPath[]>;

  /**
 * 获取所有应用程序
 * @returns 所有应用程序列表
 */
  "search-get-all-apps": () => Promise<AppPath[]>;
  /**
 * 获取所有应用程序
 * @returns 所有应用程序列表
 */
  "searchGetAllApps": () => Promise<AppPath[]>;

  /**
 * 获取最近使用的应用程序
 * @param 限制数量
 * @returns 最近使用的应用程序列表
 */
  "search-get-recent-apps": (limit: number) => Promise<AppPath[]>;
  /**
 * 获取最近使用的应用程序
 * @param 限制数量
 * @returns 最近使用的应用程序列表
 */
  "searchGetRecentApps": (limit: number) => Promise<AppPath[]>;

  /**
 * 获取收藏的应用程序
 * @returns 收藏的应用程序列表
 */
  "search-get-pinned-apps": () => Promise<AppPath[]>;
  /**
 * 获取收藏的应用程序
 * @returns 收藏的应用程序列表
 */
  "searchGetPinnedApps": () => Promise<AppPath[]>;

  /**
 * 执行应用程序
 * @param 应用程序项目
 * @returns 是否执行成功
 */
  "search-execute-app": (appItem: AppPath) => Promise<boolean>;
  /**
 * 执行应用程序
 * @param 应用程序项目
 * @returns 是否执行成功
 */
  "searchExecuteApp": (appItem: AppPath) => Promise<boolean>;

  /**
 * 添加到收藏
 * @param 应用程序项目
 * @returns 是否添加成功
 */
  "search-pin-app": (appItem: AppPath) => Promise<boolean>;
  /**
 * 添加到收藏
 * @param 应用程序项目
 * @returns 是否添加成功
 */
  "searchPinApp": (appItem: AppPath) => Promise<boolean>;

  /**
 * 从收藏中移除
 * @param 应用程序项目
 * @returns 是否移除成功
 */
  "search-unpin-app": (appItem: AppPath) => Promise<boolean>;
  /**
 * 从收藏中移除
 * @param 应用程序项目
 * @returns 是否移除成功
 */
  "searchUnpinApp": (appItem: AppPath) => Promise<boolean>;

  /**
 * 获取应用程序图标
 * @param 应用程序项目
 * @returns 图标数据URL或null
 */
  "search-get-app-icon": (appItem: AppPath) => Promise<string | null>;
  /**
 * 获取应用程序图标
 * @param 应用程序项目
 * @returns 图标数据URL或null
 */
  "searchGetAppIcon": (appItem: AppPath) => Promise<string | null>;

  /**
 * 获取应用程序详细信息
 * @param 应用程序项目
 * @returns 应用程序详细信息
 */
  "search-get-app-details": (appItem: AppPath) => Promise<any>;
  /**
 * 获取应用程序详细信息
 * @param 应用程序项目
 * @returns 应用程序详细信息
 */
  "searchGetAppDetails": (appItem: AppPath) => Promise<any>;

  /**
 * 刷新应用程序列表
 * @returns 是否刷新成功
 */
  "search-refresh-apps": () => Promise<boolean>;
  /**
 * 刷新应用程序列表
 * @returns 是否刷新成功
 */
  "searchRefreshApps": () => Promise<boolean>;
}

interface storeInterface {
  /**
 * 获取存储数据
 * @param 配置键名，如果不提供则返回完整配置
 * @returns 配置值或完整配置对象
 */
  "store-get": (key?: keyof AppConfig) => Promise<any>;
  /**
 * 获取存储数据
 * @param 配置键名，如果不提供则返回完整配置
 * @returns 配置值或完整配置对象
 */
  "storeGet": (key?: keyof AppConfig) => Promise<any>;

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
 * 切换窗口显示状态
 * @param 可选参数，指定是否显示窗口。不传则进行toggle
 */
  "window-toggle-show": (id: number, show?: boolean) => Promise<void>;
  /**
 * 切换窗口显示状态
 * @param 可选参数，指定是否显示窗口。不传则进行toggle
 */
  "windowToggleShow": (id: number, show?: boolean) => Promise<void>;

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

  /**
 * 检查窗口是否显示
 * @param 窗口ID
 * @returns 窗口是否显示
 */
  "window-is-window-visible": (id: number) => Promise<boolean>;
  /**
 * 检查窗口是否显示
 * @param 窗口ID
 * @returns 窗口是否显示
 */
  "windowIsWindowVisible": (id: number) => Promise<boolean>;

  /**
 * 设置窗口大小
 * @param 窗口宽度
 * @param 窗口高度
 */
  "window-set-size": (width: number, height: number) => Promise<void>;
  /**
 * 设置窗口大小
 * @param 窗口宽度
 * @param 窗口高度
 */
  "windowSetSize": (width: number, height: number) => Promise<void>;

  /**
 * 设置窗口是否可调整大小
 * @param 是否可调整大小
 */
  "window-set-resizable": (resizable: boolean, windowId: number) => Promise<void>;
  /**
 * 设置窗口是否可调整大小
 * @param 是否可调整大小
 */
  "windowSetResizable": (resizable: boolean, windowId: number) => Promise<void>;

  /** 打开日志查看器窗口 */
  "window-open-log-viewer": () => Promise<void>;
  /** 打开日志查看器窗口 */
  "windowOpenLogViewer": () => Promise<void>;

  /** 注册全局快捷键 */
  "window-register-global-hotkey": (accelerator: string, id: string) => Promise<boolean>;
  /** 注册全局快捷键 */
  "windowRegisterGlobalHotkey": (accelerator: string, id: string) => Promise<boolean>;

  /** 注销全局快捷键 */
  "window-unregister-global-hotkey": (accelerator: string, id: string) => Promise<boolean>;
  /** 注销全局快捷键 */
  "windowUnregisterGlobalHotkey": (accelerator: string, id: string) => Promise<boolean>;

  /** 注销所有全局快捷键 */
  "window-unregister-all-global-hotkeys": () => Promise<void>;
  /** 注销所有全局快捷键 */
  "windowUnregisterAllGlobalHotkeys": () => Promise<void>;

  /** 检查快捷键是否已注册 */
  "window-is-global-hotkey-registered": (accelerator: string) => Promise<boolean>;
  /** 检查快捷键是否已注册 */
  "windowIsGlobalHotkeyRegistered": (accelerator: string) => Promise<boolean>;

  /** 获取所有已注册的全局快捷键 */
  "window-get-all-registered-global-hotkeys": () => Promise<Array<{
  id: string;
  accelerator: string;
}>>;
  /** 获取所有已注册的全局快捷键 */
  "windowGetAllRegisteredGlobalHotkeys": () => Promise<Array<{
  id: string;
  accelerator: string;
}>>;

  /**
 * 获取UI常量配置
 * @returns UI常量配置对象，包含headerHeight、maxHeight、padding
 */
  "window-get-u-i-constants": () => Promise<{
  headerHeight: number;
  maxHeight: number;
  padding: number;
}>;
  /**
 * 获取UI常量配置
 * @returns UI常量配置对象，包含headerHeight、maxHeight、padding
 */
  "windowGetUIConstants": () => Promise<{
  headerHeight: number;
  maxHeight: number;
  padding: number;
}>;

  /**
 * 计算跟随窗口的最终边界
 * @param 主窗口X坐标
 * @param 主窗口Y坐标
 * @param 主窗口宽度
 * @param 主窗口高度
 * @returns 跟随窗口的最终边界配置
 */
  "window-calculate-following-window-bounds": (mainX: number, mainY: number, mainWidth: number, mainHeight: number, addPadding: number) => Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;
  /**
 * 计算跟随窗口的最终边界
 * @param 主窗口X坐标
 * @param 主窗口Y坐标
 * @param 主窗口宽度
 * @param 主窗口高度
 * @returns 跟随窗口的最终边界配置
 */
  "windowCalculateFollowingWindowBounds": (mainX: number, mainY: number, mainWidth: number, mainHeight: number, addPadding: number) => Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

  /** 显示所有following类型的窗口 */
  "window-show-all-following-windows": () => Promise<void>;
  /** 显示所有following类型的窗口 */
  "windowShowAllFollowingWindows": () => Promise<void>;

  /** 隐藏所有following类型的窗口 */
  "window-hide-all-following-windows": () => Promise<void>;
  /** 隐藏所有following类型的窗口 */
  "windowHideAllFollowingWindows": () => Promise<void>;

  /** 关闭所有following类型的窗口 */
  "window-close-all-following-windows": () => Promise<void>;
  /** 关闭所有following类型的窗口 */
  "windowCloseAllFollowingWindows": () => Promise<void>;

  /**
 * 根据配置隐藏或关闭所有following窗口
 * @param 操作类型：'hide' 隐藏，'close' 关闭
 */
  "window-manage-following-windows": (action: 'hide' | 'close') => Promise<void>;
  /**
 * 根据配置隐藏或关闭所有following窗口
 * @param 操作类型：'hide' 隐藏，'close' 关闭
 */
  "windowManageFollowingWindows": (action: 'hide' | 'close') => Promise<void>;

  /**
 * 根据插件信息显示特定的following窗口
 * @param 插件项目信息，包含pluginId和名称
 */
  "window-show-specific-following-window": (pathId: string) => Promise<void>;
  /**
 * 根据插件信息显示特定的following窗口
 * @param 插件项目信息，包含pluginId和名称
 */
  "windowShowSpecificFollowingWindow": (pathId: string) => Promise<void>;

  /**
 * 创建网页显示窗口
 * @param 主窗口ID
 * @param 要显示的网页URL
 * @param 元数据，包含title、preload等额外信息
 */
  "window-create-web-page-window": (windowId: number, url: string, metadata?: Omit<BasicWindowMetadata, "init" | "parentWindowId" | "url" | "path">) => Promise<void>;
  /**
 * 创建网页显示窗口
 * @param 主窗口ID
 * @param 要显示的网页URL
 * @param 元数据，包含title、preload等额外信息
 */
  "windowCreateWebPageWindow": (windowId: number, url: string, metadata?: Omit<BasicWindowMetadata, "init" | "parentWindowId" | "url" | "path">) => Promise<void>;
}

// 合并所有 IPC 路由类型
export interface AllIpcRouter extends appInterface, clipboardInterface, filesystemInterface, hotkeyInterface, logInterface, screenCaptureInterface, searchInterface, storeInterface, windowInterface {}

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
    route: "app-search-apps",
    comment: "搜索已安装的应用",
    module: "app",
    function: "searchApps"
  },
  {
    route: "app-launch-app",
    comment: "启动应用",
    module: "app",
    function: "launchApp"
  },
  {
    route: "app-extract-file-icon",
    comment: "提取文件图标",
    module: "app",
    function: "extractFileIcon"
  },
  {
    route: "clipboard-read-text",
    comment: "读取剪切板文本内容",
    module: "clipboard",
    function: "readText"
  },
  {
    route: "clipboard-write-text",
    comment: "写入文本到剪切板",
    module: "clipboard",
    function: "writeText"
  },
  {
    route: "clipboard-clear",
    comment: "清空剪切板",
    module: "clipboard",
    function: "clear"
  },
  {
    route: "clipboard-has-text",
    comment: "检查剪切板是否有文本内容",
    module: "clipboard",
    function: "hasText"
  },
  {
    route: "clipboard-has-chinese-text",
    comment: "检测剪切板内容是否为中文",
    module: "clipboard",
    function: "hasChineseText"
  },
  {
    route: "clipboard-get-chinese-text",
    comment: "获取剪切板中的中文文本 , 如果剪切板中包含中文，返回文本；否则返回空字符串",
    module: "clipboard",
    function: "getChineseText"
  },
  {
    route: "clipboard-has-image",
    comment: "检查剪切板是否有图片内容",
    module: "clipboard",
    function: "hasImage"
  },
  {
    route: "clipboard-read-image-as-base64",
    comment: "读取剪切板图片内容并转换为base64",
    module: "clipboard",
    function: "readImageAsBase64"
  },
  {
    route: "clipboard-write-image",
    comment: "写入图片到剪切板",
    module: "clipboard",
    function: "writeImage"
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
    route: "filesystem-get-plugins-directory",
    comment: "获取插件目录路径",
    module: "filesystem",
    function: "getPluginsDirectory"
  },
  {
    route: "filesystem-get-all-installed-plugins",
    comment: "获取所有已安装的插件（仅第三方插件）",
    module: "filesystem",
    function: "getAllInstalledPlugins"
  },
  {
    route: "filesystem-install-plugin-from-zip",
    comment: "安装插件zip文件",
    module: "filesystem",
    function: "installPluginFromZip"
  },
  {
    route: "filesystem-uninstall-plugin",
    comment: "卸载插件",
    module: "filesystem",
    function: "uninstallPlugin"
  },
  {
    route: "filesystem-zip-directory",
    comment: "将文件夹打包为zip文件",
    module: "filesystem",
    function: "zipDirectory"
  },
  {
    route: "hotkey-register-global-shortcut",
    comment: "注册全局快捷键",
    module: "hotkey",
    function: "registerGlobalShortcut"
  },
  {
    route: "hotkey-unregister-global-shortcut",
    comment: "注销全局快捷键",
    module: "hotkey",
    function: "unregisterGlobalShortcut"
  },
  {
    route: "hotkey-is-global-shortcut-registered",
    comment: "检查全局快捷键是否已注册",
    module: "hotkey",
    function: "isGlobalShortcutRegistered"
  },
  {
    route: "hotkey-clear-all-global-shortcuts",
    comment: "清除所有全局快捷键",
    module: "hotkey",
    function: "clearAllGlobalShortcuts"
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
    route: "screen-capture-get-sources",
    comment: "获取屏幕源列表",
    module: "screenCapture",
    function: "getSources"
  },
  {
    route: "screen-capture-capture-and-get-file-path",
    comment: "截图并裁剪，返回临时文件地址或复制到剪切板",
    module: "screenCapture",
    function: "captureAndGetFilePath"
  },
  {
    route: "search-search-apps",
    comment: "搜索应用程序",
    module: "search",
    function: "searchApps"
  },
  {
    route: "search-get-all-apps",
    comment: "获取所有应用程序",
    module: "search",
    function: "getAllApps"
  },
  {
    route: "search-get-recent-apps",
    comment: "获取最近使用的应用程序",
    module: "search",
    function: "getRecentApps"
  },
  {
    route: "search-get-pinned-apps",
    comment: "获取收藏的应用程序",
    module: "search",
    function: "getPinnedApps"
  },
  {
    route: "search-execute-app",
    comment: "执行应用程序",
    module: "search",
    function: "executeApp"
  },
  {
    route: "search-pin-app",
    comment: "添加到收藏",
    module: "search",
    function: "pinApp"
  },
  {
    route: "search-unpin-app",
    comment: "从收藏中移除",
    module: "search",
    function: "unpinApp"
  },
  {
    route: "search-get-app-icon",
    comment: "获取应用程序图标",
    module: "search",
    function: "getAppIcon"
  },
  {
    route: "search-get-app-details",
    comment: "获取应用程序详细信息",
    module: "search",
    function: "getAppDetails"
  },
  {
    route: "search-refresh-apps",
    comment: "刷新应用程序列表",
    module: "search",
    function: "refreshApps"
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
    route: "window-toggle-show",
    comment: "切换窗口显示状态",
    module: "window",
    function: "toggleShow"
  },
  {
    route: "window-is-maximized",
    comment: "检查窗口是否最大化",
    module: "window",
    function: "isMaximized"
  },
  {
    route: "window-is-window-visible",
    comment: "检查窗口是否显示",
    module: "window",
    function: "isWindowVisible"
  },
  {
    route: "window-set-size",
    comment: "设置窗口大小",
    module: "window",
    function: "setSize"
  },
  {
    route: "window-set-resizable",
    comment: "设置窗口是否可调整大小",
    module: "window",
    function: "setResizable"
  },
  {
    route: "window-open-log-viewer",
    comment: "打开日志查看器窗口",
    module: "window",
    function: "openLogViewer"
  },
  {
    route: "window-register-global-hotkey",
    comment: "注册全局快捷键",
    module: "window",
    function: "registerGlobalHotkey"
  },
  {
    route: "window-unregister-global-hotkey",
    comment: "注销全局快捷键",
    module: "window",
    function: "unregisterGlobalHotkey"
  },
  {
    route: "window-unregister-all-global-hotkeys",
    comment: "注销所有全局快捷键",
    module: "window",
    function: "unregisterAllGlobalHotkeys"
  },
  {
    route: "window-is-global-hotkey-registered",
    comment: "检查快捷键是否已注册",
    module: "window",
    function: "isGlobalHotkeyRegistered"
  },
  {
    route: "window-get-all-registered-global-hotkeys",
    comment: "获取所有已注册的全局快捷键",
    module: "window",
    function: "getAllRegisteredGlobalHotkeys"
  },
  {
    route: "window-get-u-i-constants",
    comment: "获取UI常量配置",
    module: "window",
    function: "getUIConstants"
  },
  {
    route: "window-calculate-following-window-bounds",
    comment: "计算跟随窗口的最终边界",
    module: "window",
    function: "calculateFollowingWindowBounds"
  },
  {
    route: "window-show-all-following-windows",
    comment: "显示所有following类型的窗口",
    module: "window",
    function: "showAllFollowingWindows"
  },
  {
    route: "window-hide-all-following-windows",
    comment: "隐藏所有following类型的窗口",
    module: "window",
    function: "hideAllFollowingWindows"
  },
  {
    route: "window-close-all-following-windows",
    comment: "关闭所有following类型的窗口",
    module: "window",
    function: "closeAllFollowingWindows"
  },
  {
    route: "window-manage-following-windows",
    comment: "根据配置隐藏或关闭所有following窗口",
    module: "window",
    function: "manageFollowingWindows"
  },
  {
    route: "window-show-specific-following-window",
    comment: "根据插件信息显示特定的following窗口",
    module: "window",
    function: "showSpecificFollowingWindow"
  },
  {
    route: "window-create-web-page-window",
    comment: "创建网页显示窗口",
    module: "window",
    function: "createWebPageWindow"
  }
];

// 路由键类型
export type IpcRouteKey = keyof AllIpcRouter;

// 获取路由参数类型
export type IpcRouteParams<T extends IpcRouteKey> = Parameters<AllIpcRouter[T]>;

// 获取路由返回类型
export type IpcRouteReturn<T extends IpcRouteKey> = ReturnType<AllIpcRouter[T]>;
