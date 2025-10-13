# BaseWindow + WebContentsView 显示问题修复

## 问题描述

窗口在任务栏中显示已获得焦点，但界面完全不可见（白屏或空白）。

### 症状

- ✅ 窗口对象存在且未销毁
- ✅ 窗口在任务栏显示并获得焦点
- ❌ 窗口内容完全不可见
- ⚠️ 打开开发者工具或创建其他窗口时问题消失（强制触发渲染）

## 根本原因

### 问题分析

在 `BaseWindowController.ts` 的 `hideWindow` 方法中：

```typescript
// 原有的错误代码
public hideWindow(window: BaseWindow): void {
  // ...
  // 将窗口移到屏幕外隐藏
  window.setPosition(-10000, y)  // ⚠️ 问题根源
  window.hide()
  // ...
}
```

**问题链条**：

1. **隐藏时**：窗口被移动到 `x = -10000`（屏幕外很远的位置）
2. **系统优化**：操作系统和 Electron 检测到窗口在屏幕外，跳过渲染以节省资源
3. **显示时**：调用 `window.show()` 时，窗口**仍在 -10000 位置**
4. **渲染被跳过**：因为窗口还在屏幕外，WebContentsView 的初始渲染被系统优化掉
5. **移动位置**：即使后来通过 `setTimeout` 将窗口移回正常位置，**初始渲染时机已错过**
6. **结果**：窗口在任务栏显示（系统认为窗口存在），但内容不可见（WebContentsView 未渲染）

### 为什么打开控制台就正常？

打开开发者工具会：

- 强制触发窗口重绘
- 创建新的渲染上下文
- 重新计算 WebContentsView 的布局

这些操作"意外地"修复了渲染问题，但这不是正确的解决方案。

## 解决方案

### 用户需求

用户希望窗口显示时**没有系统默认的放大动画**（从小到大的过渡效果），因此最初使用了将窗口移动到 `-10000` 位置的技巧，但这导致了渲染问题。

### 核心思路

使用 **透明度切换** 代替 **位置移动**，既能避免系统动画，又不会导致渲染问题。

**原理**：

1. 窗口保持在正确位置（不移到屏幕外）
2. 显示前设置透明度为 0（完全透明）
3. 调用 `show()`，窗口显示但用户看不见
4. 立即恢复透明度为 1，窗口瞬间出现
5. **效果**：无动画、瞬间显示、渲染正常

### 代码修改

#### 1. 修改 `hideWindow` 方法

```typescript
/**
 * 隐藏窗口
 */
public hideWindow(window: BaseWindow): void {
  try {
    const [x, y] = window.getPosition()
    if (this.isWindowVisible(window)) {
      // 缓存当前位置
      this.hiddenWindowPositions.set(window.id, { x, y })
      log.debug(`缓存窗口显示位置: ID=${window.id}, position=(${x}, ${y})`)
    }

    // ✅ 关键修复：不移动到屏幕外，直接隐藏
    // 移动到屏幕外(-10000)会导致系统跳过渲染，再次显示时 WebContentsView 可能不可见
    // 使用 hide() 已经足够隐藏窗口，无需移动位置
    window.hide()
    log.debug(`窗口已隐藏: ID=${window.id}`)
  } catch (error) {
    log.error('隐藏窗口失败:', error)
  }
}
```

#### 2. 优化 `showWindow` 方法（使用透明度技巧）

```typescript
/**
 * 显示窗口
 */
public showWindow(window: BaseWindow, focus: boolean = false) {
  return new Promise(resolve => {
    try {
      // ✅ 先确保窗口在正确的位置
      const cachedPosition = this.hiddenWindowPositions.get(window.id)
      if (cachedPosition) {
        // 恢复到缓存位置
        window.setPosition(cachedPosition.x, cachedPosition.y)
        this.hiddenWindowPositions.delete(window.id)
        log.debug(`窗口位置已恢复: ID=${window.id}, position=(${cachedPosition.x}, ${cachedPosition.y})`)
      } else {
        // 没有缓存位置，居中显示
        this.centerWindow(window)
        log.debug(`窗口已居中: ID=${window.id}`)
      }

      // ✅ 关键技巧：先设置为完全透明，避免系统动画
      // 窗口在正确位置显示，但用户看不到放大动画
      window.setOpacity(0)

      // ✅ 使用 showInactive 显示但不立即聚焦
      window.showInactive()
      log.debug(`窗口已显示（透明状态）: ID=${window.id}`)

      // ✅ 立即恢复透明度，实现无动画显示
      // 使用 setImmediate 确保在下一个事件循环中执行
      setImmediate(() => {
        window.setOpacity(1)
        log.debug(`窗口透明度已恢复: ID=${window.id}`)

        // 延迟聚焦，确保窗口和 WebContentsView 渲染完成
        if (focus) {
          setTimeout(() => {
            window.focus()
            log.debug(`窗口已聚焦: ID=${window.id}`)
            resolve(true)
          }, 30)
        } else {
          resolve(true)
        }
      })
    } catch (error) {
      log.error('显示窗口失败:', error)
      resolve(false)
    }
  })
}
```

