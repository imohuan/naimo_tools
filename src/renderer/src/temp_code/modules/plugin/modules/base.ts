import type { PluginConfig } from '@/typings/pluginTypes'
import type { PluginInstaller, PluginSourceType, InstallOptions } from '@/temp_code/typings/plugin'
// import { isFunction } from '@shared/utils' // 已移除，懒加载架构不再需要

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
    // 以下字段改为可选
    // if (!pluginData.author) return false
    // if (!pluginData.icon) return false
    // if (!pluginData.category) return false

    // 验证 feature 字段（替代原 items）
    if (!pluginData.feature || pluginData.feature.length === 0) return false

    // 懒加载架构：不需要验证 preload，可以在执行时再加载
    // preload 字段是可选的，在插件配置了 main 时才需要

    return true
  }

  /**
   * 统一处理插件的完整流程（懒加载架构）
   * 包括：验证、资源处理、设置 feature、创建配置
   * @param pluginData 插件配置
   * @param options 安装选项
   * @returns 处理完成的插件配置
   */
  async processPlugin(pluginData: PluginConfig, options?: InstallOptions): Promise<PluginConfig> {
    // 1. 验证配置
    if (!this.validatePluginConfig(pluginData)) {
      throw new Error(`插件配置无效: ${pluginData.id}`)
    }

    // 2. 懒加载架构：不加载 config.js，只读取 manifest.json
    //    移除了 loadPluginItems 步骤

    // 3. 处理资源路径
    this.resolveResourcePaths(pluginData, options)

    // 4. 设置 feature（替代原来的 setupPluginItems）
    this.setupPluginFeatures(pluginData)

    // 5. 创建完整配置并添加类型标记
    const plugin = this.createPluginConfig(pluginData)

    // 6. 自动添加类型标记
    this.setPluginType(plugin)

    return plugin
  }

  // ===== 懒加载架构：移除 loadPluginItems 方法 =====
  // 不再加载 config.js，只读取 manifest.json
  // onEnter 等函数移到 preload.js 中，执行时才加载

  /** 处理资源路径 */
  resolveResourcePaths(pluginData: PluginConfig, options?: InstallOptions): void {
    const resolver = options?.getResourcePath || (pluginData as any)?.getResourcePath
    if (resolver) {
      // 处理插件图标
      if (pluginData.icon) {
        pluginData.icon = resolver(pluginData.icon)
      }
      // 处理 feature 的图标
      pluginData.feature?.forEach(item => {
        if (item.icon) {
          item.icon = resolver(item.icon)
        }
      })
      // 处理插件级别的 main 和 preload 路径
      if (pluginData.main) {
        pluginData.main = resolver(pluginData.main)
      }
      if (pluginData.preload) {
        pluginData.preload = resolver(pluginData.preload)
      }
    }
  }

  /** 设置插件 feature（替代原来的 setupPluginItems） */
  setupPluginFeatures(pluginData: PluginConfig): void {
    pluginData.feature?.forEach(item => {
      // 为每个 feature 添加 pluginId
      item.pluginId = pluginData.id
      // 为每个 feature 添加默认的 type 字段（如果没有的话）
      item.type = item.type || 'text'
      // 为每个 feature 的 path 添加插件ID前缀（如 translate-plugin:text-translate）
      item.fullPath = item.pluginId + ':' + item.path
      // 添加插件 ID 作为分类
      item.category = pluginData.id
      // 为每个 feature 添加 singleton 字段
      item.singleton = pluginData.singleton !== false
    })
  }

  /** 创建完整配置 */
  createPluginConfig(pluginData: PluginConfig): PluginConfig {
    return {
      ...pluginData,
      enabled: pluginData.enabled !== false,
    }
  }

  /**
   * 为插件添加类型标记
   * @param plugin 插件配置
   * @param options 选项
   */
  protected setPluginType(plugin: PluginConfig, options: any = {}): void {
    plugin.options = { ...(plugin?.options || {}), ...options, pluginType: this.pluginType }
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
