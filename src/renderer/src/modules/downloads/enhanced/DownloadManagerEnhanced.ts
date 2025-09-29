/**
 * 增强版下载管理器
 * 提供更高效的下载管理、队列控制和性能监控功能
 */

import { ref, computed, watch } from 'vue'
import { SmartCacheManager, CacheStrategy } from '@/core/cache/SmartCacheManager'
import { useThrottleFn, useDebounceFn } from '@/utils/performance'

/**
 * 下载状态枚举
 */
export enum DownloadStatus {
  PENDING = 'pending',           // 等待中
  DOWNLOADING = 'downloading',   // 下载中
  PAUSED = 'paused',            // 已暂停
  COMPLETED = 'completed',       // 已完成
  CANCELLED = 'cancelled',       // 已取消
  ERROR = 'error',              // 错误
  INTERRUPTED = 'interrupted'    // 中断
}

/**
 * 下载优先级枚举
 */
export enum DownloadPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3
}

/**
 * 增强版下载项接口
 */
export interface DownloadItemEnhanced {
  /** 下载ID */
  id: string
  /** 下载URL */
  url: string
  /** 文件路径 */
  filePath: string
  /** 文件名 */
  filename: string
  /** 下载进度 (0-100) */
  progress: number
  /** 下载状态 */
  status: DownloadStatus
  /** 已接收字节数 */
  bytesReceived: number
  /** 总字节数 */
  totalBytes: number
  /** 下载速度 (bytes/s) */
  downloadRate: number
  /** 预计剩余时间 (ms) */
  estimatedTimeRemaining: number
  /** 创建时间 */
  createdAt: number
  /** 开始时间 */
  startedAt?: number
  /** 完成时间 */
  completedAt?: number
  /** 下载优先级 */
  priority: DownloadPriority
  /** 重试次数 */
  retryCount: number
  /** 最大重试次数 */
  maxRetries: number
  /** 错误信息 */
  error?: string
  /** 元数据 */
  metadata?: any
  /** 标签 */
  tags: string[]
  /** 分类 */
  category: string
}

/**
 * 下载配置接口
 */
export interface DownloadConfig {
  /** 最大并发下载数 */
  maxConcurrentDownloads: number
  /** 最大下载速度 (bytes/s, 0为不限制) */
  maxDownloadSpeed: number
  /** 默认重试次数 */
  defaultMaxRetries: number
  /** 重试延迟 (ms) */
  retryDelay: number
  /** 超时时间 (ms) */
  timeout: number
  /** 是否启用断点续传 */
  enableResume: boolean
  /** 是否启用速度限制 */
  enableSpeedLimit: boolean
  /** 下载完成后是否自动清理 */
  autoCleanupCompleted: boolean
  /** 自动清理延迟 (ms) */
  cleanupDelay: number
}

/**
 * 下载统计信息接口
 */
export interface DownloadStats {
  /** 总下载数 */
  totalDownloads: number
  /** 活跃下载数 */
  activeDownloads: number
  /** 已完成下载数 */
  completedDownloads: number
  /** 失败下载数 */
  failedDownloads: number
  /** 总下载字节数 */
  totalBytesDownloaded: number
  /** 当前总下载速度 */
  totalDownloadSpeed: number
  /** 平均下载速度 */
  averageDownloadSpeed: number
  /** 队列中的下载数 */
  queuedDownloads: number
  /** 按状态统计 */
  byStatus: Record<DownloadStatus, number>
  /** 按分类统计 */
  byCategory: Record<string, number>
}

/**
 * 下载队列项接口
 */
interface QueueItem {
  download: DownloadItemEnhanced
  priority: number
  addedAt: number
}

/**
 * 增强版下载管理器类
 */
export class DownloadManagerEnhanced {
  private downloads = new Map<string, DownloadItemEnhanced>()
  private downloadQueue: QueueItem[] = []
  private activeDownloads = new Set<string>()
  private config: DownloadConfig
  private cache: SmartCacheManager<DownloadItemEnhanced[]>
  private stats = ref<DownloadStats>({
    totalDownloads: 0,
    activeDownloads: 0,
    completedDownloads: 0,
    failedDownloads: 0,
    totalBytesDownloaded: 0,
    totalDownloadSpeed: 0,
    averageDownloadSpeed: 0,
    queuedDownloads: 0,
    byStatus: {} as Record<DownloadStatus, number>,
    byCategory: {}
  })

