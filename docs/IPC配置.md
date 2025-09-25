# IPC 配置指南

## 概述

本项目实现了一个类型安全的 IPC（进程间通信）系统，通过自动化的类型生成和路由管理，为 Electron 应用的主进程和渲染进程之间提供了便捷、安全的通信机制。

## 架构设计

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   渲染进程       │    │   预加载脚本      │    │   主进程        │
│                 │    │                  │    │                 │
│ api.ipcRouter   │◄──►│ contextBridge    │◄──►│ ipc-router      │
│                 │    │                  │    │                 │
│ 类型安全调用     │    │ 安全通信桥梁      │    │ 路由处理        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 开发流程

### 1. 定义 IPC 路由

在 `src/main/ipc-router/modules/` 目录下创建模块文件，像导出普通函数一样声明 IPC 路由：

```typescript
// src/main/ipc-router/modules/app.ts
import { app } from "electron";

/**
 * 获取应用版本
 */
export function getVersion(): string {
  return app.getVersion();
}

/**
 * 获取应用名称
 */
export function getName(): string {
  return app.getName();
}

/**
 * 获取系统信息
 */
export function getSystemInfo(): {
  platform: string;
  arch: string;
  version: string;
  uptime: number;
} {
  return {
    platform: process.platform,
    arch: process.arch,
    version: process.version,
    uptime: process.uptime(),
  };
}
```

### 2. 路由初始化

路由会在 `src/main/ipc-router/index.ts` 中自动初始化：

```typescript
// src/main/ipc-router/index.ts
import { initializeIpcRouter } from "./core";

// 自动扫描 modules 目录下的所有路由并初始化
initializeIpcRouter();
```

**路由命名规则**：

- 文件名作为前缀：`app`、`filesystem`、`log`、`store`、`window`
- 函数名转换为短横线格式：`getVersion` → `get-version`
- 最终路由名：`app-get-version`

### 3. 类型自动生成

运行类型生成脚本：

```bash
pnpm generate:ipc-types
```

该脚本会：

- 扫描 `src/main/ipc-router/modules/` 下的所有 TypeScript 文件
- 使用 `ts-morph` 解析函数签名、注释和类型信息
- 自动生成 `src/shared/typings/ipc-routes.ts` 类型定义文件

**生成的类型包括**：

- 函数接口定义
- 参数和返回值类型
- JSDoc 注释
- 路由信息常量

### 4. 客户端配置

通过 `src/shared/ipc-router-client.ts` 配置客户端：

```typescript
// src/shared/ipc-router-client.ts
import { ipcRenderer } from "electron";
import type { AllIpcRouter } from "./typings/ipc-routes";

// 创建类型安全的 IPC 客户端
export const ipcRouter = new Proxy({} as AllIpcRouter, {
  get(target, prop) {
    return (...args: any[]) => {
      return ipcRenderer.invoke(prop as string, ...args);
    };
  },
});
```

### 5. 预加载脚本暴露

在 `src/main/preloads/basic.ts` 中暴露 API：

```typescript
// src/main/preloads/basic.ts
import { contextBridge } from "electron";
import { ipcRouter } from "@shared/ipc-router-client";

contextBridge.exposeInMainWorld("electronAPI", {
  ipcRouter: ipcRouter,
});
```

### 6. 全局类型声明

在 `src/shared/typings/global.d.ts` 中声明全局类型：

```typescript
// src/shared/typings/global.d.ts
interface ElectronAPI {
  ipcRouter: AllIpcRouter;
}

declare global {
  const api: ElectronAPI;
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

## 使用方式

### 渲染进程调用

```typescript
// 方式1：使用全局 api 对象（推荐）
const appName = await naimo.router.appGetName();
const systemInfo = await naimo.router.appGetSystemInfo();

// 方式2：使用 window.electronAPI
const appName = await window.electronAPI.ipcRouter.appGetName();

