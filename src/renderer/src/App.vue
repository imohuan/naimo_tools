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
        :plugin-item="currentPluginItem"
        :attached-files="attachedFiles"
        :is-settings-interface="isSettingsInterface"
        :search-text="searchText"
        :should-show-search-box="shouldShowSearchBox"
        @click="handleSearchFocus"
        @update:search-text="searchText = $event"
        @search="handleSearch"
        @input="debouncedHandleSearch"
        @add-files="addFiles"
        @clear-files="handleClearFiles"
        @clear-plugin="handleClearPlugin"
        @open-settings="openSettings"
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
import { usePluginWindowManager } from "@/composables/usePluginWindowManager";
import { useSettingsManager } from "@/composables/useSettingsManager";

// 配置导入
import { DEFAULT_WINDOW_LAYOUT } from "@shared/config/windowLayoutConfig";

// 模块导入 - 直接导入辅助函数
import { useKeyboardNavigation } from "@/components/Search/hooks/useKeyboardNavigation";
import { useAppActions } from "@/composables/useAppActions";

// Store 导入
import { HotkeyType, useApp, type HotkeyConfig } from "@/temp_code";

// 类型导入
import type { AppItem, AttachedInfo } from "@/temp_code/typings/search";

// ==================== 初始化 ====================
const app = useApp();
const pluginWindowManager = usePluginWindowManager();
const settingsManager = useSettingsManager();

// UI 配置管理
const uiConstants = ref({
  headerHeight: DEFAULT_WINDOW_LAYOUT.searchHeaderHeight,
  padding: DEFAULT_WINDOW_LAYOUT.appPadding,
});

/**
 * 从主进程获取UI常量配置
 */
const loadUIConstants = async () => {
  try {
    const config = await naimo.router.windowGetUIConstants();
    if (config) {
      uiConstants.value = config;
      console.log("✅ UI常量配置加载成功:", config);
      return config;
    }
    console.warn("⚠️ 未获取到UI常量配置，使用默认值");
    return uiConstants.value;
  } catch (error) {
    console.warn("❌ 获取UI常量配置失败，使用默认值:", error);
    return uiConstants.value;
  }
};

// 组件引用
const searchHeaderRef = ref<InstanceType<typeof SearchHeader>>();
const contentAreaRef = ref<InstanceType<typeof ContentArea>>();

// 窗口管理器
const {
  setSize,
  isWindowVisible,
  show: handleWindowShow,
  hide,
} = useWindowManager();

// 显示窗口并调整大小
const show = () => {
  handleWindowShow();
  contentAreaRef.value?.handleResize();
};

// 文件处理器
const { attachedFiles, addFiles, clearAttachedFiles } = useFileHandler();

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
  handlePrepareAction,
  handleCategoryDragEnd,
  handleAppDelete,
  handleAppPin,
} = useAppActions();

const handleCategoryToggle = (categoryId: string) => {
  app.search.toggleCategory(categoryId);
};

// ==================== 计算属性 ====================
const searchText = ref("");
const shouldShowSearchBox = ref(true);
const headerHeight = computed(() => uiConstants.value.headerHeight);
const padding = computed(() => uiConstants.value.padding);

// UI 状态（使用 useApp().ui）
const isSettingsInterface = computed(() => app.ui.isSettingsInterface);
const isPluginWindowOpen = computed(() => app.ui.isWindowInterface);
const contentAreaVisible = computed(() => app.ui.isContentVisible);
const currentPluginItem = computed({
  get: () => app.ui.activePlugin,
  set: (value) => {
    app.ui.activePlugin = value;
  },
});

