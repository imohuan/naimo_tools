import { readdir, access } from 'fs/promises';
import { join, basename } from 'path';
import { constants } from 'fs';
import type { SystemFeature } from './typings';

const SYSTEM32_PATH = process.env.SystemRoot
  ? join(process.env.SystemRoot, 'System32')
  : 'C:\\Windows\\System32';

/** CPL 文件的中文名称映射 */
const CPL_NAMES: Record<string, string> = {
  'main': '鼠标属性',
  'sysdm': '系统属性',
  'desk': '显示设置',
  'hdwwiz': '添加硬件',
  'inetcpl': 'Internet 选项',
  'intl': '区域和语言',
  'joy': '游戏控制器',
  'mmsys': '声音设置',
  'ncpa': '网络连接',
  'powercfg': '电源选项',
  'sapi': '语音属性',
  'telephon': '电话和调制解调器',
  'timedate': '日期和时间',
  'wscui': '安全和维护',
  'bthprops': '蓝牙设置',
  'TabletPC': '平板电脑设置',
  'firewall': 'Windows 防火墙',
  'appwiz': '程序和功能',
  'access': '辅助功能选项',
  'Odbccp32': 'ODBC 数据源管理器',
  'FlashPlayerCPLApp': 'Flash Player 设置',
  'irprops': '红外设备'
};

/** MSC 文件的中文名称映射 */
const MSC_NAMES: Record<string, string> = {
  'devmgmt': '设备管理器',
  'diskmgmt': '磁盘管理',
  'services': '服务',
  'compmgmt': '计算机管理',
  'eventvwr': '事件查看器',
  'perfmon': '性能监视器',
  'taskschd': '任务计划程序',
  'lusrmgr': '本地用户和组',
  'gpedit': '本地组策略编辑器',
  'secpol': '本地安全策略',
  'fsmgmt': '共享文件夹',
  'certmgr': '证书管理器',
  'azman': '授权管理器',
  'wf': '高级安全 Windows 防火墙',
  'wmimgmt': 'WMI 控制',
  'rsop': '策略结果集',
  'WmiMgmt': 'WMI 控制'
};

/**
 * 扫描 CPL 文件（控制面板项）
 */
export async function scanCplFiles(): Promise<SystemFeature[]> {
  const features: SystemFeature[] = [];

  try {
    const files = await readdir(SYSTEM32_PATH);
    const cplFiles = files.filter(f => f.toLowerCase().endsWith('.cpl'));

    for (const file of cplFiles) {
      const fullPath = join(SYSTEM32_PATH, file);

      try {
        // 检查文件是否可访问
        await access(fullPath, constants.R_OK);

        const baseName = basename(file, '.cpl');
        const name = CPL_NAMES[baseName] || `${baseName}`;

        features.push({
          name,
          command: `control ${file}`,
          path: fullPath,
          description: name
        });
      } catch {
        // 跳过无法访问的文件
      }
    }
  } catch (error) {
    console.error('扫描 CPL 文件失败:', error);
  }

  return features;
}

/**
 * 扫描 MSC 文件（管理控制台）
 */
export async function scanMscFiles(): Promise<SystemFeature[]> {
  const features: SystemFeature[] = [];

  try {
    const files = await readdir(SYSTEM32_PATH);
    const mscFiles = files.filter(f => f.toLowerCase().endsWith('.msc'));

    for (const file of mscFiles) {
      const fullPath = join(SYSTEM32_PATH, file);

      try {
        // 检查文件是否可访问
        await access(fullPath, constants.R_OK);

        const baseName = basename(file, '.msc');
        const name = MSC_NAMES[baseName] || `${baseName}`;

        // MSC 文件本身没有图标，使用 mmc.exe
        features.push({
          name,
          command: file,
          path: join(SYSTEM32_PATH, 'mmc.exe'),
          description: name
        });
      } catch {
        // 跳过无法访问的文件
      }
    }
  } catch (error) {
    console.error('扫描 MSC 文件失败:', error);
  }

  return features;
}

