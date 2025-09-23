import log from "electron-log/renderer";
import { contextBridge, ipcRenderer, webUtils } from "electron";
import { RendererErrorHandler } from "@libs/unhandled/renderer";
import { ipcRouter } from "@shared/ipc-router-client";
import { isDevelopment } from "@shared/utils";
import { resolve } from "path";
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
if (isDevelopment()) {
  enableHotReload("basic");
}

// 安装错误处理 - 确保在最早时机安装
RendererErrorHandler.getInstance().install();

// 在这里设置断点 - Preload脚本入口点
const preloadStartTime = Date.now();
console.log("Preload启动时间:", new Date(preloadStartTime).toLocaleTimeString());
// 主要的preload脚本 shared\typings\global.d.ts
const prefix = "[Renderer] ";

contextBridge.exposeInMainWorld("electronAPI", {
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
  ipcRouter: ipcRouter,
});


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

// 暴露 webUtils 工具函数
contextBridge.exposeInMainWorld("webUtils", {
  async loadPluginConfig(configPath: string) {
    try {
      const absoluteConfigPath = resolve(configPath);
      const directory = await ipcRouter.filesystemGetPluginsDirectory()
      if (!absoluteConfigPath.startsWith(directory)) {
        return null
      }
      const module = dynamicRequire(absoluteConfigPath);
      if ("id" in module && "items" in module) {
        return module;
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
    return webUtils.getPathForFile(file);
  },
});

// 监听全局快捷键触发事件
ipcRenderer.on('global-hotkey-trigger', (event, data) => {
  console.log('Preload收到全局快捷键事件:', data);
  // 创建自定义事件并发送到渲染进程
  const customEvent = new CustomEvent('global-hotkey-trigger', { detail: data });
  // 发送到主窗口
  window.dispatchEvent(customEvent);
});

ipcRenderer.on('window-all-blur', () => {
  console.log('Preload收到所有窗口失去焦点事件');
  const customEvent = new CustomEvent('window-all-blur');
  window.dispatchEvent(customEvent);
});

ipcRenderer.on('plugin-window-closed', (event, data) => {
  console.log('Preload收到插件窗口关闭事件:', data);
  const customEvent = new CustomEvent('plugin-window-closed', { detail: data });
  window.dispatchEvent(customEvent);
});

console.log("✅ Preload脚本执行完成，耗时:", Date.now() - preloadStartTime, "ms");
