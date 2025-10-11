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
          <li v-for="route in routes" :key="route.name">
            <router-link
              :to="route.path"
              custom
              v-slot="{ navigate, isActive }"
            >
              <button
                @click="navigate"
                tabindex="-1"
                :class="[
                  'w-full text-left px-3 py-2 rounded-lg transition-colors border border-transparent',
                  isActive
                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                    : 'text-gray-700 hover:bg-gray-100',
                ]"
              >
                <div class="flex items-center">
                  <component
                    :is="getIcon(route.meta?.icon as string)"
                    class="w-4 h-4 mr-2"
                  />
                  <span class="text-sm font-medium">{{
                    route.meta?.title
                  }}</span>
                </div>
              </button>
            </router-link>
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
            {{ currentRoute?.meta?.title || "设置" }}
          </h2>
          <p class="text-xs text-gray-600 mt-1">
            {{ currentRoute?.meta?.description || "" }}
          </p>
        </div>
        <!-- <button
          @click="closeSettings"
          tabindex="-1"
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="关闭设置"
        >
          <IconMdiClose class="w-6 h-6" />
        </button> -->
      </div>

      <!-- 内容主体 - 使用 router-view 和 keep-alive -->
      <div class="flex-1 p-3 relative overflow-auto">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";
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

import GithubToken from "./components/GithubToken.vue";

// 使用路由
const router = useRouter();
const route = useRoute();

// 获取所有路由（排除重定向路由）
const routes = computed(() => {
  return router.getRoutes().filter((r) => r.path !== "/" && r.name);
});

// 当前路由
const currentRoute = computed(() => route);

// 图标映射
const iconMap: Record<string, any> = {
  "mdi:keyboard": IconMdiKeyboard,
  "mdi:puzzle": IconMdiPuzzle,
  "mdi:cog": IconMdiCog,
  "mdi:information": IconMdiInformation,
  "mdi:settings": IconMdiSettings,
  "mdi:download": IconMdiDownload,
};

// 获取图标组件
const getIcon = (icon?: string) => {
  if (!icon) return IconMdiSettings;
  return iconMap[icon] || IconMdiSettings;
};

// 关闭设置 - 通知主进程关闭此 WebContentsView
const closeSettings = async () => {
  try {
    // 通过 IPC 通知主进程关闭设置页面视图
    if (
      window.naimo?.router &&
      "windowCloseSettingsView" in window.naimo.router
    ) {
      await (window.naimo.router as any).windowCloseSettingsView();
    } else {
      // 降级处理：发送关闭消息给主进程
      console.warn("IPC 方法不可用，尝试替代方案");
      // 这里可以通过其他方式通知主进程，比如自定义事件
      window.dispatchEvent(new CustomEvent("settings-close-requested"));
    }
  } catch (error) {
    console.error("关闭设置页面失败:", error);
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
