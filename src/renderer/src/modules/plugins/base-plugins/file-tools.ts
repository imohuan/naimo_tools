import type { PluginConfig } from '@/typings/plugin-types'
import { PluginExecuteType, PluginCategoryType } from '@/typings/plugin-types'

/**
 * 网页工具插件示例
 */
export const fileToolsPlugin: PluginConfig = {
  id: 'file-tools',
  name: '文件工具',
  description: '提供常用的文件工具和快捷访问',
  version: '1.0.0',
  author: 'Naimo Tools',
  icon: '🗂️',
  category: PluginCategoryType.OTHER,
  enabled: true,
  items: [
    {
      name: '添加到文件列表',
      path: 'add-to-file-list',
      icon: null,
      executeType: PluginExecuteType.CUSTOM_CODE,
      notAddToRecent: true,
      onSearch: (text, files) => {
        return files.length > 0
      },
      onEnter: async (options, api) => {
        console.log(1111111, '添加到文件列表...', options, api)
        for (const file of options.files) {
          await api.addPathToFileList(file.name, file.path)
        }
      }
    },
  ],
}
