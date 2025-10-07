# 示例插件 - Example Plugin

> 新架构（懒加载架构）完整示例

## 📋 概述

这是一个完整的示例插件，展示了 Naimo Tools 新架构（懒加载架构）的所有特性和最佳实践。

## ✨ 特性

- ✅ 使用 `manifest.json` 配置所有信息
- ✅ 在顶层配置 `main` 和 `preload`（所有 feature 共用）
- ✅ 使用 `feature` 数组定义多个功能
- ✅ 在 `preload.js` 中导出功能处理器
- ✅ 展示如何处理搜索文本和附件文件
- ✅ 展示如何使用插件设置
- ✅ 展示如何使用通知功能

## 📂 文件结构

```
example-plugin/
├── manifest.json    # 插件配置文件（新架构）
├── preload.js       # Preload 脚本（包含功能处理器）
├── index.html       # UI 页面
└── README.md        # 说明文档
```

## 🎯 功能列表

### 1. Hello World

最简单的示例功能，展示基本用法。

- **触发方式**：在搜索框输入任何文本并选择"Hello World"
- **功能说明**：打开插件界面，显示欢迎信息
- **生命周期**：reuse（复用窗口）
- **单例模式**：是

### 2. 文本处理器

处理搜索文本，统计字符、单词和行数。

- **触发方式**：在搜索框输入文本并选择"文本处理器"
- **功能说明**：
  - 统计文本的字符数、单词数、行数
  - 转换为大写和小写
  - 显示通知展示结果
- **生命周期**：new（每次创建新窗口）
- **单例模式**：否

### 3. 文件计数器

统计附件文件数量和大小。

- **触发方式**：拖拽文件到搜索框，选择"文件计数器"
- **功能说明**：
  - 统计文件总数
  - 按文件类型分类
  - 计算总大小
  - 显示通知展示结果
- **生命周期**：reuse（复用窗口）
- **单例模式**：是
- **显示模式**：仅在附件模式下显示

## 🔧 配置说明

### manifest.json

```json
{
  "id": "example-plugin",
  "name": "示例插件",
  "version": "1.0.0",

  // 插件级别配置（所有 feature 共用）
  "main": "./index.html", // UI 页面路径
  "preload": "./preload.js", // preload 脚本路径

  // 功能列表
  "feature": [
    {
      "path": "hello-world", // 功能标识（不带插件ID前缀）
      "name": "Hello World"
      // ... 其他配置
    }
  ],

  // 插件设置
  "settings": [
    // ... 设置项
  ]
}
```

### preload.js

```javascript
// 导出功能处理器
module.exports = {
  "hello-world": {
    onEnter: async (params, api) => {
      // 功能逻辑
    },
  },
  // ... 其他功能
};
```

## 📖 使用方法

### 安装

1. 将插件文件夹复制到 `plugins` 目录
2. 重启应用或在插件管理中安装

### 配置

在插件设置中配置以下选项：

- **API 密钥**：（可选）用于演示设置功能
- **启用通知**：是否启用桌面通知
- **语言**：选择界面语言

### 使用

1. 在搜索框中输入文本或拖拽文件
2. 选择对应的功能项
3. 查看结果

## 💻 开发指南

### 添加新功能

1. 在 `manifest.json` 的 `feature` 数组中添加新功能配置
2. 在 `preload.js` 中添加对应的功能处理器
3. 如果需要，更新 `index.html` 的 UI

### 调试

- 打开开发者工具查看控制台输出
- 使用 `console.log` 输出调试信息
- 检查 `params` 和 `api` 参数

## 📚 参考文档

- [插件系统重构说明 - 懒加载架构](../../docs/插件系统重构说明-懒加载架构.md)
- [插件迁移指南](../../docs/插件迁移指南-懒加载架构.md)
- [插件开发文档](../../docs/插件开发文档.md)

## 🔑 关键要点

1. ✅ `preload` 在插件顶层配置且为可选，所有 feature 共用
2. ✅ `main` 在插件顶层配置但为可选，有 UI 时才需要配置
3. ✅ feature 中的 `path` 只需功能名称，如 `hello-world`
4. ✅ preload.js 中的 key 与 feature 的 path 对应
5. ❌ 不要在 feature 中配置 `main` 和 `preload`
6. ❌ 不允许在配置中出现函数（`onEnter`、`onInstall`）

## 📝 许可证

MIT License

## 👨‍💻 作者

Naimo Tools Team
