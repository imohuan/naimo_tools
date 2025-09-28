/**
 * Composable 相关类型定义
 * 包含各种组合式函数使用的类型
 */

/** 附件文件 */
export interface AttachedFile {
  /** 文件名 */
  name: string
  /** 文件路径 */
  path: string
  /** 文件图标（可选） */
  icon?: string
  /** 文件类型 */
  type: string
  /** 文件大小 */
  size: number
}

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

/** 选择框选项接口 */
export interface SelectOption {
  value: string
  label: string
}
