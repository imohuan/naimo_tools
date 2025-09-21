import { BaseSingleton } from '../BaseSingleton'
import type { AppItem } from '@shared/types'

/**
 * Electron搜索桥接层
 * 处理与Electron主进程的搜索相关通信
 */
export class ElectronSearchBridge extends BaseSingleton {
  private iconCache = new Map<string, string>()

  constructor() {
    super()
  }

  /** 为应用项目重新获取图标 */
  async loadAppIcons(items: AppItem[]): Promise<AppItem[]> {
    const itemsWithIcons = await Promise.all(
      items.map(async (item) => {
        if (item.icon) return item

        if (this.iconCache.has(item.path)) {
          return { ...item, icon: this.iconCache.get(item.path)! }
        }

        try {
          const icon = await api.ipcRouter.appExtractFileIcon(item.path)
          if (icon) this.iconCache.set(item.path, icon)
          return { ...item, icon }
        } catch (error) {
          console.warn(`获取应用图标失败: ${item.name}`, error)
          return { ...item, icon: null }
        }
      })
    )
    return itemsWithIcons
  }

  /** 获取本地应用 */
  async getApps(): Promise<AppItem[]> {
    return await api.ipcRouter.appSearchApps()
  }

  /** 获取缓存应用数据，支持多个键 */
  async getStoreApps(keys: ('recentApps' | 'pinnedApps' | 'fileList')[]): Promise<AppItem[][]> {
    return await Promise.all(keys.map(async (key) => await api.ipcRouter.storeGet(key)))
  }
}

// 导出单例实例
export const electronSearchBridge = ElectronSearchBridge.getInstance()
