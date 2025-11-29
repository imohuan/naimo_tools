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
 */
export async function testUrlsRaw(
  urls: string[],
  options: UrlTestOptions = {}
): Promise<UrlTestResult[]> {
  const timeout = options.timeout ?? 8000;
  const method = options.method ?? "HEAD";

  const uniqueUrls = Array.from(
    new Set(urls.filter((u) => !!u && typeof u === "string"))
  );
  if (uniqueUrls.length === 0) return [];

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
 * 组合式函数：用于组件中测试 URL 列表
 * 提供 testing 状态和封装后的 testUrls 方法
 */
export function useUrlTester() {
  const testing = ref(false);

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

  return {
    testing,
    testUrls,
    getFastestAvailable,
  };
}
