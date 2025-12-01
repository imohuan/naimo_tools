import {
  buildMirrorUrl,
  testUrlsRaw,
  type UrlTestResult,
} from "@/composables/useHttpClient";
import { storeUtils } from "@/core/utils/store";
import type { MirrorUrlItem } from "@shared/typings/appTypes";

export interface GithubUrlTemplates {
  /** 搜索仓库的 URL 模板 */
  searchUrlTemplate: string;
  /** 下载 zip 的 URL 模板 */
  downloadUrlTemplate: string;
  /** raw 文件的 URL 模板 */
  rawFileUrlTemplate: string;
}

export interface GithubUrlBuilderOptions {
  /** 分支名称，默认 build */
  branch?: string;
  /** 搜索前缀，默认 naimo_tools- */
  queryPrefix?: string;
  /** URL 模板对象 */
  templates?: Partial<GithubUrlTemplates>;
}

type TemplateParams = Record<
  string,
  string | number | boolean | undefined | null
>;

type TemplateKey = keyof GithubUrlTemplates;

interface MirrorEntry {
  value: string;
  order: number;
}

interface TemplateCandidate {
  key: TemplateKey;
  template: string;
  testUrl: string;
  mode: "default" | "prefix" | "base";
  weight: number;
}

/**
 * 负责管理 GitHub URL 模板及镜像测试逻辑的内部类
 * - 与存储、网络测试打交道
 * - 对外只暴露获取/设置模板和 ensureBestTemplates
 */
class GithubTemplateManager {
  private readonly queryPrefix: string;
  private readonly cacheKey: string;
  private readonly cacheTTL = 3 * 60 * 60 * 1000; // 3小时

  private templates: GithubUrlTemplates;
  private baseTemplates: GithubUrlTemplates;

  private initialized = false;
  private mirrorInitPromise: Promise<void> | null = null;

  constructor(branch: string, queryPrefix: string, base: GithubUrlTemplates) {
    this.queryPrefix = queryPrefix;
    this.baseTemplates = { ...base };
    this.templates = { ...base };
    this.cacheKey = `githubTemplatesCache_${branch}`;
  }

  public getTemplates(): GithubUrlTemplates {
    return this.templates;
  }

  public setTemplates(templates: Partial<GithubUrlTemplates>): void {
    this.baseTemplates = {
      ...this.baseTemplates,
      ...templates,
    };
    this.templates = {
      ...this.templates,
      ...templates,
    };
    // 不自动重新测试，仅在 force=true 时重新评估
  }

  /**
   * 根据设置自动选择最优模板
   * - 默认只在首次调用时执行一次
   * - 之后如需重新评估，显式传入 force=true
   */
  public async ensureBestTemplates(force = false): Promise<void> {
    if (this.mirrorInitPromise) {
      await this.mirrorInitPromise;
      if (!force) return;
    }

    if (this.initialized && !force) {
      return;
    }

    // 尝试从全局存储中读取 3 小时内的缓存结果，避免重复测速
    if (!this.initialized && !force) {
      const cached = await this.loadFromCache();
      if (cached) {
        this.templates = cached;
        this.initialized = true;
        return;
      }
    }

    this.mirrorInitPromise = this.refreshTemplatesFromMirror();
    try {
      await this.mirrorInitPromise;
      this.initialized = true;
    } finally {
      this.mirrorInitPromise = null;
    }
  }

