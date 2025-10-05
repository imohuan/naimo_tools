import type { HotkeyConfig } from '@/temp_code/typings/hotkey'
import { HotkeyType } from '@/temp_code/typings/hotkey'
import { appEventManager } from '@/temp_code/modules/event'

/**
 * 标准化应用内快捷键格式（用于 hotkeys-js）
 * @param keys 快捷键组合字符串
 * @returns 标准化后的快捷键字符串
 */
export function normalizeAppKeys(keys: string): string {
  // 将快捷键格式转换为hotkeys-js格式
  return keys
    .toLowerCase()
    .replace(/ctrl/g, 'ctrl')
    .replace(/cmd/g, 'cmd')
    .replace(/alt/g, 'alt')
    .replace(/shift/g, 'shift')
    .replace(/meta/g, 'cmd')
    .replace(/super/g, 'cmd')
    .replace(/win/g, 'cmd')
    .replace(/\+/g, '+')
    .trim()
}

/**
 * 标准化 Electron 快捷键格式
 * @param keys 快捷键组合字符串
 * @returns 标准化后的快捷键字符串
 */
export function normalizeElectronKeys(keys: string): string {
  // 将常见的快捷键格式转换为Electron格式
  // Electron 快捷键格式要求：
  // - 修饰键：CmdOrCtrl, Alt, Shift, Cmd 等（首字母大写）
  // - 功能键和字母键：Space, Enter, Esc, A, B, C 等（首字母大写）
  return keys
    .toLowerCase()
    .replace(/ctrl/g, 'CmdOrCtrl')
    .replace(/cmd/g, 'CmdOrCtrl')
    .replace(/alt/g, 'Alt')
    .replace(/shift/g, 'Shift')
    .replace(/meta/g, 'Cmd')
    .replace(/super/g, 'Cmd')
    .replace(/win/g, 'Cmd')
    .replace(/space/g, 'Space')
    .replace(/enter/g, 'Enter')
    .replace(/esc/g, 'Escape')
    .replace(/tab/g, 'Tab')
    .replace(/backspace/g, 'Backspace')
    .replace(/delete/g, 'Delete')
    .replace(/up/g, 'Up')
    .replace(/down/g, 'Down')
    .replace(/left/g, 'Left')
    .replace(/right/g, 'Right')
    .replace(/\+/g, '+')
    // 将单个字母转为大写
    .split('+')
    .map(part => {
      if (part.length === 1 && /[a-z]/.test(part)) {
        return part.toUpperCase()
      }
      return part
    })
    .join('+')
}

/**
 * 触发快捷键事件
 * 统一触发 hotkey:triggered 事件，通过 type 区分类型（HotkeyType.GLOBAL 或 HotkeyType.APPLICATION）
 * @param config 快捷键配置
 */
export function triggerHotkeyEvent(config: HotkeyConfig): void {
  // 通过 appEventManager 触发 hotkey:triggered 事件
  appEventManager.emit('hotkey:triggered', {
    id: config.id, config, type: config.type
  })
  const typeLabel = config.type === HotkeyType.GLOBAL ? '全局' : '应用内'
  console.log(`[HotkeyEvent] hotkey:triggered 已触发: ${config.id} (${typeLabel})`)
}

/**
 * 验证快捷键格式是否有效
 * @param keys 快捷键组合字符串（如 "Ctrl+K", "Alt+Shift+S"）
 * @returns 是否有效
 */
