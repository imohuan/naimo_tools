# 快捷键模块 (Hotkeys Module)

这个模块包含了应用程序的所有快捷键相关功能，包括全局快捷键、应用内快捷键、键盘导航等。

## 目录结构

```
src/renderer/src/modules/hotkeys/
├── components/           # 快捷键相关组件
│   ├── HotkeySettings.vue    # 快捷键设置界面
│   └── HotkeyInterceptor.vue # 快捷键拦截器
├── config/              # 配置文件
│   └── callbacks.ts          # 快捷键回调函数配置
├── types/               # 类型定义
│   └── index.ts              # 所有类型定义
├── electron-hotkeys.ts  # Electron全局快捷键管理器
├── hotkey-cache.ts      # 快捷键缓存管理器
├── hotkey-manager.ts    # 快捷键管理器
├── hotkey-initializer.ts # 快捷键初始化器
├── keyboard-navigation.ts # 键盘导航功能
├── index.ts            # 主入口文件
└── README.md           # 说明文档
```

## 核心特性

### 1. 全局单例模式

所有管理器都采用单例模式，确保全局唯一性：

- `getElectronHotkeys()` - Electron全局快捷键管理器
- `getHotkeyCache()` - 快捷键缓存管理器
- `getHotkeyManager()` - 快捷键管理器
- `getHotkeyInitializer()` - 快捷键初始化器

### 2. 快捷键类型

- **全局快捷键 (GLOBAL)**: 通过Electron API注册，可在任何应用程序中使用
- **应用内快捷键 (APPLICATION)**: 使用hotkeys-js库，仅在应用获得焦点时生效

### 3. 缓存机制

- 全局快捷键配置自动保存到electron-store
- 应用重启后自动恢复快捷键配置
- 支持动态更新和删除快捷键

### 4. 键盘导航

- 智能网格导航（支持响应式布局）
- 跨分类导航
- 方向键、回车键、ESC键支持

## 使用方法

### 基本使用

```typescript
import {
  initializeHotkeys,
  getHotkeyManagers,
  useHotkeyManager,
  useGlobalHotkeyInitializer,
} from "./modules/hotkeys";

// 初始化快捷键系统
const initializer = await initializeHotkeys();

// 获取所有管理器实例
const managers = getHotkeyManagers();

// 在Vue组件中使用
const { registerGlobalHotkey, registerAppHotkey } = useHotkeyManager();
const { config, toggleGroup } = useGlobalHotkeyInitializer();
```

### 注册快捷键

```typescript
// 注册全局快捷键
await registerGlobalHotkey("ctrl+shift+space", "showHideWindow", {
  id: "global_show_window",
  description: "显示/隐藏窗口",
});

// 注册应用内快捷键
await registerAppHotkey("ctrl+k", "focusSearch", {
  id: "app_focus_search",
  description: "聚焦搜索框",
});
```

### 键盘导航

```typescript
import { useKeyboardNavigation } from './modules/hotkeys'

const { handleKeyNavigation } = useKeyboardNavigation(
  flatItems,
  searchCategories,
  selectedIndex,
  executeItem,
  handleSearch
)

// 在模板中使用
<div @keydown="handleKeyNavigation" tabindex="0">
  <!-- 内容 -->
</div>
```

## 配置

### 快捷键回调函数

在 `config/callbacks.ts` 中定义所有可用的回调函数：

```typescript
const showHideWindow = () => {
  // 显示/隐藏窗口逻辑
};

const focusSearch = () => {
  // 聚焦搜索框逻辑
};

// 注册回调函数
callbackRegistry.showHideWindow = showHideWindow;
callbackRegistry.focusSearch = focusSearch;
```

### 默认快捷键配置

在 `config/callbacks.ts` 中定义默认的快捷键配置：

```typescript
export const hotkeyConfig: HotkeySettingsConfig = {
  global: {
    id: "global",
    name: "全局快捷键",
    enabled: true,
    hotkeys: [
      {
        id: "global_show_window",
        keys: "ctrl+shift+space",
        type: HotkeyType.GLOBAL,
        callback: "showHideWindow",
        // ... 其他配置
      },
    ],
  },
  application: {
    // ... 应用内快捷键配置
  },
};
```

## 组件

### HotkeySettings.vue

快捷键设置界面组件，提供：

- 快捷键分组管理
- 快捷键编辑功能
- 实时预览和测试

### HotkeyInterceptor.vue

快捷键拦截器组件，用于：

- 捕获用户输入的快捷键组合
- 实时显示按键状态
- 支持取消和确认操作

## 迁移指南

从旧的快捷键系统迁移到新系统：

1. **更新导入路径**：

   ```typescript
   // 旧方式
   import { useElectronHotkeys } from "./composables/useElectronHotkeys";

   // 新方式
   import { getElectronHotkeys } from "./modules/hotkeys";
   ```

2. **使用单例模式**：

   ```typescript
   // 旧方式
   const electronHotkeys = useElectronHotkeys();

   // 新方式
   const electronHotkeys = getElectronHotkeys();
   ```

3. **统一的管理器接口**：
   ```typescript
   // 新方式 - 所有功能通过统一接口访问
   const managers = getHotkeyManagers();
   const { electron, cache, manager, initializer } = managers;
   ```

## 注意事项

1. **全局唯一性**: 所有管理器都是单例，避免重复创建实例
2. **异步操作**: 快捷键注册和注销都是异步操作，需要使用await
3. **错误处理**: 所有操作都有适当的错误处理和日志记录
4. **类型安全**: 完整的TypeScript类型定义，确保类型安全
5. **向后兼容**: 保留了Vue Composable接口，确保向后兼容性
