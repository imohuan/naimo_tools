import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { pluginManager } from '@/core/plugin/PluginManager'
import type { PluginConfig } from '@/typings/pluginTypes'
import { searchEngine } from '@/core/search/SearchEngine'
import { hotkeyManager } from '@/core/hotkey/HotkeyManager'
import { HotkeyType } from '@/typings/hotkeyTypes'

/**
 * 插件状态管理 - 优化版
 * 简化API，去除重复功能，提升性能
 */
export const usePluginStore = defineStore('plugin', () => {
  // 基础状态
  const loading = ref(false)
  const loadingGithubPlugins = ref(false) // GitHub插件加载状态
  const error = ref<string | null>(null)
  const installedPlugins = ref<PluginConfig[]>([])
  const allPlugins = ref<PluginConfig[]>([])

  // 事件监听器清理函数
  const eventCleanupFunctions: Array<() => void> = []

  // 计算属性
  const enabledPlugins = computed(() =>
    installedPlugins.value.filter(p => p.enabled)
  )

  // 插件列表（包含所有可用插件）
  const pluginList = computed(() => allPlugins.value)

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
    allPlugins.value = Array.from(pluginManager.allAvailablePlugins.values())
  }

  /**
   * 设置事件监听器
   * 监听来自其他 view 的插件安装/卸载/快捷键更新事件
   */
  const setupEventListeners = () => {
    // 监听插件安装事件
    const unsubscribeInstalled = naimo.event.onPluginInstalled(async (_event, data) => {
      console.log(`📥 [Store] 接收到插件安装事件: ${data.pluginId}`)

      try {
        // 1. 重新获取插件列表（包含新安装的插件）
        await pluginManager.updatePluginList()

        // 2. 找到新安装的插件配置
        const plugin = pluginManager.allAvailablePlugins.get(data.pluginId)

        if (plugin) {
          // 3. 在当前view中静默安装这个插件（不广播事件，避免循环）
          await pluginManager.preInstall(plugin, true, true)
          console.log(`✅ [Store] 已在当前view中同步安装插件: ${data.pluginId}`)

          // 4. 同步状态到 Vue 响应式系统并更新搜索引擎
          syncPluginState()
          console.log(`🔄 [Store] 已同步插件状态和搜索引擎`)
        } else {
          console.warn(`⚠️ [Store] 未找到插件配置: ${data.pluginId}`)
        }
      } catch (err) {
        console.error(`❌ [Store] 同步安装插件失败: ${data.pluginId}`, err)
        setError(err instanceof Error ? err.message : '同步安装插件失败')
      }
    })

    // 监听插件卸载事件
    const unsubscribeUninstalled = naimo.event.onPluginUninstalled(async (_event, data) => {
      console.log(`📥 [Store] 接收到插件卸载事件: ${data.pluginId}`)

      try {
        // 调用 PluginManager 的内部卸载方法（不删除文件，不广播事件）
        await pluginManager.uninstallInternal(data.pluginId)
        console.log(`✅ [Store] 已在当前view中同步卸载插件: ${data.pluginId}`)

        // 重新获取插件列表（此时已不包含被卸载的插件）
        await pluginManager.updatePluginList()

        // 同步状态到 Vue 响应式系统并更新搜索引擎
        syncPluginState()
        console.log(`🔄 [Store] 已同步插件状态和搜索引擎`)
      } catch (err) {
        console.error(`❌ [Store] 同步卸载插件失败: ${data.pluginId}`, err)
        setError(err instanceof Error ? err.message : '同步卸载插件失败')
      }
    })

    // 监听快捷键更新事件
    const unsubscribeHotkeyUpdated = naimo.event.onHotkeyUpdated((_event, data) => {
      console.log(`📥 [Store] 接收到快捷键更新事件: ${data.hotkeyId}`, data)

        ; (async () => {
          try {
            const { hotkeyId, name, keys, enabled, type } = data

            // 如果快捷键被删除（keys为空）
            if (!keys) {
              console.log(`⌨️ [Store] 快捷键已删除，注销: ${hotkeyId}`)
              // autoSave=false, silent=true 避免循环
              await hotkeyManager.unregister(hotkeyId, false, true)
            } else {
              // 更新快捷键配置
              const hotkeyType = type === 'global' ? HotkeyType.GLOBAL : HotkeyType.APPLICATION

              // 先尝试注销旧的快捷键（如果存在）
              const existingHotkey = hotkeyManager.getAll().find(h => h.id === hotkeyId)
              if (existingHotkey) {
                // autoSave=false, silent=true 避免循环
                await hotkeyManager.unregister(hotkeyId, false, true)
              }

              // 如果启用，则重新注册
              if (enabled) {
                const hotkeyConfig = {
                  id: hotkeyId,
                  keys,
                  type: hotkeyType,
                  enabled,
                  // 优先使用事件中的 name，其次是已存在的 name，最后使用 hotkeyId
                  name: name || existingHotkey?.name || hotkeyId,
                  description: existingHotkey?.description || ''
                }
                // autoSave=false, silent=true 避免循环
                await hotkeyManager.register(hotkeyConfig, false, true)
                console.log(`✅ [Store] 已在当前view中同步更新快捷键: ${hotkeyId} (name: ${hotkeyConfig.name})`)
              } else {
                // silent=true 避免循环
                await hotkeyManager.updateConfig(hotkeyId, { keys, enabled, name: name || existingHotkey?.name }, true)
                console.log(`✅ [Store] 已在当前view中同步禁用快捷键: ${hotkeyId}`)
              }
            }
          } catch (err) {
            console.error(`❌ [Store] 同步快捷键更新失败: ${data.hotkeyId}`, err)
          }
        })()
    })

    // 保存清理函数
    eventCleanupFunctions.push(unsubscribeInstalled, unsubscribeUninstalled, unsubscribeHotkeyUpdated)
    console.log('🎧 [Store] 插件和快捷键事件监听器已设置')
  }

  /**
   * 清理事件监听器
   */
  const cleanupEventListeners = () => {
    eventCleanupFunctions.forEach(cleanup => cleanup())
    eventCleanupFunctions.length = 0
    console.log('🧹 [Store] 插件事件监听器已清理')
  }

  /**
   * 初始化插件系统
   */
  const initialize = async () => {
    try {
      setLoading(true)
      setError(null)

      // 初始化 PluginManager
      await pluginManager.initialize()

      // 同步状态到 Vue 响应式系统
      syncPluginState()

      // 设置事件监听器（监听来自其他 view 的插件安装/卸载事件）
      setupEventListeners()

      console.log('🔌 插件系统初始化完成')
      console.log('📊 已安装插件数量:', installedPlugins.value.length)
      console.log('📊 可用插件数量:', allPlugins.value.length)
      console.log('📊 PluginManager.allAvailablePlugins 数量:', pluginManager.allAvailablePlugins.size)
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
   * 加载异步插件列表（GitHub插件）
   */
  const loadAsyncPluginList = async (): Promise<void> => {
    try {
      // 使用独立的loading状态，不影响已安装插件的显示
      loadingGithubPlugins.value = true
      console.log('🔄 开始加载GitHub插件列表...')
      await pluginManager.loadAsyncPluginList()
      syncPluginState()
      console.log('✅ GitHub插件列表加载完成，新增插件数量:', pluginManager.githubPlugins.length)
      console.log('📊 总可用插件数量:', allPlugins.value.length)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载插件列表失败'
      setError(errorMessage)
      console.error('❌ 加载插件列表失败:', err)
    } finally {
      loadingGithubPlugins.value = false
    }
  }

  /**
   * 通过URL安装插件
   */
  const installUrl = async (url: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)
      const success = await pluginManager.installUrl(url)
      if (success) {
        syncPluginState()
        console.log(`✅ 插件从URL安装成功: ${url}`)
      }
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '从URL安装插件失败'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * 通过ZIP文件安装插件
   */
  const installZip = async (zipPath: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)
      const success = await pluginManager.installZip(zipPath)
      if (success) {
        syncPluginState()
        console.log(`✅ 插件从ZIP安装成功: ${zipPath}`)
      }
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '从ZIP安装插件失败'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * 检查插件是否已安装（别名方法）
   */
  const isPluginInstalled = (pluginId: string): boolean => {
    return isInstalled(pluginId)
  }

  /**
   * 重置状态
   */
  const reset = () => {
    // 清理事件监听器
    cleanupEventListeners()

    // 重置 PluginManager
    pluginManager.reset()

    // 重置响应式状态
    installedPlugins.value = []
    allPlugins.value = []
    setError(null)
    setLoading(false)

    console.log('🔄 插件系统已重置')
  }

  return {
    // 只读状态
    loading: readonly(loading),
    loadingGithubPlugins: readonly(loadingGithubPlugins),
    error: readonly(error),
    installedPlugins: readonly(installedPlugins),
    pluginList,

    // 计算属性
    enabledPlugins,
    pluginCount,
    enabledPluginCount,

    // 核心方法
    initialize,
    install,
    installUrl,
    installZip,
    uninstall,
    toggle,
    batchToggle,
    loadAsyncPluginList,

    // 查询方法
    getPlugin,
    isInstalled,
    isPluginInstalled,
    isEnabled,
    searchPlugins,
    getPluginsByCategory,

    // 工具方法
    reset,
    clearError: () => setError(null)
  }
})