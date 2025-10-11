/**
 * 自动生成的事件类型定义
 * 生成时间: 2025-10-11T07:51:51.059Z
 * 请勿手动修改此文件
 */

import type { EventsConfig, EventData } from '@shared/config/eventsConfig'

// 事件接口定义
interface EventInterface {
  /** 监听 set-visible-input 事件 */
  "set-visible-input": (handler: (event: any, data: EventData<'set-visible-input'>) => void) => () => void;
  /** 监听 set-visible-input 事件 */
  "onSetVisibleInput": (handler: (event: any, data: EventData<'set-visible-input'>) => void) => () => void;

  /** 监听 view-esc-pressed 事件 */
  "view-esc-pressed": (handler: (event: any, data: EventData<'view-esc-pressed'>) => void) => () => void;
  /** 监听 view-esc-pressed 事件 */
  "onViewEscPressed": (handler: (event: any, data: EventData<'view-esc-pressed'>) => void) => () => void;

  /** 监听 view-detached 事件 */
  "view-detached": (handler: (event: any, data: EventData<'view-detached'>) => void) => () => void;
  /** 监听 view-detached 事件 */
  "onViewDetached": (handler: (event: any, data: EventData<'view-detached'>) => void) => () => void;

  /** 监听 view-restore-requested 事件 */
  "view-restore-requested": (handler: (event: any, data: EventData<'view-restore-requested'>) => void) => () => void;
  /** 监听 view-restore-requested 事件 */
  "onViewRestoreRequested": (handler: (event: any, data: EventData<'view-restore-requested'>) => void) => () => void;

  /** 监听 view-reattached 事件 */
  "view-reattached": (handler: (event: any, data: EventData<'view-reattached'>) => void) => () => void;
  /** 监听 view-reattached 事件 */
  "onViewReattached": (handler: (event: any, data: EventData<'view-reattached'>) => void) => () => void;

  /** 监听 detached-window-closed 事件 */
  "detached-window-closed": (handler: (event: any, data: EventData<'detached-window-closed'>) => void) => () => void;
  /** 监听 detached-window-closed 事件 */
  "onDetachedWindowClosed": (handler: (event: any, data: EventData<'detached-window-closed'>) => void) => () => void;

  /** 监听 detached-window-init 事件 */
  "detached-window-init": (handler: (event: any, data: EventData<'detached-window-init'>) => void) => () => void;
  /** 监听 detached-window-init 事件 */
  "onDetachedWindowInit": (handler: (event: any, data: EventData<'detached-window-init'>) => void) => () => void;

  /** 监听 plugin-window-closed 事件 */
  "plugin-window-closed": (handler: (event: any, data: EventData<'plugin-window-closed'>) => void) => () => void;
  /** 监听 plugin-window-closed 事件 */
  "onPluginWindowClosed": (handler: (event: any, data: EventData<'plugin-window-closed'>) => void) => () => void;

  /** 监听 plugin-view-opened 事件 */
  "plugin-view-opened": (handler: (event: any, data: EventData<'plugin-view-opened'>) => void) => () => void;
  /** 监听 plugin-view-opened 事件 */
  "onPluginViewOpened": (handler: (event: any, data: EventData<'plugin-view-opened'>) => void) => () => void;

  /** 监听 plugin-view-closed 事件 */
  "plugin-view-closed": (handler: (event: any, data: EventData<'plugin-view-closed'>) => void) => () => void;
  /** 监听 plugin-view-closed 事件 */
  "onPluginViewClosed": (handler: (event: any, data: EventData<'plugin-view-closed'>) => void) => () => void;

  /** 监听 plugin-installed 事件 */
  "plugin-installed": (handler: (event: any, data: EventData<'plugin-installed'>) => void) => () => void;
  /** 监听 plugin-installed 事件 */
  "onPluginInstalled": (handler: (event: any, data: EventData<'plugin-installed'>) => void) => () => void;

