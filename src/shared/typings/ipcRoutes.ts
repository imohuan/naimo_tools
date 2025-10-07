/**
 * 自动生成的 IPC 类型定义
 * 生成时间: 2025-10-07T11:00:46.382Z
 * 请勿手动修改此文件
 */

import { AppPath } from '@libs/app-search';
import { DebugInfo } from '@main/services/DebugService';
import { AppConfig } from '@shared/typings/appTypes';
import { ViewType, LifecycleType } from '@renderer/src/typings/windowTypes';
import { PluginItem } from '@renderer/src/typings/pluginTypes';

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
 * @param IPC事件对象
 * @param 应用路径
 * @returns 是否启动成功
 */
  "app-launch-app": (appPath: string) => Promise<boolean>;
  /**
 * 启动应用
 * @param IPC事件对象
 * @param 应用路径
 * @returns 是否启动成功
 */
  "appLaunchApp": (appPath: string) => Promise<boolean>;

  /**
 * 提取文件图标
 * @param IPC事件对象
 * @param 文件路径
 * @returns 图标的 Data URL 或 null
 */
  "app-extract-file-icon": (filePath: string) => Promise<string | null>;
  /**
 * 提取文件图标
 * @param IPC事件对象
 * @param 文件路径
 * @returns 图标的 Data URL 或 null
 */
  "appExtractFileIcon": (filePath: string) => Promise<string | null>;

  /**
 * 广播插件事件到所有视图
 * @param IPC事件
 * @param 消息通道
 * @param 消息数据
 * @returns 是否广播成功
 */
  "app-forward-message-to-main-view": (channel: string, data: any) => Promise<boolean>;
  /**
 * 广播插件事件到所有视图
 * @param IPC事件
 * @param 消息通道
 * @param 消息数据
 * @returns 是否广播成功
 */
  "appForwardMessageToMainView": (channel: string, data: any) => Promise<boolean>;

  /**
 * 广播插件事件到所有视图
 * @param IPC事件
 * @param 消息通道
 * @param 消息数据
 * @returns 是否广播成功
 */
  "app-forward-message-to-plugin-view": (pluginPath: string, channel: string, data: any) => Promise<boolean>;
  /**
 * 广播插件事件到所有视图
 * @param IPC事件
 * @param 消息通道
 * @param 消息数据
 * @returns 是否广播成功
 */
  "appForwardMessageToPluginView": (pluginPath: string, channel: string, data: any) => Promise<boolean>;
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
 * @param IPC事件对象
 * @param 要写入的文本
 * @returns 是否写入成功
 */
  "clipboard-write-text": (text: string) => Promise<boolean>;
  /**
 * 写入文本到剪切板
 * @param IPC事件对象
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
 * @param IPC事件对象
 * @param base64格式的图片数据
 * @returns 是否写入成功
 */
  "clipboard-write-image": (imageData: string) => Promise<boolean>;
  /**
 * 写入图片到剪切板
 * @param IPC事件对象
 * @param base64格式的图片数据
 * @returns 是否写入成功
 */
  "clipboardWriteImage": (imageData: string) => Promise<boolean>;
}

interface debugInterface {
  /** 切换调试窗口展开状态 */
  "debug-toggle-debug-window": () => Promise<boolean>;
  /** 切换调试窗口展开状态 */
  "debugToggleDebugWindow": () => Promise<boolean>;

  /** 显示调试窗口 */
  "debug-show-debug-window": () => Promise<boolean>;
  /** 显示调试窗口 */
  "debugShowDebugWindow": () => Promise<boolean>;

  /** 隐藏调试窗口 */
  "debug-hide-debug-window": () => Promise<boolean>;
  /** 隐藏调试窗口 */
  "debugHideDebugWindow": () => Promise<boolean>;

  /** 获取调试信息（手动请求） */
  "debug-get-debug-info": () => Promise<DebugInfo | null>;
  /** 获取调试信息（手动请求） */
  "debugGetDebugInfo": () => Promise<DebugInfo | null>;

