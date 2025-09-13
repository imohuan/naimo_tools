import extractFileIcon from 'extract-file-icon';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

/**
 * 根据文件路径生成唯一的缓存文件名（使用MD5哈希）。
 * @param filePath 文件路径
 * @returns 缓存文件名
 */
function getCacheFileName(filePath: string): string {
  // 使用文件路径和所需的图标尺寸作为哈希输入
  const hash = createHash('md5').update(filePath + '_32').digest('hex');
  // 缓存文件使用 .png 扩展名
  return `${hash}.png`;
}

/**
 * 同步提取图标并转换为 Data URL，增加本地缓存支持。
 * 这是一个耗时操作，因此放在子进程中。
 * @param filePath 文件路径
 * @param cacheIconsDir 缓存目录路径
 * @returns Base64 Data URL 或 null
 */
function getIconDataURL(filePath: string, cacheIconsDir: string): string | null {
  try {
    // 增加一个存在性检查
    if (!filePath || !existsSync(filePath)) {
      return null;
    }

    const cacheFileName = getCacheFileName(filePath);
    const cacheFilePath = join(cacheIconsDir, cacheFileName);

    // 1. 检查缓存
    if (existsSync(cacheFilePath)) {
      // 缓存命中：直接读取缓存文件
      const cachedBuffer = readFileSync(cacheFilePath);
      if (cachedBuffer && cachedBuffer.length > 0) {
        // 将 Buffer 转换为 Base64 字符串，并构造成 Data URL
        return `data:image/png;base64,${cachedBuffer.toString('base64')}`;
      }
    }

    // 2. 缓存未命中：提取图标
    // 调用 extract-file-icon 获取图标的 Buffer 数据
    const buffer = extractFileIcon(filePath, 32); // 提取 32x32 尺寸的图标
    if (buffer && buffer.length > 0) {
      try {
        // 3. 写入缓存文件
        writeFileSync(cacheFilePath, buffer);
      } catch (e) {
        // 忽略写入缓存的错误，不影响主流程
        console.error(`Error writing icon cache for ${filePath}:`, (e as Error).message);
      }
      // 4. 返回 Data URL
      return `data:image/png;base64,${buffer.toString('base64')}`;
    }
  } catch (e) {
    // 忽略任何提取错误
    console.error(`Error extracting icon for ${filePath}:`, (e as Error).message);
  }
  return null; // 提取失败时返回 null
}

/** 子进程收到的消息接口 */
export interface WorkerMessage {
  /** 请求唯一ID */
  id: number;
  /** 需要提取图标的文件路径 */
  path: string;
  /** 缓存目录路径 */
  cacheIconsDir: string;
}

/** 子进程返回给主进程的响应接口 */
export interface WorkerResponse {
  /** 请求唯一ID */
  id: number;
  /** 提取到的图标DataURL，或null */
  icon: string | null;
}


export function startWorker() {
  // 监听来自主进程的消息
  process.on('message', (msg: WorkerMessage) => {



    // 确保 msg 是一个对象且包含 id、path 和 cacheIconsDir
    if (typeof msg !== 'object' || msg === null || !msg.id || !msg.path || !msg.cacheIconsDir) {
      return;
    }
    const { id, path, cacheIconsDir } = msg;
    // 确保缓存目录存在
    if (!existsSync(cacheIconsDir)) {
      mkdirSync(cacheIconsDir, { recursive: true });
    }
    // 执行耗时任务
    const icon = getIconDataURL(path, cacheIconsDir);
    // 将结果连同原始ID一起发回给主进程
    const response: WorkerResponse = { id, icon };
    process.send!(response);
  });

}