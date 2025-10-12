import log from 'electron-log';
import { shell } from 'electron';
import { dirname } from 'path';
import { isProduction } from '@shared/utils';

/**
 * 日志配置管理类
 */
export class LogConfigManager {

  /**
   * 初始化日志配置
   */
  static initialize(): void {
    // 初始化 electron-log
    log.initialize();

    // 配置日志级别
    // if (isProduction()) {
    //   log.transports.console.level = 'warn';
    //   log.transports.file.level = 'info';
    // } else {
    //   log.transports.console.level = 'debug';
    //   log.transports.file.level = 'debug';
    // }

    log.transports.console.level = 'debug';
    log.transports.file.level = 'debug';

    // 配置日志格式
    log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
    log.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}] {text}';

    // 启用 electron-log 内置 IPC 支持
    log.transports.ipc.level = 'debug';

    // 记录启动信息
    LogConfigManager.logStartupInfo();

    // 在开发环境下打开日志目录
    // LogConfigManager.openLogDirectoryInDev();
  }

  /**
   * 记录启动信息
   */
  private static logStartupInfo(): void {
    log.debug('应用启动中...');
    log.debug(`Node.js 版本: ${process.version}`);
    log.debug(`Electron 版本: ${process.versions.electron}`);
    log.debug(`当前工作目录: ${process.cwd()}`);
    log.debug(`应用路径: ${process.env.NODE_ENV === 'development' ? process.cwd() : process.resourcesPath}`);
  }

  /**
   * 在开发环境下打开日志目录
   */
  private static openLogDirectoryInDev(): void {
    try {
      const logPath = log.transports.file.getFile().path;
      log.debug(`日志目录: ${logPath}`);

      if (!isProduction()) {
        shell.openPath(dirname(logPath));
      }
    } catch (error) {
      log.error('日志初始化失败:', error);
    }
  }

  /**
   * 更新日志级别
   */
  static updateLogLevel(level: 'error' | 'warn' | 'info' | 'debug'): void {
    log.transports.console.level = level;
    log.transports.file.level = level;
    log.debug(`日志级别已更新为: ${level}`);
  }
}
