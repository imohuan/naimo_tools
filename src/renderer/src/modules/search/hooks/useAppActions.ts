import type { AppItem } from "@shared/types";
import { pluginManager } from "@/core/plugin/PluginManager";
import type { PluginItem } from "@/typings/plugin-types";
import { eventSystem } from "@/utils/event-system";
import { ElectronStoreBridge } from "@/core/store/ElectronStoreBridge";

export function useAppActions(
  performSearch: (updateSearchState: boolean) => Promise<void>
) {
  // 获取存储桥接器实例
  const storeBridge = ElectronStoreBridge.getInstance();

  // 执行应用或插件项目
  const executeItem = async (app: AppItem | PluginItem, hotkeyEmit: boolean = false) => {
    try {
      // 判断是否为插件项目
      if (pluginManager.isPluginItem(app as PluginItem)) {
        console.log("🔌 检测到插件项目，使用插件执行逻辑:", app.name);

        const pluginItem = pluginManager.getInstalledPluginItem(
          (app as PluginItem).pluginId as string,
          app.path as string
        )

        if (!pluginItem) {
          console.error("❌ 未找到插件项目:", app.name);
          return false;
        }

        // 发送全局事件通知插件执行完成
        eventSystem.emit('plugin:executed', { pluginId: pluginItem.pluginId!, path: app.path, hotkeyEmit });
        // 更新使用统计
        await updateRecentApps(pluginItem);
        return true;
      } else {
        // 普通应用项目，使用原有逻辑
        console.log("📱 检测到普通应用项目，使用默认执行逻辑:", app.name);
        const success = await naimo.router.appLaunchApp(app.path);
        if (success) {
          await updateRecentApps(app);
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
  const updateRecentApps = async (app: AppItem) => {
    try {
      if (app.notAddToRecent) return;
      const appCopy = pluginManager.getSerializedPluginItem(app as PluginItem)
      appCopy.lastUsed = Date.now()
      appCopy.usageCount = (appCopy.usageCount || 0) + 1
      // 使用存储桥接器更新最近应用
      await storeBridge.addListItem('recentApps' as any, appCopy, {
        position: 'start', unique: true, uniqueField: 'path', maxLength: 16
      });
      // 重新执行搜索以更新显示
      await performSearch(true)
    } catch (error) {
      console.error("更新最近使用应用记录失败:", error);
    }
  };

  // 处理分类内拖拽排序
  const handleCategoryDragEnd = async (categoryId: string, newItems: AppItem[]) => {
    try {
      // 序列化应用项目，确保只包含可序列化的属性
      const serializableItems = newItems.map((item) => pluginManager.getSerializedPluginItem(item as PluginItem))

      // 使用存储桥接器设置列表项
      const storeKey = categoryId === "pinned" ? "pinnedApps" :
        categoryId === "recent" ? "recentApps" :
          categoryId === "files" ? "fileList" : null;

      if (storeKey) {
        await storeBridge.setListItems(storeKey as any, serializableItems);
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
      const storeKey = categoryId === "pinned" ? "pinnedApps" :
        categoryId === "recent" ? "recentApps" :
          categoryId === "files" ? "fileList" : null;

      if (!storeKey) {
        console.log('⚠️ 未知的分类ID:', categoryId);
        return;
      }
      // 使用存储桥接器删除应用
      await storeBridge.removeListItem(storeKey as any, app.path, 'path');
      // 重新执行搜索以更新显示
      await performSearch(true);
    } catch (error) {
      console.error(`保存分类 ${categoryId} 删除后状态失败:`, error);
    }
  };

  // 处理应用固定
  const handleAppPin = async (app: AppItem) => {
    try {
      // 创建可序列化的应用副本
      const appCopy = pluginManager.getSerializedPluginItem(app as PluginItem)
      // 使用存储桥接器添加到固定列表
      await storeBridge.addListItem('pinnedApps' as any, appCopy, {
        position: 'start', unique: true, uniqueField: 'path'
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
