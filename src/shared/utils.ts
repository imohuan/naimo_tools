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