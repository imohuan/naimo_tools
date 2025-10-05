<template>
  <div class="h-full flex items-center p-2">
    <div class="h-full p-2 flex items-center space-x-1 border border-indigo-200 bg-indigo-50 rounded-md">
      <div class="p-1 flex items-center justify-center">
        <IconDisplay :src="pluginItem?.icon" :alt="pluginItem?.name"
          icon-class="w-4 h-4 object-cover" fallback-class="w-5 h-5 flex items-center justify-center">
          <template #fallback>
            <IconMdiPuzzle class="w-4 h-4 text-indigo-500" />
          </template>
        </IconDisplay>
      </div>

      <div class="flex items-center justify-center gap-2">
        <span class="text-sm font-medium text-indigo-700 truncate max-w-24" :title="pluginItem?.name">
          {{ pluginItem?.name }}
        </span>
        <span class="font-mono bg-indigo-400 rounded-md text-white px-2 text-xs">
          插件
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconDisplay from '@/components/IconDisplay.vue'
// @ts-ignore
import IconMdiPuzzle from '~icons/mdi/puzzle'
import type { PluginItem } from '@/typings/pluginTypes'

defineProps<{
  pluginItem: PluginItem | null
}>()
</script>

