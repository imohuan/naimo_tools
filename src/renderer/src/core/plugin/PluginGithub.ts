import { request } from '@/core/request'
import { CacheManager } from '@/core/CacheManager'
import type { PluginConfig } from '@/typings/pluginTypes'
import { uniqueArrayByProperty } from '@/utils'

export interface GithubSearch {
  /** 搜索 */
  search: string
  /** 页码 */
  page: number
  /** 加载 */
  loadding: boolean
  /** 是否不完全结果 */
  incomplete_results: boolean
  /** 总数量 */
  total_count: number
  /** 结果 */
  items: PluginGithubItem[]
  /** 是否加载完毕 */
  is_complete: boolean
}

export interface PluginGithubItem {
  /** 描述 */
  description: string
  /** 用户 */
  user: string
  /** 仓库 */
  repo: string
  /** 完整名称 (user/repo) */
  full_name: string
  /** 更新时间 */
  updated_at: string
  /** 推送时间 */
  pushed_at: string
  /** 配置 */
  config: PluginConfig | null
}

export interface TokenCallback {
  (setToken: (token: string) => void): void
}

export class PluginGithub {
  private static instance: PluginGithub
  private queryPrefix = "naimo_tools-"
  private branch = "build"
  private queryUrl: string = `https://api.github.com/search/repositories?q=${this.queryPrefix}`
  result: GithubSearch
  private cacheManager: CacheManager
  private githubToken: string = ""
  private tokenCallback: TokenCallback = () => { }

  constructor() {
    this.result = {
      search: "",
      page: 0,
      loadding: false,
      incomplete_results: false,
      total_count: 0,
      items: [],
      is_complete: false
    }
    // 初始化缓存管理器
    this.cacheManager = new CacheManager({
      prefix: 'plugin_github_cache',
      // expireTime: 8 * 60 * 60 * 1000 // 8小时
      expireTime: 10 * 1000 // 10秒
    })

    this.githubToken = localStorage.getItem('github_token') || ""
  }

  static getInstance() {
    if (!PluginGithub.instance) {
      PluginGithub.instance = new PluginGithub()
    }
    return PluginGithub.instance
  }

  setTokenCallback(callback: TokenCallback) {
    this.tokenCallback = callback
  }

  async loginGithub() {
    await naimo.auto.fetchHTML("https://www.github.com", {
      show: true,
      timeout: 60 * 1000,
      steps: [
        { action: "waitForTimeout", args: [60 * 1000] }
      ]
    })
    console.log("Fetch HTML", 1111111111111);
  }


  async getListAynsc(searchText: string = "", page: number = 1) {
    const search = searchText.replace(/&/g, "_")
    this.result.search = searchText
    this.result.page = page
    this.result.loadding = true
    this.result.items = []

    // 检查缓存
    const cachedData = this.cacheManager.get<GithubSearch>(searchText, page)
    if (cachedData) {
      this.result = cachedData
      this.result.loadding = false
      return this.result
    }

    await naimo.auto.fetchHTML(`https://github.com/search?q=${this.queryPrefix + search}&type=repositories&p=${page}`, {
      show: true,
      steps: [{
        action: "waitForSelector", args: ['div[data-testid="results-list"] > div']
      }],
    }).then(async res => {
      let { items } = res.getConfig([
        {
          name: "items", cls: 'div[data-testid="results-list"] > div', children: [
            { name: "full_name", cls: ".prc-Link-Link-85e08::text" },
            { name: "description", cls: ".gKFdvh.search-match.prc-Text-Text-0ima0::text" },
          ]
        }
      ])

      let resultItems: any[] = []

      items.forEach((item: any) => {
        const [user, repo] = item.full_name.split("/")
        if (repo.startsWith(this.queryPrefix)) {
          resultItems.push({
            description: item.description, user, repo,
            updated_at: new Date().toISOString(), pushed_at: new Date().toISOString(), config: null
          })
        }
      })

      resultItems = await Promise.all(resultItems.map(async (item: any) => {
        const config = await this.getConfig(item.user, item.repo)
        config.downloadUrl = await this.getDownloadUrl(item.user, item.repo)
        return { ...item, config }
      }))

      this.result.items = resultItems
      this.result.incomplete_results = false
      this.result.total_count = items.length * 30

      // 保存到缓存
      this.cacheManager.set(this.result, searchText, page)
    }).finally(() => {
      this.result.loadding = false
    })
    return this.result
  }

