<template>
  <div class="space-y-4">
    <!-- 应用程序信息 -->
    <div class="bg-white rounded-lg border border-gray-200 p-4">
      <div class="flex items-start space-x-6">
        <!-- 应用图标 -->
        <div class="flex-shrink-0">
          <div
            class="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <IconMdiApplication class="w-10 h-10 text-white" />
          </div>
        </div>

        <!-- 应用信息 -->
        <div class="flex-1">
          <h1 class="text-xl font-semibold text-gray-900 mb-2">Naimo</h1>
          <p class="text-sm text-gray-600 mb-4">智能应用程序启动器</p>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium text-gray-700">版本：</span>
              <span class="text-gray-600">{{ appVersion }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">构建日期：</span>
              <span class="text-gray-600">{{ buildDate }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Electron：</span>
              <span class="text-gray-600">{{ electronVersion }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Node.js：</span>
              <span class="text-gray-600">{{ nodeVersion }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 功能特性 -->
    <div class="bg-white rounded-lg border border-gray-200 p-4">
      <h2 class="text-base font-medium text-gray-900 mb-3">功能特性</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex items-start space-x-3">
          <IconMdiLightningBolt class="w-5 h-5 text-yellow-500 mt-1" />
          <div>
            <h3 class="font-medium text-gray-900">快速启动</h3>
            <p class="text-sm text-gray-600">通过全局快捷键快速启动应用程序</p>
          </div>
        </div>
        <div class="flex items-start space-x-3">
          <IconMdiMagnify class="w-5 h-5 text-blue-500 mt-1" />
          <div>
            <h3 class="font-medium text-gray-900">智能搜索</h3>
            <p class="text-sm text-gray-600">支持模糊搜索，快速找到目标应用</p>
          </div>
        </div>
        <div class="flex items-start space-x-3">
          <IconMdiDrag class="w-5 h-5 text-green-500 mt-1" />
          <div>
            <h3 class="font-medium text-gray-900">拖拽管理</h3>
            <p class="text-sm text-gray-600">支持拖拽操作，轻松管理应用分类</p>
          </div>
        </div>
        <div class="flex items-start space-x-3">
          <IconMdiKeyboard class="w-5 h-5 text-purple-500 mt-1" />
          <div>
            <h3 class="font-medium text-gray-900">快捷键支持</h3>
            <p class="text-sm text-gray-600">丰富的快捷键操作，提高工作效率</p>
          </div>
        </div>
        <div class="flex items-start space-x-3">
          <IconMdiPuzzle class="w-5 h-5 text-indigo-500 mt-1" />
          <div>
            <h3 class="font-medium text-gray-900">自动发现</h3>
            <p class="text-sm text-gray-600">自动扫描并发现系统中的应用程序</p>
          </div>
        </div>
        <div class="flex items-start space-x-3">
          <IconMdiCog class="w-5 h-5 text-gray-500 mt-1" />
          <div>
            <h3 class="font-medium text-gray-900">高度可定制</h3>
            <p class="text-sm text-gray-600">支持自定义快捷键和个性化设置</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 技术栈 -->
    <div class="bg-white rounded-lg border border-gray-200 p-4">
      <h2 class="text-base font-medium text-gray-900 mb-3">技术栈</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <div class="text-2xl font-bold text-green-600 mb-1">Electron</div>
          <div class="text-sm text-gray-600">跨平台桌面应用框架</div>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <div class="text-2xl font-bold text-blue-600 mb-1">Vue 3</div>
          <div class="text-sm text-gray-600">现代化前端框架</div>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <div class="text-2xl font-bold text-yellow-600 mb-1">TypeScript</div>
          <div class="text-sm text-gray-600">类型安全的 JavaScript</div>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <div class="text-2xl font-bold text-purple-600 mb-1">Tailwind CSS</div>
          <div class="text-sm text-gray-600">实用优先的 CSS 框架</div>
        </div>
      </div>
    </div>

    <!-- 开发者信息 -->
    <div class="bg-white rounded-lg border border-gray-200 p-4">
      <h2 class="text-base font-medium text-gray-900 mb-3">开发者信息</h2>
      <div class="space-y-4">
        <div class="flex items-center space-x-3">
          <IconMdiAccount class="w-5 h-5 text-gray-500" />
          <div>
            <span class="font-medium text-gray-700">开发者：</span>
            <span class="text-gray-600">imohuan</span>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <IconMdiGithub class="w-5 h-5 text-gray-500" />
          <div>
            <span class="font-medium text-gray-700">GitHub：</span>
            <a href="https://github.com/imohuan/electron-vue3-template" target="_blank"
              class="text-blue-600 hover:text-blue-800 underline">
              electron-vue3-template
            </a>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <IconMdiLicense class="w-5 h-5 text-gray-500" />
          <div>
            <span class="font-medium text-gray-700">许可证：</span>
            <span class="text-gray-600">MIT License</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 更新信息 -->
    <div class="bg-white rounded-lg border border-gray-200 p-4">
      <h2 class="text-base font-medium text-gray-900 mb-3">更新信息</h2>
      <div class="space-y-3">
        <div class="flex items-start space-x-3">
          <div class="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
          <div>
            <div class="font-medium text-gray-900">v0.0.1 (当前版本)</div>
            <div class="text-sm text-gray-600 mt-1">
              <ul class="list-disc list-inside space-y-1">
                <li>初始版本发布</li>
                <li>支持应用程序快速启动</li>
                <li>实现智能搜索功能</li>
                <li>添加拖拽管理功能</li>
                <li>支持全局快捷键</li>
                <li>提供设置页面</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 致谢 -->
    <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-4">
      <h2 class="text-base font-medium text-gray-900 mb-3">致谢</h2>
      <p class="text-gray-700 leading-relaxed">
        感谢所有开源项目的贡献者，特别是 Electron、Vue.js、TypeScript 等优秀的技术栈。
        这个项目基于 <a href="https://github.com/imohuan/electron-vue3-template" target="_blank"
          class="text-blue-600 hover:text-blue-800 underline">electron-vue3-template</a> 模板构建，
        旨在为用户提供一个高效、美观的应用程序启动器。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
/** @ts-ignore */
import IconMdiApplication from "~icons/mdi/application";
/** @ts-ignore */
import IconMdiLightningBolt from "~icons/mdi/lightning-bolt";
/** @ts-ignore */
import IconMdiMagnify from "~icons/mdi/magnify";
/** @ts-ignore */
import IconMdiDrag from "~icons/mdi/drag";
/** @ts-ignore */
import IconMdiKeyboard from "~icons/mdi/keyboard";
/** @ts-ignore */
import IconMdiPuzzle from "~icons/mdi/puzzle";
/** @ts-ignore */
import IconMdiCog from "~icons/mdi/cog";
/** @ts-ignore */
import IconMdiAccount from "~icons/mdi/account";
/** @ts-ignore */
import IconMdiGithub from "~icons/mdi/github";
/** @ts-ignore */
import IconMdiLicense from "~icons/mdi/license";

// 应用信息
const appVersion = ref("0.0.1");
const buildDate = ref("2024-01-01");
const electronVersion = ref("38.0.0");
const nodeVersion = ref("20.0.0");

// 获取系统信息
const getSystemInfo = async () => {
  try {
    // 这里可以通过 IPC 获取更详细的系统信息
    // 暂时使用默认值
    console.log("获取系统信息");
  } catch (error) {
    console.error("获取系统信息失败:", error);
  }
};

// 生命周期
onMounted(() => {
  getSystemInfo();
});
</script>

<style scoped>
/* 自定义链接样式 */
a {
  transition: color 0.2s ease;
}

/* 图标动画 */
.icon-hover:hover {
  transform: scale(1.1);
  transition: transform 0.2s ease;
}
</style>
