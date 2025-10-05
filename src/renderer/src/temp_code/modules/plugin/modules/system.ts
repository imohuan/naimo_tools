import type { PluginConfig } from '@/typings/pluginTypes'
import { BasePluginInstaller } from './base'
import { PluginSourceType, type InstallOptions } from '@/temp_code/typings/plugin'
import { getDefaultPlugins, getDefaultPluginById } from '@/modules/plugins/config/defaultPlugins'

/**
 * 系统插件安装器
 * 处理内置默认插件
 */
export class SystemPluginInstaller extends BasePluginInstaller {
  readonly name = '系统插件'
  readonly type = PluginSourceType.SYSTEM
  readonly weight = 1

  /** 判断是否为系统插件 */
  canHandle(source: any): boolean {
    const id = typeof source === 'string' ? source : source?.id
    return id ? getDefaultPluginById(id) !== null : false
  }

  /** 获取所有系统插件列表 */
  async getList(): Promise<PluginConfig[]> {
    return getDefaultPlugins()
  }

  /** 安装系统插件 */
  async install(source: any, options?: InstallOptions): Promise<PluginConfig> {
    // 获取插件配置
    let pluginData: PluginConfig
    if (typeof source === 'string') {
      const found = getDefaultPluginById(source)
      if (!found) throw new Error(`系统插件不存在: ${source}`)
      pluginData = found
    } else {
      pluginData = source
    }

    console.log(`📦 [系统插件] 安装: ${pluginData.id}`)

    // 验证和处理
    if (!this.validatePluginConfig(pluginData)) {
      throw new Error(`插件配置无效: ${pluginData.id}`)
    }

    const processed = await this.preprocessPlugin(pluginData)
    this.processPluginResources(processed, options?.getResourcePath)
    this.setupPluginItems(processed)

    const plugin = this.createPluginConfig(processed)
    plugin.options = { ...plugin.options, isThirdParty: false, isSystem: true }

    if (!options?.silent) {
      await this.broadcastEvent('plugin-installed', { pluginId: plugin.id })
    }

    console.log(`✅ [系统插件] 安装成功: ${plugin.id}`)
    return plugin
  }

  /** 卸载系统插件（只是禁用） */
  async uninstall(pluginId: string): Promise<boolean> {
    console.log(`🗑️ [系统插件] 卸载: ${pluginId}`)
    await this.broadcastEvent('plugin-uninstalled', { pluginId })
    console.log(`✅ [系统插件] 卸载成功: ${pluginId}`)
    return true
  }

  /** 检查是否是系统插件 */
  isSystemPlugin(pluginId: string): boolean {
    return getDefaultPluginById(pluginId) !== null
  }
}
