# Project Structure

## Directory Organization

```
naimo_tools/
├── src/                        # 主要源代码目录
│   ├── main/                   # Electron 主进程代码
│   │   ├── config/             # 应用配置管理
│   │   │   ├── app.config.ts   # 应用全局配置
│   │   │   ├── log.config.ts   # 日志系统配置
│   │   │   ├── window.config.ts # 窗口配置
│   │   │   └── window-manager.ts # 窗口管理器
│   │   ├── ipc-router/         # IPC 通信路由系统
│   │   │   ├── core.ts         # 路由核心逻辑
│   │   │   ├── custom-on.ts    # 自定义事件处理
│   │   │   ├── index.ts        # 路由系统入口
│   │   │   ├── utils.ts        # 路由工具函数
│   │   │   └── modules/        # 功能模块路由
│   │   │       ├── app.ts      # 应用相关功能
│   │   │       ├── clipboard.ts # 剪贴板操作
│   │   │       ├── filesystem.ts # 文件系统操作
│   │   │       ├── hotkey.ts   # 快捷键管理
│   │   │       ├── log.ts      # 日志管理
│   │   │       ├── plugin.ts   # 插件系统
│   │   │       ├── screenCapture.ts # 屏幕截图
│   │   │       ├── store.ts    # 数据存储
│   │   │       └── window.ts   # 窗口管理
│   │   ├── preloads/           # 预加载脚本
│   │   │   ├── basic.ts        # 基础预加载脚本
│   │   │   └── webpage-preload.ts # 网页预加载脚本
│   │   ├── services/           # 业务服务层
│   │   │   └── app.service.ts  # 应用服务
│   │   ├── workers/            # 工作线程
│   │   │   └── icon-worker.ts  # 图标处理工作线程
│   │   ├── main.ts             # 主进程入口
│   │   └── utils.ts            # 主进程工具函数
│   ├── renderer/               # Electron 渲染进程代码
│   │   ├── src/                # Vue.js 应用源码
│   │   │   ├── components/     # 通用 Vue 组件
│   │   │   │   ├── AppButton.vue # 按钮组件
│   │   │   │   ├── AppCard.vue # 卡片组件
│   │   │   │   ├── AppModal.vue # 模态框组件
│   │   │   │   ├── ContextMenu.vue # 右键菜单
│   │   │   │   ├── ImageCropper.vue # 图片裁剪器
│   │   │   │   ├── PluginCard.vue # 插件卡片
│   │   │   │   └── WindowFrame.vue # 窗口框架
│   │   │   ├── composables/    # Vue 组合式函数
│   │   │   │   ├── useClipboard.ts # 剪贴板操作
│   │   │   │   ├── useDownload.ts # 下载管理
│   │   │   │   ├── useHotkey.ts # 快捷键绑定
│   │   │   │   ├── useIpcClient.ts # IPC 客户端
│   │   │   │   ├── useLogger.ts # 日志记录
│   │   │   │   ├── useModal.ts # 模态框控制
│   │   │   │   ├── usePlugin.ts # 插件管理
│   │   │   │   └── useStorage.ts # 存储管理
│   │   │   ├── core/           # 核心业务逻辑
│   │   │   │   ├── api/        # API 接口定义
│   │   │   │   ├── config/     # 配置管理
│   │   │   │   ├── constants/  # 常量定义
│   │   │   │   ├── events/     # 事件系统
│   │   │   │   ├── ipc/        # IPC 客户端封装
│   │   │   │   ├── logger/     # 日志系统
│   │   │   │   ├── plugin/     # 插件系统核心
│   │   │   │   ├── storage/    # 存储系统
│   │   │   │   ├── theme/      # 主题系统
│   │   │   │   ├── types/      # 类型定义
│   │   │   │   └── utils/      # 工具函数
│   │   │   ├── modules/        # 功能模块
│   │   │   │   ├── app/        # 应用模块
│   │   │   │   ├── clipboard/  # 剪贴板模块
│   │   │   │   ├── download/   # 下载模块
│   │   │   │   ├── hotkey/     # 快捷键模块
│   │   │   │   ├── logger/     # 日志模块
│   │   │   │   ├── plugin/     # 插件模块
│   │   │   │   ├── screenshot/ # 截图模块
│   │   │   │   ├── search/     # 搜索模块
│   │   │   │   ├── settings/   # 设置模块
│   │   │   │   ├── storage/    # 存储模块
│   │   │   │   └── window/     # 窗口模块
│   │   │   ├── pages/          # 特殊页面
│   │   │   │   └── crop-window/ # 裁剪窗口页面
│   │   │   │       ├── index.html # 裁剪页面模板
│   │   │   │       ├── index.ts # 裁剪页面入口
│   │   │   │       ├── script.ts # 裁剪逻辑
│   │   │   │       └── style.css # 裁剪样式
│   │   │   ├── store/          # Pinia 状态管理
│   │   │   │   ├── app.ts      # 应用状态
│   │   │   │   ├── plugin.ts   # 插件状态
│   │   │   │   └── user.ts     # 用户状态
│   │   │   ├── typings/        # 类型定义文件
│   │   │   │   ├── api.ts      # API 类型
│   │   │   │   ├── ipc.ts      # IPC 类型
│   │   │   │   ├── plugin.ts   # 插件类型
│   │   │   │   └── window.ts   # 窗口类型
│   │   │   ├── utils/          # 渲染进程工具
│   │   │   │   ├── common.ts   # 通用工具
│   │   │   │   ├── format.ts   # 格式化工具
│   │   │   │   ├── dom.ts      # DOM 操作工具
│   │   │   │   └── validate.ts # 验证工具
│   │   │   ├── App.vue         # 根组件
│   │   │   ├── main.ts         # 渲染进程入口
│   │   │   ├── style.css       # 全局样式
│   │   │   └── Test.vue        # 测试组件
│   │   ├── public/             # 静态资源
│   │   │   └── log-viewer.html # 日志查看器页面
│   │   ├── index.html          # 主页面模板
│   │   ├── package.json        # 渲染进程依赖
│   │   ├── tsconfig.*.json     # TypeScript 配置
│   │   └── vite.config.ts      # Vite 构建配置
│   ├── shared/                 # 共享代码
│   │   ├── typings/            # 共享类型定义
│   │   │   ├── electron-store.d.ts # Store 类型
│   │   │   ├── global.d.ts     # 全局类型
│   │   │   └── ipc-routes.ts   # IPC 路由类型
│   │   ├── ipc-router-client.ts # IPC 客户端
│   │   ├── types.ts            # 共享类型
│   │   └── utils.ts            # 共享工具
│   └── libs/                   # 自定义库
│       ├── app-search/         # 应用搜索库
│       │   ├── icon-extractor.ts # 图标提取
│       │   ├── index.ts        # 库入口
│       │   └── package.json    # 库配置
│       ├── auto-puppeteer/     # 自动化库
│       │   ├── main.ts         # 主进程模块
│       │   ├── renderer.ts     # 渲染进程模块
│       │   ├── typings.ts      # 类型定义
│       │   └── package.json    # 库配置
│       ├── download-manager/   # 下载管理库
│       │   ├── main.ts         # 主进程模块
│       │   ├── renderer.ts     # 渲染进程模块
│       │   ├── typings.ts      # 类型定义
│       │   └── package.json    # 库配置
│       └── unhandled/          # 错误处理库
│           ├── common.ts       # 通用处理
│           ├── config.ts       # 配置
│           ├── main.ts         # 主进程处理
│           └── renderer.ts     # 渲染进程处理
├── scripts/                    # 构建和开发脚本
│   ├── build.js                # 生产环境构建
│   ├── dev.js                  # 开发环境启动
│   ├── generate-ipc-types.js   # IPC 类型生成
│   ├── test-package.js         # 包测试
│   └── version.js              # 版本管理
├── plugins/                    # 插件目录
│   ├── ocr-trans-plugin/       # OCR 翻译插件
│   └── translate-plugin/       # 翻译插件
├── docs/                       # 项目文档
├── setup/                      # 安装包配置
├── dist/                       # 构建输出
├── out/                        # 打包输出
└── 配置文件                     # 项目配置文件
    ├── package.json            # 项目依赖和脚本
    ├── tsconfig.json           # TypeScript 配置
    ├── forge.config.js         # Electron Forge 配置
    ├── vite.config.ts          # Vite 配置
    └── pnpm-workspace.yaml     # PNPM 工作空间配置
```

