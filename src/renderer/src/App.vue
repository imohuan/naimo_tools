<template>
  <div class="w-full h-full p-2 bg-transparent" @keydown="handleKeyNavigation" @click="handleContainerClick">
    <!-- <Test /> -->
    <!-- 主应用容器 - 透明背景，恢复阴影和圆角效果 -->
    <div class="w-full bg-transparent relative overflow-hidden h-full rounded-xl transition-all duration-200"
      :class="{ 'ring-2 ring-indigo-400 ring-opacity-50': isDragOver }"
      style="box-shadow: 0 1px 3px 0 rgba(60, 72, 120, 0.48);">

      <!-- 搜索头部区域 - 固定区域，支持自定义窗口拖拽 -->
      <DraggableArea class="w-full flex items-center justify-center" :style="{ height: `${headerHeight}px` }"
        @click="searchHeaderActions.handleClick">

        <div class="w-full h-full relative flex items-center bg-white rounded-t-xl transition-all duration-200"
          :class="{ 'bg-indigo-50': isDragOver }" @dragover="handleDragOver" @dragenter="handleDragEnter"
          @dragleave="handleDragLeave" @drop="originalHandleDrop">

          <!-- 插件信息显示区域 -->
          <div v-if="displayedPluginItem && !searchHeaderState.isSettingsInterface"
            class="h-full flex items-center p-2">
            <!-- 调试信息 -->
            <!-- {{ console.log('🔍 Debug插件信息:', { shouldShow: searchHeaderComputed.shouldShowPluginInfo.value, currentPluginItem: searchHeaderState.currentPluginItem, isSettings: searchHeaderState.isSettingsInterface }) }} -->
            <!-- 插件图标容器 -->
            <div class="h-full p-2 flex items-center space-x-1 border border-indigo-200 bg-indigo-50 rounded-md">
              <div class="p-1 flex items-center justify-center">
                <IconDisplay :src="displayedPluginItem?.icon" :alt="displayedPluginItem?.name"
                  icon-class="w-4 h-4 object-cover" fallback-class="w-5 h-5 flex items-center justify-center">
                  <template #fallback>
                    <IconMdiPuzzle class="w-4 h-4 text-indigo-500" />
                  </template>
                </IconDisplay>
              </div>

              <!-- 插件名称和类型 -->
              <div class="flex items-center justify-center gap-2">
                <span class="text-sm font-medium text-indigo-700 truncate max-w-24" :title="displayedPluginItem?.name">
                  {{ displayedPluginItem?.name }}
                </span>
                <span class="font-mono bg-indigo-400 rounded-md text-white px-2 text-xs">
                  插件
                </span>
              </div>
            </div>
          </div>

          <!-- 文件信息显示区域 -->
          <div v-else-if="searchHeaderState.attachedFiles.length > 0 && !displayedPluginItem"
            class="h-full flex items-center p-2">
            <!-- 文件图标容器 -->
            <div class="h-full p-2 flex items-center space-x-1 border border-gray-200 bg-gray-50 rounded-md">
              <div class="p-1">
                <IconDisplay :src="searchHeaderComputed.firstFile.value?.icon"
                  :alt="searchHeaderComputed.firstFile.value?.name" icon-class="w-5 h-5 object-cover"
                  fallback-class="w-5 h-5 flex items-center justify-center">
                  <template #fallback>
                    <IconMdiFile class="w-4 h-4 text-gray-500" />
                  </template>
                </IconDisplay>
              </div>

              <!-- 文件名和数量 -->
              <div class="flex items-center justify-center gap-2">
                <span class="text-sm font-medium text-gray-700 truncate max-w-24"
                  :title="searchHeaderComputed.firstFile.value?.name">
                  {{ searchHeaderComputed.firstFile.value?.name }}
                </span>
                <span v-if="searchHeaderState.attachedFiles.length > 1"
                  class="font-mono bg-gray-400 rounded-md text-white px-2 text-xs">
                  {{ searchHeaderState.attachedFiles.length }}
                </span>
              </div>
            </div>
          </div>

          <!-- 拖拽图标 -->
          <div v-else
            class="h-full aspect-square flex items-center justify-center text-gray-400 transition-colors duration-200"
            :class="{
              'text-indigo-500': isDragOver && !searchHeaderState.currentPluginItem,
              'text-gray-300': searchHeaderState.currentPluginItem
            }">
            <IconMdiFileUpload v-if="isDragOver && !searchHeaderState.currentPluginItem" class="w-5 h-5" />
            <IconMdiMagnify v-else class="w-5 h-5" />
          </div>

          <!-- 搜索输入框组件 -->
          <SearchInput ref="searchInputRef" :model-value="searchText"
            :has-files="searchHeaderState.attachedFiles.length > 0 || searchHeaderState.currentPluginItem !== null"
            :should-show-search-box="searchHeaderState.shouldShowSearchBox"
            @update:model-value="(value: string) => searchText = value" @enter="handleSearch"
            @input="debouncedHandleSearch" @paste="handleFilePaste" @clear-files="handleClearFilesOrPlugin"
            :placeholder="searchHeaderComputed.placeholderText.value"
            :style="searchHeaderComputed.noDragStyles.value" />

          <!-- 设置按钮 -->
          <div class="h-full aspect-square" :style="searchHeaderComputed.noDragStyles.value">
            <button
              class="w-full h-full p-3 text-gray-500 transition-colors duration-200 rounded-lg flex items-center justify-center"
              title="打开设置" @click="openSettings">
              <IconMdiCog class="w-5 h-5 hover:text-gray-700" />
            </button>
          </div>
        </div>
      </DraggableArea>

      <!-- 内容呈现区域 - 动态区域 -->
      <ContentArea ref="contentAreaRef" :content-area-visible="contentAreaVisible" :search-categories="searchCategories"
        :selected-index="selectedIndex" :flat-items="flatItems" :show-plugin-window="isWindowInterface"
        :show-settings-background="isSettingsInterface" @app-click="executeItem" @category-toggle="handleCategoryToggle"
        @category-drag-end="handleCategoryDragEnd" @app-delete="handleAppDelete" @app-pin="handleAppPin"
        @window-resize="handleWindowResize" />
    </div>
  </div>
