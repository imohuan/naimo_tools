/**
 * HTTP 代理请求处理模块
 */

import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import type { Request, Response } from "express";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { isValidUrl } from "./utils";
import { log } from "./logger";

/**
 * 判断是否为文本类内容（需要保存日志）
 */
function isTextContent(contentType: string | undefined): boolean {
  if (!contentType) {
    return false;
  }

  const contentTypeLower = contentType.toLowerCase();
  const textTypes = [
    "text/",
    "application/json",
    "application/javascript",
    "application/xml",
    "application/xhtml+xml",
    "application/x-www-form-urlencoded",
  ];

  // 排除文件类型
  const excludeTypes = [
    "image/",
    "video/",
    "audio/",
    "application/octet-stream",
    "application/pdf",
    "application/zip",
    "application/x-zip-compressed",
  ];

  // 检查是否在排除列表中
  for (const excludeType of excludeTypes) {
    if (contentTypeLower.includes(excludeType)) {
      return false;
    }
  }

  // 检查是否为文本类型
  for (const textType of textTypes) {
    if (contentTypeLower.includes(textType)) {
      return true;
    }
  }

  return false;
}

/**
 * 保存请求日志
 */
async function saveRequestLog(
  logsDir: string | null,
  requestInfo: {
    method: string;
    url: string;
    headers: Record<string, string>;
    query: Record<string, any>;
    body: any;
  },
  responseInfo: {
    status: number;
    headers: Record<string, string>;
    body: string;
    contentType: string | undefined;
  }
): Promise<void> {
  if (!logsDir) {
    return;
  }

  try {
    // 确保日志目录存在
    await mkdir(logsDir, { recursive: true });

    // 生成日志文件名（使用时间戳）
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logFileName = `request-${timestamp}.json`;
    const logFilePath = join(logsDir, logFileName);

    // 构建日志对象
    const logData = {
      timestamp: new Date().toISOString(),
      request: {
        method: requestInfo.method,
        url: requestInfo.url,
        headers: requestInfo.headers,
        query: requestInfo.query,
        body: requestInfo.body,
      },
      response: {
        status: responseInfo.status,
        headers: responseInfo.headers,
        contentType: responseInfo.contentType,
        body: responseInfo.body,
      },
    };

    // 保存日志文件
    await writeFile(logFilePath, JSON.stringify(logData, null, 2), "utf-8");
    log.debug(`请求日志已保存: ${logFilePath}`);
  } catch (error) {
    log.warn("保存请求日志失败:", error);
  }
}

/**
 * 处理代理请求
 */
export async function handleProxyRequest(
  req: Request,
  res: Response,
  logsDir: string | null = null
): Promise<void> {
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
    if (!isValidUrl(targetUrl)) {
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

    // 从 query 参数获取自定义头部（优先级最高，会覆盖其他头部）
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

    // 排除不应该转发的头部
    const excludeHeaders = [
      "host", // 目标服务器的 host，不应该转发
      "connection", // 连接相关，不应该转发
      "content-length", // 会在后面根据实际数据设置
      "accept-encoding", // 不转发，让服务器返回未压缩的内容，避免解压问题
      "transfer-encoding", // 传输编码，不应该转发
    ];

    // 转发原始请求的所有头部（除了排除列表中的）
    for (const [key, value] of Object.entries(req.headers)) {
      const lowerKey = key.toLowerCase();

      // 跳过排除列表中的头部
      if (excludeHeaders.includes(lowerKey)) {
        continue;
      }

      // 只处理字符串类型的头部值（Express 中头部可能是字符串或字符串数组）
      if (value) {
        if (typeof value === "string") {
          // 如果自定义头部中已有该头部，跳过（自定义头部优先级更高）
          if (!headers[key]) {
            headers[key] = value;
          }
        } else if (Array.isArray(value) && value.length > 0) {
          // 如果是数组，取第一个值
          if (!headers[key]) {
            headers[key] = value[0];
          }
        }
      }
    }

    if (Object.keys(headers).length > 0) {
      requestConfig.headers = headers;
    }

    // 辅助函数：查找头部（不区分大小写）
    const getHeader = (headerName: string): string | undefined => {
      const lowerName = headerName.toLowerCase();
      for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === lowerName) {
          return value;
        }
      }
      return undefined;
    };

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
          if (!getHeader("Content-Type")) {
            headers["content-type"] = "application/json";
          }
        }
      } else if (
        contentTypeLower.includes("application/x-www-form-urlencoded")
      ) {
        // 表单数据
        requestConfig.data = req.body;
        if (!getHeader("Content-Type")) {
          headers["content-type"] =
            contentType || "application/x-www-form-urlencoded";
        }
      } else if (req.body) {
        // 原始数据（可能是 Buffer、字符串或其他格式）
        requestConfig.data = req.body;
        if (contentType && !getHeader("Content-Type")) {
          headers["content-type"] = contentType;
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
    const excludeResponseHeaders = [
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
      } else if (!excludeResponseHeaders.includes(lowerKey)) {
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

    // 判断是否需要保存日志（只保存文本类内容）
    const finalContentType =
      responseHeaders["Content-Type"] || originalContentType;
    if (isTextContent(finalContentType)) {
      // 异步保存日志，不阻塞响应
      saveRequestLog(
        logsDir,
        {
          method: method,
          url: targetUrl,
          headers: headers,
          query: req.query,
          body: req.body,
        },
        {
          status: response.status,
          headers: responseHeaders,
          contentType: finalContentType,
          body: responseData.toString("utf-8"),
        }
      ).catch((error) => {
        log.warn("保存请求日志失败:", error);
      });
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
