import type { AppItem } from "@/core/typings/search"
import { usePluginStoreNew } from "../../plugin"
import { BaseListModule } from "./base"

export class PluginModule extends BaseListModule {
  weight = 20
  name = "扩展列表"
  isDragEnabled = false
  maxDisplayCount = 16
  protected storeKey = "pluginExtraList" as const

  // 重写 getItems 方法以自定义数据来源
  async getItems() {
    const localItems = await super.getItems()
    const plugins = usePluginStoreNew()
    // 使用 feature 替代 items（懒加载架构）
    const items = plugins.installedPlugins.flatMap(plugin => plugin.enabled ? plugin.feature : []) as AppItem[]
    // 为每个 item 添加 __metadata
    const pluginItems = items.map((item: AppItem) => ({
      ...item,
      __metadata: {
        enableDelete: false,
        enablePin: item?.notVisibleSearch ? false : true
      }
    }))
    return [...localItems, ...pluginItems]
  }
}   