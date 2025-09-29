/**
 * 代码风格和规范工具
 * 提供统一的代码风格指导和工具函数
 */

/**
 * 命名规范
 */
export const NamingConventions = {
  // 组件名使用 PascalCase
  COMPONENT: /^[A-Z][a-zA-Z0-9]*$/,

  // 函数名使用 camelCase
  FUNCTION: /^[a-z][a-zA-Z0-9]*$/,

  // 常量使用 UPPER_SNAKE_CASE
  CONSTANT: /^[A-Z][A-Z0-9_]*$/,

  // 变量名使用 camelCase
  VARIABLE: /^[a-z][a-zA-Z0-9]*$/,

  // 类型名使用 PascalCase
  TYPE: /^[A-Z][a-zA-Z0-9]*$/,

  // 接口名使用 PascalCase，可选 I 前缀
  INTERFACE: /^I?[A-Z][a-zA-Z0-9]*$/,

  // 枚举名使用 PascalCase
  ENUM: /^[A-Z][a-zA-Z0-9]*$/,

  // 文件名使用 camelCase 或 kebab-case
  FILE: /^[a-z][a-zA-Z0-9]*$|^[a-z][a-z0-9-]*$/
}

/**
 * 注释规范
 */
export const CommentGuidelines = {
  /**
   * JSDoc 注释模板
   */
  JSDOC_FUNCTION: `/**
 * 函数描述
 * @param {type} paramName - 参数描述
 * @returns {type} 返回值描述
 * @throws {Error} 异常描述
 * @example
 * // 使用示例
 * functionName(param)
 */`,

  /**
   * 类注释模板
   */
  JSDOC_CLASS: `/**
 * 类描述
 * @class ClassName
 * @extends BaseClass
 * @implements Interface
 */`,

  /**
   * 接口注释模板
   */
  JSDOC_INTERFACE: `/**
 * 接口描述
 * @interface InterfaceName
 */`,

  /**
   * 属性注释模板
   */
  JSDOC_PROPERTY: `/** 属性描述 */`,

  /**
   * 单行注释规范
   */
  SINGLE_LINE: '// 描述内容',

  /**
   * 多行注释规范
   */
  MULTI_LINE: `/*
 * 多行注释内容
 * 第二行内容
 */`
}

/**
 * 代码组织规范
 */
export const CodeOrganization = {
  /**
   * Vue 组件结构顺序
   */
  VUE_COMPONENT_ORDER: [
    'template',
    'script setup',
    'style'
  ],

  /**
   * script setup 内容顺序
   */
  SCRIPT_SETUP_ORDER: [
    'imports',
    'interfaces/types',
    'props/emits',
    'composables',
    'reactive data',
    'computed',
    'watchers',
    'lifecycle hooks',
    'methods',
    'expose'
  ],

  /**
   * 导入顺序
   */
  IMPORT_ORDER: [
    'vue core',
    'vue ecosystem',
    'third party',
    'internal modules',
    'relative imports',
    'types'
  ]
}

/**
 * 性能优化指南
 */
export const PerformanceGuidelines = {
  /**
   * 推荐的性能优化模式
   */
  PATTERNS: {
    // 使用 readonly 包装响应式数据
    READONLY_REACTIVE: `const state = readonly(reactive({ ... }))`,

    // 使用 shallowRef 优化大对象
    SHALLOW_REF: `const largeObject = shallowRef({ ... })`,

    // 使用 markRaw 标记非响应式对象
    MARK_RAW: `const nonReactive = markRaw({ ... })`,

    // 使用 nextTick 优化 DOM 操作
    NEXT_TICK: `await nextTick(() => { ... })`,

    // 使用防抖优化频繁操作
    DEBOUNCE: `const debouncedFn = useDebounceFn(fn, delay)`,

    // 使用节流优化滚动等事件
    THROTTLE: `const throttledFn = useThrottleFn(fn, delay)`
  },

  /**
   * 避免的反模式
   */
  ANTI_PATTERNS: [
    '在模板中使用复杂计算',
    '在 watch 中修改被监听的数据',
    '过度使用 reactive',
    '在循环中创建响应式数据',
    '不必要的深度监听'
  ]
}

/**
 * 错误处理规范
 */
export const ErrorHandlingGuidelines = {
  /**
   * 错误处理模板
   */
  TRY_CATCH: `try {
  // 可能出错的代码
} catch (error) {
  console.error('操作失败:', error)
  // 错误处理逻辑
} finally {
  // 清理逻辑
}`,

  /**
   * 异步错误处理
   */
  ASYNC_ERROR: `const handleAsync = async () => {
  try {
    const result = await asyncOperation()
    return result
  } catch (error) {
    console.error('异步操作失败:', error)
    throw error // 或返回默认值
  }
}`,

  /**
   * 错误边界组件
   */
  ERROR_BOUNDARY: `onErrorCaptured((error, instance, info) => {
  console.error('组件错误:', error, info)
  // 错误上报
  return false // 阻止错误继续传播
})`
}

/**
 * 类型定义规范
 */
