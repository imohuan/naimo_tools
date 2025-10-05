import type { AppItem, SearchModule } from "@/temp_code/typings/search"
import { usePluginStoreNew } from "../../plugin"

export class PinnedModule implements SearchModule {
  weight = 20
  name = "插件列表"
  isDragEnabled = true
  maxDisplayCount = 16
  isExpanded = false

  async getItems() {
    const plugins = usePluginStoreNew()
    return plugins.installedPlugins.flatMap(plugin => plugin.enabled ? plugin.items : []) as AppItem[]
  }

  async deleteItem(_item: AppItem): Promise<void> { }
  async addItem(_item: AppItem): Promise<void> { }
}   