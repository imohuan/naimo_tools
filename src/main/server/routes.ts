/**
 * HTTP 服务器路由配置
 */

import { createRequire } from "node:module";
import type { Express, Request, Response, NextFunction } from "express";
import { handleProxyRequest } from "./proxy";
import { log } from "./logger";

// 使用 createRequire 导入 CommonJS 模块
const require = createRequire(import.meta.url);
const express = require("express");
const serveIndex = require("serve-index");

/**
 * 发送错误响应
 */
function sendError(res: Response, statusCode: number, message: string): void {
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
 * 设置 Express 路由
 */
export function setupRoutes(
  app: Express,
  port: number,
  staticRoot: string | null,
  logsDir: string | null
): void {
  // 根路径
  app.get("/", (req: Request, res: Response) => {
    res.json({
      message: "HTTP Server is running",
      port: port,
      staticRoot: staticRoot,
      timestamp: new Date().toISOString(),
    });
  });

  // API 代理路由
  app.all("/raw", async (req: Request, res: Response) => {
    await handleProxyRequest(req, res, logsDir);
  });

  // 静态文件服务
  if (staticRoot) {
    // 静态文件服务
    app.use(
      express.static(staticRoot, {
        index: "index.html",
        fallthrough: true, // 允许继续执行下一个中间件（serve-index）
        setHeaders: (res: Response, path: string) => {
          res.setHeader("Cache-Control", "public, max-age=3600");
        },
      })
    );

    // 目录列表服务（使用 serve-index 中间件）
    // 当访问目录且目录下没有 index.html 时，会显示目录列表
    app.use(
      serveIndex(staticRoot, {
        icons: true, // 显示文件图标
        view: "details", // 显示详细信息（大小、修改时间等）
      })
    );
  }

  // 404 处理
  app.use((req: Request, res: Response) => {
    sendError(res, 404, "Not Found");
  });

  // 错误处理
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    log.error("处理 HTTP 请求失败:", err);
    sendError(res, 500, "Internal Server Error");
  });
}
