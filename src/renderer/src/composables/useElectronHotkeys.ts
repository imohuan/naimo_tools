import { ref, onMounted, onUnmounted } from 'vue'
import { HotkeyType } from '../types/hotkey-types'
import type { HotkeyConfig } from '../types/hotkey-config'
import { getCallback } from '../config/hotkey-callbacks'

// Electron全局快捷键管理器
export function useElectronHotkeys() {
  const isElectronAvailable = ref(false)
  const globalHotkeys = ref<HotkeyConfig[]>([])

  // 添加实例创建日志
  console.log('🔧 useElectronHotkeys 实例被创建')

  // 检查Electron是否可用
  const checkElectronAvailability = () => {
    isElectronAvailable.value = !!api?.ipcRouter
    return isElectronAvailable.value
  }

  // 标准化Electron快捷键格式
  const normalizeElectronKeys = (keys: string): string => {
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
  const registerGlobalHotkey = async (keys: string, _callbackFn: () => void, options?: Partial<HotkeyConfig>) => {
    if (!checkElectronAvailability()) {
      console.warn('Electron不可用，无法注册全局快捷键')
      return false
    }

    try {
      const id = options?.id || `global_${Date.now()}`
      const keysString = normalizeElectronKeys(keys)

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
        globalHotkeys.value.push(config)

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
  const unregisterGlobalHotkey = async (id: string) => {
    if (!checkElectronAvailability()) {
      console.warn('Electron不可用，无法注销全局快捷键')
      return false
    }

    try {
      const config = globalHotkeys.value.find(h => h.id === id)
      if (!config) {
        console.warn(`全局快捷键 ${id} 不存在`)
        return false
      }


      // 通过IPC注销
      const keysString = normalizeElectronKeys(config.keys)
      const success = await api.ipcRouter.windowUnregisterGlobalHotkey(keysString, id)

      if (success) {
        // 直接从本地列表移除，避免递归调用
        const index = globalHotkeys.value.findIndex(h => h.id === id)
        if (index > -1) {
          globalHotkeys.value.splice(index, 1)
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
  const isGlobalHotkeyRegistered = (keys: string) => {
    return api.ipcRouter.windowIsGlobalHotkeyRegistered(normalizeElectronKeys(keys))
  }

  // 处理全局快捷键触发事件
  const handleGlobalHotkeyTrigger = (event: CustomEvent) => {
    console.log(`🎉 收到全局快捷键触发事件:`, event.detail)
    const { hotkeyId } = event.detail
    console.log(`🔍 查找快捷键ID: ${hotkeyId}`)
    console.log(`📋 当前注册的全局快捷键:`, globalHotkeys.value.map(h => ({ id: h.id, keys: h.keys, callback: h.callback })))

    const config = globalHotkeys.value.find(h => h.id === hotkeyId)
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
      console.log(`当前全局快捷键列表:`, globalHotkeys.value)
    }
  }

  // 获取所有全局快捷键
  const getAllGlobalHotkeys = () => {
    return globalHotkeys.value
  }

  // 清空所有全局快捷键
  const clearAllGlobalHotkeys = async () => {
    if (!checkElectronAvailability()) return false

    try {
      const ids = globalHotkeys.value.map(h => h.id)
      for (const id of ids) {
        await unregisterGlobalHotkey(id)
      }
      return true
    } catch (error) {
      console.error('清空全局快捷键失败:', error)
      return false
    }
  }

  // 初始化监听器（立即执行，不等待onMounted）
  const initializeListener = () => {
    if (checkElectronAvailability()) {
      // 检查是否已经注册过监听器
      if (!window.hasOwnProperty('_globalHotkeyListenerInitialized')) {
        // 监听全局快捷键触发事件
        window.addEventListener('global-hotkey-trigger', handleGlobalHotkeyTrigger as EventListener)
          ; (window as any)._globalHotkeyListenerInitialized = true
        console.log('✅ 全局快捷键监听器已初始化')
      } else {
        console.log('ℹ️ 全局快捷键监听器已存在，跳过重复注册')
      }
    }
  }

  // 立即初始化监听器
  initializeListener()

  // 生命周期管理
  onMounted(() => {
    checkElectronAvailability()
    // 监听器已在初始化时注册，这里只需要确保状态正确
    console.log('✅ useElectronHotkeys onMounted - 监听器状态检查完成')
  })

  onUnmounted(() => {
    window.removeEventListener('global-hotkey-trigger', handleGlobalHotkeyTrigger as EventListener)
      ; (window as any)._globalHotkeyListenerInitialized = false
  })

  return {
    // 状态
    isElectronAvailable,
    globalHotkeys,
    isGlobalHotkeyRegistered,

    // 方法
    registerGlobalHotkey,
    unregisterGlobalHotkey,
    getAllGlobalHotkeys,
    clearAllGlobalHotkeys,

    // 工具方法
    normalizeElectronKeys,
    checkElectronAvailability
  }
}
