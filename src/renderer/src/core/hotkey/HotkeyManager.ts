import { HotkeyType, type HotkeyConfig, type HotkeyEventType, type HotkeyEventListener, type HotkeySettingsConfig } from '@/typings/hotkey-types'
import type { CoreAPI } from '@/typings/core-types'
import { electronHotkeyBridge } from './ElectronHotkeyBridge'
import { appHotkeyBridge } from './AppHotkeyBridge'
import { BaseSingleton } from '../BaseSingleton'
import { ElectronStoreBridge } from '../store/ElectronStoreBridge'

/**
 * 快捷键管理器核心类
 * 处理快捷键逻辑，不依赖Vue框架
 */
export class HotkeyManager extends BaseSingleton implements CoreAPI {
  /** 存储所有已注册的快捷键信息，key为快捷键ID，value为快捷键配置 */
  private hotkeys: Map<string, HotkeyConfig> = new Map()

  /** 存储所有可用的快捷键作用域 */
  private scopes: Set<string> = new Set()

  /** 当前激活的快捷键作用域，默认为'all' */
  private currentScope = 'all'

  /** 标记快捷键管理器是否已初始化 */
  private isInitialized = false

  customHotKeyPrefix = 'custom_global_'

  private defaultConfig: HotkeySettingsConfig = {
    global: [],
    application: []
  }

  /** 存储桥接器实例 */
  private storeBridge = ElectronStoreBridge.getInstance()

  constructor() {
    super()
  }

  /** 初始化快捷键管理器 */
  async initialize(defaultConfig: HotkeySettingsConfig): Promise<void> {
    if (this.isInitialized) return

    // 设置默认作用域
    this.scopes.add('all')
    this.scopes.add('global')
    this.scopes.add('application')

    this.defaultConfig = defaultConfig

    // 从存储中恢复快捷键配置
    await this.restoreFromStorage()

    this.isInitialized = true
    console.log('⌨️ HotkeyManager 初始化完成')
  }

  /** 销毁快捷键管理器 */
  async destroy(): Promise<void> {
    // 清除所有快捷键
    await this.clear()
    this.scopes.clear()
    this.isInitialized = false
    console.log('⌨️ HotkeyManager 已销毁')
  }

  /** 重置快捷键管理器 */
  reset(): void {
    this.hotkeys.clear()
    this.scopes.clear()
    this.currentScope = 'all'
  }

  /** 添加自定义快捷键 但是不启用 */
  async addCustomHotkey(config: HotkeyConfig): Promise<void> {
    // 更新 HotkeyManager 内部配置
    this.hotkeys.set(config.id, config)

    // 同步添加到桥接层配置（但不注册，因为不启用）
    try {
      if (config.type === HotkeyType.GLOBAL) {
        // 添加到全局快捷键桥接层
        await electronHotkeyBridge.addGlobalHotkeyConfig(config)
      } else {
        // 添加到应用内快捷键桥接层
        await appHotkeyBridge.addAppHotkeyConfig(config)
      }
    } catch (error) {
      console.error(`⌨️ 同步桥接层配置失败: ${config.id}`, error)
      // 如果同步失败，从 HotkeyManager 中移除
      this.hotkeys.delete(config.id)
      throw error
    }

    await this.saveToStorage()
    console.log(`⌨️ 添加自定义快捷键: ${config.id}`)
  }

  async updateConfig(id: string, config: Partial<HotkeyConfig> = {}) {
    const hotkeyConfig = this.hotkeys.get(id)
    if (!hotkeyConfig) {
      console.warn(`快捷键 ${id} 不存在`)
      return false
    }

    // 更新 HotkeyManager 内部配置
    const updatedConfig = { ...hotkeyConfig, ...config }
    this.hotkeys.set(id, updatedConfig)

    // 同步更新桥接层配置
    try {
      if (updatedConfig.type === HotkeyType.GLOBAL) {
        // 更新全局快捷键桥接层
        await electronHotkeyBridge.updateGlobalHotkeyConfig(id, config)
      } else {
        // 更新应用内快捷键桥接层
        await appHotkeyBridge.updateAppHotkeyConfig(id, config)
      }
    } catch (error) {
      console.error(`⌨️ 同步桥接层配置失败: ${id}`, error)
      // 如果同步失败，恢复原始配置
      this.hotkeys.set(id, hotkeyConfig)
      return false
    }

    await this.saveToStorage()
    console.log(`⌨️ 更新快捷键配置: ${id}`)
    return true
  }

