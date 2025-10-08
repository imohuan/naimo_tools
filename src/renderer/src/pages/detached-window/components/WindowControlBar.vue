<!--
  分离窗口控制栏组件
  提供窗口控制功能：最小化、最大化、关闭、重新附加等
-->
<template>
  <!-- 控制栏容器 - 与 App.vue 的搜索头部区域保持一致的高度和样式 -->
  <div
    class="w-full flex items-center justify-between bg-white transition-all duration-200 px-3 border-b border-gray-100"
    :class="{ 'rounded-t-xl': !isFullscreen }"
    :style="{ height: `${controlBarHeight}px` }"
    style="-webkit-app-region: drag"
  >
    <!-- 左侧：窗口图标和标题 -->
    <div class="flex items-center flex-1 min-w-0 gap-3">
      <!-- 窗口图标 -->
      <div v-if="windowIcon" class="flex-shrink-0 w-5 h-5">
        <img
          :src="windowIcon"
          :alt="windowTitle"
          class="w-full h-full object-contain rounded-sm"
        />
      </div>

      <!-- 默认图标（如果没有窗口图标） -->
      <div
        v-else
        class="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400"
      >
        <IconMdiPuzzle class="w-5 h-5" />
      </div>

      <!-- 窗口标题 -->
      <div
        class="font-medium text-sm text-gray-800 truncate select-none"
        :title="windowTitle"
      >
        {{ windowTitle }}
      </div>

      <!-- 加载指示器 -->
      <div v-if="isLoading" class="flex items-center gap-2 text-gray-500">
        <IconMdiLoading class="w-4 h-4 text-indigo-500 animate-spin" />
        <span class="text-xs font-medium">加载中...</span>
      </div>
    </div>

    <!-- 右侧：控制按钮 -->
    <div
      class="flex items-center gap-1 flex-shrink-0"
      style="-webkit-app-region: no-drag"
    >
      <!-- 重新附加按钮 -->
      <button
        tabindex="-1"
        class="group flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 hover:bg-green-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent focus:outline-none"
        @click="handleShowPluginMenu"
      >
        <!-- 插件设置按钮 -->
        <PluginSettingsButton
          ref="pluginSettingsButton"
          v-if="props.pluginId"
          :plugin-id="props.pluginId"
          :plugin-name="props.pluginName"
          icon-type="menu"
          class="pointer-events-none"
        />
      </button>

      <!-- 重新附加按钮 -->
      <button
        tabindex="-1"
        class="group flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 hover:bg-green-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent focus:outline-none"
        @click="handleReattach"
        :disabled="isOperating"
        title="重新附加到主窗口 (Ctrl+Shift+A)"
      >
        <IconMdiDockWindow
          class="w-5 h-5 text-gray-600 group-hover:text-green-600 transition-colors"
        />
      </button>

      <!-- 窗口置顶按钮 -->
      <button
        tabindex="-1"
        class="group flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent focus:outline-none"
        :class="
          isAlwaysOnTop
            ? 'bg-purple-50 hover:bg-purple-100'
            : 'hover:bg-gray-100'
        "
        @click="handleToggleAlwaysOnTop"
        :disabled="isOperating"
        :title="isAlwaysOnTop ? '取消置顶' : '窗口置顶'"
      >
        <IconMdiPinOutline
          v-if="!isAlwaysOnTop"
          class="w-5 h-5 text-gray-600 group-hover:text-purple-600 transition-colors"
        />
        <IconMdiPin v-else class="w-5 h-5 text-purple-600 transition-colors" />
      </button>

      <!-- 最小化按钮 -->
      <button
        tabindex="-1"
        class="group flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 hover:bg-gray-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent focus:outline-none"
        @click="handleMinimize"
        :disabled="isOperating"
        title="最小化"
      >
        <IconMdiWindowMinimize
          class="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors"
        />
      </button>

      <!-- 最大化/还原按钮 -->
      <button
        tabindex="-1"
        class="group flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 hover:bg-blue-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent focus:outline-none"
        @click="handleMaximize"
        :disabled="isOperating"
        :title="isMaximized ? '还原窗口' : '最大化'"
      >
        <IconMdiWindowMaximize
          v-if="!isMaximized"
          class="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors"
        />
        <IconMdiWindowRestore
          v-else
          class="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors"
        />
      </button>

      <!-- 关闭按钮 -->
      <button
        tabindex="-1"
        class="group flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 hover:bg-red-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent focus:outline-none"
        @click="handleClose"
        :disabled="isOperating"
        title="关闭窗口"
      >
        <IconMdiWindowClose
          class="w-5 h-5 text-gray-600 group-hover:text-red-600 transition-colors"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { DetachedWindowAction } from "@/typings/windowTypes";
