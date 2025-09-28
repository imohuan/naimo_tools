#!/usr/bin/env node

/**
 * 事件代码生成器
 * 基于 events.config.ts 生成主进程和渲染进程的类型安全事件方法
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 读取事件配置
const configPath = path.join(__dirname, '../src/shared/config/events.config.ts')
const configContent = fs.readFileSync(configPath, 'utf-8')

// 简单的解析器来提取事件名（更复杂的项目可以使用 TypeScript 编译器 API）
function extractEventNames(content) {
  const events = []
  // 标准化换行符
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  let inInterface = false
  let braceCount = 0

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (trimmedLine.includes('export interface EventsConfig')) {
      inInterface = true
      // 检查同一行是否有开括号
      if (trimmedLine.includes('{')) {
        braceCount++
      }
      continue
    }

    if (inInterface) {
      // 计算大括号来确定是否还在接口内
      const openBraces = (trimmedLine.match(/{/g) || []).length
      const closeBraces = (trimmedLine.match(/}/g) || []).length
      braceCount += openBraces - closeBraces

      // 如果大括号计数为0，说明接口结束
      if (braceCount <= 0) {
        break
      }

      // 匹配事件定义行
      const match = trimmedLine.match(/^'([^']+)':\s*{/)
      if (match) {
        events.push(match[1])
      }
    }
  }

  return events
}

// 转换函数
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
}

function toPascalCase(str) {
  const camel = toCamelCase(str)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

// 生成主进程事件发送方法（保持现有的）
function generateMainEvents(events) {
  const imports = `/**
 * 主进程事件发送方法（自动生成）
 * 基于 events.config.ts 自动生成，请勿手动修改
 */

import { WebContents } from 'electron'
import log from 'electron-log'
import type { EventsConfig, EventType, EventData } from '@shared/config/events.config'
`

  const functions = events.map(eventName => {
    const functionName = `send${toPascalCase(eventName)}`
    const dataType = `EventData<'${eventName}'>`

    return `/**
 * 发送 ${eventName} 事件
 * @param webContents 目标 WebContents
 * @param data 事件数据
 */
export function ${functionName}(
  webContents: WebContents,
  data: ${dataType}
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send('${eventName}', data)
    log.debug(\`事件已发送: ${eventName}\`, { data })
  } else {
    log.warn(\`无法发送事件: WebContents已销毁 - ${eventName}\`)
  }
}`
  }).join('\n\n')

  const eventObject = `
// 事件发送对象
export const mainEvents = {
${events.map(eventName => {
    const functionName = `send${toPascalCase(eventName)}`
    return `  ${toCamelCase(eventName)}: ${functionName}`
  }).join(',\n')}
}

// 类型安全的通用发送方法
export function sendEvent<T extends EventType>(
  webContents: WebContents,
  eventType: T,
  data: EventData<T>
): void {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send(eventType, data)
    log.debug(\`事件已发送: \${eventType}\`, { data })
  } else {
    log.warn(\`无法发送事件: WebContents已销毁 - \${eventType}\`)
  }
}`

  return imports + '\n' + functions + '\n' + eventObject
}

// 生成事件接口定义（类似 ipc-routes.ts）
function generateEventInterface(events) {
  const imports = `/**
 * 自动生成的事件类型定义
 * 生成时间: ${new Date().toISOString()}
 * 请勿手动修改此文件
 */

import type { EventsConfig, EventData } from '@shared/config/events.config'
`

  // 生成事件接口
  const eventInterface = `
// 事件接口定义
interface EventInterface {
${events.map(eventName => {
    const methodName = `on${toPascalCase(eventName)}`
    const comment = `/** 监听 ${eventName} 事件 */`
    return `  ${comment}
  "${eventName}": (handler: (event: any, data: EventData<'${eventName}'>) => void) => void;
  /** 监听 ${eventName} 事件 */
  "${methodName}": (handler: (event: any, data: EventData<'${eventName}'>) => void) => void;`
  }).join('\n\n')}
}`

  // 生成事件信息数组
  const eventInfo = `
// 事件信息常量
export const EVENT_INFO = [
${events.map(eventName => {
    return `  {
    name: "${eventName}",
    comment: "监听 ${eventName} 事件",
    method: "on${toPascalCase(eventName)}"
  }`
  }).join(',\n')}
];`

  // 生成类型导出
  const typeExports = `
// 合并所有事件接口类型
export interface AllEventRouter extends EventInterface {}

// 事件信息类型
export interface EventInfo {
  name: string;
  comment: string;
  method: string;
}

// 事件键类型
export type EventKey = keyof AllEventRouter;

// 获取事件处理器类型
export type EventHandlerType<T extends EventKey> = AllEventRouter[T] extends (handler: infer H) => void ? H : never;
`

  return imports + eventInterface + eventInfo + typeExports
}

// 删除这个函数，不再需要

// 主函数
function main() {
  console.log('🚀 开始生成事件代码...')

  const events = extractEventNames(configContent)
  console.log(`📋 发现 ${events.length} 个事件:`, events)

  // 确保输出目录存在
  const mainOutputDir = path.join(__dirname, '../src/main/ipc-router')
  const typingsOutputDir = path.join(__dirname, '../src/shared/typings')

  if (!fs.existsSync(mainOutputDir)) {
    fs.mkdirSync(mainOutputDir, { recursive: true })
  }

  if (!fs.existsSync(typingsOutputDir)) {
    fs.mkdirSync(typingsOutputDir, { recursive: true })
  }

  // 生成主进程文件
  const mainContent = generateMainEvents(events)
  fs.writeFileSync(path.join(mainOutputDir, 'main-events.ts'), mainContent)
  console.log('✅ 主进程事件文件已生成: src/main/ipc-router/main-events.ts')

  // 生成事件接口定义文件（类似 ipc-routes.ts）
  const eventInterfaceContent = generateEventInterface(events)
  fs.writeFileSync(path.join(typingsOutputDir, 'event-routes.ts'), eventInterfaceContent)
  console.log('✅ 事件接口文件已生成: src/shared/typings/event-routes.ts')

  console.log('🎉 事件代码生成完成！')
}

// 运行
main()
