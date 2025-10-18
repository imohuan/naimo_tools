<!--
  分离窗口控制栏组件
  只包含窗口控制栏，实际的WebContentsView由主进程直接管理
-->
<template>
  <!-- 外层容器 - 根据全屏状态动态调整 padding -->
  <div class="w-full h-full bg-transparent" :class="{ 'p-2': !isFullscreen }">
    <!-- 主应用容器 - 使用 flex 布局，根据全屏状态调整圆角和阴影 -->
    <div
      class="w-full bg-transparent relative overflow-hidden h-full transition-all duration-200 flex flex-col"
      :class="{ 'rounded-xl': !isFullscreen }"
      :style="
        isFullscreen ? {} : { boxShadow: '0 1px 3px 0 rgba(60, 72, 120, 0.48)' }
      "
    >
      <!-- 窗口控制栏 - 作为顶部固定区域 -->
      <WindowControlBar
        :window-title="windowTitle"
        :window-icon="windowIcon"
        :is-loading="isLoading"
        :window-id="windowId"
        :view-id="viewId"
        :is-fullscreen="isFullscreen"
        :plugin-name="pluginName"
        :plugin-id="pluginId"
        @reattach="handleReattach"
        @minimize="handleMinimize"
        @maximize="handleMaximize"
        @close="handleClose"
        @control-action="handleControlAction"
      />

      <!-- 内容区域占位符 - 为上层的 WebContentsView 提供白色背景 -->
      <!-- 控制栏视图在底层，内容视图(originalView)在上层覆盖此区域 -->
      <!-- 使用 flex-1 自动填充剩余空间，不需要手动计算高度 -->
      <!-- 根据全屏状态动态调整底部圆角 -->
      <div class="flex-1 bg-white" :class="{ 'rounded-b-xl': !isFullscreen }">
        <!-- WebContentsView 将通过主进程定位到这个区域的上方 -->
      </div>

      <!-- 状态栏（可选，用于调试） -->
      <div
        v-if="showStatusBar"
        class="absolute bottom-0 left-0 right-0 flex justify-between items-center h-6 px-3 bg-slate-100 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-400"
      >
        <div class="flex items-center gap-2">
          <IconMdiPuzzleOutline
            v-if="pluginName"
            class="w-3 h-3 text-slate-500 dark:text-slate-400"
          />
          <span
            v-if="pluginName"
            class="font-medium text-slate-700 dark:text-slate-300"
            >{{ pluginName }}</span
          >
          <span v-if="pluginVersion" class="text-slate-500 dark:text-slate-400"
            >v{{ pluginVersion }}</span
          >
        </div>
        <div class="flex items-center gap-2">
          <IconMdiWindowOpenVariant
            class="w-3 h-3 text-slate-500 dark:text-slate-400"
          />
          <span class="font-mono text-slate-500 dark:text-slate-400"
            >窗口ID: {{ windowId }} | 视图ID: {{ viewId }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import WindowControlBar from "./components/WindowControlBar.vue";
import { DetachedWindowAction } from "@/typings/windowTypes";

// 响应式状态
const isLoading = ref(false);
const isFullscreen = ref(false);

// 窗口信息
const windowId = ref<number>(0);
const viewId = ref<string>("");
const windowTitle = ref<string>("分离窗口");
const windowIcon = ref<string>("");

// 插件信息
const pluginId = ref<string>("");
const pluginName = ref<string>("");
const pluginVersion = ref<string>("");

// UI配置
const showStatusBar = ref(false);

// IPC监听器取消订阅函数
let unsubscribeInit: (() => void) | null = null;

// 计算属性
const effectiveTitle = computed(() => {
  if (pluginName.value) {
    return `${pluginName.value} - 分离窗口`;
  }
  return windowTitle.value || "分离窗口";
});

/**
 * 初始化窗口信息
 * 监听来自主进程的初始化数据
 */
const initializeWindow = async (): Promise<void> => {
  try {
    console.log("🔧 初始化分离窗口控制栏...");

    // 监听主进程发送的初始化数据
    const naimo = (window as any).naimo;
    if (!naimo?.onDetachedWindowInit) {
      console.error("❌ naimo.onDetachedWindowInit 方法不可用");
      showNotification("窗口初始化失败，缺少必要的API", "error");
      return;
    }

    // 设置IPC监听器
    unsubscribeInit = naimo.onDetachedWindowInit((data: any) => {
      console.log("📨 收到分离窗口初始化数据:", data);

      // 更新窗口信息
      windowId.value = data.windowId || 0;
      viewId.value = data.viewId || "";
      pluginId.value = data.pluginId || "";
      pluginName.value = data.pluginName || "";
      pluginVersion.value = data.pluginVersion || "";

      // 更新窗口标题
      windowTitle.value = effectiveTitle.value;
      document.title = windowTitle.value;

      console.log("✅ 控制栏初始化完成:", {
        windowId: windowId.value,
        viewId: viewId.value,
        pluginName: pluginName.value,
        pluginVersion: pluginVersion.value,
        effectiveTitle: effectiveTitle.value,
        windowTitle: windowTitle.value,
      });

      naimo.router.windowOpenViewDevTools(viewId.value);

      // 验证窗口ID是否有效
      if (windowId.value <= 0) {
        console.warn("⚠️ 窗口ID无效:", windowId.value);
        showNotification("窗口ID无效，控制按钮可能无法正常工作", "warning");
      }
    });

    console.log("✅ IPC监听器已设置，等待初始化数据...");
  } catch (error) {
    console.error("❌ 初始化控制栏失败:", error);
  }
};

/**
 * 处理重新附加
 */
const handleReattach = async (): Promise<void> => {
  console.log("🔄 处理重新附加请求");
  // 重新附加由控制栏组件直接处理
};

/**
 * 处理最小化
 */
const handleMinimize = (): void => {
  console.log("🔽 处理最小化请求");
  // 最小化由控制栏组件直接处理
};

/**
 * 处理最大化
 */
const handleMaximize = (): void => {
  console.log("🔼 处理最大化请求");
  // 最大化由控制栏组件直接处理
};

/**
 * 处理关闭
 */
const handleClose = (): void => {
  console.log("❌ 处理关闭请求");
  // 关闭由控制栏组件直接处理
};

/**
 * 处理控制操作
 */
const handleControlAction = (action: DetachedWindowAction): void => {
  console.log("🎛️ 控制操作:", action);

  // 可以在这里添加额外的逻辑
  switch (action) {
    case DetachedWindowAction.REATTACH:
      // 重新附加的额外处理
      break;
    case DetachedWindowAction.MINIMIZE:
      // 最小化的额外处理
      break;
    case DetachedWindowAction.MAXIMIZE:
      // 最大化的额外处理
      break;
    case DetachedWindowAction.CLOSE:
      // 关闭的额外处理
      break;
  }
};

/**
 * 显示通知
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const showNotification = (
  message: string,
  type: "success" | "error" | "warning" = "warning"
): void => {
  console.log(`通知: ${message} (${type})`);
};

/**
 * 检查窗口是否全屏
 * 通过 IPC 从主进程获取准确的窗口状态
 */
let checkFullscreenTimer: number | null = null;

const checkFullscreenState = async (): Promise<void> => {
  // 清除之前的定时器
  if (checkFullscreenTimer) {
    clearTimeout(checkFullscreenTimer);
  }

  // 延迟检测，等待窗口调整完成
  checkFullscreenTimer = window.setTimeout(async () => {
    try {
      const winControl = (window as any).naimo;
      if (!winControl?.isFullscreen) {
        console.warn("⚠️ isFullscreen 方法不可用");
        return;
      }

      // 通过 IPC 获取主进程的窗口状态
      const newFullscreenState = await winControl.isFullscreen();

      // 只在状态改变时更新，避免不必要的重渲染
      if (isFullscreen.value !== newFullscreenState) {
        isFullscreen.value = newFullscreenState;
        console.log("🖥️ 全屏状态已更新 (from IPC):", {
          isFullscreen: isFullscreen.value,
        });
      }
    } catch (error) {
      console.error("❌ 检查全屏状态失败:", error);
    }
  }, 100); // 延迟 100ms 等待窗口调整完成
};

/**
 * 监听窗口事件
 */
const setupWindowListeners = (): void => {
  // 初始检查（异步）
  checkFullscreenState();

  // 监听窗口大小变化
  window.addEventListener("resize", () => {
    checkFullscreenState();
  });
};

// 生命周期钩子
onMounted(async () => {
  console.log("🪟 分离窗口控制栏已挂载");

  // 设置窗口监听器
  setupWindowListeners();

  // 初始化窗口
  await initializeWindow();
});

onUnmounted(() => {
  // 清理IPC监听器
  if (unsubscribeInit) {
    unsubscribeInit();
    console.log("✅ IPC监听器已取消");
  }

  // 清理事件监听器
  window.removeEventListener("resize", checkFullscreenState);

  // 清理定时器
  if (checkFullscreenTimer) {
    clearTimeout(checkFullscreenTimer);
  }

  console.log("🪟 分离窗口控制栏已卸载");
});
</script>
