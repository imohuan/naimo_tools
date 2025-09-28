import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { pluginManager } from '@/core/plugin/PluginManager'
import type { PluginConfig, PluginItem } from '@/typings/pluginTypes'
import { searchEngine } from '@/core/search/SearchEngine'

/**
 * 插件状态管理
 * 只负责状态管理，具体逻辑委托给 PluginManager
 */
export const usePluginStore = defineStore('plugin', () => {
  // 基础状态
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pluginList = ref<PluginConfig[]>([])
  const installedPlugins = ref<PluginConfig[]>([])


  const enabledPlugins = computed(() =>
    installedPlugins.value.filter(p => p.enabled)
  )

  const disabledPlugins = computed(() =>
    installedPlugins.value.filter(p => !p.enabled)
  )

  const pluginCount = computed(() => installedPlugins.value.length)
  const enabledPluginCount = computed(() => enabledPlugins.value.length)

  // 方法
  const clearError = () => {
    error.value = null
  }

  const setLoading = (value: boolean) => {
    loading.value = value
  }

  const setError = (err: string) => {
    error.value = err
    console.error('🔌 插件错误:', err)
  }

  /**
   * 同步插件状态到响应式数据
   * 通用方法，用于在插件操作后更新状态
   */
  const syncPluginState = () => {
    searchEngine.updatePluginCategories()
    pluginList.value = Array.from(pluginManager.allAvailablePlugins.values())
    installedPlugins.value = Array.from(pluginManager.installedPlugins.values())
  }

  /**
   * 初始化插件系统
   */
  const initialize = async () => {
    try {
      setLoading(true)
      clearError()
      await pluginManager.initialize()

      // 同步数据到响应式状态
      syncPluginState()
      console.log('🔌 插件系统初始化完成')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '初始化插件系统失败'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }


  const loadAsyncPluginList = async () => {
    try {
      setLoading(true)
      clearError()
      await pluginManager.loadAsyncPluginList(true)
      syncPluginState()
      console.log('🔌 远程数据加载完成')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载远程插件列表失败'
      setError(errorMessage)
      console.error('❌ 加载远程插件列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  // 等待插件系统初始化完成 loadAsyncPluginList


  /**
   * 安装插件
   */
  const install = async (pluginData: PluginConfig): Promise<boolean> => {
    try {
      const success = await pluginManager.install(pluginData)
      if (success) {
        // 同步数据到响应式状态
        syncPluginState()
        console.log(`✅ 插件安装成功: ${pluginData.id}`)
      } else {
        console.error(`❌ 插件安装失败: ${pluginData.id}`)
      }
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '安装插件失败'
      setError(errorMessage)
      console.error(`❌ 安装插件异常: ${pluginData.id}`, err)
      return false
    }
  }

  const installZip = async (zipPath: string): Promise<boolean> => {
    const success = await pluginManager.installZip(zipPath)
    if (success) {
      syncPluginState()
      console.log(`✅ 插件安装成功: ${zipPath}`)
      return true
    }
    console.error(`❌ 安装插件失败: ${zipPath}`)
    return false
  }

  const installUrl = async (url: string): Promise<boolean> => {
    const success = await pluginManager.installUrl(url)
    if (success) {
      syncPluginState()
      console.log(`✅ 插件安装成功: ${url}`)
      return true
    }
    console.error(`❌ 安装插件失败: ${url}`)
    return false
  }

  /**
   * 卸载插件
   */
  const uninstall = async (pluginId: string): Promise<boolean> => {
    try {
      const success = await pluginManager.uninstall(pluginId)
      if (success) {
        // 同步数据到响应式状态
        syncPluginState()
        console.log(`✅ 插件卸载成功: ${pluginId}`)
      } else {
        console.error(`❌ 插件卸载失败: ${pluginId}`)
      }
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '卸载插件失败'
      setError(errorMessage)
      console.error(`❌ 卸载插件异常: ${pluginId}`, err)
      return false
    }
  }

  /**
   * 启用/禁用插件
   */
  const toggle = async (pluginId: string, enabled: boolean): Promise<boolean> => {
    try {
      const success = await pluginManager.toggle(pluginId, enabled)
      if (success) {
        // 同步数据到响应式状态
        syncPluginState()
        console.log(`✅ 插件状态更新成功: ${pluginId}`)
      } else {
        console.error(`❌ 插件状态更新失败: ${pluginId}`)
      }
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新插件状态失败'
      setError(errorMessage)
      console.error(`❌ 更新插件状态异常: ${pluginId}`, err)
      return false
    }
  }

  /**
   * 检查插件是否已安装
   */
  const isPluginInstalled = (pluginId: string): boolean => {
    return installedPlugins.value.some(p => p.id === pluginId)
  }

  /**
   * 获取插件详情
   */
  const getPlugin = (pluginId: string): PluginConfig | undefined => {
    return installedPlugins.value.find(p => p.id === pluginId)
  }

  /**
   * 获取插件的所有项目
   */
  const getPluginItems = (pluginId: string): PluginItem[] => {
    const plugin = getPlugin(pluginId)
    return plugin ? plugin.items : []
  }

  /**
   * 获取插件的可见项目
   */
  const getVisiblePluginItems = (pluginId: string): PluginItem[] => {
    return getPluginItems(pluginId).filter(item => !item.hidden)
  }

  const reset = () => {
    pluginManager.reset()
    pluginList.value = []
    installedPlugins.value = []
    error.value = null
    loading.value = false
  }

  const destroy = async () => {
    await pluginManager.destroy()
    reset()
  }

  return {
    // 状态
    loading: readonly(loading),
    error: readonly(error),
    pluginList: readonly(pluginList),
    installedPlugins: readonly(installedPlugins),

    // 计算属性
    enabledPlugins,
    disabledPlugins,
    pluginCount,
    enabledPluginCount,

    // 基础方法
    clearError,
    initialize,
    install,
    installZip,
    installUrl,
    uninstall,
    toggle,
    isPluginInstalled,
    getPlugin,
    getPluginItems,
    getVisiblePluginItems,
    reset,
    destroy,
    loadAsyncPluginList
  }
})
