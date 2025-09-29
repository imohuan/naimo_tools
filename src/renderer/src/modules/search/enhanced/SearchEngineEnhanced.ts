/**
 * 增强版搜索引擎
 * 提供更高效的搜索算法和缓存机制
 */

import { ref, computed } from 'vue'
import { SmartCacheManager, CacheStrategy } from '@/core/cache/SmartCacheManager'
import { useDebounceFn } from '@/utils/performance'
import type { SearchCategory, SearchState, SearchItem } from '@/typings/searchTypes'
import type { AttachedFile } from '@/typings/composableTypes'

/**
 * 搜索配置接口
 */
export interface SearchEngineConfig {
  /** 最大搜索结果数 */
  maxResults: number
  /** 模糊搜索阈值 */
  fuzzyThreshold: number
  /** 是否启用拼音搜索 */
  enablePinyinSearch: boolean
  /** 是否启用缓存 */
  enableCache: boolean
  /** 缓存大小（MB） */
  cacheSize: number
  /** 防抖延迟（毫秒） */
  debounceDelay: number
  /** 搜索权重配置 */
  weights: {
    name: number
    description: number
    keywords: number
    category: number
  }
}

/**
 * 搜索结果项接口
 */
export interface SearchResultItem extends SearchItem {
  /** 匹配分数 */
  score: number
  /** 匹配的字段 */
  matchedFields: string[]
  /** 高亮信息 */
  highlights: {
    field: string
    indices: [number, number][]
  }[]
}

/**
 * 搜索统计信息接口
 */
export interface SearchStats {
  /** 总搜索次数 */
  totalSearches: number
  /** 缓存命中次数 */
  cacheHits: number
  /** 平均搜索时间（毫秒） */
  averageSearchTime: number
  /** 最近搜索时间 */
  lastSearchTime: number
  /** 热门搜索关键词 */
  popularKeywords: Array<{ keyword: string; count: number }>
}

/**
 * 增强版搜索引擎类
 */
export class SearchEngineEnhanced {
  private config: SearchEngineConfig
  private cache: SmartCacheManager<SearchCategory[]>
  private searchStats = ref<SearchStats>({
    totalSearches: 0,
    cacheHits: 0,
    averageSearchTime: 0,
    lastSearchTime: 0,
    popularKeywords: []
  })
  private searchTimes: number[] = []
  private keywordCounts = new Map<string, number>()
  private categories = ref<SearchCategory[]>([])
  private isSearching = ref(false)

  // 拼音搜索相关
  private pinyinMap = new Map<string, string>()

  // 防抖搜索函数
  private debouncedSearch: (query: string, files: AttachedFile[]) => Promise<SearchCategory[]>

  constructor(config: Partial<SearchEngineConfig> = {}) {
    this.config = {
      maxResults: 50,
      fuzzyThreshold: 0.6,
      enablePinyinSearch: true,
      enableCache: true,
      cacheSize: 20,
      debounceDelay: 150,
      weights: {
        name: 1.0,
        description: 0.8,
        keywords: 0.9,
        category: 0.5
      },
      ...config
    }

    // 初始化缓存
    this.cache = new SmartCacheManager<SearchCategory[]>({
      maxSize: this.config.cacheSize * 1024 * 1024,
      maxItems: 500,
      strategy: CacheStrategy.LRU,
      enablePersistence: false
    })

    // 初始化防抖搜索
    this.debouncedSearch = useDebounceFn(
      this.performSearchInternal.bind(this),
      this.config.debounceDelay
    )

    this.initializePinyinMap()
  }

  /**
   * 初始化拼音映射
   */
  private initializePinyinMap(): void {
    // 这里可以加载拼音字典，简化实现
    const commonPinyinMap = {
      '搜索': 'sousuo',
      '文件': 'wenjian',
      '应用': 'yingyong',
      '设置': 'shezhi',
      '工具': 'gongju',
      '浏览器': 'liulanqi',
      '编辑器': 'bianjiqi',
      '播放器': 'bofangqi'
    }

    Object.entries(commonPinyinMap).forEach(([chinese, pinyin]) => {
      this.pinyinMap.set(chinese, pinyin)
    })
  }

