<template>
  <div
    class="w-full h-full p-2 bg-transparent"
    @keydown="handleKeyNavigation"
    @click="handleContainerClick"
  >
    <!-- 主应用容器 -->
    <div
      class="w-full bg-transparent relative overflow-hidden h-full rounded-xl transition-all duration-200"
      style="box-shadow: 0 1px 3px 0 rgba(60, 72, 120, 0.48)"
    >
      <!-- 搜索头部区域 -->
      <SearchHeader
        ref="searchHeaderRef"
        :height="headerHeight"
        :plugin-item="app.ui.activePlugin"
        :attached-files="attachedFiles"
        :is-settings-interface="isSettingsInterface"
        :search-text="app.ui.searchText"
        :should-show-search-box="app.ui.shouldShowSearchBox"
        @click="handleSearchFocus"
        @update:search-text="app.ui.searchText = $event"
        @search="handleSearch"
        @input="debouncedHandleSearch"
        @add-files="addFiles"
        @clear-files="handleClearFiles"
        @clear-plugin="handleClearPlugin"
        @open-settings="openSettingsWrapper"
      />

      <!-- 内容呈现区域 -->
      <ContentArea
        ref="contentAreaRef"
        :content-area-visible="contentAreaVisible"
        :search-categories="searchCategories"
        :selected-index="selectedIndex"
        :flat-items="flatItems"
        :show-plugin-window="isPluginWindowOpen"
        :show-settings-background="isSettingsInterface"
        @app-click="handlePrepareAction"
        @category-toggle="handleCategoryToggle"
        @category-drag-end="handleCategoryDragEnd"
        @app-delete="handleAppDelete"
        @app-pin="handleAppPin"
        @window-resize="handleWindowResize"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// ==================== 导入依赖 ====================
import { ref, computed, onMounted, nextTick, watch, toRaw } from "vue";
import { useDebounceFn, watchDebounced, useEventListener } from "@vueuse/core";

// 组件导入
import ContentArea from "@/components/ContentArea/ContentArea.vue";
import SearchHeader from "@/components/SearchHeader/SearchHeader.vue";

// 核心导入（已移除 pluginManager，使用 app.plugin 代替）

// Composables 导入
import { useFileHandler } from "@/composables/useFileHandler";
import { useWindowManager } from "@/composables/useWindowManager";
import { useUIConstants } from "@/composables/useUIConstants";

// 模块导入 - 直接导入辅助函数
import { useKeyboardNavigation } from "@/components/Search/hooks/useKeyboardNavigation";
import { useAppActions } from "@/composables/useAppActions";

// Store 导入
import { HotkeyType, useApp, type HotkeyConfig } from "@/core";

// 类型导入
import type { AppItem, AttachedInfo } from "@/core/typings/search";
import { LifecycleType, type PluginItem, type PluginItemData } from "./typings";

// ==================== 初始化 ====================
// 应用状态管理
const app = useApp();
// UI 配置管理
const { loadUIConstants, headerHeight, padding } = useUIConstants();
// 文件处理器
const { attachedFiles, addFiles, clearAttachedFiles } = useFileHandler();
// 组件引用
const searchHeaderRef = ref<InstanceType<typeof SearchHeader>>();
const contentAreaRef = ref<InstanceType<typeof ContentArea>>();

// 搜索状态
const selectedIndex = ref(0);
const searchCategories = computed(() => app.search.categories);
// 扁平化搜索结果
const flatItems = computed(() => {
  return searchCategories.value.flatMap((category) => {
    const displayItems =
      category.isExpanded || category.items.length <= category.maxDisplayCount
        ? category.items
        : category.items.slice(0, category.maxDisplayCount);
    return displayItems.map((item: any) => ({
      ...item,
      categoryId: category.id,
    }));
  });
});

// 搜索和应用操作
const {
  handlePrepareAction: _handlePrepareAction,
  handleCategoryDragEnd,
  handleAppDelete,
  handleAppPin,
} = useAppActions();

const handlePrepareAction = async (
  appItem: AppItem | PluginItem,
  hotkeyEmit: boolean = false
) => {
  selectedIndex.value = 0;
  await _handlePrepareAction(appItem, hotkeyEmit);
  app.ui.searchText = "";
  handleSearch("");
};

