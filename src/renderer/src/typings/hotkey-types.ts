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
  global: HotkeyConfig;
  /** 应用内快捷键分组 */
  application: HotkeyConfig;
}

// 快捷键管理器接口
export interface IHotkeyManager {
  register(config: HotkeyConfig): Promise<boolean>;
  unregister(id: string): Promise<boolean>;
  toggle(id: string, enabled?: boolean): Promise<boolean>;
  setScope(scope: string): void;
  getAll(): HotkeyConfig[];
  getByType(type: HotkeyType): HotkeyConfig[];
  clear(): Promise<void>;
  clearByType(type: HotkeyType): Promise<void>;
  restoreGlobalHotkeysFromCache(): Promise<boolean>;
  destroy(): Promise<void>;
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

// 快捷键事件管理器接口
export interface HotkeyEventManager {
  addListener(eventType: HotkeyEventType, listener: HotkeyEventListener): void;
  removeListener(eventType: HotkeyEventType, listener: HotkeyEventListener): void;
}

// Electron快捷键管理器接口
export interface IElectronHotkeys {
  isElectronAvailable: any; // 使用any避免ref类型问题
  globalHotkeys: any; // 使用any避免ref类型问题
  registerGlobalHotkey(
    keys: string,
    callbackFn: () => void,
    options?: Partial<HotkeyConfig>
  ): Promise<boolean>;
  unregisterGlobalHotkey(id: string): Promise<boolean>;
  getAllGlobalHotkeys(): HotkeyConfig[];
  clearAllGlobalHotkeys(): Promise<boolean>;
  isGlobalHotkeyRegistered(keys: string): Promise<boolean>;
  normalizeElectronKeys(keys: string): string;
  checkElectronAvailability(): boolean;
}
