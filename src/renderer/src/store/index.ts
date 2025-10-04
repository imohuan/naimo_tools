import { createPinia } from 'pinia'
import { usePluginStore } from './modules/plugin'

// 创建 Pinia 实例
export const pinia = createPinia()

// 导出所有 store
export {
  usePluginStore,
}