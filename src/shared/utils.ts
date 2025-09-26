// 共享工具函数
export function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function getAppName(): string {
  return 'electron-app';
}

/**
 * 判断一个对象是否为函数
 * @param obj 任意对象
 * @returns 如果是函数返回 true，否则返回 false
 */
export function isFunction(obj: any): boolean {
  return obj !== null && obj !== undefined && Object.prototype.toString.call(obj) === '[object Function]';
}

export function validateConfig(config: any): boolean {
  return (
    config &&
    typeof config === 'object' &&
    config.theme &&
    config.language &&
    config.windowSize &&
    typeof config.windowSize.width === 'number' &&
    typeof config.windowSize.height === 'number'
  );
}

