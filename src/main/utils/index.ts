/**
 * 主进程工具函数统一导出
 * 提供主进程特有工具函数的统一访问接口
 */

// 主进程特有的 Node.js 工具函数
export * from './nodeUtils'

// 字符串处理工具
export * from './stringUtils'

// 通用验证工具
export * from './validationUtils'

// 窗口配置工具
export * from './windowConfig'

// 重新导出常用函数
export {
  getDirname,
  debounce,
  createCombinedPreloadScript
} from './nodeUtils'

export {
  getProjectRoot,
  getRendererUrl
} from './windowConfig'

export {
  StringConverter,
  StringValidator,
  StringParser
} from './stringUtils'

export {
  // 通用验证函数
  isNullOrUndefined,
  isValidObject,
  isEmptyArray,
  isEmptyObject,
  isValidUrl,
  isValidEmail,
  isInRange,
  isLengthInRange,
  isPositiveInteger,
  isNonNegativeInteger,
  // 类型守卫函数
  isString,
  isNumber,
  isBoolean,
  isFunction,
  isArray,
  isDate,
  isPromise,
  // 数据清理函数
  stripHtml,
  sanitizeString,
  removeEmptyProperties
} from './validationUtils'
