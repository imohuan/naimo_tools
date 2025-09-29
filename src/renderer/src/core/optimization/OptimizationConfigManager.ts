/**
 * 优化配置管理器
 * 管理应用的各种优化配置和策略
 */

import { ref, computed, watch } from 'vue'

/**
 * 优化配置接口
 */
export interface OptimizationConfig {
  /** 渲染优化 */
  rendering: {
    /** 是否启用GPU加速 */
    enableGPUAcceleration: boolean
    /** 最大帧率 */
    maxFPS: number
    /** 是否启用虚拟滚动 */
    enableVirtualScrolling: boolean
    /** 虚拟滚动项目高度 */
    virtualScrollItemHeight: number
    /** 是否启用懒加载 */
    enableLazyLoading: boolean
    /** 懒加载阈值 */
    lazyLoadingThreshold: number
  }

  /** 内存优化 */
  memory: {
    /** 最大内存使用量（MB） */
    maxMemoryUsage: number
    /** 垃圾回收间隔（毫秒） */
    gcInterval: number
    /** 是否启用内存监控 */
    enableMemoryMonitoring: boolean
    /** 内存泄漏检测间隔（毫秒） */
    memoryLeakDetectionInterval: number
    /** 是否自动清理未使用资源 */
    autoCleanupUnusedResources: boolean
  }

  /** 缓存优化 */
  cache: {
    /** 搜索结果缓存大小（MB） */
    searchCacheSize: number
    /** 图标缓存大小（MB） */
    iconCacheSize: number
    /** 缓存过期时间（毫秒） */
    cacheExpireTime: number
    /** 是否启用持久化缓存 */
    enablePersistentCache: boolean
    /** 缓存压缩级别（0-9） */
    compressionLevel: number
  }

  /** 网络优化 */
  network: {
    /** 最大并发请求数 */
    maxConcurrentRequests: number
    /** 请求超时时间（毫秒） */
    requestTimeout: number
    /** 重试次数 */
    retryCount: number
    /** 重试延迟（毫秒） */
    retryDelay: number
    /** 是否启用请求缓存 */
    enableRequestCache: boolean
  }

  /** 用户界面优化 */
  ui: {
    /** 防抖延迟（毫秒） */
    debounceDelay: number
    /** 节流延迟（毫秒） */
    throttleDelay: number
    /** 动画持续时间（毫秒） */
    animationDuration: number
    /** 是否启用动画 */
    enableAnimations: boolean
    /** 是否启用过渡效果 */
    enableTransitions: boolean
  }

  /** 搜索优化 */
  search: {
    /** 搜索防抖延迟（毫秒） */
    searchDebounceDelay: number
    /** 最大搜索结果数 */
    maxSearchResults: number
    /** 是否启用模糊搜索 */
    enableFuzzySearch: boolean
    /** 模糊搜索阈值 */
    fuzzySearchThreshold: number
    /** 是否启用拼音搜索 */
    enablePinyinSearch: boolean
  }

  /** 文件处理优化 */
  fileProcessing: {
    /** 最大文件大小（MB） */
    maxFileSize: number
    /** 并发处理文件数 */
    concurrentFileProcessing: number
    /** 是否启用文件类型检测 */
    enableFileTypeDetection: boolean
    /** 图标提取超时时间（毫秒） */
    iconExtractionTimeout: number
    /** 是否启用文件预览 */
    enableFilePreview: boolean
  }
}

/**
 * 预设优化模式
 */
export enum OptimizationPreset {
  HIGH_PERFORMANCE = 'high-performance',
  BALANCED = 'balanced',
  LOW_POWER = 'low-power',
  CUSTOM = 'custom'
}

/**
 * 优化配置管理器
 */
export class OptimizationConfigManager {
  private config = ref<OptimizationConfig>(this.getDefaultConfig())
  private currentPreset = ref<OptimizationPreset>(OptimizationPreset.BALANCED)
  private isApplying = ref(false)

