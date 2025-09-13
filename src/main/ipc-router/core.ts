/**
 * IPC 路由核心系统
 * 基于函数自动注册和类型安全的 IPC 通信
 */

import { ipcMain } from 'electron';
import log from 'electron-log';
import { RouteKeyConverter } from './utils';

/**
 * IPC 路由注册表
 */
export class IpcRouter {
  private static instance: IpcRouter;
  private handlers = new Map<string, Function>();
  private routes = new Map<string, RouteInfo>();

  private constructor() { }

  static getInstance(): IpcRouter {
    if (!IpcRouter.instance) {
      IpcRouter.instance = new IpcRouter();
    }
    return IpcRouter.instance;
  }


  getKey(moduleName: string, functionName: string): string {
    let key = `${moduleName}-${functionName}`
    key = RouteKeyConverter.toKebabCase(key);
    return key
  }

  /**
   * 注册路由函数
   * @param moduleName 模块名称 (如 'utils', 'app', 'window')
   * @param functionName 函数名称
   * @param handler 处理函数
   * @param comment 函数注释
   */
  register(
    moduleName: string,
    functionName: string,
    handler: Function,
    comment?: string
  ): void {
    const routeKey = this.getKey(moduleName, functionName);

    if (this.handlers.has(routeKey)) {
      log.warn(`IPC 路由 "${routeKey}" 已存在，将被覆盖`);
    }

    // 存储处理器
    this.handlers.set(routeKey, handler);

    // 存储路由信息
    this.routes.set(routeKey, {
      moduleName,
      functionName,
      comment: comment || '',
      registeredAt: new Date()
    });

    // 注册到 Electron IPC
    const wrappedHandler = async (event: any, ...args: any[]) => {
      const startTime = Date.now();

      try {
        log.debug(`IPC 调用开始: ${routeKey}`, args);
        const result = await handler(...args);
        const duration = Date.now() - startTime;
        log.debug(`IPC 调用完成: ${routeKey} (${duration}ms)`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        log.error(`IPC 调用失败: ${routeKey} (${duration}ms)`, error);
        throw error;
      }
    };

    ipcMain.handle(routeKey, wrappedHandler);
    log.info(`IPC 路由已注册: ${routeKey}${comment ? ` - ${comment}` : ''}`);
  }

  /**
   * 批量注册模块中的所有函数
   * @param moduleName 模块名称
   * @param moduleExports 模块导出对象
   */
  registerModule(moduleName: string, moduleExports: Record<string, Function>): void {
    for (const [functionName, handler] of Object.entries(moduleExports)) {
      if (typeof handler === 'function') {
        this.register(moduleName, functionName, handler);
      }
    }
  }

  /**
   * 获取所有已注册的路由
   */
  getRoutes(): Map<string, RouteInfo> {
    return new Map(this.routes);
  }

  /**
   * 获取指定模块的所有路由
   */
  getModuleRoutes(moduleName: string): Map<string, RouteInfo> {
    const moduleRoutes = new Map<string, RouteInfo>();
    for (const [key, info] of this.routes) {
      if (info.moduleName === moduleName) {
        moduleRoutes.set(key, info);
      }
    }
    return moduleRoutes;
  }

  /**
   * 移除路由
   */
  removeRoute(routeKey: string): void {
    if (this.handlers.has(routeKey)) {
      this.handlers.delete(routeKey);
      this.routes.delete(routeKey);
      ipcMain.removeHandler(routeKey);
      log.info(`IPC 路由已移除: ${routeKey}`);
    }
  }

  /**
   * 清除所有路由
   */
  clear(): void {
    for (const routeKey of this.handlers.keys()) {
      ipcMain.removeHandler(routeKey);
    }
    this.handlers.clear();
    this.routes.clear();
    log.info('所有 IPC 路由已清除');
  }
}

/**
 * 路由信息接口
 */
export interface RouteInfo {
  moduleName: string;
  functionName: string;
  comment: string;
  registeredAt: Date;
}

/**
 * 获取全局 IPC 路由实例
 */
export function getIpcRouter(): IpcRouter {
  return IpcRouter.getInstance();
}
