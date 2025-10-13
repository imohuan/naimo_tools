import extractFileIcon from 'extract-file-icon';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import { createHash } from 'crypto';
import { tmpdir } from 'os';

/** 扩展名到图标缓存的映射 */
const extensionIconCache = new Map<string, string | null>();

/** 常见文件类型扩展名列表 */
const COMMON_EXTENSIONS = [
  '.exe', '.lnk', '.url', '.msi',
  '.txt', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf',
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico',
  '.mp3', '.mp4', '.avi', '.mkv', '.mov', '.wav', '.flac',
  '.zip', '.rar', '.7z', '.tar', '.gz',
  '.html', '.htm', '.css', '.js', '.ts', '.json', '.xml',
  '.py', '.java', '.cpp', '.c', '.h', '.cs', '.go', '.rs',
  '.bat', '.cmd', '.ps1', '.sh',
  '.dll', '.sys', '.ini', '.cfg', '.conf'
];

/** Windows 系统文件示例路径（用于提取图标） */
const WINDOWS_SYSTEM_FILES: Record<string, string> = {
  '.exe': 'C:\\Windows\\System32\\notepad.exe',
  '.dll': 'C:\\Windows\\System32\\kernel32.dll',
  '.sys': 'C:\\Windows\\System32\\drivers\\disk.sys',
  '.msi': 'C:\\Windows\\System32\\msiexec.exe',
  '.bat': 'C:\\Windows\\System32\\cmd.exe',
  '.cmd': 'C:\\Windows\\System32\\cmd.exe',
  '.ps1': 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
};

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
 * 根据扩展名生成缓存文件名
 * @param extension 文件扩展名（如 '.txt'）
 * @returns 缓存文件名
 */
function getExtensionCacheFileName(extension: string): string {
  const normalizedExt = extension.toLowerCase();
  const hash = createHash('md5').update(`ext_${normalizedExt}_32`).digest('hex');
  return `ext_${hash}.png`;
}

/**
 * 从磁盘读取缓存并转换为 Data URL
 * @param cacheFilePath 缓存文件路径
 * @returns Base64 Data URL 或 null
 */
function readCacheFile(cacheFilePath: string): string | null {
  if (!existsSync(cacheFilePath)) {
    return null;
  }

  try {
    const cachedBuffer = readFileSync(cacheFilePath);
    if (cachedBuffer && cachedBuffer.length > 0) {
      return `data:image/png;base64,${cachedBuffer.toString('base64')}`;
    }
  } catch (e) {
    console.error(`Error reading cache file ${cacheFilePath}:`, (e as Error).message);
  }

  return null;
}

/**
 * 获取扩展名对应的图标（从内存缓存或磁盘缓存）
 * @param extension 文件扩展名
 * @param cacheIconsDir 缓存目录路径
 * @returns Base64 Data URL 或 null
 */
function getIconByExtension(extension: string, cacheIconsDir: string): string | null {
  const normalizedExt = extension.toLowerCase();

  // 1. 先检查内存缓存
  if (extensionIconCache.has(normalizedExt)) {
    return extensionIconCache.get(normalizedExt) || null;
  }

  // 2. 检查磁盘缓存
  const cacheFileName = getExtensionCacheFileName(normalizedExt);
  const cacheFilePath = join(cacheIconsDir, cacheFileName);
  const dataURL = readCacheFile(cacheFilePath);

  if (dataURL) {
    // 加载到内存缓存中
    extensionIconCache.set(normalizedExt, dataURL);
  }

  return dataURL;
}

/**
 * 获取用于提取图标的示例文件路径
 * @param ext 文件扩展名
 * @returns 示例文件路径或 null
 */
function getSampleFileForExtension(ext: string): string | null {
  const normalizedExt = ext.toLowerCase();

  // 1. 优先使用 Windows 系统文件
  if (WINDOWS_SYSTEM_FILES[normalizedExt]) {
    const systemFile = WINDOWS_SYSTEM_FILES[normalizedExt];
    if (existsSync(systemFile)) {
      return systemFile;
    }
  }

  // 2. 对于其他扩展名，创建临时文件
  try {
    const tempDir = tmpdir();
    const tempFileName = `icon_sample_${Date.now()}${normalizedExt}`;
    const tempFilePath = join(tempDir, tempFileName);

    // 创建一个空文件
    writeFileSync(tempFilePath, '');

    return tempFilePath;
  } catch (e) {
    console.error(`Failed to create temp file for ${ext}:`, (e as Error).message);
    return null;
  }
}

