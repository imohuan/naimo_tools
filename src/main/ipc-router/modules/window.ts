/**
 * 窗口管理模块
 * 展示新的 IPC 路由系统使用方式
 */

import { BrowserWindow, app } from 'electron';
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
 * 检查窗口是否最大化
 * @returns 窗口是否最大化
 */
export function isMaximized(): boolean {
  const window = BrowserWindow.getFocusedWindow();
  return window ? window.isMaximized() : false;
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
    logWindow.webContents.openDevTools();
  }
}
