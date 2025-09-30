/**
 * 应用生命周期管理组合式函数
 * 负责应用的初始化、配置加载、事件监听等生命周期管理
 */

import { ref, onMounted } from 'vue'
import { useEventListener } from '@vueuse/core'
import { DEFAULT_WINDOW_LAYOUT } from '@shared/config/windowLayoutConfig'
import { useHotkeyManager } from '@/modules/hotkeys/hooks/useHotkeyManager'
import { usePluginStore } from '@/store'
import type { HotkeyEventListener } from '@/typings/hotkeyTypes'

/**
 * UI常量配置接口
 */
interface UIConstants {
  headerHeight: number
  padding: number
}

/**
 * 应用生命周期管理
 */
export function useAppLifecycle() {
  const pluginStore = usePluginStore()
  const { initializeHotkeys, addHotKeyListener } = useHotkeyManager()

  // UI 配置管理
  const uiConstants = ref<UIConstants>({
    headerHeight: DEFAULT_WINDOW_LAYOUT.searchHeaderHeight,
    padding: DEFAULT_WINDOW_LAYOUT.appPadding
  })

  /**
   * 从主进程获取UI常量配置
   */
  const loadUIConstants = async (): Promise<UIConstants> => {
    try {
      const config = await naimo.router.windowGetUIConstants()
      if (config) {
        uiConstants.value = config
        console.log('✅ UI常量配置加载成功:', config)
        return config
      }
      console.warn('⚠️ 未获取到UI常量配置，使用默认值')
      return uiConstants.value
    } catch (error) {
      console.warn('❌ 获取UI常量配置失败，使用默认值:', error)
      return uiConstants.value
    }
  }

  /**
   * 注册窗口事件监听器
   */
  const registerWindowEventListeners = (handlers: {
    onWindowFocus: () => void
    onWindowBlur: (event?: any) => void
    onVisibilityChange: () => void
  }) => {
    // 使用 naimo.event API 监听应用焦点事件
    naimo.event.onAppFocus((event, data) => {
      handlers.onWindowFocus()
    })

    naimo.event.onAppBlur((event, data) => {
      handlers.onWindowBlur(data)
    })

    // 页面可见性变化仍使用 DOM 事件，因为这是浏览器标准 API
    useEventListener(document, "visibilitychange", handlers.onVisibilityChange)
  }

  /**
   * 注册主进程事件监听器
   */
  const registerMainProcessEventListeners = (handlers: {
    onPluginWindowClosed: (data: any) => void
    onWindowMainHide: (data: any) => void
    onWindowMainShow: (data: any) => void
    onViewDetached: (data: any) => void
    onViewRestoreRequested: (data: any) => void
    onViewReattached: (data: any) => void
    onViewEscPressed: (data: any) => void
  }) => {
    naimo.event.onPluginWindowClosed((event, data) => {
      console.log("收到主进程插件窗口关闭消息:", data)
      handlers.onPluginWindowClosed(data)
    })

    naimo.event.onWindowMainHide((event, data) => {
      console.log("收到窗口隐藏事件:", data)
      handlers.onWindowMainHide(data)
    })

    naimo.event.onWindowMainShow((event, data) => {
      console.log("收到窗口显示事件:", data)
      handlers.onWindowMainShow(data)
    })

    naimo.event.onViewDetached((event, data) => {
      console.log("收到视图分离事件，恢复搜索状态:", data)
      handlers.onViewDetached(data)
    })

    naimo.event.onViewRestoreRequested((event, data) => {
      console.log("收到视图恢复请求:", data)
      handlers.onViewRestoreRequested(data)
    })

    naimo.event.onViewReattached((event, data) => {
      console.log("收到视图重新附加事件:", data)
      handlers.onViewReattached(data)
    })

    naimo.event.onViewEscPressed((event, data) => {
      console.log("收到视图esc事件:", data)
      handlers.onViewEscPressed(data)
    })
  }

  /**
   * 注册快捷键事件监听器
   */
  const registerHotkeyEventListeners = (handler: HotkeyEventListener) => {
    addHotKeyListener('hotkey-triggered', handler)
    addHotKeyListener('app-hotkey-triggered', handler)
  }

  /**
   * 应用初始化序列
   */
  const initializeApp = async (handlers: {
    // 窗口事件处理器
    onWindowFocus: () => void
    onWindowBlur: (event?: any) => void
    onVisibilityChange: () => void

    // 主进程事件处理器
    onPluginWindowClosed: (data: any) => void
    onWindowMainHide: (data: any) => void
    onWindowMainShow: (data: any) => void
    onViewDetached: (data: any) => void
    onViewRestoreRequested: (data: any) => void
    onViewEscPressed: (data: any) => void

    // 视图重新附加事件处理器
    onViewReattached: (data: any) => void

    // 快捷键事件处理器
    onHotkeyTriggered: HotkeyEventListener

    // 初始化完成回调
    onInitComplete?: () => void

  }) => {
    console.log("🚀 开始应用初始化")

    try {
      // 1. 加载UI常量配置
      await loadUIConstants()

      // 2. 初始化快捷键（优先执行，确保全局快捷键可用）
      await initializeHotkeys()

      // 3. 初始化插件
      await pluginStore.initialize()

      // 4. 注册所有事件监听器
      registerWindowEventListeners({
        onWindowFocus: handlers.onWindowFocus,
        onWindowBlur: handlers.onWindowBlur,
        onVisibilityChange: handlers.onVisibilityChange
      })

      registerMainProcessEventListeners({
        onPluginWindowClosed: handlers.onPluginWindowClosed,
        onWindowMainHide: handlers.onWindowMainHide,
        onWindowMainShow: handlers.onWindowMainShow,
        onViewDetached: handlers.onViewDetached,
        onViewRestoreRequested: handlers.onViewRestoreRequested,
        onViewReattached: handlers.onViewReattached,
        onViewEscPressed: handlers.onViewEscPressed
      })

      registerHotkeyEventListeners(handlers.onHotkeyTriggered)

      // 5. 初始化完成回调
      handlers.onInitComplete?.()

      console.log("🎉 应用初始化完成")
    } catch (error) {
      console.error("❌ 应用初始化失败:", error)
      throw error
    }
  }

  return {
    // 状态
    uiConstants,

    // 方法
    loadUIConstants,
    initializeApp,
    registerWindowEventListeners,
    registerMainProcessEventListeners,
    registerHotkeyEventListeners
  }
}
