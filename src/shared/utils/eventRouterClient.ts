/**
 * 事件路由客户端
 * 提供类型安全的事件监听接口
 */

import { ipcRenderer } from 'electron';
import { EVENT_INFO } from '../typings/eventRoutes';
import type { AllEventRouter, EventKey, EventHandlerType } from '../typings/eventRoutes';

/**
 * 事件路由客户端类
 * 提供类型安全的事件监听方法
 */
export class EventRouterClient {
  private static instance: EventRouterClient;

  private constructor() { }

  static getInstance(): EventRouterClient {
    if (!EventRouterClient.instance) {
      EventRouterClient.instance = new EventRouterClient();
    }
    return EventRouterClient.instance;
  }

  /**
   * 监听事件
   * @param eventKey 事件键
   * @param handler 处理器
   */
  on<T extends EventKey>(
    eventKey: T,
    handler: EventHandlerType<T>
  ): void {
    try {
      // 如果是方法名格式（onXxx），转换为事件名格式
      const eventName = this.getEventNameFromKey(eventKey as string);
      ipcRenderer.on(eventName, handler as any);
    } catch (error) {
      console.error('ipcRenderer.on 不可用:', error);
    }
  }

  /**
   * 移除事件监听器
   * @param eventKey 事件键
   * @param handler 处理器
   */
  off<T extends EventKey>(
    eventKey: T,
    handler: EventHandlerType<T>
  ): void {
    try {
      const eventName = this.getEventNameFromKey(eventKey as string);
      ipcRenderer.off(eventName, handler as any);
    } catch (error) {
      console.error('ipcRenderer.off 不可用:', error);
    }
  }

  /**
   * 监听一次性事件
   * @param eventKey 事件键
   * @param handler 处理器
   */
  once<T extends EventKey>(
    eventKey: T,
    handler: EventHandlerType<T>
  ): void {
    try {
      const eventName = this.getEventNameFromKey(eventKey as string);
      ipcRenderer.once(eventName, handler as any);
    } catch (error) {
      console.error('ipcRenderer.once 不可用:', error);
    }
  }

  /**
   * 从事件键获取事件名
   * @param eventKey 事件键
   * @returns 事件名
   */
  private getEventNameFromKey(eventKey: string): string {
    // 查找事件信息
    const eventInfo = EVENT_INFO.find(info =>
      info.name === eventKey || info.method === eventKey
    );

    if (eventInfo) {
      return eventInfo.name;
    }

    // 如果找不到，假设它已经是事件名格式
    return eventKey;
  }

  /**
   * 获取所有可用的事件
   */
  getAvailableEvents(): string[] {
    return EVENT_INFO.map(event => event.name);
  }
}

/**
 * 创建事件路由代理对象
 * 支持两种命名方式：短横线分隔和驼峰式方法名
 */
export function createEventRouter(): AllEventRouter {
  const client = EventRouterClient.getInstance();

  // 创建普通对象而不是 Proxy，以避免 contextBridge 克隆问题
  const router: any = {};

  // 为每个事件创建方法
  for (const eventInfo of EVENT_INFO) {
    // 短横线分隔的事件名
    router[eventInfo.name] = (handler: any) => {
      return client.on(eventInfo.name as EventKey, handler);
    };

    // 驼峰式方法名
    router[eventInfo.method] = (handler: any) => {
      return client.on(eventInfo.name as EventKey, handler);
    };
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

// 导出默认的事件路由实例
export const eventRouter = createEventRouter();

// 导出类型
export type { AllEventRouter, EventKey, EventHandlerType } from '../typings/eventRoutes';
