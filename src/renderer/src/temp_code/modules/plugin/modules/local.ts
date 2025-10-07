import type { PluginConfig } from '@/typings/pluginTypes'
import { BasePluginInstaller } from './base'
import { PluginSourceType, type InstallOptions, type UninstallOptions } from '@/temp_code/typings/plugin'

/**
 * 本地插件安装器
 * 处理本地离线下载的插件（ZIP文件、本地文件夹）
 */
export class LocalPluginInstaller extends BasePluginInstaller {
  readonly name = '本地插件'
  readonly type = PluginSourceType.LOCAL
  readonly weight = 2
  readonly pluginType = 'local'

  /** 判断是否为本地插件来源 */
  canHandle(source: any): boolean {
    if (typeof source === 'string') {
      const hasPath = source.includes('\\') || source.includes('/') || source.endsWith('.zip')
      const notUrl = !source.startsWith('http://') && !source.startsWith('https://')
      return hasPath && notUrl
    }
    // 检查插件类型标记（支持新旧两种标记方式）
    return [this.pluginType, 'github'].includes(source?.options?.pluginType)
  }

  /** 获取所有本地已安装的插件列表 */
  async getList(): Promise<PluginConfig[]> {
    const thirdPartyPlugins = await naimo.router.pluginGetAllInstalledPlugins()
    const plugins: PluginConfig[] = []

    for (const plugin of thirdPartyPlugins) {
      try {
        const config: PluginConfig = await naimo.webUtils.loadPluginConfig(plugin.configPath)
        if (config) {
          // 添加类型标记
          this.setPluginType(config)
          // 处理资源路径
          if ((config as any).getResourcePath) {
            config.icon = (config as any).getResourcePath(config.icon)
          }
          plugins.push(config)
        }
      } catch (error) {
        console.error(`❌ [本地插件] 加载失败: ${plugin.configPath}`, error)
      }
    }

    console.log(`📋 [本地插件] 获取到 ${plugins.length} 个插件`)
    return plugins
  }

  /** 从ZIP文件或本地路径安装插件 */
  async install(source: any, options?: InstallOptions): Promise<PluginConfig> {
    let pluginData: PluginConfig

    // 处理不同来源
    if (typeof source === 'object' && source.id) {
      pluginData = source
    } else if (typeof source === 'string') {
      const config = source.endsWith('.zip')
        ? await this.installFromZip(source)
        : await this.installFromPath(source)

      if (!config) throw new Error('无法获取插件配置')
      pluginData = config
    } else {
      throw new Error('无效的本地插件来源')
    }

    console.log(`📦 [本地插件] 安装: ${pluginData.id}`)
    // 统一处理插件（自动添加类型标记）
    const plugin = await this.processPlugin(pluginData, options)

    console.log(`✅ [本地插件] 安装成功: ${plugin.id}`)
    return plugin
  }

  /** 从ZIP文件安装 */
  private async installFromZip(zipPath: string): Promise<PluginConfig | null> {
    const zipConfig = await naimo.router.pluginInstallPluginFromZip(zipPath)
    if (!zipConfig) throw new Error(`安装ZIP失败: ${zipPath}`)
    return this.installFromPath(zipConfig.configPath)
  }

  /** 从本地路径安装 */
  private async installFromPath(path: string): Promise<PluginConfig | null> {
    const config = await naimo.webUtils.loadPluginConfig(path)
    if (!config) throw new Error(`读取配置失败: ${path}`)
    return config
  }

  /** 卸载本地插件 */
  async uninstall(pluginId: string, options?: UninstallOptions): Promise<boolean> {
    if (options?.skip) return true
    // 最先的插件设计，不需要卸载
    // console.log(`🗑️ [本地插件] 卸载: ${pluginId}`)
    // if (!await naimo.router.pluginUninstallPlugin(pluginId)) {
    //   console.error(`❌ 删除插件文件失败: ${pluginId}`)
    //   return false
    // }
    // console.log(`✅ [本地插件] 卸载成功: ${pluginId}`)
    // return true
    return true
  }
}
