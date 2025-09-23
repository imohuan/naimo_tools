/**
 * 窗口管理模块
 * 展示新的 IPC 路由系统使用方式
 */

import { BrowserWindow, screen, globalShortcut } from "electron";
import { dirname, join } from "path";
import log from "electron-log";
import { fileURLToPath } from "url";
import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { AppConfigManager } from "../../config/app.config";
import { BasicWindowMetadata, WindowType, WindowManager } from "../../config/window-manager";
const configManager = new AppConfigManager();
const windowManager = WindowManager.getInstance();

/**
 * 最小化窗口
 */
export function minimize(): void {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.minimize();
    log.debug("窗口已最小化");
  }
}

/**
 * 最大化/还原窗口
 */
export function maximize(): void {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    if (window.isMaximized()) {
      window.unmaximize();
      log.debug("窗口已还原");
    } else {
      window.maximize();
      log.debug("窗口已最大化");
    }
  }
}

/**
 * 关闭窗口
 */
export function close(): void {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.close();
    log.debug("窗口已关闭");
  }
}

/**
 * 切换窗口显示状态
 * @param show 可选参数，指定是否显示窗口。不传则进行toggle
 */
export function toggleShow(id: number, show?: boolean): void {
  const window = BrowserWindow.fromId(id);
  if (!window) {
    log.warn("没有找到焦点窗口");
    return;
  }

  const isVisible = windowManager.isWindowVisible(window);
  const shouldShow = show !== undefined ? show : !isVisible;

  if (shouldShow && !isVisible) {
    // 显示窗口
    windowManager.show(window);
    window.focus();
    log.debug("窗口已显示");
  } else if (!shouldShow && isVisible) {
    // 隐藏窗口
    windowManager.hide(window);
    log.debug("窗口已隐藏");
  }
}

/**
 * 检查窗口是否最大化
 * @returns 窗口是否最大化
 */
export function isMaximized(): boolean {
  const window = BrowserWindow.getFocusedWindow();
  return window ? window.isMaximized() : false;
}

/**
 * 检查窗口是否显示
 * @param id 窗口ID
 * @returns 窗口是否显示
 */
export function isWindowVisible(id: number): boolean {
  const window = BrowserWindow.fromId(id);
  if (!window) {
    return false;
  }
  return windowManager.isWindowVisible(window);
}

/**
 * 设置窗口大小
 * @param width 窗口宽度
 * @param height 窗口高度
 */
export function setSize(width: number, height: number): void {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    const [w, h] = window.getSize();
    const nowW = width === -1 ? w : width;
    const nowH = height === -1 ? h : height;

    // 如果尺寸没有变化，直接返回
    if (w === nowW && h === nowH) {
      return;
    }

    log.debug(`窗口大小已设置为: ${nowW}x${nowH}`);

    // 使用 setBounds 进行更平滑的尺寸调整
    const bounds = window.getBounds();
    window.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: nowW,
      height: nowH,
    });
  }
}

/**
 * 设置窗口是否可调整大小
 * @param resizable 是否可调整大小
 */
export function setResizable(resizable: boolean, windowId: number): void {
  const window = BrowserWindow.fromId(windowId);
  if (window) {
    window.setResizable(resizable);
    log.debug(`窗口可调整大小状态已设置为: ${resizable}`);
  }
}

/**
 * 打开日志查看器窗口
 */
export function openLogViewer(): void {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // 检查是否已经有日志查看器窗口打开
  const existingWindow = BrowserWindow.getAllWindows().find(
    (window) => window.getTitle() === "日志查看器"
  );

  if (existingWindow) {
    existingWindow.focus();
    return;
  }

  // 创建新的日志查看器窗口
  const logWindow = new BrowserWindow({
    width: 1500,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "日志查看器",
    frame: false, // 无边框窗口
    show: false,
    hasShadow: false, // 移除窗口阴影
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, "preloads/basic.js"), // 注入basic.js preload
      webSecurity: true,
    },
  });

  // 加载日志查看器HTML文件
  const logViewerPath = join(__dirname, "../renderer/log-viewer.html");
  logWindow.loadFile(logViewerPath);

  // 窗口准备好后显示
  logWindow.once("ready-to-show", () => {
    windowManager.show(logWindow);
    log.info("日志查看器窗口已打开");
  });

  // 窗口关闭时的处理
  logWindow.on("closed", () => {
    log.info("日志查看器窗口已关闭");
  });

  // 开发环境下打开开发者工具
  if (process.env.NODE_ENV === "development") {
    logWindow.webContents.openDevTools({ mode: "bottom" });
  }
}

// 全局快捷键管理
const registeredGlobalShortcuts = new Map<string, string>();

