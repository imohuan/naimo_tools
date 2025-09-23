// 示例插件配置文件
// 这个文件定义了插件的基本信息和功能

module.exports = {
  // 插件基本信息
  id: "example-plugin",
  name: "示例插件",
  description: "这是一个示例插件，展示了插件的基本结构和最新功能",
  version: "1.0.0",
  author: "Naimo Tools",
  icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="20" height="20" rx="4" fill="#6366F1"/>
    <path d="M6 10.5L9 13.5L14 7.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  category: "other",
  enabled: true,

  // 插件项目列表
  items: [
    {
      // 插件项目基本信息
      name: "打开记事本1",
      path: "notepad.exe",
      icon: "data:image/x-icon;base64,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",
      description: "打开系统记事本应用",
      weight: 100,
      onEnter: (params, api) => {
        api.ipcRouter.appLaunchApp("C:\\Windows\\System32\\notepad.exe")
      }
    },
    {
      name: "打开网页",
      path: "123dfda",
      icon: "📝",
      description: "打开系统记事本应用",
      weight: 100,
      onEnter: async (params, api) => {
        // console.log(1111111, '打开网页', params, api);
        console.log("getSettingValue", await api.getSettingValue());
        api.openWebPageWindow("E:\\Code\\Git\\naimo_tools\\plugins\\example-plugin\\index.html", {
          preload: "E:\\Code\\Git\\naimo_tools\\plugins\\example-plugin\\preload.js"
        })
        // api.ipcRouter.windowCreateWebPageWindow(window.id!, "https://www.baidu.com")
      }
    },
  ],

  options: {
    autoStart: false,
    showInMenu: true,
    maxItems: 10
  },

  // 插件设置配置
  settings: [
    {
      name: "themeColor",
      title: "主题颜色",
      description: "选择您喜欢的主题颜色",
      type: "color",
      defaultValue: "#3b82f6"
    },
    {
      name: "autoStart",
      title: "自动启动",
      description: "是否在应用启动时自动运行此插件",
      type: "checkbox",
      defaultValue: false
    },
    {
      name: "maxItems",
      title: "最大项目数",
      description: "设置插件显示的最大项目数量",
      type: "number",
      defaultValue: 10,
      required: true
    },
    {
      name: "displayMode",
      title: "显示模式",
      description: "选择插件的显示模式",
      type: "select",
      defaultValue: "grid"
    },
    {
      name: "description",
      title: "描述信息",
      description: "输入插件的详细描述",
      type: "textarea",
      defaultValue: "这是一个示例插件的描述信息"
    }
  ],

  // 插件元数据
  metadata: {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    installedAt: Date.now()
  }
};
