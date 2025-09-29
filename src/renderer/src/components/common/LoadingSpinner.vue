<template>
  <div class="inline-block animate-spin" :class="colorClass" :style="sizeStyle">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-full h-full">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: number | string
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  color: 'text-blue-500'
})

const sizeStyle = computed(() => {
  const size = typeof props.size === 'number' ? `${props.size}px` : props.size
  return {
    width: size,
    height: size
  }
})

const colorClass = computed(() => props.color)
</script>

<style scoped>
/* 优化动画性能 */
.animate-spin {
  animation: spin 1s linear infinite;
  transform-origin: center;
  will-change: transform;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* GPU 加速 */
svg {
  transform: translateZ(0);
}
</style>
