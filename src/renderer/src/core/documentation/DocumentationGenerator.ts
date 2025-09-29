/**
 * 文档生成器
 * 自动生成和维护开发文档
 */

import { ref, computed } from 'vue'

/**
 * 文档类型枚举
 */
export enum DocumentationType {
  API = 'api',                 // API文档
  COMPONENT = 'component',     // 组件文档
  GUIDE = 'guide',            // 使用指南
  ARCHITECTURE = 'architecture', // 架构文档
  CHANGELOG = 'changelog'      // 更新日志
}

/**
 * 文档项接口
 */
export interface DocumentationItem {
  /** 文档ID */
  id: string
  /** 文档标题 */
  title: string
  /** 文档类型 */
  type: DocumentationType
  /** 文档内容 */
  content: string
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
  /** 作者 */
  author: string
  /** 版本 */
  version: string
  /** 标签 */
  tags: string[]
  /** 是否已发布 */
  published: boolean
}

/**
 * API文档项接口
 */
export interface APIDocumentationItem extends DocumentationItem {
  /** 函数名 */
  functionName: string
  /** 参数 */
  parameters: Array<{
    name: string
    type: string
    description: string
    required: boolean
    defaultValue?: any
  }>
  /** 返回值 */
  returnType: {
    type: string
    description: string
  }
  /** 示例代码 */
  examples: Array<{
    title: string
    code: string
    description: string
  }>
}

/**
 * 组件文档项接口
 */
export interface ComponentDocumentationItem extends DocumentationItem {
  /** 组件名 */
  componentName: string
  /** Props */
  props: Array<{
    name: string
    type: string
    description: string
    required: boolean
    defaultValue?: any
  }>
  /** Events */
  events: Array<{
    name: string
    description: string
    payload: string
  }>
  /** Slots */
  slots: Array<{
    name: string
    description: string
    props?: string
  }>
  /** 使用示例 */
  examples: Array<{
    title: string
    template: string
    script?: string
    description: string
  }>
}

/**
 * 文档模板接口
 */
export interface DocumentationTemplate {
  /** 模板ID */
  id: string
  /** 模板名称 */
  name: string
  /** 模板类型 */
  type: DocumentationType
  /** 模板内容 */
  template: string
  /** 变量定义 */
  variables: Array<{
    name: string
    type: string
    description: string
    required: boolean
  }>
}

/**
 * 文档生成器核心类
 */
export class DocumentationGenerator {
  private documents = new Map<string, DocumentationItem>()
  private templates = new Map<string, DocumentationTemplate>()
  private isGenerating = ref(false)

  constructor() {
    this.initializeDefaultTemplates()
  }

