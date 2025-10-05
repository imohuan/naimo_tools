import { defineStore } from 'pinia'
import { useUIStore } from './modules/ui'
import { useCacheStore } from './modules/cache'
import { useSearchStore } from './modules/search'
import { usePluginStoreNew } from './modules/plugin'
import { useHotkeyStore } from './modules/hotkey'

/**
 * 根 Store - 统一管理所有子模块
 * 
 * 使用方式：
 * ```ts
 * const app = useApp()
 * app.ui.switchToSearch()        // 访问 UI 模块
 * app.cache.set(key, value)      // 访问缓存模块
 * app.search.setSearchCategories() // 访问搜索模块
 * app.plugin.install(plugin)     // 访问插件模块
 * app.hotkey.register(config)    // 访问快捷键模块
 * ```
 */
export const useApp = defineStore('app', () => {
  // ==================== 子模块 ====================
  /** UI 状态模块 */
  const ui = useUIStore()

  /** 缓存模块 */
  const cache = useCacheStore()

  /** 搜索模块 */
  const search = useSearchStore()

  /** 插件模块 */
  const plugin = usePluginStoreNew()

  /** 快捷键模块 */
  const hotkey = useHotkeyStore()

  // ==================== 全局方法 ====================
  /**
   * 全局初始化
   */
  const initialize = async () => {
    console.log('🚀 开始初始化应用...')
    try {
      // 初始化搜索系统
      await search.initialize()
      // 初始化快捷键系统
      await hotkey.initialize()
      // 初始化插件系统
      await plugin.initialize()
      console.log('✅ 应用初始化完成')
    } catch (error) {
      console.error('❌ 应用初始化失败:', error)
      throw error
    }
  }

  /**
   * 全局重置
   */
  const reset = () => {
    console.log('🔄 重置应用状态...')
    ui.resetToDefault()
    search.reset()
    cache.clear()
    console.log('✅ 应用状态已重置')
  }

  /**
   * 清理资源
   */
  const cleanup = () => {
    console.log('🧹 清理应用资源...')
    // 清理过期缓存
    const cleaned = cache.clearExpired()
    console.log(`✅ 已清理 ${cleaned} 个过期缓存`)
  }

  /**
   * 获取应用状态摘要
   */
  const getStateSummary = () => {
    return {
      ui: {
        currentInterfaceType: ui.currentInterfaceType,
        isPluginActive: ui.isPluginActive,
        hasResults: ui.hasResults
      },
      search: {
        totalResults: search.totalResults,
        hasResults: search.hasResults
      },
      plugin: {
        totalPlugins: plugin.pluginCount,
        enabledPlugins: plugin.enabledCount,
        loading: plugin.loading
      },
      hotkey: {
        totalHotkeys: hotkey.hotkeyCount,
        enabledHotkeys: hotkey.enabledCount,
        globalHotkeys: hotkey.globalHotkeys.length,
        appHotkeys: hotkey.appHotkeys.length
      },
      cache: {
        ...cache.getStats()
      }
    }
  }

  // ==================== 返回 ====================
  return {
    // 子模块
    ui,
    cache,
    search,
    plugin,
    hotkey,

    // 全局方法
    initialize,
    reset,
    cleanup,
    getStateSummary
  }
})

// ==================== 导出所有 store 供独立使用 ====================
export { useUIStore } from './modules/ui'
export { useCacheStore } from './modules/cache'
export { useSearchStore } from './modules/search'
export { usePluginStoreNew } from './modules/plugin'
export { useHotkeyStore } from './modules/hotkey'

// 导出子模块
export { useAppHotkeyModule } from './modules/hotkey/appHotkey'
export { useGlobalHotkeyModule } from './modules/hotkey/globalHotkey'

// 导出类型
export { InterfaceType } from '@/temp_code/typings/ui'
export { HotkeyType } from '@/temp_code/typings/hotkey'
export type { CacheItem } from '@/temp_code/typings/cache'
export type { SearchCategory } from '@/temp_code/typings/search'
export type { HotkeyConfig, HotkeyStats, HotkeyEventDetail } from '@/temp_code/typings/hotkey'

