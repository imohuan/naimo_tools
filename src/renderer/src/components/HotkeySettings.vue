<template>
  <div class="min-h-full flex flex-col space-y-4">
    <template v-if="!isEditingHotkey">
      <!-- 动态渲染快捷键分组 -->
      <div
        v-for="group in Object.values(config)"
        :key="group.id"
        class="bg-white rounded-lg border border-gray-200 p-4"
      >
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-base font-medium text-gray-900">{{ group.name }}</h3>
            <p class="text-xs text-gray-600 mt-1">{{ group.description }}</p>
          </div>
          <div class="flex items-center">
            <label class="flex items-center">
              <input
                type="checkbox"
                v-model="group.enabled"
                @change="toggleGroup(group.id)"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span class="ml-2 text-sm text-gray-700">启用{{ group.name }}</span>
            </label>
          </div>
        </div>

        <div class="space-y-4">
          <!-- 动态渲染快捷键 -->
          <div
            v-for="hotkey in group.hotkeys"
            :key="hotkey.id"
            class="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div class="flex-1">
              <div class="font-medium text-gray-900">{{ hotkey.name }}</div>
              <div class="text-sm text-gray-600 mt-1">{{ hotkey.description }}</div>
            </div>
            <div class="flex items-center space-x-3">
              <div class="flex items-center space-x-2">
                <kbd
                  class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded"
                >
                  {{ formatHotkeyDisplay(hotkey.keys.split("+")) }}
                </kbd>
              </div>
              <button
                @click="startEditingHotkey(hotkey.id, hotkey.type)"
                :disabled="!group.enabled"
                class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
              >
                重新设置
              </button>
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
    <div
      v-else
      class="bg-white rounded-lg border border-gray-200 p-6 flex flex-col gap-4"
    >
      <h3 class="text-lg font-medium text-gray-900">
        设置快捷键 -
        <span class="px-2 py-1 rounded text-blue-700 underline">
          {{ currentEditingHotkeyName }}
        </span>
      </h3>
      <p class="text-sm text-gray-600">点击下方区域，然后按下您想要设置的快捷键组合。</p>

      <!-- 使用 HotkeyInterceptor 组件 -->
      <div class="h-32 border-2 border-dashed border-gray-300 rounded-lg">
        <HotkeyInterceptor
          :hotkey-type="editingHotkeyType"
          :scope="editingHotkeyId"
          @hotkey-captured="handleHotkeyCaptured"
        />
      </div>

      <div class="flex justify-center space-x-3">
        <button
          @click="cancelEditing"
          class="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
        >
          取消
        </button>
        <button
          @click="confirmEditing"
          :disabled="currentEditingKeys.length === 0"
          class="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
        >
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
import { HotkeyType } from "../types/hotkey-types";
import { useGlobalHotkeyInitializer } from "../composables/useGlobalHotkeyInitializer";
import HotkeyInterceptor from "./HotkeyInterceptor.vue";
// 快捷键管理器（通过全局初始化器管理）

// 全局快捷键初始化器
const {
  config,
  toggleGroup,
  updateHotkeyConfig,
  getAllHotkeys,
} = useGlobalHotkeyInitializer();

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
    })
    .join(" + ");
};

// 确认编辑
const confirmEditing = async () => {
  if (currentEditingKeys.value.length === 0) return;

  const newKeys = currentEditingKeys.value.join("+");
  const success = await updateHotkeyConfig(editingHotkeyId.value, newKeys);

  if (success) {
    console.log(`✅ 快捷键更新成功: ${editingHotkeyId.value} -> ${newKeys}`);
  } else {
    console.error(`❌ 快捷键更新失败: ${editingHotkeyId.value} -> ${newKeys}`);
  }

  // 结束编辑状态
  cancelEditing();
};

// 取消编辑
const cancelEditing = () => {
  isEditingHotkey.value = false;
  editingHotkeyId.value = "";
  currentEditingKeys.value = [];
};

// 生命周期
onMounted(() => {
  // 快捷键已在应用启动时初始化，这里不需要重复初始化
  console.log("🎯 HotkeySettings 组件已挂载，快捷键配置已就绪");
});

// 暴露编辑状态给父组件
defineExpose({
  isEditingHotkey,
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
