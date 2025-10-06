/**
 * 分离窗口主入口文件
 * 为分离的插件窗口提供控制栏和内容区域
 */

import { createApp } from 'vue'
import "@/style.css"
import App from './App.vue'

// 创建Vue应用实例
const app = createApp(App)

// 挂载应用
app.mount('#app')

console.log('🪟 分离窗口应用已启动')
