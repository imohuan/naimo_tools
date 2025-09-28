/**
 * 主进程工具函数统一导出
 * 提供主进程特有工具函数的统一访问接口
 */

// 主进程特有的 Node.js 工具函数
export * from './nodeUtils'

// 重新导出常用函数
export {
  getDirname,
  debounce,
  createCombinedPreloadScript
} from './nodeUtils'
