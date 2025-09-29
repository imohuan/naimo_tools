/**
 * 性能优化配置文件
 * 集中管理所有性能相关的配置项
 */

/**
 * 渲染性能配置
 */
export const RENDER_CONFIG = {
  /** 虚拟滚动配置 */
  VIRTUAL_SCROLL: {
    /** 默认项目高度 */
    ITEM_HEIGHT: 48,
    /** 缓冲区大小 */
    BUFFER_SIZE: 5,
    /** 启用虚拟滚动的最小项目数 */
    MIN_ITEMS: 50
  },

  /** 防抖和节流配置 */
  DEBOUNCE_THROTTLE: {
    /** 搜索防抖延迟 */
    SEARCH_DEBOUNCE: 300,
    /** 窗口调整防抖延迟 */
    RESIZE_DEBOUNCE: 16,
    /** 滚动节流延迟 */
    SCROLL_THROTTLE: 16,
    /** 输入节流延迟 */
    INPUT_THROTTLE: 100
  },

  /** 动画配置 */
  ANIMATION: {
    /** 过渡动画持续时间 */
    TRANSITION_DURATION: 200,
    /** 缓动函数 */
    EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
    /** 是否启用动画 */
    ENABLED: true,
    /** 减少动画模式 */
    REDUCED_MOTION: false
  }
}

/**
 * 内存管理配置
 */
export const MEMORY_CONFIG = {
  /** 缓存配置 */
  CACHE: {
    /** 搜索结果缓存大小 */
    SEARCH_CACHE_SIZE: 50,
    /** 图标缓存大小 */
    ICON_CACHE_SIZE: 200,
    /** 缓存过期时间 (5分钟) */
    CACHE_TTL: 5 * 60 * 1000,
    /** 是否启用缓存 */
    ENABLED: true
  },

  /** 资源清理配置 */
  CLEANUP: {
    /** 自动清理间隔 (10分钟) */
    AUTO_CLEANUP_INTERVAL: 10 * 60 * 1000,
    /** 内存使用阈值 (MB) */
    MEMORY_THRESHOLD: 100,
    /** 是否启用自动清理 */
    AUTO_CLEANUP_ENABLED: true
  }
}

/**
 * 网络性能配置
 */
export const NETWORK_CONFIG = {
  /** 请求配置 */
  REQUEST: {
    /** 请求超时时间 */
    TIMEOUT: 10000,
    /** 最大重试次数 */
    MAX_RETRIES: 3,
    /** 重试延迟 */
    RETRY_DELAY: 1000,
    /** 并发请求限制 */
    CONCURRENT_LIMIT: 5
  },

  /** 批处理配置 */
  BATCH: {
    /** 批处理延迟 */
    DELAY: 100,
    /** 最大批处理大小 */
    MAX_SIZE: 50,
    /** 是否启用批处理 */
    ENABLED: true
  }
}

/**
 * 组件性能配置
 */
export const COMPONENT_CONFIG = {
  /** 列表组件配置 */
  LIST: {
    /** 分页大小 */
    PAGE_SIZE: 20,
    /** 预加载页数 */
    PRELOAD_PAGES: 1,
    /** 是否启用懒加载 */
    LAZY_LOADING: true
  },

  /** 图片配置 */
  IMAGE: {
    /** 懒加载阈值 */
    LAZY_THRESHOLD: 100,
    /** 占位符 */
    PLACEHOLDER: 'data:image/svg+xml;base64,...',
    /** 是否启用图片压缩 */
    COMPRESSION: true
  }
}

/**
 * 开发环境性能配置
 */
export const DEV_CONFIG = {
  /** 性能监控 */
  MONITORING: {
    /** 是否启用性能监控 */
    ENABLED: process.env.NODE_ENV === 'development',
    /** 监控间隔 */
    INTERVAL: 5000,
    /** 是否输出详细日志 */
    VERBOSE: false
  },

  /** 调试配置 */
  DEBUG: {
    /** 是否显示渲染边界 */
    SHOW_RENDER_BOUNDARIES: false,
    /** 是否显示性能指标 */
    SHOW_PERFORMANCE_METRICS: false,
    /** 是否启用时间旅行 */
    TIME_TRAVEL_ENABLED: false
  }
}

/**
 * 性能预设配置
 */
