/**
 * 日志管理模块
 * 提供日志查看、清空、导出等功能
 */

import log from 'electron-log';
import { readFile, writeFile, stat } from 'fs/promises';

/**
 * 获取日志数据
 * @returns 日志数据数组
 */
export async function getLogs(event: Electron.IpcMainInvokeEvent): Promise<any[]> {
  try {
    // 获取日志文件路径
    const logPath = log.transports.file.getFile().path;

    // 检查文件是否存在
    try {
      await stat(logPath);
    } catch (error: any) {
      // 文件不存在，返回空数组
      return [];
    }

    // 读取日志文件内容
    const logContent = await readFile(logPath, 'utf-8');

    // 解析日志内容
    const logs = parseLogContent(logContent);

    log.debug(`获取到 ${logs.length} 条日志记录`);
    return logs;
  } catch (error: any) {
    log.error('获取日志失败:', error);
    throw new Error('获取日志失败: ' + error.message);
  }
}

/**
 * 获取原始日志文件内容
 * @returns 原始日志文件内容
 */
export async function getRawLogContent(event: Electron.IpcMainInvokeEvent): Promise<string> {
  try {
    // 获取日志文件路径
    const logPath = log.transports.file.getFile().path;

    // 检查文件是否存在
    try {
      await stat(logPath);
    } catch (error: any) {
      // 文件不存在，返回空字符串
      return '';
    }

    // 读取日志文件内容（不做任何处理）
    const logContent = await readFile(logPath, 'utf-8');

    log.debug(`获取到原始日志内容，长度: ${logContent.length}`);
    return logContent;
  } catch (error: any) {
    log.error('获取原始日志内容失败:', error);
    throw new Error('获取原始日志内容失败: ' + error.message);
  }
}

/**
 * 清空日志
 */
export async function clearLogs(event: Electron.IpcMainInvokeEvent): Promise<void> {
  try {
    const logPath = log.transports.file.getFile().path;
    // 清空日志文件
    await writeFile(logPath, '', 'utf-8');
    log.info('日志已清空');
  } catch (error: any) {
    log.error('清空日志失败:', error);
    throw new Error('清空日志失败: ' + error.message);
  }
}

/**
 * 导出日志
 * @param format 导出格式 (txt, json)
 */
export async function exportLogs(event: Electron.IpcMainInvokeEvent, format: 'txt' | 'json' = 'txt'): Promise<string> {
  try {
    const logs = await getLogs();

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else {
      return logs.map(logEntry => {
        const timestamp = new Date(logEntry.timestamp).toISOString();
        return `[${timestamp}] [${logEntry.level.toUpperCase()}] ${logEntry.scope ? `[${logEntry.scope}] ` : ''}${logEntry.message}`;
      }).join('\n');
    }
  } catch (error: any) {
    log.error('导出日志失败:', error);
    throw new Error('导出日志失败: ' + error.message);
  }
}

/**
 * 解析日志内容
 * @param content 日志文件内容
 * @returns 解析后的日志数组
 */
function parseLogContent(content: string): any[] {
  const lines = content.split('\n').filter(line => line.trim());
  const logs: any[] = [];

  for (const line of lines) {
    try {
      // 尝试解析electron-log格式的日志
      const logEntry = parseLogLine(line);
      if (logEntry) {
        logs.push(logEntry);
      }
    } catch (error) {
      // 如果解析失败，作为普通消息处理
      logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: line,
        scope: 'unknown'
      });
    }
  }

  return logs;
}

/**
 * 解析单行日志
 * @param line 日志行
 * @returns 解析后的日志对象
 */
function parseLogLine(line: string): any | null {
  // 新的正则表达式，使用非贪婪匹配来捕获消息内容
  const regex = /^\[([^\]]+)\]\s+\[([^\]]+)\](?:\s+\[([^\]]+)\])?\s+(.*)/;
  const match = line.match(regex);

  if (match) {
    // 解构匹配结果
    const [, timestamp, level, scope, message] = match;

    // 返回处理后的对象
    return {
      timestamp: new Date(timestamp).toISOString(),
      level: level.toLowerCase(),
      scope: scope ? scope.trim() : null,
      message: message.trim()
    };
  }

  // 如果格式不匹配，返回 null
  return null;
}

/**
 * 获取日志文件信息
 */
export async function getLogInfo(event: Electron.IpcMainInvokeEvent): Promise<{
  path: string;
  size: number;
  lastModified: Date;
  lineCount: number;
}> {
  try {
    const logPath = log.transports.file.getFile().path;
    const stats = await stat(logPath);
    const content = await readFile(logPath, 'utf-8');
    const lineCount = content.split('\n').filter(line => line.trim()).length;

    return {
      path: logPath,
      size: stats.size,
      lastModified: stats.mtime,
      lineCount
    };
  } catch (error: any) {
    log.error('获取日志信息失败:', error);
    throw new Error('获取日志信息失败: ' + error.message);
  }
}
