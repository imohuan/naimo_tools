/**
 * 搜索管理模块
 * 处理应用程序搜索、执行等操作
 */

import log from 'electron-log'
import { shell } from 'electron'
import { getApps, AppPath, getIconDataURLAsync } from '@libs/app-search'
import { join } from 'path'
import { app } from 'electron'

// 应用缓存
let appsCache: AppPath[] = []
let lastCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

/**
 * 搜索应用程序
 * @param query 搜索查询
 * @returns 匹配的应用程序列表
 */
export async function searchApps(query: string): Promise<AppPath[]> {
  try {
    log.info(`🔍 搜索应用程序: "${query}"`)

    // 获取应用列表（使用缓存）
    const apps = await getAllApps()

    if (!query.trim()) {
      return apps
    }

    // 简单的搜索逻辑：按名称匹配
    const filteredApps = apps.filter(app =>
      app.name.toLowerCase().includes(query.toLowerCase())
    )

    log.info(`✅ 搜索完成，找到 ${filteredApps.length} 个匹配的应用`)
    return filteredApps
  } catch (error) {
    log.error('❌ 搜索应用程序失败:', error)
    return []
  }
}

/**
 * 获取所有应用程序
 * @returns 所有应用程序列表
 */
export async function getAllApps(): Promise<AppPath[]> {
  try {
    const now = Date.now()

    // 检查缓存是否有效
    if (appsCache.length > 0 && (now - lastCacheTime) < CACHE_DURATION) {
      log.debug('🔍 使用缓存的应用列表')
      return appsCache
    }

    log.info('🔍 开始获取所有应用程序...')
    const cacheIconsDir = join(app.getPath('userData'), 'icons')
    const apps = await getApps(cacheIconsDir)

    // 更新缓存
    appsCache = apps
    lastCacheTime = now

    log.info(`✅ 获取到 ${apps.length} 个应用程序`)
    return apps
  } catch (error) {
    log.error('❌ 获取应用程序列表失败:', error)
    return []
  }
}

/**
 * 获取最近使用的应用程序
 * @param limit 限制数量
 * @returns 最近使用的应用程序列表
 */
export async function getRecentApps(limit: number = 10): Promise<AppPath[]> {
  try {
    log.info(`🔍 获取最近使用的应用程序，限制: ${limit}`)

    // 这里可以实现获取最近使用应用的逻辑
    // 目前暂时返回空数组
    log.warn('⚠️ 获取最近使用应用功能暂未实现')
    return []
  } catch (error) {
    log.error('❌ 获取最近使用的应用程序失败:', error)
    return []
  }
}

/**
 * 获取收藏的应用程序
 * @returns 收藏的应用程序列表
 */
export async function getPinnedApps(): Promise<AppPath[]> {
  try {
    log.info('🔍 获取收藏的应用程序')

    // 这里可以实现获取收藏应用的逻辑
    // 目前暂时返回空数组
    log.warn('⚠️ 获取收藏应用功能暂未实现')
    return []
  } catch (error) {
    log.error('❌ 获取收藏的应用程序失败:', error)
    return []
  }
}

/**
 * 执行应用程序
 * @param appItem 应用程序项目
 * @returns 是否执行成功
 */
export async function executeApp(appItem: AppPath): Promise<boolean> {
  try {
    log.info(`🚀 执行应用程序: ${appItem.name}`)
    await shell.openPath(appItem.path)
    log.info(`✅ 应用程序执行成功: ${appItem.name}`)
    return true
  } catch (error) {
    log.error(`❌ 应用程序执行失败: ${appItem.name}`, error)
    return false
  }
}

/**
 * 添加到收藏
 * @param appItem 应用程序项目
 * @returns 是否添加成功
 */
export async function pinApp(appItem: AppPath): Promise<boolean> {
  try {
    log.info(`🔍 添加到收藏: ${appItem.name}`)

    // 这里可以实现添加到收藏的逻辑
    // 目前暂时返回true
    log.warn('⚠️ 添加到收藏功能暂未实现')
    return true
  } catch (error) {
    log.error(`❌ 添加到收藏失败: ${appItem.name}`, error)
    return false
  }
}

/**
 * 从收藏中移除
 * @param appItem 应用程序项目
 * @returns 是否移除成功
 */
export async function unpinApp(appItem: AppPath): Promise<boolean> {
  try {
    log.info(`🔍 从收藏中移除: ${appItem.name}`)

    // 这里可以实现从收藏中移除的逻辑
    // 目前暂时返回true
    log.warn('⚠️ 从收藏中移除功能暂未实现')
    return true
  } catch (error) {
    log.error(`❌ 从收藏中移除失败: ${appItem.name}`, error)
    return false
  }
}

/**
 * 获取应用程序图标
 * @param appItem 应用程序项目
 * @returns 图标数据URL或null
 */
export async function getAppIcon(appItem: AppPath): Promise<string | null> {
  try {
    log.info(`🖼️ 获取应用程序图标: ${appItem.name}`)

    if (appItem.icon) {
      return appItem.icon
    }

    // 如果没有缓存图标，尝试提取
    const cacheIconsDir = join(app.getPath('userData'), 'icons')
    const icon = await getIconDataURLAsync(appItem.path, cacheIconsDir)

    if (icon) {
      log.info(`✅ 应用程序图标获取成功: ${appItem.name}`)
    } else {
      log.warn(`⚠️ 应用程序图标获取失败: ${appItem.name}`)
    }

    return icon
  } catch (error) {
    log.error(`❌ 获取应用程序图标失败: ${appItem.name}`, error)
    return null
  }
}

/**
 * 获取应用程序详细信息
 * @param appItem 应用程序项目
 * @returns 应用程序详细信息
 */
export async function getAppDetails(appItem: AppPath): Promise<any> {
  try {
    log.info(`🔍 获取应用程序详细信息: ${appItem.name}`)

    // 返回应用程序的基本信息
    const details = {
      name: appItem.name,
      path: appItem.path,
      icon: appItem.icon,
      size: 0, // 可以添加获取文件大小的逻辑
      lastModified: new Date(), // 可以添加获取修改时间的逻辑
      version: '', // 可以添加获取版本信息的逻辑
    }

    log.info(`✅ 应用程序详细信息获取成功: ${appItem.name}`)
    return details
  } catch (error) {
    log.error(`❌ 获取应用程序详细信息失败: ${appItem.name}`, error)
    return null
  }
}

/**
 * 刷新应用程序列表
 * @returns 是否刷新成功
 */
export async function refreshApps(): Promise<boolean> {
  try {
    log.info('🔍 刷新应用程序列表')

    // 清除缓存
    appsCache = []
    lastCacheTime = 0

    // 重新获取应用列表
    await getAllApps()

    log.info('✅ 应用程序列表刷新成功')
    return true
  } catch (error) {
    log.error('❌ 刷新应用程序列表失败:', error)
    return false
  }
}
