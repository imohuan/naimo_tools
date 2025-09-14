<template>
  <div class="w-full h-full flex bg-gray-50 min-h-0">
    <!-- 左侧菜单栏 -->
    <div class="w-48 bg-white border-r border-gray-200 flex flex-col">
      <!-- 设置标题 -->
      <div class="p-4 border-b border-gray-200">
        <h1 class="text-lg font-semibold text-gray-900">设置</h1>
      </div>

      <!-- 菜单项 -->
      <nav class="flex-1 p-3">
        <ul class="space-y-1">
          <li>
            <button
              @click="activeTab = 'hotkeys'"
              :class="[
                'w-full text-left px-3 py-2 rounded-lg transition-colors',
                activeTab === 'hotkeys'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-100',
              ]"
            >
              <div class="flex items-center">
                <IconMdiKeyboard class="w-4 h-4 mr-2" />
                <span class="text-sm font-medium">快捷键设置</span>
              </div>
            </button>
          </li>
          <li>
            <button
              @click="activeTab = 'about'"
              :class="[
                'w-full text-left px-3 py-2 rounded-lg transition-colors',
                activeTab === 'about'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-100',
              ]"
            >
              <div class="flex items-center">
                <IconMdiInformation class="w-4 h-4 mr-2" />
                <span class="text-sm font-medium">关于</span>
              </div>
            </button>
          </li>
        </ul>
      </nav>
    </div>

    <!-- 右侧内容区域 -->
    <div class="flex-1 flex flex-col">
      <!-- 内容头部 -->
      <div
        class="p-3 border-b border-gray-200 bg-white flex items-center justify-between"
      >
        <div>
          <h2 class="text-base font-medium text-gray-900">
            {{ getTabTitle() }}
          </h2>
          <p class="text-xs text-gray-600 mt-1">
            {{ getTabDescription() }}
          </p>
        </div>
        <button
          @click="closeSettings"
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="关闭设置"
        >
          <IconMdiClose class="w-6 h-6" />
        </button>
      </div>

      <!-- 内容主体 -->
      <div
        class="flex-1 p-3 relative"
        :class="isEditingHotkey ? 'overflow-hidden' : 'overflow-auto'"
      >
        <HotkeySettings v-if="activeTab === 'hotkeys'" ref="hotkeySettingsRef" />
        <About v-if="activeTab === 'about'" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
/** @ts-ignore */
import IconMdiKeyboard from "~icons/mdi/keyboard";
/** @ts-ignore */
import IconMdiInformation from "~icons/mdi/information";
/** @ts-ignore */
import IconMdiClose from "~icons/mdi/close";
import HotkeySettings from "./HotkeySettings.vue";
import About from "./About.vue";

// 事件定义
interface Emits {
  (e: "close"): void;
}

const emit = defineEmits<Emits>();

// 当前激活的标签页
const activeTab = ref<"hotkeys" | "about">("hotkeys");

// 组件引用
const hotkeySettingsRef = ref<InstanceType<typeof HotkeySettings>>();

// 计算编辑状态
const isEditingHotkey = computed(() => {
  return hotkeySettingsRef.value?.isEditingHotkey || false;
});

// 获取标签页标题
const getTabTitle = () => {
  switch (activeTab.value) {
    case "hotkeys":
      return "快捷键设置";
    case "about":
      return "关于 Naimo";
    default:
      return "";
  }
};

// 获取标签页描述
const getTabDescription = () => {
  switch (activeTab.value) {
    case "hotkeys":
      return "配置应用程序的快捷键，提高操作效率";
    case "about":
      return "了解 Naimo 应用程序的详细信息";
    default:
      return "";
  }
};

// 关闭设置
const closeSettings = () => {
  emit("close");
};
</script>

<style scoped>
/* 自定义滚动条样式 */
.overflow-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
