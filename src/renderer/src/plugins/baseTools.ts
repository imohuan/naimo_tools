import type { PluginConfig } from '@/typings/pluginTypes'
import { PluginCategoryType } from '@/typings/pluginTypes'

/**
 * 网页工具插件示例
 */
export const baseToolsPlugin: PluginConfig = {
  id: 'base-tools',
  name: '基础工具',
  description: '提供常用的基础工具和快捷访问',
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
      type: "files",
      fileType: "file",
      notVisibleSearch: true,
      onEnter: async (options, api) => {
        for (const file of options.files) {
          await api.addPathToFileList(file.name, file.path)
        }
      },
      anonymousSearchFields: ['add-to-file-list']
    },
    // 截图
    {
      name: '截图并裁剪',
      path: 'screenshot-crop',
      icon: '📸',
      type: 'text' as const,
      onEnter: async (_options, _api) => {
        try {
          // 调用截图功能
          const result = await naimo.router.screenCaptureCaptureAndGetFilePath({});
          if (result.success && result.filePath) {
            // 截图成功，可以进行后续处理
            console.log('截图成功，文件保存到:', result.filePath);
            return true;
          } else {
            console.error('截图失败:', result.error);
            return false;
          }
        } catch (error) {
          console.error('截图操作失败:', error);
          return false;
        }
      },
      anonymousSearchFields: ['screenshot', '截图', '裁剪', 'crop']
    },
    // 插件安装
    {
      name: '插件安装',
      path: 'plugin-install',
      icon: null,
      type: 'text' as const,
      onEnter: async (options, apis) => {
        await apis.plugin.installZip(options.files[0].path)
      },
      anonymousSearchFields: ['plugin-install']
    },

    // 配置导出
    // 配置导入
  ],
}
