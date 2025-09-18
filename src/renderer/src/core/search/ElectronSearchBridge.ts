import type { AppItem } from '@shared/types'
import { BaseSingleton } from '../BaseSingleton'

/**
 * Electron搜索桥接层
 * 处理与Electron主进程的搜索相关通信
 */
export class ElectronSearchBridge extends BaseSingleton {
  constructor() {
    super()
  }

  /**
   * 搜索应用程序
   */
  async searchApps(query: string): Promise<AppItem[]> {
    try {
      const results = await api.ipcRouter.searchSearchApps(query)
      console.log(`🔍 搜索应用程序: "${query}" -> ${results.length} 个结果`)
      return results
    } catch (error) {
      console.error('🔍 搜索应用程序失败:', error)
      return []
    }
  }

  /**
   * 获取所有应用程序
   */
  async getAllApps(): Promise<AppItem[]> {
    try {
      const apps = await api.ipcRouter.searchGetAllApps()
      console.log(`🔍 获取应用程序列表: ${apps.length} 个应用`)
      return apps
    } catch (error) {
      console.error('🔍 获取应用程序列表失败:', error)
      return []
    }
  }

  /**
   * 获取最近使用的应用程序
   */
  async getRecentApps(limit: number = 10): Promise<AppItem[]> {
    try {
      const recentApps = await api.ipcRouter.searchGetRecentApps(limit)
      console.log(`🔍 获取最近使用的应用程序: ${recentApps.length} 个应用`)
      return recentApps
    } catch (error) {
      console.error('🔍 获取最近使用的应用程序失败:', error)
      return []
    }
  }

  /**
   * 获取收藏的应用程序
   */
  async getPinnedApps(): Promise<AppItem[]> {
    try {
      const pinnedApps = await api.ipcRouter.searchGetPinnedApps()
      console.log(`🔍 获取收藏的应用程序: ${pinnedApps.length} 个应用`)
      return pinnedApps
    } catch (error) {
      console.error('🔍 获取收藏的应用程序失败:', error)
      return []
    }
  }

  /**
   * 执行应用程序
   */
  async executeApp(appItem: AppItem): Promise<boolean> {
    try {
      const success = await api.ipcRouter.searchExecuteApp(appItem)
      console.log(`🔍 执行应用程序: ${appItem.name} -> ${success ? '成功' : '失败'}`)
      return success
    } catch (error) {
      console.error('🔍 执行应用程序失败:', error)
      return false
    }
  }

  /**
   * 添加到收藏
   */
  async pinApp(appItem: AppItem): Promise<boolean> {
    try {
      const success = await api.ipcRouter.searchPinApp(appItem)
      console.log(`🔍 添加到收藏: ${appItem.name} -> ${success ? '成功' : '失败'}`)
      return success
    } catch (error) {
      console.error('🔍 添加到收藏失败:', error)
      return false
    }
  }

  /**
   * 从收藏中移除
   */
  async unpinApp(appItem: AppItem): Promise<boolean> {
    try {
      const success = await api.ipcRouter.searchUnpinApp(appItem)
      console.log(`🔍 从收藏中移除: ${appItem.name} -> ${success ? '成功' : '失败'}`)
      return success
    } catch (error) {
      console.error('🔍 从收藏中移除失败:', error)
      return false
    }
  }

  /**
   * 获取应用程序图标
   */
  async getAppIcon(appItem: AppItem): Promise<string | null> {
    try {
      const icon = await api.ipcRouter.searchGetAppIcon(appItem)
      return icon
    } catch (error) {
      console.error('🔍 获取应用程序图标失败:', error)
      return null
    }
  }

  /**
   * 获取应用程序详细信息
   */
  async getAppDetails(appItem: AppItem): Promise<any> {
    try {
      const details = await api.ipcRouter.searchGetAppDetails(appItem)
      return details
    } catch (error) {
      console.error('🔍 获取应用程序详细信息失败:', error)
      return null
    }
  }

  /**
   * 刷新应用程序列表
   */
  async refreshApps(): Promise<boolean> {
    try {
      const success = await api.ipcRouter.searchRefreshApps()
      console.log(`🔍 刷新应用程序列表: ${success ? '成功' : '失败'}`)
      return success
    } catch (error) {
      console.error('🔍 刷新应用程序列表失败:', error)
      return false
    }
  }

  /**
   * 获取搜索桥接器状态
   */
  getStatus(): { isReady: boolean } {
    return { isReady: true }
  }
}

// 导出单例实例
export const electronSearchBridge = ElectronSearchBridge.getInstance()
