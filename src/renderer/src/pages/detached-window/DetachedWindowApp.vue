<!--
  分离窗口主应用组件
  包含控制栏和插件内容区域
-->
<template>
  <div class="flex flex-col h-screen bg-white dark:bg-slate-900">
    <!-- 窗口控制栏 -->
    <WindowControlBar :window-title="windowTitle" :window-icon="windowIcon" :is-loading="isLoading"
      :window-id="windowId" :view-id="viewId" @reattach="handleReattach" @minimize="handleMinimize"
      @maximize="handleMaximize" @close="handleClose" @control-action="handleControlAction" />

    <!-- 插件内容区域 -->
    <div class="flex-1 relative overflow-hidden bg-slate-50 dark:bg-slate-800" ref="contentAreaRef">
      <!-- 加载状态 -->
      <div v-if="isLoading"
        class="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800 z-20">
        <div class="text-center p-8 max-w-md">
          <IconMdiLoading class="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <div class="text-slate-600 dark:text-slate-400 font-medium">{{ loadingMessage }}</div>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="hasError"
        class="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800 z-20">
        <div class="text-center p-8 max-w-md">
          <IconMdiAlertCircleOutline class="w-16 h-16 text-red-500 dark:text-red-400 mx-auto mb-4 opacity-80" />
          <div class="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">加载失败</div>
          <div class="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{{ errorMessage }}</div>
          <button
            class="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
            @click="handleRetry">
            <IconMdiRefresh class="w-4 h-4" />
            重试
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!pluginUrl && !hasContent"
        class="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800 z-20">
        <div class="text-center p-8 max-w-md">
          <IconMdiPackageVariantClosed class="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4 opacity-60" />
          <div class="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">没有内容</div>
          <div class="text-slate-500 dark:text-slate-400 leading-relaxed">此窗口暂时没有可显示的内容</div>
        </div>
      </div>

      <!-- 插件内容iframe -->
      <iframe v-if="pluginUrl && !hasError" ref="pluginIframeRef" :src="pluginUrl"
        class="w-full h-full border-0 bg-white dark:bg-slate-900 rounded-lg shadow-inner" frameborder="0"
        @load="handlePluginLoaded" @error="handlePluginError"></iframe>
    </div>

    <!-- 状态栏（可选） -->
    <div v-if="showStatusBar"
      class="flex justify-between items-center h-6 px-3 bg-slate-100 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-400">
      <div class="flex items-center gap-2">
        <IconMdiPuzzleOutline v-if="pluginName" class="w-3 h-3 text-slate-500 dark:text-slate-400" />
        <span v-if="pluginName" class="font-medium text-slate-700 dark:text-slate-300">{{ pluginName }}</span>
        <span v-if="pluginVersion" class="text-slate-500 dark:text-slate-400">v{{ pluginVersion }}</span>
      </div>
      <div class="flex items-center gap-2">
        <IconMdiWindowOpenVariant class="w-3 h-3 text-slate-500 dark:text-slate-400" />
        <span class="font-mono text-slate-500 dark:text-slate-400">窗口ID: {{ windowId }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import WindowControlBar from './WindowControlBar.vue'
import { DetachedWindowAction } from '@/typings/window-types'

// 响应式状态
const isLoading = ref(true)
const hasError = ref(false)
const hasContent = ref(false)
const errorMessage = ref('')
const loadingMessage = ref('正在加载插件...')

// 窗口信息
const windowId = ref<number>(0)
const viewId = ref<string>('')
const windowTitle = ref<string>('分离窗口')
const windowIcon = ref<string>('')

// 插件信息
const pluginUrl = ref<string>('')
const pluginName = ref<string>('')
const pluginVersion = ref<string>('')
const pluginPath = ref<string>('')

// UI配置
const showStatusBar = ref(false)

// DOM引用
const contentAreaRef = ref<HTMLElement>()
const pluginIframeRef = ref<HTMLIFrameElement>()

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
    console.log('🔧 初始化分离窗口...')

    // 从URL参数或全局变量获取窗口信息
    const urlParams = new URLSearchParams(window.location.search)

    windowId.value = parseInt(urlParams.get('windowId') || '0')
    viewId.value = urlParams.get('viewId') || ''
    pluginUrl.value = urlParams.get('pluginUrl') || ''
    pluginName.value = decodeURIComponent(urlParams.get('pluginName') || '')
    pluginPath.value = decodeURIComponent(urlParams.get('pluginPath') || '')

    // 更新窗口标题
    windowTitle.value = effectiveTitle.value
    document.title = windowTitle.value

    // 如果没有插件URL，尝试从主进程获取
    if (!pluginUrl.value && viewId.value) {
      await loadPluginFromViewId()
    }

    console.log('✅ 窗口信息初始化完成:', {
      windowId: windowId.value,
      viewId: viewId.value,
      pluginName: pluginName.value,
      pluginUrl: pluginUrl.value
    })
  } catch (error) {
    console.error('❌ 初始化窗口信息失败:', error)
    handleError('初始化失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
}

/**
 * 从视图ID加载插件信息
 */
const loadPluginFromViewId = async (): Promise<void> => {
  try {
    if (!viewId.value) return

    // 这里可以调用主进程API获取视图信息
    // const viewInfo = await naimo.router.windowGetViewInfo(viewId.value)
    // if (viewInfo.success && viewInfo.data) {
    //   pluginUrl.value = viewInfo.data.url
    //   pluginName.value = viewInfo.data.pluginName
    //   pluginPath.value = viewInfo.data.pluginPath
    // }
  } catch (error) {
    console.warn('⚠️ 从视图ID加载插件信息失败:', error)
  }
}

/**
 * 处理插件加载完成
 */
const handlePluginLoaded = (): void => {
  console.log('✅ 插件加载完成')
  isLoading.value = false
  hasError.value = false
  hasContent.value = true
  loadingMessage.value = '加载完成'
}

/**
 * 处理插件加载错误
 */
const handlePluginError = (event: Event): void => {
  console.error('❌ 插件加载失败:', event)
  handleError('插件加载失败')
}

/**
 * 处理错误
 */
const handleError = (message: string): void => {
  isLoading.value = false
  hasError.value = true
  hasContent.value = false
  errorMessage.value = message
}

/**
 * 处理重试
 */
const handleRetry = async (): Promise<void> => {
  hasError.value = false
  isLoading.value = true
  loadingMessage.value = '正在重试...'

  try {
    // 重新初始化
    await initializeWindow()

    // 如果有插件URL，重新加载iframe
    if (pluginUrl.value && pluginIframeRef.value) {
      pluginIframeRef.value.src = pluginUrl.value
    }
  } catch (error) {
    handleError('重试失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
}

/**
 * 处理重新附加
 */
const handleReattach = async (): Promise<void> => {
  console.log('🔄 处理重新附加请求')

  try {
    if (windowId.value) {
      await (naimo as any).reattach()
      console.log('✅ 重新附加成功，窗口即将关闭')
      // 窗口会被主进程关闭，不需要额外操作
    }
  } catch (error) {
    console.error('❌ 重新附加操作失败:', error)
    showNotification('重新附加操作失败', 'error')
  }
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

  // 清理资源
  cleanup()

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
const showNotification = (message: string, type: 'success' | 'error' | 'warning' = 'warning'): void => {
  if ((window as any).eventSystem) {
    (window as any).eventSystem.emit('notification:show', {
      message,
      type,
      duration: 3000,
      source: 'detached-window'
    })
  }
}

/**
 * 清理资源
 */
const cleanup = (): void => {
  console.log('🧹 清理分离窗口资源')

  // 清理iframe
  if (pluginIframeRef.value) {
    pluginIframeRef.value.src = 'about:blank'
  }

  // 清理状态
  hasContent.value = false
}

/**
 * 监听窗口事件
 */
const setupWindowListeners = (): void => {
  // 监听窗口关闭前事件
  window.addEventListener('beforeunload', () => {
    cleanup()
  })

  // 监听来自主进程的消息
  if ((window as any).naimo?.ipcRenderer) {
    (window as any).naimo.ipcRenderer.on('window:update-info', (data: any) => {
      console.log('📡 收到窗口信息更新:', data)

      if (data.windowId === windowId.value) {
        if (data.title) windowTitle.value = data.title
        if (data.icon) windowIcon.value = data.icon
        if (data.pluginName) pluginName.value = data.pluginName
      }
    })
  }
}

// 生命周期钩子
onMounted(async () => {
  console.log('🪟 分离窗口应用已挂载')

  // 设置窗口监听器
  setupWindowListeners()

  // 初始化窗口
  await initializeWindow()

  // 如果没有插件URL，显示空状态
  if (!pluginUrl.value) {
    isLoading.value = false
    loadingMessage.value = '等待内容加载...'
  }
})

onUnmounted(() => {
  console.log('🪟 分离窗口应用已卸载')
  cleanup()
})
</script>
