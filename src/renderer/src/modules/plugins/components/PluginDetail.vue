<template>
  <div class="h-full flex flex-col bg-gray-50 mb-3">
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 h-full overflow-hidden">
      <!-- 详情页面头部 -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <div class="flex items-center gap-2">
          <div class="w-10 h-10">
            <IconDisplay :src="plugin.icon" :alt="plugin.name"
              icon-class="w-full h-full object-contain flex items-center justify-center"
              fallback-class="w-full h-full flex items-center justify-center rounded">
              <template #fallback>
                <span class="text-xl">🔌</span>
              </template>
            </IconDisplay>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">{{ plugin.name }}</h2>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-600">
                v{{ plugin.version }}
              </span>
              <span v-if="plugin.author" class="text-xs text-gray-500">
                作者: {{ plugin.author }}
              </span>
            </div>
          </div>
        </div>
        <button @click="$emit('close')"
          class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="关闭">
          <IconMdiClose class="w-5 h-5" />
        </button>
      </div>

      <!-- 详情页面内容 -->
      <div class="flex-1 p-4 overflow-y-auto">
        <!-- 描述 -->
        <div class="mb-4">
          <h3 class="text-base font-medium text-gray-900 mb-2">描述</h3>
          <p class="text-sm text-gray-700 leading-relaxed">
            {{ plugin.description || "暂无描述" }}
          </p>
        </div>

        <!-- 插件项目列表 -->
        <div v-if="plugin.items && plugin.items.length > 0" class="mb-4">
          <h3 class="text-base font-medium text-gray-900 mb-2">功能项目</h3>
          <div class="space-y-1.5">
            <div v-for="(item, index) in plugin.items" :key="index" class="bg-gray-50 rounded-md p-2.5">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium text-gray-900">{{ item.name }}</span>
                <span class="text-xs text-gray-500">{{ item.path || "无路径" }}</span>
              </div>
              <div v-if="item.executeParams" class="text-xs text-gray-600">
                <span v-if="item.executeParams.url">URL: {{ item.executeParams.url }}</span>
                <span v-else-if="item.executeParams.code">自定义代码</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 插件配置选项 -->
        <div v-if="plugin.options && Object.keys(plugin.options).length > 0" class="mb-4">
          <h3 class="text-base font-medium text-gray-900 mb-2">配置选项</h3>
          <div class="space-y-2">
            <div v-for="(option, key) in plugin.options" :key="key" class="bg-gray-50 rounded-md p-2.5">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium text-gray-900">{{ key }}</span>
                <span class="text-xs text-gray-500">{{ typeof option }}</span>
              </div>
              <div class="mt-1">
                <span class="text-xs text-gray-500">值: </span>
                <code class="text-xs bg-white px-1.5 py-0.5 rounded border">
            {{ JSON.stringify(option) }}
          </code>
              </div>
            </div>
          </div>
        </div>

        <!-- 安装状态和操作 -->
        <div class="border-t border-gray-200 pt-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-2.5 h-2.5 rounded-full" :class="isInstalled ? 'bg-green-500' : 'bg-gray-300'"></div>
              <span class="text-sm text-gray-600">
                {{ isInstalled ? "已安装" : "未安装" }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button v-if="!isInstalled" @click="$emit('install', plugin)"
                class="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors flex items-center gap-1.5">
                <IconMdiDownload class="w-4 h-4" />
                安装插件
              </button>
              <button v-else @click="$emit('uninstall', plugin.id)"
                class="px-3 py-1.5 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors flex items-center gap-1.5">
                <IconMdiDeleteOutline class="w-4 h-4" />
                卸载插件
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconDisplay from "@/components/IconDisplay.vue";
import type { PluginConfig } from "@/typings/plugin-types";

interface Props {
  plugin: PluginConfig;
  isInstalled: boolean;
}

defineProps<Props>();

defineEmits<{
  close: [];
  install: [plugin: PluginConfig];
  uninstall: [pluginId: string];
}>();
</script>
