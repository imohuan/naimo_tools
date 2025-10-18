import type { AppItem, SearchModule } from "@/core/typings/search";
import type { AppConfig } from "@shared/typings";
import { storeUtils } from "@/core/utils/store";

/**
 * 基础列表模块
 * 提供通用的 getItems、deleteItem、addItem、setItems 实现
 */
export abstract class BaseListModule implements SearchModule {
  abstract weight: number;
  abstract name: string;
  protected abstract storeKey: keyof AppConfig

  isDragEnabled = true;
  maxDisplayCount = 16;

  async getItems() {
    const items = (await naimo.router.storeGet(this.storeKey)) || [];
    // 为每个 item 添加 __metadata
    return items.map((item: AppItem) => ({
      ...item,
      ...(item?.weight ? { weight: item.weight } : { weight: this.weight }),
      __metadata: {
        enableDelete: true,
        enablePin: false,
      },
    }));
  }

  async deleteItem(item: AppItem): Promise<void> {
    // 使用 fullPath 作为唯一标识，如果没有则 fallback 到 path
    await storeUtils.removeListItem(this.storeKey, item.fullPath, "fullPath");
  }

  async addItem(item: AppItem): Promise<void> {
    // 使用 fullPath 作为唯一标识
    const updateItem = {
      fullPath: item?.fullPath || item.path,
      ...item,
    };
    await storeUtils.addListItem(this.storeKey, updateItem, {
      unique: true,
      uniqueField: "fullPath",
      position: "start",
    });
  }

  async setItems(items: AppItem[]): Promise<void> {
    await storeUtils.setListItems(this.storeKey, items);
  }
}

