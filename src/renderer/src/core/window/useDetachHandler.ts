/**
 * 分离处理器的 Vue 组合式函数
 * 提供在 Vue 组件中使用分离功能的便捷方式
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { detachHandler, type DetachResult } from './DetachHandler'
import type { DetachedWindowConfig } from '@/typings/window-types'
import { eventSystem } from '@/utils/event-system'

/** 分离处理器选项 */
export interface UseDetachHandlerOptions {
  /** 是否自动初始化 */
  autoInit?: boolean
  /** 是否启用调试日志 */
  debug?: boolean
}

/** 分离处理器返回值 */
export interface UseDetachHandlerReturn {
  /** 响应式状态 */
  state: {
    /** 是否已初始化 */
    isInitialized: Ref<boolean>
    /** 当前活跃的插件视图 */
    currentPluginView: ComputedRef<{
      viewId?: string
      pluginPath?: string
      pluginName?: string
    }>
    /** 是否可以分离当前视图 */
    canDetach: ComputedRef<boolean>
    /** 分离操作是否正在进行 */
    isDetaching: Ref<boolean>
  }

  /** 操作方法 */
  actions: {
    /** 初始化分离处理器 */
    initialize: () => Promise<void>
    /** 分离当前视图 */
    detachCurrentView: () => Promise<DetachResult>
    /** 分离指定视图 */
    detachView: (viewId: string, config?: Partial<DetachedWindowConfig>) => Promise<DetachResult>
    /** 重新附加窗口 */
    reattachWindow: (windowId: number) => Promise<{ success: boolean; error?: string }>
    /** 更新当前插件视图 */
    updateCurrentPluginView: (viewId: string, pluginPath?: string, pluginName?: string) => void
    /** 清除当前插件视图 */
    clearCurrentPluginView: () => void
    /** 销毁分离处理器 */
    destroy: () => Promise<void>
  }

  /** 事件监听 */
  events: {
    /** 监听分离成功事件 */
    onDetachSuccess: (callback: (result: DetachResult) => void) => () => void
    /** 监听分离失败事件 */
    onDetachError: (callback: (error: string) => void) => () => void
    /** 监听窗口关闭事件 */
    onWindowClosed: (callback: (data: { windowId: number; viewId?: string }) => void) => () => void
  }
}

/**
 * 分离处理器组合式函数
 */
