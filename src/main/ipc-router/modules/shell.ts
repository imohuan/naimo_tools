/**
 * Shell 操作模块
 * 提供系统 Shell 操作、通知、路径等功能
 */

import { shell, app, Notification } from "electron";
import log from "electron-log";
import os from "os";
import crypto from "crypto";
import type { SystemPathName } from "@shared/typings/naimoApiTypes";

/**
 * 打开文件或文件夹
 * @param event IPC事件对象
 * @param path 文件或文件夹路径
 * @returns 是否打开成功
 */
export async function openPath(
  event: Electron.IpcMainInvokeEvent,
  path: string
): Promise<boolean> {
  try {
    const result = await shell.openPath(path);
    if (result === "") {
      log.info(`🔗 打开路径成功: ${path}`);
      return true;
    } else {
      log.error(`❌ 打开路径失败: ${path}, 错误: ${result}`);
      return false;
    }
  } catch (error) {
    log.error("❌ 打开路径失败:", error);
    return false;
  }
}

/**
 * 打开外部链接
 * @param event IPC事件对象
 * @param url URL地址
 * @returns 是否打开成功
 */
export async function openUrl(
  event: Electron.IpcMainInvokeEvent,
  url: string
): Promise<boolean> {
  try {
    await shell.openExternal(url);
    log.info(`🔗 打开URL成功: ${url}`);
    return true;
  } catch (error) {
    log.error("❌ 打开URL失败:", error);
    return false;
  }
}

/**
 * 在文件管理器中显示文件
 * @param event IPC事件对象
 * @param path 文件路径
 */
export async function showInFolder(
  event: Electron.IpcMainInvokeEvent,
  path: string
): Promise<void> {
  try {
    shell.showItemInFolder(path);
    log.info(`📁 在文件夹中显示: ${path}`);
  } catch (error) {
    log.error("❌ 在文件夹中显示失败:", error);
  }
}

/**
 * 移动文件到回收站
 * @param event IPC事件对象
 * @param path 文件路径
 * @returns 是否移动成功
 */
export async function moveToTrash(
  event: Electron.IpcMainInvokeEvent,
  path: string
): Promise<boolean> {
  try {
    await shell.trashItem(path);
    log.info(`🗑️ 移动到回收站成功: ${path}`);
    return true;
  } catch (error) {
    log.error("❌ 移动到回收站失败:", error);
    return false;
  }
}

/**
 * 播放系统提示音
 * @param event IPC事件对象
 */
export async function beep(event: Electron.IpcMainInvokeEvent): Promise<void> {
  try {
    shell.beep();
    log.info("🔔 播放系统提示音");
  } catch (error) {
    log.error("❌ 播放系统提示音失败:", error);
  }
}

/**
 * 显示系统通知
 * @param event IPC事件对象
 * @param message 通知内容
 * @param title 通知标题（可选）
 */
export async function showNotification(
  event: Electron.IpcMainInvokeEvent,
  message: string,
  title?: string
): Promise<void> {
  try {
    const notification = new Notification({
      title: title || "Naimo Tools",
      body: message,
    });
    notification.show();
    log.info(`🔔 显示通知: ${title || "Naimo Tools"} - ${message}`);
  } catch (error) {
    log.error("❌ 显示通知失败:", error);
  }
}

/**
 * 获取系统路径
 * @param event IPC事件对象
 * @param name 路径名称
 * @returns 路径字符串
 */
export async function getPath(
  event: Electron.IpcMainInvokeEvent,
  name: SystemPathName
): Promise<string> {
  try {
    const path = app.getPath(name);
    log.info(`📂 获取系统路径成功: ${name} -> ${path}`);
    return path;
  } catch (error) {
    log.error("❌ 获取系统路径失败:", error);
    return "";
  }
}

/**
 * 获取设备唯一标识
 * 基于机器的 MAC 地址和主机名生成
 * @param event IPC事件对象
 * @returns 设备ID
 */
export async function getDeviceId(
  event: Electron.IpcMainInvokeEvent
): Promise<string> {
  try {
    // 获取网络接口
    const networkInterfaces = os.networkInterfaces();
    let macAddress = "";

    // 查找第一个非内部网络接口的 MAC 地址
    for (const name of Object.keys(networkInterfaces)) {
      const interfaces = networkInterfaces[name];
      if (!interfaces) continue;

      for (const iface of interfaces) {
        if (!iface.internal && iface.mac && iface.mac !== "00:00:00:00:00:00") {
          macAddress = iface.mac;
          break;
        }
      }
      if (macAddress) break;
    }

    // 如果没有找到 MAC 地址，使用主机名
    if (!macAddress) {
      macAddress = os.hostname();
    }

    // 生成设备ID（使用 MD5 哈希）
    const deviceId = crypto.createHash("md5").update(macAddress).digest("hex");

    log.info(`🔑 获取设备ID成功: ${deviceId}`);
    return deviceId;
  } catch (error) {
    log.error("❌ 获取设备ID失败:", error);
    // 返回一个基于主机名的备用ID
    return crypto.createHash("md5").update(os.hostname()).digest("hex");
  }
}

