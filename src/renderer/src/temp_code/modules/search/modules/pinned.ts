import type { AppItem, SearchModule } from "@/temp_code/typings/search"
import { storeUtils } from "@/temp_code/utils/store"

export class PinnedModule implements SearchModule {
  weight = 20
  name = "已固定"
  isDragEnabled = true
  maxDisplayCount = 16
  async getItems() {
    const items = await naimo.router.storeGet("pinnedApps") || []
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
    await storeUtils.removeListItem("pinnedApps", item.fullPath, "fullPath")
  }

  async addItem(item: AppItem): Promise<void> {
    // 使用 fullPath 作为唯一标识
    const updateItem = {
      fullPath: item?.fullPath || item.path,
      ...item
    }
    await storeUtils.addListItem("pinnedApps", updateItem, { unique: true, uniqueField: "fullPath", position: "start" })
  }

  async setItems(items: AppItem[]): Promise<void> {
    await storeUtils.setListItems("pinnedApps", items)
  }
}   