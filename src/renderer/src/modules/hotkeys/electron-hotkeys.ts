import { ref } from 'vue'
import { HotkeyType } from '@/typings/hotkey-types'
import type { HotkeyConfig, IElectronHotkeys } from '@/typings/hotkey-types'
import { getCallback } from './config/callbacks'

// 全局单例实例
let electronHotkeysInstance: ElectronHotkeysManager | null = null

// Electron全局快捷键管理器类
class ElectronHotkeysManager implements IElectronHotkeys {
  public readonly isElectronAvailable = ref(false)
  public readonly globalHotkeys = ref<HotkeyConfig[]>([])

  private constructor() {
    this.checkElectronAvailability()
    this.initializeListener()
    console.log('🔧 ElectronHotkeysManager 单例实例被创建')
  }

  // 获取单例实例
  public static getInstance(): ElectronHotkeysManager {
    if (!electronHotkeysInstance) {
      electronHotkeysInstance = new ElectronHotkeysManager()
    }
    return electronHotkeysInstance
  }

  // 检查Electron是否可用
  public checkElectronAvailability(): boolean {
    this.isElectronAvailable.value = !!api?.ipcRouter
    return this.isElectronAvailable.value
  }

  // 标准化Electron快捷键格式
  public normalizeElectronKeys(keys: string): string {
    let normalized = keys
      .replace(/\s+/g, '')
      .toLowerCase()
      .replace(/ctrl/g, 'CommandOrControl')
      .replace(/cmd/g, 'CommandOrControl')
      .replace(/alt/g, 'Alt')
      .replace(/shift/g, 'Shift')
      .replace(/space/g, 'Space')
      .replace(/enter/g, 'Enter')
      .replace(/escape/g, 'Escape')
      .replace(/esc/g, 'Escape')

    // 处理多个修饰键的组合，确保顺序正确
    // Electron 期望的格式是: CommandOrControl+Shift+Space
    const parts = normalized.split('+')
    const modifiers = parts.filter(part =>
      ['CommandOrControl', 'Alt', 'Shift', 'Meta'].includes(part)
    ).sort((a, b) => {
      const order = ['CommandOrControl', 'Alt', 'Shift', 'Meta']
      return order.indexOf(a) - order.indexOf(b)
    })
    const keys_part = parts.filter(part =>
      !['CommandOrControl', 'Alt', 'Shift', 'Meta'].includes(part)
    )

    normalized = [...modifiers, ...keys_part].join('+')

    console.log(`🔧 快捷键格式转换: ${keys} -> ${normalized}`)
    return normalized
  }

  // 注册全局快捷键（通过Electron）
  public async registerGlobalHotkey(keys: string, _callbackFn: () => void, options?: Partial<HotkeyConfig>): Promise<boolean> {
    if (!this.checkElectronAvailability()) {
      console.warn('Electron不可用，无法注册全局快捷键')
      return false
    }

    try {
      const id = options?.id || `global_${Date.now()}`
      const keysString = this.normalizeElectronKeys(keys)

      console.log(`🔧 准备注册全局快捷键:`)
      console.log(`  - 原始快捷键: ${keys}`)
      console.log(`  - 转换后快捷键: ${keysString}`)
      console.log(`  - 快捷键ID: ${id}`)

      // 通过IPC注册到主进程
      const success = await api.ipcRouter.windowRegisterGlobalHotkey(keysString, id)

      console.log(`🔧 全局快捷键注册结果: ${success}`)

      if (success) {
        // 在渲染进程中保存配置
        const config: HotkeyConfig = {
          id,
          keys: keysString,
          type: HotkeyType.GLOBAL,
          enabled: true,
          callback: options?.callback || 'unknown',
          ...options
        }

        // 直接保存到本地列表，避免递归调用
        this.globalHotkeys.value.push(config)

        console.log(`注册Electron全局快捷键: ${keysString}`)
        return true
      }

      return false
    } catch (error) {
      console.error('注册Electron全局快捷键失败:', error)
      return false
    }
  }

