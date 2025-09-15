import type { PluginConfig } from '@/typings/plugin-types'
import { PluginExecuteType, PluginCategoryType } from '@/typings/plugin-types'

/**
 * 高效办公插件示例
 */
export const officeToolsPlugin: PluginConfig = {
  id: 'office-tools',
  name: '高效办公',
  description: '智能助手,轻松搞定办公琐事',
  version: '1.0.0',
  author: 'Naimo Tools',
  icon: '🚀',
  category: PluginCategoryType.EFFICIENT_OFFICE,
  enabled: true,
  items: [
    {
      name: '文档转换',
      path: 'office:convert',
      icon: null,
      pluginId: 'office-tools',
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('启动文档转换工具...');
          // 这里可以添加文档转换的逻辑
          context.console.log('文档转换工具已启动');
        `,
      },
      visible: true,
      weight: 1
    },
    {
      name: '会议记录',
      path: 'office:meeting',
      icon: null,
      pluginId: 'office-tools',
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('启动会议记录工具...');
          // 这里可以添加会议记录的逻辑
          context.console.log('会议记录工具已启动');
        `,
      },
      visible: true,
      weight: 2
    },
    {
      name: '任务管理',
      path: 'office:task',
      icon: null,
      pluginId: 'office-tools',
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('启动任务管理工具...');
          // 这里可以添加任务管理的逻辑
          context.console.log('任务管理工具已启动');
        `,
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
