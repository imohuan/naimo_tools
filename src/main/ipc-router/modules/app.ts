/**
 * 应用管理模块
 * 展示新的 IPC 路由系统使用方式
 */

import { app, shell } from "electron";
import log from "electron-log";
import { getApps, AppPath, getIconDataURLAsync } from "@libs/app-search";
import { join } from "path";
import { appBootstrap } from '@main/main';
import { NewWindowManager } from '@main/window/NewWindowManager';
import { ViewType } from '@renderer/src/typings';


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


/**
 * 广播插件事件到所有视图
 * @param event IPC事件
 * @param channel 消息通道
 * @param data 消息数据
 * @returns 是否广播成功
 */
export async function forwardMessageToMainView(
  event: Electron.IpcMainInvokeEvent,
  channel: string,
  data: any
): Promise<boolean> {
  try {
    const windowService = appBootstrap.getService('windowService');

    if (!windowService) {
      log.warn('窗口服务未初始化，无法广播插件事件');
      return false;
    }

    const windowManager: NewWindowManager = windowService.getWindowManager();
    if (!windowManager) {
      log.warn('窗口管理器未初始化，无法广播插件事件');
      return false;
    }

    // 获取所有视图并广播事件
    const allViews = windowManager.getViewManager().getAllViews();
    let sentCount = 0;

    allViews.forEach((viewInfo) => {
      try {
        // 跳过发送事件的view，避免自己给自己发消息
        if (viewInfo.view.webContents.id === event.sender.id) {
          return;
        }

        if (
          viewInfo.view &&
          viewInfo.view.webContents &&
          !viewInfo.view.webContents.isDestroyed()
        ) {
          viewInfo.view.webContents.send(channel, {
            ...data,
            timestamp: Date.now()
          });
          sentCount++;
        }
      } catch (error) {
        log.error(`向视图 ${viewInfo.id} 发送插件事件失败:`, error);
      }
    });

    if (sentCount > 0) {
      log.info(`已向 ${sentCount} 个视图广播插件事件: ${channel}`, data);
      return true;
    } else {
      log.warn(`没有可用的视图接收插件事件: ${channel}`);
      return false;
    }
  } catch (error) {
    log.error(`广播插件事件失败: ${channel}`, error);
    return false;
  }
}