  // 注销全局快捷键
  public async unregisterGlobalHotkey(id: string): Promise<boolean> {
    if (!this.checkElectronAvailability()) {
      console.warn('Electron不可用，无法注销全局快捷键')
      return false
    }

    try {
      const config = this.globalHotkeys.value.find(h => h.id === id)
      if (!config) {
        console.warn(`全局快捷键 ${id} 不存在`)
        return false
      }

      // 通过IPC注销
      const keysString = this.normalizeElectronKeys(config.keys)
      const success = await api.ipcRouter.windowUnregisterGlobalHotkey(keysString, id)

      if (success) {
        // 直接从本地列表移除，避免递归调用
        const index = this.globalHotkeys.value.findIndex(h => h.id === id)
        if (index > -1) {
          this.globalHotkeys.value.splice(index, 1)
        }

        console.log(`注销Electron全局快捷键: ${id}`)
        return true
      }

      return false
    } catch (error) {
      console.error('注销Electron全局快捷键失败:', error)
      return false
    }
  }

  /**
   * 检查全局快捷键是否已注册
   * @param keys 快捷键
   * @returns 是否已注册
   */
  public async isGlobalHotkeyRegistered(keys: string): Promise<boolean> {
    return await api.ipcRouter.windowIsGlobalHotkeyRegistered(this.normalizeElectronKeys(keys))
  }

  // 处理全局快捷键触发事件
  private handleGlobalHotkeyTrigger = (event: CustomEvent) => {
    console.log(`🎉 收到全局快捷键触发事件:`, event.detail)
    const { hotkeyId } = event.detail
    console.log(`🔍 查找快捷键ID: ${hotkeyId}`)
    console.log(`📋 当前注册的全局快捷键:`, this.globalHotkeys.value.map(h => ({ id: h.id, keys: h.keys, callback: h.callback })))

    const config = this.globalHotkeys.value.find(h => h.id === hotkeyId)
    console.log(`查找快捷键配置:`, config)

    if (config && config.enabled) {
      console.log(`✅ 触发Electron全局快捷键: ${config.keys}`)
      const callbackFn = getCallback(config.callback)
      console.log(`回调函数:`, callbackFn)
      if (callbackFn) {
        console.log(`🚀 执行回调函数: ${config.callback}`)
        try {
          callbackFn()
        } catch (error) {
          console.error(`❌ 执行回调函数时出错:`, error)
        }
      } else {
        console.error(`❌ 未找到回调函数: ${config.callback}`)
      }
    } else {
      console.warn(`⚠️ 快捷键配置未找到或已禁用: ${hotkeyId}`)
      console.log(`当前全局快捷键列表:`, this.globalHotkeys.value)
    }
  }

  // 获取所有全局快捷键
  public getAllGlobalHotkeys(): HotkeyConfig[] {
    return this.globalHotkeys.value
  }

  // 清空所有全局快捷键
  public async clearAllGlobalHotkeys(): Promise<boolean> {
    if (!this.checkElectronAvailability()) return false

    try {
      const ids = this.globalHotkeys.value.map(h => h.id)
      for (const id of ids) {
        await this.unregisterGlobalHotkey(id)
      }
      return true
    } catch (error) {
      console.error('清空全局快捷键失败:', error)
      return false
    }
  }

  // 初始化监听器
  private initializeListener(): void {
    if (this.checkElectronAvailability()) {
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
  }

  // 销毁实例
  public destroy(): void {
    window.removeEventListener('global-hotkey-trigger', this.handleGlobalHotkeyTrigger as EventListener)
      ; (window as any)._globalHotkeyListenerInitialized = false
    this.globalHotkeys.value = []
    electronHotkeysInstance = null
    console.log('✅ ElectronHotkeysManager 实例已销毁')
  }
}

// 导出单例实例获取函数
export const getElectronHotkeys = (): ElectronHotkeysManager => {
  return ElectronHotkeysManager.getInstance()
}

// 导出类型
export type { IElectronHotkeys }
