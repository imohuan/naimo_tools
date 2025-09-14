import { HotkeyType } from "../types/hotkey-types";
import type { HotkeySettingsConfig } from "../types/hotkey-config";

// 快捷键回调函数注册表
const callbackRegistry: Record<string, () => void> = {};

// 快捷键回调函数
const showHideWindow = () => {
  console.log("🎉 全局快捷键：显示/隐藏窗口");
  console.log("当前窗口ID:", window.id);
  if (api?.ipcRouter?.windowToggleShow) {
    api.ipcRouter.windowToggleShow(window.id!);
  } else {
    console.error("❌ api.ipcRouter.windowToggleShow 不可用");
  }
};

const focusSearch = () => {
  console.log("应用内快捷键：聚焦搜索框");
  // TODO: 实现聚焦搜索框逻辑
};

const closeWindow = () => {
  console.log("应用内快捷键：关闭窗口");
  // TODO: 实现关闭窗口逻辑
};

// 注册回调函数
const registerCallbacks = () => {
  callbackRegistry.showHideWindow = showHideWindow;
  callbackRegistry.focusSearch = focusSearch;
  callbackRegistry.closeWindow = closeWindow;
};

// 初始化注册
registerCallbacks();

// 获取回调函数
export const getCallback = (key: string): (() => void) | undefined => {
  const callback = callbackRegistry[key];
  console.log(`🔍 查找回调函数: ${key}`, callback !== undefined ? "✅ 找到" : "❌ 未找到");
  console.log("当前注册的回调函数:", Object.keys(callbackRegistry));
  return callback;
};

// 设置回调函数
export const setCallback = (key: string, callback: () => void) => {
  callbackRegistry[key] = callback;
};

// 获取所有可用的回调函数键
export const getAvailableCallbackKeys = (): string[] => {
  return Object.keys(callbackRegistry);
};

// 快捷键配置
export const hotkeyConfig: HotkeySettingsConfig = {
  global: {
    id: "global",
    name: "全局快捷键",
    description: "设置用于显示/隐藏应用程序窗口的全局快捷键",
    enabled: true,
    hotkeys: [
      {
        id: "global_show_window",
        keys: "ctrl+shift+space",
        type: HotkeyType.GLOBAL,
        name: "显示/隐藏窗口",
        description: "按下此快捷键可以显示或隐藏应用程序窗口",
        group: "global",
        enabled: true,
        callback: "showHideWindow",
      },
    ],
  },
  application: {
    id: "application",
    name: "应用内快捷键",
    description: "设置应用程序内部的快捷键，仅在应用程序获得焦点时生效",
    enabled: true,
    hotkeys: [
      {
        id: "app_focus_search",
        keys: "ctrl+k",
        type: HotkeyType.APPLICATION,
        name: "聚焦搜索框",
        description: "快速将焦点移动到搜索输入框",
        group: "application",
        enabled: true,
        callback: "focusSearch",
      },
      {
        id: "app_close_window",
        keys: "escape",
        type: HotkeyType.APPLICATION,
        name: "关闭窗口",
        description: "快速关闭应用程序窗口",
        group: "application",
        enabled: true,
        callback: "closeWindow",
      },
    ],
  },
};
