/**
 * SearchHeaderManager - 搜索头部管理器
 * 负责管理搜索头部区域的功能和状态，集成原生拖拽能力
 * 提供搜索头部的统一管理，支持新的 BaseWindow + WebContentsView 架构
 */

import { reactive } from 'vue'
import type { AttachedFile } from '@/typings/composableTypes'
import type { PluginItem } from '@/typings/pluginTypes'
import { BaseSingleton } from '../BaseSingleton'

/**
 * 搜索头部状态
 */
export interface SearchHeaderState {
  /** 搜索文本 */
  searchText: string
  /** 头部高度 */
  headerHeight: number
  /** 附加的文件 */
  attachedFiles: AttachedFile[]
  /** 当前插件项目 */
  currentPluginItem: PluginItem | null
  /** 是否在设置界面 */
  isSettingsInterface: boolean
  /** 是否显示搜索框 */
  shouldShowSearchBox: boolean
  /** 是否启用原生拖拽 */
  enableNativeDrag: boolean
  /** 搜索结果是否可见 */
  searchResultsVisible: boolean
}

/**
 * 搜索头部配置
 */
export interface SearchHeaderConfig {
  /** 默认头部高度 */
  defaultHeight: number
  /** 是否启用文件拖拽 */
  enableFileDrop: boolean
  /** 是否启用原生窗口拖拽 */
  enableNativeDrag: boolean
  /** 搜索延迟（毫秒） */
  searchDelay: number
  /** 最大附加文件数 */
  maxAttachedFiles: number
}

/**
 * 搜索头部事件
 */
export interface SearchHeaderEvents {
  /** 搜索事件 */
  'search': (text: string) => void
  /** 输入事件 */
  'input': (text: string) => void
  /** 搜索文本更新 */
  'search-text-updated': (text: string) => void
  /** 点击事件 */
  'click': () => void
  /** 打开设置 */
  'open-settings': () => void
  /** 粘贴事件 */
  'paste': (event: ClipboardEvent) => void
  /** 清除文件 */
  'clear-files': () => void
  /** 清除插件 */
  'clear-plugin': () => void
  /** 状态变化 */
  'state-changed': (state: SearchHeaderState) => void
  /** 请求聚焦 */
  'focus-requested': () => void
}

/**
 * 拖拽区域配置
 */
export interface DragAreaConfig {
  /** 是否启用拖拽 */
  enabled: boolean
  /** 拖拽区域选择器 */
  selector: string
  /** 拖拽提示文本 */
  dragHint?: string
  /** 是否阻止默认行为 */
  preventDefault: boolean
}

/**
 * SearchHeaderManager 类
 * 管理搜索头部的所有功能和状态
 */
export class SearchHeaderManager extends BaseSingleton {
  private config: SearchHeaderConfig
  private state: SearchHeaderState
  private eventHandlers: Map<string, Function[]> = new Map()
  private searchTimer?: number
  private dragAreaConfig: DragAreaConfig

  constructor(config?: Partial<SearchHeaderConfig>) {
    super()

    this.config = {
      defaultHeight: 60,
      enableFileDrop: true,
      enableNativeDrag: true,
      searchDelay: 300,
      maxAttachedFiles: 10,
      ...config
    }

    this.state = reactive({
      searchText: '',
      headerHeight: this.config.defaultHeight,
      attachedFiles: [],
      currentPluginItem: null,
      isSettingsInterface: false,
      shouldShowSearchBox: true,
      enableNativeDrag: this.config.enableNativeDrag,
      searchResultsVisible: false
    })

    this.dragAreaConfig = {
      enabled: this.config.enableNativeDrag,
      selector: '.search-header-drag-area',
      dragHint: '拖拽此区域移动窗口',
      preventDefault: true
    }

    this.initializeEventHandlers()
  }

  /**
   * 获取当前状态
   */
  public getState(): SearchHeaderState {
    return { ...this.state }
  }

  /**
   * 获取响应式状态引用
   */
  public getStateRef(): SearchHeaderState {
    return this.state
  }

  /**
   * 更新搜索文本
   */
  public updateSearchText(text: string): void {
    this.state.searchText = text
    this.emit('search-text-updated', text)
    this.debouncedSearch(text)
  }


  /**
   * 设置头部高度
   */
  public setHeaderHeight(height: number): void {
    this.state.headerHeight = height
    this.emitStateChanged()
  }

  /**
   * 添加附加文件
   */
  public addAttachedFiles(files: AttachedFile[]): void {
    const remainingSlots = this.config.maxAttachedFiles - this.state.attachedFiles.length
    const filesToAdd = files.slice(0, remainingSlots)

    this.state.attachedFiles.push(...filesToAdd)
    this.emitStateChanged()
  }

  /**
   * 清除附加文件
   */
  public clearAttachedFiles(): void {
    this.state.attachedFiles = []
    this.emit('clear-files')
    this.emitStateChanged()
  }

  /**
   * 设置当前插件项目
   */
  public setCurrentPluginItem(pluginItem: PluginItem | null): void {
    this.state.currentPluginItem = pluginItem
    this.emitStateChanged()
  }

  /**
   * 清除当前插件
   */
  public clearCurrentPlugin(): void {
    this.state.currentPluginItem = null
    this.emit('clear-plugin')
    this.emitStateChanged()
  }

  /**
   * 设置设置界面状态
   */
  public setSettingsInterface(isSettings: boolean): void {
    this.state.isSettingsInterface = isSettings
    this.emitStateChanged()
  }

  /**
   * 设置搜索框显示状态
   */
  public setSearchBoxVisibility(visible: boolean): void {
    this.state.shouldShowSearchBox = visible
    this.emitStateChanged()
  }

