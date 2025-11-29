<template>
  <div
    class="relative bg-white/95 rounded-lg border border-gray-100 p-2 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer"
    :class="{ 'opacity-60': !plugin.enabled }"
    @click="$emit('click', plugin)"
  >
    <!-- 临时标签 -->
    <div
      v-if="pluginStore.isOfficialPlugin(plugin.id)"
      class="absolute inset-0 overflow-hidden pointer-events-none"
    >
      <div
        class="absolute bg-blue-500 text-white text-[8px] px-10 py-0.5 z-20 shadow-md temp-ribbon"
      >
        官方
      </div>
    </div>

    <!-- 插件头部信息 -->
    <div class="flex items-start gap-2">
      <div class="w-8 h-8 flex-shrink-0">
        <IconDisplay
          :src="plugin.icon"
          :alt="plugin.name"
          icon-class="w-full h-full object-contain flex  items-center justify-center"
          fallback-class="w-full h-full flex items-center justify-center rounded"
        >
          <template #fallback>
            <span class="text-sm">🔌</span>
          </template>
        </IconDisplay>
      </div>
      <div class="w-full flex-1 min-w-0">
        <div
          class="w-full flex items-center justify-between mb-2 overflow-hidden"
        >
          <div class="w-full flex items-center gap-1 overflow-hidden">
            <h3
              class="inline-block flex-1 truncate text font-semibold text-gray-900"
            >
              {{ plugin.name }}
            </h3>
            <span
              class="bg-gray-100 px-2 py-1 rounded text-xs transform scale-75 origin-center-left inline-block"
              >v{{ plugin.version }}</span
            >
          </div>
          <!-- 安装/卸载/更新图标按钮 -->
          <div class="flex items-center gap-1" @click.stop>
            <!-- 更新按钮（已安装且有新版本） -->
            <button
              v-if="isInstalled && hasUpdate"
              @click.stop="$emit('update', plugin)"
              :disabled="isLoading"
              class="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :title="
                isLoading ? '更新中...' : `有新版本可用: ${plugin.version}`
              "
            >
              <div v-if="isLoading" class="animate-spin text-blue-500">
                <svg class="w-4 h-4" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="2"
                    fill="none"
                    stroke-dasharray="31.416"
                    class="transition-all duration-300"
                  />
                </svg>
              </div>
              <IconMdiUpdate v-else class="w-4 h-4" />
            </button>

            <!-- 安装按钮（未安装状态） -->
            <button
              v-if="!isInstalled"
              @click.stop="$emit('install', plugin)"
              :disabled="isLoading"
              class="p-1.5 text-green-500 hover:bg-green-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :title="isLoading ? '安装中...' : '安装插件'"
            >
              <div v-if="isLoading" class="animate-spin text-green-500">
                <svg class="w-4 h-4" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="2"
                    fill="none"
                    stroke-dasharray="31.416"
                    class="transition-all duration-300"
                  />
                </svg>
              </div>
              <IconMdiDownload v-else class="w-4 h-4" />
            </button>

            <!-- 卸载按钮（已安装状态） -->
            <button
              v-else-if="!hasUpdate"
              @click.stop="$emit('uninstall', plugin.id)"
              :disabled="isLoading"
              class="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="卸载插件"
            >
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
import IconDisplay from "@/components/Common/IconDisplay.vue";
import type { PluginConfig } from "@/typings/pluginTypes";
/** @ts-ignore */
import IconMdiDownload from "~icons/mdi/download";
/** @ts-ignore */
import IconMdiDeleteOutline from "~icons/mdi/delete-outline";
/** @ts-ignore */
import IconMdiUpdate from "~icons/mdi/update";
import { usePluginStoreNew } from "@/core";

interface Props {
  plugin: PluginConfig;
  isInstalled: boolean;
  isLoading?: boolean;
  hasUpdate?: boolean;
}

defineProps<Props>();

defineEmits<{
  click: [plugin: PluginConfig];
  install: [plugin: PluginConfig];
  uninstall: [pluginId: string];
  update: [plugin: PluginConfig];
}>();

const pluginStore = usePluginStoreNew();
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

.temp-ribbon {
  transform: rotate(45deg);
  transform-origin: center;
  position: absolute;
  bottom: 10px;
  left: -30px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
</style>
