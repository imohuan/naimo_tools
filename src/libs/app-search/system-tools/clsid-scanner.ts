import Winreg from 'winreg';
import { join } from 'path';
import type { SystemFeature } from './typings';

const SYSTEM32_PATH = process.env.SystemRoot
  ? join(process.env.SystemRoot, 'System32')
  : 'C:\\Windows\\System32';

/** Shell 文件夹配置 */
interface ShellFolderConfig {
  /** 名称 */
  name: string;
  /** 执行命令 */
  command: string;
  /** CLSID（用于获取图标） */
  clsid: string;
  /** 描述 */
  desc: string;
  /** 备用图标路径（当 DefaultIcon 不存在时使用） */
  fallbackIcon?: string;
}

/** 已知的重要 Shell 文件夹 */
const KNOWN_SHELL_FOLDERS: ShellFolderConfig[] = [
  // 特殊文件夹（使用 shell: 路径）
  { name: '回收站', command: 'shell:RecycleBinFolder', clsid: '{645FF040-5081-101B-9F08-00AA002F954E}', desc: '查看和恢复已删除的文件', fallbackIcon: 'imageres.dll,-55' },
  { name: '控制面板', command: 'control', clsid: '{26EE0668-A00A-44D7-9371-BEB064C98683}', desc: '系统设置和配置', fallbackIcon: 'imageres.dll,-27' },
  { name: '此电脑', command: 'shell:MyComputerFolder', clsid: '{20D04FE0-3AEA-1069-A2D8-08002B30309D}', desc: '查看磁盘驱动器和设备', fallbackIcon: 'imageres.dll,-109' },
  { name: '网络', command: 'shell:NetworkPlacesFolder', clsid: '{F02C1A0D-BE21-4350-88B0-7367FC96EF3C}', desc: '网络计算机和设备', fallbackIcon: 'imageres.dll,-25' },

  // 用户文件夹
  { name: '桌面', command: 'shell:Desktop', clsid: '{B4BFCC3A-DB2C-424C-B029-7FE99A87C641}', desc: '用户桌面文件夹', fallbackIcon: 'imageres.dll,-183' },
  { name: '文档', command: 'shell:Personal', clsid: '{FDD39AD0-238F-46AF-ADB4-6C85480369C7}', desc: '用户文档文件夹', fallbackIcon: 'imageres.dll,-112' },
  { name: '下载', command: 'shell:Downloads', clsid: '{374DE290-123F-4565-9164-39C4925E467B}', desc: '下载文件夹', fallbackIcon: 'imageres.dll,-184' },
  { name: '图片', command: 'shell:My Pictures', clsid: '{33E28130-4E1E-4676-835A-98395C3BC3BB}', desc: '图片文件夹', fallbackIcon: 'imageres.dll,-113' },
  { name: '音乐', command: 'shell:My Music', clsid: '{4BD8D571-6D19-48D3-BE97-422220080E43}', desc: '音乐文件夹', fallbackIcon: 'imageres.dll,-108' },
  { name: '视频', command: 'shell:My Video', clsid: '{18989B1D-99B5-455B-841C-AB7C74E4DDFC}', desc: '视频文件夹', fallbackIcon: 'imageres.dll,-189' },

  // 系统文件夹
  { name: '管理工具', command: 'shell:Administrative Tools', clsid: '{D20EA4E1-3957-11d2-A40B-0C5020524153}', desc: '系统管理工具', fallbackIcon: 'imageres.dll,-114' },
  { name: '字体', command: 'shell:Fonts', clsid: '{BD84B380-8CA2-1069-AB1D-08000948F534}', desc: '查看和管理字体', fallbackIcon: 'fontext.dll,-100' },
  { name: '用户文件夹', command: 'shell:UsersFilesFolder', clsid: '{59031a47-3f72-44a7-89c5-5595fe6b30ee}', desc: '当前用户文件夹', fallbackIcon: 'imageres.dll,-123' },
  { name: '打印机', command: 'shell:PrintersFolder', clsid: '{2227A280-3AEA-1069-A2DE-08002B30309D}', desc: '打印机和传真', fallbackIcon: 'imageres.dll,-26' },
  { name: '开始菜单', command: 'shell:Start Menu', clsid: '{625B53C3-AB48-4EC1-BA1F-A1EF4146FC19}', desc: '开始菜单文件夹', fallbackIcon: 'imageres.dll,-15' },
  { name: '启动', command: 'shell:Startup', clsid: '{B97D20BB-F46A-4C97-BA10-5E3608430854}', desc: '启动项文件夹', fallbackIcon: 'imageres.dll,-109' },
  { name: '应用数据', command: 'shell:AppData', clsid: '{3EB685DB-65F9-4CF6-A03A-E3EF65729F3D}', desc: '应用程序数据', fallbackIcon: 'imageres.dll,-123' },
  { name: '公共文件夹', command: 'shell:Public', clsid: '{DFDF76A2-C82A-4D63-906A-5644AC457385}', desc: '所有用户共享文件夹', fallbackIcon: 'imageres.dll,-123' },
  { name: '快速访问', command: 'shell:Quick Launch', clsid: '{AEE5D1AA-3D66-4A57-B242-5B82CAB2C4F6}', desc: '快速启动文件夹', fallbackIcon: 'imageres.dll,-1024' },
  { name: '最近使用', command: 'shell:Recent', clsid: '{AE50C081-EBD2-438A-8655-8A092E34987A}', desc: '最近打开的文件', fallbackIcon: 'imageres.dll,-101' },
  { name: '发送到', command: 'shell:SendTo', clsid: '{8983036C-27C0-404B-8F08-102D10DCFD74}', desc: '发送到菜单', fallbackIcon: 'imageres.dll,-174' },
  { name: '模板', command: 'shell:Templates', clsid: '{A63293E8-664E-48DB-A079-DF759E0509F7}', desc: '文档模板', fallbackIcon: 'imageres.dll,-69' }
];

