import mitt from 'mitt'

// 定义事件类型
export interface AppEvents {
  // 窗口焦点相关事件
  'window:focus': void
  'window:blur': void
  'window:visibility-change': void

  // 搜索相关事件
  'search:focus-requested': void
  'search:clear': void

  // 插件相关事件
  'plugin:executed': {
    pluginId: string
    path: string
    hotkeyEmit: boolean
  }

  // 窗口管理事件
  'window:close-requested': void
  'window:show-hide-requested': void
  'window:resize': {
    height: number
  }

  // 设置相关事件
  'settings:open': void
  'settings:close': void

  // 文件相关事件
  'file:drop': {
    files: FileList
  }
  'file:paste': {
    files: File[]
  }
  'file:clear': void

  // 全局快捷键事件（来自主进程）
  'global-hotkey-trigger': {
    detail: any
  }
}

// 创建全局事件发射器
const emitter = mitt<Record<string, any>>()

// 全局事件系统 API
export const eventSystem = {
  // 监听事件
  on: <K extends keyof AppEvents>(
    type: K,
    handler: (event: AppEvents[K]) => void
  ) => {
    emitter.on(type, handler)
  },

  // 取消监听事件
  off: <K extends keyof AppEvents>(
    type: K,
    handler: (event: AppEvents[K]) => void
  ) => {
    emitter.off(type, handler)
  },

  // 触发事件
  emit: <K extends keyof AppEvents>(
    type: K,
    event: AppEvents[K]
  ) => {
    emitter.emit(type, event)
  },

  // 一次性监听事件
  once: <K extends keyof AppEvents>(
    type: K,
    handler: (event: AppEvents[K]) => void
  ) => {
    const onceHandler = (event: AppEvents[K]) => {
      handler(event)
      emitter.off(type, onceHandler)
    }
    emitter.on(type, onceHandler)
  },

  // 清除所有监听器
  clear: () => {
    emitter.all.clear()
  }
}

// 导出类型，方便其他文件使用
export type AppEventType = keyof AppEvents
export type AppEventHandler<T extends AppEventType> = (event: AppEvents[T]) => void

// 默认导出事件系统
export default eventSystem
