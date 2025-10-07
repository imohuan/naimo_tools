/**
 * 调试模块 - 处理调试窗口相关的 IPC 请求
 */

import log from 'electron-log'
import { appBootstrap } from '@main/main'
import type { DebugInfo } from '@main/services/DebugService'

/**
 * 切换调试窗口展开状态
 */
export function toggleDebugWindow(event: Electron.IpcMainInvokeEvent): boolean {
  try {
    const debugService = appBootstrap?.getService('debugService')
    if (!debugService) {
      log.error('调试服务未初始化')
      return false
    }

    debugService.toggleExpanded()
    return true
  } catch (error) {
    log.error('切换调试窗口失败:', error)
    return false
  }
}

/**
 * 显示调试窗口
 */
export function showDebugWindow(event: Electron.IpcMainInvokeEvent): boolean {
  try {
    const debugService = appBootstrap?.getService('debugService')
    if (!debugService) {
      log.error('调试服务未初始化')
      return false
    }

    debugService.show()
    return true
  } catch (error) {
    log.error('显示调试窗口失败:', error)
    return false
  }
}

/**
 * 隐藏调试窗口
 */
export function hideDebugWindow(event: Electron.IpcMainInvokeEvent): boolean {
  try {
    const debugService = appBootstrap?.getService('debugService')
    if (!debugService) {
      log.error('调试服务未初始化')
      return false
    }

    debugService.hide()
    return true
  } catch (error) {
    log.error('隐藏调试窗口失败:', error)
    return false
  }
}

/**
 * 获取调试信息（手动请求）
 */
export function getDebugInfo(event: Electron.IpcMainInvokeEvent): DebugInfo | null {
  try {
    const debugService = appBootstrap?.getService('debugService')
    if (!debugService) {
      log.error('调试服务未初始化')
      return null
    }

    // 由于 DebugService 没有直接暴露 collectDebugInfo，我们返回一个基本响应
    // 实际数据通过事件推送
    return null
  } catch (error) {
    log.error('获取调试信息失败:', error)
    return null
  }
}

/**
 * 获取调试窗口展开状态
 */
export function getDebugWindowState(event: Electron.IpcMainInvokeEvent): { isExpanded: boolean } | null {
  try {
    const debugService = appBootstrap?.getService('debugService')
    if (!debugService) {
      log.error('调试服务未初始化')
      return null
    }

    return debugService.getState()
  } catch (error) {
    log.error('获取调试窗口状态失败:', error)
    return null
  }
}

/**
 * 移动调试窗口
 */
export function moveDebugWindow(event: Electron.IpcMainInvokeEvent, deltaX: number, deltaY: number): boolean {
  try {
    const debugService = appBootstrap?.getService('debugService')
    if (!debugService) {
      log.error('调试服务未初始化')
      return false
    }

    const debugWindow = debugService.getDebugWindow()
    if (!debugWindow || debugWindow.isDestroyed()) {
      return false
    }

    const currentBounds = debugWindow.getBounds()
    debugWindow.setBounds({
      x: currentBounds.x + deltaX,
      y: currentBounds.y + deltaY,
      width: currentBounds.width,
      height: currentBounds.height
    })

    return true
  } catch (error) {
    log.error('移动调试窗口失败:', error)
    return false
  }
}

