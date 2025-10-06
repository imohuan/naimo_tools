import type { PluginConfig, PluginItem } from '@/typings/pluginTypes'
import type { PluginInstaller, PluginSourceType, InstallOptions } from '@/temp_code/typings/plugin'
import { isFunction } from '@shared/utils'

/**
 * 插件安装器基类
 * 提供通用的插件处理逻辑
 */
export abstract class BasePluginInstaller implements PluginInstaller {
  abstract readonly name: string
  abstract readonly type: PluginSourceType
  abstract readonly weight: number
  abstract readonly pluginType: string

  abstract canHandle(source: any): boolean
  abstract getList(options?: any): Promise<PluginConfig[]>
  abstract install(source: any, options?: InstallOptions): Promise<PluginConfig>
  abstract uninstall(pluginId: string): Promise<boolean>

  /**
   * 验证插件配置
   * @param pluginData 插件配置
   * @returns 是否有效
   */
  protected validatePluginConfig(pluginData: PluginConfig): boolean {
    if (!pluginData.id) return false
    if (!pluginData.name) return false
    if (!pluginData.version) return false
    if (!pluginData.author) return false
    if (!pluginData.icon) return false
    if (!pluginData.category) return false
    if (!pluginData.items || pluginData.items.length === 0) return false
    return true
  }

  /**
   * 统一处理插件的完整流程
   * 包括：验证、预处理、资源处理、设置项、创建配置
   * @param pluginData 插件配置
   * @param options 安装选项
   * @returns 处理完成的插件配置
   */
  protected async processPlugin(pluginData: PluginConfig, options?: InstallOptions): Promise<PluginConfig> {
    // 1. 验证配置
    if (!this.validatePluginConfig(pluginData)) {
      throw new Error(`插件配置无效: ${pluginData.id}`)
    }

    // 2. 预处理 - 加载插件主文件
    const hasItems = pluginData?.items && pluginData.items?.length > 0
    const firstItemHasOnEnter = hasItems &&
      pluginData.items?.[0]?.onEnter &&
      typeof pluginData.items?.[0]?.onEnter === 'function'

    // 如果已经有有效的 items，跳过加载
    if ((!firstItemHasOnEnter || !hasItems) && !options?.skipLoad) {
      if (!pluginData?.main) {
        throw new Error(`❌ 插件主文件不存在: ${pluginData.id}`)
      }

      const getResourcePath = (pluginData as any)?.getResourcePath
      pluginData.main = getResourcePath ? getResourcePath(pluginData.main) : pluginData.main

      // 加载配置文件
      let items: PluginItem[] = []
      const module: any = await naimo.webUtils.loadPluginConfig(pluginData.main as string)

      if (module?.items && module?.items?.length > 0) {
        items = module.items
      } else if (Array.isArray(module)) {
        items = module
      } else if (module && typeof module === 'object') {
        Object.keys(module).forEach(key => {
          if (isFunction(module[key])) return
          items.push({ ...module[key], path: key })
        })
      }

      // 为每个 item 添加默认的 type 字段（如果没有的话）
      items = items.map(item => ({
        ...item,
        type: item.type || 'text', // 默认为 text 类型
        category: pluginData.id, // 添加插件 ID 作为分类
      } as PluginItem))

      pluginData.items = items
    }

    // 3. 处理资源路径
    const resolver = options?.getResourcePath || (pluginData as any)?.getResourcePath
    if (resolver) {
      if (pluginData.icon) {
        pluginData.icon = resolver(pluginData.icon)
      }
      pluginData.items?.forEach(item => {
        if (item.icon) {
          item.icon = resolver(item.icon)
        }
      })
    }

    // 4. 设置插件项
    pluginData.items?.forEach(item => {
      item.pluginId = pluginData.id
      item.path = item.pluginId + ':' + item.path
    })

    // 5. 创建完整配置并添加类型标记
    const plugin = {
      ...pluginData,
      enabled: pluginData.enabled !== false,
    }

    // 6. 自动添加类型标记
    this.setPluginType(plugin)

    return plugin
  }

  /**
   * 为插件添加类型标记
   * @param plugin 插件配置
   */
  protected setPluginType(plugin: PluginConfig, options: any = {}): void {
    plugin.options = { ...(plugin.options || {}), ...options, pluginType: this.pluginType }
  }

  /**
   * 广播插件事件
   * @param event 事件名称
   * @param data 事件数据
   */
  protected async broadcastEvent(event: string, data: any): Promise<void> {
    await naimo.router.appForwardMessageToMainView(event, data)
  }
}
