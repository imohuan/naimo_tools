/**
 * 共享工具函数统一导出
 * 提供所有工具函数的统一访问接口
 */

// 通用工具函数
export * from './common/dateUtils'
export * from './common/envUtils'
export * from './common/typeUtils'
export * from './common/validationUtils'

// 重新导出常用函数
export {
  formatDate,
  getCurrentTimestamp,
  getTimeDiff
} from './common/dateUtils'

export {
  isProduction,
  isDevelopment,
  getAppName
} from './common/envUtils'

export {
  isFunction,
  isObject,
  isArray,
  isString,
  isNumber,
  isBoolean,
  deepClone
} from './common/typeUtils'

export {
  validateAppConfig,
  validateWindowSize,
  validateTheme,
  validateLanguage
} from './common/validationUtils'
