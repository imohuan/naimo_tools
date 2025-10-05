import type { AppItem, SearchModule } from "@/temp_code/typings/search"

export class AppModule implements SearchModule {
  weight = 40
  name = "应用列表"
  isDragEnabled = false
  maxDisplayCount = 16
  isExpanded = false

  async getItems() {
    const apps = await naimo.router.appSearchApps() || []
    return apps.map(({ icon, path, name }) => {
      return { icon, path, name, type: "text" } as AppItem
    })
  }
  async deleteItem(_item: AppItem): Promise<void> { }
  async addItem(_item: AppItem): Promise<void> { }
}