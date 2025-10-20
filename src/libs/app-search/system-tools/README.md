# Windows 系统功能扫描模块

这个模块用于获取 Windows 系统的所有功能和设置项，包括控制面板、管理工具、系统设置等。

## 功能特性

### 支持的功能类型

1. **CPL 文件** - 控制面板项（如鼠标、声音、网络连接等）
2. **MSC 文件** - 管理控制台（如设备管理器、磁盘管理、服务等）
3. **Shell 文件夹** - 特殊系统文件夹（如回收站、此电脑、控制面板等）
4. **常用工具** - 系统自带工具（如记事本、计算器、任务管理器等）
5. **特殊功能** - 需要特定命令的功能（如环境变量、上帝模式等）
6. **Windows 设置** - ms-settings URI（系统设置的各个页面）

### 主要特点

- ✅ 使用 `winreg` 库读取注册表信息
- ✅ 自动扫描系统文件（CPL、MSC）
- ✅ 优化的中文名称和描述
- ✅ 并行扫描提升性能
- ✅ 自动去重
- ✅ TypeScript 类型支持

## 使用方法

### 基础使用

```typescript
import { getSystemTools } from "@/libs/app-search/system-tools";

// 获取所有系统功能
const tools = await getSystemTools();

console.log(`共获取 ${tools.length} 个系统功能`);

// 每个工具包含以下信息：
tools.forEach((tool) => {
  console.log({
    name: tool.name, // 功能名称（中文）
    command: tool.command, // 执行命令
    path: tool.path, // 可执行文件路径（用于提取图标）
    description: tool.description, // 功能描述
  });
});
```

### 按类型获取

```typescript
import { getSystemToolsByType } from "@/libs/app-search/system-tools";

// 仅获取控制面板项和系统设置
const tools = await getSystemToolsByType({
  cpl: true,
  msSettings: true,
});
```

### 单独使用各个扫描器

```typescript
import {
  scanCplFiles,
  scanMscFiles,
  scanShellFolders,
  scanCommonTools,
  getSpecialFeatures,
  getMsSettings,
} from "@/libs/app-search/system-tools";

// 仅扫描 CPL 文件
const cplFiles = await scanCplFiles();

// 仅获取 Windows 设置
const settings = getMsSettings();
```

## 数据结构

### AppPath 接口

```typescript
interface AppPath {
  /** 功能名称（中文） */
  name: string;
  /** 可执行文件路径 */
  path: string;
  /** 执行命令 */
  command?: string;
  /** 功能描述 */
  description?: string;
  /** 图标数据（由父模块填充） */
  icon?: string | null;
}
```

### SystemFeature 接口（内部使用）

```typescript
interface SystemFeature {
  name: string;
  command: string;
  path: string;
  description?: string;
}
```

## 示例输出

```javascript
[
  {
    name: "鼠标属性",
    command: "control main.cpl",
    path: "C:\\Windows\\System32\\main.cpl",
    description: "控制面板 - 鼠标属性",
  },
  {
    name: "设备管理器",
    command: "devmgmt.msc",
    path: "C:\\Windows\\System32\\mmc.exe",
    description: "管理工具 - 设备管理器",
  },
  {
    name: "环境变量",
    command: "rundll32 sysdm.cpl,EditEnvironmentVariables",
    path: "C:\\Windows\\System32\\sysdm.cpl",
    description: "特殊功能 - 编辑系统和用户环境变量",
  },
  {
    name: "系统 - 显示",
    command: "ms-settings:display",
    path: "C:\\Windows\\System32\\SystemSettings.exe",
    description: "Windows 设置 - 屏幕分辨率、亮度和缩放",
  },
];
```

## 技术实现

### 动态扫描

- **CPL/MSC 文件**：通过 `fs.readdir` 扫描 `System32` 目录
- **Shell 文件夹**：使用 `winreg` 读取 `HKCR\\CLSID` 注册表
- **常用工具**：检查预定义列表中的可执行文件是否存在

### 硬编码列表

由于 Windows 没有统一的 API 来获取所有系统功能，以下内容采用精心维护的硬编码列表：

- **Shell CLSID**：已知的重要系统文件夹 GUID
- **ms-settings URI**：Windows 设置的所有页面地址
- **特殊功能**：需要特定 rundll32 或 shell 命令的功能

### 性能优化

- 使用 `Promise.all` 并行执行所有扫描任务
- 使用 `Map` 进行高效去重
- 异步文件访问检查

## 兼容性

- ✅ Windows 10
- ✅ Windows 11
- ⚠️ Windows 7/8（部分功能可能不可用）

## 注意事项

1. **权限要求**：部分功能可能需要管理员权限才能执行
2. **版本差异**：不同 Windows 版本的可用功能可能有所不同
3. **文件缺失**：自动跳过不存在的文件和功能
4. **中文名称**：所有名称和描述都已优化为中文，便于用户理解

## 更新日志

### v1.0.0

- 初始版本
- 支持 6 种类型的系统功能扫描
- 使用 winreg 库进行注册表操作
- 完整的 TypeScript 类型定义
- 优化的中文名称和描述
