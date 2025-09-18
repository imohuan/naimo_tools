import { createPinia } from 'pinia'
import { defineStore } from 'pinia'

import { useSearchStore } from './modules/search'
import { useHotkeyStore } from './modules/hotkey'
import { usePluginStore } from './modules/plugin'

// 创建 Pinia 实例
export const pinia = createPinia()

export const useGlobalStore = defineStore('global', () => {
  const search = useSearchStore()
  const hotkey = useHotkeyStore()
  const plugin = usePluginStore()
  return { search, hotkey, plugin }
})