// ==================== 核心业务函数 ====================
// 搜索处理函数
const handleSearch = async (value: string) => {
  const currentPlugin = currentPluginItem.value;
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
  if (file.type.startsWith("image/") && file.icon) {
    return { type: "img", data: file.icon, originalFile: file };
  }

  // 文本类型：读取文件内容
  if (file.type.startsWith("text/")) {
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
  () => handleSearch(searchText.value),
  100
);

// 聚焦搜索框
const handleSearchFocus = () => {
  nextTick(() => {
    if (shouldShowSearchBox.value && searchHeaderRef.value) {
      searchHeaderRef.value.focus();
    }
  });
};

// 容器点击处理 - 始终返回 false（不需要额外逻辑）
const handleContainerClick = () => false;

// ==================== 工具函数 ====================
// 清空搜索和插件状态
const clearSearchAndPlugin = () => {
  searchText.value = "";
  app.ui.query = "";
  currentPluginItem.value = null;
  attachedFiles.value = [];
};

// 清除附件文件并触发搜索
const handleClearFiles = () => {
  clearAttachedFiles();
  // 清除文件后触发搜索
  handleSearch(searchText.value);
};

// 清除插件并触发搜索
const handleClearPlugin = async () => {
  currentPluginItem.value = null;
  await closePluginWindow();
  // 清除插件后触发搜索
  handleSearch(searchText.value);
};

// ==================== 插件和设置管理 ====================
const closePluginWindow = async () => {
  await pluginWindowManager.closePluginWindow({
    closePluginWindowUI: () => app.ui.closePluginWindow(),
    handleSearchFocus,
  });
};

const openSettings = async () => {
  if (isPluginWindowOpen.value) {
    console.log("🔧 打开设置前，先关闭插件view");
    try {
      await naimo.router.windowClosePluginView();
      console.log("✅ 插件view已关闭");
    } catch (error) {
      console.error("❌ 关闭插件view失败:", error);
    }
  }

  await settingsManager.openSettings({
    switchToSettings: () => app.ui.switchToSettings(),
    handleResize: () => contentAreaRef.value?.handleResize(),
  });
};

const closeSettings = async () => {
  await settingsManager.closeSettings({
    switchToSearch: () => app.ui.switchToSearch(),
    handleSearchFocus,
  });
};

// ==================== 窗口管理 ====================
const initializeWindowSize = () => {
  setSize({ height: headerHeight.value + padding.value });
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
  if (isPluginWindowOpen.value) closePluginWindow();
  app.ui.resetToDefault();
};

// ==================== 搜索状态恢复 ====================
const recoverSearchState = (clearPlugin = false) => {
  console.log("恢复搜索状态", { clearPlugin, searchText: searchText.value });

  if (clearPlugin) {
    currentPluginItem.value = null;
  }

  app.ui.switchToSearch();
  shouldShowSearchBox.value = true;

  const currentText = searchText.value ?? "";
  app.ui.query = currentText;
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
    closePluginWindow();
    clearSearchAndPlugin();
    return;
  }

  // 如果当前是设置页面，关闭设置页面
  if (isSettingsInterface.value) {
    console.log("关闭设置页面");
    await closeSettings();
    return;
  }

  // 如果有附件或插件，清空它们
  if (attachedFiles.value.length > 0 || currentPluginItem.value) {
    console.log("清空附加内容");
    attachedFiles.value = [];
    currentPluginItem.value = null;
    return;
  }

  // 如果有搜索内容，清空搜索框
  if (searchText.value.trim()) {
    console.log("清空搜索框");
    searchText.value = "";
    app.ui.query = "";
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
    handlePrepareAction(app);
    handleSearch("");
  }
);

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
      handleSearch(searchText.value);
    }
  }
);

// 监听搜索框内容和界面状态
watch(
  [() => searchText.value, isSettingsInterface],
  async ([newSearchText, isSettings]) => {
    console.log("🔍 监听搜索框内容和界面状态，当前状态:", {
      newSearchText,
      isSettings,
    });

    if (newSearchText.trim() !== "" && isSettings) {
      try {
        await naimo.router.windowCloseSettingsView();
        console.log("✅ 搜索框有内容，已自动关闭设置view");
      } catch (error) {
        console.error("❌ 关闭设置view失败:", error);
      }
    }
  }
);

