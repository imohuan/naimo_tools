/**
 * IPC 路由工具函数
 * 提供 IPC 路由特定的工具功能
 */

import { getIpcRouter } from './core';
import { StringConverter, StringValidator } from '../utils';

// 重新导出通用字符串类型，保持向后兼容
export type {
  CapitalizeFirstLetter,
  KebabToCamelCase,
  KebabKeysToCamelCase
} from '../utils/stringUtils';

/**
 * 路由键转换工具
 * 基于通用字符串转换工具，提供 IPC 路由特定的功能
 */
export class RouteKeyConverter {
  /**
   * 将短横线格式转换为驼峰式
   */
  static toCamelCase(kebabCase: string): string {
    return StringConverter.toCamelCase(kebabCase);
  }

  /**
   * 将驼峰式转换为短横线格式
   */
  static toKebabCase(camelCase: string): string {
    return StringConverter.toKebabCase(camelCase);
  }

  /**
   * 检查是否为有效的路由键格式
   */
  static isValidRouteKey(key: string): boolean {
    return StringValidator.isKebabCase(key) && key.includes('-');
  }

  /**
   * 从路由键提取模块名和函数名
   */
  static parseRouteKey(routeKey: string): { module: string; function: string } {
    const parts = routeKey.split('-');
    if (parts.length < 2) {
      throw new Error(`无效的路由键格式: ${routeKey}`);
    }

    const module = parts[0];
    const functionName = parts.slice(1).join('-');

    return { module, function: functionName };
  }
}

/**
 * 路由验证工具
 */
export class RouteValidator {
  /**
   * 验证路由键是否已注册
   */
  static isRouteRegistered(routeKey: string): boolean {
    const router = getIpcRouter();
    return router.getRoutes().has(routeKey);
  }

  /**
   * 获取所有已注册的路由键
   */
  static getRegisteredRoutes(): string[] {
    const router = getIpcRouter();
    return Array.from(router.getRoutes().keys());
  }

  /**
   * 获取指定模块的所有路由
   */
  static getModuleRoutes(moduleName: string): string[] {
    const router = getIpcRouter();
    const moduleRoutes = router.getModuleRoutes(moduleName);
    return Array.from(moduleRoutes.keys());
  }

  /**
   * 验证模块是否存在
   */
  static isModuleRegistered(moduleName: string): boolean {
    const router = getIpcRouter();
    const moduleRoutes = router.getModuleRoutes(moduleName);
    return moduleRoutes.size > 0;
  }
}

/**
 * 路由信息查询工具
 */
export class RouteInfoQuery {
  /**
   * 获取路由的详细信息
   */
  static getRouteInfo(routeKey: string) {
    const router = getIpcRouter();
    return router.getRoutes().get(routeKey);
  }

  /**
   * 获取所有路由的统计信息
   */
  static getRouteStats() {
    const router = getIpcRouter();
    const routes = router.getRoutes();

    const stats = {
      totalRoutes: routes.size,
      modules: new Map<string, number>(),
      routesByModule: new Map<string, string[]>()
    };

    for (const [routeKey, info] of routes) {
      const moduleName = info.moduleName;

      // 统计模块数量
      stats.modules.set(moduleName, (stats.modules.get(moduleName) || 0) + 1);

      // 按模块分组路由
      if (!stats.routesByModule.has(moduleName)) {
        stats.routesByModule.set(moduleName, []);
      }
      stats.routesByModule.get(moduleName)!.push(routeKey);
    }

    return stats;
  }

  /**
   * 生成路由文档
   */
  static generateRouteDocumentation(): string {
    const router = getIpcRouter();
    const routes = router.getRoutes();
    const stats = this.getRouteStats();

    let doc = `# IPC 路由文档\n\n`;
    doc += `生成时间: ${new Date().toISOString()}\n`;
    doc += `总路由数: ${stats.totalRoutes}\n`;
    doc += `模块数: ${stats.modules.size}\n\n`;

    // 按模块分组显示路由
    for (const [moduleName, routeKeys] of stats.routesByModule) {
      doc += `## ${moduleName} 模块\n\n`;
      doc += `路由数量: ${routeKeys.length}\n\n`;

      for (const routeKey of routeKeys) {
        const info = routes.get(routeKey);
        if (info) {
          doc += `### ${routeKey}\n`;
          doc += `- 函数名: ${info.functionName}\n`;
          doc += `- 注释: ${info.comment || '无'}\n`;
          doc += `- 注册时间: ${info.registeredAt.toISOString()}\n\n`;
        }
      }
    }

    return doc;
  }
}
