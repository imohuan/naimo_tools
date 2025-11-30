/**
 * HTTP 服务器实现
 * 提供静态文件服务等功能
 */

import { createRequire } from "node:module";
import { Server } from "http";
import { join, normalize, dirname } from "path";
import { networkInterfaces } from "os";
import electronLog from "electron-log";
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import type { Express, Request, Response, NextFunction } from "express";

// 使用 createRequire 导入 CommonJS 模块
const require = createRequire(import.meta.url);
const express = require("express");
const serveIndex = require("serve-index");

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

    // API 代理路由 - 参考 api_proxy.py 实现
    this.app.all("/raw", async (req: Request, res: Response) => {
      await this.handleProxyRequest(req, res);
    });

    // 静态文件服务
    if (this.staticRoot) {
      // 静态文件服务
      this.app.use(
        express.static(this.staticRoot, {
          index: "index.html",
          fallthrough: true, // 允许继续执行下一个中间件（serve-index）
          setHeaders: (res: Response, path: string) => {
            res.setHeader("Cache-Control", "public, max-age=3600");
          },
        })
      );

      // 目录列表服务（使用 serve-index 中间件）
      // 当访问目录且目录下没有 index.html 时，会显示目录列表
      this.app.use(
        serveIndex(this.staticRoot, {
          icons: true, // 显示文件图标
          view: "details", // 显示详细信息（大小、修改时间等）
        })
      );
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
   * 验证 URL 是否有效
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * 处理代理请求
   */
  private async handleProxyRequest(req: Request, res: Response): Promise<void> {
    try {
      // 从 query 参数获取目标 URL
      const targetUrl = req.query.url as string | undefined;

      if (!targetUrl) {
        res.status(400).json({
          error: "缺少必需参数: url",
          message: "请提供要转发的目标 URL（通过 query 参数）",
        });
        return;
      }

      // 验证 URL
      if (!this.isValidUrl(targetUrl)) {
        res.status(400).json({
          error: "无效的 URL",
          message: `提供的 URL 格式不正确: ${targetUrl}`,
        });
        return;
      }

      // 从 query 参数确定请求方法
      let method = (req.query.method as string | undefined)?.toUpperCase();
      if (!method) {
        method = req.method;
      }

      // 如果方法是 OPTIONS，直接返回
      if (method === "OPTIONS") {
        res.status(200).end();
        return;
      }

      // 准备请求配置
      const requestConfig: AxiosRequestConfig = {
        method: method as any,
        url: targetUrl,
        timeout: 30000, // 30 秒超时
        maxRedirects: 5,
        validateStatus: () => true, // 接受所有状态码
        responseType: "arraybuffer", // 使用 arraybuffer，axios 会自动解压 gzip/deflate
        decompress: true, // 确保自动解压
      };

      // 处理请求头
      const headers: Record<string, string> = {};

      // 从 query 参数获取自定义头部
      const customHeaders = req.query.headers as string | undefined;
      if (customHeaders) {
        try {
          const parsedHeaders = JSON.parse(customHeaders);
          if (typeof parsedHeaders === "object" && parsedHeaders !== null) {
            Object.assign(headers, parsedHeaders);
          }
        } catch (e) {
          log.warn("解析自定义头部失败:", e);
        }
      }

      // 复制原始请求的一些头部
      // 注意：不转发 Accept-Encoding，让服务器返回未压缩的内容，避免解压问题
      const forwardHeaders = [
        "User-Agent",
        "Accept",
        "Accept-Language",
        // "Accept-Encoding", // 不转发，避免压缩问题
      ];
      for (const headerName of forwardHeaders) {
        const headerValue = req.headers[headerName.toLowerCase()];
        if (headerValue && typeof headerValue === "string") {
          headers[headerName] = headerValue;
        }
      }

      if (Object.keys(headers).length > 0) {
        requestConfig.headers = headers;
      }

      // 处理请求体
      if (["POST", "PUT", "PATCH"].includes(method)) {
        const contentType = req.headers["content-type"] || "";
        const contentTypeLower = contentType.toLowerCase();

        if (contentTypeLower.includes("application/json")) {
          // JSON 数据
          const jsonData = req.body;
          if (jsonData && typeof jsonData === "object") {
            // 如果 body 中有 data 字段，使用它；否则使用整个 body
            requestConfig.data =
              jsonData.data !== undefined ? jsonData.data : jsonData;
            if (!headers["Content-Type"]) {
              headers["Content-Type"] = "application/json";
            }
          }
        } else if (
          contentTypeLower.includes("application/x-www-form-urlencoded")
        ) {
          // 表单数据
          requestConfig.data = req.body;
          if (!headers["Content-Type"]) {
            headers["Content-Type"] =
              contentType || "application/x-www-form-urlencoded";
          }
        } else if (req.body) {
          // 原始数据（可能是 Buffer、字符串或其他格式）
          requestConfig.data = req.body;
          if (contentType) {
            headers["Content-Type"] = contentType;
          }
        }
      }

      // 处理查询参数（除了 url、method、headers）
      const params: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.query)) {
        if (!["url", "method", "headers"].includes(key)) {
          params[key] = String(value);
        }
      }

      if (Object.keys(params).length > 0) {
        requestConfig.params = params;
      }

      log.info(`转发请求: ${method} ${targetUrl}`);

      // 发送请求
      const response: AxiosResponse = await axios(requestConfig);

      // 准备响应头部
      const responseHeaders: Record<string, string> = {};

      // 复制响应头部（排除一些不需要的）
      // 注意：axios 会自动解压 gzip/deflate，所以排除 content-encoding
      const excludeHeaders = [
        "content-encoding", // axios 已解压，不需要
        "transfer-encoding", // 不需要
        "connection", // 不需要
        "content-length", // 需要重新计算，因为解压后大小变了
      ];

      // 先保存 Content-Type（如果存在）
      let originalContentType: string | undefined;

      for (const [key, value] of Object.entries(response.headers)) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === "content-type") {
          originalContentType = String(value);
        } else if (!excludeHeaders.includes(lowerKey)) {
          responseHeaders[key] = String(value);
        }
      }

      // 将 ArrayBuffer 转换为 Buffer
      let responseData: Buffer;
      if (response.data instanceof ArrayBuffer) {
        responseData = Buffer.from(response.data);
      } else if (Buffer.isBuffer(response.data)) {
        responseData = response.data;
      } else {
        responseData = Buffer.from(String(response.data), "utf-8");
      }

      // 设置正确的 Content-Length（解压后的大小）
      responseHeaders["Content-Length"] = String(responseData.length);

      // 确保 Content-Type 正确设置
      if (originalContentType) {
        let contentType = originalContentType;
        const contentTypeLower = contentType.toLowerCase();

        // 对于文本类型，如果没有 charset，添加 charset=utf-8
        if (
          contentTypeLower.includes("text/") ||
          contentTypeLower.includes("application/json") ||
          contentTypeLower.includes("application/javascript") ||
          contentTypeLower.includes("application/xml") ||
          contentTypeLower.includes("application/xhtml")
        ) {
          if (!contentTypeLower.includes("charset")) {
            contentType = `${originalContentType}; charset=utf-8`;
          }
        }
        responseHeaders["Content-Type"] = contentType;
      } else {
        // 如果没有 Content-Type，根据内容推断或使用默认值
        // 尝试检测是否为 HTML
        const dataStart = responseData
          .slice(0, Math.min(1024, responseData.length))
          .toString("utf-8");
        if (
          dataStart.trim().toLowerCase().startsWith("<!doctype") ||
          dataStart.trim().toLowerCase().startsWith("<html")
        ) {
          responseHeaders["Content-Type"] = "text/html; charset=utf-8";
        } else {
          responseHeaders["Content-Type"] = "application/octet-stream";
        }
      }

      // 添加 CORS 头部
      responseHeaders["Access-Control-Allow-Origin"] = "*";
      responseHeaders["Access-Control-Allow-Methods"] =
        "GET, POST, PUT, DELETE, PATCH, OPTIONS";
      responseHeaders["Access-Control-Allow-Headers"] =
        "Content-Type, Authorization";

      // 设置响应头部
      for (const [key, value] of Object.entries(responseHeaders)) {
        res.setHeader(key, value);
      }

      // 返回响应（使用 Buffer）
      res.status(response.status).send(responseData);
    } catch (error: any) {
      const targetUrl = (req.query.url as string) || "未知";

      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          log.error(`请求超时: ${targetUrl}`);
          res.status(504).json({
            error: "请求超时",
            message: `请求目标 URL 超时: ${targetUrl}`,
          });
        } else {
          log.error(`请求失败: ${targetUrl} - ${error.message}`);
          res.status(502).json({
            error: "请求失败",
            message: error.message,
            url: targetUrl,
          });
        }
      } else {
        log.error(`服务器错误: ${targetUrl} - ${error}`, error);
        res.status(500).json({
          error: "服务器错误",
          message: error instanceof Error ? error.message : String(error),
          url: targetUrl,
        });
      }
    }
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
