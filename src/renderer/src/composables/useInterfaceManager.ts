import { ref, computed, watch } from 'vue'
import type { PluginItem } from '@/typings/plugin-types'

/**
 * 界面类型枚举
 */
export enum InterfaceType {
  SEARCH = 'search',      // 搜索界面：当搜索框有内容时显示
  SETTINGS = 'settings',  // 设置界面：搜索框无内容，点击设置按钮显示
  WINDOW = 'window'       // 窗口界面：搜索框无内容，点击插件执行相应方法显示
}

/**
 * 界面状态管理
 */
export function useInterfaceManager() {
  // 当前界面类型
  const currentInterface = ref<InterfaceType>(InterfaceType.SEARCH)

  // 搜索文本状态
  const searchText = ref('')

  // 是否有搜索结果
  const hasSearchResults = ref(false)

  // 是否打开了插件窗口
  const isPluginWindowOpen = ref(false)

  // 当前执行的插件项目
  const currentPluginItem = ref<PluginItem | null>(null)

  // 进入设置前的界面状态
  const previousInterface = ref<InterfaceType | null>(null)

  // 计算当前应该显示的界面
  const activeInterface = computed(() => {
    // 如果有搜索内容，显示搜索界面
    if (searchText.value.trim() !== '') {
      return InterfaceType.SEARCH
    }

    // 如果没有搜索内容，根据当前界面状态决定
    return currentInterface.value
  })

  // 界面状态计算属性
  const isSearchInterface = computed(() => activeInterface.value === InterfaceType.SEARCH)
  const isSettingsInterface = computed(() => activeInterface.value === InterfaceType.SETTINGS)
  const isWindowInterface = computed(() => activeInterface.value === InterfaceType.WINDOW)

  // 内容区域是否可见
  const contentAreaVisible = computed(() => {
    // 搜索界面：有搜索内容或有搜索结果时显示
    if (isSearchInterface.value) {
      return searchText.value.trim() !== '' || hasSearchResults.value
    }

    // 设置界面和窗口界面：总是显示
    return isSettingsInterface.value || isWindowInterface.value
  })

  /**
   * 切换到搜索界面
   */
  const switchToSearch = () => {
    currentInterface.value = InterfaceType.SEARCH
  }

  /**
   * 切换到设置界面
   */
  const switchToSettings = () => {
    // 记录进入设置前的界面状态
    previousInterface.value = currentInterface.value
    // 清空搜索文本
    searchText.value = ''
    currentInterface.value = InterfaceType.SETTINGS
  }

  /**
   * 切换到窗口界面
   */
  const switchToWindow = () => {
    // 清空搜索文本
    searchText.value = ''
    currentInterface.value = InterfaceType.WINDOW
  }

  /**
   * 打开插件窗口
   */
  const openPluginWindow = (pluginItem?: PluginItem) => {
    // 清空搜索文本
    searchText.value = ''
    // 设置当前插件项目
    currentPluginItem.value = pluginItem || null
    // 标记插件窗口已打开
    isPluginWindowOpen.value = true
    // 切换到窗口界面
    currentInterface.value = InterfaceType.WINDOW
  }

  /**
   * 关闭插件窗口
   */
  const closePluginWindow = async () => {
    try {
      // 获取当前插件项目的配置

      let closeAction: 'hide' | 'close' = 'hide' // 默认隐藏

      if (currentPluginItem.value?.executeParams?.closeAction) {
        closeAction = currentPluginItem.value.executeParams.closeAction
      }

      // 根据配置隐藏或关闭所有following窗口
      await api.ipcRouter.windowManageFollowingWindows(closeAction)

      // 更新本地状态
      isPluginWindowOpen.value = false
      currentPluginItem.value = null
    } catch (error) {
      console.error('关闭插件窗口时发生错误:', error)
      // 即使IPC调用失败，也要更新本地状态
      isPluginWindowOpen.value = false
      currentPluginItem.value = null
    }
  }

  /**
   * 更新搜索文本
   */
  const updateSearchText = (text: string) => {
    searchText.value = text

    // 如果有搜索内容，自动切换到搜索界面
    if (text.trim() !== '') {
      switchToSearch()
    }
  }

  /**
   * 更新搜索结果状态
   */
  const updateSearchResults = (hasResults: boolean) => {
    hasSearchResults.value = hasResults
  }

  /**
   * 清空搜索并返回默认界面
   */
  const clearSearch = () => {
    searchText.value = ''
    hasSearchResults.value = false
    // 根据当前界面状态决定是否切换
    if (currentInterface.value === InterfaceType.SEARCH) {
      // 如果当前是搜索界面，切换到窗口界面（默认界面）
      switchToWindow()
    }
  }

  /**
   * 关闭设置界面并聚焦输入框
   */
  const closeSettings = () => {
    // 清空搜索文本
    searchText.value = ''

    // 根据进入设置前的界面状态决定返回到哪个界面
    if (previousInterface.value) {
      currentInterface.value = previousInterface.value
      // 清空previousInterface状态
      previousInterface.value = null
    } else {
      // 如果没有记录之前的界面状态，默认返回到窗口界面
      // currentInterface.value = InterfaceType.WINDOW
    }

    // 返回一个Promise，让调用者知道需要聚焦输入框
    return Promise.resolve()
  }

  /**
   * 重置到默认状态
   */
  const resetToDefault = async () => {
    try {
      // 如果有插件窗口打开，先关闭它们
      if (isPluginWindowOpen.value) {
        await closePluginWindow()
      }
    } catch (error) {
      console.error('重置时关闭插件窗口发生错误:', error)
    }

    // 重置所有状态
    searchText.value = ''
    hasSearchResults.value = false
    isPluginWindowOpen.value = false
    currentPluginItem.value = null
    previousInterface.value = null
    currentInterface.value = InterfaceType.WINDOW
  }

  // 监听搜索文本变化，自动管理界面切换
  watch(
    () => searchText.value,
    (newText, oldText) => {
      // 如果搜索文本没有实际变化，不处理
      if (newText === oldText) return

      // 如果有搜索内容，无论当前在什么界面，都应该切换到搜索界面
      if (newText.trim() !== '') {
        switchToSearch()
        return
      }

      // 如果搜索内容为空，根据当前界面状态决定
      if (currentInterface.value === InterfaceType.SETTINGS) {
        // 在设置界面时，搜索内容为空保持设置界面
        return
      } else if (currentInterface.value === InterfaceType.WINDOW) {
        // 在窗口界面时，搜索内容为空保持窗口界面
        return
      } else if (currentInterface.value === InterfaceType.SEARCH) {
        // 从搜索界面返回时，检查是否有插件窗口打开
        if (isPluginWindowOpen.value) {
          // 如果有插件窗口打开，返回到插件界面
          switchToWindow()
        } else {
        }
      }
    }
  )

  // 监听插件窗口状态
  watch(
    () => currentInterface.value,
    (newVal, oldVal) => {
      if (newVal === InterfaceType.WINDOW && oldVal !== InterfaceType.WINDOW) { // 打开插件窗口时，切换到窗口界面
        api.ipcRouter.windowShowAllFollowingWindows()
      } else if (newVal !== InterfaceType.WINDOW && oldVal === InterfaceType.WINDOW) { // 关闭插件窗口时，切换到默认界面
        api.ipcRouter.windowHideAllFollowingWindows()
      }
    }
  )

  return {
    // 状态
    currentInterface,
    searchText,
    hasSearchResults,
    isPluginWindowOpen,
    currentPluginItem,
    activeInterface,

    // 计算属性
    isSearchInterface,
    isSettingsInterface,
    isWindowInterface,
    contentAreaVisible,

    // 方法
    switchToSearch,
    switchToSettings,
    switchToWindow,
    openPluginWindow,
    closePluginWindow,
    updateSearchText,
    updateSearchResults,
    clearSearch,
    closeSettings,
    resetToDefault
  }
}
