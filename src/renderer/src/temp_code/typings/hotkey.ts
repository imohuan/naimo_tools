/**
 * 快捷键类型枚举
 */
export enum HotkeyType {
  /** 全局快捷键（在应用外也能触发） */
  GLOBAL = 'global',
  /** 应用内快捷键（仅在应用内触发） */
  APPLICATION = 'application'
}

/**
 * 快捷键配置接口
 */
export interface HotkeyConfig {
  /** 唯一标识符 */
  id: string
  /** 快捷键组合（例如: 'Ctrl+K', 'Alt+Shift+S'） */
  keys: string
  /** 快捷键类型 */
  type: HotkeyType
  /** 是否启用 */
  enabled: boolean
  /** 快捷键名称 */
  name?: string
  /** 快捷键描述 */
  description?: string
  /** 快捷键作用域（仅应用内快捷键有效） */
  scope?: string
  /** 是否阻止默认行为 */
  preventDefault?: boolean
  /** 是否阻止事件传播 */
  stopPropagation?: boolean
  /** 回调函数（可选，可以通过事件监听） */
  callback?: (event?: KeyboardEvent) => void
}

/**
 * 快捷键设置配置
 */
export interface HotkeySettingsConfig {
  /** 全局快捷键分组 */
  global: HotkeyConfig[]
  /** 应用内快捷键分组 */
  application: HotkeyConfig[]
}

/**
 * 快捷键统计信息
 */
export interface HotkeyStats {
  /** 总数 */
  total: number
  /** 全局快捷键数量 */
  globalCount: number
  /** 应用内快捷键数量 */
  appCount: number
  /** 已启用数量 */
  enabledCount: number
  /** 已禁用数量 */
  disabledCount: number
}

