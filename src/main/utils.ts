import { dirname } from "path";
import { fileURLToPath } from "url";

/**
 * 获取当前文件的目录
 * @param metaUrl 当前文件的URL
 * @returns 当前文件的目录
 */
export function getDirname(metaUrl: string) {
  return dirname(fileURLToPath(metaUrl));
}

/**
 * 防抖函数
 * @param func 函数
 * @param wait 等待时间
 * @returns 函数
 */
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: NodeJS.Timeout;
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}