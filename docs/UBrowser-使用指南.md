# UBrowser 可编程浏览器使用指南

## 📚 两种模式概述

UBrowser 提供**两种互补的操作模式**，满足不同场景需求：

### 1. 🔗 链式调用模式（自动化脚本）

**适用场景**：一次性执行完整的自动化流程

```javascript
// 示例：自动搜索
await naimo.ubrowser
  .goto("https://www.baidu.com")
  .wait("#kw")
  .value("#kw", "Electron 开发")
  .press("enter")
  .wait("#content_left")
  .run({ width: 1200, height: 800 });
```

**特点**：

- ✅ 构建操作队列，最后 `run()` 统一执行
- ✅ 代码简洁优雅，符合函数式编程风格
- ✅ 适合完整自动化脚本
- ✅ 执行完成后窗口自动关闭（除非指定保留）

---

### 2. ⚡ 即时执行模式（交互式操作）

**适用场景**：逐步操作，窗口保持打开，可随时执行下一步

```javascript
// 创建浏览器实例
const browser = naimo.instantBrowser.create();

// 步骤 1: 打开网页
await browser.goto("https://www.baidu.com", { width: 1200, height: 800 });

// 步骤 2: 等待元素（可以随时点击按钮执行）
await browser.wait("#kw");

// 步骤 3: 输入文本（可以随时点击按钮执行）
await browser.value("#kw", "Electron 开发");

// 步骤 4: 点击搜索（可以随时点击按钮执行）
await browser.press("enter");

// 步骤 5: 提取结果（可以随时点击按钮执行）
const results = await browser.evaluate(() => {
  return Array.from(document.querySelectorAll(".result")).map(
    (item) => item.querySelector("h3")?.innerText
  );
});

// 关闭浏览器
await browser.close();
```

**特点**：

- ✅ **每个操作立即执行**
- ✅ **窗口保持打开**，方便观察和调试
- ✅ 可以随时执行下一步操作
- ✅ 适合交互式调试和分步操作
- ✅ 适合绑定到多个按钮，用户点击哪个按钮就执行对应操作

---

## 🎯 API 对比

| 操作     | 链式调用模式               | 即时执行模式                          |
| -------- | -------------------------- | ------------------------------------- |
| 创建     | `naimo.ubrowser.goto(url)` | `naimo.instantBrowser.create()`       |
| 打开网页 | `.goto(url)`               | `await browser.goto(url, options)`    |
| 等待     | `.wait(selector)`          | `await browser.wait(selector)`        |
| 点击     | `.click(selector)`         | `await browser.click(selector)`       |
| 输入     | `.value(selector, text)`   | `await browser.value(selector, text)` |
| 按键     | `.press(key)`              | `await browser.press(key)`            |
| 执行 JS  | `.evaluate(func)`          | `await browser.evaluate(func)`        |
| 截图     | `.screenshot()`            | `await browser.screenshot()`          |
| 关闭     | 自动关闭                   | `await browser.close()`               |
| 执行     | `.run(options)`            | 立即执行（无需 run）                  |

---

## 💡 使用场景示例

### 场景 1: 自动化测试脚本（链式调用）

```javascript
// 一次性执行完整测试流程
async function testLogin() {
  const result = await naimo.ubrowser
    .goto("https://example.com/login")
    .wait("#username")
    .value("#username", "test@example.com")
    .value("#password", "password123")
    .click("#login-button")
    .wait("#dashboard")
    .evaluate(() => document.title)
    .run({ show: false }); // 后台执行

  console.log("登录后页面标题:", result[0]);
}
```

### 场景 2: 分步调试（即时执行）

