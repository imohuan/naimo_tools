<!--
  分离窗口主应用组件
  包含控制栏和插件内容区域
-->
<template>
  <div class="detached-window-app">
    <!-- 窗口控制栏 -->
    <WindowControlBar :window-title="windowTitle" :window-icon="windowIcon" :is-loading="isLoading"
      :window-id="windowId" :view-id="viewId" @reattach="handleReattach" @minimize="handleMinimize"
      @maximize="handleMaximize" @close="handleClose" @control-action="handleControlAction" />

    <!-- 插件内容区域 -->
    <div class="content-area" ref="contentAreaRef">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-container">
          <div class="loading-spinner-large"></div>
          <div class="loading-message">{{ loadingMessage }}</div>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="hasError" class="error-overlay">
        <div class="error-container">
          <div class="error-icon">⚠️</div>
          <div class="error-title">加载失败</div>
          <div class="error-message">{{ errorMessage }}</div>
          <button class="retry-button" @click="handleRetry">重试</button>
        </div>
      </div>

      <!-- 空状态 */
      <div v-else-if="!pluginUrl && !hasContent" class="empty-overlay">
        <div class="empty-container">
          <div class="empty-icon">📦</div>
          <div class="empty-title">没有内容</div>
          <div class="empty-message">此窗口暂时没有可显示的内容</div>
        </div>
      </div>

      <!-- 插件内容iframe -->
      <iframe v-if="pluginUrl && !hasError" ref="pluginIframeRef" :src="pluginUrl" class="plugin-iframe" frameborder="0"
        @load="handlePluginLoaded" @error="handlePluginError"></iframe>
    </div>

    <!-- 状态栏（可选） -->
    <div v-if="showStatusBar" class="status-bar">
      <div class="status-left">
        <span v-if="pluginName" class="plugin-name">{{ pluginName }}</span>
        <span v-if="pluginVersion" class="plugin-version">v{{ pluginVersion }}</span>
      </div>
      <div class="status-right">
        <span class="window-info">窗口ID: {{ windowId }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import WindowControlBar from './WindowControlBar.vue'
import type { DetachedWindowAction } from '@/typings/window-types'

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
      const result = await naimo.router.windowReattachNewView(windowId.value)
      if (result.success) {
        console.log('✅ 重新附加成功，窗口即将关闭')
        // 窗口会被主进程关闭，不需要额外操作
      } else {
        console.error('❌ 重新附加失败:', result.error)
        showNotification('重新附加失败: ' + result.error, 'error')
      }
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
    case 'reattach':
      // 重新附加的额外处理
      break
    case 'minimize':
      // 最小化的额外处理
      break
    case 'maximize':
      // 最大化的额外处理
      break
    case 'close':
      // 关闭的额外处理
      break
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
  window.addEventListener('beforeunload', (event) => {
    cleanup()
  })

  // 监听来自主进程的消息
  if (window.naimo?.ipcRenderer) {
    window.naimo.ipcRenderer.on('window:update-info', (data: any) => {
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

<style scoped>
.detached-window-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #ffffff;
}

/* 内容区域 */
.content-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background-color: #f8f9fa;
}

.plugin-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background-color: #ffffff;
}

/* 覆盖层样式 */
.loading-overlay,
.error-overlay,
.empty-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8f9fa;
  z-index: 100;
}

.loading-container,
.error-container,
.empty-container {
  text-align: center;
  padding: 32px;
  max-width: 400px;
}

/* 加载状态 */
.loading-spinner-large {
  width: 32px;
  height: 32px;
  border: 3px solid #e9ecef;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

.loading-message {
  color: #6c757d;
  font-size: 14px;
}

/* 错误状态 */
.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-title {
  font-size: 18px;
  font-weight: 600;
  color: #dc3545;
  margin-bottom: 8px;
}

.error-message {
  color: #6c757d;
  font-size: 14px;
  margin-bottom: 16px;
  line-height: 1.5;
}

.retry-button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.15s ease;
}

.retry-button:hover {
  background-color: #0056b3;
}

/* 空状态 */
.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #495057;
  margin-bottom: 8px;
}

.empty-message {
  color: #6c757d;
  font-size: 14px;
  line-height: 1.5;
}

/* 状态栏 */
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 24px;
  padding: 0 12px;
  background-color: #e9ecef;
  border-top: 1px solid #dee2e6;
  font-size: 11px;
  color: #6c757d;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plugin-name {
  font-weight: 500;
  color: #495057;
}

.plugin-version {
  color: #6c757d;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.window-info {
  font-family: 'Courier New', monospace;
}

/* 动画 */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .detached-window-app {
    background-color: #212529;
  }

  .content-area {
    background-color: #343a40;
  }

  .loading-overlay,
  .error-overlay,
  .empty-overlay {
    background-color: #343a40;
  }

  .loading-message,
  .error-message,
  .empty-message {
    color: #adb5bd;
  }

  .empty-title {
    color: #f8f9fa;
  }

  .plugin-iframe {
    background-color: #212529;
  }

  .status-bar {
    background-color: #495057;
    border-top-color: #6c757d;
    color: #adb5bd;
  }

  .plugin-name {
    color: #f8f9fa;
  }

  .loading-spinner-large {
    border-color: #495057;
    border-top-color: #007bff;
  }
}

/* 无障碍支持 */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner-large {
    animation: none;
  }

  .retry-button {
    transition: none;
  }
}
</style>
