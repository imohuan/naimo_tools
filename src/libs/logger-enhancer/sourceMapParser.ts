/**
 * 源码映射解析器
 * 用于将编译后的代码位置映射回源文件位置
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { SourceMapping, SourceMapParser as ISourceMapParser } from './typings';

/**
 * VLQ 解码器
 * 用于解码源码映射中的 Variable Length Quantity 编码
 */
class VLQDecoder {
  private static readonly VLQ_BASE_SHIFT = 5;
  private static readonly VLQ_BASE = 1 << VLQDecoder.VLQ_BASE_SHIFT;
  private static readonly VLQ_BASE_MASK = VLQDecoder.VLQ_BASE - 1;
  private static readonly VLQ_CONTINUATION_BIT = VLQDecoder.VLQ_BASE;

  /**
   * 解码 VLQ 字符串
   */
  static decode(str: string, index: number = 0): { value: number; nextIndex: number } {
    let result = 0;
    let shift = 0;
    let continuation = true;

    while (continuation) {
      if (index >= str.length) {
        throw new Error('Unexpected end of VLQ string');
      }

      let digit = VLQDecoder.fromBase64(str[index]);
      continuation = (digit & VLQDecoder.VLQ_CONTINUATION_BIT) !== 0;
      digit &= VLQDecoder.VLQ_BASE_MASK;
      result += digit << shift;
      shift += VLQDecoder.VLQ_BASE_SHIFT;
      index++;
    }

    return {
      value: VLQDecoder.toSigned(result),
      nextIndex: index
    };
  }

  /**
   * 从 Base64 字符转换为数字
   */
  private static fromBase64(char: string): number {
    const code = char.charCodeAt(0);

    if (code >= 65 && code <= 90) { // A-Z
      return code - 65;
    } else if (code >= 97 && code <= 122) { // a-z
      return code - 97 + 26;
    } else if (code >= 48 && code <= 57) { // 0-9
      return code - 48 + 52;
    } else if (char === '+') {
      return 62;
    } else if (char === '/') {
      return 63;
    } else {
      throw new Error(`Invalid base64 character: ${char}`);
    }
  }

  /**
   * 转换为有符号数
   */
  private static toSigned(value: number): number {
    return (value & 1) === 1 ? -(value >> 1) : (value >> 1);
  }
}

/**
 * 映射信息接口
 */
interface ParsedMapping {
  generatedColumn: number;
  sourceIndex: number;
  sourceLine: number;
  sourceColumn: number;
  nameIndex?: number;
}

/**
 * 源码映射解析器类
 */
class SourceMapParser implements ISourceMapParser {
  private sourceMap: any;
  private sources: string[];
  private parsedMappings: ParsedMapping[][];

  constructor(sourceMap: any) {
    this.sourceMap = sourceMap;
    this.sources = sourceMap.sources || [];
    this.parsedMappings = this.parseMappings(sourceMap.mappings || '');
  }

  /**
   * 解析源码映射的 mappings 字符串
   */
  private parseMappings(mappings: string): ParsedMapping[][] {
    const lines = mappings.split(';');
    const result: ParsedMapping[][] = [];

    let previousGeneratedColumn = 0;
    let previousSourceIndex = 0;
    let previousSourceLine = 0;
    let previousSourceColumn = 0;
    let previousNameIndex = 0;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const mappings: ParsedMapping[] = [];

      if (line) {
        const segments = line.split(',');

        for (const segment of segments) {
          if (!segment) continue;

          try {
            let index = 0;

            // 解析生成的列号
            const generatedColumnResult = VLQDecoder.decode(segment, index);
            const generatedColumn = previousGeneratedColumn + generatedColumnResult.value;
            index = generatedColumnResult.nextIndex;

            // 检查是否有源文件信息
            if (index < segment.length) {
              // 解析源文件索引
              const sourceIndexResult = VLQDecoder.decode(segment, index);
              const sourceIndex = previousSourceIndex + sourceIndexResult.value;
              index = sourceIndexResult.nextIndex;

              // 解析源文件行号
              const sourceLineResult = VLQDecoder.decode(segment, index);
              const sourceLine = previousSourceLine + sourceLineResult.value;
              index = sourceLineResult.nextIndex;

              // 解析源文件列号
              const sourceColumnResult = VLQDecoder.decode(segment, index);
              const sourceColumn = previousSourceColumn + sourceColumnResult.value;
              index = sourceColumnResult.nextIndex;

              // 检查是否有名称索引
              let nameIndex: number | undefined;
              if (index < segment.length) {
                const nameIndexResult = VLQDecoder.decode(segment, index);
                nameIndex = previousNameIndex + nameIndexResult.value;
                index = nameIndexResult.nextIndex;
              }

              mappings.push({
                generatedColumn,
                sourceIndex,
                sourceLine,
                sourceColumn,
                nameIndex
              });

              // 更新前一个值
              previousSourceIndex = sourceIndex;
              previousSourceLine = sourceLine;
              previousSourceColumn = sourceColumn;
              if (nameIndex !== undefined) {
                previousNameIndex = nameIndex;
              }
            }

            // 更新前一个生成的列号
            previousGeneratedColumn = generatedColumn;
          } catch (error) {
            // 跳过无效的段
            continue;
          }
        }
      }

      result.push(mappings);

      // 重置前一个值（每行都重置）
      previousGeneratedColumn = 0;
    }

