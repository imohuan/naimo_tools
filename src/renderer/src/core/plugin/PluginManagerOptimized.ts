/**
 * 优化的插件管理器
 * 提供更好的性能、错误处理和可维护性
 */

import type { PluginConfig, PluginHook, PluginItem, CommandConfig } from '@/typings/pluginTypes'
import type { CoreAPI } from '@/typings/coreTypes'
import { BaseSingleton } from '../BaseSingleton'
import { ElectronStoreBridge } from '../store/ElectronStoreBridge'
import type { AppConfig } from '@shared/typings'
import { getDefaultPlugins, getDefaultPluginById } from '@/modules/plugins/config/defaultPlugins'
import { PluginGithub } from './PluginGithub'
import { isFunction } from '@shared/utils'

/**
 * 插件管理器配置
 */
export interface PluginManagerConfig {
  /** 是否启用插件缓存 */
  enableCache: boolean
  /** 插件加载超时时间 (ms) */
  loadTimeout: number
  /** 最大并发加载数量 */
  maxConcurrentLoads: number
  /** 是否启用插件沙箱 */
  enableSandbox: boolean
  /** 插件热重载 */
  enableHotReload: boolean
}

/**
 * 插件状态
 */
export enum PluginStatus {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error'
}

/**
 * 插件错误信息
 */
export interface PluginError {
  pluginId: string
  message: string
  stack?: string
  timestamp: number
}

/**
 * 插件统计信息
 */
export interface PluginStats {
  /** 总插件数量 */
  totalPlugins: number
  /** 已启用插件数量 */
  enabledPlugins: number
  /** 错误插件数量 */
  errorPlugins: number
  /** 平均加载时间 */
  averageLoadTime: number
  /** 最后更新时间 */
  lastUpdateTime: number
}

/**
 * 优化的插件管理器
 */
export class PluginManagerOptimized extends BaseSingleton implements CoreAPI {
  private storeBridge: ElectronStoreBridge
  private storeKey: keyof AppConfig = 'installedPlugins'
  private github: PluginGithub

  // 插件数据
  public allAvailablePlugins = new Map<string, PluginConfig>()
  public installedPlugins = new Map<string, PluginConfig>()
  public hooks = new Map<string, PluginHook[]>()
  public commandList = new Map<string, CommandConfig>()

  // 插件状态管理
  private pluginStatus = new Map<string, PluginStatus>()
  private pluginErrors = new Map<string, PluginError>()
  private loadingPromises = new Map<string, Promise<PluginConfig>>()

  // GitHub插件
  public githubPlugins: PluginConfig[] = []

  // 配置
  private config: PluginManagerConfig = {
    enableCache: true,
    loadTimeout: 10000,
    maxConcurrentLoads: 5,
    enableSandbox: false,
    enableHotReload: false
  }

  // 统计信息
  private stats: PluginStats = {
    totalPlugins: 0,
    enabledPlugins: 0,
    errorPlugins: 0,
    averageLoadTime: 0,
    lastUpdateTime: 0
  }

  // 加载队列
  private loadQueue: string[] = []
  private currentLoading = 0