/**
 * 预缓存常见文件类型的图标
 * 加载已有缓存到内存，并为缺失的扩展名初始化图标缓存
 * @param cacheIconsDir 缓存目录路径
 */
function preCacheCommonExtensions(cacheIconsDir: string): void {
  console.log('📦 开始预缓存常见文件类型图标...');

  // 确保缓存目录存在
  if (!existsSync(cacheIconsDir)) {
    mkdirSync(cacheIconsDir, { recursive: true });
  }

  let loadedCount = 0;
  let createdCount = 0;
  const tempFilesToCleanup: string[] = [];

  for (const ext of COMMON_EXTENSIONS) {
    const normalizedExt = ext.toLowerCase();
    const cacheFileName = getExtensionCacheFileName(normalizedExt);
    const cacheFilePath = join(cacheIconsDir, cacheFileName);

    // 1. 先尝试从缓存加载
    const cachedIcon = readCacheFile(cacheFilePath);
    if (cachedIcon) {
      extensionIconCache.set(normalizedExt, cachedIcon);
      loadedCount++;
      continue;
    }

    // 2. 缓存不存在，尝试创建
    console.log(`🔨 初始化扩展名图标: ${ext}`);
    const sampleFile = getSampleFileForExtension(ext);

    if (!sampleFile) {
      console.log(`⚠️ 无法为 ${ext} 创建示例文件`);
      continue;
    }

    // 记录临时文件用于清理
    if (!WINDOWS_SYSTEM_FILES[normalizedExt]) {
      tempFilesToCleanup.push(sampleFile);
    }

    try {
      // 提取图标
      const buffer = extractFileIcon(sampleFile, 32);

      if (buffer && buffer.length > 0) {
        // 写入缓存
        writeFileSync(cacheFilePath, buffer);

        // 转换为 Data URL 并存入内存
        const dataURL = `data:image/png;base64,${buffer.toString('base64')}`;
        extensionIconCache.set(normalizedExt, dataURL);
        createdCount++;
        console.log(`✅ 成功初始化 ${ext} 图标`);
      } else {
        console.log(`⚠️ 提取 ${ext} 图标失败: 无数据`);
      }
    } catch (e) {
      console.error(`❌ 提取 ${ext} 图标出错:`, (e as Error).message);
    }
  }

  // 清理临时文件
  for (const tempFile of tempFilesToCleanup) {
    try {
      if (existsSync(tempFile)) {
        unlinkSync(tempFile);
      }
    } catch (e) {
      // 忽略清理错误
    }
  }

  console.log(`✅ 预缓存完成 - 从磁盘加载: ${loadedCount} 个，新创建: ${createdCount} 个，共 ${loadedCount + createdCount} 个文件类型图标`);
}

/**
 * 提取图标并写入缓存
 * @param filePath 文件路径
 * @param cacheFilePath 缓存文件路径
 * @param useExtension 是否使用扩展名模式
 * @param startTime 开始时间戳（用于日志）
 * @returns Base64 Data URL 或 null
 */
function extractAndCacheIcon(
  filePath: string,
  cacheFilePath: string,
  useExtension: boolean,
  startTime: number
): string | null {
  console.log(`🔨 开始提取图标: ${filePath}`);
  const extractStart = Date.now();

  try {
    // 调用 extract-file-icon 获取图标的 Buffer 数据
    const buffer = extractFileIcon(filePath, 32); // 提取 32x32 尺寸的图标
    console.log(`🔨 图标提取完成，耗时: ${Date.now() - extractStart}ms`);

    if (!buffer || buffer.length === 0) {
      return null;
    }

    // 写入缓存文件
    try {
      writeFileSync(cacheFilePath, buffer);
    } catch (e) {
      console.error(`Error writing icon cache for ${filePath}:`, (e as Error).message);
    }

    // 转换为 Data URL
    const dataURL = `data:image/png;base64,${buffer.toString('base64')}`;

    // 如果是扩展名模式，同时更新内存缓存
    if (useExtension) {
      const ext = extname(filePath).toLowerCase();
      extensionIconCache.set(ext, dataURL);
      console.log(`✅ [扩展名模式] 图标已缓存到磁盘和内存: ${ext}, 总耗时: ${Date.now() - startTime}ms`);
    } else {
      console.log(`✅ [路径模式] 图标已缓存到磁盘: ${filePath}, 总耗时: ${Date.now() - startTime}ms`);
    }

    return dataURL;
  } catch (e) {
    console.error(`Error extracting icon for ${filePath}:`, (e as Error).message);
    return null;
  }
}

