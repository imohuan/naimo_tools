import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { pluginManager } from '@/core/plugin/PluginManager'
import type { PluginConfig } from '@/typings/pluginTypes'
import { searchEngine } from '@/core/search/SearchEngine'

/**
 * 插件状态管理 - 优化版
 * 简化API，去除重复功能，提升性能
 */
export const usePluginStore = defineStore('plugin', () => {
  // 基础状态
  const loading = ref(false)
  const error = ref<string | null>(null)
  const installedPlugins = ref<PluginConfig[]>([])

  // 计算属性
  const enabledPlugins = computed(() =>
    installedPlugins.value.filter(p => p.enabled)
  )

  const pluginCount = computed(() => installedPlugins.value.length)
  const enabledPluginCount = computed(() => enabledPlugins.value.length)

  // 内部工具函数
  const setLoading = (value: boolean) => {
    loading.value = value
  }

  const setError = (err: string | null) => {
    error.value = err
    if (err) {
      console.error('🔌 插件错误:', err)
    }
  }

  /**
   * 同步插件状态
   */
  const syncPluginState = () => {
    searchEngine.updatePluginCategories()
    installedPlugins.value = Array.from(pluginManager.installedPlugins.values())
  }

  /**
   * 初始化插件系统
   */
  const initialize = async () => {
    try {
      setLoading(true)
      setError(null)
      await pluginManager.initialize()
      syncPluginState()
      console.log('🔌 插件系统初始化完成')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '初始化插件系统失败'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  /**
   * 安装插件 - 统一安装接口
   */
  const install = async (source: PluginConfig | string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      let success = false

      if (typeof source === 'string') {
        // 字符串可能是 URL 或 ZIP 路径
        if (source.startsWith('http')) {
          success = await pluginManager.installUrl(source)
        } else {
          success = await pluginManager.installZip(source)
        }
      } else {
        success = await pluginManager.install(source)
      }

      if (success) {
        syncPluginState()
        console.log(`✅ 插件安装成功`)
      }

      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '安装插件失败'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * 卸载插件
   */
  const uninstall = async (pluginId: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const success = await pluginManager.uninstall(pluginId)
      if (success) {
        syncPluginState()
        console.log(`✅ 插件卸载成功: ${pluginId}`)
      }

      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '卸载插件失败'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * 切换插件状态
   */
  const toggle = async (pluginId: string, enabled?: boolean): Promise<boolean> => {
    try {
      const plugin = installedPlugins.value.find(p => p.id === pluginId)
      if (!plugin) return false

      const targetState = enabled !== undefined ? enabled : !plugin.enabled
      const success = await pluginManager.toggle(pluginId, targetState)

      if (success) {
        syncPluginState()
        console.log(`✅ 插件状态更新: ${pluginId} -> ${targetState ? '启用' : '禁用'}`)
      }

      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新插件状态失败'
      setError(errorMessage)
      return false
    }
  }

  /**
   * 批量操作
   */
  const batchToggle = async (pluginIds: string[], enabled: boolean): Promise<number> => {
    let successCount = 0

    for (const pluginId of pluginIds) {
      if (await toggle(pluginId, enabled)) {
        successCount++
      }
    }

    console.log(`🔄 批量${enabled ? '启用' : '禁用'}插件: ${successCount}/${pluginIds.length}`)
    return successCount
  }

  /**
   * 获取插件信息
   */
  const getPlugin = (pluginId: string): PluginConfig | undefined => {
    return installedPlugins.value.find(p => p.id === pluginId)
  }

  /**
   * 检查插件状态
   */
  const isInstalled = (pluginId: string): boolean => {
    return installedPlugins.value.some(p => p.id === pluginId)
  }

  const isEnabled = (pluginId: string): boolean => {
    const plugin = getPlugin(pluginId)
    return plugin?.enabled ?? false
  }

  /**
   * 搜索插件
   */
  const searchPlugins = (query: string): PluginConfig[] => {
    if (!query.trim()) return installedPlugins.value

    const queryLower = query.toLowerCase()
    return installedPlugins.value.filter(plugin =>
      plugin.name.toLowerCase().includes(queryLower) ||
      plugin.description?.toLowerCase().includes(queryLower) ||
      plugin.id.toLowerCase().includes(queryLower)
    )
  }

  /**
   * 按分类获取插件
   */
  const getPluginsByCategory = (category: string): PluginConfig[] => {
    return installedPlugins.value.filter(p => p.category === category)
  }

  /**
   * 重置状态
   */
  const reset = () => {
    pluginManager.reset()
    installedPlugins.value = []
    setError(null)
    setLoading(false)
  }

  return {
    // 只读状态
    loading: readonly(loading),
    error: readonly(error),
    installedPlugins: readonly(installedPlugins),

    // 计算属性
    enabledPlugins,
    pluginCount,
    enabledPluginCount,

    // 核心方法
    initialize,
    install,
    uninstall,
    toggle,
    batchToggle,

    // 查询方法
    getPlugin,
    isInstalled,
    isEnabled,
    searchPlugins,
    getPluginsByCategory,

    // 工具方法
    reset,
    clearError: () => setError(null)
  }
})