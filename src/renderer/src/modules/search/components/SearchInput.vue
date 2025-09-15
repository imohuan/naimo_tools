<template>
  <div class="flex-1 w-full h-full relative">
    <!-- 占位符文本 -->
    <div v-if="!modelValue && !isComposing"
      class="absolute left-1 top-1/2 transform -translate-y-1/2 text-gray-400 text-base pointer-events-none select-none no-drag">
      {{ placeholder }}
    </div>

    <!-- 输入框 -->
    <input v-show="shouldShowSearchBox" ref="inputRef" :value="modelValue" type="text"
      class="relative z-10 h-full flex-1 pl-1 pr-4 py-3 text-gray-700 bg-transparent border-none outline-none text-base no-drag"
      :style="{ width: inputWidth }" @click="handleInputClick" @keydown.enter="handleEnter"
      @keydown.delete="handleDelete" @input="handleInput" @paste="handlePaste"
      @compositionstart="handleCompositionStart" @compositionupdate="handleCompositionUpdate"
      @compositionend="handleCompositionEnd" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from "vue";
import { useTextWidth } from "@/composables/useTextWidth";

// ==================== Props ====================
interface Props {
  modelValue: string;
  placeholder?: string;
  minWidth?: number;
  maxWidth?: number;
  padding?: number;
  extraWidth?: number;
  hasFiles?: boolean;
  shouldShowSearchBox?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "搜索应用和指令 / 粘贴文件或图片...",
  minWidth: 30,
  maxWidth: () => window.innerWidth - 50,
  padding: 32,
  extraWidth: 20,
});

// ==================== Emits ====================
interface Emits {
  "update:modelValue": [value: string];
  enter: [value: string];
  "input-click": [];
  paste: [event: ClipboardEvent];
  "clear-files": [];
}

const emit = defineEmits<Emits>();

// ==================== 响应式数据 ====================
const inputRef = ref<HTMLInputElement>();
const isComposing = ref(false); // 是否正在输入中文
const compositionText = ref(""); // 预输入的拼音文字

// ==================== Hooks ====================
const { useTextWidthCalculator } = useTextWidth();

const { width: inputWidth, updateWidthAsync } = useTextWidthCalculator(inputRef, {
  minWidth: props.minWidth,
  maxWidth: props.maxWidth,
  padding: props.padding,
  extraWidth: props.extraWidth,
});

// ==================== 计算属性 ====================
const currentText = computed(() => {
  if (!inputRef.value) return props.modelValue || "";

  // 如果正在输入中文，需要组合当前值和预输入拼音
  if (isComposing.value) {
    const currentValue = props.modelValue || "";
    const fullText = currentValue + compositionText.value;
    return fullText;
  }

  // 非中文输入状态，使用正常的文本内容
  return props.modelValue || "";
});

// ==================== 方法 ====================
const handleInputClick = () => {
  // 确保输入框获得焦点
  inputRef.value?.focus();
  emit("input-click");
};

const handleEnter = () => {
  if (props.modelValue.trim()) {
    emit("enter", props.modelValue);
  }
};

const handleDelete = () => {
  // 如果当前没有文字且存在文件，则清除文件
  if (!props.modelValue.trim() && props.hasFiles) {
    emit("clear-files");
  }
};

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = target.value;
  // 触发 v-model 更新
  emit("update:modelValue", value);
  // 更新宽度
  updateWidthAsync(currentText.value);
};

const handlePaste = (event: ClipboardEvent) => {
  emit("paste", event);
};

// 中文输入法事件处理
const handleCompositionStart = () => {
  isComposing.value = true;
  compositionText.value = "";
  console.log("开始中文输入");
};

const handleCompositionUpdate = (event: CompositionEvent) => {
  if (isComposing.value) {
    // 获取预输入的拼音文字
    compositionText.value = event.data || "";
    console.log("预输入文字:", compositionText.value);

    // 在输入过程中实时更新宽度
    updateWidthAsync(currentText.value);
  }
};

const handleCompositionEnd = () => {
  isComposing.value = false;
  compositionText.value = "";
  console.log("结束中文输入");

  // 输入完成后重新计算宽度
  updateWidthAsync(currentText.value);
};

// ==================== 监听器 ====================
// 监听模型值变化，动态调整输入框宽度
watch(
  () => props.modelValue,
  () => {
    updateWidthAsync(currentText.value);
  }
);

// 监听当前文本变化
watch(currentText, () => {
  updateWidthAsync(currentText.value);
});

// ==================== 生命周期 ====================
onMounted(() => {
  // 初始化输入框宽度
  nextTick(() => {
    updateWidthAsync(currentText.value);
  });
});

defineExpose({
  focus: () => {
    // 只有在搜索框可见时才尝试聚焦
    if (props.shouldShowSearchBox !== false && inputRef.value) {
      inputRef.value.focus();
    }
  },
});
</script>

<style scoped>
/* 只保留特殊的样式，如 -webkit-app-region 等无法通过 TailwindCSS 实现的样式 */
.no-drag {
  -webkit-app-region: no-drag;
}
</style>
