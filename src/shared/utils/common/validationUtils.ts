/**
 * 配置验证工具函数
 */

import { isObject, isNumber, isString } from './typeUtils'

/**
 * 验证应用配置对象
 * @param config 配置对象
 * @returns 是否为有效配置
 */
export function validateAppConfig(config: any): boolean {
  return (
    isObject(config) &&
    isString((config as any).theme) &&
    isString((config as any).language) &&
    isObject((config as any).windowSize) &&
    isNumber((config as any).windowSize.width) &&
    isNumber((config as any).windowSize.height)
  )
}

/**
 * 验证窗口尺寸配置
 * @param windowSize 窗口尺寸对象
 * @returns 是否为有效的窗口尺寸
 */
export function validateWindowSize(windowSize: any): boolean {
  return (
    isObject(windowSize) &&
    isNumber((windowSize as any).width) &&
    isNumber((windowSize as any).height) &&
    (windowSize as any).width > 0 &&
    (windowSize as any).height > 0
  )
}

/**
 * 验证主题设置
 * @param theme 主题字符串
 * @returns 是否为有效主题
 */
export function validateTheme(theme: any): boolean {
  return isString(theme) && ['light', 'dark'].includes(theme)
}

/**
 * 验证语言设置
 * @param language 语言字符串
 * @returns 是否为有效语言
 */
export function validateLanguage(language: any): boolean {
  return isString(language) && /^[a-z]{2}-[A-Z]{2}$/.test(language)
}

/**
 * 验证日志级别
 * @param logLevel 日志级别字符串
 * @returns 是否为有效日志级别
 */
export function validateLogLevel(logLevel: any): boolean {
  return isString(logLevel) && ['error', 'warn', 'info', 'debug'].includes(logLevel)
}
