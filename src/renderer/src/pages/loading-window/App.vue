<template>
  <div
    class="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100"
  >
    <div class="flex flex-col items-center space-y-6">
      <!-- Logo 或图标 -->
      <div class="relative">
        <div
          class="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center animate-pulse"
        >
          <svg
            class="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <!-- 旋转的外圈 -->
        <div
          class="absolute inset-0 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin"
        ></div>
      </div>

      <!-- 标题 -->
      <div class="text-center space-y-2">
        <h1 class="text-2xl font-bold text-gray-800">正在初始化</h1>
        <p class="text-sm text-gray-600">
          {{ statusText }}
        </p>
      </div>

      <!-- 进度指示器 -->
      <div class="w-64 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
          :style="{ width: progress + '%' }"
        ></div>
      </div>

      <!-- 加载点动画 -->
      <div class="flex space-x-2">
        <div
          v-for="i in 3"
          :key="i"
          class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
          :style="{ animationDelay: `${i * 0.15}s` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";


const statusText = ref("正在扫描应用...");
const progress = ref(0);

let progressInterval: NodeJS.Timeout | null = null;

onMounted(() => {
  // 模拟进度增长
  progressInterval = setInterval(() => {
    if (progress.value < 90) {
      progress.value += Math.random() * 10;
      if (progress.value > 90) {
        progress.value = 90;
      }
    }
  }, 300);

  // 监听主进程的状态更新
  if (window.loadingWindow) {
    window.loadingWindow.onStatusUpdate((status: string) => {
      statusText.value = status;
    });

    window.loadingWindow.onProgressUpdate((prog: number) => {
      progress.value = prog;
    });
  }
});

onUnmounted(() => {
  if (progressInterval) {
    clearInterval(progressInterval);
  }
});
</script>
