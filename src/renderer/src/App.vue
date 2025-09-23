<template>
  <div class="w-full h-full p-[8px]" @keydown="handleKeyNavigation" @click="handleContainerClick">
    <!-- 主应用容器 -->
    <div class="w-full bg-transparent relative shadow-lg rounded-xl  overflow-hidden"
      :class="{ 'rounded-b-none': isPluginWindowOpen && searchText.trim() === '' && !isSettingsInterface }"
      style="box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4)">
      <!-- 搜索框区域 -->
      <SearchHeader ref="searchHeaderRef" v-model:search-text="searchText" :is-drag-over="isDragOver"
        :header-height="headerHeight" :attached-files="attachedFiles" :current-plugin-item="currentPluginItem"
        :should-show-search-box="shouldShowSearchBox" @search="handleSearch" @input="debouncedHandleSearch"
        @click="handleClick" @drag-over="handleDragOver" @drag-enter="handleDragEnter" @drag-leave="handleDragLeave"
        @drop="handleFileDrop" @paste="handleFilePaste" @clear-files="clearAttachedFiles"
        @clear-plugin="clearPluginInfo" @open-settings="openSettings" />

      <!-- 内容呈现区域 -->
      <ContentArea ref="contentAreaRef" :content-area-visible="contentAreaVisible" :search-categories="searchCategories"
        :selected-index="selectedIndex" :flat-items="flatItems" :show-settings="isSettingsInterface"
        :show-plugin-window="isPluginWindowOpen && searchText.trim() === ''" :max-height="maxHeight"
        :header-height="headerHeight" :padding="padding" @app-click="customExecuteItem"
        @category-toggle="handleCategoryToggle" @category-drag-end="handleCategoryDragEnd" @app-delete="handleAppDelete"
        @app-pin="handleAppPin" @close-settings="closeSettings" @window-resize="handleWindowResize" />
    </div>
  </div>
</template>

<script setup lang="ts">
// ==================== 导入依赖 ====================
import { ref, onMounted, nextTick, watch, computed } from "vue";
import { useDebounceFn, watchDebounced, useEventListener } from "@vueuse/core";

// 组件导入
import SearchHeader from "@/modules/search/components/SearchHeader.vue";
import ContentArea from "@/components/ContentArea.vue";

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


//测试打包
import { useTestLoadPlugin } from "./composables/useTestLoadPlugin"


const storeBridge = ElectronStoreBridge.getInstance();
// ==================== UI 配置管理 ====================
/**
 * UI常量配置 - 从应用配置中获取
 * 包含窗口高度、最大高度、内边距等UI相关常量
 */
const uiConstants = ref({ headerHeight: 50, maxHeight: 420, padding: 8 });

/**
 * 从主进程获取UI常量配置
 * 如果获取失败则使用默认值
 */
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

// ==================== 插件状态管理 ====================
const pluginStore = usePluginStore();


// ==================== 界面状态管理 ====================
/**
 * 窗口管理器 - 负责窗口大小设置和跟随窗口管理
 */
const { setSize, manageFollowingWindows, openCurrentItemFollowingWindow, isWindowVisible, show: handleWindowShow, hide } = useWindowManager();
const show = (pluginItem: PluginItem | null) => {
  handleWindowShow(pluginItem)
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
  shouldShowSearchBox,
  switchToSettings,
  openPluginWindow,
  closePluginWindow,
  updateSearchResults,
  currentInterface: uiCurrentInterface,
  closeSettings: uiCloseSettings,
  toggleInput,
  resetToDefault,
  switchToSearch,
} = useUIStatus();

// ==================== 组件引用 ====================
/**
 * 搜索头部组件引用
 */
const searchHeaderRef = ref<InstanceType<typeof SearchHeader>>();

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
 */