  constructor() {
    this.loadConfigFromStorage()
    this.setupWatchers()
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): OptimizationConfig {
    return {
      rendering: {
        enableGPUAcceleration: true,
        maxFPS: 60,
        enableVirtualScrolling: true,
        virtualScrollItemHeight: 40,
        enableLazyLoading: true,
        lazyLoadingThreshold: 100
      },
      memory: {
        maxMemoryUsage: 512, // 512MB
        gcInterval: 30000, // 30秒
        enableMemoryMonitoring: true,
        memoryLeakDetectionInterval: 60000, // 1分钟
        autoCleanupUnusedResources: true
      },
      cache: {
        searchCacheSize: 50, // 50MB
        iconCacheSize: 100, // 100MB
        cacheExpireTime: 300000, // 5分钟
        enablePersistentCache: true,
        compressionLevel: 3
      },
      network: {
        maxConcurrentRequests: 6,
        requestTimeout: 10000, // 10秒
        retryCount: 3,
        retryDelay: 1000, // 1秒
        enableRequestCache: true
      },
      ui: {
        debounceDelay: 300,
        throttleDelay: 100,
        animationDuration: 200,
        enableAnimations: true,
        enableTransitions: true
      },
      search: {
        searchDebounceDelay: 300,
        maxSearchResults: 50,
        enableFuzzySearch: true,
        fuzzySearchThreshold: 0.6,
        enablePinyinSearch: true
      },
      fileProcessing: {
        maxFileSize: 100, // 100MB
        concurrentFileProcessing: 3,
        enableFileTypeDetection: true,
        iconExtractionTimeout: 5000, // 5秒
        enableFilePreview: true
      }
    }
  }

  /**
   * 获取高性能预设配置
   */
  private getHighPerformanceConfig(): OptimizationConfig {
    const config = this.getDefaultConfig()
    return {
      ...config,
      rendering: {
        ...config.rendering,
        enableGPUAcceleration: true,
        maxFPS: 120,
        enableVirtualScrolling: true,
        enableLazyLoading: true,
        lazyLoadingThreshold: 50
      },
      memory: {
        ...config.memory,
        maxMemoryUsage: 1024, // 1GB
        gcInterval: 15000, // 15秒
        memoryLeakDetectionInterval: 30000 // 30秒
      },
      cache: {
        ...config.cache,
        searchCacheSize: 100, // 100MB
        iconCacheSize: 200, // 200MB
        cacheExpireTime: 600000, // 10分钟
        compressionLevel: 1 // 低压缩，快速访问
      },
      network: {
        ...config.network,
        maxConcurrentRequests: 10,
        requestTimeout: 5000,
        retryCount: 2
      },
      ui: {
        ...config.ui,
        debounceDelay: 150,
        throttleDelay: 50,
        animationDuration: 150
      },
      search: {
        ...config.search,
        searchDebounceDelay: 150,
        maxSearchResults: 100
      },
      fileProcessing: {
        ...config.fileProcessing,
        concurrentFileProcessing: 6,
        iconExtractionTimeout: 3000
      }
    }
  }

  /**
   * 获取低功耗预设配置
   */
  private getLowPowerConfig(): OptimizationConfig {
    const config = this.getDefaultConfig()
    return {
      ...config,
      rendering: {
        ...config.rendering,
        enableGPUAcceleration: false,
        maxFPS: 30,
        enableVirtualScrolling: true,
        enableLazyLoading: true,
        lazyLoadingThreshold: 200
      },
      memory: {
        ...config.memory,
        maxMemoryUsage: 256, // 256MB
        gcInterval: 60000, // 1分钟
        memoryLeakDetectionInterval: 120000 // 2分钟
      },
      cache: {
        ...config.cache,
        searchCacheSize: 25, // 25MB
        iconCacheSize: 50, // 50MB
        cacheExpireTime: 180000, // 3分钟
        compressionLevel: 6 // 高压缩，节省内存
      },
      network: {
        ...config.network,
        maxConcurrentRequests: 3,
        requestTimeout: 15000,
        retryCount: 1
      },
      ui: {
        ...config.ui,
        debounceDelay: 500,
        throttleDelay: 200,
        animationDuration: 300,
        enableAnimations: false,
        enableTransitions: false
      },
      search: {
        ...config.search,
        searchDebounceDelay: 500,
        maxSearchResults: 25
      },
      fileProcessing: {
        ...config.fileProcessing,
        concurrentFileProcessing: 1,
        iconExtractionTimeout: 10000
      }
    }
  }

  /**
   * 设置观察器
   */
  private setupWatchers(): void {
    // 监听配置变化并自动保存
    watch(
      this.config,
      (newConfig) => {
        this.saveConfigToStorage(newConfig)
        this.applyConfigToSystem(newConfig)
      },
      { deep: true }
    )
  }

  /**
   * 从存储加载配置
   */
  private loadConfigFromStorage(): void {
    try {
      const savedConfig = localStorage.getItem('optimization-config')
      const savedPreset = localStorage.getItem('optimization-preset')

      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig)
        this.config.value = { ...this.getDefaultConfig(), ...parsedConfig }
      }

