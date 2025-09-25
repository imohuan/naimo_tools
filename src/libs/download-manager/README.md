# Electron 下载管理器

一个基于 `electron-dl-manager` 的完整文件下载管理解决方案，为 Electron 应用程序提供强大的下载功能。

## 功能特性

- ✅ **完整下载管理**: 支持开始、暂停、恢复、取消下载
- ✅ **进度跟踪**: 实时下载进度和状态更新
- ✅ **另存为对话框**: 支持用户选择保存位置
- ✅ **持久化下载**: 应用关闭时自动保存下载状态，重启后可恢复
- ✅ **多下载支持**: 同时管理多个下载任务
- ✅ **错误处理**: 完善的错误处理和回调机制
- ✅ **事件系统**: 丰富的事件回调，支持所有下载状态变化
- ✅ **TypeScript 支持**: 完整的类型定义

## 安装

```bash
pnpm add electron-dl-manager
```

## 快速开始

### 1. 初始化下载管理器

```typescript
import { DownloadManagerMain } from "./main";

// 在主进程中初始化
const downloadManager = DownloadManagerMain.getInstance();
await downloadManager.initialize(mainWindow);
```

### 2. 在渲染进程中使用

```typescript
import { downloadManagerRenderer } from "./renderer";
import { DownloadParams } from "./typings";

// 开始下载
const downloadId = await downloadManagerRenderer.startDownload({
  url: "https://example.com/file.zip",
  directory: "/path/to/downloads",
  saveAsFilename: "example-file.zip",
  overwrite: true,
});
```

### 3. 基本下载

```typescript
// 在渲染进程中
const downloadId = await window.electronAPI.invoke("start-download", {
  url: "https://example.com/file.zip",
  directory: "/path/to/downloads",
  saveAsFilename: "example-file.zip",
  overwrite: true,
});
```

### 4. 带另存为对话框的下载

```typescript
const downloadId = await window.electronAPI.invoke("start-download", {
  url: "https://example.com/file.zip",
  showSaveDialog: true,
  saveDialogOptions: {
    title: "保存文件",
    defaultPath: "~/Downloads/example-file.zip",
  },
});
```

### 5. 持久化下载

```typescript
const downloadId = await window.electronAPI.invoke("start-download", {
  url: "https://example.com/large-file.zip",
  directory: "/path/to/downloads",
  saveAsFilename: "large-file.zip",
  persistOnAppClose: true, // 应用关闭时自动保存状态
});
```

## 类型导出

所有类型定义都可以从 `./typings` 模块导入：

```typescript
import {
  DownloadParams,
  DownloadStatus,
  DownloadEvents,
  DownloadEventCallback,
  DownloadManagerConfig,
} from "./typings";
```

## API 参考

### 下载参数 (DownloadParams)

```typescript
interface DownloadParams {
  /** 下载链接 */
  url: string;
  /** 保存路径 */
  filePath?: string;
  /** 保存目录 */
  directory?: string;
  /** 文件名 */
  saveAsFilename?: string;
  /** 是否显示另存为对话框 */
  showSaveDialog?: boolean;
  /** 另存为对话框选项 */
  saveDialogOptions?: {
    title?: string;
    defaultPath?: string;
  };
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean;
  /** 是否在应用关闭时持久化下载 */
  persistOnAppClose?: boolean;
  /** 附加元数据 */
  metadata?: any;
}
```

### 下载状态 (DownloadStatus)

```typescript
interface DownloadStatus {
  /** 下载ID */
  id: string;
  /** 下载链接 */
  url: string;
  /** 保存路径 */
  filePath: string;
  /** 文件名 */
  filename: string;
  /** 下载进度（0-100） */
  progress: number;
  /** 下载状态 */
  status:
    | "pending"
    | "downloading"
    | "completed"
    | "paused"
    | "cancelled"
    | "error"
    | "interrupted";
  /** 已接收字节数 */
  bytesReceived: number;
  /** 总字节数 */
  totalBytes: number;
  /** 下载速率（字节/秒） */
  downloadRate: number;
  /** 估计剩余时间（秒） */
  estimatedTimeRemaining: number;
  /** 附加元数据 */
  metadata?: any;
}
```

## IPC 方法

### 下载控制

- `start-download`: 开始下载
- `pause-download`: 暂停下载
- `resume-download`: 恢复下载
- `cancel-download`: 取消下载
- `restore-download`: 从持久化数据恢复下载

### 状态查询

- `get-download-status`: 获取指定下载的状态
- `get-all-downloads`: 获取所有下载列表
- `get-active-download-count`: 获取活动下载数量

### 文件操作

- `select-download-directory`: 选择下载目录
- `open-download-folder`: 打开下载文件夹

## 事件监听

```typescript
// 监听下载开始
window.electronAPI.on("download-started", (data) => {
  console.log("下载开始:", data);
});

// 监听下载进度
window.electronAPI.on("download-progress", (data) => {
  console.log(`下载进度 ${data.id}: ${data.progress}%`);
});

// 监听下载完成
window.electronAPI.on("download-completed", (data) => {
  console.log("下载完成:", data);
});

// 监听下载错误
window.electronAPI.on("download-error", (data) => {
  console.error("下载错误:", data);
});

// 监听下载暂停
window.electronAPI.on("download-paused", (data) => {
  console.log("下载暂停:", data);
});

// 监听下载恢复
window.electronAPI.on("download-resumed", (data) => {
  console.log("下载恢复:", data);
});

// 监听下载取消
window.electronAPI.on("download-cancelled", (data) => {
  console.log("下载取消:", data);
});

// 监听下载中断
window.electronAPI.on("download-interrupted", (data) => {
  console.log("下载中断:", data);
});

// 监听下载持久化
window.electronAPI.on("download-persisted", (data) => {
  console.log("下载持久化:", data);
});
```

## 高级功能

### 下载恢复

当下载被暂停时，可以获取恢复数据并在稍后恢复：

```typescript
// 暂停下载并获取恢复数据
const restoreData = await window.electronAPI.invoke(
  "pause-download",
  downloadId
);

if (restoreData) {
  // 稍后恢复下载
  const newDownloadId = await window.electronAPI.invoke(
    "restore-download",
    restoreData
  );
}
```

### 持久化下载

启用持久化后，下载状态会在应用关闭时自动保存：

```typescript
const downloadId = await window.electronAPI.invoke("start-download", {
  url: "https://example.com/large-file.zip",
  persistOnAppClose: true,
});

// 监听持久化事件
window.electronAPI.on("download-persisted", (data) => {
  // 保存恢复数据到文件或数据库
  saveRestoreData(data.id, data.persistedFilePath);
});
```

## 错误处理

所有下载操作都包含完善的错误处理：

```typescript
try {
  const downloadId = await window.electronAPI.invoke("start-download", params);
} catch (error) {
  console.error("下载失败:", error);
}

// 监听下载错误事件
window.electronAPI.on("download-error", (data) => {
  console.error(`下载 ${data.id} 发生错误:`, data.error);
});
```

## 注意事项

1. **初始化**: 使用前必须调用 `initialize()` 方法并传入主窗口实例
2. **事件监听**: 建议在应用启动时设置事件监听器
3. **持久化**: 持久化功能需要提供 `app` 实例
4. **错误处理**: 始终监听错误事件并处理异常情况
5. **资源清理**: 应用关闭时会自动清理下载状态

## 依赖

- `electron-dl-manager`: ^4.2.0
- `electron`: >=20.0.0

## 许可证

ISC
