<template>
  <div
    ref="contentAreaRef"
    class="flex-1 w-full overflow-hidden transition-all duration-300 bg-white"
    :style="{ height: contentAreaVisible ? contentAreaHeight + 'px' : '0px' }"
    v-if="contentAreaVisible"
  >
    <div id="content-scroll-container" class="w-full h-full overflow-y-auto">
      <!-- 搜索结果 -->
      <SearchCategories
        v-if="searchCategories.length > 0"
        :categories="searchCategories"
        :selected-index="selectedIndex"
        :flat-items="flatItems"
        @app-click="$emit('app-click', $event)"
        @category-toggle="$emit('category-toggle', $event)"
        @category-drag-end="$emit('category-drag-end', $event, $event)"
        @app-delete="$emit('app-delete', $event, $event)"
        @app-pin="$emit('app-pin', $event)"
      />
      <!-- 设置内容 -->
      <HotkeyDemo v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import SearchCategories from './SearchCategories.vue'
import type { AppItem } from '../../../shared/types'
import type { SearchCategory } from '../composables/useSearch'

interface Props {
  contentAreaVisible: boolean
  contentAreaHeight: number
  searchCategories: SearchCategory[]
  selectedIndex: number
  flatItems: Array<AppItem & { categoryId: string }>
}

interface Emits {
  (e: 'app-click', app: AppItem): void
  (e: 'category-toggle', categoryId: string): void
  (e: 'category-drag-end', categoryId: string, newItems: AppItem[]): void
  (e: 'app-delete', app: AppItem, categoryId: string): void
  (e: 'app-pin', app: AppItem): void
}

defineProps<Props>()
defineEmits<Emits>()

const contentAreaRef = ref<HTMLElement>()

defineExpose({
  contentAreaRef,
})
</script>
