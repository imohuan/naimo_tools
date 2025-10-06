import type { AppItem, SearchModule } from "@/temp_code/typings/search"
import { usePluginStoreNew } from "../../plugin"

export class PinnedModule implements SearchModule {
  weight = 20
  name = "插件列表"
  isDragEnabled = false
  maxDisplayCount = 16
  async getItems() {
    const plugins = usePluginStoreNew()
    const items = plugins.installedPlugins.flatMap(plugin => plugin.enabled ? plugin.items : []) as AppItem[]
    // 为每个 item 添加 __metadata
    return items.map((item: AppItem) => ({
      ...item,
      __metadata: {
        enableDelete: false,
        enablePin: item?.notVisibleSearch ? false : true
      }
    }))
  }

  async deleteItem(_item: AppItem): Promise<void> { }
  async addItem(_item: AppItem): Promise<void> { }
  async setItems(_items: AppItem[]): Promise<void> { }
}   