  /**
   * 初始化默认模板
   */
  private initializeDefaultTemplates(): void {
    // API文档模板
    this.addTemplate({
      id: 'api-function',
      name: 'API Function Documentation',
      type: DocumentationType.API,
      template: `# {{functionName}}

{{description}}

## 参数

{{#each parameters}}
- **{{name}}** (\`{{type}}\`){{#if required}} *必需*{{/if}}: {{description}}{{#if defaultValue}} (默认值: \`{{defaultValue}}\`){{/if}}
{{/each}}

## 返回值

- **类型**: \`{{returnType.type}}\`
- **描述**: {{returnType.description}}

## 示例

{{#each examples}}
### {{title}}

\`\`\`typescript
{{code}}
\`\`\`

{{description}}

{{/each}}

## 更新历史

- {{version}} ({{updatedAt}}): {{changelog}}
`,
      variables: [
        { name: 'functionName', type: 'string', description: '函数名', required: true },
        { name: 'description', type: 'string', description: '函数描述', required: true },
        { name: 'parameters', type: 'array', description: '参数列表', required: false },
        { name: 'returnType', type: 'object', description: '返回值类型', required: true },
        { name: 'examples', type: 'array', description: '示例代码', required: false }
      ]
    })

    // 组件文档模板
    this.addTemplate({
      id: 'vue-component',
      name: 'Vue Component Documentation',
      type: DocumentationType.COMPONENT,
      template: `# {{componentName}}

{{description}}

## Props

{{#each props}}
| 名称 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
{{#each this}}
| {{name}} | \`{{type}}\` | {{#if required}}是{{else}}否{{/if}} | {{#if defaultValue}}\`{{defaultValue}}\`{{else}}-{{/if}} | {{description}} |
{{/each}}
{{/each}}

## Events

{{#each events}}
### {{name}}

{{description}}

**Payload**: \`{{payload}}\`

{{/each}}

## Slots

{{#each slots}}
### {{name}}

{{description}}

{{#if props}}**Props**: \`{{props}}\`{{/if}}

{{/each}}

## 使用示例

{{#each examples}}
### {{title}}

\`\`\`vue
<template>
{{template}}
</template>

{{#if script}}
<script setup lang="ts">
{{script}}
</script>
{{/if}}
\`\`\`

{{description}}

{{/each}}
`,
      variables: [
        { name: 'componentName', type: 'string', description: '组件名', required: true },
        { name: 'description', type: 'string', description: '组件描述', required: true },
        { name: 'props', type: 'array', description: 'Props列表', required: false },
        { name: 'events', type: 'array', description: 'Events列表', required: false },
        { name: 'slots', type: 'array', description: 'Slots列表', required: false },
        { name: 'examples', type: 'array', description: '使用示例', required: false }
      ]
    })

    // 架构文档模板
    this.addTemplate({
      id: 'architecture',
      name: 'Architecture Documentation',
      type: DocumentationType.ARCHITECTURE,
      template: `# {{title}}

## 概述

{{overview}}

## 架构图

{{#if architectureDiagram}}
![架构图]({{architectureDiagram}})
{{/if}}

## 核心模块

{{#each modules}}
### {{name}}

{{description}}

**职责**:
{{#each responsibilities}}
- {{this}}
{{/each}}

**依赖**:
{{#each dependencies}}
- {{this}}
{{/each}}

{{/each}}

## 数据流

{{dataFlow}}

## 技术栈

{{#each techStack}}
- **{{name}}**: {{description}}
{{/each}}

## 设计原则

{{#each designPrinciples}}
- **{{principle}}**: {{description}}
{{/each}}

## 性能考虑

{{performance}}

## 安全考虑

{{security}}
`,
      variables: [
        { name: 'title', type: 'string', description: '文档标题', required: true },
        { name: 'overview', type: 'string', description: '概述', required: true },
        { name: 'modules', type: 'array', description: '核心模块', required: false },
        { name: 'dataFlow', type: 'string', description: '数据流描述', required: false },
        { name: 'techStack', type: 'array', description: '技术栈', required: false }
      ]
    })
  }

  /**
   * 添加文档模板
   */
  addTemplate(template: DocumentationTemplate): void {
    this.templates.set(template.id, template)
  }

  /**
   * 获取文档模板
   */
  getTemplate(id: string): DocumentationTemplate | undefined {
    return this.templates.get(id)
  }

