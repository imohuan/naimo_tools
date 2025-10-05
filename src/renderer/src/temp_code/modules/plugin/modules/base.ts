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

  abstract canHandle(source: any): boolean
  abstract getList(options?: any): Promise<PluginConfig[]>
  abstract install(source: any, options?: InstallOptions): Promise<PluginConfig>
  abstract uninstall(pluginId: string): Promise<boolean>

  /**
   * 验证插件配置
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
   * 预处理插件配置
   * 加载插件主文件，生成插件项列表
   */
  protected async preprocessPlugin(pluginData: PluginConfig): Promise<PluginConfig> {
    const hasItems = pluginData?.items && pluginData.items?.length > 0
    const firstItemHasOnEnter = hasItems &&
      pluginData.items?.[0]?.onEnter &&
      typeof pluginData.items?.[0]?.onEnter === 'function'

    // 如果已经有有效的 items，直接返回
    if (firstItemHasOnEnter && hasItems) {
      return pluginData
    }

    // 需要加载插件配置文件
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

    pluginData.items = items
    return pluginData
  }

  /**
   * 处理插件资源路径
   */
  protected processPluginResources(pluginData: PluginConfig, getResourcePath?: (...paths: string[]) => string): void {
    const resolver = getResourcePath || (pluginData as any)?.getResourcePath

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
  }

  /**
   * 设置插件项的基本信息
   */
  protected setupPluginItems(pluginData: PluginConfig): void {
    pluginData.items?.forEach(item => {
      item.pluginId = pluginData.id
      item.path = item.pluginId + ':' + item.path
    })
  }

  /**
   * 创建完整的插件配置
   */
  protected createPluginConfig(pluginData: PluginConfig): PluginConfig {
    return {
      ...pluginData,
      enabled: pluginData.enabled !== false,
      metadata: {
        createdAt: pluginData.metadata?.createdAt || Date.now(),
        installedAt: pluginData.metadata?.installedAt || Date.now(),
        updatedAt: Date.now(),
      }
    }
  }

  /**
   * 广播插件事件
   */
  protected async broadcastEvent(event: string, data: any): Promise<void> {
    await naimo.router.appForwardMessageToMainView(event, data)
  }
}
