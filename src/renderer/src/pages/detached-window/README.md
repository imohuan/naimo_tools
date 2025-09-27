# 分离窗口控制栏

分离窗口控制栏是窗口管理重构项目中用于为分离的插件窗口提供控制界面的组件集合。它提供了完整的窗口控制功能，包括最小化、最大化、关闭和重新附加等操作。

## 目录结构

```
src/renderer/src/pages/detached-window/
├── index.html              # 分离窗口HTML入口
├── main.ts                  # 应用主入口文件
├── DetachedWindowApp.vue    # 主应用组件
├── WindowControlBar.vue     # 控制栏组件
├── ControlBarDemo.vue       # 演示组件
└── README.md               # 文档说明
```

## 组件概览

### 🎛️ WindowControlBar.vue

核心控制栏组件，提供窗口操作按钮和功能。

**功能特性:**

- 窗口标题和图标显示
- 重新附加按钮（回到主窗口）
- 最小化、最大化、关闭按钮
- 加载状态指示器
- 快捷键支持
- 无障碍访问支持

### 🪟 DetachedWindowApp.vue

分离窗口的主应用组件，整合控制栏和内容区域。

**功能特性:**

- 控制栏集成
- 插件内容iframe管理
- 加载、错误、空状态处理
- 窗口信息管理
- 状态栏（可选）

### 🧪 ControlBarDemo.vue

演示和测试组件，用于开发时测试控制栏功能。

## 快速开始

### 基本使用

1. **HTML入口文件** (`index.html`)

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>分离窗口</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

2. **主入口文件** (`main.ts`)

```typescript
import { createApp } from "vue";
import DetachedWindowApp from "./DetachedWindowApp.vue";

const app = createApp(DetachedWindowApp);
app.mount("#app");
```

3. **在主应用中使用控制栏**

```vue
<template>
  <WindowControlBar
    :window-title="windowTitle"
    :window-icon="windowIcon"
    :is-loading="isLoading"
    :window-id="windowId"
    :view-id="viewId"
    @reattach="handleReattach"
    @minimize="handleMinimize"
    @maximize="handleMaximize"
    @close="handleClose"
  />
</template>

<script setup lang="ts">
import WindowControlBar from "./WindowControlBar.vue";
// ... 其他逻辑
</script>
```

## API 文档

### WindowControlBar 组件

#### Props

| 属性名        | 类型      | 默认值       | 说明             |
| ------------- | --------- | ------------ | ---------------- |
| `windowTitle` | `string`  | `'分离窗口'` | 窗口标题         |
| `windowIcon`  | `string`  | `''`         | 窗口图标URL      |
| `isLoading`   | `boolean` | `false`      | 是否显示加载状态 |
| `windowId`    | `number`  | `undefined`  | 窗口ID           |
| `viewId`      | `string`  | `undefined`  | 视图ID           |

#### Events

| 事件名           | 参数                   | 说明         |
| ---------------- | ---------------------- | ------------ |
| `reattach`       | 无                     | 重新附加事件 |
| `minimize`       | 无                     | 最小化事件   |
| `maximize`       | 无                     | 最大化事件   |
| `close`          | 无                     | 关闭事件     |
| `control-action` | `DetachedWindowAction` | 控制操作事件 |

#### 快捷键支持

| 快捷键             | 功能             |
| ------------------ | ---------------- |
| `Ctrl + Shift + A` | 重新附加到主窗口 |
| `Alt + F4`         | 关闭窗口         |
| `Ctrl + W`         | 关闭窗口         |

### DetachedWindowApp 组件

#### 功能方法

```typescript
// 初始化窗口信息
await initializeWindow();

// 处理插件加载
handlePluginLoaded();
handlePluginError(event);

// 窗口操作
handleReattach();
handleMinimize();
handleMaximize();
handleClose();
```

#### URL参数

分离窗口支持通过URL参数传递初始化信息：

```
detached-window.html?windowId=123&viewId=view-456&pluginUrl=http://example.com&pluginName=MyPlugin&pluginPath=my-plugin:item
```

| 参数名       | 说明     |
| ------------ | -------- |
| `windowId`   | 窗口ID   |
| `viewId`     | 视图ID   |
| `pluginUrl`  | 插件URL  |
| `pluginName` | 插件名称 |
| `pluginPath` | 插件路径 |

## 样式和主题

### 默认样式

控制栏采用现代化的设计风格：

- 高度：32px
- 背景：渐变灰色
- 按钮：圆角、悬停效果
- 图标：SVG矢量图标

### 深色模式支持

