import { ref, computed } from 'vue'
import type { AppItem } from '@shared/types'

/** 附件文件 */
export interface AttachedFile {
  /** 文件名 */
  name: string
  /** 文件路径 */
  path: string
  /** 文件图标（可选） */
  icon?: string
  /** 文件类型 */
  type: string
  /** 文件大小 */
  size: number
}

export function useFileHandler() {
  // 附件文件列表
  const attachedFiles = ref<AttachedFile[]>([])

  // 计算属性
  const firstFile = computed(() => attachedFiles.value[0])
  const firstFileIcon = computed(() => firstFile.value?.icon)
  const hasFiles = computed(() => attachedFiles.value.length > 0)

  // 将File对象转换为Data URL的辅助函数
  const convertFileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // 文件处理相关方法
  const processFiles = async (files: FileList | File[]): Promise<AttachedFile[]> => {
    const fileArray = Array.from(files)
    const processedFiles: AttachedFile[] = []

    for (const file of fileArray) {
      const attachedFile: AttachedFile = {
        name: file.name,
        path: naimo.webUtils.getPathForFile(file), // 使用 webUtils 获取完整文件路径
        type: file.type,
        size: file.size,
      }
      processedFiles.push(attachedFile)
    }

    // 尝试提取所有文件的图标
    const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml']

    for (let i = 0; i < processedFiles.length; i++) {
      try {
        let icon: string | null = null
        if (imageTypes.includes(processedFiles[i].type)) {
          // 对于图片文件，使用FileReader转换为Data URL
          icon = await convertFileToDataURL(fileArray[i])
        } else {
          // 如果是剪切板的文件则不提取图标
          if (processedFiles[i].type === 'text/plain') continue
          icon = await naimo.router.appExtractFileIcon(processedFiles[i].path)
        }
        if (icon) processedFiles[i].icon = icon
      } catch (error) {
        console.error(`提取文件图标失败 (${processedFiles[i].name}):`, error)
      }
    }

    return processedFiles
  }

  const addFiles = async (files: FileList | File[]) => {
    const processedFiles = await processFiles(files)
    attachedFiles.value = [...attachedFiles.value, ...processedFiles]
    return processedFiles
  }

  const clearAttachedFiles = () => {
    attachedFiles.value = []
  }

  const removeFile = (index: number) => {
    if (index >= 0 && index < attachedFiles.value.length) {
      attachedFiles.value.splice(index, 1)
    }
  }

  // 将文件转换为 AppItem 格式（用于兼容现有的文件列表功能）
  const convertToAppItems = (): AppItem[] => {
    return attachedFiles.value.map(file => ({
      name: file.name,
      path: file.path,
      icon: file.icon || null,
      lastUsed: Date.now(),
      usageCount: 1,
    }))
  }

  // 获取文件扩展名
  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || ''
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return {
    // 状态
    attachedFiles,
    firstFile,
    firstFileIcon,
    hasFiles,

    // 方法
    processFiles,
    addFiles,
    clearAttachedFiles,
    removeFile,
    convertToAppItems,
    getFileExtension,
    formatFileSize,
  }
}
