/**
 * 窗口管理模块
 * 展示新的 IPC 路由系统使用方式
 */

import { BrowserWindow, screen, globalShortcut } from 'electron';
import { dirname, join } from 'path';
import log from 'electron-log';
import { fileURLToPath } from 'url';

/**
 * 最小化窗口
 */
export function minimize(): void {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.minimize();
    log.debug('窗口已最小化');
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
      log.debug('窗口已还原');
    } else {
      window.maximize();
      log.debug('窗口已最大化');
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
    log.debug('窗口已关闭');
  }
}

/**
 * 切换窗口显示状态
 * @param show 可选参数，指定是否显示窗口。不传则进行toggle
 */
export function toggleShow(id: number, show?: boolean): void {
  const window = BrowserWindow.fromId(id);
  if (!window) {
    log.warn('没有找到焦点窗口');
    return;
  }

  const isVisible = window.isVisible();
  const shouldShow = show !== undefined ? show : !isVisible;

  if (shouldShow && !isVisible) {
    // 显示窗口
    window.show();
    window.focus();
    log.debug('窗口已显示');
  } else if (!shouldShow && isVisible) {
    // 隐藏窗口
    window.hide();
    log.debug('窗口已隐藏');
  } else {
    log.debug(`窗口状态无需改变: ${isVisible ? '已显示' : '已隐藏'}`);
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
 * 移动窗口
 * @param deltaX X轴移动距离
 * @param deltaY Y轴移动距离
 */
export function move(deltaX: number, deltaY: number): void {
  const window = BrowserWindow.getFocusedWindow();
  if (window && !window.isMaximized()) {
    const [currentX, currentY] = window.getPosition();

    // 计算新位置
    const newX = currentX + deltaX;
    const newY = currentY + deltaY;

    // 获取屏幕边界，防止窗口移出屏幕
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const [windowWidth, windowHeight] = window.getSize();

    // 限制窗口位置在屏幕范围内
    const clampedX = Math.max(0, Math.min(newX, screenWidth - windowWidth));
    const clampedY = Math.max(0, Math.min(newY, screenHeight - windowHeight));

    // 使用 setPosition 的 animate 参数来减少频闪
    window.setPosition(clampedX, clampedY, false);

    // 减少日志输出频率，避免性能影响
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      log.debug(`窗口已移动: deltaX=${deltaX}, deltaY=${deltaY}`);
    }
  }
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

    // 临时启用窗口可调整大小，以便能够修改窗口尺寸
    const wasResizable = window.isResizable();
    // if (!wasResizable) window.setResizable(true);
    log.debug(`窗口大小已设置为: ${nowW}x${nowH}`);
    window.setSize(nowW, nowH);
    // 恢复原来的可调整大小状态
    // if (!wasResizable) window.setResizable(false);
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
    window => window.getTitle() === '日志查看器'
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
    title: '日志查看器',
    frame: false, // 无边框窗口
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preloads/basic.js'), // 注入basic.js preload
      webSecurity: true
    }
  });

  // 加载日志查看器HTML文件
  const logViewerPath = join(__dirname, '../renderer/log-viewer.html');
  logWindow.loadFile(logViewerPath);

  // 窗口准备好后显示
  logWindow.once('ready-to-show', () => {
    logWindow.show();
    log.info('日志查看器窗口已打开');
  });

  // 窗口关闭时的处理
  logWindow.on('closed', () => {
    log.info('日志查看器窗口已关闭');
  });

  // 开发环境下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    logWindow.webContents.openDevTools({ mode: 'bottom' });
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
      windows.forEach(window => {
        window.webContents.send('global-hotkey-trigger', { hotkeyId: id });
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
    const accelerators: string[] = [cacheAccelerator, accelerator].filter(Boolean) as string[];
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
    log.info('已注销所有全局快捷键');
  } catch (error) {
    log.error('注销所有全局快捷键异常', error);
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
export function getAllRegisteredGlobalHotkeys(): Array<{ id: string; accelerator: string }> {
  return Array.from(registeredGlobalShortcuts.entries()).map(([id, accelerator]) => ({
    id,
    accelerator
  }));
}
