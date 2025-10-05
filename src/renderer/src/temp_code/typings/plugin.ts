import type { PluginConfig } from '@/typings/pluginTypes'

/**
 * 插件来源类型
 */
export enum PluginSourceType {
  /** 系统内置插件 */
  SYSTEM = 'system',
  /** 本地插件（ZIP、文件夹） */
  LOCAL = 'local',
  /** 远程插件（GitHub等） */
  REMOTE = 'remote'
}

/**
 * 插件安装器接口
 */
export interface PluginInstaller {
  /** 安装器名称 */
  readonly name: string
  /** 安装器类型 */
  readonly type: PluginSourceType
  /** 优先级权重（越小越优先） */
  readonly weight: number

  /**
   * 判断是否可以处理该来源
   * @param source 插件来源（可能是URL、路径、配置对象等）
   */
  canHandle(source: any): boolean

  /**
   * 获取插件列表
   * @param options 查询选项（如搜索关键词、页码等）
   */
  getList(options?: any): Promise<PluginConfig[]>

  /**
   * 安装插件
   * @param source 插件来源
   * @param options 安装选项
   */
  install(source: any, options?: InstallOptions): Promise<PluginConfig>

  /**
   * 卸载插件
   * @param pluginId 插件ID
   */
  uninstall(pluginId: string): Promise<boolean>

  /**
   * 更新插件列表缓存
   */
  updateList?(): Promise<void>
}

/**
 * 安装选项
 */
export interface InstallOptions {
  /** 是否跳过加载插件配置 */
  skipLoad?: boolean
  /** 是否强制重新安装 */
  force?: boolean
  /** 自定义资源路径解析器 */
  getResourcePath?: (...paths: string[]) => string
}

/**
 * 插件管理器配置
 */
export interface PluginManagerConfig {
  /** 存储键名 */
  storeKey?: string
  /** 是否自动加载已安装插件 */
  autoLoad?: boolean
}
