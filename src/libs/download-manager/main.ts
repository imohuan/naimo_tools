import { BrowserWindow, ipcMain, dialog, shell, app } from 'electron';
import { dirname } from 'path';
import { ElectronDownloadManager } from 'electron-dl-manager';
import { DownloadParams, DownloadStatus, DownloadEvents } from './typings';
import { unlink } from 'fs/promises';

// 定义存储接口
export interface StorageProvider {
  get<T = any>(key: string, defaultValue?: T): T | undefined;
  set<T = any>(key: string, value: T): void;
}

/**
 * 下载管理器主进程类
 */
export class DownloadManagerMain {
  /** Electron 下载管理器实例 */
  private downloadManager: ElectronDownloadManager;
  /** 是否已初始化 */
  private initialized = false;
  /** 主窗口实例 */
  private mainWindow: BrowserWindow | null = null;
  /** 下载任务映射表，key为下载ID，value为下载状态 */
  private downloads: Map<string, DownloadStatus> = new Map();
  /** 存储提供者 */
  private storageProvider: StorageProvider | null = null;

  static instance: DownloadManagerMain | null = null;

  constructor(storageProvider?: StorageProvider) {
    // 启用调试日志，便于问题排查
    this.downloadManager = new ElectronDownloadManager({
      debugLogger: (message: string) => {
        console.log(`[ElectronDownloadManager] ${message}`);
      }
    });

    this.storageProvider = storageProvider || null;
    console.log('DownloadManagerMain 构造函数，存储提供者:', this.storageProvider ? '已设置' : '未设置');
    // 从存储中恢复下载任务
    this.loadDownloadsFromStorage();
  }

  static getInstance(storageProvider?: StorageProvider): DownloadManagerMain {
    if (!this.instance) {
      this.instance = new DownloadManagerMain(storageProvider);
    } else if (storageProvider && !this.instance.storageProvider) {
      // 如果实例已存在但没有存储提供者，设置存储提供者
      this.instance.setStorageProvider(storageProvider);
    }
    return this.instance;
  }

  /**
   * 设置存储提供者
   */
  setStorageProvider(storageProvider: StorageProvider): void {
    this.storageProvider = storageProvider;
    this.loadDownloadsFromStorage();
  }

  /**
   * 从存储中加载下载任务
   */
  private loadDownloadsFromStorage(): void {
    if (!this.storageProvider) {
      console.warn('没有存储提供者，无法加载下载任务');
      return;
    }

    try {
      const savedDownloads = this.storageProvider.get<DownloadStatus[]>('downloads', []);
      console.log('从存储中读取的下载任务:', savedDownloads);

      if (savedDownloads && Array.isArray(savedDownloads)) {
        savedDownloads.forEach(download => {
          // 确保下载对象包含所有必要字段
          const validDownload: DownloadStatus = {
            id: download.id || '',
            url: download.url || '',
            filePath: download.filePath || '',
            filename: download.filename || '',
            progress: Math.max(0, Math.min(100, download.progress || 0)),
            status: download.status || 'pending',
            bytesReceived: download.bytesReceived || 0,
            totalBytes: download.totalBytes || 0,
            downloadRate: 0, // 重置下载速率
            estimatedTimeRemaining: 0, // 重置预估时间
            metadata: download.metadata || {}
          };

          console.log(`恢复下载任务: ${validDownload.id}`, validDownload);
          this.downloads.set(validDownload.id, validDownload);
        });
        console.log(`从存储中恢复了 ${savedDownloads.length} 个下载任务`);
      } else {
        console.log('存储中没有下载任务或数据格式错误');
      }
    } catch (error) {
      console.error('加载下载任务失败:', error);
    }
  }

