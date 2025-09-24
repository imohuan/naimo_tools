# Vue截图裁剪功能说明

## 概述

已成功将截图裁剪功能重构为Vue版本，支持多入口构建，提供更好的开发体验和类型安全。

## 架构更新

### 1. Vite多入口配置

**文件**: `src/renderer/vite.config.ts`

```typescript
rollupOptions: {
  // 多入口配置
  input: {
    main: resolve(__dirname, 'index.html'),
    'crop-window': resolve(__dirname, 'src/pages/crop-window/index.html'),
    'log-viewer': resolve(__dirname, 'public/log-viewer.html')
  }
}
```

### 2. Vue页面结构

```
src/renderer/src/pages/crop-window/
├── index.html          # HTML入口文件
├── main.ts            # Vue应用入口
└── CropWindow.vue     # 主要的裁剪组件
```

## 功能特性

### Vue组件优势

- **响应式数据管理**: 使用Vue3的响应式系统管理状态
- **TypeScript支持**: 完整的类型安全
- **组件化开发**: 清晰的组件结构
- **更好的开发体验**: 支持热重载和开发者工具

### 裁剪功能

- **拖拽选择**: 鼠标拖拽选择裁剪区域
- **精确调整**: 8个调整手柄支持精确调整
- **实时反馈**: 显示选择区域尺寸
- **工具栏操作**: 复制、下载、固定、关闭
- **快捷键支持**: 完整的键盘快捷键

## 使用方式

### 在插件中调用

```javascript
// 调用新的Vue版本截图裁剪功能
const result = await window.ocrPluginAPI.takeScreenshotWithCrop({
  sourceId: "screen:0:0", // 可选
  showCursor: true, // 可选
});
```

### IPC路由

```typescript
// 主进程中调用
const result = await api.ipcRouter.screenCaptureCaptureAndCrop({
  sourceId: "screen:0:0",
  showCursor: true,
});
```

## 开发构建

### 开发模式

```bash
# 启动渲染进程开发服务器
cd src/renderer
pnpm dev
```

### 生产构建

```bash
# 构建所有入口
pnpm build
```

构建输出：

- `dist/renderer/index.html` - 主应用
- `dist/renderer/crop-window.html` - 截图裁剪页面
- `dist/renderer/log-viewer.html` - 日志查看器

## 技术实现

### Vue3 Composition API

使用Vue3的Composition API实现：

- `ref/reactive` - 响应式数据
- `computed` - 计算属性
- `onMounted/onUnmounted` - 生命周期
- `watch` - 数据监听

### 事件处理

```vue
<template>
  <div @mousedown="handleMouseDown" @mousemove="handleMouseMove">
    <!-- 裁剪界面 -->
  </div>
</template>

<script setup>
// 事件处理函数
function handleMouseDown(e) {
  startSelection(e);
}
</script>
```

### 样式管理

使用Scoped CSS确保样式隔离：

```vue
<style scoped>
.screenshot-container {
  /* 样式定义 */
}
</style>
```

## 调试和测试

### 开发者工具

Vue版本支持Vue开发者工具，可以：

- 查看组件状态
- 监听事件
- 调试响应式数据

### 测试文件

使用 `test-vue-crop.js` 进行功能测试：

```bash
electron test-vue-crop.js
```

## 配置说明

### 窗口配置

```typescript
const cropWindow = new BrowserWindow({
  frame: false, // 无边框
  transparent: true, // 透明背景
  alwaysOnTop: true, // 始终置顶
  skipTaskbar: true, // 不显示在任务栏
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
  },
});
```

### IPC通信

- `screen-info` - 接收屏幕信息
- `crop-and-copy` - 复制裁剪结果
- `crop-and-download` - 下载裁剪结果
- `crop-and-pin` - 固定到屏幕
- `close-crop-window` - 关闭窗口

## 升级优势

1. **开发体验**: Vue3 + TypeScript + Vite
2. **代码维护**: 组件化、类型安全
3. **构建性能**: Vite快速构建
4. **调试支持**: Vue开发者工具
5. **热重载**: 开发时实时更新

## 注意事项

1. **浏览器兼容性**: 需要支持ES6+的现代浏览器
2. **Node.js集成**: 裁剪窗口启用了Node.js集成以访问Electron API
3. **安全性**: 在生产环境中可能需要调整安全设置
4. **性能**: Vue版本相比原生HTML略有性能开销，但提供更好的开发体验

## 未来扩展

- 支持更多图片格式
- 添加图片编辑功能
- 支持多选区域
- 添加OCR文本识别覆盖
- 支持插件系统扩展
