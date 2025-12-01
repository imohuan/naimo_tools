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
export const appSettingsConfig: Omit<SettingItem, "type">[] = [
  {
    id: "app",
    name: "系统设置",
    icon: "!/logo.ico",
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
        name: "showExtensionList",
        title: "显示扩展列表",
        description: "在搜索界面中显示扩展应用列表",
        type: "checkbox",
        defaultValue: true,
      },
      {
        name: "showApplicationList",
        title: "显示应用列表",
        description: "在搜索界面中显示应用列表",
        type: "checkbox",
        defaultValue: true,
      },
      {
        name: "httpServer",
        title: "HTTP 服务器",
        description:
          "配置本地 HTTP 服务器，用于提供静态文件服务。可以设置端口号、启用/禁用服务，并测试服务器连接。",
        // 自定义类型，由 HttpServerSetting 组件进行特殊渲染
        wrap: true,
        type: "httpServer",
        defaultValue: {
          enabled: false,
          port: 8080,
        },
      },
      {
        name: "autoMirrorAccess",
        title: "自动镜像访问",
        description:
          "在访问 GitHub 相关资源时，自动检测并选择可用且最快的镜像（若官方可用则优先使用官方）",
        type: "checkbox",
        defaultValue: false,
      },
      {
        name: "mirrorUrls",
        title: "GitHub 镜像列表",
        description:
          "配置 GitHub 访问镜像的 URL。支持前缀模式（在原始URL前添加前缀）和基础模式（直接使用完整URL模板）。",
        // 自定义类型，由 MirrorUrlsSetting 组件进行特殊渲染
        wrap: true,
        type: "mirrorUrls",
        defaultValue: [],
      },
      // https://ghfast.top/https://github.com/imohuan/vueflow-workflow/archive/refs/heads/main.zip
      // https://ghfast.top/https://github.com/imohuan/naimo_tools/archive/refs/heads/main.zip
      // {
      //   name: "alwaysOnTop",
      //   title: "窗口置顶",
      //   description: "保持应用窗口在其他窗口之上",
      //   type: "checkbox",
      //   defaultValue: false,
      // },
      // {
      //   name: "language",
      //   title: "界面语言",
      //   description: "选择应用程序的界面语言",
      //   type: "select",
      //   defaultValue: "zh-CN",
      //   option: {
      //     options: [
      //       { label: "简体中文", value: "zh-CN" },
      //       { label: "English", value: "en-US" },
      //       { label: "繁體中文", value: "zh-TW" },
      //     ],
      //   },
      // },
      // {
      //   name: "theme",
      //   title: "主题模式",
      //   description: "选择应用程序的主题外观",
      //   type: "select",
      //   defaultValue: "light",
      //   option: {
      //     options: [
      //       { label: "浅色", value: "light" },
      //       { label: "深色", value: "dark" },
      //     ],
      //   },
      // },
      // {
      //   name: "logLevel",
      //   title: "日志级别",
      //   description: "设置应用程序的日志输出级别",
      //   type: "select",
      //   defaultValue: "info",
      //   option: {
      //     options: [
      //       { label: "调试", value: "debug" },
      //       { label: "信息", value: "info" },
      //       { label: "警告", value: "warn" },
      //       { label: "错误", value: "error" },
      //     ],
      //   },
      // },
    ],
  },
];