export function isValidHotkeyFormat(keys: string): boolean {
  if (!keys || typeof keys !== 'string') {
    return false
  }

  // 去除首尾空格
  const trimmedKeys = keys.trim()

  if (!trimmedKeys) {
    return false
  }

  // 快捷键不应该过长
  if (trimmedKeys.length > 50) {
    return false
  }

  // 快捷键应该至少包含一个字符
  if (trimmedKeys.length === 0) {
    return false
  }

  // 验证快捷键格式：应该由修饰键和功能键组成
  // 允许的修饰键
  const modifiers = ['ctrl', 'alt', 'shift', 'cmd', 'cmdorctrl', 'meta', 'super', 'win']

  // 允许的功能键和特殊键
  const functionKeys = [
    'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
    'space', 'enter', 'return', 'tab', 'backspace', 'delete', 'insert', 'home', 'end',
    'pageup', 'pagedown', 'escape', 'esc',
    'up', 'down', 'left', 'right',
    'plus', 'minus', 'equal',
    'numpad0', 'numpad1', 'numpad2', 'numpad3', 'numpad4',
    'numpad5', 'numpad6', 'numpad7', 'numpad8', 'numpad9'
  ]

  // 分割快捷键组合
  const parts = trimmedKeys.toLowerCase().split('+').map(p => p.trim())

  // 快捷键至少应该有一个键
  if (parts.length === 0) {
    return false
  }

  // 检查每个部分是否有效
  for (const part of parts) {
    if (!part) {
      return false
    }

    // 检查是否是修饰键、功能键或单个字母/数字
    const isModifier = modifiers.includes(part)
    const isFunctionKey = functionKeys.includes(part)
    const isSingleChar = /^[a-z0-9]$/.test(part)
    const isSpecialChar = /^[`~!@#$%^&*()_\-=+\[\]{}\\|;:'",.<>/?]$/.test(part)

    if (!isModifier && !isFunctionKey && !isSingleChar && !isSpecialChar) {
      return false
    }
  }

  // 快捷键应该包含至少一个非修饰键（最后一个键通常是功能键或字母）
  const lastPart = parts[parts.length - 1]
  if (modifiers.includes(lastPart)) {
    return false
  }

  return true
}

/**
 * 标准化快捷键格式（用于比较）
 * @param keys 快捷键组合字符串
 * @returns 标准化后的快捷键字符串
 */
export function normalizeHotkeyKeys(keys: string): string {
  return keys
    .toLowerCase()
    .replace(/\s+/g, '')
    .split('+')
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .sort((a, b) => {
      // 修饰键排序顺序
      const modifierOrder: { [key: string]: number } = {
        'ctrl': 1,
        'cmdorctrl': 1,
        'cmd': 2,
        'alt': 3,
        'shift': 4,
        'meta': 2,
        'super': 2,
        'win': 2
      }

      const aOrder = modifierOrder[a] || 999
      const bOrder = modifierOrder[b] || 999

      if (aOrder !== bOrder) {
        return aOrder - bOrder
      }

      return a.localeCompare(b)
    })
    .join('+')
}

/**
 * 检查快捷键是否与现有快捷键冲突
 * @param keys 要检查的快捷键组合
 * @param existingHotkeys 现有的快捷键列表
 * @param excludeId 要排除的快捷键ID（用于更新时排除自身）
 * @returns 冲突的快捷键配置，无冲突返回 null
 */
export function checkHotkeyConflict(
  keys: string,
  existingHotkeys: HotkeyConfig[],
  excludeId?: string
): HotkeyConfig | null {
  if (!keys || !Array.isArray(existingHotkeys)) {
    return null
  }

  const normalizedKeys = normalizeHotkeyKeys(keys)

  for (const config of existingHotkeys) {
    // 排除指定的快捷键ID
    if (excludeId && config.id === excludeId) {
      continue
    }

    // 标准化现有快捷键
    const existingNormalizedKeys = normalizeHotkeyKeys(config.keys)

    // 检查是否相同
    if (normalizedKeys === existingNormalizedKeys) {
      return config
    }
  }

  return null
}

/**
 * 将快捷键字符串转换为显示格式
 * @param keys 快捷键组合字符串
 * @returns 格式化后的显示字符串
 */
export function formatHotkeyForDisplay(keys: string): string {
  if (!keys) {
    return ''
  }

  return keys
    .split('+')
    .map(part => {
      const trimmed = part.trim()
      // 首字母大写
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
    })
    .join(' + ')
}

/**
 * 解析键盘事件为快捷键字符串
 * @param event 键盘事件
 * @returns 快捷键字符串
 */
export function parseKeyboardEventToHotkey(event: KeyboardEvent): string {
  const parts: string[] = []

  // 添加修饰键
  if (event.ctrlKey || event.metaKey) {
    parts.push('Ctrl')
  }
  if (event.altKey) {
    parts.push('Alt')
  }
  if (event.shiftKey) {
    parts.push('Shift')
  }

  // 添加主键
  const key = event.key
  if (key && key.length === 1) {
    parts.push(key.toUpperCase())
  } else if (key) {
    // 特殊键
    const specialKeyMap: { [key: string]: string } = {
      'Escape': 'Esc',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      ' ': 'Space'
    }
    parts.push(specialKeyMap[key] || key)
  }

  return parts.join('+')
}

/**
 * 检查快捷键是否包含修饰键
 * @param keys 快捷键组合字符串
 * @returns 是否包含修饰键
 */
export function hasModifierKey(keys: string): boolean {
  if (!keys) {
    return false
  }

  const lowerKeys = keys.toLowerCase()
  const modifiers = ['ctrl', 'alt', 'shift', 'cmd', 'cmdorctrl', 'meta', 'super', 'win']

  return modifiers.some(modifier => lowerKeys.includes(modifier))
}

/**
 * 验证快捷键是否适合作为全局快捷键
 * 全局快捷键通常需要包含修饰键，避免与常规输入冲突
 * @param keys 快捷键组合字符串
 * @returns 是否适合作为全局快捷键
 */
export function isValidGlobalHotkey(keys: string): boolean {
  if (!isValidHotkeyFormat(keys)) {
    return false
  }

  // 全局快捷键通常需要包含修饰键
  return hasModifierKey(keys)
}


