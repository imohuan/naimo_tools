<template>
  <div class="h-full flex items-center gap-1" :style="noDragStyles">
    {{ app.ui.activePlugin?.options }}
    <!-- 插件设置按钮 - 仅在打开插件窗口时显示 -->
    <PluginSettingsButton
      v-if="app.ui.isPluginActive && app.ui.activePlugin?.pluginId"
      :plugin-id="app.ui.activePlugin.pluginId"
      :plugin-name="app.ui.activePlugin.name"
      :is-temporary="isTemporary"
      icon-type="dots"
      icon-width="10px"
    />

    <!-- 设置按钮 -->
    <div class="h-full aspect-square">
      <button
        class="w-full h-full p-3 text-gray-500 transition-colors duration-200 rounded-lg flex items-center justify-center"
        title="打开设置"
        @click="emit('click')"
      >
        <IconMdiCog class="w-5 h-5 hover:text-gray-700" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useApp } from "@/core";
import PluginSettingsButton from "@/components/Common/PluginSettingsButton.vue";
// @ts-ignore
import IconMdiCog from "~icons/mdi/cog";

defineProps<{
  noDragStyles?: Record<string, string>;
}>();

const emit = defineEmits<{
  click: [];
}>();

const app = useApp();

const isTemporary = computed(() => {
  return app.plugin.temporaryFullPaths.includes(
    app.ui.activePlugin?.fullPath || ""
  );
});
</script>