  private async refreshTemplatesFromMirror(): Promise<void> {
    try {
      const [autoMirrorAccess, rawMirrorList] = await Promise.all([
        storeUtils.get("autoMirrorAccess"),
        storeUtils.get("mirrorUrls"),
      ]);

      const autoEnabled = Boolean(autoMirrorAccess);
      const mirrorList = Array.isArray(rawMirrorList)
        ? (rawMirrorList as MirrorUrlItem[])
        : [];

      if (!autoEnabled || mirrorList.length === 0) {
        this.templates = { ...this.baseTemplates };
        return;
      }

      const templateKeys: TemplateKey[] = [
        "searchUrlTemplate",
        "downloadUrlTemplate",
        "rawFileUrlTemplate",
      ];

      const updates: Partial<GithubUrlTemplates> = {};

      for (const key of templateKeys) {
        const bestTemplate = await this.pickBestTemplateForKey(key, mirrorList);
        updates[key] = bestTemplate || this.baseTemplates[key];
      }

      this.templates = {
        ...this.templates,
        ...updates,
      };
    } catch (error) {
      console.error("自动选择镜像模板失败:", error);
      this.templates = { ...this.baseTemplates };
    }

    // 无论成功失败，最终模板结果都写入缓存，供下次快速恢复
    await this.saveToCache(this.templates);
  }

  private async pickBestTemplateForKey(
    key: TemplateKey,
    mirrorList: MirrorUrlItem[]
  ): Promise<string | undefined> {
    const candidates = this.buildTemplateCandidates(key, mirrorList);
    if (candidates.length === 0) return undefined;

    const uniqueUrls = Array.from(
      new Set(candidates.map((candidate) => candidate.testUrl).filter(Boolean))
    );
    if (uniqueUrls.length === 0) return undefined;

    let results: UrlTestResult[] = [];
    try {
      results = await testUrlsRaw(uniqueUrls, {
        timeout: 3000,
        method: "HEAD",
      });
    } catch (error) {
      console.error("镜像模板测试失败:", error);
      return undefined;
    }

    const resultMap = new Map(results.map((item) => [item.url, item]));

    const officialCandidate = candidates.find(
      (candidate) => candidate.mode === "default"
    );
    const officialResult = officialCandidate
      ? resultMap.get(officialCandidate.testUrl)
      : undefined;

    if (officialCandidate && officialResult?.ok) {
      return officialCandidate.template;
    }

    const bestMirror = candidates
      .filter((candidate) => candidate.mode !== "default")
      .map((candidate) => ({
        candidate,
        result: resultMap.get(candidate.testUrl),
      }))
      .filter(
        (
          entry
        ): entry is {
          candidate: TemplateCandidate;
          result: UrlTestResult;
        } => Boolean(entry.result?.ok)
      )
      .sort((a, b) => {
        if (a.result.time !== b.result.time) {
          return a.result.time - b.result.time;
        }
        return a.candidate.weight - b.candidate.weight;
      })[0];

    return bestMirror?.candidate.template;
  }

  private buildTemplateCandidates(
    key: TemplateKey,
    mirrorList: MirrorUrlItem[]
  ): TemplateCandidate[] {
    const candidates: TemplateCandidate[] = [];
    const sampleParams = this.getSampleParams(key);
    const baseTemplate = this.baseTemplates[key];
    const baseTestUrl = this.buildTestUrl(baseTemplate, sampleParams);

    if (baseTemplate && baseTestUrl) {
      candidates.push({
        key,
        template: baseTemplate,
        testUrl: baseTestUrl,
        mode: "default",
        weight: -1,
      });
    }

    mirrorList.forEach((item, itemIndex) => {
      const selectedTemplates = this.normalizeTemplateSelection(item.templates);
      if (!selectedTemplates.includes(key)) return;

      const entries =
        item.mode === "prefix"
          ? this.splitEntries(item.prefix)
          : this.splitEntries(item.baseUrl);

      entries.forEach((entry) => {
        if (item.mode === "prefix") {
          if (!baseTemplate || !baseTestUrl) return;
          const testUrl = buildMirrorUrl(entry.value, baseTestUrl);
          const template = buildMirrorUrl(entry.value, baseTemplate);
          if (!testUrl || !template) return;
          candidates.push({
            key,
            template,
            testUrl,
            mode: "prefix",
            weight: itemIndex * 100 + entry.order,
          });
        } else {
          const template = entry.value;
          const testUrl = this.buildTestUrl(template, sampleParams);
          if (!testUrl) return;
          candidates.push({
            key,
            template,
            testUrl,
            mode: "base",
            weight: itemIndex * 100 + entry.order,
          });
        }
      });
    });

    return candidates;
  }

