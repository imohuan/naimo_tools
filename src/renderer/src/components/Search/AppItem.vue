<template>
  <div
    class="draggable-item flex flex-col h-21 items-center p-1 pt-2 rounded-lg cursor-pointer group relative overflow-hidden"
    :class="{
      'selected-item': isSelected,
      'unselected-item': !isSelected,
    }"
    :data-key="`${categoryId}-${app.fullPath || app.path}`"
    @dblclick="handleAppClick"
    @contextmenu="handleContextMenu"
    ref="itemRef"
  >
    <!-- 简洁背景和边框 -->
    <div
      class="absolute inset-0 bg-gray-200 rounded-lg border-2 border-transparent opacity-0 transition-all duration-300"
      :class="{
        'opacity-100 !border-gray-200': isSelected,
      }"
    ></div>

    <!-- 应用图标 -->
    <div
      class="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center mb-1 flex-shrink-0 relative z-10 transition-transform duration-200"
      :class="{ 'scale-110': isSelected }"
    >
      <IconDisplay
        :src="app.icon"
        :alt="app.name"
        :icon-class="`w-full h-full object-contain rounded transition-all duration-200 ${
          isSelected ? 'brightness-110 drop-shadow-md' : ''
        }`"
        :fallback-class="`w-full h-full rounded flex items-center justify-center transition-all duration-200`"
      >
        <template #fallback>
          <IconMdiApplication
            class="w-8 h-8 text-gray-600 transition-colors duration-200"
            :class="{ 'text-gray-700': isSelected }"
          />
        </template>
      </IconDisplay>

      <!-- 临时标签 -->
      <div
        v-if="isTemp"
        class="absolute top-0 right-0 bg-red-500 text-white text-[8px] px-2.5 py-0.5 z-20 shadow-md temp-ribbon"
      >
        临时
      </div>
    </div>

    <!-- 应用名称 -->
    <div class="text-center w-full px-0.5 relative z-10">
      <div
        class="text-xs leading-tight break-words overflow-hidden app-name transition-all duration-200"
        :class="{
          'text-gray-700 font-medium': isSelected,
          'text-gray-900': !isSelected,
        }"
      >
        {{ app.name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import IconDisplay from "@/components/Common/IconDisplay.vue";
import type { AppItem } from "@/core/typings/search";
/** @ts-ignore */
import IconMdiApplication from "~icons/mdi/application";
import { usePluginStoreNew } from "@/core";

interface Props {
  app: AppItem;
  categoryId: string;
  isSelected: boolean;
}

interface Emits {
  (e: "app-click", app: AppItem): void;
  (
    e: "context-menu",
    event: MouseEvent,
    app: AppItem,
    categoryId: string
  ): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const pluginStore = usePluginStoreNew();
const itemRef = ref<HTMLElement>();

const isTemp = computed(() => {
  if (!props.app.fullPath) return false;
  return pluginStore.temporaryFullPaths.includes(props.app.fullPath);
});

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

/* 选择状态样式 */
.selected-item {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.unselected-item {
  background: transparent;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.unselected-item:hover {
  background: rgba(156, 163, 175, 0.1);
  transform: translateY(-0.5px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 确保拖拽样式正确应用 */
.draggable-item {
  transform: none !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.draggable-item:not(.sortable-chosen):not(.sortable-drag):not(.sortable-ghost) {
  transform: none !important;
}

/* 选中状态的图标动画 */
.selected-item .w-8,
.selected-item .w-10 {
  animation: selectedPulse 0.3s ease-out;
}

@keyframes selectedPulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.15);
  }

  100% {
    transform: scale(1.1);
  }
}

/* 平滑的焦点过渡 */
.draggable-item:focus-visible {
  outline: 2px solid rgba(107, 114, 128, 0.5);
  outline-offset: 2px;
}

/* 临时标签彩带效果 */
.temp-ribbon {
  transform: rotate(45deg);
  transform-origin: center;
  position: absolute;
  top: -1px;
  right: -10px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
</style>
