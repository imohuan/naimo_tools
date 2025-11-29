/**
 * 应用管理模块
 * 展示新的 IPC 路由系统使用方式
 */

import { app, shell } from "electron";
import log from "electron-log";
import { getApps, getIconDataURLAsync } from "@libs/app-search";
import { AppPath } from "@libs/app-search/typings";
import { join } from "path";
import { access } from "fs/promises";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import { appBootstrap } from "@main/main";
import { NewWindowManager } from "@main/window/NewWindowManager";
import { ViewType } from "@renderer/src/typings";
import { AutoLaunchService } from "@main/services/AutoLaunchService";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

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
  electronVersion: string;
  chromeVersion: string;
  uptime: number;
} {
  return {
    platform: process.platform,
    arch: process.arch,
    version: process.version,
    electronVersion: process.versions.electron || "",
    chromeVersion: process.versions.chrome || "",
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
export function getConfig(
  event: Electron.IpcMainInvokeEvent
): Record<string, any> {
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
 * @param command 执行命令（可选，优先于 path）
 * @returns 是否启动成功
 */
export async function launchApp(
  event: Electron.IpcMainInvokeEvent,
  appPath: string,
  command?: string
): Promise<boolean> {
  try {
    // 优先使用 command，没有 command 才使用 path
    if (command) {
      const cmd = command.trim();
      log.info("🚀 执行命令:", cmd);

      // 1) 处理 Windows Shell/Settings URI（如 shell:RecycleBinFolder / ms-settings:display）
      if (/^(shell:|ms-settings:)/i.test(cmd)) {
        try {
          await shell.openExternal(cmd);
          log.info("✅ 通过 shell.openExternal 打开成功");
        } catch (e) {
          // 回退到 explorer.exe 以确保在部分环境下也能打开
          const explorer = join(
            process.env.SystemRoot || "C://Windows",
            "explorer.exe"
          );
          await execFileAsync(explorer, [cmd]);
          log.info("✅ 通过 explorer.exe 打开成功");
        }
      }
      // 2) 处理 MSC 管理控制台（需要 mmc.exe 打开）
      else if (/\.msc$/i.test(cmd)) {
        const system32 = join(
          process.env.SystemRoot || "C://Windows",
          "System32"
        );
        const mmc = join(system32, "mmc.exe");
        const mscPath = join(system32, cmd);
        await execFileAsync(mmc, [mscPath]);
        log.info("✅ 通过 mmc.exe 打开 MSC 成功");
      }
      // 其他命令：交给系统 PATH 解析
      else {
        await execAsync(cmd);
        log.info("✅ 命令执行成功");
      }
    } else {
      log.info("🚀 启动应用:", appPath);
      await shell.openPath(appPath);
      log.info("✅ 应用启动成功");
    }
    return true;
  } catch (error) {
    log.error("❌ 启动应用失败:", error);
    return false;
  }
}

// 执行command

/**
 * 提取文件图标
 * @param event IPC事件对象
 * @param filePath 文件路径
 * @param useExtension 是否使用扩展名模式（默认 false）
 * @returns 图标的 Data URL 或 null
 */
export async function extractFileIcon(
  event: Electron.IpcMainInvokeEvent,
  filePath: string,
  useExtension: boolean = false
): Promise<string | null> {
  try {
    log.info("🖼️ 提取文件图标:", filePath, useExtension ? "(扩展名模式)" : "");
    const cacheIconsDir = join(app.getPath("userData"), "icons");
    const icon = await getIconDataURLAsync(
      filePath,
      cacheIconsDir,
      useExtension
    );

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
    const windowService = appBootstrap.getService("windowService");

    if (!windowService) {
      log.warn("窗口服务未初始化，无法广播插件事件");
      return false;
    }

    const windowManager: NewWindowManager = windowService.getWindowManager();
    if (!windowManager) {
      log.warn("窗口管理器未初始化，无法广播插件事件");
      return false;
    }

    // 获取所有视图并广播事件
    const viewManager = windowManager.getViewManager();
    if (!viewManager) {
      log.warn("视图管理器未初始化，无法广播插件事件");
      return false;
    }
    // 吸附
    const viewInfo = viewManager.getViewInfo(windowManager.getMainViewId());
    let sentCount = 0;

    if (viewInfo && viewInfo.view && viewInfo.view.webContents) {
      try {
        // 跳过发送事件的view，避免自己给自己发消息
        if (viewInfo.view.webContents.id === event.sender.id) {
          // 吸附：如果是自己则不发送，直接返回false
          return false;
        }

        if (!viewInfo.view.webContents.isDestroyed()) {
          viewInfo.view.webContents.send(channel, {
            ...data,
            timestamp: Date.now(),
          });
          sentCount++;
        }
      } catch (error) {
        log.error(`向视图 ${viewInfo.id} 发送插件事件失败:`, error);
      }
    } else {
      log.warn("主视图信息不存在，无法广播插件事件");
    }

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

/**
 * 广播插件事件到所有视图
 * @param event IPC事件
 * @param channel 消息通道
 * @param data 消息数据
 * @returns 是否广播成功
 */
export async function forwardMessageToPluginView(
  event: Electron.IpcMainInvokeEvent,
  pluginPath: string,
  channel: string,
  data: any
): Promise<boolean> {
  try {
    const windowService = appBootstrap.getService("windowService");

    if (!windowService) {
      log.warn("窗口服务未初始化，无法广播插件事件");
      return false;
    }

    const windowManager: NewWindowManager = windowService.getWindowManager();
    if (!windowManager) {
      log.warn("窗口管理器未初始化，无法广播插件事件");
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
          !viewInfo.view.webContents.isDestroyed() &&
          viewInfo.id.startsWith("plugin:" + pluginPath)
        ) {
          viewInfo.view.webContents.send(channel, {
            ...data,
            timestamp: Date.now(),
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

/**
 * 设置开机自启
 * @param event IPC事件对象
 * @param enabled 是否启用开机自启
 * @returns 是否设置成功
 */
export async function setAutoLaunch(
  event: Electron.IpcMainInvokeEvent,
  enabled: boolean
): Promise<boolean> {
  try {
    log.info(`设置开机自启: ${enabled ? "启用" : "禁用"}`);

    const autoLaunchService =
      appBootstrap.getService<AutoLaunchService>("autoLaunchService");

    if (!autoLaunchService) {
      log.warn("开机自启服务未初始化");
      return false;
    }

    await autoLaunchService.setAutoLaunch(enabled);
    log.info(`✅ 开机自启已${enabled ? "启用" : "禁用"}`);
    return true;
  } catch (error) {
    log.error("❌ 设置开机自启失败:", error);
    return false;
  }
}

/**
 * 获取开机自启状态
 * @param event IPC事件对象
 * @returns 是否已启用开机自启
 */
export async function getAutoLaunchStatus(
  event: Electron.IpcMainInvokeEvent
): Promise<boolean> {
  try {
    const autoLaunchService =
      appBootstrap.getService<AutoLaunchService>("autoLaunchService");

    if (!autoLaunchService) {
      log.warn("开机自启服务未初始化");
      return false;
    }

    const isEnabled = await autoLaunchService.isEnabled();
    log.debug(`开机自启状态: ${isEnabled ? "已启用" : "已禁用"}`);
    return isEnabled;
  } catch (error) {
    log.error("❌ 获取开机自启状态失败:", error);
    return false;
  }
}

/**
 * 检查路径是否存在
 * @param event IPC事件
 * @param path 路径
 * @returns 是否存在
 */
export async function checkPathExists(
  event: Electron.IpcMainInvokeEvent,
  path: string
): Promise<boolean> {
  try {
    log.info("🔍 检查路径是否存在:", path);
    await access(path);
    return true;
  } catch (error) {
    log.error("❌ 检查路径是否存在失败:", error);
    return false;
  }
}
