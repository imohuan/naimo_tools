# 废弃 Hooks 文件清理记录

## 清理时间

2025年10月5日

## 清理原因

在完成组件重构和统一状态管理后，部分 hooks 文件已经不再使用，需要清理以保持代码库的整洁。

## 已删除的文件

### 1. Composables 目录

#### ✅ `src/renderer/src/composables/useAppEventHandlers.ts`

- **删除原因**: 已标记为 `@deprecated`，事件监听逻辑已移至 App.vue 中直接注册
- **影响**: 无，该文件已在重构中被完全替换
- **替代方案**: 在 App.vue 的 `onMounted` 中直接使用 `naimo.event.onXxx()` 注册事件

```typescript
// 之前
const windowFocusHandlers = eventHandlers.createWindowFocusHandlers({...})

// 现在
naimo.event.onAppFocus(() => {
  onWindowFocus();
});
```

#### ✅ `src/renderer/src/composables/useUIStatus.ts`

- **删除原因**: 已被 `useApp().ui` 完全替代
- **影响**: 无，所有使用处已迁移至 `useApp().ui`
- **替代方案**: 使用 `useApp().ui` 管理 UI 状态

```typescript
// 之前
const { isSettingsInterface, currentPluginItem } = useUIStatus();

// 现在
const app = useApp();
const isSettingsInterface = computed(() => app.ui.isSettingsInterface);
const currentPluginItem = computed({
  get: () => app.ui.activePlugin,
  set: (value) => {
    app.ui.activePlugin = value;
  },
});
```

#### ✅ `src/renderer/src/composables/useTestLoadPlugin.ts`

- **删除原因**: 测试用 hook，未在生产代码中使用
- **影响**: 无
- **替代方案**: 如需测试插件加载，可在开发环境中临时添加

#### ✅ `src/renderer/src/composables/useAppLifecycle.ts`

- **删除原因**: 逻辑简单，可直接内联到 App.vue 中，无需单独的 composable
- **影响**: 无，逻辑已完全迁移到 App.vue
- **替代方案**: 在 App.vue 中直接定义初始化逻辑

```typescript
// 之前
const { uiConstants, initializeApp } = useAppLifecycle();

// 现在 - 直接在 App.vue 中定义
const uiConstants = ref({
  headerHeight: DEFAULT_WINDOW_LAYOUT.searchHeaderHeight,
  padding: DEFAULT_WINDOW_LAYOUT.appPadding,
});

const initializeApp = async () => {
  await loadUIConstants();
  await initializeHotkeys();
  await pluginStore.initialize();
};
```

### 2. Core/Window 目录

#### ✅ `src/renderer/src/core/window/useSearchHeader.ts`

- **删除原因**: SearchHeader 组件已实现自包含，不再需要外部 composable
- **影响**: 无，SearchHeader 组件内部直接管理所有状态
- **替代方案**: SearchHeader 组件内部的 hooks

#### ✅ `src/renderer/src/core/window/SearchHeaderManager.ts`

- **删除原因**: 与 `useSearchHeader.ts` 配套使用，已不再需要
- **影响**: 无
- **替代方案**: SearchHeader 组件内部直接管理

### 3. Components/SearchHeader/hooks 目录

#### ✅ `src/renderer/src/components/SearchHeader/hooks/useSearchHeaderState.ts`

- **删除原因**: SearchHeader 组件已在内部直接管理状态，不需要单独的状态管理 hook
- **影响**: 无
- **替代方案**: SearchHeader.vue 内部的 ref 和 computed

## 保留的文件

以下文件虽然在重构中被提及，但仍在使用中，**已保留**：

### ✅ `src/renderer/src/composables/useDragDrop.ts`

- **使用位置**: `SearchHeader.vue`
- **用途**: 处理文件拖拽功能
- **保留原因**: SearchHeader 组件内部使用

### ✅ `src/renderer/src/composables/useTextWidth.ts`

- **使用位置**: `SearchInput.vue`
- **用途**: 计算文本宽度
- **保留原因**: SearchInput 组件使用

### ✅ `src/renderer/src/composables/usePathToDataUrl.ts`

- **使用位置**: `IconDisplay.vue`
- **用途**: 转换文件路径为 Data URL
- **保留原因**: IconDisplay 组件使用

### ✅ `src/renderer/src/components/SearchHeader/hooks/useFilePaste.ts`

- **使用位置**: `SearchHeader.vue`
- **用途**: 处理文件粘贴功能
- **保留原因**: SearchHeader 组件内部使用

## 其他保留的 Composables

以下 composables 在 App.vue 中继续使用：

- ✅ `useFileHandler.ts` - 文件处理
- ✅ `useWindowManager.ts` - 窗口管理
- ✅ `useEventSystem.ts` - 事件系统
- ✅ `usePluginWindowManager.ts` - 插件窗口管理
- ✅ `useSettingsManager.ts` - 设置管理

## 清理统计

| 类别             | 删除文件数 | 保留文件数 |
| ---------------- | ---------- | ---------- |
| Composables      | 4          | 5          |
| Core/Window      | 2          | 0          |
| Components/Hooks | 1          | 1          |
| **总计**         | **7**      | **6**      |

## 验证步骤

清理后进行了以下验证：

1. ✅ TypeScript 类型检查通过
2. ✅ Linter 检查通过（无错误）
3. ✅ 所有引用已更新或移除
4. ✅ 应用功能正常

## 后续建议

### 1. 继续模块化清理

可以考虑进一步整理：

- 将相关的 composables 按功能分组到子目录中
- 例如：`composables/window/`、`composables/plugin/` 等

### 2. 文档更新

更新以下文档：

- API 文档中删除已废弃的 hooks 说明
- 开发指南中更新最佳实践

### 3. 代码审查

定期审查 composables 目录，及时清理不再使用的文件

## 总结

本次清理删除了 7 个不再使用或不必要的 hooks 文件，简化了代码库结构：

- ✅ **更清晰**: 移除了废弃代码，减少了维护负担
- ✅ **更简洁**: 减少了文件数量，提高了可读性
- ✅ **更一致**: 统一使用 `useApp` 管理状态，代码风格更统一

清理完成后，代码库更加整洁，开发者更容易找到需要的代码。
