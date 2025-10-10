/**
 * 窗口管理核心类型定义
 * 为新的 BaseWindow 和 WebContentsView 架构提供类型安全
 */

import type { PluginItem } from './pluginTypes'

/** 视图类型枚举 */
export enum ViewType {
  /** 主界面 */
  MAIN = 'main',
  /** 设置界面 */
  SETTINGS = 'settings',
  /** 插件界面 */
  PLUGIN = 'plugin'
}

/** 生命周期策略类型 */
export enum LifecycleType {
  /** 前台模式：关闭时销毁 */
  FOREGROUND = 'foreground',
  /** 后台模式：关闭时隐藏，支持后台运行 */
  BACKGROUND = 'background'
}

/** 矩形边界 */
export interface Rectangle {
  /** X 坐标 */
  x: number
  /** Y 坐标 */
  y: number
  /** 宽度 */
  width: number
  /** 高度 */
  height: number
}

/** 生命周期策略配置 */
export interface LifecycleStrategy {
  /** 策略类型：前台或后台 */
  type: LifecycleType
  /** 关闭时是否保持（用于后台模式） */
  persistOnClose: boolean
  /** 最大空闲时间（毫秒），超过后可能被回收 */
  maxIdleTime?: number
  /** 内存阈值（MB），超过后优先回收 */
  memoryThreshold?: number
}

/** 视图配置 */
export interface ViewConfig {
  /** 视图唯一标识 */
  id: string
  /** 视图类型 */
  type: ViewType
  /** 插件路径（用于插件类型的唯一标识） */
  path?: string
  /** 要加载的 URL */
  url?: string
  /** 视图边界 */
  bounds: Rectangle
  /** 生命周期策略 */
  lifecycle: LifecycleStrategy
  /** 预加载脚本路径 */
  preload?: string
  /** Web 安全设置 */
  webSecurity?: boolean
  /** 其他元数据 */
  metadata?: Record<string, any>
}

/** 视图状态 */
export interface ViewState {
  /** 视图唯一标识 */
  id: string
  /** 视图类型 */
  type: ViewType
  /** 是否为当前活跃视图 */
  isActive: boolean
  /** 是否可见 */
  isVisible: boolean
  /** 是否已分离到独立窗口 */
  isDetached: boolean
  /** 最后访问时间 */
  lastAccessTime: number
  /** 内存使用量（MB） */
  memoryUsage?: number
  /** 生命周期策略 */
  lifecycle: LifecycleStrategy
  /** 关联的插件信息（如果是插件视图） */
  pluginItem?: PluginItem
}

/** 分离窗口配置 */
export interface DetachedWindowConfig {
  /** 窗口标题 */
  title: string
  /** 窗口边界 */
  bounds: Rectangle
  /** 源视图ID */
  sourceViewId: string
  /** 是否显示控制栏 */
  showControlBar: boolean
  /** 父窗口ID（可选） */
  parentWindowId?: number
  /** 插件元数据（如果是插件窗口） */
  metadata?: {
    /** 插件ID */
    pluginId?: string
    /** 插件路径 */
    path?: string
    /** 插件名称 */
    name?: string
    /** 其他元数据 */
    [key: string]: any
  }
}

/** 主窗口布局配置 */
export interface MainWindowLayout {
  /** 搜索头部高度 */
  headerHeight: number
  /** 内容区域边界 */
  contentBounds: Rectangle
  /** 整个窗口边界 */
  totalBounds: Rectangle
  /** 内边距 */
  padding: number
}

/** 窗口管理器配置 */
export interface WindowManagerConfig {
  /** 主窗口布局 */
  layout: MainWindowLayout
  /** 默认生命周期策略 */
  defaultLifecycle: LifecycleStrategy
  /** 最大同时活跃视图数 */
  maxActiveViews?: number
  /** 内存回收阈值（MB） */
  memoryRecycleThreshold?: number
  /** 自动回收间隔（毫秒） */
  autoRecycleInterval?: number
}

/** 视图管理器事件 */
export interface ViewManagerEvents {
  /** 视图创建 */
  'view:created': { viewId: string; config: ViewConfig }
  /** 视图显示 */
  'view:shown': { viewId: string }
  /** 视图隐藏 */
  'view:hidden': { viewId: string }
  /** 视图移除 */
  'view:removed': { viewId: string }
  /** 视图切换 */
  'view:switched': { fromViewId?: string; toViewId: string }
  /** 内存回收 */
  'memory:recycled': { recycledViews: string[] }
}

/** 窗口管理错误类型 */
export enum WindowManagerErrorType {
  /** 视图创建失败 */
  VIEW_CREATION_FAILED = 'VIEW_CREATION_FAILED',
  /** 视图切换失败 */
  VIEW_SWITCH_FAILED = 'VIEW_SWITCH_FAILED',
  /** 窗口分离失败 */
  WINDOW_DETACH_FAILED = 'WINDOW_DETACH_FAILED',
  /** 内存不足 */
  MEMORY_INSUFFICIENT = 'MEMORY_INSUFFICIENT',
  /** 插件加载失败 */
  PLUGIN_LOAD_FAILED = 'PLUGIN_LOAD_FAILED'
}

/** 窗口管理错误 */
export interface WindowManagerError {
  /** 错误类型 */
  type: WindowManagerErrorType
  /** 错误消息 */
  message: string
  /** 错误详情 */
  details?: any
  /** 相关视图ID */
  viewId?: string
  /** 时间戳 */
  timestamp: number
}

/** 性能监控数据 */
export interface PerformanceMetrics {
  /** 视图切换耗时（毫秒） */
  switchTime: number
  /** 内存使用量（MB） */
  memoryUsage: number
  /** 活跃视图数量 */
  activeViewCount: number
  /** CPU 使用率（百分比） */
  cpuUsage?: number
  /** 最后更新时间 */
  lastUpdated: number
}

/** 分离窗口控制栏操作 */
export enum DetachedWindowAction {
  /** 最小化 */
  MINIMIZE = 'minimize',
  /** 最大化/还原 */
  MAXIMIZE = 'maximize',
  /** 关闭 */
  CLOSE = 'close',
  /** 重新附加到主窗口 */
  REATTACH = 'reattach'
}

/** 分离窗口控制栏事件 */
export interface DetachedWindowControlEvent {
  /** 操作类型 */
  action: DetachedWindowAction
  /** 窗口ID */
  windowId: number
  /** 视图ID */
  viewId: string
  /** 时间戳 */
  timestamp: number
}
