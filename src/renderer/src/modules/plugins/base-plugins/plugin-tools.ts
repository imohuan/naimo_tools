import type { PluginConfig } from '@/typings/plugin-types'
import { PluginExecuteType, PluginCategoryType } from '@/typings/plugin-types'
import { SearchMode } from '@/typings/search-types'

/**
 * 网页工具插件示例
 */
export const pluginToolsPlugin: PluginConfig = {
  id: 'plugin-tools',
  name: '插件工具',
  description: '提供常用的插件工具和快捷访问',
  version: '1.0.0',
  author: 'Naimo Tools',
  icon: '�',
  category: PluginCategoryType.OTHER,
  enabled: true,
  items: [
    {
      name: '插件安装',
      path: 'plugin-install',
      icon: null,
      executeType: PluginExecuteType.CUSTOM_CODE,
      notAddToRecent: true,
      onSearch: (text, files) => {
        return files.length === 1 && files[0].name.endsWith('.zip')
      },
      onEnter: async (options, apis) => {
        // console.log(1111111, '添加到文件列表...', options, api)
        // for (const file of options.files) {
        //   await api.addPathToFileList(file.name, file.path)
        // }
        // await naimo.router.pluginInstallPluginFromZip(options.files[0].path)
        await apis.plugin.installZip(options.files[0].path)
      },
      showInModes: [SearchMode.ATTACHMENT],
      hideInModes: [SearchMode.NORMAL],
      anonymousSearchFields: ['plugin_tools']
    },
  ],
}
