import type { AppItem, SearchModule } from "@/temp_code/typings/search"
import { storeUtils } from "@/temp_code/utils/store"

export class RecentModule implements SearchModule {
  weight = 10
  name = "最近使用"
  isDragEnabled = true
  maxDisplayCount = 16

  async getItems() {
    return await naimo.router.storeGet("recentApps") || []
  }

  async deleteItem(item: AppItem): Promise<void> {
    storeUtils.removeListItem("recentApps", item.path, "path")
  }

  async addItem(item: AppItem): Promise<void> {
    storeUtils.addListItem("recentApps", item, { unique: true, uniqueField: "path", position: "start" })
  }
}   