</template>

<script setup lang="ts">
// ==================== 导入依赖 ====================
import { ref, reactive, onMounted, nextTick, watch, computed } from "vue";
import { useDebounceFn, watchDebounced } from "@vueuse/core";

// 组件导入
import ContentArea from "@/components/ContentArea.vue";
import SearchInput from "@/modules/search/components/SearchInput.vue";
import IconDisplay from "@/components/IconDisplay.vue";
import DraggableArea from "@/components/DraggableArea.vue";

// 新窗口管理相关导入
import { useSearchHeader } from "@/core/window/useSearchHeader";
import type { SearchHeaderConfig } from "@/core/window/SearchHeaderManager";

// 图标导入
// @ts-ignore 
import IconMdiPuzzle from "~icons/mdi/puzzle";
// @ts-ignore
import IconMdiFile from "~icons/mdi/file";
// @ts-ignore
import IconMdiFileUpload from "~icons/mdi/file-upload";
// @ts-ignore
import IconMdiMagnify from "~icons/mdi/magnify";
// @ts-ignore
import IconMdiCog from "~icons/mdi/cog";

// Composables 导入
import { useDragDrop } from "@/composables/useDragDrop";
import { useFileHandler } from "@/composables/useFileHandler";
import { useUIStatus } from "@/composables/useUIStatus";
// import { InterfaceType as UIInterfaceType } from "@/typings/composableTypes";
import { useWindowManager } from "@/composables/useWindowManager";
import { useEventSystem } from "@/composables/useEventSystem";
import { useAppLifecycle } from "@/composables/useAppLifecycle";
import { usePluginWindowManager } from "@/composables/usePluginWindowManager";
import { useSettingsManager } from "@/composables/useSettingsManager";
import { useAppEventHandlers } from "@/composables/useAppEventHandlers";

// 模块导入
import { useKeyboardNavigation } from "@/modules/search";
import { useSearch } from "@/modules/search";
import { usePluginStore } from "@/store";

// 类型导入
import type { AppItem } from "@shared/typings";
// ==================== 核心管理器初始化 ====================
/**
 * 搜索头部管理器配置
 */
const searchHeaderConfig = reactive<Partial<SearchHeaderConfig>>({
  defaultHeight: 50,
  enableFileDrop: true,
  enableNativeDrag: false,
  searchDelay: 300,
  maxAttachedFiles: 10
});

// 初始化所有管理器
const {
  state: searchHeaderState,
  computed: searchHeaderComputed,
  actions: searchHeaderActions,
  events: searchHeaderEvents
} = useSearchHeader({ config: searchHeaderConfig });

const pluginStore = usePluginStore();
const { uiConstants, initializeApp } = useAppLifecycle();
const pluginWindowManager = usePluginWindowManager();
const settingsManager = useSettingsManager();
const eventHandlers = useAppEventHandlers();


