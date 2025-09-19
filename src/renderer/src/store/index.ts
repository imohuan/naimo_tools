import { createPinia } from 'pinia'
import { useSearchStore } from './modules/search'
import { usePluginStore } from './modules/plugin'

// 创建 Pinia 实例
export const pinia = createPinia()
export { useSearchStore, usePluginStore }