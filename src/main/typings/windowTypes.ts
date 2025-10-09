/**
 * 主进程窗口管理类型定义
 * 为 BaseWindow 和 WebContentsView 架构提供主进程类型安全
 */

import { BaseWindow, WebContentsView } from 'electron'
import type { ViewType, LifecycleStrategy, Rectangle } from '@renderer/src/typings/windowTypes'
export type { DetachedWindowConfig } from '@renderer/src/typings/windowTypes'

/** 窗口类型 */
export enum WindowType {
  /** 主窗口 - 基于 BaseWindow + WebContentsView */
  MAIN = 'main',
  /** 分离窗口 - 基于 BaseWindow + WebContentsView */
  DETACHED = 'detached'
}

/** 视图类别 - 用于区分不同类型的视图和控制行为 */
export enum ViewCategory {
  /** 主窗口视图 - 禁止窗口控制操作 */
  MAIN_WINDOW = 'main-window',
  /** 分离窗口视图 - 允许窗口控制操作 */
  DETACHED_WINDOW = 'detached-window'
}

/** BaseWindow 配置 */
export interface BaseWindowConfig {
  /** 窗口边界 */
  bounds: Rectangle
  /** 窗口标题 */
  title?: string
  /** 是否可调整大小 */
  resizable?: boolean
  /** 是否显示边框 */
  frame?: boolean
  /** 是否置顶 */
  alwaysOnTop?: boolean
  /** 是否透明 */
  transparent?: boolean
  /** 背景颜色 */
  backgroundColor?: string
  /** 是否在任务栏显示 */
  skipTaskbar?: boolean
  /** 是否有阴影 */
  hasShadow?: boolean
  /** Web 首选项 */
  webPreferences?: {
    nodeIntegration?: boolean
    contextIsolation?: boolean
    webSecurity?: boolean
    preload?: string
  }
}

/** WebContentsView 配置 */
export interface WebContentsViewConfig {
  /** 视图唯一标识 */
  id: string
  /** 视图类型 */
  type: ViewType
  /** 视图类别 - 用于控制行为判断 */
  category: ViewCategory
  /** 要加载的 URL */
  url?: string
  /** 文件路径 */
  filePath?: string
  /** 视图边界 */
  bounds: Rectangle
  /** 生命周期策略 */
  lifecycle: LifecycleStrategy
  /** 是否不立即添加到窗口（静默创建，延迟显示） */
  noSwitch?: boolean
  /** Web 首选项 */
  webPreferences?: {
    nodeIntegration?: boolean
    contextIsolation?: boolean
    webSecurity?: boolean
    preload?: string
    additionalArguments?: string[]
    // 移除 sandbox 配置
  }
  /** 插件相关元数据 */
  pluginMetadata?: {
    fullPath?: string  // 格式: "pluginId:path"
    name?: string
    version?: string
    [key: string]: any
  }
}

/** 窗口信息 */
export interface WindowInfo {
  /** 窗口ID */
  id: number
  /** BaseWindow 实例 */
  window: BaseWindow
  /** 窗口类型 */
  type: WindowType
  /** 窗口标题 */
  title?: string
  /** 创建时间 */
  createdAt: Date
  /** 最后访问时间 */
  lastAccessed: Date
  /** 额外元数据 */
  metadata?: Record<string, any>
  /** 关联的 WebContentsView 集合 */
  views: Map<string, WebContentsViewInfo>
  /** 当前活跃的视图ID */
  activeViewId?: string
}

/** WebContentsView 信息 */
export interface WebContentsViewInfo {
  /** 视图唯一标识 */
  id: string
  /** WebContentsView 实例 */
  view: WebContentsView
  /** 视图配置 */
  config: WebContentsViewConfig
  /** 视图状态 */
  state: {
    /** 是否可见 */
    isVisible: boolean
    /** 是否活跃 */
    isActive: boolean
    /** 最后访问时间 */
    lastAccessTime: number
    /** 内存使用量（字节） */
    memoryUsage?: number
  }
  /** 创建时间 */
  createdAt: Date
  /** 父窗口ID */
  parentWindowId: number
}

/** 视图操作结果 */
export interface ViewOperationResult {
  /** 操作是否成功 */
  success: boolean
  /** 错误消息（如果失败） */
  error?: string
  /** 视图ID */
  viewId?: string
  /** 窗口ID */
  windowId?: number
  /** 额外数据 */
  data?: any
}

/** 窗口操作结果 */
export interface WindowOperationResult {
  /** 操作是否成功 */
  success: boolean
  /** 错误消息（如果失败） */
  error?: string
  /** 窗口ID */
  windowId?: number
  /** 额外数据 */
  data?: any
}

/** 主窗口布局配置 */
export interface MainWindowLayoutConfig {
  /** 总窗口大小 */
  totalBounds: Rectangle
  /** 搜索头部高度 */
  headerHeight: number
  /** 内容区域边界 */
  contentBounds: Rectangle
  /** 内边距 */
  padding: number
}

