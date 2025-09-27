# 窗口布局配置说明

## 配置文件位置

`src/shared/config/window-layout.config.ts`

## 配置项说明

### 基础尺寸配置

- `windowWidth`: 搜索框/窗口宽度 (默认: 800px)
- `searchHeaderHeight`: 搜索框高度 (默认: 50px)
- `contentMaxHeight`: 内容区域最大高度，设置模式和窗口模式都使用此高度 (默认: 420px)

### 间距配置

- `appPadding`: 应用内边距 (默认: 8px)
- `settingsBackgroundPadding`: 设置界面背景容器内边距 (默认: 8px)

### 视觉效果配置

- `windowBorderRadius`: 窗口圆角半径 (默认: 12px)
- `windowShadow`: 窗口阴影配置
- `backdropBlur`: 背景模糊效果
- `animation`: 动画配置

## 使用方法

### 主进程中使用

```typescript
import {
  DEFAULT_WINDOW_LAYOUT,
  calculateSettingsViewBounds,
} from "../../shared/config/window-layout.config";

// 获取设置窗口高度
const height = DEFAULT_WINDOW_LAYOUT.settingsWindowHeight;

// 计算设置视图边界
const bounds = calculateSettingsViewBounds(windowBounds);
```

### 渲染进程中使用

```typescript
import {
  DEFAULT_WINDOW_LAYOUT,
  calculateWindowHeight,
} from "@shared/config/window-layout.config";

// 获取搜索头部高度
const headerHeight = DEFAULT_WINDOW_LAYOUT.searchHeaderHeight;

// 计算窗口总高度
const totalHeight = calculateWindowHeight(contentHeight, isSettingsMode);
```

## 工具函数

### `calculateSettingsViewBounds(windowBounds)`

计算设置视图的边界，自动应用正确的padding。

### `calculateMainViewBounds(windowBounds, isSettingsMode)`

计算主视图的边界，根据是否为设置模式返回不同的布局。

### `calculateWindowHeight(contentHeight, isSettingsMode)`

计算窗口总高度，根据模式返回合适的高度。

### `getLayoutCSSVariables()`

获取CSS变量对象，用于在渲染进程中应用样式。

## 修改配置

要修改窗口布局配置，只需要更新 `DEFAULT_WINDOW_LAYOUT` 对象中的相应值即可。所有使用该配置的代码会自动应用新的配置。

## 配置生效范围

这个配置文件被以下模块使用：

- `src/main/window/NewWindowManager.ts`
- `src/main/window/ViewManager.ts`
- `src/renderer/src/components/ContentArea.vue`
- `src/renderer/src/App.vue`

修改配置后，所有相关模块会自动使用新的配置值。
