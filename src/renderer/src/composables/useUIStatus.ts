import { ref, computed, watch } from 'vue'
import type { PluginItem } from '@/typings/plugin-types'

/**
 * 界面类型枚举
 */
export enum InterfaceType {
  /** 搜索界面：当搜索框有内容时显示 */
  SEARCH = 'search',
  /** 设置界面：搜索框无内容，点击设置按钮显示 */
  SETTINGS = 'settings',
  /** 窗口界面：搜索框无内容，点击插件执行相应方法显示 */
  WINDOW = 'window'
}

/**
 * 界面状态管理
 */
export function useUIStatus() {
  /** 搜索文本状态 */
  const searchText = ref('')
  /** 是否有搜索结果 */
  const hasSearchResults = ref(false)

  /** 当前界面类型 */
  const currentInterface = ref<InterfaceType>(InterfaceType.SEARCH)
  /** 当前执行的插件项目 */
  const currentPluginItem = ref<PluginItem | null>(null)
  /** 是否打开了插件窗口 - 基于 currentPluginItem 是否存在 */
  const isPluginWindowOpen = computed(() => currentPluginItem.value !== null)

  /** 计算当前应该显示的界面 */
  const activeInterface = computed(() => {
    // 如果有搜索内容，显示搜索界面
    if (searchText.value.trim() !== '') return InterfaceType.SEARCH
    // 如果没有搜索内容，根据当前界面状态决定
    return currentInterface.value
  })

  /** 界面状态计算属性 */
  const isSearchInterface = computed(() => activeInterface.value === InterfaceType.SEARCH)
  const isSettingsInterface = computed(() => activeInterface.value === InterfaceType.SETTINGS)
  const isWindowInterface = computed(() => activeInterface.value === InterfaceType.WINDOW)

  /** 内容区域是否可见 */
  const contentAreaVisible = computed(() => {
    // 搜索界面：有搜索内容或有搜索结果时显示
    if (isSearchInterface.value) {
      return searchText.value.trim() !== '' || hasSearchResults.value
    }
    // 设置界面和窗口界面：总是显示
    return isSettingsInterface.value || isWindowInterface.value
  })

  /** 是否应该显示搜索框 */
  const shouldShowSearchBox = computed(() => {
    /** 如果不在插件窗口界面，总是显示搜索框 */
    if (!isWindowInterface.value || !isPluginWindowOpen.value) {
      console.log('🔍 shouldShowSearchBox: true (不在插件窗口界面)')
      return true
    }

    /** 在插件窗口界面时，检查当前插件项目是否启用搜索 */
    const enableSearch = currentPluginItem.value?.executeParams?.enableSearch
    console.log('🔍 当前插件项目:', currentPluginItem.value?.name, 'enableSearch:', enableSearch)

    if (enableSearch === false) {
      console.log('🔍 shouldShowSearchBox: false (插件禁用搜索)')
      return false
    }

    /** 默认显示搜索框 */
    console.log('🔍 shouldShowSearchBox: true (默认显示)')
    return true
  })

  /**
   * 切换到搜索界面
   */
  const switchToSearch = () => {
    currentInterface.value = InterfaceType.SEARCH
  }

  /**
   * 清空搜索并返回默认界面
   */
  const clearSearch = () => {
    searchText.value = ''
    hasSearchResults.value = false
  }

  /**
   * 切换到设置界面
   */
  const switchToSettings = () => {
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
   * 关闭设置界面并聚焦输入框
   */
  const closeSettings = () => {
    // 清空搜索文本
    searchText.value = ''
    // 返回到窗口界面 或者 搜索界面
    if (isPluginWindowOpen.value) {
      switchToWindow()
    } else {
      switchToSearch()
    }
  }

  /**
   * 打开插件窗口
   */
  const openPluginWindow = (pluginItem?: PluginItem) => {
    switchToWindow()
    currentPluginItem.value = pluginItem || null
  }

  /**
   * 关闭插件窗口
   */
  const closePluginWindow = async () => {
    currentPluginItem.value = null
    switchToSearch()
  }


  /**
   * 更新搜索结果状态
   */
  const updateSearchResults = (hasResults: boolean) => {
    hasSearchResults.value = hasResults
  }


  /**
   * 重置到默认状态
   */
  const resetToDefault = async () => {
    // 重置所有状态
    searchText.value = ''
    hasSearchResults.value = false
    currentPluginItem.value = null
    currentInterface.value = InterfaceType.SEARCH
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

      // 如果有插件窗口打开，并且当前在搜索界面，则切换到窗口界面
      if (currentInterface.value === InterfaceType.SEARCH && isPluginWindowOpen.value) {
        switchToWindow()
        return
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
    shouldShowSearchBox,

    // 方法
    switchToSearch,
    switchToSettings,
    switchToWindow,
    openPluginWindow,
    closePluginWindow,
    updateSearchResults,
    clearSearch,
    closeSettings,
    resetToDefault
  }
}
