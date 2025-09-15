import { BrowserWindow, BrowserWindowConstructorOptions, shell } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync } from 'fs';
import log from 'electron-log';
import { AppConfig } from '@shared/types';
import { isProduction } from '@shared/utils';
import { WindowManager, WindowType } from './window-manager';

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
  private static windowManager = WindowManager.getInstance();

  /**
   * 获取窗口管理器实例
   */
  static getWindowManager(): WindowManager {
    return this.windowManager;
  }

  /**
   * 跟随窗口 列表（兼容性属性）
   */
  static get followingWindows(): Set<BrowserWindow> {
    return this.windowManager.followingWindows;
  }

  /**
   * 分离窗口 列表（兼容性属性）
   */
  static get separatedWindows(): Set<BrowserWindow> {
    return this.windowManager.separatedWindows;
  }

  /**
   * 后台窗口 列表（兼容性属性）
   */
  static get backgroundWindows(): Set<BrowserWindow> {
    return this.windowManager.backgroundWindows;
  }

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
      frame: false, // 无边框窗口，支持自定义拖拽区域
      resizable: true, // 允许程序动态调整大小
      minimizable: true,
      maximizable: false, // 禁用最大化，保持搜索框界面
      transparent: true,
      skipTaskbar: true, // 不在任务栏显示
      hasShadow: false, // 移除窗口阴影
      icon: isProduction() ? join(__dirname, '../../setup/exe.ico') : undefined
    };
  }

  /**
   * 设置窗口事件监听器
   */
  static setupWindowEvents(window: BrowserWindow, options: {
    devToolOptions?: Electron.OpenDevToolsOptions,
    onResize?: (width: number, height: number) => void
  } = {}): void {
    // 窗口准备好后显示
    window.once('ready-to-show', () => {
      window.show();
      log.info('主窗口已显示');
    });

    // 监听窗口大小变化
    if (options.onResize) {
      window.on('resize', () => {
        const [width, height] = window.getSize();
        options.onResize!(width, height);
      });
    }

    // 限制窗口最大尺寸，防止用户手动调整过大
    window.on('will-resize', (event, newBounds) => {
      const maxWidth = 800;
      const maxHeight = 600;

      if (newBounds.width > maxWidth || newBounds.height > maxHeight) {
        event.preventDefault();
        // 如果超出限制，恢复到合理尺寸
        window.setBounds({
          x: newBounds.x,
          y: newBounds.y,
          width: Math.min(newBounds.width, maxWidth),
          height: Math.min(newBounds.height, maxHeight)
        });
      }
    });

    // 开发环境下打开开发者工具
    if (!isProduction()) {
      window.webContents.openDevTools(options.devToolOptions);
    }

    // 处理外部链接
    window.webContents.setWindowOpenHandler(({ url }) => {
      // 在默认浏览器中打开外部链接
      shell.openExternal(url);
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
