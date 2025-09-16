<template>
  <div class="w-full h-full p-[8px]" @keydown="handleKeyNavigation" @click="handleContainerClick">
    <!-- 主应用容器 -->
    <div class="w-full bg-transparent relative shadow-lg rounded-xl  overflow-hidden"
      :class="{ 'rounded-b-none': isPluginWindowOpen && searchText.trim() === '' && !isSettingsInterface }"
      style="box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4)">
      <!-- 搜索框区域 -->
      <SearchHeader ref="searchHeaderRef" v-model:search-text="searchText" :is-drag-over="isDragOver"
        :header-height="headerHeight" :attached-files="attachedFiles" :current-plugin-item="currentPluginItem"
        :should-show-search-box="shouldShowSearchBox" @search="handleSearchWithFiles" @input="debouncedHandleSearch"
        @click="handleClick" @drag-over="handleDragOver" @drag-enter="handleDragEnter" @drag-leave="handleDragLeave"
        @drop="handleFileDrop" @paste="handleFilePaste" @clear-files="clearAttachedFiles"
        @clear-plugin="clearPluginInfo" @open-settings="openSettings" />

      <!-- 内容呈现区域 -->
      <ContentArea ref="contentAreaRef" :content-area-visible="contentAreaVisible"
        :content-area-height="contentAreaHeight" :search-categories="searchCategories" :selected-index="selectedIndex"
        :flat-items="flatItems" :show-settings="isSettingsInterface"
        :show-plugin-window="isPluginWindowOpen && searchText.trim() === ''" :max-height="maxHeight"
        :header-height="headerHeight" :padding="padding" @app-click="customExecuteItem"
        @category-toggle="handleCategoryToggle" @category-drag-end="handleCategoryDragEnd" @app-delete="handleAppDelete"
        @app-pin="handleAppPin" @close-settings="closeSettings" @window-resize="handleWindowResize" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from "vue";
import { useDebounceFn, watchDebounced, useEventListener } from "@vueuse/core";
import SearchHeader from "@/modules/search/components/SearchHeader.vue";
import ContentArea from "@/components/ContentArea.vue";
import { useDragDrop } from "@/composables/useDragDrop";
import { useFileHandler } from "@/composables/useFileHandler";
import { useInterfaceManager } from "@/composables/useInterfaceManager";
import { useKeyboardNavigation, useGlobalHotkeyInitializer } from "@/modules/hotkeys";
import { useSearch } from "@/modules/search";
import { useEventSystem } from "@/composables/useEventSystem";
import type { AppItem } from "@shared/types";

// UI常量配置 - 从应用配置中获取
const uiConstants = ref({ headerHeight: 50, maxHeight: 420, padding: 8 });

// 从配置中获取UI常量
const loadUIConstants = async () => {
  try {
    const config = await api.ipcRouter.windowGetUIConstants();
    if (config) uiConstants.value = config;
  } catch (error) {
    console.warn('获取UI常量配置失败，使用默认值:', error);
  }
};

// 创建响应式的UI常量引用
const headerHeight = computed(() => uiConstants.value.headerHeight);
const maxHeight = computed(() => uiConstants.value.maxHeight);
const padding = computed(() => uiConstants.value.padding);

// ==================== 界面状态管理 ====================
const {
  searchText: interfaceSearchText,
  isSettingsInterface,
  isPluginWindowOpen,
  contentAreaVisible,
  currentPluginItem,
  shouldShowSearchBox,
  switchToSettings,
  openPluginWindow,
  closePluginWindow,
  updateSearchResults,
  closeSettings: interfaceCloseSettings,
  resetToDefault
} = useInterfaceManager();

// ==================== 组件引用 ====================
const searchHeaderRef = ref<InstanceType<typeof SearchHeader>>();
const contentAreaRef = ref<InstanceType<typeof ContentArea>>();

// ==================== 窗口大小管理 ====================
const contentAreaHeight = ref(100);

const initializeWindowSize = () => {
  // 初始化时设置最小窗口高度
  api.ipcRouter.windowSetSize(-1, headerHeight.value + padding.value);
  // TODO: 之后修改，需要同时初始化内容弹出框，以免冲突
};

