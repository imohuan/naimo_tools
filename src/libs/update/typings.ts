/**
 * 应用自动更新配置模块类型定义
 */

import { Event } from 'electron';

// ==================== 类型定义 ====================

/**
 * 更新源类型枚举
 */
export enum UpdateSourceType {
  /** Electron 官方更新服务 */
  ElectronPublicUpdateService,
  /** 静态存储服务 */
  StaticStorage,
}

/**
 * Electron 官方更新服务配置
 */
export interface IElectronUpdateServiceSource {
  type: UpdateSourceType.ElectronPublicUpdateService;
  /**
   * GitHub 仓库地址，格式为 `owner/repo`
   * 默认从 package.json 的 repository 字段获取
   */
  repo?: string;
  /**
   * 更新服务器的基础 HTTPS URL
   * 默认为 `https://update.electronjs.org`
   */
  host?: string;
}

/**
 * 静态存储更新源配置
 */
export interface IStaticUpdateSource {
  type: UpdateSourceType.StaticStorage;
  /**
   * 静态存储提供商的基础 URL，用于存储更新文件
   */
  baseUrl: string;
}

/**
 * 更新源联合类型
 */
export type IUpdateSource = IElectronUpdateServiceSource | IStaticUpdateSource;

/**
 * 更新信息接口
 */
export interface IUpdateInfo {
  /** 更新事件对象 */
  event: Event;
  /** 发布说明 */
  releaseNotes: string;
  /** 发布名称 */
  releaseName: string;
  /** 发布日期 */
  releaseDate: Date;
  /** 更新下载链接 */
  updateURL: string;
}

/**
 * 更新对话框文本配置
 */
export interface IUpdateDialogStrings {
  /**
   * 对话框标题
   * 默认为 `Application Update`
   */
  title?: string;
  /**
   * 对话框详细内容
   * 默认为 `A new version has been downloaded. Restart the application to apply the updates.`
   */
  detail?: string;
  /**
   * 重启按钮文本
   * 默认为 `Restart`
   */
  restartButtonText?: string;
  /**
   * 稍后按钮文本
   * 默认为 `Later`
   */
  laterButtonText?: string;
}

/**
 * 日志记录器接口
 */
export interface ILogger {
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

/**
 * 更新配置选项
 */
export interface IUpdateElectronAppOptions {
  /**
   * GitHub 仓库地址，格式为 `owner/repo`
   * 默认从 package.json 的 repository 字段获取
   * @deprecated 请使用 updateSource 选项
   */
  readonly repo?: string;
  /**
   * 更新服务器地址
   * 默认为 `https://update.electronjs.org`
   * @deprecated 请使用 updateSource 选项
   */
  readonly host?: string;
  /** 更新源配置 */
  readonly updateSource?: IUpdateSource;
  /**
   * 检查更新的频率
   * 默认为 `10 minutes`，最小间隔为 `5 minutes`
   */
  readonly updateInterval?: string;
  /**
   * 是否通知用户
   * 默认为 `true`，启用后会在下载完成后提示用户立即应用更新
   */
  readonly notifyUser?: boolean;
  /**
   * 自定义用户通知回调函数
   * 当 'update-downloaded' 事件触发时调用，仅在 notifyUser 为 true 时运行
   * @param info 更新相关信息
   */
  readonly onNotifyUser?: (info: IUpdateInfo) => void;
  /**
   * 日志记录器
   * 用于记录更新过程中的日志信息
   */
  readonly logger?: ILogger;
}