  setGithubToken(token: string) {
    this.githubToken = token
    localStorage.setItem('github_token', token)
  }

  async getList(searchText: string = "", page: number = 1) {
    if (this.result.is_complete) return

    const search = searchText.replace(/&/g, "_")
    this.result.search = searchText
    this.result.page = page
    this.result.loadding = true

    // 检查缓存
    const cachedData = this.cacheManager.get<GithubSearch>(searchText, page)
    if (cachedData) {
      this.result = cachedData
      this.result.loadding = false
      return this.result
    }

    // this.tokenCallback((token) => this.setGithubToken(token))

    const url = this.queryUrl + search
    // const token = "your_github_token_here"
    const option: any = {}
    if (this.githubToken.trim()) {
      option.headers = { 'Authorization': `Bearer ${this.githubToken.trim()}` }
    }

    await request.get<GithubSearch>(url + `&page=${page}`, option).then(async res => {
      if (!res) return res
      if (res.items) {

        if (res.items.length < 30) {
          this.result.is_complete = true
        }

        res.items = res.items.map((item: any) => {
          const [user, repo] = item.full_name.split("/")
          return {
            description: item.description, user, repo, full_name: `${user}/${repo}`,
            updated_at: item.updated_at, pushed_at: item.pushed_at, config: null
          }
        }).filter(item => item.repo?.startsWith(this.queryPrefix))

        res.items = await Promise.all(res.items.map(async (item: any) => {
          const config = await this.getConfig(item.user, item.repo)
          if (config.icon) config.icon = await this.getResolveUrl(item.user, item.repo, config.icon)
          config.downloadUrl = await this.getDownloadUrl(item.user, item.repo)
          return { ...item, config }
        }))

        const items = [...this.result.items, ...res.items]
        const newItems = uniqueArrayByProperty(items, 'full_name')

        this.result.items = newItems
        this.result.incomplete_results = res.incomplete_results
        this.result.total_count = res.total_count

        // 保存到缓存
        this.cacheManager.set(this.result, searchText, page)
        return res
      }
    }).catch(err => {
      if (err.message === "拒绝访问") {
        // 需要获取token
        this.tokenCallback((token) => this.setGithubToken(token))
      }
    }).finally(() => {
      this.result.loadding = false
    })

    return this.result
  }

  // 加载更多
  async loadMore() {
    // await this.getListAynsc(this.result.search, this.result.page + 1)
    await this.getList(this.result.search, this.result.page + 1)
  }

  async getConfig(user: string, repo: string) {
    const url = `https://raw.githubusercontent.com/${user}/${repo}/${this.branch}/manifest.json`
    const result = await request.get<PluginConfig>(url)
    return result
  }

  /**
   * 获取资源的绝对URL地址，自动处理相对路径、绝对路径、http(s)等多种情况
   * @param user 仓库用户
   * @param repo 仓库名
   * @param paths 资源路径（支持相对路径、绝对路径、http(s)等）
   * @returns 资源的可访问URL
   */
  async getResolveUrl(user: string, repo: string, ...paths: string[]) {
    // 处理路径为空的情况
    if (!paths || paths.length === 0 || !paths[0]) return ""

    let path = paths.join("/")
    // 去除路径前后的空格
    path = path.trim()

    // 如果是http/https开头，直接返回
    if (/^https?:\/\//i.test(path)) {
      return path
    }

    // 如果是绝对路径（以/开头），去掉开头的/
    if (path.startsWith("/")) {
      path = path.replace(/^\/+/, "")
    }

    // 如果是相对路径（./ 或 ../），需要规范化
    // 这里简单处理，去掉开头的./
    if (path.startsWith("./")) {
      path = path.replace(/^\.\//, "")
    }

    // 处理 ../ 的情况
    // 假设资源都在仓库根目录下，简单去掉 ../
    while (path.startsWith("../")) {
      path = path.replace(/^\.\.\//, "")
    }

    // 拼接最终URL
    const url = `https://raw.githubusercontent.com/${user}/${repo}/${this.branch}/${path}`
    return url
  }


  async getDownloadUrl(user: string, repo: string) {
    const url = `https://github.com/${user}/${repo}/archive/refs/heads/${this.branch}.zip`
    return url
  }

  /**
   * 清理所有插件相关的缓存
   */
  public clearAllCache(): void {
    this.cacheManager.clearAllCache()
  }
}


