<template>
  <div class="w-full h-full min-h-64 flex items-center justify-center text-gray-400">
    <div class="text-center max-w-sm">
      <!-- 图标 -->
      <div class="text-6xl mb-4 animate-bounce-slow">
        {{ icon }}
      </div>

      <!-- 主标题 -->
      <div class="text-xl font-medium text-gray-600 mb-2">
        {{ title }}
      </div>

      <!-- 描述文本 -->
      <div class="text-sm text-gray-500 leading-relaxed">
        {{ description }}
      </div>

      <!-- 可选的操作按钮 -->
      <div v-if="showAction" class="mt-6">
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 text-sm"
          @click="handleAction">
          {{ actionText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon?: string
  title?: string
  description?: string
  showAction?: boolean
  actionText?: string
}

interface Emits {
  (e: 'action'): void
}

const props = withDefaults(defineProps<Props>(), {
  icon: '😕',
  title: '没有找到相关数据',
  description: '请尝试其他关键词或检查输入是否正确',
  showAction: false,
  actionText: '重新搜索'
})

const emit = defineEmits<Emits>()

const handleAction = () => {
  emit('action')
}
</script>

<style scoped>
/* 自定义缓慢弹跳动画 */
@keyframes bounce-slow {

  0%,
  20%,
  53%,
  80%,
  100% {
    animation-timing-function: cubic-bezier(0.215, 0.610, 0.355, 1.000);
    transform: translate3d(0, 0, 0);
  }

  40%,
  43% {
    animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
    transform: translate3d(0, -8px, 0);
  }

  70% {
    animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
    transform: translate3d(0, -4px, 0);
  }

  90% {
    transform: translate3d(0, -2px, 0);
  }
}

.animate-bounce-slow {
  animation: bounce-slow 3s infinite;
}

/* 防止文本选择 */
.text-center {
  user-select: none;
}

/* 按钮悬停效果优化 */
button {
  transform: translateZ(0);
  will-change: background-color, transform;
}

button:hover {
  transform: translateY(-1px) translateZ(0);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

button:active {
  transform: translateY(0) translateZ(0);
}
</style>
