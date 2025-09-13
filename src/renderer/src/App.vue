<template>
  <div class="w-full h-full p-[4px]" @keydown="handleKeyNavigation" tabindex="0">
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
      />

      <!-- 内容呈现区域 -->
      <ContentArea
        ref="contentAreaRef"
        :content-area-visible="contentAreaVisible"
        :content-area-height="contentAreaHeight"
        :search-categories="searchCategories"
        :selected-index="selectedIndex"
        :flat-items="flatItems"
        @app-click="launchApp"
        @category-toggle="handleCategoryToggle"
        @category-drag-end="handleCategoryDragEnd"
        @app-delete="handleAppDelete"
        @app-pin="handleAppPin"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SearchHeader from "./components/SearchHeader.vue";
import ContentArea from "./components/ContentArea.vue";
import { useWindowSize } from "./composables/useWindowSize";
import { useSearch } from "./composables/useSearch";
import { useDragDrop } from "./composables/useDragDrop";
import { useKeyboardNavigation } from "./composables/useKeyboardNavigation";
import { useAppManagement } from "./composables/useAppManagement";

// 本地配置常量
const headerHeight = 50;

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

// ==================== 搜索管理 ====================
const {
  searchText,
  searchCategories,
  originalCategories,
  flatItems,
  performSearch,
  handleSearch,
  updateCategoryInBoth,
} = useSearch();

// ==================== 拖拽管理 ====================
const {
  isDragOver,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDrop,
} = useDragDrop(updateCategoryInBoth, originalCategories, handleSearch);

// ==================== 应用管理 ====================
const {
  selectedIndex,
  initAppApps,
  launchApp,
  handleCategoryToggle,
  handleCategoryDragEnd,
  handleAppDelete,
  handleAppPin,
} = useAppManagement(updateCategoryInBoth, originalCategories, performSearch);

// ==================== 键盘导航 ====================
const { handleKeyNavigation } = useKeyboardNavigation(
  flatItems,
  searchCategories,
  selectedIndex,
  launchApp,
  handleSearch
);

// ==================== 方法 ====================
const handleClick = () => {
  searchHeaderRef.value?.focus();
};

const debouncedHandleSearch = useDebounceFn(() => handleSearch(searchText.value), 100);

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
