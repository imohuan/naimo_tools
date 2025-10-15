---
description: 智能创建 Naimo 插件 - 根据需求自动生成完整的插件代码
---

用户需求描述：

$ARGUMENTS

## ⚠️ 重要提示

**本项目使用 TypeScript + Vite + pnpm 进行开发！**

### 📦 包管理器

- **使用 pnpm** 而不是 npm 或 yarn
- 所有命令使用 `pnpm` 或 `pnpm run`

### 📁 文件位置说明

**必须在以下位置创建和修改文件，不要在根目录创建源码文件！**

- **配置文件**：`manifest.json`（根目录）
- **Preload 脚本**：`src/preload.ts`（TypeScript）
- **前端代码**：`src/main.ts`（TypeScript）
- **样式文件**：`src/style.css`
- **HTML 模板**：`index.html`（根目录）
- **其他文件**：`README.md`、`.gitignore`、`package.json` 等

### 🔨 开发工作流

**本项目使用 pnpm 作为包管理器！**

#### 首次安装依赖

```bash
pnpm install                    # 安装项目依赖
pnpm run add-electron-types     # 仅安装 Electron 类型定义（推荐）
```

**重要说明：**

- 插件开发只需要 Electron 的**类型定义**，不需要完整的 Electron 二进制文件
- `add-electron-types` 命令会跳过 Electron 二进制下载，仅安装类型支持
- 这样可以节省大量磁盘空间和安装时间
- **注意：** `add-electron-types` 命令使用的是 Windows PowerShell 语法（`$env:ELECTRON_SKIP_DOWNLOAD=1`）

#### 核心命令

项目提供了 3 个核心命令：

##### 1. `pnpm run dev` - 开发模式 🚀

开发阶段使用，支持实时热更新：

```bash
pnpm run dev
```

**工作流程：**

1. 执行后会自动构建项目到 `dist/` 目录
2. **自动复制 dist 目录的绝对路径到剪贴板**
3. 打开 Naimo 搜索框，**粘贴路径**点击载入插件
4. 之后可以随意编辑项目代码，在 Naimo 中**实时查看效果**（热更新）

**优势：**

- 无需手动复制插件到 Naimo plugins 目录
- 支持实时热更新，修改代码立即生效
- 开发效率极高

##### 2. `pnpm run build` - 构建项目 📦

打包项目用于发布：

```bash
pnpm run build
```

**产物：** 在 `dist/` 目录生成完整的插件包

- `dist/manifest.json` - 插件配置
- `dist/index.html` - 打包后的页面
- `dist/preload.js` - 编译后的 Preload 脚本
- `dist/js/` - 打包后的前端代码
- `dist/assets/` - 静态资源

##### 3. `pnpm run deploy` - 部署到 GitHub 🚢

打包并自动部署到 GitHub 的 `build` 分支：

```bash
pnpm run deploy
```

**工作流程：**

1. 执行 `build` 命令打包项目
2. 将 `dist/` 目录内容推送到 GitHub 的 `build` 分支
3. 用户可以通过 `build` 分支直接下载使用插件

**适用场景：**

- 发布新版本
- 提供在线安装地址
- GitHub Pages 部署

#### 构建产物说明

**重要**：manifest.json 会被复制到 dist 目录，所以路径是相对于 dist 目录的：

- `"preload": "./preload.js"`（不是 `./dist/preload.js`）
- `"main": "./index.html"`（不是 `./dist/index.html`）

#### 路径配置说明

构建后的目录结构：

```
dist/
├── manifest.json    ← 从根目录复制
├── index.html       ← 从 Vite 构建产物
├── preload.js       ← 从 TypeScript 编译
├── js/
└── assets/
```

Naimo 会加载 `dist/` 目录作为插件，所以：

- manifest.json 在 `dist/manifest.json`
- 它引用的文件路径是相对于自己的位置
- `./index.html` 指向 `dist/index.html`
- `./preload.js` 指向 `dist/preload.js`

---

## 目标

根据用户的功能需求，自动生成一个完整的 Naimo Tools 插件，包括：

1. `manifest.json` - 插件配置文件（根目录）
2. `src/preload.ts` - 功能处理脚本（TypeScript）
3. `src/main.ts` - 前端逻辑代码（TypeScript）
4. `src/style.css` - 样式文件
5. `index.html` - UI 界面（根目录）
6. `.gitignore` - Git 忽略文件
7. `README.md` - 插件说明文档
8. `package.json` - 项目配置

## 重要文件引用

在生成插件代码前，需要引用以下关键文件：

### 📋 配置规范文件

**路径：** `../schema.json`  
**用途：** 定义 `manifest.json` 的完整规范，包括所有字段的类型、格式、枚举值等

### 📚 API 类型定义文件

**路径：** `../typings/naimo.d.ts`  
**用途：** 定义所有可用的 Naimo API，包括接口、参数、返回值类型等

### 使用规则

1. **生成 manifest.json 时：**
   - 必须先 `read_file('../schema.json')`
   - 根据 schema 的定义生成配置
   - 遵循 schema 中的验证规则

2. **使用 Naimo API 时：**
   - 必须先 `read_file('../typings/naimo.d.ts')`
   - 根据类型定义生成正确的 API 调用
   - 确保参数和返回值类型正确

3. **生成示例代码时：**
   - 参考 naimo.d.ts 中的接口定义
   - 添加正确的类型注释
   - 提供准确的 API 使用示例

---

## 执行步骤

### 1. 需求分析

仔细分析用户的需求描述，确定以下关键信息：

**插件基本信息：**

- 插件 ID（英文，小写字母、数字、短横线）
- 插件名称（中文或英文）
- 插件描述
- 插件分类（从以下选择）：
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

**功能分析：**

- 功能数量（一个插件可以包含多个功能）
- 每个功能的：
  - 功能标识（path）
  - 功能名称
  - 功能类型（text/regex/img/files）
  - 触发条件
  - 处理逻辑

