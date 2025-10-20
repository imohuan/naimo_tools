import { join } from 'path';
import { access, constants } from 'fs/promises';
import type { SystemFeature } from './typings';

const SYSTEM32_PATH = process.env.SystemRoot
  ? join(process.env.SystemRoot, 'System32')
  : 'C:\\Windows\\System32';

/** 常用系统工具配置 */
interface ToolConfig {
  /** 可执行文件名 */
  exe: string;
  /** 中文名称 */
  name: string;
  /** 描述 */
  desc: string;
}

const COMMON_TOOLS: ToolConfig[] = [
  { exe: 'notepad.exe', name: '记事本', desc: '简单文本编辑器' },
  { exe: 'calc.exe', name: '计算器', desc: '科学计算器' },
  { exe: 'mspaint.exe', name: '画图', desc: '图像编辑工具' },
  { exe: 'cmd.exe', name: '命令提示符', desc: 'Windows 命令行' },
  { exe: 'powershell.exe', name: 'PowerShell', desc: 'Windows PowerShell 控制台' },
  { exe: 'WindowsPowerShell\\v1.0\\powershell.exe', name: 'Windows PowerShell', desc: 'PowerShell 5.1' },
  { exe: 'taskmgr.exe', name: '任务管理器', desc: '系统进程和性能监控' },
  { exe: 'regedit.exe', name: '注册表编辑器', desc: 'Windows 注册表编辑' },
  { exe: 'msinfo32.exe', name: '系统信息', desc: '查看系统详细信息' },
  { exe: 'msconfig.exe', name: '系统配置', desc: '启动和服务配置' },
  { exe: 'mstsc.exe', name: '远程桌面连接', desc: '连接到远程计算机' },
  { exe: 'charmap.exe', name: '字符映射表', desc: '特殊字符查看器' },
  { exe: 'cleanmgr.exe', name: '磁盘清理', desc: '清理磁盘空间' },
  { exe: 'dfrgui.exe', name: '碎片整理和优化驱动器', desc: '磁盘优化工具' },
  { exe: 'resmon.exe', name: '资源监视器', desc: '详细的系统资源监控' },
  { exe: 'snippingtool.exe', name: '截图工具', desc: '屏幕截图工具' },
  { exe: 'SnippingTool.exe', name: '截图工具（经典）', desc: 'Windows 截图工具' },
  { exe: 'explorer.exe', name: '文件资源管理器', desc: 'Windows 资源管理器' },
  { exe: 'wordpad.exe', name: '写字板', desc: 'Windows 写字板' },
  { exe: 'magnify.exe', name: '放大镜', desc: '屏幕放大工具' },
  { exe: 'osk.exe', name: '屏幕键盘', desc: '虚拟键盘' },
  { exe: 'narrator.exe', name: '讲述人', desc: '屏幕阅读器' },
  { exe: 'psr.exe', name: '问题步骤记录器', desc: '记录操作步骤' },
  { exe: 'eudcedit.exe', name: '造字程序', desc: '创建自定义字符' },
  { exe: 'odbcad32.exe', name: 'ODBC 数据源管理器', desc: 'ODBC 数据源配置' },
  { exe: 'perfmon.exe', name: '性能监视器', desc: '系统性能分析' },
  { exe: 'eventvwr.exe', name: '事件查看器', desc: '查看系统日志' },
  { exe: 'control.exe', name: '控制面板', desc: 'Windows 控制面板' },
  { exe: 'SystemSettingsAdminFlows.exe', name: '系统设置', desc: 'Windows 设置应用' },
  { exe: 'compmgmt.msc', name: '计算机管理', desc: '计算机管理控制台' },
  { exe: 'dxdiag.exe', name: 'DirectX 诊断工具', desc: 'DirectX 信息和诊断' },
  { exe: 'winver.exe', name: 'Windows 版本信息', desc: '查看 Windows 版本' },
  { exe: 'certmgr.msc', name: '证书管理器', desc: '管理数字证书' },
  { exe: 'WmiMgmt.msc', name: 'WMI 控制', desc: 'Windows 管理规范控制' },
  { exe: 'MdSched.exe', name: 'Windows 内存诊断', desc: '内存测试工具' },
  { exe: 'rstrui.exe', name: '系统还原', desc: '恢复到之前的还原点' },
  { exe: 'sigverif.exe', name: '文件签名验证', desc: '验证系统文件签名' },
  { exe: 'slui.exe', name: 'Windows 激活', desc: 'Windows 激活向导' },
  { exe: 'SndVol.exe', name: '音量合成器', desc: '调节应用程序音量' },
  { exe: 'Presentationsettings.exe', name: '演示文稿设置', desc: '演示模式设置' },
  { exe: 'mobsync.exe', name: '同步中心', desc: '脱机文件同步' },
  { exe: 'colorcpl.exe', name: '颜色管理', desc: '显示器颜色配置' },
  { exe: 'dpiscaling.exe', name: 'DPI 缩放', desc: '显示缩放设置' },
  { exe: 'credwiz.exe', name: '备份和还原凭据', desc: '用户凭据备份工具' },
  { exe: 'shrpubw.exe', name: '创建共享文件夹向导', desc: '网络共享设置' }
];

/**
 * 扫描常用系统工具
 */
export async function scanCommonTools(): Promise<SystemFeature[]> {
  const features: SystemFeature[] = [];
  const seenNames = new Set<string>();

  for (const tool of COMMON_TOOLS) {
    // 检查是否重复
    if (seenNames.has(tool.name)) continue;

    try {
      let fullPath: string;

      // 处理路径
      if (tool.exe.includes('\\')) {
        fullPath = join(SYSTEM32_PATH, '..', tool.exe);
      } else if (tool.exe.endsWith('.msc')) {
        // MSC 文件在 System32 目录下
        fullPath = join(SYSTEM32_PATH, tool.exe);
      } else {
        fullPath = join(SYSTEM32_PATH, tool.exe);
      }

      // 检查文件是否存在
      try {
        await access(fullPath, constants.R_OK);
      } catch {
        // 文件不存在，跳过
        continue;
      }

      // 获取命令名（不含扩展名）
      const command = tool.exe.split('\\').pop()?.replace(/\.(exe|msc)$/i, '') || tool.exe;

      features.push({
        name: tool.name,
        command,
        path: fullPath,
        description: tool.desc
      });

      seenNames.add(tool.name);
    } catch (error) {
      // 跳过错误
    }
  }

  return features;
}

