/**
 * HTTP 服务器实现
 * 提供静态文件服务等功能
 */

import { createRequire } from "node:module";
import { Server } from "http";
import { readdir, stat } from "fs/promises";
import { join, normalize, dirname } from "path";
import { existsSync } from "fs";
import { networkInterfaces } from "os";
import electronLog from "electron-log";
import type { Express, Request, Response, NextFunction } from "express";

// 使用 createRequire 导入 CommonJS 模块
const require = createRequire(import.meta.url);
const express = require("express");

// 创建独立的服务器日志实例，输出到 server.log
const createServerLogger = () => {
  const serverLog = electronLog.create({ logId: "server" });

  // 获取默认日志文件的目录
  const defaultLogFile = electronLog.transports.file.getFile();
  const logDir = dirname(defaultLogFile.path);

  // 配置服务器日志输出到 server.log
  serverLog.transports.file.resolvePathFn = (variables) => {
    return join(logDir, "server.log");
  };

  // 保持与主日志相同的配置
  serverLog.transports.console.level = electronLog.transports.console.level;
  serverLog.transports.file.level = electronLog.transports.file.level;
  serverLog.transports.file.format = electronLog.transports.file.format;

  return serverLog;
};

// 使用服务器专用的日志实例
const log = createServerLogger();

export interface HttpServerConfig {
  port: number;
  staticRoot?: string;
}

export interface HttpServerStatus {
  isRunning: boolean;
  port: number | null;
  staticRoot: string | null;
}

/**
 * HTTP 服务器类
 */
export class HttpServer {
  private server: Server | null = null;
  private app: Express;
  private port: number;
  private staticRoot: string | null = null;
  private isRunning: boolean = false;

  constructor(config: HttpServerConfig) {
    this.port = config.port;
    this.staticRoot = config.staticRoot || null;
    this.app = express();

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * 设置中间件
   */
  private setupMiddleware(): void {
    // CORS 中间件 - 支持所有跨域
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Access-Control-Expose-Headers", "*");
      next();
    });

    // 解析 JSON 请求体
    this.app.use(express.json());

    // 解析 URL 编码请求体
    this.app.use(express.urlencoded({ extended: true }));
  }

  /**
   * 设置路由
   */
  private setupRoutes(): void {
    // 根路径
    this.app.get("/", (req: Request, res: Response) => {
      res.json({
        message: "HTTP Server is running",
        port: this.port,
        staticRoot: this.staticRoot,
        timestamp: new Date().toISOString(),
      });
    });

    // 静态文件服务
    if (this.staticRoot) {
      this.app.use(
        express.static(this.staticRoot, {
          index: "index.html",
          setHeaders: (res: Response, path: string) => {
            res.setHeader("Cache-Control", "public, max-age=3600");
          },
        })
      );

      // 自定义目录列表处理
      this.app.use(async (req: Request, res: Response, next: NextFunction) => {
        try {
          const safePath = this.sanitizePath(req.path);
          if (!safePath) {
            return next();
          }

          const filePath = join(this.staticRoot!, safePath);

          if (!existsSync(filePath)) {
            return next();
          }

          const stats = await stat(filePath);

          if (stats.isDirectory()) {
            const indexPath = join(filePath, "index.html");
            if (!existsSync(indexPath)) {
              // 列出目录内容
              const files = await readdir(filePath);
              const html = this.generateDirectoryListing(files, req.path);
              res.send(html);
              return;
            }
          }

          next();
        } catch (error) {
          log.error("处理目录列表失败:", error);
          next();
        }
      });
    }

    // 404 处理
    this.app.use((req: Request, res: Response) => {
      this.sendError(res, 404, "Not Found");
    });

    // 错误处理
    this.app.use(
      (err: Error, req: Request, res: Response, next: NextFunction) => {
        log.error("处理 HTTP 请求失败:", err);
        this.sendError(res, 500, "Internal Server Error");
      }
    );
  }

  /**
   * 获取本地 IP 地址列表
   */
  private getLocalIPs(): string[] {
    const ips: string[] = ["localhost", "127.0.0.1"];
    const interfaces = networkInterfaces();

    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      if (!iface) continue;

      for (const addr of iface) {
        // 只获取 IPv4 地址，排除内部地址
        if (addr.family === "IPv4" && !addr.internal) {
          ips.push(addr.address);
        }
      }
    }

    return [...new Set(ips)]; // 去重
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
          const localIPs = this.getLocalIPs();
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
   * 生成目录列表 HTML
   */
  private generateDirectoryListing(files: string[], url: string): string {
    const items = files
      .map((file) => {
        const href = url.endsWith("/") ? `${url}${file}` : `${url}/${file}`;
        return `<li><a href="${href}">${file}</a></li>`;
      })
      .join("\n");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>目录列表: ${url}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    ul { list-style-type: none; padding: 0; }
    li { margin: 5px 0; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>目录列表: ${url}</h1>
  <ul>${items}</ul>
</body>
</html>`;
  }

  /**
   * 发送错误响应
   */
  private sendError(res: Response, statusCode: number, message: string): void {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${statusCode} ${message}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
    h1 { color: #d32f2f; }
  </style>
</head>
<body>
  <h1>${statusCode} ${message}</h1>
</body>
</html>`;

    res.status(statusCode).send(html);
  }

  /**
   * 清理路径，防止路径遍历攻击
   */
  private sanitizePath(url: string): string | null {
    try {
      // 移除查询参数和哈希
      const path = url.split("?")[0].split("#")[0];

      // 规范化路径
      const normalized = normalize(path);

      // 移除开头的斜杠
      const cleanPath = normalized.startsWith("/")
        ? normalized.slice(1)
        : normalized;

      // 检查是否包含路径遍历字符
      if (cleanPath.includes("..") || cleanPath.includes("\\")) {
        return null;
      }

      return cleanPath;
    } catch (error) {
      return null;
    }
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
