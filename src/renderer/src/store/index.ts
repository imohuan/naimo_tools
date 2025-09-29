import { createPinia } from 'pinia'
import { usePluginStore } from './modules/plugin'
import { useAppStore } from './modules/app'
import { useEnhancedStore } from './modules/enhanced'

// 创建 Pinia 实例
export const pinia = createPinia()

// 导出所有 store
export {
  usePluginStore,
  useAppStore,
  useEnhancedStore
}