  /**
   * 设置分类数据
   */
  setCategories(categories: SearchCategory[]): void {
    this.categories.value = categories
    // 预建索引以提高搜索性能
    this.buildSearchIndex()
  }

  /**
   * 构建搜索索引
   */
  private buildSearchIndex(): void {
    // 为每个项目构建搜索关键词索引
    this.categories.value.forEach(category => {
      category.items.forEach(item => {
        // 构建搜索关键词
        const keywords = [
          item.name,
          item.description || '',
          item.path || '',
          category.name,
          ...(item.keywords || [])
        ].filter(Boolean).join(' ').toLowerCase()

        // 添加拼音支持
        if (this.config.enablePinyinSearch) {
          const pinyinKeywords = this.convertToPinyin(keywords)
            ; (item as any)._searchKeywords = `${keywords} ${pinyinKeywords}`
        } else {
          ; (item as any)._searchKeywords = keywords
        }
      })
    })
  }

  /**
   * 转换为拼音
   */
  private convertToPinyin(text: string): string {
    let result = text
    this.pinyinMap.forEach((pinyin, chinese) => {
      result = result.replace(new RegExp(chinese, 'g'), pinyin)
    })
    return result
  }

  /**
   * 执行搜索
   */
  async performSearch(query: string, attachedFiles: AttachedFile[] = []): Promise<SearchCategory[]> {
    return this.debouncedSearch(query, attachedFiles)
  }

  /**
   * 内部搜索实现
   */
  private async performSearchInternal(query: string, attachedFiles: AttachedFile[] = []): Promise<SearchCategory[]> {
    const startTime = performance.now()
    this.isSearching.value = true

    try {
      // 更新搜索统计
      this.updateSearchStats(query)

      // 如果查询为空，返回默认分类
      if (!query.trim()) {
        return this.getDefaultCategories()
      }

      // 检查缓存
      const cacheKey = `search_${query}_${attachedFiles.length}`
      if (this.config.enableCache) {
        const cached = this.cache.get(cacheKey)
        if (cached) {
          this.searchStats.value.cacheHits++
          return cached
        }
      }

      // 执行搜索
      const results = await this.executeSearch(query, attachedFiles)

      // 缓存结果
      if (this.config.enableCache && results.length > 0) {
        this.cache.set(cacheKey, results, {
          ttl: 5 * 60 * 1000, // 5分钟过期
          priority: 5,
          tags: ['search']
        })
      }

      return results
    } finally {
      const endTime = performance.now()
      this.recordSearchTime(endTime - startTime)
      this.isSearching.value = false
    }
  }

  /**
   * 执行实际搜索逻辑
   */
  private async executeSearch(query: string, attachedFiles: AttachedFile[]): Promise<SearchCategory[]> {
    const queryLower = query.toLowerCase()
    const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 0)

    const results: SearchCategory[] = []

    for (const category of this.categories.value) {
      const matchedItems: SearchResultItem[] = []

      for (const item of category.items) {
        const score = this.calculateItemScore(item, queryTerms, queryLower)

        if (score > 0) {
          const resultItem: SearchResultItem = {
            ...item,
            score,
            matchedFields: this.getMatchedFields(item, queryTerms),
            highlights: this.getHighlights(item, queryTerms)
          }
          matchedItems.push(resultItem)
        }
      }

      // 按分数排序并限制结果数量
      matchedItems.sort((a, b) => b.score - a.score)
      const limitedItems = matchedItems.slice(0, Math.ceil(this.config.maxResults / this.categories.value.length))

      if (limitedItems.length > 0) {
        results.push({
          ...category,
          items: limitedItems
        })
      }
    }

    // 如果有附加文件，添加文件相关的搜索结果
    if (attachedFiles.length > 0) {
      const fileResults = this.searchAttachedFiles(attachedFiles, queryTerms)
      if (fileResults.items.length > 0) {
        results.unshift(fileResults)
      }
    }

