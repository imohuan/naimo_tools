import log from "electron-log/renderer";
import { contextBridge, ipcRenderer, webUtils as electronWebUtils } from "electron";
import { RendererErrorHandler } from "@libs/unhandled/renderer";
import { ipcRouter } from "@shared/ipc-router-client";
import { isDevelopment } from "@shared/utils";
import { resolve, dirname } from "path";

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
  async loadPluginConfig(configPath: string) {
    try {
      const absoluteConfigPath = resolve(configPath);
      const directory = await ipcRouter.filesystemGetPluginsDirectory()
      if (!absoluteConfigPath.startsWith(directory)) {
        return null
      }
      const module = dynamicRequire(absoluteConfigPath);
      const __dirname = dirname(absoluteConfigPath);
      if ("id" in module && "items" in module) {
        return {
          ...module,
          getResourcePath: (...paths: string[]) => {
            return resolve(__dirname, ...paths);
          }
        };
      }
      return null;
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
    windowMove: (id: number, x: number, y: number, width: number, height: number) => {
      ipcRenderer.send("window-move", id, x, y, width, height);
    },
  },
  router: ipcRouter,
  webUtils: webUtils,
}

const naimo = electronAPI

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
contextBridge.exposeInMainWorld("naimo", naimo);

const triggerEventKeys = [
  'global-hotkey-trigger',  // 全局快捷键事件 
  'window-all-blur',        // 窗口全部模糊事件 
  'window-main-hide',       // 主窗口隐藏事件
  'window-main-show',       // 主窗口显示事件
  'plugin-window-closed',   // 插件窗口关闭事件
]

triggerEventKeys.forEach(key => {
  ipcRenderer.on(key, (event, data) => {
    console.log(`Preload收到${key}事件:`, data);
    const customEvent = new CustomEvent(key, { detail: data });
    window.dispatchEvent(customEvent);
  });
});

console.log("✅ Preload脚本执行完成，耗时:", Date.now() - preloadStartTime, "ms");
