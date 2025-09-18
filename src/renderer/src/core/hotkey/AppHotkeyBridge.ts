import type { HotkeyConfig, HotkeyTriggeredEventDetail } from '@/typings/hotkey-types'
import { BaseSingleton } from '../BaseSingleton'
import hotkeys from 'hotkeys-js'

/**
 * 应用内快捷键桥接层
 * 处理应用内快捷键的注册和管理
 */
export class AppHotkeyBridge extends BaseSingleton {
  private registeredHotkeys = new Map<string, HotkeyConfig>()

  constructor() {
    super()
    hotkeys.filter = () => true;
  }

  /**
   * 注册应用内快捷键
   */
  async registerAppHotkey(config: HotkeyConfig): Promise<boolean> {

    try {
      const { id, keys } = config

      // 检查是否已注册
      if (this.registeredHotkeys.has(id)) {
        console.warn(`⌨️ 应用内快捷键 ${id} 已注册`)
        return false
      }

      // 标准化快捷键格式
      const normalizedKeys = this.normalizeAppKeys(keys)

      // 创建回调函数
      const callback = (event: KeyboardEvent) => {
        console.log(`⌨️ 触发应用内快捷键: ${id} -> ${keys}`)

        // 处理阻止默认行为
        if (config.preventDefault) {
          event.preventDefault()
        }

        // 处理阻止事件冒泡
        if (config.stopPropagation) {
          event.stopPropagation()
        }

        // 触发快捷键回调
        this.triggerHotkeyCallback(config, event)
      }

      // 注册快捷键
      hotkeys(normalizedKeys, config.scope || 'all', callback)

      this.registeredHotkeys.set(id, config)
      console.log(`⌨️ 注册应用内快捷键成功: ${id} -> ${normalizedKeys}`)
      return true
    } catch (error) {
      console.error('⌨️ 注册应用内快捷键失败:', error)
      return false
    }
  }

  /**
   * 注销应用内快捷键
   */
  async unregisterAppHotkey(id: string): Promise<boolean> {

    try {
      const config = this.registeredHotkeys.get(id)
      if (!config) {
        console.warn(`⌨️ 应用内快捷键 ${id} 未注册`)
        return false
      }

      const normalizedKeys = this.normalizeAppKeys(config.keys)

      // 注销快捷键
      hotkeys.unbind(normalizedKeys, config.scope || 'all')

      this.registeredHotkeys.delete(id)
      console.log(`⌨️ 注销应用内快捷键成功: ${id}`)
      return true
    } catch (error) {
      console.error('⌨️ 注销应用内快捷键失败:', error)
      return false
    }
  }

  /**
   * 检查应用内快捷键是否已注册
   */
  isAppHotkeyRegistered(keys: string): boolean {
    const normalizedKeys = this.normalizeAppKeys(keys)
    return Array.from(this.registeredHotkeys.values()).some(config =>
      this.normalizeAppKeys(config.keys) === normalizedKeys
    )
  }

  /**
   * 获取所有已注册的应用内快捷键
   */
  getAllRegisteredHotkeys(): HotkeyConfig[] {
    return Array.from(this.registeredHotkeys.values())
  }

  /**
   * 清除所有应用内快捷键
   */
  async clearAllAppHotkeys(): Promise<boolean> {

    try {
      // 注销所有快捷键
      for (const [, config] of this.registeredHotkeys) {
        const normalizedKeys = this.normalizeAppKeys(config.keys)
        hotkeys.unbind(normalizedKeys, config.scope || 'all')
      }

      this.registeredHotkeys.clear()
      console.log('⌨️ 清除所有应用内快捷键成功')
      return true
    } catch (error) {
      console.error('⌨️ 清除所有应用内快捷键失败:', error)
      return false
    }
  }

  /**
   * 标准化应用内快捷键格式
   */
  private normalizeAppKeys(keys: string): string {
    // 将快捷键格式转换为hotkeys-js格式
    return keys
      .toLowerCase()
      .replace(/ctrl/g, 'ctrl')
      .replace(/cmd/g, 'cmd')
      .replace(/alt/g, 'alt')
      .replace(/shift/g, 'shift')
      .replace(/meta/g, 'cmd')
      .replace(/super/g, 'cmd')
      .replace(/win/g, 'cmd')
      .replace(/\+/g, '+')
  }

  /**
   * 触发快捷键回调
   */
  private triggerHotkeyCallback(config: HotkeyConfig, event: KeyboardEvent): void {
    // 创建符合类型定义的事件详情
    const eventDetail: HotkeyTriggeredEventDetail = {
      id: config.id,
      keys: config.keys,
      config,
      originalEvent: event
    }

    // 触发自定义事件
    const customEvent = new CustomEvent<HotkeyTriggeredEventDetail>('app-hotkey-triggered', {
      detail: eventDetail
    })

    window.dispatchEvent(customEvent)
    console.log(`⌨️ 触发应用内快捷键事件: ${config.id} -> ${config.keys}`)
  }

  /**
   * 设置快捷键作用域
   */
  setScope(scope: string): void {
    hotkeys.setScope(scope)
    console.log(`⌨️ 设置快捷键作用域: ${scope}`)
  }

  /**
   * 获取当前作用域
   */
  getScope(): string {
    return hotkeys.getScope()
  }
}

// 导出单例实例
export const appHotkeyBridge = AppHotkeyBridge.getInstance()
