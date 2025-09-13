import { app } from 'electron';
import Store from 'electron-store';
import log from 'electron-log';
import { AppConfig } from '../../shared/types';
import { isProduction } from '../../shared/utils';

/**
 * 应用配置管理类
 */
export class AppConfigManager {
  private store: Store<AppConfig>;

  constructor() {
    this.store = new Store<AppConfig>({
      name: 'app-config',
      cwd: app.getPath('userData'),
      clearInvalidConfig: true,
      defaults: {
        theme: 'light',
        language: 'zh-CN',
        windowSize: {
          width: 1200,
          height: 800
        },
        logLevel: isProduction() ? 'info' : 'debug'
      },
      schema: {
        theme: {
          type: 'string',
          enum: ['light', 'dark'],
          default: 'light'
        },
        language: {
          type: 'string',
          pattern: '^[a-z]{2}-[A-Z]{2}$',
          default: 'zh-CN'
        },
        windowSize: {
          type: 'object',
          properties: {
            width: { type: 'number', minimum: 400, maximum: 3840, default: 1200 },
            height: { type: 'number', minimum: 300, maximum: 2160, default: 800 }
          },
          required: ['width', 'height'],
          additionalProperties: false,
          default: { width: 1200, height: 800 }
        },
        logLevel: {
          type: 'string',
          enum: ['error', 'warn', 'info', 'debug'],
          default: isProduction() ? 'info' : 'debug'
        }
      }
    });

    log.info(`存储配置文件路径: ${this.store.path}`);
  }

  /**
   * 获取完整配置
   */
  getConfig(): AppConfig {
    return this.store.store as AppConfig;
  }

  /**
   * 获取指定配置项
   */
  get<K extends keyof AppConfig>(key: K, defaultValue = undefined): AppConfig[K] | undefined {
    return this.store.get(key) ?? defaultValue
  }

  /**
   * 设置配置项
   */
  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.store.set(key, value);
    log.info(`配置已更新: ${String(key)}`);
  }

  /**
   * 删除配置项
   */
  delete<K extends keyof AppConfig>(key: K): void {
    this.store.delete(key);
    log.info(`配置已删除: ${String(key)}`);
  }

  /**
   * 清空所有配置
   */
  clear(): void {
    this.store.clear();
    log.info('所有配置已清空');
  }

  /**
   * 获取存储实例
   */
  getStore(): Store<AppConfig> {
    return this.store;
  }
}
