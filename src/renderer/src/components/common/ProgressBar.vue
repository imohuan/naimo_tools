<template>
  <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
    <div class="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
      :style="progressStyle" :class="{ 'animate-pulse': isIndeterminate }">
      <!-- 可选的光泽效果 -->
      <div v-if="showGloss"
        class="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  progress?: number
  isIndeterminate?: boolean
  showGloss?: boolean
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  progress: 0,
  isIndeterminate: false,
  showGloss: true,
  color: 'from-blue-500 to-blue-600'
})

const progressStyle = computed(() => ({
  width: props.isIndeterminate ? '100%' : `${Math.max(0, Math.min(100, props.progress))}%`,
  background: props.isIndeterminate ? undefined : `linear-gradient(to right, ${props.color})`
}))
</script>

<style scoped>
/* 光泽动画 */
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}

/* 不确定进度的脉冲动画 */
@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.7;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* GPU 加速 */
.transition-all {
  will-change: width;
  transform: translateZ(0);
}
</style>
