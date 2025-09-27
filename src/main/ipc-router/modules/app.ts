/**
 * 应用管理模块
 * 展示新的 IPC 路由系统使用方式
 */

import { app, shell } from "electron";
import log from "electron-log";
import { getApps, AppPath, getIconDataURLAsync } from "@libs/app-search";
import { join } from "path";

/**
 * 获取应用版本
 */
export function getVersion(event: Electron.IpcMainInvokeEvent): string {
  return app.getVersion();
}

/**
 * 获取应用名称
 */
export function getName(event: Electron.IpcMainInvokeEvent): string {
  return app.getName();
}

/**
 * 获取应用路径
 */
export function getAppPath(event: Electron.IpcMainInvokeEvent): string {
  return app.getAppPath();
}

/**
 * 获取用户数据路径
 */
export function getUserDataPath(event: Electron.IpcMainInvokeEvent): string {
  return app.getPath("userData");
}

/**
 * 检查应用是否打包
 */
export function isPackaged(event: Electron.IpcMainInvokeEvent): boolean {
  return app.isPackaged;
}

/**
 * 获取系统信息
 */
export function getSystemInfo(event: Electron.IpcMainInvokeEvent): {
  platform: string;
  arch: string;
  version: string;
  uptime: number;
} {
  return {
    platform: process.platform,
    arch: process.arch,
    version: process.version,
    uptime: process.uptime(),
  };
}

/**
 * 退出应用
 */
export function quit(event: Electron.IpcMainInvokeEvent): void {
  log.info("应用即将退出");
  app.quit();
}

/**
 * 重启应用
 */
export function restart(event: Electron.IpcMainInvokeEvent): void {
  log.info("应用即将重启");
  app.relaunch();
  app.quit();
}

/**
 * 显示关于对话框
 */
export function showAbout(event: Electron.IpcMainInvokeEvent): void {
  // 这里可以调用原生的 about 对话框
  log.info("显示关于对话框");
}

/**
 * 获取应用配置
 */
export function getConfig(event: Electron.IpcMainInvokeEvent): Record<string, any> {
  return {
    version: app.getVersion(),
    name: app.getName(),
    platform: process.platform,
    arch: process.arch,
    isPackaged: app.isPackaged,
    userDataPath: app.getPath("userData"),
  };
}

/**
 * 搜索已安装的应用
 * @returns 应用列表，包含名称、路径和图标
 */
export async function searchApps(): Promise<Array<AppPath>> {
  try {
    log.info("🔍 开始搜索已安装的应用...");
    // 选择合适的缓存目录
    const cacheIconsDir = join(app.getPath("userData"), "icons");
    // 调用 getApps 函数获取应用列表
    const apps = await getApps(cacheIconsDir);
    log.info(`✅ 搜索完成，找到 ${apps.length} 个应用`);
    return apps;
  } catch (error) {
    log.error("❌ 搜索应用失败:", error);
    return [];
  }
}

/**
 * 启动应用
 * @param event IPC事件对象
 * @param appPath 应用路径
 * @returns 是否启动成功
 */
export async function launchApp(event: Electron.IpcMainInvokeEvent, appPath: string): Promise<boolean> {
  try {
    log.info("🚀 启动应用:", appPath);
    await shell.openPath(appPath); // 使用 shell.openPath 启动应用
    log.info("✅ 应用启动成功");
    return true;
  } catch (error) {
    log.error("❌ 启动应用失败:", error);
    return false;
  }
}

/**
 * 提取文件图标
 * @param event IPC事件对象
 * @param filePath 文件路径
 * @returns 图标的 Data URL 或 null
 */
export async function extractFileIcon(event: Electron.IpcMainInvokeEvent, filePath: string): Promise<string | null> {
  try {
    log.info("🖼️ 提取文件图标:", filePath);
    const cacheIconsDir = join(app.getPath("userData"), "icons");
    const icon = await getIconDataURLAsync(filePath, cacheIconsDir);
    if (icon) {
      log.info("✅ 文件图标提取成功");
    } else {
      log.warn("⚠️ 文件图标提取失败，返回 null");
    }
    return icon;
  } catch (error) {
    log.error("❌ 提取文件图标失败:", error);
    return null;
  }
}
