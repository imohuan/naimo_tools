/**
 * 应用启动器 - 负责应用的完整启动流程
 */

import log from "electron-log";
import { ServiceContainer } from "./ServiceContainer";
import { CoreService } from "./CoreService";
import { ErrorService } from "../services/ErrorService";
import { UpdateService } from "../services/UpdateService";
import { WindowService } from "../services/WindowService";
import { TrayService } from "../services/TrayService";
import { DebugService } from "../services/DebugService";
import { AutoLaunchService } from "../services/AutoLaunchService";
import { LoadingService } from "../services/LoadingService";
import { HttpService } from "../services/HttpService";
import { AppConfigManager } from "../config/appConfig";

/**
 * 应用启动器配置
 */
export interface AppBootstrapConfig {
  core?: {
    enableIconWorker?: boolean;
    tempDirCleanup?: boolean;
  };
  error?: {
    showDialog?: boolean;
    enableReporting?: boolean;
  };
  update?: {
    enabled?: boolean;
    repo?: string;
    updateInterval?: string;
  };
  window?: {
    mainWindow?: {
      width?: number;
      height?: number;
      centerY?: number;
    };
    download?: {
      enableDownloadWindow?: boolean;
    };
  };
  tray?: {
    enabled?: boolean;
    iconPath?: string;
  };
  debug?: {
    enabled?: boolean;
    updateInterval?: number;
    position?: {
      offsetX?: number;
      offsetY?: number;
    };
  };
  loading?: {
    enabled?: boolean;
    width?: number;
    height?: number;
  };
}

/**
 * 应用启动器
 * 负责整个应用的初始化和服务协调
 */
export class AppBootstrap {
  private serviceContainer: ServiceContainer;
  private config: AppBootstrapConfig;
  private isInitialized = false;

  constructor(config: AppBootstrapConfig = {}) {
    this.config = {
      core: {
        enableIconWorker: true,
        tempDirCleanup: true,
        ...config.core,
      },
      error: {
        showDialog: false, // 默认不显示对话框
        enableReporting: true,
        ...config.error,
      },
      update: {
        enabled: true,
        repo: "imohuan/electron-vue3-template",
        updateInterval: "1 hour",
        ...config.update,
      },
      window: {
        mainWindow: {
          width: 800,
          height: 600,
          centerY: 200,
          ...config.window?.mainWindow,
        },
        download: {
          enableDownloadWindow: true,
          ...config.window?.download,
        },
      },
      tray: {
        enabled: true,
        ...config.tray,
      },
      debug: {
        enabled: false, // 默认禁用，生产环境建议禁用
        updateInterval: 1000,
        position: {
          offsetX: 20,
          offsetY: 20,
        },
        ...config.debug,
      },
      loading: {
        enabled: false, // 默认启用加载窗口
        width: 400,
        height: 300,
        ...config.loading,
      },
    };

    this.serviceContainer = new ServiceContainer();
    this.registerServices();
  }

  /**
   * 注册所有服务
   */
  private registerServices(): void {
    log.debug("注册应用服务...");

    // 注册配置管理器
    this.serviceContainer.register({
      name: "configManager",
      factory: () => AppConfigManager.getInstance(),
      singleton: true,
    });

    // 注册核心服务
    this.serviceContainer.register({
      name: "coreService",
      factory: (container) => new CoreService(container, this.config.core),
      singleton: true,
    });

    // 注册错误服务
    this.serviceContainer.register({
      name: "errorService",
      factory: () => new ErrorService(this.config.error),
      singleton: true,
    });

    // 注册更新服务
    this.serviceContainer.register({
      name: "updateService",
      factory: () => new UpdateService(this.config.update),
      singleton: true,
    });

    // 注册窗口服务
    this.serviceContainer.register({
      name: "windowService",
      factory: (container) =>
        new WindowService(container.get("configManager"), this.config.window),
      singleton: true,
      dependencies: ["configManager"],
    });

    // 注册托盘服务
    this.serviceContainer.register({
      name: "trayService",
      factory: (container) => new TrayService(container, this.config.tray),
      singleton: true,
    });

    // 注册调试服务
    this.serviceContainer.register({
      name: "debugService",
      factory: () => new DebugService(this.config.debug),
      singleton: true,
    });

    // 注册开机自启服务
    this.serviceContainer.register({
      name: "autoLaunchService",
      factory: (container) =>
        new AutoLaunchService(container.get("configManager")),
      singleton: true,
      dependencies: ["configManager"],
    });

    // 注册加载窗口服务
    this.serviceContainer.register({
      name: "loadingService",
      factory: () => new LoadingService(this.config.loading || {}),
      singleton: true,
    });

    // 注册 HTTP 服务
    this.serviceContainer.register({
      name: "httpService",
      factory: (container) => new HttpService(container.get("configManager")),
      singleton: true,
      dependencies: ["configManager"],
    });

    log.debug("所有服务注册完成");
  }

