import log from "electron-log/renderer";
import { contextBridge, ipcRenderer, webUtils as electronWebUtils } from "electron";
import { RendererErrorHandler } from "@libs/unhandled/renderer";
import { ipcRouter } from "@shared/utils/ipcRouterClient";
import { isDevelopment } from "@shared/utils";
import { resolve, dirname } from "path";

import { autoPuppeteerRenderer } from "@libs/auto-puppeteer/renderer";
import { downloadManagerRenderer } from "@libs/download-manager/renderer";
import { eventRouter } from "@shared/utils/eventRouterClient";
import { existsSync, readFileSync } from "fs";

/**
 * 启用热重载
 * @param name 根据后台修改的文件名 来判断是否重启该页面
 */
function enableHotReload(name: string) {
  const ws = new WebSocket("ws://localhost:9109");
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log("message", message);
    if (
      message.type === "notification" &&
      message.data.type === "preload_build_completed"
    ) {
      console.log("message.data.name", message.data.name);
      if (message.data.name === name) {
        // console.log(`${message.data.name}.js 构建完成，准备重启 Electron`);
        window.location.reload();
        ws.close();
      }
    }
  };
}

// 开启热重载
if (isDevelopment()) enableHotReload("basic");

/**
 * 动态地 require 一个模块，绕过打包器的解析。
 *
 * @param {string} moduleId - 模块的绝对路径。
 * @returns {any} - 导入的模块。
 */
function dynamicRequire(moduleId: string): any {
  try {
    // 清除模块缓存，确保每次加载都是最新的
    if (require.cache[moduleId]) {
      delete require.cache[moduleId];
    }
    const requireFunc = new Function('id', 'return require(id);');
    return requireFunc(moduleId);
  } catch (error) {
    console.error(`无法动态加载模块: ${moduleId}`, error);
    return null;
  }
}

// 安装错误处理 - 确保在最早时机安装
RendererErrorHandler.getInstance().install();

// 在这里设置断点 - Preload脚本入口点
const preloadStartTime = Date.now();
console.log("Preload启动时间:", new Date(preloadStartTime).toLocaleTimeString());
// 主要的preload脚本 shared\typings\global.d.ts
const prefix = "[Renderer] ";

const webUtils = {
  async loadPluginDir(dirpath: string) {
    const configPath = resolve(dirpath, 'manifest.json');
    return await this.loadPluginConfig(configPath);
  },

  /**
   * 加载插件配置（懒加载架构）
   * 只支持 manifest.json 格式
   */
  async loadPluginConfig(configPath: string) {
    try {
      const absoluteConfigPath = resolve(configPath);
      // const directory = await ipcRouter.pluginGetPluginsDirectory()
      // if (!absoluteConfigPath.startsWith(directory)) {
      //   return null
      // }

      // 只支持 manifest.json
      if (!absoluteConfigPath.endsWith('manifest.json')) {
        log.warn(`插件配置文件必须是 manifest.json: ${configPath}`);
        return null;
      }

      if (!existsSync(absoluteConfigPath)) {
        log.warn(`插件配置文件不存在: ${configPath}`);
        return null;
      }

      const __dirname = dirname(absoluteConfigPath);
      const content = readFileSync(absoluteConfigPath, 'utf-8');
      const manifest = JSON.parse(content);
      const getResourcePath = (...paths: string[]) => {
        return paths.join("/").startsWith("http") ? paths.join("/") : resolve(__dirname, ...paths);
      }
      manifest.getResourcePath = getResourcePath
      // 处理插件资源路径（图标）
      if (manifest.icon) manifest.icon = getResourcePath(manifest.icon)
      manifest.feature?.forEach((item: any) => {
        if (item.icon) item.icon = getResourcePath(item.icon)
      })
      // 处理插件资源路径（main 和 preload）
      if (manifest.main) manifest.main = getResourcePath(manifest.main)
      if (manifest.preload) manifest.preload = getResourcePath(manifest.preload)

      return manifest;
    } catch (e) {
      log.error("加载插件配置失败", e);
      return null
    }
  },

  /**
   * 获取文件的实际路径
   * @param file 文件对象
   * @returns 文件的实际路径
   */
  getPathForFile: (file: File): string => {
    return electronWebUtils.getPathForFile(file);
  },
}

