import type { PluginConfig } from '@/typings/pluginTypes'
import { PluginCategoryType } from '@/typings/pluginTypes'

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
      type: 'text' as const,
      recommend: true,
      onEnter: async () => {
        await naimo.router.appLaunchApp('https://github.com')
      }
    },
    {
      name: 'Stack Overflow',
      path: 'https://stackoverflow.com',
      icon: null,
      type: 'text' as const,
      onEnter: async () => {
        await naimo.router.appLaunchApp('https://stackoverflow.com')
      }
    },
    {
      name: 'MDN Web Docs',
      path: 'https://developer.mozilla.org',
      icon: null,
      type: 'text' as const,
      onEnter: async () => {
        await naimo.router.appLaunchApp('https://developer.mozilla.org')
      }
    }
  ],
}
