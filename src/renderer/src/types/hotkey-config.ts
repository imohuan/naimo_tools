import { HotkeyType } from "./hotkey-types";

// App快捷键通过id判断唯一，如果重复直接覆盖
// Global快捷键通过keys判断唯一，如果重复则失败

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
  /** 快捷键触发回调函数键名 */
  callback: string;
}

// 快捷键分组配置
export interface HotkeyGroup {
  /** 分组ID */
  id: string;
  /** 分组名称 */
  name: string;
  /** 分组描述 */
  description: string;
  /** 是否启用整个分组 */
  enabled: boolean;
  /** 快捷键列表 */
  hotkeys: HotkeyConfig[];
}

// 快捷键设置配置
export interface HotkeySettingsConfig {
  /** 全局快捷键分组 */
  global: HotkeyGroup;
  /** 应用内快捷键分组 */
  application: HotkeyGroup;
}
