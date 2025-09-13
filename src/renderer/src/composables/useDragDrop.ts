import { ref } from 'vue'
import type { AppItem } from '@shared/types'

export function useDragDrop(
  updateCategoryInBoth: (categoryId: string, updater: (category: any) => void) => void,
  originalCategories: any,
  handleSearch: (value: string) => Promise<void>
) {
  const isDragOver = ref(false)

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer!.dropEffect = 'copy'
  }

  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault()
    isDragOver.value = true
  }

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault()
    if (!(event.currentTarget as Element)?.contains(event.relatedTarget as Node)) {
      isDragOver.value = false
    }
  }

  const handleDrop = async (event: DragEvent) => {
    event.preventDefault()
    isDragOver.value = false

    const files = event.dataTransfer?.files
    if (files && files.length > 0) {
      const file = files[0]
      const filePath = webUtils.getPathForFile(file)

      const fileItem: AppItem = {
        name: file.name,
        path: filePath,
        icon: null,
        lastUsed: Date.now(),
        usageCount: 1,
      }

      // 提取文件图标
      try {
        const icon = await api.ipcRouter.appExtractFileIcon(filePath)
        if (icon) {
          fileItem.icon = icon
        }
      } catch (error) {
        console.error('提取文件图标时出错:', error)
      }

      // 添加到文件列表
      updateCategoryInBoth('files', (filesCategory: any) => {
        const existingIndex = filesCategory.items.findIndex(
          (item: AppItem) => item.path === fileItem.path
        )
        if (existingIndex >= 0) {
          filesCategory.items[existingIndex].lastUsed = Date.now()
          filesCategory.items[existingIndex].usageCount =
            (filesCategory.items[existingIndex].usageCount || 0) + 1
        } else {
          filesCategory.items.unshift(fileItem)
          if (filesCategory.items.length > filesCategory.maxDisplayCount) {
            filesCategory.items = filesCategory.items.slice(0, filesCategory.maxDisplayCount)
          }
        }
      })

      // 保存到 electron-store
      const originalFilesCategory = originalCategories.value.find((cat: any) => cat.id === 'files')
      if (originalFilesCategory) {
        try {
          const serializeAppItems = (items: AppItem[]): AppItem[] => {
            return items.map((item) => ({
              name: item.name,
              path: item.path,
              icon: null,
              ...(item.lastUsed && { lastUsed: item.lastUsed }),
              ...(item.usageCount && { usageCount: item.usageCount }),
            }))
          }
          await api.ipcRouter.storeSet('fileList', serializeAppItems(originalFilesCategory.items))
        } catch (error) {
          console.error('保存文件列表失败:', error)
        }
      }

      // 将文件名设置到搜索框中并执行搜索
      await handleSearch(file.name)
    }
  }

  return {
    isDragOver,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  }
}