  constructor(config?: Partial<PluginManagerConfig>) {
    super()
    this.storeBridge = ElectronStoreBridge.getInstance()
    this.github = PluginGithub.getInstance()

    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PluginManagerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取当前配置
   */
  getConfig(): Readonly<PluginManagerConfig> {
    return { ...this.config }
  }

  /**
   * 获取插件统计信息
   */
  getStats(): Readonly<PluginStats> {
    this.updateStats()
    return { ...this.stats }
  }

  /**
   * 获取插件状态
   */
  getPluginStatus(pluginId: string): PluginStatus {
    return this.pluginStatus.get(pluginId) || PluginStatus.UNLOADED
  }

  /**
   * 获取插件错误信息
   */
  getPluginError(pluginId: string): PluginError | undefined {
    return this.pluginErrors.get(pluginId)
  }

  /**
   * 获取所有插件错误
   */
  getAllPluginErrors(): PluginError[] {
    return Array.from(this.pluginErrors.values())
  }

  /**
   * 清除插件错误
   */
  clearPluginError(pluginId: string): void {
    this.pluginErrors.delete(pluginId)
  }

  /**
   * 设置插件状态
   */
  private setPluginStatus(pluginId: string, status: PluginStatus): void {
    this.pluginStatus.set(pluginId, status)
    this.updateStats()
  }

  /**
   * 记录插件错误
   */
  private recordPluginError(pluginId: string, error: Error | string): void {
    const errorInfo: PluginError = {
      pluginId,
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: Date.now()
    }

    this.pluginErrors.set(pluginId, errorInfo)
    this.setPluginStatus(pluginId, PluginStatus.ERROR)

    console.error(`❌ 插件错误 [${pluginId}]:`, errorInfo)
  }

  /**
   * 获取已安装插件ID列表
   */
  async getInstalledPluginIds(): Promise<Set<string>> {
    try {
      const ids = await this.storeBridge.get(this.storeKey) as string[]
      return new Set(ids || [])
    } catch (error) {
      console.error('获取已安装插件ID失败:', error)
      return new Set()
    }
  }

  /**
   * 设置已安装插件ID列表
   */
  async setInstalledPluginIds(pluginIds: Set<string>): Promise<void> {
    try {
      const ids = Array.from(pluginIds)
      await this.storeBridge.set(this.storeKey, ids)
      this.stats.lastUpdateTime = Date.now()
    } catch (error) {
      console.error('设置已安装插件ID失败:', error)
      throw error
    }
  }

  /**
   * 初始化插件管理器
   */
  async initialize(): Promise<void> {
    console.log('🔌 初始化插件管理器...')
    const startTime = performance.now()

    try {
      // 并行执行初始化任务
      await Promise.all([
        this.loadDefaultPlugins(),
        this.loadInstalledPlugins(),
        this.loadGithubPlugins()
      ])

      const endTime = performance.now()
      console.log(`✅ 插件管理器初始化完成，耗时: ${(endTime - startTime).toFixed(2)}ms`)

      this.updateStats()
    } catch (error) {
      console.error('❌ 插件管理器初始化失败:', error)
      throw error
    }
  }

  /**
   * 加载默认插件
   */
  private async loadDefaultPlugins(): Promise<void> {
    try {
      const defaultPlugins = getDefaultPlugins()

      for (const plugin of defaultPlugins) {
        this.allAvailablePlugins.set(plugin.id, plugin)
        this.setPluginStatus(plugin.id, PluginStatus.LOADED)
      }

      console.log(`📦 加载了 ${defaultPlugins.length} 个默认插件`)
    } catch (error) {
      console.error('加载默认插件失败:', error)
      throw error
    }
  }

  /**
   * 加载已安装插件
   */
  private async loadInstalledPlugins(): Promise<void> {
    try {
      const installedIds = await this.getInstalledPluginIds()
      const loadPromises: Promise<void>[] = []

      for (const pluginId of installedIds) {
        loadPromises.push(this.loadInstalledPlugin(pluginId))
      }

      await Promise.allSettled(loadPromises)
      console.log(`📦 处理了 ${installedIds.size} 个已安装插件`)
    } catch (error) {
      console.error('加载已安装插件失败:', error)
    }
  }

  /**
   * 加载单个已安装插件
   */
  private async loadInstalledPlugin(pluginId: string): Promise<void> {
    try {
      this.setPluginStatus(pluginId, PluginStatus.LOADING)

      // 检查是否是默认插件
      const defaultPlugin = getDefaultPluginById(pluginId)
      if (defaultPlugin) {
        this.installedPlugins.set(pluginId, defaultPlugin)
        this.setPluginStatus(pluginId, PluginStatus.ENABLED)
        return
      }

      // 尝试从文件系统加载插件
      const plugin = await this.loadPluginFromFileSystem(pluginId)
      if (plugin) {
        this.installedPlugins.set(pluginId, plugin)
        this.allAvailablePlugins.set(pluginId, plugin)
        this.setPluginStatus(pluginId, PluginStatus.ENABLED)
      } else {
        throw new Error(`插件 ${pluginId} 未找到`)
      }
    } catch (error) {
      this.recordPluginError(pluginId, error as Error)
    }
  }

  /**
   * 从文件系统加载插件
   */
  private async loadPluginFromFileSystem(pluginId: string): Promise<PluginConfig | null> {
    try {
      // 这里应该实现从文件系统加载插件的逻辑
      // 暂时返回 null，表示未实现
      console.warn(`从文件系统加载插件 ${pluginId} 的功能尚未实现`)
      return null
    } catch (error) {
      console.error(`从文件系统加载插件 ${pluginId} 失败:`, error)
      return null
    }
  }

  /**
   * 加载 GitHub 插件列表
   */
  private async loadGithubPlugins(): Promise<void> {
    try {
      this.githubPlugins = await this.github.getPlugins()
      console.log(`🐙 加载了 ${this.githubPlugins.length} 个 GitHub 插件`)
    } catch (error) {
      console.error('加载 GitHub 插件失败:', error)
      // GitHub 插件加载失败不影响整体初始化
    }
  }

  /**
   * 安装插件
   */
  async install(pluginPath: string): Promise<boolean> {
    try {
      console.log(`🔧 开始安装插件: ${pluginPath}`)

      // 这里应该实现插件安装逻辑
      // 1. 验证插件
      // 2. 解析插件配置
      // 3. 复制插件文件
      // 4. 注册插件

      console.warn('插件安装功能尚未完全实现')
      return false
    } catch (error) {
      console.error('安装插件失败:', error)
      return false
    }
  }

  /**
   * 卸载插件
   */
  async uninstall(pluginId: string): Promise<boolean> {
    try {
      console.log(`🗑️ 开始卸载插件: ${pluginId}`)

      // 从已安装列表中移除
      this.installedPlugins.delete(pluginId)

      // 更新存储
      const installedIds = await this.getInstalledPluginIds()
      installedIds.delete(pluginId)
      await this.setInstalledPluginIds(installedIds)

      // 清理状态
      this.pluginStatus.delete(pluginId)
      this.pluginErrors.delete(pluginId)

      console.log(`✅ 插件 ${pluginId} 卸载成功`)
      return true
    } catch (error) {
      console.error('卸载插件失败:', error)
      return false
    }
  }

  /**
   * 启用/禁用插件
   */
  async toggle(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.installedPlugins.get(pluginId)
      if (!plugin) {
        throw new Error(`插件 ${pluginId} 未找到`)
      }

      const newEnabled = !plugin.enabled
      plugin.enabled = newEnabled

      this.setPluginStatus(
        pluginId,
        newEnabled ? PluginStatus.ENABLED : PluginStatus.DISABLED
      )

      console.log(`🔄 插件 ${pluginId} ${newEnabled ? '启用' : '禁用'}成功`)
      return true
    } catch (error) {
      console.error('切换插件状态失败:', error)
      this.recordPluginError(pluginId, error as Error)
      return false
    }
  }

