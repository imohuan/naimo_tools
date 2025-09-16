import { onUnmounted } from 'vue'
import { eventSystem, type AppEvents, type AppEventType, type AppEventHandler } from '@/utils/event-system'

/**
 * 使用全局事件系统的组合式函数
 * 提供类型安全的事件监听和触发功能
 */
export function useEventSystem() {
  const listeners: Array<{ type: AppEventType; handler: AppEventHandler<any> }> = []

  /**
   * 监听事件
   */
  const on = <K extends AppEventType>(
    type: K,
    handler: AppEventHandler<K>
  ) => {
    eventSystem.on(type, handler)
    listeners.push({ type, handler })
  }

  /**
   * 取消监听事件
   */
  const off = <K extends AppEventType>(
    type: K,
    handler: AppEventHandler<K>
  ) => {
    eventSystem.off(type, handler)
    const index = listeners.findIndex(
      l => l.type === type && l.handler === handler
    )
    if (index > -1) {
      listeners.splice(index, 1)
    }
  }

  /**
   * 触发事件
   */
  const emit = <K extends AppEventType>(
    type: K,
    event: AppEvents[K]
  ) => {
    eventSystem.emit(type, event)
  }

  /**
   * 一次性监听事件
   */
  const once = <K extends AppEventType>(
    type: K,
    handler: AppEventHandler<K>
  ) => {
    eventSystem.once(type, handler)
  }

  /**
   * 清除所有监听器
   */
  const clear = () => {
    listeners.forEach(({ type, handler }) => {
      eventSystem.off(type, handler)
    })
    listeners.length = 0
  }

  // 组件卸载时自动清理监听器
  onUnmounted(() => {
    clear()
  })

  return {
    on,
    off,
    emit,
    once,
    clear
  }
}

/**
 * 专门用于监听特定事件的组合式函数
 * 提供更简洁的 API
 */
export function useEventListener<K extends AppEventType>(
  type: K,
  handler: AppEventHandler<K>
) {
  const { on, off } = useEventSystem()

  on(type, handler)

  return () => off(type, handler)
}

/**
 * 专门用于触发事件的组合式函数
 */
export function useEventEmitter() {
  const { emit } = useEventSystem()
  return { emit }
}