const handleCategoryToggle = (categoryId: string) => {
  app.search.toggleCategory(categoryId);
};

// ==================== 计算属性 ====================
// UI 状态（使用 useApp().ui）
const isSettingsInterface = computed(() => app.ui.isSettingsInterface);
const isPluginWindowOpen = computed(() => app.ui.isWindowInterface);
const contentAreaVisible = computed(() => app.ui.isContentVisible);

// ==================== 核心业务函数 ====================
// 搜索处理函数
const handleSearch = async (value: string) => {
  selectedIndex.value = 0;

  const currentPlugin = app.ui.activePlugin;
  if (currentPlugin && isPluginWindowOpen.value) {
    console.log("🔍 执行已激活插件的自定义搜索:", {
      pluginName: currentPlugin.name,
      searchText: value,
      attachedFilesCount: attachedFiles.value.length,
    });
    naimo.router.appForwardMessageToPluginView(
      currentPlugin.path,
      "plugin-search",
      { searchText: value, timestamp: Date.now() }
    );
    return;
  }

  // 处理附件信息
  const attachedInfo = await processAttachedInfo();

  // 使用 app.search 执行搜索
  console.log("🔍 执行搜索:", value, attachedInfo);
  await app.search.performSearch(value, attachedInfo);
};

/**
 * 处理附件信息，根据文件类型生成对应的 AttachedInfo
 */
const processAttachedInfo = async (): Promise<AttachedInfo | undefined> => {
  if (attachedFiles.value.length === 0) return undefined;

  // 多个文件：统一作为文件列表处理
  if (attachedFiles.value.length > 1) {
    return { type: "file", data: toRaw(attachedFiles.value) as any };
  }

  // 单个文件：根据类型分别处理
  const file = attachedFiles.value[0];

  // 图片类型：使用已提取的 icon（base64）
  if (file.originalFile?.type.startsWith("image/") && file.icon) {
    return { type: "img", data: file.icon, originalFile: file };
  }

  // 文本类型：读取文件内容
  if (file.originalFile?.type.startsWith("text/")) {
    try {
      // 优先使用原始File对象读取（更快，不需要IPC）
      const text = file.originalFile
        ? await file.originalFile.text()
        : await naimo.router.filesystemReadFileContent(file.path, "utf-8");
      return { type: "text", data: text, originalFile: file };
    } catch (error) {
      console.error("读取文本文件失败:", error);
    }
  }

  // 其他类型或失败情况：作为普通文件处理
  return { type: "file", data: toRaw(attachedFiles.value) as any };
};

// 防抖搜索
const debouncedHandleSearch = useDebounceFn(
  () => handleSearch(app.ui.searchText),
  100
);

// 聚焦搜索框
const handleSearchFocus = () => {
  nextTick(() => {
    if (app.ui.shouldShowSearchBox && searchHeaderRef.value) {
      searchHeaderRef.value.focus();
    }
  });
};

// 初始化窗口管理器（在定义 handleSearchFocus 之后）
const windowManager = useWindowManager(
  {},
  {
    handleResize: () => contentAreaRef.value?.handleResize(),
    handleSearchFocus,
    attachedFiles: () => attachedFiles.value,
    searchText: () => app.ui.searchText,
  }
);

// 显示窗口并调整大小
const show = () => {
  windowManager.show();
  contentAreaRef.value?.handleResize();
};

// 隐藏窗口并调整大小
const hide = () => {
  windowManager.hide();
  contentAreaRef.value?.handleResize();
};

// 容器点击处理 - 始终返回 false（不需要额外逻辑）
const handleContainerClick = () => false;

// ==================== 工具函数 ====================
// 清空搜索和插件状态
const clearSearchAndPlugin = () => {
  app.ui.searchText = "";
  app.ui.activePlugin = null;
  attachedFiles.value = [];
};

// 清除附件文件并触发搜索
const handleClearFiles = () => {
  clearAttachedFiles();
  // 清除文件后触发搜索
  handleSearch(app.ui.searchText);
};