## Naming Conventions

### Files

- **组件文件**: `PascalCase.vue` (如 `AppButton.vue`, `PluginCard.vue`)
- **服务文件**: `camelCase.ts` (如 `app.service.ts`, `plugin.service.ts`)
- **工具文件**: `camelCase.ts` (如 `utils.ts`, `format.ts`, `validate.ts`)
- **配置文件**: `kebab-case.ts` (如 `app.config.ts`, `window.config.ts`)
- **类型文件**: `camelCase.ts` 或 `kebab-case.d.ts` (如 `types.ts`, `global.d.ts`)
- **模块文件**: `camelCase.ts` (如 `index.ts`, `main.ts`, `renderer.ts`)

### Code

- **类/接口**: `PascalCase` (如 `IpcRouter`, `WindowManager`, `PluginConfig`)
- **函数/方法**: `camelCase` (如 `getIpcRouter`, `registerModule`, `createWindow`)
- **常量**: `UPPER_SNAKE_CASE` (如 `DEFAULT_CONFIG`, `MAX_FILE_SIZE`)
- **变量**: `camelCase` (如 `windowManager`, `pluginList`, `userConfig`)
- **枚举**: `PascalCase` (如 `LogLevel`, `WindowType`, `PluginStatus`)

### Directories

- **功能模块**: `kebab-case` (如 `ipc-router`, `auto-puppeteer`, `crop-window`)
- **组件目录**: `camelCase` (如 `components`, `composables`, `modules`)
- **配置目录**: `camelCase` (如 `config`, `typings`, `utils`)

