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
        @clear-files="clearAttachedFiles"
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
        :show-plugin-window="isWindowInterface"
        :show-settings-background="isSettingsInterface"
        @app-click="executeItem"
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
import { ref, computed, onMounted, nextTick, watch } from "vue";
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
import type { AppItem } from "@shared/typings";

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

/**
 * 应用初始化序列
 */
const initializeApp = async () => {
  console.log("🚀 开始应用初始化");

  try {
    // 1. 加载UI常量配置
    await loadUIConstants();

    // 2. 初始化快捷键（优先执行，确保全局快捷键可用）
    await app.hotkey.initialize();

    // 3. 初始化插件
    await app.plugin.initialize();

    // 4. 初始化搜索
    await app.search.initialize();

    console.log("🎉 应用初始化完成");
  } catch (error) {
    console.error("❌ 应用初始化失败:", error);
    throw error;
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
const show = () => {
  handleWindowShow();
  contentAreaRef.value?.handleResize();
};

// 文件处理器
const { attachedFiles, addFiles, clearAttachedFiles } = useFileHandler();

// 搜索状态
const selectedIndex = ref(0);
const searchCategories = computed(() => app.search.categories);
const flatItems = computed(() => {
  // 扁平化搜索结果，添加 categoryId
  const items: any[] = [];
  for (const category of searchCategories.value) {
    const displayItems = category.isExpanded || category.items.length <= category.maxDisplayCount
      ? category.items
      : category.items.slice(0, category.maxDisplayCount);
    items.push(...displayItems.map((item: any) => ({
      ...item,
      categoryId: category.id
    })));
  }
  return items;
});

// 搜索和应用操作
const updateStoreCategory = async () => {
  await app.search.initItems();
};

const performSearchInternal = async (updateSearchState: boolean = false) => {
  if (updateSearchState) {
    await updateStoreCategory();
  }
};

const {
  executeItem,
  handleCategoryDragEnd,
  handleAppDelete,
  handleAppPin,
} = useAppActions(performSearchInternal);

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
const isWindowInterface = computed(() => app.ui.isWindowInterface);
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
      {
        searchText: value,
        timestamp: Date.now(),
      }
    );
    return;
  }

  // 使用 app.search 执行搜索
  await app.search.performSearch(value);
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

// 容器点击处理
const handleContainerClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (
    target.tagName === "INPUT" ||
    target.tagName === "BUTTON" ||
    target.closest("input") ||
    target.closest("button") ||
    target.closest('[role="button"]') ||
    target.classList.contains("no-drag")
  ) {
    return false;
  }
  return false;
};

// ==================== 文件和插件处理 ====================
// 清除插件
const handleClearPlugin = async () => {
  currentPluginItem.value = null;
  await closePluginWindow();
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
    attachedFiles.value = [];
    currentPluginItem.value = null;
    return;
  }

  // 如果当前是设置页面，关闭设置页面
  if (isSettingsInterface.value) {
    console.log("关闭设置页面");
    await closeSettings();
    return;
  }

  if (attachedFiles.value.length > 0 || currentPluginItem.value) {
    console.log("清空附加内容");
    attachedFiles.value = [];
    currentPluginItem.value = null;
    return;
  }

  // 如果当前是搜索页面
  if (searchText.value.trim() !== "") {
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
    executeItem(app);
    handleSearch("");
  }
);

// ==================== 事件监听 ====================
// 窗口焦点事件
const onWindowFocus = () => {
  handleSearchFocus();
  isWindowVisible().then((isVisible) => {
    if (!isVisible) show();
  });
};

const onWindowBlur = (data?: any) => {
  console.log("收到窗口blur事件:", data);
  hide();
};

const onVisibilityChange = () => {
  if (!document.hidden && document.hasFocus()) {
    handleSearchFocus();
    console.log("页面重新变为可见且获得焦点时，聚焦到搜索框");
  }
};

