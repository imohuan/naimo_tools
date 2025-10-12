/**
 * 开机自启服务
 * 管理应用的开机自启动功能
 */

import { app } from 'electron';
import AutoLaunch from 'auto-launch';
import log from 'electron-log';
import { AppConfigManager } from '../config/appConfig';

export class AutoLaunchService {
  private autoLauncher: AutoLaunch | null = null;
  private configManager: AppConfigManager;
  private isInitialized = false;
  private isDevelopment: boolean;

  constructor(configManager: AppConfigManager) {
    this.configManager = configManager;

    // 检测是否为开发环境
    this.isDevelopment = !app.isPackaged;

    // 只在生产环境初始化 auto-launch
    if (!this.isDevelopment && process.execPath) {
      this.autoLauncher = new AutoLaunch({
        name: app.getName(),
        path: process.execPath,
        isHidden: false, // 启动时不隐藏窗口
      });
      log.debug('AutoLaunchService 已创建（生产环境）');
    } else {
      log.debug('AutoLaunchService 已创建（开发环境 - 功能已禁用）');
    }
  }

  /**
   * 初始化开机自启服务
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.warn('AutoLaunchService 已经初始化');
      return;
    }

    try {
      log.debug('初始化开机自启服务...');

      // 开发环境下跳过初始化
      if (this.isDevelopment) {
        log.debug('⚠️ 开发环境：跳过开机自启初始化');
        this.isInitialized = true;
        return;
      }

      // 从配置中读取开机自启设置
      const autoStart = this.configManager.get('autoStart', false);

      // 同步开机自启状态
      await this.syncAutoLaunchState(autoStart!);

      this.isInitialized = true;
      log.debug('✅ 开机自启服务初始化完成');
    } catch (error) {
      log.error('❌ 开机自启服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 同步开机自启状态
   * @param shouldEnable 是否应该启用
   */
  private async syncAutoLaunchState(shouldEnable: boolean): Promise<void> {
    // 开发环境下跳过
    if (this.isDevelopment || !this.autoLauncher) {
      return;
    }

    try {
      const isEnabled = await this.autoLauncher.isEnabled();

      if (shouldEnable && !isEnabled) {
        await this.autoLauncher.enable();
        log.info('✅ 已启用开机自启');
      } else if (!shouldEnable && isEnabled) {
        await this.autoLauncher.disable();
        log.info('✅ 已禁用开机自启');
      } else {
        log.debug(`开机自启状态已同步: ${shouldEnable ? '启用' : '禁用'}`);
      }
    } catch (error) {
      log.error('同步开机自启状态失败:', error);
      throw error;
    }
  }

  /**
   * 启用开机自启
   */
  async enable(): Promise<void> {
    try {
      log.debug('启用开机自启...');

      // 开发环境下只更新配置
      if (this.isDevelopment || !this.autoLauncher) {
        log.debug('⚠️ 开发环境：仅更新配置，不实际启用开机自启');
        this.configManager.set('autoStart', true);
        return;
      }

      await this.autoLauncher.enable();
      this.configManager.set('autoStart', true);

      log.info('✅ 开机自启已启用');
    } catch (error) {
      log.error('❌ 启用开机自启失败:', error);
      throw error;
    }
  }

  /**
   * 禁用开机自启
   */
  async disable(): Promise<void> {
    try {
      log.debug('禁用开机自启...');

      // 开发环境下只更新配置
      if (this.isDevelopment || !this.autoLauncher) {
        log.debug('⚠️ 开发环境：仅更新配置，不实际禁用开机自启');
        this.configManager.set('autoStart', false);
        return;
      }

      await this.autoLauncher.disable();
      this.configManager.set('autoStart', false);

      log.info('✅ 开机自启已禁用');
    } catch (error) {
      log.error('❌ 禁用开机自启失败:', error);
      throw error;
    }
  }

  /**
   * 设置开机自启状态
   * @param enabled 是否启用
   */
  async setAutoLaunch(enabled: boolean): Promise<void> {
    if (enabled) {
      await this.enable();
    } else {
      await this.disable();
    }
  }

  /**
   * 获取开机自启状态
   * @returns 是否已启用开机自启
   */
  async isEnabled(): Promise<boolean> {
    try {
      // 开发环境下返回配置值
      if (this.isDevelopment || !this.autoLauncher) {
        const configValue = this.configManager.get('autoStart', false);
        log.debug('⚠️ 开发环境：从配置返回开机自启状态:', configValue);
        return configValue || false;
      }

      return await this.autoLauncher.isEnabled();
    } catch (error) {
      log.error('❌ 获取开机自启状态失败:', error);
      return false;
    }
  }

  /**
   * 清理服务
   */
  async cleanup(): Promise<void> {
    log.debug('清理开机自启服务...');
    this.isInitialized = false;
  }
}

