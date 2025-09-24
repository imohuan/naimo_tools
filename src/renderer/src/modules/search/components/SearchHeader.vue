<template>
  <DraggableArea class="w-full flex items-center justify-center" :style="{ height: headerHeight + 'px' }"
    @click="$emit('click')" @dragover="handleDragOver" @dragenter="handleDragEnter" @dragleave="handleDragLeave"
    @drop="handleDrop">
    <div class="w-full h-full relative flex items-center bg-white border border-gray-200 transition-all duration-200"
      :class="{ 'bg-indigo-50 border-indigo-400': isDragOver }">
      <!-- 插件信息显示区域 -->
      <div v-if="currentPluginItem" class="h-full flex items-center p-2">
        <!-- 插件图标容器 -->
        <div class="h-full p-2 flex items-center space-x-1 border border-indigo-200 bg-indigo-50 rounded-md">
          <div class="p-1 flex items-center justify-center">
            <IconDisplay :src="currentPluginItem.icon" :alt="currentPluginItem.name" icon-class="w-4 h-4 object-cover"
              fallback-class="w-5 h-5 flex items-center justify-center">
              <template #fallback>
                <IconMdiPuzzle class="w-4 h-4 text-indigo-500" />
              </template>
            </IconDisplay>
          </div>

          <!-- 插件名称和类型 -->
          <div class="flex items-center justify-center gap-2">
            <span class="text-sm font-medium text-indigo-700 truncate max-w-24" :title="currentPluginItem.name">
              {{ currentPluginItem.name }}
            </span>
            <span class="font-mono bg-indigo-400 rounded-md text-white px-2 text-xs">
              插件
            </span>
          </div>
        </div>
      </div>

      <!-- 文件信息显示区域 -->
      <div v-else-if="attachedFiles.length > 0" class="h-full flex items-center p-2">
        <!-- 文件图标容器 -->
        <div class="h-full p-2 flex items-center space-x-1 border border-gray-200 bg-gray-50 rounded-md">
          <div class="p-1">
            <IconDisplay :src="firstFileIcon" :alt="firstFile.name" icon-class="w-5 h-5 object-cover"
              fallback-class="w-5 h-5 flex items-center justify-center">
              <template #fallback>
                <IconMdiFile class="w-4 h-4 text-gray-500" />
              </template>
            </IconDisplay>
          </div>

          <!-- 文件名和数量 -->
          <div class="flex items-center justify-center gap-2">
            <span class="text-sm font-medium text-gray-700 truncate max-w-24" :title="firstFile.name">
              {{ firstFile.name }}
            </span>
            <span v-if="attachedFiles.length > 1" class="font-mono bg-gray-400 rounded-md text-white px-2 text-xs">
              {{ attachedFiles.length }}
            </span>
          </div>
        </div>
      </div>

      <!-- 拖拽图标 -->
      <div v-else
        class="h-full aspect-square flex items-center justify-center text-gray-400 transition-colors duration-200"
        :class="{
          'text-indigo-500': isDragOver && !currentPluginItem,
          'text-gray-300': currentPluginItem
        }">
        <IconMdiFileUpload v-if="isDragOver && !currentPluginItem" class="w-5 h-5" />
        <IconMdiMagnify v-else class="w-5 h-5" />
      </div>

      <!-- 搜索输入框组件 -->
      <SearchInput ref="searchInputRef" :model-value="searchText"
        :has-files="attachedFiles.length > 0 || currentPluginItem !== null"
        :should-show-search-box="shouldShowSearchBox" @update:model-value="$emit('update:searchText', $event)"
        @enter="$emit('search', $event)" @input="$emit('input', $event)" @paste="$emit('paste', $event)"
        @clear-files="handleClearFiles" :placeholder="isDragOver && !currentPluginItem
          ? '释放文件以搜索...'
          : currentPluginItem
            ? ''
            : attachedFiles.length > 0
              ? '搜索支持该文件的应用...'
              : '搜索应用和指令 / 拖拽文件到此处...'
          " />

      <!-- 设置按钮 -->
      <div class="h-full aspect-square">
        <button
          class="w-full h-full p-3 text-gray-500 transition-colors duration-200 rounded-lg flex items-center justify-center"
          title="打开设置" @click="$emit('open-settings')">
          <IconMdiCog class="w-5 h-5 hover:text-gray-700" />
        </button>
      </div>
    </div>
  </DraggableArea>
</template>

<script setup lang="ts">
import { watch, ref, computed } from "vue";
import DraggableArea from "@/components/DraggableArea.vue";
import SearchInput from "./SearchInput.vue";
import IconDisplay from "@/components/IconDisplay.vue";
import type { AttachedFile } from "@/composables/useFileHandler";
import type { PluginItem } from "@/typings/plugin-types";
/** @ts-ignore */
import IconMdiPuzzle from "~icons/mdi/puzzle";
/** @ts-ignore */
import IconMdiFile from "~icons/mdi/file";

interface Props {
  searchText: string;
  isDragOver: boolean;
  headerHeight: number;
  attachedFiles: AttachedFile[];
  currentPluginItem: PluginItem | null;
  shouldShowSearchBox: boolean;
}

interface Emits {
  (e: "update:searchText", value: string): void;
  (e: "search", value: string): void;
  (e: "input", value: string): void;
  (e: "click"): void;
  (e: "open-settings"): void;
  (e: "drag-over", event: DragEvent): void;
  (e: "drag-enter", event: DragEvent): void;
  (e: "drag-leave", event: DragEvent): void;
  (e: "drop", event: DragEvent): void;
  (e: "paste", event: ClipboardEvent): void;
  (e: "clear-files"): void;
  (e: "clear-plugin"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 调试日志
watch(() => props.shouldShowSearchBox, (newVal) => {
  console.log('🔍 SearchHeader shouldShowSearchBox changed:', newVal);
}, { immediate: true });

const searchInputRef = ref<InstanceType<typeof SearchInput>>();

// 计算属性
const firstFile = computed(() => props.attachedFiles[0]);
const firstFileIcon = computed(() => firstFile.value?.icon);

// 拖拽事件处理
const handleDragOver = (event: DragEvent) => {
  // 如果是插件模式，阻止拖拽
  if (props.currentPluginItem) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = "none";
    return;
  }

  event.preventDefault();
  event.dataTransfer!.dropEffect = "copy";
  emit("drag-over", event);
};

const handleDragEnter = (event: DragEvent) => {
  // 如果是插件模式，阻止拖拽
  if (props.currentPluginItem) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  emit("drag-enter", event);
};

const handleDragLeave = (event: DragEvent) => {
  // 如果是插件模式，阻止拖拽
  if (props.currentPluginItem) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  emit("drag-leave", event);
};

const handleDrop = (event: DragEvent) => {
  // 如果是插件模式，阻止拖拽
  if (props.currentPluginItem) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  emit("drop", event);
};

// 处理清除文件/插件信息
const handleClearFiles = () => {
  if (props.currentPluginItem) {
    // 如果有插件信息，清除插件信息
    emit("clear-plugin");
  } else {
    // 否则清除文件
    emit("clear-files");
  }
};

// 暴露方法给父组件
defineExpose({
  focus: () => {
    // 只有在搜索框可见时才尝试聚焦
    if (props.shouldShowSearchBox && searchInputRef.value) {
      searchInputRef.value.focus();
    }
  },
});
</script>
