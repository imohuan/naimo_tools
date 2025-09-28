/**
 * 快捷键管理模块
 * 从 window.ts 中分离出来的全局快捷键管理功能
 */

import { globalShortcut } from "electron";
import log from "electron-log";
import { ViewManager } from "@main/window/ViewManager";

// 全局快捷键管理
const registeredGlobalShortcuts = new Map<string, string>();

/**
 * 注册全局快捷键
 */
export function registerGlobalHotkey(event: Electron.IpcMainInvokeEvent, accelerator: string, id: string): boolean {
  try {
    log.info(`🔧 主进程开始注册全局快捷键: ${accelerator} (${id})`);

    // 检查是否已注册，如果已注册则先注销
    if (registeredGlobalShortcuts.has(id)) {
      log.warn(`全局快捷键 ${id} 已存在，先注销再重新注册`);
      const oldAccelerator = registeredGlobalShortcuts.get(id);
      if (oldAccelerator && globalShortcut.isRegistered(oldAccelerator)) {
        globalShortcut.unregister(oldAccelerator);
        log.info(`已注销旧的全局快捷键: ${oldAccelerator}`);
      }
      registeredGlobalShortcuts.delete(id);
    }

    // 检查快捷键是否已被其他应用使用
    if (globalShortcut.isRegistered(accelerator)) {
      log.warn(`快捷键 ${accelerator} 已被其他应用注册`);
      return false;
    }

    log.info(`快捷键 ${accelerator} 未被占用，可以注册`);

    // 注册全局快捷键
    const success = globalShortcut.register(accelerator, () => {
      log.info(`🎉 全局快捷键被触发: ${accelerator} (${id})`);
      // 发送事件到所有WebContentsView
      try {
        const viewManager = ViewManager.getInstance();
        const allViews = viewManager.getAllViews();
        log.info(`发送事件到 ${allViews.length} 个视图`);

        allViews.forEach((viewInfo) => {
          try {
            if (viewInfo.view.webContents && !viewInfo.view.webContents.isDestroyed()) {
              viewInfo.view.webContents.send("global-hotkey-trigger", { hotkeyId: id });
              log.debug(`已发送事件到视图: ${viewInfo.id}`);
            }
          } catch (error) {
            log.warn(`发送事件到视图 ${viewInfo.id} 失败:`, error);
          }
        });
      } catch (error) {
        log.error('获取视图列表失败:', error);
      }
    });

    if (success) {
      registeredGlobalShortcuts.set(id, accelerator);
      log.info(`注册全局快捷键成功: ${accelerator} (${id})`);
    } else {
      log.error(`注册全局快捷键失败: ${accelerator} (${id})`);
    }

    return success;
  } catch (error) {
    log.error(`注册全局快捷键异常: ${accelerator} (${id})`, error);
    return false;
  }
}

/**
 * 注销全局快捷键
 */
export function unregisterGlobalHotkey(event: Electron.IpcMainInvokeEvent, accelerator: string, id: string = "-1"): boolean {
  try {
    const cacheAccelerator = registeredGlobalShortcuts.get(id);
    const accelerators: string[] = [cacheAccelerator, accelerator].filter(
      Boolean
    ) as string[];
    for (const accelerator of accelerators) {
      if (globalShortcut.isRegistered(accelerator)) {
        globalShortcut.unregister(accelerator);
      }
      registeredGlobalShortcuts.delete(id);
    }
    log.info(`注销全局快捷键成功: ${accelerator} (${id})`);
    return true;
  } catch (error) {
    log.error(`注销全局快捷键异常: ${id}`, error);
    return false;
  }
}

/**
 * 注销所有全局快捷键
 */
export function unregisterAllGlobalHotkeys(event: Electron.IpcMainInvokeEvent): void {
  try {
    globalShortcut.unregisterAll();
    registeredGlobalShortcuts.clear();
    log.info("已注销所有全局快捷键");
  } catch (error) {
    log.error("注销所有全局快捷键异常", error);
  }
}

/**
 * 检查快捷键是否已注册
 */
export function isGlobalHotkeyRegistered(event: Electron.IpcMainInvokeEvent, accelerator: string): boolean {
  return globalShortcut.isRegistered(accelerator);
}

/**
 * 获取所有已注册的全局快捷键
 */
export function getAllRegisteredGlobalHotkeys(event: Electron.IpcMainInvokeEvent): Array<{
  id: string;
  accelerator: string;
}> {
  return Array.from(registeredGlobalShortcuts.entries()).map(([id, accelerator]) => ({
    id,
    accelerator,
  }));
}
