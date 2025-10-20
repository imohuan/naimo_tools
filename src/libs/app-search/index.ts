import os from "os";

import { utilityProcess, UtilityProcess } from "electron"
import { ChildProcess, exec } from "child_process";
import { readdir, stat } from "fs";
import { promisify } from "util";
import { join, extname, basename } from "path";
import { shell } from "electron";
import type { Logger } from "electron-log";
import type { WorkerMessage, WorkerResponse } from "./icon-extractor";
import type { AppPath } from "./typings";
import { getSystemTools } from './system-tools';

// 导出系统工具模块
export * from './system-tools';


let iconWorker: UtilityProcess | null = null;
let requestIdCounter = 0;
/** Map: { id: resolve() } */
const pendingIconRequests = new Map();
/** 预缓存是否已完成 */
let preCacheInitialized = false;


/**
 * 创建子进程 (图标提取)
 * @param workerPath 子进程路径
 * @param logger 日志器
 * @param cacheIconsDir 缓存目录路径（可选，提供后会自动初始化预缓存）
 */
export function createIconWorker(workerPath: string, logger: Logger, cacheIconsDir?: string) {
  iconWorker = utilityProcess.fork(workerPath);

  // 监听来自子进程的消息
  iconWorker.on("message", ({ id, icon }: WorkerResponse) => {
    const resolve = pendingIconRequests.get(id);
    if (resolve) {
      resolve(icon);
      pendingIconRequests.delete(id);
    }
  });

  // 处理子进程退出
  iconWorker.on("exit", (code) => {
    logger.error(`Icon worker exited with code ${code}. Restarting...`);
    // 清理掉所有待处理的请求，避免它们永远不被 resolve
    pendingIconRequests.forEach((resolve) => resolve(null));
    pendingIconRequests.clear();
    // 重置预缓存状态
    preCacheInitialized = false;
    // 简单地重启 worker
    createIconWorker(workerPath, logger, cacheIconsDir);
  });

  // 如果提供了缓存目录，自动初始化预缓存
  if (cacheIconsDir && !preCacheInitialized) {
    logger.info('🔧 Worker 已创建，开始初始化图标预缓存...');
    initIconPreCache(cacheIconsDir)
      .then(() => {
        logger.info('✅ 图标预缓存初始化完成');
      })
      .catch((error) => {
        logger.error('❌ 图标预缓存初始化失败:', error);
      });
  }

  return iconWorker;
}

/**
 * 从 PowerShell 获取已安装应用
 */
export function getAppsFromPowerShell(): Promise<AppPath[]> {
  return new Promise((resolve) => {
    if (os.platform() !== "win32") return resolve([]);
    const command =
      'powershell "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*, HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, InstallLocation, DisplayIcon"';
    exec(command, { encoding: "buffer" }, (error, stdout) => {
      if (error) {
        console.error("PowerShell error:", error);
        return resolve([]);
      }
      resolve([]);
      // const decodedStdout = iconv.decode(stdout, 'GBK');
      // const lines = decodedStdout.split('\n').filter(line => line.trim());
      // const apps = [];
      // let currentApp = {};
      // lines.forEach(line => {
      //   if (line.startsWith('DisplayName')) {
      //     if (currentApp.name && currentApp.path) apps.push(currentApp);
      //     currentApp = { name: line.split(':')[1]?.trim() };
      //   } else if (line.startsWith('InstallLocation')) {
      //     if (!currentApp.path) currentApp.path = line.split(':')[1]?.trim();
      //   } else if (line.startsWith('DisplayIcon')) {
      //     currentApp.path = line.split(':')[1]?.trim().split(',')[0].replace(/"/g, '');
      //   }
      // });
      // if (currentApp.name && currentApp.path) apps.push(currentApp);
      // resolve(apps.filter(app => app.path && fs.existsSync(app.path)));
    });
  });
}

/**
 * 从开始菜单获取已安装应用
 */
