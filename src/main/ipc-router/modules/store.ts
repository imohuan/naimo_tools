/**
 * 存储管理模块
 * 展示新的 IPC 路由系统使用方式
 */

import log from 'electron-log';
import { AppConfigManager } from '@main/config/appConfig';
import { AppConfig } from '@shared/typings/appTypes';

// 全局配置管理器实例
let configManager: AppConfigManager | null = null;

/**
 * 获取配置管理器实例
 */
function getConfigManager(): AppConfigManager {
  if (!configManager) {
    configManager = new AppConfigManager();
  }
  return configManager;
}

/**
 * 获取存储数据
 * @param event IPC事件对象
 * @param key 配置键名，如果不提供则返回完整配置
 * @returns 配置值或完整配置对象
 */
export function get(event: Electron.IpcMainInvokeEvent, key?: keyof AppConfig): any {
  try {
    const manager = getConfigManager();
    if (key) {
      return manager.get(key);
    } else {
      return manager.getConfig();
    }
  } catch (error) {
    log.error('获取存储数据失败:', error);
    throw error;
  }
}

/**
 * 设置存储数据
 * @param event IPC事件对象
 * @param key 配置键名
 * @param value 配置值
 * @returns 是否设置成功
 */
export function set(event: Electron.IpcMainInvokeEvent, key: keyof AppConfig, value: any): boolean {
  try {
    const manager = getConfigManager();
    manager.set(key, value);
    return true;
  } catch (error) {
    log.error('设置存储数据失败:', error);
    throw error;
  }
}

/**
 * 删除存储数据
 * @param event IPC事件对象
 * @param key 配置键名
 * @returns 是否删除成功
 */
export function deleteKey(event: Electron.IpcMainInvokeEvent, key: keyof AppConfig): boolean {
  try {
    const manager = getConfigManager();
    manager.delete(key);
    return true;
  } catch (error) {
    log.error('删除存储数据失败:', error);
    throw error;
  }
}

/**
 * 清空存储数据
 * @returns 是否清空成功
 */
export function clear(event: Electron.IpcMainInvokeEvent): boolean {
  try {
    const manager = getConfigManager();
    manager.clear();
    return true;
  } catch (error) {
    log.error('清空存储数据失败:', error);
    throw error;
  }
}
