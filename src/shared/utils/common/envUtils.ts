/**
 * 环境相关工具函数
 */

/**
 * 判断是否为生产环境
 * @returns 是否为生产环境
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * 判断是否为开发环境
 * @returns 是否为开发环境
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * 判断是否为测试环境
 * @returns 是否为测试环境
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test'
}

/**
 * 获取环境变量值
 * @param key 环境变量键名
 * @param defaultValue 默认值
 * @returns 环境变量值或默认值
 */
export function getEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue
}

/**
 * 获取应用名称
 * @returns 应用名称
 */
export function getAppName(): string {
  return getEnvVar('APP_NAME', 'naimo') || 'naimo'
}
