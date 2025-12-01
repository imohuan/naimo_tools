/**
 * 通用 HTTP 请求 IPC 路由模块
 * 在主进程中使用 net 模块发起请求，绕过 CORS 限制
 * 支持测试 URL 和完整请求（返回响应数据）
 */

import { net } from "electron";
import log from "electron-log";

// ==================== 类型定义 ====================

export interface UrlTestResult {
  url: string;
  ok: boolean;
  status?: number;
  time: number;
  error?: string;
}

export interface UrlTestOptions {
  timeout?: number;
  method?: "HEAD" | "GET";
}

export interface RequestOptions {
  /** 请求方法，默认 GET */
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求体（字符串、对象或 Buffer） */
  body?: string | object | Buffer;
  /** 超时时间（毫秒），默认 30000ms */
  timeout?: number;
  /** 响应类型，默认 'json' */
  responseType?: "text" | "json" | "arraybuffer" | "blob";
}

export interface RequestResult {
  /** 请求的 URL */
  url: string;
  /** HTTP 状态码 */
  status: number;
  /** 是否成功（2xx/3xx 视为成功） */
  ok: boolean;
  /** 响应头 */
  headers: Record<string, string>;
  /** 响应数据 */
  data?: any;
  /** 响应数据（原始 Buffer，当 responseType 为 arraybuffer 时） */
  buffer?: Buffer;
  /** 耗时（毫秒） */
  time: number;
  /** 错误信息（如果请求失败） */
  error?: string;
}

// ==================== 工具函数 ====================

/**
 * 解析 URL
 */
function parseUrl(url: string) {
  const urlObj = new URL(url);
  const isHttps = urlObj.protocol === "https:";
  const hostname = urlObj.hostname;
  const port = urlObj.port ? parseInt(urlObj.port, 10) : isHttps ? 443 : 80;
  const path = urlObj.pathname + urlObj.search;

  return {
    protocol: urlObj.protocol as "https:" | "http:",
    hostname,
    port,
    path,
  };
}

/**
 * 读取响应体数据
 */
function readResponseBody(
  response: Electron.IncomingMessage,
  responseType: "text" | "json" | "arraybuffer" | "blob" = "text"
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalLength = 0;

    response.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      totalLength += chunk.length;
    });

    response.on("end", () => {
      const buffer = Buffer.concat(chunks, totalLength);
      resolve(buffer);
    });

    response.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * 解析响应头
 */
function parseHeaders(
  headers: Record<string, string | string[]>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    result[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  return result;
}

// ==================== 核心请求函数 ====================

/**
 * 发起 HTTP 请求
 */
async function makeRequest(
  url: string,
  options: RequestOptions = {}
): Promise<RequestResult> {
  const start = Date.now();
  const method = options.method || "GET";
  const timeout = options.timeout ?? 30000;
  const responseType = options.responseType || "json";

  try {
    const { protocol, hostname, port, path } = parseUrl(url);

    return new Promise<RequestResult>((resolve, reject) => {
      const request = net.request({
        method,
        protocol,
        hostname,
        port,
        path,
      });

      // 设置请求头
      if (options.headers) {
        for (const [key, value] of Object.entries(options.headers)) {
          request.setHeader(key, value);
        }
      }

      // 处理请求体
      if (options.body && method !== "GET" && method !== "HEAD") {
        let bodyData: Buffer | string;

        if (Buffer.isBuffer(options.body)) {
          bodyData = options.body;
        } else if (typeof options.body === "object") {
          // 如果是对象，转换为 JSON
          bodyData = JSON.stringify(options.body);
          if (!options.headers?.["Content-Type"]) {
            request.setHeader("Content-Type", "application/json");
          }
        } else {
          bodyData = String(options.body);
        }

        request.write(bodyData);
      }

      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          request.abort();
          const time = Date.now() - start;
          reject({
            url,
            status: 0,
            ok: false,
            headers: {},
            time,
            error: "请求超时",
          });
        }
      }, timeout);

      request.on("response", async (response) => {
        if (!resolved) {
          try {
            const status = response.statusCode || 0;
            const headers = parseHeaders(response.headers);

            // 读取响应体
            let data: any;
            let buffer: Buffer | undefined;

            if (method !== "HEAD") {
              const responseBuffer = await readResponseBody(
                response,
                responseType
              );
              buffer = responseBuffer;

              // 根据响应类型解析数据
              if (responseType === "json") {
                try {
                  const text = responseBuffer.toString("utf-8");
                  data = text ? JSON.parse(text) : null;
                } catch (e) {
                  // 如果解析 JSON 失败，返回文本
                  data = responseBuffer.toString("utf-8");
                }
              } else if (responseType === "text") {
                data = responseBuffer.toString("utf-8");
              } else if (responseType === "arraybuffer") {
                data = Array.from(new Uint8Array(responseBuffer));
              } else {
                data = responseBuffer;
              }
            }

            resolved = true;
            clearTimeout(timer);

            resolve({
              url,
              status,
              ok: status >= 200 && status < 400,
              headers,
              data,
              buffer,
              time: Date.now() - start,
            });
          } catch (error: any) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              const time = Date.now() - start;
              reject({
                url,
                status: response.statusCode || 0,
                ok: false,
                headers: parseHeaders(response.headers),
                time,
                error: error?.message || String(error),
              });
            }
          }
        }
      });

      request.on("error", (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          const time = Date.now() - start;
          reject({
            url,
            status: 0,
            ok: false,
            headers: {},
            time,
            error: error.message || String(error),
          });
        }
      });

      request.on("abort", () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          const time = Date.now() - start;
          reject({
            url,
            status: 0,
            ok: false,
            headers: {},
            time,
            error: "请求被中止",
          });
        }
      });

      request.end();
    });
  } catch (error: any) {
    const time = Date.now() - start;
    throw {
      url,
      status: 0,
      ok: false,
      headers: {},
      time,
      error: error?.message || String(error),
    };
  }
}

