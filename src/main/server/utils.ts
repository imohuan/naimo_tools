/**
 * HTTP 服务器工具函数
 */

import { networkInterfaces } from "os";

/**
 * 验证 URL 是否有效
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 获取本地 IP 地址列表
 */
export function getLocalIPs(): string[] {
  const ips: string[] = ["localhost", "127.0.0.1"];
  const interfaces = networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;

    for (const addr of iface) {
      // 只获取 IPv4 地址，排除内部地址
      if (addr.family === "IPv4" && !addr.internal) {
        ips.push(addr.address);
      }
    }
  }

  return [...new Set(ips)]; // 去重
}
