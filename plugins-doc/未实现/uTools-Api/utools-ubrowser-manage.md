# ubrowser 管理 | uTools 开发者文档

用于管理 ubrowser 的实例对象，以及设置 ubrowser 的代理对象等。

## utools.getIdleUBrowsers()

获取所有空闲的 ubrowser 实例对象。

### 类型定义

```typescript
function getIdleUBrowsers(): UBrowserInstance[];
```

- `UBrowserInstance` 参考 UBrowserInstance 类型定义

### 示例代码

```javascript
const idleUBrowsers = utools.getIdleUBrowsers();
console.log(idleUBrowsers);
if (idleUBrowsers.length > 0) {
  utools.ubrowser.goto("https://www.u-tools.cn").run(idleUBrowsers[0].id);
}
```

## utools.setUBrowserProxy(config)

设置 ubrowser 的代理。

### 类型定义

```typescript
function setUBrowserProxy(config: ProxyConfig): boolean;
```

- `config` 参考 Electron ProxyConfig 类型定义

### 示例代码

```javascript
utools.setUBrowserProxy({
  proxyRules: "http://127.0.0.1:1080",
});
```

## utools.clearUBrowserCache()

清除 ubrowser 的缓存。

### 类型定义

```typescript
function clearUBrowserCache(): boolean;
```

### 示例代码

```javascript
utools.clearUBrowserCache();
```
