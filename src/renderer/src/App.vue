<template>
  <div class="app-container">
    <header class="app-header">
      <h1>🚀 Naimo 工具集</h1>
      <p class="app-subtitle">Electron 应用工具方法展示平台</p>
    </header>

    <div class="tools-grid">
      <!-- 应用管理工具 -->
      <div class="tool-card app-card">
        <div class="card-header">
          <IconMdiApplication class="card-icon" />
          <h2>应用管理</h2>
        </div>
        <div class="card-content">
          <p class="card-description">应用信息获取、系统信息、应用控制等功能</p>
          <div class="button-grid">
            <button @click="getAppVersion" class="tool-btn">获取版本</button>
            <button @click="getAppName" class="tool-btn">获取名称</button>
            <button @click="getAppPath" class="tool-btn">获取路径</button>
            <button @click="getUserDataPath" class="tool-btn">用户数据路径</button>
            <button @click="getSystemInfo" class="tool-btn">系统信息</button>
            <button @click="getAppConfig" class="tool-btn">应用配置</button>
            <button @click="showAbout" class="tool-btn">关于对话框</button>
            <button @click="restartApp" class="tool-btn danger">重启应用</button>
          </div>
        </div>
      </div>

      <!-- 文件系统工具 -->
      <div class="tool-card filesystem-card">
        <div class="card-header">
          <IconMdiFolder class="card-icon" />
          <h2>文件系统</h2>
        </div>
        <div class="card-content">
          <p class="card-description">文件选择、文件夹选择、文件保存等操作</p>
          <div class="button-grid">
            <button @click="selectFile" class="tool-btn">选择文件</button>
            <button @click="selectFolder" class="tool-btn">选择文件夹</button>
            <button @click="saveFile" class="tool-btn">保存文件</button>
          </div>
        </div>
      </div>

      <!-- 日志管理工具 -->
      <div class="tool-card log-card">
        <div class="card-header">
          <IconMdiFileDocument class="card-icon" />
          <h2>日志管理</h2>
        </div>
        <div class="card-content">
          <p class="card-description">日志查看、清空、导出、日志查看器等功能</p>
          <div class="button-grid">
            <button @click="getLogs" class="tool-btn">获取日志</button>
            <button @click="getRawLogContent" class="tool-btn">原始日志</button>
            <button @click="getLogInfo" class="tool-btn">日志信息</button>
            <button @click="clearLogs" class="tool-btn warning">清空日志</button>
            <button @click="exportLogsTxt" class="tool-btn">导出TXT</button>
            <button @click="exportLogsJson" class="tool-btn">导出JSON</button>
            <button @click="openLogViewer" class="tool-btn log-btn">📋 日志查看器</button>
          </div>
        </div>
      </div>

      <!-- 存储管理工具 -->
      <div class="tool-card store-card">
        <div class="card-header">
          <IconMdiDatabase class="card-icon" />
          <h2>存储管理</h2>
        </div>
        <div class="card-content">
          <p class="card-description">应用配置存储、数据管理等功能</p>
          <div class="button-grid">
            <button @click="getAllConfig" class="tool-btn">获取所有配置</button>
            <button @click="setTestConfig" class="tool-btn">设置测试配置</button>
            <button @click="clearAllConfig" class="tool-btn danger">清空配置</button>
          </div>
        </div>
      </div>

      <!-- 窗口管理工具 -->
      <div class="tool-card window-card">
        <div class="card-header">
          <IconMdiWindowMaximize class="card-icon" />
          <h2>窗口管理</h2>
        </div>
        <div class="card-content">
          <p class="card-description">窗口控制、最小化、最大化、关闭等操作</p>
          <div class="button-grid">
            <button @click="minimizeWindow" class="tool-btn">最小化</button>
            <button @click="maximizeWindow" class="tool-btn">最大化/还原</button>
            <button @click="closeWindow" class="tool-btn danger">关闭窗口</button>
            <button @click="checkMaximized" class="tool-btn">检查状态</button>
          </div>
        </div>
      </div>

      <!-- 调试工具 -->
      <div class="tool-card debug-card">
        <div class="card-header">
          <IconMdiBug class="card-icon" />
          <h2>调试工具</h2>
        </div>
        <div class="card-content">
          <p class="card-description">VSCode调试、错误处理、异步操作测试</p>
          <div class="button-grid">
            <button @click="handleClick" class="tool-btn">测试断点</button>
            <button @click="handleAsyncClick" class="tool-btn">异步测试</button>
            <button @click="testErrorHandling" class="tool-btn warning">错误处理</button>
          </div>
          <div class="debug-info">
            <p>计数器: {{ counter }}</p>
            <p>消息: {{ message }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 结果显示区域 -->
    <div v-if="result" class="result-section">
      <h3>执行结果</h3>
      <pre class="result-content">{{ result }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
// 响应式数据
const counter = ref(0);
const message = ref("准备调试");
const result = ref("");

// 通用结果显示方法
const showResult = (data: any, title: string = "执行结果") => {
  result.value = `${title}:\n${JSON.stringify(data, null, 2)}`;
  message.value = `${title}执行成功`;
};

// 通用错误处理方法
const handleError = (error: any, operation: string) => {
  console.error(`${operation}失败:`, error);
  message.value = `${operation}失败: ${error.message}`;
  result.value = `错误: ${error.message}`;
};

// ==================== 应用管理工具 ====================
const getAppVersion = async () => {
  try {
    const version = await api.ipcRouter.appGetVersion();
    showResult(version, "应用版本");
  } catch (error) {
    handleError(error, "获取应用版本");
  }
};

const getAppName = async () => {
  try {
    const name = await api.ipcRouter.appGetName();
    showResult(name, "应用名称");
  } catch (error) {
    handleError(error, "获取应用名称");
  }
};

const getAppPath = async () => {
  try {
    const path = await api.ipcRouter.appGetAppPath();
    showResult(path, "应用路径");
  } catch (error) {
    handleError(error, "获取应用路径");
  }
};

const getUserDataPath = async () => {
  try {
    const path = await api.ipcRouter.appGetUserDataPath();
    showResult(path, "用户数据路径");
  } catch (error) {
    handleError(error, "获取用户数据路径");
  }
};

const getSystemInfo = async () => {
  try {
    const info = await api.ipcRouter.appGetSystemInfo();
    showResult(info, "系统信息");
  } catch (error) {
    handleError(error, "获取系统信息");
  }
};

const getAppConfig = async () => {
  try {
    const config = await api.ipcRouter.appGetConfig();
    showResult(config, "应用配置");
  } catch (error) {
    handleError(error, "获取应用配置");
  }
};

const showAbout = async () => {
  try {
    await api.ipcRouter.appShowAbout();
    message.value = "关于对话框已显示";
    result.value = "关于对话框已显示";
  } catch (error) {
    handleError(error, "显示关于对话框");
  }
};

const restartApp = async () => {
  try {
    await api.ipcRouter.appRestart();
    message.value = "应用即将重启";
    result.value = "应用即将重启";
  } catch (error) {
    handleError(error, "重启应用");
  }
};

// ==================== 文件系统工具 ====================
const selectFile = async () => {
  try {
    const files = await api.ipcRouter.filesystemSelectFile({
      title: "选择文件",
      filters: [
        { name: "所有文件", extensions: ["*"] },
        { name: "图片", extensions: ["jpg", "png", "gif"] },
        { name: "文档", extensions: ["txt", "md", "pdf"] },
      ],
    });
    showResult(files, "选择的文件");
  } catch (error) {
    handleError(error, "选择文件");
  }
};

const selectFolder = async () => {
  try {
    const folders = await api.ipcRouter.filesystemSelectFolder({
      title: "选择文件夹",
    });
    showResult(folders, "选择的文件夹");
  } catch (error) {
    handleError(error, "选择文件夹");
  }
};

const saveFile = async () => {
  try {
    const path = await api.ipcRouter.filesystemSaveFile({
      title: "保存文件",
      defaultPath: "untitled.txt",
      filters: [
        { name: "文本文件", extensions: ["txt"] },
        { name: "所有文件", extensions: ["*"] },
      ],
    });
    showResult(path, "保存文件路径");
  } catch (error) {
    handleError(error, "保存文件");
  }
};

// ==================== 日志管理工具 ====================
const getLogs = async () => {
  try {
    const logs = await api.ipcRouter.logGetLogs();
    showResult(logs, "日志数据");
  } catch (error) {
    handleError(error, "获取日志");
  }
};

const getRawLogContent = async () => {
  try {
    const content = await api.ipcRouter.logGetRawLogContent();
    showResult(content, "原始日志内容");
  } catch (error) {
    handleError(error, "获取原始日志内容");
  }
};

const getLogInfo = async () => {
  try {
    const info = await api.ipcRouter.logGetLogInfo();
    showResult(info, "日志信息");
  } catch (error) {
    handleError(error, "获取日志信息");
  }
};

const clearLogs = async () => {
  try {
    await api.ipcRouter.logClearLogs();
    message.value = "日志已清空";
    result.value = "日志已清空";
  } catch (error) {
    handleError(error, "清空日志");
  }
};

const exportLogsTxt = async () => {
  try {
    const content = await api.ipcRouter.logExportLogs("txt");
    showResult(content, "导出TXT格式日志");
  } catch (error) {
    handleError(error, "导出TXT日志");
  }
};

const exportLogsJson = async () => {
  try {
    const content = await api.ipcRouter.logExportLogs("json");
    showResult(content, "导出JSON格式日志");
  } catch (error) {
    handleError(error, "导出JSON日志");
  }
};

const openLogViewer = async () => {
  try {
    await api.ipcRouter.windowOpenLogViewer();
    message.value = "日志查看器已打开";
    result.value = "日志查看器已打开";
  } catch (error) {
    handleError(error, "打开日志查看器");
  }
};

// ==================== 存储管理工具 ====================
const getAllConfig = async () => {
  try {
    // 不传参数获取所有配置
    const config = await (api.ipcRouter as any).storeGet();
    showResult(config, "所有配置");
  } catch (error) {
    handleError(error, "获取所有配置");
  }
};

const setTestConfig = async () => {
  try {
    const testData = {
      theme: "dark" as const,
      language: "zh-CN",
      windowSize: {
        width: 1200,
        height: 800,
      },
      logLevel: "info" as const,
    };
    await api.ipcRouter.storeSet("theme", testData.theme);
    showResult(testData, "设置测试配置");
  } catch (error) {
    handleError(error, "设置测试配置");
  }
};

const clearAllConfig = async () => {
  try {
    await api.ipcRouter.storeClear();
    message.value = "所有配置已清空";
    result.value = "所有配置已清空";
  } catch (error) {
    handleError(error, "清空所有配置");
  }
};

// ==================== 窗口管理工具 ====================
const minimizeWindow = async () => {
  try {
    await api.ipcRouter.windowMinimize();
    message.value = "窗口已最小化";
    result.value = "窗口已最小化";
  } catch (error) {
    handleError(error, "最小化窗口");
  }
};

const maximizeWindow = async () => {
  try {
    await api.ipcRouter.windowMaximize();
    message.value = "窗口状态已切换";
    result.value = "窗口状态已切换";
  } catch (error) {
    handleError(error, "最大化/还原窗口");
  }
};

const closeWindow = async () => {
  try {
    await api.ipcRouter.windowClose();
    message.value = "窗口已关闭";
    result.value = "窗口已关闭";
  } catch (error) {
    handleError(error, "关闭窗口");
  }
};

const checkMaximized = async () => {
  try {
    const isMaximized = await api.ipcRouter.windowIsMaximized();
    showResult({ isMaximized }, "窗口状态");
  } catch (error) {
    handleError(error, "检查窗口状态");
  }
};

// ==================== 调试工具 ====================
const handleClick = async () => {
  api.log.info(Math.random().toString(), await window.electronAPI.ipcRouter.appGetName());
  console.log("按钮被点击了");

  counter.value++;
  message.value = `点击了 ${counter.value} 次`;

  if (counter.value > 5) {
    message.value = "计数器超过5了！";
  }

  showResult({ counter: counter.value, message: message.value }, "调试测试");
};

const handleAsyncClick = async () => {
  console.log("开始异步操作");
  message.value = "异步操作中...";

  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    counter.value += 10;
    message.value = "异步操作完成";
    showResult({ counter: counter.value, message: message.value }, "异步操作测试");
  } catch (error) {
    console.error("异步操作失败", error);
    message.value = "异步操作失败";
    handleError(error, "异步操作");
  }
};

const testErrorHandling = () => {
  console.log("开始测试错误处理...");
  message.value = "测试错误处理中...";

  try {
    throw new Error("手动测试错误 - 同步");
  } catch (error) {
    console.log("捕获到同步错误，调用错误处理器");
    window.electronAPI.log.throw_error(error, { title: "手动测试错误 - 同步2" });
  }

  setTimeout(() => {
    console.log("抛出未捕获的同步错误");
    throw new Error("未捕获的同步错误");
  }, 500);

  setTimeout(() => {
    console.log("抛出未捕获的异步错误");
    Promise.reject(new Error("未捕获的异步错误"));
  }, 1000);

  message.value = "错误测试已启动，请查看控制台和错误对话框";
  result.value = "错误测试已启动，请查看控制台和错误对话框";
};

// 组件挂载时
onMounted(() => {
  console.log("App组件已挂载");
  message.value = "App组件已挂载，可以开始调试了";
});
</script>

<style scoped>
@reference "@/style.css";

.app-container {
  @apply min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6;
}

.app-header {
  @apply text-center mb-8;
}

.app-header h1 {
  @apply text-4xl font-bold text-gray-800 mb-2;
}

.app-subtitle {
  @apply text-lg text-gray-600;
}

.tools-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto;
}

