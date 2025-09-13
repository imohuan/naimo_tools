import { app, BrowserWindow, autoUpdater } from "electron";
import log from "electron-log";
import { updateElectronApp, UpdateSourceType } from "@libs/update";
import { AppConfigManager } from "../config/app.config";
import { LogConfigManager } from "../config/log.config";
import { WindowConfigManager } from "../config/window.config";
import { isProduction } from "../../shared/utils";
import { MainErrorHandler } from "@libs/unhandled/main";
import { cleanupIpcRouter, initializeIpcRouter } from "../ipc-router";

/**
 * 主应用服务类
 * 负责管理整个主进程的生命周期和服务
 */
export class AppService {
  private static instance: AppService;
  private mainWindow: BrowserWindow | null = null;
  private configManager: AppConfigManager;

  private constructor() {
    this.configManager = new AppConfigManager();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): AppService {
    if (!AppService.instance) {
      AppService.instance = new AppService();
    }
    return AppService.instance;
  }

  /**
   * 初始化应用
   */
  async initialize(): Promise<void> {

    // 初始化日志系统
    LogConfigManager.initialize();

    // 初始化错误处理
    this.initializeErrorHandling();

    // 初始化自动更新（仅在生产环境）
    this.initializeAutoUpdater();

    // 初始化 IPC 处理器
    this.initializeIpcHandlers();

    // 设置应用事件监听器
    this.setupAppEvents();

    log.info("主进程服务初始化完成");
  }

  /**
   * 初始化错误处理
   */
  private initializeErrorHandling(): void {
    // 安装主进程错误处理器
    MainErrorHandler.getInstance().install({
      logger: log.error,
      showDialog: !isProduction(),
      reportButton: (error) => {
        log.error("用户报告错误:", error);
        // 可以在这里添加错误报告逻辑，如发送到服务器
      },
    });

    log.error(new Error('test1'), 'test1', new Error('test11'))
    log.error(new Error('test2'), 'test2', new Error('test22'))
    log.error(new Error('test3'), 'test3', new Error('test33'))

    // 监听渲染进程崩溃
    app.on("render-process-gone", (event, webContents, details) => {
      log.error("渲染进程崩溃:", details);
      // 在生产环境中可以尝试重新创建窗口
      if (isProduction() && this.mainWindow === null) {
        this.createMainWindow();
      }
    });

    // 监听子进程崩溃
    app.on("child-process-gone", (event, details) => {
      log.error("子进程崩溃:", details);
    });
  }

  /**
   * 初始化自动更新
   */
  private initializeAutoUpdater(): void {
    if (isProduction()) {
      updateElectronApp({
        updateSource: {
          type: UpdateSourceType.ElectronPublicUpdateService,
          // https://github.com/imohuan/electron-vue3-template
          repo: 'imohuan/electron-vue3-template',
        },
        notifyUser: true,
        updateInterval: "1 hour",
        logger: log,
      });
      // const server = 'https://update.electronjs.org'
      // https://github.com/imohuan/electron-vue3-template
      // const feed = `${server}/OWNER/REPO/${process.platform}-${process.arch}/${app.getVersion()}`
      // autoUpdater.setFeedURL(feed)
      // setInterval(() => {
      //   autoUpdater.checkForUpdates()
      // }, 10 * 60 * 1000)
      // https://update.electronjs.org/electron/fiddle/darwin/v0.28.0
      // https://update.electronjs.org/imohuan/electron-vue3-template/win32-x64/v0.0.6
      // const pkg = require('../package.json');
      // const userAgent = format('%s/%s (%s: %s)', pkg.name, pkg.version, os.platform(), os.arch());
      // autoUpdater.setFeedURL({
      //   url: 'https://update.electronjs.org/imohuan/electron-vue3-template/win32-x64/v0.0.6',
      //   "serverType": "json",
      // })
      log.info("自动更新初始化完成");
    }
  }

  /**
   * 初始化 IPC 处理器
   */
  private initializeIpcHandlers(): void {
    // 初始化新的 IPC 路由系统
    console.log('🔄 初始化 IPC 路由系统...');
    initializeIpcRouter();
  }

  /**
   * 设置应用事件监听器
   */
  private setupAppEvents(): void {
    // 应用准备就绪
    app.whenReady().then(() => {
      log.info("Electron 应用准备就绪");
      this.createMainWindow();

      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    // 所有窗口关闭时退出应用
    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        app.quit();
      }
    });

    // 应用即将退出
    app.on("before-quit", () => {
      log.info("应用即将退出");
    });
  }

  /**
   * 创建主窗口
   */
  private createMainWindow(): void {
    const config = this.configManager.getConfig();
    const options = WindowConfigManager.createMainWindowOptions(config);

    this.mainWindow = new BrowserWindow(options);

    // 设置窗口事件监听器
    WindowConfigManager.setupWindowEvents(this.mainWindow, (width, height) => {
      this.configManager.set("windowSize", { width, height });
    });

    // 加载页面内容
    WindowConfigManager.loadContent(this.mainWindow);

    // 监听窗口关闭
    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });
  }

  /**
   * 获取主窗口实例
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * 获取配置管理器
   */
  getConfigManager(): AppConfigManager {
    return this.configManager;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    cleanupIpcRouter()
    log.info("应用服务已清理");
  }
}
