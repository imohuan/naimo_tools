/**
 * 文件系统模块
 * 展示新的 IPC 路由系统使用方式
 */

import { dialog, BrowserWindow } from 'electron';
import log from 'electron-log';

/**
 * 选择文件
 * @param options 对话框选项
 * @returns 选择的文件路径数组，如果取消则返回null
 */
export function selectFile(options: Electron.OpenDialogOptions = {}): Promise<string[] | null> {
  return new Promise(async (resolve, reject) => {
    try {
      // 这里需要获取主窗口，在实际使用中应该通过依赖注入获取
      const window = BrowserWindow.getFocusedWindow();
      if (!window) {
        throw new Error('没有找到活动窗口');
      }
      const result = await dialog.showOpenDialog(window, {
        properties: ['openFile'],
        ...options
      });

      if (result.canceled) {
        resolve(null);
        return;
      }

      log.debug('用户选择了文件:', result.filePaths);
      resolve(result.filePaths);
    } catch (error) {
      log.error('选择文件失败:', error);
      reject(error);
    }
  });
}

/**
 * 选择文件夹
 * @param options 对话框选项
 * @returns 选择的文件夹路径数组，如果取消则返回null
 */
export function selectFolder(options: Electron.OpenDialogOptions = {}): Promise<string[] | null> {
  return new Promise(async (resolve, reject) => {
    try {
      const window = BrowserWindow.getFocusedWindow();
      if (!window) {
        throw new Error('没有找到活动窗口');
      }
      const result = await dialog.showOpenDialog(window, {
        properties: ['openDirectory'],
        ...options
      });

      if (result.canceled) {
        resolve(null);
        return;
      }

      log.debug('用户选择了文件夹:', result.filePaths);
      resolve(result.filePaths);
    } catch (error) {
      log.error('选择文件夹失败:', error);
      reject(error);
    }
  });
}

/**
 * 保存文件
 * @param options 保存对话框选项
 * @returns 选择的保存路径，如果取消则返回null
 */
export function saveFile(options: Electron.SaveDialogOptions = {}): Promise<string | null> {
  return new Promise(async (resolve, reject) => {
    try {
      const window = BrowserWindow.getFocusedWindow();
      if (!window) {
        throw new Error('没有找到活动窗口');
      }
      const result = await dialog.showSaveDialog(window, options);

      if (result.canceled || !result.filePath) {
        resolve(null);
        return;
      }

      log.debug('用户选择了保存路径:', result.filePath);
      resolve(result.filePath);
    } catch (error) {
      log.error('保存文件失败:', error);
      reject(error);
    }
  });
}

