import { isEmpty, isString, isObject } from 'lodash-es'

/**
 * 验证搜索关键词
 * @param query 搜索关键词
 */
export const validateSearchQuery = (query: string): boolean => {
  return isString(query) && !isEmpty(query.trim())
}

/**
 * 验证对象是否为空
 * @param obj 对象
 */
export const validateNotEmpty = (obj: any): boolean => {
  return !isEmpty(obj)
}

/**
 * 验证是否为有效字符串
 * @param str 字符串
 */
export const validateString = (str: any): boolean => {
  return isString(str) && !isEmpty(str)
}

/**
 * 验证是否为有效对象
 * @param obj 对象
 */
export const validateObject = (obj: any): boolean => {
  return isObject(obj) && !isEmpty(obj)
}


