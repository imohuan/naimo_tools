<template>
  <div class="relative w-full h-full flex bg-gray-50 min-h-0">
    <GithubToken />

    <!-- 左侧菜单栏 -->
    <div class="w-48 bg-white border-r border-gray-200 flex flex-col">
      <!-- 设置标题 -->
      <div class="p-4 border-b border-gray-200">
        <h1 class="text-lg font-semibold text-gray-900">设置</h1>
      </div>

      <!-- 菜单项 -->
      <nav class="flex-1 p-3">
        <ul class="space-y-1">
          <li v-for="tab in tabsConfig" :key="tab.id">
            <button @click="activeTab = tab.id" tabindex="-1" :class="[
              'w-full text-left px-3 py-2 rounded-lg transition-colors border border-transparent',
              activeTab === tab.id
                ? 'bg-blue-100 text-blue-700 border-blue-200'
                : 'text-gray-700 hover:bg-gray-100',
            ]">
              <div class="flex items-center">
                <component :is="tab.icon" class="w-4 h-4 mr-2" />
                <span class="text-sm font-medium">{{ tab.title }}</span>
              </div>
            </button>
          </li>
        </ul>
      </nav>
    </div>

    <!-- 右侧内容区域 -->
    <div class="flex-1 flex flex-col">
      <!-- 内容头部 -->
      <div class="p-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <div>
          <h2 class="text-base font-medium text-gray-900">
            {{ getTabTitle() }}
          </h2>
          <p class="text-xs text-gray-600 mt-1">
            {{ getTabDescription() }}
          </p>
        </div>
        <button @click="closeSettings" tabindex="-1"
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="关闭设置">
          <IconMdiClose class="w-6 h-6" />
        </button>
      </div>

      <!-- 内容主体 -->
      <div class="flex-1 p-3 relative" :class="isEditingHotkey ? 'overflow-hidden' : 'overflow-auto'">
        <component :is="currentTabConfig.component" :ref="activeTab === 'hotkeys' ? 'hotkeySettingsRef' : undefined" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
/** @ts-ignore */
import IconMdiKeyboard from "~icons/mdi/keyboard";
/** @ts-ignore */
import IconMdiPuzzle from "~icons/mdi/puzzle";
/** @ts-ignore */
import IconMdiCog from "~icons/mdi/cog";
/** @ts-ignore */
import IconMdiInformation from "~icons/mdi/information";
/** @ts-ignore */
import IconMdiClose from "~icons/mdi/close";
/** @ts-ignore */
import IconMdiSettings from "~icons/mdi/settings";
/** @ts-ignore */
import IconMdiDownload from "~icons/mdi/download";

import HotkeySettings from "@/components/Hotkeys/HotkeySettings.vue";
import PluginManager from "@/components/Plugins/PluginManager.vue";
import PluginSettings from "@/components/Plugins/PluginSettings.vue";
import CustomHotkeys from "@/components/Hotkeys/CustomHotkeys.vue";
import DownloadManager from "@/components/Downloads/DownloadManager.vue";

import About from "@/components/About/About.vue";
import GithubToken from "@/components/GithubToken/GithubToken.vue";

// 标签页配置
interface TabConfig {
  id: string;
  title: string;
  description: string;
  icon: any;
  component: any;
}

const tabsConfig: TabConfig[] = [
  {
    id: "plugins",
    title: "插件管理",
    description: "管理插件，扩展应用程序功能",
    icon: IconMdiPuzzle,
    component: PluginManager
  },
  {
    id: "plugin-settings",
    title: "插件设置",
    description: "配置已安装插件的个性化设置",
    icon: IconMdiSettings,
    component: PluginSettings
  },
  {
    id: "hotkeys",
    title: "快捷键设置",
    description: "配置应用程序的快捷键，提高操作效率",
    icon: IconMdiKeyboard,
    component: HotkeySettings
  },
  {
    id: "custom",
    title: "自定义快捷键",
    description: "创建和管理您的自定义快捷键",
    icon: IconMdiCog,
    component: CustomHotkeys
  },
  {
    id: "downloads",
    title: "下载",
    description: "管理文件下载任务，监控下载进度",
    icon: IconMdiDownload,
    component: DownloadManager
  },
  {
    id: "about",
    title: "关于",
    description: "了解 Naimo 应用程序的详细信息",
    icon: IconMdiInformation,
    component: About
  },
];

// 当前激活的标签页
const activeTab = ref<string>("plugins");

// 组件引用
const hotkeySettingsRef = ref<InstanceType<typeof HotkeySettings>>();

// 计算编辑状态
const isEditingHotkey = computed(() => {
  return hotkeySettingsRef.value?.isEditingHotkey || false;
});

// 获取当前标签页配置
const currentTabConfig = computed(() => {
  return tabsConfig.find(tab => tab.id === activeTab.value) || tabsConfig[0];
});

// 获取标签页标题
const getTabTitle = () => {
  return currentTabConfig.value.title;
};

// 获取标签页描述
const getTabDescription = () => {
  return currentTabConfig.value.description;
};

// 关闭设置 - 通知主进程关闭此 WebContentsView
const closeSettings = async () => {
  try {
    // 通过 IPC 通知主进程关闭设置页面视图
    if (window.naimo?.router && 'windowCloseSettingsView' in window.naimo.router) {
      await (window.naimo.router as any).windowCloseSettingsView();
    } else {
      // 降级处理：发送关闭消息给主进程
      console.warn('IPC 方法不可用，尝试替代方案');
      // 这里可以通过其他方式通知主进程，比如自定义事件
      window.dispatchEvent(new CustomEvent('settings-close-requested'));
    }
  } catch (error) {
    console.error('关闭设置页面失败:', error);
    // 最后的降级处理
    window.close();
  }
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

