/**
 * IPC 事件配置文件
 * 定义主进程与渲染进程之间的 IPC 通信事件类型和数据结构
 * 
 * 注意：此文件与 WindowManagerEventData 的区别：
 * - EventsConfig：用于 IPC 通信，主进程 ↔ 渲染进程，使用 kebab-case 命名
 * - WindowManagerEventData：用于主进程内部通信，使用 colon 命名
 * 
 * 此文件用于代码生成，不要手动修改生成的文件
 */

/** 事件配置接口 */
export interface EventsConfig {
  // 视图相关事件
  'view-detached': {
    detachedViewId: string
    sourceWindowId: number
    detachedWindowId: number
    timestamp: number
    remainingViews: string[]
  }

  'view-restore-requested': {
    viewId: string
    windowId: number
    reason: 'settings-closed' | 'plugin-closed' | 'user-requested' | 'system'
    timestamp: number
  }

  // 分离窗口控制栏事件
  'view-reattached': {
    sourceViewId: string
    sourceWindowId: number
    detachedWindowId: number
    config: {
      sourceUrl?: string
      windowTitle?: string
      [key: string]: any
    }
    timestamp: number
  }

  'detached-window-closed': {
    viewId: string
    detachedWindowId: number
    timestamp: number
  }


  // 插件相关事件
  'plugin-window-closed': {
    pluginId: string
    windowId: number
    viewId: string
    timestamp: number
  }

  'plugin-view-opened': {
    pluginId: string
    viewId: string
    windowId: number
    timestamp: number
  }

  'plugin-view-closed': {
    pluginId: string
    viewId: string
    windowId: number
    timestamp: number
  }

  'plugin-installed': {
    pluginId: string
    timestamp: number
  }

  'plugin-uninstalled': {
    pluginId: string
    timestamp: number
  }

  // 快捷键相关事件
  'hotkey-updated': {
    hotkeyId: string
    name?: string
    keys: string
    enabled: boolean
    type: 'global' | 'application'
    timestamp: number
  }

  // 窗口相关事件
  'window-all-blur': {
    timestamp: number
    windowIds: number[]
  }

  'window-main-hide': {
    timestamp: number
    windowId: number
  }

  'window-main-show': {
    timestamp: number
    windowId: number
  }


  // 全局快捷键事件
  'global-hotkey-trigger': {
    hotkeyId: string
    timestamp: number
  }


  // 屏幕截图相关事件
  'screen-info': {
    displays: any[]
    primaryDisplay: any
    timestamp: number
  }

  // 应用相关事件
  'app-blur': {
    timestamp: number
  }

  'app-focus': {
    timestamp: number
  }

  // 系统事件
  'system-theme-changed': {
    theme: 'light' | 'dark' | 'system'
    timestamp: number
  }

  // 开发者事件
  'dev-reload': {
    reason: string
    timestamp: number
  }
}

/** 事件类型 */
export type EventType = keyof EventsConfig

/** 事件数据类型 */
export type EventData<T extends EventType> = EventsConfig[T]

/** 事件处理器类型 */
export type EventHandler<T extends EventType> = (
  event: Electron.IpcRendererEvent,
  data: EventData<T>
) => void
