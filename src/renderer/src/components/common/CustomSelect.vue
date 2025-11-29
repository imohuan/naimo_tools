<template>
  <div class="custom-select relative" ref="selectContainerRef">
    <!-- 显示区域 -->
    <div
      class="select-display px-2 py-1 border border-gray-300 rounded-md outline-none text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer flex items-center justify-between min-h-[28px]"
      :class="{
        'bg-gray-50': disabled,
        'cursor-not-allowed': disabled,
      }"
      ref="displayRef"
      @click="toggleDropdown"
    >
      <div class="flex-1 flex flex-wrap gap-1 min-h-[20px]">
        <span
          v-if="displayText"
          class="text-gray-700"
          :class="{ 'text-gray-400': disabled }"
        >
          {{ displayText }}
        </span>
        <span v-else class="text-gray-400">请选择</span>
      </div>
      <svg
        class="w-4 h-4 text-gray-400 transition-transform flex-shrink-0"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>

    <!-- 下拉选项列表 - 使用 Teleport 移动到 body -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="select-dropdown fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        ref="dropdownRef"
        :style="dropdownStyle"
      >
        <div
          v-for="option in options"
          :key="getOptionValue(option)"
          class="select-option px-2 py-1.5 text-xs cursor-pointer hover:bg-blue-50 transition-colors flex items-center gap-2"
          :class="{
            'bg-blue-100': isSelected(option),
          }"
          @click="handleOptionClick(option)"
        >
          <!-- 多选模式：显示复选框 -->
          <span v-if="multiple" class="flex items-center">
            <input
              type="checkbox"
              :checked="isSelected(option)"
              class="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 rounded"
              @click.stop
              @change="handleCheckboxChange(option, $event)"
            />
          </span>
          <!-- 单选模式：显示选中标记 -->
          <span v-else class="flex items-center">
            <svg
              v-if="isSelected(option)"
              class="w-4 h-4 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            <span v-else class="w-4 h-4"></span>
          </span>
          <span class="flex-1">{{ getOptionLabel(option) }}</span>
        </div>
        <div
          v-if="options.length === 0"
          class="px-2 py-1.5 text-xs text-gray-400 text-center"
        >
          暂无选项
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted, nextTick } from "vue";

export interface SelectOption {
  label: string;
  value: string | number;
}

interface Props {
  /** 选项列表 */
  options: SelectOption[] | string[];
  /** 当前选中的值（单选时为单个值，多选时为数组） */
  modelValue?: string | number | (string | number)[];
  /** 是否多选 */
  multiple?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 占位符文本 */
  placeholder?: string;
  /** 自定义获取选项值的函数 */
  getOptionValue?: (option: SelectOption | string) => string | number;
  /** 自定义获取选项标签的函数 */
  getOptionLabel?: (option: SelectOption | string) => string;
}

