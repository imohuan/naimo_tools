import type { HotkeyConfig, HotkeyTriggeredEventDetail } from '@/typings/hotkey-types'
import { BaseSingleton } from '../BaseSingleton'

/**
 * Electron快捷键桥接层
 * 专门处理与Electron主进程的通信，注册全局快捷键
 */
export class ElectronHotkeyBridge extends BaseSingleton {
  private registeredHotkeys = new Map<string, HotkeyConfig>()

  constructor() {
    super()
    this.initializeListener()
  }

  /**
   * 注册全局快捷键
   */
  async registerGlobalHotkey(config: HotkeyConfig): Promise<boolean> {
    try {
      const { id, keys } = config

      // 检查是否已注册
      if (this.registeredHotkeys.has(id)) {
        console.warn(`🔌 全局快捷键 ${id} 已注册`)
        return false
      }

      // 标准化快捷键格式
      const normalizedKeys = this.normalizeElectronKeys(keys)

      // 注意：全局快捷键的回调由Electron主进程处理
      // 这里不需要创建回调函数，因为主进程会直接调用

      // 调用Electron API注册全局快捷键
      const success = await naimo.router.windowRegisterGlobalHotkey(normalizedKeys, id)

      if (success) {
        this.registeredHotkeys.set(id, config)
        console.log(`🔌 注册全局快捷键成功: ${id} -> ${normalizedKeys}`)
        return true
      } else {
        console.error(`🔌 注册全局快捷键失败: ${id} -> ${normalizedKeys}`)
        return false
      }
    } catch (error) {
      console.error('🔌 注册全局快捷键异常:', error)
      return false
    }
  }

  /**
   * 注销全局快捷键
   */
  async unregisterGlobalHotkey(id: string): Promise<boolean> {
    try {
      const config = this.registeredHotkeys.get(id)
      if (!config) {
        console.warn(`🔌 全局快捷键 ${id} 未注册`)
        return false
      }

      // 调用Electron API注销全局快捷键
      const success = await naimo.router.windowUnregisterGlobalHotkey(config.keys, id)

      if (success) {
        this.registeredHotkeys.delete(id)
        console.log(`🔌 注销全局快捷键成功: ${id}`)
        return true
      } else {
        console.error(`🔌 注销全局快捷键失败: ${id}`)
        return false
      }
    } catch (error) {
      console.error('🔌 注销全局快捷键异常:', error)
      return false
    }
  }

  /**
   * 检查全局快捷键是否已注册
   */
  async isGlobalHotkeyRegistered(keys: string): Promise<boolean> {
    try {
      const normalizedKeys = this.normalizeElectronKeys(keys)
      return await naimo.router.windowIsGlobalHotkeyRegistered(normalizedKeys)
    } catch (error) {
      console.error('🔌 检查全局快捷键状态异常:', error)
      return false
    }
  }

  /**
   * 获取所有已注册的全局快捷键
   */
  getAllRegisteredHotkeys(): HotkeyConfig[] {
    return Array.from(this.registeredHotkeys.values())
  }

  /**
   * 清除所有全局快捷键
   */
  async clearAllGlobalHotkeys(): Promise<boolean> {
    try {
      // 逐个注销所有全局快捷键
      const hotkeyIds = Array.from(this.registeredHotkeys.keys())
      let allSuccess = true

      for (const hotkeyId of hotkeyIds) {
        const config = this.registeredHotkeys.get(hotkeyId)
        if (config) {
          const success = await naimo.router.windowUnregisterGlobalHotkey(config.keys, hotkeyId)
          if (!success) {
            allSuccess = false
          }
        }
      }

      const success = allSuccess

      if (success) {
        this.registeredHotkeys.clear()
        console.log('🔌 清除所有全局快捷键成功')
        return true
      } else {
        console.error('🔌 清除所有全局快捷键失败')
        return false
      }
    } catch (error) {
      console.error('🔌 清除所有全局快捷键异常:', error)
      return false
    }
  }

  /**
   * 标准化Electron快捷键格式
   */
  private normalizeElectronKeys(keys: string): string {
    // 将常见的快捷键格式转换为Electron格式
    return keys
      .toLowerCase()
      .replace(/ctrl/g, 'CmdOrCtrl')
      .replace(/cmd/g, 'CmdOrCtrl')
      .replace(/alt/g, 'Alt')
      .replace(/shift/g, 'Shift')
      .replace(/meta/g, 'Cmd')
      .replace(/super/g, 'Cmd')
      .replace(/win/g, 'Cmd')
      .replace(/\+/g, '+')
  }

