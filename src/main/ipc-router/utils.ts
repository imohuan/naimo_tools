/**
 * IPC 路由工具函数
 * 提供类型转换和路由管理功能
 */

import { getIpcRouter } from './core';

/**
 * 工具类型：将字符串的首字母大写
 */
export type CapitalizeFirstLetter<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S;

/**
 * 工具类型：将短横线分隔的字符串转换为驼峰式
 */
export type KebabToCamelCase<S extends string> = S extends `${infer First}-${infer Rest}`
  ? `${First}${KebabToCamelCase<CapitalizeFirstLetter<Rest>>}`
  : S;

/**
 * 工具类型：将对象的所有键从短横线格式转换为驼峰式
 */
export type KebabKeysToCamelCase<T> = {
  [K in keyof T as K extends string ? KebabToCamelCase<K> : never]: T[K];
};

/**
 * 路由键转换工具
 */
export class RouteKeyConverter {
  /**
   * 将短横线格式转换为驼峰式
   */
  static toCamelCase(kebabCase: string): string {
    return kebabCase.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  /**
   * 将驼峰式转换为短横线格式
   */
  static toKebabCase(camelCase: string): string {
    return camelCase.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  /**
   * 检查是否为有效的路由键格式
   */
  static isValidRouteKey(key: string): boolean {
    return /^[a-z]+(-[a-z]+)*$/.test(key);
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