  /** 获取调试窗口展开状态 */
  "debug-get-debug-window-state": () => Promise<{ isExpanded: boolean } | null>;
  /** 获取调试窗口展开状态 */
  "debugGetDebugWindowState": () => Promise<{ isExpanded: boolean } | null>;

  /** 移动调试窗口 */
  "debug-move-debug-window": (deltaX: number, deltaY: number) => Promise<boolean>;
  /** 移动调试窗口 */
  "debugMoveDebugWindow": (deltaX: number, deltaY: number) => Promise<boolean>;
}

interface filesystemInterface {
  /**
 * 选择文件
 * @param IPC事件对象
 * @param 对话框选项
 * @returns 选择的文件路径数组，如果取消则返回null
 */
  "filesystem-select-file": (options: Electron.OpenDialogOptions) => Promise<string[] | null>;
  /**
 * 选择文件
 * @param IPC事件对象
 * @param 对话框选项
 * @returns 选择的文件路径数组，如果取消则返回null
 */
  "filesystemSelectFile": (options: Electron.OpenDialogOptions) => Promise<string[] | null>;

  /**
 * 选择文件夹
 * @param IPC事件对象
 * @param 对话框选项
 * @returns 选择的文件夹路径数组，如果取消则返回null
 */
  "filesystem-select-folder": (options: Electron.OpenDialogOptions) => Promise<string[] | null>;
  /**
 * 选择文件夹
 * @param IPC事件对象
 * @param 对话框选项
 * @returns 选择的文件夹路径数组，如果取消则返回null
 */
  "filesystemSelectFolder": (options: Electron.OpenDialogOptions) => Promise<string[] | null>;

  /**
 * 保存文件
 * @param IPC事件对象
 * @param 保存对话框选项
 * @returns 选择的保存路径，如果取消则返回null
 */
  "filesystem-save-file": (options: Electron.SaveDialogOptions) => Promise<string | null>;
  /**
 * 保存文件
 * @param IPC事件对象
 * @param 保存对话框选项
 * @returns 选择的保存路径，如果取消则返回null
 */
  "filesystemSaveFile": (options: Electron.SaveDialogOptions) => Promise<string | null>;

  /**
 * 读取文件内容
 * @param IPC事件对象
 * @param 文件路径
 * @param 文件编码，默认为'utf-8'
 * @returns 文件内容
 */
  "filesystem-read-file-content": (filePath: string, encoding: BufferEncoding) => Promise<string>;
  /**
 * 读取文件内容
 * @param IPC事件对象
 * @param 文件路径
 * @param 文件编码，默认为'utf-8'
 * @returns 文件内容
 */
  "filesystemReadFileContent": (filePath: string, encoding: BufferEncoding) => Promise<string>;

  /**
 * 读取文件内容为Base64
 * @param IPC事件对象
 * @param 文件路径
 * @returns Base64编码的文件内容
 */
  "filesystem-read-file-as-base64": (filePath: string) => Promise<string>;
  /**
 * 读取文件内容为Base64
 * @param IPC事件对象
 * @param 文件路径
 * @returns Base64编码的文件内容
 */
  "filesystemReadFileAsBase64": (filePath: string) => Promise<string>;

  /**
 * 写入文件内容
 * @param IPC事件对象
 * @param 文件路径
 * @param 文件内容
 * @param 文件编码，默认为'utf-8'
 * @returns 是否写入成功
 */
  "filesystem-write-file-content": (filePath: string, content: string, encoding: BufferEncoding) => Promise<boolean>;
  /**
 * 写入文件内容
 * @param IPC事件对象
 * @param 文件路径
 * @param 文件内容
 * @param 文件编码，默认为'utf-8'
 * @returns 是否写入成功
 */
  "filesystemWriteFileContent": (filePath: string, content: string, encoding: BufferEncoding) => Promise<boolean>;

  /**
 * 从Base64写入文件
 * @param IPC事件对象
 * @param 文件路径
 * @param Base64编码的数据
 * @returns 是否写入成功
 */
  "filesystem-write-file-from-base64": (filePath: string, base64Data: string) => Promise<boolean>;
  /**
 * 从Base64写入文件
 * @param IPC事件对象
 * @param 文件路径
 * @param Base64编码的数据
 * @returns 是否写入成功
 */
  "filesystemWriteFileFromBase64": (filePath: string, base64Data: string) => Promise<boolean>;
}

