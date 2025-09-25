// 翻译插件配置文件
module.exports = {
  // 插件基本信息
  id: "translate-plugin",
  name: "智能翻译",
  description: "基于腾讯云API的智能翻译工具，支持多种语言互译",
  version: "1.0.0",
  author: "Naimo Tools",
  icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="20" height="20" rx="4" fill="#10B981"/>
    <path d="M6 7h8M6 11h6M6 15h4" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M14 13l2 2-2 2" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  category: "ai_artificial_intelligence",
  enabled: true,

  // 插件项目列表
  items: [
    {
      name: "文本翻译",
      path: "text-translate",
      icon: "🌐",
      description: "智能文本翻译工具",
      weight: 100,
      executeType: 3, // SHOW_WEBPAGE
      anonymousSearchFields: ["imohuan_translate_text"],
      onEnter: async (params, api) => {
        try {
          // 打开翻译界面
          api.openWebPageWindow(api.getResourcePath("index.html"), {
            preload: api.getResourcePath("preload.js")
          });
        } catch (error) {
          console.error("翻译插件启动失败:", error);
          naimo.log.logError(`翻译插件启动失败: ${error.message}`);
        }
      }
    },
    {
      name: "快速翻译",
      path: "quick-translate",
      icon: "⚡",
      description: "快速翻译选中文本",
      weight: 90,
      showInModes: ["attachment"], // 在附件模式下显示
      onSearch: (text, files) => {
        // 检查是否有文本文件
        return files.some(file => /\.(txt|md|log|csv)$/i.test(file.name)) || text.trim().length > 0;
      },
      onEnter: async (params, api) => {
        try {
          const settings = await api.getSettingValue();
          if (!settings.secretId || !settings.secretKey) {
            console.error("请先配置腾讯云API密钥");
            naimo.log.logError("请先配置腾讯云API密钥");
            return;
          }

          // 获取要翻译的文本
          let textToTranslate = params.searchText || "";

          if (params.files && params.files.length > 0) {
            // 如果有文件，读取文件内容
            const textFiles = params.files.filter(file =>
              /\.(txt|md|log|csv)$/i.test(file.name)
            );

            if (textFiles.length > 0) {
              try {
                const fileContent = await naimo.router.filesystemReadFile(textFiles[0].path);
                textToTranslate = fileContent.substring(0, 1000); // 限制文本长度
              } catch (error) {
                console.error("读取文件失败:", error);
              }
            }
          }

          if (textToTranslate.trim()) {
            // 打开翻译界面并传递文本
            api.openWebPageWindow(api.getResourcePath("index.html"), {
              preload: api.getResourcePath("preload.js"),
              additionalArguments: [`--translate-text=${encodeURIComponent(textToTranslate)}`]
            });
          } else {
            // 打开空的翻译界面
            api.openWebPageWindow(api.getResourcePath("index.html"), {
              preload: api.getResourcePath("preload.js")
            });
          }
        } catch (error) {
          console.error("快速翻译失败:", error);
          naimo.router.logError(`快速翻译失败: ${error.message}`);
        }
      }
    }
  ],

  options: {
    autoStart: false,
    showInMenu: true,
    maxItems: 10
  },

  // 插件设置配置
  settings: [
    {
      name: "secretId",
      title: "腾讯云 Secret ID",
      description: "请输入您的腾讯云API Secret ID",
      type: "input",
      defaultValue: "",
      required: true
    },
    {
      name: "secretKey",
      title: "腾讯云 Secret Key",
      description: "请输入您的腾讯云API Secret Key",
      type: "password",
      defaultValue: "",
      required: true
    },
    {
      name: "region",
      title: "服务区域",
      description: "选择腾讯云服务区域",
      type: "select",
      defaultValue: "ap-chengdu",
      option: {
        options: [
          { label: "成都", value: "ap-chengdu" },
          { label: "北京", value: "ap-beijing" },
          { label: "上海", value: "ap-shanghai" },
          { label: "广州", value: "ap-guangzhou" },
          { label: "香港", value: "ap-hongkong" },
          { label: "新加坡", value: "ap-singapore" },
          { label: "东京", value: "ap-tokyo" }
        ]
      }
    },
  ],

  // 插件元数据
  metadata: {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    installedAt: Date.now()
  }
};