// ==================== 搜索模块 ====================
const {
  selectedIndex,
  initAppApps,
  searchText: searchModuleText,
  searchCategories,
  originalCategories,
  flatItems,
  handleSearch,
  updateCategoryInBoth,
  executeItem,
  handleCategoryToggle,
  handleCategoryDragEnd,
  handleAppDelete,
  handleAppPin,
} = useSearch();

// 同步搜索文本到界面管理器
const searchText = computed({
  get: () => interfaceSearchText.value,
  set: (value: string) => {
    interfaceSearchText.value = value;
    searchModuleText.value = value;
  }
});

// ==================== 文件处理 ====================
const { attachedFiles, addFiles, clearAttachedFiles } = useFileHandler();

// 清除插件信息
const clearPluginInfo = async () => {
  // 调用界面管理器的关闭插件窗口方法
  await closePluginWindow();
};

// 包装 handleSearch 函数，自动传递 attachedFiles
const handleSearchWithFiles = (value: string) => {
  return handleSearch(value, [...attachedFiles.value]);
};

// ==================== 拖拽管理 ====================
const {
  isDragOver,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDrop,
} = useDragDrop(
  updateCategoryInBoth,
  originalCategories,
  handleSearchWithFiles,
  addFiles
);

// ==================== 键盘导航 ====================

const customExecuteItem = (app: AppItem) => {
  executeItem(app);
  handleSearchWithFiles("");
};

const { handleKeyNavigation } = useKeyboardNavigation(
  flatItems,
  searchCategories,
  selectedIndex,
  customExecuteItem,
  handleSearchWithFiles
);

// ==================== 全局快捷键初始化 ====================
const {
  initializeGlobalHotkeys,
  isInitialized,
  initializationError,
} = useGlobalHotkeyInitializer();

// ==================== 事件系统 ====================
const { on } = useEventSystem();

// ==================== 方法 ====================
const handleSearchFocus = () => {
  // SearchHeader组件的focus方法内部会检查搜索框是否可见
  nextTick(() => {
    searchHeaderRef.value?.focus();
  });
}

const handleClick = () => {
  handleSearchFocus()
};

const handleContainerClick = (event: MouseEvent) => {
  // 检查点击的目标元素
  const target = event.target as HTMLElement;

  // 如果点击的是输入框、按钮或其他交互元素，不处理
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'BUTTON' ||
    target.closest('input') ||
    target.closest('button') ||
    target.closest('[role="button"]') ||
    target.classList.contains('no-drag')
  ) {
    return false;
  }

  // 点击空白区域时聚焦搜索框
  handleSearchFocus();
  return false
};

const debouncedHandleSearch = useDebounceFn(
  () => handleSearch(searchText.value, [...attachedFiles.value]),
  100
);

// 文件处理事件
const handleFileDrop = async (event: DragEvent) => {
  // 先调用原有的拖拽处理逻辑
  await handleDrop(event);

  // 然后处理文件附加
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    await addFiles(files);
  }
};

const handleFilePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;

  const files: File[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }
  }

  if (files.length > 0) {
    event.preventDefault();
    await addFiles(files);
  }
};

// 设置页面方法
const openSettings = () => {
  switchToSettings();
};

const closeSettings = async () => {
  // 调用界面管理器的关闭设置方法
  await interfaceCloseSettings();

  // 关闭设置后，如果有搜索内容则显示搜索结果，否则显示默认内容
  nextTick(() => {
    if (searchText.value.trim() !== '') {
      handleSearchWithFiles(searchText.value);
    } else {
      // 清空搜索，显示默认分类
      handleSearchWithFiles('');
    }

    // 聚焦到搜索输入框（如果可见）
    handleSearchFocus();
  });
};


// 处理窗口大小调整
const handleWindowResize = (height: number) => {
  api.ipcRouter.windowSetSize(-1, height);
};

// ==================== 监听器 ====================
// 监听搜索结果变化，更新界面状态
watchDebounced(
  () => searchCategories.value.length,
  () => {
    const hasResults = searchCategories.value.some(
      (category: any) => category.items.length > 0
    );
    updateSearchResults(hasResults);

    // 窗口大小现在由 ContentArea 组件自动管理
  },
  { debounce: 100 }
);