interface hotkeyInterface {
  /** 注册全局快捷键 */
  "hotkey-register-global-hotkey": (accelerator: string, id: string) => Promise<boolean>;
  /** 注册全局快捷键 */
  "hotkeyRegisterGlobalHotkey": (accelerator: string, id: string) => Promise<boolean>;

  /** 注销全局快捷键 */
  "hotkey-unregister-global-hotkey": (accelerator: string, id: string) => Promise<boolean>;
  /** 注销全局快捷键 */
  "hotkeyUnregisterGlobalHotkey": (accelerator: string, id: string) => Promise<boolean>;

  /** 注销所有全局快捷键 */
  "hotkey-unregister-all-global-hotkeys": () => Promise<void>;
  /** 注销所有全局快捷键 */
  "hotkeyUnregisterAllGlobalHotkeys": () => Promise<void>;

  /** 检查快捷键是否已注册 */
  "hotkey-is-global-hotkey-registered": (accelerator: string) => Promise<boolean>;
  /** 检查快捷键是否已注册 */
  "hotkeyIsGlobalHotkeyRegistered": (accelerator: string) => Promise<boolean>;

  /** 获取所有已注册的全局快捷键 */
  "hotkey-get-all-registered-global-hotkeys": () => Promise<Array<{
  id: string;
  accelerator: string;
}>>;
  /** 获取所有已注册的全局快捷键 */
  "hotkeyGetAllRegisteredGlobalHotkeys": () => Promise<Array<{
  id: string;
  accelerator: string;
}>>;
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

interface pluginInterface {
  /** 获取插件目录路径 */
  "plugin-get-plugins-directory": () => Promise<string>;
  /** 获取插件目录路径 */
  "pluginGetPluginsDirectory": () => Promise<string>;

  /**
 * 获取所有已安装的插件（仅第三方插件）
 * @returns 插件信息数组，包含路径和配置文件路径
 */
  "plugin-get-all-installed-plugins": () => Promise<any[]>;
  /**
 * 获取所有已安装的插件（仅第三方插件）
 * @returns 插件信息数组，包含路径和配置文件路径
 */
  "pluginGetAllInstalledPlugins": () => Promise<any[]>;

  /**
 * 安装插件zip文件
 * @param zip文件路径
 * @returns 插件安装路径，如果安装失败则返回null
 */
  "plugin-install-plugin-from-zip": (zipPath: string) => Promise<{ path: string, configPath: string, isDefault: boolean } | null>;
  /**
 * 安装插件zip文件
 * @param zip文件路径
 * @returns 插件安装路径，如果安装失败则返回null
 */
  "pluginInstallPluginFromZip": (zipPath: string) => Promise<{ path: string, configPath: string, isDefault: boolean } | null>;

  /**
 * 卸载插件
 * @param 插件ID
 * @returns 是否卸载成功
 */
  "plugin-uninstall-plugin": (pluginId: string) => Promise<boolean>;
  /**
 * 卸载插件
 * @param 插件ID
 * @returns 是否卸载成功
 */
  "pluginUninstallPlugin": (pluginId: string) => Promise<boolean>;

  /**
 * 将文件夹打包为zip文件
 * @param 源文件夹路径
 * @param 输出zip文件路径
 * @returns 是否打包成功
 */
  "plugin-zip-directory": (sourceDir: string, outputPath: string) => Promise<boolean>;
  /**
 * 将文件夹打包为zip文件
 * @param 源文件夹路径
 * @param 输出zip文件路径
 * @returns 是否打包成功
 */
  "pluginZipDirectory": (sourceDir: string, outputPath: string) => Promise<boolean>;
}

interface screenCaptureInterface {
  /**
 * 获取屏幕源列表
 * @param IPC事件对象
 * @param 获取屏幕源的选项
 * @returns 屏幕源列表
 */
  "screen-capture-get-sources": (options: {
  types: ("screen" | "window")[];
  thumbnailSize?: { width: number; height: number };
}) => Promise<Electron.DesktopCapturerSource[]>;
  /**
 * 获取屏幕源列表
 * @param IPC事件对象
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

interface storeInterface {
  /**
 * 获取存储数据
 * @param IPC事件对象
 * @param 配置键名，如果不提供则返回完整配置
 * @returns 配置值或完整配置对象
 */
  "store-get": (key?: keyof AppConfig) => Promise<any>;
  /**
 * 获取存储数据
 * @param IPC事件对象
 * @param 配置键名，如果不提供则返回完整配置
 * @returns 配置值或完整配置对象
 */
  "storeGet": (key?: keyof AppConfig) => Promise<any>;

