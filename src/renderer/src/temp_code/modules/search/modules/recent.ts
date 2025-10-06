import type { AppItem, SearchModule } from "@/temp_code/typings/search"
import { storeUtils } from "@/temp_code/utils/store"

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
    storeUtils.removeListItem("recentApps", item.path, "path")
  }

  async addItem(item: AppItem): Promise<void> {
    storeUtils.addListItem("recentApps", item, { unique: true, uniqueField: "path", position: "start" })
  }

  async setItems(items: AppItem[]): Promise<void> {
    await storeUtils.setListItems("recentApps", items)
  }
}   