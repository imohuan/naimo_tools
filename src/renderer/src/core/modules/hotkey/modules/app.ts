import hotkeys from 'hotkeys-js'
import type { HotkeyConfig } from '@/core/typings/hotkey'
import { normalizeAppKeys, triggerHotkeyEvent } from '@/core/utils/hotkey'

/**
 * 应用内快捷键模块
 * 
 * 职责：
 * - 与 hotkeys-js 库交互，注册/注销应用内快捷键
 * - 不维护独立的快捷键数据（数据由父 store 统一管理）
 * - 管理快捷键作用域（scope）
 */
export class AppModule {
  constructor() {
    // 设置 hotkeys-js 的 filter - 允许在所有元素中触发
    hotkeys.filter = () => true
  }

  /**
   * 注册应用内快捷键
   */
  register(config: HotkeyConfig): boolean {
    try {
      // 标准化快捷键格式为 hotkeys-js 格式
      const normalizedKeys = normalizeAppKeys(config.keys)
      const scope = config.scope || 'all'
      console.log(`[AppHotkey] 注册应用内快捷键: ${config.id} -> ${normalizedKeys} [${scope}]`)

      // 创建回调函数
      const callback = (event: KeyboardEvent) => {
        // 阻止默认行为
        if (config.preventDefault) {
          event.preventDefault()
        }
        // 阻止事件传播
        if (config.stopPropagation) {
          event.stopPropagation()
        }
        console.log(`[AppHotkey] 快捷键触发: ${config.id}`)

        // 如果配置中有回调函数，执行它
        if (config.callback) {
          config.callback(event)
        }
        // 触发自定义事件（供其他组件监听）
        triggerHotkeyEvent(config)
      }

      // 使用 hotkeys-js 注册
      hotkeys(normalizedKeys, scope, callback)
      console.log(`[AppHotkey] ✅ 注册成功: ${config.id}`)
      return true
    } catch (error) {
      console.error(`[AppHotkey] 注册异常: ${config.id}`, error)
      return false
    }
  }

  /**
   * 注销应用内快捷键
   */
  unregister(config: HotkeyConfig): boolean {
    try {
      const normalizedKeys = normalizeAppKeys(config.keys)
      const scope = config.scope || 'all'
      console.log(`[AppHotkey] 注销应用内快捷键: ${config.id} -> ${normalizedKeys} [${scope}]`)
      hotkeys.unbind(normalizedKeys, scope)
      console.log(`[AppHotkey] ✅ 注销成功: ${config.id}`)
      return true
    } catch (error) {
      console.error(`[AppHotkey] 注销异常: ${config.id}`, error)
      return false
    }
  }

  /**
   * 批量注册应用内快捷键
   */
  batchRegister(configs: HotkeyConfig[]): number {
    let successCount = 0

    for (const config of configs) {
      const success = this.register(config)
      if (success) successCount++
    }

    return successCount
  }

  /**
   * 批量注销应用内快捷键
   */
  batchUnregister(configs: HotkeyConfig[]): number {
    let successCount = 0

    for (const config of configs) {
      const success = this.unregister(config)
      if (success) successCount++
    }

    return successCount
  }

  /**
   * 设置快捷键作用域
   * 可以动态切换快捷键的激活范围
   */
  setScope(scope: string): void {
    console.log(`[AppHotkey] 切换作用域: ${scope}`)
    hotkeys.setScope(scope)
  }

  /**
   * 获取当前快捷键作用域
   */
  getScope(): string {
    return hotkeys.getScope()
  }

  /**
   * 删除指定作用域
   */
  deleteScope(scope: string): void {
    console.log(`[AppHotkey] 删除作用域: ${scope}`)
    hotkeys.deleteScope(scope)
  }

  /**
   * 注销所有应用内快捷键
   */
  unregisterAll(): void {
    console.log('[AppHotkey] 注销所有应用内快捷键')
    hotkeys.unbind()
  }

  /**
   * 检查指定快捷键是否已按下
   */
  isPressed(keys: string): boolean {
    const normalizedKeys = normalizeAppKeys(keys)
    return hotkeys.isPressed(normalizedKeys)
  }
}

