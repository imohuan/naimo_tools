import type { PluginConfig } from '@/typings/pluginTypes'
import { BasePluginInstaller } from './base'
import { PluginSourceType, type InstallOptions, type UninstallOptions } from '@/temp_code/typings/plugin'
import { request } from '@/temp_code/utils/request'
import { useCacheStore } from '@/temp_code/modules/cache'
import { uniqueArrayByProperty } from '@/temp_code/utils/unique'
import { set } from 'lodash-es'

/** GitHub 插件项 */
export interface GithubPluginItem {
  description: string
  user: string
  repo: string
  fullName: string
  config: PluginConfig | null
}

/** GitHub 搜索结果 */
export interface GithubSearchResult {
  search: string
  page: number
  loading: boolean
  totalCount: number
  items: GithubPluginItem[]
  isComplete: boolean
}

/**
 * GitHub 插件安装器
 * 处理从 GitHub 远程加载和安装插件
 */
export class GithubPluginInstaller extends BasePluginInstaller {
  readonly name = 'GitHub插件'
  readonly type = PluginSourceType.REMOTE
  readonly weight = 3
  readonly pluginType = 'github'

  private searchResult: GithubSearchResult = {
    search: '',
    page: 0,
    loading: false,
    totalCount: 0,
    items: [],
    isComplete: false
  }

  private readonly cachePrefix = 'plugin_github'
  private readonly cacheTTL = 8 * 60 * 60 * 1000 // 8小时
  private readonly queryPrefix = 'naimo_tools-'
  private readonly branch = 'build'
  private githubToken = localStorage.getItem('github_token') || ''
  private localInstaller: any = null

  /** 设置本地安装器 */
  setLocalInstaller(installer: any) {
    this.localInstaller = installer
  }

  /** 判断是否为 GitHub 插件来源 */
  canHandle(source: any): boolean {
    if (typeof source !== 'string') return false
    return source.startsWith('https://github.com/') ||
      source.startsWith('https://raw.githubusercontent.com/') ||
      /^[\w-]+\/[\w-]+$/.test(source)
  }

  /** 获取 GitHub 插件列表 */
  async getList(options?: { search?: string; page?: number }): Promise<PluginConfig[]> {
    const search = options?.search || ''
    const page = options?.page || 1

    console.log(`📋 [GitHub插件] 搜索: "${search}", 页码: ${page}`)

    // 检查缓存
    const cacheStore = useCacheStore()
    const cacheKey = `${this.cachePrefix}_${search}_${page}`
    const cached = cacheStore.get<GithubSearchResult>(cacheKey)

    if (cached) {
      console.log(`✅ 使用缓存数据`)
      this.searchResult = cached
      return this.getPluginConfigs()
    }

    // 搜索并缓存
    this.searchResult = { ...this.searchResult, search, page, loading: true }

    try {
      await this.searchGithubPlugins(search, page)
      cacheStore.set(cacheKey, this.searchResult, this.cacheTTL)
      return this.getPluginConfigs()
    } finally {
      this.searchResult.loading = false
    }
  }

  /** 搜索 GitHub 插件 */
  private async searchGithubPlugins(search: string, page: number) {
    const url = `https://api.github.com/search/repositories?q=${this.queryPrefix}${search.replace(/&/g, '_')}&page=${page}`
    const headers = this.githubToken ? { 'Authorization': `Bearer ${this.githubToken}` } : {}

    try {
      const res = await request.get<any>(url, { headers })
      if (!res?.items) return

      this.searchResult.isComplete = res.items.length < 30

      // 处理结果
      const items = res.items
        .filter((item: any) => item.full_name.split('/')[1]?.startsWith(this.queryPrefix))
        .map((item: any) => {
          const [user, repo] = item.full_name.split('/')
          return {
            description: item.description || '',
            user,
            repo,
            fullName: item.full_name,
            config: null
          }
        })

      // 并行加载配置
      const itemsWithConfig = await Promise.all(
        items.map((item: GithubPluginItem) => this.loadPluginConfig(item))
      )

      // 合并并去重
      this.searchResult.items = uniqueArrayByProperty(
        [...this.searchResult.items, ...itemsWithConfig],
        'fullName'
      )
      this.searchResult.totalCount = res.total_count
    } catch (error: any) {
      if (error.message === '拒绝访问') {
        console.warn(`⚠️ [GitHub插件] 需要 GitHub Token`)
      }
      throw error
    }
  }

  /** 加载单个插件配置 */
  private async loadPluginConfig(item: GithubPluginItem): Promise<GithubPluginItem> {
    try {
      const url = `https://raw.githubusercontent.com/${item.user}/${item.repo}/${this.branch}/manifest.json?r=${Date.now()}`
      const config = await request.get<PluginConfig>(url, {
        headers: { 'Content-Type': 'application/json' }
      })
      if (config) {
        // 处理图标和路径
        if (config.icon) config.icon = this.resolveRootUrl(item.user, item.repo, config.icon)
        set(config, 'downloadUrl', `https://github.com/${item.user}/${item.repo}/archive/refs/heads/${this.branch}.zip`)
        set(config, 'getResourcePath', (...paths: string[]) => this.resolveRootUrl(item.user, item.repo, ...paths))
        // 添加 GitHub 类型标记
        this.setPluginType(config)
        return { ...item, config }
      }
    } catch (error) {
      console.error(`❌ 加载配置失败: ${item.fullName}`)
    }
    return item
  }

