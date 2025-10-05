import { defineStore } from 'pinia'
import { ref, shallowRef, computed, readonly, triggerRef } from 'vue'
import type { HotkeyConfig, HotkeyStats } from '@/temp_code/typings/hotkey'
import { HotkeyType } from '@/temp_code/typings/hotkey'
import { useAppHotkeyModule } from './appHotkey'
import { useGlobalHotkeyModule } from './globalHotkey'
import { storeUtils } from '@/temp_code/utils/store'
import { isValidHotkeyFormat, checkHotkeyConflict } from '@/temp_code/utils/hotkey'
import { useLoading } from '@/temp_code/hooks/useLoading'

/**
 * 快捷键主 Store
 * 
 * 核心职责：
 * - 统一管理所有快捷键数据（唯一数据源）
 * - 协调应用内快捷键和全局快捷键子模块
 * - 提供快捷键的增删改查接口
 * - 处理快捷键数据持久化
 * 
 * 使用方式：
 * ```ts
 * const app = useApp()
 * await app.hotkey.register(config)           // 注册快捷键
 * await app.hotkey.unregister(id)             // 注销快捷键
 * await app.hotkey.toggle(id)                 // 切换启用状态
 * app.hotkey.appHotkeyModule.setScope('search') // 切换作用域
 * ```
 */
