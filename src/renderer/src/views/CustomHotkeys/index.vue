<template>
  <div class="min-h-full flex flex-col space-y-4">
    <!-- 快捷键列表 -->
    <div v-if="customHotkeys.length > 0" class="space-y-2">
      <div
        v-for="(hotkey, index) in customHotkeys"
        :key="hotkey.id"
        class="bg-white rounded-lg border border-gray-200 px-4 py-2"
      >
        <div class="flex items-center space-x-4">
          <!-- 序号 -->
          <div
            class="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
          >
            <span class="text-sm font-medium text-gray-600">{{
              index + 1
            }}</span>
          </div>

          <!-- 输入框 -->
          <div class="flex-1">
            <input
              v-model="hotkey.name"
              placeholder="输入快捷键名称"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @input="updateHotkeyName(hotkey)"
            />
          </div>

          <!-- 快捷键监听面板 -->
          <div class="flex-shrink-0">
            <div
              class="w-48 h-10 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
              :class="{
                'border-blue-500 bg-blue-50':
                  isListening && currentListeningId === hotkey.id,
              }"
              @click="startListeningHotkey(hotkey)"
            >
              <div class="w-full h-full flex items-center justify-center">
                <div
                  v-if="
                    hotkey.keys &&
                    !(isListening && currentListeningId === hotkey.id)
                  "
                  class="flex items-center space-x-1"
                >
                  <kbd
                    v-for="key in hotkey.keys.split('+')"
                    :key="key"
                    class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded"
                  >
                    {{ formatKeyDisplay(key) }}
                  </kbd>
                </div>
                <div
                  v-else-if="isListening && currentListeningId === hotkey.id"
                  class="text-center"
                >
                  <div
                    v-if="currentKeys.length > 0"
                    class="flex items-center justify-center space-x-1"
                  >
                    <kbd
                      v-for="key in currentKeys"
                      :key="key"
                      class="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 border border-blue-200 rounded"
                    >
                      {{ formatKeyDisplay(key) }}
                    </kbd>
                  </div>
                  <div v-else class="text-xs text-blue-600 font-medium mb-1">
                    正在监听...
                  </div>
                </div>
                <div v-else class="text-xs text-gray-400">点击设置快捷键</div>
              </div>
            </div>
          </div>

          <!-- 开关 -->
          <div class="flex-shrink-0">
            <label class="flex items-center">
              <input
                type="checkbox"
                v-model="hotkey.enabled"
                @change="toggleHotkey(hotkey)"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span class="ml-2 text-sm text-gray-700">启用</span>
            </label>
          </div>

          <!-- 删除按钮 -->
          <div class="flex-shrink-0">
            <button
              @click="removeCustomHotkey(hotkey.id)"
              class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="删除快捷键"
            >
              <IconMdiDelete class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态提示 -->
    <div v-if="customHotkeys.length === 0" class="text-center py-8">
      <IconMdiKeyboard class="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">暂无自定义快捷键</h3>
      <p class="text-sm text-gray-500">
        点击下方按钮添加您的第一个自定义快捷键
      </p>
    </div>

    <!-- 统一的添加按钮 -->
    <div
      @click="addCustomHotkey"
      class="w-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:border-gray-400 hover:bg-gray-100 cursor-pointer transition-all duration-200 flex items-center justify-center px-4 py-3"
    >
      <div
        class="flex items-center space-x-2 text-gray-400 hover:text-gray-600"
      >
        <IconMdiPlus class="w-4 h-4" />
        <span class="text-sm font-medium">点击添加自定义快捷键</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useDebounceFn } from "@vueuse/core";
/** @ts-ignore */
import IconMdiPlus from "~icons/mdi/plus";
/** @ts-ignore */
import IconMdiDelete from "~icons/mdi/delete";
/** @ts-ignore */
import IconMdiKeyboard from "~icons/mdi/keyboard";
import { HotkeyType } from "@/core/typings/hotkey";
import type { HotkeyConfig } from "@/core/typings/hotkey";
import { useApp } from "@/core";
import { useHotkeyListener } from "./hooks/useHotkeyListener";

