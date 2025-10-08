const { contextBridge } = require("electron");

// ==================== 功能处理器导出 ====================

module.exports = {
  "api-test": {
    onEnter: async (params, api) => {
      console.log("API 测试插件被触发");
      console.log("参数:", params);
      // 窗口会自动打开 main 指定的页面
    },
  },
};

// ==================== 初始化 ====================

window.addEventListener("DOMContentLoaded", () => {
  console.log("API 测试插件 Preload 脚本已初始化");
});

