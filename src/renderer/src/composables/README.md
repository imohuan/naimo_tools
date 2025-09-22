# useTestLoadPlugin Hook

## 功能描述

`useTestLoadPlugin` 是一个Vue 3 Composition API Hook，主要功能是监听 `Ctrl+Alt+1` 快捷键，触发文件夹zip打包功能。

## 主要特性

- 🎯 **快捷键监听**: 使用 `useEventListener` 监听 `Ctrl+Alt+1` 快捷键
- 📁 **文件夹选择**: 自动打开文件夹选择对话框
- 💾 **保存位置选择**: 自动打开保存位置选择对话框
- 📦 **ZIP打包**: 将选中的文件夹打包为ZIP文件
- 🚫 **智能过滤**: 自动过滤掉zip文件和其他不需要的文件
- 🔄 **状态管理**: 提供处理状态、错误信息和成功信息
- ⚡ **极简代码**: 使用 VueUse 的 `useEventListener` 实现自动管理

## 使用方法

### 基本使用

```typescript
import { useTestLoadPlugin } from "@/composables/useTestLoadPlugin";

export default {
  setup() {
    const { isProcessing, lastZipPath, error, triggerZipPack } =
      useTestLoadPlugin();

    return {
      isProcessing,
      lastZipPath,
      error,
      triggerZipPack,
    };
  },
};
```

### 在模板中使用

```vue
<template>
  <div>
    <p v-if="isProcessing">正在处理中...</p>
    <p v-else-if="error" class="error">错误: {{ error }}</p>
    <p v-else-if="lastZipPath" class="success">
      上次打包成功: {{ lastZipPath }}
    </p>
    <p v-else>按 Ctrl+Alt+1 触发文件夹打包</p>

    <button @click="triggerZipPack" :disabled="isProcessing">
      手动触发打包
    </button>
  </div>
</template>
```

## API 参考

### 返回值

| 属性             | 类型                  | 描述                   |
| ---------------- | --------------------- | ---------------------- |
| `isProcessing`   | `Ref<boolean>`        | 是否正在处理中         |
| `lastZipPath`    | `Ref<string \| null>` | 上次成功打包的文件路径 |
| `error`          | `Ref<string \| null>` | 错误信息               |
| `triggerZipPack` | `Function`            | 手动触发打包功能       |

### 快捷键配置

- **快捷键**: `Ctrl+Alt+1`
- **监听方式**: 使用 `useEventListener(document, 'keydown')`
- **作用域**: 当前窗口
- **功能**: 触发文件夹zip打包
- **自动管理**: 组件卸载时自动清理监听器

## 工作流程

1. 用户按下 `Ctrl+Alt+1` 快捷键
2. 系统打开文件夹选择对话框
3. 用户选择要打包的文件夹
4. 系统打开保存位置选择对话框
5. 用户选择ZIP文件的保存位置
6. 系统调用主进程的zip打包功能
7. 自动过滤掉不需要的文件（如zip文件）
8. 显示处理结果

## 文件过滤功能

系统会自动过滤掉以下文件：

- **zip文件**: 所有 `.zip` 扩展名的文件
- **目标文件**: 避免将生成的zip文件本身打包进去

### 过滤实现

使用 `archiver` 的 `glob` 选项配合 `ignore` 模式来实现文件过滤：

```typescript
// 在 filesystem.ts 中的 zipDirectory 函数使用以下过滤规则：
const globOptions = {
  ignore: [
    "**/*.zip", // 过滤掉所有zip文件
    `**/${basename(outputPath)}`, // 过滤掉目标文件本身
  ],
};
```

## 错误处理

- 如果用户取消选择，不会显示错误
- 如果打包过程中出现错误，会显示在 `error` 状态中
- 处理状态通过 `isProcessing` 状态管理

## 注意事项

- 快捷键只在当前窗口有效，需要窗口获得焦点才能触发
- `useEventListener` 会自动管理事件监听器的注册和清理
- 如果正在处理中，再次触发会被忽略
- 需要确保主进程的 `zipDirectory` 函数已正确实现

## 依赖

- Vue 3 Composition API
- VueUse 的 `useEventListener`
- 项目内部的IPC通信系统
- 主进程的 `archiver` 库用于ZIP打包
