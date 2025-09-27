<!--
  DetachHandler 使用示例
  演示如何在 Vue 组件中使用分离功能
-->
<template>
  <div class="detach-example">
    <div class="status-info">
      <h3>分离处理器状态</h3>
      <p>初始化状态: {{ state.isInitialized ? '已初始化' : '未初始化' }}</p>
      <p>是否可分离: {{ state.canDetach ? '是' : '否' }}</p>
      <p>分离中: {{ state.isDetaching ? '是' : '否' }}</p>
    </div>

    <div class="current-view" v-if="state.currentPluginView.viewId">
      <h3>当前插件视图</h3>
      <p>视图ID: {{ state.currentPluginView.viewId }}</p>
      <p>插件路径: {{ state.currentPluginView.pluginPath || '未知' }}</p>
      <p>插件名称: {{ state.currentPluginView.pluginName || '未知' }}</p>
    </div>

    <div class="actions">
      <h3>操作</h3>
      <button @click="actions.initialize()" :disabled="state.isInitialized" class="btn-init">
        初始化分离处理器
      </button>

      <button @click="handleDetachCurrent()" :disabled="!state.canDetach || state.isDetaching" class="btn-detach">
        分离当前视图 (Alt+D)
      </button>

      <button @click="handleTestView()" class="btn-test">
        模拟激活测试视图
      </button>

      <button @click="actions.clearCurrentPluginView()" :disabled="!state.currentPluginView.viewId" class="btn-clear">
        清除当前视图
      </button>
    </div>

    <div class="logs">
      <h3>操作日志</h3>
      <div class="log-container">
        <div v-for="(log, index) in logs" :key="index" :class="['log-entry', `log-${log.type}`]">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
      <button @click="clearLogs" class="btn-clear-logs">清除日志</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDetachHandler } from './useDetachHandler'

// 使用分离处理器
const { state, actions, events } = useDetachHandler({
  autoInit: false, // 手动初始化以便演示
  debug: true
})

// 日志系统
interface LogEntry {
  time: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

const logs = ref<LogEntry[]>([])

const addLog = (message: string, type: LogEntry['type'] = 'info') => {
  logs.value.push({
    time: new Date().toLocaleTimeString(),
    message,
    type
  })

  // 限制日志数量
  if (logs.value.length > 50) {
    logs.value.shift()
  }
}

const clearLogs = () => {
  logs.value = []
}

// 处理分离当前视图
const handleDetachCurrent = async () => {
  addLog('开始分离当前视图...', 'info')

  try {
    const result = await actions.detachCurrentView()

    if (result.success) {
      addLog(`分离成功! 窗口ID: ${result.detachedWindowId}`, 'success')
    } else {
      addLog(`分离失败: ${result.error}`, 'error')
    }
  } catch (error) {
    addLog(`分离异常: ${error}`, 'error')
  }
}

// 模拟激活测试视图
const handleTestView = () => {
  const testViewId = `test-view-${Date.now()}`
  const testPluginPath = 'test-plugin:test-item'
  const testPluginName = '测试插件'

  actions.updateCurrentPluginView(testViewId, testPluginPath, testPluginName)
  addLog(`模拟激活测试视图: ${testPluginName}`, 'info')
}

// 设置事件监听器
onMounted(() => {
  // 监听分离成功事件
  const unsubscribeSuccess = events.onDetachSuccess((result) => {
    addLog(`分离成功事件: 窗口ID ${result.detachedWindowId}`, 'success')
  })

  // 监听分离失败事件
  const unsubscribeError = events.onDetachError((error) => {
    addLog(`分离失败事件: ${error}`, 'error')
  })

  // 监听窗口关闭事件
  const unsubscribeWindowClosed = events.onWindowClosed((data) => {
    addLog(`分离窗口关闭: 窗口ID ${data.windowId}`, 'info')
  })

  // 组件卸载时取消监听
  onUnmounted(() => {
    unsubscribeSuccess()
    unsubscribeError()
    unsubscribeWindowClosed()
  })

  addLog('DetachHandler 示例组件已加载', 'info')
})
</script>

<style scoped>
.detach-example {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.status-info,
.current-view,
.actions,
.logs {
  margin-bottom: 30px;
  padding: 15px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: #f8f9fa;
}

h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
}

p {
  margin: 5px 0;
  color: #5a6c7d;
  font-size: 14px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

button {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-init {
  border-color: #3b82f6;
  color: #3b82f6;
}

.btn-init:hover:not(:disabled) {
  background: #eff6ff;
}

.btn-detach {
  border-color: #f59e0b;
  color: #f59e0b;
}

.btn-detach:hover:not(:disabled) {
  background: #fffbeb;
}

.btn-test {
  border-color: #10b981;
  color: #10b981;
}

.btn-test:hover:not(:disabled) {
  background: #ecfdf5;
}

.btn-clear,
.btn-clear-logs {
  border-color: #ef4444;
  color: #ef4444;
}

.btn-clear:hover:not(:disabled),
.btn-clear-logs:hover:not(:disabled) {
  background: #fef2f2;
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #ffffff;
  padding: 10px;
  margin-bottom: 10px;
}

.log-entry {
  display: flex;
  margin-bottom: 5px;
  font-size: 12px;
  font-family: 'Courier New', monospace;
}

.log-time {
  color: #6b7280;
  margin-right: 10px;
  min-width: 80px;
}

.log-message {
  flex: 1;
}

.log-info .log-message {
  color: #374151;
}

.log-success .log-message {
  color: #059669;
}

.log-warning .log-message {
  color: #d97706;
}

.log-error .log-message {
  color: #dc2626;
}
</style>
