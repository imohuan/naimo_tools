import type { PluginConfig } from '@/typings/plugin-types'
import { PluginExecuteType, PluginCategoryType } from '@/typings/plugin-types'
import { SearchMode } from '@/typings/search-types'

// 声明全局api对象
declare const api: any

/**
 * 截图工具插件
 */
export const screenshotToolsPlugin: PluginConfig = {
  id: 'screenshot-tools',
  name: '截图工具',
  description: '提供截图和图片处理功能',
  version: '1.0.0',
  author: 'Naimo Tools',
  icon: '📸',
  category: PluginCategoryType.IMAGE_VIDEO,
  enabled: true,
  settings: [
    {
      name: 'autoCloseAfterCapture',
      title: '截图后自动关闭',
      description: '截图完成后是否自动关闭主窗口',
      type: 'checkbox',
      defaultValue: () => true
    },
    {
      name: 'copyToClipboard',
      title: '自动复制到剪贴板',
      description: '截图完成后是否将文件路径复制到剪贴板',
      type: 'checkbox',
      defaultValue: () => true
    },
    {
      name: 'saveToCustomPath',
      title: '自定义保存路径',
      description: '是否使用自定义的保存路径（留空则使用系统临时目录）',
      type: 'input',
      defaultValue: () => ''
    }
  ],
  items: [
    {
      name: '截图并裁剪',
      path: 'screenshot-crop',
      icon: '📸',
      pluginId: 'screenshot-tools',
      executeType: PluginExecuteType.CUSTOM_CODE,
      notAddToRecent: false,
      onEnter: async (_options, apis) => {
        try {
          // 获取插件设置
          const copyToClipboard = await apis.getSettingValue('copyToClipboard') ?? true;
          const autoClose = await apis.getSettingValue('autoCloseAfterCapture') ?? true;

          // 调用截图功能
          const result = await api.ipcRouter.screenCaptureCaptureAndGetFilePath({});

          if (result.success && result.filePath) {
            // 截图成功，可以进行后续处理
            console.log('截图成功，文件保存到:', result.filePath);

            // 根据设置决定是否复制到剪贴板
            if (copyToClipboard) {
              await api.ipcRouter.clipboardWriteText(result.filePath);
              console.log('文件路径已复制到剪贴板');
            }

            // 根据设置决定是否自动关闭
            if (autoClose) {
              apis.toggleInput(false);
            }

            console.log('截图已保存');
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
      showInModes: [SearchMode.NORMAL],
      anonymousSearchFields: ['screenshot', '截图', '裁剪', 'crop']
    },
    {
      name: '快速截图',
      path: 'screenshot-quick',
      icon: '⚡',
      pluginId: 'screenshot-tools',
      executeType: PluginExecuteType.CUSTOM_CODE,
      notAddToRecent: false,
      onEnter: async (_options, apis) => {
        try {
          // 获取插件设置
          const copyToClipboard = await apis.getSettingValue('copyToClipboard') ?? true;
          const autoClose = await apis.getSettingValue('autoCloseAfterCapture') ?? true;

          // 使用默认设置快速截图
          const result = await api.ipcRouter.screenCaptureCaptureAndGetFilePath({
            sourceId: undefined // 使用默认屏幕源
          });

          if (result.success && result.filePath) {
            console.log('快速截图成功，文件保存到:', result.filePath);

            // 根据设置决定是否复制到剪贴板
            if (copyToClipboard) {
              await api.ipcRouter.clipboardWriteText(result.filePath);
              console.log('文件路径已复制到剪贴板');
            }

            // 根据设置决定是否自动关闭
            if (autoClose) {
              apis.toggleInput(false);
            }

            console.log('快速截图完成');
            return true;
          } else {
            console.error('快速截图失败:', result.error);
            return false;
          }
        } catch (error) {
          console.error('快速截图操作失败:', error);
          return false;
        }
      },
      showInModes: [SearchMode.NORMAL],
      anonymousSearchFields: ['quick', 'screenshot', '快速', '截图', '快捷']
    }
  ],
}