  /**
   * 设置搜索结果可见性
   */
  public setSearchResultsVisibility(visible: boolean): void {
    this.state.searchResultsVisible = visible
    this.emitStateChanged()
  }

  /**
   * 切换搜索结果显示
   */
  public toggleSearchResults(): void {
    this.setSearchResultsVisibility(!this.state.searchResultsVisible)
  }

  /**
   * 执行搜索
   */
  public performSearch(text?: string): void {
    const searchText = text || this.state.searchText
    if (searchText.trim()) {
      this.emit('search', searchText)
    }
  }

  /**
   * 处理输入事件
   */
  public handleInput(text: string): void {
    this.updateSearchText(text)
    this.emit('input', text)
  }

  /**
   * 处理点击事件
   */
  public handleClick(): void {
    this.emit('click')
  }

  /**
   * 打开设置
   */
  public openSettings(): void {
    this.emit('open-settings')
  }


  /**
   * 处理粘贴事件
   */
  public handlePaste(event: ClipboardEvent): void {
    this.emit('paste', event)
  }


  /**
   * 获取原生拖拽区域的CSS类名
   */
  public getDragAreaClasses(): string {
    if (!this.state.enableNativeDrag) {
      return ''
    }

    return 'native-drag-area'
  }

  /**
   * 获取原生拖拽样式
   */
  public getDragAreaStyles(): Record<string, string> {
    if (!this.state.enableNativeDrag) {
      return {}
    }

    return {
      '-webkit-app-region': 'drag',
      'user-select': 'none'
    }
  }

  /**
   * 获取非拖拽区域样式（用于交互元素）
   */
  public getNoDragStyles(): Record<string, string> {
    return {
      '-webkit-app-region': 'no-drag'
    }
  }

  /**
   * 启用/禁用原生拖拽
   */
  public setNativeDragEnabled(enabled: boolean): void {
    this.state.enableNativeDrag = enabled
    this.dragAreaConfig.enabled = enabled
    this.emitStateChanged()
  }

  /**
   * 检查是否应该显示第一个文件信息
   */
  public shouldShowFileInfo(): boolean {
    return this.state.attachedFiles.length > 0 && !this.state.currentPluginItem && !this.state.isSettingsInterface
  }

  /**
   * 检查是否应该显示插件信息
   */
  public shouldShowPluginInfo(): boolean {
    return this.state.currentPluginItem !== null && !this.state.isSettingsInterface
  }

  /**
   * 检查是否应该显示设置信息
   */
  public shouldShowSettingsInfo(): boolean {
    return this.state.isSettingsInterface
  }

  /**
   * 获取第一个文件
   */
  public getFirstFile(): AttachedFile | null {
    return this.state.attachedFiles[0] || null
  }

  /**
   * 获取占位符文本
   */
  public getPlaceholderText(): string {
    if (this.state.currentPluginItem) {
      return ''
    }

    if (this.state.attachedFiles.length > 0) {
      return '搜索支持该文件的应用...'
    }

    return '搜索应用和指令 / 拖拽文件到此处...'
  }

  /**
   * 重置状态
   */
  public reset(): void {
    this.state.searchText = ''
    this.state.attachedFiles = []
    this.state.currentPluginItem = null
    this.state.isSettingsInterface = false
    this.state.searchResultsVisible = false
    this.clearSearchTimer()
    this.emitStateChanged()
  }

  /**
   * 聚焦搜索框
   */
  public focus(): void {
    // 这个方法将在组件中实现具体的聚焦逻辑
    // 这里作为事件通知，由使用者处理
    this.emit('focus-requested')
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<SearchHeaderConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // 更新相关状态
    if (newConfig.defaultHeight !== undefined) {
      this.setHeaderHeight(newConfig.defaultHeight)
    }

    if (newConfig.enableNativeDrag !== undefined) {
      this.setNativeDragEnabled(newConfig.enableNativeDrag)
    }
  }

  /**
   * 获取当前配置
   */
  public getConfig(): SearchHeaderConfig {
    return { ...this.config }
  }

  /**
   * 初始化事件处理器
   */
  private initializeEventHandlers(): void {
    // 预留位置，可以添加默认的事件处理逻辑
  }

  /**
   * 防抖搜索
   */
  private debouncedSearch(text: string): void {
    this.clearSearchTimer()

    if (text.trim()) {
      this.searchTimer = window.setTimeout(() => {
        this.performSearch(text)
      }, this.config.searchDelay)
    }
  }

  /**
   * 清除搜索定时器
   */
  private clearSearchTimer(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
      this.searchTimer = undefined
    }
  }

  /**
   * 触发状态变化事件
   */
  private emitStateChanged(): void {
    this.emit('state-changed', this.getState())
  }

  /**
   * 添加事件监听器
   */
  public on<K extends keyof SearchHeaderEvents>(
    event: K,
    handler: SearchHeaderEvents[K]
  ): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  /**
   * 移除事件监听器
   */
  public off<K extends keyof SearchHeaderEvents>(
    event: K,
    handler: SearchHeaderEvents[K]
  ): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index !== -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * 触发事件
   */
  private emit<K extends keyof SearchHeaderEvents>(
    event: K,
    ...args: Parameters<SearchHeaderEvents[K]>
  ): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          (handler as any)(...args)
        } catch (error) {
          console.error(`搜索头部事件处理器执行失败: ${event}`, error)
        }
      })
    }
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    this.clearSearchTimer()
    this.eventHandlers.clear()
    console.log('SearchHeaderManager 已销毁')
  }
}

// 导出单例实例创建函数
export function createSearchHeaderManager(config?: Partial<SearchHeaderConfig>): SearchHeaderManager {
  return new SearchHeaderManager(config)
}

// 导出默认实例
export const searchHeaderManager = createSearchHeaderManager()

