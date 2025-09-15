import { pinyin, match } from 'pinyin-pro'

/**
 * 拼音搜索工具类
 */
export class PinyinSearch {
  /**
   * 检查文本是否匹配搜索词（支持拼音）
   * @param text 要搜索的文本
   * @param searchQuery 搜索词
   * @returns 是否匹配
   */
  static match(text: string, searchQuery: string): boolean {
    if (!text || !searchQuery) return false

    const lowerText = text.toLowerCase()
    const lowerQuery = searchQuery.toLowerCase()

    // 1. 直接文本匹配
    if (lowerText.includes(lowerQuery)) {
      return true
    }

    // 2. 处理空格和特殊字符的匹配（如 VS Code -> vscode）
    const normalizedText = lowerText.replace(/\s+/g, '')
    const normalizedQuery = lowerQuery.replace(/\s+/g, '')
    if (normalizedText.includes(normalizedQuery)) {
      return true
    }

    // 3. 使用 pinyin-pro 的 match 函数进行拼音匹配
    try {
      // 尝试多种匹配策略
      const matchStrategies = [
        // 首字母匹配（默认精度）
        { precision: 'first' as const },
        // 全拼匹配
        { precision: 'every' as const },
        // 开头匹配
        { precision: 'start' as const },
        // 任意匹配
        { precision: 'any' as const }
      ]

      for (const strategy of matchStrategies) {
        const result = match(text, searchQuery, strategy)
        if (result !== null) {
          return true
        }
      }

    } catch (error) {
      console.warn('拼音匹配失败:', error)
      // 拼音匹配失败时，回退到直接文本匹配
      return lowerText.includes(lowerQuery)
    }

    return false
  }

  /**
   * 获取文本的拼音（用于调试）
   * @param text 文本
   * @returns 拼音字符串
   */
  static getPinyin(text: string): string {
    try {
      return pinyin(text, {
        toneType: 'none',
        type: 'string',
        nonZh: 'consecutive'
      }).replace(/\s+/g, '')
    } catch (error) {
      console.warn('获取拼音失败:', error)
      return text
    }
  }

  /**
   * 获取文本的拼音首字母（用于调试）
   * @param text 文本
   * @returns 拼音首字母字符串
   */
  static getInitials(text: string): string {
    try {
      return pinyin(text, {
        toneType: 'none',
        type: 'string',
        nonZh: 'consecutive',
        pattern: 'first'
      }).replace(/\s+/g, '')
    } catch (error) {
      console.warn('获取拼音首字母失败:', error)
      return text
    }
  }
}

/**
 * 搜索匹配器接口
 */
export interface SearchMatcher {
  (text: string, searchQuery: string): boolean
}

/**
 * 创建支持拼音的搜索匹配器
 * @param options 搜索选项
 * @returns 搜索匹配器函数
 */
export function createPinyinMatcher(options: {
  caseSensitive?: boolean
  exactMatch?: boolean
} = {}): SearchMatcher {
  return (text: string, searchQuery: string): boolean => {
    if (!text || !searchQuery) return false

    let processedText = text
    let processedQuery = searchQuery

    // 处理大小写
    if (!options.caseSensitive) {
      processedText = processedText.toLowerCase()
      processedQuery = processedQuery.toLowerCase()
    }

    // 精确匹配
    if (options.exactMatch) {
      return processedText === processedQuery || PinyinSearch.match(text, searchQuery)
    }

    // 模糊匹配
    return PinyinSearch.match(text, searchQuery)
  }
}