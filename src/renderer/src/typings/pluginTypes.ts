import type { AppItem } from '../core/typings/search'
import type { SettingConfig } from './settingTypes'
import type { LifecycleType } from './windowTypes'

/** 插件钩子 */
export type PluginHook = (...args: any[]) => void | Promise<void>

export type CommandConfig = {
  name: string
  description: string
  handler: PluginHook
}

/** 插件执行逻辑类型 */
export enum PluginExecuteType {
  /** 默认打开软件 */
  OPEN_APP = 1,
  /** 打开网页链接 */
  OPEN_WEB_URL = 2,
  /** 在内容显示网页 */
  SHOW_WEBPAGE = 3,
  /** 执行自定义代码 */
  CUSTOM_CODE = 4
}

/** 插件分类枚举 */
export enum PluginCategoryType {
  /** 高效办公 */
  EFFICIENT_OFFICE = 'efficient_office',
  /** AI人工智能 */
  AI_ARTIFICIAL_INTELLIGENCE = 'ai_artificial_intelligence',
  /** 程序员必备 */
  DEVELOPER_ESSENTIALS = 'developer_essentials',
  /** 记录想法 */
  RECORD_IDEAS = 'record_ideas',
  /** 图像视频 */
  IMAGE_VIDEO = 'image_video',
  /** 媒体工具 */
  MEDIA_TOOLS = 'media_tools',
  /** 系统工具 */
  SYSTEM_TOOLS = 'system_tools',
  /** 好好学习 */
  STUDY_WELL = 'study_well',
  /** 脑洞大开 */
  BRAINSTORMING = 'brainstorming',
  /** 其他 */
  OTHER = 'other'
}

/** 插件分类配置 */
export const PLUGIN_CATEGORY_CONFIG = {
  [PluginCategoryType.EFFICIENT_OFFICE]: {
    name: '高效办公',
    description: '智能助手,轻松搞定办公琐事',
    icon: '🚀'
  },
  [PluginCategoryType.AI_ARTIFICIAL_INTELLIGENCE]: {
    name: 'AI人工智能',
    description: '与智能同行,赋能每一刻',
    icon: '🤖'
  },
  [PluginCategoryType.DEVELOPER_ESSENTIALS]: {
    name: '程序员必备',
    description: '让你更专注地改变世界',
    icon: '💻'
  },
  [PluginCategoryType.RECORD_IDEAS]: {
    name: '记录想法',
    description: '记录点滴灵感,创造无限可能',
    icon: '✏️'
  },
  [PluginCategoryType.IMAGE_VIDEO]: {
    name: '图像视频',
    description: '图片批量处理、屏幕录制',
    icon: '🎬'
  },
  [PluginCategoryType.MEDIA_TOOLS]: {
    name: '媒体工具',
    description: '处理图片、视频等媒体文件',
    icon: '🎬'
  },
  [PluginCategoryType.SYSTEM_TOOLS]: {
    name: '系统工具',
    description: '提升系统效能,优化数字生活',
    icon: '📷'
  },
  [PluginCategoryType.STUDY_WELL]: {
    name: '好好学习',
    description: '保持好奇心,不断探索新知',
    icon: '🎓'
  },
  [PluginCategoryType.BRAINSTORMING]: {
    name: '脑洞大开',
    description: '突破想象,启发奇思妙想',
    icon: '🧠'
  },
  [PluginCategoryType.OTHER]: {
    name: '其他',
    description: '其他类型的插件',
    icon: '🔌'
  }
} as const

/**
 * 插件功能进入/搜索时传递的数据类型定义
 */
export interface PluginItemData {
  files: {
    /** 文件名称 */
    name: string;
    /** 文件路径 */
    path: string;
    /** 文件大小，单位字节 */
    size: number;
    /** 文件类型（扩展名或 mime） */
    type: string;
    /** 原始文件类型 */
    originalType: string;
  }[]
  /** 用户输入的搜索文本 */
  searchText: string;
  /** 是否由热键触发功能 */
  hotkeyEmit: boolean;
  /** 功能完整路径（包含插件ID前缀） */
  fullPath: string
}

/** 插件配置接口 */
export interface PluginConfig {
  /** 插件唯一标识 */
  id: string
  /** 插件名称 */
  name: string
  /** 插件版本 */
  version: string
  /** 插件作者 */
  author?: string
  /** 插件图标 */
  icon?: string
  /** 插件描述 */
  description?: string
  /** 插件分类 */
  category?: PluginCategoryType
  /** 插件下载地址 */
  downloadUrl?: string

  // ===== 插件级别配置（所有 feature 共用） =====
  /** UI 页面路径（可选，如 ./index.html） */
  main?: string
  /** preload 脚本路径（必填，如 ./preload.js） */
  preload: string

  /** 功能列表（替代原 items 字段） */
  feature: PluginItem[]

  /** 插件配置选项 */
  options?: Record<string, any>
  /** 插件设置配置 */
  settings?: SettingConfig[]
  /** 是否启用 */
  enabled: boolean
  /** 单例 默认 true */
  singleton?: boolean
}

/** 插件项目类型 - 基于新的搜索系统 AppItem */
export type PluginItem = Partial<AppItem> & {
  /** 功能名称 */
  name: string;
  /** 功能路径（英文标识） */
  path: string;
  /** 功能完整路径（包含插件ID前缀，可选） */
  fullPath?: string;
  /** 功能图标，null 表示无图标 */
  icon: string | null;

  /** 插件ID */
  pluginId?: string
  /** 生命周期类型 */
  // lifecycleType?: LifecycleType
  /** 无需配置：单例 默认 true */
  singleton?: boolean
  /** 推荐 */
  recommend?: boolean
  [key: string]: any
}