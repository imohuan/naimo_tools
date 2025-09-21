<template>
  <div class="min-h-full flex flex-col space-y-4">

    <!-- 快捷键列表 -->
    <div v-if="customHotkeys.length > 0" class="space-y-2">
      <div v-for="(hotkey, index) in customHotkeys" :key="hotkey.id"
        class="bg-white rounded-lg border border-gray-200 px-4 py-2">
        <div class="flex items-center space-x-4">
          <!-- 序号 -->
          <div class="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <span class="text-sm font-medium text-gray-600">{{ index + 1 }}</span>
          </div>

          <!-- 输入框 -->
          <div class="flex-1">
            <input v-model="hotkey.name" placeholder="输入快捷键名称"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @blur="updateHotkeyName(hotkey)" @keydown.enter.stop="updateHotkeyName(hotkey)" />
          </div>

          <!-- 快捷键监听面板 -->
          <div class="flex-shrink-0">
            <div
              class="w-48 h-10 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
              @click="startListeningHotkey(hotkey)">
              <div class="w-full h-full flex items-center justify-center">
                <div v-if="hotkey.keys" class="flex items-center space-x-1">
                  <kbd v-for="key in hotkey.keys.split('+')" :key="key"
                    class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                    {{ formatKeyDisplay(key) }}
                  </kbd>
                </div>
                <div v-else class="text-xs text-gray-400">
                  {{
                    isListening && currentListeningId === hotkey.id
                      ? "正在监听..."
                      : "点击设置快捷键"
                  }}
                </div>
              </div>
            </div>
          </div>

          <!-- 开关 -->
          <div class="flex-shrink-0">
            <label class="flex items-center">
              <input type="checkbox" v-model="hotkey.enabled" @change="toggleHotkey(hotkey)"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" />
              <span class="ml-2 text-sm text-gray-700">启用</span>
            </label>
          </div>

          <!-- 删除按钮 -->
          <div class="flex-shrink-0">
            <button @click="removeCustomHotkey(hotkey.id)"
              class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="删除快捷键">
              <IconMdiDelete class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态和添加占位符 -->
    <div v-else class="space-y-4">
      <!-- 空状态提示 -->
      <div class="text-center py-8">
        <IconMdiKeyboard class="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">暂无自定义快捷键</h3>
        <p class="text-sm text-gray-500">点击下方区域添加您的第一个自定义快捷键</p>
      </div>

      <!-- 添加占位符 -->
      <div @click="addCustomHotkey"
        class="w-full h-20 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:border-gray-400 hover:bg-gray-100 cursor-pointer transition-all duration-200 flex items-center justify-center">
        <div class="flex items-center space-x-2 text-gray-400 hover:text-gray-600">
          <IconMdiPlus class="w-6 h-6" />
          <span class="text-sm font-medium">点击添加自定义快捷键</span>
        </div>
      </div>
    </div>

    <!-- 快捷键监听弹窗 -->
    <div v-if="isListening" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-96">
        <h3 class="text-lg font-medium text-gray-900 mb-4">
          设置快捷键 - {{ currentEditingHotkey?.name || "快捷键" }}
        </h3>
        <p class="text-sm text-gray-600 mb-4">
          点击下方区域，然后按下您想要设置的快捷键组合。
        </p>

        <!-- 使用 HotkeyInterceptor 组件 -->
        <div class="h-32 border-2 border-dashed border-gray-300 rounded-lg">
          <HotkeyInterceptor :hotkey-type="HotkeyType.GLOBAL" :scope="currentListeningId"
            @hotkey-captured="handleHotkeyCaptured" />
        </div>

        <div class="flex justify-center space-x-3 mt-4">
          <button @click="cancelListening"
            class="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm">
            取消
          </button>
          <button @click="confirmHotkey" :disabled="!currentEditingHotkey?.keys"
            class="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm">
            确认设置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
/** @ts-ignore */
import IconMdiPlus from "~icons/mdi/plus";
/** @ts-ignore */
import IconMdiDelete from "~icons/mdi/delete";
/** @ts-ignore */
import IconMdiKeyboard from "~icons/mdi/keyboard";
/** @ts-ignore */
import IconMdiInformation from "~icons/mdi/information";
import { HotkeyType, type HotkeyConfig } from "@/typings/hotkey-types";
import { hotkeyManager } from "@/core/hotkey/HotkeyManager";
import HotkeyInterceptor from "./HotkeyInterceptor.vue";

// 自定义快捷键列表
const customHotkeys = ref<HotkeyConfig[]>([]);

