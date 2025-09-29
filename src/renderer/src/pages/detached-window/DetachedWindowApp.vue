<!--
  分离窗口控制栏组件
  只包含窗口控制栏，实际的WebContentsView由主进程直接管理
-->
<template>
  <div class="flex flex-col h-screen bg-transparent">
    <!-- 窗口控制栏 -->
    <WindowControlBar :window-title="windowTitle" :window-icon="windowIcon" :is-loading="isLoading"
      :window-id="windowId" :view-id="viewId" @reattach="handleReattach" @minimize="handleMinimize"
      @maximize="handleMaximize" @close="handleClose" @control-action="handleControlAction" />

    <!-- 状态栏（可选，用于调试） -->
    <div v-if="showStatusBar"
      class="flex justify-between items-center h-6 px-3 bg-slate-100 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-400">
      <div class="flex items-center gap-2">
        <IconMdiPuzzleOutline v-if="pluginName" class="w-3 h-3 text-slate-500 dark:text-slate-400" />
        <span v-if="pluginName" class="font-medium text-slate-700 dark:text-slate-300">{{ pluginName }}</span>
        <span v-if="pluginVersion" class="text-slate-500 dark:text-slate-400">v{{ pluginVersion }}</span>
      </div>
      <div class="flex items-center gap-2">
        <IconMdiWindowOpenVariant class="w-3 h-3 text-slate-500 dark:text-slate-400" />
        <span class="font-mono text-slate-500 dark:text-slate-400">窗口ID: {{ windowId }} | 视图ID: {{ viewId }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import WindowControlBar from './WindowControlBar.vue'
import { DetachedWindowAction } from '@/typings/windowTypes'
import type { WindowControlAPI } from './types/winControl'

// 响应式状态
const isLoading = ref(false)

// 窗口信息
const windowId = ref<number>(0)
const viewId = ref<string>('')
const windowTitle = ref<string>('分离窗口')
const windowIcon = ref<string>('')

// 插件信息
const pluginName = ref<string>('')
const pluginVersion = ref<string>('')

// UI配置
const showStatusBar = ref(false)

// 计算属性
const effectiveTitle = computed(() => {
  if (pluginName.value) {
    return `${pluginName.value} - 分离窗口`
  }
  return windowTitle.value || '分离窗口'
})

/**
 * 初始化窗口信息
 */
const initializeWindow = async (): Promise<void> => {
  try {
    console.log('🔧 初始化分离窗口控制栏...')

    // 从URL参数获取窗口信息
    const urlParams = new URLSearchParams(window.location.search)

    windowId.value = parseInt(urlParams.get('windowId') || '0')
    viewId.value = urlParams.get('viewId') || ''
    pluginName.value = decodeURIComponent(urlParams.get('pluginName') || '')

    // 更新窗口标题
    windowTitle.value = effectiveTitle.value
    document.title = windowTitle.value

    console.log('✅ 控制栏初始化完成:', {
      windowId: windowId.value,
      viewId: viewId.value,
      pluginName: pluginName.value,
      urlSearch: window.location.search
    })

    // 验证窗口ID是否有效
    if (windowId.value <= 0) {
      console.warn('⚠️ 窗口ID无效:', windowId.value)
      showNotification('窗口ID无效，控制按钮可能无法正常工作', 'warning')
    }
  } catch (error) {
    console.error('❌ 初始化控制栏失败:', error)
  }
}


/**
 * 处理重新附加
 */
const handleReattach = async (): Promise<void> => {
  console.log('🔄 处理重新附加请求')
  // 重新附加由控制栏组件直接处理
}

/**
 * 处理最小化
 */
const handleMinimize = (): void => {
  console.log('🔽 处理最小化请求')
  // 最小化由控制栏组件直接处理
}

/**
 * 处理最大化
 */
const handleMaximize = (): void => {
  console.log('🔼 处理最大化请求')
  // 最大化由控制栏组件直接处理
}

/**
 * 处理关闭
 */
const handleClose = (): void => {
  console.log('❌ 处理关闭请求')
  // 关闭由控制栏组件直接处理
}

/**
 * 处理控制操作
 */
const handleControlAction = (action: DetachedWindowAction): void => {
  console.log('🎛️ 控制操作:', action)

  // 可以在这里添加额外的逻辑
  switch (action) {
    case DetachedWindowAction.REATTACH:
      // 重新附加的额外处理
      break
    case DetachedWindowAction.MINIMIZE:
      // 最小化的额外处理
      break
    case DetachedWindowAction.MAXIMIZE:
      // 最大化的额外处理
      break
    case DetachedWindowAction.CLOSE:
      // 关闭的额外处理
      break
  }
}

/**
 * 显示通知
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const showNotification = (message: string, type: 'success' | 'error' | 'warning' = 'warning'): void => {
  console.log(`通知: ${message} (${type})`)
}

/**
 * 监听窗口事件
 */
const setupWindowListeners = (): void => {
  // 当前预加载仅提供基础窗口控制能力，暂不支持事件总线
}

// 生命周期钩子
onMounted(async () => {
  console.log('🪟 分离窗口控制栏已挂载')

  // 设置窗口监听器
  setupWindowListeners()

  // 初始化窗口
  await initializeWindow()
})

onUnmounted(() => {
  console.log('🪟 分离窗口控制栏已卸载')
})
</script>