// ==================== 基础状态和管理器 ====================
// 窗口管理器
const { setSize, isWindowVisible, show: handleWindowShow, hide } = useWindowManager();
const show = () => {
  handleWindowShow();
  contentAreaRef.value?.handleResize();
};

// UI状态管理器
const {
  searchText: uiSearchText,
  isSettingsInterface,
  isWindowInterface,
  isPluginWindowOpen,
  contentAreaVisible,
  currentPluginItem,
  openPluginWindow: openPluginWindowUI,
  closePluginWindow: closePluginWindowUI,
  updateSearchResults,
  toggleInput,
  resetToDefault,
  switchToSearch,
  switchToSettings,
} = useUIStatus();

// 组件引用
const searchInputRef = ref<InstanceType<typeof SearchInput>>();
const contentAreaRef = ref<InstanceType<typeof ContentArea>>();

// 文件处理器
const { attachedFiles, addFiles, clearAttachedFiles } = useFileHandler();

// 搜索模块
const {
  selectedIndex,
  initAppApps,
  searchText: searchModuleText,
  searchCategories,
  flatItems,
  handleSearch: handleSearchCore,
  executeItem,
  updateStoreCategory,
  handleCategoryToggle,
  handleCategoryDragEnd,
  handleAppDelete,
  handleAppPin,
} = useSearch(attachedFiles);

// 拖拽处理器
const {
  isDragOver,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDrop: originalHandleDrop,
} = useDragDrop(addFiles);

// 事件系统
const eventSystem = useEventSystem();

// ==================== 核心业务函数 ====================
// 计算属性：双向绑定搜索文本
const searchText = computed({
  get: () => uiSearchText.value,
  set: (value: string) => {
    uiSearchText.value = value;
    searchModuleText.value = value;
  }
});

// 计算属性：UI常量
const headerHeight = computed(() => searchHeaderState?.headerHeight ?? searchHeaderConfig.defaultHeight ?? 50);
const padding = computed(() => uiConstants.value.padding);

// 搜索处理函数
const handleSearch = (value: string) => {
  if (isPluginWindowOpen.value) {
    // TODO 执行插件的搜索逻辑
  }
  return handleSearchCore(value);
};

// 防抖搜索
const debouncedHandleSearch = useDebounceFn(
  () => handleSearch(searchText.value),
  100
);

// ESC键处理函数 - 使用事件处理器中的逻辑
const handleEscAction =
  async () => {
    console.log("收到ESC键处理函数", isPluginWindowOpen.value)
    await windowStateHandlers.handleCloseWindowRequested();
  }

// 键盘导航
const { handleKeyNavigation } = useKeyboardNavigation(
  flatItems,
  searchCategories,
  selectedIndex,
  (app: AppItem) => {
    executeItem(app);
    handleSearch("");
  },
  handleSearch,
  handleEscAction
);

// ==================== 窗口和状态管理 ====================
// 初始化窗口大小
const initializeWindowSize = () => {
  setSize({ height: headerHeight.value + padding.value });
};

// 处理窗口大小调整
const handleWindowResize = async (height: number) => {
  try {
    await naimo.router.windowAdjustHeight(height);
  } catch (error) {
    console.error('调整窗口高度失败:', error);
    naimo.router.windowSetSize(-1, height);
  }
};

// 重置到默认状态
const handleResetToDefault = () => {
  if (isPluginWindowOpen.value) closePluginWindow();
  resetToDefault();
};

// ==================== 用户交互处理 ====================
// 聚焦搜索框
const handleSearchFocus = () => {
  nextTick(() => {
    if (searchHeaderState.shouldShowSearchBox && searchInputRef.value) {
      searchInputRef.value.focus();
    }
  });
};

// 调试状态函数
const displayedPluginItem = computed(() => searchHeaderState.currentPluginItem ?? currentPluginItem.value ?? null);

// 处理容器点击
const handleContainerClick = eventHandlers.handleContainerClick;

// ==================== 文件和插件处理 ====================
// 处理文件粘贴事件
const handleFilePaste = async (event: ClipboardEvent) => {
  searchHeaderActions.handlePaste(event);

  const items = event.clipboardData?.items;
  if (!items) return;

  const files: File[] = [];
  let hasTextContent = false;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) files.push(file);
    } else if (item.kind === "string" && item.type === "text/plain") {
      hasTextContent = true;
      item.getAsString((text: string) => {
        const trimmedText = text.trim();
        if (trimmedText.length > 30) {
          const fileName = trimmedText.slice(0, 10) + ".txt";
          const blob = new Blob([trimmedText], { type: 'text/plain;charset=utf-8' });
          const file = new File([blob], fileName, { type: 'text/plain' });
          addFiles([file]);
        }
      });
    }
  }

  if (files.length > 0) {
    event.preventDefault();
    await addFiles(files);
  } else if (hasTextContent) {
    event.preventDefault();
  }
};

