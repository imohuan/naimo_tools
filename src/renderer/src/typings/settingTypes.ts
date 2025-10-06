/**
 * 设置相关类型定义
 * 包含应用设置和插件设置的通用类型
 */

/**
 * 设置配置接口
 * JSON配置驱动生成设置组件
 */
export type SettingConfig = {
  /** 设置项名称（唯一标识） */
  name: string
  /** 设置项标题 */
  title: string
  /** 设置项描述 */
  description: string
  /** 设置项类型 */
  type: "input" | "select" | "checkbox" | "radio" | "textarea" | "number" | "date" | "time" | "datetime" | "file" | "image" | "video" | "audio" | "url" | "email" | "password" | "tel" | "search" | "range" | "color" | "hidden"
  /** 默认值（可以是值或返回值的函数） */
  defaultValue?: (() => any) | any
  /** 是否必填 */
  required?: boolean
  /** 选项配置（用于 select、range 等类型） */
  option?: any
  /** 子设置项（嵌套设置） */
  children?: SettingConfig[]
}

/**
 * 通用设置项接口
 * 用于表示应用设置或插件设置的分组
 */
export interface SettingItem {
  /** 设置组唯一标识 */
  id: string
  /** 设置组名称 */
  name: string
  /** 设置组图标 */
  icon?: string
  /** 设置组描述 */
  description?: string
  /** 设置项列表 */
  settings: SettingConfig[]
  /** 设置类型：app-应用设置, plugin-插件设置 */
  type: 'app' | 'plugin'
}

