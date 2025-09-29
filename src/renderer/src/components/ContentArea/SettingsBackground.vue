<template>
  <div class="w-full h-full bg-transparent rounded-lg" :style="{ padding: `${padding}px` }">
    <!-- 简洁的透明背景，无边框和阴影 -->
    <div class="w-full h-full opacity-0">
      <!-- 占位内容，确保容器有正确的尺寸 -->
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  padding?: number
}

withDefaults(defineProps<Props>(), {
  padding: 16
})
</script>

<style scoped>
/* 确保背景容器不影响性能 */
div {
  contain: layout style paint;
}
</style>
