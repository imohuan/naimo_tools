/**
 * 增强版热键管理器
 * 提供更高效和灵活的热键管理功能
 */

import { ref, computed, watch } from 'vue'
import { SmartCacheManager } from '@/core/cache/SmartCacheManager'
import type { HotkeyEventListener, HotkeyEventType, HotkeyConfig } from '@/typings/hotkeyTypes'

/**
 * 热键绑定接口
 */
export interface HotkeyBinding {
  /** 热键ID */
  id: string
  /** 热键组合 */
  combination: string
  /** 事件类型 */
  eventType: HotkeyEventType
  /** 描述 */
  description: string
  /** 是否启用 */
  enabled: boolean
  /** 优先级 */
  priority: number
  /** 分类 */
  category: string
  /** 创建时间 */
  createdAt: number
  /** 最后使用时间 */
  lastUsedAt?: number
  /** 使用次数 */
  usageCount: number
}

/**
 * 热键冲突信息接口
 */
export interface HotkeyConflict {
  /** 冲突的热键组合 */
  combination: string
  /** 冲突的绑定 */
  bindings: HotkeyBinding[]
  /** 冲突严重程度 */
  severity: 'low' | 'medium' | 'high'
}

/**
 * 热键统计信息接口
 */
export interface HotkeyStats {
  /** 总绑定数 */
  totalBindings: number
  /** 启用的绑定数 */
  enabledBindings: number
  /** 热键使用总次数 */
  totalUsage: number
  /** 最常用的热键 */
  mostUsedHotkeys: Array<{ binding: HotkeyBinding; count: number }>
  /** 冲突数量 */
  conflictCount: number
  /** 按分类统计 */
  byCategory: Record<string, number>
}

/**
 * 热键配置选项接口
 */
export interface HotkeyManagerOptions {
  /** 是否启用冲突检测 */
  enableConflictDetection: boolean
  /** 是否启用使用统计 */
  enableUsageTracking: boolean
  /** 是否启用持久化 */
  enablePersistence: boolean
  /** 最大绑定数量 */
  maxBindings: number
  /** 冲突解决策略 */
  conflictResolution: 'ignore' | 'warn' | 'prevent'
}

/**
 * 增强版热键管理器类
 */
export class HotkeyManagerEnhanced {
  private bindings = new Map<string, HotkeyBinding>()
  private listeners = new Map<string, Set<HotkeyEventListener>>()
  private keyStates = new Map<string, boolean>()
  private conflicts = ref<HotkeyConflict[]>([])
  private stats = ref<HotkeyStats>({
    totalBindings: 0,
    enabledBindings: 0,
    totalUsage: 0,
    mostUsedHotkeys: [],
    conflictCount: 0,
    byCategory: {}
  })

  private options: HotkeyManagerOptions
  private cache: SmartCacheManager<HotkeyBinding[]>
  private isListening = ref(false)
  private currentModifiers = new Set<string>()

  constructor(options: Partial<HotkeyManagerOptions> = {}) {
    this.options = {
      enableConflictDetection: true,
      enableUsageTracking: true,
      enablePersistence: true,
      maxBindings: 100,
      conflictResolution: 'warn',
      ...options
    }

    // 初始化缓存
    this.cache = new SmartCacheManager<HotkeyBinding[]>({
      maxSize: 1024 * 1024, // 1MB
      maxItems: 10,
      enablePersistence: this.options.enablePersistence
    })

    this.setupGlobalListeners()
    this.loadPersistedBindings()
  }

  /**
   * 设置全局键盘监听器
   */
  private setupGlobalListeners(): void {
    // 键盘按下事件
    document.addEventListener('keydown', this.handleKeyDown.bind(this), true)
    document.addEventListener('keyup', this.handleKeyUp.bind(this), true)

    // 窗口焦点事件
    window.addEventListener('focus', this.handleWindowFocus.bind(this))
    window.addEventListener('blur', this.handleWindowBlur.bind(this))
  }