**UI 需求：**

- 是否需要 UI 界面
- 界面布局和交互
- 样式风格

**技术栈：**

- 是否需要使用第三方库
- 是否需要网络请求
- 是否需要数据存储

### 2. 理解 manifest.json 的 feature 配置 🔑

#### feature 的核心参数

每个 feature 只需要配置以下核心参数：

```json
{
  "path": "功能标识", // 必需：英文标识，对应 preload 中的处理器
  "name": "功能名称", // 必需：显示名称
  "icon": "./ico.png", // 必需：功能图标
  "description": "功能描述", // 必需：功能说明
  "type": "搜索类型" // 必需：text/regex/img/files
  // 根据 type 添加对应的搜索参数
}
```

#### 搜索类型详解 🔍

根据 `naimo.d.ts` 定义，有 4 种搜索类型：**TextSearch, RegexSearch, ImgSearch, FileSearch**

搜索逻辑由 `showSearchResults` 函数处理，理解这个函数是配置 feature 的关键！

---

### type: "text" - 文本搜索（默认）

**类型定义：**

```typescript
interface TextSearch {
  type: "text";
  minLength?: number; // 最小长度
  maxLength?: number; // 最大长度
}
```

**搜索逻辑（showSearchResults）：**

当用户在搜索框输入文本时，会依次匹配：

1. **name 字段**（支持拼音搜索）
   - 完全匹配：+100 分
   - 前缀匹配：+50 分
   - 包含匹配：+30 分

2. **path 字段**（小写匹配）
   - 包含匹配：+10 分

3. **description 字段**（支持拼音搜索）
   - 包含匹配：+15 分

4. **anonymousSearchFields**（匿名搜索字段，支持拼音）
   - 任意字段匹配：+20 分

**最佳实践：**

```json
{
  "path": "translate",
  "name": "翻译",
  "icon": "./ico.png",
  "description": "将文本翻译成其他语言",
  "type": "text",
  "anonymousSearchFields": ["翻译", "fanyi", "translate"],
  "minLength": 1,
  "maxLength": 5000
}
```

**适用场景：**

- 翻译插件（输入 "翻译" 或 "fanyi"）
- 计算器（输入 "计算器" 或 "calc"）
- 单位转换（输入 "单位" 或 "convert"）

---

### type: "regex" - 正则匹配

**类型定义：**

```typescript
interface RegexSearch {
  type: "regex";
  match?: string; // 正则匹配
  exclude?: string; // 排除条件
  minLength?: number;
  maxLength?: number;
}
```

**搜索逻辑（showSearchResults）：**

1. 用正则表达式 `match` 匹配用户输入
2. 检查是否符合长度限制
3. 如果匹配成功：+40 分
4. **同时还会执行文本搜索逻辑**（name/path/description/anonymousSearchFields）

**最佳实践：**

```json
{
  "path": "open-url",
  "name": "打开链接",
  "icon": "./ico.png",
  "description": "在浏览器中打开URL",
  "type": "regex",
  "match": "^https?://",
  "exclude": "^file://",
  "minLength": 10,
  "anonymousSearchFields": ["打开", "链接", "url"]
}
```

**用户体验：**

- 输入 `https://github.com` → 匹配（正则）
- 输入 `打开链接` → 匹配（文本搜索）
- **两种方式都能触发功能！**

**适用场景：**

- URL 打开器（`^https?://`）
- 邮箱处理（`^[\\w.]+@[\\w.]+$`）
- IP 地址（`^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$`）

---

### type: "img" - 图片处理

**类型定义：**

```typescript
interface ImgSearch {
  type: "img";
}
```

**搜索逻辑（showSearchResults）：**

1. 检查是否有图片 attachedInfo（拖入或粘贴图片）
2. 如果有图片：+60 分
3. **同时还会执行文本搜索逻辑**

**最佳实践：**

```json
{
  "path": "compress-image",
  "name": "图片压缩",
  "icon": "./ico.png",
  "description": "压缩图片文件大小",
  "type": "img",
  "anonymousSearchFields": ["压缩", "图片", "compress"]
}
```

**用户体验：**

- **拖入图片** → 显示该功能（自动匹配）
- 输入 `图片压缩` → 显示该功能（文本搜索）
- **两种方式都能进入插件！**

**适用场景：**

- 图片压缩
- OCR 文字识别
- 图片格式转换

---

### type: "files" - 文件处理

**类型定义：**

```typescript
interface FileSearch {
  type: "files";
  fileType: "file" | "directory"; // 文件类型
  extensions?: string[]; // 文件扩展名（仅 file 类型）
  match?: string; // 正则匹配文件名（仅 file 类型）
  minLength?: number; // 最少文件数
  maxLength?: number; // 最多文件数
}
```

**搜索逻辑（showSearchResults）：**

1. 检查是否有文件 attachedInfo（拖入文件）
2. 根据 `fileType` 过滤：
   - `"file"` → 只保留文件
   - `"directory"` → 只保留文件夹
3. 检查文件数量是否符合 `minLength` 和 `maxLength`
4. 对于文件类型：
   - 如果有 `extensions`：检查扩展名是否匹配 → +25 分
   - 如果有 `match`：用正则匹配文件名 → +25 分
   - 都没有：只要数量符合就匹配 → +20 分
5. **同时还会执行文本搜索逻辑**

**最佳实践 1：图片文件处理**

```json
{
  "path": "batch-compress",
  "name": "批量压缩",
  "icon": "./ico.png",
  "description": "批量压缩图片文件",
  "type": "files",
  "fileType": "file",
  "extensions": [".jpg", ".jpeg", ".png", ".webp"],
  "minLength": 1,
  "maxLength": 100,
  "anonymousSearchFields": ["批量", "压缩", "图片"]
}
```

**最佳实践 2：文件夹处理**

