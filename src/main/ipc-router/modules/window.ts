/**
 * 窗口管理模块
 * 展示新的 IPC 路由系统使用方式
 */

import { BrowserWindow, screen, globalShortcut, app } from "electron";
import { dirname, join, resolve } from "path";
import log from "electron-log";
import { fileURLToPath } from "url";
import { getDirname } from "@main/utils";
import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { AppConfigManager } from "../../config/app.config";
// 移除对旧 WindowManager 的依赖，使用新的 NewWindowManager
const configManager = new AppConfigManager();

// 简化的兼容性实现 - 临时解决方案
interface LegacyWindowInfo {
  id: number;
  window: BrowserWindow;
  metadata?: any;
}

class LegacyWindowManager {
  public windows: Map<number, LegacyWindowInfo> = new Map();

  registerWindow(window: BrowserWindow, type: any, metadata?: any): void {
    this.windows.set(window.id, { id: window.id, window, metadata });
  }

  unregisterWindow(windowId: number): boolean {
    return this.windows.delete(windowId);
  }

  setMetadata(windowId: number, metadata: any): void {
    const windowInfo = this.windows.get(windowId);
    if (windowInfo) {
      windowInfo.metadata = { ...windowInfo.metadata, ...metadata };
    }
  }

  isWindowVisible(window: BrowserWindow): boolean {
    return window.getPosition()[0] > 0;
  }

  show(window: BrowserWindow): void {
    window.show();
  }

  hide(window: BrowserWindow): void {
    window.hide();
  }

  getWindowsByType(type: any): BrowserWindow[] {
    return Array.from(this.windows.values()).map(info => info.window);
  }

  getWindowInfoByType(type: any): LegacyWindowInfo[] {
    return Array.from(this.windows.values());
  }

  getMainInfo(): LegacyWindowInfo | undefined {
    // 简化实现：返回第一个窗口作为主窗口
    return Array.from(this.windows.values())[0];
  }
}

const windowManager = new LegacyWindowManager();

// 窗口类型枚举
enum WindowType {
  MAIN = 'main',
  FOLLOWING = 'following',
  SEPARATED = 'separated',
  BACKGROUND = 'background'
}

/**
 * 最小化窗口
 */
export function minimize(event: Electron.IpcMainInvokeEvent): void {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.minimize();
    log.debug("窗口已最小化");
  }
}

/**
 * 最大化/还原窗口
 */
