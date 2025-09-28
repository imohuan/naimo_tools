import { app, BrowserWindow, screen, BaseWindow } from "electron";
import log from "electron-log";
import { updateElectronApp, UpdateSourceType } from "@libs/update";
import { AppConfigManager } from "@main/config/app.config";
import { LogConfigManager } from "@main/config/log.config";
import { NewWindowManager } from "@main/window/NewWindowManager";
import { isProduction } from "@shared/utils";
import { MainErrorHandler } from "@libs/unhandled/main";
import { cleanupIpcRouter, initializeIpcRouter } from "@main/ipc-router";
import { createIconWorker, getApps, } from "@libs/app-search";
import { resolve } from "path";

import { tmpdir } from "os";
import { existsSync, rmSync } from "fs";
import { getDirname } from "@main/utils";

import { DownloadManagerMain, StorageProvider } from "@libs/download-manager/main"
import { LifecycleType, WindowManagerConfig } from "@renderer/src/typings/window-types";

/**
 * 主应用服务类
 * 负责管理整个主进程的生命周期和服务
 */
export class AppService {
  private static instance: AppService;

  private windowManager: NewWindowManager;
  private configManager: AppConfigManager;
  private downloadManagerMain: DownloadManagerMain;
  private downloadWindow: BrowserWindow | null = null;

  private constructor() {
    this.configManager = AppConfigManager.getInstance();
    this.downloadManagerMain = DownloadManagerMain.getInstance(this.configManager as StorageProvider);
    // 延迟初始化窗口管理器，在 app ready 后进行
    this.windowManager = null as any;
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

    // 设置应用事件监听器
    this.setupAppEvents();

    // 初始化下载管理器
    this.downloadManagerMain.initialize();

    // 等待 app ready，然后初始化窗口管理器
    await this.initializeWindowManager();

    // 窗口创建完成后，初始化 IPC 处理器
    this.initializeIpcHandlers();

    log.info("主进程服务初始化完成");
  }

  /**
   * 初始化窗口管理器
   */
  private async initializeWindowManager(): Promise<void> {
    try {
      log.info('初始化新窗口管理器');

      // 创建窗口管理器配置
      const windowManagerConfig: WindowManagerConfig = {
        layout: {
          totalBounds: { x: 0, y: 200, width: 800, height: 600 },
          headerHeight: 60,
          contentBounds: { x: 0, y: 60, width: 800, height: 540 },
          padding: 0
        },
        defaultLifecycle: {
          type: LifecycleType.FOREGROUND,
          persistOnClose: false
        },
        memoryRecycleThreshold: 500, // 500MB
        autoRecycleInterval: 300000 // 5分钟
      };

      this.windowManager = NewWindowManager.getInstance(windowManagerConfig);
      await this.windowManager.initialize();

      // 设置窗口管理器事件监听
      this.setupWindowManagerEventListeners();

      log.info('新窗口管理器初始化完成');
    } catch (error) {
      log.error('初始化窗口管理器失败:', error);
      throw error;
    }
  }

  /**
   * 设置窗口管理器事件监听
   */
  private setupWindowManagerEventListeners(): void {
    if (!this.windowManager) {
      log.warn('窗口管理器未初始化，无法设置事件监听');
      return;
    }

    // // 监听窗口管理器初始化事件
    // this.windowManager.on('manager:initialized', (data: any) => {
    //   log.info('窗口管理器初始化完成:', data);
    // });

    // // 监听主窗口创建事件
    // this.windowManager.on('window:main-created', (data: any) => {
    //   log.info('主窗口创建成功:', data);
    // });

    // // 监听主窗口关闭事件
    // this.windowManager.on('window:main-closed', (data: any) => {
    //   log.info('主窗口已关闭:', data);
    // });

    // // 监听主窗口焦点事件
    // this.windowManager.on('window:main-focused', (data: any) => {
    //   log.debug('主窗口获得焦点:', data);
    // });

    this.windowManager.on('window:main-blurred', (data: any) => {
      log.debug('主窗口失去焦点:', data);
      // 向当前活跃的WebContentsView发送blur事件
      this.sendBlurEventToActiveView();
    });

    // // 监听视图激活事件
    // this.windowManager.on('view:activated', (data: any) => {
    //   log.debug('视图已激活:', data);
    // });

    // // 监听视图切换事件
    // this.windowManager.on('view:switched', (data: any) => {
    //   log.debug('视图已切换:', data);
    // });

    // // 监听清理完成事件
    // this.windowManager.on('cleanup:completed', (data: any) => {
    //   log.info('清理操作完成:', data);
    // });

    // // 监听性能监控事件
    // this.windowManager.on('performance:metrics', (data: any) => {
    //   log.debug('性能监控数据:', data);
    //   // 这里可以添加性能监控逻辑，如发送到监控服务
    // });

    // log.info('窗口管理器事件监听器设置完成');
  }

