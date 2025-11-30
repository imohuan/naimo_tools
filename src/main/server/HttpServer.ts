/**
 * HTTP 服务器实现
 * 提供静态文件服务等功能
 */

import { createRequire } from "node:module";
import { Server } from "http";
import type { Express } from "express";
import { join } from "path";
import { HttpServerConfig, HttpServerStatus } from "./types";
import { log } from "./logger";
import { getLocalIPs } from "./utils";
import { setupMiddleware } from "./middleware";
import { setupRoutes } from "./routes";

// 使用 createRequire 导入 CommonJS 模块
const require = createRequire(import.meta.url);
const express = require("express");

/**
 * HTTP 服务器类
 */
export class HttpServer {
  private server: Server | null = null;
  private app: Express;
  private port: number;
  private staticRoot: string | null = null;
  private logsDir: string | null = null;
  private isRunning: boolean = false;

  constructor(config: HttpServerConfig) {
    this.port = config.port;
    this.staticRoot = config.staticRoot || null;
    this.logsDir = this.staticRoot ? join(this.staticRoot, "logs") : null;
    this.app = express();

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * 设置中间件
   */
  private setupMiddleware(): void {
    setupMiddleware(this.app);
  }

  /**
   * 设置路由
   */
  private setupRoutes(): void {
    setupRoutes(this.app, this.port, this.staticRoot, this.logsDir);
  }

  /**
   * 启动 HTTP 服务器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      log.warn(`HTTP 服务器已在运行，端口: ${this.port}`);
      return;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        // 监听所有网络接口 (0.0.0.0)，支持 localhost、127.0.0.1 和当前 IP
        this.server = this.app.listen(this.port, "0.0.0.0", () => {
          this.isRunning = true;
          const localIPs = getLocalIPs();
          const addresses = localIPs.map((ip) => `http://${ip}:${this.port}`);

          log.info(`HTTP 服务器已启动，端口: ${this.port}`);
          log.info(`可访问地址:`);
          addresses.forEach((addr) => {
            log.info(`  - ${addr}`);
          });
          resolve();
        });

        this.server.on("error", (error: NodeJS.ErrnoException) => {
          this.isRunning = false;
          if (error.code === "EADDRINUSE") {
            log.error(`端口 ${this.port} 已被占用`);
            reject(new Error(`端口 ${this.port} 已被占用`));
          } else {
            log.error("HTTP 服务器启动失败:", error);
            reject(error);
          }
        });
      } catch (error) {
        this.isRunning = false;
        reject(error);
      }
    });
  }

  /**
   * 停止 HTTP 服务器
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      log.warn("HTTP 服务器未运行");
      return;
    }

    return new Promise<void>((resolve) => {
      this.server!.close(() => {
        this.isRunning = false;
        this.server = null;
        log.info("HTTP 服务器已停止");
        resolve();
      });
    });
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<HttpServerConfig>): void {
    if (config.port !== undefined) {
      this.port = config.port;
    }
    if (config.staticRoot !== undefined) {
      this.staticRoot = config.staticRoot || null;
      this.logsDir = this.staticRoot ? join(this.staticRoot, "logs") : null;
      // 重新设置路由以应用新的静态根目录
      this.app = express();
      this.setupMiddleware();
      this.setupRoutes();
    }
    log.debug("HTTP 服务器配置已更新:", config);
  }

  /**
   * 获取服务器状态
   */
  getStatus(): HttpServerStatus {
    return {
      isRunning: this.isRunning,
      port: this.isRunning ? this.port : null,
      staticRoot: this.staticRoot,
    };
  }

  /**
   * 检查服务器是否运行中
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }
}

// 导出类型，保持向后兼容
export type { HttpServerConfig, HttpServerStatus };