  /**
   * 保存下载任务到存储
   */
  private saveDownloadsToStorage(): void {
    if (!this.storageProvider) {
      console.warn('没有存储提供者，无法保存下载任务');
      return;
    }

    try {
      const downloadsArray = Array.from(this.downloads.values()).map(download => ({
        ...download,
        // 只保存必要的信息，文件信息在启动时实时获取
        metadata: {
          ...download.metadata,
          // 移除一些运行时数据
          lastUpdateTime: undefined
        }
      }));
      console.log(`正在保存 ${downloadsArray.length} 个下载任务到存储:`, downloadsArray);
      this.storageProvider.set('downloads', downloadsArray);
      console.log('下载任务保存成功');
    } catch (error) {
      console.error('保存下载任务失败:', error);
    }
  }

  /**
   * 初始化下载管理器
   * @param mainWindow 主窗口实例
   */
  async initialize(mainWindow?: BrowserWindow): Promise<void> {
    if (this.initialized) {
      console.warn('下载管理器已经初始化');
      return;
    }

    // 设置主窗口
    if (mainWindow) {
      this.mainWindow = mainWindow;
    }

    // 设置 IPC 处理程序
    this.setupIpcHandlers();

    // 尝试恢复持久化的下载
    await this.restorePersistentDownloads();

    this.initialized = true;
    console.log('下载管理器初始化完成');
  }

  /**
   * 恢复持久化的下载（应用启动时调用）
   */
  private async restorePersistentDownloads(): Promise<void> {
    if (!this.isReady()) {
      console.log('主窗口未准备好，跳过持久化下载恢复');
      return;
    }

    console.log('开始恢复持久化的下载...');

    for (const [downloadId, download] of this.downloads.entries()) {
      if (download.metadata?.persistedRestoreData) {
        try {
          console.log(`尝试恢复持久化下载: ${downloadId}`);

          const restoredDownloadId = await this.downloadManager.restoreDownload({
            app,
            window: this.mainWindow!,
            restoreData: download.metadata.persistedRestoreData,
            callbacks: {
              onDownloadStarted: async ({ id, item, resolvedFilename }) => {
                console.log(`持久化下载已恢复: ${id}`);
                this.updateDownloadStatus(downloadId, {
                  status: 'downloading',
                  metadata: {
                    ...download.metadata,
                    persistedRestoreData: undefined // 清除持久化数据
                  }
                });
              },
              onDownloadProgress: async (data) => {
                const validProgress = Math.max(0, Math.min(100, Math.round(data.percentCompleted || 0)));

                this.updateDownloadStatus(downloadId, {
                  progress: validProgress,
                  bytesReceived: data.item.getReceivedBytes(),
                  totalBytes: data.item.getTotalBytes(),
                  downloadRate: data.downloadRateBytesPerSecond,
                  estimatedTimeRemaining: data.estimatedTimeRemainingSeconds,
                  status: 'downloading'
                });
              },
              onDownloadCompleted: async ({ id, item }) => {
                this.updateDownloadStatus(downloadId, {
                  progress: 100,
                  status: 'completed',
                  filePath: item.getSavePath()
                });
                this.sendToRenderer('download-completed', {
                  id: downloadId,
                  filePath: item.getSavePath()
                });
              },
              onDownloadCancelled: async ({ id }) => {
                this.updateDownloadStatus(downloadId, { status: 'cancelled' });
              },
              onDownloadInterrupted: async ({ id }) => {
                this.updateDownloadStatus(downloadId, { status: 'interrupted' });
              },
              onError: (error, data) => {
                console.error('恢复持久化下载时出错:', error);
                this.updateDownloadStatus(downloadId, {
                  status: 'error',
                  metadata: {
                    ...download.metadata,
                    error: error.message
                  }
                });
              }
            }
          });

          console.log(`持久化下载恢复成功: ${downloadId} -> ${restoredDownloadId}`);
        } catch (error) {
          console.error(`恢复持久化下载失败: ${downloadId}`, error);
          this.updateDownloadStatus(downloadId, {
            status: 'error',
            metadata: {
              ...download.metadata,
              error: `恢复失败: ${error}`
            }
          });
        }
      }
    }

    console.log('持久化下载恢复完成');
  }

