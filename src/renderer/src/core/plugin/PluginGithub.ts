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
}

export class PluginGithub {
  private static instance: PluginGithub
  // private queryPrefix = "naimo_tools:"
  private querySuffix = "language:typescript"
  private branch = "build"
  private queryUrl: string = `https://api.github.com/search/repositories?q=${this.querySuffix}`
  private result: GithubSearch

  constructor() {
    this.result = {
      search: "",
      page: 0,
      loadding: false,
      incomplete_results: false,
      total_count: 0,
      items: []
    }
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

  async getList(searchText: string = "", page: number = 1) {
    const search = searchText.replace(/&/g, "_")
    this.result.search = searchText
    this.result.page = page
    this.result.loadding = true
    const url = this.queryUrl + search

    await request.get<GithubSearch>(url + `&page=${page}`).then(res => {
      if (!res) return res
      if (res.items) {
        res.items = res.items.map((item: any) => {
          const [user, repo] = item.full_name.split("/")
          return {
            description: item.description, user, repo,
            updated_at: item.updated_at, pushed_at: item.pushed_at
          }
        })
        this.result.items = res.items
        this.result.incomplete_results = res.incomplete_results
        this.result.total_count = res.total_count
        return res
      }
    }).finally(() => {
      this.result.loadding = false
    })

    return this.result
  }

  // 加载更多
  async loadMore() {
    await this.getList(this.result.search, this.result.page + 1)
  }

  async getConfig(user: string, repo: string) {
    const url = `https://raw.githubusercontent.com/${user}/${repo}/${this.branch}/plugin.json`
    const result = await request.get<PluginConfig>(url)
    return result
  }

  async download(user: string, repo: string) {
    const url = `https://github.com/${user}/${repo}/archive/refs/heads/${this.branch}.zip`
    const result = await request.get<Blob>(url)
    return result
  }
}


