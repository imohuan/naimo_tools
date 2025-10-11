import { PluginSourceType, type InstallOptions } from "@/temp_code/typings/plugin"
import { BasePluginInstaller } from "./base"
import type { PluginConfig } from "@/typings"
import { storeUtils } from "@/temp_code/utils/store"
import { isString } from "lodash-es"

export class TemporaryPluginInstaller extends BasePluginInstaller {
  readonly name = '临时插件'
  readonly type = PluginSourceType.TEMPORARY
  readonly weight = 1
  readonly pluginType = 'temporary'

  canHandle(source: any): boolean {
    if (typeof source !== 'string') return false
    const isUrl = /^http?s:\/\/.+/.test(source)
    return !isUrl
  }

  async getList(_options?: any): Promise<PluginConfig[]> {
    const pluginPaths = await storeUtils.getListItems("temporaryPlugins")
    const plugins: PluginConfig[] = []
    for (const pluginPath of pluginPaths) {
      const config = await naimo.webUtils.loadPluginDir(pluginPath)
      if (!config) continue
      plugins.push(config)
    }
    return plugins
  }

  async install(source: any, options?: InstallOptions): Promise<PluginConfig> {
    let config: any = source
    if (isString(source)) {
      config = await naimo.webUtils.loadPluginDir(source)
      await storeUtils.addListItem("temporaryPlugins", source)
    }
    if (!config) throw new Error(`读取配置失败: ${source}`)
    const plugin = await this.processPlugin(config, options)
    return plugin
  }

  async uninstall(pluginId: string): Promise<boolean> {
    await storeUtils.removeListItem("temporaryPlugins", pluginId)
    return true
  }

  async clear() {
    return storeUtils.clearListItems("temporaryPlugins")
  }
}