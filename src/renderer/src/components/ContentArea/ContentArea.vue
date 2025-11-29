<template>
  <div
    class="flex-1 w-full overflow-hidden bg-white relative rounded-b-xl pr-2 pb-2"
    v-show="contentAreaVisible"
  >
    <!-- 统一的内容容器 - 所有内容都在这个容器内 -->
    <div
      ref="contentScrollContainerRef"
      class="w-full rounded-b-xl"
      :class="
        showSettingsBackground || showPluginWindow
          ? 'bg-gray-50/30 backdrop-blur-sm'
          : 'overflow-y-auto'
      "
      :style="
        showSettingsBackground || showPluginWindow
          ? { height: `${DEFAULT_WINDOW_LAYOUT.contentMaxHeight}px` }
          : { maxHeight: `${DEFAULT_WINDOW_LAYOUT.contentMaxHeight}px` }
      "
    >
      <!-- 设置背景模式 - 当显示设置界面时作为背景容器 -->
      <div
        v-if="showSettingsBackground"
        class="w-full h-full bg-transparent rounded-lg"
        :style="{
          padding: `${DEFAULT_WINDOW_LAYOUT.settingsBackgroundPadding}px`,
        }"
      >
        <!-- 简洁的透明背景，无边框和阴影 -->
      </div>

      <!-- 插件窗口界面 -->
      <div
        v-else-if="showPluginWindow"
        class="w-full h-full flex items-center justify-center text-gray-500 py-10"
      >
        <div
          class="text-center flex flex-col items-center justify-center w-full h-full py-10"
        >
          <svg
            class="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
          <div class="text-xl font-medium text-gray-800">插件窗口加载中...</div>
          <div class="text-sm text-gray-500 mt-2">正在打开插件内容，请稍候</div>
        </div>
      </div>

      <!-- 搜索结果 -->
      <SearchCategories
        v-else-if="searchCategories.length > 0"
        :categories="searchCategories"
        :selected-index="selectedIndex"
        :flat-items="flatItems"
        @app-click="$emit('app-click', $event)"
        @category-toggle="$emit('category-toggle', $event)"
        @category-drag-end="
          (categoryId: string, items: any[]) =>
            $emit('category-drag-end', categoryId, items)
        "
        @app-delete="
          (app: any, categoryId: string) => $emit('app-delete', app, categoryId)
        "
        @app-pin="(app: any) => $emit('app-pin', app)"
      />

      <!-- 默认内容 - 当没有搜索结果时显示空状态 -->
      <div
        v-else
        class="w-full h-full min-h-64 flex items-center justify-center text-gray-400"
      >
        <div class="text-center">
          <div class="text-6xl mb-4">😕</div>
          <div class="text-xl font-medium">没有找到相关数据</div>
          <div class="text-sm mt-2">请尝试其他关键词或检查输入是否正确</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick } from "vue";
import SearchCategories from "@/components/Search/SearchCategories.vue";
import type { AppItem } from "@/core/typings/search";
import type { SearchCategory } from "@/typings/searchTypes";
import { DEFAULT_WINDOW_LAYOUT } from "@shared/config/windowLayoutConfig";

interface Props {
  contentAreaVisible: boolean;
  searchCategories: SearchCategory[];
  selectedIndex: number;
  flatItems: Array<AppItem & { categoryId: string }>;
  showPluginWindow?: boolean;
  showSettingsBackground?: boolean;
}

interface Emits {
  (e: "app-click", app: AppItem): void;
  (e: "category-toggle", categoryId: string): void;
  (e: "category-drag-end", categoryId: string, newItems: AppItem[]): void;
  (e: "app-delete", app: AppItem, categoryId: string): void;
  (e: "app-pin", app: AppItem): void;
  (e: "window-resize", height: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  showPluginWindow: false,
  showSettingsBackground: false,
});
const emit = defineEmits<Emits>();

const contentScrollContainerRef = ref<HTMLElement>();
const { height } = useElementSize(contentScrollContainerRef);

const handleResize = () => {
  const contentHeight = Math.min(
    height.value,
    DEFAULT_WINDOW_LAYOUT.contentMaxHeight
  );
  console.log("handleResize called", {
    contentHeight,
    contentAreaVisible: props.contentAreaVisible,
  });
  if (props.contentAreaVisible && contentHeight > 0) {
    // 计算总窗口高度：搜索框高度 + 内容区域高度 + padding
    const config = DEFAULT_WINDOW_LAYOUT;
    const totalHeight =
      config.searchHeaderHeight + contentHeight + config.appPadding * 2;
    console.log("emitting window-resize", totalHeight);
    emit("window-resize", totalHeight);
  }
};

// 监听内容高度变化，动态调整窗口大小
watch(
  height,
  () => {
    console.log("height", height.value);
    nextTick(() => {
      handleResize();
    });
  },
  { immediate: true }
);

defineExpose({ contentScrollContainerRef, handleResize });
</script>
