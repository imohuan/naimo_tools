import { BaseListModule } from "./base"

export class RecentModule extends BaseListModule {
  weight = 60
  name = "最近使用"
  protected storeKey = "recentApps" as const
}   