  /** 监听 plugin-uninstalled 事件 */
  "plugin-uninstalled": (handler: (event: any, data: EventData<'plugin-uninstalled'>) => void) => () => void;
  /** 监听 plugin-uninstalled 事件 */
  "onPluginUninstalled": (handler: (event: any, data: EventData<'plugin-uninstalled'>) => void) => () => void;

  /** 监听 plugin-search 事件 */
  "plugin-search": (handler: (event: any, data: EventData<'plugin-search'>) => void) => () => void;
  /** 监听 plugin-search 事件 */
  "onPluginSearch": (handler: (event: any, data: EventData<'plugin-search'>) => void) => () => void;

  /** 监听 plugin-message 事件 */
  "plugin-message": (handler: (event: any, data: EventData<'plugin-message'>) => void) => () => void;
  /** 监听 plugin-message 事件 */
  "onPluginMessage": (handler: (event: any, data: EventData<'plugin-message'>) => void) => () => void;

  /** 监听 plugin-exit 事件 */
  "plugin-exit": (handler: (event: any, data: EventData<'plugin-exit'>) => void) => () => void;
  /** 监听 plugin-exit 事件 */
  "onPluginExit": (handler: (event: any, data: EventData<'plugin-exit'>) => void) => () => void;

  /** 监听 hotkey-updated 事件 */
  "hotkey-updated": (handler: (event: any, data: EventData<'hotkey-updated'>) => void) => () => void;
  /** 监听 hotkey-updated 事件 */
  "onHotkeyUpdated": (handler: (event: any, data: EventData<'hotkey-updated'>) => void) => () => void;

  /** 监听 window-all-blur 事件 */
  "window-all-blur": (handler: (event: any, data: EventData<'window-all-blur'>) => void) => () => void;
  /** 监听 window-all-blur 事件 */
  "onWindowAllBlur": (handler: (event: any, data: EventData<'window-all-blur'>) => void) => () => void;

  /** 监听 window-main-hide 事件 */
  "window-main-hide": (handler: (event: any, data: EventData<'window-main-hide'>) => void) => () => void;
  /** 监听 window-main-hide 事件 */
  "onWindowMainHide": (handler: (event: any, data: EventData<'window-main-hide'>) => void) => () => void;

  /** 监听 window-main-show 事件 */
  "window-main-show": (handler: (event: any, data: EventData<'window-main-show'>) => void) => () => void;
  /** 监听 window-main-show 事件 */
  "onWindowMainShow": (handler: (event: any, data: EventData<'window-main-show'>) => void) => () => void;

  /** 监听 global-hotkey-trigger 事件 */
  "global-hotkey-trigger": (handler: (event: any, data: EventData<'global-hotkey-trigger'>) => void) => () => void;
  /** 监听 global-hotkey-trigger 事件 */
  "onGlobalHotkeyTrigger": (handler: (event: any, data: EventData<'global-hotkey-trigger'>) => void) => () => void;

  /** 监听 screen-info 事件 */
  "screen-info": (handler: (event: any, data: EventData<'screen-info'>) => void) => () => void;
  /** 监听 screen-info 事件 */
  "onScreenInfo": (handler: (event: any, data: EventData<'screen-info'>) => void) => () => void;

  /** 监听 app-blur 事件 */
  "app-blur": (handler: (event: any, data: EventData<'app-blur'>) => void) => () => void;
  /** 监听 app-blur 事件 */
  "onAppBlur": (handler: (event: any, data: EventData<'app-blur'>) => void) => () => void;

  /** 监听 app-focus 事件 */
  "app-focus": (handler: (event: any, data: EventData<'app-focus'>) => void) => () => void;
  /** 监听 app-focus 事件 */
  "onAppFocus": (handler: (event: any, data: EventData<'app-focus'>) => void) => () => void;

  /** 监听 system-theme-changed 事件 */
  "system-theme-changed": (handler: (event: any, data: EventData<'system-theme-changed'>) => void) => () => void;
  /** 监听 system-theme-changed 事件 */
  "onSystemThemeChanged": (handler: (event: any, data: EventData<'system-theme-changed'>) => void) => () => void;