```css
@media (prefers-color-scheme: dark) {
  .window-control-bar {
    background: linear-gradient(180deg, #343a40 0%, #212529 100%);
    color: #adb5bd;
  }
}
```

### 无障碍支持

- 支持键盘导航
- 提供完整的ARIA标签
- 支持高对比度模式
- 支持减少动画偏好

## 开发和测试

### 演示页面

使用 `ControlBarDemo.vue` 组件进行开发和测试：

```bash
# 启动开发服务器
npm run dev

# 访问演示页面
http://localhost:3000/pages/detached-window/demo.html
```

### 功能测试

演示页面提供以下测试功能：

- 窗口信息配置
- 控制按钮测试
- 快捷键测试
- 操作日志记录
- 状态监控

### 调试技巧

1. **开启调试日志**

```typescript
// 在控制台查看详细日志
console.log("🎛️ 控制栏调试信息");
```

2. **检查窗口状态**

```typescript
// 检查窗口是否最大化
const isMaximized = await naimo.router.windowIsMaximized();
```

3. **监听IPC事件**

```typescript
// 监听主进程消息
naimo.ipcRenderer.on("window:update-info", (data) => {
  console.log("窗口信息更新:", data);
});
```

## 集成指南

### 与主进程通信

控制栏通过IPC与主进程通信：

```typescript
// 重新附加窗口
const result = await naimo.router.windowReattachNewView(windowId);

// 窗口控制操作
await naimo.router.windowMinimize();
await naimo.router.windowMaximize();
await naimo.router.windowClose();
```

### 事件系统集成

```typescript
// 发送控制事件
window.eventSystem?.emit("window:control:action", {
  action: "reattach",
  windowId: 123,
  viewId: "view-456",
  timestamp: Date.now(),
});

// 显示通知
window.eventSystem?.emit("notification:show", {
  message: "窗口操作成功",
  type: "success",
  duration: 3000,
});
```

### 自定义样式

```vue
<style scoped>
/* 自定义控制栏样式 */
.window-control-bar {
  background: your-custom-gradient;
  border-bottom: 1px solid your-color;
}

/* 自定义按钮样式 */
.control-button {
  background: your-button-style;
}
</style>
```

## 最佳实践

### 1. 错误处理

```typescript
const handleReattach = async () => {
  try {
    const result = await naimo.router.windowReattachNewView(windowId);
    if (!result.success) {
      showNotification("重新附加失败: " + result.error, "error");
    }
  } catch (error) {
    console.error("重新附加操作失败:", error);
    showNotification("操作失败", "error");
  }
};
```

### 2. 状态管理

```typescript
// 使用响应式状态
const isOperating = ref(false);
const isMaximized = ref(false);

// 操作时更新状态
const handleOperation = async () => {
  isOperating.value = true;
  try {
    // 执行操作
  } finally {
    isOperating.value = false;
  }
};
```

### 3. 资源清理

```typescript
onUnmounted(() => {
  // 清理事件监听器
  window.removeEventListener("keydown", handleKeydown);

  // 清理其他资源
  cleanup();
});
```

### 4. 性能优化

```typescript
// 防抖操作
import { debounce } from "lodash-es";

const debouncedOperation = debounce(handleOperation, 300);

// 避免频繁状态检查
const checkWindowState = throttle(async () => {
  const isMaximized = await naimo.router.windowIsMaximized();
  // 更新状态
}, 1000);
```

## 故障排除

### 常见问题

1. **控制按钮不响应**
   - 检查IPC通信是否正常
   - 确认窗口ID和视图ID正确
   - 查看控制台错误日志

2. **快捷键不工作**
   - 确认事件监听器已注册
   - 检查快捷键是否被其他应用占用
   - 验证键盘事件处理逻辑

3. **样式显示异常**
   - 检查CSS作用域
   - 确认深色模式支持
   - 验证响应式断点

### 调试步骤

1. 打开开发者工具
2. 检查控制台错误信息
3. 验证网络请求状态
4. 查看元素样式
5. 测试交互功能

## 相关文档

- [窗口管理重构规范](../../../.spec-workflow/specs/window-management-refactor/)
- [需求文档 - 需求6](../../../.spec-workflow/specs/window-management-refactor/requirements.md#需求-6)
- [DetachHandler 文档](../../core/window/DetachHandler.README.md)
- [Vue 3 组合式API](https://v3.vuejs.org/guide/composition-api-introduction.html)

## 版本历史

- **v1.0.0** - 初始版本，基础控制栏功能
- **v1.1.0** - 添加快捷键支持和无障碍功能
- **v1.2.0** - 增强样式系统和主题支持
