<template>
  <div class="h-full aspect-square" :style="noDragStyles">
    <button
      class="w-full h-full p-3 text-gray-500 transition-colors duration-200 rounded-lg flex items-center justify-center"
      title="打开设置"
      @click="emit('click')">
      <IconMdiCog class="w-5 h-5 hover:text-gray-700" />
    </button>
  </div>
</template>

<script setup lang="ts">
// @ts-ignore
import IconMdiCog from '~icons/mdi/cog'

defineProps<{
  noDragStyles?: Record<string, string>
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

