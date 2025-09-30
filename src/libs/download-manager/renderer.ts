import { ipcRenderer } from 'electron';
import { DownloadParams, DownloadStatus, DownloadEventCallback } from './typings';

// IPC 通讯函数
/**
 * 开始下载
 * @param params 下载参数
 * @returns 下载ID
 */
export async function startDownload(params: DownloadParams): Promise<string> {
  return ipcRenderer.invoke('start-download', params);
}

/**
 * 暂停下载
 * @param id 下载ID
 * @returns 是否成功
 */
export async function pauseDownload(id: string): Promise<boolean> {
  return ipcRenderer.invoke('pause-download', id);
}

/**
 * 恢复下载
 * @param id 下载ID
 * @returns 是否成功
 */
export async function resumeDownload(id: string): Promise<boolean> {
  return ipcRenderer.invoke('resume-download', id);
}

/**
 * 取消下载
 * @param id 下载ID
 * @returns 是否成功
 */
export async function cancelDownload(id: string): Promise<boolean> {
  return ipcRenderer.invoke('cancel-download', id);
}

/**
 * 获取下载状态
 * @param id 下载ID
 * @returns 下载状态
 */
export async function getDownloadStatus(id: string): Promise<DownloadStatus | null> {
  return ipcRenderer.invoke('get-download-status', id);
}

/**
 * 获取所有下载
 * @returns 所有下载状态列表
 */
export async function getAllDownloads(): Promise<DownloadStatus[]> {
  return ipcRenderer.invoke('get-all-downloads');
}

/**
 * 获取活动下载数量
 * @returns 活动下载数量
 */
export async function getActiveDownloadCount(): Promise<number> {
  return ipcRenderer.invoke('get-active-download-count');
}

/**
 * 恢复下载（从持久化数据）
 * @param restoreData 恢复数据
 * @returns 新的下载ID
 */
export async function restoreDownload(restoreData: any): Promise<string> {
  return ipcRenderer.invoke('restore-download', restoreData);
}

/**
 * 选择下载目录
 * @returns 选择的目录路径
 */
export async function selectDownloadDirectory(): Promise<string | null> {
  return ipcRenderer.invoke('select-download-directory');
}

/**
 * 打开下载文件夹
 * @param filePath 文件路径
 * @returns 是否成功
 */
export async function openDownloadFolder(filePath: string): Promise<boolean> {
  return ipcRenderer.invoke('open-download-folder', filePath);
}

/**
 * 删除下载任务
 * @param id 下载ID
 * @param deleteFile 是否同时删除文件
 * @returns 是否成功
 */
export async function deleteDownload(id: string, deleteFile: boolean = false): Promise<boolean> {
  return ipcRenderer.invoke('delete-download', id, deleteFile);
}

/**
 * 监听下载事件
 * @param channel 频道名称
 * @param callback 回调函数
 */
export function onDownloadEvent(channel: string, callback: Function): void {
  ipcRenderer.on(channel, (event, data) => {
    callback(data);
  });
}

/**
 * 移除所有下载事件监听器
 */
export function removeAllDownloadListeners(): void {
  const channels = [
    'download-started',
    'download-progress',
    'download-completed',
    'download-error',
    'download-paused',
    'download-resumed',
    'download-cancelled',
    'download-interrupted',
    'download-persisted',
    'download-deleted'
  ];

  channels.forEach(channel => {
    ipcRenderer.removeAllListeners(channel);
  });
}

// 事件监听器管理
const eventListeners: Map<string, Function[]> = new Map();

/**
 * 添加事件监听器
 * @param channel 频道名称
 * @param callback 回调函数
 * @returns 取消监听的函数
 */
