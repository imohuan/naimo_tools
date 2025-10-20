import type { AppItem, SearchModule } from "@/core/typings/search"
import { useApp } from "@/core"

export class AppModule implements SearchModule {
  weight = 40
  name = "应用列表"
  isDragEnabled = false
  maxDisplayCount = 16
  // 缓存键
  private readonly CACHE_KEY = "app-search:applications"
  // 缓存过期时间：30分钟
  private readonly CACHE_TTL = 30 * 60 * 1000

  async getItems() {
    const app = useApp()

    // 尝试从缓存获取
    const cached = app.cache.get<AppItem[]>(this.CACHE_KEY)
    if (cached) {
      console.log('📦 从缓存加载应用列表')
      return cached
    }

    // 缓存未命中，从接口获取
    console.log('🔄 从接口加载应用列表')
    const apps = await naimo.router.appSearchApps() || []
    const items = apps.map(({ icon, path, name, command }) => {
      return {
        icon,
        path,
        name,
        command,
        type: "text",
        weight: this.weight,
        __metadata: {
          enableDelete: false,
          enablePin: true
        }
      } as AppItem
    })

    // 存入缓存
    app.cache.set(this.CACHE_KEY, items, this.CACHE_TTL)
    return items
  }

  /**
   * 清空应用列表缓存
   */
  clearCache() {
    const app = useApp()
    app.cache.remove(this.CACHE_KEY)
    console.log('🗑️ 已清空应用列表缓存')
  }

  async deleteItem(_item: AppItem): Promise<void> { }
  async addItem(_item: AppItem): Promise<void> { }
  async setItems(_items: AppItem[]): Promise<void> { }
}