export function useDetachHandler(options: UseDetachHandlerOptions = {}): UseDetachHandlerReturn {
  const { autoInit = true, debug = false } = options

  // 响应式状态
  const isInitialized = ref(false)
  const isDetaching = ref(false)
  const currentViewInfo = ref<{
    viewId?: string
    pluginPath?: string
    pluginName?: string
  }>({})

  // 计算属性
  const currentPluginView = computed(() => currentViewInfo.value)
  const canDetach = computed(() => !!currentViewInfo.value.viewId)

  // 初始化分离处理器
  const initialize = async (): Promise<void> => {
    try {
      if (debug) console.log('🔧 正在初始化分离处理器...')

      await detachHandler.initialize()
      isInitialized.value = true

      // 同步当前视图信息
      currentViewInfo.value = detachHandler.getCurrentPluginView()

      if (debug) console.log('✅ 分离处理器初始化成功')
    } catch (error) {
      console.error('❌ 分离处理器初始化失败:', error)
      throw error
    }
  }

  // 分离当前视图
  const detachCurrentView = async (): Promise<DetachResult> => {
    if (!canDetach.value) {
      return {
        success: false,
        error: '没有可分离的视图'
      }
    }

    try {
      isDetaching.value = true
      if (debug) console.log('🔄 正在分离当前视图...')

      const result = await detachHandler.detachView(currentViewInfo.value.viewId!)

      if (debug) {
        if (result.success) {
          console.log('✅ 视图分离成功:', result.detachedWindowId)
        } else {
          console.error('❌ 视图分离失败:', result.error)
        }
      }

      return result
    } catch (error) {
      console.error('❌ 分离当前视图时发生错误:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    } finally {
      isDetaching.value = false
    }
  }

  // 分离指定视图
  const detachView = async (
    viewId: string,
    config?: Partial<DetachedWindowConfig>
  ): Promise<DetachResult> => {
    try {
      isDetaching.value = true
      if (debug) console.log('🔄 正在分离指定视图:', viewId)

      const result = await detachHandler.detachView(viewId, config)

      if (debug) {
        if (result.success) {
          console.log('✅ 指定视图分离成功:', result.detachedWindowId)
        } else {
          console.error('❌ 指定视图分离失败:', result.error)
        }
      }

      return result
    } catch (error) {
      console.error('❌ 分离指定视图时发生错误:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    } finally {
      isDetaching.value = false
    }
  }

  // 重新附加窗口
  const reattachWindow = async (windowId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      if (debug) console.log('🔄 正在重新附加窗口:', windowId)

      const result = await detachHandler.reattachWindow(windowId)

      if (debug) {
        if (result.success) {
          console.log('✅ 窗口重新附加成功')
        } else {
          console.error('❌ 窗口重新附加失败:', result.error)
        }
      }

      return result
    } catch (error) {
      console.error('❌ 重新附加窗口时发生错误:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  // 更新当前插件视图
  const updateCurrentPluginView = (viewId: string, pluginPath?: string, pluginName?: string): void => {
    currentViewInfo.value = { viewId, pluginPath, pluginName }
    detachHandler.updateCurrentPluginView(viewId, pluginPath, pluginName)

    if (debug) console.log('🔄 当前插件视图已更新:', currentViewInfo.value)
  }

  // 清除当前插件视图
  const clearCurrentPluginView = (): void => {
    currentViewInfo.value = {}
    detachHandler.clearCurrentPluginView()

    if (debug) console.log('🧹 当前插件视图信息已清除')
  }

  // 销毁分离处理器
  const destroy = async (): Promise<void> => {
    try {
      await detachHandler.destroy()
      isInitialized.value = false
      clearCurrentPluginView()

      if (debug) console.log('🗑️ 分离处理器已销毁')
    } catch (error) {
      console.error('❌ 销毁分离处理器时发生错误:', error)
    }
  }

  // 事件监听方法
  const onDetachSuccess = (callback: (result: DetachResult) => void) => {
    const handler = (event: any) => {
      if (event.success) {
        callback(event)
      }
    }
    eventSystem.on('window:detached', handler)
    return () => eventSystem.off('window:detached', handler)
  }

  const onDetachError = (callback: (error: string) => void) => {
    const handler = (event: any) => {
      if (!event.success && event.error) {
        callback(event.error)
      }
    }
    eventSystem.on('window:detached', handler)
    return () => eventSystem.off('window:detached', handler)
  }

  const onWindowClosed = (callback: (data: { windowId: number; viewId?: string }) => void) => {
    const handler = callback
    eventSystem.on('window:detached:closed', handler)
    return () => eventSystem.off('window:detached:closed', handler)
  }

  // 设置内部事件监听器
  const setupInternalListeners = (): void => {
    // 监听插件视图变化
    eventSystem.on('plugin:view:active', (data) => {
      updateCurrentPluginView(data.viewId, data.pluginPath, data.pluginName)
    })

    eventSystem.on('plugin:view:closed', (data) => {
      if (data.viewId === currentViewInfo.value.viewId) {
        clearCurrentPluginView()
      }
    })
  }

  // 生命周期处理
  onMounted(async () => {
    setupInternalListeners()

    if (autoInit) {
      try {
        await initialize()
      } catch (error) {
        console.error('❌ 自动初始化分离处理器失败:', error)
      }
    }
  })

  onUnmounted(async () => {
    // 注意：这里不调用 destroy()，因为 detachHandler 是单例
    // 只清除本组件的状态
    clearCurrentPluginView()
  })

  return {
    state: {
      isInitialized,
      currentPluginView,
      canDetach,
      isDetaching
    },
    actions: {
      initialize,
      detachCurrentView,
      detachView,
      reattachWindow,
      updateCurrentPluginView,
      clearCurrentPluginView,
      destroy
    },
    events: {
      onDetachSuccess,
      onDetachError,
      onWindowClosed
    }
  }
}

/**
 * 创建分离处理器的便捷函数
 * 用于在非Vue环境中快速创建分离处理器实例
 */
export function createDetachHandler(options: UseDetachHandlerOptions = {}) {
  const handler = useDetachHandler(options)

  // 立即初始化（如果启用了自动初始化）
  if (options.autoInit !== false) {
    handler.actions.initialize().catch(console.error)
  }

  return handler
}

/**
 * 获取全局分离处理器实例
 */
export function getGlobalDetachHandler() {
  return detachHandler
}
