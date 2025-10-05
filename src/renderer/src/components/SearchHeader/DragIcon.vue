<template>
  <div
    class="h-full aspect-square flex items-center justify-center text-gray-400 transition-colors duration-200"
    :class="{
      'text-indigo-500': isDragOver && !hasPlugin,
      'text-gray-300': hasPlugin
    }">
    <IconMdiFileUpload v-if="isDragOver && !hasPlugin" class="w-5 h-5" />
    <IconMdiMagnify v-else class="w-5 h-5" />
  </div>
</template>

<script setup lang="ts">
// @ts-ignore
import IconMdiFileUpload from '~icons/mdi/file-upload'
// @ts-ignore
import IconMdiMagnify from '~icons/mdi/magnify'

defineProps<{
  isDragOver: boolean
  hasPlugin: boolean
}>()
</script>

