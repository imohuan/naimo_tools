# DetachHandler - 视图分离处理器

DetachHandler 是窗口管理重构项目中用于处理 Alt+D 快捷键和视图分离功能的核心组件。它提供了完整的视图分离、重新附加和生命周期管理功能。

## 功能特性

### 🎯 核心功能

- **Alt+D 快捷键支持**: 自动注册和处理 Alt+D 分离快捷键
- **视图分离**: 将插件视图分离到独立窗口
- **窗口重新附加**: 将分离的窗口重新附加到主窗口
- **智能视图管理**: 跟踪当前活跃的插件视图
- **事件驱动架构**: 完整的事件监听和通知系统

### 🔧 技术特性

- **类型安全**: 完整的 TypeScript 类型定义
- **单例模式**: 全局唯一的分离处理器实例
- **Vue 集成**: 提供组合式函数便于在 Vue 组件中使用
- **错误处理**: 完善的错误处理和降级机制
- **调试支持**: 可配置的调试日志输出

## 快速开始

### 基本使用

```typescript
import { detachHandler } from "@/core/window/DetachHandler";

// 初始化分离处理器
await detachHandler.initialize();

// 更新当前插件视图
detachHandler.updateCurrentPluginView("view-id", "plugin-path", "Plugin Name");

// 分离当前视图（也可以通过 Alt+D 快捷键触发）
const result = await detachHandler.detachView("view-id");
if (result.success) {
  console.log("分离成功，窗口ID:", result.detachedWindowId);
}
```

### Vue 组合式函数使用

```vue
<template>
  <div>
    <button @click="detachCurrentView" :disabled="!canDetach || isDetaching">
      分离当前视图 (Alt+D)
    </button>

    <p v-if="currentPluginView.viewId">
      当前视图: {{ currentPluginView.pluginName }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useDetachHandler } from "@/core/window/useDetachHandler";

const { state, actions } = useDetachHandler({
  autoInit: true,
  debug: false,
});

const { isInitialized, currentPluginView, canDetach, isDetaching } = state;

const { detachCurrentView } = actions;
</script>
```

## API 文档

### DetachHandler 类

#### 方法

##### `initialize(): Promise<void>`

初始化分离处理器，注册快捷键和事件监听器。

```typescript
await detachHandler.initialize();
```

##### `detachView(viewId: string, config?: Partial<DetachedWindowConfig>): Promise<DetachResult>`

分离指定的视图到独立窗口。

```typescript
const result = await detachHandler.detachView("view-123", {
  title: "我的插件",
  bounds: { x: 100, y: 100, width: 800, height: 600 },
});
```

##### `reattachWindow(detachedWindowId: number): Promise<{ success: boolean; error?: string }>`

重新附加分离的窗口到主窗口。

```typescript
const result = await detachHandler.reattachWindow(windowId);
```

##### `updateCurrentPluginView(viewId: string, pluginPath?: string, pluginName?: string): void`

更新当前活跃的插件视图信息。

```typescript
detachHandler.updateCurrentPluginView(
  "view-123",
  "my-plugin:item",
  "My Plugin"
);
```

##### `clearCurrentPluginView(): void`

清除当前插件视图信息。

##### `getCurrentPluginView(): object`

获取当前活跃的插件视图信息。

##### `canDetachCurrentView(): boolean`

检查是否可以分离当前视图。

##### `destroy(): Promise<void>`

销毁分离处理器，清理资源。

### useDetachHandler 组合式函数

#### 参数

```typescript
interface UseDetachHandlerOptions {
  autoInit?: boolean; // 是否自动初始化，默认 true
  debug?: boolean; // 是否启用调试日志，默认 false
}
```

#### 返回值

```typescript
interface UseDetachHandlerReturn {
  state: {
    isInitialized: Ref<boolean>
    currentPluginView: ComputedRef<{...}>
    canDetach: ComputedRef<boolean>
    isDetaching: Ref<boolean>
  }

  actions: {
    initialize: () => Promise<void>
    detachCurrentView: () => Promise<DetachResult>
    detachView: (viewId: string, config?: Partial<DetachedWindowConfig>) => Promise<DetachResult>
    reattachWindow: (windowId: number) => Promise<{...}>
    updateCurrentPluginView: (viewId: string, pluginPath?: string, pluginName?: string) => void
    clearCurrentPluginView: () => void
    destroy: () => Promise<void>
  }

  events: {
    onDetachSuccess: (callback: (result: DetachResult) => void) => () => void
    onDetachError: (callback: (error: string) => void) => () => void
    onWindowClosed: (callback: (data: {...}) => void) => () => void
  }
}
```