    return results
  }

  /**
   * 计算项目匹配分数
   */
  private calculateItemScore(item: SearchItem, queryTerms: string[], fullQuery: string): number {
    const searchKeywords = (item as any)._searchKeywords || ''
    let totalScore = 0

    // 完全匹配检查
    if (searchKeywords.includes(fullQuery)) {
      totalScore += 10
    }

    // 逐词匹配
    for (const term of queryTerms) {
      let termScore = 0

      // 名称匹配
      if (item.name.toLowerCase().includes(term)) {
        termScore += this.config.weights.name * (item.name.toLowerCase() === term ? 5 : 3)
      }

      // 描述匹配
      if (item.description?.toLowerCase().includes(term)) {
        termScore += this.config.weights.description * 2
      }

      // 关键词匹配
      if (item.keywords?.some(keyword => keyword.toLowerCase().includes(term))) {
        termScore += this.config.weights.keywords * 2
      }

      // 路径匹配
      if (item.path?.toLowerCase().includes(term)) {
        termScore += 1
      }

      // 模糊匹配
      if (termScore === 0) {
        const fuzzyScore = this.calculateFuzzyScore(term, searchKeywords)
        if (fuzzyScore > this.config.fuzzyThreshold) {
          termScore += fuzzyScore
        }
      }

      totalScore += termScore
    }

    // 应用项目权重（如果有）
    if ((item as any).weight) {
      totalScore *= (item as any).weight
    }

    return totalScore
  }

  /**
   * 计算模糊匹配分数
   */
  private calculateFuzzyScore(term: string, text: string): number {
    if (term.length === 0 || text.length === 0) return 0

    const termLen = term.length
    const textLen = text.length

    // 简化的编辑距离算法
    const dp = Array(termLen + 1).fill(null).map(() => Array(textLen + 1).fill(0))

    for (let i = 0; i <= termLen; i++) dp[i][0] = i
    for (let j = 0; j <= textLen; j++) dp[0][j] = j

    for (let i = 1; i <= termLen; i++) {
      for (let j = 1; j <= textLen; j++) {
        if (term[i - 1] === text[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1]
        } else {
          dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1
        }
      }
    }

    const distance = dp[termLen][textLen]
    return Math.max(0, 1 - distance / Math.max(termLen, textLen))
  }

  /**
   * 获取匹配的字段
   */
  private getMatchedFields(item: SearchItem, queryTerms: string[]): string[] {
    const matchedFields: string[] = []

    for (const term of queryTerms) {
      if (item.name.toLowerCase().includes(term)) {
        matchedFields.push('name')
      }
      if (item.description?.toLowerCase().includes(term)) {
        matchedFields.push('description')
      }
      if (item.keywords?.some(keyword => keyword.toLowerCase().includes(term))) {
        matchedFields.push('keywords')
      }
    }

    return [...new Set(matchedFields)]
  }

  /**
   * 获取高亮信息
   */
  private getHighlights(item: SearchItem, queryTerms: string[]): Array<{ field: string; indices: [number, number][] }> {
    const highlights: Array<{ field: string; indices: [number, number][] }> = []

    for (const term of queryTerms) {
      // 名称高亮
      const nameIndices = this.findMatchIndices(item.name.toLowerCase(), term)
      if (nameIndices.length > 0) {
        highlights.push({ field: 'name', indices: nameIndices })
      }

      // 描述高亮
      if (item.description) {
        const descIndices = this.findMatchIndices(item.description.toLowerCase(), term)
        if (descIndices.length > 0) {
          highlights.push({ field: 'description', indices: descIndices })
        }
      }
    }

    return highlights
  }

  /**
   * 查找匹配索引
   */
  private findMatchIndices(text: string, term: string): [number, number][] {
    const indices: [number, number][] = []
    let index = text.indexOf(term)

    while (index !== -1) {
      indices.push([index, index + term.length])
      index = text.indexOf(term, index + 1)
    }

    return indices
  }

  /**
   * 搜索附加文件
   */
  private searchAttachedFiles(attachedFiles: AttachedFile[], queryTerms: string[]): SearchCategory {
    const matchedFiles: SearchResultItem[] = []

    for (const file of attachedFiles) {
      let score = 0
      const searchText = `${file.name} ${file.path || ''}`.toLowerCase()

      for (const term of queryTerms) {
        if (searchText.includes(term)) {
          score += file.name.toLowerCase().includes(term) ? 3 : 1
        }
      }

      if (score > 0) {
        matchedFiles.push({
          id: `file_${file.path}`,
          name: file.name,
          description: `文件: ${file.path}`,
          path: file.path,
          icon: file.iconPath,
          type: 'file',
          score,
          matchedFields: ['name'],
          highlights: []
        })
      }
    }

    return {
      id: 'attached-files',
      name: '附加文件',
      items: matchedFiles.sort((a, b) => b.score - a.score),
      isExpanded: true,
      icon: 'file'
    }
  }

  /**
   * 获取默认分类
   */
  private getDefaultCategories(): SearchCategory[] {
    return this.categories.value.filter(category =>
      category.id === 'recent' || category.id === 'pinned' || category.items.length > 0
    )
  }

  /**
   * 更新搜索统计
   */
  private updateSearchStats(query: string): void {
    this.searchStats.value.totalSearches++
    this.searchStats.value.lastSearchTime = Date.now()

    // 更新关键词统计
    const keywords = query.toLowerCase().split(/\s+/).filter(word => word.length > 1)
    keywords.forEach(keyword => {
      const count = this.keywordCounts.get(keyword) || 0
      this.keywordCounts.set(keyword, count + 1)
    })

    // 更新热门关键词
    this.updatePopularKeywords()
  }

  /**
   * 更新热门关键词
   */
  private updatePopularKeywords(): void {
    const sortedKeywords = Array.from(this.keywordCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }))

    this.searchStats.value.popularKeywords = sortedKeywords
  }

  /**
   * 记录搜索时间
   */
  private recordSearchTime(time: number): void {
    this.searchTimes.push(time)
    if (this.searchTimes.length > 100) {
      this.searchTimes.shift()
    }

    // 计算平均搜索时间
    const avgTime = this.searchTimes.reduce((sum, t) => sum + t, 0) / this.searchTimes.length
    this.searchStats.value.averageSearchTime = avgTime
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 获取搜索统计
   */
  getSearchStats(): SearchStats {
    return { ...this.searchStats.value }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return this.cache.getStats()
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<SearchEngineConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // 重新初始化防抖函数
    this.debouncedSearch = useDebounceFn(
      this.performSearchInternal.bind(this),
      this.config.debounceDelay
    )

    // 更新缓存配置
    this.cache.updateConfig({
      maxSize: this.config.cacheSize * 1024 * 1024
    })
  }

  /**
   * 导出搜索数据
   */
  exportSearchData(): string {
    return JSON.stringify({
      stats: this.searchStats.value,
      config: this.config,
      keywordCounts: Array.from(this.keywordCounts.entries()),
      exportedAt: Date.now()
    }, null, 2)
  }

  /**
   * 导入搜索数据
   */
  importSearchData(data: string): boolean {
    try {
      const imported = JSON.parse(data)

      if (imported.stats) {
        this.searchStats.value = { ...this.searchStats.value, ...imported.stats }
      }

      if (imported.keywordCounts) {
        this.keywordCounts = new Map(imported.keywordCounts)
      }

      return true
    } catch (error) {
      console.error('导入搜索数据失败:', error)
      return false
    }
  }

  /**
   * 销毁搜索引擎
   */
  destroy(): void {
    this.cache.destroy()
    this.categories.value = []
    this.keywordCounts.clear()
    this.searchTimes = []
  }
}

/**
 * Vue 组合式函数
 */
export function useSearchEngineEnhanced(config?: Partial<SearchEngineConfig>) {
  const engine = new SearchEngineEnhanced(config)

  return {
    engine,
    isSearching: computed(() => engine.isSearching),
    searchStats: computed(() => engine.getSearchStats()),
    cacheStats: computed(() => engine.getCacheStats()),

    // 方法
    setCategories: engine.setCategories.bind(engine),
    performSearch: engine.performSearch.bind(engine),
    clearCache: engine.clearCache.bind(engine),
    updateConfig: engine.updateConfig.bind(engine),
    exportData: engine.exportSearchData.bind(engine),
    importData: engine.importSearchData.bind(engine)
  }
}