  // 性能监控
  private speedHistory: number[] = []
  private lastSpeedUpdate = 0
  private updateStatsThrottled: () => void
  private processQueueDebounced: () => void

  // 事件监听器
  private eventListeners = new Map<string, Set<Function>>()

  constructor(config: Partial<DownloadConfig> = {}) {
    this.config = {
      maxConcurrentDownloads: 3,
      maxDownloadSpeed: 0, // 不限制
      defaultMaxRetries: 3,
      retryDelay: 2000,
      timeout: 30000,
      enableResume: true,
      enableSpeedLimit: false,
      autoCleanupCompleted: false,
      cleanupDelay: 5 * 60 * 1000, // 5分钟
      ...config
    }

    // 初始化缓存
    this.cache = new SmartCacheManager<DownloadItemEnhanced[]>({
      maxSize: 5 * 1024 * 1024, // 5MB
      maxItems: 50,
      strategy: CacheStrategy.LRU,
      enablePersistence: true
    })

    // 初始化节流和防抖函数
    this.updateStatsThrottled = useThrottleFn(this.updateStats.bind(this), 1000)
    this.processQueueDebounced = useDebounceFn(this.processQueue.bind(this), 100)

    this.loadPersistedDownloads()
    this.startCleanupTimer()
  }

  /**
   * 添加下载任务
   */
  async addDownload(
    url: string,
    options: {
      filename?: string
      directory?: string
      priority?: DownloadPriority
      category?: string
      tags?: string[]
      metadata?: any
    } = {}
  ): Promise<string> {
    const downloadId = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const download: DownloadItemEnhanced = {
      id: downloadId,
      url,
      filePath: this.buildFilePath(options.directory, options.filename, url),
      filename: options.filename || this.extractFilename(url),
      progress: 0,
      status: DownloadStatus.PENDING,
      bytesReceived: 0,
      totalBytes: 0,
      downloadRate: 0,
      estimatedTimeRemaining: 0,
      createdAt: Date.now(),
      priority: options.priority || DownloadPriority.NORMAL,
      retryCount: 0,
      maxRetries: this.config.defaultMaxRetries,
      tags: options.tags || [],
      category: options.category || 'default',
      metadata: options.metadata
    }

    this.downloads.set(downloadId, download)

    // 添加到队列
    this.addToQueue(download)

    // 触发事件
    this.emit('downloadAdded', download)

    // 更新统计
    this.updateStatsThrottled()

    // 持久化
    this.persistDownloads()

    console.log(`📥 添加下载任务: ${download.filename} (${downloadId})`)
    return downloadId
  }

  /**
   * 构建文件路径
   */
  private buildFilePath(directory?: string, filename?: string, url?: string): string {
    const dir = directory || 'downloads'
    const file = filename || this.extractFilename(url || '')
    return `${dir}/${file}`
  }

