/**
 * 分离窗口主入口文件
 * 为分离的插件窗口提供控制栏和内容区域
 * 
 * 注意：此窗口不依赖 Pinia，所有数据通过 IPC 通信获取
 */

import { createApp } from 'vue'
import "@/style.css"
import App from './App.vue'

// 创建Vue应用实例
const app = createApp(App)

// 配置Vue全局错误处理
app.config.errorHandler = (err, _instance, info) => {
  console.log("🔍 Vue错误处理器被触发:", err, info);
  // winControl 不提供日志功能，使用 console 代替
  console.error("Vue Error - Detached Window:", err, info);
};

// 配置Vue警告处理
app.config.warnHandler = (msg, _instance, trace) => {
  console.warn("⚠️ Vue警告 (Detached Window):", msg, trace);
};

// 挂载应用
app.mount('#app')

console.log('🪟 分离窗口应用已启动')


