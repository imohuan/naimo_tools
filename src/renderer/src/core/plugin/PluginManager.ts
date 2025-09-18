import type { PluginConfig, PluginItem, PluginCategoryType } from '@/typings/plugin-types'
import type { PluginAPI, PluginHook, PluginCommand, PluginView, CoreAPI } from '@/typings/core-types'
import { electronPluginBridge } from './ElectronPluginBridge'
import { BaseSingleton } from '../BaseSingleton'

/**
 * 插件管理器核心类
 * 处理插件逻辑，不依赖Vue框架
 */
export class PluginManager extends BaseSingleton implements CoreAPI {
  private plugins: Map<string, PluginConfig> = new Map()
  private hooks: Map<string, PluginHook[]> = new Map()
  private commands: Map<string, PluginCommand> = new Map()
  private views: Map<string, PluginView> = new Map()
  private isInitialized = false

  /**
   * 初始化插件管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // 初始化默认钩子
    this.hooks.set('plugin:loaded', [])
    this.hooks.set('plugin:unloaded', [])
    this.hooks.set('plugin:enabled', [])
    this.hooks.set('plugin:disabled', [])

    this.isInitialized = true
    console.log('🔌 PluginManager 初始化完成')
  }

  /**
   * 销毁插件管理器
   */
  async destroy(): Promise<void> {
    // 卸载所有插件
    const pluginIds = Array.from(this.plugins.keys())
    for (const id of pluginIds) {
      await this.unloadPlugin(id)
    }

    this.plugins.clear()
    this.hooks.clear()
    this.commands.clear()
    this.views.clear()
    this.isInitialized = false
    console.log('🔌 PluginManager 已销毁')
  }

  /**
   * 重置插件管理器
   */
  reset(): void {
    this.plugins.clear()
    this.hooks.clear()
    this.commands.clear()
    this.views.clear()
  }