export const useHotkeyStore = defineStore('hotkey', () => {
  // ==================== 状态层 ====================

  /** 
   * 所有快捷键的唯一数据源
   * 使用 shallowRef 优化性能（Map 本身是响应式的，内部项变化需手动触发）
   */
  const hotkeys = shallowRef<Map<string, HotkeyConfig>>(new Map())

  /** 加载状态管理 */
  const loading = useLoading()

  /** 是否已初始化 */
  const initialized = ref(false)

  // ==================== 子模块 ====================

  /** 应用内快捷键子模块 */
  const appHotkeyModule = useAppHotkeyModule()

  /** 全局快捷键子模块 */
  const globalHotkeyModule = useGlobalHotkeyModule()

  // ==================== 计算属性 ====================

  /** 全局快捷键列表 */
  const globalHotkeys = computed(() =>
    Array.from(hotkeys.value.values()).filter(h => h.type === HotkeyType.GLOBAL)
  )

  /** 应用内快捷键列表 */
  const appHotkeys = computed(() =>
    Array.from(hotkeys.value.values()).filter(h => h.type === HotkeyType.APPLICATION)
  )

  /** 已启用的快捷键列表 */
  const enabledHotkeys = computed(() =>
    Array.from(hotkeys.value.values()).filter(h => h.enabled)
  )

  /** 已禁用的快捷键列表 */
  const disabledHotkeys = computed(() =>
    Array.from(hotkeys.value.values()).filter(h => !h.enabled)
  )

  /** 快捷键总数 */
  const hotkeyCount = computed(() => hotkeys.value.size)

  /** 已启用数量 */
  const enabledCount = computed(() => enabledHotkeys.value.length)

  /** 已禁用数量 */
  const disabledCount = computed(() => disabledHotkeys.value.length)

  /** 快捷键统计信息 */
  const stats = computed<HotkeyStats>(() => ({
    total: hotkeyCount.value,
    globalCount: globalHotkeys.value.length,
    appCount: appHotkeys.value.length,
    enabledCount: enabledCount.value,
    disabledCount: disabledCount.value
  }))

  // ==================== 核心方法 ====================

  /**
   * 初始化快捷键系统
   * 从存储加载快捷键配置并注册
   */
  const initialize = loading.withLoading(async (): Promise<void> => {
    if (initialized.value) {
      console.warn('[HotkeyStore] 已经初始化过了')
      return
    }
    console.log('[HotkeyStore] 开始初始化...')

    // 从存储加载快捷键数据
    const savedData = await storeUtils.get('hotkeys' as any) || []

    if (Array.isArray(savedData) && savedData.length > 0) {
      // 恢复 Map 数据
      hotkeys.value = new Map(savedData)
      triggerRef(hotkeys)

      console.log(`[HotkeyStore] 加载了 ${hotkeys.value.size} 个快捷键配置`)

      // 注册所有已启用的快捷键
      const enabledConfigs = Array.from(hotkeys.value.values()).filter(h => h.enabled)

      for (const config of enabledConfigs) {
        await _registerToModule(config)
      }
    }

    initialized.value = true
    console.log('[HotkeyStore] ✅ 初始化完成')
  }, '初始化失败')

  /**
   * 注册快捷键
   * 
   * @param config 快捷键配置
   * @returns 是否成功
   */
  const register = loading.withLoadingSafe(async (config: HotkeyConfig): Promise<boolean> => {
    // 验证配置
    if (!isValidHotkeyFormat(config.keys)) {
      loading.error.value = '快捷键格式无效'
      return false
    }

    // 检查冲突
    const conflict = checkHotkeyConflict(config.keys, Array.from(hotkeys.value.values()), config.id)

    if (conflict) {
      loading.error.value = `快捷键冲突: ${conflict.id} 已使用相同的键组合`
      console.warn(`[HotkeyStore] 快捷键冲突: ${config.keys}`)
      return false
    }

    // 添加到 Map
    hotkeys.value.set(config.id, config)
    triggerRef(hotkeys)

    // 如果启用，则注册到对应的子模块
    if (config.enabled) {
      await _registerToModule(config)
    }

    // 持久化
    await _saveToStorage()

    console.log(`[HotkeyStore] ✅ 注册成功: ${config.id}`)
    return true
  }, '注册失败')

  /**
   * 注销快捷键
   * 
   * @param id 快捷键 ID
   * @returns 是否成功
   */
  const unregister = loading.withLoadingSafe(async (id: string): Promise<boolean> => {
    const config = hotkeys.value.get(id)
    if (!config) {
      loading.error.value = '快捷键不存在'
      return false
    }

    // 如果已启用，先注销
    if (config.enabled) {
      await _unregisterFromModule(config)
    }

    // 从 Map 中删除
    hotkeys.value.delete(id)
    triggerRef(hotkeys)

    // 持久化
    await _saveToStorage()

    console.log(`[HotkeyStore] ✅ 注销成功: ${id}`)
    return true
  }, '注销失败')

  /**
   * 切换快捷键启用状态
   * 
   * @param id 快捷键 ID
   * @returns 是否成功
   */
  const toggle = loading.withLoadingSafe(async (id: string): Promise<boolean> => {
    const config = hotkeys.value.get(id)
    if (!config) {
      loading.error.value = '快捷键不存在'
      return false
    }

    const newEnabled = !config.enabled

    // 更新配置
    const updatedConfig = { ...config, enabled: newEnabled }
    hotkeys.value.set(id, updatedConfig)
    triggerRef(hotkeys)

    // 注册或注销
    if (newEnabled) {
      await _registerToModule(updatedConfig)
    } else {
      await _unregisterFromModule(config)
    }

    // 持久化
    await _saveToStorage()

    console.log(`[HotkeyStore] ✅ 切换状态: ${id} -> ${newEnabled ? '启用' : '禁用'}`)
    return true
  }, '切换状态失败')

  /**
   * 更新快捷键配置
   * 
   * @param id 快捷键 ID
   * @param updates 要更新的字段
   * @returns 是否成功
   */
  const updateConfig = loading.withLoadingSafe(async (id: string, updates: Partial<HotkeyConfig>): Promise<boolean> => {
    const config = hotkeys.value.get(id)
    if (!config) {
      loading.error.value = '快捷键不存在'
      return false
    }

    const isKeysChanged = updates.keys && updates.keys !== config.keys
    // 如果更新了 keys，检查冲突
    if (isKeysChanged) {
      if (!isValidHotkeyFormat(updates.keys!)) {
        loading.error.value = '快捷键格式无效'
        return false
      }
      const conflict = checkHotkeyConflict(updates.keys!, Array.from(hotkeys.value.values()), id)
      if (conflict) {
        loading.error.value = `快捷键冲突: ${conflict.id} 已使用相同的键组合`
        return false
      }
    }

    // 如果当前已启用，先注销
    if (config.enabled && isKeysChanged) {
      await _unregisterFromModule(config)
    }

    // 更新配置
    const updatedConfig = { ...config, ...updates }
    hotkeys.value.set(id, updatedConfig)
    triggerRef(hotkeys)

    // 如果更新后仍然启用，重新注册
    if (updatedConfig.enabled && isKeysChanged) {
      await _registerToModule(updatedConfig)
    }

    // 持久化
    await _saveToStorage()

    console.log(`[HotkeyStore] ✅ 更新成功: ${id}`)
    return true
  }, '更新失败')

  /**
   * 获取指定快捷键配置
   * 
   * @param id 快捷键 ID
   * @returns 快捷键配置，不存在返回 undefined
   */
  const getConfig = (id: string): HotkeyConfig | undefined => {
    return hotkeys.value.get(id)
  }

  /**
   * 检查快捷键是否存在
   * 
   * @param id 快捷键 ID
   * @returns 是否存在
   */
  const has = (id: string): boolean => {
    return hotkeys.value.has(id)
  }

  /**
   * 清空所有快捷键
   */
  const clear = loading.withLoadingSafe(async (): Promise<void> => {
    // 注销所有已启用的快捷键
    const enabledConfigs = Array.from(hotkeys.value.values()).filter(h => h.enabled)

    for (const config of enabledConfigs) {
      await _unregisterFromModule(config)
    }

    // 清空 Map
    hotkeys.value.clear()
    triggerRef(hotkeys)

    // 持久化
    await _saveToStorage()

    console.log('[HotkeyStore] ✅ 已清空所有快捷键')
  }, '清空失败')

  /**
   * 重新加载快捷键（从存储）
   */
  const reload = loading.withLoading(async (): Promise<void> => {
    // 先清空当前所有快捷键
    await clear()

    // 重新初始化
    initialized.value = false
    await initialize()

    console.log('[HotkeyStore] ✅ 重新加载完成')
  }, '重新加载失败')

  // ==================== 内部辅助方法 ====================

  /**
   * 注册快捷键到对应的子模块
   * @private
   */
  const _registerToModule = async (config: HotkeyConfig): Promise<void> => {
    if (config.type === HotkeyType.GLOBAL) {
      await globalHotkeyModule.register(config)
    } else {
      appHotkeyModule.register(config)
    }
  }

  /**
   * 从对应的子模块注销快捷键
   * @private
   */
  const _unregisterFromModule = async (config: HotkeyConfig): Promise<void> => {
    if (config.type === HotkeyType.GLOBAL) {
      await globalHotkeyModule.unregister(config.id)
    } else {
      appHotkeyModule.unregister(config)
    }
  }

  /**
   * 保存到持久化存储
   * @private
   */
  const _saveToStorage = async (): Promise<void> => {
    try {
      const data = Array.from(hotkeys.value.entries())
      await storeUtils.set('hotkeys' as any, data)
    } catch (err) {
      console.error('[HotkeyStore] 保存到存储失败:', err)
    }
  }

  // ==================== 返回 ====================

  return {
    // 状态（只读）
    hotkeys: readonly(hotkeys),
    loading: readonly(loading.loading),
    error: readonly(loading.error),
    initialized: readonly(initialized),

    // 计算属性
    globalHotkeys,
    appHotkeys,
    enabledHotkeys,
    disabledHotkeys,
    hotkeyCount,
    enabledCount,
    disabledCount,
    stats,

    // 方法
    initialize,
    register,
    unregister,
    toggle,
    updateConfig,
    getConfig,
    has,
    clear,
    reload,

    // 子模块
    appHotkeyModule,
    globalHotkeyModule
  }
})

