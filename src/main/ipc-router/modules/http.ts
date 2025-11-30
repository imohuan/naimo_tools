/**
 * HTTP 服务 IPC 路由模块
 * 提供 HTTP 服务器的启动、停止、状态查询等功能
 */

import log from "electron-log";
import { appBootstrap } from "@main/main";
import { HttpService } from "@main/services/HttpService";
import { AppConfigManager } from "@main/config/appConfig";
import type { HttpServerStatus } from "@main/server/HttpServer";

/**
 * 启动 HTTP 服务器
 * @param event IPC事件对象
 * @returns 是否启动成功
 */
export async function start(
  event: Electron.IpcMainInvokeEvent
): Promise<boolean> {
  try {
    log.info("通过 IPC 启动 HTTP 服务器");

    const httpService = appBootstrap.getService<HttpService>("httpService");

    if (!httpService) {
      log.warn("HTTP 服务未初始化");
      return false;
    }

    await httpService.start();
    log.info("✅ HTTP 服务器启动成功");
    return true;
  } catch (error) {
    log.error("❌ 启动 HTTP 服务器失败:", error);
    return false;
  }
}

/**
 * 停止 HTTP 服务器
 * @param event IPC事件对象
 * @returns 是否停止成功
 */
export async function stop(
  event: Electron.IpcMainInvokeEvent
): Promise<boolean> {
  try {
    log.info("通过 IPC 停止 HTTP 服务器");

    const httpService = appBootstrap.getService<HttpService>("httpService");

    if (!httpService) {
      log.warn("HTTP 服务未初始化");
      return false;
    }

    await httpService.stop();
    log.info("✅ HTTP 服务器停止成功");
    return true;
  } catch (error) {
    log.error("❌ 停止 HTTP 服务器失败:", error);
    return false;
  }
}

/**
 * 重启 HTTP 服务器
 * @param event IPC事件对象
 * @returns 是否重启成功
 */
export async function restart(
  event: Electron.IpcMainInvokeEvent
): Promise<boolean> {
  try {
    log.info("通过 IPC 重启 HTTP 服务器");

    const httpService = appBootstrap.getService<HttpService>("httpService");

    if (!httpService) {
      log.warn("HTTP 服务未初始化");
      return false;
    }

    await httpService.restart();
    log.info("✅ HTTP 服务器重启成功");
    return true;
  } catch (error) {
    log.error("❌ 重启 HTTP 服务器失败:", error);
    return false;
  }
}

/**
 * 获取 HTTP 服务器状态
 * @param event IPC事件对象
 * @returns 服务器状态信息
 */
export async function getStatus(
  event: Electron.IpcMainInvokeEvent
): Promise<HttpServerStatus> {
  try {
    const httpService = appBootstrap.getService<HttpService>("httpService");

    if (!httpService) {
      return {
        isRunning: false,
        port: null,
        staticRoot: null,
      };
    }

    return httpService.getStatus();
  } catch (error) {
    log.error("❌ 获取 HTTP 服务器状态失败:", error);
    return {
      isRunning: false,
      port: null,
      staticRoot: null,
    };
  }
}

/**
 * 设置 HTTP 服务器端口
 * @param event IPC事件对象
 * @param port 端口号
 * @returns 是否设置成功
 */
export async function setPort(
  event: Electron.IpcMainInvokeEvent,
  port: number
): Promise<boolean> {
  try {
    log.info(`通过 IPC 设置 HTTP 服务器端口: ${port}`);

    if (port < 1024 || port > 65535) {
      log.warn("端口号必须在 1024-65535 之间");
      return false;
    }

    const httpService = appBootstrap.getService<HttpService>("httpService");

    if (!httpService) {
      log.warn("HTTP 服务未初始化");
      return false;
    }

    await httpService.updateConfig({ port });
    log.info("✅ HTTP 服务器端口设置成功");
    return true;
  } catch (error) {
    log.error("❌ 设置 HTTP 服务器端口失败:", error);
    return false;
  }
}

/**
 * 设置静态文件服务根目录
 * @param event IPC事件对象
 * @param staticRoot 静态文件根目录路径
 * @returns 是否设置成功
 */
export async function setStaticRoot(
  event: Electron.IpcMainInvokeEvent,
  staticRoot: string | null
): Promise<boolean> {
  try {
    log.info(`通过 IPC 设置静态文件根目录: ${staticRoot || "null"}`);

    const httpService = appBootstrap.getService<HttpService>("httpService");

    if (!httpService) {
      log.warn("HTTP 服务未初始化");
      return false;
    }

    await httpService.updateConfig({ staticRoot: staticRoot || undefined });
    log.info("✅ 静态文件根目录设置成功");
    return true;
  } catch (error) {
    log.error("❌ 设置静态文件根目录失败:", error);
    return false;
  }
}

/**
 * 启用或禁用 HTTP 服务器
 * @param event IPC事件对象
 * @param enabled 是否启用
 * @returns 是否设置成功
 */
export async function setEnabled(
  event: Electron.IpcMainInvokeEvent,
  enabled: boolean
): Promise<boolean> {
  try {
    log.info(`通过 IPC ${enabled ? "启用" : "禁用"} HTTP 服务器`);

    const httpService = appBootstrap.getService<HttpService>("httpService");

    if (!httpService) {
      log.warn("HTTP 服务未初始化");
      return false;
    }

    await httpService.setEnabled(enabled);
    log.info(`✅ HTTP 服务器已${enabled ? "启用" : "禁用"}`);
    return true;
  } catch (error) {
    log.error("❌ 设置 HTTP 服务器启用状态失败:", error);
    return false;
  }
}

/**
 * 获取 HTTP 服务器配置
 * @param event IPC事件对象
 * @returns 服务器配置信息
 */
export async function getConfig(event: Electron.IpcMainInvokeEvent): Promise<{
  enabled: boolean;
  port: number;
  staticRoot?: string;
} | null> {
  try {
    const configManager = AppConfigManager.getInstance();
    const httpConfig = configManager.get("httpServer");

    return httpConfig || null;
  } catch (error) {
    log.error("❌ 获取 HTTP 服务器配置失败:", error);
    return null;
  }
}
