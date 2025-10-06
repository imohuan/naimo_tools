/**
 * 统一窗口管理组合式函数
 * 整合了基础窗口管理、插件窗口管理、设置页面管理功能
 */

import { ref, computed, readonly, nextTick, toRaw } from 'vue'
import { useApp } from '@/temp_code'
import { storeUtils } from '@/temp_code/utils/store'
import { LifecycleType } from '@/typings/windowTypes'
import type { PluginItem } from '@/typings/pluginTypes'
import type { AttachedFile } from '@/typings/composableTypes'

// ==================== 类型定义 ====================

/**
 * 窗口尺寸接口
 */
export interface WindowSize {
  /** 窗口宽度，-1表示不改变 */
  width?: number
  /** 窗口高度，-1表示不改变 */
  height: number
}

/**
 * 窗口位置接口
 */
export interface WindowPosition {
  /** X坐标 */
  x: number
  /** Y坐标 */
  y: number
}

/**
 * 窗口状态接口
 */
export interface WindowState {
  /** 是否可见 */
  visible: boolean
  /** 是否最小化 */
  minimized: boolean
  /** 是否最大化 */
  maximized: boolean
  /** 是否全屏 */
  fullscreen: boolean
}

/**
 * 窗口管理器配置选项
 */
export interface WindowManagerOptions {
  /** 是否启用窗口状态跟踪 */
  enableStateTracking?: boolean
  /** 默认窗口尺寸 */
  defaultSize?: WindowSize
  /** 最小窗口尺寸 */
  minSize?: WindowSize
  /** 最大窗口尺寸 */
  maxSize?: WindowSize
}

/**
 * 插件窗口打开选项
 */
export interface PluginWindowOptions {
  url: string
  preload: string
}

/**
 * 依赖注入接口 - 用于需要外部传入的依赖
 */
export interface WindowManagerDependencies {
  /** 处理窗口大小调整 */
  handleResize?: () => void
  /** 处理搜索框聚焦 */
  handleSearchFocus?: () => void
  /** 附件文件列表（响应式） */
  attachedFiles?: () => AttachedFile[]
  /** 搜索文本（响应式） */
  searchText?: () => string
}

// ==================== 主函数 ====================

/**
 * 统一窗口管理组合式函数
 */