const electronAPI = {
  // 日志 API - 使用 electron-log 内置功能
  log: {
    error: (message: string, ...args: any[]) => log.error(prefix + message, ...args),
    warn: (message: string, ...args: any[]) => log.warn(prefix + message, ...args),
    info: (message: string, ...args: any[]) => log.info(prefix + message, ...args),
    debug: (message: string, ...args: any[]) => log.debug(prefix + message, ...args),
    throw_error: (error: any, options?: { title?: string }) => {
      RendererErrorHandler.getInstance().logError(error, options);
    },
  },
  sendTo: {
    windowMove: (x: number, y: number, width: number, height: number) => {
      ipcRenderer.send("window-move", x, y, width, height);
    },
    viewMove: (id: number, x: number, y: number, width: number, height: number) => {
      ipcRenderer.send("view-move", id, x, y, width, height);
    },
  },
  router: ipcRouter,

  auto: autoPuppeteerRenderer,
  download: downloadManagerRenderer,

  webUtils: webUtils,

  // 直接暴露事件监听方法，提供简洁的 API
  on: (channel: string, listener: (event: any, data: any) => void) => {
    return ipcRenderer.on(channel, listener);
  },
  off: (channel: string, listener: (event: any, data: any) => void) => {
    return ipcRenderer.off(channel, listener);
  },
  once: (channel: string, listener: (event: any, data: any) => void) => {
    return ipcRenderer.once(channel, listener);
  },

  // 类型安全的事件对象
  event: eventRouter,

  // 窗口相关API
  window: {
    /**
     * 获取当前WebContentsView的完整信息
     * @returns 当前视图的完整信息，如果无法获取则返回null
     */
    getCurrentViewInfo: async (): Promise<{
      id: string;
      parentWindowId: number;
      config: any;
      state: {
        isVisible: boolean;
        isActive: boolean;
        lastAccessTime: number;
        memoryUsage?: number;
      };
      createdAt: string;
    } | null> => {
      try {
        // 方法1: 从URL参数中获取 (适用于分离窗口)
        const urlParams = new URLSearchParams(window.location.search);
        const viewId = urlParams.get('viewId');
        const windowId = urlParams.get('windowId');

        if (viewId && windowId) {
          // 分离窗口情况，构建基本信息
          return {
            id: viewId,
            parentWindowId: parseInt(windowId),
            config: { type: 'detached' },
            state: {
              isVisible: true,
              isActive: true,
              lastAccessTime: Date.now()
            },
            createdAt: new Date().toISOString()
          };
        }

        // 方法2: 通过IPC获取完整信息
        return await ipcRouter.windowGetCurrentViewInfo();
      } catch (error) {
        log.error('获取当前视图信息失败:', error);
        return null;
      }
    },

    /**
     * 获取当前窗口ID（兼容性方法）
     * @returns 当前窗口的ID，如果无法获取则返回null
     */
    getCurrentWindowId: async (): Promise<number | null> => {
      try {
        const viewInfo = await electronAPI.window.getCurrentViewInfo();
        return viewInfo ? viewInfo.parentWindowId : null;
      } catch (error) {
        log.error('获取当前窗口ID失败:', error);
        return null;
      }
    },

    /**
     * 获取当前WebContentsView ID（兼容性方法）
     * @returns 当前视图的ID，如果无法获取则返回null
     */
    getCurrentViewId: async (): Promise<string | null> => {
      try {
        const viewInfo = await electronAPI.window.getCurrentViewInfo();
        return viewInfo ? viewInfo.id : null;
      } catch (error) {
        log.error('获取当前视图ID失败:', error);
        return null;
      }
    },

    /**
     * 获取当前窗口的基本信息（兼容性方法）
     * @returns 窗口信息对象
     */
    getCurrentWindowInfo: async (): Promise<{ windowId: number | null; viewId: string | null; isDetached: boolean }> => {
      try {
        const viewInfo = await electronAPI.window.getCurrentViewInfo();
        const urlParams = new URLSearchParams(window.location.search);
        const isDetached = urlParams.has('windowId') && urlParams.has('viewId');

        return {
          windowId: viewInfo ? viewInfo.parentWindowId : null,
          viewId: viewInfo ? viewInfo.id : null,
          isDetached
        };
      } catch (error) {
        log.error('获取窗口信息失败:', error);
        return {
          windowId: null,
          viewId: null,
          isDetached: false
        };
      }
    }
  },
}

const naimo = electronAPI

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
contextBridge.exposeInMainWorld("naimo", naimo);

// 不再需要事件转发代码，渲染进程可以直接使用 naimo.ipcRenderer.on() 监听事件

console.log("✅ Preload脚本执行完成，耗时:", Date.now() - preloadStartTime, "ms");


// ========== 全局快捷键处理 ==========
// 监听页面的键盘事件，实现页面优先的快捷键处理机制
window.addEventListener('DOMContentLoaded', () => {
  // 在捕获阶段监听 keydown 事件（在页面处理之前）
  document.addEventListener('keydown', async (event) => {
    // 仅处理 ESC 键
    if (event.key === 'Escape') {
      // 使用 requestAnimationFrame 延迟到下一帧，确保页面有机会处理事件
      requestAnimationFrame(async () => {
        // 检查事件是否被页面阻止
        if (!event.defaultPrevented) {
          // 页面没有阻止事件，执行主进程的默认行为
          try {
            await ipcRouter.windowHandleDefaultEscShortcut();
          } catch (error) {
            log.error('执行默认 ESC 快捷键失败:', error);
          }
        } else {
          log.debug('ESC 事件已被页面处理，跳过默认行为');
        }
      });
    }
  }, true); // 使用捕获阶段，确保能捕获到事件
});