const {
  isDragOver,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDrop,
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
const { on } = useEventSystem();

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
 * 通过IPC调用主进程设置窗口大小
 * @param height 新的窗口高度
 */
const handleWindowResize = (height: number) => {
  api.ipcRouter.windowSetSize(-1, height);
};

/**
 * 关闭插件窗口
 * @param action 关闭动作类型：'hide' 隐藏 | 'close' 关闭
 */
const handleClosePluginWindow = (action?: 'hide' | 'close') => {
  closePluginWindow()
  manageFollowingWindows(currentPluginItem.value, action)
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
 * 在下一个tick中调用搜索头部组件的focus方法
 */
const handleSearchFocus = () => {
  // SearchHeader组件的focus方法内部会检查搜索框是否可见
  nextTick(() => {
    searchHeaderRef.value?.focus();
  });
}

/**
 * 处理点击事件
 * 点击时聚焦搜索框
 */
const handleClick = () => {
  handleSearchFocus()
};

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

// ==================== 文件处理事件 ====================
/**
 * 处理文件拖拽事件
 * 先处理拖拽逻辑，然后添加拖拽的文件
 * @param event 拖拽事件
 */
const handleFileDrop = async (event: DragEvent) => {
  // 如果是插件模式，阻止文件拖拽
  if (isPluginWindowOpen.value) {
    console.log("插件模式下不支持文件拖拽");
    event.preventDefault();
    return;
  }

  // 先调用原有的拖拽处理逻辑
  await handleDrop(event);

  // 然后处理文件附加
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    await addFiles(files);
  }
};

/**
 * 处理文件粘贴事件
 * 从剪贴板中提取文件并添加到附件列表
 * @param event 粘贴事件
 */
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

/**
 * 清除插件信息
 * 关闭当前打开的插件窗口
 */
const clearPluginInfo = async () => {
  // 调用界面管理器的关闭插件窗口方法
  await handleClosePluginWindow();
};

// ==================== 设置页面管理 ====================
/**
 * 打开设置页面
 * 切换到设置界面
 */
const openSettings = () => {
  switchToSettings();
};

/**
 * 关闭设置页面
 * 关闭设置后根据搜索内容决定显示内容，并聚焦搜索框
 */
const closeSettings = async () => {
  // 调用界面管理器的关闭设置方法
  uiCloseSettings();

  // 关闭设置后，如果有搜索内容则显示搜索结果，否则显示默认内容
  nextTick(() => {
    if (uiCurrentInterface.value !== UIInterfaceType.SEARCH) return
    handleSearch(searchText.value.trim())
    // 聚焦到搜索输入框（如果可见）
    handleSearchFocus();
  })
};

// ==================== 窗口焦点管理 ====================
/**
 * 处理窗口获得焦点事件
 * 窗口获得焦点时聚焦搜索框
 */
const handleWindowFocus = () => {
  handleSearchFocus();
  show(currentPluginItem.value)
};

/**
 * 处理窗口失去焦点事件
 * 窗口失去焦点时延迟隐藏窗口（当前已注释）
 */
const handleWindowBlur = () => {
  // 窗口失去焦点时，延迟一点时间后隐藏窗口
  setTimeout(() => {
    hide(currentPluginItem.value, "hide")
    // console.log("窗口失去焦点", document.hasFocus(), isSettingsInterface.value);
    // // 检查窗口是否仍然失去焦点且不在设置页面
    // if (!document.hasFocus() && !isSettingsInterface.value) {
    //   // 调用主进程隐藏窗口
    //   hide(currentPluginItem.value, "hide")
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
 */
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
      switchToSearch();
      handleSearch(searchText.value);
    }
  },
  { deep: true }
);

/**
 * 监听搜索文本变化，同步到搜索模块
 * 当搜索文本变化时，同步到搜索模块并执行防抖搜索
 */
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

/**
 * 监听插件窗口状态变化
 * 当界面类型切换到窗口模式时，显示对应的插件窗口
 * 当从窗口模式切换出去时，管理跟随窗口的显示状态
 */
watch(
  () => uiCurrentInterface.value,
  (newVal, oldVal) => {
    // 打开插件窗口时，切换到窗口界面
    if (newVal === UIInterfaceType.WINDOW && oldVal !== UIInterfaceType.WINDOW && currentPluginItem.value) {
      // 如果有当前插件项目，显示特定插件窗口；否则显示所有窗口
      openCurrentItemFollowingWindow(currentPluginItem.value)
    } else if (newVal !== UIInterfaceType.WINDOW && oldVal === UIInterfaceType.WINDOW) {
      // 在插件窗口界面的时候点击设置，隐藏插件窗口而不是关闭，因为从设置页面返回时，需要显示插件窗口
      if (isPluginWindowOpen.value) {
        manageFollowingWindows(currentPluginItem.value, "hide")
      } else {
        manageFollowingWindows(currentPluginItem.value)
      }
    }
  }
);

const generateApi = async (pluginItem: PluginItem) => {
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
    await api.ipcRouter.windowCreateWebPageWindow(window.id!, url, { path: pluginItem.path, ...options })
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
const handlePluginExecuted = async (event: { pluginId: string, path: string }) => {
  const { pluginId, path } = event;
  const pluginItem = pluginManager.getInstalledPluginItem(pluginId, path)!
  toggleInput(false)

  if (pluginItem.pluginId && pluginItem.onEnter) {
    const genApi = await generateApi(pluginItem)
    await pluginItem.onEnter?.({ files: toRaw(attachedFiles.value), searchText: searchText.value }, genApi)
  } else {
    console.log('🔍 收到插件执行完成事件，插件项目信息:', {
      name: pluginItem.name,
      executeParams: pluginItem.executeParams
    });
    // 检查是否为打开新窗口类型的插件
    if (pluginItem.executeType === 3 && pluginItem.executeParams?.url) {
      // 打开插件窗口并传递插件项目信息
      await api.ipcRouter.windowCreateWebPageWindow(window.id!, pluginItem.executeParams.url, { path: pluginItem.path })
      await openPluginWindow(pluginItem);
    }
  }

  await updateStoreCategory()
  attachedFiles.value = []
  searchText.value = ""
  await handleSearch("")
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

  hide(currentPluginItem.value)
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
    hide(currentPluginItem.value, "hide")
  } else {
    show(currentPluginItem.value)
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
  // 获取搜索结果
  const items = searchCategories.value.find(category => category.id === 'best-match')?.items
  if (items && items.length > 0) {
    executeItem(items[0])
  } else {
    show(null)
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
  on('plugin:executed', handlePluginExecuted);

  // 8. 聚焦到搜索框
  handleSearchFocus();
  console.log("🎉 App.vue onMounted - 应用初始化完成");
});


useTestLoadPlugin();

</script>

<style scoped></style>