      if (savedPreset) {
        this.currentPreset.value = savedPreset as OptimizationPreset
      }
    } catch (error) {
      console.warn('加载优化配置失败，使用默认配置:', error)
    }
  }

  /**
   * 保存配置到存储
   */
  private saveConfigToStorage(config: OptimizationConfig): void {
    try {
      localStorage.setItem('optimization-config', JSON.stringify(config))
      localStorage.setItem('optimization-preset', this.currentPreset.value)
    } catch (error) {
      console.warn('保存优化配置失败:', error)
    }
  }

  /**
   * 应用配置到系统
   */
  private applyConfigToSystem(config: OptimizationConfig): void {
    // 应用CSS变量
    this.applyCSSVariables(config)

    // 应用JavaScript配置
    this.applyJavaScriptConfig(config)

    // 触发配置变更事件
    window.dispatchEvent(new CustomEvent('optimization-config-changed', {
      detail: { config, preset: this.currentPreset.value }
    }))
  }

  /**
   * 应用CSS变量
   */
  private applyCSSVariables(config: OptimizationConfig): void {
    const root = document.documentElement

    // 动画相关
    root.style.setProperty('--animation-duration', `${config.ui.animationDuration}ms`)
    root.style.setProperty('--enable-animations', config.ui.enableAnimations ? '1' : '0')
    root.style.setProperty('--enable-transitions', config.ui.enableTransitions ? '1' : '0')

    // 虚拟滚动相关
    root.style.setProperty('--virtual-scroll-item-height', `${config.rendering.virtualScrollItemHeight}px`)

    // GPU加速
    if (config.rendering.enableGPUAcceleration) {
      root.style.setProperty('--gpu-acceleration', 'translateZ(0)')
    } else {
      root.style.removeProperty('--gpu-acceleration')
    }
  }

  /**
   * 应用JavaScript配置
   */
  private applyJavaScriptConfig(config: OptimizationConfig): void {
    // 设置全局配置对象
    ; (window as any).__OPTIMIZATION_CONFIG__ = config

    // 应用帧率限制
    if (config.rendering.maxFPS < 60) {
      this.setupFrameRateLimit(config.rendering.maxFPS)
    }
  }

  /**
   * 设置帧率限制
   */
  private setupFrameRateLimit(maxFPS: number): void {
    const interval = 1000 / maxFPS
    let lastTime = 0

    const originalRequestAnimationFrame = window.requestAnimationFrame
    window.requestAnimationFrame = (callback) => {
      return originalRequestAnimationFrame((currentTime) => {
        if (currentTime - lastTime >= interval) {
          lastTime = currentTime
          callback(currentTime)
        } else {
          window.requestAnimationFrame(callback)
        }
      })
    }
  }

  /**
   * 切换预设模式
   */
  async switchPreset(preset: OptimizationPreset): Promise<void> {
    if (this.isApplying.value) return

    this.isApplying.value = true

    try {
      let newConfig: OptimizationConfig

      switch (preset) {
        case OptimizationPreset.HIGH_PERFORMANCE:
          newConfig = this.getHighPerformanceConfig()
          break
        case OptimizationPreset.LOW_POWER:
          newConfig = this.getLowPowerConfig()
          break
        case OptimizationPreset.BALANCED:
        default:
          newConfig = this.getDefaultConfig()
          break
      }

      this.config.value = newConfig
      this.currentPreset.value = preset

      console.log(`🔧 切换到优化预设: ${preset}`)
    } finally {
      this.isApplying.value = false
    }
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<OptimizationConfig>): void {
    this.config.value = { ...this.config.value, ...updates }
    this.currentPreset.value = OptimizationPreset.CUSTOM
  }

  /**
   * 更新特定模块配置
   */
  updateModuleConfig<K extends keyof OptimizationConfig>(
    module: K,
    updates: Partial<OptimizationConfig[K]>
  ): void {
    this.config.value[module] = { ...this.config.value[module], ...updates }
    this.currentPreset.value = OptimizationPreset.CUSTOM
  }

  /**
   * 重置到默认配置
   */
  resetToDefault(): void {
    this.config.value = this.getDefaultConfig()
    this.currentPreset.value = OptimizationPreset.BALANCED
  }

  /**
   * 获取当前配置
   */
  getConfig(): OptimizationConfig {
    return { ...this.config.value }
  }

  /**
   * 获取当前预设
   */
  getCurrentPreset(): OptimizationPreset {
    return this.currentPreset.value
  }

  /**
   * 获取配置建议
   */
  getConfigRecommendations(): Array<{
    module: keyof OptimizationConfig
    setting: string
    currentValue: any
    recommendedValue: any
    reason: string
    impact: 'high' | 'medium' | 'low'
  }> {
    const recommendations: Array<{
      module: keyof OptimizationConfig
      setting: string
      currentValue: any
      recommendedValue: any
      reason: string
      impact: 'high' | 'medium' | 'low'
    }> = []

    const config = this.config.value

    // 检查内存使用情况
    if ((performance as any).memory) {
      const memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024
      if (memoryUsage > config.memory.maxMemoryUsage * 0.8) {
        recommendations.push({
          module: 'memory',
          setting: 'maxMemoryUsage',
          currentValue: config.memory.maxMemoryUsage,
          recommendedValue: Math.ceil(memoryUsage * 1.5),
          reason: '当前内存使用接近限制，建议增加内存限制',
          impact: 'high'
        })
      }
    }

    // 检查缓存设置
    if (config.cache.searchCacheSize < 50) {
      recommendations.push({
        module: 'cache',
        setting: 'searchCacheSize',
        currentValue: config.cache.searchCacheSize,
        recommendedValue: 50,
        reason: '搜索缓存大小较小，可能影响搜索性能',
        impact: 'medium'
      })
    }

    // 检查动画设置
    if (config.ui.enableAnimations && config.ui.animationDuration > 300) {
      recommendations.push({
        module: 'ui',
        setting: 'animationDuration',
        currentValue: config.ui.animationDuration,
        recommendedValue: 200,
        reason: '动画持续时间过长可能影响用户体验',
        impact: 'low'
      })
    }

    return recommendations
  }

  /**
   * 应用推荐配置
   */
  applyRecommendations(recommendations: Array<{
    module: keyof OptimizationConfig
    setting: string
    recommendedValue: any
  }>): void {
    const config = { ...this.config.value }

    for (const rec of recommendations) {
      if (config[rec.module] && typeof config[rec.module] === 'object') {
        ; (config[rec.module] as any)[rec.setting] = rec.recommendedValue
      }
    }

    this.config.value = config
    this.currentPreset.value = OptimizationPreset.CUSTOM
  }

  /**
   * 导出配置
   */
  exportConfig(): string {
    return JSON.stringify({
      config: this.config.value,
      preset: this.currentPreset.value,
      exportedAt: Date.now(),
      version: '1.0.0'
    }, null, 2)
  }

  /**
   * 导入配置
   */
  importConfig(configJson: string): boolean {
    try {
      const imported = JSON.parse(configJson)

      if (imported.config && imported.preset) {
        this.config.value = { ...this.getDefaultConfig(), ...imported.config }
        this.currentPreset.value = imported.preset
        return true
      }

      return false
    } catch (error) {
      console.error('导入配置失败:', error)
      return false
    }
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    return computed(() => {
      const config = this.config.value
      return {
        memoryLimit: config.memory.maxMemoryUsage,
        cacheSize: config.cache.searchCacheSize + config.cache.iconCacheSize,
        maxFPS: config.rendering.maxFPS,
        networkConcurrency: config.network.maxConcurrentRequests,
        debounceDelay: config.ui.debounceDelay,
        animationsEnabled: config.ui.enableAnimations
      }
    })
  }

  /**
   * 获取应用状态
   */
  getApplyingStatus() {
    return computed(() => this.isApplying.value)
  }
}