#### 3. 改进 `isWindowVisible` 方法

```typescript
/**
 * 检查窗口是否可见（完全在屏幕内）
 */
public isWindowVisible(window: BaseWindow): boolean {
  try {
    // ✅ 首先检查窗口是否被隐藏
    const isVisible = window.isVisible()
    if (!isVisible) {
      log.debug(`窗口不可见（已隐藏）: ID=${window.id}`)
      return false
    }

    const windowBounds = window.getBounds()
    const { x, y, width, height } = windowBounds

    // 获取主显示器的工作区域
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

    // 检查窗口是否完全在屏幕内
    const isCompletelyVisible =
      x >= 0 &&
      y >= 0 &&
      x + width <= screenWidth &&
      y + height <= screenHeight

    log.debug(`窗口可见性检查: ID=${window.id}, visible=${isCompletelyVisible}`)

    return isCompletelyVisible
  } catch (error) {
    log.error('检查窗口可见性失败:', error)
    return false
  }
}
```

## 关键改进点

### 1. **移除屏幕外移动**

- ❌ 旧方案：`window.setPosition(-10000, y)` → `window.hide()`
- ✅ 新方案：直接 `window.hide()`

### 2. **先设置位置，再显示**

- ❌ 旧方案：先 `show()`，后 `setPosition()`
- ✅ 新方案：先 `setPosition()`，后 `showInactive()`

### 3. **使用 showInactive**

- 使用 `showInactive()` 代替 `show()`
- 避免窗口显示时立即抢夺焦点
- 通过延迟的 `focus()` 控制聚焦时机

### 4. **减少 setTimeout 嵌套**

- ❌ 旧方案：多层 `setTimeout` 嵌套（100ms → 100ms）
- ✅ 新方案：单层 `setTimeout`（50ms），逻辑更清晰

## 测试验证

修复后应该满足：

- ✅ 窗口显示/隐藏正常
- ✅ WebContentsView 内容可见
- ✅ 不需要打开控制台就能正常显示
- ✅ 多次显示/隐藏不会出现白屏
- ✅ 窗口位置正确（居中或恢复到上次位置）

## 相关技术点

### Electron 窗口渲染机制

1. **屏幕外窗口优化**：操作系统和浏览器会跳过屏幕外窗口的渲染
2. **WebContentsView 依赖**：WebContentsView 的渲染依赖父窗口的渲染状态
3. **初始渲染时机**：窗口首次显示时会触发渲染管线，错过时机需要额外触发

### BaseWindow vs BrowserWindow

- `BaseWindow`：Electron 30+ 的新 API，更底层，需要配合 `WebContentsView` 使用
- `BrowserWindow`：传统 API，内置 WebContents
- 本项目使用 `BaseWindow + WebContentsView` 架构，需要特别注意渲染同步问题

## 经验总结

1. **禁用窗口动画的正确方式**
   - ❌ 不要：移动到屏幕外 → 可能导致渲染问题
   - ✅ 应该：使用透明度切换 → 既无动画又不影响渲染

2. **透明度 vs 位置移动**
   - `setOpacity(0)` 只影响显示，不影响渲染管线
   - `setPosition(-10000, y)` 触发系统优化，跳过渲染

3. **时序控制的重要性**
   - 使用 `setImmediate` 而非 `setTimeout(fn, 0)`
   - `setImmediate` 确保在下一个事件循环执行，更精确

4. **调试技巧**
   - 当"打开控制台就正常"时 → 很可能是渲染时机问题
   - 透明窗口、屏幕外窗口都可能被系统优化

5. **性能考虑**
   - 透明度切换是 GPU 加速的，性能开销极小
   - 比位置移动更高效（不触发布局重计算）

## 日期

- **发现日期**：2025-10-13
- **修复版本**：v1.x.x
- **影响范围**：BaseWindow + WebContentsView 架构的所有窗口

---

**注意**：此问题在 Electron 的 GitHub Issues 中也有类似报告，主要与透明窗口、屏幕外渲染优化相关。