// 清除文件或插件
const handleClearFilesOrPlugin = async () => {
  if (searchHeaderState.currentPluginItem) {
    currentPluginItem.value = null;
    searchHeaderActions.clearCurrentPlugin();
    await closePluginWindow();
  } else if (attachedFiles.value.length > 0) {
    searchHeaderActions.clearAttachedFiles();
    clearAttachedFiles();
  }
};

// ==================== 插件和设置管理 ====================

const closePluginWindow = async () => {
  await pluginWindowManager.closePluginWindow({
    closePluginWindowUI: () => {
      closePluginWindowUI();
      // 清除搜索头部管理器中的插件状态
      searchHeaderActions.clearCurrentPlugin();
    },
    handleSearchFocus
  });
};

// 设置页面管理
const openSettings = async () => {
  await settingsManager.openSettings({
    switchToSettings: () => {
      switchToSettings();
      // 同步设置状态到搜索头部管理器
      searchHeaderActions.setSettingsInterface(true);
      searchHeaderActions.clearCurrentPlugin();
    },
    handleResize: () => contentAreaRef.value?.handleResize()
  });
};

const closeSettings = async () => {
  await settingsManager.closeSettings({
    switchToSearch: () => {
      switchToSearch();
      // 清除设置状态
      searchHeaderActions.setSettingsInterface(false);
    },
    handleSearchFocus
  });
};


// ==================== 事件处理器创建 ====================
// 创建事件处理器
const windowFocusHandlers = eventHandlers.createWindowFocusHandlers({
  handleSearchFocus,
  isWindowVisible,
  show,
  hide
});

const searchHandlers = eventHandlers.createSearchHandlers({
  searchText: searchText,
  setSearchText: (text: string) => { searchText.value = text; },
  handleSearch,
  executeItem,
  searchCategories: searchCategories,
  attachedFiles: attachedFiles,
  setAttachedFiles: (files) => { attachedFiles.value = [...files]; },
  currentPluginItem: currentPluginItem,
  setCurrentPluginItem: (item) => { currentPluginItem.value = item; },
  show,
  handleSearchFocus
});

const windowStateHandlers = eventHandlers.createWindowStateHandlers({
  isPluginWindowOpen: isPluginWindowOpen,
  isSettingsInterface: isSettingsInterface,
  searchText: searchText,
  setSearchText: (text: string) => { searchText.value = text; },
  handleSearch,
  attachedFiles: attachedFiles,
  setAttachedFiles: (files) => { attachedFiles.value = [...files]; },
  currentPluginItem: currentPluginItem,
  setCurrentPluginItem: (item) => { currentPluginItem.value = item; },
  closePluginWindow,
  closeSettings,
  isWindowVisible,
  hide,
  show
});

const searchStateHandler = eventHandlers.createSearchStateHandler({
  searchHeaderActions,
  setCurrentPluginItem: (item) => { currentPluginItem.value = item; },
  switchToSearch,
  searchText: searchText,
  handleSearch,
  handleResize: () => contentAreaRef.value?.handleResize(),
  handleSearchFocus,
  hide
});

// 创建快捷键处理器
const hotkeyHandler = eventHandlers.createHotkeyHandler({
  handleFocusSearchRequested: searchHandlers.handleFocusSearchRequested,
  handleCloseWindowRequested: windowStateHandlers.handleCloseWindowRequested,
  handleShowHideWindowRequested: windowStateHandlers.handleShowHideWindowRequested,
  handleCustomGlobalHotkeyTriggered: searchHandlers.handleCustomGlobalHotkeyTriggered
});

// ==================== 监听器 ====================
// 监听搜索结果变化
watchDebounced(
  () => searchCategories.value.length,
  () => {
    const hasResults = searchCategories.value.some(
      (category: any) => category.items.length > 0
    );
    updateSearchResults(hasResults);
  },
  { debounce: 100 }
);

