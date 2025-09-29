/**
 * 应用事件处理器组合式函数
 * 集中管理所有应用级别的事件处理逻辑
 */

import { nextTick, type Ref } from 'vue'
import type { HotkeyEventListener, HotkeyTriggeredEventDetail } from '@/typings/hotkeyTypes'
import type { AttachedFile } from '@/typings/composableTypes'
import type { PluginItem } from '@/typings/pluginTypes'
import type { AppItem } from '@shared/typings'

/**
 * 应用事件处理器
 */
export function useAppEventHandlers() {

  /**
   * 创建窗口焦点管理事件处理器
   */
  const createWindowFocusHandlers = (dependencies: {
    handleSearchFocus: () => void
    isWindowVisible: () => Promise<boolean>
    show: () => void
    hide: () => void
  }) => ({
    /**
     * 处理窗口获得焦点事件
     */
    onWindowFocus: () => {
      dependencies.handleSearchFocus()
      dependencies.isWindowVisible().then(isVisible => {
        if (!isVisible) dependencies.show()
      })
    },

    /**
     * 处理窗口失去焦点事件
     */
    onWindowBlur: (event?: any) => {
      console.log("收到窗口blur事件:", event?.detail || "直接调用")
      // dependencies.hide() // 根据需要启用
    },

    /**
     * 处理页面可见性变化
     */
    onVisibilityChange: () => {
      if (!document.hidden && document.hasFocus()) {
        dependencies.handleSearchFocus()
        console.log("页面重新变为可见且获得焦点时，聚焦到搜索框")
      }
    }
  })

  /**
   * 创建搜索和导航事件处理器
   */
  const createSearchHandlers = (dependencies: {
    searchText: Ref<string>
    setSearchText: (text: string) => void
    handleSearch: (text: string) => Promise<void>
    executeItem: (app: AppItem, hotkeyEmit?: boolean) => void
    searchCategories: Ref<any[]>
    attachedFiles: Ref<AttachedFile[]>
    setAttachedFiles: (files: AttachedFile[]) => void
    currentPluginItem: Ref<PluginItem | null>
    setCurrentPluginItem: (item: PluginItem | null) => void
    show: () => void
    handleSearchFocus: () => void
  }) => ({
    /**
     * 自定义执行应用项目
     */
    customExecuteItem: (app: AppItem) => {
      dependencies.executeItem(app)
      dependencies.handleSearch("")
    },

    /**
     * 处理搜索框聚焦请求
     */
    handleFocusSearchRequested: () => {
      console.log("收到聚焦搜索框请求")
      dependencies.handleSearchFocus()
    },

    /**
     * 处理自定义全局快捷键触发
     */
    handleCustomGlobalHotkeyTriggered: async (event: HotkeyTriggeredEventDetail) => {
      const name = event.config.name?.trim()
      if (!name) {
        console.log("不存在Name:", event.config)
        return
      }

      dependencies.setSearchText(name)
      await dependencies.handleSearch(name)
      dependencies.show()

      // 获取搜索结果
      const items = dependencies.searchCategories.value.find(category => category.id === 'best-match')?.items
      if (items && items.length > 0) {
        dependencies.executeItem(items[0], true)
      } else {
        console.log("没有搜索结果")
      }

      console.log("搜索结果:", dependencies.searchCategories.value, { items })
      console.log("收到自定义全局快捷键触发事件:", name)
    }
  })

  /**
   * 创建窗口状态管理事件处理器
   */
  const createWindowStateHandlers = (dependencies: {
    isPluginWindowOpen: Ref<boolean>
    isSettingsInterface: Ref<boolean>
    searchText: Ref<string>
    setSearchText: (text: string) => void
    handleSearch: (text: string) => Promise<void>
    attachedFiles: Ref<AttachedFile[]>
    setAttachedFiles: (files: AttachedFile[]) => void
    currentPluginItem: Ref<PluginItem | null>
    setCurrentPluginItem: (item: PluginItem | null) => void
    closePluginWindow: () => Promise<void>
    closeSettings: () => Promise<void>
    isWindowVisible: () => Promise<boolean>
    hide: () => void
    show: () => void
  }) => ({
    /**
     * 处理关闭窗口请求
     */
    handleCloseWindowRequested: async () => {
      console.log("收到关闭窗口请求，当前状态:", {
        isPluginWindowOpen: dependencies.isPluginWindowOpen.value,
        isSettingsInterface: dependencies.isSettingsInterface.value,
        searchText: dependencies.searchText.value,
        hasSearchText: dependencies.searchText.value.trim() !== ''
      })

      // 如果当前是插件窗口，关闭插件窗口
      if (dependencies.isPluginWindowOpen.value) {
        console.log("关闭插件窗口")
        dependencies.closePluginWindow()
        dependencies.setAttachedFiles([])
        dependencies.setCurrentPluginItem(null)
        return
      }

      // 如果当前是设置页面，关闭设置页面
      if (dependencies.isSettingsInterface.value) {
        console.log("关闭设置页面")
        await dependencies.closeSettings()
        return
      }

      if (dependencies.attachedFiles.value.length > 0 || dependencies.currentPluginItem.value) {
        console.log("清空附加内容")
        dependencies.setAttachedFiles([])
        dependencies.setCurrentPluginItem(null)
        return
      }

      // 如果当前是搜索页面
      if (dependencies.searchText.value.trim() !== '') {
        console.log("清空搜索框")
        dependencies.setSearchText('')
        dependencies.handleSearch('')
        return
      }

      dependencies.hide()
    },

    /**
     * 处理显示/隐藏窗口请求
     */
    handleShowHideWindowRequested: async () => {
      console.log("收到显示/隐藏窗口请求")
      const isMainWindowVisible = await dependencies.isWindowVisible()
      if (isMainWindowVisible) {
        dependencies.hide()
      } else {
        dependencies.show()
      }
    }
  })

  /**
   * 创建快捷键事件处理器
   */
  const createHotkeyHandler = (handlers: {
    handleFocusSearchRequested: () => void
    handleCloseWindowRequested: () => Promise<void>
    handleShowHideWindowRequested: () => Promise<void>
    handleCustomGlobalHotkeyTriggered: (event: HotkeyTriggeredEventDetail) => Promise<void>
  }): HotkeyEventListener => {
    return (event) => {
      switch (event.detail.id) {
        case 'app_focus_search':
          handlers.handleFocusSearchRequested()
          break
        case 'app_close_window':
          handlers.handleCloseWindowRequested()
          break
        case 'global_show_window':
          handlers.handleShowHideWindowRequested()
          break
        default:
          if (event.detail.id.startsWith('custom_global_')) {
            handlers.handleCustomGlobalHotkeyTriggered(event.detail)
            break
          }
          console.log('🔍 收到全局快捷键触发事件:', event.detail)
          break
      }
      console.log('🔍 收到全局快捷键触发事件:', event.detail)
    }
  }

  /**
   * 创建搜索状态恢复处理器
   */
  const createSearchStateHandler = (dependencies: {
    clearPlugin?: boolean
    searchHeaderActions: {
      clearCurrentPlugin: () => void
      setSearchBoxVisibility: (visible: boolean) => void
      updateSearchText: (text: string) => void
    }
    setCurrentPluginItem: (item: PluginItem | null) => void
    switchToSearch: () => void
    searchText: Ref<string>
    handleSearch: (text: string) => Promise<void>
    handleResize: () => void
    handleSearchFocus: () => void
    hide: () => void
  }) => ({
    /**
     * 恢复搜索栏为默认搜索状态
     */
    recoverSearchState: (clearPlugin = false) => {
      console.log("恢复搜索状态", { clearPlugin, searchText: dependencies.searchText.value })

      if (clearPlugin) {
        dependencies.searchHeaderActions.clearCurrentPlugin()
        dependencies.setCurrentPluginItem(null)
      }

      dependencies.switchToSearch()
      dependencies.searchHeaderActions.setSearchBoxVisibility(true)

      const currentText = dependencies.searchText.value ?? ""
      dependencies.searchHeaderActions.updateSearchText(currentText)
      dependencies.handleSearch(currentText)

      nextTick(() => {
        dependencies.handleResize()
        dependencies.handleSearchFocus()
        // 隐藏窗口
        dependencies.hide()
      })
    }
  })

  /**
   * 处理容器点击事件
   */
  const handleContainerClick = (event: MouseEvent) => {
    // 检查点击的目标元素
    const target = event.target as HTMLElement

    // 如果点击的是输入框、按钮或其他交互元素，不处理
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.closest('input') ||
      target.closest('button') ||
      target.closest('[role="button"]') ||
      target.classList.contains('no-drag')
    ) {
      return false
    }

    // 点击空白区域时的处理逻辑可以在这里添加
    return false
  }

  return {
    createWindowFocusHandlers,
    createSearchHandlers,
    createWindowStateHandlers,
    createHotkeyHandler,
    createSearchStateHandler,
    handleContainerClick
  }
}
