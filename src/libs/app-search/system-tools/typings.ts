import type { AppPath } from '../typings';

/** 系统功能项（内部使用） */
export interface SystemFeature {
  /** 功能名称 */
  name: string;
  /** 执行命令 */
  command: string;
  /** 可执行文件路径（用于提取图标） */
  path: string;
  /** 功能描述 */
  description?: string;
}

/** 注册表扫描选项 */
export interface RegistryScanOptions {
  /** 是否获取详细信息 */
  getDetails?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/** 将 SystemFeature 转换为 AppPath */
export function toAppPath(feature: SystemFeature): AppPath {
  return {
    name: feature.name,
    path: feature.path,
    command: feature.command,
    description: feature.name.replace(' - ', '-')
  };
}