/**
 * 获取注册表项的值
 */
function getRegistryValue(regKey: Winreg.Registry, valueName: string): Promise<string | null> {
  return new Promise((resolve) => {
    regKey.get(valueName, (err, item) => {
      if (err || !item) {
        resolve(null);
      } else {
        resolve(item.value);
      }
    });
  });
}

/**
 * 检查注册表项是否存在
 */
function checkRegistryKeyExists(regKey: Winreg.Registry, subkey: string): Promise<boolean> {
  return new Promise((resolve) => {
    const newKey = new Winreg({
      hive: regKey.hive,
      key: regKey.key + '\\' + subkey
    });

    newKey.keyExists((err, exists) => {
      resolve(exists || false);
    });
  });
}

/**
 * 扫描 Shell 特殊文件夹
 */
export async function scanShellFolders(): Promise<SystemFeature[]> {
  const features: SystemFeature[] = [];

  for (const folder of KNOWN_SHELL_FOLDERS) {
    // 设置默认图标路径
    let iconPath: string;
    if (folder.fallbackIcon) {
      // 处理带索引的图标路径（如 imageres.dll,-55）
      if (folder.fallbackIcon.includes(',')) {
        const [dllFile, iconIndex] = folder.fallbackIcon.split(',');
        iconPath = join(SYSTEM32_PATH, dllFile) + ',' + iconIndex;
      } else {
        iconPath = join(SYSTEM32_PATH, folder.fallbackIcon);
      }
    } else {
      iconPath = join(SYSTEM32_PATH, 'shell32.dll');
    }

    let foundIcon = false;

    try {
      const regKey = new Winreg({
        hive: Winreg.HKCR,
        key: `\\CLSID\\${folder.clsid}`
      });

      // 优先尝试读取 DefaultIcon 配置
      const hasDefaultIcon = await checkRegistryKeyExists(regKey, 'DefaultIcon');
      if (hasDefaultIcon) {
        const iconKey = new Winreg({
          hive: Winreg.HKCR,
          key: `\\CLSID\\${folder.clsid}\\DefaultIcon`
        });

        const iconValue = await getRegistryValue(iconKey, '');
        if (iconValue) {
          // 保留完整的图标路径，包括图标索引（如 -27）
          iconPath = iconValue.replace(/"/g, '');
          iconPath = iconPath.replace(/%SystemRoot%/gi, process.env.SystemRoot || 'C:\\Windows');
          iconPath = iconPath.replace(/%windir%/gi, process.env.SystemRoot || 'C:\\Windows');

          // 如果注册表值没有索引，但 fallbackIcon 有索引，则补充索引
          if (!iconPath.includes(',') && folder.fallbackIcon?.includes(',')) {
            const fallbackIndex = folder.fallbackIcon.split(',')[1];
            iconPath = iconPath + ',' + fallbackIndex;
          }

          foundIcon = true;
        }
      }
    } catch {
      // 读取失败时静默回退
    }

    // 如果没有找到 DefaultIcon 且有备用图标，使用备用图标
    if (!foundIcon && folder.fallbackIcon) {
      if (folder.fallbackIcon.includes(',')) {
        const [dllFile, iconIndex] = folder.fallbackIcon.split(',');
        iconPath = join(SYSTEM32_PATH, dllFile) + ',' + iconIndex;
      } else {
        iconPath = join(SYSTEM32_PATH, folder.fallbackIcon);
      }
    }

    features.push({
      name: folder.name,
      command: folder.command,
      path: iconPath,
      description: folder.desc
    });
  }

  return features;
}

/**
 * 扫描所有 URL 协议
 * 包括 ms-settings:, ms-availablenetworks: 等
 */
export async function scanUrlProtocols(): Promise<SystemFeature[]> {
  const features: SystemFeature[] = [];
  const protocols = new Set<string>();

  try {
    const regKey = new Winreg({
      hive: Winreg.HKCR,
      key: '\\'
    });

    // 获取所有子键
    const keys = await new Promise<any[]>((resolve, reject) => {
      regKey.keys((err, items) => {
        if (err) reject(err);
        else resolve(items || []);
      });
    });

    // 并行检查每个键是否为 URL 协议
    const checkPromises = keys.map(async (item) => {
      try {
        const keyName = item.key.split('\\').pop() || '';

        // 只检查看起来像协议的键（包含 ":" 或以 "ms-" 开头）
        if (!keyName.includes(':') && !keyName.startsWith('ms-')) {
          return;
        }

        const protocolKey = new Winreg({
          hive: Winreg.HKCR,
          key: `\\${keyName}`
        });

        const urlProtocol = await getRegistryValue(protocolKey, 'URL Protocol');
        if (urlProtocol !== null) {
          protocols.add(keyName);
        }
      } catch {
        // 忽略错误
      }
    });

    await Promise.all(checkPromises);

    // 暂时不添加到结果中，因为太多了
    // 可以根据需要筛选特定的协议
    // console.log('发现的 URL 协议:', Array.from(protocols));
  } catch (error) {
    console.error('扫描 URL 协议失败:', error);
  }

  return features;
}

