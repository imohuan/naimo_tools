/**
 * HTTP 服务器中间件配置
 */

import { createRequire } from "node:module";
import type { Express, Request, Response, NextFunction } from "express";

// 使用 createRequire 导入 CommonJS 模块
const require = createRequire(import.meta.url);
const express = require("express");

/**
 * 设置 Express 中间件
 */
export function setupMiddleware(app: Express): void {
  // CORS 中间件 - 支持所有跨域
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Expose-Headers", "*");
    next();
  });

  // 解析 JSON 请求体
  app.use(express.json());

  // 解析 URL 编码请求体
  app.use(express.urlencoded({ extended: true }));
}