export function maximize(event: Electron.IpcMainInvokeEvent): void {
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
export function close(event: Electron.IpcMainInvokeEvent): void {
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
export function toggleShow(event: Electron.IpcMainInvokeEvent, id: number, show?: boolean): void {
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
export function isMaximized(event: Electron.IpcMainInvokeEvent): boolean {
  const window = BrowserWindow.getFocusedWindow();
  return window ? window.isMaximized() : false;
}

/**
 * 检查窗口是否显示
 * @param id 窗口ID
 * @returns 窗口是否显示
 */
export function isWindowVisible(event: Electron.IpcMainInvokeEvent, id: number): boolean {
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
export function setSize(event: Electron.IpcMainInvokeEvent, width: number, height: number): void {
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
 * 动态调整窗口高度
 * 使用前端传递的高度直接设置窗口大小
 * @param height 前端计算的目标高度
 */
export async function adjustHeight(event: Electron.IpcMainInvokeEvent, height: number): Promise<void> {
  try {
    // 导入 NewWindowManager（动态导入避免循环依赖）
    const { NewWindowManager } = await import('../../window/NewWindowManager');
    const windowManager = NewWindowManager.getInstance();

    // 使用新的动态高度调整方法，直接传递前端计算的高度
    await windowManager.adjustWindowHeight(height);

    log.debug(`动态调整窗口高度: ${height}px`);
  } catch (error) {
    log.error('动态调整窗口高度失败:', error);

    // 回退到传统的设置方法
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      const bounds = window.getBounds();
      window.setBounds({
        ...bounds,
        height: height
      });
    }
  }
}

/**
 * 设置窗口是否可调整大小
 * @param resizable 是否可调整大小
 */
export function setResizable(event: Electron.IpcMainInvokeEvent, resizable: boolean, windowId: number): void {
  const window = BrowserWindow.fromId(windowId);
  if (window) {
    window.setResizable(resizable);
    log.debug(`窗口可调整大小状态已设置为: ${resizable}`);
  }
}

/**
 * 打开日志查看器窗口
 */
export function openLogViewer(event: Electron.IpcMainInvokeEvent): void {
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
      nodeIntegration: true,
      contextIsolation: true,
      preload: resolve(app.getAppPath(), 'dist/main/preloads/basic.js'), // 注入basic.js preload
      webSecurity: true,
    },
  });

  // 加载日志查看器HTML文件
  const logViewerPath = resolve(app.getAppPath(), 'dist/renderer/log-viewer.html');
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
export function registerGlobalHotkey(event: Electron.IpcMainInvokeEvent, accelerator: string, id: string): boolean {
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
export function unregisterGlobalHotkey(event: Electron.IpcMainInvokeEvent, accelerator: string, id: string = "-1"): boolean {
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
export function unregisterAllGlobalHotkeys(event: Electron.IpcMainInvokeEvent): void {
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
export function isGlobalHotkeyRegistered(event: Electron.IpcMainInvokeEvent, accelerator: string): boolean {
  return globalShortcut.isRegistered(accelerator);
}

/**
 * 获取所有已注册的全局快捷键
 */
export function getAllRegisteredGlobalHotkeys(event: Electron.IpcMainInvokeEvent): Array<{
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
export function getUIConstants(event: Electron.IpcMainInvokeEvent): {
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

  // 使用配置文件中的默认值
  try {
    const { DEFAULT_WINDOW_LAYOUT } = require('../../shared/config/window-layout.config');
    return {
      headerHeight: DEFAULT_WINDOW_LAYOUT.searchHeaderHeight,
      maxHeight: DEFAULT_WINDOW_LAYOUT.contentMaxHeight,
      padding: DEFAULT_WINDOW_LAYOUT.appPadding
    };
  } catch (error) {
    log.warn("加载窗口布局配置失败，使用硬编码默认值:", error);
    // 最后的备用默认值
    return { headerHeight: 50, maxHeight: 420, padding: 8 };
  }
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
  event: Electron.IpcMainInvokeEvent,
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
  let { headerHeight, maxHeight, padding } = getUIConstants(event);
  padding += addPadding;

  return {
    x: mainX + padding,
    y: mainY + headerHeight + padding,
    width: mainWidth - padding * 2,
    height: maxHeight - addPadding * 2
  };
}

/** 显示所有following类型的窗口 */
export function showAllFollowingWindows(event: Electron.IpcMainInvokeEvent): void {
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
export function hideAllFollowingWindows(event: Electron.IpcMainInvokeEvent): void {
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
export function closeAllFollowingWindows(event: Electron.IpcMainInvokeEvent): void {
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
export function manageFollowingWindows(event: Electron.IpcMainInvokeEvent, action: 'hide' | 'close'): void {
  if (action === 'hide') {
    hideAllFollowingWindows(event);
  } else if (action === 'close') {
    closeAllFollowingWindows(event);
  } else {
    log.warn(`未知的操作类型: ${action}，默认执行隐藏操作`);
    hideAllFollowingWindows(event);
  }
}

/**
 * 根据插件信息显示特定的following窗口
 * @param pluginItem 插件项目信息，包含pluginId和名称
 */
export function showSpecificFollowingWindow(event: Electron.IpcMainInvokeEvent, pathId: string): void {
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
 * 创建网页显示窗口 (重构版本 - 使用 WebContentsView)
 * @param windowId 主窗口ID
 * @param url 要显示的网页URL
 * @param metadata 元数据，包含title、preload等额外信息
 * @deprecated 此函数正在被新的 showNewView 函数替代
 */
export async function createWebPageWindow(
  event: Electron.IpcMainInvokeEvent,
  windowId: number,
  url: string,
  metadata?: Record<string, any>
): Promise<void> {
  log.info('⚠️ createWebPageWindow 被调用，转发到新的视图管理系统')

  try {
    // 确保 NewWindowManager 已初始化
    if (!newWindowManager) {
      const initResult = await initializeNewWindowManager(event)
      if (!initResult.success) {
        log.error('NewWindowManager 初始化失败，回退到旧版本窗口创建')
        return createLegacyWebPageWindow(event, windowId, url, metadata)
      }
    }

    // 构建插件项目信息
    const pluginItem: PluginItem | undefined = metadata ? {
      path: metadata.path || url,
      name: metadata.name || metadata.title || 'Web Page',
      icon: metadata.icon || null,
      pluginId: metadata.pluginId || metadata.path,
      executeType: PluginExecuteType.SHOW_WEBPAGE,
      executeParams: { url },
      closeAction: 'close' // 默认关闭行为
    } : undefined

    // 使用新的视图系统显示插件
    const result = await showNewView(event, {
      type: ViewType.PLUGIN,
      url,
      path: metadata?.path,
      pluginItem,
      forceNew: false,
      lifecycleType: metadata?.closeAction === 'hide' ? LifecycleType.BACKGROUND : LifecycleType.FOREGROUND
    })

    if (result.success) {
      log.info(`插件视图创建成功: ${result.viewId}`)

      // 通知主渲染进程插件窗口已打开
      const mainWindow = windowManager.getMainInfo()?.window
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("plugin-window-opened", {
          viewId: result.viewId,
          title: metadata?.title || 'Web Page',
          path: metadata?.path,
          url
        })
        log.info(`已通知主渲染进程插件视图打开: ${result.viewId}`)
      }
    } else {
      log.error(`插件视图创建失败: ${result.error}，回退到旧版本窗口创建`)
      return createLegacyWebPageWindow(event, windowId, url, metadata)
    }
  } catch (error) {
    log.error('使用新视图系统创建插件失败:', error)
    log.info('回退到旧版本窗口创建方式')
    return createLegacyWebPageWindow(event, windowId, url, metadata)
  }
}

/**
 * 旧版本的网页窗口创建逻辑（作为备用方案）
 * @param windowId 主窗口ID
 * @param url 要显示的网页URL
 * @param metadata 元数据
 */
async function createLegacyWebPageWindow(
  event: Electron.IpcMainInvokeEvent,
  windowId: number,
  url: string,
  metadata?: Record<string, any>
): Promise<void> {
  log.info('使用旧版本窗口创建逻辑')

  // 获取主窗口位置和大小
  const mainWindow = BrowserWindow.fromId(windowId);
  if (!mainWindow) {
    log.error("无法获取主窗口，无法创建网页窗口");
    return;
  }

  // 禁止重复创建窗口
  const followingWindows = windowManager.getWindowInfoByType(WindowType.FOLLOWING)
  const existingWindow = followingWindows.find(window => window.metadata?.path === metadata?.path)
  if (existingWindow) {
    mainWindow.focus();
    return;
  }

  // 只保留一个窗口
  if (followingWindows.length > 0) {
    followingWindows.forEach(window => {
      windowManager.windows.delete(window.id)
      window.window.close()
    });
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // 注册窗口到管理器
  // 检查是否已经有相同URL的网页窗口打开
  const title = metadata?.title || 'Web Page';

  const [mainX, mainY] = mainWindow.getPosition();
  const [mainWidth, mainHeight] = mainWindow.getSize();

  // 计算网页窗口的位置和大小
  // 使用抽象函数计算最终边界
  const bounds = calculateFollowingWindowBounds(event, mainX, mainY, mainWidth, mainHeight, 2);

  // 默认使用内置 preload 脚本，如果有用户自定义的 preload，则创建组合脚本
  let preloadScript: string | undefined = resolve(app.getAppPath(), 'dist/main/preloads/webpage-preload.js');
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
    const mainWindow = windowManager.getMainInfo()?.window;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("plugin-window-closed", {
        windowId: webWindow.id,
        title: title,
        path: metadata?.path
      });
      log.info(`已通知主渲染进程插件窗口关闭: ${title}`);
    }
  });

  // 注册ESC键关闭功能和Alt+D快捷键
  webWindow.webContents.on("before-input-event", (event, input) => {
    // 在调试模式下记录所有键盘事件
    if (process.env.NODE_ENV === "development") {
      log.debug(`键盘事件: key=${input.key}, code=${input.code}, type=${input.type}, alt=${input.alt}, ctrl=${input.control}, shift=${input.shift}, meta=${input.meta}`);
    }

    if (input.key === "Escape" && input.type === "keyDown") {
      webWindow.close();
      return;
    }

    // Alt + D 快捷键检测 (多种方式确保兼容性)
    const isAltPressed = input.alt || input.modifiers?.includes?.('alt');
    const isDKey = input.key === "D" || input.key === "d" || input.code === "KeyD";
    const isKeyDown = input.type === "keyDown";

    if (isDKey && isKeyDown && isAltPressed) {
      log.info("触发 Alt+D 快捷键，发送 window-detach 事件");
      webWindow.webContents.send("window-detach", {
        windowId: webWindow.id,
        timestamp: Date.now()
      });
      event.preventDefault(); // 阻止默认行为
      return;
    }
  });

  // 开发环境下打开开发者工具
  if (process.env.NODE_ENV === "development") {
    webWindow.webContents.openDevTools({ mode: "bottom" });
  }
}

// ===== 新窗口管理 API =====
// 以下是基于 NewWindowManager 的新窗口管理 API

import { NewWindowManager } from '../../window/NewWindowManager'
import { ViewManager } from '../../window/ViewManager'
import { ViewType, LifecycleType } from '../../../renderer/src/typings/window-types'
import type { PluginItem } from '../../../renderer/src/typings/plugin-types'
import { PluginExecuteType } from '../../../renderer/src/typings/plugin-types'
import { BaseWindow } from 'electron'

// 创建 NewWindowManager 实例（在需要时初始化）
let newWindowManager: NewWindowManager | null = null

/**
 * 初始化新窗口管理器
 */
export async function initializeNewWindowManager(event: Electron.IpcMainInvokeEvent): Promise<{ success: boolean; error?: string }> {
  try {
    if (newWindowManager) {
      return { success: true }
    }

    // 创建默认配置
    const defaultConfig = {
      layout: {
        headerHeight: 60,
        contentBounds: { x: 0, y: 60, width: 800, height: 540 },
        totalBounds: { x: 0, y: 0, width: 800, height: 600 },
        padding: 0
      },
      defaultLifecycle: {
        type: LifecycleType.FOREGROUND,
        persistOnClose: false,
        maxIdleTime: 5 * 60 * 1000,
        memoryThreshold: 100
      },
      maxActiveViews: 5,
      memoryRecycleThreshold: 500,
      autoRecycleInterval: 30 * 1000
    }

    newWindowManager = NewWindowManager.getInstance(defaultConfig)
    await newWindowManager.initialize()

    log.info('NewWindowManager 初始化成功')
    return { success: true }
  } catch (error) {
    log.error('NewWindowManager 初始化失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 创建主窗口（新架构）
 */
export async function createNewMainWindow(event: Electron.IpcMainInvokeEvent): Promise<{ success: boolean; windowId?: number; error?: string }> {
  try {
    if (!newWindowManager) {
      const initResult = await initializeNewWindowManager(event)
      if (!initResult.success) {
        return initResult
      }
    }

    const config = configManager.getConfig()
    const result = await newWindowManager!.createMainWindow(config)

    if (result.success && result.windowId) {
      log.info(`新主窗口创建成功，ID: ${result.windowId}`)
      return { success: true, windowId: result.windowId }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    log.error('创建新主窗口失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 显示视图（新架构）
 */
export async function showNewView(event: Electron.IpcMainInvokeEvent, params: {
  type: ViewType
  path?: string
  url?: string
  pluginItem?: PluginItem
  forceNew?: boolean
  lifecycleType?: LifecycleType
}): Promise<{ success: boolean; viewId?: string; error?: string }> {
  try {
    if (!newWindowManager) {
      const initResult = await initializeNewWindowManager(event)
      if (!initResult.success) {
        return initResult
      }
    }

    const viewParams = {
      type: params.type,
      config: {
        path: params.path,
        url: params.url
      },
      pluginItem: params.pluginItem,
      forceNew: params.forceNew || false,
      lifecycleStrategy: params.lifecycleType ? {
        type: params.lifecycleType,
        persistOnClose: params.lifecycleType === LifecycleType.BACKGROUND,
        maxIdleTime: 5 * 60 * 1000,
        memoryThreshold: 100
      } : undefined
    }

    const result = await newWindowManager!.showView(viewParams)

    if (result.success && result.viewId) {
      log.info(`视图显示成功，ID: ${result.viewId}`)
      return { success: true, viewId: result.viewId }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    log.error('显示视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 隐藏视图（新架构）
 */
export async function hideNewView(event: Electron.IpcMainInvokeEvent, viewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const result = await newWindowManager.hideView(viewId)

    if (result.success) {
      log.info(`视图隐藏成功，ID: ${viewId}`)
      return { success: true }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    log.error('隐藏视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 移除视图（新架构）
 */
export async function removeNewView(event: Electron.IpcMainInvokeEvent, viewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const result = await newWindowManager.removeView(viewId)

    if (result.success) {
      log.info(`视图移除成功，ID: ${viewId}`)
      return { success: true }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    log.error('移除视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 切换到视图（新架构）
 */
export async function switchToNewView(event: Electron.IpcMainInvokeEvent, viewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const result = await newWindowManager.switchToView(viewId)

    if (result.success) {
      log.info(`切换到视图成功，ID: ${viewId}`)
      return { success: true }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    log.error('切换视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 分离视图（新架构）
 */
export async function detachNewView(event: Electron.IpcMainInvokeEvent, viewId: string, config?: {
  title?: string
  width?: number
  height?: number
  showControlBar?: boolean
}): Promise<{ success: boolean; detachedWindowId?: number; error?: string }> {
  try {
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const detachConfig = config ? {
      title: config.title,
      bounds: config.width && config.height ? {
        x: 0, y: 0, width: config.width, height: config.height
      } : undefined,
      showControlBar: config.showControlBar !== false,
      sourceViewId: viewId
    } : undefined

    const result = await newWindowManager.detachView(viewId, detachConfig)

    if (result.success && result.data?.detachedWindowId) {
      log.info(`视图分离成功，ID: ${viewId}, 窗口ID: ${result.data.detachedWindowId}`)
      return { success: true, detachedWindowId: result.data.detachedWindowId }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    log.error('分离视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 重新附加视图（新架构）
 */
export async function reattachNewView(event: Electron.IpcMainInvokeEvent, detachedWindowId: number): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const result = await newWindowManager.reattachView(detachedWindowId)

    if (result.success) {
      log.info(`视图重新附加成功，窗口ID: ${detachedWindowId}`)
      return { success: true }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    log.error('重新附加视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 获取活跃视图信息（新架构）
 */
export function getActiveNewView(event: Electron.IpcMainInvokeEvent): { success: boolean; viewInfo?: any; error?: string } {
  try {
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const viewInfo = newWindowManager.getActiveView()

    return {
      success: true,
      viewInfo: viewInfo ? {
        id: viewInfo.id,
        type: viewInfo.config.type,
        isVisible: viewInfo.state.isVisible,
        isActive: viewInfo.state.isActive,
        createdAt: viewInfo.createdAt,
        config: viewInfo.config
      } : null
    }
  } catch (error) {
    log.error('获取活跃视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 获取所有视图信息（新架构）
 */
export function getAllNewViews(event: Electron.IpcMainInvokeEvent): { success: boolean; views?: any[]; error?: string } {
  try {
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const views = newWindowManager.getAllViews()

    return {
      success: true,
      views: views.map(viewInfo => ({
        id: viewInfo.id,
        type: viewInfo.config.type,
        isVisible: viewInfo.state.isVisible,
        isActive: viewInfo.state.isActive,
        createdAt: viewInfo.createdAt,
        config: viewInfo.config
      }))
    }
  } catch (error) {
    log.error('获取所有视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 获取窗口管理器性能指标（新架构）
 */
export function getNewWindowManagerMetrics(event: Electron.IpcMainInvokeEvent): { success: boolean; metrics?: any; error?: string } {
  try {
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const metrics = newWindowManager.getPerformanceMetrics()
    const statistics = newWindowManager.getStatistics()

    return {
      success: true,
      metrics: {
        performance: metrics,
        statistics
      }
    }
  } catch (error) {
    log.error('获取性能指标失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 清理后台视图（新架构）
 */
export async function cleanupNewBackgroundViews(event: Electron.IpcMainInvokeEvent): Promise<{ success: boolean; report?: any; error?: string }> {
  try {
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    await newWindowManager.cleanupBackgroundViews()

    log.info('后台视图清理完成')
    return { success: true }
  } catch (error) {
    log.error('清理后台视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 更新窗口管理器配置（新架构）
 */
export function updateNewWindowManagerConfig(event: Electron.IpcMainInvokeEvent, config: {
  memoryRecycleThreshold?: number
  autoRecycleInterval?: number
  maxActiveViews?: number
}): { success: boolean; error?: string } {
  try {
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    newWindowManager.updateConfig(config)

    log.info('窗口管理器配置更新成功')
    return { success: true }
  } catch (error) {
    log.error('更新配置失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 销毁窗口管理器（新架构）
 */
export function destroyNewWindowManager(event: Electron.IpcMainInvokeEvent): { success: boolean; error?: string } {
  try {
    if (newWindowManager) {
      newWindowManager.destroy()
      newWindowManager = null
      log.info('NewWindowManager 已销毁')
    }

    return { success: true }
  } catch (error) {
    log.error('销毁窗口管理器失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 创建插件视图（新架构专用）
 * 这是一个为插件系统优化的便利函数
 */
export async function createPluginView(event: Electron.IpcMainInvokeEvent, params: {
  path: string
  pluginId?: string
  name?: string
  title?: string
  url?: string
  closeAction?: 'hide' | 'close'
  executeParams?: any
  preload?: string
}): Promise<{ success: boolean; viewId?: string; error?: string }> {
  try {
    if (!newWindowManager) {
      const initResult = await initializeNewWindowManager(event)
      if (!initResult.success) {
        return { success: false, error: initResult.error }
      }
    }

    // 构建插件项目信息
    const pluginItem: PluginItem = {
      path: params.path,
      name: params.name || params.title || 'Plugin',
      icon: null, // 暂时设为null，后续可以根据需要设置
      pluginId: params.pluginId || params.path,
      executeType: params.url ? PluginExecuteType.SHOW_WEBPAGE : PluginExecuteType.CUSTOM_CODE,
      executeParams: params.executeParams || (params.url ? { url: params.url } : {}),
      closeAction: params.closeAction || 'close'
    }

    // 确定生命周期类型
    const lifecycleType = params.closeAction === 'hide'
      ? LifecycleType.BACKGROUND
      : LifecycleType.FOREGROUND

    const result = await showNewView(event, {
      type: ViewType.PLUGIN,
      url: params.url,
      path: params.path,
      pluginItem,
      forceNew: false,
      lifecycleType
    })

    if (result.success) {
      log.info(`插件视图创建成功: ${result.viewId} (${params.name || params.path})`)

      // 通知主渲染进程插件视图已打开
      const mainWindow = windowManager.getMainInfo()?.window
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("plugin-view-opened", {
          viewId: result.viewId,
          path: params.path,
          pluginId: params.pluginId,
          name: params.name,
          title: params.title,
          url: params.url
        })
        log.debug(`已通知主渲染进程插件视图打开: ${result.viewId}`)
      }

      return { success: true, viewId: result.viewId }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    log.error('创建插件视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 关闭插件视图（新架构专用）
 */
export async function closePluginView(event: Electron.IpcMainInvokeEvent, viewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const result = await newWindowManager.removeView(viewId)

    if (result.success) {
      log.info(`插件视图关闭成功: ${viewId}`)

      // 通知主渲染进程插件视图已关闭
      const mainWindow = windowManager.getMainInfo()?.window
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("plugin-view-closed", {
          viewId
        })
        log.debug(`已通知主渲染进程插件视图关闭: ${viewId}`)
      }

      return { success: true }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    log.error('关闭插件视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
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

(() => {
  // 用户自定义 preload 脚本
  ${customPreloadContent}
})()
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

/**
 * 创建设置页面 WebContentsView
 */
export async function createSettingsView(event: Electron.IpcMainInvokeEvent): Promise<{ success: boolean; viewId?: string; error?: string }> {
  try {
    if (!newWindowManager) {
      const initResult = await initializeNewWindowManager(event)
      if (!initResult.success) {
        return { success: false, error: initResult.error }
      }
    }

    log.info('通过 IPC 创建设置页面 WebContentsView')

    const result = await newWindowManager!.createSettingsView()

    if (result.success) {
      log.info(`设置页面创建成功: ${result.viewId}`)
      return {
        success: true,
        viewId: result.viewId
      }
    } else {
      log.error(`设置页面创建失败: ${result.error}`)
      return {
        success: false,
        error: result.error
      }
    }
  } catch (error) {
    log.error('创建设置页面时发生错误:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 关闭设置页面 WebContentsView
 */
export async function closeSettingsView(event: Electron.IpcMainInvokeEvent): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    log.info('通过 IPC 关闭设置页面 WebContentsView')

    const result = await newWindowManager.closeSettingsView()

    if (result.success) {
      log.info('设置页面关闭成功')
      return { success: true }
    } else {
      log.error(`设置页面关闭失败: ${result.error}`)
      return {
        success: false,
        error: result.error
      }
    }
  } catch (error) {
    log.error('关闭设置页面时发生错误:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 获取当前WebContentsView的完整信息
 * 通过webContents查找对应的WebContentsViewInfo，并返回序列化后的信息
 * @param event IPC事件对象
 * @returns 序列化后的视图信息，如果找不到则返回null
 */
export function getCurrentViewInfo(event: Electron.IpcMainInvokeEvent): {
  id: string;
  parentWindowId: number;
  config: any;
  state: {
    isVisible: boolean;
    isActive: boolean;
    lastAccessTime: number;
    memoryUsage?: number;
  };
  createdAt: string; // 序列化为ISO字符串
} | null {
  try {
    const webContents = event.sender;

    // 获取ViewManager实例并遍历所有视图
    const viewManager = ViewManager.getInstance();
    const allViews = viewManager.getAllViews();

    for (const viewInfo of allViews) {
      if (viewInfo.view.webContents === webContents) {
        // 找到匹配的WebContentsView，返回序列化后的信息
        log.debug(`找到当前WebContentsView: ${viewInfo.id}, 父窗口ID: ${viewInfo.parentWindowId}`);

        return {
          id: viewInfo.id,
          parentWindowId: viewInfo.parentWindowId,
          config: viewInfo.config,
          state: {
            isVisible: viewInfo.state.isVisible,
            isActive: viewInfo.state.isActive,
            lastAccessTime: viewInfo.state.lastAccessTime,
            memoryUsage: viewInfo.state.memoryUsage
          },
          createdAt: viewInfo.createdAt.toISOString()
        };
      }
    }

    log.warn('无法找到当前webContents对应的视图信息');
    return null;
  } catch (error) {
    log.error('获取当前视图信息时发生错误:', error);
    return null;
  }
}

/**
 * 获取当前窗口ID（兼容性函数）
 * @param event IPC事件对象
 * @returns 窗口ID，如果找不到则返回null
 */
export function getCurrentWindowId(event: Electron.IpcMainInvokeEvent): number | null {
  const viewInfo = getCurrentViewInfo(event);
  return viewInfo ? viewInfo.parentWindowId : null;
}

/**
 * 获取当前WebContentsView ID（兼容性函数）
 * @param event IPC事件对象
 * @returns 视图ID，如果找不到则返回null
 */
export function getCurrentViewId(event: Electron.IpcMainInvokeEvent): string | null {
  const viewInfo = getCurrentViewInfo(event);
  return viewInfo ? viewInfo.id : null;
}