  /**
 * 设置存储数据
 * @param IPC事件对象
 * @param 配置键名
 * @param 配置值
 * @returns 是否设置成功
 */
  "store-set": (key: keyof AppConfig, value: any) => Promise<boolean>;
  /**
 * 设置存储数据
 * @param IPC事件对象
 * @param 配置键名
 * @param 配置值
 * @returns 是否设置成功
 */
  "storeSet": (key: keyof AppConfig, value: any) => Promise<boolean>;

  /**
 * 删除存储数据
 * @param IPC事件对象
 * @param 配置键名
 * @returns 是否删除成功
 */
  "store-delete-key": (key: keyof AppConfig) => Promise<boolean>;
  /**
 * 删除存储数据
 * @param IPC事件对象
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
  /** 最小化窗口 - 基于视图类别的智能控制 */
  "window-minimize": () => Promise<boolean>;
  /** 最小化窗口 - 基于视图类别的智能控制 */
  "windowMinimize": () => Promise<boolean>;

  /** 最大化/还原窗口 - 基于视图类别的智能控制 */
  "window-maximize": () => Promise<boolean>;
  /** 最大化/还原窗口 - 基于视图类别的智能控制 */
  "windowMaximize": () => Promise<boolean>;

  /** 关闭窗口 - 基于视图类别的智能控制 */
  "window-close": () => Promise<boolean>;
  /** 关闭窗口 - 基于视图类别的智能控制 */
  "windowClose": () => Promise<boolean>;

  /**
 * 切换窗口显示状态
 * @param 可选参数，指定是否显示窗口。不传则进行toggle
 */
  "window-toggle-show": (_id?: number, show?: boolean) => Promise<boolean>;
  /**
 * 切换窗口显示状态
 * @param 可选参数，指定是否显示窗口。不传则进行toggle
 */
  "windowToggleShow": (_id?: number, show?: boolean) => Promise<boolean>;

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
 * 检查窗口是否全屏或最大化
 * @returns 窗口是否处于全屏或最大化状态
 */
  "window-is-fullscreen": () => Promise<boolean>;
  /**
 * 检查窗口是否全屏或最大化
 * @returns 窗口是否处于全屏或最大化状态
 */
  "windowIsFullscreen": () => Promise<boolean>;

  /**
 * 检查窗口是否显示
 * @param 窗口ID
 * @returns 窗口是否显示
 */
  "window-is-window-visible": () => Promise<boolean>;
  /**
 * 检查窗口是否显示
 * @param 窗口ID
 * @returns 窗口是否显示
 */
  "windowIsWindowVisible": () => Promise<boolean>;

  /**
 * 设置窗口大小
 * @param 窗口宽度
 * @param 窗口高度
 */
  "window-set-size": (width: number, height: number) => Promise<boolean>;
  /**
 * 设置窗口大小
 * @param 窗口宽度
 * @param 窗口高度
 */
  "windowSetSize": (width: number, height: number) => Promise<boolean>;

  /**
 * 动态调整窗口高度
使用前端传递的高度直接设置窗口大小
 * @param 前端计算的目标高度
 */
  "window-adjust-height": (height: number) => Promise<boolean>;
  /**
 * 动态调整窗口高度
使用前端传递的高度直接设置窗口大小
 * @param 前端计算的目标高度
 */
  "windowAdjustHeight": (height: number) => Promise<boolean>;

