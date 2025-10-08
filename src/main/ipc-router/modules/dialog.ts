/**
 * 对话框模块
 * 提供文件选择、保存对话框等功能
 */

import { dialog, BrowserWindow } from "electron";
import log from "electron-log";
import type {
  OpenDialogOptions,
  SaveDialogOptions,
  MessageBoxOptions,
} from "@shared/typings/naimoApiTypes";

/**
 * 获取当前窗口
 * @param event IPC事件对象
 * @returns BrowserWindow实例或undefined
 */
function getCurrentWindow(
  event: Electron.IpcMainInvokeEvent
): BrowserWindow | undefined {
  const window = BrowserWindow.fromWebContents(event.sender);
  return window === null ? undefined : window;
}

/**
 * 显示打开文件/文件夹对话框
 * @param event IPC事件对象
 * @param options 对话框选项
 * @returns 选择的文件路径数组，取消则返回undefined
 */
export async function showOpenDialog(
  event: Electron.IpcMainInvokeEvent,
  options: OpenDialogOptions = {}
): Promise<string[] | undefined> {
  try {
    const currentWindow = getCurrentWindow(event);
    const result = await dialog.showOpenDialog(currentWindow || ({} as any), {
      title: options.title,
      defaultPath: options.defaultPath,
      buttonLabel: options.buttonLabel,
      filters: options.filters,
      properties: options.properties,
    });

    if (result.canceled) {
      log.info("📂 用户取消了文件选择");
      return undefined;
    }

    log.info(`📂 用户选择了 ${result.filePaths.length} 个文件`);
    return result.filePaths;
  } catch (error) {
    log.error("❌ 显示打开对话框失败:", error);
    return undefined;
  }
}

/**
 * 显示保存文件对话框
 * @param event IPC事件对象
 * @param options 对话框选项
 * @returns 保存的文件路径，取消则返回undefined
 */
export async function showSaveDialog(
  event: Electron.IpcMainInvokeEvent,
  options: SaveDialogOptions = {}
): Promise<string | undefined> {
  try {
    const currentWindow = getCurrentWindow(event);
    const result = await dialog.showSaveDialog(currentWindow || ({} as any), {
      title: options.title,
      defaultPath: options.defaultPath,
      buttonLabel: options.buttonLabel,
      filters: options.filters,
    });

    if (result.canceled) {
      log.info("💾 用户取消了文件保存");
      return undefined;
    }

    log.info(`💾 用户选择保存路径: ${result.filePath}`);
    return result.filePath;
  } catch (error) {
    log.error("❌ 显示保存对话框失败:", error);
    return undefined;
  }
}

/**
 * 显示消息框
 * @param event IPC事件对象
 * @param options 消息框选项
 * @returns 用户点击的按钮索引等信息
 */
export async function showMessageBox(
  event: Electron.IpcMainInvokeEvent,
  options: MessageBoxOptions
): Promise<Electron.MessageBoxReturnValue> {
  try {
    const currentWindow = getCurrentWindow(event);
    const result = await dialog.showMessageBox(currentWindow || ({} as any), {
      type: options.type || "info",
      buttons: options.buttons || ["确定"],
      defaultId: options.defaultId,
      title: options.title,
      message: options.message,
      detail: options.detail,
      checkboxLabel: options.checkboxLabel,
      checkboxChecked: options.checkboxChecked,
      icon: options.icon,
      cancelId: options.cancelId,
      noLink: options.noLink,
    });

    log.info(`💬 用户选择: 按钮索引 ${result.response}`);
    return result;
  } catch (error) {
    log.error("❌ 显示消息框失败:", error);
    return { response: -1, checkboxChecked: false };
  }
}

/**
 * 显示错误对话框
 * @param event IPC事件对象
 * @param title 标题
 * @param content 内容
 */
export async function showErrorBox(
  event: Electron.IpcMainInvokeEvent,
  title: string,
  content: string
): Promise<void> {
  try {
    dialog.showErrorBox(title, content);
    log.info(`❌ 显示错误对话框: ${title}`);
  } catch (error) {
    log.error("❌ 显示错误对话框失败:", error);
  }
}

