import { ref, readonly } from "vue";
import type { AttachedFile } from "@/typings/composableTypes";

/**
 * 拖拽处理配置选项
 */
export interface DragDropOptions {
  /** 是否启用拖拽功能 */
  enabled?: boolean;
  /** 最大文件数量限制 */
  maxFiles?: number;
  /** 允许的文件类型 */
  acceptedTypes?: string[];
  /** 拖拽时的视觉反馈效果 */
  dropEffect?: 'copy' | 'move' | 'link';
}

/**
 * 拖拽和放置功能的组合式函数
 * 提供文件拖拽处理的完整功能
 */
export function useDragDrop(
  addFiles?: (files: FileList | File[]) => Promise<AttachedFile[]>,
  options: DragDropOptions = {}
) {
  const {
    enabled = true,
    maxFiles = 10,
    acceptedTypes = [],
    dropEffect = 'copy'
  } = options;

  // 状态管理
  const isDragOver = ref(false);
  const dragCounter = ref(0); // 用于更精确的拖拽状态管理

  /**
   * 验证文件是否符合要求
   */
  const validateFiles = (files: FileList): { valid: File[]; invalid: File[] } => {
    const fileArray = Array.from(files);
    const valid: File[] = [];
    const invalid: File[] = [];

    for (const file of fileArray) {
      // 检查文件数量限制
      if (valid.length >= maxFiles) {
        invalid.push(file);
        continue;
      }

      // 检查文件类型
      if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
        invalid.push(file);
        continue;
      }

      valid.push(file);
    }

    return { valid, invalid };
  };

  /**
   * 处理拖拽悬停事件
   */
  const handleDragOver = (event: DragEvent) => {
    if (!enabled) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = dropEffect;
    }
  };

  /**
   * 处理拖拽进入事件
   */
  const handleDragEnter = (event: DragEvent) => {
    if (!enabled) return;

    event.preventDefault();
    event.stopPropagation();

    dragCounter.value++;
    if (dragCounter.value === 1) {
      isDragOver.value = true;
    }
  };

  /**
   * 处理拖拽离开事件
   */
  const handleDragLeave = (event: DragEvent) => {
    if (!enabled) return;

    event.preventDefault();
    event.stopPropagation();

    dragCounter.value--;
    if (dragCounter.value === 0) {
      isDragOver.value = false;
    }
  };

  /**
   * 处理文件放置事件
   */
  const handleDrop = async (event: DragEvent) => {
    if (!enabled) return;

    event.preventDefault();
    event.stopPropagation();

    // 重置状态
    isDragOver.value = false;
    dragCounter.value = 0;

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0 || !addFiles) {
      return;
    }

    try {
      // 验证文件
      const { valid, invalid } = validateFiles(files);

      if (invalid.length > 0) {
        console.warn(`🚫 忽略 ${invalid.length} 个不符合要求的文件:`,
          invalid.map(f => f.name));
      }

      if (valid.length > 0) {
        // 处理有效文件
        await addFiles(valid);
        console.log(`📁 拖拽添加了 ${valid.length} 个文件`);
      }
    } catch (error) {
      console.error('拖拽文件处理失败:', error);
      // 重置状态确保UI正常
      isDragOver.value = false;
      dragCounter.value = 0;
    }
  };

  /**
   * 重置拖拽状态
   */
  const reset = () => {
    isDragOver.value = false;
    dragCounter.value = 0;
  };

  return {
    // 只读状态
    isDragOver: readonly(isDragOver),

    // 事件处理器
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,

    // 工具方法
    reset,
    validateFiles,

    // 配置信息
    options: readonly({
      enabled,
      maxFiles,
      acceptedTypes,
      dropEffect
    })
  };
}
