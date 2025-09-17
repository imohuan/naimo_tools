import type { AppItem } from '@shared/types'

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

/** 插件配置接口 */
export interface PluginConfig {
  /** 插件唯一标识 */
  id: string
  /** 插件名称 */
  name: string
  /** 插件描述 */
  description?: string
  /** 插件版本 */
  version: string
  /** 插件作者 */
  author?: string
  /** 插件图标 */
  icon?: string
  /** 插件分类 */
  category?: PluginCategoryType
  /** 是否启用 */
  enabled: boolean
  /** 插件项目列表 */
  items: PluginItem[]
  /** 插件配置选项 */
  options?: Record<string, any>
  /** 插件元数据 */
  metadata?: {
    /** 创建时间 */
    createdAt: number
    /** 更新时间 */
    updatedAt: number
    /** 安装时间 */
    installedAt: number
  }
}

/** 插件项目接口 */
export interface PluginItem extends AppItem {
  /** 插件ID */
  pluginId: string
  /** 插件描述 */
  description?: string
  /** 执行类型 */
  executeType: PluginExecuteType
  /** 开机启动 */
  autoStart?: boolean
  /** 执行参数 */
  executeParams?: {
    /** 网页URL（当executeType为SHOW_WEBPAGE时） */
    url?: string
    /** 自定义代码（当executeType为CUSTOM_CODE时） */
    code?: string
    /** 关闭插件窗口时的行为：'hide' 隐藏，'close' 关闭 */
    closeAction?: 'hide' | 'close'
    /** 是否启用搜索功能，默认为true */
    enableSearch?: boolean
    /** 其他参数 */
    [key: string]: any
  }
  /** 是否在分类中显示 */
  visible: boolean
  /** 排序权重 */
  weight?: number
}

/** 插件管理器接口 */
export interface PluginManager {
  /** 加载已安装的插件（仅从缓存中加载） */
  loadInstalledPlugins(): Promise<PluginConfig[]>
  /** 初始化插件系统（加载所有可用插件并安装已安装的插件） */
  initializePlugins(): Promise<PluginConfig[]>
  /** 获取所有可用的插件列表（包括默认插件和第三方插件） */
  getAllAvailablePlugins(): Promise<PluginConfig[]>
  /** 重新加载所有插件（清除缓存） */
  reloadAllPlugins(): Promise<PluginConfig[]>
  /** 安装插件 */
  installPlugin(pluginData: any): Promise<boolean>
  /** 从zip文件安装插件 */
  installPluginFromZip(zipPath: string): Promise<boolean>
  /** 卸载插件 */
  uninstallPlugin(pluginId: string): Promise<boolean>
  /** 启用/禁用插件 */
  togglePlugin(pluginId: string, enabled: boolean): Promise<boolean>
  /** 获取插件列表 */
  getPluginList(): Promise<PluginConfig[]>
  /** 执行插件项目 */
  executePluginItem(item: PluginItem): Promise<void>
  /** 获取默认插件列表 */
  getDefaultPlugins(): PluginConfig[]
  /** 获取第三方插件列表 */
  getThirdPartyPlugins(): PluginConfig[]
  /** 检查插件是否为默认插件 */
  isDefaultPlugin(pluginId: string): boolean
}

/** 插件分类接口 */
export interface PluginCategory {
  /** 分类ID */
  id: string
  /** 分类名称 */
  name: string
  /** 分类描述 */
  description?: string
  /** 分类图标 */
  icon?: string
  /** 是否启用 */
  enabled: boolean
  /** 插件列表 */
  plugins: PluginConfig[]
  /** 最大显示数量 */
  maxDisplayCount: number
  /** 是否展开显示全部 */
  isExpanded: boolean
}
