/**
 * useSearchHeader - Vue 组合式函数
 * 为 Vue 组件提供 SearchHeaderManager 的便捷使用方式
 */

import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { Ref } from 'vue'
import { SearchHeaderManager, createSearchHeaderManager } from './SearchHeaderManager'
import type { SearchHeaderConfig, SearchHeaderState, SearchHeaderEvents } from './SearchHeaderManager'
import type { AttachedFile } from '@/typings/composableTypes'
import type { PluginItem } from '@/typings/pluginTypes'

/**
 * useSearchHeader 组合式函数的返回类型
 */
export interface UseSearchHeaderReturn {
  /** SearchHeaderManager 实例 */
  manager: SearchHeaderManager
  /** 响应式状态 */
  state: SearchHeaderState
  /** 状态的计算属性 */
  computed: {
    /** 是否应该显示文件信息 */
    shouldShowFileInfo: Ref<boolean>
    /** 是否应该显示插件信息 */
    shouldShowPluginInfo: Ref<boolean>
    /** 第一个文件 */
    firstFile: Ref<AttachedFile | null>
    /** 占位符文本 */
    placeholderText: Ref<string>
    /** 拖拽区域CSS类名 */
    dragAreaClasses: Ref<string>
    /** 拖拽区域样式 */
    dragAreaStyles: Ref<Record<string, string>>
    /** 非拖拽区域样式 */
    noDragStyles: Ref<Record<string, string>>
  }
  /** 操作方法 */
  actions: {
    /** 更新搜索文本 */
    updateSearchText: (text: string) => void
    /** 执行搜索 */
    performSearch: (text?: string) => void
    /** 处理输入 */
    handleInput: (text: string) => void
    /** 处理点击 */
    handleClick: () => void
    /** 打开设置 */
    openSettings: () => void
    /** 处理粘贴 */
    handlePaste: (event: ClipboardEvent) => void
    /** 添加文件 */
    addAttachedFiles: (files: AttachedFile[]) => void
    /** 清除文件 */
    clearAttachedFiles: () => void
    /** 设置插件 */
    setCurrentPluginItem: (plugin: PluginItem | null) => void
    /** 清除插件 */
    clearCurrentPlugin: () => void
    /** 聚焦搜索框 */
    focus: () => void
    /** 重置状态 */
    reset: () => void
    /** 设置搜索框可见性 */
    setSearchBoxVisibility: (visible: boolean) => void
    /** 切换搜索结果 */
    toggleSearchResults: () => void
  }
  /** 事件订阅方法 */
  events: {
    /** 订阅事件 */
    on: <K extends keyof SearchHeaderEvents>(event: K, handler: SearchHeaderEvents[K]) => void
    /** 取消订阅事件 */
    off: <K extends keyof SearchHeaderEvents>(event: K, handler: SearchHeaderEvents[K]) => void
  }
}

/**
 * useSearchHeader 组合式函数选项
 */
export interface UseSearchHeaderOptions {
  /** SearchHeaderManager 配置 */
  config?: Partial<SearchHeaderConfig>
  /** 是否使用现有的全局实例 */
  useGlobalInstance?: boolean
  /** 是否在组件卸载时销毁管理器 */
  autoDestroy?: boolean
}

/**
 * useSearchHeader 组合式函数
 * 为 Vue 组件提供搜索头部管理功能
 */
export function useSearchHeader(options: UseSearchHeaderOptions = {}): UseSearchHeaderReturn {
  const {
    config,
    useGlobalInstance = false,
    autoDestroy = true
  } = options

  // 创建或获取 SearchHeaderManager 实例
  const manager = useGlobalInstance
    ? (() => {
      // 这里可以从全局状态获取实例，暂时创建新实例
      return createSearchHeaderManager(config)
    })()
    : createSearchHeaderManager(config)

  // 获取响应式状态
  const state = manager.getStateRef()

  // 计算属性
  const shouldShowFileInfo = computed(() => manager.shouldShowFileInfo())
  const shouldShowPluginInfo = computed(() => manager.shouldShowPluginInfo())
  const firstFile = computed(() => manager.getFirstFile())
  const placeholderText = computed(() => manager.getPlaceholderText())
  const dragAreaClasses = computed(() => manager.getDragAreaClasses())
  const dragAreaStyles = computed(() => manager.getDragAreaStyles())
  const noDragStyles = computed(() => manager.getNoDragStyles())

  // 操作方法
  const actions = {
    updateSearchText: (text: string) => manager.updateSearchText(text),
    performSearch: (text?: string) => manager.performSearch(text),
    handleInput: (text: string) => manager.handleInput(text),
    handleClick: () => manager.handleClick(),
    openSettings: () => manager.openSettings(),
    handlePaste: (event: ClipboardEvent) => manager.handlePaste(event),
    addAttachedFiles: (files: AttachedFile[]) => manager.addAttachedFiles(files),
    clearAttachedFiles: () => manager.clearAttachedFiles(),
    setCurrentPluginItem: (plugin: PluginItem | null) => manager.setCurrentPluginItem(plugin),
    clearCurrentPlugin: () => manager.clearCurrentPlugin(),
    focus: () => manager.focus(),
    reset: () => manager.reset(),
    setSearchBoxVisibility: (visible: boolean) => manager.setSearchBoxVisibility(visible),
    toggleSearchResults: () => manager.toggleSearchResults()
  }

  // 事件订阅方法
  const events = {
    on: <K extends keyof SearchHeaderEvents>(event: K, handler: SearchHeaderEvents[K]) => {
      manager.on(event, handler)
    },
    off: <K extends keyof SearchHeaderEvents>(event: K, handler: SearchHeaderEvents[K]) => {
      manager.off(event, handler)
    }
  }

  // 生命周期处理
  onMounted(() => {
    console.log('SearchHeader 组合式函数已挂载')
  })

  onUnmounted(() => {
    if (autoDestroy && !useGlobalInstance) {
      manager.destroy()
    }
  })

  return {
    manager,
    state,
    computed: {
      shouldShowFileInfo,
      shouldShowPluginInfo,
      firstFile,
      placeholderText,
      dragAreaClasses,
      dragAreaStyles,
      noDragStyles
    },
    actions,
    events
  }
}

/**
 * 创建搜索头部事件处理器的辅助函数
 */
export function createSearchHeaderEventHandlers(manager: SearchHeaderManager) {
  return {
    // 基础事件处理器
    onUpdateSearchText: (text: string) => manager.updateSearchText(text),
    onSearch: (text: string) => manager.performSearch(text),
    onInput: (text: string) => manager.handleInput(text),
    onClick: () => manager.handleClick(),
    onOpenSettings: () => manager.openSettings(),

    // 拖拽事件处理器
    onDragOver: (event: DragEvent) => manager.handleDragOver(event),
    onDragEnter: (event: DragEvent) => manager.handleDragEnter(event),
    onDragLeave: (event: DragEvent) => manager.handleDragLeave(event),
    onDrop: (event: DragEvent) => manager.handleDrop(event),

    // 其他事件处理器
    onPaste: (event: ClipboardEvent) => manager.handlePaste(event),
    onClearFiles: () => manager.clearAttachedFiles(),
    onClearPlugin: () => manager.clearCurrentPlugin()
  }
}


