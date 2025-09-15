import type { PluginConfig } from '@/typings/plugin-types'
import { PluginExecuteType, PluginCategoryType } from '@/typings/plugin-types'

/**
 * 网页工具插件示例
 */
export const webToolsPlugin: PluginConfig = {
  id: 'web-tools',
  name: '网页工具',
  description: '提供常用的网页工具和快捷访问',
  version: '1.0.0',
  author: 'Naimo Tools',
  icon: '🌐',
  category: PluginCategoryType.DEVELOPER_ESSENTIALS,
  enabled: true,
  items: [
    {
      name: 'GitHub',
      path: 'https://github.com',
      icon: null,
      pluginId: 'web-tools',
      executeType: PluginExecuteType.SHOW_WEBPAGE,
      executeParams: {
        url: 'https://github.com',
        enableSearch: false,
      },
      visible: true,
      weight: 1
    },
    {
      name: 'Stack Overflow',
      path: 'https://stackoverflow.com',
      icon: null,
      pluginId: 'web-tools',
      executeType: PluginExecuteType.SHOW_WEBPAGE,
      executeParams: {
        url: 'https://stackoverflow.com'
      },
      visible: true,
      weight: 2
    },
    {
      name: 'MDN Web Docs',
      path: 'https://developer.mozilla.org',
      icon: null,
      pluginId: 'web-tools',
      executeType: PluginExecuteType.SHOW_WEBPAGE,
      executeParams: {
        url: 'https://developer.mozilla.org',
        enableSearch: false // 禁用搜索功能，进入插件窗口后隐藏搜索框
      },
      visible: true,
      weight: 3
    }
  ],
  metadata: {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    installedAt: Date.now()
  }
}
