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
      },
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
    },
    {
      name: 'MDN Web Docs',
      path: 'https://developer.mozilla.org',
      icon: null,
      pluginId: 'web-tools',
      executeType: PluginExecuteType.SHOW_WEBPAGE,
      executeParams: {
        url: 'https://developer.mozilla.org',
      },
    }
  ],
}