import type { WindowControlAPI } from "../types/winControl";
import { DEFAULT_WINDOW_LAYOUT } from "@shared/config/windowLayoutConfig";
import PluginSettingsButton from "@/components/Common/PluginSettingsButton.vue";

/** 组件属性 */
interface Props {
  /** 窗口标题 */
  windowTitle?: string;
  /** 窗口图标 */
  windowIcon?: string;
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 窗口ID */
  windowId?: number;
  /** 视图ID */
  viewId?: string;
  /** 是否全屏 */
  isFullscreen?: boolean;
  /** 插件ID */
  pluginId?: string;
  /** 插件名称 */
  pluginName?: string;
}

/** 组件事件 */
interface Emits {
  /** 重新附加事件 */
  (e: "reattach"): void;
  /** 最小化事件 */
  (e: "minimize"): void;
  /** 最大化事件 */
  (e: "maximize"): void;
  /** 关闭事件 */
  (e: "close"): void;
  /** 控制操作事件 */
  (e: "control-action", action: DetachedWindowAction): void;
}
const winControl = (window as any).naimo as Partial<WindowControlAPI>;
const pluginSettingsButton = ref<InstanceType<typeof PluginSettingsButton>>();

const props = withDefaults(defineProps<Props>(), {
  windowTitle: "分离窗口",
  windowIcon: "",
  isLoading: false,
  isFullscreen: false,
  pluginId: "",
  pluginName: "",
});

const emit = defineEmits<Emits>();

// 响应式状态
const isOperating = ref(false);
const isMaximized = ref(false);
const isAlwaysOnTop = ref(false);

// 从配置文件读取控制栏高度
const controlBarHeight = computed(
  () => DEFAULT_WINDOW_LAYOUT.detachedWindow.controlBarHeight
);

// 计算属性（暂未使用）
// const effectiveTitle = computed(() => props.windowTitle || '分离窗口')

const handleShowPluginMenu = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  pluginSettingsButton.value?.showPluginMenu();
};

/**
 * 处理重新附加操作
 */
const handleReattach = async (): Promise<void> => {
  if (isOperating.value) return;

  try {
    isOperating.value = true;
    console.log("🔄 执行重新附加操作");

    // 发送控制事件
    emitControlEvent(DetachedWindowAction.REATTACH);

    // 触发组件事件
    emit("reattach");

    // 通过IPC调用主进程的重新附加功能
    if (!winControl?.reattach) {
      console.warn("⚠️ 未找到重新附加API (naimo.reattach)");
      showNotification("未找到重新附加能力", "warning");
    } else {
      try {
        await winControl.reattach();
        console.log("✅ 重新附加成功");
      } catch (error) {
        console.error("❌ 重新附加失败:", error);
        showNotification("重新附加失败", "error");
      }
    }
  } catch (error) {
    console.error("❌ 重新附加操作失败:", error);
    showNotification("重新附加操作失败", "error");
  } finally {
    setTimeout(() => {
      isOperating.value = false;
    }, 500);
  }
};

/**
 * 处理最小化操作
 */
const handleMinimize = async (): Promise<void> => {
  if (isOperating.value) return;

  try {
    isOperating.value = true;
    console.log("🔽 执行最小化操作");

    // 发送控制事件
    emitControlEvent(DetachedWindowAction.MINIMIZE);

    // 触发组件事件
    emit("minimize");

    // 通过IPC调用主进程的最小化功能 - 使用分离窗口专用的控制方法

    if (!winControl?.minimize) {
      console.warn("⚠️ 未找到最小化API (naimo.minimize)");
      showNotification("未找到最小化能力", "warning");
    } else {
      try {
        await winControl.minimize();
        console.log("✅ 最小化成功");
      } catch (error) {
        console.error("❌ 最小化操作失败:", error);
        showNotification("最小化失败", "error");
      }
    }
  } catch (error) {
    console.error("❌ 最小化操作失败:", error);
  } finally {
    setTimeout(() => {
      isOperating.value = false;
    }, 200);
  }
};

/**
 * 处理最大化/还原操作
 */
const handleMaximize = async (): Promise<void> => {
  if (isOperating.value) return;

  try {
    isOperating.value = true;
    console.log("🔼 执行最大化/还原操作");

    // 发送控制事件
    emitControlEvent(DetachedWindowAction.MAXIMIZE);

    // 触发组件事件
    emit("maximize");

    // 通过IPC调用主进程的最大化功能 - 使用分离窗口专用的控制方法
    if (!winControl?.maximize) {
      console.warn("⚠️ 未找到最大化API (naimo.maximize)");
      showNotification("未找到最大化能力", "warning");
    } else {
      try {
        await winControl.maximize();
        console.log("✅ 最大化/还原指令已发送");
        isMaximized.value = !isMaximized.value;
      } catch (error) {
        console.error("❌ 最大化操作失败:", error);
        showNotification("最大化失败", "error");
      }
    }
  } catch (error) {
    console.error("❌ 最大化操作失败:", error);
  } finally {
    setTimeout(() => {
      isOperating.value = false;
    }, 200);
  }
};