function addEventListener(channel: string, callback: Function): () => void {
  if (!eventListeners.has(channel)) {
    eventListeners.set(channel, []);
    onDownloadEvent(channel, (data: any) => {
      const listeners = eventListeners.get(channel) || [];
      listeners.forEach(listener => listener(data));
    });
  }

  const listeners = eventListeners.get(channel)!;
  listeners.push(callback);

  // 返回取消监听的函数
  return () => {
    const currentListeners = eventListeners.get(channel);
    if (currentListeners) {
      const index = currentListeners.indexOf(callback);
      if (index !== -1) {
        currentListeners.splice(index, 1);
      }
      // 如果没有监听器了，清理该频道
      if (currentListeners.length === 0) {
        eventListeners.delete(channel);
        ipcRenderer.removeAllListeners(channel);
      }
    }
  };
}

/**
 * 移除所有事件监听器
 */
export function removeAllListeners(): void {
  removeAllDownloadListeners();
  eventListeners.clear();
}

// 事件监听函数
/**
 * 监听下载开始
 * @param callback 回调函数
 * @returns 取消监听的函数
 */
export function onDownloadStarted(callback: DownloadEventCallback<'download-started'>): () => void {
  return addEventListener('download-started', callback);
}

/**
 * 监听下载进度
 * @param callback 回调函数
 * @returns 取消监听的函数
 */
export function onDownloadProgress(callback: DownloadEventCallback<'download-progress'>): () => void {
  return addEventListener('download-progress', callback);
}

/**
 * 监听下载完成
 * @param callback 回调函数
 * @returns 取消监听的函数
 */
export function onDownloadCompleted(callback: DownloadEventCallback<'download-completed'>): () => void {
  return addEventListener('download-completed', callback);
}

/**
 * 监听下载错误
 * @param callback 回调函数
 * @returns 取消监听的函数
 */
export function onDownloadError(callback: DownloadEventCallback<'download-error'>): () => void {
  return addEventListener('download-error', callback);
}

/**
 * 监听下载暂停
 * @param callback 回调函数
 * @returns 取消监听的函数
 */
export function onDownloadPaused(callback: DownloadEventCallback<'download-paused'>): () => void {
  return addEventListener('download-paused', callback);
}

/**
 * 监听下载恢复
 * @param callback 回调函数
 * @returns 取消监听的函数
 */
export function onDownloadResumed(callback: DownloadEventCallback<'download-resumed'>): () => void {
  return addEventListener('download-resumed', callback);
}

/**
 * 监听下载取消
 * @param callback 回调函数
 * @returns 取消监听的函数
 */
export function onDownloadCancelled(callback: DownloadEventCallback<'download-cancelled'>): () => void {
  return addEventListener('download-cancelled', callback);
}

/**
 * 监听下载中断
 * @param callback 回调函数
 * @returns 取消监听的函数
 */
export function onDownloadInterrupted(callback: DownloadEventCallback<'download-interrupted'>): () => void {
  return addEventListener('download-interrupted', callback);
}

/**
 * 监听下载持久化
 * @param callback 回调函数
 * @returns 取消监听的函数
 */
export function onDownloadPersisted(callback: DownloadEventCallback<'download-persisted'>): () => void {
  return addEventListener('download-persisted', callback);
}

/**
 * 监听下载删除
 * @param callback 回调函数
 * @returns 取消监听的函数
 */
export function onDownloadDeleted(callback: (data: { id: string }) => void): () => void {
  return addEventListener('download-deleted', callback);
}


// 导出对象
export const downloadManagerRenderer = {
  startDownload,
  pauseDownload,
  resumeDownload,
  cancelDownload,
  getDownloadStatus,
  getAllDownloads,
  getActiveDownloadCount,
  restoreDownload,
  selectDownloadDirectory,
  openDownloadFolder,
  deleteDownload,
  onDownloadStarted,
  onDownloadProgress,
  onDownloadCompleted,
  onDownloadError,
  onDownloadPaused,
  onDownloadResumed,
  onDownloadCancelled,
  onDownloadInterrupted,
  onDownloadPersisted,
  onDownloadDeleted,
  removeAllListeners
};
