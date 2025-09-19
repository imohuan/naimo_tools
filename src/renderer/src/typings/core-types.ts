import type { AppItem } from '@shared/types'

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

/** 插件钩子 */
export type PluginHook = (...args: any[]) => void | Promise<void>

/** 插件API接口 */
export interface PluginAPI {
  /** 注册命令 */
  registerCommand: (command: PluginCommand) => void
  /** 注册视图 */
  registerView: (view: PluginView) => void
  /** 注册钩子 */
  onHook: (event: string, handler: PluginHook) => void
  /** 触发钩子 */
  emitHook: (event: string, ...args: any[]) => void
  /** 获取配置 */
  getConfig: (key: string) => any
  /** 设置配置 */
  setConfig: (key: string, value: any) => void
}

/** 插件命令 */
export interface PluginCommand {
  /** 命令ID */
  id: string
  /** 命令名称 */
  name: string
  /** 命令描述 */
  description?: string
  /** 命令处理器 */
  handler: () => void | Promise<void>
  /** 快捷键 */
  hotkey?: string
}

/** 插件视图 */
export interface PluginView {
  /** 视图ID */
  id: string
  /** 视图名称 */
  name: string
  /** 视图组件 */
  component: any
  /** 视图配置 */
  config?: Record<string, any>
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

/** Electron桥接层基础接口 */
export interface ElectronBridge {
  /** 检查Electron是否可用 */
  isAvailable(): boolean
  /** 重新检查Electron可用性 */
  recheckAvailability(): void
}

/** 快捷键桥接层接口 */
export interface HotkeyBridge extends ElectronBridge {
  /** 注册全局快捷键 */
  registerGlobalHotkey(config: any): Promise<boolean>
  /** 注销全局快捷键 */
  unregisterGlobalHotkey(id: string): Promise<boolean>
  /** 检查全局快捷键是否已注册 */
  isGlobalHotkeyRegistered(keys: string): Promise<boolean>
  /** 获取所有已注册的全局快捷键 */
  getAllRegisteredHotkeys(): any[]
  /** 清除所有全局快捷键 */
  clearAllGlobalHotkeys(): Promise<boolean>
}

/** 搜索桥接层接口 */
export interface SearchBridge extends ElectronBridge {
  /** 搜索应用程序 */
  searchApps(query: string): Promise<any[]>
  /** 获取所有应用程序 */
  getAllApps(): Promise<any[]>
  /** 获取最近使用的应用程序 */
  getRecentApps(limit?: number): Promise<any[]>
  /** 获取收藏的应用程序 */
  getPinnedApps(): Promise<any[]>
  /** 执行应用程序 */
  executeApp(appItem: any): Promise<boolean>
  /** 添加到收藏 */
  pinApp(appItem: any): Promise<boolean>
  /** 从收藏中移除 */
  unpinApp(appItem: any): Promise<boolean>
  /** 获取应用程序图标 */
  getAppIcon(appItem: any): Promise<string | null>
  /** 获取应用程序详细信息 */
  getAppDetails(appItem: any): Promise<any>
  /** 刷新应用程序列表 */
  refreshApps(): Promise<boolean>
}

/** 插件桥接层接口 */
export interface PluginBridge extends ElectronBridge {
  /** 加载插件 */
  loadPlugin(pluginPath: string): Promise<any>
  /** 卸载插件 */
  unloadPlugin(pluginId: string): Promise<boolean>
  /** 执行插件项目 */
  executePluginItem(item: any): Promise<boolean>
  /** 获取插件列表 */
  getPluginList(): Promise<any[]>
  /** 安装插件 */
  installPlugin(pluginData: any): Promise<boolean>
  /** 从ZIP文件安装插件 */
  installPluginFromZip(zipPath: string): Promise<boolean>
  /** 获取插件配置 */
  getPluginConfig(pluginId: string): Promise<any>
  /** 设置插件配置 */
  setPluginConfig(pluginId: string, config: any): Promise<boolean>
  /** 获取插件目录 */
  getPluginDirectory(): Promise<string>
  /** 检查插件更新 */
  checkPluginUpdates(): Promise<any[]>
  /** 更新插件 */
  updatePlugin(pluginId: string): Promise<boolean>
}