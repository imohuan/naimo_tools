import { defineStore } from 'pinia'
import { ref, computed, watch, shallowRef } from 'vue'
import { InterfaceType } from '@/temp_code/typings/ui'
import type { PluginItem } from '@/typings/pluginTypes'

/**
 * UI 状态管理 Store
 */
export const useUIStore = defineStore('ui', () => {
  // ==================== 状态 ====================
  /** 搜索查询文本 */
  const query = ref('')
  /** 界面类型 */
  const interfaceType = ref<InterfaceType>(InterfaceType.SEARCH)
  /** 当前激活的插件 - 使用 shallowRef 优化性能 */
  const activePlugin = shallowRef<PluginItem | null>(null)
  /** 是否有搜索结果 */
  const hasResults = ref(false)
  /** 输入框可见性 */
  const isInputVisible = ref(true)

  // ==================== 计算属性 ====================
  /** 插件是否激活 */
  const isPluginActive = computed(() => activePlugin.value !== null)
  /** 是否为搜索界面 */
  const isSearchInterface = computed(() => currentInterfaceType.value === InterfaceType.SEARCH)
  /** 是否为设置界面 */
  const isSettingsInterface = computed(() => currentInterfaceType.value === InterfaceType.SETTINGS)
  /** 是否为窗口界面 */
  const isWindowInterface = computed(() => currentInterfaceType.value === InterfaceType.WINDOW)

  /** 当前激活的界面 */
  const currentInterfaceType = computed(() => {
    const hasQuery = query.value.trim() !== ''

    // 设置界面优先级最高
    if (interfaceType.value === InterfaceType.SETTINGS) {
      return InterfaceType.SETTINGS
    }

    // 窗口界面（插件）优先级次之
    if (interfaceType.value === InterfaceType.WINDOW) {
      return InterfaceType.WINDOW
    }

    // 有搜索内容时显示搜索界面
    return hasQuery ? InterfaceType.SEARCH : interfaceType.value
  })

  /** 内容区域是否可见 */
  const isContentVisible = computed(() => {
    // 搜索界面：有搜索内容或有搜索结果时显示
    if (isSearchInterface.value) {
      return query.value.trim() !== '' || hasResults.value
    }
    // 设置界面和窗口界面：总是显示
    return isSettingsInterface.value || isWindowInterface.value
  })

  /** 搜索框是否可见 */
  const isSearchBoxVisible = computed(() => {
    // 如果不在插件窗口界面，总是显示搜索框
    if (!isWindowInterface.value || !isPluginActive.value) {
      return true
    }
    return isInputVisible.value
  })

  // ==================== 方法 ====================
  /**
   * 切换到搜索界面
   */
  const switchToSearch = () => {
    isInputVisible.value = true
    interfaceType.value = InterfaceType.SEARCH
  }

  /**
   * 切换到设置界面
   */
  const switchToSettings = () => {
    // 清空搜索文本和插件状态
    query.value = ''
    activePlugin.value = null
    interfaceType.value = InterfaceType.SETTINGS
  }

  /**
   * 切换到窗口界面
   */
  const switchToWindow = () => {
    // 清空搜索文本
    query.value = ''
    interfaceType.value = InterfaceType.WINDOW
  }

  /**
   * 打开插件窗口
   */
  const openPluginWindow = (pluginItem?: PluginItem | null) => {
    switchToWindow()
    activePlugin.value = pluginItem || null
  }

  /**
   * 关闭插件窗口
   */
  const closePluginWindow = () => {
    activePlugin.value = null
    switchToSearch()
  }

  /**
   * 关闭设置界面
   */
  const closeSettings = () => {
    // 返回到窗口界面或搜索界面
    if (isPluginActive.value) {
      switchToWindow()
    } else {
      switchToSearch()
    }
  }

  /**
   * 设置搜索结果状态
   */
  const setSearchResults = (value: boolean) => {
    hasResults.value = value
  }

  /**
   * 清空搜索
   */
  const clearSearch = () => {
    query.value = ''
    hasResults.value = false
  }

  /**
   * 重置到默认状态
   */
  const resetToDefault = () => {
    query.value = ''
    hasResults.value = false
    activePlugin.value = null
    interfaceType.value = InterfaceType.SEARCH
    isInputVisible.value = true
  }

  /**
   * 切换输入框可见性
   */
  const toggleInputVisibility = (value?: boolean) => {
    isInputVisible.value = value !== undefined ? value : !isInputVisible.value
  }

  // ==================== 监听器 ====================
  /**
   * 监听搜索文本变化，自动切换界面
   */
  watch(query, (newQuery, oldQuery) => {
    if (newQuery === oldQuery) return

    // 如果有搜索内容
    if (newQuery.trim() !== '') {
      // 在设置界面或窗口界面输入搜索内容时，不在这里处理界面切换
      // 界面切换由外部逻辑处理（会关闭设置view或插件view）
      if (
        interfaceType.value === InterfaceType.SETTINGS ||
        interfaceType.value === InterfaceType.WINDOW
      ) {
        return
      }

      // 只有在搜索界面时，保持搜索界面
      if (interfaceType.value === InterfaceType.SEARCH) {
        return
      }

      // 默认情况切换到搜索界面
      switchToSearch()
      return
    }

    // 如果清空了搜索内容
    if (newQuery.trim() === '') {
      // 如果有插件窗口打开，并且当前在搜索界面，则切换到窗口界面
      if (
        interfaceType.value === InterfaceType.SEARCH &&
        isPluginActive.value
      ) {
        switchToWindow()
      }
    }
  })

  // ==================== 返回 ====================
  return {
    // 状态
    query,
    interfaceType,
    activePlugin,
    hasResults,
    isInputVisible,

    // 计算属性
    isPluginActive,
    currentInterfaceType,
    isSearchInterface,
    isSettingsInterface,
    isWindowInterface,
    isContentVisible,
    isSearchBoxVisible,

    // 方法
    switchToSearch,
    switchToSettings,
    switchToWindow,
    openPluginWindow,
    closePluginWindow,
    closeSettings,
    setSearchResults,
    clearSearch,
    resetToDefault,
    toggleInputVisibility
  }
})

