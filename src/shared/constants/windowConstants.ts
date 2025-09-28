/**
 * 窗口相关常量配置
 * 统一管理窗口布局、尺寸等常量
 */

import {
  UI_CONSTANTS,
  ANIMATION_CONFIG,
  SHADOW_CONFIG,
  BACKDROP_BLUR_CONFIG
} from './appConstants'

import type {
  WindowType,
  ViewType,
  LifecycleStrategy,
  WindowLayoutConfig,
  WindowPresetConfig
} from '../typings/constantTypes'

/** 窗口类型 */
export const WINDOW_TYPES = {
  MAIN: 'main' as WindowType,
  DETACHED: 'detached' as WindowType
}

/** 视图类型 */
export const VIEW_TYPES = {
  MAIN: 'main' as ViewType,
  SETTINGS: 'settings' as ViewType,
  PLUGIN: 'plugin' as ViewType,
  WEB_PAGE: 'web-page' as ViewType
}

/** 生命周期策略 */
export const LIFECYCLE_STRATEGIES = {
  PERSISTENT: 'persistent' as LifecycleStrategy,
  ON_DEMAND: 'on-demand' as LifecycleStrategy,
  BACKGROUND_CAPABLE: 'background-capable' as LifecycleStrategy
}

// 窗口布局配置接口已移至 ../typings/constantTypes.ts

/** 默认窗口布局配置 */
export const DEFAULT_WINDOW_LAYOUT: WindowLayoutConfig = {
  windowWidth: UI_CONSTANTS.WINDOW_WIDTH,
  searchHeaderHeight: UI_CONSTANTS.HEADER_HEIGHT,
  contentMaxHeight: UI_CONSTANTS.MAX_HEIGHT,
  appPadding: UI_CONSTANTS.PADDING,
  settingsBackgroundPadding: UI_CONSTANTS.SETTINGS_BG_PADDING,
  windowBorderRadius: UI_CONSTANTS.BORDER_RADIUS,
  windowShadow: {
    enabled: true,
    blur: SHADOW_CONFIG.BLUR,
    spread: SHADOW_CONFIG.SPREAD,
    color: SHADOW_CONFIG.COLOR,
    opacity: SHADOW_CONFIG.OPACITY
  },
  backdropBlur: {
    enabled: true,
    amount: BACKDROP_BLUR_CONFIG.AMOUNT
  },
  animation: {
    duration: ANIMATION_CONFIG.DURATION,
    easing: ANIMATION_CONFIG.EASING
  }
}

/** 窗口配置预设 */
export const WINDOW_PRESETS: Record<string, WindowPresetConfig> = {
  /** 主窗口配置 */
  MAIN_WINDOW: {
    width: UI_CONSTANTS.WINDOW_WIDTH,
    height: 600,
    minWidth: UI_CONSTANTS.MIN_WINDOW_WIDTH,
    minHeight: UI_CONSTANTS.MIN_WINDOW_HEIGHT,
    resizable: true,
    frame: false,
    transparent: true,
    alwaysOnTop: false
  },
  /** 分离窗口配置 */
  DETACHED_WINDOW: {
    width: 1000,
    height: 700,
    minWidth: 400,
    minHeight: 300,
    resizable: true,
    frame: true,
    transparent: false,
    alwaysOnTop: false
  }
}

// 类型定义已移至 ../typings/constantTypes.ts