export function useWindowManager(
  options: WindowManagerOptions = {},
  dependencies: WindowManagerDependencies = {}
) {
  const app = useApp()

  const {
    enableStateTracking = false,
    defaultSize,
    minSize,
    maxSize
  } = options

  // ==================== 状态管理 ====================

  // 窗口状态跟踪
  const windowState = ref<WindowState>({
    visible: false,
    minimized: false,
    maximized: false,
    fullscreen: false
  })

  // 当前窗口尺寸
  const currentSize = ref<WindowSize>({ width: -1, height: -1 })

  // 当前窗口位置
  const currentPosition = ref<WindowPosition>({ x: 0, y: 0 })

  // ==================== 基础窗口操作 ====================

  /**
   * 验证窗口尺寸
   */
  const validateSize = (size: Partial<WindowSize>): Partial<WindowSize> => {
    const validatedSize = { ...size }

    // 检查最小尺寸
    if (minSize) {
      if (validatedSize.width && validatedSize.width < minSize.width!) {
        validatedSize.width = minSize.width
      }
      if (validatedSize.height && validatedSize.height < minSize.height) {
        validatedSize.height = minSize.height
      }
    }

    // 检查最大尺寸
    if (maxSize) {
      if (validatedSize.width && validatedSize.width > maxSize.width!) {
        validatedSize.width = maxSize.width
      }
      if (validatedSize.height && validatedSize.height > maxSize.height) {
        validatedSize.height = maxSize.height
      }
    }

    return validatedSize
  }

  /**
   * 设置窗口大小
   */
  const setSize = async (options: Partial<WindowSize> = {}): Promise<boolean> => {
    try {
      const validatedSize = validateSize(options)
      const width = validatedSize.width ?? -1
      const height = validatedSize.height ?? -1

      const success = await naimo.router.windowSetSize(width, height)

      if (success && enableStateTracking) {
        if (width !== -1) currentSize.value.width = width
        if (height !== -1) currentSize.value.height = height
      }

      return success
    } catch (error) {
      console.error('设置窗口大小失败:', error)
      return false
    }
  }

  /**
   * 设置窗口位置
   */
  const setPosition = async (position: WindowPosition): Promise<boolean> => {
    try {
      // windowSetPosition 可能不存在，需要检查
      const router = naimo.router as any
      if (!router.windowSetPosition) {
        console.warn('windowSetPosition 方法不可用')
        return false
      }

      const success = await router.windowSetPosition(position.x, position.y)

      if (success && enableStateTracking) {
        currentPosition.value = { ...position }
      }

      return success
    } catch (error) {
      console.error('设置窗口位置失败:', error)
      return false
    }
  }

  /**
   * 检查窗口是否可见（异步）
   */
  const checkVisible = async (): Promise<boolean> => {
    try {
      const currentViewInfo = await naimo.router.windowGetCurrentViewInfo()
      if (!currentViewInfo) return false

      const visible = await naimo.router.windowIsWindowVisible()

      if (enableStateTracking) {
        windowState.value.visible = visible
      }

      return visible
    } catch (error) {
      console.error('检查窗口可见性失败:', error)
      return false
    }
  }

  /**
   * 显示窗口
   */
  const show = async (): Promise<boolean> => {
    try {
      const success = await naimo.router.windowShow()

      if (success && enableStateTracking) {
        windowState.value.visible = true
      } else if (!success) {
        console.warn('显示窗口失败')
      }

      return success
    } catch (error) {
      console.error('显示窗口失败:', error)
      return false
    }
  }

  /**
   * 隐藏窗口
   */
  const hide = async (): Promise<boolean> => {
    try {
      const success = await naimo.router.windowHide()

      if (success && enableStateTracking) {
        windowState.value.visible = false
      } else if (!success) {
        console.warn('隐藏窗口失败')
      }

      return success
    } catch (error) {
      console.error('隐藏窗口失败:', error)
      return false
    }
  }

  /**
   * 最小化窗口
   */
  const minimize = async (): Promise<boolean> => {
    try {
      const success = await naimo.router.windowMinimize?.()

      if (success && enableStateTracking) {
        windowState.value.minimized = true
      }

      return success ?? false
    } catch (error) {
      console.error('最小化窗口失败:', error)
      return false
    }
  }

  /**
   * 最大化窗口
   */
  const maximize = async (): Promise<boolean> => {
    try {
      const success = await naimo.router.windowMaximize?.()

      if (success && enableStateTracking) {
        windowState.value.maximized = true
      }

      return success ?? false
    } catch (error) {
      console.error('最大化窗口失败:', error)
      return false
    }
  }

  /**
   * 还原窗口
   */
  const restore = async (): Promise<boolean> => {
    try {
      // windowRestore 可能不存在，需要检查
      const router = naimo.router as any
      if (!router.windowRestore) {
        console.warn('windowRestore 方法不可用')
        return false
      }

      const success = await router.windowRestore()

      if (success && enableStateTracking) {
        windowState.value.minimized = false
        windowState.value.maximized = false
      }

      return success
    } catch (error) {
      console.error('还原窗口失败:', error)
      return false
    }
  }

  /**
   * 切换窗口显示状态
   */
  const toggle = async (): Promise<boolean> => {
    const visible = await checkVisible()
    return visible ? await hide() : await show()
  }

  /**
   * 重置窗口到默认状态
   */
  const resetToDefault = async (): Promise<boolean> => {
    if (!defaultSize) return false

    try {
      await restore()
      return await setSize(defaultSize)
    } catch (error) {
      console.error('重置窗口到默认状态失败:', error)
      return false
    }
  }

  /**
   * 刷新窗口状态
   */
  const refreshState = async () => {
    if (!enableStateTracking) return

    try {
      windowState.value.visible = await checkVisible()
    } catch (error) {
      console.error('刷新窗口状态失败:', error)
    }
  }

  // ==================== 插件窗口管理 ====================

  /**
   * 生成插件API
   */
  const generatePluginApi = async (
    pluginItem: PluginItem,
    hotkeyEmit = false
  ): Promise<any> => {
    // 获取插件基础 API
    const pluginApi = await app.plugin.getPluginApi(pluginItem.pluginId as string)

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

      if (result.success) {
        // 通知主应用打开插件窗口
        await openPluginWindow(pluginItem, { url: '', preload: '' })
        console.log(`✅ 插件视图创建成功: ${result.viewId} (${pluginItem.name})`)
      }

      return result
    }

    // 组装完整的 API 对象
    return {
      ...pluginApi,
      toggleInput: (value?: boolean) => {
        // 可以通过依赖注入或直接操作
        console.log('toggleInput:', value)
      },
      openPluginWindow: () => openPluginWindow(pluginItem, { url: '', preload: '' }),
      addPathToFileList,
      plugin: {
        installZip: (zipPath: string) => app.plugin.install(zipPath).then(() => true).catch(() => false),
        install: (path: string) => app.plugin.install(path).then(() => true).catch(() => false),
        uninstall: (id: string) => app.plugin.uninstall(id).then(() => true).catch(() => false),
        toggle: (id: string, enabled: boolean) => app.plugin.toggle(id, enabled).then(() => true).catch(() => false),
      },
      openWebPageWindow
    }
  }

  /**
   * 打开插件窗口
   */
  const openPluginWindow = async (
    pluginItem: PluginItem,
    options: PluginWindowOptions
  ) => {
    try {
      // 打开插件窗口UI
      app.ui.openPluginWindow(pluginItem)

      // 确保窗口高度调整到最大高度
      dependencies.handleResize?.()
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
  const closePlugin = async () => {
    try {
      // 关闭插件view
      await naimo.router.windowClosePluginView()
      // 关闭插件窗口UI
      app.ui.closePluginWindow()
      // 聚焦到搜索输入框
      dependencies.handleSearchFocus?.()
    } catch (error) {
      console.error('❌ 关闭插件窗口失败:', error)
    }
  }

  /**
   * 处理插件执行完成事件
   * 简化版本 - 直接使用 app 和少量外部依赖
   */
  const onPluginExecuted = async (
    event: { pluginId: string; path: string; hotkeyEmit: boolean },
    externalDeps?: {
      toggleInput?: (value?: boolean) => void
      handleSearch?: (text: string) => Promise<void>
    }
  ) => {
    const { pluginId, path, hotkeyEmit } = event
    const pluginItem = app.plugin.getInstalledPluginItem(pluginId, path)

    if (!pluginItem) {
      console.warn(`⚠️ 未找到插件: ${pluginId}, path: ${path}`)
      return
    }

    const genApi = await generatePluginApi(pluginItem, hotkeyEmit)
    // 隐藏搜索框
    externalDeps?.toggleInput?.(false)
    // 执行插件
    if (pluginItem.pluginId && pluginItem.onEnter) {
      await pluginItem.onEnter?.(
        {
          files: toRaw(dependencies.attachedFiles?.() || []),
          searchText: dependencies.searchText?.() || ''
        },
        genApi
      )
    } else {
      console.log('🔍 收到插件执行完成事件，插件项目信息:', {
        name: pluginItem.name,
        lifecycleType: pluginItem.lifecycleType
      })
    }

    // 更新并清理状态
    await app.search.initItems()

    // 清空搜索和附件
    if (externalDeps?.handleSearch) {
      await externalDeps.handleSearch("")
    }

    // 重新显示搜索框
    externalDeps?.toggleInput?.(true)
  }

  /**
   * 处理插件窗口关闭事件
   */
  const onPluginClosed = async (
    event: { windowId: number; title: string; path?: string },
    externalDeps?: {
      recoverSearchState?: (clearPlugin?: boolean) => void
    }
  ) => {
    console.log("收到插件窗口关闭事件:", event)

    // 如果当前是插件窗口模式，关闭插件窗口状态
    if (app.ui.isWindowInterface) {
      console.log("关闭插件窗口状态")
      await closePlugin()
      externalDeps?.recoverSearchState?.(true)
    }
  }

  // ==================== 设置页面管理 ====================

  /**
   * 打开设置页面
   */
  const openSettings = async () => {
    try {
      // 切换到设置界面状态
      app.ui.switchToSettings()

      // 确保窗口高度调整到最大高度
      dependencies.handleResize?.()
      await nextTick()

      // 调用 IPC 方法创建设置页面 WebContentsView
      const result = await naimo.router.windowCreateSettingsView()
      if (result.success) {
        console.log('✅ 设置页面 WebContentsView 创建成功:', result.viewId)
      } else {
        console.error('❌ 设置页面 WebContentsView 创建失败:', result.error)
      }
    } catch (error) {
      console.error('❌ 打开设置页面失败:', error)
    }
  }

  /**
   * 关闭设置页面
   */
  const closeSettings = async () => {
    try {
      // 调用 IPC 方法关闭设置页面 WebContentsView
      const result = await naimo.router.windowCloseSettingsView()
      if (result.success) {
        console.log('✅ 设置页面 WebContentsView 关闭成功')
      } else {
        console.error('❌ 设置页面 WebContentsView 关闭失败:', result.error)
      }
    } catch (error) {
      console.error('❌ 关闭设置页面失败:', error)
    }

    // 切换回搜索界面状态
    app.ui.switchToSearch()

    // 聚焦到搜索输入框
    dependencies.handleSearchFocus?.()
  }

  // ==================== 计算属性 ====================

  const isVisible = computed(() => windowState.value.visible)
  const isMinimized = computed(() => windowState.value.minimized)
  const isMaximized = computed(() => windowState.value.maximized)
  const isFullscreen = computed(() => windowState.value.fullscreen)

  // ==================== 返回值 ====================

  return {
    // 只读状态
    state: readonly(windowState),
    size: readonly(currentSize),
    position: readonly(currentPosition),

    // 计算属性
    isVisible,
    isMinimized,
    isMaximized,
    isFullscreen,

    // 基础窗口操作
    setSize,
    setPosition,
    show,
    hide,
    toggle,
    checkVisible,
    minimize,
    maximize,
    restore,
    reset: resetToDefault,
    refresh: refreshState,
    validateSize,

    // 插件窗口管理
    openPlugin: openPluginWindow,
    closePlugin,
    onPluginExecuted,
    onPluginClosed,

    // 设置页面管理
    openSettings,
    closeSettings,

    // 配置信息
    config: readonly({
      enableStateTracking,
      defaultSize,
      minSize,
      maxSize
    })
  }
}