## 事件系统

### 支持的事件

#### `plugin:view:active`

插件视图激活事件

```typescript
eventSystem.emit("plugin:view:active", {
  viewId: "view-123",
  pluginPath: "my-plugin:item",
  pluginName: "My Plugin",
});
```

#### `plugin:view:closed`

插件视图关闭事件

```typescript
eventSystem.emit("plugin:view:closed", {
  viewId: "view-123",
  pluginPath: "my-plugin:item",
});
```

#### `window:detached`

窗口分离事件

```typescript
eventSystem.emit("window:detached", {
  success: true,
  detachedWindowId: 456,
  viewId: "view-123",
});
```

#### `window:detached:closed`

分离窗口关闭事件

```typescript
eventSystem.emit("window:detached:closed", {
  windowId: 456,
  viewId: "view-123",
  timestamp: Date.now(),
});
```

#### `notification:show`

显示通知事件

```typescript
eventSystem.emit("notification:show", {
  message: "视图已成功分离",
  type: "success",
  duration: 3000,
  source: "detach-handler",
});
```

## 配置选项

### 分离窗口配置

```typescript
interface DetachedWindowConfig {
  title: string; // 窗口标题
  bounds: Rectangle; // 窗口边界
  sourceViewId: string; // 源视图ID
  showControlBar: boolean; // 是否显示控制栏
  parentWindowId?: number; // 父窗口ID
  metadata?: {
    // 元数据
    pluginPath?: string;
    name?: string;
    [key: string]: any;
  };
}
```

### 快捷键配置

默认快捷键配置：

```typescript
{
  id: 'view-detach',
  keys: 'alt+d',
  type: HotkeyType.APPLICATION,
  description: '分离当前视图到独立窗口',
  scope: 'all',
  enabled: true
}
```

## 最佳实践

### 1. 初始化时机

```typescript
// 在应用启动时初始化
onMounted(async () => {
  await detachHandler.initialize();
});
```

### 2. 视图状态同步

```typescript
// 在插件视图激活时更新状态
eventSystem.on("plugin:view:active", (data) => {
  detachHandler.updateCurrentPluginView(
    data.viewId,
    data.pluginPath,
    data.pluginName
  );
});
```

### 3. 错误处理

```typescript
const result = await detachHandler.detachView(viewId);
if (!result.success) {
  console.error("分离失败:", result.error);
  // 显示错误提示给用户
  showErrorNotification(result.error);
}
```

### 4. 资源清理

```typescript
// 在组件卸载时清理资源
onUnmounted(() => {
  // 注意：不要调用 destroy()，因为是全局单例
  // 只清理组件相关的状态
  detachHandler.clearCurrentPluginView();
});
```

## 故障排除

### 常见问题

#### 1. Alt+D 快捷键不响应

- 检查快捷键是否被其他应用占用
- 确认 DetachHandler 已正确初始化
- 检查当前是否有活跃的插件视图

#### 2. 分离操作失败

- 确认主进程的 NewWindowManager 已初始化
- 检查视图ID是否有效
- 查看控制台错误日志

#### 3. 事件监听不工作

- 确认事件名称拼写正确
- 检查事件监听器是否正确注册
- 验证事件数据格式是否匹配

### 调试技巧

#### 启用调试模式

```typescript
const { state, actions } = useDetachHandler({
  debug: true, // 启用详细日志
});
```

#### 检查当前状态

```typescript
console.log("当前视图:", detachHandler.getCurrentPluginView());
console.log("可否分离:", detachHandler.canDetachCurrentView());
```

#### 监听所有相关事件

```typescript
eventSystem.on("plugin:view:active", console.log);
eventSystem.on("window:detached", console.log);
eventSystem.on("window:detached:closed", console.log);
```

## 示例项目

查看 `DetachHandler.example.vue` 文件获取完整的使用示例，包括：

- 状态监控
- 操作按钮
- 事件日志
- 错误处理

## 相关文档

- [窗口管理重构规范](../../.spec-workflow/specs/window-management-refactor/)
- [需求文档 - 需求6](../../.spec-workflow/specs/window-management-refactor/requirements.md#需求-6)
- [设计文档 - DetachManager](../../.spec-workflow/specs/window-management-refactor/design.md#detachmanager)
