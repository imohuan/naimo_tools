import type { AppItem, SearchModule } from "@/temp_code/typings/search"
import { storeUtils } from "@/temp_code/utils/store"

export class PinnedModule implements SearchModule {
  weight = 20
  name = "已固定"
  isDragEnabled = true
  maxDisplayCount = 16
  isExpanded = false

  async getItems() {
    return await naimo.router.storeGet("pinnedApps") || []
  }

  async deleteItem(item: AppItem): Promise<void> {
    storeUtils.removeListItem("pinnedApps", item.path, "path")
  }

  async addItem(item: AppItem): Promise<void> {
    storeUtils.addListItem("pinnedApps", item, { unique: true, uniqueField: "path", position: "start" })
  }
}   