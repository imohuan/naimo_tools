import { BaseListModule } from "./base"

export class PinnedModule extends BaseListModule {
  weight = 20
  name = "已固定"
  protected storeKey = "pinnedApps" as const
}   