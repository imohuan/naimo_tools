/**
 * 设置页面独立应用入口
 * 为 WebContentsView 架构提供独立的设置页面
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useApp } from '@/temp_code'
import '@/style.css'

// 创建设置页面应用
const app = createApp(App)
app.use(createPinia())
app.use(router)

// 配置Vue全局错误处理
app.config.errorHandler = (err, _instance, info) => {
  console.error('🔍 设置页面错误:', err, info)
  window.naimo?.log?.throw_error(err, { title: 'Settings Vue Error' })
}

// 配置Vue警告处理
app.config.warnHandler = (msg, _instance, trace) => {
  console.warn('⚠️ 设置页面警告:', msg, trace)
  window.naimo?.log?.warn(msg, trace)
}

// 挂载应用
app.mount('#app')

// 开发模式下的调试信息
if (import.meta.env.DEV) {
  console.log('🔧 设置页面应用已启动')
}

// 初始化核心系统（设置页面需要访问插件和快捷键数据）
; (async () => {
  try {
    // 获取 App Store 实例
    const app = useApp()

    // 1. 初始化快捷键系统（优先执行，确保插件快捷键可以正确注册）
    console.log('⌨️ 设置页面 - 开始初始化快捷键系统...')
    await app.hotkey.initialize()
    app.hotkey.setSilent(false)
    console.log('✅ 设置页面 - 快捷键系统初始化完成')

    await app.plugin.initialize()
    app.plugin.setSilent(false)
    // 2. 初始化插件系统
    console.log('🔌 设置页面 - 开始初始化插件系统...')
    // const pluginStore = usePluginStore()
    // await pluginStore.initialize()
    console.log('✅ 设置页面 - 插件系统初始化完成')
  } catch (error) {
    console.error('❌ 设置页面 - 系统初始化失败:', error)
  }
})()
