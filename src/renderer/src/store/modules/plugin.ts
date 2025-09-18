import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { PluginConfig, PluginItem, PluginCategoryType } from '@/typings/plugin-types'
import { pluginManager } from '@/core/plugin/PluginManager'
import { electronPluginBridge } from '@/core/plugin/ElectronPluginBridge'
import type { PluginHook } from '@/typings/core-types'

/**
 * 插件状态管理
 */
export const usePluginStore = defineStore('plugin', () => {
  // 状态
  const loading = ref(false)
  const error = ref<string | null>(null)
  const installedPlugins = ref<Map<string, PluginConfig>>(new Map())
  const availablePlugins = ref<PluginConfig[]>([])
  const pluginCategories = ref<Map<string, PluginConfig[]>>(new Map())

  // 计算属性
  const allPlugins = computed(() => {
    return Array.from(installedPlugins.value.values())
  })

  const enabledPlugins = computed(() => {
    return allPlugins.value.filter(plugin => plugin.enabled)
  })

  const disabledPlugins = computed(() => {
    return allPlugins.value.filter(plugin => !plugin.enabled)
  })

  const pluginsByCategory = computed(() => {
    const categories = new Map<string, PluginConfig[]>()

    for (const plugin of allPlugins.value) {
      const category = plugin.category || 'other'
      if (!categories.has(category)) {
        categories.set(category, [])
      }
      categories.get(category)!.push(plugin)
    }

    return categories
  })

  const pluginStats = computed(() => {
    return {
      total: allPlugins.value.length,
      enabled: enabledPlugins.value.length,
      disabled: disabledPlugins.value.length,
      available: availablePlugins.value.length,
      byCategory: Object.fromEntries(pluginsByCategory.value)
    }
  })

  const totalPluginItems = computed(() => {
    return allPlugins.value.reduce((sum, plugin) => sum + plugin.items.length, 0)
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
    console.error('🔌 插件错误:', err)
  }

  const updatePlugin = (plugin: PluginConfig) => {
    installedPlugins.value.set(plugin.id, plugin)
  }

  const removePlugin = (pluginId: string) => {
    installedPlugins.value.delete(pluginId)
  }

  const updatePluginCategories = () => {
    pluginCategories.value = pluginsByCategory.value
  }

  /**
   * 加载插件
   */
  const loadPlugin = async (pluginData: PluginConfig): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()

      const success = await pluginManager.loadPlugin(pluginData)
      if (success) {
        updatePlugin(pluginData)
        updatePluginCategories()
        console.log(`🔌 加载插件成功: ${pluginData.name}`)
      } else {
        setError(`加载插件失败: ${pluginData.name}`)
      }

      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载插件失败'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * 卸载插件
   */
  const unloadPlugin = async (pluginId: string): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()

      const success = await pluginManager.unloadPlugin(pluginId)
      if (success) {
        removePlugin(pluginId)
        updatePluginCategories()
        console.log(`🔌 卸载插件成功: ${pluginId}`)
      } else {
        setError(`卸载插件失败: ${pluginId}`)
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
  const togglePlugin = async (pluginId: string, enabled: boolean): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()

      const success = await pluginManager.togglePlugin(pluginId, enabled)
      if (success) {
        const plugin = installedPlugins.value.get(pluginId)
        if (plugin) {
          const updatedPlugin = { ...plugin, enabled }
          updatePlugin(updatedPlugin)
          updatePluginCategories()
        }
        console.log(`🔌 切换插件状态成功: ${pluginId}`)
      } else {
        setError(`切换插件状态失败: ${pluginId}`)
      }

      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '切换插件状态失败'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * 执行插件项目
   */
  const executePluginItem = async (item: PluginItem): Promise<void> => {
    try {
      setLoading(true)
      clearError()

      await pluginManager.executePluginItem(item)
      console.log(`🔌 执行插件项目成功: ${item.name}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '执行插件项目失败'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 从Electron获取所有可用插件
   */
  const getAllAvailablePlugins = async (): Promise<PluginConfig[]> => {
    try {
      setLoading(true)
      clearError()

      const plugins = await electronPluginBridge.getPluginList()
      availablePlugins.value = plugins

      console.log('🔌 从Electron获取所有可用插件成功')
      return plugins
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取可用插件失败'
      setError(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }

  /**
   * 安装插件
   */
  const installPlugin = async (pluginData: PluginConfig): Promise<boolean> => {
    return await loadPlugin(pluginData)
  }

  /**
   * 从ZIP文件安装插件
   */
  const installPluginFromZip = async (zipPath: string): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()

      const success = await electronPluginBridge.installPluginFromZip(zipPath)
      if (success) {
        // 刷新插件列表
        await getAllAvailablePlugins()
        console.log(`🔌 从ZIP文件安装插件成功: ${zipPath}`)
      } else {
        setError(`从ZIP文件安装插件失败: ${zipPath}`)
      }
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '从ZIP文件安装插件失败'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * 获取插件
   */
  const getPlugin = (pluginId: string): PluginConfig | undefined => {
    return installedPlugins.value.get(pluginId)
  }

  /**
   * 根据分类获取插件
   */
  const getPluginsByCategory = (category: PluginCategoryType): PluginConfig[] => {
    return allPlugins.value.filter(plugin => plugin.category === category)
  }

  /**
   * 获取插件项目
   */
  const getPluginItems = (pluginId: string): PluginItem[] => {
    const plugin = installedPlugins.value.get(pluginId)
    return plugin?.items || []
  }

  /**
   * 获取所有插件项目
   */
  const getAllPluginItems = (): PluginItem[] => {
    const items: PluginItem[] = []
    for (const plugin of allPlugins.value) {
      items.push(...plugin.items)
    }
    return items
  }

  /**
   * 搜索插件
   */
  const searchPlugins = (query: string): PluginConfig[] => {
    if (!query.trim()) {
      return allPlugins.value
    }

    const lowerQuery = query.toLowerCase()
    return allPlugins.value.filter(plugin =>
      plugin.name.toLowerCase().includes(lowerQuery) ||
      plugin.description?.toLowerCase().includes(lowerQuery) ||
      plugin.author?.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * 搜索插件项目
   */
  const searchPluginItems = (query: string): PluginItem[] => {
    if (!query.trim()) {
      return getAllPluginItems()
    }

    const lowerQuery = query.toLowerCase()
    const items: PluginItem[] = []

    for (const plugin of allPlugins.value) {
      for (const item of plugin.items) {
        if (
          item.name.toLowerCase().includes(lowerQuery) ||
          item.description?.toLowerCase().includes(lowerQuery)
        ) {
          items.push(item)
        }
      }
    }

    return items
  }

  /**
   * 获取插件命令
   */
  const getPluginCommands = () => {
    return pluginManager.getCommands()
  }

  /**
   * 获取插件视图
   */
  const getPluginViews = () => {
    return pluginManager.getViews()
  }

  /**
   * 注册插件钩子
   */
  const registerPluginHook = (event: string, handler: PluginHook) => {
    pluginManager.registerHook(event, handler)
  }

  /**
   * 执行插件钩子
   */
  const executePluginHook = async (event: string, ...args: any[]) => {
    await pluginManager.executeHook(event, ...args)
  }

  /**
   * 获取插件配置
   */
  const getPluginConfig = async (pluginId: string): Promise<any> => {
    try {
      return await electronPluginBridge.getPluginConfig(pluginId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取插件配置失败'
      setError(errorMessage)
      return null
    }
  }

  /**
   * 设置插件配置
   */
  const setPluginConfig = async (pluginId: string, config: any): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()

      const success = await electronPluginBridge.setPluginConfig(pluginId, config)
      if (success) {
        console.log(`🔌 设置插件配置成功: ${pluginId}`)
      } else {
        setError(`设置插件配置失败: ${pluginId}`)
      }
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '设置插件配置失败'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * 检查插件更新
   */
  const checkPluginUpdates = async (): Promise<PluginConfig[]> => {
    try {
      setLoading(true)
      clearError()

      const updates = await electronPluginBridge.checkPluginUpdates()
      console.log(`🔌 检查插件更新: ${updates.length} 个更新`)
      return updates
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '检查插件更新失败'
      setError(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }

  /**
   * 更新插件
   */
  const updatePluginFromElectron = async (pluginId: string): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()

      const success = await electronPluginBridge.updatePlugin(pluginId)
      if (success) {
        // 刷新插件列表
        await getAllAvailablePlugins()
        console.log(`🔌 更新插件成功: ${pluginId}`)
      } else {
        setError(`更新插件失败: ${pluginId}`)
      }
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新插件失败'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * 获取插件目录
   */
  const getPluginDirectory = async (): Promise<string> => {
    try {
      return await electronPluginBridge.getPluginDirectory()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取插件目录失败'
      setError(errorMessage)
      return ''
    }
  }

  /**
   * 初始化插件管理器
   */
  const initialize = async () => {
    try {
      setLoading(true)
      await pluginManager.initialize()

      // 获取所有可用插件
      await getAllAvailablePlugins()

      console.log('🔌 插件Store初始化完成')
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
    installedPlugins.value.clear()
    availablePlugins.value = []
    pluginCategories.value.clear()
    error.value = null
    loading.value = false
  }

  /**
   * 销毁
   */
  const destroy = async () => {
    await pluginManager.destroy()
    reset()
    console.log('🔌 插件Store已销毁')
  }

  return {
    // 状态
    loading: readonly(loading),
    error: readonly(error),
    installedPlugins: readonly(installedPlugins),
    availablePlugins: readonly(availablePlugins),
    pluginCategories: readonly(pluginCategories),

    // 计算属性
    allPlugins,
    enabledPlugins,
    disabledPlugins,
    pluginsByCategory,
    pluginStats,
    totalPluginItems,

    // 基础方法
    clearError,
    loadPlugin,
    unloadPlugin,
    togglePlugin,
    executePluginItem,
    getAllAvailablePlugins,
    installPlugin,
    installPluginFromZip,
    getPlugin,
    getPluginsByCategory,
    getPluginItems,
    getAllPluginItems,
    searchPlugins,
    searchPluginItems,
    getPluginCommands,
    getPluginViews,
    registerPluginHook,
    executePluginHook,

    // Electron集成方法
    getPluginConfig,
    setPluginConfig,
    checkPluginUpdates,
    updatePluginFromElectron,
    getPluginDirectory,

    // 生命周期
    initialize,
    reset,
    destroy
  }
})
