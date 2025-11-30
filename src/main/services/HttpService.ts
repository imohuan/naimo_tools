/**
 * HTTP 服务 - 管理 HTTP 服务器的启动和停止
 */

import log from "electron-log";
import { AppConfigManager } from "../config/appConfig";
import {
  HttpServer,
  HttpServerConfig,
  HttpServerStatus,
} from "../server/HttpServer";
import type { Service } from "../core/ServiceContainer";
import { getProjectRoot } from "../utils/windowConfig";

/**
 * HTTP 服务类
 */
export class HttpService implements Service {
  private httpServer: HttpServer | null = null;
  private configManager: AppConfigManager;

  constructor(configManager: AppConfigManager) {
    this.configManager = configManager;
  }

  /**
   * 初始化 HTTP 服务
   */
  async initialize(): Promise<void> {
    log.info("初始化 HTTP 服务...");

    try {
      // 从配置中读取 HTTP 服务器设置
      const httpConfig = this.configManager.get("httpServer");

      if (httpConfig?.enabled) {
        await this.start();
      } else {
        log.info("HTTP 服务未启用，跳过启动");
      }

      log.info("HTTP 服务初始化完成");
    } catch (error) {
      log.error("HTTP 服务初始化失败:", error);
      throw error;
    }
  }

  /**
   * 启动 HTTP 服务器
   */
  async start(): Promise<void> {
    try {
      const httpConfig = this.configManager.get("httpServer");

      if (!httpConfig) {
        throw new Error("HTTP 服务器配置不存在");
      }

      // 如果服务器已在运行，先停止
      if (this.httpServer && this.httpServer.getIsRunning()) {
        await this.stop();
      }

      // 创建新的服务器实例，使用固定的项目根目录作为静态文件根目录
      const serverConfig: HttpServerConfig = {
        port: httpConfig.port,
        staticRoot: getProjectRoot(),
      };

      this.httpServer = new HttpServer(serverConfig);
      await this.httpServer.start();

      log.info(`HTTP 服务器已启动，端口: ${httpConfig.port}`);
    } catch (error) {
      log.error("启动 HTTP 服务器失败:", error);
      throw error;
    }
  }

  /**
   * 停止 HTTP 服务器
   */
  async stop(): Promise<void> {
    try {
      if (!this.httpServer) {
        log.warn("HTTP 服务器未初始化");
        return;
      }

      if (!this.httpServer.getIsRunning()) {
        log.warn("HTTP 服务器未运行");
        return;
      }

      await this.httpServer.stop();
      log.info("HTTP 服务器已停止");
    } catch (error) {
      log.error("停止 HTTP 服务器失败:", error);
      throw error;
    }
  }

  /**
   * 重启 HTTP 服务器
   */
  async restart(): Promise<void> {
    try {
      await this.stop();
      await this.start();
      log.info("HTTP 服务器已重启");
    } catch (error) {
      log.error("重启 HTTP 服务器失败:", error);
      throw error;
    }
  }

  /**
   * 获取服务器状态
   */
  getStatus(): HttpServerStatus {
    if (!this.httpServer) {
      return {
        isRunning: false,
        port: null,
        staticRoot: null,
      };
    }

    return this.httpServer.getStatus();
  }

  /**
   * 更新服务器配置
   */
  async updateConfig(config: Partial<HttpServerConfig>): Promise<void> {
    try {
      const currentConfig = this.configManager.get("httpServer");

      if (!currentConfig) {
        throw new Error("HTTP 服务器配置不存在");
      }

      // 过滤掉 staticRoot，因为它现在是固定值
      const { staticRoot, ...configWithoutStaticRoot } = config;

      // 更新配置（只更新端口，不更新 staticRoot）
      const newConfig = {
        ...currentConfig,
        ...configWithoutStaticRoot,
      };

      this.configManager.set("httpServer", newConfig);

      // 如果服务器正在运行，更新服务器配置（不包含 staticRoot）
      if (this.httpServer && this.httpServer.getIsRunning()) {
        this.httpServer.updateConfig(configWithoutStaticRoot);
      }

      log.info("HTTP 服务器配置已更新");
    } catch (error) {
      log.error("更新 HTTP 服务器配置失败:", error);
      throw error;
    }
  }

  /**
   * 启用或禁用 HTTP 服务器
   */
  async setEnabled(enabled: boolean): Promise<void> {
    try {
      const currentConfig = this.configManager.get("httpServer");

      if (!currentConfig) {
        throw new Error("HTTP 服务器配置不存在");
      }

      const newConfig = {
        ...currentConfig,
        enabled,
      };

      this.configManager.set("httpServer", newConfig);

      if (enabled) {
        await this.start();
      } else {
        await this.stop();
      }

      log.info(`HTTP 服务器已${enabled ? "启用" : "禁用"}`);
    } catch (error) {
      log.error("设置 HTTP 服务器启用状态失败:", error);
      throw error;
    }
  }

  /**
   * 获取 HTTP 服务器实例
   */
  getHttpServer(): HttpServer | null {
    return this.httpServer;
  }

  /**
   * 清理 HTTP 服务
   */
  cleanup(): void {
    log.info("清理 HTTP 服务...");

    try {
      if (this.httpServer && this.httpServer.getIsRunning()) {
        this.httpServer.stop().catch((error) => {
          log.error("停止 HTTP 服务器时出错:", error);
        });
      }

      this.httpServer = null;
      log.info("HTTP 服务清理完成");
    } catch (error) {
      log.error("清理 HTTP 服务时出错:", error);
    }
  }
}
