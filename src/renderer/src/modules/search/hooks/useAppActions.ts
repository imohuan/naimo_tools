import type { AppItem } from "@shared/types";
import type { SearchCategory } from "@/typings/search-types";
import { pluginManager } from "@/modules/plugins/hooks/usePluginManager";
import type { PluginItem } from "@/typings/plugin-types";
import { eventSystem } from "@/utils/event-system";

export function useAppActions(
  originalCategories: any,
  updateCategoryInBoth: (
    categoryId: string,
    updater: (category: SearchCategory) => void
  ) => void,
  serializeAppItems: (items: AppItem[]) => AppItem[],
  performSearch: (attachedFiles?: any[]) => Promise<void>
) {
  // 判断是否为插件项目
  const isPluginItem = (
    app: AppItem
  ): app is AppItem & { pluginId: string; executeType: number; executeParams?: any } => {
    return "pluginId" in app && "executeType" in app;
  };

  // 执行应用或插件项目
  const executeItem = async (app: AppItem) => {
    try {
      // 判断是否为插件项目
      if (isPluginItem(app)) {
        console.log("🔌 检测到插件项目，使用插件执行逻辑:", app.name);
        let executeParams: any = {}

        // 将 AppItem 转换为 PluginItem 格式
        const pluginItem: PluginItem = {
          ...app,
          pluginId: app.pluginId,
          executeType: app.executeType,
          executeParams: app.executeParams,
          visible: true,
        };

        // 判断是否包含 executeParams， 如果不包含则查询对应的插件配置
        // 补全配置信息，因为executeParams可能不支持序列化
        if (!app.executeParams) {
          pluginManager.getEnabledPlugins().forEach(plugin => {
            if (plugin.id === app.pluginId) {
              plugin.items.forEach(item => {
                if (item.name === app.name && item.path === app.path) {
                  executeParams = item.executeParams;
                }
              });
            }
          });
        }

        // 使用插件管理器执行插件项目
        await pluginManager.executePluginItem({ ...pluginItem, executeParams });

        // 发送全局事件通知插件执行完成
        eventSystem.emit('plugin:executed', { pluginItem: { ...pluginItem, executeParams } });

        // 更新使用统计
        await updateRecentApps(app);
        return true;
      } else {
        // 普通应用项目，使用原有逻辑
        console.log("📱 检测到普通应用项目，使用默认执行逻辑:", app.name);
        const success = await api.ipcRouter.appLaunchApp(app.path);
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
      // executeParams 不能序列化
      const { executeParams, ...newApp } = app as PluginItem;
      const appWithUsage: AppItem = {
        ...newApp,
        lastUsed: Date.now(),
        usageCount: 1,
      }

      updateCategoryInBoth("recent", (recentCategory) => {
        const existingIndex = recentCategory.items.findIndex(
          (item) => item.path === app.path
        );
        if (existingIndex >= 0) {
          recentCategory.items[existingIndex].lastUsed = Date.now();
          recentCategory.items[existingIndex].usageCount =
            (recentCategory.items[existingIndex].usageCount || 0) + 1;

          const updatedApp = recentCategory.items.splice(existingIndex, 1)[0];
          recentCategory.items.unshift(updatedApp);
        } else {
          recentCategory.items.unshift(appWithUsage);
        }

        if (recentCategory.items.length > recentCategory.maxDisplayCount) {
          recentCategory.items = recentCategory.items.slice(
            0,
            recentCategory.maxDisplayCount
          );
        }
      });

      const originalRecentCategory = originalCategories.value.find(
        (cat: any) => cat.id === "recent"
      );
      if (originalRecentCategory) {
        await api.ipcRouter.storeSet(
          "recentApps",
          serializeAppItems(originalRecentCategory.items)
        );
      }
    } catch (error) {
      console.error("更新最近使用应用记录失败:", error);
    }
  };

  // 处理分类展开/收起
  const handleCategoryToggle = (categoryId: string) => {
    updateCategoryInBoth(categoryId, (category) => {
      category.isExpanded = !category.isExpanded;
    });
  };

  // 处理分类内拖拽排序
  const handleCategoryDragEnd = async (categoryId: string, newItems: AppItem[]) => {
    updateCategoryInBoth(categoryId, (category) => {
      category.items = newItems;
    });

    try {
      const serializableItems = serializeAppItems(newItems);

      switch (categoryId) {
        case "pinned":
          await api.ipcRouter.storeSet("pinnedApps", serializableItems);
          break;
        case "recent":
          await api.ipcRouter.storeSet("recentApps", serializableItems);
          break;
        case "files":
          await api.ipcRouter.storeSet("fileList", serializableItems);
          break;
      }
    } catch (error) {
      console.error(`保存分类 ${categoryId} 排序失败:`, error);
    }
  };

  // 处理应用删除
  const handleAppDelete = async (app: AppItem, categoryId: string) => {
    updateCategoryInBoth(categoryId, (category) => {
      const index = category.items.findIndex((item) => item.path === app.path);
      if (index > -1) {
        category.items.splice(index, 1);
      }
    });

    try {
      const category = originalCategories.value.find((cat: any) => cat.id === categoryId);
      if (category) {
        const serializableItems = serializeAppItems(category.items);

        switch (categoryId) {
          case "pinned":
            await api.ipcRouter.storeSet("pinnedApps", serializableItems);
            break;
          case "recent":
            await api.ipcRouter.storeSet("recentApps", serializableItems);
            break;
          case "files":
            await api.ipcRouter.storeSet("fileList", serializableItems);
            break;
        }
      }
    } catch (error) {
      console.error(`保存分类 ${categoryId} 删除后状态失败:`, error);
    }

    await performSearch();
  };

  // 处理应用固定
  const handleAppPin = async (app: AppItem) => {
    const appCopy = {
      name: app.name,
      path: app.path,
      icon: app.icon,
      ...(app.lastUsed && { lastUsed: app.lastUsed }),
      ...(app.usageCount && { usageCount: app.usageCount }),
    };

    updateCategoryInBoth("pinned", (pinnedCategory) => {
      const existingIndex = pinnedCategory.items.findIndex(
        (item) => item.path === app.path
      );
      if (existingIndex === -1) {
        pinnedCategory.items.unshift(appCopy);
      }
    });

    try {
      const pinnedCategory = originalCategories.value.find(
        (cat: any) => cat.id === "pinned"
      );
      if (pinnedCategory) {
        const serializableItems = serializeAppItems(pinnedCategory.items);
        await api.ipcRouter.storeSet("pinnedApps", serializableItems);
      }
    } catch (error) {
      console.error("保存应用固定状态失败:", error);
    }

    await performSearch();
  };

  return {
    executeItem,
    updateRecentApps,
    handleCategoryToggle,
    handleCategoryDragEnd,
    handleAppDelete,
    handleAppPin,
  };
}