export const TypeDefinitionGuidelines = {
  /**
   * 接口定义
   */
  INTERFACE: `interface UserInfo {
  /** 用户ID */
  id: string
  /** 用户名 */
  name: string
  /** 邮箱地址 */
  email?: string
}`,

  /**
   * 类型别名
   */
  TYPE_ALIAS: `type Status = 'pending' | 'success' | 'error'`,

  /**
   * 泛型约束
   */
  GENERIC: `interface ApiResponse<T = any> {
  data: T
  code: number
  message: string
}`,

  /**
   * 工具类型
   */
  UTILITY_TYPES: [
    'Partial<T>',
    'Required<T>',
    'Readonly<T>',
    'Pick<T, K>',
    'Omit<T, K>',
    'Record<K, T>'
  ]
}

/**
 * 验证命名是否符合规范
 */
export function validateNaming(name: string, type: keyof typeof NamingConventions): boolean {
  return NamingConventions[type].test(name)
}

/**
 * 生成标准注释
 */
export function generateComment(
  type: 'function' | 'class' | 'interface' | 'property',
  options: {
    description?: string
    params?: Array<{ name: string; type: string; description: string }>
    returns?: { type: string; description: string }
    example?: string
  } = {}
): string {
  const { description = '', params = [], returns, example } = options

  switch (type) {
    case 'function':
      let comment = `/**\n * ${description}\n`

      params.forEach(param => {
        comment += ` * @param {${param.type}} ${param.name} - ${param.description}\n`
      })

      if (returns) {
        comment += ` * @returns {${returns.type}} ${returns.description}\n`
      }

      if (example) {
        comment += ` * @example\n * ${example}\n`
      }

      comment += ' */'
      return comment

    case 'class':
      return `/**\n * ${description}\n * @class\n */`

    case 'interface':
      return `/**\n * ${description}\n * @interface\n */`

    case 'property':
      return `/** ${description} */`

    default:
      return `/** ${description} */`
  }
}

/**
 * 格式化代码结构
 */
export function formatCodeStructure(
  sections: Array<{
    name: string
    content: string[]
  }>
): string {
  return sections
    .map(section => {
      const header = `// ==================== ${section.name} ====================`
      const content = section.content.join('\n')
      return `${header}\n${content}\n`
    })
    .join('\n')
}

/**
 * 生成导入语句
 */
export function generateImports(imports: {
  vue?: string[]
  vueuse?: string[]
  thirdParty?: Array<{ from: string; imports: string[] }>
  internal?: Array<{ from: string; imports: string[] }>
  types?: Array<{ from: string; imports: string[] }>
}): string {
  const statements: string[] = []

  // Vue 核心导入
  if (imports.vue?.length) {
    statements.push(`import { ${imports.vue.join(', ')} } from 'vue'`)
  }

  // VueUse 导入
  if (imports.vueuse?.length) {
    statements.push(`import { ${imports.vueuse.join(', ')} } from '@vueuse/core'`)
  }

  // 第三方库导入
  imports.thirdParty?.forEach(({ from, imports: items }) => {
    statements.push(`import { ${items.join(', ')} } from '${from}'`)
  })

  // 内部模块导入
  imports.internal?.forEach(({ from, imports: items }) => {
    statements.push(`import { ${items.join(', ')} } from '${from}'`)
  })

  // 类型导入
  imports.types?.forEach(({ from, imports: items }) => {
    statements.push(`import type { ${items.join(', ')} } from '${from}'`)
  })

  return statements.join('\n')
}

/**
 * 代码质量检查
 */
export class CodeQualityChecker {
  private issues: string[] = []

  /**
   * 检查函数长度
   */
  checkFunctionLength(code: string, maxLines: number = 50): void {
    const lines = code.split('\n').length
    if (lines > maxLines) {
      this.issues.push(`函数过长 (${lines} 行)，建议拆分`)
    }
  }

  /**
   * 检查嵌套深度
   */
  checkNestingDepth(code: string, maxDepth: number = 4): void {
    const lines = code.split('\n')
    let currentDepth = 0
    let maxFoundDepth = 0

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.includes('{')) currentDepth++
      if (trimmed.includes('}')) currentDepth--
      maxFoundDepth = Math.max(maxFoundDepth, currentDepth)
    }

    if (maxFoundDepth > maxDepth) {
      this.issues.push(`嵌套过深 (${maxFoundDepth} 层)，建议重构`)
    }
  }

  /**
   * 检查变量命名
   */
  checkVariableNaming(variables: string[]): void {
    variables.forEach(variable => {
      if (!validateNaming(variable, 'VARIABLE')) {
        this.issues.push(`变量命名不规范: ${variable}`)
      }
    })
  }

  /**
   * 获取检查结果
   */
  getIssues(): string[] {
    return [...this.issues]
  }

  /**
   * 清除检查结果
   */
  clear(): void {
    this.issues = []
  }
}

/**
 * 导出默认的代码质量检查器实例
 */
export const codeQualityChecker = new CodeQualityChecker()
