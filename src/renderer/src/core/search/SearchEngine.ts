import type { AppItem } from '@shared/types'
import type { SearchCategory } from '@/typings/search-types'
import type { SearchProvider, SearchOptions, CoreAPI } from '@/typings/core-types'
import { PinyinSearch } from '@/utils/pinyin-search'
import { BaseSingleton } from '../BaseSingleton'

/**
 * 搜索引擎核心类
 * 处理搜索逻辑，不依赖Vue框架
 */
export class SearchEngine extends BaseSingleton implements CoreAPI {
  private searchIndex: Map<string, AppItem[]> = new Map()
  private providers: SearchProvider[] = []
  private isInitialized = false

  /**
   * 初始化搜索引擎
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // 注册默认搜索提供者
    this.registerProvider({
      type: 'default',
      name: '默认搜索',
      priority: 0,
      search: this.defaultSearch.bind(this)
    })

    this.isInitialized = true
    console.log('🔍 SearchEngine 初始化完成')
  }

  /**
   * 销毁搜索引擎
   */
  async destroy(): Promise<void> {
    this.searchIndex.clear()
    this.providers = []
    this.isInitialized = false
    console.log('🔍 SearchEngine 已销毁')
  }

  /**
   * 重置搜索引擎
   */
  reset(): void {
    this.searchIndex.clear()
    this.providers = []
  }

  /**
   * 注册搜索提供者
   */
  registerProvider(provider: SearchProvider): void {
    const existingIndex = this.providers.findIndex(p => p.type === provider.type)
    if (existingIndex >= 0) {
      this.providers[existingIndex] = provider
    } else {
      this.providers.push(provider)
    }

    // 按优先级排序
    this.providers.sort((a, b) => (a.priority || 0) - (b.priority || 0))
    console.log(`🔍 注册搜索提供者: ${provider.type}`)
  }

  /**
   * 构建搜索索引
   */
  buildIndex(categories: SearchCategory[]): void {
    this.searchIndex.clear()

    for (const category of categories) {
      this.searchIndex.set(category.id, category.items)
    }

    console.log(`🔍 构建搜索索引完成，共 ${categories.length} 个分类`)
  }

  /**
   * 执行搜索
   */
  async search(
    query: string,
    categories: SearchCategory[],
    options: SearchOptions = {}
  ): Promise<SearchCategory[]> {
    if (!query.trim()) {
      return this.getDefaultCategories(categories)
    }

    const {
      maxResults = 50,
      enablePinyin = true,
      enableFuzzy = true
    } = options

    const filteredCategories: SearchCategory[] = []

    for (const category of categories) {
      let filteredItems: AppItem[] = []

      if (category.customSearch) {
        // 使用自定义搜索
        filteredItems = category.customSearch(query, category.items)
      } else {
        // 使用默认搜索
        filteredItems = this.defaultSearch(query, category.items, {
          enablePinyin,
          enableFuzzy,
          maxResults
        })
      }

      // 如果分类有匹配项或者正在搜索，则显示分类
      if (filteredItems.length > 0 || query.length > 0) {
        filteredCategories.push({
          ...category,
          items: filteredItems.slice(0, maxResults)
        })
      }
    }

    console.log(`🔍 搜索完成: "${query}" -> ${filteredCategories.length} 个分类`)
    return filteredCategories
  }

  /**
   * 默认搜索实现
   */
  private defaultSearch(
    query: string,
    items: AppItem[],
    options: {
      enablePinyin?: boolean
      enableFuzzy?: boolean
      maxResults?: number
    } = {}
  ): AppItem[] {
    const { enablePinyin = true, enableFuzzy = true, maxResults = 50 } = options

    return items.filter(item => {
      // 精确匹配
      if (item.name.toLowerCase().includes(query.toLowerCase())) {
        return true
      }

      // 拼音搜索
      if (enablePinyin && PinyinSearch.match(item.name, query)) {
        return true
      }

      // 模糊搜索
      if (enableFuzzy && this.fuzzyMatch(item.name, query)) {
        return true
      }

      return false
    }).slice(0, maxResults)
  }

  /**
   * 模糊匹配
   */
  private fuzzyMatch(text: string, query: string): boolean {
    const textLower = text.toLowerCase()
    const queryLower = query.toLowerCase()

    let textIndex = 0
    let queryIndex = 0

    while (textIndex < textLower.length && queryIndex < queryLower.length) {
      if (textLower[textIndex] === queryLower[queryIndex]) {
        queryIndex++
      }
      textIndex++
    }

    return queryIndex === queryLower.length
  }

  /**
   * 获取默认分类
   */
  private getDefaultCategories(categories: SearchCategory[]): SearchCategory[] {
    return categories.filter(category =>
      category.id === 'recent' ||
      category.id === 'pinned' ||
      category.isExpanded
    )
  }

  /**
   * 获取搜索结果统计
   */
  getSearchStats(categories: SearchCategory[]): {
    totalItems: number
    totalCategories: number
    visibleItems: number
  } {
    const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0)
    const totalCategories = categories.length
    const visibleItems = categories.reduce((sum, cat) =>
      sum + cat.items.slice(0, cat.maxDisplayCount).length, 0
    )

    return {
      totalItems,
      totalCategories,
      visibleItems
    }
  }
}

// 导出单例实例
export const searchEngine = SearchEngine.getInstance()