```json
{
  "path": "folder-size",
  "name": "文件夹大小",
  "icon": "./ico.png",
  "description": "计算文件夹大小",
  "type": "files",
  "fileType": "directory",
  "minLength": 1,
  "maxLength": 1,
  "anonymousSearchFields": ["文件夹", "大小"]
}
```

**用户体验：**

- **拖入图片文件** → 显示"批量压缩"（扩展名匹配）
- 输入 `批量压缩` → 显示该功能（文本搜索）
- **两种方式都能进入插件！**

**适用场景：**

- 批量图片压缩（`.jpg`, `.png`）
- 视频转换（`.mp4`, `.avi`）
- 文件重命名（任意文件）
- 文件夹统计（`fileType: "directory"`）

---

### 智能配置建议 💡

**原则：为一个功能提供多种触发方式**

以"图片压缩"为例，可以同时支持：

**方式 1：通过名称搜索**

```json
{
  "type": "text",
  "anonymousSearchFields": ["压缩", "图片"]
}
```

**方式 2：拖入图片文件触发**

```json
{
  "type": "files",
  "fileType": "file",
  "extensions": [".jpg", ".png"]
}
```

**推荐做法：**

为同一个功能创建多个 feature，提供不同触发方式：

```json
{
  "feature": [
    {
      "path": "compress-by-name",
      "name": "图片压缩",
      "type": "text",
      "anonymousSearchFields": ["压缩", "图片"]
    },
    {
      "path": "compress-by-file",
      "name": "图片压缩",
      "type": "files",
      "fileType": "file",
      "extensions": [".jpg", ".png", ".webp"]
    }
  ]
}
```

这样用户可以：

- 输入"压缩"或"图片" → 进入插件
- 拖入图片文件 → 进入插件

两种方式都会调用对应的 `onEnter` 处理器！

### 3. 生成 manifest.json

**文件位置：** 根目录 `manifest.json`

根据需求分析生成插件配置文件。

**重要：** 在生成 `manifest.json` 之前，**必须先读取**以下文件以了解完整的配置规范：

📄 **配置规范文件：** `../schema.json`

**操作步骤：**

1. 使用 `read_file` 工具读取 `../schema.json`
2. 根据 schema 中的定义生成符合规范的配置
3. 确保所有必需字段都已填写
4. 参考 schema 中的 examples 和 description

**配置文件结构：**

- 根据 schema.json 中的 `required` 字段确定必需字段
- 根据 schema.json 中的 `properties` 确定可用字段
- 根据 schema.json 中的 `definitions.feature` 生成 feature 配置
- 遵循 schema.json 中的格式验证规则（pattern、enum 等）

**重要配置项：**

```json
{
  "main": "./index.html", // manifest.json 在 dist/ 目录，所以是相对路径
  "preload": "./preload.js" // 同样是相对于 dist/ 目录的路径
}
```

**注意**：manifest.json 在构建后会被复制到 dist/ 目录，所以 main 和 preload 路径都是相对于 dist/ 目录的。

### 4. 理解 naimo.onEnter 和 PluginItemData 📥

#### PluginItemData 参数详解

当用户触发功能时，`onEnter` 会接收 `PluginItemData` 参数：

```typescript
interface PluginItemData {
  files: {
    name: string; // 文件名称
    path: string; // 文件绝对路径 ⚠️
    size: number; // 文件大小（字节）
    type: string; // 文件类型（扩展名或 mime）
    originalType: string; // 原始文件类型
  }[];
  searchText: string; // 用户输入的搜索文本
  hotkeyEmit: boolean; // 是否由热键触发
  fullPath: string; // 功能完整路径（包含插件ID）
}
```

#### ⚠️ 重要提醒：files 参数说明

**files 中的 path 是绝对路径，但没有传输实际的 File 对象！**

- ✅ `files[0].path` - 文件的绝对路径字符串
- ❌ `files[0]` - **不是** File 对象，无法直接读取内容

**要获取文件内容，必须使用 Naimo 提供的 API：**

- `naimo.system.getLocalImage(path)` - 获取图片
  - **返回纯 base64 字符串（无前缀！）**
  - 如需在 img 标签使用，需添加前缀：`data:image/png;base64,${base64}`
- `naimo.system.getLocalText(path)` - 获取文本文件内容（UTF-8 编码）

**💡 实用辅助函数：**

```typescript
// 获取带前缀的图片 data URL
async function getImageDataURL(path: string): Promise<string> {
  const base64 = await naimo.system.getLocalImage(path);
  const ext = path.split(".").pop()?.toLowerCase();
  const mimeType =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : ext === "gif"
            ? "image/gif"
            : "image/png";
  return `data:${mimeType};base64,${base64}`;
}

// 使用示例
const imageData = await getImageDataURL(file.path);
```

#### 在渲染进程中使用 naimo.onEnter

**重要：** `naimo.onEnter` 只能在**渲染进程**（`src/main.ts`）中使用，不能在 preload 中使用！

**正确示例：src/main.ts**

```typescript
/// <reference path="../typings/naimo.d.ts" />

import "./style.css";

async function initApp(): Promise<void> {
  const naimo = window.naimo;

  // ✅ 在渲染进程中注册 onEnter
  naimo.onEnter(async (params: PluginItemData) => {
    console.log("功能被触发", params);

    // 获取搜索文本
    const searchText = params.searchText;

    // 获取文件列表
    const files = params.files;

    if (files && files.length > 0) {
      for (const file of files) {
        console.log("文件名:", file.name);
        console.log("文件路径:", file.path); // 绝对路径

        // 根据文件类型获取内容
        if (file.type.includes("image")) {
          // 获取图片内容（纯 base64，无前缀）
          const base64 = await naimo.system.getLocalImage(file.path);

          // 如需在 img 标签使用，需添加前缀
          const imageData = `data:image/png;base64,${base64}`;
          console.log("图片数据:", imageData);
        } else if (file.type.includes("text")) {
          // 获取文本内容
          const textContent = await naimo.system.getLocalText(file.path);
          console.log("文本内容:", textContent);
        }
      }
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
```

