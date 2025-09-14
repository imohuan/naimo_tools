import { ref, computed } from 'vue'
import type { HotkeyConfig } from '../types/hotkey-config'

// 全局快捷键缓存键名
const GLOBAL_HOTKEYS_CACHE_KEY = 'globalHotkeys'

// 全局快捷键缓存管理器
export function useHotkeyCache() {
  const cachedGlobalHotkeys = ref<HotkeyConfig[]>([])

  // 从 electron-store 加载全局快捷键配置
  const loadGlobalHotkeys = async (): Promise<HotkeyConfig[]> => {
    try {
      if (api?.ipcRouter?.storeGet) {
        const hotkeys = await api.ipcRouter.storeGet(GLOBAL_HOTKEYS_CACHE_KEY as any) || []
        cachedGlobalHotkeys.value = hotkeys
        console.log('从缓存加载全局快捷键配置:', hotkeys)
        return hotkeys
      }
    } catch (error) {
      console.error('加载全局快捷键配置失败:', error)
    }
    return []
  }

  // 保存全局快捷键配置到 electron-store
  const saveGlobalHotkeys = async (hotkeys: HotkeyConfig[]): Promise<boolean> => {
    try {
      if (api?.ipcRouter?.storeSet) {
        await api.ipcRouter.storeSet(GLOBAL_HOTKEYS_CACHE_KEY as any, hotkeys)
        cachedGlobalHotkeys.value = hotkeys
        console.log('保存全局快捷键配置到缓存:', hotkeys)
        return true
      }
    } catch (error) {
      console.error('保存全局快捷键配置失败:', error)
    }
    return false
  }

  // 添加全局快捷键到缓存
  const addGlobalHotkey = async (hotkey: HotkeyConfig): Promise<boolean> => {
    try {
      const currentHotkeys = [...cachedGlobalHotkeys.value]

      // 检查是否已存在相同ID的快捷键
      const existingIndex = currentHotkeys.findIndex(h => h.id === hotkey.id)
      if (existingIndex >= 0) {
        // 更新现有快捷键
        currentHotkeys[existingIndex] = hotkey
      } else {
        // 添加新快捷键
        currentHotkeys.push(hotkey)
      }

      return await saveGlobalHotkeys(currentHotkeys)
    } catch (error) {
      console.error('添加全局快捷键到缓存失败:', error)
      return false
    }
  }

  // 从缓存中移除全局快捷键
  const removeGlobalHotkey = async (id: string): Promise<boolean> => {
    try {
      const currentHotkeys = cachedGlobalHotkeys.value.filter(h => h.id !== id)
      return await saveGlobalHotkeys(currentHotkeys)
    } catch (error) {
      console.error('从缓存移除全局快捷键失败:', error)
      return false
    }
  }

  // 更新全局快捷键状态
  const updateGlobalHotkeyStatus = async (id: string, enabled: boolean): Promise<boolean> => {
    try {
      const currentHotkeys = [...cachedGlobalHotkeys.value]
      const hotkey = currentHotkeys.find(h => h.id === id)
      if (hotkey) {
        hotkey.enabled = enabled
        return await saveGlobalHotkeys(currentHotkeys)
      }
      return false
    } catch (error) {
      console.error('更新全局快捷键状态失败:', error)
      return false
    }
  }

  // 清空所有全局快捷键缓存
  const clearGlobalHotkeys = async (): Promise<boolean> => {
    try {
      return await saveGlobalHotkeys([])
    } catch (error) {
      console.error('清空全局快捷键缓存失败:', error)
      return false
    }
  }

  // 获取缓存的全局快捷键
  const getCachedGlobalHotkeys = computed(() => cachedGlobalHotkeys.value)

  // 检查缓存中是否存在指定ID的快捷键
  const hasGlobalHotkey = (id: string): boolean => {
    return cachedGlobalHotkeys.value.some(h => h.id === id)
  }

  // 获取缓存中指定ID的快捷键
  const getGlobalHotkey = (id: string): HotkeyConfig | undefined => {
    return cachedGlobalHotkeys.value.find(h => h.id === id)
  }

  return {
    // 状态
    cachedGlobalHotkeys: getCachedGlobalHotkeys,

    // 方法
    loadGlobalHotkeys,
    saveGlobalHotkeys,
    addGlobalHotkey,
    removeGlobalHotkey,
    updateGlobalHotkeyStatus,
    clearGlobalHotkeys,
    hasGlobalHotkey,
    getGlobalHotkey,
  }
}
