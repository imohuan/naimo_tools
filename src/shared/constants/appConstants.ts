/**
 * 应用常量配置
 * 统一管理应用级别的常量定义
 */

import type {
  ThemeType,
  LogLevel,
  SupportedLanguage,
  UIConstants,
  AnimationConfig,
  ShadowConfig,
  BackdropBlurConfig,
  StorageConfig
} from '../typings/constantTypes'

/** 主题类型 */
export const THEME_TYPES = {
  LIGHT: 'light',
  DARK: 'dark'
} as const

/** 日志级别 */
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
} as const

/** 支持的语言 */
export const SUPPORTED_LANGUAGES = {
  ZH_CN: 'zh-CN',
  EN_US: 'en-US'
} as const

/** UI 常量 */
export const UI_CONSTANTS: UIConstants = {
  /** 头部高度 */
  HEADER_HEIGHT: 50,
  /** 最大高度 */
  MAX_HEIGHT: 420,
  /** 内边距 */
  PADDING: 8,
  /** 窗口宽度 */
  WINDOW_WIDTH: 800,
  /** 最小窗口宽度 */
  MIN_WINDOW_WIDTH: 400,
  /** 最大窗口宽度 */
  MAX_WINDOW_WIDTH: 3840,
  /** 最小窗口高度 */
  MIN_WINDOW_HEIGHT: 50,
  /** 最大窗口高度 */
  MAX_WINDOW_HEIGHT: 2160,
  /** 窗口圆角半径 */
  BORDER_RADIUS: 12,
  /** 设置背景内边距 */
  SETTINGS_BG_PADDING: 8
}

/** 动画配置 */
export const ANIMATION_CONFIG: AnimationConfig = {
  /** 默认动画时长 */
  DURATION: 300,
  /** 默认缓动函数 */
  EASING: 'ease-in-out'
}

/** 阴影配置 */
export const SHADOW_CONFIG: ShadowConfig = {
  /** 阴影模糊度 */
  BLUR: 24,
  /** 阴影扩散 */
  SPREAD: 2,
  /** 阴影颜色 */
  COLOR: '#000000',
  /** 阴影透明度 */
  OPACITY: 0.15
}

/** 背景模糊配置 */
export const BACKDROP_BLUR_CONFIG: BackdropBlurConfig = {
  /** 默认模糊程度 */
  AMOUNT: 'sm'
}

/** 存储配置 */
export const STORAGE_CONFIG: StorageConfig = {
  /** 配置文件名 */
  CONFIG_NAME: 'app-config',
  /** 清理无效配置 */
  CLEAR_INVALID: true
}

/** 默认配置值 */
export const DEFAULT_VALUES = {
  THEME: THEME_TYPES.LIGHT,
  LANGUAGE: SUPPORTED_LANGUAGES.ZH_CN,
  WINDOW_WIDTH: UI_CONSTANTS.WINDOW_WIDTH,
  WINDOW_HEIGHT: 600,
  LOG_LEVEL_PROD: LOG_LEVELS.INFO,
  LOG_LEVEL_DEV: LOG_LEVELS.DEBUG
} as const


/** 是否打开开发者工具 */
export const OPEN_DEVTOOLS = false

// 类型定义已移至 ../typings/constantTypes.ts
