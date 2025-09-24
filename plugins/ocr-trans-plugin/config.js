module.exports = {
  // 基本信息
  id: "ocr-trans-plugin",
  name: "OCR翻译识别",
  description: "智能截图识别文字并翻译，支持多种语言互译",
  version: "1.0.0",
  author: "Naimo Tools",
  icon: "📷",
  category: "ai_artificial_intelligence",
  enabled: true,

  // 功能项目列表
  items: [
    {
      name: "OCR翻译",
      path: "ocr-translate",
      icon: "🔍",
      description: "截图识别文字并翻译",
      weight: 100,
      executeType: 3, // SHOW_WEBPAGE
      anonymousSearchFields: ["imohuan_ocr_translate"],
      onEnter: (params, api) => {
        // 打开OCR翻译工具窗口
        api.openWebPageWindow(api.getResourcePath("index.html"), {
          preload: api.getResourcePath("preload.js"),
        });
      },
    },
    {
      name: "快速截图识别",
      path: "quick-ocr",
      icon: "⚡",
      description: "快速截图并识别文字",
      weight: 90,
      showInModes: ["normal", "plugin"],
      onEnter: async (params, api) => {
        try {
          // 隐藏主窗口输入框
          api.toggleInput(false);

          // 延迟一下确保窗口隐藏
          setTimeout(async () => {
            // 打开OCR窗口并自动开始截图
            const window = await api.openWebPageWindow(api.getResourcePath("index.html"), {
              preload: api.getResourcePath("preload.js"),
            });

            // 通知窗口自动开始截图
            setTimeout(() => {
              if (window && window.webContents) {
                window.webContents.send('auto-start-screenshot');
              }
            }, 1000);
          }, 300);
        } catch (error) {
          console.error("启动快速截图失败:", error);
          api.ipcRouter.logError(`OCR插件错误: ${error.message}`);
        }
      },
    },
  ],

  // 插件选项
  options: {
    autoStart: false,
    showInMenu: true,
    maxItems: 10,
  },

  // 设置配置
  settings: [
    {
      name: "tencentSecretId",
      title: "腾讯云Secret ID",
      description: "腾讯云API密钥ID（用于OCR和翻译服务）",
      type: "input",
      defaultValue: "",
      required: true,
    },
    {
      name: "tencentSecretKey",
      title: "腾讯云Secret Key",
      description: "腾讯云API密钥Key",
      type: "password",
      defaultValue: "",
      required: true,
    },
  ],
};