  /** 解析资源URL: 以当前路径为跟路径 解析 */
  private resolveRootUrl(user: string, repo: string, ...paths: string[]): string {
    if (!paths?.[0]) return ''

    let path = paths.join('/').trim()
    if (/^https?:\/\//i.test(path)) return path

    // 清理路径
    path = path.replace(/^\/+|\.\/|\.\.\/+/g, '')
    return `https://raw.githubusercontent.com/${user}/${repo}/${this.branch}/${path}`
  }

  /** 安装 GitHub 插件 */
  async install(source: any, options?: InstallOptions): Promise<PluginConfig> {
    if (!this.localInstaller) throw new Error('本地安装器未初始化')
    // 获取下载URL
    let downloadUrl: string
    if (typeof source === 'object' && source.downloadUrl) {
      downloadUrl = source.downloadUrl
    } else if (typeof source === 'string') {
      if (source.startsWith('https://github.com/')) {
        downloadUrl = source.endsWith('.zip') ? source : `${source}/archive/refs/heads/${this.branch}.zip`
      } else if (/^[\w-]+\/[\w-]+$/.test(source)) {
        downloadUrl = `https://github.com/${source}/archive/refs/heads/${this.branch}.zip`
      } else {
        throw new Error('无效的 GitHub 插件来源')
      }
    } else {
      throw new Error('无效的插件来源')
    }
    console.log(`📥 [GitHub插件] 下载: ${downloadUrl}`)
    // 下载ZIP插件
    const { id, path: zipPath } = await this.download(downloadUrl)
    // 安装ZIP插件
    const plugin = await this.localInstaller.install(zipPath, options)
    // 删除下载的ZIP文件
    naimo.download.deleteDownload(id, true)

    // 覆盖类型标记为 github
    this.setPluginType(plugin)
    console.log(`✅ [GitHub插件] 安装成功: ${plugin.id}`)
    return plugin
  }

  /** 
   * 下载插件
   * @param url 下载URL
   * @returns 下载后的文件路径 ZIP文件路径
   */
  private download(url: string): Promise<{ id: string, path: string }> {
    return new Promise((resolve, reject) => {
      const cleanup = {
        completed: null as (() => void) | null,
        error: null as (() => void) | null,
        cancelled: null as (() => void) | null,
        timer: null as NodeJS.Timeout | null
      }

      const clear = () => {
        cleanup.completed?.()
        cleanup.error?.()
        cleanup.cancelled?.()
        if (cleanup.timer) clearTimeout(cleanup.timer)
      }

      cleanup.timer = setTimeout(() => {
        clear()
        reject(new Error('下载超时（5分钟）'))
      }, 300000)

      naimo.download.startDownload({ url }).then(id => {
        if (!id) {
          clear()
          reject(new Error('下载启动失败'))
          return
        }

        cleanup.completed = naimo.download.onDownloadCompleted(data => {
          if (data.id === id) {
            clear()
            resolve({ id, path: data.filePath })
          }
        })

        cleanup.error = naimo.download.onDownloadError(data => {
          if (data.id === id) {
            clear()
            reject(new Error(data.error))
          }
        })

        cleanup.cancelled = naimo.download.onDownloadCancelled(data => {
          if (data.id === id) {
            clear()
            reject(new Error('下载已取消'))
          }
        })
      }).catch(error => {
        clear()
        reject(error)
      })
    })
  }

  /** 卸载 GitHub 插件 */
  async uninstall(pluginId: string, options?: UninstallOptions): Promise<boolean> {
    if (!this.localInstaller) throw new Error('本地安装器未初始化')
    return await this.localInstaller.uninstall(pluginId, options)
  }

  /** 加载更多插件 */
  async loadMore(): Promise<PluginConfig[]> {
    if (this.searchResult.isComplete) {
      console.log(`ℹ️ 已加载完所有插件`)
      return this.getPluginConfigs()
    }
    return this.getList({
      search: this.searchResult.search,
      page: this.searchResult.page + 1
    })
  }

  /** 设置 GitHub Token */
  setGithubToken(token: string) {
    this.githubToken = token
    localStorage.setItem('github_token', token)
  }

  /** 清除缓存 */
  clearCache() {
    const cacheStore = useCacheStore()
    cacheStore.keys()
      .filter(k => k.startsWith(this.cachePrefix))
      .forEach(k => cacheStore.remove(k))
  }

  /** 获取插件配置列表 */
  private getPluginConfigs(): PluginConfig[] {
    return this.searchResult.items
      .map(item => item.config)
      .filter(Boolean) as PluginConfig[]
  }

  /** 获取搜索结果 */
  getSearchResult(): GithubSearchResult {
    return this.searchResult
  }
}
