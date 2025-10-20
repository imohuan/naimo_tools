import { join } from 'path';
import { access, constants } from 'fs/promises';
import type { SystemFeature } from './typings';

const SYSTEM32_PATH = process.env.SystemRoot
  ? join(process.env.SystemRoot, 'System32')
  : 'C:\\Windows\\System32';

/** 特殊功能配置 */
interface SpecialFeature {
  /** 功能名称 */
  name: string;
  /** 执行命令 */
  command: string;
  /** 图标路径 */
  iconPath: string;
  /** 描述 */
  desc: string;
}

const SPECIAL_FEATURES: SpecialFeature[] = [
  {
    name: '环境变量',
    command: 'rundll32 sysdm.cpl,EditEnvironmentVariables',
    iconPath: join(SYSTEM32_PATH, 'sysdm.cpl'),
    desc: '编辑系统和用户环境变量'
  },
  {
    name: '高级系统设置',
    command: 'SystemPropertiesAdvanced.exe',
    iconPath: join(SYSTEM32_PATH, 'SystemPropertiesAdvanced.exe'),
    desc: '系统属性高级选项'
  },
  {
    name: '系统保护',
    command: 'SystemPropertiesProtection.exe',
    iconPath: join(SYSTEM32_PATH, 'SystemPropertiesProtection.exe'),
    desc: '配置系统还原点'
  },
  {
    name: '远程设置',
    command: 'SystemPropertiesRemote.exe',
    iconPath: join(SYSTEM32_PATH, 'SystemPropertiesRemote.exe'),
    desc: '远程桌面和远程协助设置'
  },
  {
    name: '性能选项',
    command: 'SystemPropertiesPerformance.exe',
    iconPath: join(SYSTEM32_PATH, 'SystemPropertiesPerformance.exe'),
    desc: '调整视觉效果和虚拟内存'
  },
  {
    name: '计算机名称',
    command: 'SystemPropertiesComputerName.exe',
    iconPath: join(SYSTEM32_PATH, 'SystemPropertiesComputerName.exe'),
    desc: '更改计算机名称和工作组'
  },
  {
    name: '数据执行保护',
    command: 'SystemPropertiesDataExecutionPrevention.exe',
    iconPath: join(SYSTEM32_PATH, 'SystemPropertiesDataExecutionPrevention.exe'),
    desc: 'DEP 设置'
  },
  {
    name: '硬件配置文件',
    command: 'SystemPropertiesHardware.exe',
    iconPath: join(SYSTEM32_PATH, 'SystemPropertiesHardware.exe'),
    desc: '硬件配置文件设置'
  },
  {
    name: '上帝模式',
    command: 'control /name Microsoft.AllTasksFolder',
    iconPath: join(SYSTEM32_PATH, 'control.exe'),
    desc: '所有控制面板设置'
  },
  {
    name: '磁盘检查',
    command: 'chkdsk',
    iconPath: join(SYSTEM32_PATH, 'cmd.exe'),
    desc: '检查磁盘错误'
  },
  {
    name: '组件服务',
    command: 'comexp.msc',
    iconPath: join(SYSTEM32_PATH, 'mmc.exe'),
    desc: 'COM+ 组件管理'
  },
  {
    name: '打印管理',
    command: 'printmanagement.msc',
    iconPath: join(SYSTEM32_PATH, 'mmc.exe'),
    desc: '管理打印机和打印服务器'
  },
  {
    name: '共享文件夹',
    command: 'fsmgmt.msc',
    iconPath: join(SYSTEM32_PATH, 'mmc.exe'),
    desc: '查看和管理共享文件夹'
  },
  {
    name: 'BitLocker 驱动器加密',
    command: 'control /name Microsoft.BitLockerDriveEncryption',
    iconPath: join(SYSTEM32_PATH, 'control.exe'),
    desc: '管理 BitLocker 加密'
  },
  {
    name: '存储空间',
    command: 'control /name Microsoft.StorageSpaces',
    iconPath: join(SYSTEM32_PATH, 'control.exe'),
    desc: '管理存储池'
  },
  {
    name: '工作文件夹',
    command: 'control /name Microsoft.WorkFolders',
    iconPath: join(SYSTEM32_PATH, 'control.exe'),
    desc: '同步工作文件'
  },
  {
    name: '凭据管理器',
    command: 'control /name Microsoft.CredentialManager',
    iconPath: join(SYSTEM32_PATH, 'control.exe'),
    desc: '管理 Windows 凭据'
  },
  {
    name: '管理凭据',
    command: 'credwiz.exe',
    iconPath: join(SYSTEM32_PATH, 'credwiz.exe'),
    desc: '备份和还原用户凭据'
  },
  {
    name: '家庭安全',
    command: 'control /name Microsoft.ParentalControls',
    iconPath: join(SYSTEM32_PATH, 'control.exe'),
    desc: '家长控制设置'
  },
  {
    name: '位置设置',
    command: 'control /name Microsoft.LocationSettings',
    iconPath: join(SYSTEM32_PATH, 'control.exe'),
    desc: '配置位置服务'
  },
  {
    name: 'Windows Defender',
    command: 'control /name Microsoft.WindowsDefender',
    iconPath: join(SYSTEM32_PATH, 'control.exe'),
    desc: 'Windows 安全中心'
  },
  {
    name: '故障排除',
    command: 'control /name Microsoft.Troubleshooting',
    iconPath: join(SYSTEM32_PATH, 'control.exe'),
    desc: '系统问题诊断和修复'
  },
  {
    name: '恢复',
    command: 'control /name Microsoft.Recovery',
    iconPath: join(SYSTEM32_PATH, 'control.exe'),
    desc: '系统恢复选项'
  },
  {
    name: 'Windows 更新',
    command: 'control /name Microsoft.WindowsUpdate',
    iconPath: join(SYSTEM32_PATH, 'control.exe'),
    desc: '检查和安装更新'
  }
];

/**
 * 获取特殊系统功能
 */
export async function getSpecialFeatures(): Promise<SystemFeature[]> {
  const features: SystemFeature[] = [];

  for (const feature of SPECIAL_FEATURES) {
    try {
      // 检查图标文件是否存在
      try {
        await access(feature.iconPath, constants.R_OK);
      } catch {
        // 如果图标文件不存在，使用默认路径
        feature.iconPath = join(SYSTEM32_PATH, 'shell32.dll');
      }

      features.push({
        name: feature.name,
        command: feature.command,
        path: feature.iconPath,
        description: feature.desc
      });
    } catch {
      // 跳过错误
    }
  }

  return features;
}

