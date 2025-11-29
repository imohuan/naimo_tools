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

/**
 * GitHub 相关 URL 构造工具类
 * - 支持使用 {{var}} 模板占位符
 * - 对搜索、配置、下载等 URL 进行集中管理
 */
export class GithubUrlBuilder {
  private readonly branch: string;
  private readonly queryPrefix: string;
  private templates: GithubUrlTemplates;

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
    this.templates = {
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
  }

  /**
   * 设置 URL 模板
   */
  public setTemplates(templates: Partial<GithubUrlTemplates>): void {
    this.templates = {
      ...this.templates,
      ...templates,
    };
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
