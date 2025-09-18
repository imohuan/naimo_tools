import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { type HotkeyConfig, HotkeyType } from '@/typings/hotkey-types'
import { hotkeyManager } from '@/core/hotkey/HotkeyManager'

/**
 * 快捷键状态管理
 * 基于 HotkeyManager 的响应式状态管理
 */
export const useHotkeyStore = defineStore('hotkey', () => {
  // 状态
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentScope = ref('all')

  // 计算属性 - 基于 HotkeyManager 的数据
  const allHotkeys = computed(() => {
    return hotkeyManager.getAll()
  })

  const globalHotkeys = computed(() => {
    return hotkeyManager.getByType(HotkeyType.GLOBAL)
  })

  const applicationHotkeys = computed(() => {
    return hotkeyManager.getByType(HotkeyType.APPLICATION)
  })

  const enabledHotkeys = computed(() => {
    return allHotkeys.value.filter(hotkey => hotkey.enabled)
  })

  const disabledHotkeys = computed(() => {
    return allHotkeys.value.filter(hotkey => !hotkey.enabled)
  })

  const hotkeysByScope = computed(() => {
    return hotkeyManager.getByScope(currentScope.value)
  })

  const hotkeyStats = computed(() => {
    return hotkeyManager.getStats()
  })

  const hotkeyGroups = computed(() => {
    const groups = new Map<string, HotkeyConfig[]>()

    for (const hotkey of allHotkeys.value) {
      const group = hotkey.group || 'default'
      if (!groups.has(group)) {
        groups.set(group, [])
      }
      groups.get(group)!.push(hotkey)
    }

    return groups
  })

  // 方法
  const clearError = () => {
    error.value = null
  }

  const setLoading = (value: boolean) => {
    loading.value = value
  }

  const setError = (err: string) => {
    error.value = err
    console.error('⌨️ 快捷键错误:', err)
  }

  const setCurrentScope = (scope: string) => {
    currentScope.value = scope
    hotkeyManager.setScope(scope)
  }

  /**
   * 注册快捷键
   */
  const registerHotkey = async (config: HotkeyConfig): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()

      const success = await hotkeyManager.register(config)
      if (success) {
        console.log(`⌨️ 注册快捷键成功: ${config.id}`)
      } else {
        setError(`注册快捷键失败: ${config.id}`)
      }

      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '注册快捷键失败'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * 注销快捷键
   */
  const unregisterHotkey = async (id: string): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()

      const success = await hotkeyManager.unregister(id)
      if (success) {
        console.log(`⌨️ 注销快捷键成功: ${id}`)
      } else {
        setError(`注销快捷键失败: ${id}`)
      }

      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '注销快捷键失败'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * 切换快捷键状态
   */
  const toggleHotkey = async (id: string, enabled?: boolean): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()

      const success = await hotkeyManager.toggle(id, enabled)
      if (success) {
        console.log(`⌨️ 切换快捷键状态成功: ${id}`)
      } else {
        setError(`切换快捷键状态失败: ${id}`)
      }

      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '切换快捷键状态失败'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * 批量注册快捷键
   */
  const registerHotkeys = async (configs: HotkeyConfig[]): Promise<boolean[]> => {
    const results: boolean[] = []

    for (const config of configs) {
      const success = await registerHotkey(config)
      results.push(success)
    }

    return results
  }

  /**
   * 批量注销快捷键
   */
  const unregisterHotkeys = async (ids: string[]): Promise<boolean[]> => {
    const results: boolean[] = []

    for (const id of ids) {
      const success = await unregisterHotkey(id)
      results.push(success)
    }

    return results
  }

  /**
   * 清除所有快捷键
   */
  const clearAllHotkeys = async (): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()

      await hotkeyManager.clear()
      console.log('⌨️ 清除所有快捷键成功')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '清除快捷键失败'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * 根据类型清除快捷键
   */
  const clearHotkeysByType = async (type: HotkeyType): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()

      await hotkeyManager.clearByType(type)
      console.log(`⌨️ 清除 ${type} 类型快捷键成功`)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '清除快捷键失败'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * 获取快捷键配置
   */
  const getHotkeyConfig = (id: string): HotkeyConfig | undefined => {
    return hotkeyManager.getConfig(id)
  }

  /**
   * 检查快捷键是否已注册
   */
  const isHotkeyRegistered = (id: string): boolean => {
    return hotkeyManager.isRegistered(id)
  }

  /**
   * 检查快捷键是否启用
   */
  const isHotkeyEnabled = (id: string): boolean => {
    const config = hotkeyManager.getConfig(id)
    return config?.enabled ?? false
  }

  /**
   * 获取快捷键分组
   */
  const getHotkeyGroup = (group: string): HotkeyConfig[] => {
    return hotkeyGroups.value.get(group) || []
  }

  /**
   * 获取所有分组名称
   */
  const getGroupNames = (): string[] => {
    return Array.from(hotkeyGroups.value.keys())
  }


  /**
   * 初始化快捷键管理器
   */
  const initialize = async () => {
    try {
      setLoading(true)
      await hotkeyManager.initialize()
      console.log('⌨️ 快捷键Store初始化完成')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '初始化失败'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 重置状态
   */
  const reset = () => {
    currentScope.value = 'all'
    error.value = null
    loading.value = false
  }

  /**
   * 销毁
   */
  const destroy = async () => {
    await hotkeyManager.destroy()
    reset()
    console.log('⌨️ 快捷键Store已销毁')
  }

  return {
    // 状态
    loading: readonly(loading),
    error: readonly(error),
    currentScope: readonly(currentScope),

    // 计算属性
    allHotkeys,
    globalHotkeys,
    applicationHotkeys,
    enabledHotkeys,
    disabledHotkeys,
    hotkeysByScope,
    hotkeyStats,
    hotkeyGroups,

    // 方法
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
    initialize,
    reset,
    destroy
  }
})
