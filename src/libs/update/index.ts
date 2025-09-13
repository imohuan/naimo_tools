/**
 * 应用自动更新配置模块
 * 提供 Electron 应用的自动更新功能，支持多种更新源和自定义配置
 * 
 * @example
 * ```typescript
 * import { updateElectronApp } from './update';
 * import log from 'electron-log';
 * 
 * // 使用 electron-log 作为日志记录器
 * updateElectronApp({
 *   logger: log,
 *   updateInterval: '10 minutes',
 *   notifyUser: true
 * });
 * ```
 */
import ms from 'ms';
/** @ts-ignore */
import gh from 'github-url-to-object';

import fs from 'fs';
import os from 'os';
import path from 'path';
import { format } from 'util';

import { app, autoUpdater, dialog } from 'electron';

// 导入类型定义
import type {
  IUpdateInfo,
  IUpdateDialogStrings,
  IUpdateElectronAppOptions,
  ILogger,
} from './typings';

import { UpdateSourceType } from './typings';

// ==================== 常量定义 ====================

// eslint-disable-next-line @typescript-eslint/no-require-imports
import pkg from '../../../package.json';

/** 用户代理字符串 */
const userAgent = format('%s/%s (%s: %s)', pkg.name, pkg.version, os.platform(), os.arch());

/** 支持的平台列表 */
const supportedPlatforms = ['darwin', 'win32'];

// ==================== 工具函数 ====================

/**
 * 检查 URL 是否为 HTTPS 协议
 * @param maybeURL 待检查的 URL 字符串
 * @returns 是否为 HTTPS URL
 */
