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

/**
 * 获取指定前缀下的所有存储项
 * @param event IPC事件对象
 * @param prefix 前缀，如 "pluginSettings.my-plugin"
 * @returns 所有匹配的键值对
 */
export function getAllByPrefix(event: Electron.IpcMainInvokeEvent, prefix: string): Record<string, any> {
  try {
    const manager = getConfigManager();
    const fullConfig = manager.getConfig();
    const result: Record<string, any> = {};

    // 递归获取嵌套对象中的值
    function getNestedValue(obj: any, path: string[]): any {
      if (path.length === 0) return obj;
      const [first, ...rest] = path;
      return obj && obj[first] ? getNestedValue(obj[first], rest) : undefined;
    }

    // 解析前缀路径
    const prefixParts = prefix.split('.');
    const targetObj = getNestedValue(fullConfig, prefixParts);

    if (targetObj && typeof targetObj === 'object') {
      // 返回目标对象下的所有键值对
      return targetObj;
    }

    return result;
  } catch (error) {
    log.error('获取前缀存储数据失败:', error);
    return {};
  }
}