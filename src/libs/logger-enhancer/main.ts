/**
 * 主进程日志增强器
 * 为 electron-log 添加文件名和行号信息
 */

import log from 'electron-log';
import { mapCompiledToSource } from './sourceMapParser';
import type { CallerInfo, LoggerEnhancer } from './typings';

/**
 * 获取调用栈信息
 * @param skipFrames 跳过的栈帧数
 * @returns 文件名、行号和列号信息
 */
function getCallerInfo(skipFrames: number = 4): CallerInfo | null {
  try {
    const originalStackTraceLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = 10; // 增加栈深度以获取更多信息

    const err = new Error();
    const stack = err.stack;

    Error.stackTraceLimit = originalStackTraceLimit;

    if (!stack) return null;

    const lines = stack.split('\n');

    // 跳过 Error 构造函数和 getCallerInfo 函数本身
    for (let i = skipFrames; i < lines.length; i++) {
      const line = lines[i];

      // 跳过 node:internal、node:electron 和其他内部路径
      if (line.includes('node:internal') ||
        line.includes('node:electron') ||
        line.includes('electron/js2c') ||
        line.includes('internal/') ||
        line.includes('browser_init') ||
        line.includes('getCallerInfo') ||
        line.includes('formatMessage') ||
        line.includes('enhancedLog')) {
        continue;
      }

      // 解析调用栈行 - 支持多种格式
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) ||
        line.match(/at\s+(.+?):(\d+):(\d+)/) ||
        line.match(/at\s+(.+?)\s+\((.+?):(\d+)\)/) ||
        line.match(/at\s+(.+?):(\d+)/);

      if (match) {
        let filePath = match[2] || match[1];
        const lineNumber = parseInt(match[3] || match[2], 10);
        const columnNumber = parseInt(match[4] || '0', 10);

        // 处理文件路径
        const projectRoot = process.cwd();
        if (filePath.startsWith(projectRoot)) {
          filePath = filePath.substring(projectRoot.length + 1);
        }

        let mappedLine = lineNumber;
        let mappedColumn = columnNumber;

        // 处理编译后的路径，尝试映射到源文件
        if (filePath.includes('dist/main/main.js')) {
          // 主进程文件，使用源码映射
          const sourceMapping = mapCompiledToSource(lineNumber, columnNumber, 'main');
          if (sourceMapping) {
            filePath = sourceMapping.file;
            mappedLine = sourceMapping.line;
            mappedColumn = sourceMapping.column;
          } else {
            filePath = 'src/main/main.ts';
          }
        } else if (filePath.includes('dist/main/preloads/')) {
          // preload 脚本，尝试使用源码映射
          const fileName = filePath.match(/dist\/main\/preloads\/(.+)\.js$/)?.[1];
          if (fileName) {
            const sourceMapping = mapCompiledToSource(lineNumber, columnNumber, fileName);
            if (sourceMapping) {
              filePath = sourceMapping.file;
              mappedLine = sourceMapping.line;
              mappedColumn = sourceMapping.column;
            } else {
              filePath = filePath.replace('dist/main/preloads/', 'src/main/preloads/').replace(/\.js$/, '.ts');
            }
          } else {
            filePath = filePath.replace('dist/main/preloads/', 'src/main/preloads/').replace(/\.js$/, '.ts');
          }
        } else if (filePath.includes('dist/main/workers/')) {
          // worker 脚本，尝试使用源码映射
          const fileName = filePath.match(/dist\/main\/workers\/(.+)\.js$/)?.[1];
          if (fileName) {
            const sourceMapping = mapCompiledToSource(lineNumber, columnNumber, fileName);
            if (sourceMapping) {
              filePath = sourceMapping.file;
              mappedLine = sourceMapping.line;
              mappedColumn = sourceMapping.column;
            } else {
              filePath = filePath.replace('dist/main/workers/', 'src/main/workers/').replace(/\.js$/, '.ts');
            }
          } else {
            filePath = filePath.replace('dist/main/workers/', 'src/main/workers/').replace(/\.js$/, '.ts');
          }
        } else if (filePath.includes('dist/')) {
          // 其他编译后的文件
          filePath = filePath.replace(/^dist\//, 'src/').replace(/\.js$/, '.ts');
        }

        // 处理 Windows 路径分隔符
        filePath = filePath.replace(/\\/g, '/');

        // 移除所有相对路径前缀
        while (filePath.startsWith('../')) {
          filePath = filePath.replace(/^\.\.\//, '');
        }

        const result: CallerInfo = {
          file: filePath,
          line: mappedLine,
          column: mappedColumn > 0 ? mappedColumn : undefined
        };

        return result;
      }
    }
  } catch (error) {
    // 静默处理错误
  }

  return null;
}

/**
 * 格式化日志消息，包含文件名、行号和列号
 * @param message 原始消息
 * @returns 格式化后的消息
 */
function formatMessage(message: string): string {
  const callerInfo = getCallerInfo();

  if (callerInfo) {
    let location = `[${callerInfo.file}:${callerInfo.line}`;
    if (callerInfo.column !== undefined && callerInfo.column > 0) {
      location += `:${callerInfo.column}`;
    }
    location += ']';
    return `${location} ${message}`;
  }

  return message;
}

/**
 * 主进程日志增强器类
 */
class MainLoggerEnhancer implements LoggerEnhancer {
  private originalDebug: any;
  private originalInfo: any;
  private originalWarn: any;
  private originalError: any;

  private enhancedLog = {
    debug: (message: string, ...args: any[]) => {
      this.originalDebug(formatMessage(message), ...args);
    },

    info: (message: string, ...args: any[]) => {
      this.originalInfo(formatMessage(message), ...args);
    },

    warn: (message: string, ...args: any[]) => {
      this.originalWarn(formatMessage(message), ...args);
    },

    error: (message: string, ...args: any[]) => {
      this.originalError(formatMessage(message), ...args);
    }
  };

  /**
   * 启用日志增强功能
   * @returns 恢复函数（可选）
   */
  enhance(): (() => void) | void {
    // 保存原始方法
    this.originalDebug = log.debug;
    this.originalInfo = log.info;
    this.originalWarn = log.warn;
    this.originalError = log.error;

    // 覆盖方法
    log.debug = this.enhancedLog.debug;
    log.info = this.enhancedLog.info;
    log.warn = this.enhancedLog.warn;
    log.error = this.enhancedLog.error;

    // 返回恢复函数
    return () => {
      log.debug = this.originalDebug;
      log.info = this.originalInfo;
      log.warn = this.originalWarn;
      log.error = this.originalError;
    };
  }
}

// 导出增强函数
export function enhanceElectronLog(): (() => void) | void {
  const enhancer = new MainLoggerEnhancer();
  return enhancer.enhance();
}

export default enhanceElectronLog;
