import type { SettingItem } from "@/typings";

/**
 * 软件设置配置
 * 
 * 此配置定义了应用程序的各种系统设置项
 * 这些设置会在设置页面中渲染，用户可以修改并保存
 * 
 * 注意：
 * - 设置项的 name 字段必须对应 AppConfig 接口中的字段名
 * - 不包括运行时数据（如 recentApps, pinnedApps 等）
 * - 不包括有专门管理页面的配置（如 hotkeys, customHotkeys, pluginSettings 等）
 */

/** 应用设置配置 */
export const appSettingsConfig: Omit<SettingItem, 'type'>[] = [
  {
    id: "app",
    name: "系统设置",
    icon: "⚙️",
    description: "应用程序系统配置",
    settings: [
      {
        name: "autoStart",
        title: "开机自启动",
        description: "开机时自动启动应用程序",
        type: "checkbox",
        defaultValue: false,
      },
      {
        name: "alwaysOnTop",
        title: "窗口置顶",
        description: "保持应用窗口在其他窗口之上",
        type: "checkbox",
        defaultValue: false,
      },
      {
        name: "language",
        title: "界面语言",
        description: "选择应用程序的界面语言",
        type: "select",
        defaultValue: "zh-CN",
        option: {
          options: [
            { label: "简体中文", value: "zh-CN" },
            { label: "English", value: "en-US" },
            { label: "繁體中文", value: "zh-TW" },
          ],
        },
      },
      {
        name: "theme",
        title: "主题模式",
        description: "选择应用程序的主题外观",
        type: "select",
        defaultValue: "light",
        option: {
          options: [
            { label: "浅色", value: "light" },
            { label: "深色", value: "dark" },
          ],
        },
      },
      {
        name: "logLevel",
        title: "日志级别",
        description: "设置应用程序的日志输出级别",
        type: "select",
        defaultValue: "info",
        option: {
          options: [
            { label: "调试", value: "debug" },
            { label: "信息", value: "info" },
            { label: "警告", value: "warn" },
            { label: "错误", value: "error" },
          ],
        },
      },
    ],
  },
];

