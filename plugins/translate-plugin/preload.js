const { contextBridge } = require('electron');
const https = require('https');
const crypto = require('crypto');

// 腾讯云API签名v3实现
function sha256(message, secret = "", encoding) {
  const hmac = crypto.createHmac("sha256", secret);
  return hmac.update(message).digest(encoding);
}

function getHash(message, encoding = "hex") {
  const hash = crypto.createHash("sha256");
  return hash.update(message).digest(encoding);
}

function getDate(timestamp) {
  const date = new Date(timestamp * 1000);
  const year = date.getUTCFullYear();
  const month = ("0" + (date.getUTCMonth() + 1)).slice(-2);
  const day = ("0" + date.getUTCDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

// 翻译函数
async function translateText({ sourceText, source, target, settings }) {
  return new Promise((resolve, reject) => {
    try {
      const SECRET_ID = settings.secretId;
      const SECRET_KEY = settings.secretKey;
      const TOKEN = "";

      if (!SECRET_ID || !SECRET_KEY) {
        resolve({
          success: false,
          error: "请先配置腾讯云API密钥"
        });
        return;
      }

      const host = "tmt.tencentcloudapi.com";
      const service = "tmt";
      const region = settings.region || "ap-chengdu";
      const action = "TextTranslate";
      const version = "2018-03-21";
      const timestamp = parseInt(String(new Date().getTime() / 1000));
      const date = getDate(timestamp);

      const payload = JSON.stringify({
        SourceText: sourceText,
        Source: source,
        Target: target,
        ProjectId: 0
      });

      // ************* 步骤 1：拼接规范请求串 *************
      const signedHeaders = "content-type;host";
      const hashedRequestPayload = getHash(payload);
      const httpRequestMethod = "POST";
      const canonicalUri = "/";
      const canonicalQueryString = "";
      const canonicalHeaders =
        "content-type:application/json; charset=utf-8\n" + "host:" + host + "\n";

      const canonicalRequest =
        httpRequestMethod +
        "\n" +
        canonicalUri +
        "\n" +
        canonicalQueryString +
        "\n" +
        canonicalHeaders +
        "\n" +
        signedHeaders +
        "\n" +
        hashedRequestPayload;

      // ************* 步骤 2：拼接待签名字符串 *************
      const algorithm = "TC3-HMAC-SHA256";
      const hashedCanonicalRequest = getHash(canonicalRequest);
      const credentialScope = date + "/" + service + "/" + "tc3_request";
      const stringToSign =
        algorithm +
        "\n" +
        timestamp +
        "\n" +
        credentialScope +
        "\n" +
        hashedCanonicalRequest;

      // ************* 步骤 3：计算签名 *************
      const kDate = sha256(date, "TC3" + SECRET_KEY);
      const kService = sha256(service, kDate);
      const kSigning = sha256("tc3_request", kService);
      const signature = sha256(stringToSign, kSigning, "hex");

      // ************* 步骤 4：拼接 Authorization *************
      const authorization =
        algorithm +
        " " +
        "Credential=" +
        SECRET_ID +
        "/" +
        credentialScope +
        ", " +
        "SignedHeaders=" +
        signedHeaders +
        ", " +
        "Signature=" +
        signature;

      // ************* 步骤 5：构造并发起请求 *************
      const headers = {
        Authorization: authorization,
        "Content-Type": "application/json; charset=utf-8",
        Host: host,
        "X-TC-Action": action,
        "X-TC-Timestamp": timestamp,
        "X-TC-Version": version,
      };

      if (region) {
        headers["X-TC-Region"] = region;
      }
      if (TOKEN) {
        headers["X-TC-Token"] = TOKEN;
      }

      const options = {
        hostname: host,
        method: httpRequestMethod,
        headers,
        timeout: 30000 // 30秒超时
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const result = JSON.parse(data);

            if (result.Response && result.Response.Error) {
              resolve({
                success: false,
                error: `翻译失败: ${result.Response.Error.Message}`,
                errorCode: result.Response.Error.Code
              });
            } else if (result.Response && result.Response.TargetText) {
              resolve({
                success: true,
                translatedText: result.Response.TargetText,
                sourceLanguage: result.Response.Source || source,
                targetLanguage: result.Response.Target || target
              });
            } else {
              resolve({
                success: false,
                error: "翻译响应格式异常",
                rawResponse: result
              });
            }
          } catch (error) {
            resolve({
              success: false,
              error: `解析响应失败: ${error.message}`,
              rawData: data
            });
          }
        });
      });

      req.on("error", (error) => {
        resolve({
          success: false,
          error: `网络请求失败: ${error.message}`
        });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({
          success: false,
          error: "请求超时，请检查网络连接"
        });
      });

      req.write(payload);
      req.end();

    } catch (error) {
      resolve({
        success: false,
        error: `翻译服务异常: ${error.message}`
      });
    }
  });
}

// 获取插件设置 - 注意：这些方法在融合preload环境中可能不需要
// 建议在HTML中直接使用 naimo.ipcRouter.storeGet()
async function getPluginSettings() {
  try {
    // 通过IPC获取插件设置
    const settings = await naimo.router.storeGet('plugin-settings.translate-plugin');
    return settings || {};
  } catch (error) {
    console.error('获取插件设置失败:', error);
    return {};
  }
}

// 保存插件设置 - 注意：建议在HTML中直接使用基础preload的API
async function savePluginSettings(settings) {
  try {
    await naimo.router.storeSet('plugin-settings.translate-plugin', settings);
    return true;
  } catch (error) {
    console.error('保存插件设置失败:', error);
    return false;
  }
}

// 语言代码映射
const languageNames = {
  'auto': '自动检测',
  'zh': '中文',
  'en': '英语',
  'ja': '日语',
  'ko': '韩语',
  'fr': '法语',
  'de': '德语',
  'es': '西班牙语',
  'ru': '俄语',
  'pt': '葡萄牙语',
  'it': '意大利语',
  'ar': '阿拉伯语',
  'th': '泰语',
  'vi': '越南语'
};

// 获取语言名称
function getLanguageName(code) {
  return languageNames[code] || code;
}

// 暴露插件特定API给渲染进程
contextBridge.exposeInMainWorld('translatePluginAPI', {
  translateText,
  getPluginSettings,
  savePluginSettings,
  getLanguageName,

  // 通知
  showNotification: (title, body) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiByeD0iNCIgZmlsbD0iIzEwQjk4MSIvPgo8cGF0aCBkPSJNNiA3aDhNNiAxMWg2TTYgMTVoNCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8cGF0aCBkPSJNMTQgMTNsMiAyLTIgMiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K' });
    }
  }
});

// 请求通知权限
if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
  Notification.requestPermission();
}

// 页面加载完成后的初始化
window.addEventListener('DOMContentLoaded', () => {
  // 添加快捷键支持
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + W 关闭窗口
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      naimo.router.windowCloseWindow();
    }

    // F11 切换全屏
    if (e.key === 'F11') {
      e.preventDefault();
      naimo.router.windowToggleFullscreen();
    }

    // Esc 最小化窗口
    if (e.key === 'Escape') {
      e.preventDefault();
      naimo.router.windowMinimize();
    }
  });

  // 禁用右键菜单（可选）
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // 禁用选择文本（可选，根据需要开启）
  // document.addEventListener('selectstart', (e) => {
  //   if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
  //     e.preventDefault();
  //   }
  // });

  console.log('翻译插件预加载脚本已初始化');
});