## Import Patterns

### Import Order

1. **Node.js 内置模块**: `import { app } from 'electron'`
2. **第三方依赖**: `import Vue from 'vue'`, `import log from 'electron-log'`
3. **内部模块 (绝对路径)**: `import { getIpcRouter } from '@main/ipc-router'`
4. **内部模块 (相对路径)**: `import { utils } from './utils'`
5. **类型导入**: `import type { IpcRouter } from './types'`
6. **样式导入**: `import './style.css'`

### Module/Package Organization

```typescript
// 绝对路径导入 (推荐用于跨模块引用)
import { IpcRouter } from "@main/ipc-router/core";
import { WindowManager } from "@main/config/window-manager";
import { usePlugin } from "@renderer/composables/usePlugin";

// 相对路径导入 (用于同模块内引用)
import { RouteKeyConverter } from "./utils";
import { RouteInfo } from "../types";

// 类型专用导入
import type { Plugin, PluginConfig } from "@shared/types";

// 动态导入 (用于插件系统)
const plugin = await import(`./plugins/${pluginName}`);
```

### Path Alias Configuration

```typescript
// tsconfig.json 路径映射
"paths": {
  "@main/*": ["src/main/*"],
  "@renderer/*": ["src/renderer/*"],
  "@shared/*": ["src/shared/*"],
  "@libs/*": ["src/libs/*"]
}
```

## Code Structure Patterns

### Module/Class Organization

```typescript
// 1. 导入声明 (按上述顺序)
import { ipcMain } from "electron";
import log from "electron-log";
import { RouteKeyConverter } from "./utils";
import type { RouteInfo } from "./types";

// 2. 类型定义和接口
export interface RouteInfo {
  moduleName: string;
  functionName: string;
  comment: string;
  registeredAt: Date;
}

// 3. 常量和配置
const DEFAULT_TIMEOUT = 5000;
const MAX_ROUTES = 1000;

// 4. 主要实现 (类或函数)
export class IpcRouter {
  private static instance: IpcRouter;
  private handlers = new Map<string, Function>();

  // 构造函数
  private constructor() {}

  // 静态方法
  static getInstance(): IpcRouter {
    // 实现单例模式
  }

  // 公共方法
  register(moduleName: string, functionName: string, handler: Function): void {
    // 注册路由
  }

  // 私有方法
  private validateRoute(routeKey: string): boolean {
    // 验证路由
  }
}

// 5. 工具函数
function createRouteKey(moduleName: string, functionName: string): string {
  return `${moduleName}-${functionName}`;
}

// 6. 默认导出和命名导出
export { IpcRouter };
export default IpcRouter;
```

