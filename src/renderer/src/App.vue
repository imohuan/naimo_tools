<template>
  <div class="w-full h-full p-2 bg-transparent" @keydown="handleKeyNavigation" @click="handleContainerClick">
    <Test />
    <!-- 主应用容器 - 透明背景，恢复阴影和圆角效果 -->
    <div class="w-full bg-transparent relative overflow-hidden h-full rounded-xl shadow-2xl"
      style="box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1);">

      <!-- 搜索头部区域 - 固定区域，支持自定义窗口拖拽 -->
      <DraggableArea class="w-full flex items-center justify-center"
        :style="{ height: searchHeaderState.headerHeight + 'px' }" @click="searchHeaderActions.handleClick"
        @dragover="searchHeaderActions.handleDragOver" @dragenter="searchHeaderActions.handleDragEnter"
        @dragleave="searchHeaderActions.handleDragLeave" @drop="searchHeaderActions.handleDrop">

        <div class="w-full h-full relative flex items-center bg-white rounded-t-xl transition-all duration-200"
          :class="{ 'bg-indigo-50': searchHeaderState.isDragOver }">

          <!-- 插件信息显示区域 -->
          <div v-if="searchHeaderComputed.shouldShowPluginInfo.value" class="h-full flex items-center p-2">
            <!-- 插件图标容器 -->
            <div class="h-full p-2 flex items-center space-x-1 border border-indigo-200 bg-indigo-50 rounded-md">
              <div class="p-1 flex items-center justify-center">
                <IconDisplay :src="searchHeaderState.currentPluginItem?.icon"
                  :alt="searchHeaderState.currentPluginItem?.name" icon-class="w-4 h-4 object-cover"
                  fallback-class="w-5 h-5 flex items-center justify-center">
                  <template #fallback>
                    <IconMdiPuzzle class="w-4 h-4 text-indigo-500" />
                  </template>
                </IconDisplay>
              </div>

              <!-- 插件名称和类型 -->
              <div class="flex items-center justify-center gap-2">
                <span class="text-sm font-medium text-indigo-700 truncate max-w-24"
                  :title="searchHeaderState.currentPluginItem?.name">
                  {{ searchHeaderState.currentPluginItem?.name }}
                </span>
                <span class="font-mono bg-indigo-400 rounded-md text-white px-2 text-xs">
                  插件
                </span>
              </div>
            </div>
          </div>

          <!-- 文件信息显示区域 -->
          <div v-else-if="searchHeaderComputed.shouldShowFileInfo.value" class="h-full flex items-center p-2">
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
              'text-indigo-500': searchHeaderState.isDragOver && !searchHeaderState.currentPluginItem,
              'text-gray-300': searchHeaderState.currentPluginItem
            }">
            <IconMdiFileUpload v-if="searchHeaderState.isDragOver && !searchHeaderState.currentPluginItem"
              class="w-5 h-5" />
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
        :selected-index="selectedIndex" :flat-items="flatItems"
        :show-plugin-window="isPluginWindowOpen && searchText.trim() === ''"
        :show-settings-background="isSettingsInterface" @app-click="customExecuteItem"
        @category-toggle="handleCategoryToggle" @category-drag-end="handleCategoryDragEnd" @app-delete="handleAppDelete"
        @app-pin="handleAppPin" @window-resize="handleWindowResize" />
    </div>
  </div>
</template>

<script setup lang="ts">
// ==================== 导入依赖 ====================
import { ref, onMounted, nextTick, watch, computed, toRaw } from "vue";
import { useDebounceFn, watchDebounced, useEventListener } from "@vueuse/core";

// 组件导入
import ContentArea from "@/components/ContentArea.vue";
import SearchInput from "@/modules/search/components/SearchInput.vue";
import IconDisplay from "@/components/IconDisplay.vue";
import DraggableArea from "@/components/DraggableArea.vue";

// 新窗口管理相关导入
import { useSearchHeader } from "@/core/window/useSearchHeader";
import type { SearchHeaderConfig } from "@/core/window/SearchHeaderManager";

// 图标导入
import IconMdiPuzzle from "~icons/mdi/puzzle";
import IconMdiFile from "~icons/mdi/file";
import IconMdiFileUpload from "~icons/mdi/file-upload";
import IconMdiMagnify from "~icons/mdi/magnify";
import IconMdiCog from "~icons/mdi/cog";

