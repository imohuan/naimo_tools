/**
 * 插件管理模块
 * 处理插件的安装、卸载、目录管理等功能
 */

import { app } from 'electron';
import log from 'electron-log';
import { readdir, stat, mkdir, rmdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import { createReadStream, createWriteStream } from 'fs';
// @ts-ignore
import unzipper from 'unzipper';
import archiver from 'archiver';

/**
 * 获取插件目录路径
 */
export function getPluginsDirectory(): string {
  return join(app.getPath('userData'), 'plugins');
}

/**
 * 获取插件配置文件路径
 * @param pluginPath 插件路径
 * @returns 插件配置文件路径
 */
function getPluginConfigPath(pluginPath: string): string {
  // return join(pluginPath, 'config.js');
  return join(pluginPath, 'manifest.json');
}

/**
 * 获取所有已安装的插件（仅第三方插件）
 * @returns 插件信息数组，包含路径和配置文件路径
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
          const configPath = getPluginConfigPath(pluginPath);
          // 检查配置文件是否存在
          try {
            await stat(configPath);
            plugins.push({
              path: pluginPath, configPath: configPath, isDefault: false
            });
          } catch (error) {
            log.warn(`跳过无效的用户插件: ${pluginName} (配置文件不存在)`);
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
async function extractPluginZip(zipPath: string, targetDir: string): Promise<void> {
  try {
    // 确保目标目录存在
    await mkdir(targetDir, { recursive: true });

    // 使用unzipper解压文件
    const stream = createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: targetDir }));

    // 等待解压完成
    await new Promise((resolve, reject) => {
      stream.on('close', resolve);
      stream.on('error', reject);
    });

    log.debug(`插件zip文件解压成功: ${zipPath} -> ${targetDir}`);
  } catch (error) {
    log.error(`插件zip文件解压失败: ${zipPath}`, error);
    throw error;
  }
}

/**
 * 安装插件zip文件
 * @param zipPath zip文件路径
 * @returns 插件安装路径，如果安装失败则返回null
 */
export async function installPluginFromZip(zipPath: string): Promise<{ path: string, configPath: string, isDefault: boolean } | null> {
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

    // 验证插件配置文件是否存在
    const configPath = getPluginConfigPath(targetDir);
    await stat(configPath);

    log.info(`插件安装成功: ${pluginName} -> ${targetDir}`);
    return { path: targetDir, configPath: configPath, isDefault: false };
  } catch (error) {
    log.error(`插件安装失败: ${zipPath}`, error);
    return null;
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

/**
 * 将文件夹打包为zip文件
 * @param sourceDir 源文件夹路径
 * @param outputPath 输出zip文件路径
 * @returns 是否打包成功
 */
export async function zipDirectory(sourceDir: string, outputPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      // 检查源目录是否存在
      stat(sourceDir).then(() => {
        const output = createWriteStream(outputPath);
        const archive = archiver('zip', {
          zlib: { level: 9 } // 设置压缩级别
        });

        output.on('close', () => {
          log.info(`文件夹打包成功: ${sourceDir} -> ${outputPath}`);
          resolve(true);
        });

        archive.on('error', (err: any) => {
          log.error(`文件夹打包失败: ${sourceDir}`, err);
          reject(err);
        });

        // 构建glob模式来过滤文件
        const globOptions = {
          ignore: [
            // 过滤掉zip文件
            '**/*.zip',
            // 过滤掉目标文件
            `**/${basename(outputPath)}`
          ]
        };

        log.debug('使用过滤选项:', globOptions);

        archive.pipe(output);
        archive.glob('**/*', {
          cwd: sourceDir,
          ignore: globOptions.ignore
        });
        archive.finalize();
      }).catch((error) => {
        log.error(`源目录不存在: ${sourceDir}`, error);
        reject(error);
      });
    } catch (error) {
      log.error(`创建zip文件失败: ${sourceDir}`, error);
      reject(error);
    }
  });
}
