# 主进程代码结构优化

## 概述

这次重构将原来的单一 `AppService` 类拆分为多个专门的服务，采用依赖注入模式来管理服务之间的关系，提高了代码的可维护性和可测试性。

## 新的目录结构

```
src/main/
├── core/                    # 核心架构
│   ├── ServiceContainer.ts # 服务容器 - 依赖注入
│   ├── AppBootstrap.ts     # 应用启动器
│   └── CoreService.ts      # 核心服务
├── services/               # 业务服务
│   ├── ErrorService.ts    # 错误处理服务
│   ├── UpdateService.ts   # 自动更新服务
│   ├── WindowService.ts   # 窗口服务
│   ├── appService.ts.backup # 旧版AppService备份
│   └── index.ts           # 服务导出
├── config/                 # 配置管理
├── ipc-router/            # IPC路由系统
├── window/                # 窗口管理器
├── utils/                 # 工具函数
├── workers/               # 工作进程
├── preloads/              # 预加载脚本
├── typings/               # 类型定义
└── main.ts               # 简化的入口文件
```

## 架构改进

### 1. 服务容器 (`ServiceContainer`)

- **职责**: 管理所有服务的依赖注入和生命周期
- **特性**:
  - 自动解析依赖关系
  - 单例模式支持
  - 循环依赖检测
  - 统一初始化和清理

### 2. 应用启动器 (`AppBootstrap`)

- **职责**: 应用的完整启动流程协调
- **特性**:
  - 配置管理
  - 服务注册
  - 按顺序初始化服务
  - 错误处理和清理

### 3. 核心服务 (`CoreService`)

- **职责**: 基础应用生命周期管理
- **功能**:
  - 日志系统初始化
  - 应用事件监听
  - IPC路由初始化
  - 图标工作进程管理

### 4. 错误服务 (`ErrorService`)

- **职责**: 统一错误处理
- **功能**:
  - 主进程错误捕获
  - 渲染进程崩溃处理
  - 未捕获异常处理
  - 错误报告功能

### 5. 更新服务 (`UpdateService`)

- **职责**: 自动更新管理
- **功能**:
  - 自动更新配置
  - 手动检查更新
  - 更新状态管理

### 6. 窗口服务 (`WindowService`)

- **职责**: 窗口相关功能聚合
- **功能**:
  - 主窗口管理
  - 下载窗口管理
  - 窗口管理器协调
  - 下载管理器集成

## 主要改进

### 1. **单一职责原则**

每个服务只负责特定的功能域，代码更清晰易懂。

### 2. **依赖注入**

使用服务容器管理依赖，提高可测试性和灵活性。

### 3. **配置驱动**

所有服务都支持配置驱动，便于定制和测试。

### 4. **错误处理统一**

集中式错误处理，提高应用稳定性。

### 5. **生命周期管理**

清晰的初始化和清理流程，防止资源泄漏。

## 向后兼容性

为了不破坏现有代码，在 `main.ts` 中提供了兼容性导出：

```typescript
export const appService = {
  getMainWindow: () =>
    appBootstrap.getService("windowService")?.getMainWindow(),
  getWindowManager: () =>
    appBootstrap.getService("windowService")?.getWindowManager(),
  getConfigManager: () => appBootstrap.getService("configManager"),
  getDownloadWindow: () =>
    appBootstrap.getService("windowService")?.getDownloadWindow(),
  cleanup: () => appBootstrap.cleanup(),
};
```

## 使用示例

### 启动应用

```typescript
import { AppBootstrap } from "./core/AppBootstrap";

const appBootstrap = new AppBootstrap({
  core: { enableIconWorker: true },
  error: { showDialog: false },
  update: { enabled: true },
  window: { mainWindow: { width: 800, height: 600 } },
});

await appBootstrap.start();
```

### 获取服务

```typescript
// 获取窗口服务
const windowService = appBootstrap.getService("windowService");
const mainWindow = windowService.getMainWindow();

// 获取配置管理器
const configManager = appBootstrap.getService("configManager");
const config = configManager.getConfig();
```

### 错误处理

```typescript
// 错误服务会自动捕获和处理所有类型的错误
const errorService = appBootstrap.getService("errorService");
errorService.reportError(new Error("自定义错误"), { context: "user-action" });
```

## 迁移指南

1. **现有代码**: 无需修改，通过兼容性导出继续工作
2. **新功能**: 建议使用新的服务架构
3. **配置**: 可以通过 `AppBootstrap` 配置自定义服务行为
4. **扩展**: 新服务可以通过服务容器注册和管理

## 注意事项

1. 旧的 `AppService` 已重命名为 `appService.ts.backup` 作为备份
2. 新架构完全兼容现有的窗口管理和IPC系统
3. 所有错误处理已集中到 `ErrorService`
4. 服务的初始化顺序很重要，已在 `AppBootstrap` 中正确配置