  /**
   * 触发快捷键回调
   */
  private triggerHotkeyCallback(config: HotkeyConfig): void {
    // 创建符合类型定义的事件详情
    const eventDetail: HotkeyTriggeredEventDetail = {
      id: config.id,
      keys: config.keys,
      config,
      // 全局快捷键没有原始键盘事件
      originalEvent: undefined
    }

    // 触发自定义事件
    const event = new CustomEvent<HotkeyTriggeredEventDetail>('hotkey-triggered', {
      detail: eventDetail
    })
    window.dispatchEvent(event)
    console.log(`🔌 触发全局快捷键事件: ${config.id} -> ${config.keys}`)
  }

  /**
   * 获取已注册快捷键数量
   */
  getRegisteredCount(): number {
    return this.registeredHotkeys.size
  }

  /**
   * 初始化监听器
   */
  private initializeListener(): void {
    // 检查是否已经注册过监听器
    if (!window.hasOwnProperty('_globalHotkeyListenerInitialized')) {
      // 监听全局快捷键触发事件
      window.addEventListener('global-hotkey-trigger', this.handleGlobalHotkeyTrigger as EventListener)
        ; (window as any)._globalHotkeyListenerInitialized = true
      console.log('✅ 全局快捷键监听器已初始化')
    } else {
      console.log('ℹ️ 全局快捷键监听器已存在，跳过重复注册')
    }
  }

  /**
   * 处理全局快捷键触发事件
   */
  private handleGlobalHotkeyTrigger = (event: CustomEvent) => {
    console.log(`🎉 收到全局快捷键触发事件:`, event.detail)
    const { hotkeyId } = event.detail
    console.log(`🔍 查找快捷键ID: ${hotkeyId}`)
    console.log(`📋 当前注册的全局快捷键:`, Array.from(this.registeredHotkeys.values()).map(h => ({ id: h.id, keys: h.keys })))

    const config = this.registeredHotkeys.get(hotkeyId)
    console.log(`查找快捷键配置:`, config)

    if (config) {
      console.log(`✅ 触发Electron全局快捷键: ${config.keys}`)
      // 触发快捷键回调
      this.triggerHotkeyCallback(config)
    } else {
      console.warn(`⚠️ 快捷键配置未找到: ${hotkeyId}`)
      console.log(`当前全局快捷键列表:`, Array.from(this.registeredHotkeys.values()))
    }
  }

  /**
   * 添加全局快捷键配置（但不注册）
   */
  async addGlobalHotkeyConfig(config: HotkeyConfig): Promise<boolean> {
    try {
      if (this.registeredHotkeys.has(config.id)) {
        console.warn(`🔌 全局快捷键 ${config.id} 已存在`)
        return false
      }

      this.registeredHotkeys.set(config.id, config)
      console.log(`🔌 添加全局快捷键配置: ${config.id}`)
      return true
    } catch (error) {
      console.error('🔌 添加全局快捷键配置失败:', error)
      return false
    }
  }

  /**
   * 更新全局快捷键配置
   */
  async updateGlobalHotkeyConfig(id: string, config: Partial<HotkeyConfig>): Promise<boolean> {
    try {
      const existingConfig = this.registeredHotkeys.get(id)
      if (!existingConfig) {
        console.warn(`🔌 全局快捷键 ${id} 未注册`)
        return false
      }

      // 更新配置
      const updatedConfig = { ...existingConfig, ...config }
      this.registeredHotkeys.set(id, updatedConfig)

      console.log(`🔌 更新全局快捷键配置: ${id}`)
      return true
    } catch (error) {
      console.error('🔌 更新全局快捷键配置失败:', error)
      return false
    }
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    window.removeEventListener('global-hotkey-trigger', this.handleGlobalHotkeyTrigger as EventListener)
      ; (window as any)._globalHotkeyListenerInitialized = false
    this.registeredHotkeys.clear()
    console.log('✅ ElectronHotkeyBridge 实例已销毁')
  }
}

// 导出单例实例
export const electronHotkeyBridge = ElectronHotkeyBridge.getInstance()
