<!--
  控制栏演示组件
  用于测试和展示分离窗口控制栏的功能
-->
<template>
  <div class="control-bar-demo">
    <div class="demo-header">
      <h1>分离窗口控制栏演示</h1>
      <p>此页面用于测试分离窗口控制栏的各项功能</p>
    </div>

    <!-- 控制栏 -->
    <WindowControlBar :window-title="demoTitle" :window-icon="demoIcon" :is-loading="isLoading"
      :window-id="demoWindowId" :view-id="demoViewId" @reattach="handleReattach" @minimize="handleMinimize"
      @maximize="handleMaximize" @close="handleClose" @control-action="handleControlAction" />

    <!-- 演示控制面板 -->
    <div class="demo-panel">
      <div class="panel-section">
        <h3>窗口信息配置</h3>
        <div class="form-group">
          <label>窗口标题:</label>
          <input v-model="demoTitle" type="text" placeholder="输入窗口标题" />
        </div>
        <div class="form-group">
          <label>窗口ID:</label>
          <input v-model.number="demoWindowId" type="number" placeholder="窗口ID" />
        </div>
        <div class="form-group">
          <label>视图ID:</label>
          <input v-model="demoViewId" type="text" placeholder="视图ID" />
        </div>
        <div class="form-group">
          <label>加载状态:</label>
          <label class="checkbox-label">
            <input v-model="isLoading" type="checkbox" />
            显示加载中
          </label>
        </div>
      </div>

      <div class="panel-section">
        <h3>操作日志</h3>
        <div class="log-container">
          <div v-for="(log, index) in actionLogs" :key="index" :class="['log-entry', `log-${log.type}`]">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-action">{{ log.action }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
        <button @click="clearLogs" class="clear-logs-btn">清除日志</button>
      </div>

      <div class="panel-section">
        <h3>快捷键测试</h3>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd>
            <span>重新附加</span>
          </div>
          <div class="shortcut-item">
            <kbd>Alt</kbd> + <kbd>F4</kbd>
            <span>关闭窗口</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>W</kbd>
            <span>关闭窗口</span>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <h3>功能测试</h3>
        <div class="test-buttons">
          <button @click="simulateReattach" class="test-btn success">
            模拟重新附加
          </button>
          <button @click="simulateMinimize" class="test-btn warning">
            模拟最小化
          </button>
          <button @click="simulateMaximize" class="test-btn info">
            模拟最大化
          </button>
          <button @click="simulateClose" class="test-btn danger">
            模拟关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 状态显示 */
    <div class="status-display">
      <div class="status-item">
        <strong>最后操作:</strong> {{ lastAction || '无' }}
      </div>
      <div class="status-item">
        <strong>操作时间:</strong> {{ lastActionTime || '无' }}
      </div>
      <div class="status-item">
        <strong>总操作数:</strong> {{ actionLogs.length }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import WindowControlBar from './WindowControlBar.vue'
import type { DetachedWindowAction } from '@/typings/window-types'

// 演示数据
const demoTitle = ref('演示插件窗口')
const demoIcon = ref('')
const demoWindowId = ref(12345)
const demoViewId = ref('demo-view-id')
const isLoading = ref(false)

// 操作记录
interface ActionLog {
  time: string
  action: string
  message: string
  type: 'success' | 'info' | 'warning' | 'error'
}

const actionLogs = ref<ActionLog[]>([])
const lastAction = ref<string>('')
const lastActionTime = ref<string>('')

/**
 * 添加操作日志
 */
const addLog = (action: string, message: string, type: ActionLog['type'] = 'info'): void => {
  const log: ActionLog = {
    time: new Date().toLocaleTimeString(),
    action,
    message,
    type
  }
  
  actionLogs.value.unshift(log)
  
  // 限制日志数量
  if (actionLogs.value.length > 50) {
    actionLogs.value.pop()
  }
  
  lastAction.value = action
  lastActionTime.value = log.time
}

/**
 * 清除日志
 */
const clearLogs = (): void => {
  actionLogs.value = []
  lastAction.value = ''
  lastActionTime.value = ''
}

/**
 * 处理重新附加
 */
const handleReattach = (): void => {
  addLog('重新附加', '用户点击了重新附加按钮', 'success')
  console.log('🔄 演示: 重新附加操作')
}

/**
 * 处理最小化
 */
const handleMinimize = (): void => {
  addLog('最小化', '用户点击了最小化按钮', 'info')
  console.log('🔽 演示: 最小化操作')
}

/**
 * 处理最大化
 */
const handleMaximize = (): void => {
  addLog('最大化', '用户点击了最大化按钮', 'info')
  console.log('🔼 演示: 最大化操作')
}

/**
 * 处理关闭
 */
const handleClose = (): void => {
  addLog('关闭', '用户点击了关闭按钮', 'warning')
  console.log('❌ 演示: 关闭操作')
}

/**
 * 处理控制操作
 */
const handleControlAction = (action: DetachedWindowAction): void => {
  addLog('控制操作', `执行了 ${action} 操作`, 'info')
  console.log('🎛️ 演示: 控制操作', action)
}

/**
 * 模拟重新附加
 */
const simulateReattach = (): void => {
  addLog('模拟重新附加', '通过测试按钮触发', 'success')
  // 这里可以添加模拟逻辑
}

/**
 * 模拟最小化
 */
const simulateMinimize = (): void => {
  addLog('模拟最小化', '通过测试按钮触发', 'info')
  // 这里可以添加模拟逻辑
}

/**
 * 模拟最大化
 */
const simulateMaximize = (): void => {
  addLog('模拟最大化', '通过测试按钮触发', 'info')
  // 这里可以添加模拟逻辑
}

/**
 * 模拟关闭
 */
const simulateClose = (): void => {
  addLog('模拟关闭', '通过测试按钮触发', 'warning')
  // 这里可以添加模拟逻辑
}

// 生命周期
onMounted(() => {
  addLog('页面加载', '控制栏演示页面已加载', 'success')
  console.log('🎛️ 控制栏演示页面已挂载')
})
</script>

<style scoped>
.control-bar-demo {
  min-height: 100vh;
  background-color: #f8f9fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.demo-header {
  padding: 20px;
  background-color: #ffffff;
  border-bottom: 1px solid #dee2e6;
  text-align: center;
}

.demo-header h1 {
  margin: 0 0 8px 0;
  color: #212529;
  font-size: 24px;
  font-weight: 600;
}

.demo-header p {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
}

.demo-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
}