// 清除插件并触发搜索
const handleClearPlugin = async () => {
  app.ui.activePlugin = null;
  await windowManager.closePlugin();
  // 清除插件后触发搜索
  handleSearch(app.ui.searchText);
};

// ==================== 插件和设置管理 ====================
// 打开设置页面的包装函数
const openSettingsWrapper = async () => {
  if (isPluginWindowOpen.value) {
    await windowManager.closePlugin();
  }
  await nextTick();
  setTimeout(() => {
    windowManager.openSettings();
  }, 0);
};

// ==================== 窗口管理 ====================
const initializeWindowSize = () => {
  windowManager.setSize({ height: headerHeight.value + padding.value });
};

const handleWindowResize = async (height: number) => {
  try {
    await naimo.router.windowAdjustHeight(height);
  } catch (error) {
    console.error("调整窗口高度失败:", error);
    naimo.router.windowSetSize(-1, height);
  }
};

const handleResetToDefault = () => {
  if (isPluginWindowOpen.value) windowManager.closePlugin();
  app.ui.resetToDefault();
};

// ==================== 搜索状态恢复 ====================
const recoverSearchState = (clearPlugin = false) => {
  console.log("恢复搜索状态", { clearPlugin, searchText: app.ui.searchText });

  if (clearPlugin) app.ui.activePlugin = null;
  app.ui.switchToSearch();

  const currentText = app.ui.searchText ?? "";
  handleSearch(currentText);

  nextTick(() => {
    contentAreaRef.value?.handleResize();
    handleSearchFocus();
  });
};

// ==================== ESC处理 ====================
const handleEscAction = async () => {
  console.log("收到ESC键处理函数", isPluginWindowOpen.value);

  // 如果当前是插件窗口，关闭插件窗口
  if (isPluginWindowOpen.value) {
    console.log("关闭插件窗口");
    windowManager.closePlugin();
    clearSearchAndPlugin();
    return;
  }

  // 如果当前是设置页面，关闭设置页面
  if (isSettingsInterface.value) {
    console.log("关闭设置页面");
    await windowManager.closeSettings();
    return;
  }

  // 如果有附件或插件，清空它们
  if (attachedFiles.value.length > 0 || app.ui.activePlugin) {
    console.log("清空附加内容");
    attachedFiles.value = [];
    app.ui.activePlugin = null;
    return;
  }

  // 如果有搜索内容，清空搜索框
  if (app.ui.searchText.trim()) {
    console.log("清空搜索框");
    app.ui.searchText = "";
    handleSearch("");
    return;
  }

  hide();
};

// 键盘导航
const { handleKeyNavigation } = useKeyboardNavigation(
  flatItems,
  searchCategories,
  selectedIndex,
  (app: AppItem) => {
    // console.log("🔍 收到键盘导航事件:", app);
    handlePrepareAction(app);
    handleSearch("");
  }
);