export const PERFORMANCE_PRESETS = {
  /** 高性能模式 */
  HIGH_PERFORMANCE: {
    ...RENDER_CONFIG,
    DEBOUNCE_THROTTLE: {
      SEARCH_DEBOUNCE: 200,
      RESIZE_DEBOUNCE: 8,
      SCROLL_THROTTLE: 8,
      INPUT_THROTTLE: 50
    },
    ANIMATION: {
      ...RENDER_CONFIG.ANIMATION,
      ENABLED: false
    }
  },

  /** 平衡模式 (默认) */
  BALANCED: {
    ...RENDER_CONFIG,
    ...MEMORY_CONFIG,
    ...NETWORK_CONFIG,
    ...COMPONENT_CONFIG
  },

  /** 低功耗模式 */
  LOW_POWER: {
    ...RENDER_CONFIG,
    DEBOUNCE_THROTTLE: {
      SEARCH_DEBOUNCE: 500,
      RESIZE_DEBOUNCE: 32,
      SCROLL_THROTTLE: 32,
      INPUT_THROTTLE: 200
    },
    ANIMATION: {
      ...RENDER_CONFIG.ANIMATION,
      TRANSITION_DURATION: 100
    },
    VIRTUAL_SCROLL: {
      ...RENDER_CONFIG.VIRTUAL_SCROLL,
      MIN_ITEMS: 20
    }
  }
}

/**
 * 获取当前性能配置
 */
export function getPerformanceConfig() {
  // 可以根据系统性能、用户设置等动态选择预设
  const preset = 'BALANCED' // 默认使用平衡模式
  return PERFORMANCE_PRESETS[preset as keyof typeof PERFORMANCE_PRESETS]
}

/**
 * 性能配置管理器
 */
export class PerformanceConfigManager {
  private currentConfig = getPerformanceConfig()
  private listeners: Array<(config: any) => void> = []

  /**
   * 获取当前配置
   */
  getConfig() {
    return this.currentConfig
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<typeof this.currentConfig>) {
    this.currentConfig = { ...this.currentConfig, ...newConfig }
    this.notifyListeners()
  }

  /**
   * 切换预设
   */
  switchPreset(preset: keyof typeof PERFORMANCE_PRESETS) {
    this.currentConfig = PERFORMANCE_PRESETS[preset]
    this.notifyListeners()
  }

  /**
   * 订阅配置变化
   */
  subscribe(listener: (config: any) => void) {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentConfig))
  }

  /**
   * 根据系统性能自动调整
   */
  autoOptimize() {
    // 检测系统性能
    const memory = (performance as any).memory
    const cores = navigator.hardwareConcurrency || 4

    let preset: keyof typeof PERFORMANCE_PRESETS = 'BALANCED'

    if (memory) {
      const usedMemory = memory.usedJSHeapSize / 1024 / 1024 // MB
      const totalMemory = memory.totalJSHeapSize / 1024 / 1024 // MB

      if (usedMemory / totalMemory > 0.8 || cores < 4) {
        preset = 'LOW_POWER'
      } else if (cores >= 8 && totalMemory > 512) {
        preset = 'HIGH_PERFORMANCE'
      }
    }

    this.switchPreset(preset)
    console.log(`🔧 自动切换到性能预设: ${preset}`)
  }
}

/**
 * 全局性能配置管理器实例
 */
export const performanceConfigManager = new PerformanceConfigManager()

/**
 * 性能优化建议
 */
export const PERFORMANCE_TIPS = [
  '使用 v-memo 缓存复杂的列表项渲染',
  '使用 shallowRef 处理大型对象',
  '避免在模板中使用复杂的计算表达式',
  '合理使用 keep-alive 缓存组件',
  '使用 Suspense 处理异步组件',
  '避免在 watch 中执行昂贵的操作',
  '使用 markRaw 标记不需要响应式的对象',
  '合理拆分组件，避免过大的组件',
  '使用事件委托减少事件监听器数量',
  '优化图片加载，使用适当的格式和尺寸'
]

/**
 * 性能检查清单
 */
export const PERFORMANCE_CHECKLIST = [
  { item: '是否使用了虚拟滚动处理大列表', checked: false },
  { item: '是否对搜索和输入进行了防抖处理', checked: false },
  { item: '是否缓存了计算结果和网络请求', checked: false },
  { item: '是否使用了懒加载处理图片和组件', checked: false },
  { item: '是否避免了不必要的响应式数据', checked: false },
  { item: '是否优化了动画性能', checked: false },
  { item: '是否处理了内存泄漏', checked: false },
  { item: '是否使用了合适的数据结构', checked: false },
  { item: '是否避免了深层嵌套的 watch', checked: false },
  { item: '是否优化了组件的渲染频率', checked: false }
]
