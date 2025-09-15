import type { PluginConfig } from '@/typings/plugin-types'
import { PluginExecuteType, PluginCategoryType } from '@/typings/plugin-types'

/**
 * AI工具插件示例
 */
export const aiToolsPlugin: PluginConfig = {
  id: 'ai-tools',
  name: 'AI工具',
  description: '提供AI人工智能相关的工具和功能',
  version: '1.0.0',
  author: 'Naimo Tools',
  icon: '🤖',
  category: PluginCategoryType.AI_ARTIFICIAL_INTELLIGENCE,
  enabled: true,
  items: [
    {
      name: 'AI对话助手',
      path: 'ai:chat',
      icon: null,
      pluginId: 'ai-tools',
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('启动AI对话助手...');
          // 这里可以添加AI对话的逻辑
          context.console.log('AI对话助手已启动');
        `,
      },
      visible: true,
      weight: 1
    },
    {
      name: '智能翻译',
      path: 'ai:translate',
      icon: null,
      pluginId: 'ai-tools',
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('启动智能翻译...');
          // 这里可以添加智能翻译的逻辑
          context.console.log('智能翻译已启动');
        `,
      },
      visible: true,
      weight: 2
    },
    {
      name: '代码生成',
      path: 'ai:code-gen',
      icon: null,
      pluginId: 'ai-tools',
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('启动代码生成器...');
          // 这里可以添加代码生成的逻辑
          context.console.log('代码生成器已启动');
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
