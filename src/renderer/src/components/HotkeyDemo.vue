<template>
  <div class="w-full h-full p-6 bg-gray-50">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">快捷键管理系统演示</h1>

      <!-- 快捷键拦截组件 -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">快捷键拦截组件</h2>
        <div class="h-64 border-2 border-dashed border-gray-300 rounded-lg">
          <HotkeyInterceptor
            ref="hotkeyRef"
            :hotkey-type="HotkeyType.APPLICATION"
            scope="demo"
          />
        </div>
      </div>

      <!-- 快捷键管理 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 应用内快捷键 -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h3 class="text-lg font-semibold text-gray-700 mb-4">应用内快捷键</h3>
          <div class="space-y-3">
            <button
              @click="registerAppHotkey"
              class="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              注册 Ctrl+Shift+A
            </button>
            <button
              @click="registerAppHotkey2"
              class="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              注册 Ctrl+Shift+S
            </button>
            <button
              @click="clearAppHotkeys"
              class="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              清空应用快捷键
            </button>
          </div>
        </div>

        <!-- 全局快捷键 -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h3 class="text-lg font-semibold text-gray-700 mb-4">全局快捷键 (Electron)</h3>
          <div class="space-y-3">
            <button
              @click="registerGlobalHotkey"
              class="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
              注册全局 Ctrl+Alt+G
            </button>
            <button
              @click="registerGlobalHotkey2"
              class="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
            >
              注册全局 Ctrl+Alt+H
            </button>
            <button
              @click="clearGlobalHotkeys"
              class="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              清空全局快捷键
            </button>
          </div>
        </div>
      </div>

      <!-- 快捷键列表 -->
      <div class="mt-6 bg-white rounded-lg shadow-lg p-6">
        <h3 class="text-lg font-semibold text-gray-700 mb-4">已注册的快捷键</h3>
        <div class="space-y-2">
          <div
            v-for="hotkey in allHotkeys"
            :key="hotkey.id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded"
          >
            <div class="flex items-center space-x-4">
              <span class="font-mono text-sm bg-gray-200 px-2 py-1 rounded">{{
                hotkey.keys
              }}</span>
              <span class="text-sm text-gray-600">{{ hotkey.type }}</span>
              <span class="text-sm text-gray-500">{{
                hotkey.description || "无描述"
              }}</span>
            </div>
            <div class="flex items-center space-x-2">
              <span
                :class="[
                  'px-2 py-1 text-xs rounded',
                  hotkey.enabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500',
                ]"
              >
                {{ hotkey.enabled ? "启用" : "禁用" }}
              </span>
              <button
                @click="toggleHotkey(hotkey.id)"
                class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                切换
              </button>
              <button
                @click="removeHotkey(hotkey.id)"
                class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
          <div v-if="allHotkeys.length === 0" class="text-center text-gray-500 py-4">
            暂无快捷键
          </div>
        </div>
      </div>

      <!-- 日志输出 -->
      <div class="mt-6 bg-white rounded-lg shadow-lg p-6">
        <h3 class="text-lg font-semibold text-gray-700 mb-4">日志输出</h3>
        <div
          class="h-32 overflow-y-auto bg-gray-900 text-green-400 font-mono text-sm p-3 rounded"
        >
          <div v-for="(log, index) in logs" :key="index" class="mb-1">
            {{ log }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import HotkeyInterceptor from "./HotkeyInterceptor.vue";
import { useHotkeyManager, HotkeyType } from "../composables/useHotkeyManager";
import { useElectronHotkeys } from "../composables/useElectronHotkeys";

// 使用快捷键管理器
const { registerAppHotkey: registerAppHotkeyFunc } = useHotkeyManager();

// 使用Electron全局快捷键
const {
  globalHotkeys,
  registerGlobalHotkey: registerGlobalHotkeyFunc,
  clearAllGlobalHotkeys,
} = useElectronHotkeys();

// 组件引用
const hotkeyRef = ref<InstanceType<typeof HotkeyInterceptor>>();

// 日志
const logs = ref<string[]>([]);

// 添加日志
const addLog = (message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  logs.value.push(`[${timestamp}] ${message}`);
  if (logs.value.length > 50) {
    logs.value.shift();
  }
};

// 计算所有快捷键
const allHotkeys = computed(() => {
  return [...globalHotkeys.value];
});

// 注册应用内快捷键
const registerAppHotkey = () => {
  const success = registerAppHotkeyFunc(
    "ctrl+shift+a",
    () => {
      addLog("触发应用快捷键: Ctrl+Shift+A");
    },
    {
      id: "app_hotkey_1",
      description: "应用快捷键示例1",
    }
  );

  if (success) {
    addLog("注册应用快捷键: Ctrl+Shift+A");
  } else {
    addLog("注册应用快捷键失败: Ctrl+Shift+A");
  }
};

const registerAppHotkey2 = () => {
  const success = registerAppHotkeyFunc(
    "ctrl+shift+s",
    () => {
      addLog("触发应用快捷键: Ctrl+Shift+S");
    },
    {
      id: "app_hotkey_2",
      description: "应用快捷键示例2",
    }
  );

  if (success) {
    addLog("注册应用快捷键: Ctrl+Shift+S");
  } else {
    addLog("注册应用快捷键失败: Ctrl+Shift+S");
  }
};

// 注册全局快捷键
const registerGlobalHotkey = async () => {
  const success = await registerGlobalHotkeyFunc(
    "ctrl+alt+g",
    () => {
      addLog("触发全局快捷键: Ctrl+Alt+G");
    },
    {
      id: "global_hotkey_1",
      description: "全局快捷键示例1",
    }
  );

  if (success) {
    addLog("注册全局快捷键: Ctrl+Alt+G");
  } else {
    addLog("注册全局快捷键失败: Ctrl+Alt+G");
  }
};

const registerGlobalHotkey2 = async () => {
  const success = await registerGlobalHotkeyFunc(
    "ctrl+alt+h",
    () => {
      addLog("触发全局快捷键: Ctrl+Alt+H");
    },
    {
      id: "global_hotkey_2",
      description: "全局快捷键示例2",
    }
  );

  if (success) {
    addLog("注册全局快捷键: Ctrl+Alt+H");
  } else {
    addLog("注册全局快捷键失败: Ctrl+Alt+H");
  }
};

// 清空快捷键
const clearAppHotkeys = () => {
  addLog("清空所有应用快捷键");
};

const clearGlobalHotkeys = async () => {
  await clearAllGlobalHotkeys();
  addLog("清空所有全局快捷键");
};

// 切换快捷键状态
const toggleHotkey = (id: string) => {
  const hotkey = allHotkeys.value.find((h) => h.id === id);
  if (hotkey) {
    hotkey.enabled = !hotkey.enabled;
    addLog(`切换快捷键状态: ${hotkey.keys} -> ${hotkey.enabled ? "启用" : "禁用"}`);
  }
};

// 删除快捷键
const removeHotkey = (id: string) => {
  const hotkey = allHotkeys.value.find((h) => h.id === id);
  if (hotkey) {
    if (hotkey.type === HotkeyType.GLOBAL) {
      // 删除全局快捷键
      const index = globalHotkeys.value.findIndex((h) => h.id === id);
      if (index > -1) {
        globalHotkeys.value.splice(index, 1);
      }
    } else {
      // 删除应用快捷键
      // const index = savedHotkeys.value.findIndex((h) => h.id === id);
      // if (index > -1) {
      //   savedHotkeys.value.splice(index, 1);
      // }
    }
    addLog(`删除快捷键: ${hotkey.keys}`);
  }
};

// 初始化
onMounted(() => {
  addLog("快捷键管理系统已初始化");
});
</script>
