import { ref, onMounted, onUnmounted } from 'vue'
import { globalHotkeyManager, HotkeyType, type HotkeyConfig } from './useHotkeyManager'

// Electron全局快捷键管理器
export function useElectronHotkeys() {
  const isElectronAvailable = ref(false)
  const globalHotkeys = ref<HotkeyConfig[]>([])

  // 检查Electron是否可用
  const checkElectronAvailability = () => {
    isElectronAvailable.value = !!api?.ipcRouter
    return isElectronAvailable.value
  }

  // 标准化Electron快捷键格式
  const normalizeElectronKeys = (keys: string): string => {
    return keys
      .replace(/\+/g, '+')
      .replace(/\s+/g, '')
      .toLowerCase()
  }

  // 注册全局快捷键（通过Electron）
  const registerGlobalHotkey = async (keys: string, callback: (event: KeyboardEvent) => void, options?: Partial<HotkeyConfig>) => {
    if (!checkElectronAvailability()) {
      console.warn('Electron不可用，无法注册全局快捷键')
      return false
    }

    try {
      const id = options?.id || `global_${Date.now()}`
      const keysString = normalizeElectronKeys(keys)

      // 通过IPC注册到主进程
      const success = await api.ipcRouter.windowRegisterGlobalHotkey(keysString, id)

      if (success) {
        // 在渲染进程中保存配置
        const config: HotkeyConfig = {
          id,
          keys: keysString,
          type: HotkeyType.GLOBAL,
          enabled: true,
          callback,
          ...options
        }

        globalHotkeyManager.register(config)
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
      const success = await api.ipcRouter.windowUnregisterGlobalHotkey(id)

      if (success) {
        globalHotkeyManager.unregister(id)
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



  // 处理全局快捷键触发事件
  const handleGlobalHotkeyTrigger = (event: CustomEvent) => {
    const { hotkeyId } = event.detail
    const config = globalHotkeys.value.find(h => h.id === hotkeyId)
    if (config && config.enabled) {
      console.log(`触发Electron全局快捷键: ${config.keys}`)
      config.callback(new KeyboardEvent('keydown'))
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

  // 生命周期管理
  onMounted(() => {
    checkElectronAvailability()
    // 监听全局快捷键触发事件
    window.addEventListener('global-hotkey-trigger', handleGlobalHotkeyTrigger as EventListener)
  })

  onUnmounted(() => {
    window.removeEventListener('global-hotkey-trigger', handleGlobalHotkeyTrigger as EventListener)
  })

  return {
    // 状态
    isElectronAvailable,
    globalHotkeys,

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