### Function/Method Organization

```typescript
export async function downloadFile(
  url: string,
  destination: string
): Promise<string> {
  // 1. 输入验证
  if (!url || !destination) {
    throw new Error("URL and destination are required");
  }

  // 2. 变量声明和初始化
  const startTime = Date.now();
  let downloadPath: string;

  try {
    // 3. 核心业务逻辑
    log.info(`开始下载文件: ${url}`);
    downloadPath = await performDownload(url, destination);

    // 4. 成功处理
    const duration = Date.now() - startTime;
    log.info(`文件下载完成: ${downloadPath} (${duration}ms)`);

    return downloadPath;
  } catch (error) {
    // 5. 错误处理
    log.error(`文件下载失败: ${url}`, error);
    throw error;
  }
}
```

### File Organization Principles

```typescript
// 每个文件遵循单一职责原则
// 例如：src/main/ipc-router/core.ts 只负责 IPC 路由核心逻辑

// 公共 API 放在文件顶部或专用的 index.ts
export { IpcRouter, getIpcRouter } from "./core";
export type { RouteInfo } from "./types";

// 实现细节在各自的文件中隐藏
// 不直接导出内部使用的工具函数和类
```

## Code Organization Principles

### 1. Single Responsibility (单一职责)

- **文件级别**: 每个文件专注于一个特定功能或概念
  - `ipc-router/core.ts`: 只处理 IPC 路由注册和管理
  - `config/window-manager.ts`: 只处理窗口创建和管理
  - `composables/usePlugin.ts`: 只处理插件相关的组合式逻辑

### 2. Modularity (模块化)

- **功能模块**: 按业务功能划分模块 (`plugin/`, `download/`, `screenshot/`)
- **技术模块**: 按技术层次划分模块 (`ipc-router/`, `config/`, `services/`)
- **可重用性**: 提取通用逻辑到 `utils/`, `composables/`, `shared/`

### 3. Testability (可测试性)

- **依赖注入**: 通过参数传递依赖，而不是硬编码
- **函数式设计**: 纯函数优先，减少副作用
- **接口抽象**: 使用接口定义契约，便于模拟和测试

### 4. Consistency (一致性)

- **命名规范**: 整个项目遵循统一的命名约定
- **文件结构**: 相似功能的文件使用相同的组织结构
- **代码风格**: 使用 ESLint 和 Prettier 确保代码风格一致

## Module Boundaries

### Core vs Plugins

- **Core**: `src/main/`, `src/renderer/`, `src/shared/` - 核心应用逻辑
- **Plugins**: `plugins/` - 可选的扩展功能，运行在沙盒环境中
- **边界**: 插件通过标准化 API 与核心交互，不能直接访问核心内部实现

### Public API vs Internal

- **Public API**:
  - `src/shared/types.ts` - 对外暴露的类型定义
  - `src/main/ipc-router/modules/` - IPC 路由模块 (对渲染进程可见)
  - `src/renderer/composables/` - 组合式函数 (对组件可见)
- **Internal**:
  - `src/main/services/` - 内部服务实现
  - `src/renderer/core/` - 内部业务逻辑
  - `**/utils.ts` - 模块内部工具函数

### Process Isolation

- **Main Process**: `src/main/` - 系统 API 访问，生命周期管理
- **Renderer Process**: `src/renderer/` - UI 逻辑，用户交互
- **Preload Scripts**: `src/main/preloads/` - 安全的进程间桥接
- **边界**: 通过 IPC 通信，严格的上下文隔离

### Feature Modules

