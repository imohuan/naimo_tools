import type { HotkeyConfig } from '@/temp_code/typings/hotkey'
import { normalizeElectronKeys } from '@/temp_code/utils/hotkey'

/**
 * 全局快捷键模块
 * 
 * 职责：
 * - 与 Electron 主进程通信，注册/注销全局快捷键
 * - 不维护独立的快捷键数据（数据由父 store 统一管理）
 * - 只负责与系统层面的快捷键交互
 */
export function useGlobalHotkeyModule() {
  /**
   * 注册全局快捷键到 Electron 主进程
   * 
   * @param config 快捷键配置
   * @returns 是否注册成功
   */
  const register = async (config: HotkeyConfig): Promise<boolean> => {
    try {
      // 标准化快捷键格式为 Electron 格式
      const normalizedKeys = normalizeElectronKeys(config.keys)

      console.log(`[GlobalHotkey] 注册全局快捷键: ${config.id} -> ${normalizedKeys}`)

      // 调用 Electron IPC 注册全局快捷键
      const result = await naimo.router.hotkeyRegisterGlobalHotkey(normalizedKeys, config.id)

      if (result) {
        console.log(`[GlobalHotkey] ✅ 注册成功: ${config.id}`)
      } else {
        console.error(`[GlobalHotkey] ❌ 注册失败: ${config.id}`)
      }

      return result
    } catch (error) {
      console.error(`[GlobalHotkey] 注册异常: ${config.id}`, error)
      return false
    }
  }

  /**
   * 注销全局快捷键
   * 
   * @param id 快捷键 ID
   * @returns 是否注销成功
   */
  const unregister = async (id: string): Promise<boolean> => {
    try {
      console.log(`[GlobalHotkey] 注销全局快捷键: ${id}`)

      // 调用 Electron IPC 注销全局快捷键
      const result = await naimo.router.hotkeyUnregisterGlobalHotkey(id, id)

      if (result) {
        console.log(`[GlobalHotkey] ✅ 注销成功: ${id}`)
      } else {
        console.error(`[GlobalHotkey] ❌ 注销失败: ${id}`)
      }

      return result
    } catch (error) {
      console.error(`[GlobalHotkey] 注销异常: ${id}`, error)
      return false
    }
  }

  /**
   * 批量注册全局快捷键
   * 
   * @param configs 快捷键配置列表
   * @returns 成功注册的数量
   */
  const batchRegister = async (configs: HotkeyConfig[]): Promise<number> => {
    let successCount = 0

    for (const config of configs) {
      const success = await register(config)
      if (success) successCount++
    }

    return successCount
  }

  /**
   * 批量注销全局快捷键
   * 
   * @param ids 快捷键 ID 列表
   * @returns 成功注销的数量
   */
  const batchUnregister = async (ids: string[]): Promise<number> => {
    let successCount = 0

    for (const id of ids) {
      const success = await unregister(id)
      if (success) successCount++
    }

    return successCount
  }

  /**
   * 注销所有全局快捷键
   * 
   * @returns 是否成功
   */
  const unregisterAll = async (): Promise<boolean> => {
    try {
      console.log('[GlobalHotkey] 注销所有全局快捷键')
      await naimo.router.hotkeyUnregisterAllGlobalHotkeys()
      return true
    } catch (error) {
      console.error('[GlobalHotkey] 注销所有快捷键失败', error)
      return false
    }
  }

  return {
    register,
    unregister,
    batchRegister,
    batchUnregister,
    unregisterAll
  }
}
