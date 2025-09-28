/**
 * Electron 主进程入口文件
 * 使用结构化架构和类型安全的 IPC 通信
 */

import { AppBootstrap } from "./core/AppBootstrap";
import { isProduction } from "@shared/utils";
// import { autoPuppeteerMain } from "@libs/auto-puppeteer/main";

console.log("🚀 主进程启动中...");

// 创建应用启动器
const appBootstrap = new AppBootstrap({
  core: {
    enableIconWorker: true,
    tempDirCleanup: true
  },
  error: {
    showDialog: !isProduction(), // 开发环境显示错误对话框
    enableReporting: true
  },
  update: {
    enabled: isProduction(), // 仅在生产环境启用自动更新
    repo: 'imohuan/electron-vue3-template',
    updateInterval: '1 hour'
  },
  window: {
    mainWindow: {
      width: 800,
      height: 600,
      centerY: 200
    },
    download: {
      enableDownloadWindow: true
    }
  }
});

// 初始化应用
appBootstrap
  .start()
  .then(() => {
    console.log("✅ 应用启动完成");
  })
  .catch((error) => {
    console.error("❌ 应用启动失败:", error);
    appBootstrap.cleanup();
    process.exit(1);
  });

// 确保在进程退出时调用清理
process.on('exit', () => {
  console.log("进程退出，执行清理...");
  appBootstrap.cleanup();
});

// 导出应用启动器实例，供其他模块使用
export { appBootstrap };

// 兼容性导出 - 为了不破坏现有代码
export const appService = {
  getMainWindow: () => appBootstrap.getService('windowService')?.getMainWindow(),
  getWindowManager: () => appBootstrap.getService('windowService')?.getWindowManager(),
  getConfigManager: () => appBootstrap.getService('configManager'),
  getDownloadWindow: () => appBootstrap.getService('windowService')?.getDownloadWindow(),
  cleanup: () => appBootstrap.cleanup()
};
