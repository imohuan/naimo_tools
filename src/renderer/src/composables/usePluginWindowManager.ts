/**
 * 插件窗口管理组合式函数
 * 负责插件窗口的创建、关闭、状态管理等功能
 */

import { nextTick, toRaw } from 'vue'
import { storeUtils } from '@/temp_code/utils/store'
import { LifecycleType } from '@/typings/windowTypes'
import type { PluginItem } from '@/typings/pluginTypes'
import type { AttachedFile } from '@/typings/composableTypes'

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
        installZip: (zipPath: string) => Promise<boolean>
        install: (pluginPath: string) => Promise<boolean>
        uninstall: (pluginId: string) => Promise<boolean>
        toggle: (pluginId: string, enabled: boolean) => Promise<boolean>
      }
      getPluginApi: (pluginId: string) => Promise<any>
    }
  ): Promise<any> => {
    // 获取插件基础 API
    const pluginApi = await dependencies.getPluginApi(pluginItem.pluginId as string)

    // 文件列表管理
    const addPathToFileList = async (name: string, path: string) => {
      await storeUtils.addListItem("fileList", {
        name: name,
        path: path,
        icon: null,
        type: 'text',
      }, {
        position: 'start',
        unique: true,
        uniqueField: 'path'
      })
    }

    // 创建网页窗口
    const openWebPageWindow = async (url: string, windowOptions: any = {}) => {
      // 获取当前视图信息
      const currentViewInfo = await naimo.router.windowGetCurrentViewInfo()
      if (!currentViewInfo) {
        console.warn('⚠️ 无法获取当前视图信息，跳过插件窗口创建')
        return
      }

      // 合并选项
      const finalOptions = {
        path: windowOptions.path || pluginItem.path,
        pluginId: pluginItem.pluginId,
        name: pluginItem.name,
        title: windowOptions.title || pluginItem.name,
        url,
        lifecycleType: windowOptions.lifecycleType || pluginItem.lifecycleType,
        preload: windowOptions.preload,
        hotkeyEmit: hotkeyEmit || false,
        ...windowOptions
      }

      // 直接创建插件视图
      const result = await naimo.router.windowCreatePluginView({
        path: finalOptions.path,
        title: finalOptions.name || '插件',
        url: url || '',
        lifecycleType: finalOptions.lifecycleType === LifecycleType.BACKGROUND ? 'background' : 'foreground',
        preload: finalOptions.preload || ''
      })

      if (result.success && dependencies.openPluginWindow) {
        // 通知主应用打开插件窗口
        await dependencies.openPluginWindow(pluginItem)
        console.log(`✅ 插件视图创建成功: ${result.viewId} (${pluginItem.name})`)
      }

      return result
    }

    // 组装完整的 API 对象
    return {
      ...pluginApi,
      toggleInput: dependencies.toggleInput || (() => { }),
      openPluginWindow: dependencies.openPluginWindow ? () => dependencies.openPluginWindow(pluginItem) : () => Promise.resolve(),
      addPathToFileList,
      plugin: dependencies.pluginStore || {
        installZip: () => Promise.resolve(false),
        install: () => Promise.resolve(false),
        uninstall: () => Promise.resolve(false),
        toggle: () => Promise.resolve(false),
      },
      openWebPageWindow
    }
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
      toggleInput: (value?: boolean) => void
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
        dependencies.toggleInput(false)
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
      openPluginWindowUI: (pluginItem?: PluginItem | null) => void
      attachedFiles: AttachedFile[]
      searchText: string
      updateStoreCategory: () => Promise<void>
      handleSearch: (text: string) => Promise<void>
      pluginStore: {
        installZip: (zipPath: string) => Promise<boolean>
        install: (pluginPath: string) => Promise<boolean>
        uninstall: (pluginId: string) => Promise<boolean>
        toggle: (pluginId: string, enabled: boolean) => Promise<boolean>
      }
      setAttachedFiles: (files: AttachedFile[]) => void
      setSearchText: (text: string) => void
      getInstalledPluginItem: (pluginId: string, path: string) => PluginItem | null
      getPluginApi: (pluginId: string) => Promise<any>
    }
  ) => {
    const { pluginId, path, hotkeyEmit } = event
    const pluginItem = dependencies.getInstalledPluginItem(pluginId, path)

    if (!pluginItem) {
      console.warn(`⚠️ 未找到插件: ${pluginId}, path: ${path}`)
      return
    }

    const genApi = await generatePluginApi(pluginItem, hotkeyEmit, {
      toggleInput: dependencies.toggleInput,
      openPluginWindow: async (item: PluginItem) => {
        // 这里需要提供默认的选项
        await openPluginWindow(item, { url: '', preload: '' }, {
          toggleInput: dependencies.toggleInput,
          openPluginWindowUI: dependencies.openPluginWindowUI,
          handleResize: () => { }
        })
      },
      pluginStore: dependencies.pluginStore,
      getPluginApi: dependencies.getPluginApi
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
    // 重新显示搜索框，确保用户可以继续输入
    dependencies.toggleInput(true)
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