  /**
   * 设置主窗口
   * @param mainWindow 主窗口实例
   */
  setMainWindow(mainWindow: BrowserWindow): void {
    if (!mainWindow) {
      console.warn('主窗口不能为空');
      return;
    }

    this.mainWindow = mainWindow;
    console.log('主窗口设置完成');
  }

  /**
   * 向渲染进程发送消息
   * @param channel 频道名称
   * @param data 数据
   */
  private sendToRenderer(channel: string, data: any): void {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(channel, data);
      }
    } catch (error) {
      console.error('发送消息到渲染进程失败:', error);
    }
  }


  /**
   * 检查下载管理器是否已准备好
   */
  private isReady(): boolean {
    return this.mainWindow !== null && !this.mainWindow.isDestroyed();
  }

  /**
   * 更新下载状态
   * @param id 下载ID
   * @param status 状态更新
   */
  private updateDownloadStatus(id: string, status: Partial<DownloadStatus>): void {
    const currentStatus = this.downloads.get(id);
    if (currentStatus) {
      const updatedStatus = { ...currentStatus, ...status };
      this.downloads.set(id, updatedStatus);
      this.sendToRenderer('download-progress', updatedStatus);
      // 自动保存到存储
      this.saveDownloadsToStorage();
    }
  }

  /**
   * 设置 IPC 处理程序
   */
  private setupIpcHandlers(): void {
    // 开始下载
    ipcMain.handle('start-download', async (event, params: DownloadParams) => {
      if (!this.isReady()) {
        throw new Error('下载管理器未准备好。请先调用 initialize() 或 setMainWindow() 方法。');
      }

      try {
        const downloadId = await this.downloadManager.download({
          window: this.mainWindow!,
          url: params.url,
          directory: params.directory,
          saveAsFilename: params.saveAsFilename,
          saveDialogOptions: params.showSaveDialog ? {
            title: params.saveDialogOptions?.title || '保存文件',
            defaultPath: params.saveDialogOptions?.defaultPath
          } : undefined,
          overwrite: params.overwrite || false,
          // 启用原生持久化功能，应用关闭时自动保存下载状态
          persistOnAppClose: params.persistOnAppClose !== false, // 默认启用
          app: app, // 总是提供 app 实例
          callbacks: {
            onDownloadStarted: async ({ id, item, resolvedFilename }) => {
              const status: DownloadStatus = {
                id,
                url: params.url,
                filePath: item.getSavePath(),
                filename: resolvedFilename,
                progress: 0,
                status: 'downloading',
                bytesReceived: 0,
                totalBytes: item.getTotalBytes(),
                downloadRate: 0,
                estimatedTimeRemaining: 0,
                metadata: {
                  ...params.metadata,
                  lastUpdateTime: Date.now()
                }
              };
              this.downloads.set(id, status);
              // 保存下载任务到存储
              this.saveDownloadsToStorage();
              this.sendToRenderer('download-started', {
                id,
                filename: resolvedFilename,
                totalBytes: item.getTotalBytes()
              });
            },
            onDownloadProgress: async (data) => {
              // 直接使用 electron-dl-manager 提供的数据，无需重复计算
              const validProgress = Math.max(0, Math.min(100, Math.round(data.percentCompleted || 0)));

              this.updateDownloadStatus(data.id, {
                progress: validProgress,
                bytesReceived: data.item.getReceivedBytes(),
                totalBytes: data.item.getTotalBytes(),
                downloadRate: data.downloadRateBytesPerSecond, // 使用原生计算的速率
                estimatedTimeRemaining: data.estimatedTimeRemainingSeconds, // 使用原生计算的时间
                status: 'downloading'
              });
            },
            onDownloadCompleted: async ({ id, item }) => {
              this.updateDownloadStatus(id, {
                progress: 100,
                status: 'completed',
                filePath: item.getSavePath()
              });
              this.sendToRenderer('download-completed', {
                id,
                filePath: item.getSavePath(),
                metadata: params.metadata
              });
            },
            onDownloadCancelled: async ({ id }) => {
              this.updateDownloadStatus(id, { status: 'cancelled' });
              this.sendToRenderer('download-cancelled', { id });
            },
            onDownloadInterrupted: async ({ id }) => {
              this.updateDownloadStatus(id, { status: 'interrupted' });
              this.sendToRenderer('download-interrupted', { id });
            },
            onDownloadPersisted: async (data, restoreData) => {
              this.sendToRenderer('download-persisted', {
                id: data.id,
                persistedFilePath: restoreData.persistedFilePath || ''
              });
            },
            onError: (error, data) => {
              if (data) {
                this.updateDownloadStatus(data.id, { status: 'error' });
                this.sendToRenderer('download-error', {
                  id: data.id,
                  error: error.message
                });
              }
            }
          }
        });

        return downloadId;
      } catch (error) {
        console.error('Download failed:', error);
        throw error;
      }
    });

    // 暂停下载
    ipcMain.handle('pause-download', (event, downloadId: string) => {
      if (!this.isReady()) {
        console.error('下载管理器未准备好');
        return false;
      }

      try {
        console.log(`尝试暂停下载: ${downloadId}`);
        const download = this.downloads.get(downloadId);

        if (!download) {
          console.error(`找不到下载任务: ${downloadId}`);
          return false;
        }

        // 检查当前状态
        if (download.status !== 'downloading') {
          console.log(`下载 ${downloadId} 当前状态为 ${download.status}，无需暂停`);
          return true;
        }

        const restoreData = this.downloadManager.pauseDownload(downloadId);
        if (restoreData) {
          // 保存恢复数据，以便跨会话恢复
          this.updateDownloadStatus(downloadId, {
            status: 'paused',
            metadata: {
              ...download.metadata,
              pausedAt: Date.now(),
              restoreData // 保存恢复数据到 metadata 中
            }
          });
          this.sendToRenderer('download-paused', { id: downloadId });
          console.log(`下载 ${downloadId} 已暂停，恢复数据已保存`);
          return true; // 返回成功状态而不是恢复数据
        }
        console.warn(`无法暂停下载 ${downloadId}，可能不在活动下载列表中`);
        return false;
      } catch (error) {
        console.error('Pause download failed:', error);
        // 即使暂停失败，也更新本地状态
        const download = this.downloads.get(downloadId);
        if (download) {
          this.updateDownloadStatus(downloadId, { status: 'paused' });
          this.sendToRenderer('download-paused', { id: downloadId });
        }
        return false;
      }
    });

    // 恢复下载
    ipcMain.handle('resume-download', async (event, downloadId: string) => {
      if (!this.isReady()) {
        console.error('下载管理器未准备好');
        return false;
      }

      try {
        console.log(`尝试恢复下载: ${downloadId}`);
        const download = this.downloads.get(downloadId);

        if (!download) {
          console.error(`找不到下载任务: ${downloadId}`);
          return false;
        }

        // 防止重复操作：如果下载正在进行中，直接返回
        if (download.status === 'downloading') {
          console.log(`下载 ${downloadId} 已经在进行中`);
          return true;
        }

        // 检查下载状态
        if (download.status === 'paused') {
          console.log(`恢复暂停的下载: ${downloadId}`);

          // 检查是否有保存的恢复数据（暂停时保存的或持久化的）
          const restoreData = download.metadata?.restoreData || download.metadata?.persistedRestoreData;
          if (restoreData) {
            console.log(`使用保存的恢复数据恢复下载: ${downloadId}`);

            // 使用 restoreDownload 方法来恢复下载
            try {
              const restoredDownloadId = await this.downloadManager.restoreDownload({
                app,
                window: this.mainWindow!,
                restoreData: restoreData,
                callbacks: {
                  onDownloadStarted: async ({ id, item, resolvedFilename }) => {
                    console.log(`恢复的下载已开始: ${id}`);
                    this.updateDownloadStatus(downloadId, {
                      status: 'downloading',
                      metadata: {
                        ...download.metadata,
                        lastUpdateTime: Date.now(),
                        restoreData: undefined // 清除恢复数据
                      }
                    });
                    this.sendToRenderer('download-resumed', { id: downloadId });
                  },
                  onDownloadProgress: async ({ id, item, percentCompleted }) => {
                    const currentTime = Date.now();
                    const currentBytes = item.getReceivedBytes();
                    const currentStatus = this.downloads.get(downloadId);

                    let downloadRate = currentStatus?.downloadRate || 0;
                    let estimatedTimeRemaining = 0;

                    if (currentStatus && currentStatus.metadata?.lastUpdateTime) {
                      const timeDiff = (currentTime - currentStatus.metadata.lastUpdateTime) / 1000;
                      const bytesDiff = currentBytes - currentStatus.bytesReceived;

                      if (timeDiff >= 1.0) {
                        downloadRate = bytesDiff / timeDiff;
                        const remainingBytes = item.getTotalBytes() - currentBytes;
                        if (downloadRate > 0) {
                          estimatedTimeRemaining = remainingBytes / downloadRate;
                        }
                      }
                    }

                    this.updateDownloadStatus(downloadId, {
                      progress: Math.round(percentCompleted),
                      bytesReceived: currentBytes,
                      downloadRate: downloadRate,
                      estimatedTimeRemaining: estimatedTimeRemaining,
                      status: 'downloading',
                      totalBytes: item.getTotalBytes(),
                      metadata: {
                        ...currentStatus?.metadata,
                        lastUpdateTime: currentTime
                      }
                    });
                  },
                  onDownloadCompleted: async ({ id, item }) => {
                    this.updateDownloadStatus(downloadId, {
                      progress: 100,
                      status: 'completed',
                      filePath: item.getSavePath()
                    });
                    this.sendToRenderer('download-completed', {
                      id: downloadId,
                      filePath: item.getSavePath(),
                      metadata: download.metadata
                    });
                  },
                  onDownloadCancelled: async ({ id }) => {
                    this.updateDownloadStatus(downloadId, { status: 'cancelled' });
                    this.sendToRenderer('download-cancelled', { id: downloadId });
                  },
                  onDownloadInterrupted: async ({ id }) => {
                    this.updateDownloadStatus(downloadId, { status: 'interrupted' });
                    this.sendToRenderer('download-interrupted', { id: downloadId });
                  },
                  onError: (error, data) => {
                    console.error('恢复下载时出错:', error);
                    this.updateDownloadStatus(downloadId, {
                      status: 'error',
                      metadata: {
                        ...download.metadata,
                        error: error.message
                      }
                    });
                    this.sendToRenderer('download-error', {
                      id: downloadId,
                      error: error.message
                    });
                  }
                }
              });

              console.log(`下载恢复成功，恢复的ID: ${restoredDownloadId}`);
              return true;
            } catch (restoreError: any) {
              console.error(`使用恢复数据恢复下载失败: ${downloadId}`, restoreError);
              this.updateDownloadStatus(downloadId, {
                status: 'error',
                metadata: {
                  ...download.metadata,
                  error: restoreError?.message || '恢复下载失败'
                }
              });
              return false;
            }
          } else {
            // 直接尝试恢复（适用于仍在当前会话中的暂停下载）
            console.log(`直接恢复下载: ${downloadId}`);
            try {
              this.downloadManager.resumeDownload(downloadId);
              this.updateDownloadStatus(downloadId, { status: 'downloading' });
              this.sendToRenderer('download-resumed', { id: downloadId });
              console.log(`下载 ${downloadId} 已恢复`);
              return true;
            } catch (resumeError: any) {
              console.error(`直接恢复下载失败: ${downloadId}`, resumeError);
              this.updateDownloadStatus(downloadId, {
                status: 'error',
                metadata: {
                  ...download.metadata,
                  error: resumeError?.message || '恢复下载失败'
                }
              });
              return false;
            }
          }
        } else if (download.status === 'interrupted') {
          console.log(`恢复中断的下载: ${downloadId}`);

          const restoreData = download.metadata?.restoreData || download.metadata?.persistedRestoreData;
          if (restoreData) {
            try {
              const restoredDownloadId = await this.downloadManager.restoreDownload({
                app,
                window: this.mainWindow!,
                restoreData: restoreData,
                callbacks: {
                  onDownloadStarted: async ({ id, item, resolvedFilename }) => {
                    console.log(`中断下载已恢复: ${id}`);
                    this.updateDownloadStatus(downloadId, {
                      status: 'downloading',
                      metadata: {
                        ...download.metadata,
                        lastUpdateTime: Date.now(),
                        restoreData: undefined
                      }
                    });
                    this.sendToRenderer('download-resumed', { id: downloadId });
                  },
                  onDownloadProgress: async ({ id, item, percentCompleted }) => {
                    const currentTime = Date.now();
                    const currentBytes = item.getReceivedBytes();
                    const currentStatus = this.downloads.get(downloadId);

                    let downloadRate = currentStatus?.downloadRate || 0;
                    let estimatedTimeRemaining = 0;

                    if (currentStatus && currentStatus.metadata?.lastUpdateTime) {
                      const timeDiff = (currentTime - currentStatus.metadata.lastUpdateTime) / 1000;
                      const bytesDiff = currentBytes - currentStatus.bytesReceived;

                      if (timeDiff >= 1.0) {
                        downloadRate = bytesDiff / timeDiff;
                        const remainingBytes = item.getTotalBytes() - currentBytes;
                        if (downloadRate > 0) {
                          estimatedTimeRemaining = remainingBytes / downloadRate;
                        }
                      }
                    }

                    this.updateDownloadStatus(downloadId, {
                      progress: Math.round(percentCompleted),
                      bytesReceived: currentBytes,
                      downloadRate: downloadRate,
                      estimatedTimeRemaining: estimatedTimeRemaining,
                      status: 'downloading',
                      totalBytes: item.getTotalBytes(),
                      metadata: {
                        ...currentStatus?.metadata,
                        lastUpdateTime: currentTime
                      }
                    });
                  },
                  onDownloadCompleted: async ({ id, item }) => {
                    this.updateDownloadStatus(downloadId, {
                      progress: 100,
                      status: 'completed',
                      filePath: item.getSavePath()
                    });
                    this.sendToRenderer('download-completed', {
                      id: downloadId,
                      filePath: item.getSavePath(),
                      metadata: download.metadata
                    });
                  },
                  onDownloadCancelled: async ({ id }) => {
                    this.updateDownloadStatus(downloadId, { status: 'cancelled' });
                    this.sendToRenderer('download-cancelled', { id: downloadId });
                  },
                  onDownloadInterrupted: async ({ id }) => {
                    this.updateDownloadStatus(downloadId, { status: 'interrupted' });
                    this.sendToRenderer('download-interrupted', { id: downloadId });
                  },
                  onError: (error, data) => {
                    console.error('恢复中断下载时出错:', error);
                    this.updateDownloadStatus(downloadId, {
                      status: 'error',
                      metadata: {
                        ...download.metadata,
                        error: error.message
                      }
                    });
                    this.sendToRenderer('download-error', {
                      id: downloadId,
                      error: error.message
                    });
                  }
                }
              });

              console.log(`中断下载恢复成功，恢复的ID: ${restoredDownloadId}`);
              return true;
            } catch (restoreError: any) {
              console.error(`恢复中断下载失败: ${downloadId}`, restoreError);
              this.updateDownloadStatus(downloadId, {
                status: 'error',
                metadata: {
                  ...download.metadata,
                  error: restoreError?.message || '恢复中断下载失败'
                }
              });
              return false;
            }
          } else {
            console.error(`中断的下载 ${downloadId} 没有恢复数据，无法恢复`);
            this.updateDownloadStatus(downloadId, {
              status: 'error',
              metadata: {
                ...download.metadata,
                error: '没有恢复数据，无法恢复中断的下载'
              }
            });
            return false;
          }
        } else {
          console.log(`下载 ${downloadId} 状态为 ${download.status}，无法恢复`);
          return false;
        }
      } catch (error) {
        console.error('Resume download failed:', error);
        return false;
      }
    });

    // 取消下载
    ipcMain.handle('cancel-download', (event, downloadId: string) => {
      if (!this.isReady()) {
        console.error('下载管理器未准备好');
        return false;
      }

      try {
        console.log(`尝试取消下载: ${downloadId}`);
        this.downloadManager.cancelDownload(downloadId);
        this.updateDownloadStatus(downloadId, { status: 'cancelled' });
        this.sendToRenderer('download-cancelled', { id: downloadId });
        console.log(`下载 ${downloadId} 已取消`);
        return true;
      } catch (error) {
        console.error('Cancel download failed:', error);
        // 即使electron-dl-manager取消失败，也更新本地状态
        this.updateDownloadStatus(downloadId, { status: 'cancelled' });
        this.sendToRenderer('download-cancelled', { id: downloadId });
        return true;
      }
    });

    // 恢复下载（从持久化数据）
    ipcMain.handle('restore-download', async (event, restoreData: any) => {
      if (!this.isReady()) {
        throw new Error('下载管理器未准备好。请先调用 initialize() 或 setMainWindow() 方法。');
      }

      try {
        const downloadId = await this.downloadManager.restoreDownload({
          app,
          window: this.mainWindow!,
          restoreData,
          callbacks: {
            onDownloadStarted: async ({ id, item, resolvedFilename }) => {
              const status: DownloadStatus = {
                id,
                url: restoreData.url,
                filePath: item.getSavePath(),
                filename: resolvedFilename,
                progress: restoreData.percentCompleted || 0,
                status: 'downloading',
                bytesReceived: restoreData.receivedBytes || 0,
                totalBytes: restoreData.totalBytes || 0,
                downloadRate: 0,
                estimatedTimeRemaining: 0,
                metadata: {
                  ...restoreData.metadata,
                  lastUpdateTime: Date.now()
                }
              };
              this.downloads.set(id, status);
              // 保存下载任务到存储
              this.saveDownloadsToStorage();
              this.sendToRenderer('download-started', {
                id,
                filename: resolvedFilename,
                totalBytes: item.getTotalBytes()
              });
            },
            onDownloadProgress: async (data) => {
              // 直接使用 electron-dl-manager 提供的数据，无需重复计算
              const validProgress = Math.max(0, Math.min(100, Math.round(data.percentCompleted || 0)));

              this.updateDownloadStatus(data.id, {
                progress: validProgress,
                bytesReceived: data.item.getReceivedBytes(),
                totalBytes: data.item.getTotalBytes(),
                downloadRate: data.downloadRateBytesPerSecond, // 使用原生计算的速率
                estimatedTimeRemaining: data.estimatedTimeRemainingSeconds, // 使用原生计算的时间
                status: 'downloading'
              });
            },
            onDownloadCompleted: async ({ id, item }) => {
              this.updateDownloadStatus(id, {
                progress: 100,
                status: 'completed',
                filePath: item.getSavePath()
              });
              this.sendToRenderer('download-completed', {
                id,
                filePath: item.getSavePath(),
                metadata: restoreData.metadata
              });
            },
            onDownloadCancelled: async ({ id }) => {
              this.updateDownloadStatus(id, { status: 'cancelled' });
              this.sendToRenderer('download-cancelled', { id });
            },
            onDownloadInterrupted: async ({ id }) => {
              this.updateDownloadStatus(id, { status: 'interrupted' });
              this.sendToRenderer('download-interrupted', { id });
            },
            onDownloadPersisted: async (data, restoreData) => {
              // 原生持久化回调 - 应用关闭时自动触发
              console.log(`下载 ${data.id} 已持久化，路径: ${restoreData.persistedFilePath}`);

              // 将持久化数据保存到我们的存储中，便于应用重启后恢复
              this.updateDownloadStatus(data.id, {
                metadata: {
                  ...this.downloads.get(data.id)?.metadata,
                  persistedRestoreData: restoreData,
                  persistedAt: Date.now()
                }
              });

              this.sendToRenderer('download-persisted', {
                id: data.id,
                persistedFilePath: restoreData.persistedFilePath || ''
              });
            },
            onError: (error, data) => {
              if (data) {
                this.updateDownloadStatus(data.id, { status: 'error' });
                this.sendToRenderer('download-error', {
                  id: data.id,
                  error: error.message
                });
              }
            }
          }
        });

        return downloadId;
      } catch (error) {
        console.error('Restore download failed:', error);
        throw error;
      }
    });

    // 获取下载状态 - 使用 electron-dl-manager 的原生功能
    ipcMain.handle('get-download-status', (event, downloadId: string) => {
      try {
        const downloadData = this.downloadManager.getDownloadData(downloadId);
        if (!downloadData) {
          // 如果原生没有找到，尝试从本地存储获取
          return this.downloads.get(downloadId) || null;
        }

        // 转换为我们的格式，使用原生状态检查
        return {
          id: downloadData.id,
          url: downloadData.item.getURL(),
          filePath: downloadData.item.getSavePath(),
          filename: downloadData.resolvedFilename,
          progress: Math.round(downloadData.percentCompleted),
          status: downloadData.isDownloadInProgress() ? 'downloading' :
            downloadData.isDownloadPaused() ? 'paused' :
              downloadData.isDownloadCompleted() ? 'completed' :
                downloadData.isDownloadCancelled() ? 'cancelled' :
                  downloadData.isDownloadInterrupted() ? 'interrupted' : 'pending',
          bytesReceived: downloadData.item.getReceivedBytes(),
          totalBytes: downloadData.item.getTotalBytes(),
          downloadRate: downloadData.downloadRateBytesPerSecond,
          estimatedTimeRemaining: downloadData.estimatedTimeRemainingSeconds,
          metadata: this.downloads.get(downloadId)?.metadata || {}
        };
      } catch (error) {
        console.error('Get download status failed:', error);
        // 回退到本地存储
        return this.downloads.get(downloadId) || null;
      }
    });

    // 获取所有下载
    ipcMain.handle('get-all-downloads', () => {
      const downloads = Array.from(this.downloads.values());
      console.log(`获取所有下载任务，当前共 ${downloads.length} 个:`, downloads);
      return downloads;
    });

    // 获取活动下载数量 - 直接使用原生功能
    ipcMain.handle('get-active-download-count', () => {
      return this.downloadManager.getActiveDownloadCount();
    });

    // 选择下载目录
    ipcMain.handle('select-download-directory', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      });
      if (result.canceled) return null;
      return result.filePaths[0];
    });

    // 打开下载文件夹
    ipcMain.handle('open-download-folder', async (event, filePath: string) => {
      try {
        const dir = dirname(filePath);
        await shell.openPath(dir);
        return true;
      } catch (error) {
        console.error('打开文件夹失败:', error);
        return false;
      }
    });

    // 删除下载任务
    ipcMain.handle('delete-download', (event, downloadId: string, deleteFile: boolean = false) => {
      try {
        if (deleteFile) {
          // 删除文件 自己实现
          const downloadData = this.downloadManager.getDownloadData(downloadId);
          if (downloadData) {
            const filePath = downloadData.item.getSavePath();
            if (filePath) unlink(filePath);
          }
        }

        this.downloads.delete(downloadId);
        this.saveDownloadsToStorage();
        this.sendToRenderer('download-deleted', { id: downloadId });
        return true;
      } catch (error) {
        console.error('删除下载任务失败:', error);
        return false;
      }
    });
  }


}

// 不要在这里预先创建实例，让AppService来管理
// export const downloadManagerMain = DownloadManagerMain.getInstance();
