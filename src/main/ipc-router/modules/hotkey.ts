/**
 * 快捷键管理模块
 * 处理全局快捷键的注册、注销等操作
 */

import log from 'electron-log'
import { globalShortcut } from 'electron'

// 全局快捷键管理
const registeredGlobalShortcuts = new Map<string, string>()

/**
 * 注册全局快捷键
 * @param keys 快捷键组合
 * @param callback 回调函数
 * @returns 是否注册成功
 */
export async function registerGlobalShortcut(keys: string, callback: () => void): Promise<boolean> {
  try {
    log.info(`🔧 注册全局快捷键: ${keys}`)

    // 检查是否已注册
    if (globalShortcut.isRegistered(keys)) {
      log.warn(`⚠️ 快捷键 ${keys} 已被其他应用注册`)
      return false
    }

    // 注册全局快捷键
    const success = globalShortcut.register(keys, () => {
      log.info(`🎉 全局快捷键被触发: ${keys}`)
      callback()
    })

    if (success) {
      registeredGlobalShortcuts.set(keys, keys)
      log.info(`✅ 注册全局快捷键成功: ${keys}`)
    } else {
      log.error(`❌ 注册全局快捷键失败: ${keys}`)
    }

    return success
  } catch (error) {
    log.error(`❌ 注册全局快捷键异常: ${keys}`, error)
    return false
  }
}

/**
 * 注销全局快捷键
 * @param id 快捷键ID
 * @returns 是否注销成功
 */
export async function unregisterGlobalShortcut(id: string): Promise<boolean> {
  try {
    log.info(`🔧 注销全局快捷键: ${id}`)

    // 查找对应的快捷键
    const keys = registeredGlobalShortcuts.get(id)
    if (!keys) {
      log.warn(`⚠️ 快捷键 ${id} 未注册`)
      return false
    }

    // 注销全局快捷键
    if (globalShortcut.isRegistered(keys)) {
      globalShortcut.unregister(keys)
      registeredGlobalShortcuts.delete(id)
      log.info(`✅ 注销全局快捷键成功: ${keys}`)
      return true
    } else {
      log.warn(`⚠️ 快捷键 ${keys} 未在系统中注册`)
      return false
    }
  } catch (error) {
    log.error(`❌ 注销全局快捷键异常: ${id}`, error)
    return false
  }
}

/**
 * 检查全局快捷键是否已注册
 * @param keys 快捷键组合
 * @returns 是否已注册
 */
export async function isGlobalShortcutRegistered(keys: string): Promise<boolean> {
  try {
    const isRegistered = globalShortcut.isRegistered(keys)
    log.debug(`🔧 检查快捷键状态: ${keys} -> ${isRegistered ? '已注册' : '未注册'}`)
    return isRegistered
  } catch (error) {
    log.error(`❌ 检查快捷键状态异常: ${keys}`, error)
    return false
  }
}

/**
 * 清除所有全局快捷键
 * @returns 是否清除成功
 */
export async function clearAllGlobalShortcuts(): Promise<boolean> {
  try {
    log.info('🔧 清除所有全局快捷键')

    // 注销所有全局快捷键
    globalShortcut.unregisterAll()
    registeredGlobalShortcuts.clear()

    log.info('✅ 清除所有全局快捷键成功')
    return true
  } catch (error) {
    log.error('❌ 清除所有全局快捷键异常:', error)
    return false
  }
}