// 监听附件文件变化
watch(
  () => attachedFiles.value,
  (newFiles, oldFiles) => {
    searchHeaderActions.addAttachedFiles(newFiles);

    if (
      newFiles.length !== oldFiles?.length ||
      (newFiles.length > 0 &&
        oldFiles?.length > 0 &&
        newFiles.some((file, index) => file.path !== oldFiles[index]?.path))
    ) {
      console.log("📎 附件文件发生变化，自动执行搜索");
      switchToSearch();
      handleSearch(searchText.value);
    }
  },
  { deep: true }
);

// 监听搜索文本变化
watch(
  () => searchText.value,
  (newSearchText, oldSearchText) => {
    if (newSearchText === oldSearchText) return;
    searchModuleText.value = newSearchText;
    if (searchHeaderState.searchText !== newSearchText) {
      searchHeaderActions.updateSearchText(newSearchText);
    }
    debouncedHandleSearch();
  }
);

// 监听插件状态变化 - 确保UI状态和搜索头部状态同步
watch(
  () => currentPluginItem.value,
  (newPluginItem) => {
    // 同步到搜索头部管理器
    if (searchHeaderState.currentPluginItem !== newPluginItem) {
      searchHeaderActions.setCurrentPluginItem(newPluginItem);
    }
  },
  { immediate: true }
);

// 监听搜索头部插件状态变化，同步到UI状态
watch(
  () => searchHeaderState.currentPluginItem,
  (newPluginItem) => {
    if (currentPluginItem.value !== newPluginItem) {
      currentPluginItem.value = newPluginItem;
    }
  },
  { immediate: true }
);

// ==================== 插件事件处理 ====================
const handlePluginExecuted = async (event: { pluginId: string, path: string, hotkeyEmit: boolean }) => {
  await pluginWindowManager.handlePluginExecuted(event, {
    openPluginWindowUI,
    toggleInput,
    attachedFiles: attachedFiles.value,
    searchText: searchText.value,
    updateStoreCategory,
    handleSearch,
    pluginStore: {
      installZip: async (zipPath: string) => { await pluginStore.install(zipPath); },
      install: async (path: string) => { await pluginStore.install(path); },
      uninstall: async (id: string) => { await pluginStore.uninstall(id); },
      toggle: async (id: string) => { await pluginStore.toggle(id); },
    },
    setAttachedFiles: (files) => { attachedFiles.value = [...files]; },
    setSearchText: (text) => { searchText.value = text; }
  });
};

const handlePluginWindowClosed = async (event: { windowId: number, title: string, path?: string }) => {
  await pluginWindowManager.handlePluginWindowClosed(event, {
    isPluginWindowOpen: isPluginWindowOpen.value,
    closePluginWindow,
    recoverSearchState: searchStateHandler.recoverSearchState
  });
};


// ==================== 生命周期 ====================
onMounted(async () => {
  console.log("🚀 App.vue onMounted - 开始应用初始化");

  // 使用生命周期管理器初始化应用
  await initializeApp({
    // 窗口事件处理器
    onWindowFocus: windowFocusHandlers.onWindowFocus,
    onWindowBlur: windowFocusHandlers.onWindowBlur,
    onVisibilityChange: windowFocusHandlers.onVisibilityChange,

    // 主进程事件处理器
    onPluginWindowClosed: handlePluginWindowClosed,
    onWindowMainHide: () => hide(),
    onWindowMainShow: () => show(),
    onViewDetached: () => searchStateHandler.recoverSearchState(true),
    onViewRestoreRequested: (data) => {
      const { reason } = data;
      if (reason === 'settings-closed') {
        searchStateHandler.recoverSearchState();
      } else if (reason === 'plugin-closed') {
        searchStateHandler.recoverSearchState(true);
      }
    },

    // 快捷键事件处理器
    onHotkeyTriggered: hotkeyHandler,

    // 初始化完成回调
    onInitComplete: () => {
      // 初始化应用数据
      initAppApps();
      // 初始化窗口大小
      initializeWindowSize();
      // 重置到默认状态
      handleResetToDefault();
      // 聚焦搜索框
      handleSearchFocus();
    }
  });

  // 注册插件和搜索头部事件
  eventSystem.on('plugin:executed', handlePluginExecuted);

  searchHeaderEvents.on("click", handleSearchFocus);
  searchHeaderEvents.on('search', handleSearch);
  searchHeaderEvents.on('input', debouncedHandleSearch);
  searchHeaderEvents.on('search-text-updated', (text: string) => {
    if (searchText.value !== text) {
      searchText.value = text;
    }
  });
  searchHeaderEvents.on('open-settings', openSettings);

  console.log("🎉 App.vue onMounted - 应用初始化完成");
});

</script>

<style scoped></style>
