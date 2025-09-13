/**
 * 应用管理模块
 * 展示新的 IPC 路由系统使用方式
 */

import { app } from 'electron';
import log from 'electron-log';

/**
 * 获取应用版本
 */
export function getVersion(): string {
  return app.getVersion();
}

/**
 * 获取应用名称
 */
export function getName(): string {
  return app.getName();
}

/**
 * 获取应用路径
 */
export function getAppPath(): string {
  return app.getAppPath();
}

/**
 * 获取用户数据路径
 */
export function getUserDataPath(): string {
  return app.getPath('userData');
}

/**
 * 检查应用是否打包
 */
export function isPackaged(): boolean {
  return app.isPackaged;
}

/**
 * 获取系统信息
 */
export function getSystemInfo(): {
  platform: string;
  arch: string;
  version: string;
  uptime: number;
} {
  return {
    platform: process.platform,
    arch: process.arch,
    version: process.version,
    uptime: process.uptime()
  };
}

/**
 * 退出应用
 */
export function quit(): void {
  log.info('应用即将退出');
  app.quit();
}

/**
 * 重启应用
 */
export function restart(): void {
  log.info('应用即将重启');
  app.relaunch();
  app.quit();
}

/**
 * 显示关于对话框
 */
export function showAbout(): void {
  // 这里可以调用原生的 about 对话框
  log.info('显示关于对话框');
}

/**
 * 获取应用配置
 */
export function getConfig(): Record<string, any> {
  return {
    version: app.getVersion(),
    name: app.getName(),
    platform: process.platform,
    arch: process.arch,
    isPackaged: app.isPackaged,
    userDataPath: app.getPath('userData')
  };
}
