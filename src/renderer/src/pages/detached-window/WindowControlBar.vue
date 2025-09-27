<!--
  分离窗口控制栏组件
  提供窗口控制功能：最小化、最大化、关闭、重新附加等
-->
<template>
  <div class="window-control-bar" :style="{ '-webkit-app-region': 'drag' }">
    <!-- 左侧：窗口图标和标题 -->
    <div class="control-bar-left">
      <div class="window-icon" v-if="windowIcon">
        <img :src="windowIcon" :alt="windowTitle" class="icon-image" />
      </div>
      <div class="window-title" :title="windowTitle">
        {{ windowTitle }}
      </div>
    </div>

    <!-- 中间：状态指示器（可选） -->
    <div class="control-bar-center">
      <div v-if="isLoading" class="loading-indicator">
        <div class="loading-spinner"></div>
        <span class="loading-text">加载中...</span>
      </div>
    </div>

    <!-- 右侧：控制按钮 -->
    <div class="control-bar-right" :style="{ '-webkit-app-region': 'no-drag' }">
      <!-- 重新附加按钮 -->
      <button class="control-button reattach-button" @click="handleReattach" :disabled="isOperating"
        title="重新附加到主窗口 (Ctrl+Shift+A)">
        <svg class="button-icon" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M8 2a.5.5 0 0 1 .5.5v5.793l2.146-2.147a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L7.5 8.293V2.5A.5.5 0 0 1 8 2zM14 13.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2.5a.5.5 0 0 1 0 1H4a1 1 0 0 0-1 1v7.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H9.5a.5.5 0 0 1 0-1H12a2 2 0 0 1 2 2v7.5z" />
        </svg>
      </button>

      <!-- 最小化按钮 -->
      <button class="control-button minimize-button" @click="handleMinimize" :disabled="isOperating" title="最小化">
        <svg class="button-icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M14 8a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 .5.5z" />
        </svg>
      </button>

      <!-- 最大化/还原按钮 -->
      <button class="control-button maximize-button" @click="handleMaximize" :disabled="isOperating"
        :title="isMaximized ? '还原窗口' : '最大化'">
        <svg v-if="!isMaximized" class="button-icon" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M3 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm2-1a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H5z" />
        </svg>
        <svg v-else class="button-icon" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM2 2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H2z" />
          <path d="M2.5 4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V4z" />
        </svg>
      </button>

      <!-- 关闭按钮 -->
      <button class="control-button close-button" @click="handleClose" :disabled="isOperating" title="关闭窗口">
        <svg class="button-icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
          <path
            d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { DetachedWindowControlEvent, DetachedWindowAction } from '@/typings/window-types'

/** 组件属性 */
interface Props {
  /** 窗口标题 */
  windowTitle?: string
  /** 窗口图标 */
  windowIcon?: string
  /** 是否正在加载 */
  isLoading?: boolean
  /** 窗口ID */
  windowId?: number
  /** 视图ID */
  viewId?: string
}

/** 组件事件 */
interface Emits {
  /** 重新附加事件 */
  (e: 'reattach'): void
  /** 最小化事件 */
  (e: 'minimize'): void
  /** 最大化事件 */
  (e: 'maximize'): void
  /** 关闭事件 */
  (e: 'close'): void
  /** 控制操作事件 */
  (e: 'control-action', action: DetachedWindowAction): void
}

const props = withDefaults(defineProps<Props>(), {
  windowTitle: '分离窗口',
  windowIcon: '',
  isLoading: false
})

const emit = defineEmits<Emits>()

// 响应式状态
const isOperating = ref(false)
const isMaximized = ref(false)

// 计算属性
const effectiveTitle = computed(() => props.windowTitle || '分离窗口')

/**
 * 处理重新附加操作
 */
const handleReattach = async (): Promise<void> => {
  if (isOperating.value) return

  try {
    isOperating.value = true
    console.log('🔄 执行重新附加操作')

    // 发送控制事件
    emitControlEvent('reattach')

    // 触发组件事件
    emit('reattach')

    // 通过IPC调用主进程的重新附加功能
    if (props.windowId) {
      const result = await naimo.router.windowReattachNewView(props.windowId)
      if (result.success) {
        console.log('✅ 重新附加成功')
      } else {
        console.error('❌ 重新附加失败:', result.error)
        showNotification('重新附加失败: ' + result.error, 'error')
      }
    }
  } catch (error) {
    console.error('❌ 重新附加操作失败:', error)
    showNotification('重新附加操作失败', 'error')
  } finally {
    setTimeout(() => {
      isOperating.value = false
    }, 500)
  }
}

/**
 * 处理最小化操作
 */
const handleMinimize = async (): Promise<void> => {
  if (isOperating.value) return

  try {
    isOperating.value = true
    console.log('🔽 执行最小化操作')

    // 发送控制事件
    emitControlEvent('minimize')

    // 触发组件事件
    emit('minimize')

    // 通过IPC调用主进程的最小化功能
    const result = await naimo.router.windowMinimize()
    if (!result) {
      console.warn('⚠️ 最小化操作可能失败')
    }
  } catch (error) {
    console.error('❌ 最小化操作失败:', error)
  } finally {
    setTimeout(() => {
      isOperating.value = false
    }, 200)
  }
}

/**
 * 处理最大化/还原操作
 */
