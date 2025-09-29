/**
 * 通用验证工具函数
 * 提供各种数据验证和格式检查功能
 */

/**
 * 检查值是否为 null 或 undefined
 * @param value 待检查的值
 * @returns 是否为 null 或 undefined
 */
export function isNullOrUndefined(value: any): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * 检查值是否为有效的对象（非 null、非数组）
 * @param value 待检查的值
 * @returns 是否为有效对象
 */
export function isValidObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 检查数组是否为空或 undefined
 * @param arr 待检查的数组
 * @returns 是否为空数组
 */
export function isEmptyArray(arr: any[] | null | undefined): boolean {
  return !arr || arr.length === 0;
}

/**
 * 检查对象是否为空
 * @param obj 待检查的对象
 * @returns 是否为空对象
 */
export function isEmptyObject(obj: Record<string, any> | null | undefined): boolean {
  return !obj || Object.keys(obj).length === 0;
}

/**
 * 检查字符串是否为有效的 URL
 * @param str 待检查的字符串
 * @returns 是否为有效 URL
 */
export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查字符串是否为有效的电子邮件地址
 * @param email 待检查的字符串
 * @returns 是否为有效邮箱
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 检查数字是否在指定范围内
 * @param value 待检查的数字
 * @param min 最小值
 * @param max 最大值
 * @returns 是否在范围内
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * 检查字符串长度是否在指定范围内
 * @param str 待检查的字符串
 * @param minLength 最小长度
 * @param maxLength 最大长度
 * @returns 是否在长度范围内
 */
export function isLengthInRange(str: string, minLength: number, maxLength: number): boolean {
  return str.length >= minLength && str.length <= maxLength;
}

/**
 * 检查值是否为正整数
 * @param value 待检查的值
 * @returns 是否为正整数
 */
export function isPositiveInteger(value: any): value is number {
  return Number.isInteger(value) && value > 0;
}

/**
 * 检查值是否为非负整数（包括0）
 * @param value 待检查的值
 * @returns 是否为非负整数
 */
export function isNonNegativeInteger(value: any): value is number {
  return Number.isInteger(value) && value >= 0;
}

// ============================================================================
// 类型守卫函数
// ============================================================================

/**
 * 检查值是否为字符串
 * @param value 待检查的值
 * @returns 是否为字符串
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

/**
 * 检查值是否为数字
 * @param value 待检查的值
 * @returns 是否为数字
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 检查值是否为布尔值
 * @param value 待检查的值
 * @returns 是否为布尔值
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

/**
 * 检查值是否为函数
 * @param value 待检查的值
 * @returns 是否为函数
 */
export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

/**
 * 检查值是否为数组
 * @param value 待检查的值
 * @returns 是否为数组
 */
export function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

/**
 * 检查值是否为 Date 对象
 * @param value 待检查的值
 * @returns 是否为 Date 对象
 */
export function isDate(value: any): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * 检查值是否为 Promise
 * @param value 待检查的值
 * @returns 是否为 Promise
 */
export function isPromise(value: any): value is Promise<any> {
  return value instanceof Promise || (value && typeof value.then === 'function');
}

// ============================================================================
// 数据清理函数
// ============================================================================

/**
 * 移除字符串中的 HTML 标签
 * @param str 包含 HTML 的字符串
 * @returns 清理后的字符串
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * 清理字符串中的特殊字符，只保留字母、数字和指定字符
 * @param str 待清理的字符串
 * @param allowedChars 允许保留的特殊字符
 * @returns 清理后的字符串
 */
export function sanitizeString(str: string, allowedChars: string = '-_'): string {
  const pattern = new RegExp(`[^a-zA-Z0-9${allowedChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g');
  return str.replace(pattern, '');
}

/**
 * 清理对象中的空值属性
 * @param obj 待清理的对象
 * @returns 清理后的对象
 */
export function removeEmptyProperties(obj: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (!isNullOrUndefined(value) && value !== '' && !isEmptyArray(value)) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}
