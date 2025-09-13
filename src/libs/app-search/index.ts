import os from "os";
import { ChildProcess, exec, fork } from "child_process";
import { readdir, stat } from "fs";
import { promisify } from "util";
import { join, extname, basename } from "path";
import { shell } from "electron";
import type { Logger } from "electron-log";
import type { WorkerMessage, WorkerResponse } from "./icon-extractor";

let iconWorker: ChildProcess | null = null;
let requestIdCounter = 0;
/** Map: { id: resolve() } */
const pendingIconRequests = new Map();

/** 应用路径 */
export interface AppPath {
  /** 应用名称 */
  name: string;
  /** 应用路径 */
  path: string;
  /** 应用图标 */
  icon?: string | null;
}

/**
 * 创建子进程 (图标提取)
 * @param workerPath 子进程路径
 * @param logger 日志器
 */
export function createIconWorker(workerPath: string, logger: Logger): void {
  iconWorker = fork(workerPath);

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
    // 简单地重启 worker
    createIconWorker(workerPath, logger);
  });
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

// --- 新增辅助函数：通过子进程异步获取图标 (重构) ---
/**
 * 通过子进程异步获取图标
 * @param filePath 文件路径
 * @param cacheIconsDir 缓存目录路径
 * @returns 图标数据URL
 */
export function getIconDataURLAsync(
  filePath: string,
  cacheIconsDir: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const id = requestIdCounter++;
    pendingIconRequests.set(id, resolve);
    iconWorker?.send({ id, path: filePath, cacheIconsDir } as WorkerMessage);
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
 * 获取所有应用
 * @param cacheIconsDir 缓存目录路径
 * @returns 应用列表
 */
export async function getApps(cacheIconsDir: string): Promise<AppPath[]> {
  const [powerShellApps, startMenuApps] = await Promise.all([
    getAppsFromPowerShell(),
    getAppsFromStartMenu(),
  ]);

  const allApps: AppPath[] = [...startMenuApps, ...powerShellApps];
  const uniqueApps = new Map<string, AppPath>();

  for (const app of allApps) {
    if (!app.path) continue;
    const key = app.path.toLowerCase();
    if (!uniqueApps.has(key)) {
      uniqueApps.set(key, { name: app.name, path: app.path });
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