// 使用新的快捷键系统
const app = useApp();

// 自定义快捷键前缀
const CUSTOM_HOTKEY_PREFIX = "custom_global_";

// 自定义快捷键列表
const customHotkeys = ref<HotkeyConfig[]>([]);

// 使用快捷键监听器
const { isListening, currentKeys, getListening } = useHotkeyListener();

// 快捷键监听状态
const currentListeningId = ref<string>("");
const currentEditingHotkey = ref<HotkeyConfig | null>(null);

// 添加自定义快捷键
const addCustomHotkey = async () => {
  const newHotkey: HotkeyConfig = {
    id: `${CUSTOM_HOTKEY_PREFIX}${Date.now()}`,
    name: `快捷键 ${customHotkeys.value.length + 1}`,
    keys: "",
    type: HotkeyType.GLOBAL,
    enabled: false,
    scope: "all",
  };

  // 使用 skipValidation 参数允许注册 keys 为空的快捷键
  await app.hotkey.register(newHotkey, true);

  // 更新本地状态
  customHotkeys.value.push(newHotkey);
};

// 删除自定义快捷键
const removeCustomHotkey = async (id: string) => {
  const index = customHotkeys.value.findIndex((h) => h.id === id);
  if (index > -1) {
    // 使用新系统注销
    await app.hotkey.unregister(id);
    // 更新本地状态
    customHotkeys.value.splice(index, 1);
  }
};

// 开始监听快捷键
const startListeningHotkey = async (hotkey: HotkeyConfig) => {
  if (isListening.value) return;

  currentListeningId.value = hotkey.id;
  currentEditingHotkey.value = hotkey;

  try {
    const keys = await getListening();
    if (keys.length > 0) {
      handleHotkeyCaptured(keys);
    }
  } catch (error) {
    console.error("快捷键监听失败:", error);
  }
};

// 处理快捷键捕获事件
const handleHotkeyCaptured = async (keys: string[]) => {
  if (keys.length === 0 || !currentEditingHotkey.value) return;

  const keysString = keys.join("+");

  // 检查快捷键是否已存在
  const existingHotkey = customHotkeys.value.find(
    (h) => h.keys === keysString && h.id !== currentEditingHotkey.value!.id
  );
  if (existingHotkey) {
    alert("该快捷键已被其他项目使用");
    cancelListening();
    return;
  }

  // 先注销旧的配置
  await app.hotkey.unregister(currentEditingHotkey.value.id);
  // 使用新的 keys 重新注册
  const updatedConfig = { ...currentEditingHotkey.value, keys: keysString };
  await app.hotkey.register(updatedConfig);

  // 重新加载快捷键列表
  await loadCustomHotkeys();

  cancelListening();
};

// 取消监听
const cancelListening = () => {
  currentListeningId.value = "";
  currentEditingHotkey.value = null;
};

// 更新快捷键名称（带 debounce）
const updateHotkeyName = useDebounceFn(async (hotkey: HotkeyConfig) => {
  if (hotkey) {
    await app.hotkey.updateConfig(hotkey.id, { name: hotkey.name });
  }
}, 500);

// 切换快捷键启用状态
const toggleHotkey = async (hotkey: HotkeyConfig) => {
  // 如果 keys 为空，不允许启用
  if (!hotkey.keys) {
    hotkey.enabled = false;
    return;
  }
  // 使用新系统的 toggle 方法
  await app.hotkey.toggle(hotkey.id);
  // 重新加载以更新状态
  await loadCustomHotkeys();
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

// 从新系统加载自定义快捷键
const loadCustomHotkeys = async () => {
  try {
    // 获取所有快捷键，过滤出自定义快捷键（ID 以 custom_global_ 开头）
    const allHotkeys = Array.from(app.hotkey.hotkeys.values());
    customHotkeys.value = allHotkeys
      .filter((hotkey) => hotkey.id.startsWith(CUSTOM_HOTKEY_PREFIX))
      .map((m) => JSON.parse(JSON.stringify(m)));
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
  font-family:
    ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo,
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
