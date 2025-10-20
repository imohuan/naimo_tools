import type { AppPath } from '../typings';
import { toAppPath } from './typings';
import { scanCplFiles, scanMscFiles } from './cpl-msc-scanner';
import { scanShellFolders } from './clsid-scanner';
import { scanCommonTools } from './common-tools';
import { getSpecialFeatures } from './special-features';
import { getMsSettings } from './ms-settings';

/**
 * 获取所有 Windows 系统功能
 * 包括：
 * 1. CPL 控制面板项
 * 2. MSC 管理控制台
 * 3. Shell 特殊文件夹（CLSID）
 * 4. 常用系统工具
 * 5. 特殊功能
 * 6. Windows 设置（ms-settings）
 * 
 * @returns 系统功能列表
 */
export async function getSystemTools(): Promise<AppPath[]> {
  try {
    console.log('🔍 开始扫描 Windows 系统功能...');

    // 并行执行所有扫描任务
    const [
      cplFiles,
      mscFiles,
      shellFolders,
      commonTools,
      specialFeatures,
      msSettings
    ] = await Promise.all([
      scanCplFiles(),
      scanMscFiles(),
      scanShellFolders(),
      scanCommonTools(),
      getSpecialFeatures(),
      Promise.resolve(getMsSettings())
    ]);

    console.log(`✅ CPL 文件: ${cplFiles.length} 个`);
    console.log(`✅ MSC 文件: ${mscFiles.length} 个`);
    console.log(`✅ Shell 文件夹: ${shellFolders.length} 个`);
    console.log(`✅ 常用工具: ${commonTools.length} 个`);
    console.log(`✅ 特殊功能: ${specialFeatures.length} 个`);
    console.log(`✅ Windows 设置: ${msSettings.length} 个`);

    // 合并所有结果
    const allFeatures = [
      ...cplFiles,
      ...mscFiles,
      ...shellFolders,
      ...commonTools,
      ...specialFeatures,
      ...msSettings
    ];

    // 转换为 AppPath 格式
    const systemTools = allFeatures.map(toAppPath);

    // 规范化 key：优先使用 command；
    // 1) 忽略大小写
    // 2) 对无参数命令，去掉 .exe/.msc 后缀（如 cleanmgr.exe -> cleanmgr）
    // 3) 若无 command，则回退到 path
    const normalizeKey = (tool: AppPath): string => {
      const raw = (tool.command || tool.path || '').trim().toLowerCase();
      if (!raw.includes(' ') && /\.(exe|msc)$/.test(raw)) {
        return raw.replace(/\.(exe|msc)$/i, '');
      }
      return raw;
    };

    // 去重（根据规范化后的 command/path）
    const uniqueTools = new Map<string, AppPath>();
    for (const tool of systemTools) {
      const key = normalizeKey(tool);
      if (!uniqueTools.has(key)) {
        uniqueTools.set(key, tool);
      }
    }

    const result = Array.from(uniqueTools.values());

    console.log(`🎉 总共获取 ${result.length} 个系统功能（去重后）`);

    return result;
  } catch (error) {
    console.error('❌ 获取系统功能失败:', error);
    return [];
  }
}

/**
 * 仅获取特定类型的系统功能
 */
export async function getSystemToolsByType(types: {
  cpl?: boolean;
  msc?: boolean;
  shellFolders?: boolean;
  commonTools?: boolean;
  specialFeatures?: boolean;
  msSettings?: boolean;
}): Promise<AppPath[]> {
  const tasks: Promise<any[]>[] = [];

  if (types.cpl) tasks.push(scanCplFiles());
  if (types.msc) tasks.push(scanMscFiles());
  if (types.shellFolders) tasks.push(scanShellFolders());
  if (types.commonTools) tasks.push(scanCommonTools());
  if (types.specialFeatures) tasks.push(getSpecialFeatures());
  if (types.msSettings) tasks.push(Promise.resolve(getMsSettings()));

  const results = await Promise.all(tasks);
  const allFeatures = results.flat();

  return allFeatures.map(toAppPath);
}

// 导出各个模块供外部直接使用
export { scanCplFiles, scanMscFiles } from './cpl-msc-scanner';
export { scanShellFolders } from './clsid-scanner';
export { scanCommonTools } from './common-tools';
export { getSpecialFeatures } from './special-features';
export { getMsSettings } from './ms-settings';
export type { SystemFeature } from './typings';

