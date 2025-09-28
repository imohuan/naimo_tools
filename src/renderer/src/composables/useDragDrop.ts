import { ref } from "vue";
import type { AttachedFile } from "@/typings/composableTypes";

export function useDragDrop(
  addFiles?: (files: FileList | File[]) => Promise<AttachedFile[]>
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

    const files = event.dataTransfer?.files;
    if (files && files.length > 0 && addFiles) {
      try {
        // 使用统一的文件处理逻辑
        await addFiles(files);
        console.log(`📁 拖拽添加了 ${files.length} 个文件`);
      } catch (error) {
        console.error('拖拽文件处理失败:', error);
      }
    }
  };

  return {
    isDragOver,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  };
}
