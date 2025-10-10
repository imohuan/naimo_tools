"use strict";
const electron = require("electron");
const https = require("https");
const crypto = require("crypto");
function sha256(message, secret = "", encoding) {
  const hmac = crypto.createHmac("sha256", secret);
  return encoding ? hmac.update(message).digest(encoding) : hmac.update(message).digest();
}
function getHash(message, encoding = "hex") {
  const hash = crypto.createHash("sha256");
  return hash.update(message).digest(encoding);
}
function getDate(timestamp) {
  const date = new Date(timestamp * 1e3);
  const year = date.getUTCFullYear();
  const month = ("0" + (date.getUTCMonth() + 1)).slice(-2);
  const day = ("0" + date.getUTCDate()).slice(-2);
  return `${year}-${month}-${day}`;
}
async function translateText(params) {
  return new Promise((resolve) => {
    try {
      const { sourceText, source, target, settings } = params;
      const SECRET_ID = settings.secretId;
      const SECRET_KEY = settings.secretKey;
      const TOKEN = "";
      if (!SECRET_ID || !SECRET_KEY) {
        resolve({
          success: false,
          error: "请先在插件设置中配置腾讯云API密钥"
        });
        return;
      }
      const host = "tmt.tencentcloudapi.com";
      const service = "tmt";
      const region = settings.region || "ap-chengdu";
      const action = "TextTranslate";
      const version = "2018-03-21";
      const timestamp = Math.floor(Date.now() / 1e3);
      const date = getDate(timestamp);
      const payload = JSON.stringify({
        SourceText: sourceText,
        Source: source,
        Target: target,
        ProjectId: 0
      });
      const signedHeaders = "content-type;host";
      const hashedRequestPayload = getHash(payload);
      const httpRequestMethod = "POST";
      const canonicalUri = "/";
      const canonicalQueryString = "";
      const canonicalHeaders = "content-type:application/json; charset=utf-8\nhost:" + host + "\n";
      const canonicalRequest = httpRequestMethod + "\n" + canonicalUri + "\n" + canonicalQueryString + "\n" + canonicalHeaders + "\n" + signedHeaders + "\n" + hashedRequestPayload;
      const algorithm = "TC3-HMAC-SHA256";
      const hashedCanonicalRequest = getHash(canonicalRequest);
      const credentialScope = date + "/" + service + "/tc3_request";
      const stringToSign = algorithm + "\n" + timestamp + "\n" + credentialScope + "\n" + hashedCanonicalRequest;
      const kDate = sha256(date, "TC3" + SECRET_KEY);
      const kService = sha256(service, kDate);
      const kSigning = sha256("tc3_request", kService);
      const signature = sha256(stringToSign, kSigning, "hex");
      const authorization = algorithm + " Credential=" + SECRET_ID + "/" + credentialScope + ", SignedHeaders=" + signedHeaders + ", Signature=" + signature;
      const headers = {
        Authorization: authorization,
        "Content-Type": "application/json; charset=utf-8",
        Host: host,
        "X-TC-Action": action,
        "X-TC-Timestamp": timestamp.toString(),
        "X-TC-Version": version
      };
      if (region) {
        headers["X-TC-Region"] = region;
      }
      if (TOKEN) ;
      const options = {
        hostname: host,
        method: httpRequestMethod,
        headers,
        timeout: 3e4
        // 30秒超时
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
const translatePluginAPI = {
  translateText
};
electron.contextBridge.exposeInMainWorld("translatePluginAPI", translatePluginAPI);
const handlers = {
  // 文本翻译功能
  "text-translate": {
    onEnter: async (params) => {
      try {
        console.log("翻译功能被触发，参数:", params);
      } catch (error) {
        console.error("翻译功能启动失败:", error);
      }
    }
  },
  // 快速翻译功能
  "quick-translate": {
    onEnter: async (params) => {
      try {
        console.log("快速翻译功能被触发，参数:", params);
      } catch (error) {
        console.error("快速翻译功能启动失败:", error);
      }
    }
  }
};
if (typeof module !== "undefined" && module.exports) {
  module.exports = handlers;
}
window.addEventListener("DOMContentLoaded", () => {
  console.log("翻译插件 Preload 脚本已初始化");
});
