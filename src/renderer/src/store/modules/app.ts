/**
 * 应用全局状态管理
 * 统一管理应用级别的状态和配置
 */

import { defineStore } from 'pinia'
import { ref, computed, readonly, watch } from 'vue'
import { optimizationEngine } from '@/core/optimization/OptimizationEngine'
import { optimizationConfigManager } from '@/core/optimization/OptimizationConfigManager'
import type { OptimizationStrategy } from '@/core/optimization/OptimizationEngine'

export const useAppStore = defineStore('app', () => {
  // 应用状态
  const isInitialized = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // UI 状态
  const activeInterface = ref<'search' | 'settings' | 'plugin-window'>('search')
  const searchText = ref('')
  const isSearchFocused = ref(false)

  // 性能状态
  const optimizationStrategy = ref<OptimizationStrategy>('balanced')
  const performanceMetrics = ref({
    memoryUsage: 0,
    fps: 60,
    responseTime: 0,
    cacheHitRate: 0
  })

  // 计算属性
  const isSearchActive = computed(() => activeInterface.value === 'search')
  const isSettingsActive = computed(() => activeInterface.value === 'settings')
  const isPluginWindowActive = computed(() => activeInterface.value === 'plugin-window')

  const appStatus = computed(() => {
    if (error.value) return 'error'
    if (isLoading.value) return 'loading'
    if (!isInitialized.value) return 'initializing'
    return 'ready'
  })

  // 方法
  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const setError = (err: string | null) => {
    error.value = err
    if (err) {
      console.error('🚨 应用错误:', err)
    }
  }

  const clearError = () => {
    error.value = null
  }

  /**
   * 切换界面
   */
  const switchInterface = (interfaceType: 'search' | 'settings' | 'plugin-window') => {
    activeInterface.value = interfaceType
    console.log(`🔄 切换界面: ${interfaceType}`)
  }

  /**
   * 搜索相关
   */
  const updateSearchText = (text: string) => {
    searchText.value = text
  }

  const setSearchFocus = (focused: boolean) => {
    isSearchFocused.value = focused
  }

  const clearSearch = () => {
    searchText.value = ''
  }

  /**
   * 性能优化
   */
  const updateOptimizationStrategy = async (strategy: OptimizationStrategy) => {
    try {
      await optimizationConfigManager.switchPreset(strategy)
      optimizationStrategy.value = strategy
      console.log(`🔧 优化策略切换: ${strategy}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '切换优化策略失败'
      setError(errorMessage)
    }
  }

  const updatePerformanceMetrics = (metrics: Partial<typeof performanceMetrics.value>) => {
    Object.assign(performanceMetrics.value, metrics)
  }

  /**
   * 应用初始化
   */
  const initialize = async () => {
    try {
      setLoading(true)
      clearError()

      // 启动优化引擎
      optimizationEngine.startMonitoring()

      // 监听性能指标变化
      watch(
        () => optimizationEngine.getOptimizationReport().metrics,
        (newMetrics) => {
          updatePerformanceMetrics({
            memoryUsage: newMetrics.memoryUsage,
            fps: newMetrics.fps,
            responseTime: newMetrics.responseTime,
            cacheHitRate: newMetrics.cacheHitRate
          })
        },
        { deep: true }
      )

      isInitialized.value = true
      console.log('🚀 应用初始化完成')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '应用初始化失败'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  /**
   * 应用重置
   */
  const reset = () => {
    activeInterface.value = 'search'
    searchText.value = ''
    isSearchFocused.value = false
    clearError()
    console.log('🔄 应用状态重置')
  }

  /**
   * 获取应用信息
   */
  const getAppInfo = () => {
    return {
      version: '2.0.0',
      buildTime: Date.now(),
      optimizationStrategy: optimizationStrategy.value,
      performanceMetrics: { ...performanceMetrics.value },
      status: appStatus.value
    }
  }

  return {
    // 只读状态
    isInitialized: readonly(isInitialized),
    isLoading: readonly(isLoading),
    error: readonly(error),
    activeInterface: readonly(activeInterface),
    searchText: readonly(searchText),
    isSearchFocused: readonly(isSearchFocused),
    optimizationStrategy: readonly(optimizationStrategy),
    performanceMetrics: readonly(performanceMetrics),

    // 计算属性
    isSearchActive,
    isSettingsActive,
    isPluginWindowActive,
    appStatus,

    // 核心方法
    initialize,
    reset,
    clearError,

    // 界面控制
    switchInterface,

    // 搜索控制
    updateSearchText,
    setSearchFocus,
    clearSearch,

    // 性能优化
    updateOptimizationStrategy,
    updatePerformanceMetrics,

    // 工具方法
    getAppInfo
  }
})
