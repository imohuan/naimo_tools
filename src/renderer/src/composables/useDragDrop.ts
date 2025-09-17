import { ref } from "vue";
// import type { AttachedFile } from "./useFileHandler";

export function useDragDrop(
  // updateCategoryInBoth: (categoryId: string, updater: (category: any) => void) => void,
  // originalCategories: any,
  // handleSearch: (value: string, attachedFiles?: any[]) => Promise<void>,
  // addFiles: (files: FileList | File[]) => Promise<AttachedFile[]>
) {
  const isDragOver = ref(false);

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer!.dropEffect = "copy";
  };

  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault();
    isDragOver.value = true;
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    if (!(event.currentTarget as Element)?.contains(event.relatedTarget as Node)) {
      isDragOver.value = false;
    }
  };

  const handleDrop = async (event: DragEvent) => {
    event.preventDefault();
    isDragOver.value = false;
    // const files = event.dataTransfer?.files;
    // if (files && files.length > 0) {
    //   // 使用统一的文件处理逻辑
    //   const processedFiles = await addFiles(files);
    //   // 转换为 AppItem 格式并添加到文件列表
    //   // const appItems = convertToAppItems()
    //   // for (const fileItem of appItems) {
    //   //   // 添加到文件列表
    //   //   updateCategoryInBoth('files', (filesCategory: any) => {
    //   //     const existingIndex = filesCategory.items.findIndex(
    //   //       (item: AppItem) => item.path === fileItem.path
    //   //     )
    //   //     if (existingIndex >= 0) {
    //   //       filesCategory.items[existingIndex].lastUsed = Date.now()
    //   //       filesCategory.items[existingIndex].usageCount =
    //   //         (filesCategory.items[existingIndex].usageCount || 0) + 1
    //   //     } else {
    //   //       filesCategory.items.unshift(fileItem)
    //   //       if (filesCategory.items.length > filesCategory.maxDisplayCount) {
    //   //         filesCategory.items = filesCategory.items.slice(0, filesCategory.maxDisplayCount)
    //   //       }
    //   //     }
    //   //   })
    //   // }

    //   // // 保存到 electron-store
    //   // const originalFilesCategory = originalCategories.value.find((cat: any) => cat.id === 'files')
    //   // if (originalFilesCategory) {
    //   //   try {
    //   //     const serializeAppItems = (items: AppItem[]): AppItem[] => {
    //   //       return items.map((item) => ({
    //   //         name: item.name,
    //   //         path: item.path,
    //   //         icon: null,
    //   //         ...(item.lastUsed && { lastUsed: item.lastUsed }),
    //   //         ...(item.usageCount && { usageCount: item.usageCount }),
    //   //       }))
    //   //     }
    //   //     await api.ipcRouter.storeSet('fileList', serializeAppItems(originalFilesCategory.items))
    //   //   } catch (error) {
    //   //     console.error('保存文件列表失败:', error)
    //   //   }
    //   // }

    //   // // 将第一个文件名设置到搜索框中并执行搜索
    //   // if (processedFiles.length > 0) {
    //   //   await handleSearch(processedFiles[0].name)
    //   // }
    // }
  };

  return {
    isDragOver,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  };
}
