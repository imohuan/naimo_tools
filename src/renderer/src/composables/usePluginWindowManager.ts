/**
 * 插件窗口管理组合式函数
 * 负责插件窗口的创建、关闭、状态管理等功能
 */

import { nextTick, toRaw } from 'vue'
import { pluginManager } from '@/core/plugin/PluginManager'
import { pluginApiGenerator } from '@/core/plugin/PluginApiGenerator'
import { LifecycleType } from '@/typings/windowTypes'
import type { PluginItem } from '@/typings/pluginTypes'
import type { AttachedFile } from '@/typings/composableTypes'
import type { PluginApi } from '@shared/typings/global'

/**
 * 插件窗口管理器
 */
export function usePluginWindowManager() {

  /**
   * 生成插件API
   */
  const generatePluginApi = async (
    pluginItem: PluginItem,
    hotkeyEmit = false,
    dependencies: {
      toggleInput: (value?: boolean) => void
      openPluginWindow: (item: PluginItem) => Promise<void>
      pluginStore: {
        installZip: (zipPath: string) => Promise<void>
        install: (pluginPath: string) => Promise<void>
        uninstall: (pluginId: string) => Promise<void>
        toggle: (pluginId: string) => Promise<void>
      }
    }
  ): Promise<PluginApi> => {
    // 创建适配器函数，将双参数函数转换为单参数函数
    const openPluginWindowAdapter = async (item: PluginItem) => {
      await dependencies.openPluginWindow(item)
    }

    return pluginApiGenerator.generateApi(pluginItem, {
      toggleInput: dependencies.toggleInput,
      openPluginWindow: openPluginWindowAdapter,
      pluginStore: dependencies.pluginStore,
      hotkeyEmit
    })
  }

  /**
   * 打开插件窗口
   */
  const openPluginWindow = async (
    pluginItem: PluginItem,
    options: { url: string; preload: string },
    dependencies: {
      openPluginWindowUI: (pluginItem: PluginItem) => void
      handleResize: () => void
    }
  ) => {
    try {
      dependencies.openPluginWindowUI(pluginItem)

      // 确保窗口高度调整到最大高度
      dependencies.handleResize()
      await nextTick()

      // 直接创建插件视图
      const result = await naimo.router.windowCreatePluginView({
        path: pluginItem.path,
        title: pluginItem.name || '插件',
        url: options.url || '',
        lifecycleType: pluginItem.lifecycleType || LifecycleType.FOREGROUND,
        preload: options.preload || ''
      })

      if (result.success) {
        console.log(`✅ 插件视图创建成功: ${result.viewId} (${pluginItem.name})`)
      } else {
        console.error('❌ 插件窗口创建失败:', result.error)
      }
    } catch (error) {
      console.error('❌ 打开插件窗口失败:', error)
    }
  }

  /**
   * 关闭插件窗口
   */
  const closePluginWindow = async (dependencies: {
    closePluginWindowUI: () => void
    handleSearchFocus: () => void
  }) => {
    try {
      // 关闭插件view
      await naimo.router.windowClosePluginView()
      // 关闭插件窗口UI 切换搜索界面
      dependencies.closePluginWindowUI()
      // 聚焦到搜索输入框
      dependencies.handleSearchFocus()
    } catch (error) {
      console.error('❌ 关闭插件窗口失败:', error)
    }
  }

  /**
   * 处理插件执行完成事件
   */
  const handlePluginExecuted = async (
    event: { pluginId: string; path: string; hotkeyEmit: boolean },
    dependencies: {
      toggleInput: (value?: boolean) => void
      attachedFiles: AttachedFile[]
      searchText: string
      updateStoreCategory: () => Promise<void>
      handleSearch: (text: string) => Promise<void>
      pluginStore: {
        installZip: (zipPath: string) => Promise<void>
        install: (pluginPath: string) => Promise<void>
        uninstall: (pluginId: string) => Promise<void>
        toggle: (pluginId: string) => Promise<void>
      }
      setAttachedFiles: (files: AttachedFile[]) => void
      setSearchText: (text: string) => void
    }
  ) => {
    const { pluginId, path, hotkeyEmit } = event
    const pluginItem = pluginManager.getInstalledPluginItem(pluginId, path)!

    const genApi = await generatePluginApi(pluginItem, hotkeyEmit, {
      toggleInput: dependencies.toggleInput,
      openPluginWindow: async (item: PluginItem) => {
        // 这里需要提供默认的选项
        await openPluginWindow(item, { url: '', preload: '' }, {
          openPluginWindowUI: () => { }, // 这里需要从外部提供
          handleResize: () => { } // 这里需要从外部提供
        })
      },
      pluginStore: dependencies.pluginStore
    })

    dependencies.toggleInput(false)

    if (pluginItem.pluginId && pluginItem.onEnter) {
      await pluginItem.onEnter?.(
        {
          files: toRaw(dependencies.attachedFiles),
          searchText: dependencies.searchText
        },
        genApi
      )
    } else {
      console.log('🔍 收到插件执行完成事件，插件项目信息:', {
        name: pluginItem.name,
        lifecycleType: pluginItem.lifecycleType
      })
    }

    await dependencies.updateStoreCategory()
    dependencies.setAttachedFiles([])
    dependencies.setSearchText("")
    await dependencies.handleSearch("")
  }

  /**
   * 处理插件窗口关闭事件
   */
  const handlePluginWindowClosed = async (
    event: { windowId: number; title: string; path?: string },
    dependencies: {
      isPluginWindowOpen: boolean
      closePluginWindow: () => Promise<void>
      recoverSearchState: (clearPlugin?: boolean) => void
    }
  ) => {
    console.log("收到插件窗口关闭事件:", event)

    // 如果当前是插件窗口模式，关闭插件窗口状态
    if (dependencies.isPluginWindowOpen) {
      console.log("关闭插件窗口状态")
      await dependencies.closePluginWindow()
      dependencies.recoverSearchState(true)
    }
  }

  return {
    generatePluginApi,
    openPluginWindow,
    closePluginWindow,
    handlePluginExecuted,
    handlePluginWindowClosed
  }
}
