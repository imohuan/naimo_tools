import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync } from 'fs';
import log from 'electron-log';
import { AppConfig } from '../../shared/types';
import { isProduction } from '../../shared/utils';

// 从 package.json 读取渲染进程URL配置
function getRendererUrl(): string {
  try {
    const packageJsonPath = join(getProjectRoot(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const devConfig = packageJson.config?.dev || {};
    const port = devConfig.rendererPort || 5173;
    const host = devConfig.rendererHost || 'localhost';
    return `http://${host}:${port}`;
  } catch (error) {
    console.warn('无法读取 package.json 配置，使用默认URL:', error);
    return 'http://localhost:5173';
  }
}

// 获取项目根目录
function getProjectRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // 从 src/main/config/ 回到项目根目录
  return join(__dirname, '../..');
}


/**
 * 窗口配置管理类
 */
export class WindowConfigManager {

  /**
   * 创建主窗口配置
   */
  static createMainWindowOptions(config: AppConfig): BrowserWindowConstructorOptions {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    return {
      width: config.windowSize.width,
      height: config.windowSize.height,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preloads', 'basic.js')
      },
      show: false,
      titleBarStyle: 'default',
      icon: isProduction() ? join(__dirname, '../../setup/exe.ico') : undefined
    };
  }

  /**
   * 设置窗口事件监听器
   */
  static setupWindowEvents(window: BrowserWindow, onResize?: (width: number, height: number) => void): void {
    // 窗口准备好后显示
    window.once('ready-to-show', () => {
      window.show();
      log.info('主窗口已显示');
    });

    // 监听窗口大小变化
    if (onResize) {
      window.on('resize', () => {
        const [width, height] = window.getSize();
        onResize(width, height);
      });
    }

    // 开发环境下打开开发者工具
    if (!isProduction()) {
      window.webContents.openDevTools();
    }

    // 处理外部链接
    window.webContents.setWindowOpenHandler(({ url }) => {
      // 在默认浏览器中打开外部链接
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  /**
   * 加载页面内容
   */
  static loadContent(window: BrowserWindow): void {
    if (isProduction()) {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      // 从 dist/main/config/ 指向 dist/renderer/index.html
      window.loadFile(join(__dirname, '../renderer/index.html'));
    } else {
      window.loadURL(getRendererUrl());
    }
  }
}
