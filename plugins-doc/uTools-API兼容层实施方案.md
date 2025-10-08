# Naimo Tools - uTools API 兼容层实施方案

> 版本：v1.0  
> 日期：2025-10-07  
> 目标：在 webpagePreload.ts 中实现 uTools API，提供插件开发兼容层

---

## 📋 目录

- [1. 方案概述](#1-方案概述)
- [2. API 分类与映射](#2-api-分类与映射)
- [3. 实施步骤](#3-实施步骤)
- [4. 类型定义](#4-类型定义)
- [5. 需要新增的 IPC 模块](#5-需要新增的-ipc-模块)
- [6. API 实现详情](#6-api-实现详情)
- [7. 测试方案](#7-测试方案)

---

## 1. 方案概述

### 1.1 设计目标

1. **兼容性**：提供 uTools API 风格的接口，降低插件开发者学习成本
2. **渐进式实现**：按优先级分阶段实现，优先实现高频使用的 API
3. **扩展性**：为未来功能扩展预留接口
4. **类型安全**：提供完整的 TypeScript 类型定义

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────┐
│           Plugin (插件应用)                          │
│  ┌─────────────────────────────────────────────┐   │
│  │  使用 naimo.* API                            │   │
│  │  - naimo.window.hide()                      │   │
│  │  - naimo.db.put()                           │   │
│  │  - naimo.system.showNotification()          │   │
│  └─────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│    webpagePreload.ts (API 暴露层)                   │
│  ┌──────────────────────────────────────────────┐  │
│  │  contextBridge.exposeInMainWorld('naimo')    │  │
│  │  - 窗口管理 (window)                          │  │
│  │  - 数据库 (db)                                │  │
│  │  - 系统操作 (system)                          │  │
│  │  - 事件系统 (events)                          │  │
│  │  - 复制粘贴 (clipboard)                       │  │
│  │  - 屏幕操作 (screen)                          │  │
│  │  - 日志 (log)                                 │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼ ipcRouter (IPC 通信)
┌─────────────────────────────────────────────────────┐
│   Main Process IPC Modules (主进程模块)             │
│  ┌──────────────────────────────────────────────┐  │
│  │  现有模块：                                   │  │
│  │  - app.ts                                    │  │
│  │  - clipboard.ts                              │  │
│  │  - window.ts                                 │  │
│  │  - store.ts                                  │  │
│  │  - screenCapture.ts                          │  │
│  │                                               │  │
│  │  新增模块：                                   │  │
│  │  - db.ts (数据库)                            │  │
│  │  - shell.ts (系统Shell操作)                  │  │
│  │  - display.ts (显示器信息)                   │  │
│  │  - dialog.ts (对话框)                        │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 2. API 分类与映射

### 2.1 优先级分类

#### 🔴 P0 - 核心必需（第一阶段）

必须立即实现的基础 API

| uTools API                          | Naimo API                      | 现有模块             | 新增模块             | 说明           |
| ----------------------------------- | ------------------------------ | -------------------- | -------------------- | -------------- |
| **窗口管理**                        |
| `hideMainWindow()`                  | `naimo.window.hide()`          | ✅ window.ts         | -                    | 隐藏窗口       |
| `showMainWindow()`                  | `naimo.window.show()`          | ✅ window.ts         | -                    | 显示窗口       |
| `outPlugin()`                       | `naimo.window.close()`         | ✅ window.ts         | -                    | 关闭插件       |
| `createBrowserWindow()`             | `naimo.window.create()`        | ✅ window.ts         | -                    | 创建新窗口     |
| **数据存储 - 文档数据库 (db)**      |
| `db.put()`                          | `naimo.db.put()`               | -                    | 🆕 db.ts (lowdb)     | 存储文档       |
| `db.get()`                          | `naimo.db.get()`               | -                    | 🆕 db.ts (lowdb)     | 获取文档       |
| `db.remove()`                       | `naimo.db.remove()`            | -                    | 🆕 db.ts (lowdb)     | 删除文档       |
| `db.allDocs()`                      | `naimo.db.allDocs()`           | -                    | 🆕 db.ts (lowdb)     | 获取所有文档   |
| **数据存储 - 键值存储 (dbStorage)** |
| `dbStorage.setItem()`               | `naimo.storage.setItem()`      | ✅ store.ts          | -                    | 存储键值对     |
| `dbStorage.getItem()`               | `naimo.storage.getItem()`      | ✅ store.ts          | -                    | 获取键值对     |
| `dbStorage.removeItem()`            | `naimo.storage.removeItem()`   | ✅ store.ts          | -                    | 删除键值对     |
| **复制粘贴**                        |
| `copyText()`                        | `naimo.clipboard.writeText()`  | ✅ clipboard.ts      | -                    | 复制文本       |
| `copyImage()`                       | `naimo.clipboard.writeImage()` | ✅ clipboard.ts      | -                    | 复制图片       |
| `copyFile()`                        | `naimo.clipboard.writeFiles()` | -                    | ⚠️ 扩展 clipboard.ts | 复制文件       |
| **系统操作**                        |
| `shellOpenPath()`                   | `naimo.shell.openPath()`       | -                    | 🆕 shell.ts          | 打开文件       |
| `shellOpenExternal()`               | `naimo.shell.openUrl()`        | -                    | 🆕 shell.ts          | 打开URL        |
| `shellShowItemInFolder()`           | `naimo.shell.showInFolder()`   | -                    | 🆕 shell.ts          | 在文件夹中显示 |
| `showNotification()`                | `naimo.system.notify()`        | -                    | 🆕 shell.ts          | 系统通知       |
| `getPath()`                         | `naimo.system.getPath()`       | -                    | 🆕 shell.ts          | 获取系统路径   |
| **事件系统**                        |
| `onPluginEnter()`                   | `naimo.onEnter()`              | ✅ 已在 preload 实现 | -                    | 插件进入事件   |
| `onPluginOut()`                     | `naimo.onExit()`               | -                    | ⚠️ 事件扩展          | 插件退出事件   |

#### 🟡 P1 - 重要功能（第二阶段）

常用但可以延后实现的 API

| uTools API                   | Naimo API                          | 现有模块            | 新增模块                 | 说明           |
| ---------------------------- | ---------------------------------- | ------------------- | ------------------------ | -------------- |
| **屏幕操作**                 |
| `screenCapture()`            | `naimo.screen.capture()`           | ✅ screenCapture.ts | -                        | 屏幕截图       |
| `screenColorPick()`          | `naimo.screen.pickColor()`         | -                   | ⚠️ 扩展 screenCapture.ts | 取色器         |
| `getCursorScreenPoint()`     | `naimo.screen.getCursorPosition()` | -                   | 🆕 display.ts            | 获取鼠标位置   |
| `getPrimaryDisplay()`        | `naimo.screen.getPrimaryDisplay()` | -                   | 🆕 display.ts            | 主显示器       |
| `getAllDisplays()`           | `naimo.screen.getAllDisplays()`    | -                   | 🆕 display.ts            | 所有显示器     |
| **窗口高级**                 |
| `setExpendHeight()`          | `naimo.window.setHeight()`         | ✅ window.ts        | -                        | 设置高度       |
| `setSubInput()`              | `naimo.window.setInput()`          | -                   | ⚠️ 窗口扩展              | 子输入框       |
| `showOpenDialog()`           | `naimo.dialog.showOpen()`          | -                   | 🆕 dialog.ts             | 打开文件对话框 |
| `showSaveDialog()`           | `naimo.dialog.showSave()`          | -                   | 🆕 dialog.ts             | 保存文件对话框 |
| **输入操作**                 |
| `hideMainWindowPasteText()`  | `naimo.input.pasteText()`          | -                   | 🆕 input.ts              | 粘贴文本       |
| `hideMainWindowPasteImage()` | `naimo.input.pasteImage()`         | -                   | 🆕 input.ts              | 粘贴图片       |
| `hideMainWindowPasteFile()`  | `naimo.input.pasteFile()`          | -                   | 🆕 input.ts              | 粘贴文件       |
| **系统信息**                 |
| `getNativeId()`              | `naimo.system.getDeviceId()`       | -                   | 🆕 shell.ts              | 设备ID         |
| `getAppVersion()`            | `naimo.system.getVersion()`        | ✅ app.ts           | -                        | 应用版本       |
| `isMacOS()`                  | `naimo.system.isMac()`             | ✅ app.ts           | -                        | 是否Mac        |
| `isWindows()`                | `naimo.system.isWindows()`         | ✅ app.ts           | -                        | 是否Windows    |
| `isLinux()`                  | `naimo.system.isLinux()`           | ✅ app.ts           | -                        | 是否Linux      |

#### 🟢 P2 - 扩展功能（第三阶段）

可选的高级功能

| uTools API            | Naimo API                     | 现有模块  | 新增模块             | 说明           |
| --------------------- | ----------------------------- | --------- | -------------------- | -------------- |
| **数据库高级**        |
| `db.bulkDocs()`       | `naimo.db.bulkPut()`          | -         | 🆕 db.ts             | 批量操作       |
| `db.postAttachment()` | `naimo.db.putAttachment()`    | -         | 🆕 db.ts             | 存储附件       |
| `db.getAttachment()`  | `naimo.db.getAttachment()`    | -         | 🆕 db.ts             | 获取附件       |
| **文件操作**          |
| `startDrag()`         | `naimo.drag.start()`          | -         | 🆕 drag.ts           | 拖拽文件       |
| `getCopyedFiles()`    | `naimo.clipboard.readFiles()` | -         | ⚠️ 扩展 clipboard.ts | 读取复制的文件 |
| **其他**              |
| `getFileIcon()`       | `naimo.system.getFileIcon()`  | ✅ app.ts | -                    | 获取文件图标   |
| `shellBeep()`         | `naimo.system.beep()`         | -         | 🆕 shell.ts          | 系统提示音     |
| `findInPage()`        | `naimo.window.findInPage()`   | -         | ⚠️ 窗口扩展          | 页面内查找     |

#### ⚪ P3 - 暂不实现

这些功能暂时不需要或复杂度较高

- FFmpeg API（媒体处理）- 需要额外依赖
- AI API - 需要第三方服务集成
- `redirect()` - 插件跳转功能需要完整的插件市场
- `onMainPush()` - 需要主搜索框集成
- `readCurrentFolderPath()` / `readCurrentBrowserUrl()` - 平台特定实现

---

## 3. 实施步骤

### Phase 1: 基础框架搭建（Week 1）

#### 3.1 创建类型定义文件

**文件：`src/shared/typings/naimoApiTypes.ts`**

```typescript
/**
 * Naimo API 类型定义
 * 兼容 uTools API 风格
 */

// ============ 数据库相关 ============
export interface DbDoc {
  _id: string;
  _rev?: string;
  [key: string]: any;
}

export interface DbResult {
  id: string;
  rev?: string;
  ok?: boolean;
  error?: boolean;
  name?: string;
  message?: string;
}

// ============ 窗口相关 ============
export interface BrowserWindowOptions {
  width?: number;
  height?: number;
  title?: string;
  show?: boolean;
  frame?: boolean;
  transparent?: boolean;
  alwaysOnTop?: boolean;
  resizable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  closable?: boolean;
}

// ============ 事件相关 ============
export interface PluginEnterParams {
  code: string;
  type: "text" | "files" | "img" | "regex" | "window";
  payload: any;
}

// ============ 剪贴板相关 ============
export interface CopiedFile {
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  name: string;
}

// ============ 显示器相关 ============
export interface Display {
  id: number;
  bounds: { x: number; y: number; width: number; height: number };
  workArea: { x: number; y: number; width: number; height: number };
  scaleFactor: number;
  rotation: number;
  internal: boolean;
}

// ============ 对话框相关 ============
export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: { name: string; extensions: string[] }[];
  properties?: (
    | "openFile"
    | "openDirectory"
    | "multiSelections"
    | "showHiddenFiles"
  )[];
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: { name: string; extensions: string[] }[];
}
```

#### 3.2 新建核心 IPC 模块

需要新建以下模块：

1. **`src/main/ipc-router/modules/db.ts`** - 数据库操作
2. **`src/main/ipc-router/modules/shell.ts`** - Shell 操作
3. **`src/main/ipc-router/modules/dialog.ts`** - 对话框
4. **`src/main/ipc-router/modules/display.ts`** - 显示器信息
5. **`src/main/ipc-router/modules/input.ts`** - 输入/粘贴操作

### Phase 2: P0 核心API实现（Week 2-3）

#### 步骤1：实现数据库模块

**重要说明**：uTools 有两个独立的数据存储系统

1. **文档数据库 (db.ts)** - 使用 **lowdb** 实现
   - 支持文档的 `_id` 和 `_rev` 版本控制
   - 提供 put/get/remove/allDocs/bulkDocs 等功能
   - 支持附件存储

2. **键值存储 (store.ts)** - 使用现有的 **electron-store**
   - 提供 setItem/getItem/removeItem（兼容 localStorage API）
   - 已经实现，无需新增代码

#### 步骤2：扩展现有模块

扩展 `clipboard.ts`、`window.ts` 等模块以支持新的 API

#### 步骤3：更新 webpagePreload.ts

在 `webpagePreload.ts` 中暴露所有 P0 API

### Phase 3: P1 重要功能（Week 4）

实现常用的屏幕、输入、对话框等功能

### Phase 4: P2 扩展功能（Week 5+）

根据实际需求逐步添加高级功能

---

## 4. 类型定义

完整的类型定义已在上面的 Phase 1 中给出，需要创建 `naimoApiTypes.ts` 文件。

---

## 5. 需要新增的 IPC 模块

### 5.1 数据库模块 (`db.ts`)

**功能**：提供 NoSQL 风格的文档数据库

**说明**：

uTools 提供了两个独立的数据存储系统：

1. **`utools.db.*`** - 文档数据库（类似 MongoDB）
   - 支持文档的 `_id` 和 `_rev` 版本控制
   - 提供 CRUD、批量操作、附件存储等高级功能
   - **实现方案：使用 `lowdb`**

2. **`utools.dbStorage.*`** - 简单键值存储（类似 localStorage）
   - 仅提供 setItem/getItem/removeItem 三个 API
   - **实现方案：使用现有的 `store.ts` 模块（基于 electron-store）**

**技术选型（针对 db 模块）**：

- ✅ **推荐：`lowdb`** - 轻量级 JSON 数据库，支持版本控制
  - 优点：简单易用、适合插件场景、性能足够
  - 支持同步/异步操作
  - 易于实现 \_rev 版本控制

- ❌ ~~`electron-store`~~ - 适合简单配置，不适合文档数据库
- ❌ ~~`level`~~ - 功能过于复杂，overkill

**两个存储系统的对比**：

| 特性         | db (文档数据库)                           | dbStorage (键值存储)                 |
| ------------ | ----------------------------------------- | ------------------------------------ |
| **实现技术** | lowdb                                     | electron-store                       |
| **数据结构** | 文档（带 \_id, \_rev）                    | 简单键值对                           |
| **API 风格** | NoSQL                                     | localStorage                         |
| **版本控制** | ✅ 支持 \_rev                             | ❌ 不支持                            |
| **批量操作** | ✅ bulkDocs                               | ❌ 不支持                            |
| **附件存储** | ✅ 支持                                   | ❌ 不支持                            |
| **查询能力** | ✅ 前缀查询、按 ID 查询                   | ❌ 仅支持精确 key                    |
| **使用场景** | 复杂数据、需要版本控制                    | 简单配置、缓存                       |
| **示例**     | `db.put({ _id: 'user-1', name: 'John' })` | `dbStorage.setItem('theme', 'dark')` |

**主要API (db.ts - 文档数据库)**：

```typescript
// 基础操作
export async function put(event, doc: DbDoc): Promise<DbResult>;
export async function get(event, id: string): Promise<DbDoc | null>;
export async function remove(event, id: string): Promise<DbResult>;
export async function allDocs(event, prefix?: string): Promise<DbDoc[]>;

// 批量操作
export async function bulkDocs(event, docs: DbDoc[]): Promise<DbResult[]>;

// 附件支持
export async function putAttachment(
  event,
  id: string,
  data: Buffer,
  type: string
): Promise<DbResult>;
export async function getAttachment(event, id: string): Promise<Buffer | null>;
```

**说明**：

- `store.ts` 模块已经存在，直接复用即可
- 仅需新增 `db.ts` 模块，使用 lowdb 实现文档数据库功能

### 5.2 Shell 操作模块 (`shell.ts`)

**功能**：系统 Shell 操作封装

**主要API**：

```typescript
export async function openPath(event, path: string): Promise<boolean>;
export async function openUrl(event, url: string): Promise<boolean>;
export async function showInFolder(event, path: string): Promise<void>;
export async function moveToTrash(event, path: string): Promise<boolean>;
export async function beep(event): Promise<void>;
export async function showNotification(event, message: string): Promise<void>;
export async function getPath(event, name: string): Promise<string>;
export async function getDeviceId(event): Promise<string>;
```

### 5.3 对话框模块 (`dialog.ts`)

**功能**：文件/文件夹选择对话框

**主要API**：

```typescript
export async function showOpenDialog(
  event,
  options: OpenDialogOptions
): Promise<string[] | undefined>;
export async function showSaveDialog(
  event,
  options: SaveDialogOptions
): Promise<string | undefined>;
export async function showMessageBox(event, options: any): Promise<any>;
```

### 5.4 显示器模块 (`display.ts`)

**功能**：显示器信息和屏幕坐标转换

**主要API**：

```typescript
export async function getPrimaryDisplay(event): Promise<Display>;
export async function getAllDisplays(event): Promise<Display[]>;
export async function getCursorPosition(
  event
): Promise<{ x: number; y: number }>;
export async function screenToDipPoint(
  event,
  point: { x: number; y: number }
): Promise<{ x: number; y: number }>;
export async function dipToScreenPoint(
  event,
  point: { x: number; y: number }
): Promise<{ x: number; y: number }>;
```

### 5.5 输入模块 (`input.ts`)

**功能**：模拟粘贴操作（复制 + 发送粘贴键）

**依赖**：需要 `robotjs` 或 `nut.js` 来模拟键盘

**主要API**：

```typescript
export async function pasteText(event, text: string): Promise<boolean>;
export async function pasteImage(
  event,
  imageData: string | Buffer
): Promise<boolean>;
export async function pasteFile(
  event,
  filePath: string | string[]
): Promise<boolean>;
export async function simulateKeyPress(event, key: string): Promise<boolean>;
```

---

## 6. API 实现详情

### 6.1 webpagePreload.ts 完整实现示例

```typescript
import { contextBridge, ipcRenderer } from "electron";
import log from "electron-log/renderer";
import { RendererErrorHandler } from "@libs/unhandled/renderer";
import { ipcRouter } from "@shared/utils/ipcRouterClient";
import { eventRouter } from "@shared/utils/eventRouterClient";

// @ts-ignore
const prefix = `${__METADATA__["fullPath"]?.split(":")?.[0] || __METADATA__["title"]}`;

/**
 * Naimo API - uTools 兼容层
 */
const naimo = {
  // ========== 日志系统 ==========
  log: {
    error: (message: string, ...args: any[]) =>
      log.error(prefix + message, ...args),
    warn: (message: string, ...args: any[]) =>
      log.warn(prefix + message, ...args),
    info: (message: string, ...args: any[]) =>
      log.info(prefix + message, ...args),
    debug: (message: string, ...args: any[]) =>
      log.debug(prefix + message, ...args),
    throw_error: (error: any, options?: { title?: string }) => {
      RendererErrorHandler.getInstance().logError(error, options);
    },
  },

  // ========== 窗口管理 ==========
  window: {
    hide: () => ipcRouter.invoke("window", "hideCurrentView"),
    show: () => ipcRouter.invoke("window", "showCurrentView"),
    close: () => ipcRouter.invoke("window", "closeCurrentView"),
    minimize: () => ipcRouter.invoke("window", "minimize"),
    maximize: () => ipcRouter.invoke("window", "maximize"),
    setHeight: (height: number) =>
      ipcRouter.invoke("window", "setHeight", height),
    setSize: (width: number, height: number) =>
      ipcRouter.invoke("window", "setSize", { width, height }),
    create: (url: string, options: any) =>
      ipcRouter.invoke("window", "createBrowserWindow", url, options),
  },

  // ========== 数据库 ==========
  db: {
    put: (doc: any) => ipcRouter.invoke("db", "put", doc),
    get: (id: string) => ipcRouter.invoke("db", "get", id),
    remove: (id: string) => ipcRouter.invoke("db", "remove", id),
    allDocs: (prefix?: string) => ipcRouter.invoke("db", "allDocs", prefix),
    bulkDocs: (docs: any[]) => ipcRouter.invoke("db", "bulkDocs", docs),
    putAttachment: (id: string, data: Buffer, type: string) =>
      ipcRouter.invoke("db", "putAttachment", id, data, type),
    getAttachment: (id: string) => ipcRouter.invoke("db", "getAttachment", id),
  },

  // ========== 简单键值存储 (dbStorage - 兼容 localStorage) ==========
  storage: {
    setItem: (key: string, value: any) =>
      ipcRouter.invoke("store", "set", key, value),
    getItem: (key: string) => ipcRouter.invoke("store", "get", key),
    removeItem: (key: string) => ipcRouter.invoke("store", "deleteKey", key),
    // 额外的辅助方法（非 uTools 原生）
    clear: () => ipcRouter.invoke("store", "clear"),
  },

  // ========== 剪贴板 ==========
  clipboard: {
    readText: () => ipcRouter.invoke("clipboard", "readText"),
    writeText: (text: string) =>
      ipcRouter.invoke("clipboard", "writeText", text),
    readImage: () => ipcRouter.invoke("clipboard", "readImageAsBase64"),
    writeImage: (imageData: string) =>
      ipcRouter.invoke("clipboard", "writeImage", imageData),
    writeFiles: (files: string[]) =>
      ipcRouter.invoke("clipboard", "writeFiles", files),
    readFiles: () => ipcRouter.invoke("clipboard", "readFiles"),
    clear: () => ipcRouter.invoke("clipboard", "clear"),
  },

  // ========== 系统操作 ==========
  shell: {
    openPath: (path: string) => ipcRouter.invoke("shell", "openPath", path),
    openUrl: (url: string) => ipcRouter.invoke("shell", "openUrl", url),
    showInFolder: (path: string) =>
      ipcRouter.invoke("shell", "showInFolder", path),
    moveToTrash: (path: string) =>
      ipcRouter.invoke("shell", "moveToTrash", path),
    beep: () => ipcRouter.invoke("shell", "beep"),
  },

  // ========== 系统信息 ==========
  system: {
    notify: (message: string, title?: string) =>
      ipcRouter.invoke("shell", "showNotification", message, title),
    getPath: (name: string) => ipcRouter.invoke("shell", "getPath", name),
    getDeviceId: () => ipcRouter.invoke("shell", "getDeviceId"),
    getVersion: () => ipcRouter.invoke("app", "getVersion"),
    getName: () => ipcRouter.invoke("app", "getName"),
    getFileIcon: (path: string) =>
      ipcRouter.invoke("app", "extractFileIcon", path),
    isMac: () =>
      ipcRouter
        .invoke("app", "getSystemInfo")
        .then((info) => info.platform === "darwin"),
    isWindows: () =>
      ipcRouter
        .invoke("app", "getSystemInfo")
        .then((info) => info.platform === "win32"),
    isLinux: () =>
      ipcRouter
        .invoke("app", "getSystemInfo")
        .then((info) => info.platform === "linux"),
  },

  // ========== 屏幕操作 ==========
  screen: {
    capture: () => ipcRouter.invoke("screenCapture", "capture"),
    pickColor: () => ipcRouter.invoke("screenCapture", "pickColor"),
    getCursorPosition: () => ipcRouter.invoke("display", "getCursorPosition"),
    getPrimaryDisplay: () => ipcRouter.invoke("display", "getPrimaryDisplay"),
    getAllDisplays: () => ipcRouter.invoke("display", "getAllDisplays"),
  },

  // ========== 对话框 ==========
  dialog: {
    showOpen: (options: any) =>
      ipcRouter.invoke("dialog", "showOpenDialog", options),
    showSave: (options: any) =>
      ipcRouter.invoke("dialog", "showSaveDialog", options),
  },

  // ========== 输入操作 ==========
  input: {
    pasteText: (text: string) => ipcRouter.invoke("input", "pasteText", text),
    pasteImage: (imageData: string) =>
      ipcRouter.invoke("input", "pasteImage", imageData),
    pasteFile: (filePath: string | string[]) =>
      ipcRouter.invoke("input", "pasteFile", filePath),
  },

  // ========== 事件系统 ==========
  onEnter: (callback: (params: any) => void) => {
    // 这个已经在 preload 中通过 module.exports 实现
    console.warn("请使用 module.exports 导出 onEnter 函数");
  },

  onExit: (callback: () => void) => {
    eventRouter.on("plugin:exit", callback);
  },
};

// 暴露到全局
contextBridge.exposeInMainWorld("naimo", naimo);

// 插件消息处理（保持原有逻辑）
eventRouter.onPluginMessage((event, data) => {
  try {
    const targetKey = data.fullPath.split(":").slice(1).join(":");
    const targetFunc = module.exports[targetKey];
    if (targetFunc && targetFunc?.onEnter) return targetFunc.onEnter(data.data);
    console.log("PRELOAD 收到主进程传递的参数失败:", {
      fullPath: data.fullPath,
      modules: module.exports,
      targetKey,
      targetFunc,
    });
  } catch (error) {
    console.log(error, { fullPath: data.fullPath, modules: module.exports });
    log.error("PRELOAD 收到主进程传递的参数失败:", error);
  }
});
```

---

## 7. 测试方案

### 7.1 单元测试

为每个新增的 IPC 模块编写单元测试

### 7.2 集成测试

创建测试插件验证 API 功能

**测试插件示例：`plugins-test/api-test-plugin`**

```javascript
// preload.js
module.exports = {
  "api-test": {
    onEnter: async (params) => {
      // 测试窗口 API
      console.log("测试窗口 API");
      await naimo.window.setHeight(600);

      // 测试文档数据库 API (db)
      console.log("测试文档数据库 API");
      const doc = {
        _id: "test-1",
        name: "Test Document",
        data: { foo: "bar" },
      };
      const result = await naimo.db.put(doc);
      console.log("插入结果:", result);

      const retrieved = await naimo.db.get("test-1");
      console.log("读取结果:", retrieved);

      // 测试键值存储 API (dbStorage)
      console.log("测试键值存储 API");
      naimo.storage.setItem("user-theme", "dark");
      naimo.storage.setItem("user-lang", "zh-CN");
      console.log("主题:", naimo.storage.getItem("user-theme"));
      console.log("语言:", naimo.storage.getItem("user-lang"));

      // 测试剪贴板 API
      console.log("测试剪贴板 API");
      await naimo.clipboard.writeText("Hello Naimo");
      const text = await naimo.clipboard.readText();
      console.log("剪贴板内容:", text);

      // 测试系统 API
      console.log("测试系统 API");
      naimo.system.notify("测试通知", "Naimo Tools");
      const version = await naimo.system.getVersion();
      console.log("应用版本:", version);
    },
  },
};
```

---

## 8. 总结

### 8.1 实施优先级

1. **Week 1**: 基础框架 + 类型定义
   - 创建 `naimoApiTypes.ts` 类型定义文件
   - 安装 lowdb 依赖包
2. **Week 2-3**: P0 核心 API（窗口、数据库、剪贴板、基础系统操作）
   - ✅ 窗口管理 API（已有 window.ts）
   - 🆕 实现 db.ts（使用 lowdb）
   - ✅ 键值存储 API（已有 store.ts）
   - ✅ 剪贴板 API（已有 clipboard.ts）
   - 🆕 实现 shell.ts（系统操作）
   - 🔄 更新 webpagePreload.ts 暴露所有 API
3. **Week 4**: P1 重要功能（屏幕、对话框、输入）
   - 🆕 实现 display.ts（显示器信息）
   - 🆕 实现 dialog.ts（对话框）
   - 🆕 实现 input.ts（输入模拟）
   - ⚠️ 扩展 screenCapture.ts（取色器）
4. **Week 5+**: P2 扩展功能（按需实现）
   - 数据库附件功能
   - 文件拖拽
   - 其他高级功能

### 8.2 技术栈

**新增依赖**：

- **文档数据库**: `lowdb@6` - 轻量级 JSON 数据库
- **输入模拟**: `@nut-tree/nut-js@3` - 跨平台键盘鼠标自动化（可选）

**复用现有技术**：

- **键值存储**: `electron-store` - 已在 store.ts 中使用
- **Shell 操作**: Electron `shell` 模块
- **对话框**: Electron `dialog` 模块
- **显示器**: Electron `screen` 模块
- **剪贴板**: Electron `clipboard` 模块（已实现）

### 8.3 注意事项

1. **向后兼容**：保持现有 `naimo.log` API 不变
2. **两个存储系统**：
   - `naimo.db.*` - 文档数据库（lowdb），支持版本控制
   - `naimo.storage.*` - 键值存储（electron-store），兼容 localStorage
3. **渐进式实现**：优先实现高频 API
4. **文档同步**：更新插件开发文档，说明两个存储系统的区别
5. **类型安全**：提供完整 TypeScript 定义
6. **错误处理**：所有 API 需要完善的错误处理
7. **数据隔离**：每个插件的数据应该独立存储，避免冲突

---

## 附录

### A. 依赖包列表

需要安装的新依赖：

```json
{
  "dependencies": {
    "lowdb": "^6.0.0", // 数据库
    "@nut-tree/nut-js": "^3.0.0" // 输入模拟（可选）
  }
}
```

### B. 参考资料

- [uTools 官方文档](https://u.tools/docs/developer/api.html)
- [Electron API 文档](https://www.electronjs.org/docs/latest/api/app)
- [lowdb 文档](https://github.com/typicode/lowdb)