  /**
   * 重新加载插件
   */
  async reload(pluginId: string): Promise<boolean> {
    try {
      console.log(`🔄 重新加载插件: ${pluginId}`)

      // 先卸载
      this.installedPlugins.delete(pluginId)
      this.pluginStatus.delete(pluginId)
      this.pluginErrors.delete(pluginId)

      // 重新加载
      await this.loadInstalledPlugin(pluginId)

      return this.getPluginStatus(pluginId) === PluginStatus.ENABLED
    } catch (error) {
      console.error('重新加载插件失败:', error)
      this.recordPluginError(pluginId, error as Error)
      return false
    }
  }

  /**
   * 获取插件项目
   */
  getInstalledPluginItem(pluginId: string, path: string): PluginItem | null {
    const plugin = this.installedPlugins.get(pluginId)
    if (!plugin) return null

    return plugin.items.find(item => item.path === path) || null
  }

  /**
   * 注册插件钩子
   */
  registerHook(hookName: string, hook: PluginHook): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, [])
    }
    this.hooks.get(hookName)!.push(hook)
  }

  /**
   * 执行插件钩子
   */
  async executeHook(hookName: string, ...args: any[]): Promise<any[]> {
    const hooks = this.hooks.get(hookName) || []
    const results: any[] = []

    for (const hook of hooks) {
      try {
        if (isFunction(hook.handler)) {
          const result = await hook.handler(...args)
          results.push(result)
        }
      } catch (error) {
        console.error(`执行钩子 ${hookName} 失败:`, error)
        this.recordPluginError(hook.pluginId, error as Error)
      }
    }

    return results
  }

  /**
   * 注册插件命令
   */
  registerCommand(command: CommandConfig): void {
    this.commandList.set(command.id, command)
  }

  /**
   * 执行插件命令
   */
  async executeCommand(commandId: string, ...args: any[]): Promise<any> {
    const command = this.commandList.get(commandId)
    if (!command) {
      throw new Error(`命令 ${commandId} 未找到`)
    }

    try {
      if (isFunction(command.handler)) {
        return await command.handler(...args)
      }
    } catch (error) {
      console.error(`执行命令 ${commandId} 失败:`, error)
      throw error
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.totalPlugins = this.allAvailablePlugins.size
    this.stats.enabledPlugins = Array.from(this.installedPlugins.values())
      .filter(plugin => plugin.enabled).length
    this.stats.errorPlugins = this.pluginErrors.size
  }

  /**
   * 获取插件详细信息
   */
  getPluginDetails(pluginId: string): {
    config?: PluginConfig
    status: PluginStatus
    error?: PluginError
    isInstalled: boolean
    isEnabled: boolean
  } {
    const config = this.allAvailablePlugins.get(pluginId)
    const status = this.getPluginStatus(pluginId)
    const error = this.getPluginError(pluginId)
    const isInstalled = this.installedPlugins.has(pluginId)
    const isEnabled = config?.enabled || false

    return {
      config,
      status,
      error,
      isInstalled,
      isEnabled
    }
  }

  /**
   * 搜索插件
   */
  searchPlugins(query: string): PluginConfig[] {
    const lowerQuery = query.toLowerCase()

    return Array.from(this.allAvailablePlugins.values())
      .filter(plugin =>
        plugin.name.toLowerCase().includes(lowerQuery) ||
        plugin.description?.toLowerCase().includes(lowerQuery) ||
        plugin.id.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => {
        // 按相关性排序
        const aScore = this.calculatePluginRelevance(a, query)
        const bScore = this.calculatePluginRelevance(b, query)
        return bScore - aScore
      })
  }

  /**
   * 计算插件相关性分数
   */
  private calculatePluginRelevance(plugin: PluginConfig, query: string): number {
    let score = 0
    const lowerQuery = query.toLowerCase()

    if (plugin.name.toLowerCase().includes(lowerQuery)) score += 10
    if (plugin.description?.toLowerCase().includes(lowerQuery)) score += 5
    if (plugin.id.toLowerCase().includes(lowerQuery)) score += 3

    // 已安装的插件优先级更高
    if (this.installedPlugins.has(plugin.id)) score += 20

    // 已启用的插件优先级更高
    if (plugin.enabled) score += 15

    return score
  }

  /**
   * 批量操作插件
   */
  async batchOperation(
    pluginIds: string[],
    operation: 'install' | 'uninstall' | 'enable' | 'disable' | 'reload'
  ): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = []
    const failed: string[] = []

    // 限制并发数量
    const chunks = this.chunkArray(pluginIds, this.config.maxConcurrentLoads)

    for (const chunk of chunks) {
      const promises = chunk.map(async (pluginId) => {
        try {
          let result = false

          switch (operation) {
            case 'install':
              result = await this.install(pluginId)
              break
            case 'uninstall':
              result = await this.uninstall(pluginId)
              break
            case 'enable':
            case 'disable':
              result = await this.toggle(pluginId)
              break
            case 'reload':
              result = await this.reload(pluginId)
              break
          }

          if (result) {
            success.push(pluginId)
          } else {
            failed.push(pluginId)
          }
        } catch (error) {
          console.error(`批量操作插件 ${pluginId} 失败:`, error)
          failed.push(pluginId)
        }
      })

      await Promise.allSettled(promises)
    }

    return { success, failed }
  }

  /**
   * 数组分块工具函数
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.allAvailablePlugins.clear()
    this.installedPlugins.clear()
    this.hooks.clear()
    this.commandList.clear()
    this.pluginStatus.clear()
    this.pluginErrors.clear()
    this.loadingPromises.clear()

    super.destroy()
  }
}

// 创建单例实例
export const pluginManagerOptimized = new PluginManagerOptimized()