const handleExecuted = async (event: {
  fullPath: string;
  hotkeyEmit: boolean;
}) => {
  console.log("🔌 收到插件执行事件:", event);

  const { fullPath } = event;
  const pluginId = fullPath.split(":")[0];

  const pluginItem = app.plugin.getInstalledPluginItem(fullPath);
  if (!pluginItem) {
    console.error("❌ 未找到插件配置:", fullPath);
    return;
  }

  // 获取插件配置（包含顶层的 main 和 preload）
  const plugin = app.plugin.getPlugin(pluginId!);
  if (!plugin) {
    console.error(`❌ 未找到插件: ${pluginId}`);
    return;
  }

  // 传递给插件的参数
  const data: PluginItemData = {
    files: attachedFiles.value.map((m) => {
      return {
        name: m.name,
        path: m.path,
        size: m.size,
        type: m.type,
        originalType: m.originalFile?.type || "",
      };
    }),
    searchText: app.ui.searchText,
    hotkeyEmit: event.hotkeyEmit,
    fullPath,
    isTemporary: app.plugin.temporaryFullPaths.includes(fullPath),
  };

  // 如果插件有 onEnter 回调，则执行回调
  if (pluginItem?.onEnter) {
    try {
      pluginItem.onEnter(data, pluginItem);
    } catch (error) {
      console.error("❌ 执行插件 onEnter 回调失败:", error);
    }
    attachedFiles.value = [];
    app.ui.searchText = "";
    handleSearch("");
    return;
  }

  console.log("📦 插件配置:", {
    name: plugin.name,
    main: plugin.main,
    preload: plugin.preload,
    fullPath: pluginItem.fullPath,
  });

  // 打开插件窗口并更新 UI 状态
  app.ui.openPluginWindow(pluginItem);
  await nextTick();
  contentAreaRef.value?.handleResize();

  // 懒加载架构：打开插件窗口（后台会判断，没有 main 则打开空白页作为后台窗口）
  try {
    // 确定生命周期类型：优先使用 pluginSetting.backgroundRun，其次使用 pluginItem.lifecycleType
    let lifecycleType = pluginItem?.lifecycleType || LifecycleType.FOREGROUND;
    try {
      const allPluginSettings = (await naimo.router.storeGet(
        "pluginSetting"
      )) as Record<string, any> | null;
      const pluginSetting = allPluginSettings?.[pluginId!];
      if (pluginSetting && typeof pluginSetting.backgroundRun === "boolean") {
        lifecycleType = pluginSetting.backgroundRun
          ? LifecycleType.BACKGROUND
          : LifecycleType.FOREGROUND;
        console.log(
          `🔄 插件 ${pluginId} 使用 pluginSetting.backgroundRun: ${pluginSetting.backgroundRun}, lifecycleType: ${lifecycleType}`
        );
      }
    } catch (error) {
      console.warn("获取插件设置失败，使用默认 lifecycleType:", error);
    }

    // 打开插件窗口并传递 featurePath
    const result = await naimo.router.windowCreatePluginView({
      fullPath: pluginItem?.fullPath || pluginId, // 完整路径（如 translate-plugin:text-translate）
      title: pluginItem?.name || plugin.name || pluginId,
      url: plugin?.main || "", // 使用插件级别的 main（可选，没有则后台加载 about:blank）
      lifecycleType,
      preload: plugin.preload, // 使用插件级别的 preload
      singleton: pluginItem?.singleton ?? true,
      data,
    });

    if (result.success) {
      console.log("✅ 插件窗口已打开:", result.viewId);
    } else {
      app.ui.closePluginWindow();
      console.error("❌ 打开插件窗口失败:", result.error);
    }
  } catch (error) {
    app.ui.closePluginWindow();
    console.error("❌ 打开插件窗口异常:", error);
  }

  // 清空搜索和附件
  attachedFiles.value = [];
  app.ui.searchText = "";
};

// ==================== 事件监听 ====================

// ==================== 监听器 ====================
// 监听搜索结果变化
watchDebounced(
  () => searchCategories.value.length,
  () => {
    const hasResults = searchCategories.value.some(
      (category: any) => category.items.length > 0
    );
    app.ui.setSearchResults(hasResults);
  },
  { debounce: 100 }
);

// 监听附件文件变化 - 简化判断逻辑
watch(
  () => attachedFiles.value.length,
  (newLength, oldLength) => {
    if (newLength !== oldLength && newLength > 0) {
      console.log("📎 附件文件发生变化，自动执行搜索");
      app.ui.switchToSearch();
      handleSearch(app.ui.searchText);
    }
  }
);

// 监听搜索框内容和界面状态
watch(
  [() => app.ui.searchText, isSettingsInterface, isPluginWindowOpen],
  async ([newSearchText, isSettings, isPluginOpen]) => {
    console.log("🔍 监听搜索框内容和界面状态，当前状态:", {
      newSearchText,
      isSettings,
      isPluginOpen,
    });

    // 如果搜索框有内容
    if (newSearchText.trim() !== "") {
      // 关闭设置页面
      if (isSettings) {
        try {
          await naimo.router.windowCloseSettingsView();
          console.log("✅ 搜索框有内容，已自动关闭设置view");
        } catch (error) {
          console.error("❌ 关闭设置view失败:", error);
        }
      }

      // // 关闭插件窗口
      // if (isPluginOpen) {
      //   try {
      //     await windowManager.closePlugin();
      //     clearSearchAndPlugin();
      //     console.log("✅ 搜索框有内容，已自动关闭插件view");
      //   } catch (error) {
      //     console.error("❌ 关闭插件view失败:", error);
      //   }
      // }
    }
  }
);