/**
 * 处理关闭操作
 */
const handleClose = async (): Promise<void> => {
  if (isOperating.value) return;

  try {
    isOperating.value = true;
    console.log("❌ 执行关闭操作");

    // 发送控制事件
    emitControlEvent(DetachedWindowAction.CLOSE);

    // 触发组件事件
    emit("close");

    // 通过IPC调用主进程的关闭功能 - 使用分离窗口专用的控制方法
    const winControl = (window as any).naimo as Partial<WindowControlAPI>;
    if (!winControl?.close) {
      console.warn("⚠️ 未找到关闭API (naimo.close)");
      showNotification("未找到关闭能力", "warning");
    } else {
      try {
        await winControl.close();
        console.log("✅ 关闭指令已发送");
      } catch (error) {
        console.error("❌ 关闭操作失败:", error);
        showNotification("关闭失败", "error");
      }
    }
  } catch (error) {
    console.error("❌ 关闭操作失败:", error);
  } finally {
    // 关闭操作不需要重置状态，因为窗口会被关闭
  }
};

/**
 * 处理窗口置顶操作
 */
const handleToggleAlwaysOnTop = async (): Promise<void> => {
  if (isOperating.value) return;

  try {
    isOperating.value = true;
    const newState = !isAlwaysOnTop.value;
    console.log(`📌 执行窗口置顶操作: ${newState ? "置顶" : "取消置顶"}`);

    // 通过IPC调用主进程的置顶功能
    if (!winControl?.setAlwaysOnTop) {
      console.warn("⚠️ 未找到置顶API (naimo.setAlwaysOnTop)");
      showNotification("未找到置顶能力", "warning");
    } else {
      try {
        await winControl.setAlwaysOnTop(newState);
        isAlwaysOnTop.value = newState;
        console.log(`✅ 窗口置顶状态已更新: ${newState}`);
      } catch (error) {
        console.error("❌ 置顶操作失败:", error);
        showNotification("置顶操作失败", "error");
      }
    }
  } catch (error) {
    console.error("❌ 置顶操作失败:", error);
  } finally {
    setTimeout(() => {
      isOperating.value = false;
    }, 200);
  }
};

/**
 * 发送控制事件
 */
const emitControlEvent = (action: DetachedWindowAction): void => {
  // 触发组件事件
  emit("control-action", action);
};

/**
 * 显示通知
 */
const showNotification = (
  message: string,
  type: "success" | "error" | "warning" = "warning"
): void => {
  console.log(`通知[${type}]: ${message}`);
};

/**
 * 监听键盘快捷键
 */
const handleKeydown = (event: KeyboardEvent): void => {
  // Ctrl+Shift+A: 重新附加
  if (event.ctrlKey && event.shiftKey && event.key === "A") {
    event.preventDefault();
    handleReattach();
    return;
  }

  // Alt+F4 或 Ctrl+W: 关闭窗口
  if (
    (event.altKey && event.key === "F4") ||
    (event.ctrlKey && event.key === "w")
  ) {
    event.preventDefault();
    handleClose();
    return;
  }
};

/**
 * 检查窗口最大化状态
 */
const checkMaximizedState = async (): Promise<void> => {
  try {
    // 分离窗口暂时不支持检查最大化状态，使用默认值
    isMaximized.value = false;
    console.log("🔍 窗口最大化状态已初始化");
  } catch (error) {
    console.warn("⚠️ 检查窗口最大化状态失败:", error);
  }
};

/**
 * 检查窗口置顶状态
 */
const checkAlwaysOnTopState = async (): Promise<void> => {
  try {
    if (!winControl?.isAlwaysOnTop) {
      console.warn("⚠️ 未找到检查置顶状态API (naimo.isAlwaysOnTop)");
      return;
    }

    isAlwaysOnTop.value = await winControl.isAlwaysOnTop();
    console.log("🔍 窗口置顶状态已初始化:", isAlwaysOnTop.value);
  } catch (error) {
    console.warn("⚠️ 检查窗口置顶状态失败:", error);
  }
};

// 生命周期钩子
onMounted(() => {
  // 监听键盘事件
  window.addEventListener("keydown", handleKeydown);

  // 检查初始窗口状态
  checkMaximizedState();
  checkAlwaysOnTopState();

  console.log("🎛️ 窗口控制栏已挂载");
});

onUnmounted(() => {
  // 清理事件监听器
  window.removeEventListener("keydown", handleKeydown);

  console.log("🎛️ 窗口控制栏已卸载");
});
</script>
