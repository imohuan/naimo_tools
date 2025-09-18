import { ElectronStoreBridge } from "@/core/store/ElectronStoreBridge"
import type { AppConfig } from "@shared/types"

/**
 * Vue Composable 包装器
 * 提供响应式的存储操作接口
 */
export function useStoreBridge() {
  const bridge = ElectronStoreBridge.getInstance()
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 响应式缓存状态
  const cache = ref<Partial<AppConfig>>({})

  /**
   * 包装异步操作，添加加载状态和错误处理
   */
  const withLoading = async <T>(operation: () => Promise<T>): Promise<T | undefined> => {
    try {
      loading.value = true
      error.value = null
      const result = await operation()
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '未知错误'
      console.error('存储操作失败:', err)
      return undefined
    } finally {
      loading.value = false
    }
  }

  return {
    // 状态
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    cache: computed(() => cache.value),

    // 基础方法
    get: <K extends keyof AppConfig>(key?: K) =>
      withLoading(() => bridge.get(key)),

    set: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) =>
      withLoading(() => bridge.set(key, value)),

    delete: <K extends keyof AppConfig>(key: K) =>
      withLoading(() => bridge.delete(key)),

    clear: () => withLoading(() => bridge.clear()),

    // 高级方法
    has: bridge.has.bind(bridge),
    getCached: bridge.getCached.bind(bridge),
    getAllCached: bridge.getAllCached.bind(bridge),
    setMultiple: (data: Partial<AppConfig>) =>
      withLoading(() => bridge.setMultiple(data)),
    getMultiple: <K extends keyof AppConfig>(keys: K[]) =>
      withLoading(() => bridge.getMultiple(keys)),
    reset: <K extends keyof AppConfig>(...keys: K[]) =>
      withLoading(() => bridge.reset(...keys)),

    // 工具方法
    clearError: () => { error.value = null },
    refreshCache: async () => {
      const allData = await bridge.get()
      if (allData && typeof allData === 'object') {
        cache.value = allData as Partial<AppConfig>
      }
    }
  }
}