  /**
   * 生成文档
   */
  async generateDocument(
    templateId: string,
    data: Record<string, any>,
    options: {
      title: string
      author?: string
      version?: string
      tags?: string[]
    }
  ): Promise<DocumentationItem> {
    this.isGenerating.value = true

    try {
      const template = this.getTemplate(templateId)
      if (!template) {
        throw new Error(`Template ${templateId} not found`)
      }

      // 验证必需变量
      const missingVariables = template.variables
        .filter(variable => variable.required && !(variable.name in data))
        .map(variable => variable.name)

      if (missingVariables.length > 0) {
        throw new Error(`Missing required variables: ${missingVariables.join(', ')}`)
      }

      // 生成内容
      const content = this.renderTemplate(template.template, data)

      const document: DocumentationItem = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: options.title,
        type: template.type,
        content,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        author: options.author || 'System',
        version: options.version || '1.0.0',
        tags: options.tags || [],
        published: false
      }

      this.documents.set(document.id, document)
      return document
    } finally {
      this.isGenerating.value = false
    }
  }

  /**
   * 渲染模板
   */
  private renderTemplate(template: string, data: Record<string, any>): string {
    let content = template

    // 简单的模板引擎实现
    // 替换变量 {{variableName}}
    content = content.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
      return data[variableName] || match
    })

    // 处理对象属性 {{object.property}}
    content = content.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_match, objectName, propertyName) => {
      const obj = data[objectName]
      return (obj && obj[propertyName]) || _match
    })

    // 处理条件语句 {{#if condition}}...{{/if}}
    content = content.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, condition, block) => {
      return data[condition] ? block : ''
    })

    // 处理循环语句 {{#each array}}...{{/each}}
    content = content.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_match, arrayName, block) => {
      const array = data[arrayName]
      if (!Array.isArray(array)) return ''

      return array.map(item => {
        let itemBlock = block
        // 在循环中，{{this}} 代表当前项
        itemBlock = itemBlock.replace(/\{\{this\}\}/g, item)
        // 处理对象属性
        if (typeof item === 'object') {
          for (const [key, value] of Object.entries(item)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
            itemBlock = itemBlock.replace(regex, String(value))
          }
        }
        return itemBlock
      }).join('')
    })

    return content
  }

  /**
   * 从代码自动生成API文档
   */
  async generateAPIDocFromCode(
    _filePath: string,
    _options: {
      author?: string
      version?: string
    } = {}
  ): Promise<DocumentationItem[]> {
    // 这里应该实现代码解析逻辑
    // 暂时返回空数组
    console.warn('自动生成API文档功能尚未实现')
    return []
  }

  /**
   * 从Vue组件自动生成组件文档
   */
  async generateComponentDocFromVue(
    _componentPath: string,
    options: {
      author?: string
      version?: string
    } = {}
  ): Promise<DocumentationItem> {
    // 这里应该实现Vue组件解析逻辑
    // 暂时返回基础文档
    console.warn('自动生成组件文档功能尚未实现')

    return this.generateDocument('vue-component', {
      componentName: 'ExampleComponent',
      description: '示例组件',
      props: [],
      events: [],
      slots: [],
      examples: []
    }, {
      title: 'Example Component',
      author: options.author,
      version: options.version
    })
  }

  /**
   * 更新文档
   */
  updateDocument(
    id: string,
    updates: Partial<DocumentationItem>
  ): boolean {
    const document = this.documents.get(id)
    if (!document) return false

    Object.assign(document, updates, {
      updatedAt: Date.now()
    })

    return true
  }

  /**
   * 发布文档
   */
  publishDocument(id: string): boolean {
    const document = this.documents.get(id)
    if (!document) return false

    document.published = true
    document.updatedAt = Date.now()
    return true
  }

  /**
   * 删除文档
   */
  deleteDocument(id: string): boolean {
    return this.documents.delete(id)
  }

  /**
   * 获取文档
   */
  getDocument(id: string): DocumentationItem | undefined {
    return this.documents.get(id)
  }

  /**
   * 获取所有文档
   */
  getAllDocuments(filter?: {
    type?: DocumentationType
    published?: boolean
    tags?: string[]
  }): DocumentationItem[] {
    let documents = Array.from(this.documents.values())

    if (filter) {
      if (filter.type) {
        documents = documents.filter(doc => doc.type === filter.type)
      }
      if (filter.published !== undefined) {
        documents = documents.filter(doc => doc.published === filter.published)
      }
      if (filter.tags && filter.tags.length > 0) {
        documents = documents.filter(doc =>
          filter.tags!.some(tag => doc.tags.includes(tag))
        )
      }
    }

    return documents.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  /**
   * 搜索文档
   */
  searchDocuments(query: string): DocumentationItem[] {
    const lowerQuery = query.toLowerCase()

    return Array.from(this.documents.values()).filter(doc =>
      doc.title.toLowerCase().includes(lowerQuery) ||
      doc.content.toLowerCase().includes(lowerQuery) ||
      doc.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }

  /**
   * 导出文档为Markdown
   */
  exportToMarkdown(id: string): string | null {
    const document = this.getDocument(id)
    if (!document) return null

    return `---
title: ${document.title}
type: ${document.type}
author: ${document.author}
version: ${document.version}
created: ${new Date(document.createdAt).toISOString()}
updated: ${new Date(document.updatedAt).toISOString()}
tags: [${document.tags.join(', ')}]
published: ${document.published}
---

${document.content}
`
  }

  /**
   * 导出所有文档
   */
  exportAllDocuments(): Record<string, string> {
    const exported: Record<string, string> = {}

    for (const [id, document] of this.documents.entries()) {
      exported[`${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`] = this.exportToMarkdown(id) || ''
    }

    return exported
  }

  /**
   * 生成文档网站
   */
  generateDocumentationSite(): string {
    const documents = this.getAllDocuments({ published: true })

    const navigation = documents.map(doc =>
      `<li><a href="#${doc.id}">${doc.title}</a></li>`
    ).join('')

    const content = documents.map(doc => `
      <section id="${doc.id}">
        <h1>${doc.title}</h1>
        <div class="meta">
          <span>作者: ${doc.author}</span>
          <span>版本: ${doc.version}</span>
          <span>更新时间: ${new Date(doc.updatedAt).toLocaleDateString()}</span>
        </div>
        <div class="content">
          ${this.markdownToHTML(doc.content)}
        </div>
      </section>
    `).join('')

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>项目文档</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; }
        .container { display: flex; max-width: 1200px; margin: 0 auto; }
        .sidebar { width: 250px; background: #f8f9fa; padding: 20px; position: fixed; height: 100vh; overflow-y: auto; }
        .content { margin-left: 270px; padding: 20px; flex: 1; }
        .sidebar ul { list-style: none; padding: 0; }
        .sidebar li { margin-bottom: 10px; }
        .sidebar a { text-decoration: none; color: #333; padding: 5px 10px; display: block; border-radius: 3px; }
        .sidebar a:hover { background: #e9ecef; }
        .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
        .meta span { margin-right: 20px; }
        section { margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
        h1, h2, h3 { color: #333; }
        code { background: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <nav class="sidebar">
            <h2>文档导航</h2>
            <ul>
                ${navigation}
            </ul>
        </nav>
        <main class="content">
            ${content}
        </main>
    </div>
</body>
</html>
    `
  }

  /**
   * 简单的Markdown到HTML转换
   */
  private markdownToHTML(markdown: string): string {
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
      .replace(/`([^`]*)`/gim, '<code>$1</code>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n/gim, '<br>')
  }

  /**
   * 获取生成状态
   */
  getGeneratingStatus() {
    return computed(() => this.isGenerating.value)
  }

  /**
   * 获取文档统计
   */
  getStatistics() {
    return computed(() => {
      const documents = Array.from(this.documents.values())
      return {
        total: documents.length,
        published: documents.filter(doc => doc.published).length,
        byType: {
          api: documents.filter(doc => doc.type === DocumentationType.API).length,
          component: documents.filter(doc => doc.type === DocumentationType.COMPONENT).length,
          guide: documents.filter(doc => doc.type === DocumentationType.GUIDE).length,
          architecture: documents.filter(doc => doc.type === DocumentationType.ARCHITECTURE).length,
          changelog: documents.filter(doc => doc.type === DocumentationType.CHANGELOG).length
        }
      }
    })
  }
}

/**
 * 全局文档生成器实例
 */
export const documentationGenerator = new DocumentationGenerator()

/**
 * Vue 组合式函数
 */
export function useDocumentationGenerator() {
  return {
    generator: documentationGenerator,
    isGenerating: documentationGenerator.getGeneratingStatus(),
    statistics: documentationGenerator.getStatistics(),
    generateDocument: documentationGenerator.generateDocument.bind(documentationGenerator),
    getAllDocuments: documentationGenerator.getAllDocuments.bind(documentationGenerator),
    searchDocuments: documentationGenerator.searchDocuments.bind(documentationGenerator),
    exportAllDocuments: documentationGenerator.exportAllDocuments.bind(documentationGenerator),
    generateSite: documentationGenerator.generateDocumentationSite.bind(documentationGenerator)
  }
}
