import { onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useHotkeyStore } from '@/store/modules/hotkey'
import { HotkeyType, type HotkeyConfig } from '@/typings/hotkey-types'
import type { HotkeyHandler } from '@/typings/core-types'

/**
 * 快捷键功能 Composable
 * 提供 Vue 组件友好的快捷键接口
 */
export function useHotkey() {
  const hotkeyStore = useHotkeyStore()

  // 解构响应式状态
  const {
    loading,
    error,
    registeredHotkeys,
    hotkeyGroups,
    currentScope,
    allHotkeys,
    globalHotkeys,
    applicationHotkeys,
    enabledHotkeys,
    disabledHotkeys,
    hotkeysByScope,
    hotkeyStats
  } = storeToRefs(hotkeyStore)

  // 解构方法
  const {
    clearError,
    setCurrentScope,
    registerHotkey,
    unregisterHotkey,
    toggleHotkey,
    registerHotkeys,
    unregisterHotkeys,
    clearAllHotkeys,
    clearHotkeysByType,
    getHotkeyConfig,
    isHotkeyRegistered,
    isHotkeyEnabled,
    getHotkeyGroup,
    getGroupNames,
    restoreFromCache,
    saveToCache,
    initialize,
    reset,
    destroy
  } = hotkeyStore

  /**
   * 注册快捷键（简化接口）
   */
  const register = async (
    keys: string,
    handler: HotkeyHandler,
    options: Partial<HotkeyConfig> = {}
  ): Promise<boolean> => {
    const config: HotkeyConfig = {
      id: options.id || `hotkey_${Date.now()}`,
      keys,
      type: options.type || HotkeyType.APPLICATION,
      enabled: true,
      callback: options.callback || 'custom',
      ...options
    }

    // 将handler存储到全局回调映射中
    if (typeof window !== 'undefined') {
      (window as any).__hotkeyHandlers = (window as any).__hotkeyHandlers || new Map()
        ; (window as any).__hotkeyHandlers.set(config.id, handler)
    }

    return await registerHotkey(config)
  }

  /**
   * 注册全局快捷键
   */
  const registerGlobal = async (
    keys: string,
    handler: HotkeyHandler,
    options: Partial<HotkeyConfig> = {}
  ): Promise<boolean> => {
    return await register(keys, handler, {
      ...options,
      type: HotkeyType.GLOBAL
    })
  }

  /**
   * 注册应用内快捷键
   */
  const registerApp = async (
    keys: string,
    handler: HotkeyHandler,
    options: Partial<HotkeyConfig> = {}
  ): Promise<boolean> => {
    return await register(keys, handler, {
      ...options,
      type: HotkeyType.APPLICATION
    })
  }

  /**
   * 注销快捷键（简化接口）
   */
  const unregister = async (id: string): Promise<boolean> => {
    // 清理全局回调映射
    if (typeof window !== 'undefined' && (window as any).__hotkeyHandlers) {
      ; (window as any).__hotkeyHandlers.delete(id)
    }

    return await unregisterHotkey(id)
  }

  /**
   * 切换快捷键状态（简化接口）
   */
  const toggle = async (id: string, enabled?: boolean): Promise<boolean> => {
    return await toggleHotkey(id, enabled)
  }

  /**
   * 启用快捷键
   */
  const enable = async (id: string): Promise<boolean> => {
    return await toggleHotkey(id, true)
  }

  /**
   * 禁用快捷键
   */
  const disable = async (id: string): Promise<boolean> => {
    return await toggleHotkey(id, false)
  }

  /**
   * 批量注册快捷键
   */
  const registerBatch = async (configs: HotkeyConfig[]): Promise<boolean[]> => {
    return await registerHotkeys(configs)
  }

  /**
   * 批量注销快捷键
   */
  const unregisterBatch = async (ids: string[]): Promise<boolean[]> => {
    return await unregisterHotkeys(ids)
  }

  /**
   * 清除所有快捷键
   */
  const clear = async (): Promise<boolean> => {
    return await clearAllHotkeys()
  }

  /**
   * 根据类型清除快捷键
   */
  const clearByType = async (type: HotkeyType): Promise<boolean> => {
    return await clearHotkeysByType(type)
  }

  /**
   * 获取快捷键配置
   */
  const getConfig = (id: string): HotkeyConfig | undefined => {
    return getHotkeyConfig(id)
  }

  /**
   * 检查快捷键是否已注册
   */
  const isRegistered = (id: string): boolean => {
    return isHotkeyRegistered(id)
  }

  /**
   * 检查快捷键是否启用
   */
  const isEnabled = (id: string): boolean => {
    return isHotkeyEnabled(id)
  }

  /**
   * 获取快捷键分组
   */
  const getGroup = (group: string): HotkeyConfig[] => {
    return getHotkeyGroup(group)
  }

  /**
   * 获取所有分组名称
   */
  const getGroups = (): string[] => {
    return getGroupNames()
  }

  /**
   * 搜索快捷键
   */
  const searchHotkeys = (query: string): HotkeyConfig[] => {
    if (!query.trim()) return allHotkeys.value

    const lowerQuery = query.toLowerCase()
    return allHotkeys.value.filter(hotkey =>
      hotkey.keys.toLowerCase().includes(lowerQuery) ||
      hotkey.name?.toLowerCase().includes(lowerQuery) ||
      hotkey.description?.toLowerCase().includes(lowerQuery) ||
      hotkey.group?.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * 获取快捷键冲突
   */
  const getConflicts = (): Array<{ keys: string; hotkeys: HotkeyConfig[] }> => {
    const keyMap = new Map<string, HotkeyConfig[]>()

    for (const hotkey of allHotkeys.value) {
      if (!keyMap.has(hotkey.keys)) {
        keyMap.set(hotkey.keys, [])
      }
      keyMap.get(hotkey.keys)!.push(hotkey)
    }

    return Array.from(keyMap.entries())
      .filter(([_, hotkeys]) => hotkeys.length > 1)
      .map(([keys, hotkeys]) => ({ keys, hotkeys }))
  }

  /**
   * 导出快捷键配置
   */
  const exportConfig = () => {
    const config = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      hotkeys: allHotkeys.value.map(hotkey => ({
        id: hotkey.id,
        keys: hotkey.keys,
        type: hotkey.type,
        name: hotkey.name,
        description: hotkey.description,
        group: hotkey.group,
        enabled: hotkey.enabled,
        scope: hotkey.scope
      }))
    }

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hotkeys-config-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * 导入快捷键配置
   */
  const importConfig = async (config: any): Promise<boolean> => {
    try {
      if (!config.hotkeys || !Array.isArray(config.hotkeys)) {
        throw new Error('无效的配置文件格式')
      }

      const results = await registerBatch(config.hotkeys)
      const successCount = results.filter(Boolean).length

      console.log(`⌨️ 导入快捷键配置: ${successCount}/${config.hotkeys.length} 成功`)
      return successCount === config.hotkeys.length
    } catch (error) {
      console.error('⌨️ 导入快捷键配置失败:', error)
      return false
    }
  }

  /**
   * 重置为默认配置
   */
  const resetToDefault = async (): Promise<boolean> => {
    try {
      // 清除所有快捷键
      await clear()

      // 这里可以加载默认配置
      // 暂时返回true
      console.log('⌨️ 重置为默认配置')
      return true
    } catch (error) {
      console.error('⌨️ 重置为默认配置失败:', error)
      return false
    }
  }

  /**
   * 快捷键测试
   */
  const testHotkey = async (keys: string): Promise<boolean> => {
    try {
      // 这里可以实现快捷键测试逻辑
      console.log(`⌨️ 测试快捷键: ${keys}`)
      return true
    } catch (error) {
      console.error('⌨️ 测试快捷键失败:', error)
      return false
    }
  }

  /**
   * 生命周期管理
   */
  onMounted(async () => {
    await initialize()
  })

  onUnmounted(async () => {
    await destroy()
  })

  return {
    // 状态
    loading,
    error,
    registeredHotkeys,
    hotkeyGroups,
    currentScope,
    allHotkeys,
    globalHotkeys,
    applicationHotkeys,
    enabledHotkeys,
    disabledHotkeys,
    hotkeysByScope,
    hotkeyStats,

    // 基础方法
    clearError,
    setCurrentScope,
    registerHotkey,
    unregisterHotkey,
    toggleHotkey,
    registerHotkeys,
    unregisterHotkeys,
    clearAllHotkeys,
    clearHotkeysByType,
    getHotkeyConfig,
    isHotkeyRegistered,
    isHotkeyEnabled,
    getHotkeyGroup,
    getGroupNames,
    restoreFromCache,
    saveToCache,

    // 简化方法
    register,
    registerGlobal,
    registerApp,
    unregister,
    toggle,
    enable,
    disable,
    registerBatch,
    unregisterBatch,
    clear,
    clearByType,
    getConfig,
    isRegistered,
    isEnabled,
    getGroup,
    getGroups,

    // 扩展方法
    searchHotkeys,
    getConflicts,
    exportConfig,
    importConfig,
    resetToDefault,
    testHotkey,

    // 生命周期
    initialize,
    reset,
    destroy
  }
}
