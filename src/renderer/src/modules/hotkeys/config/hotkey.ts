import { HotkeyType } from "@/typings/hotkey-types";
import type { HotkeySettingsConfig } from "@/typings/hotkey-types";

// 快捷键配置
export const hotkeyConfig: HotkeySettingsConfig = {
  global: [
    {
      id: "global_show_window",
      keys: "ctrl+shift+space",
      type: HotkeyType.GLOBAL,
      name: "显示/隐藏窗口",
      description: "按下此快捷键可以显示或隐藏应用程序窗口",
      enabled: true,
    },
  ],
  application: [
    {
      id: "app_focus_search",
      keys: "ctrl+k",
      type: HotkeyType.APPLICATION,
      name: "聚焦搜索框",
      description: "快速将焦点移动到搜索输入框",
      enabled: true,
    },
    {
      id: "app_close_window",
      keys: "escape",
      type: HotkeyType.APPLICATION,
      name: "关闭窗口",
      description: "快速关闭应用程序窗口",
      enabled: true,
    },
  ],
};
