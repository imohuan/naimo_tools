import { request } from '@/core/request'
import type { PluginConfig } from '@/typings/plugin-types'

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
}

export interface PluginGithubItem {
  /** 描述 */
  description: string
  /** 用户 */
  user: string
  /** 仓库 */
  repo: string
  /** 更新时间 */
  updated_at: string
  /** 推送时间 */
  pushed_at: string
  /** 配置 */
  config: PluginConfig | null
}

export class PluginGithub {
  private static instance: PluginGithub
  private queryPrefix = "naimo_tools-"
  private branch = "build"
  private queryUrl: string = `https://api.github.com/search/repositories?q=${this.queryPrefix}`
  private result: GithubSearch
  private cacheExpireTime = 8 * 60 * 60 * 1000 // 8小时的毫秒数

  constructor() {
    this.result = {
      search: "",
      page: 0,
      loadding: false,
      incomplete_results: false,
      total_count: 0,
      items: []
    }
    // 初始化时清理过期缓存
    this.clearExpiredCache()
    this.initialize()
  }

  static getInstance() {
    if (!PluginGithub.instance) {
      PluginGithub.instance = new PluginGithub()
    }
    return PluginGithub.instance
  }

  async initialize() {
    await this.loadMore()
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(searchText: string, page: number): string {
    return `plugin_github_cache_${searchText}_${page}`
  }

  /**
   * 从localStorage获取缓存数据
   */
  private getCachedData(searchText: string, page: number): GithubSearch | null {
    const cacheKey = this.getCacheKey(searchText, page)
    const cacheData = localStorage.getItem(cacheKey)

    if (!cacheData) {
      return null
    }

    try {
      const parsed = JSON.parse(cacheData)
      const now = Date.now()

      // 检查缓存是否过期
      if (now - parsed.timestamp > this.cacheExpireTime) {
        localStorage.removeItem(cacheKey)
        return null
      }

      return parsed.data
    } catch (error) {
      console.error('解析缓存数据失败:', error)
      localStorage.removeItem(cacheKey)
      return null
    }
  }

  /**
   * 将数据保存到localStorage缓存
   */
  private setCachedData(searchText: string, page: number, data: GithubSearch): void {
    const cacheKey = this.getCacheKey(searchText, page)
    const cacheData = {
      timestamp: Date.now(),
      data: data
    }

    try {
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    } catch (error) {
      console.error('保存缓存数据失败:', error)
      // 如果localStorage空间不足，清理过期缓存
      this.clearExpiredCache()
    }
  }

  /**
   * 清理过期的缓存
   */
  private clearExpiredCache(): void {
    const now = Date.now()
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('plugin_github_cache_')) {
        try {
          const data = localStorage.getItem(key)
          if (data) {
            const parsed = JSON.parse(data)
            if (now - parsed.timestamp > this.cacheExpireTime) {
              keysToRemove.push(key)
            }
          }
        } catch (error) {
          keysToRemove.push(key)
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  async getListAynsc(searchText: string = "", page: number = 1) {
    const search = searchText.replace(/&/g, "_")
    this.result.search = searchText
    this.result.page = page
    this.result.loadding = true
    this.result.items = []

    // 检查缓存
    const cachedData = this.getCachedData(searchText, page)
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
      this.setCachedData(searchText, page, this.result)
    }).finally(() => {
      this.result.loadding = false
    })
    return this.result
  }

  async getList(searchText: string = "", page: number = 1) {
    const search = searchText.replace(/&/g, "_")
    this.result.search = searchText
    this.result.page = page
    this.result.loadding = true

    // 检查缓存
    const cachedData = this.getCachedData(searchText, page)
    if (cachedData) {
      this.result = cachedData
      this.result.loadding = false
      return this.result
    }

    const url = this.queryUrl + search

    await request.get<GithubSearch>(url + `&page=${page}`).then(async res => {
      if (!res) return res
      if (res.items) {
        res.items = res.items.map((item: any) => {
          const [user, repo] = item.full_name.split("/")
          return {
            description: item.description, user, repo,
            updated_at: item.updated_at, pushed_at: item.pushed_at, config: null
          }
        }).filter(item => item.repo?.startsWith(this.queryPrefix))

        res.items = await Promise.all(res.items.map(async (item: any) => {
          const config = await this.getConfig(item.user, item.repo)
          config.downloadUrl = await this.getDownloadUrl(item.user, item.repo)
          return { ...item, config }
        }))

        this.result.items = res.items
        this.result.incomplete_results = res.incomplete_results
        this.result.total_count = res.total_count

        // 保存到缓存
        this.setCachedData(searchText, page, this.result)
        return res
      }
    }).finally(() => {
      this.result.loadding = false
    })

    return this.result
  }

  // 加载更多
  async loadMore() {
    await this.getListAynsc(this.result.search, this.result.page + 1)
  }

  async getConfig(user: string, repo: string) {
    const url = `https://raw.githubusercontent.com/${user}/${repo}/${this.branch}/manifest.json`
    const result = await request.get<PluginConfig>(url)
    return result
  }

  async getDownloadUrl(user: string, repo: string) {
    const url = `https://github.com/${user}/${repo}/archive/refs/heads/${this.branch}.zip`
    return url
  }

  /**
   * 清理所有插件相关的缓存
   */
  public clearAllCache(): void {
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('plugin_github_cache_')) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
}