interface Emits {
  (e: "update:modelValue", value: string | number | (string | number)[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  multiple: false,
  disabled: false,
  placeholder: "请选择",
  getOptionValue: undefined,
  getOptionLabel: undefined,
});

const emit = defineEmits<Emits>();

const isOpen = ref(false);
const selectContainerRef = ref<HTMLElement | null>(null);
const displayRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const dropdownStyle = ref<{
  top: string;
  left: string;
  width: string;
  maxHeight?: string;
}>({
  top: "0px",
  left: "0px",
  width: "0px",
});

// 获取选项值
const getOptionValue = (option: SelectOption | string): string | number => {
  if (props.getOptionValue) {
    return props.getOptionValue(option);
  }
  if (typeof option === "string") {
    return option;
  }
  return option.value;
};

// 获取选项标签
const getOptionLabel = (option: SelectOption | string): string => {
  if (props.getOptionLabel) {
    return props.getOptionLabel(option);
  }
  if (typeof option === "string") {
    return option;
  }
  return option.label;
};

// 判断选项是否被选中
const isSelected = (option: SelectOption | string): boolean => {
  const value = getOptionValue(option);
  if (props.multiple) {
    const selectedValues = Array.isArray(props.modelValue)
      ? props.modelValue
      : [];
    return selectedValues.includes(value);
  } else {
    return props.modelValue === value;
  }
};

// 计算显示文本
const displayText = computed(() => {
  if (props.multiple) {
    const selectedValues = Array.isArray(props.modelValue)
      ? props.modelValue
      : props.modelValue
        ? [props.modelValue]
        : [];
    if (selectedValues.length === 0) {
      return "";
    }
    const selectedOptions = props.options.filter((opt) =>
      selectedValues.includes(getOptionValue(opt))
    );
    if (selectedOptions.length === 0) {
      return "";
    }
    // 显示所有选中项的标签名称，用逗号分隔
    return selectedOptions.map((opt) => getOptionLabel(opt)).join(", ");
  } else {
    if (!props.modelValue) {
      return "";
    }
    const selectedOption = props.options.find(
      (opt) => getOptionValue(opt) === props.modelValue
    );
    return selectedOption ? getOptionLabel(selectedOption) : "";
  }
});

// 计算下拉框位置
const updateDropdownPosition = async () => {
  if (!displayRef.value || !isOpen.value) return;

  // 确保 DOM 完全渲染（Teleport 到 body 可能需要额外时间）
  await nextTick();

  // 使用 requestAnimationFrame 确保布局计算完成
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await nextTick();

  // 再次检查元素是否存在（Teleport 可能导致元素还没渲染）
  if (!displayRef.value || !dropdownRef.value) return;

  const displayRect = displayRef.value.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  // 获取下拉框宽度（使用 display 的宽度）
  let dropdownWidth = displayRect.width;

  // 先设置一个初始位置和宽度，确保下拉框可以计算实际高度
  // 使用 display 下方位置作为初始位置，避免出现在屏幕顶部
  const initialTop = displayRect.bottom + 4;
  dropdownStyle.value = {
    top: `${initialTop}px`,
    left: `${displayRect.left}px`,
    width: `${dropdownWidth}px`,
  };

  // 等待样式应用后计算实际高度
  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(resolve));

  // 再次检查元素是否存在
  if (!dropdownRef.value) return;

  // 使用 scrollHeight 获取实际内容高度（优先），考虑 max-h-60 限制
  const actualHeight =
    dropdownRef.value.scrollHeight || dropdownRef.value.offsetHeight;
  const dropdownHeight = Math.min(actualHeight || 240, 240); // max-h-60 = 240px

  // 计算下方可用空间
  const spaceBelow = viewportHeight - displayRect.bottom;
  // 计算上方可用空间
  const spaceAbove = displayRect.top;

  // 决定显示在上方还是下方
  // 如果下方空间不足且上方空间更大，则显示在上方
  const showAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

  let top = 0;
  let maxHeight: string | undefined = undefined;

  if (showAbove) {
    // 显示在上方
    top = displayRect.top - dropdownHeight - 4; // 4px 间距
    // 如果上方空间也不足，则贴顶显示
    if (top < 8) {
      top = 8;
      // 如果贴顶还是放不下，限制高度
      const availableHeight = viewportHeight - top - 8;
      if (availableHeight < dropdownHeight) {
        maxHeight = `${availableHeight}px`;
      }
    }
  } else {
    // 显示在下方
    top = displayRect.bottom + 4; // 4px 间距
    // 如果下方空间不足，则贴底显示
    if (top + dropdownHeight > viewportHeight - 8) {
      top = Math.max(8, viewportHeight - dropdownHeight - 8);
      // 如果贴底还是放不下，限制高度
      const availableHeight = viewportHeight - top - 8;
      if (availableHeight < dropdownHeight) {
        maxHeight = `${availableHeight}px`;
      }
    }
  }

  // 计算左侧位置，确保不超出视口
  let left = displayRect.left;
  if (left + dropdownWidth > viewportWidth - 8) {
    left = Math.max(8, viewportWidth - dropdownWidth - 8);
  }
  if (left < 8) {
    left = 8;
    // 如果左侧位置受限，减小宽度
    if (left + dropdownWidth > viewportWidth - 8) {
      dropdownWidth = Math.max(100, viewportWidth - left - 8); // 最小宽度 100px
    }
  }

