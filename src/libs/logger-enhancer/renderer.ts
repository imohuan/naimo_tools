/**
 * 渲染进程日志增强器
 * 为 electron-log/renderer 添加文件名和行号信息
 */

import log from 'electron-log/renderer';
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
      let line = lines[i];

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

      // 处理多行调用栈 - 如果当前行是 "at file://..." 且下一行是 ":数字:数字"
      if (line.includes('at file://') && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine.match(/^\s*:\d+:\d+/)) {
          line = line + nextLine;
          i++; // 跳过下一行
        }
      }

      // 解析调用栈行 - 支持多种格式
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) ||
        line.match(/at\s+(.+?):(\d+):(\d+)/) ||
        line.match(/at\s+(.+?)\s+\((.+?):(\d+)\)/) ||
        line.match(/at\s+(.+?):(\d+)/);

      if (match) {
        // 根据不同的正则匹配格式提取文件路径、行号和列号
        let filePath: string;
        let lineNumber: number;
        let columnNumber: number;

        if (match[2] && match[3] && match[4]) {
          // 格式: at functionName (filePath:line:column)
          filePath = match[2];
          lineNumber = parseInt(match[3], 10);
          columnNumber = parseInt(match[4], 10);
        } else if (match[1] && match[2] && match[3]) {
          // 格式: at filePath:line:column
          filePath = match[1];
          lineNumber = parseInt(match[2], 10);
          columnNumber = parseInt(match[3], 10);
        } else if (match[2] && match[3]) {
          // 格式: at functionName (filePath:line)
          filePath = match[2];
          lineNumber = parseInt(match[3], 10);
          columnNumber = 0;
        } else {
          // 格式: at filePath:line
          filePath = match[1];
          lineNumber = parseInt(match[2], 10);
          columnNumber = 0;
        }

        // 处理 file:// 协议路径
        if (filePath.startsWith('file://')) {
          filePath = filePath.replace('file:///', '').replace('file://', '');
        }

        // 处理文件路径
        const projectRoot = process.cwd();
        if (filePath.startsWith(projectRoot)) {
          filePath = filePath.substring(projectRoot.length + 1);
        }

        let mappedLine = lineNumber;
        let mappedColumn = columnNumber;

        // 处理编译后的路径，尝试映射到源文件
        if (filePath.includes('dist/main/preloads/')) {
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

// 全局变量存储原始方法，供 getCallerInfo 使用
let originalDebug: any;
let originalInfo: any;
let originalWarn: any;
let originalError: any;

/**
 * 渲染进程日志增强器类
 */
class RendererLoggerEnhancer implements LoggerEnhancer {

  private enhancedLog = {
    debug: (message: string, ...args: any[]) => {
      originalDebug(formatMessage(message), ...args);
    },

    info: (message: string, ...args: any[]) => {
      originalInfo(formatMessage(message), ...args);
    },

    warn: (message: string, ...args: any[]) => {
      originalWarn(formatMessage(message), ...args);
    },

    error: (message: string, ...args: any[]) => {
      originalError(formatMessage(message), ...args);
    }
  };

  /**
   * 启用日志增强功能
   * @returns 恢复函数（可选）
   */
  enhance(): (() => void) | void {
    // 保存原始方法到全局变量
    originalDebug = log.debug;
    originalInfo = log.info;
    originalWarn = log.warn;
    originalError = log.error;

    // 覆盖方法
    log.debug = this.enhancedLog.debug;
    log.info = this.enhancedLog.info;
    log.warn = this.enhancedLog.warn;
    log.error = this.enhancedLog.error;

    // 返回恢复函数
    return () => {
      log.debug = originalDebug;
      log.info = originalInfo;
      log.warn = originalWarn;
      log.error = originalError;
    };
  }
}

// 导出增强函数
export function enhanceElectronLogRenderer(): (() => void) | void {
  const enhancer = new RendererLoggerEnhancer();
  return enhancer.enhance();
}

export default enhanceElectronLogRenderer;
