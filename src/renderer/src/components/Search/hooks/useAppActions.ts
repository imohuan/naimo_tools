import type { AppItem } from "@shared/typings";
import type { PluginItem } from "@/typings/pluginTypes";
import { appEventManager } from "@/temp_code/modules/event";
import { storeUtils } from "@/temp_code/utils/store";
import { useApp } from "@/temp_code";

export function useAppActions(
  performSearch: (updateSearchState: boolean) => Promise<void>
) {
  // 获取 app 实例和存储工具实例
  const app = useApp();

  // 执行应用或插件项目
  const executeItem = async (
    appItem: AppItem | PluginItem,
    hotkeyEmit: boolean = false
  ) => {
    try {
      // 判断是否为插件项目
      if (app.plugin.isPluginItem(appItem as PluginItem)) {
        console.log("🔌 检测到插件项目，使用插件执行逻辑:", appItem.name);

        const pluginItem = app.plugin.getInstalledPluginItem(
          (appItem as PluginItem).pluginId as string,
          appItem.path as string
        );

        if (!pluginItem) {
          console.error("❌ 未找到插件项目:", appItem.name);
          return false;
        }

        // 发送全局事件通知插件执行完成
        appEventManager.emit("plugin:executed", {
          pluginId: pluginItem.pluginId!,
          path: appItem.path,
          hotkeyEmit,
        });

        if (!pluginItem?.onSearch) {
          // 更新使用统计
          await updateRecentApps(pluginItem);
        }

        return true;
      } else {
        // 普通应用项目，使用原有逻辑
        console.log("📱 检测到普通应用项目，使用默认执行逻辑:", appItem.name);
        const success = await naimo.router.appLaunchApp(appItem.path);
        if (success) {
          await updateRecentApps(appItem);
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error("启动应用失败:", error);
      return false;
    }
  };

  // 更新最近使用应用记录
  const updateRecentApps = async (appItem: AppItem) => {
    try {
      if (appItem.notAddToRecent) return;
      const appCopy = app.plugin.getSerializedPluginItem(appItem as PluginItem);
      appCopy.lastUsed = Date.now();
      appCopy.usageCount = (appCopy.usageCount || 0) + 1;
      // 使用存储工具更新最近应用
      await storeUtils.addListItem("recentApps" as any, appCopy, {
        position: "start",
        unique: true,
        uniqueField: "path",
        maxLength: 16,
      });
      // 重新执行搜索以更新显示
      await performSearch(true);
    } catch (error) {
      console.error("更新最近使用应用记录失败:", error);
    }
  };

  // 处理分类内拖拽排序
  const handleCategoryDragEnd = async (categoryId: string, newItems: AppItem[]) => {
    try {
      // 序列化应用项目，确保只包含可序列化的属性
      const serializableItems = newItems.map((item) =>
        app.plugin.getSerializedPluginItem(item as PluginItem)
      );

      // 使用存储桥接器设置列表项
      const storeKey =
        categoryId === "pinned"
          ? "pinnedApps"
          : categoryId === "recent"
            ? "recentApps"
            : categoryId === "files"
              ? "fileList"
              : null;

      if (storeKey) {
        await storeUtils.setListItems(storeKey as any, serializableItems);
      }

      // 重新执行搜索以更新显示
      await performSearch(true);
    } catch (error) {
      console.error(`保存分类 ${categoryId} 排序失败:`, error);
    }
  };

  // 处理应用删除
  const handleAppDelete = async (app: AppItem, categoryId: string) => {
    try {
      // 根据分类ID确定存储键
      const storeKey =
        categoryId === "pinned"
          ? "pinnedApps"
          : categoryId === "recent"
            ? "recentApps"
            : categoryId === "files"
              ? "fileList"
              : null;

      if (!storeKey) {
        console.log("⚠️ 未知的分类ID:", categoryId);
        return;
      }
      // 使用存储工具删除应用
      await storeUtils.removeListItem(storeKey as any, app.path, "path");
      // 重新执行搜索以更新显示
      await performSearch(true);
    } catch (error) {
      console.error(`保存分类 ${categoryId} 删除后状态失败:`, error);
    }
  };

  // 处理应用固定
  const handleAppPin = async (appItem: AppItem) => {
    try {
      // 创建可序列化的应用副本
      const appCopy = app.plugin.getSerializedPluginItem(appItem as PluginItem);
      // 使用存储工具添加到固定列表
      await storeUtils.addListItem("pinnedApps" as any, appCopy, {
        position: "start",
        unique: true,
        uniqueField: "path",
      });
      // 重新执行搜索以更新显示
      await performSearch(true);
    } catch (error) {
      console.error("保存应用固定状态失败:", error);
    }
  };

  return {
    executeItem,
    updateRecentApps,
    handleCategoryDragEnd,
    handleAppDelete,
    handleAppPin,
  };
}
