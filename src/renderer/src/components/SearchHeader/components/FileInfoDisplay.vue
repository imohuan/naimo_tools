<template>
  <div class="h-full flex items-center p-2">
    <div class="h-full p-2 flex items-center space-x-1 border border-gray-200 bg-gray-50 rounded-md">
      <div class="p-1">
        <IconDisplay :src="firstFile?.icon" :alt="firstFile?.name" 
          icon-class="w-5 h-5 object-cover" fallback-class="w-5 h-5 flex items-center justify-center">
          <template #fallback>
            <IconMdiFile class="w-4 h-4 text-gray-500" />
          </template>
        </IconDisplay>
      </div>

      <div class="flex items-center justify-center gap-2">
        <span class="text-sm font-medium text-gray-700 truncate max-w-24" :title="firstFile?.name">
          {{ firstFile?.name }}
        </span>
        <span v-if="fileCount > 1" class="font-mono bg-gray-400 rounded-md text-white px-2 text-xs">
          {{ fileCount }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import IconDisplay from '@/components/IconDisplay.vue'
// @ts-ignore
import IconMdiFile from '~icons/mdi/file'
import type { AttachedFile } from '@/typings/composableTypes'

const props = defineProps<{
  files: AttachedFile[]
}>()

const firstFile = computed(() => props.files[0] || null)
const fileCount = computed(() => props.files.length)
</script>

