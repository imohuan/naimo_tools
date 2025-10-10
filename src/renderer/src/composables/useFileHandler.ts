import { ref, computed, readonly, nextTick } from 'vue'
import type { AppItem } from '@/temp_code/typings/search'
import type { AttachedFile } from '@/typings/composableTypes'

/**
 * 文件处理配置选项
 */
export interface FileHandlerOptions {
  /** 最大文件数量 */
  maxFiles?: number
  /** 自动提取图标 */
  autoExtractIcons?: boolean
  /** 支持的图片类型 */
  imageTypes?: string[]
  /** 最大文件大小 (bytes) */
  maxFileSize?: number
}

/**
 * 文件处理状态
 */
export interface FileHandlerState {
  /** 附件文件列表 */
  attachedFiles: AttachedFile[]
  /** 第一个文件 */
  firstFile?: AttachedFile
  /** 第一个文件的图标 */
  firstFileIcon?: string
  /** 是否有文件 */
  hasFiles: boolean
  /** 文件总数 */
  fileCount: number
  /** 总文件大小 */
  totalSize: number
}

/**
 * 文件处理组合式函数
 * 提供完整的文件管理功能
 */
export function useFileHandler(options: FileHandlerOptions = {}) {
  const {
    maxFiles = 20,
    autoExtractIcons = true,
    imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'],
    maxFileSize = 100 * 1024 * 1024 // 100MB
  } = options

  // 附件文件列表
  const attachedFiles = ref<AttachedFile[]>([])

  // 计算属性
  const firstFile = computed(() => attachedFiles.value[0])
  const firstFileIcon = computed(() => firstFile.value?.icon)
  const hasFiles = computed(() => attachedFiles.value.length > 0)
  const fileCount = computed(() => attachedFiles.value.length)
  const totalSize = computed(() => attachedFiles.value.reduce((sum, file) => sum + file.size, 0))

  // 状态对象
  const state = computed<FileHandlerState>(() => ({
    attachedFiles: attachedFiles.value,
    firstFile: firstFile.value,
    firstFileIcon: firstFileIcon.value,
    hasFiles: hasFiles.value,
    fileCount: fileCount.value,
    totalSize: totalSize.value
  }))

  /**
   * 将File对象转换为Data URL
   */
  const convertFileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * 验证单个文件
   */
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // 检查文件大小
    if (file.size > maxFileSize) {
      return {
        valid: false,
        error: `文件 ${file.name} 超过最大大小限制 ${formatFileSize(maxFileSize)}`
      }
    }

    // 检查文件数量
    if (attachedFiles.value.length >= maxFiles) {
      return {
        valid: false,
        error: `已达到最大文件数量限制 ${maxFiles}`
      }
    }

    return { valid: true }
  }

  /**
   * 将File转换为Base64
   */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * 处理文件列表
   */
  const processFiles = async (files: FileList | File[]): Promise<AttachedFile[]> => {
    const fileArray = Array.from(files)
    const processedFiles: AttachedFile[] = []
    const errors: string[] = []

    for (const file of fileArray) {
      // 验证文件
      const validation = validateFile(file)
      if (!validation.valid) {
        errors.push(validation.error!)
        continue
      }

      // 尝试获取文件路径
      let filePath = naimo.webUtils.getPathForFile(file)
      // 获取文件路径是否是文件夹
      const isDirectory = await naimo.router.filesystemIsDirectory(filePath)

      // 如果是图片且没有路径（剪贴板截图），保存到临时文件
      if ((!filePath || filePath.trim() === '') && imageTypes.includes(file.type)) {
        try {
          console.log('检测到剪贴板图片（无路径），正在保存到临时文件...')

          // 转换为base64
          const base64Data = await fileToBase64(file)

          // 调用IPC保存到临时文件
          filePath = await naimo.router.filesystemSaveClipboardImageToTemp({
            name: file.name,
            type: file.type,
            base64Data
          })

          console.log('剪贴板图片已保存到:', filePath)
        } catch (error) {
          console.error('保存剪贴板图片失败:', error)
          errors.push(`保存剪贴板图片失败: ${file.name}`)
          continue
        }
      }

      const attachedFile: AttachedFile = {
        name: file.name,
        path: filePath,
        type: isDirectory ? 'directory' : "file",
        size: file.size,
        originalFile: file
      }
      processedFiles.push(attachedFile)
    }

    // 输出错误信息
    if (errors.length > 0) {
      console.warn('文件处理错误:', errors)
    }

    // 提取图标（如果启用）
    if (autoExtractIcons) {
      await extractIcons(processedFiles, fileArray)
    }

    return processedFiles
  }

  /**
   * 提取文件图标
   */
  const extractIcons = async (processedFiles: AttachedFile[], fileArray: File[]) => {
    const iconPromises = processedFiles.map(async (file, index) => {
      try {
        let icon: string | null = null

        if (imageTypes.includes(file.type)) {
          // 图片文件使用 Data URL
          icon = await convertFileToDataURL(fileArray[index])
        } else if (file.type !== 'text/plain') {
          // 其他文件类型提取系统图标
          icon = await naimo.router.appExtractFileIcon(file.path)
        }

        if (icon) {
          file.icon = icon
        }
      } catch (error) {
        console.error(`提取文件图标失败 (${file.name}):`, error)
      }
    })

    // 并发处理所有图标提取
    await Promise.allSettled(iconPromises)
  }

  /**
   * 添加文件
   */
  const addFiles = async (files: FileList | File[]): Promise<AttachedFile[]> => {
    const processedFiles = await processFiles(files)

    if (processedFiles.length > 0) {
      attachedFiles.value = [...attachedFiles.value, ...processedFiles]

      // 等待下一个 tick 确保 UI 更新
      await nextTick()
    }

    return processedFiles
  }

  /**
   * 清空所有附件文件
   */
  const clearAttachedFiles = () => {
    attachedFiles.value = []
  }

  /**
   * 移除指定索引的文件
   */
  const removeFile = (index: number) => {
    if (index >= 0 && index < attachedFiles.value.length) {
      attachedFiles.value.splice(index, 1)
    }
  }

  /**
   * 移除指定路径的文件
   */
  const removeFileByPath = (path: string) => {
    const index = attachedFiles.value.findIndex(file => file.path === path)
    if (index !== -1) {
      removeFile(index)
    }
  }

  /**
   * 批量移除文件
   */
  const removeFiles = (indices: number[]) => {
    // 按降序排序，从后往前删除，避免索引变化
    const sortedIndices = [...indices].sort((a, b) => b - a)
    sortedIndices.forEach(index => removeFile(index))
  }

  /**
   * 转换为 AppItem 格式
   */
  const convertToAppItems = (): AppItem[] => {
    return attachedFiles.value.map(file => ({
      name: file.name,
      path: file.path,
      icon: file.icon || null,
      type: 'text' as const,
    }))
  }

  /**
   * 获取文件扩展名
   */
  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || ''
  }

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 检查文件是否为图片
   */
  const isImageFile = (file: AttachedFile): boolean => {
    return imageTypes.includes(file.type)
  }

  /**
   * 获取文件类型描述
   */
  const getFileTypeDescription = (file: AttachedFile): string => {
    if (isImageFile(file)) return '图片文件'
    if (file.type.startsWith('text/')) return '文本文件'
    if (file.type.startsWith('audio/')) return '音频文件'
    if (file.type.startsWith('video/')) return '视频文件'
    if (file.type.includes('pdf')) return 'PDF文件'
    if (file.type.includes('zip') || file.type.includes('rar')) return '压缩文件'
    return '其他文件'
  }

  return {
    // 只读状态
    attachedFiles: attachedFiles,
    state: state,

    // 计算属性
    firstFile,
    firstFileIcon,
    hasFiles,
    fileCount,
    totalSize,

    // 核心方法
    processFiles,
    addFiles,
    clearAttachedFiles,
    removeFile,
    removeFileByPath,
    removeFiles,

    // 转换和工具方法
    convertToAppItems,
    getFileExtension,
    formatFileSize,
    isImageFile,
    getFileTypeDescription,
    validateFile,

    // 配置信息
    options: readonly({
      maxFiles,
      autoExtractIcons,
      imageTypes,
      maxFileSize
    })
  }
}