  /**
 * 设置窗口是否可调整大小
 * @param 是否可调整大小
 */
  "window-set-resizable": (resizable: boolean) => Promise<boolean>;
  /**
 * 设置窗口是否可调整大小
 * @param 是否可调整大小
 */
  "windowSetResizable": (resizable: boolean) => Promise<boolean>;

  /** 打开日志查看器窗口 */
  "window-open-log-viewer": () => Promise<void>;
  /** 打开日志查看器窗口 */
  "windowOpenLogViewer": () => Promise<void>;

  /**
 * 显示主窗口
通过ViewManager获取main-view的父窗口并显示
 */
  "window-show": () => Promise<boolean>;
  /**
 * 显示主窗口
通过ViewManager获取main-view的父窗口并显示
 */
  "windowShow": () => Promise<boolean>;

  /**
 * 隐藏主窗口
通过ViewManager获取main-view的父窗口并隐藏
 */
  "window-hide": () => Promise<boolean>;
  /**
 * 隐藏主窗口
通过ViewManager获取main-view的父窗口并隐藏
 */
  "windowHide": () => Promise<boolean>;

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

  /** 显示视图（新架构） */
  "window-show-new-view": (params: {
  type: ViewType
  path?: string
  url?: string
  pluginItem?: PluginItem
  forceNew?: boolean
  lifecycleType?: LifecycleType
}) => Promise<{ success: boolean; viewId?: string; error?: string }>;
  /** 显示视图（新架构） */
  "windowShowNewView": (params: {
  type: ViewType
  path?: string
  url?: string
  pluginItem?: PluginItem
  forceNew?: boolean
  lifecycleType?: LifecycleType
}) => Promise<{ success: boolean; viewId?: string; error?: string }>;

  /** 隐藏视图（新架构） */
  "window-hide-new-view": (viewId: string) => Promise<{ success: boolean; error?: string }>;
  /** 隐藏视图（新架构） */
  "windowHideNewView": (viewId: string) => Promise<{ success: boolean; error?: string }>;

  /** 移除视图（新架构） */
  "window-remove-new-view": (viewId: string) => Promise<{ success: boolean; error?: string }>;
  /** 移除视图（新架构） */
  "windowRemoveNewView": (viewId: string) => Promise<{ success: boolean; error?: string }>;

  /** 切换到视图（新架构） */
  "window-switch-to-new-view": (viewId: string) => Promise<{ success: boolean; error?: string }>;
  /** 切换到视图（新架构） */
  "windowSwitchToNewView": (viewId: string) => Promise<{ success: boolean; error?: string }>;

  /** 分离视图（新架构） */
  "window-detach-new-view": (viewId: string, config?: {
  title?: string
  width?: number
  height?: number
  showControlBar?: boolean
}) => Promise<{ success: boolean; detachedWindowId?: number; error?: string }>;
  /** 分离视图（新架构） */
  "windowDetachNewView": (viewId: string, config?: {
  title?: string
  width?: number
  height?: number
  showControlBar?: boolean
}) => Promise<{ success: boolean; detachedWindowId?: number; error?: string }>;

  /** 重新附加视图（新架构） */
  "window-reattach-new-view": (detachedWindowId: number) => Promise<{ success: boolean; error?: string }>;
  /** 重新附加视图（新架构） */
  "windowReattachNewView": (detachedWindowId: number) => Promise<{ success: boolean; error?: string }>;

  /** 获取活跃视图信息（新架构） */
  "window-get-active-new-view": () => Promise<{ success: boolean; viewInfo?: any; error?: string }>;
  /** 获取活跃视图信息（新架构） */
  "windowGetActiveNewView": () => Promise<{ success: boolean; viewInfo?: any; error?: string }>;

  /** 获取所有视图信息（新架构） */
  "window-get-all-new-views": () => Promise<{ success: boolean; views?: any[]; error?: string }>;
  /** 获取所有视图信息（新架构） */
  "windowGetAllNewViews": () => Promise<{ success: boolean; views?: any[]; error?: string }>;

  /** 获取窗口管理器性能指标（新架构） */
  "window-get-new-window-manager-metrics": () => Promise<{ success: boolean; metrics?: any; error?: string }>;
  /** 获取窗口管理器性能指标（新架构） */
  "windowGetNewWindowManagerMetrics": () => Promise<{ success: boolean; metrics?: any; error?: string }>;

