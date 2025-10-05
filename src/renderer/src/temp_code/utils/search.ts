import type { AppItem } from '../typings/search'

/** 图标缓存 */
const iconCache = new Map<string, string>()

/**
 * 检查对象是否有 path 和 icon 属性
 */
function hasPathAndIcon(item: any): item is { path: string; icon: string | null } {
  return 'path' in item && 'icon' in item
}

/**
 * 批量加载应用图标
 * @param items 应用项列表
 * @returns 包含图标的应用项列表
 */
export async function loadAppIcons(items: AppItem[]): Promise<AppItem[]> {
  return Promise.all(
    items.map(async (item) => {
      // 类型守卫检查
      if (!hasPathAndIcon(item)) return item

      // 如果已有图标，直接返回
      if (item.icon) return item

      // 检查缓存
      const cached = iconCache.get(item.path)
      if (cached) return { ...item, icon: cached }

      // 加载图标
      try {
        const icon = await naimo.router.appExtractFileIcon(item.path)
        if (icon) {
          iconCache.set(item.path, icon)
          return { ...item, icon }
        }
        return { ...item, icon: null }
      } catch {
        return { ...item, icon: null }
      }
    })
  )
}

/**
 * 清除图标缓存
 * @param path 可选，指定路径清除特定缓存，不传则清除所有缓存
 */
export function clearIconCache(path?: string): void {
  if (path) {
    iconCache.delete(path)
  } else {
    iconCache.clear()
  }
}

/**
 * 获取缓存的图标
 * @param path 应用路径
 * @returns 缓存的图标 base64 字符串，不存在返回 undefined
 */
export function getCachedIcon(path: string): string | undefined {
  return iconCache.get(path)
}

/**
 * 获取缓存大小
 * @returns 缓存中的图标数量
 */
export function getIconCacheSize(): number {
  return iconCache.size
}