#### 根据功能类型处理参数

##### type: "text" - 文本搜索

```typescript
naimo.onEnter(async (params) => {
  const text = params.searchText; // 用户输入的文本
  // 处理文本
  console.log("搜索文本:", text);
  // 示例：翻译
  const translated = await translateText(text);
  displayResult(translated);
});
```

##### type: "img" - 图片处理

```typescript
naimo.onEnter(async (params) => {
  const files = params.files;

  if (files && files.length > 0) {
    const imagePath = files[0].path;

    // ⚠️ 使用 getLocalImage 获取图片（返回纯 base64，无前缀）
    const base64 = await naimo.system.getLocalImage(imagePath);

    // 如需显示图片，添加 data URL 前缀
    const imageData = `data:image/png;base64,${base64}`;

    // 或者根据文件扩展名判断图片类型
    const ext = imagePath.split(".").pop()?.toLowerCase();
    const mimeType =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : "image/png";
    const fullImageData = `data:${mimeType};base64,${base64}`;

    // 处理图片
    const compressed = await compressImage(fullImageData);
    displayImage(compressed);
  }
});
```

##### type: "files" - 文件处理

```typescript
naimo.onEnter(async (params) => {
  const files = params.files;

  if (files && files.length > 0) {
    for (const file of files) {
      console.log("处理文件:", file.name);
      console.log("文件路径:", file.path);
      console.log("文件大小:", file.size);

      // 根据扩展名判断文件类型
      if (file.name.endsWith(".jpg") || file.name.endsWith(".png")) {
        // 图片文件 - 获取 base64（无前缀）
        const base64 = await naimo.system.getLocalImage(file.path);

        // 添加前缀用于显示或处理
        const ext = file.name.split(".").pop()?.toLowerCase();
        const mimeType =
          ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
        const imageData = `data:${mimeType};base64,${base64}`;

        await processImage(imageData, file.name);
      } else if (file.type === "directory") {
        // 文件夹
        console.log("这是一个文件夹:", file.path);
      }
    }
  }
});
```

##### type: "regex" - 正则匹配

```typescript
naimo.onEnter(async (params) => {
  const text = params.searchText;

  // 处理匹配的文本（如URL）
  if (text.startsWith("http://") || text.startsWith("https://")) {
    await naimo.shell.openUrl(text);
  }
});
```

#### 完整示例：图片压缩插件

以"图片压缩"为例，展示如何处理多种触发方式：

**manifest.json：**

```json
{
  "feature": [
    {
      "path": "compress-by-name",
      "name": "图片压缩",
      "type": "text",
      "anonymousSearchFields": ["压缩", "图片"]
    },
    {
      "path": "compress-by-file",
      "name": "图片压缩",
      "type": "files",
      "fileType": "file",
      "extensions": [".jpg", ".png", ".webp"]
    }
  ]
}
```

**src/main.ts：**

```typescript
/// <reference path="../typings/naimo.d.ts" />

import "./style.css";

async function initApp(): Promise<void> {
  const naimo = window.naimo;

  // 统一的压缩处理函数
  async function compressImages(files: any[]): Promise<void> {
    for (const file of files) {
      try {
        // ⚠️ 使用 getLocalImage 获取图片（返回纯 base64，无前缀）
        const base64 = await naimo.system.getLocalImage(file.path);

        // 添加 data URL 前缀用于处理
        const ext = file.name.split(".").pop()?.toLowerCase();
        const mimeType =
          ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : ext === "png"
              ? "image/png"
              : ext === "webp"
                ? "image/webp"
                : "image/png";
        const imageData = `data:${mimeType};base64,${base64}`;

        // 执行压缩（这里是示例）
        const compressed = await yourCompressFunction(imageData);

        // 保存或显示结果
        console.log("压缩完成:", file.name);
      } catch (error) {
        naimo.log.error("压缩失败", error);
      }
    }
  }

  // 注册功能触发事件
  naimo.onEnter(async (params) => {
    const { files, searchText, fullPath } = params;

    // 方式1：通过名称搜索触发（compress-by-name）
    if (fullPath.endsWith("compress-by-name")) {
      naimo.system.notify("请拖入图片文件");
      // 等待用户拖入文件...
    }

    // 方式2：拖入文件触发（compress-by-file）
    if (fullPath.endsWith("compress-by-file") && files && files.length > 0) {
      await compressImages(files);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
```

---

### 5. 生成 src/preload.ts（可选）

**文件位置：** `src/preload.ts`（TypeScript）

**⚠️ 重要说明：**

- Preload 脚本主要用于**暴露自定义 API** 给渲染进程
- **不推荐**在 preload 中处理业务逻辑
- **推荐**在渲染进程（src/main.ts）中使用 `naimo.onEnter` 处理

**基本结构（仅用于暴露 API）：**

```typescript
/// <reference path="../typings/naimo.d.ts" />

import { contextBridge } from "electron";
import * as fs from "fs";
import * as path from "path";

// ==================== 自定义 API ====================

interface MyPluginAPI {
  // 定义你需要暴露的 Node.js 功能
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
}

const myPluginAPI: MyPluginAPI = {
  readFile: async (filePath: string) => {
    return fs.promises.readFile(filePath, "utf-8");
  },
  writeFile: async (filePath: string, content: string) => {
    await fs.promises.writeFile(filePath, content, "utf-8");
  },
};

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld("myPluginAPI", myPluginAPI);

// ==================== 类型扩展 ====================

declare global {
  interface Window {
    myPluginAPI: MyPluginAPI;
  }
}
```

**在渲染进程中使用：**

```typescript
// src/main.ts
const myAPI = window.myPluginAPI;

const content = await myAPI.readFile("/path/to/file.txt");
```

### 6. 生成前端文件

#### 6.1 生成 index.html

**文件位置：** 根目录 `index.html`

