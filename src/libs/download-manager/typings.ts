/**
 * 下载管理器共享类型定义
 */

/**
 * 下载参数接口
 */
export interface DownloadParams {
  /** 下载链接 */
  url: string;
  /** 保存路径 */
  filePath?: string;
  /** 保存目录 */
  directory?: string;
  /** 文件名 */
  saveAsFilename?: string;
  /** 是否显示另存为对话框 */
  showSaveDialog?: boolean;
  /** 另存为对话框选项 */
  saveDialogOptions?: {
    title?: string;
    defaultPath?: string;
  };
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean;
  /** 是否在应用关闭时持久化下载 */
  persistOnAppClose?: boolean;
  /** 附加元数据 */
  metadata?: any;
}

/**
 * 下载状态接口
 */
export interface DownloadStatus {
  /** 下载ID */
  id: string;
  /** 下载链接 */
  url: string;
  /** 保存路径 */
  filePath: string;
  /** 文件名 */
  filename: string;
  /** 下载进度（0-100） */
  progress: number;
  /** 下载状态 */
  status: 'pending' | 'downloading' | 'completed' | 'paused' | 'cancelled' | 'error' | 'interrupted';
  /** 已接收字节数 */
  bytesReceived: number;
  /** 总字节数 */
  totalBytes: number;
  /** 下载速率（字节/秒） */
  downloadRate: number;
  /** 估计剩余时间（秒） */
  estimatedTimeRemaining: number;
  /** 附加元数据 */
  metadata?: any;
}

/**
 * 下载事件接口
 */
export interface DownloadEvents {
  /** 下载开始事件 */
  'download-started': { id: string; filename: string; totalBytes: number };
  /** 下载进度事件 */
  'download-progress': DownloadStatus;
  /** 下载完成事件 */
  'download-completed': { id: string; filePath: string; metadata?: any };
  /** 下载错误事件 */
  'download-error': { id: string; error: string };
  /** 下载暂停事件 */
  'download-paused': { id: string };
  /** 下载恢复事件 */
  'download-resumed': { id: string };
  /** 下载取消事件 */
  'download-cancelled': { id: string };
  /** 下载中断事件 */
  'download-interrupted': { id: string };
  /** 下载持久化事件 */
  'download-persisted': { id: string; persistedFilePath: string };
}

/**
 * 下载事件回调函数类型
 */
export type DownloadEventCallback<T extends keyof DownloadEvents> = (data: DownloadEvents[T]) => void;

/**
 * 下载管理器配置接口
 */
export interface DownloadManagerConfig {
  /** 默认下载目录 */
  defaultDirectory?: string;
  /** 是否默认覆盖文件 */
  defaultOverwrite?: boolean;
  /** 是否默认启用持久化 */
  defaultPersistOnAppClose?: boolean;
  /** 最大并发下载数 */
  maxConcurrentDownloads?: number;
}
