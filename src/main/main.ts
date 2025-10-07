/**
 * Electron 主进程入口文件
 * 使用结构化架构和类型安全的 IPC 通信
 */

import { app, shell } from 'electron'
import log from 'electron-log'
import { AppBootstrap } from "./core/AppBootstrap";
import { isProduction } from "@shared/utils";
// import { autoPuppeteerMain } from "@libs/auto-puppeteer/main";

console.log("🚀 主进程启动中...");

// 单实例锁定 - 防止应用多次启动
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  console.log("⚠️ 应用已经在运行，退出当前实例");
  log.info("检测到应用已运行，退出重复实例");
  app.quit()
  process.exit(0)
}

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
  },
  tray: {
    enabled: true
  },
  debug: {
    enabled: !isProduction() // 开发环境启用调试窗口
  }
});

/**
 * 打开日志文件
 */
function openLogFile() {
  try {
    const logPath = log.transports.file.getFile().path
    console.log('打开日志文件:', logPath)
    shell.openPath(logPath).catch((error) => {
      console.error('打开日志文件失败:', error)
    })
  } catch (error) {
    console.error('获取日志文件路径失败:', error)
  }
}

// 初始化应用
appBootstrap
  .start()
  .then(() => {
    console.log("✅ 应用启动完成");
  })
  .catch((error) => {
    console.error("❌ 应用启动失败:", error);
    log.error("应用启动失败:", error);

    // 在生产环境中，启动失败时自动打开日志文件
    if (isProduction()) {
      openLogFile();
      // 延迟退出，确保日志文件被打开
      setTimeout(() => {
        appBootstrap.cleanup();
        process.exit(1);
      }, 1500);
    } else {
      appBootstrap.cleanup();
      process.exit(1);
    }
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
  getTrayService: () => appBootstrap.getService('trayService'),
  getDebugService: () => appBootstrap.getService('debugService'),
  cleanup: () => appBootstrap.cleanup()
};
