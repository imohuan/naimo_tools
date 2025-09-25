// 翻译插件配置文件
module.exports = {
  "text-translate": {
    name: "文本翻译",
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
  "quick-translate": {
    name: "快速翻译",
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
          naimo.router.logError("请先配置腾讯云API密钥");
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
};