// Composables 导入
import { useDragDrop } from "@/composables/useDragDrop";
import { useFileHandler } from "@/composables/useFileHandler";
import { useUIStatus, InterfaceType as UIInterfaceType } from "@/composables/useUIStatus";
import { useWindowManager } from "@/composables/useWindowManager";
import { useEventSystem } from "@/composables/useEventSystem";

// 模块导入
import { useHotkeyManager } from "@/modules/hotkeys/hooks/useHotkeyManager";
import type { HotkeyEventListener, HotkeyTriggeredEventDetail } from "@/typings/hotkey-types";
import { useKeyboardNavigation } from "@/modules/search";
import { useSearch } from "@/modules/search";
import { usePluginStore } from "@/store";

// 类型导入
import type { AppItem } from "@shared/types";
import type { PluginItem } from "./typings/plugin-types";
import { pluginManager } from "./core/plugin/PluginManager";

import { ElectronStoreBridge } from "./core/store/ElectronStoreBridge"
import { DEFAULT_WINDOW_LAYOUT } from "@shared/config/window-layout.config"


//测试打包
import type { PluginApi } from "@shared/typings/global";
import Test from "./Test.vue";


const storeBridge = ElectronStoreBridge.getInstance();
// ==================== 新窗口管理系统初始化 ====================
/**
 * 搜索头部管理器 - 使用新的窗口管理系统
 */
const searchHeaderConfig: Partial<SearchHeaderConfig> = {
  defaultHeight: 50,
  enableFileDrop: true,
  enableNativeDrag: false, // 禁用原生拖拽，使用自定义拖拽
  searchDelay: 300,
  maxAttachedFiles: 10
};

const {
  state: searchHeaderState,
  computed: searchHeaderComputed,
  actions: searchHeaderActions,
  events: searchHeaderEvents
} = useSearchHeader({ config: searchHeaderConfig });

// ==================== UI 配置管理 ====================
/**
 * UI常量配置 - 从应用配置中获取
 * 包含窗口高度、最大高度、内边距等UI相关常量
 */
const uiConstants = ref({
  headerHeight: DEFAULT_WINDOW_LAYOUT.searchHeaderHeight,
  padding: DEFAULT_WINDOW_LAYOUT.appPadding
});

/**
 * 从主进程获取UI常量配置
 * 如果获取失败则使用默认值
 */
const loadUIConstants = async () => {
  try {
    const config = await naimo.router.windowGetUIConstants();
    if (config) {
      uiConstants.value = config;
      // 同步到搜索头部管理器
      searchHeaderActions.updateSearchText('');
      // 更新头部高度
      if (config.headerHeight) {
        searchHeaderState.headerHeight = config.headerHeight;
      }
    }
  } catch (error) {
    console.warn('获取UI常量配置失败，使用默认值:', error);
  }
};

// 创建响应式的UI常量引用
const headerHeight = computed(() => searchHeaderState.headerHeight);
const padding = computed(() => uiConstants.value.padding);

// ==================== 插件状态管理 ====================
const pluginStore = usePluginStore();


// ==================== 界面状态管理 ====================
/**
 * 窗口管理器 - 负责窗口大小设置和显示隐藏
 */
const { setSize, isWindowVisible, show: handleWindowShow, hide } = useWindowManager();
const show = () => {
  handleWindowShow()
  contentAreaRef.value?.handleResize()
}

/**
 * UI状态管理器 - 管理应用的各种界面状态
 * 包括搜索文本、设置界面、插件窗口、内容区域可见性等
 */
const {
  searchText: uiSearchText,
  isSettingsInterface,
  isPluginWindowOpen,
  contentAreaVisible,
  currentPluginItem,
  openPluginWindow,
  closePluginWindow,
  updateSearchResults,
  currentInterface: uiCurrentInterface,
  toggleInput,
  resetToDefault,
  switchToSearch,
  switchToSettings,
} = useUIStatus();

// ==================== 组件引用 ====================
/**
 * 搜索输入框组件引用
 */
const searchInputRef = ref<InstanceType<typeof SearchInput>>();

/**
 * 内容区域组件引用
 */
const contentAreaRef = ref<InstanceType<typeof ContentArea>>();

// ==================== 文件处理 ====================
/**
 * 文件处理器 - 管理附件文件的添加、清除等功能
 */