  /**
   * 处理键盘按下事件
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isListening.value) return

    const key = this.normalizeKey(event.key)
    const combination = this.getCombination(event)

    // 更新修饰键状态
    this.updateModifierState(event, true)

    // 更新按键状态
    this.keyStates.set(key, true)

    // 查找匹配的绑定
    const matchedBindings = this.findMatchingBindings(combination)

    if (matchedBindings.length > 0) {
      // 按优先级排序
      matchedBindings.sort((a, b) => b.priority - a.priority)

      const binding = matchedBindings[0]

      // 执行热键回调
      this.executeHotkey(binding, event)

      // 阻止默认行为
      event.preventDefault()
      event.stopPropagation()
    }
  }

  /**
   * 处理键盘释放事件
   */
  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.isListening.value) return

    const key = this.normalizeKey(event.key)

    // 更新修饰键状态
    this.updateModifierState(event, false)

    // 更新按键状态
    this.keyStates.set(key, false)
  }

  /**
   * 更新修饰键状态
   */
  private updateModifierState(event: KeyboardEvent, pressed: boolean): void {
    const modifiers = ['ctrl', 'alt', 'shift', 'meta']

    modifiers.forEach(modifier => {
      const isPressed = (event as any)[`${modifier}Key`]
      if (isPressed !== this.currentModifiers.has(modifier)) {
        if (isPressed) {
          this.currentModifiers.add(modifier)
        } else {
          this.currentModifiers.delete(modifier)
        }
      }
    })
  }

  /**
   * 获取键盘组合
   */
  private getCombination(event: KeyboardEvent): string {
    const parts: string[] = []

    if (event.ctrlKey) parts.push('ctrl')
    if (event.altKey) parts.push('alt')
    if (event.shiftKey) parts.push('shift')
    if (event.metaKey) parts.push('meta')

    const key = this.normalizeKey(event.key)
    if (key && !['ctrl', 'alt', 'shift', 'meta'].includes(key)) {
      parts.push(key)
    }

    return parts.join('+')
  }

  /**
   * 标准化按键名称
   */
  private normalizeKey(key: string): string {
    const keyMap: Record<string, string> = {
      ' ': 'space',
      'Control': 'ctrl',
      'Alt': 'alt',
      'Shift': 'shift',
      'Meta': 'meta',
      'Enter': 'enter',
      'Escape': 'esc',
      'Tab': 'tab',
      'Backspace': 'backspace',
      'Delete': 'del',
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right'
    }

    return keyMap[key] || key.toLowerCase()
  }

  /**
   * 查找匹配的绑定
   */
  private findMatchingBindings(combination: string): HotkeyBinding[] {
    const matches: HotkeyBinding[] = []

    for (const binding of this.bindings.values()) {
      if (binding.enabled && binding.combination === combination) {
        matches.push(binding)
      }
    }

    return matches
  }

  /**
   * 执行热键回调
   */
  private executeHotkey(binding: HotkeyBinding, event: KeyboardEvent): void {
    const listeners = this.listeners.get(binding.eventType)
    if (!listeners || listeners.size === 0) return

    // 更新使用统计
    if (this.options.enableUsageTracking) {
      binding.usageCount++
      binding.lastUsedAt = Date.now()
      this.updateStats()
    }

    // 执行所有监听器
    listeners.forEach(listener => {
      try {
        listener({
          type: binding.eventType,
          combination: binding.combination,
          binding,
          originalEvent: event
        })
      } catch (error) {
        console.error('热键监听器执行错误:', error)
      }
    })

    console.log(`🔥 执行热键: ${binding.combination} (${binding.description})`)
  }

  /**
   * 处理窗口焦点事件
   */
  private handleWindowFocus(): void {
    this.isListening.value = true
    this.keyStates.clear()
    this.currentModifiers.clear()
  }

  /**
   * 处理窗口失焦事件
   */
  private handleWindowBlur(): void {
    this.isListening.value = false
    this.keyStates.clear()
    this.currentModifiers.clear()
  }

  /**
   * 注册热键绑定
   */
  registerHotkey(
    id: string,
    combination: string,
    eventType: HotkeyEventType,
    options: {
      description?: string
      enabled?: boolean
      priority?: number
      category?: string
    } = {}
  ): boolean {
    // 检查绑定数量限制
    if (this.bindings.size >= this.options.maxBindings) {
      console.warn(`热键绑定数量已达上限 (${this.options.maxBindings})`)
      return false
    }

    // 标准化组合键
    const normalizedCombination = this.normalizeCombination(combination)

    // 检查冲突
    if (this.options.enableConflictDetection) {
      const conflicts = this.checkConflicts(normalizedCombination, id)
      if (conflicts.length > 0) {
        if (this.options.conflictResolution === 'prevent') {
          console.warn(`热键组合 ${normalizedCombination} 存在冲突，注册失败`)
          return false
        } else if (this.options.conflictResolution === 'warn') {
          console.warn(`热键组合 ${normalizedCombination} 存在冲突:`, conflicts)
        }
      }
    }

    const binding: HotkeyBinding = {
      id,
      combination: normalizedCombination,
      eventType,
      description: options.description || `热键 ${normalizedCombination}`,
      enabled: options.enabled !== false,
      priority: options.priority || 0,
      category: options.category || 'default',
      createdAt: Date.now(),
      usageCount: 0
    }

    this.bindings.set(id, binding)
    this.updateStats()
    this.updateConflicts()
    this.persistBindings()

    console.log(`🔥 注册热键: ${id} -> ${normalizedCombination}`)
    return true
  }

  /**
   * 标准化组合键
   */
  private normalizeCombination(combination: string): string {
    const parts = combination.toLowerCase().split('+').map(part => part.trim())
    const modifiers = ['ctrl', 'alt', 'shift', 'meta'].filter(mod => parts.includes(mod))
    const key = parts.find(part => !['ctrl', 'alt', 'shift', 'meta'].includes(part))

    return [...modifiers.sort(), key].filter(Boolean).join('+')
  }

  /**
   * 检查热键冲突
   */
  private checkConflicts(combination: string, excludeId?: string): HotkeyBinding[] {
    const conflicts: HotkeyBinding[] = []

    for (const binding of this.bindings.values()) {
      if (binding.id !== excludeId && binding.combination === combination) {
        conflicts.push(binding)
      }
    }

    return conflicts
  }

  /**
   * 取消注册热键
   */
  unregisterHotkey(id: string): boolean {
    const deleted = this.bindings.delete(id)
    if (deleted) {
      this.updateStats()
      this.updateConflicts()
      this.persistBindings()
      console.log(`🔥 取消注册热键: ${id}`)
    }
    return deleted
  }

  /**
   * 启用/禁用热键
   */
  toggleHotkey(id: string, enabled?: boolean): boolean {
    const binding = this.bindings.get(id)
    if (!binding) return false

    binding.enabled = enabled !== undefined ? enabled : !binding.enabled
    this.updateStats()
    this.persistBindings()

    console.log(`🔥 ${binding.enabled ? '启用' : '禁用'}热键: ${id}`)
    return true
  }

  /**
   * 添加事件监听器
   */
  addListener(eventType: HotkeyEventType, listener: HotkeyEventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(listener)
  }

  /**
   * 移除事件监听器
   */
  removeListener(eventType: HotkeyEventType, listener: HotkeyEventListener): void {
    const listeners = this.listeners.get(eventType)
    if (listeners) {
      listeners.delete(listener)
      if (listeners.size === 0) {
        this.listeners.delete(eventType)
      }
    }
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(eventType?: HotkeyEventType): void {
    if (eventType) {
      this.listeners.delete(eventType)
    } else {
      this.listeners.clear()
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    const bindings = Array.from(this.bindings.values())

    this.stats.value = {
      totalBindings: bindings.length,
      enabledBindings: bindings.filter(b => b.enabled).length,
      totalUsage: bindings.reduce((sum, b) => sum + b.usageCount, 0),
      mostUsedHotkeys: bindings
        .filter(b => b.usageCount > 0)
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10)
        .map(binding => ({ binding, count: binding.usageCount })),
      conflictCount: this.conflicts.value.length,
      byCategory: bindings.reduce((acc, binding) => {
        acc[binding.category] = (acc[binding.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }

  /**
   * 更新冲突信息
   */
  private updateConflicts(): void {
    if (!this.options.enableConflictDetection) return

    const conflictMap = new Map<string, HotkeyBinding[]>()

    // 按组合键分组
    for (const binding of this.bindings.values()) {
      if (!binding.enabled) continue

      if (!conflictMap.has(binding.combination)) {
        conflictMap.set(binding.combination, [])
      }
      conflictMap.get(binding.combination)!.push(binding)
    }

    // 找出冲突
    const conflicts: HotkeyConflict[] = []
    for (const [combination, bindings] of conflictMap.entries()) {
      if (bindings.length > 1) {
        // 计算冲突严重程度
        let severity: 'low' | 'medium' | 'high' = 'low'
        const categories = new Set(bindings.map(b => b.category))
        const totalUsage = bindings.reduce((sum, b) => sum + b.usageCount, 0)

        if (categories.size === 1) {
          severity = 'medium' // 同类别冲突
        }
        if (totalUsage > 10) {
          severity = 'high' // 高使用频率冲突
        }

        conflicts.push({
          combination,
          bindings,
          severity
        })
      }
    }

    this.conflicts.value = conflicts
  }

  /**
   * 持久化绑定
   */
  private persistBindings(): void {
    if (!this.options.enablePersistence) return

    const bindingsArray = Array.from(this.bindings.values())
    this.cache.set('hotkey-bindings', bindingsArray, {
      ttl: 30 * 24 * 60 * 60 * 1000, // 30天
      priority: 10
    })
  }

  /**
   * 加载持久化的绑定
   */
  private loadPersistedBindings(): void {
    if (!this.options.enablePersistence) return

    const cached = this.cache.get('hotkey-bindings')
    if (cached) {
      cached.forEach(binding => {
        this.bindings.set(binding.id, binding)
      })
      this.updateStats()
      this.updateConflicts()
    }
  }

  /**
   * 获取所有绑定
   */
  getAllBindings(): HotkeyBinding[] {
    return Array.from(this.bindings.values())
  }

  /**
   * 获取绑定按分类
   */
  getBindingsByCategory(category: string): HotkeyBinding[] {
    return Array.from(this.bindings.values()).filter(b => b.category === category)
  }

  /**
   * 搜索绑定
   */
  searchBindings(query: string): HotkeyBinding[] {
    const queryLower = query.toLowerCase()
    return Array.from(this.bindings.values()).filter(binding =>
      binding.combination.includes(queryLower) ||
      binding.description.toLowerCase().includes(queryLower) ||
      binding.category.toLowerCase().includes(queryLower)
    )
  }

  /**
   * 导出配置
   */
  exportConfig(): string {
    return JSON.stringify({
      bindings: Array.from(this.bindings.values()),
      options: this.options,
      stats: this.stats.value,
      exportedAt: Date.now()
    }, null, 2)
  }

  /**
   * 导入配置
   */
  importConfig(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson)

      if (config.bindings) {
        this.bindings.clear()
        config.bindings.forEach((binding: HotkeyBinding) => {
          this.bindings.set(binding.id, binding)
        })
      }

      if (config.options) {
        this.options = { ...this.options, ...config.options }
      }

      this.updateStats()
      this.updateConflicts()
      this.persistBindings()

      return true
    } catch (error) {
      console.error('导入热键配置失败:', error)
      return false
    }
  }

  /**
   * 重置所有绑定
   */
  reset(): void {
    this.bindings.clear()
    this.listeners.clear()
    this.keyStates.clear()
    this.currentModifiers.clear()
    this.conflicts.value = []
    this.updateStats()
    this.cache.clear()
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    // 移除事件监听器
    document.removeEventListener('keydown', this.handleKeyDown.bind(this), true)
    document.removeEventListener('keyup', this.handleKeyUp.bind(this), true)
    window.removeEventListener('focus', this.handleWindowFocus.bind(this))
    window.removeEventListener('blur', this.handleWindowBlur.bind(this))

    // 清理数据
    this.reset()
    this.cache.destroy()
  }

  /**
   * 获取统计信息
   */
  get statistics() {
    return computed(() => this.stats.value)
  }

  /**
   * 获取冲突信息
   */
  get conflictsInfo() {
    return computed(() => this.conflicts.value)
  }

  /**
   * 获取监听状态
   */
  get listeningState() {
    return computed(() => this.isListening.value)
  }
}

/**
 * Vue 组合式函数
 */
export function useHotkeyManagerEnhanced(options?: Partial<HotkeyManagerOptions>) {
  const manager = new HotkeyManagerEnhanced(options)

  return {
    manager,
    statistics: manager.statistics,
    conflicts: manager.conflictsInfo,
    isListening: manager.listeningState,

    // 方法
    registerHotkey: manager.registerHotkey.bind(manager),
    unregisterHotkey: manager.unregisterHotkey.bind(manager),
    toggleHotkey: manager.toggleHotkey.bind(manager),
    addListener: manager.addListener.bind(manager),
    removeListener: manager.removeListener.bind(manager),
    getAllBindings: manager.getAllBindings.bind(manager),
    getBindingsByCategory: manager.getBindingsByCategory.bind(manager),
    searchBindings: manager.searchBindings.bind(manager),
    exportConfig: manager.exportConfig.bind(manager),
    importConfig: manager.importConfig.bind(manager),
    reset: manager.reset.bind(manager)
  }
}
