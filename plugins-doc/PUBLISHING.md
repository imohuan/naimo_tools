# 发布指南

本文档介绍如何将 `naimo-plugin-cli` 发布到 npm。

## 前置要求

1. 拥有 npm 账户
2. 已登录 npm（运行 `npm login`）
3. Node.js >= 14.0.0

## 发布步骤

### 方法一：使用自动化脚本（推荐）

```bash
# 1. 进入项目目录
cd plugins-doc

# 2. 使用自动化脚本发布
# 自动 patch 版本 (1.0.0 -> 1.0.1)
node publish.js --yes --patch

# 自动 minor 版本 (1.0.0 -> 1.1.0)
node publish.js --yes --minor

# 自动 major 版本 (1.0.0 -> 2.0.0)
node publish.js --yes --major

# 自定义版本号
node publish.js --yes --version 1.2.3
```

### 方法二：手动发布

```bash
# 1. 进入项目目录
cd plugins-doc

# 2. 更新版本号
npm version patch  # 或 minor, major

# 3. 发布到 npm
npm publish
```

## 发布脚本说明

`publish.js` 脚本会自动完成以下步骤：

1. ✅ 读取当前版本
2. ✅ 检查 npm 上的版本
3. ✅ 更新版本号
4. ✅ 确认发布信息
5. ✅ 发布到 npm

## 脚本选项

```bash
-y, --yes              # 跳过所有确认提示
--skip-confirm         # 跳过最终发布确认
--patch                # 自动选择 patch 版本更新 (x.y.Z)
--minor                # 自动选择 minor 版本更新 (x.Y.0)
--major                # 自动选择 major 版本更新 (X.0.0)
-v, --version <版本号>  # 指定自定义版本号 (格式: x.y.z)
-h, --help             # 显示帮助信息
```

## 发布后验证

```bash
# 查看 npm 上的最新版本
npm view naimo-plugin-cli version

# 测试 npx 安装
npx naimo-plugin-cli init
```

## 注意事项

1. **包名**：确保包名 `naimo-plugin-cli` 在 npm 上可用
2. **作用域包**：如果使用作用域包（@开头），首次发布需要使用 `npm publish --access public`
3. **版本号**：遵循语义化版本规范（Semver）
4. **测试**：发布前在本地测试 `node bin/cli.js init`

## 首次发布

如果是首次发布，需要确保：

1. 包名在 npm 上未被占用
2. 已登录 npm 账户
3. 如果是作用域包，使用：
   ```bash
   npm publish --access public
   ```

## 发布检查清单

- [ ] 已更新版本号
- [ ] 已测试 CLI 功能
- [ ] README.md 内容完整
- [ ] package.json 信息正确
- [ ] 已登录 npm 账户
- [ ] template/ 目录包含所有必要文件

## 常见问题

### Q: 发布失败提示 "You must be logged in to publish packages"

**A:** 运行 `npm login` 登录 npm 账户

### Q: 发布失败提示 "Package name already exists"

**A:** 包名已被占用，需要在 package.json 中修改包名

### Q: 如何撤销已发布的版本？

**A:** 使用 `npm unpublish naimo-plugin-cli@版本号`（仅限 72 小时内）

### Q: 如何废弃某个版本？

**A:** 使用 `npm deprecate naimo-plugin-cli@版本号 "废弃原因"`
