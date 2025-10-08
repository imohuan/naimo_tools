# Naimo API 测试插件

这是一个用于测试所有 Naimo API 的调试插件。

## 功能

这个插件提供了一个完整的测试面板，包含以下 API 模块的测试：

### 📝 日志系统 (log)

- `log.error()` - 记录错误日志
- `log.warn()` - 记录警告日志
- `log.info()` - 记录信息日志
- `log.debug()` - 记录调试日志
- `log.throw_error()` - 抛出错误并显示错误对话框

### 🪟 窗口管理 (window)

- `window.hide()` - 隐藏窗口
- `window.show()` - 显示窗口
- `window.minimize()` - 最小化窗口
- `window.maximize()` - 最大化/还原窗口
- `window.close()` - 关闭窗口
- `window.setHeight()` - 设置窗口高度
- `window.setSize()` - 设置窗口尺寸

### 💾 文档数据库 (db)

- `db.put()` - 保存文档
- `db.get()` - 读取文档
- `db.remove()` - 删除文档
- `db.allDocs()` - 获取所有文档

### 🗄️ 键值存储 (storage)

- `storage.setItem()` - 保存键值对
- `storage.getItem()` - 读取键值
- `storage.removeItem()` - 删除键值
- `storage.clear()` - 清空所有存储

### 📋 剪贴板 (clipboard)

- `clipboard.writeText()` - 写入文本
- `clipboard.readText()` - 读取文本
- `clipboard.writeImage()` - 写入图片
- `clipboard.readImage()` - 读取图片
- `clipboard.hasText()` - 检查是否有文本
- `clipboard.hasImage()` - 检查是否有图片
- `clipboard.clear()` - 清空剪贴板

### 🐚 Shell 操作 (shell)

- `shell.openPath()` - 打开路径
- `shell.openUrl()` - 在浏览器中打开网址
- `shell.showInFolder()` - 在文件夹中显示
- `shell.beep()` - 播放系统提示音

### 💻 系统信息 (system)

- `system.notify()` - 发送系统通知
- `system.getVersion()` - 获取应用版本
- `system.getName()` - 获取应用名称
- `system.getDeviceId()` - 获取设备ID
- `system.isMac()` - 检查是否为 Mac
- `system.isWindows()` - 检查是否为 Windows
- `system.isLinux()` - 检查是否为 Linux
- `system.getPath()` - 获取系统路径

### 🖥️ 屏幕与显示器 (screen)

- `screen.getSources()` - 获取屏幕和窗口源
- `screen.getCursorPosition()` - 获取光标位置
- `screen.getPrimaryDisplay()` - 获取主显示器信息
- `screen.getAllDisplays()` - 获取所有显示器信息
- `screen.capture()` - 截图

### 💬 对话框 (dialog)

- `dialog.showOpen()` - 打开文件对话框
- `dialog.showSave()` - 保存文件对话框
- `dialog.showMessage()` - 显示消息框
- `dialog.showError()` - 显示错误框

### ⌨️ 输入模拟 (input)

- `input.pasteText()` - 粘贴文本
- `input.pasteImage()` - 粘贴图片
- `input.pasteFile()` - 粘贴文件
- `input.simulateKeyPress()` - 模拟按键
- `input.simulateHotkey()` - 模拟快捷键

## 使用方法

1. 将插件复制到 Naimo Tools 的 `plugins-test` 目录
2. 重启应用
3. 在搜索框中输入 "api" 或 "测试"
4. 选择 "API 测试面板"
5. 在打开的窗口中点击各个按钮测试对应的 API

## 注意事项

- 数据库和存储测试会产生实际数据，测试数据使用 "test\_" 前缀
- 输入模拟功能需要窗口失去焦点后才能生效
- 某些功能（如截图）可能需要系统权限

## 开发者信息

- **插件ID**: api-test-plugin
- **版本**: 1.0.0
- **作者**: Naimo Tools Team
- **分类**: 程序员必备

## 许可证

MIT License