**基本模板：**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>插件名称</title>
  </head>
  <body>
    <div id="app">
      <div class="container">
        <h1>🎯 插件名称</h1>
        <!-- 你的 UI 内容 -->
      </div>
    </div>
    <!-- TypeScript 入口文件 -->
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**注意：**

- 使用 `<script type="module" src="/src/main.ts"></script>` 引入 TypeScript 文件
- Vite 会自动处理 TypeScript 编译
- 样式在 `src/style.css` 中定义，由 `main.ts` 导入

#### 6.2 生成 src/main.ts

**文件位置：** `src/main.ts`（TypeScript）

**基本模板：**

```typescript
/// <reference path="../typings/naimo.d.ts" />

import "./style.css";

// ==================== 类型定义 ====================

type NaimoAPI = typeof window.naimo;

// ==================== 主逻辑 ====================

/**
 * 应用初始化
 */
async function initApp(): Promise<void> {
  console.log("应用初始化...");

  const naimo: NaimoAPI = window.naimo;

  // 注册功能触发事件
  naimo.onEnter(async (params) => {
    console.log("功能被触发", params);

    // 你的业务逻辑
    // ...
  });

  // 记录初始化完成
  naimo.log.info("应用初始化完成");
}

// ==================== 入口 ====================

// 等待 DOM 加载完成
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
```

#### 6.3 生成 src/style.css

**文件位置：** `src/style.css`

样式文件会被 Vite 自动处理。参考模板中的 `src/style.css`，包含：

- CSS 变量定义
- 基础样式
- 组件样式
- 响应式设计
- 工具类

### 7. 生成其他文件

#### 7.1 .gitignore

```
node_modules/
dist/
*.log
.DS_Store
Thumbs.db
```

#### 7.2 README.md

````markdown
# 插件名称

> 插件描述

## 功能特性

- ✅ 功能1
- ✅ 功能2
- ✅ 功能3

## 使用方法

### 安装插件

**方式1：开发模式加载（推荐）**

1. 克隆项目并安装依赖
2. 运行 `pnpm run dev`
3. dist 目录路径会自动复制到剪贴板
4. 打开 Naimo 搜索框，粘贴路径即可载入插件

**方式2：从 GitHub 安装**

1. 从 GitHub build 分支下载插件包
2. 解压到 Naimo Tools 的 `plugins` 目录
3. 重启 Naimo Tools

### 触发插件

- 输入关键词触发（如：`功能名称`）
- 拖入文件触发（如果支持）

## 开发说明

### 技术栈

- TypeScript
- Vite
- Naimo Tools Plugin API

### 目录结构

\`\`\`
plugin-name/
├── manifest.json # 插件配置
├── index.html # HTML 模板
├── package.json # 项目配置
├── vite.config.ts # Vite 配置
├── tsconfig.json # TypeScript 配置
├── src/
│ ├── main.ts # 前端入口（使用 naimo.onEnter）
│ ├── preload.ts # Preload 脚本（可选）
│ └── style.css # 样式文件
├── dist/ # 构建产物
│ ├── index.html
│ ├── preload.js
│ ├── js/
│ └── assets/
├── typings/
│ └── naimo.d.ts # 类型定义
├── README.md # 说明文档
└── .gitignore # Git 忽略文件
\`\`\`

### 开发指南

#### 1. 安装依赖

```bash
pnpm install                    # 安装项目依赖
pnpm run add-electron-types     # 安装 Electron 类型定义（仅需类型，不下载二进制）
```

#### 2. 开发模式（支持热更新）

```bash
pnpm run dev
```

- 自动构建并复制 dist 路径到剪贴板
- 在 Naimo 中粘贴路径载入插件
- 修改代码后实时更新

#### 3. 构建发布

```bash
pnpm run build    # 构建插件包
pnpm run deploy   # 构建并部署到 GitHub build 分支
```

#### 4. 类型检查

```bash
pnpm run type-check
```

## 版本历史

### v1.0.0

- 初始版本

## 许可证

MIT
````

#### 7.3 package.json

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "插件描述",
  "type": "module",
  "scripts": {
    "dev": "vite && node scripts/copy-dist-path.js",
    "build": "pnpm run type-check && pnpm run build:main && pnpm run build:preload",
    "build:main": "vite build",
    "build:preload": "node scripts/build-preload.js",
    "deploy": "pnpm run build && node scripts/deploy-to-github.js",
    "preview": "vite preview",
    "add-electron-types": "$env:ELECTRON_SKIP_DOWNLOAD=1; pnpm install electron --save-dev",
    "type-check": "tsc --noEmit"
  },
  "keywords": ["naimo", "plugin", "electron"],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-username/naimo_tools-plugin-name.git"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.9.2",
    "vite": "^7.1.5"
  },
  "dependencies": {}
}
```

**命令说明：**

- `dev` - 开发模式，构建后复制 dist 路径到剪贴板
- `build` - 构建插件包
- `deploy` - 构建并部署到 GitHub build 分支
- `add-electron-types` - 安装 Electron 类型定义（不下载二进制）
  - 使用 Windows PowerShell 语法
  - 其他系统请手动设置 `ELECTRON_SKIP_DOWNLOAD=1` 环境变量

### 8. TypeScript 类型支持说明

本项目默认使用 TypeScript，类型支持已经内置。

#### 在 src/preload.ts 中

```typescript
/// <reference path="../typings/naimo.d.ts" />

import { contextBridge } from "electron";

// 如果需要暴露自定义 API
interface MyPluginAPI {
  myMethod: () => Promise<void>;
}

const myPluginAPI: MyPluginAPI = {
  myMethod: async () => {
    // ...
  },
};

contextBridge.exposeInMainWorld("myPluginAPI", myPluginAPI);
```

#### 在 src/main.ts 中

```typescript
/// <reference path="../typings/naimo.d.ts" />

// 使用类型推断
const naimo = window.naimo; // 自动获得完整类型

// PluginItemData 类型已经在 naimo.d.ts 中定义
naimo.onEnter(async (params) => {
  // params 自动推断为 PluginItemData 类型
  const files = params.files;
  const searchText = params.searchText;
});
```