```html
<!-- HTML 按钮 -->
<button onclick="step1()">① 打开登录页</button>
<button onclick="step2()">② 输入账号</button>
<button onclick="step3()">③ 输入密码</button>
<button onclick="step4()">④ 点击登录</button>
<button onclick="step5()">⑤ 验证结果</button>
<button onclick="closeStep()">关闭浏览器</button>

<script>
  let browser = null;

  async function step1() {
    browser = naimo.instantBrowser.create();
    await browser.goto("https://example.com/login", {
      width: 1200,
      height: 800,
    });
    console.log("✅ 步骤 1 完成");
  }

  async function step2() {
    await browser.value("#username", "test@example.com");
    console.log("✅ 步骤 2 完成");
  }

  async function step3() {
    await browser.value("#password", "password123");
    console.log("✅ 步骤 3 完成");
  }

  async function step4() {
    await browser.click("#login-button");
    await browser.wait("#dashboard", 10000);
    console.log("✅ 步骤 4 完成");
  }

  async function step5() {
    const title = await browser.evaluate(() => document.title);
    console.log("✅ 步骤 5 完成，页面标题:", title);
  }

  async function closeStep() {
    if (browser) {
      await browser.close();
      browser = null;
      console.log("✅ 浏览器已关闭");
    }
  }
</script>
```

---

## 🔧 即时执行模式完整 API

### 基础操作

```javascript
const browser = naimo.instantBrowser.create();

// 打开网页
await browser.goto(url, options);

// 等待
await browser.wait(1000); // 等待毫秒
await browser.wait("#selector"); // 等待元素
await browser.wait("#selector", 5000); // 等待元素（自定义超时）

// 点击
await browser.click("#button");

// 输入
await browser.value("#input", "text");

// 按键
await browser.press("enter");
await browser.press("a", "ctrl"); // Ctrl+A

// 执行 JS
const result = await browser.evaluate(() => {
  return document.title;
});

// 滚动
await browser.scroll("#footer"); // 滚动到元素
await browser.scroll(0, 500); // 滚动到位置

// 聚焦
await browser.focus("#input");

// 截图
const screenshot = await browser.screenshot();
const elementShot = await browser.screenshot("#element");

// Cookie
const cookies = await browser.cookies();
await browser.setCookies("token", "value");

// 显示/隐藏
await browser.show();
await browser.hide();

// 关闭
await browser.close();
```

---

## 🚀 快速开始

### 测试页面

1. 运行项目
2. 打开插件测试页面：`plugins-test/api-test-plugin/index.html`
3. 找到 "可编程浏览器 (ubrowser)" 区域
4. 尝试两种模式：
   - **链式调用模式**：点击"百度搜索"等示例按钮
   - **即时执行模式**：依次点击 ① ② ③ ④ ⑤ 按钮

---

## ❓ FAQ

### Q: 什么时候用链式调用，什么时候用即时执行？

**链式调用**：

- 自动化脚本（一次执行完成）
- 后台任务
- 不需要观察中间过程

**即时执行**：

- 需要分步观察每个操作效果
- 调试自动化脚本
- 绑定到多个按钮，用户控制执行顺序
- 需要在某一步停下来检查

### Q: 即时执行模式下，如何保持窗口打开？

即时执行模式默认保持窗口打开，直到调用 `browser.close()` 才会关闭。

### Q: 两种模式可以混用吗？

不建议混用。选择一种模式坚持使用。

### Q: 如何调试链式调用？

可以使用 `.devTools()` 打开开发者工具：

```javascript
await naimo.ubrowser
  .goto("https://example.com")
  .devTools("right") // 打开开发者工具
  .wait("#button")
  .run();
```

---

## 📝 注意事项

1. **即时执行模式**必须先调用 `goto()` 创建浏览器窗口
2. **链式调用模式**必须以 `run()` 结尾才会执行
3. 关闭窗口前保存重要数据
4. 即时执行模式需要手动调用 `close()`
5. 注意异步操作，始终使用 `await`

---

## 🎉 总结

- **链式调用模式** = 自动化脚本 + 优雅语法
- **即时执行模式** = 分步操作 + 实时观察

根据你的需求选择合适的模式！ 🚀
