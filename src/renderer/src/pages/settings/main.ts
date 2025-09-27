/**
 * 设置页面独立应用入口
 * 为 WebContentsView 架构提供独立的设置页面
 */

import { createApp } from 'vue'
import SettingsApp from './SettingsApp.vue'
import '@/style.css'

// 创建设置页面应用
const app = createApp(SettingsApp)

// 挂载应用
app.mount('#app')

// 开发模式下的调试信息
if (import.meta.env.DEV) {
  console.log('🔧 设置页面应用已启动')
}
