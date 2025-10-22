/**
 * 日志增强模块类型声明
 */

/**
 * 调用者信息接口
 */
export interface CallerInfo {
  /** 文件路径 */
  file: string;
  /** 行号 */
  line: number;
  /** 列号（可选） */
  column?: number;
}

/**
 * 源码映射结果接口
 */
export interface SourceMapping {
  /** 源文件路径 */
  file: string;
  /** 源文件行号 */
  line: number;
  /** 源文件列号 */
  column: number;
}

/**
 * 日志增强器接口
 */
export interface LoggerEnhancer {
  /**
   * 启用日志增强功能
   * @returns 恢复函数（可选）
   */
  enhance(): (() => void) | void;
}

/**
 * 源码映射解析器接口
 */
export interface SourceMapParser {
  /**
   * 将编译后的位置映射到源文件位置
   * @param compiledLine 编译后的行号
   * @param compiledColumn 编译后的列号
   * @returns 源文件映射信息
   */
  mapToSource(compiledLine: number, compiledColumn: number): SourceMapping | null;
}

/**
 * 源码映射缓存接口
 */
export interface SourceMapCache {
  /**
   * 获取源码映射
   * @param fileName 文件名
   * @returns 源码映射解析器实例
   */
  get(fileName: string): SourceMapParser | null;

  /**
   * 设置源码映射
   * @param fileName 文件名
   * @param parser 源码映射解析器实例
   */
  set(fileName: string, parser: SourceMapParser): void;
}