const { attachedFiles, addFiles, clearAttachedFiles } = useFileHandler();

// ==================== 搜索模块 ====================
/**
 * 搜索模块 - 管理应用搜索、分类、执行等功能
 */
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

/**
 * 同步搜索文本到界面管理器
 * 双向绑定UI状态和搜索模块的搜索文本
 */
const searchText = computed({
  get: () => uiSearchText.value,
  set: (value: string) => {
    uiSearchText.value = value;
    searchModuleText.value = value;
  }
});

// ==================== 拖拽管理 ====================
/**
 * 拖拽处理器 - 管理文件拖拽、应用拖拽等功能
 * 现在通过搜索头部管理器处理
 */
const {
  handleDrop: originalHandleDrop,
} = useDragDrop();

// ==================== 全局快捷键初始化 ====================
/**
 * 快捷键管理器 - 管理全局快捷键的注册和初始化
 */
const { initializeHotkeys, addHotKeyListener } = useHotkeyManager();
// ==================== 事件系统 ====================
/**
 * 事件系统 - 管理应用内部事件通信
 */
const eventSystem = useEventSystem();

// ==================== 核心业务函数 ====================
/**
 * 包装搜索函数，自动传递附件文件，之后可能会附带插件数据
 * @param value 搜索文本
 * @returns 搜索结果
 */
const handleSearch = (value: string) => {
  if (isPluginWindowOpen.value) {
    // TODO 执行插件的搜索逻辑
  }
  return handleSearchCore(value);
};

/**
 * 防抖搜索处理函数
 * 延迟100ms执行搜索，避免频繁搜索
 */
const debouncedHandleSearch = useDebounceFn(
  () => handleSearch(searchText.value),
  100
);

/**
 * 自定义执行应用项目
 * 执行应用后清空搜索框
 * @param app 要执行的应用项目
 */
const customExecuteItem = (app: AppItem) => {
  executeItem(app);
  handleSearch("");
};

/**
 * 键盘导航处理器 - 管理键盘快捷键导航功能
 */
const { handleKeyNavigation } = useKeyboardNavigation(
  flatItems,
  searchCategories,
  selectedIndex,
  customExecuteItem,
  handleSearch
);

// ==================== 窗口管理函数 ====================
/**
 * 初始化窗口大小
 * 设置最小窗口高度为头部高度加上内边距
 */
const initializeWindowSize = () => {
  // 初始化时设置最小窗口高度
  setSize({ height: headerHeight.value + padding.value });
  // TODO: 之后修改，需要同时初始化内容弹出框，以免冲突
};

/**
 * 处理窗口大小调整
 * 使用新的动态高度调整方法
 * @param height 新的窗口高度
 */
const handleWindowResize = async (height: number) => {
  try {
    // 使用新的动态高度调整方法，传递前端计算的高度
    await naimo.router.windowAdjustHeight(height);
  } catch (error) {
    console.error('调整窗口高度失败:', error);
    // 回退到传统方法
    naimo.router.windowSetSize(-1, height);
  }
};

/**
 * 关闭插件窗口
 * @param _action 关闭动作类型：'hide' 隐藏 | 'close' 关闭（在新架构中不再使用）
 */
const handleClosePluginWindow = (_action?: 'hide' | 'close') => {
  closePluginWindow()
  // 在新架构中，插件窗口的生命周期由BaseWindow统一管理，不需要单独处理
};

/**
 * 恢复搜索栏为默认搜索状态
 * @param clearPlugin 是否需要额外清空当前插件状态
 */
const recoverSearchState = (clearPlugin = false) => {
  console.log("恢复搜索状态", { clearPlugin, searchText: searchText.value });

  if (clearPlugin) {
    searchHeaderActions.clearCurrentPlugin();
    currentPluginItem.value = null;
  }

  switchToSearch();
  searchHeaderActions.setSearchBoxVisibility(true);

  const currentText = searchText.value ?? "";
  searchHeaderActions.updateSearchText(currentText);
  handleSearch(currentText);

  nextTick(() => {
    contentAreaRef.value?.handleResize();
    handleSearchFocus();
  });
};

/**
 * 重置到默认状态
 * 如果有插件窗口打开，先关闭它们，然后重置界面状态
 */
const handleResetToDefault = () => {
  // 如果有插件窗口打开，先关闭它们
  if (isPluginWindowOpen.value) handleClosePluginWindow("close")
  resetToDefault()
};

