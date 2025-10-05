import { HotkeyType } from "@/temp_code/typings/hotkey";
import type { HotkeySettingsConfig } from "@/temp_code/typings/hotkey";

/**
 * 默认快捷键配置
 * 
 * 此配置在应用首次启动时加载，或在存储的配置为空时使用。
 * 用户可以在设置中修改这些快捷键，修改后的配置会保存到本地存储。
 */
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
    // {
    //   id: "app_close_window",
    //   keys: "escape",
    //   type: HotkeyType.APPLICATION,
    //   name: "关闭窗口",
    //   description: "快速关闭应用程序窗口",
    //   enabled: true,
    // },
  ],
};