  private splitEntries(text?: string | null): MirrorEntry[] {
    if (!text) return [];
    const segments = text
      .split(/(?:\r?\n|\|)/)
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);

    const entries: MirrorEntry[] = [];
    segments.forEach((segment, index) => {
      const disabled = segment.startsWith("# ");
      const value = disabled ? segment.slice(2).trim() : segment;
      if (!value || disabled) return;
      entries.push({
        value,
        order: index,
      });
    });
    return entries;
  }

  private normalizeTemplateSelection(
    templates?: MirrorUrlItem["templates"]
  ): TemplateKey[] {
    if (!templates) return [];
    const list = Array.isArray(templates) ? templates : [templates];
    return list.filter(Boolean) as TemplateKey[];
  }

  private buildTestUrl(
    template: string | undefined,
    params: TemplateParams
  ): string {
    if (!template) return "";
    return this.parseTemplate(template, params);
  }

  private getSampleParams(key: TemplateKey): TemplateParams {
    if (key === "searchUrlTemplate") {
      return {
        queryPrefix: this.queryPrefix,
        search: "",
        page: 1,
      };
    }
    if (key === "downloadUrlTemplate") {
      return {
        user: "imohuan",
        repo: "naimo_tools",
        // 与 MirrorUrlsSetting 中的测试保持一致，使用 main 分支
        branch: "main",
      };
    }
    return {
      user: "imohuan",
      repo: "naimo_tools",
      // 与 MirrorUrlsSetting 中 raw 文件测试保持一致
      branch: "main",
      path: ".npmrc",
    };
  }

  private parseTemplate(template: string, params: TemplateParams): string {
    if (!template) return "";
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
      const value = params[key];
      return value === undefined || value === null ? "" : String(value);
    });
  }

  /** 从全局存储中加载缓存的模板（3 小时有效期） */
  private async loadFromCache(): Promise<GithubUrlTemplates | null> {
    try {
      if (typeof window === "undefined") return null;
      const anyWindow = window as any;
      const router = anyWindow.naimo?.router;
      if (!router?.storeGet) return null;

      const cached = await router.storeGet(this.cacheKey);
      if (!cached || typeof cached !== "object") return null;

      const timestamp = (cached as any).timestamp as number | undefined;
      const templates = (cached as any).templates as
        | GithubUrlTemplates
        | undefined;

      if (!timestamp || !templates) return null;
      if (Date.now() - timestamp > this.cacheTTL) return null;

      return templates;
    } catch (error) {
      console.error("加载 GitHub 模板缓存失败:", error);
      return null;
    }
  }

  /** 将当前模板写入全局存储，供下次快速恢复 */
  private async saveToCache(templates: GithubUrlTemplates): Promise<void> {
    try {
      if (typeof window === "undefined") return;
      const anyWindow = window as any;
      const router = anyWindow.naimo?.router;
      if (!router?.storeSet) return;

      await router.storeSet(this.cacheKey, {
        timestamp: Date.now(),
        templates,
      });
    } catch (error) {
      console.error("保存 GitHub 模板缓存失败:", error);
    }
  }
}

/**
 * GitHub 相关 URL 构造工具类
 * - 支持使用 {{var}} 模板占位符
 * - 对搜索、配置、下载等 URL 进行集中管理
 * - 镜像相关逻辑委托给 GithubTemplateManager
 */
export class GithubUrlBuilder {
  private readonly branch: string;
  private readonly queryPrefix: string;
  private readonly templateManager: GithubTemplateManager;

  private readonly defaultTemplates: GithubUrlTemplates = {
    searchUrlTemplate:
      "https://api.github.com/search/repositories?q={{queryPrefix}}{{search}}&page={{page}}",
    downloadUrlTemplate:
      "https://github.com/{{user}}/{{repo}}/archive/refs/heads/{{branch}}.zip",
    rawFileUrlTemplate:
      "https://raw.githubusercontent.com/{{user}}/{{repo}}/{{branch}}/{{path}}",
  };