// 监听搜索文本变化，同步到搜索模块
watch(
  () => searchText.value,
  (newSearchText, oldSearchText) => {
    // 如果搜索文本没有实际变化，不处理
    if (newSearchText === oldSearchText) return;

    // 同步到搜索模块
    searchModuleText.value = newSearchText;

    // 执行搜索（使用防抖）
    debouncedHandleSearch();
  }
);

// 监听附件文件变化，自动执行搜索
watch(
  () => attachedFiles.value,
  (newFiles, oldFiles) => {
    // 只有当文件列表真正发生变化时才执行搜索
    if (
      newFiles.length !== oldFiles?.length ||
      (newFiles.length > 0 &&
        oldFiles?.length > 0 &&
        newFiles.some((file, index) => file.path !== oldFiles[index]?.path))
    ) {
      console.log("📎 附件文件发生变化，自动执行搜索:", {
        newFilesCount: newFiles.length,
        oldFilesCount: oldFiles?.length || 0,
      });

      // 使用当前的搜索文本和新的附件文件执行搜索
      handleSearch(searchText.value, [...newFiles]);
    }
  },
  { deep: true }
);

// ==================== 窗口焦点管理 ====================
const handleWindowFocus = () => {
  handleSearchFocus();
};

const handleWindowBlur = () => {
  // 窗口失去焦点时，延迟一点时间后隐藏窗口
  setTimeout(() => {
    // 检查窗口是否仍然失去焦点且不在设置页面
    if (!document.hasFocus() && !isSettingsInterface.value) {
      // 调用主进程隐藏窗口
      // api.ipcRouter.windowToggleShow(window.id || 0, false);
    }
  }, 100);
};

// 页面可见性变化处理
const handleVisibilityChange = () => {
  if (!document.hidden && document.hasFocus()) {
    // 页面重新变为可见且获得焦点时，聚焦到搜索框（如果可见）
    handleSearchFocus();
    console.log("页面重新变为可见且获得焦点时，聚焦到搜索框");
  }
};

// 处理快捷键请求聚焦搜索框
const handleFocusSearchRequested = () => {
  console.log("收到聚焦搜索框请求");
  // SearchHeader组件的focus方法内部会检查搜索框是否可见
  handleSearchFocus();
};

// 处理插件执行完成事件
const handlePluginExecuted = (event: { pluginItem: any }) => {
  const { pluginItem } = event;
  console.log('🔍 收到插件执行完成事件，插件项目信息:', {
    name: pluginItem.name,
    enableSearch: pluginItem.executeParams?.enableSearch,
    executeParams: pluginItem.executeParams
  });

  // 检查是否为打开新窗口类型的插件
  if (pluginItem.executeType === 3) { // PluginExecuteType.SHOW_WEBPAGE = 3
    // 打开插件窗口并传递插件项目信息
    openPluginWindow(pluginItem);
  }
};

// 处理关闭窗口请求
const handleCloseWindowRequested = async () => {
  console.log("收到关闭窗口请求，当前状态:", {
    isPluginWindowOpen: isPluginWindowOpen.value,
    isSettingsInterface: isSettingsInterface.value,
    searchText: searchText.value,
    hasSearchText: searchText.value.trim() !== ''
  });

  // 如果当前是插件窗口，关闭插件窗口
  if (isPluginWindowOpen.value) {
    console.log("关闭插件窗口");
    await closePluginWindow();
    return;
  }

  // 如果当前是设置页面，关闭设置页面
  if (isSettingsInterface.value) {
    console.log("关闭设置页面");
    await closeSettings();
    return;
  }

  // 如果当前是搜索页面
  if (searchText.value.trim() !== '') {
    console.log("清空搜索框");
    // 清空搜索框
    searchText.value = '';
    // 执行空搜索，显示默认内容
    handleSearchWithFiles('');
    return;
  }

  // 如果搜索框没有值，隐藏主窗口
  console.log("隐藏主窗口");
  if (api?.ipcRouter?.windowToggleShow) {
    api.ipcRouter.windowToggleShow(window.id!, false);
  } else {
    console.error("❌ api.ipcRouter.windowToggleShow 不可用");
  }

  // 关闭或隐藏子窗口
  const closeAction = currentPluginItem.value?.executeParams?.closeAction
  if (closeAction) {
    api.ipcRouter.windowManageFollowingWindows(closeAction)
  } else {
    api.ipcRouter.windowCloseAllFollowingWindows()
  }
};

