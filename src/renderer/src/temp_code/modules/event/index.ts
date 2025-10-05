import mitt from 'mitt'
import type { AppEvents, AppEventType, AppEventHandler } from '@/temp_code/typings/event'

/**
 * 应用事件管理器
 * 
 * 核心职责：
 * - 统一管理所有应用事件
 * - 提供类型安全的事件监听和触发
 * - 集成快捷键事件和其他应用事件
 * 
 * 使用方式：
 * ```ts
 * import { appEventManager } from '@/temp_code/modules/event'
 * 
 * // 监听事件
 * appEventManager.on('hotkey:triggered', (event) => {
 *   console.log('快捷键触发:', event.id)
 * })
 * 
 * // 触发事件
 * appEventManager.emit('search:clear')
 * 
 * // 一次性监听
 * appEventManager.once('window:close-requested', () => {
 *   console.log('窗口关闭请求')
 * })
 * ```
 */
class AppEventManager {
  private emitter = mitt<Record<string, any>>()

  /**
   * 监听事件
   * 
   * @param type 事件类型
   * @param handler 事件处理函数
   * @example
   * ```ts
   * appEventManager.on('hotkey:triggered', (event) => {
   *   console.log('快捷键触发:', event.id, event.config)
   * })
   * ```
   */
  on<K extends AppEventType>(
    type: K,
    handler: AppEventHandler<K>
  ): void {
    this.emitter.on(type, handler)
  }

  /**
   * 取消监听事件
   * 
   * @param type 事件类型
   * @param handler 事件处理函数
   * @example
   * ```ts
   * appEventManager.off('hotkey:triggered', handler)
   * ```
   */
  off<K extends AppEventType>(
    type: K,
    handler: AppEventHandler<K>
  ): void {
    this.emitter.off(type, handler)
  }

  /**
   * 触发事件
   * 
   * @param type 事件类型
   * @param event 事件数据
   * @example
   * ```ts
   * appEventManager.emit('hotkey:triggered', {
   *   id: 'app_focus_search',
   *   config: hotkeyConfig,
   *   type: 'application'
   * })
   * ```
   */
  emit<K extends AppEventType>(
    type: K,
    event: AppEvents[K]
  ): void {
    this.emitter.emit(type, event)
  }

  /**
   * 一次性监听事件
   * 
   * @param type 事件类型
   * @param handler 事件处理函数
   * @example
   * ```ts
   * appEventManager.once('window:close-requested', () => {
   *   console.log('窗口关闭请求，只触发一次')
   * })
   * ```
   */
  once<K extends AppEventType>(
    type: K,
    handler: AppEventHandler<K>
  ): void {
    const onceHandler = (event: AppEvents[K]) => {
      handler(event)
      this.emitter.off(type, onceHandler)
    }
    this.emitter.on(type, onceHandler)
  }

  /**
   * 清除所有事件监听器
   * 
   * @example
   * ```ts
   * appEventManager.clear()
   * ```
   */
  clear(): void {
    this.emitter.all.clear()
  }
}

// 导出单例实例
export const appEventManager = new AppEventManager()
