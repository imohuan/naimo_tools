<template>
  <div
    class="draggable-item flex flex-col h-22 items-center p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors group"
    :class="{
      'bg-blue-100 border-2 border-blue-400 shadow-md': isSelected,
      'hover:bg-gray-100': !isSelected,
    }"
    :data-key="`${categoryId}-${app.path}`"
    @dblclick="handleAppClick"
    @contextmenu="handleContextMenu"
    ref="itemRef"
  >
    <!-- 应用图标 -->
    <div class="w-8 h-8 sm:w-10 sm:h-10 mb-1 flex-shrink-0">
      <img
        v-if="app.icon"
        :src="app.icon"
        :alt="app.name"
        class="w-full h-full object-contain rounded"
      />
      <div
        v-else
        class="w-full h-full bg-gray-300 rounded flex items-center justify-center"
      >
        <IconMdiApplication class="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
      </div>
    </div>

    <!-- 应用名称 -->
    <div class="text-center w-full px-1">
      <div
        class="text-xs text-gray-900 leading-tight break-words overflow-hidden app-name"
      >
        {{ app.name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
/** @ts-ignore */
import IconMdiApplication from "~icons/mdi/application";

interface AppItem {
  name: string;
  path: string;
  icon: string | null;
}

interface Props {
  app: AppItem;
  categoryId: string;
  isSelected: boolean;
}

interface Emits {
  (e: "app-click", app: AppItem): void;
  (e: "context-menu", event: MouseEvent, app: AppItem, categoryId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const itemRef = ref<HTMLElement>();

// 滚动到可视区域的函数
const scrollToVisible = () => {
  nextTick(() => {
    if (!itemRef.value) return;
    // 使用原生的 scrollIntoView 方法，简单高效
    itemRef.value.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  });
};

// 监听选中状态变化，自动滚动到可视区域
watch(
  () => props.isSelected,
  (newValue) => {
    if (newValue) {
      scrollToVisible();
    }
  },
  { immediate: true }
);

const handleAppClick = () => {
  emit("app-click", props.app);
};

const handleContextMenu = (event: MouseEvent) => {
  emit("context-menu", event, props.app, props.categoryId);
};
</script>

<style scoped>
.app-name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
  hyphens: auto;
}

/* 确保拖拽样式正确应用 */
.draggable-item {
  transform: none !important;
  transition: all 0.2s ease !important;
}

.draggable-item:not(.sortable-chosen):not(.sortable-drag):not(.sortable-ghost) {
  transform: none !important;
}
</style>