  /** 清理后台视图（新架构） */
  "window-cleanup-new-background-views": () => Promise<{ success: boolean; error?: string }>;
  /** 清理后台视图（新架构） */
  "windowCleanupNewBackgroundViews": () => Promise<{ success: boolean; error?: string }>;

  /** 更新窗口管理器配置（新架构） */
  "window-update-new-window-manager-config": (config: {
  memoryRecycleThreshold?: number
  autoRecycleInterval?: number
  maxActiveViews?: number
}) => Promise<{ success: boolean; error?: string }>;
  /** 更新窗口管理器配置（新架构） */
  "windowUpdateNewWindowManagerConfig": (config: {
  memoryRecycleThreshold?: number
  autoRecycleInterval?: number
  maxActiveViews?: number
}) => Promise<{ success: boolean; error?: string }>;

  /** 销毁窗口管理器（新架构） */
  "window-destroy-new-window-manager": () => Promise<{ success: boolean; error?: string }>;
  /** 销毁窗口管理器（新架构） */
  "windowDestroyNewWindowManager": () => Promise<{ success: boolean; error?: string }>;

  /** 创建插件视图（新架构专用 - 懒加载架构） */
  "window-create-plugin-view": (params: {
  fullPath: string
  title: string
  lifecycleType: LifecycleType
  url: string  // 可选：没有则后台加载 about:blank（用于无 UI 的后台插件）
  preload: string
  singleton?: boolean
}) => Promise<{ success: boolean; viewId?: string; error?: string }>;
  /** 创建插件视图（新架构专用 - 懒加载架构） */
  "windowCreatePluginView": (params: {
  fullPath: string
  title: string
  lifecycleType: LifecycleType
  url: string  // 可选：没有则后台加载 about:blank（用于无 UI 的后台插件）
  preload: string
  singleton?: boolean
}) => Promise<{ success: boolean; viewId?: string; error?: string }>;

  /**
 * 关闭插件视图（新架构专用）
关闭所有不支持后台运行的插件视图
 */
  "window-close-plugin-view": () => Promise<{ success: boolean; error?: string; closedCount?: number }>;
  /**
 * 关闭插件视图（新架构专用）
关闭所有不支持后台运行的插件视图
 */
  "windowClosePluginView": () => Promise<{ success: boolean; error?: string; closedCount?: number }>;

  /** 创建设置页面 WebContentsView */
  "window-create-settings-view": () => Promise<{ success: boolean; viewId?: string; error?: string }>;
  /** 创建设置页面 WebContentsView */
  "windowCreateSettingsView": () => Promise<{ success: boolean; viewId?: string; error?: string }>;

  /** 关闭设置页面 WebContentsView */
  "window-close-settings-view": () => Promise<{ success: boolean; error?: string }>;
  /** 关闭设置页面 WebContentsView */
  "windowCloseSettingsView": () => Promise<{ success: boolean; error?: string }>;