/** 分离窗口元数据 */
export interface DetachedWindowMetadata {
  /** 源视图ID */
  sourceViewId: string
  /** 源窗口ID */
  sourceWindowId: number
  /** 分离时间 */
  detachedAt: Date
  /** 是否显示控制栏 */
  showControlBar: boolean
  /** 插件信息 */
  pluginInfo?: {
    fullPath: string  // 格式: "pluginId:path"
    name: string
    version?: string
  }
  /** 原始配置 */
  originalConfig: WebContentsViewConfig
}

/** 
 * 主进程内部事件数据
 * 用于窗口管理器内部 EventEmitter 通信
 * 注意：这些事件与 IPC 事件（EventsConfig）是不同的系统
 * - 内部事件：主进程内部组件通信，使用 colon 命名（view:detached）
 * - IPC 事件：主进程与渲染进程通信，使用 kebab-case 命名（view-detached）
 */
export interface WindowManagerEventData {
  /** 窗口创建事件 */
  'window:created': {
    windowId: number
    type: WindowType
  }
  /** 窗口关闭事件 */
  'window:closed': {
    windowId: number
    type: WindowType
  }
  /** 视图创建事件 */
  'view:created': {
    viewId: string
    parentWindowId: number
    config: WebContentsViewConfig
  }
  /** 视图移除事件 */
  'view:removed': {
    viewId: string
    parentWindowId: number
  }
  /** 视图切换事件 */
  'view:switched': {
    parentWindowId: number
    fromViewId?: string
    toViewId: string
  }
  /** 视图分离失败事件 */
  'view:detach-failed': {
    viewId: string
    parentWindowId: number
    error?: string
    timestamp: number
  }
  /** 视图分离错误事件 */
  'view:detach-error': {
    viewId: string
    parentWindowId: number
    error: string
    timestamp: number
  }
  /** 视图关闭事件 */
  'view:closed': {
    viewId: string
    parentWindowId: number
    timestamp: number
  }
  /** 视图父窗口更新事件 */
  'view:parent-window-updated': {
    viewId: string
    oldParentWindowId: number
    newParentWindowId: number
    timestamp: number
  }
  /** 内存清理事件 */
  'memory:cleanup': {
    cleanedViews: string[]
    freedMemory: number
  }
}

/** BaseWindow 工厂配置 */
export interface BaseWindowFactoryConfig {
  /** 默认配置 */
  defaultConfig: Partial<BaseWindowConfig>
  /** 是否启用开发者工具 */
  enableDevTools?: boolean
  /** 是否启用日志 */
  enableLogging?: boolean
  /** 最大窗口数量限制 */
  maxWindows?: number
}

/** WebContentsView 工厂配置 */
export interface WebContentsViewFactoryConfig {
  /** 默认配置 */
  defaultConfig: Partial<WebContentsViewConfig>
  /** 默认预加载脚本 */
  defaultPreload?: string
  /** 是否启用沙箱 */
  enableSandbox?: boolean
  /** 最大视图数量限制 */
  maxViews?: number
  /** 内存阈值（MB） */
  memoryThreshold?: number
}

/** 隐藏窗口的位置缓存 */
export interface HiddenWindowPosition {
  /** 隐藏前的 X 坐标 */
  x: number
  /** 隐藏前的 Y 坐标 */
  y: number
}

/** 性能监控数据 */
export interface WindowPerformanceMetrics {
  /** 窗口ID */
  windowId: number
  /** 视图数量 */
  viewCount: number
  /** 总内存使用（MB） */
  memoryUsage: number
  /** CPU 使用率（%） */
  cpuUsage: number
  /** 活跃视图数量 */
  activeViewCount: number
  /** 最后更新时间 */
  lastUpdated: Date
}

/** 清理策略配置 */
export interface CleanupStrategyConfig {
  /** 自动清理间隔（毫秒） */
  autoCleanupInterval: number
  /** 内存阈值（MB） */
  memoryThreshold: number
  /** 最大空闲时间（毫秒） */
  maxIdleTime: number
  /** 保留的最小视图数量 */
  minRetainedViews: number
  /** 是否启用强制清理 */
  enableForceCleanup: boolean
}

/** 错误报告 */
export interface WindowManagerErrorReport {
  /** 错误ID */
  id: string
  /** 错误类型 */
  type: 'WINDOW_CREATION_FAILED' | 'VIEW_CREATION_FAILED' | 'VIEW_SWITCH_FAILED' | 'MEMORY_INSUFFICIENT' | 'UNKNOWN'
  /** 错误消息 */
  message: string
  /** 错误堆栈 */
  stack?: string
  /** 相关窗口ID */
  windowId?: number
  /** 相关视图ID */
  viewId?: string
  /** 发生时间 */
  timestamp: Date
  /** 用户操作上下文 */
  context?: Record<string, any>
}

/** 窗口管理器全局配置 */
export interface WindowManagerGlobalConfig {
  /** 是否启用开发者工具 */
  enableDevTools: boolean
  /** 是否启用详细日志 */
  enableVerboseLogging: boolean
  /** 最大窗口数量限制 */
  maxWindows: number
  /** 最大视图数量限制 */
  maxViewsPerWindow: number
  /** 内存清理阈值（MB） */
  memoryCleanupThreshold: number
  /** 自动清理间隔（毫秒） */
  autoCleanupInterval: number
}
