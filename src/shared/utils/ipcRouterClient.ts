/**
 * IPC 路由客户端
 * 提供类型安全的 IPC 调用接口
 */

import { ipcRenderer } from 'electron';
import { ROUTE_INFO } from '../typings/ipcRoutes';
import type { AllIpcRouter, IpcRouteKey, IpcRouteParams, IpcRouteReturn } from '../typings/ipcRoutes';

/**
 * IPC 路由客户端类
 * 提供类型安全的 IPC 调用方法
 */
export class IpcRouterClient {
  private static instance: IpcRouterClient;

  private constructor() { }

  static getInstance(): IpcRouterClient {
    if (!IpcRouterClient.instance) {
      IpcRouterClient.instance = new IpcRouterClient();
    }
    return IpcRouterClient.instance;
  }

  /**
   * 调用 IPC 路由
   * @param route 路由键
   * @param args 参数
   * @returns Promise<返回值>
   */
  async invoke<T extends IpcRouteKey>(
    route: T,
    ...args: IpcRouteParams<T>
  ): Promise<IpcRouteReturn<T>> {
    return ipcRenderer.invoke(route, ...args);
  }

  /**
   * 获取所有可用的路由
   */
  getAvailableRoutes(): IpcRouteKey[] {
    // 这里可以从生成的类型中获取所有路由键
    // 或者通过 IPC 调用获取路由信息
    return ROUTE_INFO.map(route => route.route) as IpcRouteKey[];
  }
}

/**
 * 创建 IPC 路由代理对象
 * 支持两种命名方式：短横线分隔和驼峰式
 * 注意：返回普通对象而不是 Proxy，以避免 contextBridge 克隆问题
 */
export function createIpcRouter(): AllIpcRouter {
  const client = IpcRouterClient.getInstance();

  // 创建普通对象而不是 Proxy，以避免 contextBridge 克隆问题
  const router: any = {};

  // 为每个路由键创建方法
  const routeKeys = client.getAvailableRoutes();

  for (const routeKey of routeKeys) {
    // 短横线分隔的键
    router[routeKey] = (...args: any[]) => {
      return client.invoke(routeKey, ...args as any);
    };

    // 驼峰式键
    const camelKey = kebabToCamel(routeKey);
    if (camelKey !== routeKey) {
      router[camelKey] = (...args: any[]) => {
        return client.invoke(routeKey, ...args as any);
      };
    }
  }

  return router;
}

/**
 * 将驼峰式命名转换为短横线分隔
 */
function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * 将短横线分隔转换为驼峰式命名
 */
function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

// 导出默认的 IPC 路由实例
export const ipcRouter = createIpcRouter();

// 导出类型
export type { AllIpcRouter, IpcRouteKey, IpcRouteParams, IpcRouteReturn } from '../typings/ipcRoutes';