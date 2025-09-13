// 共享类型定义

export interface AppConfig {
  theme: 'light' | 'dark';
  language: string;
  windowSize: {
    width: number;
    height: number;
  };
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

export interface LogLevel {
  error: string;
  warn: string;
  info: string;
  debug: string;
}

// CommonJS 兼容性导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {};
}