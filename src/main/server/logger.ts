/**
 * 服务器日志模块
 */

import { join, dirname } from "path";
import electronLog from "electron-log";

/**
 * 创建独立的服务器日志实例，输出到 server.log
 */
export const createServerLogger = () => {
  const serverLog = electronLog.create({ logId: "server" });

  // 获取默认日志文件的目录
  const defaultLogFile = electronLog.transports.file.getFile();
  const logDir = dirname(defaultLogFile.path);

  // 配置服务器日志输出到 server.log
  serverLog.transports.file.resolvePathFn = (variables) => {
    return join(logDir, "server.log");
  };

  // 保持与主日志相同的配置
  serverLog.transports.console.level = electronLog.transports.console.level;
  serverLog.transports.file.level = electronLog.transports.file.level;
  serverLog.transports.file.format = electronLog.transports.file.format;

  return serverLog;
};

// 导出服务器专用的日志实例
export const log = createServerLogger();
