/**
 * 日期时间工具函数
 */

/**
 * 格式化日期为字符串
 * @param date 日期对象
 * @returns 格式化后的日期字符串 (YYYY-MM-DD HH:mm:ss)
 */
export function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19)
}

/**
 * 格式化时间戳为字符串
 * @param timestamp 时间戳
 * @returns 格式化后的日期字符串
 */
export function formatTimestamp(timestamp: number): string {
  return formatDate(new Date(timestamp))
}

/**
 * 获取当前时间戳
 * @returns 当前时间戳
 */
export function getCurrentTimestamp(): number {
  return Date.now()
}

/**
 * 计算时间差（毫秒）
 * @param startTime 开始时间
 * @param endTime 结束时间（可选，默认为当前时间）
 * @returns 时间差（毫秒）
 */
export function getTimeDiff(startTime: number, endTime?: number): number {
  return (endTime || getCurrentTimestamp()) - startTime
}