#### 自定义类型扩展

在代码中可以扩展全局类型：

```typescript
declare global {
  interface Window {
    myPluginAPI: MyPluginAPI;
  }
}
```

## Naimo API 使用指南

**重要：** 在编写代码使用 Naimo API 之前，**必须先读取**以下文件以了解完整的 API 定义：

📄 **API 类型定义文件：** `../typings/naimo.d.ts`

### 使用步骤

#### 1. 读取 API 定义

在开始编写插件代码前，使用 `read_file` 工具读取 `../typings/naimo.d.ts` 文件，了解：

- 所有可用的 API 接口
- 每个 API 的参数类型
- 返回值类型
- API 的详细说明
- **PluginItemData 类型定义**

#### 2. 推荐的开发模式 ⭐

**核心原则：在渲染进程（src/main.ts）中使用 `naimo.onEnter` 处理业务逻辑**

**✅ 推荐做法：**

```typescript
// src/main.ts
async function initApp(): Promise<void> {
  const naimo = window.naimo;

  // ✅ 在渲染进程中注册 onEnter
  naimo.onEnter(async (params) => {
    const { files, searchText, fullPath } = params;

    // 处理业务逻辑
    if (files && files.length > 0) {
      const imagePath = files[0].path;

      // 获取图片 base64（无前缀）
      const base64 = await naimo.system.getLocalImage(imagePath);

      // 添加 data URL 前缀
      const imageData = `data:image/png;base64,${base64}`;

      // 处理图片...
    }
  });

  // 可以访问所有 naimo API
  await naimo.log.info("插件初始化完成");
}
```

**❌ 不推荐：在 preload 中处理业务逻辑**

Preload 脚本主要用于暴露 Node.js API，不适合处理插件业务逻辑。

#### 3. 在渲染进程中使用 API

**文件位置：** `src/main.ts`

在渲染进程中：

- ✅ 通过 `window.naimo` 访问所有 API
- ✅ 所有 API 调用都是异步的（返回 Promise）
- ✅ 可以操作 DOM 元素
- ✅ 可以使用 `naimo.onEnter` 处理功能触发
- ✅ 参考 `naimo.d.ts` 中的接口定义使用正确的参数

**完整示例：**

```typescript
// src/main.ts
async function initApp(): Promise<void> {
  const naimo = window.naimo;

  // 注册功能触发事件
  naimo.onEnter(async (params) => {
    console.log("功能被触发", params);

    // 获取文件
    if (params.files && params.files.length > 0) {
      for (const file of params.files) {
        if (file.type.includes("image")) {
          // 获取 base64（无前缀）
          const base64 = await naimo.system.getLocalImage(file.path);

          // 添加前缀用于显示
          const imageData = `data:image/png;base64,${base64}`;

          // 处理图片
        }
      }
    }

    // 获取搜索文本
    if (params.searchText) {
      console.log("用户输入:", params.searchText);
    }
  });

  // 操作 DOM
  const button = document.getElementById("myBtn");
  button?.addEventListener("click", async () => {
    await naimo.system.notify("按钮被点击");
  });
}
```

#### 4. Preload 脚本使用场景（可选）

**文件位置：** `src/preload.ts`

仅在需要以下功能时使用 Preload：

- ✅ 暴露 Node.js API（fs, path, child_process 等）
- ✅ 使用 Electron API
- ❌ **不要**在 preload 中处理插件业务逻辑
- ❌ **不能**直接访问 `window.naimo`（仅在渲染进程可用）

**正确示例：**

```typescript
// src/preload.ts - 暴露文件系统 API
import { contextBridge } from "electron";
import * as fs from "fs";

interface FileAPI {
  readFile: (path: string) => Promise<string>;
}

const fileAPI: FileAPI = {
  readFile: async (path: string) => {
    return fs.promises.readFile(path, "utf-8");
  },
};

contextBridge.exposeInMainWorld("fileAPI", fileAPI);
```

### API 分类

根据 `naimo.d.ts` 文件，Naimo 提供以下 API 模块：

- `window.naimo.log` - 日志系统
- `window.naimo.window` - 窗口管理
- `window.naimo.db` - 文档数据库
- `window.naimo.storage` - 键值存储
- `window.naimo.clipboard` - 剪贴板
- `window.naimo.shell` - Shell 操作
- `window.naimo.system` - 系统信息
- `window.naimo.screen` - 屏幕操作
- `window.naimo.dialog` - 对话框
- `window.naimo.input` - 输入模拟
- `window.naimo.automation` - 网页自动化
- `window.naimo.ubrowser` - 可编程浏览器
- `window.naimo.ibrowser` - 即时浏览器

**生成代码时：**

1. 先读取 `naimo.d.ts` 了解所需 API 的完整定义
2. 根据类型定义生成正确的调用代码
3. 确保参数类型和返回值处理正确
4. 添加必要的错误处理

## 实现建议

### 1. 错误处理

**必须**使用 try-catch 包裹所有可能出错的代码：

```javascript
onEnter: async (params, api) => {
  try {
    // 业务逻辑
  } catch (error) {
    console.error("错误:", error);
    window.naimo?.log?.error("操作失败", error);
  }
};
```

### 2. 参数验证

在处理前验证参数：

```javascript
if (!params || !params.text) {
  window.naimo?.log?.warn("参数无效");
  return;
}
```

### 3. 用户反馈

提供清晰的用户反馈：

```javascript
// 开始处理
window.naimo?.system?.notify("正在处理...");

// 处理完成
window.naimo?.system?.notify("处理完成！", "成功");

// 处理失败
window.naimo?.system?.notify("处理失败", "错误");
```

### 4. 性能优化

- 避免在 `onEnter` 中执行耗时操作
- 使用异步操作（`async/await`）
- 缓存计算结果

### 5. 代码组织

