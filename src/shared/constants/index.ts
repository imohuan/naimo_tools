/**
 * 常量统一导出入口
 * 提供所有常量的统一访问接口
 */

// 应用常量
export * from './appConstants'

// 窗口常量  
export * from './windowConstants'

// 类型定义
export * from '../typings/constantTypes'

// 重新导出常用的配置对象
export { DEFAULT_WINDOW_LAYOUT } from './windowConstants'
export {
  UI_CONSTANTS,
  THEME_TYPES,
  LOG_LEVELS,
  DEFAULT_VALUES
} from './appConstants'
