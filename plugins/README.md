# 插件系统使用指南

## 概述

Naimo Tools 支持插件系统，允许用户安装和使用第三方插件来扩展应用功能。插件系统支持两种类型的插件：

1. **默认插件**：随应用一起发布的插件，位于 `app/plugins/` 目录
2. **第三方插件**：用户安装的插件，位于用户数据目录的 `plugins/` 文件夹

## 插件结构

每个插件都是一个文件夹，包含以下文件：

### 必需文件

- `config.js` - 插件配置文件（必需）

### 可选文件

- `preload.js` - 插件预加载脚本
- `index.html` - 插件自定义页面

## 配置文件格式

`config.js` 文件必须导出一个包含以下字段的对象：

```javascript
module.exports = {
  // 基本信息
  id: "plugin-id", // 插件唯一标识
  name: "插件名称", // 插件显示名称
  description: "插件描述", // 插件描述
  version: "1.0.0", // 插件版本
  author: "作者名称", // 插件作者
  icon: "🔌", // 插件图标
  category: "other", // 插件分类
  enabled: true, // 是否启用

  // 插件项目列表
  items: [
    {
      pluginId: "plugin-id",
      name: "项目名称",
      path: "项目路径",
      icon: "📝",
      description: "项目描述",
      visible: true,
      weight: 100,
      executeType: 1, // 执行类型
      executeParams: {}, // 执行参数
    },
  ],

  // 插件选项
  options: {},

  // 元数据
  metadata: {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    installedAt: Date.now(),
  },
};
```

## 执行类型

插件支持以下执行类型：

1. `OPEN_APP` (1) - 打开应用程序
2. `OPEN_WEB_URL` (2) - 打开网页链接
3. `SHOW_WEBPAGE` (3) - 在内容区域显示网页
4. `CUSTOM_CODE` (4) - 执行自定义代码

## 插件分类

支持的插件分类：

- `efficient_office` - 高效办公
- `ai_artificial_intelligence` - AI人工智能
- `developer_essentials` - 程序员必备
- `record_ideas` - 记录想法
- `image_video` - 图像视频
- `media_tools` - 媒体工具
- `system_tools` - 系统工具
- `study_well` - 好好学习
- `brainstorming` - 脑洞大开
- `other` - 其他

## 安装插件

### 安装第三方插件（ZIP格式）

1. 将插件打包为 ZIP 文件
2. 通过插件管理器安装 ZIP 文件
3. 系统会自动解压并验证插件

### 安装默认插件

默认插件会在应用启动时自动加载，无需手动安装。

## 插件开发

### 创建插件

1. 创建插件文件夹
2. 编写 `config.js` 配置文件
3. 可选：添加 `preload.js` 和 `index.html`
4. 测试插件功能

### 预加载脚本

`preload.js` 在插件窗口创建时被加载，可以：

- 扩展插件窗口功能
- 添加自定义事件监听器
- 暴露插件特定的 API

### 自定义页面

`index.html` 是插件的自定义页面，可以：

- 提供插件特定的用户界面
- 展示插件功能
- 与用户交互

## 示例插件

参考 `example-plugin/` 目录中的示例插件，了解插件的完整结构。

## 注意事项

1. 插件 ID 必须唯一
2. 配置文件必须是有效的 JavaScript 对象
3. 插件文件路径使用相对路径
4. 自定义代码在安全沙箱中执行
5. 插件可以访问主进程的 API

## 故障排除

### 插件加载失败

1. 检查配置文件格式是否正确
2. 确认插件 ID 是否唯一
3. 查看控制台错误信息

### 插件功能异常

1. 检查执行类型和参数是否正确
2. 确认相关文件是否存在
3. 验证插件权限设置

## API 参考

插件可以访问以下 API：

- `api.ipcRouter.*` - IPC 路由 API
- `window.pluginAPI.*` - 插件特定 API（如果定义了预加载脚本）

更多详细信息请参考应用文档。