- 将复杂逻辑拆分为独立函数
- 使用清晰的命名
- 添加注释说明

## 命名规范

### 插件 ID

- 格式：`功能描述-plugin`
- 示例：`translate-plugin`, `ocr-plugin`, `image-compress-plugin`
- 规则：小写字母、数字、短横线

### 功能 path

- 格式：`功能描述`
- 示例：`translate-text`, `compress-image`, `extract-text`
- 规则：小写字母、数字、短横线

### 仓库命名

- 格式：`naimo_tools-功能描述-plugin`
- 示例：`naimo_tools-translate-plugin`

## 输出要求

生成代码时：

1. **完整性**：生成所有必需的文件
2. **可用性**：代码可以直接使用，无需修改
3. **规范性**：遵循 Naimo 插件开发规范
4. **注释**：关键代码添加注释
5. **美观**：代码格式整洁，易于阅读

## 示例输出

**先显示文件结构：**

```
example-plugin/
├── manifest.json        # 插件配置
├── index.html           # HTML 模板
├── package.json         # 项目配置
├── vite.config.ts       # Vite 配置
├── tsconfig.json        # TypeScript 配置
├── src/
│   ├── main.ts          # 前端入口（TypeScript）
│   ├── preload.ts       # Preload 脚本（TypeScript）
│   └── style.css        # 样式文件
├── scripts/
│   └── build-preload.js # Preload 构建脚本
├── typings/
│   └── naimo.d.ts       # 类型定义（从模板复制）
├── .gitignore
└── README.md
```

**然后逐个显示文件内容：**

### manifest.json（根目录，构建后会复制到 dist/）

```json
{
  "$schema": "./schema.json",
  "id": "example-plugin",
  "name": "示例插件",
  "version": "1.0.0",
  "author": "你的名字",
  "icon": "./ico.png",
  "description": "这是一个示例插件",
  "category": "other",
  "enabled": true,
  "main": "./index.html",
  "preload": "./preload.js",
  "feature": [
    {
      "path": "example",
      "name": "示例功能",
      "icon": "./ico.png",
      "description": "示例功能描述",
      "type": "text",
      "weight": 100,
      "singleton": true,
      "anonymousSearchFields": ["示例", "example"]
    }
  ]
}
```

**重要**：路径 `./index.html` 和 `./preload.js` 是相对于 manifest.json 所在目录（dist/）的路径。

### src/preload.ts

```typescript
/// <reference path="../typings/naimo.d.ts" />

import { contextBridge } from "electron";

// 功能处理器
const handlers: import("../typings/naimo").PluginExports = {
  example: {
    onEnter: async (params: any) => {
      console.log("示例功能被触发", params);
    },
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = handlers;
}
```

### src/main.ts

```typescript
/// <reference path="../typings/naimo.d.ts" />

import "./style.css";

async function initApp(): Promise<void> {
  const naimo = window.naimo;
  naimo.log.info("插件初始化完成");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
```

**最后提供使用说明：**

````
## 开发流程

1. 安装依赖
   ```bash
   pnpm install                    # 安装项目依赖
   pnpm run add-electron-types     # 安装 Electron 类型定义（推荐）
````

2. 开发模式

   ```bash
   pnpm run dev
   ```

3. 构建插件

   ```bash
   pnpm run build
   ```

4. 测试插件
   - 将整个插件文件夹复制到 Naimo Tools 的 plugins 目录
   - 重启 Naimo Tools
   - 在搜索框中输入关键词测试

## 测试建议

- 测试正常输入
- 测试边界情况
- 测试错误处理
- 使用 TypeScript 类型检查：`pnpm run type-check`

## 开发建议

- 使用 VSCode 获得完整的 TypeScript 类型提示
- **在 src/ 目录下编写代码，不要在根目录创建 .ts/.js 文件**
- 参考 ../typings/naimo.d.ts 了解完整的 API
- 参考 ../schema.json 了解配置规范
- 构建后检查 dist/ 目录确保文件正确生成
- **首次开发时记得运行** `pnpm run add-electron-types` 安装 Electron 类型定义

```

---

## 生成流程总结 📋

### 第 1 步：读取规范文件

在生成代码前，必须先读取以下文件：

```

read_file('../schema.json') # 读取 manifest.json 配置规范
read_file('../typings/naimo.d.ts') # 读取 API 定义和 PluginItemData 类型
read_file('src/main.ts') # 参考前端模板
read_file('package.json') # 了解项目配置和命令

````

### 第 2 步：分析需求并设计搜索配置

根据用户需求确定：

**插件基本信息：**
- 插件 ID、名称、描述、分类

**功能配置（核心）：**
- 确定触发方式（文本搜索、文件拖入、正则匹配等）
- 为每个功能配置合适的搜索类型：
  - `type: "text"` - 通过关键词搜索
  - `type: "regex"` - 通过正则匹配
  - `type: "img"` - 通过拖入图片
  - `type: "files"` - 通过拖入文件/文件夹
- **智能配置多种触发方式**（同一功能可以配置多个 feature）

**示例：图片压缩功能**
- Feature 1: `type: "text"` - 用户输入"压缩"触发
- Feature 2: `type: "files"` - 拖入图片文件触发

### 第 3 步：生成文件

**按照以下顺序生成文件：**

#### 1. **manifest.json**（根目录）

- 基于 `schema.json` 生成符合规范的配置
- 配置 `feature` 数组，提供多种触发方式
- 路径配置：
  - `"main": "./index.html"`（相对于 dist/ 目录）
  - `"preload": "./preload.js"`（相对于 dist/ 目录）

#### 2. **src/main.ts**（TypeScript，核心文件）

**⭐ 这是插件的核心文件，在这里处理业务逻辑！**

```typescript
/// <reference path="../typings/naimo.d.ts" />

import "./style.css";

