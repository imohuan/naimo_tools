<template>
  <div
    ref="draggableElement"
    class="draggable-area"
    @mousedown="handleMouseDown"
    @dblclick="(event) => $emit('dblclick', event)"
  >
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
  /**
   * 窗口类型：view（WebContentsView）或 window（BrowserWindow）
   * @default 'view'
   */
  windowType?: "view" | "window";
  /**
   * 手动指定窗口 ID（可选，如果不指定则自动获取）
   */
  windowId?: number;
}

const props = withDefaults(defineProps<Props>(), {
  clickThreshold: 100,
  windowType: "view",
});

const emit = defineEmits<{
  click: [event: MouseEvent];
  dblclick: [event: MouseEvent];
}>();

// 响应式数据
const draggableElement = ref<HTMLElement>();
let isView = true; // 是否是 View 类型
let parentWindowId = 1; // View 所在的父窗口 ID（仅在 isView=true 时使用）

// --- 修正后的拖拽状态变量 ---
// 我们需要在 mousedown 时捕获窗口和鼠标的初始位置
let initialWindowPos = { x: 0, y: 0, width: 0, height: 0 };
let initialMousePos = { x: 0, y: 0 };

let moveIng = false;
let startTime = 0;

/** 核心改动解析
handleMouseDown:
  我们不再记录 event.clientX，而是记录窗口的初始屏幕坐标 initialWindowPos = { x: window.screenX, y: window.screenY, ... }。
  同时，我们也记录鼠标的初始屏幕坐标 initialMousePos = { x: event.screenX, y: event.screenY }。这两个坐标系是对齐的。
move:
  计算的逻辑变为：窗口的新位置 = 窗口的初始位置 + 鼠标从开始到现在的总位移。
  event.screenX - initialMousePos.x 就是鼠标在 X 轴上的总位移。
  这个公式的所有基准点 (initialWindowPos, initialMousePos) 都是在拖拽开始时就固定下来的常量，所以无论 move 事件触发多少次，计算结果都是稳定且正确的。
 */

// --- 修正后的移动窗口函数 ---
const move = (event: MouseEvent) => {
  if (!moveIng) return;

  // 1. 计算从拖拽开始时，鼠标在屏幕上移动的总距离
  const deltaX = event.screenX - initialMousePos.x;
  const deltaY = event.screenY - initialMousePos.y;

  // 2. 计算窗口的全新绝对位置
  const newX = initialWindowPos.x + deltaX;
  const newY = initialWindowPos.y + deltaY;

  // 3. 将计算出的新位置发送给主进程
  // 根据窗口类型选择不同的移动方法
  if (isView) {
    // View 类型：使用 view-move，需要传递 parentWindowId
    naimo.sendTo.viewMove(
      parentWindowId,
      Math.round(newX),
      Math.round(newY),
      initialWindowPos.width,
      initialWindowPos.height
    );
  } else {
    // BrowserWindow 类型：使用 window-move，主进程会从 event.sender 中自动获取
    naimo.sendTo.windowMove(
      Math.round(newX),
      Math.round(newY),
      initialWindowPos.width,
      initialWindowPos.height
    );
  }
};

// --- 修正后的鼠标按下事件 ---
const handleMouseDown = (event: MouseEvent) => {
  if (event.button !== 0) return;

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
  startTime = Date.now();

  // 关键：在 mousedown 时记录所有初始状态的“快照”
  initialWindowPos = {
    x: window.screenX,
    y: window.screenY,
    width: window.outerWidth,
    height: window.outerHeight,
  };
  initialMousePos = { x: event.screenX, y: event.screenY }; // 使用 screenX/Y 来匹配窗口坐标

  event.preventDefault();
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", handleMouseUp);
};

// 鼠标松开事件 (这个函数逻辑是正确的，无需修改)
const handleMouseUp = (event: MouseEvent) => {
  if (!moveIng) return;
  const endTime = Date.now();
  const duration = endTime - startTime;
  if (duration < props.clickThreshold) emit("click", event);

  document.removeEventListener("mousemove", move);
  document.removeEventListener("mouseup", handleMouseUp); // 修正：mouseup 也应该在 document 上移除
  moveIng = false;
};

// 初始化窗口类型和 ID
onMounted(() => {
  isView = props.windowType === "view";

  // 如果是 View 类型，需要获取 parentWindowId（用于频繁的拖拽事件）
  if (isView) {
    if (props.windowId !== undefined) {
      // 如果手动指定了窗口 ID，直接使用
      parentWindowId = props.windowId;
    } else {
      // 通过 IPC 获取当前 View 的 parentWindowId
      naimo.router.windowGetCurrentViewInfo().then((res: any) => {
        if (res && res.parentWindowId) {
          parentWindowId = res.parentWindowId;
        } else {
          console.warn("[DraggableArea] 无法获取 View 的 parentWindowId");
        }
      });
    }
  }
  // BrowserWindow 类型不需要预先获取 ID，主进程会从 event.sender 获取
});
</script>

<style scoped>
.draggable-area {
  cursor: default;
  user-select: none;
}

/* 拖拽模式样式已移除，因为不再需要 */
</style>