/**
 * 注册全局快捷键
 */
export function registerGlobalHotkey(accelerator: string, id: string): boolean {
  try {
    log.info(`🔧 主进程开始注册全局快捷键: ${accelerator} (${id})`);

    // 检查是否已注册，如果已注册则先注销
    if (registeredGlobalShortcuts.has(id)) {
      log.warn(`全局快捷键 ${id} 已存在，先注销再重新注册`);
      const oldAccelerator = registeredGlobalShortcuts.get(id);
      if (oldAccelerator && globalShortcut.isRegistered(oldAccelerator)) {
        globalShortcut.unregister(oldAccelerator);
        log.info(`已注销旧的全局快捷键: ${oldAccelerator}`);
      }
      registeredGlobalShortcuts.delete(id);
    }

    // 检查快捷键是否已被其他应用使用
    if (globalShortcut.isRegistered(accelerator)) {
      log.warn(`快捷键 ${accelerator} 已被其他应用注册`);
      return false;
    }

    log.info(`快捷键 ${accelerator} 未被占用，可以注册`);

    // 注册全局快捷键
    const success = globalShortcut.register(accelerator, () => {
      log.info(`🎉 全局快捷键被触发: ${accelerator} (${id})`);
      // 发送事件到渲染进程
      const windows = BrowserWindow.getAllWindows();
      log.info(`发送事件到 ${windows.length} 个窗口`);
      windows.forEach((window) => {
        window.webContents.send("global-hotkey-trigger", { hotkeyId: id });
        log.debug(`已发送事件到窗口: ${window.id}`);
      });
    });

    if (success) {
      registeredGlobalShortcuts.set(id, accelerator);
      log.info(`注册全局快捷键成功: ${accelerator} (${id})`);
    } else {
      log.error(`注册全局快捷键失败: ${accelerator} (${id})`);
    }

    return success;
  } catch (error) {
    log.error(`注册全局快捷键异常: ${accelerator} (${id})`, error);
    return false;
  }
}

/**
 * 注销全局快捷键
 */
export function unregisterGlobalHotkey(accelerator: string, id: string = "-1"): boolean {
  try {
    const cacheAccelerator = registeredGlobalShortcuts.get(id);
    const accelerators: string[] = [cacheAccelerator, accelerator].filter(
      Boolean
    ) as string[];
    for (const accelerator of accelerators) {
      if (globalShortcut.isRegistered(accelerator)) {
        globalShortcut.unregister(accelerator);
      }
      registeredGlobalShortcuts.delete(id);
    }
    log.info(`注销全局快捷键成功: ${accelerator} (${id})`);
    return true;
  } catch (error) {
    log.error(`注销全局快捷键异常: ${id}`, error);
    return false;
  }
}

/**
 * 注销所有全局快捷键
 */
export function unregisterAllGlobalHotkeys(): void {
  try {
    globalShortcut.unregisterAll();
    registeredGlobalShortcuts.clear();
    log.info("已注销所有全局快捷键");
  } catch (error) {
    log.error("注销所有全局快捷键异常", error);
  }
}

/**
 * 检查快捷键是否已注册
 */
export function isGlobalHotkeyRegistered(accelerator: string): boolean {
  return globalShortcut.isRegistered(accelerator);
}

/**
 * 获取所有已注册的全局快捷键
 */
export function getAllRegisteredGlobalHotkeys(): Array<{
  id: string;
  accelerator: string;
}> {
  return Array.from(registeredGlobalShortcuts.entries()).map(([id, accelerator]) => ({
    id,
    accelerator,
  }));
}

/**
 * 获取UI常量配置
 * @returns UI常量配置对象，包含headerHeight、maxHeight、padding
 */
export function getUIConstants(): {
  headerHeight: number;
  maxHeight: number;
  padding: number;
} {
  try {
    const uiConstants = configManager.get('uiConstants');
    if (uiConstants) {
      return {
        headerHeight: uiConstants.headerHeight,
        maxHeight: uiConstants.maxHeight,
        padding: uiConstants.padding
      };
    }
  } catch (error) {
    log.warn("获取UI常量配置失败，使用默认值:", error);
  }
  // 返回默认值
  return { headerHeight: 50, maxHeight: 420, padding: 8 };
}

/**
 * 计算跟随窗口的最终边界
 * @param mainX 主窗口X坐标
 * @param mainY 主窗口Y坐标
 * @param mainWidth 主窗口宽度
 * @param mainHeight 主窗口高度
 * @returns 跟随窗口的最终边界配置
 */
