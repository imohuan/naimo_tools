import { ref, computed } from 'vue'
import type { HotkeyConfig } from '@/typings/hotkey-types'

// 全局快捷键缓存键名
const GLOBAL_HOTKEYS_CACHE_KEY = 'globalHotkeys'

// 全局快捷键缓存管理器类
class HotkeyCacheManager {
  private cachedGlobalHotkeys = ref<HotkeyConfig[]>([])

  // 从 electron-store 加载全局快捷键配置
  public async loadGlobalHotkeys(): Promise<HotkeyConfig[]> {
    try {
      if (api?.ipcRouter?.storeGet) {
        const hotkeys = await api.ipcRouter.storeGet(GLOBAL_HOTKEYS_CACHE_KEY as any) || []
        this.cachedGlobalHotkeys.value = hotkeys
        console.log('从缓存加载全局快捷键配置:', hotkeys)
        return hotkeys
      }
    } catch (error) {
      console.error('加载全局快捷键配置失败:', error)
    }
    return []
  }

  // 保存全局快捷键配置到 electron-store
  public async saveGlobalHotkeys(hotkeys: HotkeyConfig[]): Promise<boolean> {
    try {
      if (api?.ipcRouter?.storeSet) {
        await api.ipcRouter.storeSet(GLOBAL_HOTKEYS_CACHE_KEY as any, hotkeys)
        this.cachedGlobalHotkeys.value = hotkeys
        console.log('保存全局快捷键配置到缓存:', hotkeys)
        return true
      }
    } catch (error) {
      console.error('保存全局快捷键配置失败:', error)
    }
    return false
  }

  // 添加全局快捷键到缓存
  public async addGlobalHotkey(hotkey: HotkeyConfig): Promise<boolean> {
    try {
      const currentHotkeys = [...this.cachedGlobalHotkeys.value]

      // 检查是否已存在相同ID的快捷键
      const existingIndex = currentHotkeys.findIndex(h => h.id === hotkey.id)
      if (existingIndex >= 0) {
        // 更新现有快捷键
        currentHotkeys[existingIndex] = hotkey
      } else {
        // 添加新快捷键
        currentHotkeys.push(hotkey)
      }

      return await this.saveGlobalHotkeys(currentHotkeys)
    } catch (error) {
      console.error('添加全局快捷键到缓存失败:', error)
      return false
    }
  }

  // 从缓存中移除全局快捷键
  public async removeGlobalHotkey(id: string): Promise<boolean> {
    try {
      const currentHotkeys = this.cachedGlobalHotkeys.value.filter(h => h.id !== id)
      return await this.saveGlobalHotkeys(currentHotkeys)
    } catch (error) {
      console.error('从缓存移除全局快捷键失败:', error)
      return false
    }
  }

  // 更新全局快捷键状态
  public async updateGlobalHotkeyStatus(id: string, enabled: boolean): Promise<boolean> {
    try {
      const currentHotkeys = [...this.cachedGlobalHotkeys.value]
      const hotkey = currentHotkeys.find(h => h.id === id)
      if (hotkey) {
        hotkey.enabled = enabled
        return await this.saveGlobalHotkeys(currentHotkeys)
      }
      return false
    } catch (error) {
      console.error('更新全局快捷键状态失败:', error)
      return false
    }
  }

  // 清空所有全局快捷键缓存
  public async clearGlobalHotkeys(): Promise<boolean> {
    try {
      return await this.saveGlobalHotkeys([])
    } catch (error) {
      console.error('清空全局快捷键缓存失败:', error)
      return false
    }
  }

  // 获取缓存的全局快捷键
  public getCachedGlobalHotkeys() {
    return computed(() => this.cachedGlobalHotkeys.value)
  }

  // 检查缓存中是否存在指定ID的快捷键
  public hasGlobalHotkey(id: string): boolean {
    return this.cachedGlobalHotkeys.value.some(h => h.id === id)
  }

  // 获取缓存中指定ID的快捷键
  public getGlobalHotkey(id: string): HotkeyConfig | undefined {
    return this.cachedGlobalHotkeys.value.find(h => h.id === id)
  }
}

// 全局单例实例
let hotkeyCacheInstance: HotkeyCacheManager | null = null

// 获取单例实例
export const getHotkeyCache = (): HotkeyCacheManager => {
  if (!hotkeyCacheInstance) {
    hotkeyCacheInstance = new HotkeyCacheManager()
  }
  return hotkeyCacheInstance
}

// Vue Composable 包装器（保持向后兼容）
export function useHotkeyCache() {
  const cache = getHotkeyCache()

  return {
    // 状态
    cachedGlobalHotkeys: cache.getCachedGlobalHotkeys(),

    // 方法
    loadGlobalHotkeys: cache.loadGlobalHotkeys.bind(cache),
    saveGlobalHotkeys: cache.saveGlobalHotkeys.bind(cache),
    addGlobalHotkey: cache.addGlobalHotkey.bind(cache),
    removeGlobalHotkey: cache.removeGlobalHotkey.bind(cache),
    updateGlobalHotkeyStatus: cache.updateGlobalHotkeyStatus.bind(cache),
    clearGlobalHotkeys: cache.clearGlobalHotkeys.bind(cache),
    hasGlobalHotkey: cache.hasGlobalHotkey.bind(cache),
    getGlobalHotkey: cache.getGlobalHotkey.bind(cache),
  }
}
