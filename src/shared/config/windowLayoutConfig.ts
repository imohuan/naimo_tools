/**
 * 窗口布局统一配置文件
 * 用于管理所有窗口相关的尺寸、布局和样式配置
 * 主进程和渲染进程都可以直接引入使用
 */

export interface WindowLayoutConfig {
  /** 搜索框/窗口宽度 */
  windowWidth: number
  /** 搜索框高度 */
  searchHeaderHeight: number
  /** 内容区域最大高度（设置模式和窗口模式都使用此高度） */
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
  /** 分离窗口配置 */
  detachedWindow: {
    /** 控制栏高度 */
    controlBarHeight: number
    /** 分离窗口内边距 */
    padding: number
    /** 分离窗口圆角半径 */
    borderRadius: number
  }
}

/**
 * 默认窗口布局配置
 */
export const DEFAULT_WINDOW_LAYOUT: WindowLayoutConfig = {
  // 基础尺寸配置
  windowWidth: 800,
  searchHeaderHeight: 50,
  contentMaxHeight: 420, // 设置模式和窗口模式都使用此高度

  // 间距配置
  appPadding: 8,
  settingsBackgroundPadding: 8,

  // 视觉效果配置
  windowBorderRadius: 12,
  windowShadow: {
    enabled: true,
    blur: 24,
    spread: 2,
    color: '#000000',
    opacity: 0.15
  },
  backdropBlur: {
    enabled: true,
    amount: 'sm'
  },

  // 动画配置
  animation: {
    duration: 300,
    easing: 'ease-in-out'
  },

  // 分离窗口配置
  detachedWindow: {
    controlBarHeight: 50,
    padding: 8,
    borderRadius: 12
  }
}

/**
 * 计算设置视图的边界
 */
export function calculateSettingsViewBounds(windowBounds: { width: number; height: number }) {
  const config = DEFAULT_WINDOW_LAYOUT
  const totalPadding = config.settingsBackgroundPadding + config.appPadding

  return {
    x: totalPadding,
    y: config.searchHeaderHeight + totalPadding,
    width: windowBounds.width - totalPadding * 2,
    height: windowBounds.height - config.searchHeaderHeight - totalPadding * 2
  }
}

/**
 * 计算主视图的边界（设置模式下占满整个窗口）
 */
export function calculateMainViewBounds(windowBounds: { width: number; height: number }, isSettingsMode = false) {
  const config = DEFAULT_WINDOW_LAYOUT

  if (isSettingsMode) {
    // 设置模式：主视图占满整个窗口作为背景
    return {
      x: 0,
      y: 0,
      width: windowBounds.width,
      height: windowBounds.height
    }
  } else {
    // 正常模式：主视图只占顶部搜索区域
    return {
      x: 0,
      y: 0,
      width: windowBounds.width,
      height: config.searchHeaderHeight
    }
  }
}

/**
 * 计算窗口总高度
 */
export function calculateWindowHeight(contentHeight: number, isSettingsMode = false) {
  const config = DEFAULT_WINDOW_LAYOUT

  if (isSettingsMode) {
    // 设置模式：使用contentMaxHeight + 头部高度 + padding
    return config.contentMaxHeight + config.searchHeaderHeight + config.appPadding * 2
  } else {
    // 正常模式：根据实际内容高度计算
    return contentHeight + config.searchHeaderHeight + config.appPadding * 2
  }
}

/**
 * 计算分离窗口控制栏视图边界
 * 控制栏视图包含 DetachedWindowApp.vue，它渲染整个窗口框架（包括padding、圆角、控制栏）
 * 所以这个视图需要占满整个窗口
 */
export function calculateDetachedControlBarBounds(windowBounds: { width: number; height: number }) {
  return {
    x: 0,
    y: 0,
    width: windowBounds.width,
    height: windowBounds.height
  }
}

/**
 * 计算分离窗口内容视图边界（带padding，在控制栏下方）
 * 
 * 布局说明：
 * - appPadding (8px): DetachedWindowApp.vue 的外层 padding，用于显示边框和阴影
 * - detachedWindow.padding (8px): 内容区域的额外 padding
 * - 总 padding = appPadding + detachedWindow.padding
 * - 全屏/最大化时：不使用 appPadding，让内容铺满屏幕
 * 
 * @param windowBounds 窗口边界
 * @param isMaximized 是否最大化或全屏
 */
export function calculateDetachedContentBounds(
  windowBounds: { width: number; height: number },
  isMaximized: boolean = false
) {
  const config = DEFAULT_WINDOW_LAYOUT
  const appPadding = isMaximized ? 0 : config.appPadding // 全屏时不使用外层 padding
  const contentPadding = config.detachedWindow.padding // 内容区域额外的 padding
  const controlBarHeight = config.detachedWindow.controlBarHeight

  // 总 padding = app padding + content padding
  const totalPadding = appPadding + contentPadding

  return {
    x: totalPadding,
    y: controlBarHeight + totalPadding,
    width: Math.max(windowBounds.width - totalPadding * 2, 0),
    height: Math.max(windowBounds.height - controlBarHeight - totalPadding * 2, 0)
  }
}

/**
 * 获取CSS变量对象（用于渲染进程）
 */
export function getLayoutCSSVariables() {
  const config = DEFAULT_WINDOW_LAYOUT

  return {
    '--window-width': `${config.windowWidth}px`,
    '--search-header-height': `${config.searchHeaderHeight}px`,
    '--content-max-height': `${config.contentMaxHeight}px`,
    '--app-padding': `${config.appPadding}px`,
    '--settings-bg-padding': `${config.settingsBackgroundPadding}px`,
    '--window-border-radius': `${config.windowBorderRadius}px`,
    '--animation-duration': `${config.animation.duration}ms`,
    '--animation-easing': config.animation.easing,
    '--backdrop-blur': config.backdropBlur.enabled ? config.backdropBlur.amount : 'none',
    '--detached-control-bar-height': `${config.detachedWindow.controlBarHeight}px`,
    '--detached-padding': `${config.detachedWindow.padding}px`,
    '--detached-border-radius': `${config.detachedWindow.borderRadius}px`
  }
}
