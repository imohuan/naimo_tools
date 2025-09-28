// 快捷键类型定义
export enum HotkeyType {
  /** 全局快捷键（Electron） */
  GLOBAL = "global",
  /** 应用内快捷键 */
  APPLICATION = "application",
}

// 快捷键配置接口
export interface HotkeyConfig {
  /** 快捷键唯一标识 */
  id: string;
  /** 快捷键组合，如 "ctrl+space" */
  keys: string;
  /** 快捷键类型 */
  type: HotkeyType;
  /** 快捷键名称 */
  name?: string;
  /** 快捷键描述 */
  description?: string;
  /** 快捷键分组 */
  group?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 是否阻止默认事件 */
  preventDefault?: boolean;
  /** 是否阻止事件冒泡 */
  stopPropagation?: boolean;
  /** 快捷键作用域 */
  scope?: string;
}

// 快捷键设置配置
export interface HotkeySettingsConfig {
  /** 全局快捷键分组 */
  global: HotkeyConfig[];
  /** 应用内快捷键分组 */
  application: HotkeyConfig[];
}

// 快捷键触发事件详情
export interface HotkeyTriggeredEventDetail {
  /** 快捷键ID */
  id: string;
  /** 快捷键组合 */
  keys: string;
  /** 快捷键配置 */
  config: HotkeyConfig;
  /** 原始键盘事件（仅应用内快捷键有） */
  originalEvent?: KeyboardEvent;
}

// 快捷键事件类型
export type HotkeyEventType = 'hotkey-triggered' | 'app-hotkey-triggered';

// 快捷键事件监听器接口
export interface HotkeyEventListener {
  (event: CustomEvent<HotkeyTriggeredEventDetail>): void;
}
