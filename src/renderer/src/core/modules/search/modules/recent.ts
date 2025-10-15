import type { AppItem, SearchModule } from "@/core/typings/search"
import { storeUtils } from "@/core/utils/store"

export class RecentModule implements SearchModule {
  weight = 10
  name = "最近使用"
  isDragEnabled = true
  maxDisplayCount = 16
  async getItems() {
    const items = await naimo.router.storeGet("recentApps") || []
    // 为每个 item 添加 __metadata
    return items.map((item: AppItem) => ({
      ...item,
      __metadata: {
        enableDelete: true,
        enablePin: false
      }
    }))
  }

  async deleteItem(item: AppItem): Promise<void> {
    // 使用 fullPath 作为唯一标识，如果没有则 fallback 到 path
    await storeUtils.removeListItem("recentApps", item.fullPath, "fullPath")
  }

  async addItem(item: AppItem): Promise<void> {
    const updateItem = {
      fullPath: item?.fullPath || item.path,
      ...item
    }
    await storeUtils.addListItem("recentApps", updateItem, { unique: true, uniqueField: "fullPath", position: "start" })
  }

  async setItems(items: AppItem[]): Promise<void> {
    await storeUtils.setListItems("recentApps", items)
  }
}   