// 方式3：直接导入（不推荐，需要额外配置）
import { ipcRouter } from "@shared/ipc-router-client";
const appName = await ipcRouter.appGetName();
```

### 支持两种命名风格

系统同时支持驼峰式和短横线式命名：

```typescript
// 驼峰式（推荐）
await naimo.router.appGetName();
await naimo.router.filesystemSelectFile(options);

// 短横线式
await api.ipcRouter["app-get-name"]();
await api.ipcRouter["filesystem-select-file"](options);
```

## 类型安全特性

### 1. 自动类型推导

```typescript
// 参数类型自动推导
const filePaths = await naimo.router.filesystemSelectFile({
  properties: ["openFile", "multiSelections"],
  filters: [{ name: "Images", extensions: ["jpg", "png", "gif"] }],
});
// filePaths 类型自动推导为 string[] | null
```

### 2. 返回值类型安全

```typescript
// 返回值类型自动推导
const systemInfo = await naimo.router.appGetSystemInfo();
// systemInfo 类型自动推导为：
// {
//   platform: string;
//   arch: string;
//   version: string;
//   uptime: number;
// }
```

### 3. 泛型支持

```typescript
// 支持泛型函数
export function getConfig<T extends keyof AppConfig>(key: T): AppConfig[T] {
  return store.get(key);
}

// 使用时类型安全
const theme = await naimo.router.storeGet("settings.theme"); // 类型为 string
const user = await naimo.router.storeGet("user"); // 类型为 UserConfig
```

## 开发最佳实践

### 1. 函数注释规范

```typescript
/**
 * 选择文件
 * @param options 对话框选项
 * @returns 选择的文件路径数组，如果取消则返回null
 */
export function selectFile(
  options: Electron.OpenDialogOptions
): Promise<string[] | null> {
  // 实现...
}
```

### 2. 错误处理

```typescript
/**
 * 获取日志数据
 * @returns 日志数据数组
 * @throws {Error} 当日志文件读取失败时抛出错误
 */
export function getLogs(): Promise<any[]> {
  try {
    // 实现...
  } catch (error) {
    log.error("获取日志失败", error);
    throw error;
  }
}
```

### 3. 参数验证

```typescript
/**
 * 设置存储数据
 * @param key 配置键名
 * @param value 配置值
 * @returns 是否设置成功
 */
export function set(key: keyof AppConfig, value: any): boolean {
  if (!key || value === undefined) {
    throw new Error("参数不能为空");
  }
  // 实现...
}
```

## 调试和开发

### 1. 查看路由信息

```typescript
import { ROUTE_INFO } from "@shared/typings/ipc-routes";

// 查看所有可用路由
console.log(ROUTE_INFO);
```

### 2. 类型检查

```typescript
// TypeScript 会在编译时检查类型
const result = await naimo.router.appGetName(); // ✅ 正确
const result = await naimo.router.nonExistentMethod(); // ❌ 编译错误
```

### 3. 开发工具支持

- **VS Code**: 完整的智能提示和类型检查
- **TypeScript**: 编译时类型验证
- **ESLint**: 代码质量检查

## 常见问题

### Q: 如何添加新的 IPC 路由？

A:

1. 在 `src/main/ipc-router/modules/` 下创建或编辑模块文件
2. 导出带注释和类型注解的函数
3. 运行 `pnpm generate:ipc-types` 重新生成类型
4. 在渲染进程中使用 `api.ipcRouter` 调用

### Q: 路由名称冲突怎么办？

A: 系统使用 `模块名-函数名` 的命名规则，不同模块下的同名函数不会冲突。

### Q: 如何调试 IPC 调用？

A:

1. 在主进程中添加日志记录
2. 使用 `naimo.log.debug()` 记录调用参数
3. 检查 `src/shared/typings/ipc-routes.ts` 中的类型定义

### Q: 支持异步函数吗？

A: 是的，所有 IPC 路由都返回 Promise，支持 async/await 语法。

## 性能优化

1. **批量调用**: 避免频繁的 IPC 调用，考虑批量处理
2. **缓存结果**: 对不经常变化的数据进行缓存
3. **错误重试**: 实现适当的错误重试机制
4. **类型优化**: 使用精确的类型定义减少运行时开销
