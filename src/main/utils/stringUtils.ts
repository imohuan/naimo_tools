/**
 * 字符串处理工具函数
 * 提供各种字符串转换和处理功能
 */

/**
 * 工具类型：将字符串的首字母大写
 */
export type CapitalizeFirstLetter<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S;

/**
 * 工具类型：将短横线分隔的字符串转换为驼峰式
 */
export type KebabToCamelCase<S extends string> = S extends `${infer First}-${infer Rest}`
  ? `${First}${KebabToCamelCase<CapitalizeFirstLetter<Rest>>}`
  : S;

/**
 * 工具类型：将对象的所有键从短横线格式转换为驼峰式
 */
export type KebabKeysToCamelCase<T> = {
  [K in keyof T as K extends string ? KebabToCamelCase<K> : never]: T[K];
};

/**
 * 字符串转换工具类
 */
export class StringConverter {
  /**
   * 将短横线格式转换为驼峰式
   * @param kebabCase 短横线格式字符串
   * @returns 驼峰式字符串
   */
  static toCamelCase(kebabCase: string): string {
    return kebabCase.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  /**
   * 将驼峰式转换为短横线格式
   * @param camelCase 驼峰式字符串
   * @returns 短横线格式字符串
   */
  static toKebabCase(camelCase: string): string {
    return camelCase.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  /**
   * 将字符串首字母大写
   * @param str 输入字符串
   * @returns 首字母大写的字符串
   */
  static capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * 将字符串转换为 PascalCase
   * @param str 输入字符串（可以是 kebab-case 或其他格式）
   * @returns PascalCase 字符串
   */
  static toPascalCase(str: string): string {
    return this.capitalize(this.toCamelCase(str));
  }

  /**
   * 将字符串转换为下划线格式
   * @param str 输入字符串
   * @returns 下划线格式字符串
   */
  static toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }
}

/**
 * 字符串格式验证工具类
 */
export class StringValidator {
  /**
   * 检查是否为有效的短横线格式
   * @param str 待检查的字符串
   * @returns 是否为有效格式
   */
  static isKebabCase(str: string): boolean {
    return /^[a-z]+(-[a-z]+)*$/.test(str);
  }

  /**
   * 检查是否为有效的驼峰式格式
   * @param str 待检查的字符串
   * @returns 是否为有效格式
   */
  static isCamelCase(str: string): boolean {
    return /^[a-z][a-zA-Z0-9]*$/.test(str);
  }

  /**
   * 检查是否为有效的 PascalCase 格式
   * @param str 待检查的字符串
   * @returns 是否为有效格式
   */
  static isPascalCase(str: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(str);
  }

  /**
   * 检查是否为有效的下划线格式
   * @param str 待检查的字符串
   * @returns 是否为有效格式
   */
  static isSnakeCase(str: string): boolean {
    return /^[a-z]+(_[a-z]+)*$/.test(str);
  }

  /**
   * 检查字符串是否为空或只包含空白字符
   * @param str 待检查的字符串
   * @returns 是否为空或空白
   */
  static isBlank(str: string | null | undefined): boolean {
    return !str || str.trim().length === 0;
  }
}

/**
 * 字符串解析工具类
 */
export class StringParser {
  /**
   * 从短横线分隔的字符串中解析出组件
   * @param str 短横线分隔的字符串
   * @param separator 分隔符，默认为 '-'
   * @returns 解析后的组件数组
   */
  static parseKebabString(str: string, separator: string = '-'): string[] {
    return str.split(separator).filter(part => part.length > 0);
  }

  /**
   * 从路径字符串中提取文件名（不包含扩展名）
   * @param path 文件路径
   * @returns 文件名
   */
  static extractFileName(path: string): string {
    const fileName = path.split(/[/\\]/).pop() || '';
    return fileName.replace(/\.[^/.]+$/, '');
  }

  /**
   * 从路径字符串中提取扩展名
   * @param path 文件路径
   * @returns 扩展名（包含点号）
   */
  static extractFileExtension(path: string): string {
    const match = path.match(/\.[^/.]+$/);
    return match ? match[0] : '';
  }
}
