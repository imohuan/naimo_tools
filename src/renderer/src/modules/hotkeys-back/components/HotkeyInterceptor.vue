<template>
  <div
    ref="containerRef"
    class="w-full h-full relative cursor-pointer select-none"
    @click="handleClick"
    tabindex="0"
  >
    <div class="w-full h-full flex items-center justify-center p-4">
      <div class="text-center">
        <div class="text-lg font-medium text-gray-700 mb-4">点击此区域开始监听快捷键</div>
        <div v-if="keys.length > 0" class="text-2xl font-mono text-blue-600">
          {{ displayText }}
        </div>
        <div v-if="isListening" class="mt-2 text-xs text-green-600">
          正在监听中... 松开所有按键停止监听
        </div>
        <div
          v-if="!isListening && currentKeys.length === 0"
          class="mt-2 text-xs text-gray-400"
        >
          按 Escape 键取消监听
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useHotkeyManager, HotkeyType } from "../index";

// 组件属性
interface Props {
  hotkeyType?: HotkeyType;
  scope?: string;
  autoSave?: boolean;
}

withDefaults(defineProps<Props>(), {
  hotkeyType: HotkeyType.APPLICATION,
  scope: "default",
  autoSave: false,
});

// 使用快捷键管理器
const currentKeys = ref<string[]>([]);
const { isListening, currentKeys: currentInputKeys, getListening } = useHotkeyManager();
const keys = computed(() =>
  currentInputKeys.value.length === 0 ? currentKeys.value : currentInputKeys.value
);

// 组件引用
const containerRef = ref<HTMLElement>();

// 计算显示文本
const displayText = computed(() => {
  if (keys.value.length === 0) return "";
  return keys.value.join(" + ");
});

// 事件定义
interface Emits {
  (e: "hotkey-captured", keys: string[]): void;
}

const emit = defineEmits<Emits>();

// 事件处理函数
const handleClick = async () => {
  if (containerRef.value) {
    containerRef.value.focus();
    getListening().then((keys) => {
      currentKeys.value = keys;
      console.log(keys);
      emit("hotkey-captured", keys);
    });
  }
};

defineExpose({});
</script>

<style scoped>
/* 确保容器可以获得焦点 */
div[tabindex] {
  outline: none;
}

div[tabindex]:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
</style>
