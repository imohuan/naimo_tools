<template>
  <div class="min-h-full flex flex-col space-y-4">
    <template v-if="!isEditingHotkey">
      <!-- 全局快捷键分组 -->
      <div v-if="config.global.length > 0" class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="mb-4">
          <h3 class="text-base font-medium text-gray-900">全局快捷键</h3>
          <p class="text-xs text-gray-600 mt-1">可以在任何应用程序中使用</p>
        </div>

        <div class="space-y-4">
          <div v-for="hotkey in config.global" :key="hotkey.id"
            class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex-1">
              <div class="font-medium text-gray-900">{{ hotkey.name }}</div>
              <div class="text-sm text-gray-600 mt-1">{{ hotkey.description }}</div>
            </div>
            <div class="flex items-center space-x-3">
              <div class="flex items-center space-x-2">
                <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                  {{ formatHotkeyDisplay(hotkey.keys.split("+")) }}
                </kbd>
              </div>
              <div class="flex items-center space-x-2">
                <label class="flex items-center">
                  <input type="checkbox" :checked="hotkey.enabled" @change="toggleIndividualHotkey(hotkey)"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" />
                  <span class="ml-2 text-sm text-gray-700">启用</span>
                </label>
                <button @click="startEditingHotkey(hotkey.id, hotkey.type)"
                  class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm">
                  重新设置
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 应用内快捷键分组 -->
      <div v-if="config.application.length > 0" class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="mb-4">
          <h3 class="text-base font-medium text-gray-900">应用内快捷键</h3>
          <p class="text-xs text-gray-600 mt-1">仅在 Naimo 获得焦点时生效</p>
        </div>

        <div class="space-y-4">
          <div v-for="hotkey in config.application" :key="hotkey.id"
            class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex-1">
              <div class="font-medium text-gray-900">{{ hotkey.name }}</div>
              <div class="text-sm text-gray-600 mt-1">{{ hotkey.description }}</div>
            </div>
            <div class="flex items-center space-x-3">
              <div class="flex items-center space-x-2">
                <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                  {{ formatHotkeyDisplay(hotkey.keys.split("+")) }}
                </kbd>
              </div>
              <div class="flex items-center space-x-2">
                <label class="flex items-center">
                  <input type="checkbox" :checked="hotkey.enabled" @change="toggleIndividualHotkey(hotkey)"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" />
                  <span class="ml-2 text-sm text-gray-700">启用</span>
                </label>
                <button @click="startEditingHotkey(hotkey.id, hotkey.type)"
                  class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm">
                  重新设置
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 提示信息 -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div class="flex">
          <IconMdiInformation class="w-5 h-5 text-blue-400 mt-0.5 mr-3" />
          <div class="text-sm text-blue-800">
            <p class="font-medium">快捷键设置说明：</p>
            <ul class="mt-2 space-y-1 list-disc list-inside">
              <li>全局快捷键可以在任何应用程序中使用，用于快速显示/隐藏 Naimo</li>
              <li>应用内快捷键仅在 Naimo 获得焦点时生效</li>
              <li>建议使用 Ctrl、Alt、Shift 等修饰键组合，避免与系统快捷键冲突</li>
              <li>设置快捷键时，请确保不与系统或其他应用程序的快捷键冲突</li>
            </ul>
          </div>
        </div>
      </div>
    </template>

    <!-- 快捷键编辑界面 -->
    <div v-else class="bg-white rounded-lg border border-gray-200 p-6 flex flex-col gap-4">
      <h3 class="text-lg font-medium text-gray-900">
        设置快捷键 -
        <span class="px-2 py-1 rounded text-blue-700 underline">
          {{ currentEditingHotkeyName }}
        </span>
      </h3>
      <p class="text-sm text-gray-600">点击下方区域，然后按下您想要设置的快捷键组合。</p>

      <!-- 使用 HotkeyInterceptor 组件 -->
      <div class="h-32 border-2 border-dashed border-gray-300 rounded-lg">
        <HotkeyInterceptor :hotkey-type="editingHotkeyType" :scope="editingHotkeyId"
          @hotkey-captured="handleHotkeyCaptured" />
      </div>

      <div class="flex justify-center space-x-3">
        <button @click="cancelEditing"
          class="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm">
          取消
        </button>
        <button @click="confirmEditing" :disabled="currentEditingKeys.length === 0"
          class="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm">
          确认设置
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
/** @ts-ignore */
import IconMdiInformation from "~icons/mdi/information";
import { HotkeyType, type HotkeyConfig, type HotkeySettingsConfig } from "@/typings/hotkeyTypes";
import { hotkeyManager } from "@/core/hotkey/HotkeyManager";
import HotkeyInterceptor from "./HotkeyInterceptor.vue";