// ==================== 用户交互处理 ====================
/**
 * 聚焦搜索框
 * 通过搜索输入框引用直接聚焦
 */
const handleSearchFocus = () => {
  nextTick(() => {
    if (searchHeaderState.shouldShowSearchBox && searchInputRef.value) {
      searchInputRef.value.focus();
    }
  });
}


/**
 * 处理容器点击事件
 * 检查点击目标，如果是交互元素则不处理，否则聚焦搜索框
 * @param event 鼠标点击事件
 * @returns false 阻止默认行为
 */
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
  // handleSearchFocus();
  return false
};

// ==================== 新搜索头部事件集成 ====================
/**
 * 集成新搜索头部管理器的事件处理
 */

/**
 * 处理文件粘贴事件
 * 通过搜索头部管理器处理粘贴事件
 * @param event 粘贴事件
 */
const handleFilePaste = async (event: ClipboardEvent) => {
  // 先调用搜索头部管理器的粘贴处理
  searchHeaderActions.handlePaste(event);

  // 提取文件并添加到附件列表
  const items = event.clipboardData?.items;
  if (!items) return;

  const files: File[] = [];
  let hasTextContent = false;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    } else if (item.kind === "string" && item.type === "text/plain") {
      // 处理文字内容
      hasTextContent = true;
      item.getAsString((text: string) => {
        const trimmedText = text.trim();
        if (trimmedText.length > 30) {
          // 创建文本文件
          const fileName = trimmedText.slice(0, 10) + ".txt";
          const blob = new Blob([trimmedText], { type: 'text/plain;charset=utf-8' });
          const file = new File([blob], fileName, { type: 'text/plain' });
          // 添加到文件列表
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

/**
 * 清除文件或插件信息
 * 通过搜索头部管理器处理清除操作
 */
const handleClearFilesOrPlugin = async () => {
  if (searchHeaderState.currentPluginItem) {
    // 清除插件
    searchHeaderActions.clearCurrentPlugin();
    await handleClosePluginWindow();
  } else {
    // 清除文件
    searchHeaderActions.clearAttachedFiles();
    clearAttachedFiles();
  }
};


// ==================== 设置页面管理 ====================
/**
 * 打开设置页面
 * 创建设置页面的 WebContentsView
 */
const openSettings = async () => {
  try {
    // 切换到设置界面状态
    switchToSettings();

    // 确保窗口高度调整到最大高度
    contentAreaRef.value?.handleResize();
    await nextTick();

    // 调用 IPC 方法创建设置页面 WebContentsView
    const result = await naimo.router.windowCreateSettingsView();
    if (result.success) {
      console.log('设置页面 WebContentsView 创建成功:', result.viewId);
    } else {
      console.error('设置页面 WebContentsView 创建失败:', result.error);
    }
  } catch (error) {
    console.error('打开设置页面失败:', error);
  }
};

/**
 * 关闭设置页面
 * 关闭设置后根据搜索内容决定显示内容，并聚焦搜索框
 */
const closeSettings = async () => {
  try {
    // 调用 IPC 方法关闭设置页面 WebContentsView
    const result = await naimo.router.windowCloseSettingsView();
    if (result.success) {
      console.log('设置页面 WebContentsView 关闭成功');
    } else {
      console.error('设置页面 WebContentsView 关闭失败:', result.error);
    }
  } catch (error) {
    console.error('关闭设置页面失败:', error);
  }

  // 切换回搜索界面状态
  switchToSearch();

  // 聚焦到搜索输入框
  handleSearchFocus();
};


// ==================== 窗口焦点管理 ====================
/**
 * 处理窗口获得焦点事件
 * 窗口获得焦点时聚焦搜索框
 */
const handleWindowFocus = () => {
  handleSearchFocus();
  show()
};

/**
 * 处理窗口失去焦点事件
 * 窗口失去焦点时延迟隐藏窗口（当前已注释）
 */
const handleWindowBlur = () => {
  // 窗口失去焦点时，延迟一点时间后隐藏窗口
  setTimeout(() => {
    hide()
    // console.log("窗口失去焦点", document.hasFocus(), isSettingsInterface.value);
    // // 检查窗口是否仍然失去焦点且不在设置页面
    // if (!document.hasFocus() && !isSettingsInterface.value) {
    //   // 调用主进程隐藏窗口
    //   hide()
    // }
  }, 100);
};

/**
 * 处理页面可见性变化
 * 页面重新变为可见且获得焦点时，聚焦到搜索框
 */
const handleVisibilityChange = () => {
  if (!document.hidden && document.hasFocus()) {
    // 页面重新变为可见且获得焦点时，聚焦到搜索框（如果可见）
    handleSearchFocus();
    console.log("页面重新变为可见且获得焦点时，聚焦到搜索框");
  }
};

/**
 * 处理快捷键请求聚焦搜索框
 * 响应全局快捷键的聚焦搜索框请求
 */
const handleFocusSearchRequested = () => {
  console.log("收到聚焦搜索框请求");
  // SearchHeader组件的focus方法内部会检查搜索框是否可见
  handleSearchFocus();
};

// ==================== 监听器 ====================
/**
 * 监听搜索结果变化，更新界面状态
 * 防抖100ms，避免频繁更新
 */
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

/**
 * 监听附件文件变化，自动执行搜索
 * 深度监听文件列表变化，当文件真正发生变化时重新搜索
 * 同时同步到搜索头部管理器
 */
watch(
  () => attachedFiles.value,
  (newFiles, oldFiles) => {
    // 同步到搜索头部管理器
    searchHeaderActions.addAttachedFiles(newFiles);

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
      switchToSearch();
      handleSearch(searchText.value);
    }
  },
  { deep: true }
);

/**
 * 监听搜索文本变化，同步到搜索模块和搜索头部管理器
 * 当搜索文本变化时，同步到搜索模块并执行防抖搜索
 */
watch(
  () => searchText.value,
  (newSearchText, oldSearchText) => {
    // 如果搜索文本没有实际变化，不处理
    if (newSearchText === oldSearchText) return;
    // 同步到搜索模块
    searchModuleText.value = newSearchText;
    // 同步到搜索头部管理器
    if (searchHeaderState.searchText !== newSearchText) {
      searchHeaderActions.updateSearchText(newSearchText);
    }
    // 执行搜索（使用防抖）
    debouncedHandleSearch();
  }
);

/**
 * 监听插件窗口状态变化
 * 当界面类型切换到窗口模式时，显示对应的插件窗口
 * 当从窗口模式切换出去时，管理跟随窗口的显示状态
 * 同步插件状态到搜索头部管理器
 */
watch(
  () => currentPluginItem.value,
  (newPluginItem) => {
    // 同步插件状态到搜索头部管理器
    searchHeaderActions.setCurrentPluginItem(newPluginItem);
  },
  { immediate: true }
);

watch(
  () => uiCurrentInterface.value,
  (newVal, oldVal) => {
    // 打开插件窗口时，切换到窗口界面
    if (newVal === UIInterfaceType.WINDOW && oldVal !== UIInterfaceType.WINDOW && currentPluginItem.value) {
      // 在新架构中，插件窗口的显示由BaseWindow统一管理
      // 插件内容会在下方的WebContentsView中显示
      console.log('切换到插件窗口界面:', currentPluginItem.value?.name)
    } else if (newVal !== UIInterfaceType.WINDOW && oldVal === UIInterfaceType.WINDOW) {
      // 在新架构中，不需要单独管理插件窗口的隐藏
      // 所有内容都在同一个BaseWindow中的WebContentsView里显示
      console.log('从插件窗口界面切换出去')
    }
  }
);

const generateApi = async (pluginItem: PluginItem): Promise<PluginApi> => {
  const pluginApi = await pluginManager.getPluginApi(pluginItem.pluginId as string)

  const addPathToFileList = async (name: string, path: string) => {
    await storeBridge.addListItem("fileList", {
      name: name,
      path: path,
      icon: null,
      lastUsed: Date.now(),
      usageCount: 1,
    }, {
      position: 'start', unique: true, uniqueField: 'path'
    })
  }

  const openWebPageWindow = async (url: string, options: any = {}) => {
    const currentViewInfo = await naimo.router.windowGetCurrentViewInfo()
    if (!currentViewInfo) return;

    await naimo.router.windowCreatePluginView({
      path: options.path || url,
      pluginId: pluginItem.pluginId,
      name: pluginItem.name,
      title: options.title || pluginItem.name,
      url,
      closeAction: options.closeAction || pluginItem.closeAction,
      executeParams: options.executeParams,
      preload: options.preload
    })

    await openPluginWindow(pluginItem)
  }

  return {
    ...pluginApi, toggleInput, openPluginWindow: () => openPluginWindow(pluginItem), addPathToFileList, plugin: {
      installZip: pluginStore.installZip,
      install: pluginStore.install,
      uninstall: pluginStore.uninstall,
      toggle: pluginStore.toggle,
    }, openWebPageWindow
  }
}

// ==================== 事件处理器 ====================
/**
 * 处理插件执行完成事件
 * 当插件执行完成时，检查是否需要打开插件窗口
 * @param event 插件执行事件，包含插件项目信息
 */
const handlePluginExecuted = async (event: { pluginId: string, path: string, hotkeyEmit: boolean }) => {
  const { pluginId, path, hotkeyEmit } = event;
  const pluginItem = pluginManager.getInstalledPluginItem(pluginId, path)!
  const genApi = await generateApi(pluginItem)
  const oldOpenWebPageWindow = genApi.openWebPageWindow
  genApi.openWebPageWindow = (url: string, options: any = {}) => {
    return oldOpenWebPageWindow(url, { path: pluginItem.path, hotkeyEmit, ...options })
  }

  toggleInput(false)
  if (pluginItem.pluginId && pluginItem.onEnter) {
    await pluginItem.onEnter?.({ files: toRaw(attachedFiles.value), searchText: searchText.value }, genApi)
  } else {
    console.log('🔍 收到插件执行完成事件，插件项目信息:', {
      name: pluginItem.name,
      executeParams: pluginItem.executeParams
    });
    // 检查是否为打开新窗口类型的插件
    if (pluginItem.executeType === 3 && pluginItem.executeParams?.url) {
      genApi.openWebPageWindow(pluginItem.executeParams.url, { path: pluginItem.path, })
    }
  }

  await updateStoreCategory()
  attachedFiles.value = []
  searchText.value = ""
  await handleSearch("")
};

/**
 * 处理插件窗口关闭事件
 * 当插件窗口关闭时，更新界面状态
 * @param event 插件窗口关闭事件，包含窗口信息
 */
const handlePluginWindowClosed = async (event: { windowId: number, title: string, path?: string }) => {
  console.log("收到插件窗口关闭事件:", event);

  // 如果当前是插件窗口模式，关闭插件窗口状态
  if (isPluginWindowOpen.value) {
    console.log("关闭插件窗口状态");
    await handleClosePluginWindow();
    recoverSearchState(true);
  }
};


/**
 * 处理关闭窗口请求
 * 根据当前状态决定关闭行为：插件窗口 -> 设置页面 -> 搜索内容 -> 主窗口
 */
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
    handleClosePluginWindow();
    attachedFiles.value = []
    currentPluginItem.value = null
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
    attachedFiles.value = []
    currentPluginItem.value = null
    return
  }

  // 如果当前是搜索页面
  if (searchText.value.trim() !== '') {
    console.log("清空搜索框");
    // 清空搜索框
    searchText.value = '';
    // 执行空搜索，显示默认内容
    handleSearch('');
    return;
  }

  hide()
};

/**
 * 处理显示/隐藏窗口请求
 * 根据主窗口当前可见性状态，切换主窗口和子窗口的显示/隐藏
 */
const handleShowHideWindowRequested = async () => {
  console.log("收到显示/隐藏窗口请求，当前状态:", {
    isPluginWindowOpen: isPluginWindowOpen.value,
    currentPluginItem: currentPluginItem.value?.name,
    pluginId: currentPluginItem.value?.pluginId
  });
  // 使用 IPC 方法检查主窗口当前是否可见
  const isMainWindowVisible = await isWindowVisible();
  if (isMainWindowVisible) {
    hide()
  } else {
    show()
  }
};


const handleCustomGlobalHotkeyTriggered = async (event: HotkeyTriggeredEventDetail) => {
  const name = event.config.name?.trim()
  if (!name) {
    console.log("不存在Name:", event.config);
    return;
  }
  searchText.value = name
  await handleSearch(searchText.value)
  show()

  // 获取搜索结果
  const items = searchCategories.value.find(category => category.id === 'best-match')?.items
  if (items && items.length > 0) {
    executeItem(items[0], true)
  } else {
    console.log("没有搜索结果");
  }
  console.log("搜索结果:", searchCategories.value, { items });
  console.log("收到自定义全局快捷键触发事件:", name);
};


// ==================== 生命周期 ====================
/**
 * 组件挂载时的初始化逻辑
 * 按顺序执行：UI配置加载 -> 快捷键初始化 -> 应用数据初始化 -> 窗口初始化 -> 事件监听器注册
 */
onMounted(async () => {
  console.log("🚀 App.vue onMounted - 开始应用初始化");

  // 1. 加载UI常量配置
  await loadUIConstants();

  // 2. 初始化快捷键（优先执行，确保全局快捷键可用）
  await initializeHotkeys();

  // 3. 初始化插件
  await pluginStore.initialize();

  // 4. 初始化应用数据
  await initAppApps();

  // 5. 初始化窗口大小
  initializeWindowSize();

  // 6. 初始化界面状态
  handleResetToDefault();

  // 7. 注册窗口事件监听器
  useEventListener(window, "focus", handleWindowFocus);
  useEventListener(window, "window-all-blur", handleWindowBlur);
  useEventListener(document, "visibilitychange", handleVisibilityChange);

  // 监听主进程发送的插件窗口关闭消息
  useEventListener(window, "plugin-window-closed", (event: any) => {
    console.log("收到主进程插件窗口关闭消息:", event.detail);
    handlePluginWindowClosed(event.detail);
  });

  useEventListener(window, "window-main-hide", () => {
    hide()
  });

  useEventListener(window, "window-main-show", () => {
    show()
  });

  // 分离视图或分离窗口关闭时，恢复到搜索状态
  useEventListener(window, "view:detached", (event: any) => {
    console.log("收到视图分离事件，恢复搜索状态:", event.detail)
    recoverSearchState()
  })

  // 监听视图恢复请求事件（来自主进程的WebContentsView关闭通知）
  useEventListener(window, "view-restore-requested", (event: any) => {
    console.log("收到视图恢复请求:", event.detail);
    const { reason } = event.detail;

    if (reason === 'settings-closed') {
      // 设置视图关闭，恢复到搜索状态
      console.log("设置视图已关闭，恢复到搜索状态");
      recoverSearchState();
    } else if (reason === 'plugin-closed') {
      // 插件视图关闭，恢复到搜索状态
      console.log("插件视图已关闭，恢复到搜索状态");
      recoverSearchState(true);
    }
  });

  const handleHotkeyTriggered: HotkeyEventListener = (event) => {
    switch (event.detail.id) {
      case 'app_focus_search':
        handleFocusSearchRequested();
        break;
      case 'app_close_window':
        handleCloseWindowRequested();
        break;
      case 'global_show_window':
        handleShowHideWindowRequested();
        break;
      default:
        if (event.detail.id.startsWith('custom_global_')) {
          handleCustomGlobalHotkeyTriggered(event.detail);
          break;
        }
        console.log('🔍 收到全局快捷键触发事件:', event.detail);
        break;
    }
    console.log('🔍 收到全局快捷键触发事件:', event.detail);
  };
  addHotKeyListener('hotkey-triggered', handleHotkeyTriggered);
  addHotKeyListener('app-hotkey-triggered', handleHotkeyTriggered);

  // 插件执行完成 - 进入插件界面
  eventSystem.on('plugin:executed', handlePluginExecuted);

  searchHeaderEvents.on("click", () => {
    handleSearchFocus()
  })

  // 8. 设置搜索头部管理器事件监听
  searchHeaderEvents.on('search', (text: string) => {
    handleSearch(text);
  });

  searchHeaderEvents.on('input', () => {
    debouncedHandleSearch();
  });

  searchHeaderEvents.on('search-text-updated', (text: string) => {
    if (searchText.value !== text) {
      searchText.value = text;
    }
  });

  searchHeaderEvents.on('open-settings', () => {
    openSettings();
  });

  searchHeaderEvents.on('drop', async (event: DragEvent) => {
    // 处理文件拖拽
    await originalHandleDrop(event);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await addFiles(files);
    }
  });

  // 9. 聚焦到搜索框
  handleSearchFocus();

  // 10. 其他初始化完成

  console.log("🎉 App.vue onMounted - 应用初始化完成");
});


// useTestLoadPlugin();

</script>

<style scoped></style>
