/**
 * HTTP 服务器类型定义
 */

export interface HttpServerConfig {
  port: number;
  staticRoot?: string;
}

export interface HttpServerStatus {
  isRunning: boolean;
  port: number | null;
  staticRoot: string | null;
}
