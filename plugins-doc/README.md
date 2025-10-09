# naimo-plugin-cli

Naimo 插件开发模板初始化工具。

## 安装

### 通过 npx 使用（推荐）

无需安装，直接使用：

```bash
npx naimo-plugin-cli init
```

### 全局安装

```bash
npm install -g naimo-plugin-cli
naimo-plugin init
```

## 使用方法

### 初始化插件项目

在你想要创建插件的目录下运行：

```bash
npx naimo-plugin-cli init
```

这将在当前目录生成以下文件：

- `naimo.d.ts` - TypeScript 类型定义文件
- `schema.json` - 插件配置 schema 文件
- `插件开发指南.md` - 详细的开发文档

### 强制覆盖已存在的文件

如果文件已存在，默认会跳过。使用 `--force` 或 `-f` 强制覆盖：

```bash
npx naimo-plugin-cli init --force
```

## 命令选项

```
Usage: naimo-plugin init [options]

Options:
  -f, --force  Force initialization even if files already exist
  -h, --help   Display help for command
```

## 开发流程

1. 初始化模板文件

   ```bash
   npx naimo-plugin-cli init
   ```

2. 阅读 `插件开发指南.md` 了解开发规范

3. 使用 `naimo.d.ts` 获取类型提示

4. 参考 `schema.json` 配置插件 manifest