  /** 注册快捷键 */
  async register(registerConfig: HotkeyConfig, autoSave: boolean = true): Promise<boolean> {
    const config: HotkeyConfig = JSON.parse(JSON.stringify(registerConfig))

    try {
      const { id, keys, type } = config

      // 检查是否已存在
      if (this.hotkeys.has(id)) {
        console.warn(`快捷键 ${id} 已存在，将被覆盖`)
        await this.unregister(id)
      }

      // 根据类型处理快捷键
      if (type === HotkeyType.GLOBAL) {
        // 全局快捷键通过Electron API注册
        const success = await this.registerGlobalHotkey(config)
        if (success) {
          this.hotkeys.set(id, config)
          console.log(`⌨️ 注册全局快捷键: ${id} -> ${keys}`)
          // 保存到存储
          if (autoSave) await this.saveToStorage()
          return true
        }
        return false
      } else {
        // 应用内快捷键通过hotkeys-js注册
        const success = await this.registerAppHotkey(config)
        if (success) {
          this.hotkeys.set(id, config)
          console.log(`⌨️ 注册应用内快捷键: ${id} -> ${keys}`)
          // 保存到存储
          if (autoSave) await this.saveToStorage()
          return true
        }
        return false
      }
    } catch (error) {
      console.error(`⌨️ 注册快捷键失败: ${config.id}`, error)
      return false
    }
  }

  /** 注销快捷键 */
  async unregister(id: string, autoSave: boolean = true): Promise<boolean> {
    try {
      const config = this.hotkeys.get(id)
      if (!config) {
        console.warn(`快捷键 ${id} 不存在`)
        return false
      }

      const { type, keys } = config

      // 当 Key 存在的情况下进行卸载
      if (keys.trim()) {
        if (type === HotkeyType.GLOBAL) {
          await this.unregisterGlobalHotkey(id)
        } else {
          await this.unregisterAppHotkey(id)
        }
      }

      this.hotkeys.delete(id)
      console.log(`⌨️ 注销快捷键: ${id}`)
      // 保存到存储
      if (autoSave) await this.saveToStorage()
      return true
    } catch (error) {
      console.error(`⌨️ 注销快捷键失败: ${id}`, error)
      return false
    }
  }

  /** 设置当前作用域 */
  setScope(scope: string): void {
    if (this.scopes.has(scope)) {
      this.currentScope = scope
      // 同步设置应用内快捷键的作用域
      appHotkeyBridge.setScope(scope)
      console.log(`⌨️ 设置快捷键作用域: ${scope}`)
    } else {
      console.warn(`⌨️ 无效的快捷键作用域: ${scope}`)
    }
  }

  /** 获取所有快捷键 */
  getAll(): HotkeyConfig[] {
    return Array.from(this.hotkeys.values())
  }

  /** 根据类型获取快捷键 */
  getByType(type: HotkeyType): HotkeyConfig[] {
    return Array.from(this.hotkeys.values()).filter(config => config.type === type)
  }

  /** 根据作用域获取快捷键 */
  getByScope(scope: string): HotkeyConfig[] {
    return Array.from(this.hotkeys.values()).filter(config =>
      config.scope === scope || config.scope === 'all'
    )
  }

  /** 获取当前作用域的快捷键 */
  getCurrentScope(): HotkeyConfig[] {
    return this.getByScope(this.currentScope)
  }

  /** 清除所有快捷键 */
  async clear(): Promise<void> {
    const hotkeyIds = Array.from(this.hotkeys.keys())

    for (const id of hotkeyIds) {
      await this.unregister(id)
    }

    console.log('⌨️ 清除所有快捷键')
  }

  /** 根据类型清除快捷键 */
  async clearByType(type: HotkeyType): Promise<void> {
    const hotkeysToRemove = this.getByType(type)

    for (const config of hotkeysToRemove) {
      await this.unregister(config.id)
    }

    console.log(`⌨️ 清除 ${type} 类型快捷键`)
  }

  /** 注册全局快捷键（Electron） */
  private async registerGlobalHotkey(config: HotkeyConfig): Promise<boolean> {
    try {
      return await electronHotkeyBridge.registerGlobalHotkey(config)
    } catch (error) {
      console.error('⌨️ 注册全局快捷键失败:', error)
      return false
    }
  }

  /** 注销全局快捷键（Electron） */
  private async unregisterGlobalHotkey(id: string): Promise<boolean> {
    try {
      return await electronHotkeyBridge.unregisterGlobalHotkey(id)
    } catch (error) {
      console.error('⌨️ 注销全局快捷键失败:', error)
      return false
    }
  }

  /** 注册应用内快捷键 */
  private async registerAppHotkey(config: HotkeyConfig): Promise<boolean> {
    try {
      return await appHotkeyBridge.registerAppHotkey(config)
    } catch (error) {
      console.error('⌨️ 注册应用内快捷键失败:', error)
      return false
    }
  }

  /** 注销应用内快捷键 */
  private async unregisterAppHotkey(id: string): Promise<boolean> {
    try {
      return await appHotkeyBridge.unregisterAppHotkey(id)
    } catch (error) {
      console.error('⌨️ 注销应用内快捷键失败:', error)
      return false
    }
  }

  /** 检查快捷键是否已注册 */
  isRegistered(id: string): boolean {
    return this.hotkeys.has(id)
  }