// 监听搜索文本变化
watch(
  () => searchText.value,
  (newSearchText, oldSearchText) => {
    if (newSearchText === oldSearchText) return;
    // 同步搜索文本到 UI store（用于控制内容区域可见性）
    app.ui.query = newSearchText;
    debouncedHandleSearch();
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
  naimo.event.onAppFocus(() => {
    handleSearchFocus();
    isWindowVisible().then((isVisible) => {
      if (!isVisible) show();
    });
  });

  naimo.event.onAppBlur((_event, data) => {
    console.log("收到窗口blur事件:", data);
    hide();
  });

  useEventListener(document, "visibilitychange", () => {
    if (!document.hidden && document.hasFocus()) {
      handleSearchFocus();
      console.log("页面重新变为可见且获得焦点时，聚焦到搜索框");
    }
  });

  // 直接注册主进程事件监听
  naimo.event.onPluginWindowClosed(async (_event, data) => {
    console.log("收到主进程插件窗口关闭消息:", data);
    // 转换数据格式以匹配 handlePluginWindowClosed 的类型要求
    const event = {
      windowId: data.windowId,
      title: data.pluginId || "",
      path: data.pluginId,
    };
    await pluginWindowManager.handlePluginWindowClosed(event, {
      isPluginWindowOpen: isPluginWindowOpen.value,
      closePluginWindow,
      recoverSearchState,
    });
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

    if (!config?.pluginInfo) {
      console.warn("⚠️ 视图重新附加事件缺少插件信息");
      return;
    }

    try {
      const pluginItem = app.plugin.getInstalledPluginItem(
        config.pluginInfo.path.split(":")[0],
        config.pluginInfo.path || config.path
      );

      if (!pluginItem) {
        console.warn("⚠️ 未找到插件配置:", config.pluginInfo);
        return;
      }

      console.log("✅ 找到插件配置:", pluginItem);

      // 打开插件窗口并清空状态
      app.ui.openPluginWindow(pluginItem);
      clearSearchAndPlugin();
      await handleSearch("");

      // 调整布局
      await nextTick();
      contentAreaRef.value?.handleResize();

      console.log("✅ 插件状态已恢复:", pluginItem.name);
    } catch (error) {
      console.error("❌ 处理视图重新附加失败:", error);
    }
  });

  naimo.event.onViewEscPressed((_event, data) => {
    console.log("收到视图esc事件:", data);
    handleEscAction();
  });

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
          const isMainWindowVisible = await isWindowVisible();
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

            // 设置搜索文本并搜索
            searchText.value = name;
            app.ui.query = name;
            await handleSearch(name);
            show();

            // 尝试执行最佳匹配项
            const bestMatchItems = searchCategories.value.find(
              (c) => c.id === "best-match"
            )?.items;
            if (bestMatchItems?.length) {
              handlePrepareAction(bestMatchItems[0], true);
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

  app.event.on(
    "plugin:executed",
    async (event: { pluginId: string; path: string; hotkeyEmit: boolean }) => {
      await pluginWindowManager.handlePluginExecuted(event, {
        openPluginWindowUI: (plugin) => app.ui.openPluginWindow(plugin),
        toggleInput: (value?: boolean) => {
          shouldShowSearchBox.value = value ?? !shouldShowSearchBox.value;
        },
        attachedFiles: attachedFiles.value,
        searchText: searchText.value,
        updateStoreCategory: () => app.search.initItems(),
        handleSearch,
        pluginStore: {
          installZip: (zipPath: string) =>
            app.plugin
              .install(zipPath)
              .then(() => true)
              .catch(() => false),
          install: (path: string) =>
            app.plugin
              .install(path)
              .then(() => true)
              .catch(() => false),
          uninstall: (id: string) =>
            app.plugin
              .uninstall(id)
              .then(() => true)
              .catch(() => false),
          toggle: (id: string, enabled: boolean) =>
            app.plugin
              .toggle(id, enabled)
              .then(() => true)
              .catch(() => false),
        },
        setAttachedFiles: (files) => {
          attachedFiles.value = [...files];
        },
        setSearchText: (text) => {
          searchText.value = text;
        },
        getInstalledPluginItem: (pluginId: string, path: string) =>
          app.plugin.getInstalledPluginItem(pluginId, path),
        getPluginApi: (pluginId: string) => app.plugin.getPluginApi(pluginId),
      });
    }
  );

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