  /**
   * 向当前活跃的WebContentsView发送blur事件
   * 当主窗口失焦时，通知前端组件执行相应的blur处理逻辑
   */
  private sendBlurEventToActiveView(): void {
    try {
      if (!this.windowManager) {
        log.warn('窗口管理器未初始化，无法发送blur事件');
        return;
      }

      // 获取当前活跃的视图
      const activeView = this.windowManager.getActiveView();
      if (!activeView || activeView.view.webContents.isDestroyed()) {
        log.debug('没有活跃的视图或视图已销毁，跳过blur事件发送');
        return;
      }

      const mainWindow = this.windowManager.getMainWindow();

      // 向WebContentsView发送blur事件
      activeView.view.webContents.send('window-all-blur', {
        timestamp: Date.now(),
        windowId: mainWindow?.id,
        viewId: activeView.id
      });

      log.debug(`已向视图 ${activeView.id} 发送blur事件`);
    } catch (error) {
      log.error('发送blur事件到视图失败:', error);
    }
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

    // 监听渲染进程崩溃
    app.on("render-process-gone", (event, webContents, details) => {
      log.error("渲染进程崩溃:", details);
      // 在新的 BaseWindow + WebContentsView 架构中，渲染进程崩溃处理由窗口管理器统一管理
      // 这里只记录日志，具体的恢复策略由 NewWindowManager 内部处理
      if (this.windowManager) {
        const mainWindow = this.windowManager.getMainWindow();
        if (mainWindow) {
          log.warn("主窗口相关的渲染进程崩溃，窗口管理器将处理恢复逻辑");
          // 可以在这里触发特定的恢复策略，如重新加载视图等
        }
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
   * 初始化图标工作进程
   */
  private initializeIconWorker(): void {
    try {
      // 确定图标工作进程的路径
      let workerPath: string;
      workerPath = resolve(getDirname(import.meta.url), 'iconWorker.js');
      log.info('🖼️ 初始化图标工作进程:', workerPath);
      createIconWorker(workerPath, log);
      log.info('✅ 图标工作进程初始化完成');
      getApps(resolve(app.getPath('userData'), 'icons'));
    } catch (error) {
      log.error('❌ 图标工作进程初始化失败:', error);
    }
  }

  /**
   * 设置应用事件监听器
   */
  private setupAppEvents(): void {
    // 应用准备就绪
    app.whenReady().then(async () => {
      log.info("Electron 应用准备就绪");
      // 初始化图标工作进程（必须在 app ready 后）
      this.initializeIconWorker();

      await this.createMainWindow();
      app.on("activate", async () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          await this.createMainWindow();
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
      this.cleanup();
    });

    // 设置进程信号处理
    this.setupProcessSignalHandlers();
  }

  /**
   * 创建主窗口
   */
  private async createMainWindow(): Promise<void> {
    try {
      // 确保窗口管理器已初始化
      if (!this.windowManager) {
        throw new Error('窗口管理器未初始化');
      }

      // 简单检查：如果主窗口已存在且未销毁，直接返回
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        return;
      }

      log.info("开始创建主窗口 (使用新架构)");

      // 设置窗口大小配置
      this.configManager.set("windowSize", { width: 800, height: 600 });
      const config = this.configManager.getConfig();

      // 使用新的窗口管理器创建主窗口
      const result = await this.windowManager.createMainWindow(config);

      if (!result.success || !result.data?.window) {
        throw new Error(result.error || '主窗口创建失败');
      }

      const createdWindow = result.data.window as BaseWindow;

      // 设置窗口居中
      this.setWindowCenter(createdWindow, 200);

      // 创建下载专用窗口并设置下载管理器
      this.createDownloadWindow();

      // 监听窗口关闭事件已在 NewWindowManager 中处理

      log.info(`主窗口创建成功，ID: ${createdWindow.id}`);
    } catch (error) {
      log.error("创建主窗口失败:", error);
      throw error;
    }
  }

  /**
   * 设置窗口居中位置
   */
  private setWindowCenter(window: BaseWindow, y: number): void {
    const { width } = window.getBounds();
    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
    const centerX = Math.floor((screenWidth - width) / 2);
    window.setPosition(centerX, y);
  }

  /**
   * 创建下载专用窗口
   * 为下载管理器提供专门的 BrowserWindow，因为下载管理器需要 BrowserWindow 而非 BaseWindow
   */
  private createDownloadWindow(): void {
    try {
      if (this.downloadWindow && !this.downloadWindow.isDestroyed()) {
        log.info("下载窗口已存在");
        return;
      }

      log.info("创建下载专用窗口");

      // 创建隐藏的 BrowserWindow 专门用于下载管理
      this.downloadWindow = new BrowserWindow({
        width: 1,
        height: 1,
        show: false, // 隐藏窗口，仅用于下载功能
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: true,
          webSecurity: true,
        },
        skipTaskbar: true, // 不在任务栏显示
        transparent: true, // 透明窗口
        frame: false, // 无边框
        alwaysOnTop: false,
        resizable: false,
        minimizable: false,
        maximizable: false,
        closable: false // 防止意外关闭
      });

      // 设置下载管理器的主窗口引用
      this.downloadManagerMain.setMainWindow(this.downloadWindow);

      // 监听窗口关闭
      this.downloadWindow.on("closed", () => {
        log.info("下载专用窗口已关闭");
        this.downloadWindow = null;
      });

      // 防止窗口被意外显示
      this.downloadWindow.on("show", () => {
        if (this.downloadWindow && !this.downloadWindow.isDestroyed()) {
          this.downloadWindow.hide();
          log.debug("下载专用窗口被隐藏（保持后台运行）");
        }
      });

      log.info(`下载专用窗口创建成功，ID: ${this.downloadWindow.id}`);
    } catch (error) {
      log.error("创建下载专用窗口失败:", error);
    }
  }

  /**
   * 获取主窗口实例
   */
  getMainWindow(): BaseWindow | null {
    if (!this.windowManager) {
      return null;
    }
    return this.windowManager.getMainWindow();
  }

  /**
   * 获取窗口管理器实例
   */
  getWindowManager(): NewWindowManager {
    if (!this.windowManager) {
      throw new Error('窗口管理器未初始化，请确保应用已正确启动');
    }
    return this.windowManager;
  }

  /**
   * 获取配置管理器
   */
  getConfigManager(): AppConfigManager {
    return this.configManager;
  }

  /**
   * 获取下载专用窗口
   */
  getDownloadWindow(): BrowserWindow | null {
    return this.downloadWindow;
  }

  /**
   * 设置进程信号处理
   */
  private setupProcessSignalHandlers(): void {
    // 处理 SIGTERM 信号（优雅关闭）
    process.on('SIGTERM', () => {
      log.info('收到 SIGTERM 信号，正在清理...');
      this.cleanup();
      process.exit(0);
    });

    // 处理 SIGINT 信号（Ctrl+C）
    process.on('SIGINT', () => {
      log.info('收到 SIGINT 信号，正在清理...');
      this.cleanup();
      process.exit(0);
    });

    // 处理 SIGHUP 信号（挂起）
    process.on('SIGHUP', () => {
      log.info('收到 SIGHUP 信号，正在清理...');
      this.cleanup();
      process.exit(0);
    });

    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      log.error('未捕获的异常:', error);
      this.cleanup();
      process.exit(1);
    });

    // 处理未处理的 Promise 拒绝
    process.on('unhandledRejection', (reason, promise) => {
      log.error('未处理的 Promise 拒绝:', reason);
      this.cleanup();
      process.exit(1);
    });
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 清理下载窗口
    if (this.downloadWindow && !this.downloadWindow.isDestroyed()) {
      log.info("清理下载专用窗口");
      this.downloadWindow.destroy();
      this.downloadWindow = null;
    }

    cleanupIpcRouter()
    log.info("应用服务已清理");

    // 清空临时目录
    const tempDir = resolve(tmpdir(), 'naimo-preloads');
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
      log.info(`已清空临时目录: ${tempDir}`);
    }
  }
}
