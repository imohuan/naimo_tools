<template>
  <DraggableArea 
    class="w-full flex items-center justify-center" 
    :style="{ height: `${height}px` }"
    @click="emit('click')">
    <div 
      class="w-full h-full relative flex items-center bg-white rounded-t-xl transition-all duration-200"
      :class="{ 'bg-indigo-50': isDragOver }" 
      @dragover="handleDragOver" 
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave" 
      @drop="handleDrop">

      <!-- 插件信息显示 -->
      <PluginInfoDisplay 
        v-if="currentPluginItem && !isSettingsInterface"
        :plugin-item="currentPluginItem" />

      <!-- 文件信息显示 -->
      <FileInfoDisplay 
        v-else-if="internalAttachedFiles.length > 0 && !currentPluginItem"
        :files="internalAttachedFiles" />

      <!-- 拖拽图标 -->
      <DragIcon 
        v-else
        :is-drag-over="isDragOver"
        :has-plugin="!!currentPluginItem" />

      <!-- 搜索输入框 -->
      <SearchInput 
        ref="searchInputRef" 
        :model-value="searchText"
        :has-files="internalAttachedFiles.length > 0 || currentPluginItem !== null"
        :should-show-search-box="shouldShowSearchBox"
        @update:model-value="emit('update:searchText', $event)" 
        @enter="emit('search', searchText)"
        @input="emit('input', searchText)" 
        @paste="handlePaste" 
        @clear-files="handleClearFiles"
        :placeholder="computedPlaceholder"
        :style="noDragStyles" />

      <!-- 设置按钮 -->
      <SettingsButton 
        :no-drag-styles="noDragStyles"
        @click="emit('open-settings')" />
    </div>
  </DraggableArea>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import DraggableArea from '@/components/DraggableArea/DraggableArea.vue'
import SearchInput from '@/components/Search/SearchInput.vue'
import PluginInfoDisplay from './PluginInfoDisplay.vue'
import FileInfoDisplay from './FileInfoDisplay.vue'
import DragIcon from './DragIcon.vue'
import SettingsButton from './SettingsButton.vue'
import { useDragDrop } from '@/composables/useDragDrop'
import { useFilePaste } from './hooks/useFilePaste'
import type { AttachedFile } from '@/typings/composableTypes'
import type { PluginItem } from '@/typings/pluginTypes'

const props = defineProps<{
  height: number
  pluginItem: PluginItem | null
  attachedFiles: AttachedFile[]
  isSettingsInterface: boolean
  searchText: string
  shouldShowSearchBox: boolean
}>()

const emit = defineEmits<{
  click: []
  'update:searchText': [value: string]
  search: [text: string]
  input: [text: string]
  'add-files': [files: File[]]
  'clear-files': []
  'clear-plugin': []
  'open-settings': []
}>()

// ==================== 内部状态 ====================
const searchInputRef = ref<InstanceType<typeof SearchInput>>()
const internalAttachedFiles = ref<AttachedFile[]>([])
const currentPluginItem = ref<PluginItem | null>(null)

// ==================== 计算属性 ====================
const computedPlaceholder = computed(() => {
  if (currentPluginItem.value) {
    return `在 ${currentPluginItem.value.name} 中搜索...`
  }
  if (internalAttachedFiles.value.length > 0) {
    return '搜索文件处理插件...'
  }
  return '搜索应用...'
})

const noDragStyles = computed(() => ({
  '-webkit-app-region': 'no-drag' as const
}))

// ==================== 拖拽处理 ====================
const addFilesInternal = async (files: File[] | FileList): Promise<AttachedFile[]> => {
  const fileArray = Array.isArray(files) ? files : Array.from(files)
  emit('add-files', fileArray)
  return []
}

const {
  isDragOver,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDrop
} = useDragDrop(addFilesInternal)

// ==================== 文件粘贴处理 ====================
const { handleFilePaste } = useFilePaste()

const handlePaste = async (event: ClipboardEvent) => {
  // 创建适配器函数，匹配 useFilePaste 期望的签名
  const addFilesAdapter = async (files: File[]): Promise<void> => {
    emit('add-files', files)
  }
  await handleFilePaste(event, addFilesAdapter)
}

// ==================== 清除处理 ====================
const handleClearFiles = () => {
  if (currentPluginItem.value) {
    emit('clear-plugin')
  } else if (internalAttachedFiles.value.length > 0) {
    emit('clear-files')
  }
}

// ==================== 监听 props 变化 ====================
watch(() => props.attachedFiles, (newFiles) => {
  internalAttachedFiles.value = newFiles
}, { immediate: true, deep: true })

watch(() => props.pluginItem, (newPlugin) => {
  currentPluginItem.value = newPlugin
}, { immediate: true })

// ==================== 暴露方法 ====================
defineExpose({
  focus: () => searchInputRef.value?.focus()
})
</script>

