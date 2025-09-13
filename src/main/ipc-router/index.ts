/**
 * IPC 路由系统入口文件
 * 自动注册所有模块的路由
 */

import { getIpcRouter } from './core';
import { RouteInfoQuery } from './utils';
import log from 'electron-log';

/**
 * 初始化 IPC 路由系统
 */
export function initializeIpcRouter(): void {
  log.info('🚀 初始化 IPC 路由系统...');

  const router = getIpcRouter();

  // 使用 import.meta.glob 自动获取所有模块
  const modules = import.meta.glob('./modules/*.ts', { eager: true });

  log.info('📦 注册模块路由...');

  // 遍历所有模块并注册函数
  for (const [modulePath, moduleExports] of Object.entries(modules)) {
    // 从路径中提取模块名
    const moduleName = modulePath.replace('./modules/', '').replace('.ts', '');

    log.info(`📁 处理模块: ${moduleName}`);

    // 遍历模块的所有导出
    for (const [exportName, exportValue] of Object.entries(moduleExports as any)) {
      // 只处理函数类型的导出
      if (typeof exportValue === 'function') {
        router.register(moduleName, exportName, exportValue);
        log.debug(`  ✅ 注册路由: ${router.getKey(moduleName, exportName)}`);
      }
    }
  }

  // 获取注册统计信息
  const stats = RouteInfoQuery.getRouteStats();

  log.info(`✅ IPC 路由系统初始化完成`);
  log.info(`📊 总路由数: ${stats.totalRoutes}`);
  log.info(`📦 模块数: ${stats.modules.size}`);

  // 打印所有注册的路由
  for (const [moduleName, routeCount] of stats.modules) {
    log.info(`  - ${moduleName}: ${routeCount} 个路由`);
  }

  // 生成路由文档（可选）
  // if (process.env.NODE_ENV === 'development') {
  //   const documentation = RouteInfoQuery.generateRouteDocumentation();
  //   log.debug('📚 路由文档:\n', documentation);
  // }
}


/**
 * 获取路由系统信息
 */
export function getRouterInfo() {
  const stats = RouteInfoQuery.getRouteStats();
  const router = getIpcRouter();
  const routes = router.getRoutes();

  return {
    totalRoutes: stats.totalRoutes,
    modules: Object.fromEntries(stats.modules),
    routes: Array.from(routes.entries()).map(([key, info]) => ({
      route: key,
      module: info.moduleName,
      function: info.functionName,
      comment: info.comment,
      registeredAt: info.registeredAt
    }))
  };
}

/**
 * 清理路由系统
 */
export function cleanupIpcRouter(): void {
  log.info('🧹 清理 IPC 路由系统...');
  const router = getIpcRouter();
  router.clear();
  log.info('✅ IPC 路由系统已清理');
}

// 导出核心功能
export { getIpcRouter } from './core';