// ==================== 生命周期 ====================

/**
 * 应用初始化序列
 */
const initializeApp = async () => {
  console.log("🚀 开始应用初始化");
  try {
    // 1. 加载UI常量配置
    await loadUIConstants();
    // 2. 初始化快捷键（优先执行，确保全局快捷键可用）
    await app.initialize();
    console.log("🎉 应用初始化完成");
  } catch (error) {
    console.error("❌ 应用初始化失败:", error);
    throw error;
  }
};

onMounted(async () => {
  console.log("🚀 App.vue onMounted - 开始应用初始化");
  // 初始化应用
  await initializeApp();

  // 直接注册窗口事件监听
  naimo.event.onAppFocus(async () => {
    const isVisible = await windowManager.checkVisible();
    if (!isVisible) show();
    setTimeout(() => {
      handleSearchFocus();
    }, 0);
  });

  naimo.event.onAppBlur((_event, data) => {
    console.log("收到窗口blur事件:", data);
    hide();
  });

  useEventListener(document, "visibilitychange", () => {
    // if (!document.hidden && document.hasFocus()) {
    //   handleSearchFocus();
    //   console.log("页面重新变为可见且获得焦点时，聚焦到搜索框");
    // }

    // 如果搜索框为空且没有搜索结果，则清空搜索框
    if (app.ui.searchText.trim() === "" && !app.ui.hasSearchResults) {
      handleSearch("");
    }
  });

  // 直接注册主进程事件监听
  naimo.event.onPluginWindowClosed(async (_event, data) => {
    console.log("收到主进程插件窗口关闭消息:", data);
    // 转换数据格式以匹配 onPluginClosed 的类型要求
    await windowManager.onPluginClosed(
      {
        windowId: data.windowId,
        title: data.fullPath || "",
        fullPath: data.fullPath,
      },
      { recoverSearchState }
    );
  });

  naimo.event.onWindowMainHide((_event, data) => {
    console.log("收到窗口隐藏事件:", data);
    hide();
  });

  naimo.event.onWindowMainShow((_event, data) => {
    console.log("收到窗口显示事件:", data);
    show();
  });

  naimo.event.onViewDetached((_event, data) => {
    console.log("收到视图分离事件，恢复搜索状态:", data);
    recoverSearchState(true);
  });

  naimo.event.onPluginViewClosed((_event, data) => {
    console.log("收到插件视图关闭事件:", data);
    recoverSearchState(true);
  });

  naimo.event.onViewRestoreRequested((_event, data) => {
    console.log("收到视图恢复请求:", data);
    const { reason } = data;
    if (reason === "settings-closed") {
      recoverSearchState(false);
    } else if (reason === "plugin-closed") {
      recoverSearchState(true);
    }
  });

  naimo.event.onViewReattached(async (_event, data) => {
    console.log("🔗 收到视图重新附加事件:", data);
    const { config } = data;

    // 如果来源是设置页面视图，则只需要恢复设置页面，而不是按插件逻辑处理
    if (data.sourceViewId === "settings-view") {
      console.log("⚙️ 视图重新附加来源为设置页面，恢复设置界面");
      try {
        await windowManager.openSettings();
        // 确保主窗口本身可见
        show();
      } catch (error) {
        console.error("❌ 恢复设置页面失败:", error);
      }
      return;
    }

    if (!config?.pluginInfo) {
      console.warn("⚠️ 视图重新附加事件缺少插件信息");
      return;
    }

    try {
      const pluginInfo = config.pluginInfo;
      // 兼容旧数据：如果没有 fullPath，则尝试用 pluginId 和 path 组装
      const fullPath =
        pluginInfo.fullPath ||
        (pluginInfo.pluginId && pluginInfo.path
          ? `${pluginInfo.pluginId}:${pluginInfo.path}`
          : undefined);

      if (!fullPath) {
        console.warn(
          "⚠️ 视图重新附加事件插件信息不完整，缺少 fullPath / pluginId / path",
          pluginInfo
        );
        return;
      }

      const pluginItem = app.plugin.getInstalledPluginItem(fullPath);

      if (!pluginItem) {
        console.error("❌ 未找到插件配置:", fullPath);
        return;
      }

      console.log("✅ 找到插件配置:", pluginItem);

      // 视图已在主进程完成重新附加，这里只需要恢复前端的 UI 状态
      // 不再重新执行插件（避免重复触发 onEnter / 命令）
      app.ui.openPluginWindow(pluginItem);
      await nextTick();
      contentAreaRef.value?.handleResize();
      // 确保主窗口本身可见
      show();

      console.log(
        "✅ 插件视图已重新附加并恢复 UI 状态:",
        pluginItem?.name || pluginInfo.name
      );
    } catch (error) {
      console.error("❌ 处理视图重新附加失败:", error);
    }
  });

  naimo.event.onViewEscPressed((_event, data) => {
    console.log("收到视图esc事件:", data);
    handleEscAction();
  });

  naimo.event.onSetVisibleInput((_event, data) => {
    app.ui.toggleSearchBoxVisibility(data.value);
  });

  // 监听设置更新事件
  naimo.event.onSettingsUpdated(async (_event, data) => {
    console.log("📡 [App.vue] 收到设置更新事件:", data);
    try {
      // 刷新搜索显示配置（如果相关配置已更改）
      await app.search.refreshDisplayConfig();
      console.log("✅ [App.vue] 已刷新搜索显示配置");
    } catch (error) {
      console.error("❌ [App.vue] 刷新搜索显示配置失败:", error);
    }
  });

  // naimo.event.onViewEscPressed 替代了
  // useEventListener(document, "keydown", (event) => {
  //   if (event.key === "Escape") {
  //     handleEscAction();
  //   }
  // });

  // 注册事件监听（统一使用 app.event）
  app.event.on(
    "hotkey:triggered",
    async (event: { id: string; config: HotkeyConfig; type: HotkeyType }) => {
      switch (event.id) {
        case "app_focus_search":
          console.log("收到聚焦搜索框请求");
          handleSearchFocus();
          break;

        case "app_close_window":
          handleEscAction();
          break;

        case "global_show_window":
          console.log("收到显示/隐藏窗口请求");
          const isMainWindowVisible = await windowManager.checkVisible();
          naimo.log.info("检查窗口是否可见:", isMainWindowVisible);
          if (isMainWindowVisible) {
            hide();
          } else {
            show();
          }
          break;

        default:
          if (event.id.startsWith("custom_global_")) {
            const name = event.config.name?.trim();
            if (!name) {
              console.log("不存在Name:", event.config);
              return;
            }

            if (app.ui.isPluginActive) {
              await windowManager.closePlugin();
              app.ui.closePluginWindow();
              await nextTick();
              await new Promise((resolve) => setTimeout(resolve, 0));
            }

            // 设置搜索文本并搜索
            app.ui.searchText = name;
            await handleSearch(name);
            show();

            // 尝试执行最佳匹配项
            const bestMatchItems = searchCategories.value.find(
              (c) => c.id === "best-match"
            )?.items;
            if (bestMatchItems?.length) {
              handlePrepareAction(bestMatchItems[0], true);
              app.ui.searchText = "";
            } else {
              console.log("没有搜索结果");
            }

            console.log("收到自定义全局快捷键触发事件:", name, {
              items: bestMatchItems,
            });
          }
          break;
      }

      console.log("🔍 收到快捷键触发事件:", event);
    }
  );

  app.event.on("plugin:executed", handleExecuted);

  // 页面刷新时关闭所有插件view
  console.log("🔄 页面初始化，检查并关闭所有插件view");
  try {
    await naimo.router.windowClosePluginView();
    await naimo.router.windowCloseSettingsView();
    console.log("✅ 所有插件view已关闭");
  } catch (error) {
    console.error("❌ 关闭插件view失败:", error);
  }

  // 初始化窗口大小
  initializeWindowSize();
  // 重置到默认状态
  handleResetToDefault();
  // 聚焦搜索框
  handleSearchFocus();

  console.log("🎉 App.vue onMounted - 应用初始化完成");
});
</script>

<style scoped></style>
