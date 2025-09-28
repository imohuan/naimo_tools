<!--
  分离窗口控制栏组件
  提供窗口控制功能：最小化、最大化、关闭、重新附加等
-->
<template>
  <div
    class="flex items-center h-10 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 text-slate-700 dark:text-slate-300 shadow-sm backdrop-blur-sm"
    style="-webkit-app-region: drag">
    <!-- 左侧：窗口图标和标题 -->
    <div class="flex items-center flex-1 min-w-0">
      <div v-if="windowIcon" class="flex-shrink-0 w-4 h-4 mr-3">
        <img :src="windowIcon" :alt="windowTitle" class="w-full h-full object-contain rounded-sm" />
      </div>
      <div class="font-medium text-sm text-slate-800 dark:text-slate-200 truncate select-none" :title="windowTitle">
        {{ windowTitle }}
      </div>
    </div>

    <!-- 中间：状态指示器（可选） -->
    <div class="flex items-center justify-center mx-4">
      <div v-if="isLoading" class="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <IconMdiLoading class="w-3 h-3 text-blue-500 animate-spin" />
        <span class="text-xs font-medium">加载中...</span>
      </div>
    </div>

    <!-- 右侧：控制按钮 -->
    <div class="flex items-center gap-1 flex-shrink-0" style="-webkit-app-region: no-drag">
      <!-- 重新附加按钮 -->
      <button
        class="group flex items-center justify-center w-8 h-6 rounded-md transition-all duration-200 hover:bg-green-100 dark:hover:bg-green-900/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        @click="handleReattach" :disabled="isOperating" title="重新附加到主窗口 (Ctrl+Shift+A)">
        <IconMdiDockWindow
          class="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
      </button>

      <!-- 最小化按钮 -->
      <button
        class="group flex items-center justify-center w-8 h-6 rounded-md transition-all duration-200 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        @click="handleMinimize" :disabled="isOperating" title="最小化">
        <IconMdiWindowMinimize
          class="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors" />
      </button>

      <!-- 最大化/还原按钮 -->
      <button
        class="group flex items-center justify-center w-8 h-6 rounded-md transition-all duration-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        @click="handleMaximize" :disabled="isOperating" :title="isMaximized ? '还原窗口' : '最大化'">
        <IconMdiWindowMaximize v-if="!isMaximized"
          class="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
        <IconMdiWindowRestore v-else
          class="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
      </button>

      <!-- 关闭按钮 -->
      <button
        class="group flex items-center justify-center w-8 h-6 rounded-md transition-all duration-200 hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        @click="handleClose" :disabled="isOperating" title="关闭窗口">
        <IconMdiWindowClose
          class="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { DetachedWindowAction, type DetachedWindowControlEvent } from '@/typings/windowTypes'

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

// 计算属性（暂未使用）
// const effectiveTitle = computed(() => props.windowTitle || '分离窗口')

/**
 * 处理重新附加操作
 */
const handleReattach = async (): Promise<void> => {
  if (isOperating.value) return

  try {
    isOperating.value = true
    console.log('🔄 执行重新附加操作')

    // 发送控制事件
    emitControlEvent(DetachedWindowAction.REATTACH)

    // 触发组件事件
    emit('reattach')

    // 通过IPC调用主进程的重新附加功能
    if (props.windowId) {
      try {
        await (naimo as any).reattach()
        console.log('✅ 重新附加成功')
      } catch (error) {
        console.error('❌ 重新附加失败:', error)
        showNotification('重新附加失败', 'error')
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
    emitControlEvent(DetachedWindowAction.MINIMIZE)

    // 触发组件事件
    emit('minimize')

    // 通过IPC调用主进程的最小化功能
    await (naimo as any).minimize()
    console.log('✅ 最小化成功')
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
    emitControlEvent(DetachedWindowAction.MAXIMIZE)

    // 触发组件事件
    emit('maximize')

    // 通过IPC调用主进程的最大化功能
    await (naimo as any).maximize()
    console.log('✅ 最大化/还原成功')

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
    emitControlEvent(DetachedWindowAction.CLOSE)

    // 触发组件事件
    emit('close')

    // 通过IPC调用主进程的关闭功能
    await (naimo as any).close()
    console.log('✅ 关闭成功')
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
  if ((window as any).eventSystem) {
    (window as any).eventSystem.emit('window:control:action', event)
  }
}

/**
 * 显示通知
 */
const showNotification = (message: string, type: 'success' | 'error' | 'warning' = 'warning'): void => {
  if ((window as any).eventSystem) {
    (window as any).eventSystem.emit('notification:show', {
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
    // 分离窗口暂时不支持检查最大化状态，使用默认值
    isMaximized.value = false
    console.log('🔍 窗口最大化状态已初始化')
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
