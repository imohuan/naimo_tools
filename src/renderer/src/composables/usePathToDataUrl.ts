import { ref, readonly } from 'vue';

/**
 * 路径转换为 Data URL 的 Composable 函数
 * 用于在 Electron 渲染进程中安全地显示本地文件
 */
export function usePathToDataUrl() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  /**
   * 判断是否为本地文件路径
   * @param filePath 文件路径
   * @returns 是否为本地路径
   */
  const isLocalPath = (filePath: string): boolean => {
    if (!filePath) return false;

    // 检查是否为 Windows 绝对路径 (C:\, D:\, etc.)
    if (/^[A-Za-z]:[\\\/]/.test(filePath)) return true;

    // 检查是否为 Unix/Linux 绝对路径 (/, /home, etc.)
    if (filePath.startsWith('/')) return true;

    // 检查是否为 UNC 路径 (\\server\share)
    if (filePath.startsWith('\\\\')) return true;

    return false;
  };

  /**
   * 获取文件扩展名
   * @param filePath 文件路径
   * @returns 文件扩展名
   */
  const getFileExtension = (filePath: string): string => {
    const lastDotIndex = filePath.lastIndexOf('.');
    return lastDotIndex !== -1 ? filePath.substring(lastDotIndex).toLowerCase() : '';
  };

  /**
   * 判断是否为图片文件
   * @param filePath 文件路径
   * @returns 是否为图片文件
   */
  const isImageFile = (filePath: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico'];
    const ext = getFileExtension(filePath);
    return imageExtensions.includes(ext);
  };

  /**
   * 将本地文件路径转换为 Data URL
   * @param filePath 本地文件路径
   * @returns Promise<string> Data URL
   */
  const convertPathToDataUrl = async (filePath: string): Promise<string> => {
    if (!filePath) {
      throw new Error('文件路径不能为空');
    }

    if (!isLocalPath(filePath)) {
      throw new Error('不是有效的本地文件路径');
    }

    if (!isImageFile(filePath)) {
      throw new Error('不是支持的图片格式');
    }

    isLoading.value = true;
    error.value = null;

    try {
      // 使用 IPC 路由读取文件为 Base64
      const base64Data = await window.naimo.router.filesystemReadFileAsBase64(filePath);

      if (!base64Data) {
        throw new Error('读取文件失败');
      }

      // 根据文件扩展名确定 MIME 类型
      const ext = getFileExtension(filePath);
      let mimeType = 'image/png'; // 默认

      switch (ext) {
        case '.jpg':
        case '.jpeg':
          mimeType = 'image/jpeg';
          break;
        case '.png':
          mimeType = 'image/png';
          break;
        case '.gif':
          mimeType = 'image/gif';
          break;
        case '.webp':
          mimeType = 'image/webp';
          break;
        case '.bmp':
          mimeType = 'image/bmp';
          break;
        case '.svg':
          mimeType = 'image/svg+xml';
          break;
        case '.ico':
          mimeType = 'image/x-icon';
          break;
      }

      // 构造 Data URL
      const dataUrl = `data:${mimeType};base64,${base64Data}`;

      return dataUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      error.value = errorMessage;
      throw new Error(`转换文件路径失败: ${errorMessage}`);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 批量转换多个文件路径
   * @param filePaths 文件路径数组
   * @returns Promise<string[]> Data URL 数组
   */
  const convertMultiplePathsToDataUrl = async (filePaths: string[]): Promise<string[]> => {
    const results: string[] = [];

    for (const filePath of filePaths) {
      try {
        const dataUrl = await convertPathToDataUrl(filePath);
        results.push(dataUrl);
      } catch (err) {
        console.error(`转换文件失败: ${filePath}`, err);
        results.push(''); // 失败时推入空字符串
      }
    }

    return results;
  };

  /**
   * 清除错误状态
   */
  const clearError = () => {
    error.value = null;
  };

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    isLocalPath,
    isImageFile,
    convertPathToDataUrl,
    convertMultiplePathsToDataUrl,
    clearError
  };
}

// 类型导出
export type PathToDataUrlComposable = ReturnType<typeof usePathToDataUrl>;