export function calculateFollowingWindowBounds(
  mainX: number,
  mainY: number,
  mainWidth: number,
  mainHeight: number,
  addPadding: number = 0
): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  let { headerHeight, maxHeight, padding } = getUIConstants();
  padding += addPadding;

  return {
    x: mainX + padding,
    y: mainY + headerHeight + padding,
    width: mainWidth - padding * 2,
    height: maxHeight - addPadding * 2
  };
}

/** 显示所有following类型的窗口 */
export function showAllFollowingWindows(): void {
  const followingWindows = windowManager.getWindowInfoByType(WindowType.FOLLOWING);
  followingWindows.forEach(followingWindow => {
    if (followingWindow.metadata?.init) {
      // 使用 WindowManager.show 避免动画效果
      windowManager.show(followingWindow.window);
    }
  });
}

/**
 * 隐藏所有following类型的窗口
 */
export function hideAllFollowingWindows(): void {
  try {
    const followingWindows = windowManager.getWindowsByType(WindowType.FOLLOWING);

    log.info(`开始隐藏 ${followingWindows.length} 个following窗口`);

    followingWindows.forEach(followingWindow => {
      if (windowManager.isWindowVisible(followingWindow)) {
        windowManager.hide(followingWindow);
        log.debug(`隐藏following窗口: ID=${followingWindow.id}`);
      }
    });

    log.info("所有following窗口已隐藏");
  } catch (error) {
    log.error("隐藏following窗口时发生错误:", error);
  }
}

/**
 * 关闭所有following类型的窗口
 */
export function closeAllFollowingWindows(): void {
  try {
    const followingWindows = windowManager.getWindowsByType(WindowType.FOLLOWING);

    log.info(`开始关闭 ${followingWindows.length} 个following窗口`);

    followingWindows.forEach(followingWindow => {
      followingWindow.close();
      log.debug(`关闭following窗口: ID=${followingWindow.id}`);
    });

    log.info("所有following窗口已关闭");
  } catch (error) {
    log.error("关闭following窗口时发生错误:", error);
  }
}

/**
 * 根据配置隐藏或关闭所有following窗口
 * @param action 操作类型：'hide' 隐藏，'close' 关闭
 */
export function manageFollowingWindows(action: 'hide' | 'close'): void {
  if (action === 'hide') {
    hideAllFollowingWindows();
  } else if (action === 'close') {
    closeAllFollowingWindows();
  } else {
    log.warn(`未知的操作类型: ${action}，默认执行隐藏操作`);
    hideAllFollowingWindows();
  }
}

/**
 * 根据插件信息显示特定的following窗口
 * @param pluginItem 插件项目信息，包含pluginId和名称
 */
export function showSpecificFollowingWindow(pathId: string): void {
  try {
    const followingWindows = windowManager.getWindowInfoByType(WindowType.FOLLOWING);

    log.info(`开始查找并显示特定插件窗口: ${pathId}`);

    let foundWindow = false;

    followingWindows.forEach(followingWindow => {
      const followingPathId = followingWindow.metadata?.path
      if (!followingPathId) return
      if (followingPathId === pathId) {
        if (!windowManager.isWindowVisible(followingWindow.window)) {
          windowManager.show(followingWindow.window);
          log.info(`显示特定插件窗口: ${followingPathId} (PluginId: ${pathId})`);
          foundWindow = true;
        } else {
          log.debug(`插件窗口已显示: ${followingPathId} (PluginId: ${pathId})`);
          foundWindow = true;
        }
      }
    });

    if (!foundWindow) {
      log.warn(`未找到匹配的插件窗口: ${pathId}`);
    }
  } catch (error) {
    log.error("显示特定插件窗口时发生错误:", error);
  }
}

/**
 * 创建网页显示窗口
 * @param windowId 主窗口ID
 * @param url 要显示的网页URL
 * @param metadata 元数据，包含title、preload等额外信息
 */
