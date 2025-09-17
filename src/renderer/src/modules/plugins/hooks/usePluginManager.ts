import { ref, computed } from 'vue'
import { pluginManager } from '../config/plugin-manager'
import type { PluginConfig, PluginItem } from '@/typings/plugin-types'

// 使用 import.meta.glob 动态加载示例插件
const examplePluginModules = import.meta.glob('./examples/*.ts', { eager: true })

/**
 * 插件管理组合式函数
 */
export function usePluginManager() {
  const plugins = ref<PluginConfig[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const enabledPlugins = computed(() => plugins.value.filter(p => p.enabled))
  const disabledPlugins = computed(() => plugins.value.filter(p => !p.enabled))
  const pluginCount = computed(() => plugins.value.length)
  const enabledPluginCount = computed(() => enabledPlugins.value.length)

  /**
   * 加载所有插件
   */
  const loadPlugins = async (): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      console.log('🔌 开始加载插件列表...')
      const loadedPlugins = await pluginManager.loadAllPlugins()
      plugins.value = loadedPlugins
      console.log('✅ 插件列表加载完成:', loadedPlugins.map((p: PluginConfig) => ({ id: p.id, name: p.name, enabled: p.enabled })))
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载插件失败'
      console.error('❌ 加载插件列表失败:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 安装插件
   */
  const installPlugin = async (pluginConfig: PluginConfig): Promise<boolean> => {
    try {
      console.log(`📦 安装插件: ${pluginConfig.id}`)
      const success = await pluginManager.installPlugin(pluginConfig)

      if (success) {
        // 重新加载插件列表
        // await loadPlugins()
        console.log(`✅ 插件安装成功: ${pluginConfig.id}`)
      } else {
        console.error(`❌ 插件安装失败: ${pluginConfig.id}`)
      }

      return success
    } catch (err) {
      error.value = err instanceof Error ? err.message : '安装插件失败'
      console.error(`❌ 安装插件异常: ${pluginConfig.id}`, err)
      return false
    }
  }

  /**
   * 卸载插件
   */
  const uninstallPlugin = async (pluginId: string): Promise<boolean> => {
    try {
      console.log(`🗑️ 卸载插件: ${pluginId}`)
      const success = await pluginManager.uninstallPlugin(pluginId)

      if (success) {
        // 从本地列表中移除
        plugins.value = plugins.value.filter(p => p.id !== pluginId)
        console.log(`✅ 插件卸载成功: ${pluginId}`)
      } else {
        console.error(`❌ 插件卸载失败: ${pluginId}`)
      }

      return success
    } catch (err) {
      error.value = err instanceof Error ? err.message : '卸载插件失败'
      console.error(`❌ 卸载插件异常: ${pluginId}`, err)
      return false
    }
  }

  /**
   * 启用/禁用插件
   */
  const togglePlugin = async (pluginId: string, enabled: boolean): Promise<boolean> => {
    try {
      console.log(`🔄 切换插件状态: ${pluginId} -> ${enabled ? '启用' : '禁用'}`)
      const success = await pluginManager.togglePlugin(pluginId, enabled)

      if (success) {
        // 更新本地状态
        const plugin = plugins.value.find(p => p.id === pluginId)
        if (plugin) {
          plugin.enabled = enabled
          plugin.metadata = {
            ...plugin.metadata,
            createdAt: plugin.metadata?.createdAt || Date.now(),
            installedAt: plugin.metadata?.installedAt || Date.now(),
            updatedAt: Date.now()
          }
        }
        console.log(`✅ 插件状态更新成功: ${pluginId}`)
      } else {
        console.error(`❌ 插件状态更新失败: ${pluginId}`)
      }

      return success
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新插件状态失败'
      console.error(`❌ 更新插件状态异常: ${pluginId}`, err)
      return false
    }
  }

  /**
   * 执行插件项目
   */
  const executePluginItem = async (item: PluginItem): Promise<void> => {
    try {
      console.log(`🚀 执行插件项目: ${item.name}`)
      await pluginManager.executePluginItem(item)
      console.log(`✅ 插件项目执行成功: ${item.name}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '执行插件项目失败'
      console.error(`❌ 执行插件项目异常: ${item.name}`, err)
      throw err
    }
  }

  /**
   * 获取插件详情
   */
  const getPlugin = (pluginId: string): PluginConfig | undefined => {
    return plugins.value.find(p => p.id === pluginId)
  }

  /**
   * 检查插件是否已安装
   */
  const isPluginInstalled = (pluginId: string): boolean => {
    return plugins.value.some(p => p.id === pluginId)
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
    return getPluginItems(pluginId).filter(item => item.visible)
  }

  /**
   * 清除错误信息
   */
  const clearError = (): void => {
    error.value = null
  }

  /**
   * 重新加载插件
   */
  const reloadPlugins = async (): Promise<void> => {
    await loadPlugins()
  }

  return {
    // 状态
    plugins,
    enabledPlugins,
    disabledPlugins,
    pluginCount,
    enabledPluginCount,
    loading,
    error,

    // 方法
    loadPlugins,
    installPlugin,
    uninstallPlugin,
    togglePlugin,
    executePluginItem,
    getPlugin,
    isPluginInstalled,
    getPluginItems,
    getVisiblePluginItems,
    clearError,
    reloadPlugins
  }
}

/**
 * 获取所有示例插件
 */
export function getAllExamplePlugins() {
  const plugins: any[] = []

  for (const path in examplePluginModules) {
    const module = examplePluginModules[path] as any
    if (module && typeof module === 'object') {
      // 检查模块导出的内容
      if (module.default && Array.isArray(module.default)) {
        // 如果默认导出是数组，直接添加
        plugins.push(...module.default)
      } else if (module.default && typeof module.default === 'object') {
        // 如果默认导出是单个插件对象，添加到数组
        plugins.push(module.default)
      } else {
        // 检查其他可能的导出
        Object.values(module).forEach((exported: any) => {
          if (exported && typeof exported === 'object') {
            if (Array.isArray(exported)) {
              plugins.push(...exported)
            } else if (exported.id && exported.name) {
              plugins.push(exported)
            }
          }
        })
      }
    }
  }

  console.log(
    '🔌 动态加载的示例插件:',
    plugins.map((p) => ({ id: p.id, name: p.name }))
  )
  return plugins
}

// 导出示例插件列表（兼容性）
export const examplePlugins = getAllExamplePlugins()

// 导出插件管理器实例
export { pluginManager }

// 导出类型
export type { PluginConfig, PluginManager, PluginItem } from '@/typings/plugin-types'