.panel-section {
  background-color: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
}

.panel-section h3 {
  margin: 0 0 16px 0;
  color: #495057;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 8px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  color: #495057;
  font-size: 14px;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group input[type="number"] {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.15s ease;
}

.form-group input[type="text"]:focus,
.form-group input[type="number"]:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.log-container {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  background-color: #f8f9fa;
  margin-bottom: 12px;
}

.log-entry {
  display: grid;
  grid-template-columns: 80px 100px 1fr;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid #e9ecef;
  font-size: 12px;
  font-family: 'Courier New', monospace;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-time {
  color: #6c757d;
}

.log-action {
  font-weight: 500;
}

.log-success .log-action {
  color: #28a745;
}

.log-info .log-action {
  color: #007bff;
}

.log-warning .log-action {
  color: #ffc107;
}

.log-error .log-action {
  color: #dc3545;
}

.log-message {
  color: #495057;
}

.clear-logs-btn {
  padding: 6px 12px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.clear-logs-btn:hover {
  background-color: #545b62;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.shortcut-item kbd {
  padding: 2px 6px;
  background-color: #e9ecef;
  border: 1px solid #ced4da;
  border-radius: 3px;
  font-size: 11px;
  font-family: 'Courier New', monospace;
}

.shortcut-item span {
  color: #6c757d;
}

.test-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

.test-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.test-btn.success {
  background-color: #28a745;
  color: white;
}

.test-btn.success:hover {
  background-color: #218838;
}

.test-btn.warning {
  background-color: #ffc107;
  color: #212529;
}

.test-btn.warning:hover {
  background-color: #e0a800;
}

.test-btn.info {
  background-color: #007bff;
  color: white;
}

.test-btn.info:hover {
  background-color: #0056b3;
}

.test-btn.danger {
  background-color: #dc3545;
  color: white;
}

.test-btn.danger:hover {
  background-color: #c82333;
}

.status-display {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 16px;
  background-color: #e9ecef;
  border-top: 1px solid #dee2e6;
}

.status-item {
  text-align: center;
  font-size: 14px;
  color: #495057;
}

.status-item strong {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .demo-panel {
    grid-template-columns: 1fr;
  }

  .status-display {
    flex-direction: column;
    gap: 12px;
  }

  .test-buttons {
    grid-template-columns: 1fr;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .control-bar-demo {
    background-color: #212529;
  }

  .demo-header {
    background-color: #343a40;
    border-bottom-color: #495057;
  }

  .demo-header h1 {
    color: #f8f9fa;
  }

  .demo-header p {
    color: #adb5bd;
  }

  .panel-section {
    background-color: #343a40;
    border-color: #495057;
  }

  .panel-section h3 {
    color: #f8f9fa;
    border-bottom-color: #495057;
  }

  .form-group label {
    color: #f8f9fa;
  }

  .form-group input[type="text"],
  .form-group input[type="number"] {
    background-color: #495057;
    border-color: #6c757d;
    color: #f8f9fa;
  }

  .log-container {
    background-color: #495057;
    border-color: #6c757d;
  }

  .log-entry {
    border-bottom-color: #6c757d;
  }

  .log-message {
    color: #adb5bd;
  }

  .shortcut-item kbd {
    background-color: #495057;
    border-color: #6c757d;
    color: #f8f9fa;
  }

  .shortcut-item span {
    color: #adb5bd;
  }

  .status-display {
    background-color: #495057;
    border-top-color: #6c757d;
  }

  .status-item {
    color: #f8f9fa;
  }

  .status-item strong {
    color: #adb5bd;
  }
}
</style>
