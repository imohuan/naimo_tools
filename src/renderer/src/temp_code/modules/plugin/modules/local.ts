import type { PluginConfig } from '@/typings/pluginTypes'
import { BasePluginInstaller } from './base'
import { PluginSourceType, type InstallOptions } from '@/temp_code/typings/plugin'

/**
 * 本地插件安装器
 * 处理本地离线下载的插件（ZIP文件、本地文件夹）
 */
export class LocalPluginInstaller extends BasePluginInstaller {
  readonly name = '本地插件'
  readonly type = PluginSourceType.LOCAL
  readonly weight = 2

  /** 判断是否为本地插件来源 */
  canHandle(source: any): boolean {
    if (typeof source === 'string') {
      const hasPath = source.includes('\\') || source.includes('/') || source.endsWith('.zip')
      const notUrl = !source.startsWith('http://') && !source.startsWith('https://')
      return hasPath && notUrl
    }
    return source?.options?.isThirdParty === true
  }

  /** 获取所有本地已安装的插件列表 */
  async getList(): Promise<PluginConfig[]> {
    const thirdPartyPlugins = await naimo.router.pluginGetAllInstalledPlugins()
    const plugins: PluginConfig[] = []

    for (const plugin of thirdPartyPlugins) {
      try {
        const config = await naimo.webUtils.loadPluginConfig(plugin.configPath)
        if (config) {
          config.options = { ...config.options, isThirdParty: true }
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

    // 验证和处理
    if (!this.validatePluginConfig(pluginData)) {
      throw new Error(`插件配置无效: ${pluginData.id}`)
    }

    const processed = await this.preprocessPlugin(pluginData)
    this.processPluginResources(processed, options?.getResourcePath)
    this.setupPluginItems(processed)

    const plugin = this.createPluginConfig(processed)
    plugin.options = { ...plugin.options, isThirdParty: true }

    if (!options?.silent) {
      await this.broadcastEvent('plugin-installed', { pluginId: plugin.id })
    }

    console.log(`✅ [本地插件] 安装成功: ${plugin.id}`)
    return plugin
  }

  /** 从ZIP文件安装 */
  private async installFromZip(zipPath: string): Promise<PluginConfig | null> {
    const zipConfig = await naimo.router.pluginInstallPluginFromZip(zipPath)
    if (!zipConfig) throw new Error(`安装ZIP失败: ${zipPath}`)

    const config = await naimo.webUtils.loadPluginConfig(zipConfig.configPath)
    if (!config) throw new Error(`读取配置失败: ${zipConfig.configPath}`)

    return config
  }

  /** 从本地路径安装 */
  private async installFromPath(path: string): Promise<PluginConfig | null> {
    const config = await naimo.webUtils.loadPluginConfig(path)
    if (!config) throw new Error(`读取配置失败: ${path}`)
    return config
  }

  /** 卸载本地插件 */
  async uninstall(pluginId: string): Promise<boolean> {
    console.log(`🗑️ [本地插件] 卸载: ${pluginId}`)

    if (!await naimo.router.pluginUninstallPlugin(pluginId)) {
      console.error(`❌ 删除插件文件失败: ${pluginId}`)
      return false
    }

    await this.broadcastEvent('plugin-uninstalled', { pluginId })
    console.log(`✅ [本地插件] 卸载成功: ${pluginId}`)
    return true
  }
}