  // 一次性设置所有样式
  dropdownStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${dropdownWidth}px`,
    ...(maxHeight && { maxHeight }),
  };
};

// 切换下拉框显示状态
const toggleDropdown = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
  if (!isOpen.value) {
    // 关闭时重置样式
    dropdownStyle.value = {
      top: "0px",
      left: "0px",
      width: "0px",
    };
  }
};

// 处理选项点击
const handleOptionClick = (option: SelectOption | string) => {
  if (props.disabled) return;

  const value = getOptionValue(option);

  if (props.multiple) {
    // 多选模式
    const currentValues = Array.isArray(props.modelValue)
      ? [...props.modelValue]
      : [];
    const index = currentValues.indexOf(value);
    if (index > -1) {
      currentValues.splice(index, 1);
    } else {
      currentValues.push(value);
    }
    emit("update:modelValue", currentValues);
  } else {
    // 单选模式
    emit("update:modelValue", value);
    isOpen.value = false;
  }
};

// 处理复选框变化
const handleCheckboxChange = (option: SelectOption | string, event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = getOptionValue(option);

  if (props.multiple) {
    const currentValues = Array.isArray(props.modelValue)
      ? [...props.modelValue]
      : [];
    if (target.checked) {
      if (!currentValues.includes(value)) {
        currentValues.push(value);
      }
    } else {
      const index = currentValues.indexOf(value);
      if (index > -1) {
        currentValues.splice(index, 1);
      }
    }
    emit("update:modelValue", currentValues);
  }
};

// 点击外部关闭下拉框
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;
  if (
    selectContainerRef.value &&
    !selectContainerRef.value.contains(target) &&
    dropdownRef.value &&
    !dropdownRef.value.contains(target)
  ) {
    isOpen.value = false;
  }
};

// 防抖函数
let scrollTimer: number | null = null;
let resizeTimer: number | null = null;

// 处理窗口滚动和大小变化
const handleScroll = () => {
  if (!isOpen.value) return;
  if (scrollTimer) {
    cancelAnimationFrame(scrollTimer);
  }
  scrollTimer = requestAnimationFrame(() => {
    updateDropdownPosition();
    scrollTimer = null;
  });
};

const handleResize = () => {
  if (!isOpen.value) return;
  if (resizeTimer) {
    clearTimeout(resizeTimer);
  }
  resizeTimer = window.setTimeout(() => {
    updateDropdownPosition();
    resizeTimer = null;
  }, 100);
};

// 监听下拉框状态，添加/移除事件监听
watch(isOpen, (newValue) => {
  if (newValue) {
    nextTick(() => {
      updateDropdownPosition();
      document.addEventListener("click", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);
    });
  } else {
    // 清除定时器
    if (scrollTimer) {
      cancelAnimationFrame(scrollTimer);
      scrollTimer = null;
    }
    if (resizeTimer) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }
    document.removeEventListener("click", handleClickOutside);
    window.removeEventListener("scroll", handleScroll, true);
    window.removeEventListener("resize", handleResize);
  }
});

onUnmounted(() => {
  // 清除定时器
  if (scrollTimer) {
    cancelAnimationFrame(scrollTimer);
    scrollTimer = null;
  }
  if (resizeTimer) {
    clearTimeout(resizeTimer);
    resizeTimer = null;
  }
  document.removeEventListener("click", handleClickOutside);
  window.removeEventListener("scroll", handleScroll, true);
  window.removeEventListener("resize", handleResize);
});
</script>

<style scoped>
.custom-select {
  position: relative;
}
</style>

<style>
.select-dropdown {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
}

.select-dropdown::-webkit-scrollbar {
  width: 6px;
}

.select-dropdown::-webkit-scrollbar-track {
  background: #f7fafc;
  border-radius: 3px;
}

.select-dropdown::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.select-dropdown::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}
</style>
