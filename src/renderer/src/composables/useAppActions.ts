import type { AppItem } from "@/core/typings/search";
import type { PluginItem } from "@/typings/pluginTypes";
import { appEventManager } from "@/core/modules/event";
import { useApp } from "@/core";

export function useAppActions() {
  // 获取 app 实例和搜索 store
  const app = useApp();

  // 预处理并执行应用或插件项目
  const handlePrepareAction = async (appItem: AppItem | PluginItem, hotkeyEmit: boolean = false) => {
    try {
      // 判断是否为插件项目
      /** 不完整的 PluginItem 类型 */
      const pickPluginItem = appItem as PluginItem
      if (app.plugin.isPluginItem(pickPluginItem)) {
        console.log("🔌 检测到插件项目，使用插件执行逻辑:", appItem.name);
        const fullPath = pickPluginItem.fullPath || `${pickPluginItem.pluginId}:${pickPluginItem.path}`

        /** 完整的 PluginItem 类型 */
        const pluginItem = app.plugin.getInstalledPluginItem(fullPath);

        if (!pluginItem) {
          console.error("❌ 未找到插件项目:", appItem.name);
          return false;
        }

        // 发送全局事件通知插件执行完成
        appEventManager.emit("plugin:executed", { fullPath: fullPath, hotkeyEmit, });

        // 更新使用统计
        await updateRecentApps(pluginItem as AppItem);
        return true;
      } else {
        // 普通应用项目，使用原有逻辑
        console.log("📱 检测到普通应用项目，使用默认执行逻辑:", appItem.name);
        const success = await naimo.router.appLaunchApp(appItem.path);
        if (success) {
          await updateRecentApps(appItem as AppItem);
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
      if (appItem.notVisibleSearch || appItem.type !== "text") return;
      const appCopy = app.plugin.getSerializedPluginItem(appItem as PluginItem);
      await app.search.addItem({ ...appCopy, category: "recent", __metadata: { enableDelete: true, enablePin: false } } as AppItem);
      app.search.performSearch("")
    } catch (error) {
      console.error("更新最近使用应用记录失败:", error);
    }
  };

  // 处理应用删除
  const handleAppDelete = async (appItem: AppItem) => {
    try {
      await app.search.deleteItem(appItem);
      app.search.performSearch("")
    } catch (error) {
      console.error(`删除应用失败:`, error);
    }
  };

  // 处理应用固定
  const handleAppPin = async (appItem: AppItem) => {
    try {
      // 创建可序列化的应用副本
      const appCopy = app.plugin.getSerializedPluginItem(appItem as PluginItem);
      const searchItem = { ...appCopy, type: "text", category: "pinned", __metadata: { enableDelete: true, enablePin: false } } as any;
      await app.search.addItem(searchItem);
      await app.search.performSearch("");
    } catch (error) {
      console.error("保存应用固定状态失败:", error);
    }
  };

  // 处理分类内拖拽排序
  const handleCategoryDragEnd = async (categoryId: string, newItems: AppItem[]) => {
    try {
      const serializableItems = newItems.map((item) =>
        app.plugin.getSerializedPluginItem(item as PluginItem)
      );
      await app.search.setItems(categoryId, serializableItems as AppItem[]);
    } catch (error) {
      console.error(`保存分类 ${categoryId} 排序失败:`, error);
    }
  };

  return {
    handlePrepareAction,
    updateRecentApps,
    handleCategoryDragEnd,
    handleAppDelete,
    handleAppPin,
  };
}