  constructor(options?: GithubUrlBuilderOptions) {
    this.branch = options?.branch || "build";
    this.queryPrefix = options?.queryPrefix || "naimo_tools-";

    const baseTemplates: GithubUrlTemplates = {
      searchUrlTemplate:
        options?.templates?.searchUrlTemplate ||
        this.defaultTemplates.searchUrlTemplate,
      downloadUrlTemplate:
        options?.templates?.downloadUrlTemplate ||
        this.defaultTemplates.downloadUrlTemplate,
      rawFileUrlTemplate:
        options?.templates?.rawFileUrlTemplate ||
        this.defaultTemplates.rawFileUrlTemplate,
    };

    this.templateManager = new GithubTemplateManager(
      this.branch,
      this.queryPrefix,
      baseTemplates
    );
  }

  /**
   * 设置 URL 模板
   */
  public setTemplates(templates: Partial<GithubUrlTemplates>): void {
    this.templateManager.setTemplates(templates);
  }

  /**
   * 根据设置自动选择最优模板
   * - 当 autoMirrorAccess 启用时，会测试镜像配置并挑选最快可用模板
   * - 仅首次或 force=true 时会真正执行测试
   */
  public async ensureBestTemplates(force = false): Promise<void> {
    await this.templateManager.ensureBestTemplates(force);
  }

  private get templates(): GithubUrlTemplates {
    return this.templateManager.getTemplates();
  }

  /**
   * 通用模板解析函数
   * 例如: template = "http://xxx.com/{{search}}?page={{page}}"
   * params = { search: "abc", page: 1 }
   */
  public parse(template: string, params: TemplateParams): string {
    if (!template) return "";
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
      const value = params[key];
      return value === undefined || value === null ? "" : String(value);
    });
  }

  /** 构造搜索仓库的 URL */
  public getSearchUrl(search: string, page: number): string {
    // 与原逻辑保持一致，将 & 替换，避免影响查询字符串
    const safeSearch = (search || "").replace(/&/g, "_");
    return this.parse(this.templates.searchUrlTemplate, {
      queryPrefix: this.queryPrefix,
      search: safeSearch,
      page,
    });
  }

  /** 构造 manifest.json 配置文件的 URL */
  public getManifestUrl(user: string, repo: string): string {
    // 复用通用 raw 文件构造方法，附加时间戳避免缓存
    const path = `manifest.json?r=${Date.now()}`;
    return this.getRawFileUrl(user, repo, path);
  }

  /** 构造从 user/repo 下载 zip 的 URL */
  public getDownloadUrlFromUserRepo(user: string, repo: string): string {
    return this.parse(this.templates.downloadUrlTemplate, {
      user,
      repo,
      branch: this.branch,
    });
  }

  /** 构造 raw.githubusercontent.com 资源 URL */
  public getRawFileUrl(user: string, repo: string, path: string): string {
    return this.parse(this.templates.rawFileUrlTemplate, {
      user,
      repo,
      branch: this.branch,
      path,
    });
  }

  /**
   * 从字符串来源构造下载 URL
   * - "https://github.com/user/repo" → 加上 /archive/refs/heads/{{branch}}.zip
   * - "user/repo" → 使用 getDownloadUrlFromUserRepo
   */
  public getDownloadUrlFromSource(source: string): string {
    if (source.startsWith("https://github.com/")) {
      const template = "{{source}}/archive/refs/heads/{{branch}}.zip";
      return source.endsWith(".zip")
        ? source
        : this.parse(template, {
            source,
            branch: this.branch,
          });
    }

    if (/^[\w-]+\/[\w-]+$/.test(source)) {
      const [user, repo] = source.split("/");
      return this.getDownloadUrlFromUserRepo(user, repo);
    }

    throw new Error("无效的 GitHub 插件来源");
  }
}