/**
 * 测试单个 URL（仅检查可用性，不返回数据）
 */
async function testSingleUrl(
  url: string,
  options: UrlTestOptions = {}
): Promise<UrlTestResult> {
  const start = Date.now();
  const timeout = options.timeout ?? 8000;
  const method = options.method ?? "HEAD";

  try {
    const { protocol, hostname, port, path } = parseUrl(url);

    return new Promise<UrlTestResult>((resolve) => {
      const request = net.request({
        method,
        protocol,
        hostname,
        port,
        path,
      });

      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          request.abort();
          const time = Date.now() - start;
          resolve({
            url,
            ok: false,
            time,
            error: "请求超时",
          });
        }
      }, timeout);

      request.on("response", (response) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          const time = Date.now() - start;
          const status = response.statusCode;
          resolve({
            url,
            ok: status >= 200 && status < 400,
            status,
            time,
          });
        }
      });

      request.on("error", async (error) => {
        if (!resolved) {
          // 如果 HEAD 方法失败，自动回退到 GET
          if (method === "HEAD") {
            clearTimeout(timer);
            try {
              const getResult = await testSingleUrl(url, {
                ...options,
                method: "GET",
              });
              if (!resolved) {
                resolved = true;
                resolve(getResult);
              }
            } catch (getError) {
              if (!resolved) {
                resolved = true;
                const time = Date.now() - start;
                resolve({
                  url,
                  ok: false,
                  time,
                  error: error.message || String(error),
                });
              }
            }
          } else {
            resolved = true;
            clearTimeout(timer);
            const time = Date.now() - start;
            resolve({
              url,
              ok: false,
              time,
              error: error.message || String(error),
            });
          }
        }
      });

      request.on("abort", () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          const time = Date.now() - start;
          resolve({
            url,
            ok: false,
            time,
            error: "请求被中止",
          });
        }
      });

      request.end();
    });
  } catch (error: any) {
    const time = Date.now() - start;
    return {
      url,
      ok: false,
      time,
      error: error?.message || String(error),
    };
  }
}

// ==================== IPC 路由函数 ====================

/**
 * 测试多个 URL（仅检查可用性）
 * @param event IPC事件对象
 * @param urls URL 列表
 * @param options 测试选项
 * @returns 测试结果列表
 */
export async function testUrls(
  event: Electron.IpcMainInvokeEvent,
  urls: string[],
  options: UrlTestOptions = {}
): Promise<UrlTestResult[]> {
  try {
    const uniqueUrls = Array.from(
      new Set(urls.filter((u) => !!u && typeof u === "string"))
    );

    if (uniqueUrls.length === 0) {
      return [];
    }

    log.info(`测试 ${uniqueUrls.length} 个 URL`);

    // 并发测试所有 URL
    const results = await Promise.all(
      uniqueUrls.map((url) => testSingleUrl(url, options))
    );

    const successCount = results.filter((r) => r.ok).length;
    log.info(`URL 测试完成: ${successCount}/${results.length} 个可用`);

    return results;
  } catch (error) {
    log.error("测试 URL 失败:", error);
    return urls.map((url) => ({
      url,
      ok: false,
      time: 0,
      error: String(error),
    }));
  }
}

/**
 * 发起 HTTP 请求（返回完整响应数据）
 * @param event IPC事件对象
 * @param url 请求 URL
 * @param options 请求选项
 * @returns 请求结果
 */
export async function request(
  event: Electron.IpcMainInvokeEvent,
  url: string,
  options: RequestOptions = {}
): Promise<RequestResult> {
  try {
    log.info(`发起请求: ${options.method || "GET"} ${url}`);
    const result = await makeRequest(url, options);
    log.info(`请求完成: ${url} - ${result.status} (${result.time}ms)`);
    return result;
  } catch (error: any) {
    log.error(`请求失败: ${url}`, error);
    // 如果错误已经是 RequestResult 格式，直接返回
    if (error && typeof error === "object" && "url" in error) {
      return error;
    }
    // 否则包装成 RequestResult
    throw {
      url,
      status: 0,
      ok: false,
      headers: {},
      time: 0,
      error: error?.message || String(error),
    };
  }
}
