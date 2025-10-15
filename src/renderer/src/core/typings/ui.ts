import type { PluginItem } from '@/typings/pluginTypes'

/**
 * 界面类型枚举
 */
export enum InterfaceType {
  /** 搜索界面 */
  SEARCH = 'search',
  /** 设置界面 */
  SETTINGS = 'settings',
  /** 窗口界面（插件） */
  WINDOW = 'window'
}

/**
 * UI 状态接口
 */
export interface UIState {
  /** 搜索文本 */
  searchText: string
  /** 当前界面类型 */
  currentInterface: InterfaceType
  /** 当前插件项 */
  currentPluginItem: PluginItem | null
  /** 是否有搜索结果 */
  hasSearchResults: boolean
  /** 是否显示输入框 */
  showInput: boolean
}