  /**
   * 从URL提取文件名
   */
  private extractFilename(url: string): string {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      const filename = pathname.split('/').pop() || 'download'
      return filename.includes('.') ? filename : `${filename}.bin`
    } catch {
      return `download_${Date.now()}.bin`
    }
  }

  /**
   * 添加到下载队列
   */
  private addToQueue(download: DownloadItemEnhanced): void {
    const queueItem: QueueItem = {
      download,
      priority: download.priority,
      addedAt: Date.now()
    }

    // 按优先级插入队列
    let insertIndex = this.downloadQueue.length
    for (let i = 0; i < this.downloadQueue.length; i++) {
      if (this.downloadQueue[i].priority < queueItem.priority) {
        insertIndex = i
        break
      }
    }

    this.downloadQueue.splice(insertIndex, 0, queueItem)
    this.processQueueDebounced()
  }

  /**
   * 处理下载队列
   */
  private processQueue(): void {
    // 检查是否可以开始新的下载
    while (
      this.activeDownloads.size < this.config.maxConcurrentDownloads &&
      this.downloadQueue.length > 0
    ) {
      const queueItem = this.downloadQueue.shift()
      if (queueItem && queueItem.download.status === DownloadStatus.PENDING) {
        this.startDownload(queueItem.download)
      }
    }

    this.updateStatsThrottled()
  }

  /**
   * 开始下载
   */
  private async startDownload(download: DownloadItemEnhanced): Promise<void> {
    if (this.activeDownloads.has(download.id)) return

    download.status = DownloadStatus.DOWNLOADING
    download.startedAt = Date.now()
    this.activeDownloads.add(download.id)

    try {
      // 模拟下载过程
      await this.performDownload(download)

      download.status = DownloadStatus.COMPLETED
      download.completedAt = Date.now()
      download.progress = 100

      console.log(`✅ 下载完成: ${download.filename}`)
      this.emit('downloadCompleted', download)

      // 自动清理
      if (this.config.autoCleanupCompleted) {
        setTimeout(() => {
          this.removeDownload(download.id)
        }, this.config.cleanupDelay)
      }

    } catch (error) {
      console.error(`❌ 下载失败: ${download.filename}`, error)
      await this.handleDownloadError(download, error as Error)
    } finally {
      this.activeDownloads.delete(download.id)
      this.processQueueDebounced()
      this.updateStatsThrottled()
      this.persistDownloads()
    }
  }

  /**
   * 执行下载
   */
  private async performDownload(download: DownloadItemEnhanced): Promise<void> {
    return new Promise((resolve, reject) => {
      let progress = 0
      const totalSize = Math.random() * 100 * 1024 * 1024 + 10 * 1024 * 1024 // 10-110MB 随机大小
      download.totalBytes = totalSize

      const updateInterval = setInterval(() => {
        if (download.status === DownloadStatus.PAUSED) return
        if (download.status === DownloadStatus.CANCELLED) {
          clearInterval(updateInterval)
          reject(new Error('下载已取消'))
          return
        }

        // 模拟下载进度
        const increment = Math.random() * 2 * 1024 * 1024 // 0-2MB 随机增量
        progress += increment
        download.bytesReceived = Math.min(progress, totalSize)
        download.progress = (download.bytesReceived / totalSize) * 100

        // 计算下载速度
        const now = Date.now()
        if (this.lastSpeedUpdate > 0) {
          const timeDiff = (now - this.lastSpeedUpdate) / 1000
          download.downloadRate = increment / timeDiff
        }
        this.lastSpeedUpdate = now

        // 计算预计剩余时间
        if (download.downloadRate > 0) {
          const remainingBytes = totalSize - download.bytesReceived
          download.estimatedTimeRemaining = (remainingBytes / download.downloadRate) * 1000
        }

        // 触发进度事件
        this.emit('downloadProgress', download)

        // 检查是否完成
        if (download.bytesReceived >= totalSize) {
          clearInterval(updateInterval)
          resolve()
        }
      }, 100) // 每100ms更新一次

      // 超时处理
      setTimeout(() => {
        if (download.status === DownloadStatus.DOWNLOADING) {
          clearInterval(updateInterval)
          reject(new Error('下载超时'))
        }
      }, this.config.timeout)
    })
  }

  /**
   * 处理下载错误
   */
  private async handleDownloadError(download: DownloadItemEnhanced, error: Error): Promise<void> {
    download.error = error.message
    download.retryCount++

    if (download.retryCount < download.maxRetries) {
      console.log(`🔄 重试下载 (${download.retryCount}/${download.maxRetries}): ${download.filename}`)

      download.status = DownloadStatus.PENDING

      // 延迟后重新添加到队列
      setTimeout(() => {
        this.addToQueue(download)
      }, this.config.retryDelay)

      this.emit('downloadRetry', download)
    } else {
      console.error(`❌ 下载失败，已达最大重试次数: ${download.filename}`)
      download.status = DownloadStatus.ERROR
      this.emit('downloadError', download)
    }
  }

  /**
   * 暂停下载
   */
  pauseDownload(downloadId: string): boolean {
    const download = this.downloads.get(downloadId)
    if (!download || download.status !== DownloadStatus.DOWNLOADING) {
      return false
    }

    download.status = DownloadStatus.PAUSED
    this.emit('downloadPaused', download)
    this.updateStatsThrottled()

    console.log(`⏸️ 暂停下载: ${download.filename}`)
    return true
  }

  /**
   * 恢复下载
   */
  resumeDownload(downloadId: string): boolean {
    const download = this.downloads.get(downloadId)
    if (!download || download.status !== DownloadStatus.PAUSED) {
      return false
    }

    download.status = DownloadStatus.PENDING
    this.addToQueue(download)
    this.emit('downloadResumed', download)

    console.log(`▶️ 恢复下载: ${download.filename}`)
    return true
  }

  /**
   * 取消下载
   */
  cancelDownload(downloadId: string): boolean {
    const download = this.downloads.get(downloadId)
    if (!download) return false

    download.status = DownloadStatus.CANCELLED
    this.activeDownloads.delete(downloadId)

    // 从队列中移除
    this.downloadQueue = this.downloadQueue.filter(item => item.download.id !== downloadId)

    this.emit('downloadCancelled', download)
    this.processQueueDebounced()
    this.updateStatsThrottled()

    console.log(`❌ 取消下载: ${download.filename}`)
    return true
  }

  /**
   * 删除下载记录
   */
  removeDownload(downloadId: string): boolean {
    const download = this.downloads.get(downloadId)
    if (!download) return false

    // 如果正在下载，先取消
    if (download.status === DownloadStatus.DOWNLOADING) {
      this.cancelDownload(downloadId)
    }

    this.downloads.delete(downloadId)
    this.emit('downloadRemoved', download)
    this.updateStatsThrottled()
    this.persistDownloads()

    console.log(`🗑️ 删除下载记录: ${download.filename}`)
    return true
  }

  /**
   * 重试下载
   */
  retryDownload(downloadId: string): boolean {
    const download = this.downloads.get(downloadId)
    if (!download || download.status !== DownloadStatus.ERROR) {
      return false
    }

    download.status = DownloadStatus.PENDING
    download.retryCount = 0
    download.error = undefined
    this.addToQueue(download)

    console.log(`🔄 重试下载: ${download.filename}`)
    return true
  }

  /**
   * 设置下载优先级
   */
  setPriority(downloadId: string, priority: DownloadPriority): boolean {
    const download = this.downloads.get(downloadId)
    if (!download) return false

    download.priority = priority

    // 如果在队列中，重新排序
    const queueIndex = this.downloadQueue.findIndex(item => item.download.id === downloadId)
    if (queueIndex !== -1) {
      const queueItem = this.downloadQueue.splice(queueIndex, 1)[0]
      queueItem.priority = priority
      this.addToQueue(download)
    }

    this.persistDownloads()
    return true
  }

  /**
   * 获取所有下载
   */
  getAllDownloads(): DownloadItemEnhanced[] {
    return Array.from(this.downloads.values())
  }

  /**
   * 按状态获取下载
   */
  getDownloadsByStatus(status: DownloadStatus): DownloadItemEnhanced[] {
    return Array.from(this.downloads.values()).filter(download => download.status === status)
  }

  /**
   * 按分类获取下载
   */
  getDownloadsByCategory(category: string): DownloadItemEnhanced[] {
    return Array.from(this.downloads.values()).filter(download => download.category === category)
  }

  /**
   * 搜索下载
   */
  searchDownloads(query: string): DownloadItemEnhanced[] {
    const queryLower = query.toLowerCase()
    return Array.from(this.downloads.values()).filter(download =>
      download.filename.toLowerCase().includes(queryLower) ||
      download.url.toLowerCase().includes(queryLower) ||
      download.category.toLowerCase().includes(queryLower) ||
      download.tags.some(tag => tag.toLowerCase().includes(queryLower))
    )
  }

  /**
   * 清理已完成的下载
   */
  clearCompleted(): number {
    const completedDownloads = this.getDownloadsByStatus(DownloadStatus.COMPLETED)
    let removedCount = 0

    completedDownloads.forEach(download => {
      if (this.removeDownload(download.id)) {
        removedCount++
      }
    })

    console.log(`🧹 清理了 ${removedCount} 个已完成的下载`)
    return removedCount
  }

  /**
   * 清理失败的下载
   */
  clearFailed(): number {
    const failedDownloads = this.getDownloadsByStatus(DownloadStatus.ERROR)
    let removedCount = 0

    failedDownloads.forEach(download => {
      if (this.removeDownload(download.id)) {
        removedCount++
      }
    })

    console.log(`🧹 清理了 ${removedCount} 个失败的下载`)
    return removedCount
  }

  /**
   * 暂停所有下载
   */
  pauseAll(): number {
    const activeDownloads = this.getDownloadsByStatus(DownloadStatus.DOWNLOADING)
    let pausedCount = 0

    activeDownloads.forEach(download => {
      if (this.pauseDownload(download.id)) {
        pausedCount++
      }
    })

    console.log(`⏸️ 暂停了 ${pausedCount} 个下载`)
    return pausedCount
  }

  /**
   * 恢复所有下载
   */
  resumeAll(): number {
    const pausedDownloads = this.getDownloadsByStatus(DownloadStatus.PAUSED)
    let resumedCount = 0

    pausedDownloads.forEach(download => {
      if (this.resumeDownload(download.id)) {
        resumedCount++
      }
    })

    console.log(`▶️ 恢复了 ${resumedCount} 个下载`)
    return resumedCount
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    const downloads = Array.from(this.downloads.values())

    this.stats.value.totalDownloads = downloads.length
    this.stats.value.activeDownloads = this.activeDownloads.size
    this.stats.value.queuedDownloads = this.downloadQueue.length

    // 按状态统计
    this.stats.value.byStatus = downloads.reduce((acc, download) => {
      acc[download.status] = (acc[download.status] || 0) + 1
      return acc
    }, {} as Record<DownloadStatus, number>)

    this.stats.value.completedDownloads = this.stats.value.byStatus[DownloadStatus.COMPLETED] || 0
    this.stats.value.failedDownloads = this.stats.value.byStatus[DownloadStatus.ERROR] || 0

    // 按分类统计
    this.stats.value.byCategory = downloads.reduce((acc, download) => {
      acc[download.category] = (acc[download.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // 计算总下载字节数
    this.stats.value.totalBytesDownloaded = downloads
      .filter(d => d.status === DownloadStatus.COMPLETED)
      .reduce((sum, d) => sum + d.totalBytes, 0)

    // 计算当前总下载速度
    const activeDownloadsList = downloads.filter(d => d.status === DownloadStatus.DOWNLOADING)
    this.stats.value.totalDownloadSpeed = activeDownloadsList
      .reduce((sum, d) => sum + d.downloadRate, 0)

    // 计算平均下载速度
    if (this.stats.value.totalDownloadSpeed > 0) {
      this.speedHistory.push(this.stats.value.totalDownloadSpeed)
      if (this.speedHistory.length > 60) { // 保持最近60个记录
        this.speedHistory.shift()
      }
      this.stats.value.averageDownloadSpeed = this.speedHistory.reduce((sum, speed) => sum + speed, 0) / this.speedHistory.length
    }
  }

  /**
   * 添加事件监听器
   */
  addEventListener(eventType: string, listener: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(listener)
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(eventType: string, listener: Function): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.delete(listener)
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType)
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error('事件监听器执行错误:', error)
        }
      })
    }
  }

  /**
   * 持久化下载数据
   */
  private persistDownloads(): void {
    const downloadsArray = Array.from(this.downloads.values())
    this.cache.set('downloads', downloadsArray, {
      ttl: 24 * 60 * 60 * 1000, // 24小时
      priority: 10
    })
  }

  /**
   * 加载持久化的下载数据
   */
  private loadPersistedDownloads(): void {
    const cached = this.cache.get('downloads')
    if (cached) {
      cached.forEach(download => {
        // 重置运行时状态
        if (download.status === DownloadStatus.DOWNLOADING) {
          download.status = DownloadStatus.INTERRUPTED
        }
        this.downloads.set(download.id, download)
      })
      this.updateStatsThrottled()
      console.log(`📂 加载了 ${cached.length} 个持久化下载记录`)
    }
  }

  /**
   * 开始清理定时器
   */
  private startCleanupTimer(): void {
    if (this.config.autoCleanupCompleted) {
      setInterval(() => {
        const completedDownloads = this.getDownloadsByStatus(DownloadStatus.COMPLETED)
        const now = Date.now()

        completedDownloads.forEach(download => {
          if (download.completedAt && now - download.completedAt > this.config.cleanupDelay) {
            this.removeDownload(download.id)
          }
        })
      }, this.config.cleanupDelay)
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): DownloadStats {
    return { ...this.stats.value }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<DownloadConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // 重新处理队列以应用新的并发限制
    this.processQueueDebounced()
  }

  /**
   * 导出下载数据
   */
  exportDownloadData(): string {
    return JSON.stringify({
      downloads: Array.from(this.downloads.values()),
      config: this.config,
      stats: this.stats.value,
      exportedAt: Date.now()
    }, null, 2)
  }

  /**
   * 导入下载数据
   */
  importDownloadData(data: string): boolean {
    try {
      const imported = JSON.parse(data)

      if (imported.downloads) {
        this.downloads.clear()
        imported.downloads.forEach((download: DownloadItemEnhanced) => {
          // 重置运行时状态
          if (download.status === DownloadStatus.DOWNLOADING) {
            download.status = DownloadStatus.INTERRUPTED
          }
          this.downloads.set(download.id, download)
        })
      }

      if (imported.config) {
        this.config = { ...this.config, ...imported.config }
      }

      this.updateStatsThrottled()
      this.persistDownloads()

      return true
    } catch (error) {
      console.error('导入下载数据失败:', error)
      return false
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    // 取消所有活跃下载
    this.activeDownloads.forEach(downloadId => {
      this.cancelDownload(downloadId)
    })

    // 清理数据
    this.downloads.clear()
    this.downloadQueue = []
    this.activeDownloads.clear()
    this.eventListeners.clear()
    this.speedHistory = []

    // 销毁缓存
    this.cache.destroy()
  }
}

/**
 * Vue 组合式函数
 */
export function useDownloadManagerEnhanced(config?: Partial<DownloadConfig>) {
  const manager = new DownloadManagerEnhanced(config)

  return {
    manager,
    stats: computed(() => manager.getStats()),

    // 下载管理方法
    addDownload: manager.addDownload.bind(manager),
    pauseDownload: manager.pauseDownload.bind(manager),
    resumeDownload: manager.resumeDownload.bind(manager),
    cancelDownload: manager.cancelDownload.bind(manager),
    removeDownload: manager.removeDownload.bind(manager),
    retryDownload: manager.retryDownload.bind(manager),
    setPriority: manager.setPriority.bind(manager),

    // 批量操作方法
    pauseAll: manager.pauseAll.bind(manager),
    resumeAll: manager.resumeAll.bind(manager),
    clearCompleted: manager.clearCompleted.bind(manager),
    clearFailed: manager.clearFailed.bind(manager),

    // 查询方法
    getAllDownloads: manager.getAllDownloads.bind(manager),
    getDownloadsByStatus: manager.getDownloadsByStatus.bind(manager),
    getDownloadsByCategory: manager.getDownloadsByCategory.bind(manager),
    searchDownloads: manager.searchDownloads.bind(manager),

    // 事件方法
    addEventListener: manager.addEventListener.bind(manager),
    removeEventListener: manager.removeEventListener.bind(manager),

    // 工具方法
    updateConfig: manager.updateConfig.bind(manager),
    exportData: manager.exportDownloadData.bind(manager),
    importData: manager.importDownloadData.bind(manager)
  }
}
