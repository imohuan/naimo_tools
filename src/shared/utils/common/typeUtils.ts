/**
 * 类型判断和验证工具函数
 */

/**
 * 判断一个值是否为函数
 * @param obj 任意值
 * @returns 如果是函数返回 true，否则返回 false
 */
export function isFunction(obj: any): obj is Function {
  return obj !== null && obj !== undefined && Object.prototype.toString.call(obj) === '[object Function]'
}

/**
 * 判断一个值是否为对象
 * @param obj 任意值
 * @returns 如果是对象返回 true，否则返回 false
 */
export function isObject(obj: any): obj is object {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj)
}

/**
 * 判断一个值是否为数组
 * @param obj 任意值
 * @returns 如果是数组返回 true，否则返回 false
 */
export function isArray(obj: any): obj is any[] {
  return Array.isArray(obj)
}

/**
 * 判断一个值是否为字符串
 * @param obj 任意值
 * @returns 如果是字符串返回 true，否则返回 false
 */
export function isString(obj: any): obj is string {
  return typeof obj === 'string'
}

/**
 * 判断一个值是否为数字
 * @param obj 任意值
 * @returns 如果是数字返回 true，否则返回 false
 */
export function isNumber(obj: any): obj is number {
  return typeof obj === 'number' && !isNaN(obj)
}

/**
 * 判断一个值是否为布尔值
 * @param obj 任意值
 * @returns 如果是布尔值返回 true，否则返回 false
 */
export function isBoolean(obj: any): obj is boolean {
  return typeof obj === 'boolean'
}

/**
 * 判断一个值是否为 null 或 undefined
 * @param obj 任意值
 * @returns 如果是 null 或 undefined 返回 true，否则返回 false
 */
export function isNullOrUndefined(obj: any): obj is null | undefined {
  return obj === null || obj === undefined
}

/**
 * 深度克隆对象
 * @param obj 要克隆的对象
 * @returns 克隆后的对象
 */
export function deepClone<T>(obj: T): T {
  if (isNullOrUndefined(obj) || typeof obj !== 'object') {
    return obj
  }

  if (isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T
  }

  const cloned = {} as T
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key])
    }
  }

  return cloned
}
