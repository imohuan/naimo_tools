/**
 * 常量相关类型定义
 * 统一管理所有常量的类型声明
 */

/** 主题类型 */
export type ThemeType = 'light' | 'dark'

/** 日志级别类型 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

/** 支持的语言类型 */
export type SupportedLanguage = 'zh-CN' | 'en-US'

/** 窗口类型 */
export type WindowType = 'main' | 'detached'

/** 视图类型 */
export type ViewType = 'main' | 'settings' | 'plugin' | 'web-page'

/** 生命周期策略类型 */
export type LifecycleStrategy = 'persistent' | 'on-demand' | 'background-capable'

/** 窗口布局配置接口 */
export interface WindowLayoutConfig {
  /** 搜索框/窗口宽度 */
  windowWidth: number
  /** 搜索框高度 */
  searchHeaderHeight: number
  /** 内容区域最大高度 */
  contentMaxHeight: number
  /** 应用内边距 */
  appPadding: number
  /** 设置界面背景容器内边距 */
  settingsBackgroundPadding: number
  /** 窗口圆角半径 */
  windowBorderRadius: number
  /** 窗口阴影配置 */
  windowShadow: {
    enabled: boolean
    blur: number
    spread: number
    color: string
    opacity: number
  }
  /** 背景模糊效果 */
  backdropBlur: {
    enabled: boolean
    amount: string
  }
  /** 动画配置 */
  animation: {
    duration: number
    easing: string
  }
}

/** 阴影配置接口 */
export interface ShadowConfig {
  /** 阴影模糊度 */
  BLUR: number
  /** 阴影扩散 */
  SPREAD: number
  /** 阴影颜色 */
  COLOR: string
  /** 阴影透明度 */
  OPACITY: number
}

/** 动画配置接口 */
export interface AnimationConfig {
  /** 动画时长 */
  DURATION: number
  /** 缓动函数 */
  EASING: string
}

/** 背景模糊配置接口 */
export interface BackdropBlurConfig {
  /** 模糊程度 */
  AMOUNT: string
}

/** UI常量接口 */
export interface UIConstants {
  /** 头部高度 */
  HEADER_HEIGHT: number
  /** 最大高度 */
  MAX_HEIGHT: number
  /** 内边距 */
  PADDING: number
  /** 窗口宽度 */
  WINDOW_WIDTH: number
  /** 最小窗口宽度 */
  MIN_WINDOW_WIDTH: number
  /** 最大窗口宽度 */
  MAX_WINDOW_WIDTH: number
  /** 最小窗口高度 */
  MIN_WINDOW_HEIGHT: number
  /** 最大窗口高度 */
  MAX_WINDOW_HEIGHT: number
  /** 窗口圆角半径 */
  BORDER_RADIUS: number
  /** 设置背景内边距 */
  SETTINGS_BG_PADDING: number
}

/** 存储配置接口 */
export interface StorageConfig {
  /** 配置文件名 */
  CONFIG_NAME: string
  /** 清理无效配置 */
  CLEAR_INVALID: boolean
}

/** 窗口预设配置接口 */
export interface WindowPresetConfig {
  width: number
  height: number
  minWidth: number
  minHeight: number
  resizable: boolean
  frame: boolean
  transparent: boolean
  alwaysOnTop: boolean
}
