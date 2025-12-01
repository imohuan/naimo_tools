import { ref } from "vue";

/** URL 测试结果 */
export interface UrlTestResult {
  /** 原始或最终请求的 URL */
  url: string;
  /** 是否可用（HTTP 状态 2xx/3xx 视为可用） */
  ok: boolean;
  /** HTTP 状态码 */
  status?: number;
  /** 耗时，毫秒 */
  time: number;
  /** 错误信息（如果请求失败） */
  error?: string;
}

export interface UrlTestOptions {
  /** 超时时间（毫秒），默认 8000ms */
  timeout?: number;
  /** 请求方法，默认 HEAD，部分站点不支持时会自动回退到 GET */
  method?: "HEAD" | "GET";
}

/** 请求选项 */
export interface RequestOptions {
  /** 请求方法，默认 GET */
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求体（字符串、对象或 Buffer） */
  body?: string | object | ArrayBuffer;
  /** 超时时间（毫秒），默认 30000ms */
  timeout?: number;
  /** 响应类型，默认 'json' */
  responseType?: "text" | "json" | "arraybuffer" | "blob";
}

/** 请求结果 */
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
  buffer?: ArrayBuffer;
  /** 耗时（毫秒） */
  time: number;
  /** 错误信息（如果请求失败） */
  error?: string;
}

/**
 * 构造镜像 URL
 * - 支持直接拼接：mirror + originalUrl
 * - 支持占位符：mirror 中包含 {url} 时会替换为 originalUrl
 */
export function buildMirrorUrl(
  mirrorBase: string,
  originalUrl: string
): string {
  const base = (mirrorBase || "").trim();
  if (!base) return originalUrl;

  if (base.includes("{url}")) {
    return base.replace(/\{url\}/g, originalUrl);
  }

  return `${base.replace(/\/+$/, "/")}${originalUrl}`;
}

/**
 * 低层级 URL 测试函数
 * 不依赖 Vue 组件生命周期，可在任意模块中直接使用
 * 在 Electron 环境中使用 IPC 调用主进程，绕过 CORS 限制
 */
export async function testUrlsRaw(
  urls: string[],
  options: UrlTestOptions = {}
): Promise<UrlTestResult[]> {
  const uniqueUrls = Array.from(
    new Set(urls.filter((u) => !!u && typeof u === "string"))
  );
  if (uniqueUrls.length === 0) return [];

  // 在 Electron 环境中，使用 IPC 调用主进程测试 URL（绕过 CORS）
  if (typeof window !== "undefined" && window.naimo?.router) {
    try {
      const results = await window.naimo.router.httpClientTestUrls(
        uniqueUrls,
        options
      );
      return results;
    } catch (error: any) {
      console.error("通过 IPC 测试 URL 失败，回退到 fetch:", error);
      // 如果 IPC 调用失败，回退到原来的 fetch 方式
    }
  }

  // 非 Electron 环境或 IPC 调用失败时，使用 fetch（可能受 CORS 限制）
  const timeout = options.timeout ?? 8000;
  const method = options.method ?? "HEAD";

  const runForUrl = async (url: string): Promise<UrlTestResult> => {
    const start = performance.now();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const doFetch = async (m: "HEAD" | "GET"): Promise<Response> => {
      return await fetch(url, {
        method: m,
        signal: controller.signal,
        // 尽量只做连通性测试，不传多余 body / header
      });
    };

    try {
      let response: Response;
      try {
        response = await doFetch(method);
      } catch (error: any) {
        // 部分站点不支持 HEAD，自动回退到 GET
        if (method === "HEAD") {
          response = await doFetch("GET");
        } else {
          throw error;
        }
      } finally {
        clearTimeout(timer);
      }

      const time = performance.now() - start;
      return {
        url,
        ok: response.ok,
        status: response.status,
        time,
      };
    } catch (error: any) {
      clearTimeout(timer);
      const time = performance.now() - start;
      return {
        url,
        ok: false,
        time,
        error: error?.message || String(error),
      };
    }
  };

  // 并发测试所有 URL
  const results = await Promise.all(uniqueUrls.map(runForUrl));
  return results;
}

/** 从测试结果中选出可用且耗时最短的 URL */
export function getFastestAvailable(
  results: UrlTestResult[]
): UrlTestResult | undefined {
  const okList = results.filter((r) => r.ok);
  if (okList.length === 0) return undefined;
  return okList.sort((a, b) => a.time - b.time)[0];
}

/**
 * 发起 HTTP 请求（返回完整响应数据）
 * 在 Electron 环境中使用 IPC 调用主进程，绕过 CORS 限制
 */
export async function request(
  url: string,
  options: RequestOptions = {}
): Promise<RequestResult> {
  // 在 Electron 环境中，使用 IPC 调用主进程发起请求（绕过 CORS）
  if (typeof window !== "undefined" && window.naimo?.router) {
    try {
      const result = await window.naimo.router.httpClientRequest(url, options);
      return result;
    } catch (error: any) {
      console.error("通过 IPC 发起请求失败，回退到 fetch:", error);
      // 如果 IPC 调用失败，回退到原来的 fetch 方式
    }
  }

  // 非 Electron 环境或 IPC 调用失败时，使用 fetch（可能受 CORS 限制）
  const timeout = options.timeout ?? 30000;
  const method = options.method || "GET";
  const start = performance.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const fetchOptions: RequestInit = {
      method,
      signal: controller.signal,
      headers: options.headers,
    };

    if (options.body && method !== "GET" && method !== "HEAD") {
      if (typeof options.body === "string") {
        fetchOptions.body = options.body;
      } else if (options.body instanceof ArrayBuffer) {
        fetchOptions.body = options.body;
      } else if (typeof options.body === "object") {
        fetchOptions.body = JSON.stringify(options.body);
        if (!options.headers?.["Content-Type"]) {
          fetchOptions.headers = {
            ...fetchOptions.headers,
            "Content-Type": "application/json",
          };
        }
      }
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timer);

    const time = performance.now() - start;
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let data: any;
    let buffer: ArrayBuffer | undefined;

    if (method !== "HEAD") {
      if (
        options.responseType === "arraybuffer" ||
        options.responseType === "blob"
      ) {
        buffer = await response.arrayBuffer();
        data = buffer;
      } else if (options.responseType === "text") {
        data = await response.text();
      } else {
        // 默认 json
        try {
          data = await response.json();
        } catch {
          data = await response.text();
        }
      }
    }

    return {
      url,
      status: response.status,
      ok: response.ok,
      headers,
      data,
      buffer,
      time,
    };
  } catch (error: any) {
    clearTimeout(timer);
    const time = performance.now() - start;
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
 * 组合式函数：用于组件中测试 URL 列表和发起请求
 * 提供 testing 状态和封装后的 testUrls、request 方法
 */
export function useHttpClient() {
  const testing = ref(false);
  const requesting = ref(false);

  const testUrls = async (
    urls: string[],
    options: UrlTestOptions = {}
  ): Promise<UrlTestResult[]> => {
    if (!urls || urls.length === 0) return [];
    testing.value = true;
    try {
      const results = await testUrlsRaw(urls, options);
      return results;
    } finally {
      testing.value = false;
    }
  };

  const makeRequest = async (
    url: string,
    options: RequestOptions = {}
  ): Promise<RequestResult> => {
    requesting.value = true;
    try {
      const result = await request(url, options);
      return result;
    } finally {
      requesting.value = false;
    }
  };

  return {
    testing,
    requesting,
    testUrls,
    request: makeRequest,
    getFastestAvailable,
  };
}