  /** 获取快捷键配置 */
  getConfig(id: string): HotkeyConfig | undefined {
    return this.hotkeys.get(id)
  }


  /** 切换快捷键启用状态 */
  async toggle(id: string, enabled?: boolean): Promise<boolean> {
    try {
      const config = this.hotkeys.get(id)
      if (!config) {
        console.warn(`快捷键 ${id} 不存在`)
        return false
      }

      // 如果没有指定enabled参数，则切换当前状态
      const newEnabled = enabled !== undefined ? enabled : !config.enabled

      if (newEnabled === config.enabled) {
        console.log(`快捷键 ${id} 状态未改变`)
        return true
      }

      // 更新配置
      const updatedConfig = { ...config, enabled: newEnabled }

      if (newEnabled) {
        // 启用：注册快捷键
        const success = await this.register(updatedConfig)
        if (success) {
          console.log(`⌨️ 启用快捷键: ${id}`)
          return true
        }
        return false
      } else {
        // 禁用：注销快捷键
        const success = await this.unregister(id)
        if (success) {
          // 更新内部配置为禁用状态
          this.hotkeys.set(id, updatedConfig)
          // 保存到存储
          await this.saveToStorage()
          console.log(`⌨️ 禁用快捷键: ${id}`)
          return true
        }
        return false
      }
    } catch (error) {
      console.error(`⌨️ 切换快捷键状态失败: ${id}`, error)
      return false
    }
  }

  /** 获取快捷键统计信息 */
  getStats(): {
    total: number
    global: number
    application: number
    enabled: number
    disabled: number
  } {
    const all = this.getAll()
    const global = this.getByType(HotkeyType.GLOBAL)
    const application = this.getByType(HotkeyType.APPLICATION)
    const enabled = all.filter(config => config.enabled)
    const disabled = all.filter(config => !config.enabled)

    return {
      total: all.length,
      global: global.length,
      application: application.length,
      enabled: enabled.length,
      disabled: disabled.length
    }
  }

  private async mergeConfig(defaultConfig: HotkeyConfig[], config: HotkeyConfig[]): Promise<HotkeyConfig[]> {
    const mergedConfig = [...defaultConfig]
    mergedConfig.forEach(defaultItem => {
      for (const item of config) {
        if (item.id === defaultItem.id) {
          defaultItem.enabled = item.enabled
          defaultItem.keys = item.keys
          break
        }
      }
    })

    config.forEach(cf => {
      if (cf.id.startsWith(this.customHotKeyPrefix) && !mergedConfig.some(item => item.id === cf.id)) {
        mergedConfig.push(cf)
      }
    })
    return mergedConfig
  }

  async getHotkeyConfig(): Promise<HotkeySettingsConfig> {
    let { global = [], application = [] } = this.defaultConfig

    const hotkeysConfig = await this.storeBridge.get('hotkeys') as HotkeySettingsConfig
    if (hotkeysConfig) {
      global = await this.mergeConfig(global, hotkeysConfig.global)
      application = await this.mergeConfig(application, hotkeysConfig.application)
      console.log('⌨️ 找到存储的快捷键配置')
    }

    return { global, application }
  }

  /** 从存储中恢复快捷键配置 */
  private async restoreFromStorage(): Promise<void> {
    try {
      const { global = [], application = [] } = await this.getHotkeyConfig()
      // 恢复全局快捷键
      for (const config of global) {
        if (config.enabled) {
          await this.register(config, false)
        } else {
          this.hotkeys.set(config.id, config)
        }
      }

      // 恢复应用内快捷键
      for (const config of application) {
        if (config.enabled) {
          await this.register(config, false)
        } else {
          this.hotkeys.set(config.id, config)
        }
      }

      await this.saveToStorage()
      console.log(`⌨️ 从存储恢复快捷键: 全局${global.length}个, 应用内${application.length}个`)
    } catch (error) {
      console.error('⌨️ 从存储恢复快捷键失败:', error)
    }
  }

  /** 保存快捷键配置到存储 */
  private async saveToStorage(): Promise<void> {
    try {
      const global = this.getByType(HotkeyType.GLOBAL)
      const application = this.getByType(HotkeyType.APPLICATION)
      const hotkeysConfig = { global, application }
      await this.storeBridge.set('hotkeys', hotkeysConfig)
      console.log('⌨️ 快捷键配置已保存到存储')
    } catch (error) {
      console.error('⌨️ 保存快捷键配置失败:', error)
    }
  }

  addListener(eventType: HotkeyEventType, listener: HotkeyEventListener): void {
    window.addEventListener(eventType, listener as EventListener)
    console.log(`🎧 添加快捷键事件监听器: ${eventType}`)
  }

  removeListener(eventType: HotkeyEventType, listener: HotkeyEventListener): void {
    window.removeEventListener(eventType, listener as EventListener)
    console.log(`🎧 移除快捷键事件监听器: ${eventType}`)
  }
}

/** 导出单例实例 */
export const hotkeyManager = HotkeyManager.getInstance()