const handleMaximize = async (): Promise<void> => {
  if (isOperating.value) return

  try {
    isOperating.value = true
    console.log('🔼 执行最大化/还原操作')

    // 发送控制事件
    emitControlEvent('maximize')

    // 触发组件事件
    emit('maximize')

    // 通过IPC调用主进程的最大化功能
    const result = await naimo.router.windowMaximize()
    if (!result) {
      console.warn('⚠️ 最大化操作可能失败')
    }

    // 切换最大化状态
    isMaximized.value = !isMaximized.value
  } catch (error) {
    console.error('❌ 最大化操作失败:', error)
  } finally {
    setTimeout(() => {
      isOperating.value = false
    }, 200)
  }
}

/**
 * 处理关闭操作
 */
const handleClose = async (): Promise<void> => {
  if (isOperating.value) return

  try {
    isOperating.value = true
    console.log('❌ 执行关闭操作')

    // 发送控制事件
    emitControlEvent('close')

    // 触发组件事件
    emit('close')

    // 通过IPC调用主进程的关闭功能
    const result = await naimo.router.windowClose()
    if (!result) {
      console.warn('⚠️ 关闭操作可能失败')
    }
  } catch (error) {
    console.error('❌ 关闭操作失败:', error)
  } finally {
    // 关闭操作不需要重置状态，因为窗口会被关闭
  }
}

/**
 * 发送控制事件
 */
const emitControlEvent = (action: DetachedWindowAction): void => {
  const event: DetachedWindowControlEvent = {
    action,
    windowId: props.windowId || 0,
    viewId: props.viewId || '',
    timestamp: Date.now()
  }

  // 触发组件事件
  emit('control-action', action)

  // 发送到全局事件系统（如果需要）
  if (window.eventSystem) {
    window.eventSystem.emit('window:control:action', event)
  }
}

/**
 * 显示通知
 */
const showNotification = (message: string, type: 'success' | 'error' | 'warning' = 'info'): void => {
  if (window.eventSystem) {
    window.eventSystem.emit('notification:show', {
      message,
      type,
      duration: 3000,
      source: 'window-control-bar'
    })
  }
}

/**
 * 监听键盘快捷键
 */
const handleKeydown = (event: KeyboardEvent): void => {
  // Ctrl+Shift+A: 重新附加
  if (event.ctrlKey && event.shiftKey && event.key === 'A') {
    event.preventDefault()
    handleReattach()
    return
  }

  // Alt+F4 或 Ctrl+W: 关闭窗口
  if ((event.altKey && event.key === 'F4') || (event.ctrlKey && event.key === 'w')) {
    event.preventDefault()
    handleClose()
    return
  }
}

/**
 * 检查窗口最大化状态
 */
const checkMaximizedState = async (): Promise<void> => {
  try {
    const maximized = await naimo.router.windowIsMaximized()
    isMaximized.value = maximized
  } catch (error) {
    console.warn('⚠️ 检查窗口最大化状态失败:', error)
  }
}

// 生命周期钩子
onMounted(() => {
  // 监听键盘事件
  window.addEventListener('keydown', handleKeydown)

  // 检查初始窗口状态
  checkMaximizedState()

  console.log('🎛️ 窗口控制栏已挂载')
})

onUnmounted(() => {
  // 清理事件监听器
  window.removeEventListener('keydown', handleKeydown)

  console.log('🎛️ 窗口控制栏已卸载')
})
</script>

<style scoped>
.window-control-bar {
  display: flex;
  align-items: center;
  height: 32px;
  background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid #dee2e6;
  padding: 0 8px;
  font-size: 12px;
  color: #495057;
  position: relative;
  z-index: 1000;
}

/* 左侧区域 */
.control-bar-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.window-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  flex-shrink: 0;
}

.icon-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.window-title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #343a40;
}

/* 中间区域 */
.control-bar-center {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  margin: 0 16px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6c757d;
}

.loading-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #e9ecef;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 11px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* 右侧控制按钮区域 */
.control-bar-right {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.control-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: #6c757d;
}

.control-button:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.05);
  color: #495057;
}

.control-button:active:not(:disabled) {
  background: rgba(0, 0, 0, 0.1);
  transform: scale(0.95);
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

/* 特殊按钮样式 */
.reattach-button:hover:not(:disabled) {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
}

.minimize-button:hover:not(:disabled) {
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
}

.maximize-button:hover:not(:disabled) {
  background: rgba(0, 123, 255, 0.1);
  color: #007bff;
}

.close-button:hover:not(:disabled) {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .window-control-bar {
    background: linear-gradient(180deg, #343a40 0%, #212529 100%);
    border-bottom-color: #495057;
    color: #adb5bd;
  }

  .window-title {
    color: #f8f9fa;
  }

  .control-button {
    color: #adb5bd;
  }

  .control-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    color: #f8f9fa;
  }

  .control-button:active:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
  }

  .loading-spinner {
    border-color: #495057;
    border-top-color: #007bff;
  }

  .loading-indicator {
    color: #6c757d;
  }
}

/* 无障碍支持 */
@media (prefers-reduced-motion: reduce) {
  .control-button {
    transition: none;
  }

  .loading-spinner {
    animation: none;
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .window-control-bar {
    border-bottom-width: 2px;
  }

  .control-button {
    border: 1px solid transparent;
  }

  .control-button:hover:not(:disabled) {
    border-color: currentColor;
  }
}
</style>