  /**
   * 启动应用
   */
  async start(): Promise<void> {
    if (this.isInitialized) {
      log.warn("应用已经启动");
      return;
    }

    const startTime = Date.now();
    log.debug("🚀 应用启动中...");
    log.debug("启动时间:", new Date(startTime).toLocaleTimeString());

    try {
      // 按顺序初始化服务
      await this.initializeServicesInOrder();

      const endTime = Date.now();
      this.isInitialized = true;

      log.debug("✅ 应用启动完成，耗时:", endTime - startTime, "ms");
    } catch (error) {
      log.error("❌ 应用启动失败:", error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * 按正确顺序初始化服务
   */
  private async initializeServicesInOrder(): Promise<void> {
    // 根据配置决定是否包含加载窗口服务
    const initOrder = [
      ...(this.config.loading?.enabled ? ["loadingService"] : []), // 加载窗口服务 - 最先显示（可选）
      "coreService", // 核心服务 - 包括图标工作进程和应用列表加载
      "errorService", // 错误服务 - 尽早初始化以捕获错误
      "autoLaunchService", // 开机自启服务 - 在核心服务之后
      "updateService", // 更新服务 - 在核心功能之后
      "windowService", // 窗口服务 - 在核心服务完成后创建主窗口
      "httpService", // HTTP 服务 - 在窗口服务之后
      "debugService", // 调试服务 - 在窗口服务之后
      "trayService", // 托盘服务 - 最后初始化
    ];

    for (const serviceName of initOrder) {
      try {
        log.debug(`初始化 ${serviceName}...`);
        const service = this.serviceContainer.get(serviceName);

        if (service && typeof service.initialize === "function") {
          await service.initialize();
        }

        // 特殊处理：在核心服务初始化完成后（getApps 已完成），更新加载状态
        if (
          serviceName === "coreService" &&
          this.config.loading?.enabled &&
          this.serviceContainer.has("loadingService")
        ) {
          const loadingService = this.serviceContainer.get("loadingService");
          if (
            loadingService &&
            typeof loadingService.updateStatus === "function"
          ) {
            loadingService.updateStatus("正在创建窗口...");
            loadingService.updateProgress(100);
          }
        }

        // 特殊处理：窗口服务初始化完成后，关闭加载窗口
        if (
          serviceName === "windowService" &&
          this.config.loading?.enabled &&
          this.serviceContainer.has("loadingService")
        ) {
          const loadingService = this.serviceContainer.get("loadingService");
          if (loadingService && typeof loadingService.close === "function") {
            // 稍微延迟关闭，确保主窗口已经显示
            setTimeout(() => {
              loadingService.close();
              log.debug("加载窗口已关闭");
            }, 500);
          }
        }

        // 特殊处理：调试服务初始化后，设置窗口管理器引用
        if (
          serviceName === "debugService" &&
          this.serviceContainer.has("windowService")
        ) {
          const windowService = this.serviceContainer.get("windowService");
          const windowManager = windowService?.getWindowManager();
          if (
            windowManager &&
            service &&
            typeof service.setWindowManager === "function"
          ) {
            service.setWindowManager(windowManager);
            log.debug("调试服务已设置窗口管理器引用");
          }
        }

        log.debug(`${serviceName} 初始化完成`);
      } catch (error) {
        log.error(`${serviceName} 初始化失败:`, error);
        // 如果初始化失败，确保关闭加载窗口
        if (
          this.config.loading?.enabled &&
          this.serviceContainer.has("loadingService")
        ) {
          const loadingService = this.serviceContainer.get("loadingService");
          if (loadingService && typeof loadingService.close === "function") {
            loadingService.close();
          }
        }
        throw error;
      }
    }
  }

  /**
   * 获取服务容器
   */
  getServiceContainer(): ServiceContainer {
    return this.serviceContainer;
  }

  /**
   * 获取指定服务
   */
  getService<T = any>(name: string): T {
    return this.serviceContainer.get<T>(name);
  }

  /**
   * 检查应用是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 更新应用配置
   */
  updateConfig(config: Partial<AppBootstrapConfig>): void {
    this.config = { ...this.config, ...config };
    log.debug("应用配置已更新:", config);

    // 将配置更新传播到相应的服务
    this.propagateConfigUpdates(config);
  }

  /**
   * 将配置更新传播到服务
   */
  private propagateConfigUpdates(config: Partial<AppBootstrapConfig>): void {
    try {
      if (config.core && this.serviceContainer.has("coreService")) {
        const coreService = this.serviceContainer.get("coreService");
        if (coreService && typeof coreService.updateConfig === "function") {
          coreService.updateConfig(config.core);
        }
      }

      if (config.update && this.serviceContainer.has("updateService")) {
        const updateService = this.serviceContainer.get("updateService");
        if (updateService && typeof updateService.updateConfig === "function") {
          updateService.updateConfig(config.update);
        }
      }

      if (config.window && this.serviceContainer.has("windowService")) {
        const windowService = this.serviceContainer.get("windowService");
        if (windowService && typeof windowService.updateConfig === "function") {
          windowService.updateConfig(config.window);
        }
      }

      if (config.tray && this.serviceContainer.has("trayService")) {
        const trayService = this.serviceContainer.get("trayService");
        if (trayService && typeof trayService.updateConfig === "function") {
          trayService.updateConfig(config.tray);
        }
      }

      if (config.debug && this.serviceContainer.has("debugService")) {
        const debugService = this.serviceContainer.get("debugService");
        if (debugService && typeof debugService.updateConfig === "function") {
          debugService.updateConfig(config.debug);
        }
      }

      if (config.loading && this.serviceContainer.has("loadingService")) {
        const loadingService = this.serviceContainer.get("loadingService");
        if (
          loadingService &&
          typeof loadingService.updateConfig === "function"
        ) {
          loadingService.updateConfig(config.loading);
        }
      }
    } catch (error) {
      log.error("传播配置更新时出错:", error);
    }
  }

  /**
   * 清理应用
   */
  async cleanup(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    log.debug("🧹 清理应用...");

    try {
      // 清理所有服务
      this.serviceContainer.cleanup();

      this.isInitialized = false;
      log.debug("✅ 应用清理完成");
    } catch (error) {
      log.error("❌ 应用清理失败:", error);
    }
  }

  /**
   * 重启应用
   */
  async restart(): Promise<void> {
    log.debug("重启应用...");

    await this.cleanup();
    await this.start();

    log.debug("应用重启完成");
  }
}