// 快捷键监听状态
const isListening = ref(false);
const currentListeningId = ref<string>("");
const currentEditingHotkey = ref<HotkeyConfig | null>(null);

// 移除重复的存储桥接器实例，使用 hotkeyManager 内置的存储功能

// 添加自定义快捷键
const addCustomHotkey = async () => {
  const newHotkey: HotkeyConfig = {
    id: `${hotkeyManager.customHotKeyPrefix}${Date.now()}`,
    name: `快捷键 ${customHotkeys.value.length + 1}`,
    keys: "",
    type: HotkeyType.GLOBAL,
    enabled: false,
    scope: "all"
  };
  // 直接注册到 hotkeyManager，它会自动处理存储
  // await hotkeyManager.register(newHotkey);
  // 更新本地状态
  await hotkeyManager.addCustomHotkey(newHotkey);
  customHotkeys.value.push(newHotkey);
};

// 删除自定义快捷键
const removeCustomHotkey = async (id: string) => {
  const index = customHotkeys.value.findIndex(h => h.id === id);
  if (index > -1) {
    // 使用 hotkeyManager 注销，它会自动处理存储
    await hotkeyManager.unregister(id);
    // 更新本地状态
    customHotkeys.value.splice(index, 1);
  }
};

// 开始监听快捷键
const startListeningHotkey = (hotkey: HotkeyConfig) => {
  if (isListening.value) return;

  isListening.value = true;
  currentListeningId.value = hotkey.id;
  currentEditingHotkey.value = hotkey;
};

// 处理快捷键捕获事件
const handleHotkeyCaptured = (keys: string[]) => {
  if (keys.length === 0) return;

  if (currentEditingHotkey.value) {
    // 检查快捷键是否已存在
    const existingHotkey = customHotkeys.value.find(h => h.keys === keys.join("+") && h.id !== currentEditingHotkey.value!.id);
    if (existingHotkey) {
      alert("该快捷键已被其他项目使用");
      return;
    }
    currentEditingHotkey.value.keys = keys.join("+");
  }
};

// 确认快捷键设置
const confirmHotkey = async () => {
  if (currentEditingHotkey.value && currentEditingHotkey.value.keys) {
    // 使用 hotkeyManager 更新注册，它会自动处理存储
    await hotkeyManager.updateConfig(currentEditingHotkey.value.id, { keys: currentEditingHotkey.value.keys });
    if (currentEditingHotkey.value.enabled) {
      await hotkeyManager.register(currentEditingHotkey.value);
    }
  }
  cancelListening();
};

// 取消监听
const cancelListening = () => {
  isListening.value = false;
  currentListeningId.value = "";
  currentEditingHotkey.value = null;
};

// 更新快捷键名称
const updateHotkeyName = async (hotkey: HotkeyConfig) => {
  // 名称更新不需要重新注册，只需要更新本地状态
  // hotkeyManager 会在下次注册时自动保存最新配置
  if (hotkey) {
    await hotkeyManager.updateConfig(hotkey.id, { name: hotkey.name });
  }
};

// 切换快捷键启用状态
const toggleHotkey = async (hotkey: HotkeyConfig) => {
  // 使用 hotkeyManager 的 toggle 方法，它会自动处理存储
  await hotkeyManager.toggle(hotkey.id, hotkey.enabled);
};

// 格式化按键显示
const formatKeyDisplay = (key: string) => {
  switch (key) {
    case "ctrl":
      return "Ctrl";
    case "shift":
      return "Shift";
    case "alt":
      return "Alt";
    case "meta":
      return "Meta";
    case "space":
      return "Space";
    case "esc":
      return "Escape";
    case "enter":
      return "Enter";
    case "tab":
      return "Tab";
    case "backspace":
      return "Backspace";
    case "delete":
      return "Delete";
    case "up":
      return "↑";
    case "down":
      return "↓";
    case "left":
      return "←";
    case "right":
      return "→";
    default:
      return key.toUpperCase();
  }
};

// 从 hotkeyManager 加载自定义快捷键
const loadCustomHotkeys = async () => {
  try {
    // 获取所有快捷键，过滤出自定义快捷键（ID 以 custom_ 开头）
    const allHotkeys = hotkeyManager.getAll();
    customHotkeys.value = allHotkeys.filter(hotkey => hotkey.id.startsWith(hotkeyManager.customHotKeyPrefix));
  } catch (error) {
    console.error("加载自定义快捷键失败:", error);
  }
};

// 组件挂载时加载数据
onMounted(() => {
  loadCustomHotkeys();
});
</script>

<style scoped>
/* kbd 标签样式 */
kbd {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo,
    monospace;
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 600;
  color: #374151;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
</style>
