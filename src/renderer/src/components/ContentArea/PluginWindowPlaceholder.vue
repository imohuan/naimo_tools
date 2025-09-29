<template>
  <div class="w-full h-full flex items-center justify-center text-gray-500 py-10">
    <div class="text-center flex flex-col items-center justify-center w-full h-full py-10">
      <!-- 加载动画 -->
      <div class="relative mb-4">
        <LoadingSpinner :size="48" color="text-blue-500" />
      </div>

      <!-- 加载文本 -->
      <div class="text-xl font-medium text-gray-800 mb-2">
        {{ loadingText }}
      </div>

      <!-- 描述文本 -->
      <div class="text-sm text-gray-500 max-w-xs">
        {{ description }}
      </div>

      <!-- 进度条（可选） -->
      <div v-if="showProgress" class="w-48 mt-4">
        <ProgressBar :progress="progress" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import LoadingSpinner from '../common/LoadingSpinner.vue'
import ProgressBar from '../common/ProgressBar.vue'

interface Props {
  loadingText?: string
  description?: string
  showProgress?: boolean
  autoProgress?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loadingText: '插件窗口加载中...',
  description: '正在打开插件内容，请稍候',
  showProgress: false,
  autoProgress: true
})

// 进度状态
const progress = ref(0)
let progressInterval: NodeJS.Timeout | null = null

// 自动进度更新
const startAutoProgress = () => {
  if (!props.autoProgress || !props.showProgress) return

  progressInterval = setInterval(() => {
    if (progress.value < 90) {
      progress.value += Math.random() * 10
    }
  }, 200)
}

const stopAutoProgress = () => {
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
}

// 生命周期
onMounted(() => {
  startAutoProgress()
})

onUnmounted(() => {
  stopAutoProgress()
})

// 暴露方法
defineExpose({
  setProgress: (value: number) => {
    progress.value = Math.max(0, Math.min(100, value))
  },
  completeProgress: () => {
    progress.value = 100
  }
})
</script>

<style scoped>
/* 优化动画性能 */
.flex {
  contain: layout;
}

/* 防止文本选择 */
.text-center {
  user-select: none;
}
</style>