// 快捷键事件
const onHotkeyTriggered = async (event: {
  id: string;
  config: HotkeyConfig;
  type: HotkeyType;
}) => {
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

        searchText.value = name;
        app.ui.query = name;
        await handleSearch(name);
        show();

        const items = searchCategories.value.find(
          (category) => category.id === "best-match"
        )?.items;
        if (items && items.length > 0) {
          executeItem(items[0], true);
        } else {
          console.log("没有搜索结果");
        }

        console.log("搜索结果:", searchCategories.value, { items });
        console.log("收到自定义全局快捷键触发事件:", name);
      }
      break;
  }

  console.log("🔍 收到快捷键触发事件:", event);
};

// ==================== 插件事件处理 ====================
const handlePluginExecuted = async (event: {
  pluginId: string;
  path: string;
  hotkeyEmit: boolean;
}) => {
  await pluginWindowManager.handlePluginExecuted(event, {
    openPluginWindowUI: (plugin) => app.ui.openPluginWindow(plugin),
    toggleInput: (value?: boolean) => {
      shouldShowSearchBox.value =
        value !== undefined ? value : !shouldShowSearchBox.value;
    },
    attachedFiles: attachedFiles.value,
    searchText: searchText.value,
    updateStoreCategory,
    handleSearch,
    pluginStore: {
      installZip: async (zipPath: string) => {
        try {
          await app.plugin.install(zipPath);
          return true;
        } catch {
          return false;
        }
      },
      install: async (path: string) => {
        try {
          await app.plugin.install(path);
          return true;
        } catch {
          return false;
        }
      },
      uninstall: async (id: string) => {
        try {
          await app.plugin.uninstall(id);
          return true;
        } catch {
          return false;
        }
      },
      toggle: async (id: string, enabled: boolean) => {
        try {
          await app.plugin.toggle(id, enabled);
          return true;
        } catch {
          return false;
        }
      },
    },
    setAttachedFiles: (files) => {
      attachedFiles.value = [...files];
    },
    setSearchText: (text) => {
      searchText.value = text;
    },
    getInstalledPluginItem: (pluginId: string, path: string) => {
      return app.plugin.getInstalledPluginItem(pluginId, path);
    },
    getPluginApi: async (pluginId: string) => {
      return await app.plugin.getPluginApi(pluginId);
    },
  });
};

const handlePluginWindowClosed = async (data: any) => {
  await pluginWindowManager.handlePluginWindowClosed(data, {
    isPluginWindowOpen: isPluginWindowOpen.value,
    closePluginWindow,
    recoverSearchState,
  });
};

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

// 监听附件文件变化
watch(
  () => attachedFiles.value,
  (newFiles, oldFiles) => {
    if (
      newFiles.length !== oldFiles?.length ||
      (newFiles.length > 0 &&
        oldFiles?.length > 0 &&
        newFiles.some((file, index) => file.path !== oldFiles[index]?.path))
    ) {
      console.log("📎 附件文件发生变化，自动执行搜索");
      app.ui.switchToSearch();
      handleSearch(searchText.value);
    }
  },
  { deep: true }
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
onMounted(async () => {
  console.log("🚀 App.vue onMounted - 开始应用初始化");

  // 初始化应用
  await initializeApp();

  // 直接注册窗口事件监听
  naimo.event.onAppFocus(() => {
    onWindowFocus();
  });

  naimo.event.onAppBlur((_event, data) => {
    onWindowBlur(data);
  });

  useEventListener(document, "visibilitychange", onVisibilityChange);

  // 直接注册主进程事件监听
  naimo.event.onPluginWindowClosed((_event, data) => {
    console.log("收到主进程插件窗口关闭消息:", data);
    handlePluginWindowClosed(data);
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

      app.ui.openPluginWindow(pluginItem);

      searchText.value = "";
      app.ui.query = "";
      attachedFiles.value = [];

      await handleSearch("");

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
  app.event.on("hotkey:triggered", onHotkeyTriggered);
  app.event.on("plugin:executed", handlePluginExecuted);

  // 页面刷新时关闭所有插件view
  console.log("🔄 页面初始化，检查并关闭所有插件view");
  try {
    await naimo.router.windowClosePluginView();
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
