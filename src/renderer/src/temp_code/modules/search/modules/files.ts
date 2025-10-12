import type { AppItem, SearchModule } from "@/temp_code/typings/search";
import { storeUtils } from "@/temp_code/utils/store";

export class FilesModule implements SearchModule {
  weight = 30;
  name = "文件列表";
  isDragEnabled = true;
  maxDisplayCount = 16;
  async getItems() {
    const items = (await naimo.router.storeGet("fileList")) || [];
    // 为每个 item 添加 __metadata
    return items.map((item: AppItem) => ({
      ...item,
      __metadata: {
        enableDelete: true,
        enablePin: false,
      },
    }));
  }

  async deleteItem(item: AppItem): Promise<void> {
    // 使用 fullPath 作为唯一标识，如果没有则 fallback 到 path
    storeUtils.removeListItem("fileList", item.fullPath, "fullPath");
  }

  async addItem(item: AppItem): Promise<void> {
    // 使用 fullPath 作为唯一标识
    const updateItem = {
      fullPath: item?.fullPath || item.path,
      ...item
    }
    storeUtils.addListItem("fileList", updateItem, {
      unique: true,
      uniqueField: "fullPath",
      position: "start",
    });
  }

  async setItems(items: AppItem[]): Promise<void> {
    await storeUtils.setListItems("fileList", items);
  }
}