async function initApp(): Promise<void> {
  const naimo = window.naimo;

  // ✅ 使用 naimo.onEnter 处理功能触发
  naimo.onEnter(async (params) => {
    const { files, searchText, fullPath } = params;

    // 根据 fullPath 判断是哪个功能触发
    if (fullPath.endsWith("功能标识")) {
      // 处理文件
      if (files && files.length > 0) {
        // 获取 base64（无前缀）
        const base64 = await naimo.system.getLocalImage(files[0].path);

        // 添加 data URL 前缀
        const imageData = `data:image/png;base64,${base64}`;

        // 处理图片...
      }
    }
  });

  naimo.log.info("插件初始化完成");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
````

#### 3. **src/preload.ts**（可选，仅在需要 Node.js API 时创建）

只在需要暴露 fs、path、child_process 等 Node.js API 时创建此文件。

**不要在 preload 中处理业务逻辑！**

#### 4. **index.html**（根目录）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>插件名称</title>
  </head>
  <body>
    <div id="app">
      <!-- UI 内容 -->
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

#### 5. **src/style.css**

基础样式和组件样式。

#### 6. **其他文件**

- `package.json` - 包含 `dev`、`build`、`deploy` 命令
- `.gitignore` - 忽略 node_modules 和 dist
- `README.md` - 说明文档（包含开发工作流）

### 第 4 步：验证和说明

#### 验证文件位置

- ✅ `manifest.json`（根目录）
- ✅ `index.html`（根目录）
- ✅ `src/main.ts`（TypeScript，使用 naimo.onEnter）
- ✅ `src/preload.ts`（可选，仅用于暴露 Node.js API）
- ✅ `src/style.css`
- ✅ `package.json`（包含 dev/build/deploy 命令）

#### 验证搜索配置

- ✅ 为功能配置了合适的搜索类型
- ✅ 提供了多种触发方式（推荐）
- ✅ 配置了 `anonymousSearchFields` 提高可发现性

#### 提供开发说明

```bash
# 安装依赖
pnpm install
pnpm run add-electron-types

# 开发模式（支持热更新）
pnpm run dev
# → dist 路径会自动复制到剪贴板
# → 在 Naimo 搜索框粘贴路径载入插件

# 构建
pnpm run build

# 部署到 GitHub
pnpm run deploy
```

---

## ⚠️ 重要提醒

**生成代码时务必注意：**

### 1. **核心架构** ⭐

- ✅ **在 `src/main.ts` 中使用 `naimo.onEnter` 处理业务逻辑**
- ✅ `src/preload.ts` 仅用于暴露 Node.js API（可选）
- ❌ **不要**在 preload 中处理插件业务逻辑
- ✅ 通过 `params.files` 获取文件路径
- ⚠️ **重要：`getLocalImage(path)` 返回纯 base64，无前缀！**
  - 需手动添加：`data:image/png;base64,${base64}`

### 2. **搜索配置** 🔍

- ✅ 理解 4 种搜索类型：`text`、`regex`、`img`、`files`
- ✅ 基于 `showSearchResults` 函数的搜索逻辑配置 feature
- ✅ **智能提供多种触发方式**（同一功能可配置多个 feature）
- ✅ 配置 `anonymousSearchFields` 提高可发现性
- ✅ 合理使用 `minLength`、`maxLength`、`extensions` 等参数

### 3. **开发工作流** 🔨

- ✅ `pnpm run dev` - 开发模式，自动复制 dist 路径，支持热更新
- ✅ `pnpm run build` - 构建插件包
- ✅ `pnpm run deploy` - 部署到 GitHub build 分支
- ✅ 使用 `pnpm` 而不是 `npm` 或 `yarn`

### 4. **文件位置**

- ✅ **核心业务逻辑** → `src/main.ts`（使用 naimo.onEnter）
- ✅ **Node.js API 暴露** → `src/preload.ts`（可选）
- ✅ **UI 界面** → `index.html`（根目录）
- ✅ **插件配置** → `manifest.json`（根目录）
- ❌ **不要**在根目录创建 `.js` 或 `.ts` 源文件

### 5. **TypeScript**

- ✅ 所有代码使用 TypeScript 语法
- ✅ 引用类型定义：`/// <reference path="../typings/naimo.d.ts" />`
- ✅ 使用 `import`/`export` 而不是 `require`
- ✅ PluginItemData 类型在 naimo.d.ts 中定义

### 6. **Electron 类型安装**

- ✅ 运行 `pnpm run add-electron-types` 安装类型（跳过二进制下载）
- ✅ 节省大量磁盘空间（Electron 完整安装约 200MB+）
- ⚠️ 命令使用 Windows PowerShell 语法

### 7. **manifest.json 配置**

- ✅ `"main": "./index.html"`（相对于 dist/ 目录）
- ✅ `"preload": "./preload.js"`（相对于 dist/ 目录）
- ✅ feature 配置：必需字段 `path`、`name`、`icon`、`description`、`type`
- ✅ 根据 type 添加对应的搜索参数

### 8. **文件获取 API** 📁

- ✅ `naimo.system.getLocalImage(path)` - 获取图片
  - **返回纯 base64 字符串（无 data URL 前缀！）**
  - 需手动添加前缀：`data:image/png;base64,${base64}`
  - 根据扩展名选择正确的 MIME 类型（image/jpeg、image/png、image/webp）
- ✅ `naimo.system.getLocalText(path)` - 获取文本文件（UTF-8）
- ❌ `params.files[0]` **不是** File 对象，只有路径信息
- ✅ 必须使用 API 获取文件实际内容

---

**开始实现插件！** 🚀

记住：

1. 在 `src/main.ts` 中使用 `naimo.onEnter` 处理业务逻辑
2. 智能配置多种搜索触发方式
3. 使用 `pnpm run dev` 开发，享受热更新
4. **`getLocalImage(path)` 返回纯 base64（无前缀），需手动添加 data URL 前缀**
5. 根据文件扩展名选择正确的 MIME 类型（image/jpeg、image/png、image/webp）

```

```
