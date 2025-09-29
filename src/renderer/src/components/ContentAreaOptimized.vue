<template>
  <div class="flex-1 w-full overflow-hidden transition-all duration-300 bg-white relative rounded-b-xl"
    v-show="contentAreaVisible">
    <!-- 统一的内容容器 -->
    <div ref="contentScrollContainerRef" class="w-full rounded-b-xl" :class="containerClasses" :style="containerStyles">
      <!-- 设置背景模式 -->
      <SettingsBackground v-if="showSettingsBackground" :padding="DEFAULT_WINDOW_LAYOUT.settingsBackgroundPadding" />

      <!-- 插件窗口界面 -->
      <PluginWindowPlaceholder v-else-if="showPluginWindow" />

      <!-- 搜索结果 -->
      <SearchCategories v-else-if="hasSearchResults" :categories="searchCategories" :selected-index="selectedIndex"
        :flat-items="flatItems" @app-click="handleAppClick" @category-toggle="handleCategoryToggle"
        @category-drag-end="handleCategoryDragEnd" @app-delete="handleAppDelete" @app-pin="handleAppPin" />

      <!-- 默认空状态 -->
      <EmptyState v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from "vue"
import SearchCategories from "@/modules/search/components/SearchCategories.vue"
import { DEFAULT_WINDOW_LAYOUT } from "@shared/config/windowLayoutConfig"
import type { AppItem } from "@shared/typings"
import type { SearchCategory } from "@/typings/searchTypes"

// 子组件
import SettingsBackground from "./ContentArea/SettingsBackground.vue"
import PluginWindowPlaceholder from "./ContentArea/PluginWindowPlaceholder.vue"
import EmptyState from "./ContentArea/EmptyState.vue"

/**
 * 组件属性
 */
interface Props {
  contentAreaVisible: boolean
  searchCategories: SearchCategory[]
  selectedIndex: number
  flatItems: AppItem[]
  showPluginWindow: boolean
  showSettingsBackground: boolean
}

/**
 * 组件事件
 */
interface Emits {
  (e: 'app-click', app: AppItem): void
  (e: 'category-toggle', categoryId: string): void
  (e: 'category-drag-end', categoryId: string, items: AppItem[]): void
  (e: 'app-delete', app: AppItem, categoryId: string): void
  (e: 'app-pin', app: AppItem): void
  (e: 'window-resize', height: number): void
}

const props = withDefaults(defineProps<Props>(), {
  contentAreaVisible: false,
  searchCategories: () => [],
  selectedIndex: 0,
  flatItems: () => [],
  showPluginWindow: false,
  showSettingsBackground: false,
})

const emit = defineEmits<Emits>()

// 模板引用
const contentScrollContainerRef = ref<HTMLElement>()

// 响应式状态
const containerHeight = ref(0)
const isResizing = ref(false)
const resizeObserver = ref<ResizeObserver>()

// 计算属性
const hasSearchResults = computed(() =>
  props.searchCategories.length > 0
)

const containerClasses = computed(() => ({
  'bg-gray-50/30 backdrop-blur-sm': props.showSettingsBackground || props.showPluginWindow,
  'overflow-y-auto': !props.showSettingsBackground && !props.showPluginWindow
}))

const containerStyles = computed(() => {
  const isSpecialMode = props.showSettingsBackground || props.showPluginWindow

  return isSpecialMode
    ? { height: `${DEFAULT_WINDOW_LAYOUT.contentMaxHeight}px` }
    : { maxHeight: `${DEFAULT_WINDOW_LAYOUT.contentMaxHeight}px` }
})

// 性能优化：防抖的窗口调整函数
let resizeTimeout: NodeJS.Timeout | null = null
const debouncedResize = () => {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }

  resizeTimeout = setTimeout(() => {
    handleResize()
  }, 16) // 约60fps
}

/**
 * 处理窗口大小调整
 */
const handleResize = async () => {
  if (!contentScrollContainerRef.value || isResizing.value) return

  isResizing.value = true

  try {
    await nextTick()

    const container = contentScrollContainerRef.value
    const rect = container.getBoundingClientRect()
    const newHeight = Math.ceil(rect.height)

    if (newHeight !== containerHeight.value && newHeight > 0) {
      containerHeight.value = newHeight

      // 计算总窗口高度
      const totalHeight = DEFAULT_WINDOW_LAYOUT.searchHeaderHeight +
        newHeight +
        DEFAULT_WINDOW_LAYOUT.appPadding

      emit('window-resize', totalHeight)
    }
  } catch (error) {
    console.error('处理窗口调整失败:', error)
  } finally {
    isResizing.value = false
  }
}

/**
 * 事件处理器 - 使用性能优化的方式
 */
const handleAppClick = (app: AppItem) => {
  emit('app-click', app)
}

const handleCategoryToggle = (categoryId: string) => {
  emit('category-toggle', categoryId)
  // 分类切换后需要重新计算高度
  nextTick(() => debouncedResize())
}

const handleCategoryDragEnd = (categoryId: string, items: AppItem[]) => {
  emit('category-drag-end', categoryId, items)
  // 拖拽结束后需要重新计算高度
  nextTick(() => debouncedResize())
}

const handleAppDelete = (app: AppItem, categoryId: string) => {
  emit('app-delete', app, categoryId)
  // 删除应用后需要重新计算高度
  nextTick(() => debouncedResize())
}

const handleAppPin = (app: AppItem) => {
  emit('app-pin', app)
  // 固定应用后需要重新计算高度
  nextTick(() => debouncedResize())
}

/**
 * 设置 ResizeObserver
 */
const setupResizeObserver = () => {
  if (!window.ResizeObserver || !contentScrollContainerRef.value) return

  resizeObserver.value = new ResizeObserver((entries) => {
    for (const entry of entries) {
      // 使用 contentBoxSize 获得更精确的尺寸
      if (entry.contentBoxSize && entry.contentBoxSize.length > 0) {
        const { blockSize } = entry.contentBoxSize[0]
        if (Math.abs(blockSize - containerHeight.value) > 1) {
          debouncedResize()
        }
      } else {
        // 回退到 contentRect
        const { height } = entry.contentRect
        if (Math.abs(height - containerHeight.value) > 1) {
          debouncedResize()
        }
      }
    }
  })

  resizeObserver.value.observe(contentScrollContainerRef.value)
}

/**
 * 清理 ResizeObserver
 */
const cleanupResizeObserver = () => {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
    resizeObserver.value = undefined
  }
}

// 监听内容变化
watch(
  () => [props.searchCategories.length, props.showPluginWindow, props.showSettingsBackground],
  () => {
    nextTick(() => debouncedResize())
  },
  { deep: true }
)

// 生命周期
onMounted(() => {
  nextTick(() => {
    setupResizeObserver()
    handleResize()
  })
})

onUnmounted(() => {
  cleanupResizeObserver()
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
})

// 暴露方法
defineExpose({
  handleResize: debouncedResize,
  containerHeight: computed(() => containerHeight.value)
})
</script>

<style scoped>
/* 优化滚动性能 */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.8);
}

/* 优化过渡动画 */
.transition-all {
  transition-property: transform, opacity, background-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* GPU 加速 */
.rounded-b-xl {
  transform: translateZ(0);
  will-change: transform;
}
</style>
