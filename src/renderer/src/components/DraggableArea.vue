<template>
  <div ref="draggableElement" class="draggable-area" @mousedown="handleMouseDown">
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  /**
   * 点击阈值
   * @default 100
   */
  clickThreshold?: number;
}

const props = withDefaults(defineProps<Props>(), { clickThreshold: 100 });
const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

// 响应式数据
const draggableElement = ref<HTMLElement>();

// 拖拽状态变量
let moveIng = false;
let startX = 0;
let startY = 0;
let lastWidth = 0;
let lastHeight = 0;
let startTime = 0;

// 移动窗口函数
const move = (event: MouseEvent) => {
  if (!moveIng) return;
  const x = window.screenX + event.clientX - startX;
  const y = window.screenY + event.clientY - startY;
  api.sendTo.windowMove(window.id!, Math.round(x), Math.round(y), lastWidth, lastHeight);
};

// 鼠标按下事件
const handleMouseDown = (event: MouseEvent) => {
  // 只处理左键点击
  if (event.button !== 0) return;

  // 如果点击的是可交互元素，不启动拖拽
  const target = event.target as HTMLElement;
  if (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "BUTTON" ||
    target.closest("button") ||
    target.closest("input") ||
    target.closest("textarea") ||
    target.closest("[contenteditable]")
  ) {
    return;
  }

  moveIng = true;
  startX = event.clientX;
  startY = event.clientY;
  startTime = Date.now();
  lastWidth = window.outerWidth;
  lastHeight = window.outerHeight;

  // 阻止默认行为，防止文本选择
  event.preventDefault();
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", handleMouseUp);
};

// 鼠标松开事件
const handleMouseUp = (event: MouseEvent) => {
  if (!moveIng) return;
  const endTime = Date.now();
  const duration = endTime - startTime;
  // 如果时间小于阈值，认为是点击事件
  if (duration < props.clickThreshold) emit("click", event);
  document.removeEventListener("mousemove", move);
  moveIng = false;
};
</script>

<style scoped>
.draggable-area {
  cursor: default;
  user-select: none;
}
/* 拖拽模式样式已移除，因为不再需要 */
</style>
