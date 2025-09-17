/**
 * 文件系统模块
 * 展示新的 IPC 路由系统使用方式
 */

import { dialog, BrowserWindow, app } from 'electron';
import log from 'electron-log';
import { readFile, readdir, stat, mkdir, writeFile, unlink, rmdir } from 'fs/promises';
import { join, dirname, basename, extname } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import * as yauzl from 'yauzl';

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

/**
 * 获取插件目录路径
 */
function getPluginsDirectory(): string {
  return join(app.getPath('userData'), 'plugins');
}

/**
 * 读取插件配置文件
 * @param pluginPath 插件路径
 * @returns 插件配置对象
 */
export async function readPluginConfig(pluginPath: string): Promise<any> {
  try {
    const configPath = join(pluginPath, 'config.js');
    const configContent = await readFile(configPath, 'utf-8');

    // 执行配置文件获取配置对象
    const config = eval(`(${configContent})`);

    log.debug(`读取插件配置成功: ${pluginPath}`);
    return config;
  } catch (error) {
    log.error(`读取插件配置失败: ${pluginPath}`, error);
    throw error;
  }
}

/**
 * 获取所有已安装的插件（仅第三方插件）
 * @returns 插件配置数组
 */
export async function getAllInstalledPlugins(): Promise<any[]> {
  try {
    const pluginsDir = getPluginsDirectory();
    const plugins: any[] = [];

    // 确保插件目录存在
    await mkdir(pluginsDir, { recursive: true });

    // 只读取用户安装的第三方插件
    try {
      const userPlugins = await readdir(pluginsDir);
      for (const pluginName of userPlugins) {
        const pluginPath = join(pluginsDir, pluginName);
        const pluginStat = await stat(pluginPath);
        if (pluginStat.isDirectory()) {
          try {
            const config = await readPluginConfig(pluginPath);
            plugins.push({
              ...config,
              path: pluginPath,
              isDefault: false
            });
          } catch (error) {
            log.warn(`跳过无效的用户插件: ${pluginName}`, error);
          }
        }
      }
    } catch (error) {
      log.warn('用户插件目录不存在或无法访问:', error);
    }

    log.debug(`获取到 ${plugins.length} 个第三方插件`);
    return plugins;
  } catch (error) {
    log.error('获取已安装插件失败:', error);
    throw error;
  }
}

/**
 * 解压插件zip文件
 * @param zipPath zip文件路径
 * @param targetDir 目标目录
 */
export async function extractPluginZip(zipPath: string, targetDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }

      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) {
          // 目录条目
          zipfile.readEntry();
        } else {
          // 文件条目
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(err);
              return;
            }

            const outputPath = join(targetDir, entry.fileName);
            const outputDir = dirname(outputPath);

            // 确保目录存在
            mkdir(outputDir, { recursive: true }).then(() => {
              const writeStream = createWriteStream(outputPath);
              readStream.pipe(writeStream);

              writeStream.on('close', () => {
                zipfile.readEntry();
              });

              writeStream.on('error', (err) => {
                reject(err);
              });
            }).catch(reject);
          });
        }
      });

      zipfile.on('end', () => {
        resolve();
      });

      zipfile.on('error', (err) => {
        reject(err);
      });
    });
  });
}

/**
 * 安装插件zip文件
 * @param zipPath zip文件路径
 * @returns 是否安装成功
 */
export async function installPluginFromZip(zipPath: string): Promise<boolean> {
  try {
    const pluginsDir = getPluginsDirectory();

    // 确保插件目录存在
    await mkdir(pluginsDir, { recursive: true });

    // 从zip文件名获取插件名称
    const pluginName = basename(zipPath, extname(zipPath));
    const targetDir = join(pluginsDir, pluginName);

    // 如果目标目录已存在，先删除
    try {
      await rmdir(targetDir, { recursive: true });
    } catch (error) {
      // 目录不存在，忽略错误
    }

    // 解压zip文件
    await extractPluginZip(zipPath, targetDir);

    // 验证插件配置
    await readPluginConfig(targetDir);

    log.info(`插件安装成功: ${pluginName}`);
    return true;
  } catch (error) {
    log.error(`插件安装失败: ${zipPath}`, error);
    return false;
  }
}

/**
 * 卸载插件
 * @param pluginId 插件ID
 * @returns 是否卸载成功
 */
export async function uninstallPlugin(pluginId: string): Promise<boolean> {
  try {
    const pluginsDir = getPluginsDirectory();
    const pluginPath = join(pluginsDir, pluginId);
    // 检查插件是否存在
    try {
      await stat(pluginPath);
    } catch (error) {
      log.warn(`插件不存在: ${pluginId}`);
      return false;
    }
    // 删除插件目录
    await rmdir(pluginPath, { recursive: true });
    log.info(`插件卸载成功: ${pluginId}`);
    return true;
  } catch (error) {
    log.error(`插件卸载失败: ${pluginId}`, error);
    return false;
  }
}