export async function getAppsFromStartMenu(): Promise<AppPath[]> {
  if (os.platform() !== "win32") return [];

  const startMenuPaths = [
    "C:\\ProgramData\\Microsoft\\Windows\\Start Menu",
    join(os.homedir(), "AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs"),
  ];

  let apps: AppPath[] = [];
  const seenTargets = new Set();

  const scanDirectory = async (directory: string): Promise<void> => {
    try {
      const files = await promisify(readdir)(directory);
      for (const file of files) {
        const fullPath = join(directory, file);
        const statResult = await promisify(stat)(fullPath);
        if (statResult.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (extname(fullPath).toLowerCase() === ".lnk") {
          try {
            // 读取快捷方式
            const shortcut = shell.readShortcutLink(fullPath);
            // 排除卸载程序和包含"卸载"的程序
            if (
              shortcut.target &&
              !shortcut.target.toLowerCase().includes("uninstall") &&
              !file.includes("卸载")
            ) {
              // 排除重复
              if (!seenTargets.has(shortcut.target)) {
                // 添加到结果中
                apps.push({ name: basename(file, ".lnk"), path: shortcut.target });
                // 添加到已处理集合中
                seenTargets.add(shortcut.target);
              }
            }
          } catch (e) {
            /* 忽略无效的快捷方式 */
          }
        }
      }
    } catch (e) {
      /* 忽略无法访问的目录 */
    }
  };

  // 并行扫描所有开始菜单路径
  await Promise.all(startMenuPaths.map(scanDirectory));
  return apps;
}

/**
 * 初始化预缓存（在应用启动时调用）
 * @param cacheIconsDir 缓存目录路径
 * @returns Promise<void>
 */
export async function initIconPreCache(cacheIconsDir: string): Promise<void> {
  if (preCacheInitialized || !iconWorker) {
    return;
  }

  return new Promise((resolve) => {
    const id = requestIdCounter++;
    pendingIconRequests.set(id, (result: string | null) => {
      if (result === 'PRE_CACHE_COMPLETE') {
        preCacheInitialized = true;
      }
      pendingIconRequests.delete(id);
      resolve();
    });

    iconWorker?.postMessage({
      id,
      path: '',
      cacheIconsDir,
      preCache: true
    } as WorkerMessage);

    // 预缓存超时时间设置为 10 秒
    setTimeout(() => {
      if (pendingIconRequests.has(id)) {
        pendingIconRequests.delete(id);
        resolve();
      }
    }, 10000);
  });
}

// --- 新增辅助函数：通过子进程异步获取图标 (重构) ---
/**
 * 通过子进程异步获取图标
 * @param filePath 文件路径
 * @param cacheIconsDir 缓存目录路径
 * @param useExtension 是否使用扩展名模式（默认 false）
 * @returns 图标数据URL
 */
export function getIconDataURLAsync(
  filePath: string,
  cacheIconsDir: string,
  useExtension: boolean = false
): Promise<string | null> {
  return new Promise((resolve) => {
    const id = requestIdCounter++;
    pendingIconRequests.set(id, resolve);
    iconWorker?.postMessage({
      id,
      path: filePath,
      cacheIconsDir,
      useExtension
    } as WorkerMessage);
    // 添加超时以防子进程无响应
    setTimeout(() => {
      if (pendingIconRequests.has(id)) {
        pendingIconRequests.delete(id);
        resolve(null); // 超时后返回 null
      }
    }, 2000); // 2秒超时
  });
}

/**
 * 获取所有应用（包括系统功能）
 * @param cacheIconsDir 缓存目录路径
 * @returns 应用列表
 */
export async function getApps(cacheIconsDir: string): Promise<AppPath[]> {
  const [powerShellApps, startMenuApps, systemTools] = await Promise.all([
    getAppsFromPowerShell(),
    getAppsFromStartMenu(),
    getSystemTools()
  ]);

  // 处理系统功能：将 description 作为 name
  const processedSystemTools = systemTools.map(tool => ({
    name: tool.description || tool.name,
    path: tool.path,
    command: tool.command
  }));

  const allApps: AppPath[] = [...startMenuApps, ...powerShellApps, ...processedSystemTools];
  const uniqueApps = new Map<string, AppPath>();

  for (const app of allApps) {
    if (!app.path) continue;
    // 对于有 command 的项目（系统功能），使用 command 作为去重 key
    // 对于没有 command 的项目（普通应用），使用 path 作为去重 key
    const key = (app.command || app.path).toLowerCase();
    if (!uniqueApps.has(key)) {
      uniqueApps.set(key, {
        name: app.name,
        path: app.path,
        command: app.command
      });
    }
  }

  const appsToProcess = Array.from(uniqueApps.values());

  // 并行地、异步地从子进程获取所有图标
  const processedAppsPromises = appsToProcess.map(async (app) => {
    const icon = await getIconDataURLAsync(app.path, cacheIconsDir);
    return { ...app, icon };
  });

  const finalApps = await Promise.all(processedAppsPromises);
  return finalApps.sort((a, b) => a.name.localeCompare(b.name));
}