  /** 监听 dev-reload 事件 */
  "dev-reload": (handler: (event: any, data: EventData<'dev-reload'>) => void) => () => void;
  /** 监听 dev-reload 事件 */
  "onDevReload": (handler: (event: any, data: EventData<'dev-reload'>) => void) => () => void;
}
// 事件信息常量
export const EVENT_INFO = [
  {
    name: "set-visible-input",
    comment: "监听 set-visible-input 事件",
    method: "onSetVisibleInput"
  },
  {
    name: "view-esc-pressed",
    comment: "监听 view-esc-pressed 事件",
    method: "onViewEscPressed"
  },
  {
    name: "view-detached",
    comment: "监听 view-detached 事件",
    method: "onViewDetached"
  },
  {
    name: "view-restore-requested",
    comment: "监听 view-restore-requested 事件",
    method: "onViewRestoreRequested"
  },
  {
    name: "view-reattached",
    comment: "监听 view-reattached 事件",
    method: "onViewReattached"
  },
  {
    name: "detached-window-closed",
    comment: "监听 detached-window-closed 事件",
    method: "onDetachedWindowClosed"
  },
  {
    name: "detached-window-init",
    comment: "监听 detached-window-init 事件",
    method: "onDetachedWindowInit"
  },
  {
    name: "plugin-window-closed",
    comment: "监听 plugin-window-closed 事件",
    method: "onPluginWindowClosed"
  },
  {
    name: "plugin-view-opened",
    comment: "监听 plugin-view-opened 事件",
    method: "onPluginViewOpened"
  },
  {
    name: "plugin-view-closed",
    comment: "监听 plugin-view-closed 事件",
    method: "onPluginViewClosed"
  },
  {
    name: "plugin-installed",
    comment: "监听 plugin-installed 事件",
    method: "onPluginInstalled"
  },
  {
    name: "plugin-uninstalled",
    comment: "监听 plugin-uninstalled 事件",
    method: "onPluginUninstalled"
  },
  {
    name: "plugin-search",
    comment: "监听 plugin-search 事件",
    method: "onPluginSearch"
  },
  {
    name: "plugin-message",
    comment: "监听 plugin-message 事件",
    method: "onPluginMessage"
  },
  {
    name: "plugin-exit",
    comment: "监听 plugin-exit 事件",
    method: "onPluginExit"
  },
  {
    name: "hotkey-updated",
    comment: "监听 hotkey-updated 事件",
    method: "onHotkeyUpdated"
  },
  {
    name: "window-all-blur",
    comment: "监听 window-all-blur 事件",
    method: "onWindowAllBlur"
  },
  {
    name: "window-main-hide",
    comment: "监听 window-main-hide 事件",
    method: "onWindowMainHide"
  },
  {
    name: "window-main-show",
    comment: "监听 window-main-show 事件",
    method: "onWindowMainShow"
  },
  {
    name: "global-hotkey-trigger",
    comment: "监听 global-hotkey-trigger 事件",
    method: "onGlobalHotkeyTrigger"
  },
  {
    name: "screen-info",
    comment: "监听 screen-info 事件",
    method: "onScreenInfo"
  },
  {
    name: "app-blur",
    comment: "监听 app-blur 事件",
    method: "onAppBlur"
  },
  {
    name: "app-focus",
    comment: "监听 app-focus 事件",
    method: "onAppFocus"
  },
  {
    name: "system-theme-changed",
    comment: "监听 system-theme-changed 事件",
    method: "onSystemThemeChanged"
  },
  {
    name: "dev-reload",
    comment: "监听 dev-reload 事件",
    method: "onDevReload"
  }
];
// 合并所有事件接口类型
export interface AllEventRouter extends EventInterface {}

// 事件信息类型
export interface EventInfo {
  name: string;
  comment: string;
  method: string;
}

// 事件键类型
export type EventKey = keyof AllEventRouter;

// 获取事件处理器类型
export type EventHandlerType<T extends EventKey> = AllEventRouter[T] extends (handler: infer H) => void ? H : never;