/**
 * 全局优化配置管理器实例
 */
export const optimizationConfigManager = new OptimizationConfigManager()

/**
 * Vue 组合式函数
 */
export function useOptimizationConfig() {
  return {
    manager: optimizationConfigManager,
    config: computed(() => optimizationConfigManager.getConfig()),
    preset: computed(() => optimizationConfigManager.getCurrentPreset()),
    isApplying: optimizationConfigManager.getApplyingStatus(),
    performanceStats: optimizationConfigManager.getPerformanceStats(),

    switchPreset: optimizationConfigManager.switchPreset.bind(optimizationConfigManager),
    updateConfig: optimizationConfigManager.updateConfig.bind(optimizationConfigManager),
    updateModuleConfig: optimizationConfigManager.updateModuleConfig.bind(optimizationConfigManager),
    resetToDefault: optimizationConfigManager.resetToDefault.bind(optimizationConfigManager),
    getRecommendations: optimizationConfigManager.getConfigRecommendations.bind(optimizationConfigManager),
    applyRecommendations: optimizationConfigManager.applyRecommendations.bind(optimizationConfigManager),
    exportConfig: optimizationConfigManager.exportConfig.bind(optimizationConfigManager),
    importConfig: optimizationConfigManager.importConfig.bind(optimizationConfigManager)
  }
}
