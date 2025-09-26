import type { PluginConfig } from '@/typings/plugin-types'
import { PluginExecuteType, PluginCategoryType } from '@/typings/plugin-types'
import { SearchMode } from '@/typings/search-types'

/**
 * 图片工具插件
 * 提供图片转base64和base64转图片功能
 */
export const imageToolsPlugin: PluginConfig = {
  id: 'image-tools',
  name: '图片工具',
  description: '提供图片转base64和base64转图片的实用工具',
  version: '1.0.0',
  author: 'Naimo Tools',
  icon: '🖼️',
  category: PluginCategoryType.IMAGE_VIDEO,
  enabled: true,
  items: [
    {
      name: '图片转Base64',
      path: 'image-to-base64',
      icon: '📷',
      executeType: PluginExecuteType.CUSTOM_CODE,
      notAddToRecent: false,
      onSearch: (_text, files) => {
        // 只在有图片文件时显示
        return files.length > 0 && files.some(file =>
          /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(file.name)
        )
      },
      onEnter: async (options, _api) => {
        try {
          // 筛选出图片文件
          const imageFiles = options.files.filter(file =>
            /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(file.name)
          )

          if (imageFiles.length === 0) {
            console.warn('没有找到图片文件')
            return false
          }

          // 处理第一个图片文件
          const imageFile = imageFiles[0]

          // 读取文件为Base64
          const base64Data = await naimo.router.filesystemReadFileAsBase64(imageFile.path)

          // 获取文件扩展名来确定MIME类型
          const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'png'
          const mimeType = getMimeType(ext)

          // 生成完整的data URL
          const dataUrl = `data:${mimeType};base64,${base64Data}`

          // 复制到剪切板
          await naimo.router.clipboardWriteText(dataUrl)

          console.log('图片已转换为Base64并复制到剪切板:', imageFile.name)
          return true
        } catch (error) {
          console.error('图片转Base64失败:', error)
          return false
        }
      },
      showInModes: [SearchMode.ATTACHMENT],
      hideInModes: [SearchMode.NORMAL],
      anonymousSearchFields: ['image-to-base64', '图片转base64', 'image', 'base64']
    },
    {
      name: 'Base64转图片',
      path: 'base64-to-image',
      icon: '💾',
      executeType: PluginExecuteType.CUSTOM_CODE,
      notAddToRecent: false,
      onSearch: (text, _files) => {
        // 检查剪切板是否有Base64数据或搜索文本包含base64相关关键词
        return text.includes('base64') || text.includes('data:image') ||
          text.match(/^data:image\/[a-z]+;base64,/) !== null
      },
      onEnter: async (_options, _api) => {
        try {
          // 首先尝试从剪切板获取内容
          let base64Data = await naimo.router.clipboardReadText()

          // 如果剪切板内容不是Base64格式，提示用户
          if (!base64Data || (!base64Data.startsWith('data:image/') && !isBase64String(base64Data))) {
            console.warn('剪切板中没有有效的Base64图片数据')

            // 可以考虑在这里打开一个输入对话框让用户粘贴Base64数据
            // 目前先返回false
            return false
          }

          // 提取文件扩展名
          let extension = 'png' // 默认扩展名
          if (base64Data.startsWith('data:image/')) {
            const match = base64Data.match(/data:image\/([a-z]+);base64,/)
            if (match && match[1]) {
              extension = match[1] === 'jpeg' ? 'jpg' : match[1]
            }
          }

          // 选择保存位置
          const savePath = await naimo.router.filesystemSaveFile({
            defaultPath: `image.${extension}`,
            filters: [
              { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] },
              { name: '所有文件', extensions: ['*'] }
            ]
          })

          if (!savePath) {
            console.log('用户取消了保存操作')
            return false
          }

          // 保存文件
          const success = await naimo.router.filesystemWriteFileFromBase64(savePath, base64Data)

          if (success) {
            console.log('Base64已转换为图片并保存到:', savePath)
            return true
          } else {
            console.error('保存图片失败')
            return false
          }
        } catch (error) {
          console.error('Base64转图片失败:', error)
          return false
        }
      },
      showInModes: [SearchMode.NORMAL],
      anonymousSearchFields: ['base64-to-image', 'base64转图片', 'base64', '保存图片']
    },
  ]
}

/**
 * 根据文件扩展名获取MIME类型
 * @param extension 文件扩展名
 * @returns MIME类型
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml'
  }
  return mimeTypes[extension] || 'image/png'
}

/**
 * 检查字符串是否是有效的Base64格式
 * @param str 要检查的字符串
 * @returns 是否是Base64格式
 */
function isBase64String(str: string): boolean {
  try {
    // Base64字符串的基本格式检查
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
    return base64Regex.test(str) && str.length % 4 === 0 && str.length > 0
  } catch {
    return false
  }
}
