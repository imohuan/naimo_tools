/**
 * 文件系统模块
 * 展示新的 IPC 路由系统使用方式
 */

import { dialog, BrowserWindow } from 'electron';
import { readFile, writeFile, stat } from 'fs/promises';
import log from 'electron-log';


export function isDirectory(event: Electron.IpcMainInvokeEvent, filePath: string): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      const isDirectory = await stat(filePath);
      resolve(isDirectory.isDirectory());
    } catch (error) {
      log.error('判断文件是否为文件夹失败:', error);
      reject(error);
    }
  });
}

/**
 * 选择文件
 * @param event IPC事件对象
 * @param options 对话框选项
 * @returns 选择的文件路径数组，如果取消则返回null
 */
export function selectFile(event: Electron.IpcMainInvokeEvent, options: Electron.OpenDialogOptions = {}): Promise<string[] | null> {
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
 * @param event IPC事件对象
 * @param options 对话框选项
 * @returns 选择的文件夹路径数组，如果取消则返回null
 */
export function selectFolder(event: Electron.IpcMainInvokeEvent, options: Electron.OpenDialogOptions = {}): Promise<string[] | null> {
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
 * @param event IPC事件对象
 * @param options 保存对话框选项
 * @returns 选择的保存路径，如果取消则返回null
 */
export function saveFile(event: Electron.IpcMainInvokeEvent, options: Electron.SaveDialogOptions = {}): Promise<string | null> {
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

/**
 * 读取文件内容
 * @param event IPC事件对象
 * @param filePath 文件路径
 * @param encoding 文件编码，默认为'utf-8'
 * @returns 文件内容
 */
export async function readFileContent(event: Electron.IpcMainInvokeEvent, filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
  try {
    const content = await readFile(filePath, encoding);
    log.debug('读取文件成功:', filePath);
    return content;
  } catch (error) {
    log.error('读取文件失败:', error);
    throw error;
  }
}

/**
 * 读取文件内容为Base64
 * @param event IPC事件对象
 * @param filePath 文件路径
 * @returns Base64编码的文件内容
 */
export async function readFileAsBase64(event: Electron.IpcMainInvokeEvent, filePath: string): Promise<string> {
  try {
    const buffer = await readFile(filePath);
    const base64 = buffer.toString('base64');
    log.debug('读取文件为Base64成功:', filePath);
    return base64;
  } catch (error) {
    log.error('读取文件为Base64失败:', error);
    throw error;
  }
}

/**
 * 写入文件内容
 * @param event IPC事件对象
 * @param filePath 文件路径
 * @param content 文件内容
 * @param encoding 文件编码，默认为'utf-8'
 * @returns 是否写入成功
 */
export async function writeFileContent(event: Electron.IpcMainInvokeEvent, filePath: string, content: string, encoding: BufferEncoding = 'utf-8'): Promise<boolean> {
  try {
    await writeFile(filePath, content, encoding);
    log.debug('写入文件成功:', filePath);
    return true;
  } catch (error) {
    log.error('写入文件失败:', error);
    return false;
  }
}

/**
 * 从Base64写入文件
 * @param event IPC事件对象
 * @param filePath 文件路径
 * @param base64Data Base64编码的数据
 * @returns 是否写入成功
 */
export async function writeFileFromBase64(event: Electron.IpcMainInvokeEvent, filePath: string, base64Data: string): Promise<boolean> {
  try {
    // 移除Base64数据URL前缀（如果存在）
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    await writeFile(filePath, buffer);
    log.debug('从Base64写入文件成功:', filePath);
    return true;
  } catch (error) {
    log.error('从Base64写入文件失败:', error);
    return false;
  }
}

/**
 * 保存剪贴板/内存中的图片到临时文件
 * @param event IPC事件对象
 * @param file 文件对象的信息（name, type, base64Data）
 * @returns 保存后的文件路径
 */
export async function saveClipboardImageToTemp(
  event: Electron.IpcMainInvokeEvent,
  fileInfo: { name: string; type: string; base64Data: string }
): Promise<string> {
  try {
    const { tmpdir } = await import('os');
    const { resolve: pathResolve } = await import('path');
    const { existsSync, mkdirSync } = await import('fs');

    // 创建临时目录
    const tempDir = pathResolve(tmpdir(), 'naimo');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // 生成随机文件名
    const timestamp = Date.now();
    const ext = fileInfo.name.split('.').pop() || fileInfo.type.split('/').pop() || 'png';
    const fileName = `image-save-${timestamp}.${ext}`;

    const filePath = pathResolve(tempDir, fileName);

    // 移除Base64数据URL前缀（如果存在）
    const cleanBase64 = fileInfo.base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    await writeFile(filePath, buffer);
    log.info('保存剪贴板图片到临时文件成功:', filePath);

    return filePath;
  } catch (error) {
    log.error('保存剪贴板图片到临时文件失败:', error);
    throw error;
  }
}

