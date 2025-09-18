import { onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { usePluginStore } from '@/store/modules/plugin'
import type { PluginConfig, PluginItem, PluginCategoryType } from '@/typings/plugin-types'
import type { PluginHook, PluginCommand, PluginView } from '@/typings/core-types'

/**
 * 插件功能 Composable
 * 提供 Vue 组件友好的插件接口
 */
export function usePlugin() {
  const pluginStore = usePluginStore()

  // 解构响应式状态
  const {
    loading,
    error,
    installedPlugins,
    availablePlugins,
    pluginCategories,
    allPlugins,
    enabledPlugins,
    disabledPlugins,
    pluginsByCategory,
    pluginStats,
    totalPluginItems
  } = storeToRefs(pluginStore)

  // 解构方法
  const {
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
    getPluginConfig,
    setPluginConfig,
    checkPluginUpdates,
    updatePluginFromElectron,
    getPluginDirectory,
    initialize,
    reset,
    destroy
  } = pluginStore

  /**
   * 安装插件（简化接口）
   */
  const install = async (pluginData: PluginConfig): Promise<boolean> => {
    return await installPlugin(pluginData)
  }

  /**
   * 卸载插件（简化接口）
   */
  const uninstall = async (pluginId: string): Promise<boolean> => {
    return await unloadPlugin(pluginId)
  }

  /**
   * 启用插件
   */
  const enable = async (pluginId: string): Promise<boolean> => {
    return await togglePlugin(pluginId, true)
  }

  /**
   * 禁用插件
   */
  const disable = async (pluginId: string): Promise<boolean> => {
    return await togglePlugin(pluginId, false)
  }

  /**
   * 执行插件项目（简化接口）
   */
  const execute = async (item: PluginItem): Promise<void> => {
    await executePluginItem(item)
  }

  /**
   * 获取插件（简化接口）
   */
  const get = (pluginId: string): PluginConfig | undefined => {
    return getPlugin(pluginId)
  }

  /**
   * 根据分类获取插件（简化接口）
   */
  const getByCategory = (category: PluginCategoryType): PluginConfig[] => {
    return getPluginsByCategory(category)
  }

  /**
   * 获取插件项目（简化接口）
   */
  const getItems = (pluginId: string): PluginItem[] => {
    return getPluginItems(pluginId)
  }

  /**
   * 获取所有插件项目（简化接口）
   */
  const getAllItems = (): PluginItem[] => {
    return getAllPluginItems()
  }

  /**
   * 搜索插件（简化接口）
   */
  const search = (query: string): PluginConfig[] => {
    return searchPlugins(query)
  }

  /**
   * 搜索插件项目（简化接口）
   */
  const searchItems = (query: string): PluginItem[] => {
    return searchPluginItems(query)
  }

  /**
   * 获取插件命令（简化接口）
   */
  const getCommands = (): PluginCommand[] => {
    return getPluginCommands()
  }

  /**
   * 获取插件视图（简化接口）
   */
  const getViews = (): PluginView[] => {
    return getPluginViews()
  }

  /**
   * 注册插件钩子（简化接口）
   */
  const onHook = (event: string, handler: PluginHook) => {
    registerPluginHook(event, handler)
  }

  /**
   * 执行插件钩子（简化接口）
   */
  const emitHook = async (event: string, ...args: any[]) => {
    await executePluginHook(event, ...args)
  }

  /**
   * 批量安装插件
   */
  const installBatch = async (plugins: PluginConfig[]): Promise<boolean[]> => {
    const results: boolean[] = []

    for (const plugin of plugins) {
      const success = await install(plugin)
      results.push(success)
    }

    return results
  }

  /**
   * 批量卸载插件
   */
  const uninstallBatch = async (pluginIds: string[]): Promise<boolean[]> => {
    const results: boolean[] = []

    for (const pluginId of pluginIds) {
      const success = await uninstall(pluginId)
      results.push(success)
    }

    return results
  }

  /**
   * 批量启用插件
   */
  const enableBatch = async (pluginIds: string[]): Promise<boolean[]> => {
    const results: boolean[] = []

    for (const pluginId of pluginIds) {
      const success = await enable(pluginId)
      results.push(success)
    }

    return results
  }

  /**
   * 批量禁用插件
   */
  const disableBatch = async (pluginIds: string[]): Promise<boolean[]> => {
    const results: boolean[] = []

    for (const pluginId of pluginIds) {
      const success = await disable(pluginId)
      results.push(success)
    }

    return results
  }

  /**
   * 获取插件依赖
   */
  const getPluginDependencies = (pluginId: string): string[] => {
    const plugin = get(pluginId)
    return plugin?.options?.dependencies || []
  }

  /**
   * 检查插件依赖
   */
  const checkPluginDependencies = (pluginId: string): { satisfied: string[]; missing: string[] } => {
    const dependencies = getPluginDependencies(pluginId)
    const satisfied: string[] = []
    const missing: string[] = []

    for (const dep of dependencies) {
      if (get(dep)) {
        satisfied.push(dep)
      } else {
        missing.push(dep)
      }
    }

    return { satisfied, missing }
  }

  /**
   * 获取插件更新信息
   */
  const getPluginUpdates = async (): Promise<PluginConfig[]> => {
    try {
      // 这里需要实现检查插件更新的逻辑
      // 暂时返回空数组
      return []
    } catch (error) {
      console.error('🔌 获取插件更新信息失败:', error)
      return []
    }
  }

  /**
   * 更新插件（简化接口）
   */
  const update = async (pluginId: string): Promise<boolean> => {
    return await updatePluginFromElectron(pluginId)
  }

  /**
   * 获取插件配置（简化接口）
   */
  const getConfig = async (pluginId: string): Promise<any> => {
    return await getPluginConfig(pluginId)
  }

  /**
   * 设置插件配置（简化接口）
   */
  const setConfig = async (pluginId: string, config: any): Promise<boolean> => {
    return await setPluginConfig(pluginId, config)
  }

  /**
   * 检查更新（简化接口）
   */
  const checkUpdates = async (): Promise<PluginConfig[]> => {
    return await checkPluginUpdates()
  }

  /**
   * 获取插件目录（简化接口）
   */
  const getDirectory = async (): Promise<string> => {
    return await getPluginDirectory()
  }

  /**
   * 导出插件配置
   */
  const exportConfig = () => {
    const config = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      plugins: allPlugins.value.map(plugin => ({
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        enabled: plugin.enabled,
        category: plugin.category,
        options: plugin.options
      }))
    }

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plugins-config-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * 导入插件配置
   */
  const importConfig = async (config: any): Promise<boolean> => {
    try {
      if (!config.plugins || !Array.isArray(config.plugins)) {
        throw new Error('无效的配置文件格式')
      }

      const results = await installBatch(config.plugins)
      const successCount = results.filter(Boolean).length

      console.log(`🔌 导入插件配置: ${successCount}/${config.plugins.length} 成功`)
      return successCount === config.plugins.length
    } catch (error) {
      console.error('🔌 导入插件配置失败:', error)
      return false
    }
  }

  /**
   * 重置为默认配置
   */
  const resetToDefault = async (): Promise<boolean> => {
    try {
      // 卸载所有插件
      const pluginIds = allPlugins.value.map(p => p.id)
      await uninstallBatch(pluginIds)

      // 这里可以加载默认插件
      // 暂时返回true
      console.log('🔌 重置为默认配置')
      return true
    } catch (error) {
      console.error('🔌 重置为默认配置失败:', error)
      return false
    }
  }

  /**
   * 插件健康检查
   */
  const healthCheck = async (): Promise<{ healthy: string[]; unhealthy: string[] }> => {
    const healthy: string[] = []
    const unhealthy: string[] = []

    for (const plugin of allPlugins.value) {
      try {
        // 这里可以实现插件健康检查逻辑
        // 暂时认为所有插件都是健康的
        healthy.push(plugin.id)
      } catch (error) {
        unhealthy.push(plugin.id)
      }
    }

    return { healthy, unhealthy }
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
    installedPlugins,
    availablePlugins,
    pluginCategories,
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

    // 简化方法
    install,
    uninstall,
    enable,
    disable,
    execute,
    get,
    getByCategory,
    getItems,
    getAllItems,
    search,
    searchItems,
    getCommands,
    getViews,
    onHook,
    emitHook,

    // 批量操作
    installBatch,
    uninstallBatch,
    enableBatch,
    disableBatch,

    // 扩展方法
    getPluginDependencies,
    checkPluginDependencies,
    getPluginUpdates,
    exportConfig,
    importConfig,
    resetToDefault,
    healthCheck,

    // 简化方法
    update,
    getConfig,
    setConfig,
    checkUpdates,
    getDirectory,

    // 生命周期
    initialize,
    reset,
    destroy
  }
}
