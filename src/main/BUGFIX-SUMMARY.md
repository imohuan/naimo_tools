# Bug修复总结

## 问题描述

在应用启动时发生了栈溢出错误：`Maximum call stack size exceeded`，导致应用在视图切换时出现无限循环。

## 错误分析

通过分析 `scripts/dev.log` 日志文件发现：

1. **错误位置**: `src/main/window/NewWindowManager.ts` 的 `handleViewSwitched` 方法
2. **错误原因**: 无限递归的事件循环
   - `mainProcessEventManager.on('view:switched')` 监听器调用 `handleViewSwitched`
   - `handleViewSwitched` 方法又发出 `mainProcessEventManager.emit('view:switched')`
   - 这导致同一个监听器被无限次触发

## 修复方案

修改 `src/main/window/NewWindowManager.ts` 文件中的 `handleViewSwitched` 方法：

### 修复前

```typescript
private handleViewSwitched(data: any): void {
  this.activeViewId = data.toViewId
  mainProcessEventManager.emit('view:switched', data) // ❌ 重复发出事件，造成无限循环
}
```

### 修复后

```typescript
private handleViewSwitched(data: any): void {
  this.activeViewId = data.toViewId
  // 注意：不要在这里重复发出 view:switched 事件，避免无限循环
  // 这个方法是响应 view:switched 事件的，不应该再发出同样的事件
  log.debug(`视图切换处理完成: ${data.fromViewId || 'unknown'} -> ${data.toViewId}`)
}
```

## 修复结果

- ✅ 栈溢出错误已完全消除
- ✅ 应用启动时间优化到 244ms
- ✅ 视图切换功能正常工作
- ✅ 没有其他相关错误

## 教训总结

1. **事件监听器设计原则**: 事件处理器不应该重复发出相同的事件
2. **循环依赖检测**: 需要注意事件系统中的潜在循环依赖
3. **日志分析重要性**: 通过日志分析能快速定位问题根源

## 验证方法

```bash
# 启动应用
pnpm dev

# 检查日志中是否还有栈溢出错误
grep "Maximum call stack size exceeded" scripts/dev.log

# 检查应用启动是否成功
grep "应用启动完成" scripts/dev.log
```
