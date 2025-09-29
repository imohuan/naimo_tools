
import { ref, computed, readonly } from 'vue'

/**
 * 窗口尺寸接口
 */
export interface WindowSize {
  /** 窗口宽度，-1表示不改变 */
  width?: number
  /** 窗口高度，-1表示不改变 */
  height: number
}

/**
 * 窗口位置接口
 */
export interface WindowPosition {
  /** X坐标 */
  x: number
  /** Y坐标 */
  y: number
}

/**
 * 窗口状态接口
 */
export interface WindowState {
  /** 是否可见 */
  visible: boolean
  /** 是否最小化 */
  minimized: boolean
  /** 是否最大化 */
  maximized: boolean
  /** 是否全屏 */
  fullscreen: boolean
}

/**
 * 窗口管理器配置选项
 */
export interface WindowManagerOptions {
  /** 是否启用窗口状态跟踪 */
  enableStateTracking?: boolean
  /** 默认窗口尺寸 */
  defaultSize?: WindowSize
  /** 最小窗口尺寸 */
  minSize?: WindowSize
  /** 最大窗口尺寸 */
  maxSize?: WindowSize
}

/**
 * 窗口管理组合式函数
 * 提供完整的窗口管理功能
 */
export function useWindowManager(options: WindowManagerOptions = {}) {
  const {
    enableStateTracking = false,
    defaultSize,
    minSize,
    maxSize
  } = options

  // 窗口状态跟踪
  const windowState = ref<WindowState>({
    visible: false,
    minimized: false,
    maximized: false,
    fullscreen: false
  })

  // 当前窗口尺寸
  const currentSize = ref<WindowSize>({ width: -1, height: -1 })

  // 当前窗口位置
  const currentPosition = ref<WindowPosition>({ x: 0, y: 0 })

  /**
   * 验证窗口尺寸
   */
  const validateSize = (size: Partial<WindowSize>): Partial<WindowSize> => {
    const validatedSize = { ...size }

    // 检查最小尺寸
    if (minSize) {
      if (validatedSize.width && validatedSize.width < minSize.width!) {
        validatedSize.width = minSize.width
      }
      if (validatedSize.height && validatedSize.height < minSize.height) {
        validatedSize.height = minSize.height
      }
    }

    // 检查最大尺寸
    if (maxSize) {
      if (validatedSize.width && validatedSize.width > maxSize.width!) {
        validatedSize.width = maxSize.width
      }
      if (validatedSize.height && validatedSize.height > maxSize.height) {
        validatedSize.height = maxSize.height
      }
    }

    return validatedSize
  }

  /**
   * 设置窗口大小
   */
  const setSize = async (options: Partial<WindowSize> = {}): Promise<boolean> => {
    try {
      const validatedSize = validateSize(options)
      const width = validatedSize.width ?? -1
      const height = validatedSize.height ?? -1

      const success = await naimo.router.windowSetSize(width, height)

      if (success && enableStateTracking) {
        if (width !== -1) currentSize.value.width = width
        if (height !== -1) currentSize.value.height = height
      }

      return success
    } catch (error) {
      console.error('设置窗口大小失败:', error)
      return false
    }
  }

  /**
   * 设置窗口位置
   */
  const setPosition = async (position: WindowPosition): Promise<boolean> => {
    try {
      const success = await naimo.router.windowSetPosition?.(position.x, position.y)

      if (success && enableStateTracking) {
        currentPosition.value = { ...position }
      }

      return success ?? false
    } catch (error) {
      console.error('设置窗口位置失败:', error)
      return false
    }
  }

  /**
   * 检查窗口是否可见
   */
  const isWindowVisible = async (): Promise<boolean> => {
    try {
      const currentViewInfo = await naimo.router.windowGetCurrentViewInfo()
      if (!currentViewInfo) return false

      const visible = await naimo.router.windowIsWindowVisible()

      if (enableStateTracking) {
        windowState.value.visible = visible
      }

      return visible
    } catch (error) {
      console.error('检查窗口可见性失败:', error)
      return false
    }
  }

  /**
   * 显示窗口
   */
  const show = async (): Promise<boolean> => {
    try {
      const success = await naimo.router.windowShow()

      if (success && enableStateTracking) {
        windowState.value.visible = true
      } else if (!success) {
        console.warn('显示窗口失败')
      }

      return success
    } catch (error) {
      console.error('显示窗口失败:', error)
      return false
    }
  }

  /**
   * 隐藏窗口
   */
  const hide = async (): Promise<boolean> => {
    try {
      const success = await naimo.router.windowHide()

      if (success && enableStateTracking) {
        windowState.value.visible = false
      } else if (!success) {
        console.warn('隐藏窗口失败')
      }

      return success
    } catch (error) {
      console.error('隐藏窗口失败:', error)
      return false
    }
  }

  /**
   * 最小化窗口
   */
  const minimize = async (): Promise<boolean> => {
    try {
      const success = await naimo.router.windowMinimize?.()

      if (success && enableStateTracking) {
        windowState.value.minimized = true
      }

      return success ?? false
    } catch (error) {
      console.error('最小化窗口失败:', error)
      return false
    }
  }

  /**
   * 最大化窗口
   */
  const maximize = async (): Promise<boolean> => {
    try {
      const success = await naimo.router.windowMaximize?.()

      if (success && enableStateTracking) {
        windowState.value.maximized = true
      }

      return success ?? false
    } catch (error) {
      console.error('最大化窗口失败:', error)
      return false
    }
  }

  /**
   * 还原窗口
   */
  const restore = async (): Promise<boolean> => {
    try {
      const success = await naimo.router.windowRestore?.()

      if (success && enableStateTracking) {
        windowState.value.minimized = false
        windowState.value.maximized = false
      }

      return success ?? false
    } catch (error) {
      console.error('还原窗口失败:', error)
      return false
    }
  }

  /**
   * 切换窗口显示状态
   */
  const toggle = async (): Promise<boolean> => {
    const visible = await isWindowVisible()
    return visible ? await hide() : await show()
  }

  /**
   * 重置窗口到默认状态
   */
  const resetToDefault = async (): Promise<boolean> => {
    if (!defaultSize) return false

    try {
      await restore()
      return await setSize(defaultSize)
    } catch (error) {
      console.error('重置窗口到默认状态失败:', error)
      return false
    }
  }

  /**
   * 刷新窗口状态
   */
  const refreshState = async () => {
    if (!enableStateTracking) return

    try {
      windowState.value.visible = await isWindowVisible()
      // 这里可以添加更多状态检查
    } catch (error) {
      console.error('刷新窗口状态失败:', error)
    }
  }

  // 计算属性
  const isVisible = computed(() => windowState.value.visible)
  const isMinimized = computed(() => windowState.value.minimized)
  const isMaximized = computed(() => windowState.value.maximized)
  const isFullscreen = computed(() => windowState.value.fullscreen)

  return {
    // 只读状态
    windowState: readonly(windowState),
    currentSize: readonly(currentSize),
    currentPosition: readonly(currentPosition),

    // 计算属性
    isVisible,
    isMinimized,
    isMaximized,
    isFullscreen,

    // 基础操作
    setSize,
    setPosition,
    show,
    hide,
    toggle,
    isWindowVisible,

    // 高级操作
    minimize,
    maximize,
    restore,
    resetToDefault,
    refreshState,

    // 工具方法
    validateSize,

    // 配置信息
    options: readonly({
      enableStateTracking,
      defaultSize,
      minSize,
      maxSize
    })
  }
}
