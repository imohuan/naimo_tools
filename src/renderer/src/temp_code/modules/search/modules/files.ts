import type { AppItem, SearchModule } from "@/temp_code/typings/search"
import { storeUtils } from "@/temp_code/utils/store"

export class FilesModule implements SearchModule {
  weight = 30
  name = "文件列表"
  isDragEnabled = true
  maxDisplayCount = 16

  async getItems() {
    return await naimo.router.storeGet("fileList") || []
  }
  async deleteItem(item: AppItem): Promise<void> {
    storeUtils.removeListItem("fileList", item.path, "path")
  }

  async addItem(item: AppItem): Promise<void> {
    storeUtils.addListItem("fileList", item, { unique: true, uniqueField: "path", position: "start" })
  }
}   