/**
 * 主进程事件发送方法（自动生成）
 * 基于 eventsConfig.ts 自动生成，请勿手动修改
 */

import { WebContents } from 'electron'
import log from 'electron-log'
import type { EventsConfig, EventType, EventData } from '@shared/config/eventsConfig'

/**
 * 发送 set-visible-input 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendSetVisibleInput(
  webContents: WebContents,
  data: EventData<'set-visible-input'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('set-visible-input', data)
    log.debug(`事件已发送: set-visible-input`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - set-visible-input`)
  }
}

/**
 * 发送 view-esc-pressed 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendViewEscPressed(
  webContents: WebContents,
  data: EventData<'view-esc-pressed'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('view-esc-pressed', data)
    log.debug(`事件已发送: view-esc-pressed`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - view-esc-pressed`)
  }
}

/**
 * 发送 view-detached 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendViewDetached(
  webContents: WebContents,
  data: EventData<'view-detached'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('view-detached', data)
    log.debug(`事件已发送: view-detached`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - view-detached`)
  }
}

/**
 * 发送 view-restore-requested 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendViewRestoreRequested(
  webContents: WebContents,
  data: EventData<'view-restore-requested'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('view-restore-requested', data)
    log.debug(`事件已发送: view-restore-requested`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - view-restore-requested`)
  }
}

/**
 * 发送 view-reattached 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendViewReattached(
  webContents: WebContents,
  data: EventData<'view-reattached'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('view-reattached', data)
    log.debug(`事件已发送: view-reattached`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - view-reattached`)
  }
}

/**
 * 发送 detached-window-closed 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendDetachedWindowClosed(
  webContents: WebContents,
  data: EventData<'detached-window-closed'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('detached-window-closed', data)
    log.debug(`事件已发送: detached-window-closed`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - detached-window-closed`)
  }
}

/**
 * 发送 detached-window-init 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendDetachedWindowInit(
  webContents: WebContents,
  data: EventData<'detached-window-init'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('detached-window-init', data)
    log.debug(`事件已发送: detached-window-init`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - detached-window-init`)
  }
}

/**
 * 发送 plugin-window-closed 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendPluginWindowClosed(
  webContents: WebContents,
  data: EventData<'plugin-window-closed'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('plugin-window-closed', data)
    log.debug(`事件已发送: plugin-window-closed`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - plugin-window-closed`)
  }
}

/**
 * 发送 plugin-view-opened 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendPluginViewOpened(
  webContents: WebContents,
  data: EventData<'plugin-view-opened'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('plugin-view-opened', data)
    log.debug(`事件已发送: plugin-view-opened`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - plugin-view-opened`)
  }
}

/**
 * 发送 plugin-view-closed 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendPluginViewClosed(
  webContents: WebContents,
  data: EventData<'plugin-view-closed'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('plugin-view-closed', data)
    log.debug(`事件已发送: plugin-view-closed`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - plugin-view-closed`)
  }
}

/**
 * 发送 plugin-installed 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendPluginInstalled(
  webContents: WebContents,
  data: EventData<'plugin-installed'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('plugin-installed', data)
    log.debug(`事件已发送: plugin-installed`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - plugin-installed`)
  }
}

/**
 * 发送 plugin-uninstalled 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendPluginUninstalled(
  webContents: WebContents,
  data: EventData<'plugin-uninstalled'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('plugin-uninstalled', data)
    log.debug(`事件已发送: plugin-uninstalled`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - plugin-uninstalled`)
  }
}

/**
 * 发送 plugin-search 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendPluginSearch(
  webContents: WebContents,
  data: EventData<'plugin-search'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('plugin-search', data)
    log.debug(`事件已发送: plugin-search`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - plugin-search`)
  }
}

/**
 * 发送 plugin-message 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendPluginMessage(
  webContents: WebContents,
  data: EventData<'plugin-message'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('plugin-message', data)
    log.debug(`事件已发送: plugin-message`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - plugin-message`)
  }
}

/**
 * 发送 plugin-exit 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendPluginExit(
  webContents: WebContents,
  data: EventData<'plugin-exit'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('plugin-exit', data)
    log.debug(`事件已发送: plugin-exit`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - plugin-exit`)
  }
}

/**
 * 发送 hotkey-updated 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendHotkeyUpdated(
  webContents: WebContents,
  data: EventData<'hotkey-updated'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('hotkey-updated', data)
    log.debug(`事件已发送: hotkey-updated`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - hotkey-updated`)
  }
}

/**
 * 发送 window-all-blur 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendWindowAllBlur(
  webContents: WebContents,
  data: EventData<'window-all-blur'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('window-all-blur', data)
    log.debug(`事件已发送: window-all-blur`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - window-all-blur`)
  }
}

/**
 * 发送 window-main-hide 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendWindowMainHide(
  webContents: WebContents,
  data: EventData<'window-main-hide'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('window-main-hide', data)
    log.debug(`事件已发送: window-main-hide`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - window-main-hide`)
  }
}

/**
 * 发送 window-main-show 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendWindowMainShow(
  webContents: WebContents,
  data: EventData<'window-main-show'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('window-main-show', data)
    log.debug(`事件已发送: window-main-show`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - window-main-show`)
  }
}

/**
 * 发送 global-hotkey-trigger 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendGlobalHotkeyTrigger(
  webContents: WebContents,
  data: EventData<'global-hotkey-trigger'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('global-hotkey-trigger', data)
    log.debug(`事件已发送: global-hotkey-trigger`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - global-hotkey-trigger`)
  }
}

/**
 * 发送 screen-info 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendScreenInfo(
  webContents: WebContents,
  data: EventData<'screen-info'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('screen-info', data)
    log.debug(`事件已发送: screen-info`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - screen-info`)
  }
}

/**
 * 发送 app-blur 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendAppBlur(
  webContents: WebContents,
  data: EventData<'app-blur'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('app-blur', data)
    log.debug(`事件已发送: app-blur`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - app-blur`)
  }
}

/**
 * 发送 app-focus 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendAppFocus(
  webContents: WebContents,
  data: EventData<'app-focus'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('app-focus', data)
    log.debug(`事件已发送: app-focus`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - app-focus`)
  }
}

/**
 * 发送 system-theme-changed 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendSystemThemeChanged(
  webContents: WebContents,
  data: EventData<'system-theme-changed'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('system-theme-changed', data)
    log.debug(`事件已发送: system-theme-changed`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - system-theme-changed`)
  }
}

/**
 * 发送 dev-reload 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function sendDevReload(
  webContents: WebContents,
  data: EventData<'dev-reload'>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('dev-reload', data)
    log.debug(`事件已发送: dev-reload`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - dev-reload`)
  }
}

// 事件发送对象
export const mainEvents = {
  setVisibleInput: sendSetVisibleInput,
  viewEscPressed: sendViewEscPressed,
  viewDetached: sendViewDetached,
  viewRestoreRequested: sendViewRestoreRequested,
  viewReattached: sendViewReattached,
  detachedWindowClosed: sendDetachedWindowClosed,
  detachedWindowInit: sendDetachedWindowInit,
  pluginWindowClosed: sendPluginWindowClosed,
  pluginViewOpened: sendPluginViewOpened,
  pluginViewClosed: sendPluginViewClosed,
  pluginInstalled: sendPluginInstalled,
  pluginUninstalled: sendPluginUninstalled,
  pluginSearch: sendPluginSearch,
  pluginMessage: sendPluginMessage,
  pluginExit: sendPluginExit,
  hotkeyUpdated: sendHotkeyUpdated,
  windowAllBlur: sendWindowAllBlur,
  windowMainHide: sendWindowMainHide,
  windowMainShow: sendWindowMainShow,
  globalHotkeyTrigger: sendGlobalHotkeyTrigger,
  screenInfo: sendScreenInfo,
  appBlur: sendAppBlur,
  appFocus: sendAppFocus,
  systemThemeChanged: sendSystemThemeChanged,
  devReload: sendDevReload
}

// 类型安全的通用发送方法
export function sendEvent<T extends EventType>(
  webContents: WebContents,
  eventType: T,
  data: EventData<T>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send(eventType, data)
    log.debug(`事件已发送: ${eventType}`, { data })
  } else {
    log.warn(`无法发送事件: WebContents已销毁 - ${eventType}`)
  }
}