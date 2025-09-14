<template>
  <div class="w-full h-full p-[2px]" @keydown="handleKeyNavigation" tabindex="0">
    <!-- 主应用容器 -->
    <div
      class="w-full bg-transparent relative shadow-lg rounded-xl overflow-hidden"
      style="box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5)"
    >
      <!-- 搜索框区域 -->
      <SearchHeader
        ref="searchHeaderRef"
        v-model:search-text="searchText"
        :is-drag-over="isDragOver"
        :header-height="headerHeight"
        @search="handleSearch"
        @input="debouncedHandleSearch"
        @click="handleClick"
        @toggle-content="toggleContentArea"
        @drag-over="handleDragOver"
        @drag-enter="handleDragEnter"
        @drag-leave="handleDragLeave"
        @drop="handleDrop"
        @open-settings="openSettings"
      />

      <!-- 内容呈现区域 -->
      <ContentArea
        ref="contentAreaRef"
        :content-area-visible="contentAreaVisible"
        :content-area-height="contentAreaHeight"
        :search-categories="searchCategories"
        :selected-index="selectedIndex"
        :flat-items="flatItems"
        :show-settings="showSettings"
        @app-click="launchApp"
        @category-toggle="handleCategoryToggle"
        @category-drag-end="handleCategoryDragEnd"
        @app-delete="handleAppDelete"
        @app-pin="handleAppPin"
        @close-settings="closeSettings"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from "vue";
import SearchHeader from "./components/SearchHeader.vue";
import ContentArea from "./components/ContentArea.vue";
import { useWindowSize } from "./composables/useWindowSize";
import { useDragDrop } from "./composables/useDragDrop";
import { useKeyboardNavigation } from "./composables/useKeyboardNavigation";
import { useAppManagement } from "./composables/useAppManagement";
import { useGlobalHotkeyInitializer } from "./composables/useGlobalHotkeyInitializer";

// 本地配置常量
const headerHeight = 50;

// ==================== 设置页面状态 ====================
const showSettings = ref(false);

// ==================== 组件引用 ====================
const searchHeaderRef = ref<InstanceType<typeof SearchHeader>>();
const contentAreaRef = ref<InstanceType<typeof ContentArea>>();

// ==================== 窗口大小管理 ====================
const {
  contentAreaVisible,
  contentAreaHeight,
  updateWindowSize,
  toggleContentArea,
  showContentArea,
  hideContentArea,
  initializeWindowSize,
} = useWindowSize(
  {
    headerHeight: headerHeight,
    headerPadding: 6,
    maxContentHeight: 400,
    defaultContentHeight: 100,
  },
  computed(() => contentAreaRef.value?.contentAreaRef)
);

// ==================== 应用管理 ====================
const {
  selectedIndex,
  initAppApps,
  searchText,
  searchCategories,
  originalCategories,
  flatItems,
  performSearch,
  handleSearch,
  updateCategoryInBoth,
  launchApp,
  handleCategoryToggle,
  handleCategoryDragEnd,
  handleAppDelete,
  handleAppPin,
} = useAppManagement();

// ==================== 拖拽管理 ====================
const {
  isDragOver,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDrop,
} = useDragDrop(updateCategoryInBoth, originalCategories, handleSearch);

// ==================== 键盘导航 ====================
const { handleKeyNavigation } = useKeyboardNavigation(
  flatItems,
  searchCategories,
  selectedIndex,
  launchApp,
  handleSearch
);

// ==================== 全局快捷键初始化 ====================
const {
  initializeGlobalHotkeys,
  isInitialized,
  initializationError,
} = useGlobalHotkeyInitializer();

// ==================== 方法 ====================
const handleClick = () => {
  searchHeaderRef.value?.focus();
};

const debouncedHandleSearch = useDebounceFn(() => handleSearch(searchText.value), 100);

// 设置页面方法
const openSettings = () => {
  showSettings.value = true;
  // 确保内容区域可见
  showContentArea();
};

const closeSettings = () => {
  showSettings.value = false;
};

// ==================== 监听器 ====================
// 监听搜索结果变化，自动调整窗口大小
watchDebounced(
  () => searchCategories.value.length,
  () => {
    const hasResults = searchCategories.value.some(
      (category) => category.items.length > 0
    );
    if (!hasResults) {
      hideContentArea();
    } else {
      showContentArea();
    }

    if (contentAreaVisible.value) {
      nextTick(() => {
        updateWindowSize();
      });
    }
  },
  { debounce: 100 }
);

// ==================== 窗口焦点管理 ====================
const handleWindowFocus = () => {
  nextTick(() => {
    searchHeaderRef.value?.focus();
  });
};

// ==================== 生命周期 ====================
onMounted(async () => {
  console.log("🚀 App.vue onMounted - 开始应用初始化");

  // 初始化快捷键（优先执行，确保全局快捷键可用）
  await initializeGlobalHotkeys();

  if (initializationError.value) {
    console.error("❌ 全局快捷键初始化失败:", initializationError.value);
  } else if (isInitialized.value) {
    console.log("✅ 全局快捷键初始化成功");
  }

  const categories = await initAppApps();
  originalCategories.value = categories;
  initializeWindowSize();

  searchText.value = "";
  await performSearch();

  window.addEventListener("focus", handleWindowFocus);

  nextTick(() => {
    const container = document.querySelector(".w-full.h-full.p-\\[4px\\]") as HTMLElement;
    if (container) {
      container.focus();
    }
  });

  console.log("🎉 App.vue onMounted - 应用初始化完成");
});

onUnmounted(() => {
  window.removeEventListener("focus", handleWindowFocus);
});
</script>

<style scoped>
/* 只保留特殊的样式，如 -webkit-app-region 等无法通过 TailwindCSS 实现的样式 */
.no-drag {
  -webkit-app-region: no-drag;
}
</style>
