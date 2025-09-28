/**
 * 类型声明统一导出入口
 * 提供所有类型定义的统一访问接口
 */

// 应用类型
export * from './appTypes'

// 常量类型
export * from './constantTypes'

// 窗口类型 - TODO: 移动到主进程中
// export * from './windowTypes'

// 事件路由类型
export * from './eventRoutes'

// IPC路由类型
export * from './ipcRoutes'

// 全局类型
export * from './globalTypes'

// Electron Store类型
export * from './electronStore'