const isHttpsUrl = (maybeURL: string): boolean => {
  try {
    const { protocol } = new URL(maybeURL);
    return protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * 从 package.json 中猜测仓库地址
 * @returns 仓库地址字符串，格式为 `owner/repo`
 * @throws {Error} 当无法找到有效的仓库信息时抛出错误
 */
const guessRepo = (): string => {
  try {
    const pkgBuf = fs.readFileSync(path.join(app.getAppPath(), 'package.json'));
    const pkg = JSON.parse(pkgBuf.toString());
    const repoString = pkg.repository?.url || pkg.repository;
    const repoObject = gh(repoString);

    if (!repoObject) {
      throw new Error("repo not found. Add repository string to your app's package.json file");
    }

    return `${repoObject.user}/${repoObject.repo}`;
  } catch (error) {
    console.error('获取仓库信息失败:', error);
    throw new Error("无法从 package.json 中获取仓库信息，请确保 repository 字段配置正确");
  }
};

// ==================== 主要功能函数 ====================

/**
 * 初始化应用自动更新功能
 * @param opts 更新配置选项
 */
export function updateElectronApp(opts: IUpdateElectronAppOptions = {}): void {
  // 提前验证输入参数，便于开发时调试
  const safeOpts = validateInput(opts);

  // 开发模式下不执行更新检查
  if (!app.isPackaged) {
    const message = '更新配置检查通过；由于应用处于开发模式，跳过更新检查';
    safeOpts.logger?.info(message);
    return;
  }

  // 根据应用状态初始化更新器
  if (app.isReady()) {
    initUpdater(safeOpts);
  } else {
    app.on('ready', () => initUpdater(safeOpts));
  }
}

/**
 * 初始化自动更新器
 * @param opts 验证后的配置选项
 */
function initUpdater(opts: ReturnType<typeof validateInput>): void {
  const { updateSource, updateInterval, notifyUser, onNotifyUser, logger } = opts;

  // 检查平台支持性
  if (!supportedPlatforms.includes(process?.platform)) {
    logger?.warn(
      `Electron 的 autoUpdater 不支持 '${process.platform}' 平台。参考: https://www.electronjs.org/docs/latest/api/auto-updater#platform-notices`,
    );
    return;
  }

  // 根据更新源类型构建 feed URL
  let feedURL: string;
  let serverType: 'default' | 'json' = 'default';

  switch (updateSource.type) {
    case UpdateSourceType.ElectronPublicUpdateService: {
      feedURL = `${updateSource.host}/${updateSource.repo}/${process.platform}-${process.arch}/${app.getVersion()}`;
      break;
    }
    case UpdateSourceType.StaticStorage: {
      feedURL = updateSource.baseUrl;
      if (process.platform === 'darwin') {
        feedURL += '/RELEASES.json';
        serverType = 'json';
      }
      break;
    }
  }

  // 测试
  // feedURL = "https://update.electronjs.org/imohuan/electron-vue3-template/win32-x64/0.0.1"

  const requestHeaders = { 'User-Agent': userAgent };
  const updateConfig = { url: feedURL, headers: requestHeaders, serverType, };
  logger?.info('设置更新源', { updateConfig });

  // 配置自动更新器
  autoUpdater.setFeedURL(updateConfig);
  // 绑定更新事件监听器
  setupUpdateEventListeners(notifyUser, onNotifyUser, logger);
  // 立即检查更新并设置定期检查
  autoUpdater.checkForUpdates();
  const intervalMs = ms(updateInterval as ms.StringValue);
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, intervalMs);
}

/**
 * 设置更新事件监听器
 * @param notifyUser 是否通知用户
 * @param onNotifyUser 自定义通知回调
 * @param logger 日志记录器
 */
function setupUpdateEventListeners(
  notifyUser: boolean,
  onNotifyUser?: (info: IUpdateInfo) => void,
  logger?: ILogger
): void {
  autoUpdater.on('error', (err) => {
    logger?.error('更新器错误', err);
  });

  autoUpdater.on('checking-for-update', () => {
    logger?.info('正在检查更新...');
  });

  autoUpdater.on('update-available', () => {
    logger?.info('发现可用更新，正在下载...');
  });

  autoUpdater.on('update-not-available', () => {
    logger?.info('当前已是最新版本');
  });

  // 如果启用用户通知，设置下载完成事件监听器
  if (notifyUser) {
    autoUpdater.on(
      'update-downloaded',
      (event, releaseNotes, releaseName, releaseDate, updateURL) => {
        logger?.info('更新下载完成', { releaseNotes, releaseName, releaseDate, updateURL });

        const updateInfo: IUpdateInfo = {
          event,
          releaseNotes,
          releaseDate,
          releaseName,
          updateURL,
        };

        if (typeof onNotifyUser === 'function') {
          logger?.info('使用自定义用户通知回调');
          onNotifyUser(updateInfo);
        } else {
          logger?.info('使用默认用户通知对话框');
          makeUserNotifier(undefined, logger)(updateInfo);
        }
      },
    );
  }
}

// ==================== 用户通知相关函数 ====================

/**
 * 创建默认的用户通知回调函数
 * 用于在更新下载完成后显示对话框提示用户
 * @param dialogProps 对话框文本配置
 * @param logger 日志记录器
 * @returns 用户通知回调函数
 */
export function makeUserNotifier(dialogProps?: IUpdateDialogStrings, logger?: ILogger): (info: IUpdateInfo) => void {
  const defaultDialogMessages = {
    title: '应用更新',
    detail: '新版本已下载完成。重启应用以应用更新。',
    restartButtonText: '立即重启',
    laterButtonText: '稍后',
  };

  const assignedDialog = Object.assign({}, defaultDialogMessages, dialogProps);

  return (info: IUpdateInfo) => {
    const { releaseNotes, releaseName } = info;
    const { title, restartButtonText, laterButtonText, detail } = assignedDialog;

    const dialogOpts: Electron.MessageBoxOptions = {
      type: 'info',
      buttons: [restartButtonText, laterButtonText],
      title,
      message: process.platform === 'win32' ? releaseNotes : releaseName,
      detail,
    };

    logger?.info('显示更新通知对话框', { title, message: dialogOpts.message });

    dialog.showMessageBox(dialogOpts).then(({ response }) => {
      if (response === 0) {
        logger?.info('用户选择立即重启应用');
        autoUpdater.quitAndInstall();
      } else {
        logger?.info('用户选择稍后重启');
      }
    });
  };
}

// ==================== 配置验证函数 ====================

/**
 * 验证和标准化输入配置
 * @param opts 原始配置选项
 * @returns 验证后的配置选项
 */
function validateInput(opts: IUpdateElectronAppOptions) {
  const defaults = {
    host: 'https://update.electronjs.org',
    updateInterval: '10 minutes',
    notifyUser: true,
  };

  const { host, updateInterval, notifyUser, onNotifyUser, logger } = Object.assign(
    {},
    defaults,
    opts,
  );

  let updateSource = opts.updateSource;

  // 处理从旧属性迁移到新更新源配置
  if (!updateSource) {
    updateSource = {
      type: UpdateSourceType.ElectronPublicUpdateService,
      repo: opts.repo || guessRepo(),
      host,
    };
  }

  // 验证更新源配置
  switch (updateSource.type) {
    case UpdateSourceType.ElectronPublicUpdateService: {
      if (!updateSource.repo?.includes('/')) {
        throw new Error('仓库地址是必需的，格式应为 `owner/repo`');
      }

      if (!updateSource.host) {
        updateSource.host = host;
      }

      if (!updateSource.host || !isHttpsUrl(updateSource.host)) {
        throw new Error('主机地址必须是有效的 HTTPS URL');
      }
      break;
    }
    case UpdateSourceType.StaticStorage: {
      if (!updateSource.baseUrl || !isHttpsUrl(updateSource.baseUrl)) {
        throw new Error('baseUrl 必须是有效的 HTTPS URL');
      }
      break;
    }
  }

  // 验证更新间隔
  if (typeof updateInterval !== 'string' || !updateInterval.match(/^\d+/)) {
    throw new Error('更新间隔必须是人类友好的字符串，如 `20 minutes`');
  }

  const intervalMs = ms(updateInterval as ms.StringValue);
  if (intervalMs < 5 * 60 * 1000) {
    throw new Error('更新间隔必须为 `5 minutes` 或更长');
  }
  return { updateSource, updateInterval, notifyUser, onNotifyUser, logger };
}

// ==================== 重新导出类型 ====================

export type {
  IElectronUpdateServiceSource,
  IStaticUpdateSource,
  IUpdateSource,
  IUpdateInfo,
  IUpdateDialogStrings,
  IUpdateElectronAppOptions,
  ILogger,
} from './typings';

export { UpdateSourceType } from './typings';