- **Independent**: 每个模块可以独立开发和测试
- **Minimal Dependencies**: 模块间依赖最小化，避免循环依赖
- **Clear Interfaces**: 模块间通过明确的接口交互

### Dependencies Direction

```
渲染进程 UI 层
    ↓ (使用)
渲染进程 Composables 层
    ↓ (使用)
渲染进程 Core 层
    ↓ (IPC 调用)
主进程 IPC Router 层
    ↓ (调用)
主进程 Services 层
    ↓ (使用)
共享 Utils 和 Types 层
```

## Code Size Guidelines

### File Size

- **组件文件**: 最大 300 行 (Vue SFC)
- **逻辑文件**: 最大 500 行 (TypeScript)
- **配置文件**: 最大 200 行
- **工具文件**: 最大 150 行

### Function/Method Size

- **普通函数**: 最大 50 行
- **复杂业务函数**: 最大 100 行
- **初始化函数**: 最大 80 行
- **工具函数**: 最大 30 行

### Class/Module Complexity

- **类的方法数**: 最大 20 个公共方法
- **函数参数数**: 最大 5 个参数 (推荐使用对象参数)
- **圈复杂度**: 单个函数最大 10

### Nesting Depth

- **条件嵌套**: 最大 3 层
- **循环嵌套**: 最大 2 层
- **回调嵌套**: 使用 async/await 避免深层嵌套

## Dashboard/Monitoring Structure

### Spec Workflow Dashboard

```
.spec-workflow/                 # Spec 工作流相关
├── templates/                  # 文档模板
├── user-templates/             # 用户自定义模板
├── steering/                   # 指导文档
├── approvals/                  # 审批记录
├── specs/                      # 规格文档
└── archive/                    # 归档文件
```

### Log Viewer Dashboard

```
src/renderer/public/
└── log-viewer.html             # 独立的日志查看器
    ├── HTML 结构              # 日志显示界面
    ├── CSS 样式               # 日志查看器样式
    └── JavaScript 逻辑        # 日志过滤和搜索
```

### Development Dashboard

```
开发环境监控:
- Vite 开发服务器状态
- TypeScript 编译状态
- Electron 进程状态
- 热重载状态监控
```

### Separation of Concerns

- **Spec Workflow**: 独立的文档管理系统，不影响核心应用
- **Log Viewer**: 可选的调试工具，可以独立运行
- **Development Tools**: 开发时工具，生产环境自动禁用
- **Plugin Dashboard**: 插件管理界面，与核心 UI 分离

## Documentation Standards

### API Documentation

- **所有公共 API 必须有 JSDoc 注释**

```typescript
/**
 * 注册 IPC 路由处理器
 * @param moduleName 模块名称 (如 'app', 'window')
 * @param functionName 函数名称
 * @param handler 处理函数
 * @param comment 可选的注释说明
 */
register(moduleName: string, functionName: string, handler: Function, comment?: string): void
```

### Inline Comments

- **复杂逻辑必须有注释说明**

```typescript
// 使用 ts-morph 解析 TypeScript 源码，提取函数签名和注释
const sourceFile = project.addSourceFileAtPath(filePath);
const exportedDeclarations = sourceFile.getExportedDeclarations();

// 遍历所有导出的函数，生成类型定义
for (const [name, declarations] of exportedDeclarations) {
  // 处理函数声明...
}
```

### Module Documentation

- **主要模块需要 README 文件**
  - `src/libs/download-manager/README.md`
  - `src/libs/auto-puppeteer/README.md`
  - `docs/` 目录下的功能文档

### Code Examples

- **复杂功能提供使用示例**

```typescript
// 使用示例：注册新的 IPC 路由
const router = getIpcRouter();
router.register("myModule", "myFunction", async (param1, param2) => {
  return `Hello ${param1} and ${param2}`;
});

// 渲染进程调用
const result = await naimo.router.myModuleMyFunction("World", "Universe");
```

### Language-specific Conventions

- **TypeScript**: 使用 JSDoc 标准
- **Vue**: 使用 Vue 组件文档规范
- **Markdown**: 遵循 CommonMark 标准
- **配置文件**: 内联注释解释关键配置项