  /**
   * 加载插件
   */
  async loadPlugin(pluginData: PluginConfig): Promise<boolean> {
    try {
      const { id, name, version } = pluginData

      // 检查插件是否已存在
      if (this.plugins.has(id)) {
        console.warn(`插件 ${id} 已存在，将被覆盖`)
        await this.unloadPlugin(id)
      }

      // 验证插件数据
      if (!this.validatePlugin(pluginData)) {
        console.error(`插件 ${id} 数据验证失败`)
        return false
      }

      // 设置插件元数据
      const plugin: PluginConfig = {
        ...pluginData,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          installedAt: Date.now(),
          ...pluginData.metadata
        }
      }

      // 注册插件
      this.plugins.set(id, plugin)

      // 注册插件命令
      for (const item of plugin.items) {
        if (item.executeType === 4) { // CUSTOM_CODE
          this.registerCommand({
            id: `${id}:${item.name}`,
            name: item.name,
            description: item.description,
            handler: () => this.executePluginItem(item)
          })
        }
      }

      // 触发插件加载钩子
      await this.executeHook('plugin:loaded', plugin)

      console.log(`🔌 加载插件成功: ${name} v${version}`)
      return true
    } catch (error) {
      console.error(`🔌 加载插件失败: ${pluginData.id}`, error)
      return false
    }
  }

  /**
   * 卸载插件
   */
  async unloadPlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId)
      if (!plugin) {
        console.warn(`插件 ${pluginId} 不存在`)
        return false
      }

      // 触发插件卸载钩子
      await this.executeHook('plugin:unloaded', plugin)

      // 注销插件命令
      for (const item of plugin.items) {
        const commandId = `${pluginId}:${item.name}`
        this.unregisterCommand(commandId)
      }

      // 移除插件
      this.plugins.delete(pluginId)

      console.log(`🔌 卸载插件成功: ${plugin.name}`)
      return true
    } catch (error) {
      console.error(`🔌 卸载插件失败: ${pluginId}`, error)
      return false
    }
  }

  /**
   * 启用/禁用插件
   */
  async togglePlugin(pluginId: string, enabled: boolean): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId)
      if (!plugin) {
        console.warn(`插件 ${pluginId} 不存在`)
        return false
      }

      if (plugin.enabled === enabled) {
        return true // 状态未改变
      }

      // 更新插件状态
      const updatedPlugin = {
        ...plugin,
        enabled,
        metadata: {
          createdAt: plugin.metadata?.createdAt || Date.now(),
          updatedAt: Date.now(),
          installedAt: plugin.metadata?.installedAt || Date.now(),
          ...plugin.metadata
        }
      }

      this.plugins.set(pluginId, updatedPlugin)

      // 触发状态变更钩子
      const hookName = enabled ? 'plugin:enabled' : 'plugin:disabled'
      await this.executeHook(hookName, updatedPlugin)

      console.log(`🔌 ${enabled ? '启用' : '禁用'}插件: ${plugin.name}`)
      return true
    } catch (error) {
      console.error(`🔌 切换插件状态失败: ${pluginId}`, error)
      return false
    }
  }

  /**
   * 执行插件项目
   */
  async executePluginItem(item: PluginItem): Promise<void> {
    try {
      const { executeType } = item

      switch (executeType) {
        case 1: // OPEN_APP
          await this.executeOpenApp(item)
          break
        case 2: // OPEN_WEB_URL
          await this.executeOpenWebUrl(item)
          break
        case 3: // SHOW_WEBPAGE
          await this.executeShowWebpage(item)
          break
        case 4: // CUSTOM_CODE
          await this.executeCustomCode(item)
          break
        default:
          console.warn(`未知的执行类型: ${executeType}`)
      }

      console.log(`🔌 执行插件项目: ${item.name}`)
    } catch (error) {
      console.error(`🔌 执行插件项目失败: ${item.name}`, error)
    }
  }

  /**
   * 注册钩子
   */
  registerHook(event: string, handler: PluginHook): void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, [])
    }
    this.hooks.get(event)!.push(handler)
    console.log(`🔌 注册钩子: ${event}`)
  }

  /**
   * 注销钩子
   */
  unregisterHook(event: string, handler: PluginHook): void {
    const handlers = this.hooks.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
        console.log(`🔌 注销钩子: ${event}`)
      }
    }
  }

  /**
   * 执行钩子
   */
  async executeHook(event: string, ...args: any[]): Promise<void> {
    const handlers = this.hooks.get(event)
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(...args)
        } catch (error) {
          console.error(`🔌 执行钩子失败: ${event}`, error)
        }
      }
    }
  }

  /**
   * 注册命令
   */
  registerCommand(command: PluginCommand): void {
    this.commands.set(command.id, command)
    console.log(`🔌 注册命令: ${command.name}`)
  }

  /**
   * 注销命令
   */
  unregisterCommand(commandId: string): void {
    if (this.commands.delete(commandId)) {
      console.log(`🔌 注销命令: ${commandId}`)
    }
  }

  /**
   * 注册视图
   */
  registerView(view: PluginView): void {
    this.views.set(view.id, view)
    console.log(`🔌 注册视图: ${view.name}`)
  }

  /**
   * 注销视图
   */
  unregisterView(viewId: string): void {
    if (this.views.delete(viewId)) {
      console.log(`🔌 注销视图: ${viewId}`)
    }
  }

  /**
   * 获取插件列表
   */
  getPlugins(): PluginConfig[] {
    return Array.from(this.plugins.values())
  }

  /**
   * 根据分类获取插件
   */
  getPluginsByCategory(category: PluginCategoryType): PluginConfig[] {
    return this.getPlugins().filter(plugin => plugin.category === category)
  }

  /**
   * 获取启用的插件
   */
  getEnabledPlugins(): PluginConfig[] {
    return this.getPlugins().filter(plugin => plugin.enabled)
  }

  /**
   * 获取插件
   */
  getPlugin(pluginId: string): PluginConfig | undefined {
    return this.plugins.get(pluginId)
  }

  /**
   * 获取命令列表
   */
  getCommands(): PluginCommand[] {
    return Array.from(this.commands.values())
  }

  /**
   * 获取视图列表
   */
  getViews(): PluginView[] {
    return Array.from(this.views.values())
  }

  /**
   * 创建插件API
   */
  createPluginAPI(pluginId: string): PluginAPI {
    return {
      registerCommand: (command: PluginCommand) => {
        this.registerCommand(command)
      },
      registerView: (view: PluginView) => {
        this.registerView(view)
      },
      onHook: (event: string, handler: PluginHook) => {
        this.registerHook(event, handler)
      },
      emitHook: (event: string, ...args: any[]) => {
        this.executeHook(event, ...args)
      },
      getConfig: (key: string) => {
        const plugin = this.getPlugin(pluginId)
        return plugin?.options?.[key]
      },
      setConfig: (key: string, value: any) => {
        const plugin = this.getPlugin(pluginId)
        if (plugin) {
          plugin.options = { ...plugin.options, [key]: value }
          this.plugins.set(pluginId, plugin)
        }
      }
    }
  }

  /**
   * 验证插件数据
   */
  private validatePlugin(plugin: PluginConfig): boolean {
    if (!plugin.id || !plugin.name || !plugin.version) {
      return false
    }

    if (!Array.isArray(plugin.items)) {
      return false
    }

    for (const item of plugin.items) {
      if (!item.name || !item.pluginId) {
        return false
      }
    }

    return true
  }

  /**
   * 执行打开应用
   */
  private async executeOpenApp(item: PluginItem): Promise<void> {
    try {
      const success = await electronPluginBridge.executePluginItem(item)
      if (!success) {
        console.error(`🔌 打开应用失败: ${item.name}`)
      }
    } catch (error) {
      console.error(`🔌 打开应用异常: ${item.name}`, error)
    }
  }

  /**
   * 执行打开网页
   */
  private async executeOpenWebUrl(item: PluginItem): Promise<void> {
    try {
      const success = await electronPluginBridge.executePluginItem(item)
      if (!success) {
        console.error(`🔌 打开网页失败: ${item.name}`)
      }
    } catch (error) {
      console.error(`🔌 打开网页异常: ${item.name}`, error)
    }
  }

  /**
   * 执行显示网页
   */
  private async executeShowWebpage(item: PluginItem): Promise<void> {
    try {
      const success = await electronPluginBridge.executePluginItem(item)
      if (!success) {
        console.error(`🔌 显示网页失败: ${item.name}`)
      }
    } catch (error) {
      console.error(`🔌 显示网页异常: ${item.name}`, error)
    }
  }

  /**
   * 执行自定义代码
   */
  private async executeCustomCode(item: PluginItem): Promise<void> {
    const code = item.executeParams?.code
    if (code) {
      try {
        // 注意：这里需要安全地执行代码
        // 实际实现中应该使用沙箱环境
        console.log(`🔌 执行自定义代码: ${item.name}`)
      } catch (error) {
        console.error(`🔌 执行自定义代码失败: ${item.name}`, error)
      }
    }
  }

  /**
   * 获取插件统计信息
   */
  getStats(): {
    total: number
    enabled: number
    disabled: number
    byCategory: Record<string, number>
  } {
    const plugins = this.getPlugins()
    const enabled = plugins.filter(p => p.enabled).length
    const disabled = plugins.filter(p => !p.enabled).length

    const byCategory: Record<string, number> = {}
    for (const plugin of plugins) {
      const category = plugin.category || 'other'
      byCategory[category] = (byCategory[category] || 0) + 1
    }

    return {
      total: plugins.length,
      enabled,
      disabled,
      byCategory
    }
  }
}

// 导出单例实例
export const pluginManager = PluginManager.getInstance()
