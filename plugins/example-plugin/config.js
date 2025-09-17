// 示例插件配置文件
// 这个文件定义了插件的基本信息和功能

module.exports = {
  // 插件基本信息
  id: "example-plugin",
  name: "示例插件",
  description: "这是一个示例插件，展示了插件的基本结构",
  version: "1.0.0",
  author: "Naimo Tools",
  icon: "🔌",
  category: "other",
  enabled: true,

  // 插件项目列表
  items: [
    {
      // 插件项目基本信息
      pluginId: "example-plugin",
      name: "打开记事本",
      path: "notepad.exe",
      icon: "📝",
      description: "打开系统记事本应用",
      visible: true,
      weight: 100,

      // 执行类型和参数
      executeType: 1, // PluginExecuteType.OPEN_APP
      executeParams: {}
    },
    {
      pluginId: "example-plugin",
      name: "打开百度",
      path: "https://www.baidu.com",
      icon: "🌐",
      description: "在浏览器中打开百度首页",
      visible: true,
      weight: 90,

      executeType: 3, // PluginExecuteType.SHOW_WEBPAGE
      executeParams: {
        url: "https://www.baidu.com",
        closeAction: "hide",
        enableSearch: true
      }
    },
    {
      pluginId: "example-plugin",
      name: "自定义代码示例",
      path: "custom-code-example",
      icon: "⚡",
      description: "执行自定义JavaScript代码",
      visible: true,
      weight: 80,

      executeType: 4, // PluginExecuteType.CUSTOM_CODE
      executeParams: {
        code: `
          // 自定义代码示例
          console.log("Hello from plugin!");
          
          // 可以访问 api 对象来调用主进程功能
          // 例如：api.ipcRouter.appGetVersion()
          
          // 显示一个简单的提示
          alert("这是来自插件的自定义代码！");
        `
      }
    }
  ],

  // 插件配置选项
  options: {
    autoStart: false,
    showInMenu: true,
    maxItems: 10
  },

  // 插件元数据
  metadata: {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    installedAt: Date.now()
  }
};
