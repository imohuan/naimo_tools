/**
 * 增强模块状态管理
 * 管理增强版模块的状态和配置
 */

import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { useSearchEnhanced } from '@/modules/search/enhanced/useSearchEnhanced'
import { useHotkeyManagerEnhanced } from '@/modules/hotkeys/enhanced/HotkeyManagerEnhanced'
import { usePluginManagerEnhanced } from '@/modules/plugins/enhanced/PluginManagerEnhanced'
import { useDownloadManagerEnhanced } from '@/modules/downloads/enhanced/DownloadManagerEnhanced'

export const useEnhancedStore = defineStore('enhanced', () => {
  // 模块实例
  const searchEngine = ref<ReturnType<typeof useSearchEnhanced> | null>(null)
  const hotkeyManager = ref<ReturnType<typeof useHotkeyManagerEnhanced> | null>(null)
  const pluginManager = ref<ReturnType<typeof usePluginManagerEnhanced> | null>(null)
  const downloadManager = ref<ReturnType<typeof useDownloadManagerEnhanced> | null>(null)

  // 初始化状态
  const initializedModules = ref<Set<string>>(new Set())
  const isFullyInitialized = computed(() => initializedModules.value.size === 4)

  // 统计信息
  const moduleStats = computed(() => ({
    search: searchEngine.value?.searchStats || null,
    hotkey: hotkeyManager.value?.statistics || null,
    plugin: pluginManager.value?.stats || null,
    download: downloadManager.value?.stats || null
  }))

  /**
   * 初始化搜索模块
   */
  const initializeSearchEngine = async (attachedFiles: any) => {
    try {
      searchEngine.value = useSearchEnhanced([], {
        enableKeyboardNav: true,
        enableSearchHistory: true,
        enableSearchSuggestions: true
      })

      // 这里可以加载默认分类数据
      // await searchEngine.value.initializeSearch(defaultCategories)

      initializedModules.value.add('search')
      console.log('🔍 增强搜索引擎初始化完成')
    } catch (error) {
      console.error('❌ 搜索引擎初始化失败:', error)
      throw error
    }
  }

  /**
   * 初始化热键管理器
   */
  const initializeHotkeyManager = async () => {
    try {
      hotkeyManager.value = useHotkeyManagerEnhanced({
        enableConflictDetection: true,
        enableUsageTracking: true,
        enablePersistence: true,
        maxBindings: 100
      })

      // 注册默认热键
      const defaultHotkeys = [
        { id: 'search-focus', combination: 'ctrl+k', eventType: 'search-focus', description: '聚焦搜索框' },
        { id: 'escape', combination: 'escape', eventType: 'escape', description: '取消操作' },
        { id: 'settings', combination: 'ctrl+comma', eventType: 'open-settings', description: '打开设置' }
      ]

      defaultHotkeys.forEach(hotkey => {
        hotkeyManager.value?.registerHotkey(
          hotkey.id,
          hotkey.combination,
          hotkey.eventType as any,
          { description: hotkey.description, category: 'system' }
        )
      })

      initializedModules.value.add('hotkey')
      console.log('🔥 增强热键管理器初始化完成')
    } catch (error) {
      console.error('❌ 热键管理器初始化失败:', error)
      throw error
    }
  }

  /**
   * 初始化插件管理器
   */
  const initializePluginManager = async () => {
    try {
      pluginManager.value = usePluginManagerEnhanced({
        maxConcurrentLoads: 5,
        enablePerformanceMonitoring: true,
        enableCaching: true,
        enableDependencyCheck: true
      })

      initializedModules.value.add('plugin')
      console.log('🔌 增强插件管理器初始化完成')
    } catch (error) {
      console.error('❌ 插件管理器初始化失败:', error)
      throw error
    }
  }

  /**
   * 初始化下载管理器
   */
  const initializeDownloadManager = async () => {
    try {
      downloadManager.value = useDownloadManagerEnhanced({
        maxConcurrentDownloads: 3,
        enableResume: true,
        enableSpeedLimit: false,
        autoCleanupCompleted: true
      })

      initializedModules.value.add('download')
      console.log('📥 增强下载管理器初始化完成')
    } catch (error) {
      console.error('❌ 下载管理器初始化失败:', error)
      throw error
    }
  }

  /**
   * 初始化所有模块
   */
  const initializeAll = async (options: {
    attachedFiles?: any
    skipModules?: string[]
  } = {}) => {
    const { attachedFiles, skipModules = [] } = options

    try {
      const initTasks = []

      if (!skipModules.includes('search')) {
        initTasks.push(initializeSearchEngine(attachedFiles))
      }

      if (!skipModules.includes('hotkey')) {
        initTasks.push(initializeHotkeyManager())
      }

      if (!skipModules.includes('plugin')) {
        initTasks.push(initializePluginManager())
      }

      if (!skipModules.includes('download')) {
        initTasks.push(initializeDownloadManager())
      }

      await Promise.all(initTasks)
      console.log('🚀 所有增强模块初始化完成')
    } catch (error) {
      console.error('❌ 增强模块初始化失败:', error)
      throw error
    }
  }

  /**
   * 获取模块实例
   */
  const getSearchEngine = () => searchEngine.value
  const getHotkeyManager = () => hotkeyManager.value
  const getPluginManager = () => pluginManager.value
  const getDownloadManager = () => downloadManager.value

  /**
   * 检查模块是否已初始化
   */
  const isModuleInitialized = (moduleName: string) => {
    return initializedModules.value.has(moduleName)
  }

  /**
   * 获取所有模块的性能报告
   */
  const getPerformanceReport = () => {
    return {
      search: searchEngine.value?.searchEngine.getSearchStats(),
      hotkey: hotkeyManager.value?.statistics.value,
      plugin: pluginManager.value?.stats.value,
      download: downloadManager.value?.stats.value,
      cacheStats: {
        search: searchEngine.value?.cacheStats.value,
        // 其他模块的缓存统计...
      }
    }
  }

  /**
   * 导出所有配置
   */
  const exportAllConfigs = () => {
    return {
      search: searchEngine.value?.exportSearchData(),
      hotkey: hotkeyManager.value?.exportConfig(),
      plugin: pluginManager.value?.exportData(),
      download: downloadManager.value?.exportData(),
      exportedAt: Date.now()
    }
  }

  /**
   * 导入所有配置
   */
  const importAllConfigs = (configs: any) => {
    try {
      if (configs.search && searchEngine.value) {
        searchEngine.value.importSearchData(configs.search)
      }
      if (configs.hotkey && hotkeyManager.value) {
        hotkeyManager.value.importConfig(configs.hotkey)
      }
      if (configs.plugin && pluginManager.value) {
        pluginManager.value.importData(configs.plugin)
      }
      if (configs.download && downloadManager.value) {
        downloadManager.value.importData(configs.download)
      }
      console.log('✅ 配置导入完成')
      return true
    } catch (error) {
      console.error('❌ 配置导入失败:', error)
      return false
    }
  }

  /**
   * 重置所有模块
   */
  const resetAll = () => {
    searchEngine.value?.cleanup()
    hotkeyManager.value?.reset()
    pluginManager.value = null
    downloadManager.value = null

    initializedModules.value.clear()
    console.log('🔄 所有增强模块已重置')
  }

  return {
    // 只读状态
    initializedModules: readonly(initializedModules),
    isFullyInitialized,
    moduleStats,

    // 初始化方法
    initializeSearchEngine,
    initializeHotkeyManager,
    initializePluginManager,
    initializeDownloadManager,
    initializeAll,

    // 获取模块实例
    getSearchEngine,
    getHotkeyManager,
    getPluginManager,
    getDownloadManager,

    // 工具方法
    isModuleInitialized,
    getPerformanceReport,
    exportAllConfigs,
    importAllConfigs,
    resetAll
  }
})