.tool-card {
  @apply bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden;
}

.app-card {
  @apply border-l-4 border-blue-500;
}

.filesystem-card {
  @apply border-l-4 border-green-500;
}

.log-card {
  @apply border-l-4 border-orange-500;
}

.store-card {
  @apply border-l-4 border-purple-500;
}

.window-card {
  @apply border-l-4 border-red-500;
}

.debug-card {
  @apply border-l-4 border-gray-500;
}

.card-header {
  @apply flex items-center p-4 bg-gray-50 border-b;
}

.card-icon {
  @apply w-6 h-6 mr-3 text-gray-600;
}

.card-header h2 {
  @apply text-xl font-semibold text-gray-800;
}

.card-content {
  @apply p-4;
}

.card-description {
  @apply text-sm text-gray-600 mb-4;
}

.button-grid {
  @apply grid grid-cols-2 gap-2;
}

.tool-btn {
  @apply px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200;
  @apply bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
}

.tool-btn.warning {
  @apply bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500;
}

.tool-btn.danger {
  @apply bg-red-500 hover:bg-red-600 focus:ring-red-500;
}

.tool-btn.log-btn {
  @apply bg-green-500 hover:bg-green-600 focus:ring-green-500;
}

.debug-info {
  @apply mt-4 p-3 bg-gray-50 rounded-lg;
}

.debug-info p {
  @apply text-sm text-gray-700 mb-1;
}

.result-section {
  @apply mt-8 max-w-7xl mx-auto;
}

.result-section h3 {
  @apply text-xl font-semibold text-gray-800 mb-3;
}

.result-content {
  @apply bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm font-mono;
  @apply max-h-96 border border-gray-700;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tools-grid {
    @apply grid-cols-1;
  }

  .button-grid {
    @apply grid-cols-1;
  }

  .app-header h1 {
    @apply text-3xl;
  }
}

/* 动画效果 */
.tool-card:hover {
  @apply transform -translate-y-1;
}

.tool-btn:active {
  @apply transform scale-95;
}

/* 滚动条样式 */
.result-content::-webkit-scrollbar {
  @apply w-2;
}

.result-content::-webkit-scrollbar-track {
  @apply bg-gray-800;
}

.result-content::-webkit-scrollbar-thumb {
  @apply bg-gray-600 rounded;
}

.result-content::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500;
}
</style>