    return result;
  }

  /**
   * 将编译后的行号和列号映射到源文件位置
   * @param generatedLine 编译后的行号（从1开始）
   * @param generatedColumn 编译后的列号（从0开始）
   * @returns 源文件映射信息
   */
  mapToSource(generatedLine: number, generatedColumn: number = 0): SourceMapping | null {
    try {
      // 调整行号（数组从0开始）
      const lineIndex = generatedLine - 1;

      if (lineIndex < 0 || lineIndex >= this.parsedMappings.length) {
        return null;
      }

      const lineMappings = this.parsedMappings[lineIndex];
      if (!lineMappings || lineMappings.length === 0) {
        return null;
      }

      // 查找最接近的映射
      let bestMapping: ParsedMapping | null = null;
      let bestColumn = -1;

      for (const mapping of lineMappings) {
        if (mapping.generatedColumn <= generatedColumn && mapping.generatedColumn > bestColumn) {
          bestMapping = mapping;
          bestColumn = mapping.generatedColumn;
        }
      }

      if (bestMapping && bestMapping.sourceIndex < this.sources.length) {
        return {
          file: this.sources[bestMapping.sourceIndex],
          line: bestMapping.sourceLine + 1, // 转换为从1开始的行号
          column: bestMapping.sourceColumn + 1 // 转换为从1开始的列号
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}

/**
 * 源码映射缓存
 */
class SourceMapCache {
  private cache = new Map<string, SourceMapParser>();

  /**
   * 获取源码映射解析器
   */
  get(fileName: string): SourceMapParser | null {
    return this.cache.get(fileName) || null;
  }

  /**
   * 设置源码映射解析器
   */
  set(fileName: string, parser: SourceMapParser): void {
    this.cache.set(fileName, parser);
  }

  /**
   * 加载源码映射文件
   */
  loadSourceMap(fileName: string = 'main'): SourceMapParser | null {
    try {
      let sourceMapPath: string;

      if (fileName === 'main') {
        sourceMapPath = resolve(process.cwd(), 'dist/main/main.js.map');
      } else if (fileName.endsWith('Worker')) {
        // Worker 脚本
        sourceMapPath = resolve(process.cwd(), `dist/main/workers/${fileName}.js.map`);
      } else {
        // Preload 脚本
        sourceMapPath = resolve(process.cwd(), `dist/main/preloads/${fileName}.js.map`);
      }

      if (existsSync(sourceMapPath)) {
        const sourceMapContent = readFileSync(sourceMapPath, 'utf-8');
        const sourceMap = JSON.parse(sourceMapContent);
        const parser = new SourceMapParser(sourceMap);
        this.set(fileName, parser);
        return parser;
      }
    } catch (error) {
      // 静默处理错误
    }
    return null;
  }
}

// 全局缓存实例
const sourceMapCache = new SourceMapCache();

/**
 * 将编译后的行号和列号映射到源文件位置
 * @param compiledLine 编译后的行号
 * @param compiledColumn 编译后的列号（可选）
 * @param fileName 文件名（可选，用于确定使用哪个源码映射文件）
 * @returns 源文件映射信息
 */
export function mapCompiledToSource(compiledLine: number, compiledColumn: number = 0, fileName: string = 'main'): SourceMapping | null {
  try {
    // 尝试从缓存获取源码映射
    let parser = sourceMapCache.get(fileName);
    if (!parser) {
      parser = sourceMapCache.loadSourceMap(fileName);
    }

    if (!parser) {
      return null;
    }

    const mapping = parser.mapToSource(compiledLine, compiledColumn);

    if (mapping) {
      // 清理文件路径
      let filePath = mapping.file;
      if (filePath.startsWith('webpack:///')) {
        filePath = filePath.replace('webpack:///', '');
      }
      if (filePath.startsWith('./')) {
        filePath = filePath.substring(2);
      }

      return {
        file: filePath,
        line: mapping.line,
        column: mapping.column
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}