/**
 * 同步提取图标并转换为 Data URL，增加本地缓存支持。
 * 这是一个耗时操作，因此放在子进程中。
 * @param filePath 文件路径
 * @param cacheIconsDir 缓存目录路径
 * @param useExtension 是否使用扩展名模式（默认 false）
 * @returns Base64 Data URL 或 null
 */
function getIconDataURL(filePath: string, cacheIconsDir: string, useExtension: boolean = false): string | null {
  const startTime = Date.now();

  if (!filePath) {
    return null;
  }

  try {
    // 扩展名模式：先尝试从扩展名缓存获取
    if (useExtension) {
      const ext = extname(filePath).toLowerCase();
      if (ext) {
        const cachedIcon = getIconByExtension(ext, cacheIconsDir);
        if (cachedIcon) {
          console.log(`✅ [扩展名模式] 缓存命中: ${ext}, 耗时: ${Date.now() - startTime}ms`);
          return cachedIcon;
        }
        console.log(`⚠️ [扩展名模式] 缓存未命中: ${ext}`);
      }

      // 文件不存在且无缓存，返回 null
      if (!existsSync(filePath)) {
        console.log(`❌ [扩展名模式] 文件不存在且无缓存: ${filePath}`);
        return null;
      }

      // 文件存在，继续提取图标
      const cacheFileName = getExtensionCacheFileName(ext);
      const cacheFilePath = join(cacheIconsDir, cacheFileName);
      return extractAndCacheIcon(filePath, cacheFilePath, true, startTime);
    }

    // 路径模式：文件必须存在
    if (!existsSync(filePath)) {
      return null;
    }

    // 检查路径缓存
    const cacheFileName = getCacheFileName(filePath);
    const cacheFilePath = join(cacheIconsDir, cacheFileName);
    const cachedIcon = readCacheFile(cacheFilePath);

    if (cachedIcon) {
      console.log(`✅ [路径模式] 磁盘缓存命中: ${filePath}, 耗时: ${Date.now() - startTime}ms`);
      return cachedIcon;
    }

    // 缓存未命中，提取图标
    return extractAndCacheIcon(filePath, cacheFilePath, false, startTime);
  } catch (e) {
    console.error(`Error in getIconDataURL for ${filePath}:`, (e as Error).message);
    return null;
  }
}

/** 子进程收到的消息接口 */
export interface WorkerMessage {
  /** 请求唯一ID */
  id: number;
  /** 需要提取图标的文件路径 */
  path: string;
  /** 缓存目录路径 */
  cacheIconsDir: string;
  /** 是否使用扩展名模式 */
  useExtension?: boolean;
  /** 是否执行预缓存（仅在初始化时使用） */
  preCache?: boolean;
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
  process.parentPort.on('message', (event) => {
    const msg: WorkerMessage = event.data;

    // 处理预缓存请求
    if (msg && msg.preCache && msg.cacheIconsDir) {
      // 确保缓存目录存在
      if (!existsSync(msg.cacheIconsDir)) {
        mkdirSync(msg.cacheIconsDir, { recursive: true });
      }
      preCacheCommonExtensions(msg.cacheIconsDir);
      // 预缓存完成后，发送一个特殊的响应
      if (msg.id !== undefined) {
        const response: WorkerResponse = { id: msg.id, icon: 'PRE_CACHE_COMPLETE' };
        process.parentPort.postMessage(response);
      }
      return;
    }

    // 确保 msg 是一个对象且包含 id、path 和 cacheIconsDir
    if (typeof msg !== 'object' || msg === null || msg.id === undefined || !msg.path || !msg.cacheIconsDir) {
      return;
    }

    const { id, path, cacheIconsDir, useExtension = false } = msg;

    // 确保缓存目录存在
    if (!existsSync(cacheIconsDir)) {
      mkdirSync(cacheIconsDir, { recursive: true });
    }

    // 执行耗时任务
    const icon = getIconDataURL(path, cacheIconsDir, useExtension);

    // 将结果连同原始ID一起发回给主进程
    const response: WorkerResponse = { id, icon };
    process.parentPort.postMessage(response);
  });
}