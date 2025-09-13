<template>
  <DraggableArea
    class="w-full flex items-center justify-center"
    :style="{ height: headerHeight + 'px' }"
    @click="$emit('click')"
    @dragover="handleDragOver"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div
      class="w-full h-full relative flex items-center bg-white border border-gray-200 transition-all duration-200"
      :class="{ 'bg-indigo-50 border-indigo-400': isDragOver }"
    >
      <!-- 拖拽图标 -->
      <div
        class="h-full aspect-square flex items-center justify-center text-gray-400 transition-colors duration-200"
        :class="{ 'text-indigo-500': isDragOver }"
      >
        <IconMdiFileUpload v-if="isDragOver" class="w-5 h-5" />
        <IconMdiMagnify v-else class="w-5 h-5" />
      </div>

      <!-- 搜索输入框组件 -->
      <SearchInput
        ref="searchInputRef"
        :model-value="searchText"
        @update:model-value="$emit('update:searchText', $event)"
        @enter="$emit('search', $event)"
        @input="$emit('input', $event)"
        :placeholder="
          isDragOver ? '释放文件以搜索...' : '搜索应用和指令 / 拖拽文件到此处...'
        "
      />

      <!-- 内容切换按钮 -->
      <div class="h-full aspect-square">
        <button
          class="w-full h-full p-3 text-gray-500 transition-colors duration-200 rounded-lg flex items-center justify-center"
          title="切换内容区域"
          @click="$emit('toggle-content')"
        >
          <IconMdiCog class="w-5 h-5 hover:text-gray-700" />
        </button>
      </div>
    </div>
  </DraggableArea>
</template>

<script setup lang="ts">
import DraggableArea from './DraggableArea.vue'
import SearchInput from './SearchInput.vue'

interface Props {
  searchText: string
  isDragOver: boolean
  headerHeight: number
}

interface Emits {
  (e: 'update:searchText', value: string): void
  (e: 'search', value: string): void
  (e: 'input', value: string): void
  (e: 'click'): void
  (e: 'toggle-content'): void
  (e: 'drag-over', event: DragEvent): void
  (e: 'drag-enter', event: DragEvent): void
  (e: 'drag-leave', event: DragEvent): void
  (e: 'drop', event: DragEvent): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const searchInputRef = ref<InstanceType<typeof SearchInput>>()

const handleDragOver = (event: DragEvent) => {
  emit('drag-over', event)
}

const handleDragEnter = (event: DragEvent) => {
  emit('drag-enter', event)
}

const handleDragLeave = (event: DragEvent) => {
  emit('drag-leave', event)
}

const handleDrop = (event: DragEvent) => {
  emit('drop', event)
}

// 暴露方法给父组件
defineExpose({
  focus: () => searchInputRef.value?.focus(),
})
</script>