  /**
 * 获取当前WebContentsView的完整信息
通过webContents查找对应的WebContentsViewInfo，并返回序列化后的信息
 * @param IPC事件对象
 * @returns 序列化后的视图信息，如果找不到则返回null
 */
  "window-get-current-view-info": () => Promise<{
  id: string;
  parentWindowId: number;
  config: any;
  state: {
    isVisible: boolean;
    isActive: boolean;
    lastAccessTime: number;
    memoryUsage?: number;
  };
  createdAt: string; // 序列化为ISO字符串
} | null>;
  /**
 * 获取当前WebContentsView的完整信息
通过webContents查找对应的WebContentsViewInfo，并返回序列化后的信息
 * @param IPC事件对象
 * @returns 序列化后的视图信息，如果找不到则返回null
 */
  "windowGetCurrentViewInfo": () => Promise<{
  id: string;
  parentWindowId: number;
  config: any;
  state: {
    isVisible: boolean;
    isActive: boolean;
    lastAccessTime: number;
    memoryUsage?: number;
  };
  createdAt: string; // 序列化为ISO字符串
} | null>;
}

// 合并所有 IPC 路由类型
export interface AllIpcRouter extends appInterface, clipboardInterface, debugInterface, filesystemInterface, hotkeyInterface, logInterface, pluginInterface, screenCaptureInterface, storeInterface, windowInterface {}

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
    route: "app-forward-message-to-main-view",
    comment: "广播插件事件到所有视图",
    module: "app",
    function: "forwardMessageToMainView"
  },
  {
    route: "app-forward-message-to-plugin-view",
    comment: "广播插件事件到所有视图",
    module: "app",
    function: "forwardMessageToPluginView"
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
    route: "debug-toggle-debug-window",
    comment: "切换调试窗口展开状态",
    module: "debug",
    function: "toggleDebugWindow"
  },
  {
    route: "debug-show-debug-window",
    comment: "显示调试窗口",
    module: "debug",
    function: "showDebugWindow"
  },
  {
    route: "debug-hide-debug-window",
    comment: "隐藏调试窗口",
    module: "debug",
    function: "hideDebugWindow"
  },
  {
    route: "debug-get-debug-info",
    comment: "获取调试信息（手动请求）",
    module: "debug",
    function: "getDebugInfo"
  },
  {
    route: "debug-get-debug-window-state",
    comment: "获取调试窗口展开状态",
    module: "debug",
    function: "getDebugWindowState"
  },
  {
    route: "debug-move-debug-window",
    comment: "移动调试窗口",
    module: "debug",
    function: "moveDebugWindow"
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
    route: "filesystem-read-file-content",
    comment: "读取文件内容",
    module: "filesystem",
    function: "readFileContent"
  },
  {
    route: "filesystem-read-file-as-base64",
    comment: "读取文件内容为Base64",
    module: "filesystem",
    function: "readFileAsBase64"
  },
  {
    route: "filesystem-write-file-content",
    comment: "写入文件内容",
    module: "filesystem",
    function: "writeFileContent"
  },
  {
    route: "filesystem-write-file-from-base64",
    comment: "从Base64写入文件",
    module: "filesystem",
    function: "writeFileFromBase64"
  },
  {
    route: "hotkey-register-global-hotkey",
    comment: "注册全局快捷键",
    module: "hotkey",
    function: "registerGlobalHotkey"
  },
  {
    route: "hotkey-unregister-global-hotkey",
    comment: "注销全局快捷键",
    module: "hotkey",
    function: "unregisterGlobalHotkey"
  },
  {
    route: "hotkey-unregister-all-global-hotkeys",
    comment: "注销所有全局快捷键",
    module: "hotkey",
    function: "unregisterAllGlobalHotkeys"
  },
  {
    route: "hotkey-is-global-hotkey-registered",
    comment: "检查快捷键是否已注册",
    module: "hotkey",
    function: "isGlobalHotkeyRegistered"
  },
  {
    route: "hotkey-get-all-registered-global-hotkeys",
    comment: "获取所有已注册的全局快捷键",
    module: "hotkey",
    function: "getAllRegisteredGlobalHotkeys"
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
    route: "plugin-get-plugins-directory",
    comment: "获取插件目录路径",
    module: "plugin",
    function: "getPluginsDirectory"
  },
  {
    route: "plugin-get-all-installed-plugins",
    comment: "获取所有已安装的插件（仅第三方插件）",
    module: "plugin",
    function: "getAllInstalledPlugins"
  },
  {
    route: "plugin-install-plugin-from-zip",
    comment: "安装插件zip文件",
    module: "plugin",
    function: "installPluginFromZip"
  },
  {
    route: "plugin-uninstall-plugin",
    comment: "卸载插件",
    module: "plugin",
    function: "uninstallPlugin"
  },
  {
    route: "plugin-zip-directory",
    comment: "将文件夹打包为zip文件",
    module: "plugin",
    function: "zipDirectory"
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
    comment: "最小化窗口 - 基于视图类别的智能控制",
    module: "window",
    function: "minimize"
  },
  {
    route: "window-maximize",
    comment: "最大化/还原窗口 - 基于视图类别的智能控制",
    module: "window",
    function: "maximize"
  },
  {
    route: "window-close",
    comment: "关闭窗口 - 基于视图类别的智能控制",
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
    route: "window-is-fullscreen",
    comment: "检查窗口是否全屏或最大化",
    module: "window",
    function: "isFullscreen"
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
    route: "window-adjust-height",
    comment: "动态调整窗口高度, 使用前端传递的高度直接设置窗口大小",
    module: "window",
    function: "adjustHeight"
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
    route: "window-show",
    comment: "显示主窗口, 通过ViewManager获取main-view的父窗口并显示",
    module: "window",
    function: "show"
  },
  {
    route: "window-hide",
    comment: "隐藏主窗口, 通过ViewManager获取main-view的父窗口并隐藏",
    module: "window",
    function: "hide"
  },
  {
    route: "window-get-u-i-constants",
    comment: "获取UI常量配置",
    module: "window",
    function: "getUIConstants"
  },
  {
    route: "window-show-new-view",
    comment: "显示视图（新架构）",
    module: "window",
    function: "showNewView"
  },
  {
    route: "window-hide-new-view",
    comment: "隐藏视图（新架构）",
    module: "window",
    function: "hideNewView"
  },
  {
    route: "window-remove-new-view",
    comment: "移除视图（新架构）",
    module: "window",
    function: "removeNewView"
  },
  {
    route: "window-switch-to-new-view",
    comment: "切换到视图（新架构）",
    module: "window",
    function: "switchToNewView"
  },
  {
    route: "window-detach-new-view",
    comment: "分离视图（新架构）",
    module: "window",
    function: "detachNewView"
  },
  {
    route: "window-reattach-new-view",
    comment: "重新附加视图（新架构）",
    module: "window",
    function: "reattachNewView"
  },
  {
    route: "window-get-active-new-view",
    comment: "获取活跃视图信息（新架构）",
    module: "window",
    function: "getActiveNewView"
  },
  {
    route: "window-get-all-new-views",
    comment: "获取所有视图信息（新架构）",
    module: "window",
    function: "getAllNewViews"
  },
  {
    route: "window-get-new-window-manager-metrics",
    comment: "获取窗口管理器性能指标（新架构）",
    module: "window",
    function: "getNewWindowManagerMetrics"
  },
  {
    route: "window-cleanup-new-background-views",
    comment: "清理后台视图（新架构）",
    module: "window",
    function: "cleanupNewBackgroundViews"
  },
  {
    route: "window-update-new-window-manager-config",
    comment: "更新窗口管理器配置（新架构）",
    module: "window",
    function: "updateNewWindowManagerConfig"
  },
  {
    route: "window-destroy-new-window-manager",
    comment: "销毁窗口管理器（新架构）",
    module: "window",
    function: "destroyNewWindowManager"
  },
  {
    route: "window-create-plugin-view",
    comment: "创建插件视图（新架构专用 - 懒加载架构）",
    module: "window",
    function: "createPluginView"
  },
  {
    route: "window-close-plugin-view",
    comment: "关闭插件视图（新架构专用）, 关闭所有不支持后台运行的插件视图",
    module: "window",
    function: "closePluginView"
  },
  {
    route: "window-create-settings-view",
    comment: "创建设置页面 WebContentsView",
    module: "window",
    function: "createSettingsView"
  },
  {
    route: "window-close-settings-view",
    comment: "关闭设置页面 WebContentsView",
    module: "window",
    function: "closeSettingsView"
  },
  {
    route: "window-get-current-view-info",
    comment: "获取当前WebContentsView的完整信息, 通过webContents查找对应的WebContentsViewInfo，并返回序列化后的信息",
    module: "window",
    function: "getCurrentViewInfo"
  }
];

// 路由键类型
export type IpcRouteKey = keyof AllIpcRouter;

// 获取路由参数类型
export type IpcRouteParams<T extends IpcRouteKey> = Parameters<AllIpcRouter[T]>;

// 获取路由返回类型
export type IpcRouteReturn<T extends IpcRouteKey> = ReturnType<AllIpcRouter[T]>;
