import type { AppItem } from '@/temp_code/typings/search'

/** 搜索提供者接口 */
export interface SearchProvider {
  /** 提供者类型 */
  type: string
  /** 搜索方法 */
  search: (query: string, items: AppItem[]) => AppItem[]
  /** 提供者名称 */
  name?: string
  /** 优先级 */
  priority?: number
}

/** 搜索选项 */
export interface SearchOptions {
  /** 最大结果数量 */
  maxResults?: number
  /** 搜索提供者 */
  providers?: SearchProvider[]
  /** 是否启用拼音搜索 */
  enablePinyin?: boolean
  /** 是否启用模糊搜索 */
  enableFuzzy?: boolean
}

/** 搜索结果 */
export interface SearchResult {
  /** 匹配的项目 */
  item: AppItem
  /** 匹配分数 */
  score: number
  /** 匹配类型 */
  matchType: 'exact' | 'fuzzy' | 'pinyin'
  /** 匹配的字段 */
  matchedFields: string[]
}

/** 快捷键处理器 */
export type HotkeyHandler = () => void | Promise<void>

/** 快捷键选项 */
export interface HotkeyOptions {
  /** 是否阻止默认行为 */
  preventDefault?: boolean
  /** 是否阻止事件冒泡 */
  stopPropagation?: boolean
  /** 作用域 */
  scope?: string
  /** 是否持久化 */
  persistent?: boolean
}

/** 核心API基础接口 */
export interface CoreAPI {
  /** 初始化 */
  initialize: (...args: any[]) => Promise<any>
  /** 销毁 */
  destroy: () => Promise<void>
  /** 重置 */
  reset: () => void
}