export async function createWebPageWindow(
  windowId: number,
  url: string,
  metadata?: Omit<BasicWindowMetadata, "init" | "parentWindowId" | "url" | "path">
): Promise<void> {
  // 获取主窗口位置和大小
  const mainWindow = BrowserWindow.fromId(windowId);
  if (!mainWindow) {
    log.error("无法获取主窗口，无法创建网页窗口");
    return;
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // 注册窗口到管理器
  // 检查是否已经有相同URL的网页窗口打开
  const title = metadata?.title || 'Web Page';

  // windowManager.getWindowInfoByType(WindowType.FOLLOWING).forEach(followingWindow => {
  //   const { name, pluginId } = followingWindow.metadata as any || {}
  //   if (name === metadata?.name && pluginId === metadata?.pluginId) {
  //     mainWindow.focus();
  //     return;
  //   }
  // });

  const [mainX, mainY] = mainWindow.getPosition();
  const [mainWidth, mainHeight] = mainWindow.getSize();

  // 计算网页窗口的位置和大小
  // 使用抽象函数计算最终边界
  const bounds = calculateFollowingWindowBounds(mainX, mainY, mainWidth, mainHeight, 2);

  // 默认使用内置 preload 脚本，如果有用户自定义的 preload，则创建组合脚本
  let preloadScript: string | undefined = join(__dirname, 'preloads', 'webpage-preload.js');
  if (metadata?.preload) {
    // 如果有用户自定义的 preload，创建组合脚本
    preloadScript = await createCombinedPreloadScript(metadata.preload, preloadScript);
  }

  let windowOptions: Electron.BrowserWindowConstructorOptions = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 100,
    minHeight: 100,
    title: title,
    frame: false, // 无边框窗口，更好地融入主窗口
    show: false,
    resizable: false,
    parent: mainWindow, // 设置父窗口，控制生命周期
    skipTaskbar: true, // 不在任务栏显示
    hasShadow: false, // 移除窗口阴影
    transparent: true, // 透明窗口
    backgroundColor: 'white', // 白色
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      webSecurity: true,
      preload: preloadScript,
    },
  };

  // 创建新的网页窗口
  const webWindow = new BrowserWindow(windowOptions);
  windowManager.hide(webWindow);
  webWindow.showInactive()

  const allWindows = BrowserWindow.getAllWindows();
  log.info(`当前所有窗口数量: ${allWindows.length}`);

  windowManager.registerWindow(webWindow, WindowType.FOLLOWING, {
    ...metadata, url, title, init: false, parentWindowId: windowId, path: metadata?.path,
  });

  // 加载网页
  if (url.startsWith("http")) {
    webWindow.loadURL(url);
  } else {
    webWindow.loadFile(url);
  }

  // 窗口准备好后显示（无动画）
  webWindow.once("ready-to-show", () => {
    // 直接显示，无动画效果
    log.info(
      `网页窗口已打开: ${title} - ${url} 位置: ${bounds.x},${bounds.y} 大小: ${bounds.width}x${bounds.height}`
    );
  });

  webWindow.webContents.on("did-finish-load", () => {
    windowManager.show(webWindow); // 使用 WindowManager.show 避免动画
    windowManager.setMetadata(webWindow.id, { init: true });

    const __metadata = JSON.stringify(metadata)
    webWindow.webContents.executeJavaScript(`
      window.__metadata = ${__metadata};
    `).catch((error) => {
      log.error("执行网页窗口 JavaScript 失败:", error);
    });
  });

  // 窗口关闭时的处理
  webWindow.on("closed", () => {
    log.info(`网页窗口已关闭: ${title}`);
    windowManager.unregisterWindow(webWindow.id);

    // 通知主渲染进程插件窗口已关闭
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("plugin-window-closed", {
        windowId: webWindow.id,
        title: title,
        path: metadata?.path
      });
      log.info(`已通知主渲染进程插件窗口关闭: ${title}`);
    }
  });

  // 注册ESC键关闭功能
  webWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "Escape" && input.type === "keyDown") {
      webWindow.close();
    }
  });

  // 开发环境下打开开发者工具
  if (process.env.NODE_ENV === "development") {
    webWindow.webContents.openDevTools({ mode: "bottom" });
  }
}

/**
 * 创建组合的 preload 脚本
 * 将内置 preload 和用户自定义 preload 合并
 */
async function createCombinedPreloadScript(customPreloadPath: string, defaultPreloadPath: string): Promise<string> {
  try {
    // 读取内置 preload 脚本
    const builtinPreloadPath = defaultPreloadPath
    const builtinPreloadContent = readFileSync(builtinPreloadPath, 'utf-8');

    // 读取用户自定义 preload 脚本
    const customPreloadContent = readFileSync(customPreloadPath, 'utf-8');

    // 创建组合脚本内容
    const combinedContent = `
// 内置 preload 脚本
${builtinPreloadContent}

// 用户自定义 preload 脚本
${customPreloadContent}
`;

    // 创建临时文件
    const tempDir = join(tmpdir(), 'naimo-preloads');
    mkdirSync(tempDir, { recursive: true });

    const tempFilePath = join(tempDir, `combined-preload-${Date.now()}.js`);
    writeFileSync(tempFilePath, combinedContent, 'utf-8');

    log.debug(`创建组合 preload 脚本: ${tempFilePath}`);
    return tempFilePath;

  } catch (error) {
    log.error('创建组合 preload 脚本失败:', error);
    // 如果失败，回退到内置 preload
    return defaultPreloadPath
  }
}