// 处理显示/隐藏窗口请求
const handleShowHideWindowRequested = async () => {
  console.log("收到显示/隐藏窗口请求，当前状态:", {
    isPluginWindowOpen: isPluginWindowOpen.value,
    currentPluginItem: currentPluginItem.value?.name,
    pluginId: currentPluginItem.value?.pluginId
  });

  // 检查主窗口当前是否可见
  const isMainWindowVisible = document.visibilityState === 'visible' && document.hasFocus();

  if (isMainWindowVisible) {
    // 主窗口当前可见，需要隐藏
    console.log("隐藏主窗口和所有子窗口");

    // 先隐藏所有following类型的子窗口
    if (api?.ipcRouter?.windowHideAllFollowingWindows) {
      console.log("先隐藏所有子窗口");
      api.ipcRouter.windowHideAllFollowingWindows();
    }

    // 延迟一点时间，确保子窗口隐藏完成后再隐藏主窗口
    setTimeout(() => {
      // 隐藏主窗口
      if (api?.ipcRouter?.windowToggleShow) {
        console.log("再隐藏主窗口");
        api.ipcRouter.windowToggleShow(window.id!, false);
      } else {
        console.error("❌ api.ipcRouter.windowToggleShow 不可用");
      }
    }, 50); // 延迟50ms确保子窗口隐藏完成
  } else {
    // 主窗口当前不可见，需要显示
    console.log("显示主窗口");

    // 显示主窗口
    if (api?.ipcRouter?.windowToggleShow) {
      api.ipcRouter.windowToggleShow(window.id!, true);
    } else {
      console.error("❌ api.ipcRouter.windowToggleShow 不可用");
    }

    // 延迟一点时间，让主窗口显示完成后再处理子窗口
    setTimeout(() => {
      // 如果有当前插件项目，显示对应的插件窗口
      if (currentPluginItem.value && currentPluginItem.value.pluginId) {
        console.log("显示特定插件窗口:", currentPluginItem.value.name);
        if (api?.ipcRouter?.windowShowSpecificFollowingWindow) {
          api.ipcRouter.windowShowSpecificFollowingWindow({
            pluginId: currentPluginItem.value.pluginId,
            name: currentPluginItem.value.name
          });
        }
      } else {
        // 没有特定插件项目，显示所有following窗口
        console.log("显示所有following窗口");
        // if (api?.ipcRouter?.windowShowAllFollowingWindows) {
        //   api.ipcRouter.windowShowAllFollowingWindows();
        // }
      }
    }, 100); // 延迟100ms让主窗口显示完成
  }
};

// ==================== 生命周期 ====================
onMounted(async () => {
  console.log("🚀 App.vue onMounted - 开始应用初始化");
  // 加载UI常量配置
  await loadUIConstants();
  // 初始化快捷键（优先执行，确保全局快捷键可用）
  await initializeGlobalHotkeys();
  if (initializationError.value) {
    console.error("❌ 全局快捷键初始化失败:", initializationError.value);
  } else if (isInitialized.value) {
    console.log("✅ 全局快捷键初始化成功");
  }

  // 初始化应用数据
  await initAppApps();
  // 初始化窗口大小
  initializeWindowSize();
  // 初始化界面状态
  resetToDefault();

  // 发生变化的时候 聚焦到搜索框
  useEventListener(window, "focus", handleWindowFocus);
  useEventListener(window, "blur", handleWindowBlur);
  useEventListener(document, "visibilitychange", handleVisibilityChange);

  // 全局快捷键：聚焦搜索框
  on('search:focus-requested', handleFocusSearchRequested);
  // 全局快捷键：关闭窗口请求
  on('window:close-requested', handleCloseWindowRequested);
  // 全局快捷键：显示/隐藏窗口请求
  on('window:show-hide-requested', handleShowHideWindowRequested);
  // 插件执行完成 - 进入插件界面
  on('plugin:executed', handlePluginExecuted);

  // 聚焦到搜索框
  handleSearchFocus();
  console.log("🎉 App.vue onMounted - 应用初始化完成");
});

</script>

<style scoped></style>
