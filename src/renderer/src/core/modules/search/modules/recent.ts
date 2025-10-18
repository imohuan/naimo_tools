import { BaseListModule } from "./base"

export class RecentModule extends BaseListModule {
  weight = 10
  name = "最近使用"
  protected storeKey = "recentApps" as const
}   