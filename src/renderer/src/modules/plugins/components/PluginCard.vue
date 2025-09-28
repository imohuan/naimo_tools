<template>
  <div
    class="bg-white rounded-lg border border-gray-200 p-2 hover:border-gray-500 transition-all duration-200 cursor-pointer"
    :class="{ 'opacity-60': !plugin.enabled }" @click="$emit('click', plugin)">
    <!-- 插件头部信息 -->
    <div class="flex items-start gap-2">
      <div class="w-8 h-8 flex-shrink-0">
        <IconDisplay :src="plugin.icon" :alt="plugin.name"
          icon-class="w-full h-full object-contain flex  items-center justify-center"
          fallback-class="w-full h-full flex items-center justify-center rounded">
          <template #fallback>
            <span class="text-sm">🔌</span>
          </template>
        </IconDisplay>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <h3 class="text font-semibold text-gray-900">
              {{ plugin.name }}
              <span class="bg-gray-100 px-2 py-1 rounded text-xs transform scale-75 origin-center-left inline-block">v{{
                plugin.version }}</span>
            </h3>
          </div>
          <!-- 安装/卸载图标按钮 -->
          <div class="flex items-center gap-1">
            <!-- 安装按钮（未安装状态） -->
            <div v-if="!isInstalled" class="relative">
              <button @click.stop="$emit('install', plugin)" :disabled="isInstalling"
                class="p-1.5 text-green-500 hover:bg-green-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :title="isInstalling ? '安装中...' : '安装插件'">
                <!-- 安装进度显示 -->
                <div v-if="isInstalling" class="relative">
                  <div class="animate-spin text-green-500">
                    <svg class="w-4 h-4" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"
                        stroke-dasharray="31.416" :stroke-dashoffset="31.416 * (1 - (installProgress || 0) / 100)"
                        class="transition-all duration-300" />
                    </svg>
                  </div>
                  <!-- 进度百分比（如果有） -->
                  <div v-if="installProgress !== undefined"
                    class="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-green-600 whitespace-nowrap">
                    {{ Math.round(installProgress) }}%
                  </div>
                </div>
                <!-- 默认下载图标 -->
                <IconMdiDownload v-else class="w-4 h-4" />
              </button>
            </div>
            <!-- 卸载按钮（已安装状态） -->
            <button v-else @click.stop="$emit('uninstall', plugin.id)"
              class="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="卸载插件">
              <IconMdiDeleteOutline class="w-4 h-4" />
            </button>
          </div>
        </div>
        <p class="text-xs text-gray-600 mb-3 line-clamp-2">
          {{ plugin.description || "暂无描述" }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconDisplay from "@/components/IconDisplay.vue";
import type { PluginConfig } from "@/typings/pluginTypes";

interface Props {
  plugin: PluginConfig;
  isInstalled: boolean;
  isInstalling?: boolean;
  installProgress?: number;
}

defineProps<Props>();

defineEmits<{
  click: [plugin: PluginConfig];
  install: [plugin: PluginConfig];
  uninstall: [pluginId: string];
}>();
</script>

<style scoped>
/* 自定义样式，用于文本截断 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