// 快捷键配置数据
const config = ref<HotkeySettingsConfig>({ global: [], application: [] });

// 切换单个快捷键的启用状态
const toggleIndividualHotkey = async (hotkey: HotkeyConfig) => {
  const success = await hotkeyManager.toggle(hotkey.id, !hotkey.enabled);
  if (success) {
    // 刷新配置以更新UI状态
    config.value = await hotkeyManager.getHotkeyConfig();
  }
};

// 更新快捷键配置
const updateHotkeyConfig = async (hotkeyId: string, newKeys: string) => {
  const allHotkeys = getAllHotkeys();
  const hotkey = allHotkeys.find(h => h.id === hotkeyId);
  if (hotkey) {
    // 先注销旧的快捷键
    await hotkeyManager.unregister(hotkeyId);
    // 注册新的快捷键
    const updatedConfig = {
      ...hotkey,
      keys: newKeys,
      enabled: true
    };
    return await hotkeyManager.register(updatedConfig);
  }
  return false;
};

// 获取所有快捷键
const getAllHotkeys = () => {
  return hotkeyManager.getAll();
};

// 快捷键编辑状态
const isEditingHotkey = ref(false);
const editingHotkeyType = ref<HotkeyType>(HotkeyType.APPLICATION);
const editingHotkeyId = ref<string>("");
const currentEditingKeys = ref<string[]>([]);

// 计算当前编辑的快捷键名称
const currentEditingHotkeyName = computed(() => {
  const allHotkeys = getAllHotkeys();
  const hotkey = allHotkeys.find((h) => h.id === editingHotkeyId.value);
  return hotkey?.name || "快捷键";
});

// 开始编辑快捷键
const startEditingHotkey = (
  hotkeyId: string,
  type: HotkeyType = HotkeyType.APPLICATION
) => {
  editingHotkeyType.value = type;
  editingHotkeyId.value = hotkeyId;
  isEditingHotkey.value = true;
};

// 处理快捷键捕获事件
const handleHotkeyCaptured = (keys: string[]) => {
  if (keys.length === 0) return;
  currentEditingKeys.value = keys;
};

// 格式化快捷键显示
const formatHotkeyDisplay = (keys: string[]) => {
  return keys
    .map((key) => {
      switch (key) {
        case 'ctrl':
          return 'Ctrl';
        case 'shift':
          return 'Shift';
        case 'alt':
          return 'Alt';
        case 'meta':
          return 'Meta';
        case 'space':
          return 'Space';
        case 'esc':
          return 'Escape';
        case 'enter':
          return 'Enter';
        case 'tab':
          return 'Tab';
        case 'backspace':
          return 'Backspace';
        case 'delete':
          return 'Delete';
        case 'up':
          return '↑';
        case 'down':
          return '↓';
        case 'left':
          return '←';
        case 'right':
          return '→';
        default:
          return key.toUpperCase();
      }
    })
    .join(' + ');
};

// 确认编辑
const confirmEditing = async () => {
  if (currentEditingKeys.value.length === 0) return;

  const newKeys = currentEditingKeys.value.join('+');
  const success = await updateHotkeyConfig(editingHotkeyId.value, newKeys);
  if (success) {
    console.log(`✅ 快捷键更新成功: ${editingHotkeyId.value} -> ${newKeys}`);
    // 刷新配置
    config.value = await hotkeyManager.getHotkeyConfig();
  } else {
    console.error(`❌ 快捷键更新失败: ${editingHotkeyId.value} -> ${newKeys}`);
  }

  // 结束编辑状态
  cancelEditing();
};

// 取消编辑
const cancelEditing = () => {
  isEditingHotkey.value = false;
  editingHotkeyId.value = '';
  currentEditingKeys.value = [];
};

// 初始化配置
onMounted(async () => {
  config.value = await hotkeyManager.getHotkeyConfig();
  config.value.global = config.value.global.filter(h => !h.id.startsWith(hotkeyManager.customHotKeyPrefix));
});

// 暴露编辑状态给父组件
defineExpose({ isEditingHotkey, });
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
