import { join } from 'path';
import type { SystemFeature } from './typings';

const SYSTEM32_PATH = process.env.SystemRoot
  ? join(process.env.SystemRoot, 'System32')
  : 'C:\\Windows\\System32';

/** Windows 设置项配置 */
interface SettingItem {
  /** 设置名称 */
  name: string;
  /** ms-settings URI */
  uri: string;
  /** 描述 */
  desc: string;
  /** 分类 */
  category?: string;
}

const MS_SETTINGS: SettingItem[] = [
  // 系统
  { name: 'Windows 设置首页', uri: 'ms-settings:', desc: '打开设置主页', category: '系统' },
  { name: '系统 - 显示', uri: 'ms-settings:display', desc: '屏幕分辨率、亮度和缩放', category: '系统' },
  { name: '系统 - 声音', uri: 'ms-settings:sound', desc: '音量和音频设备', category: '系统' },
  { name: '系统 - 通知', uri: 'ms-settings:notifications', desc: '通知和操作中心', category: '系统' },
  { name: '系统 - 电源和睡眠', uri: 'ms-settings:powersleep', desc: '电源计划和睡眠', category: '系统' },
  { name: '系统 - 节电模式', uri: 'ms-settings:batterysaver', desc: '节省电池电量', category: '系统' },
  { name: '系统 - 电池', uri: 'ms-settings:batterysaver-settings', desc: '电池使用情况', category: '系统' },
  { name: '系统 - 存储', uri: 'ms-settings:storagesense', desc: '磁盘空间管理', category: '系统' },
  { name: '系统 - 存储感知', uri: 'ms-settings:storagepolicies', desc: '自动释放空间', category: '系统' },
  { name: '系统 - 多任务', uri: 'ms-settings:multitasking', desc: '贴靠和虚拟桌面', category: '系统' },
  { name: '系统 - 投影', uri: 'ms-settings:project', desc: '投影到此电脑', category: '系统' },
  { name: '系统 - 共享体验', uri: 'ms-settings:crossdevice', desc: '跨设备共享', category: '系统' },
  { name: '系统 - 平板模式', uri: 'ms-settings:tabletmode', desc: '平板电脑模式', category: '系统' },
  { name: '系统 - 远程桌面', uri: 'ms-settings:remotedesktop', desc: '远程桌面设置', category: '系统' },
  { name: '系统 - 剪贴板', uri: 'ms-settings:clipboard', desc: '剪贴板历史记录', category: '系统' },
  { name: '系统 - 关于', uri: 'ms-settings:about', desc: '设备规格和 Windows 版本', category: '系统' },

  // 设备
  { name: '设备 - 蓝牙和其他设备', uri: 'ms-settings:bluetooth', desc: '蓝牙设备管理', category: '设备' },
  { name: '设备 - 打印机和扫描仪', uri: 'ms-settings:printers', desc: '打印机设置', category: '设备' },
  { name: '设备 - 鼠标', uri: 'ms-settings:mousetouchpad', desc: '鼠标设置', category: '设备' },
  { name: '设备 - 触摸板', uri: 'ms-settings:devices-touchpad', desc: '触摸板选项', category: '设备' },
  { name: '设备 - 触摸', uri: 'ms-settings:devices-touch', desc: '触摸屏设置', category: '设备' },
  { name: '设备 - 笔和 Windows Ink', uri: 'ms-settings:pen', desc: '手写笔设置', category: '设备' },
  { name: '设备 - 自动播放', uri: 'ms-settings:autoplay', desc: '可移动驱动器自动播放', category: '设备' },
  { name: '设备 - USB', uri: 'ms-settings:usb', desc: 'USB 设置', category: '设备' },

  // 网络和 Internet
  { name: '网络 - 状态', uri: 'ms-settings:network-status', desc: '网络连接状态', category: '网络' },
  { name: '网络 - 以太网', uri: 'ms-settings:network-ethernet', desc: '有线网络', category: '网络' },
  { name: '网络 - 拨号', uri: 'ms-settings:network-dialup', desc: '拨号连接', category: '网络' },
  { name: '网络 - Wi-Fi', uri: 'ms-settings:network-wifi', desc: '无线网络', category: '网络' },
  { name: '网络 - 管理已知网络', uri: 'ms-settings:network-wifisettings', desc: '已保存的 Wi-Fi', category: '网络' },
  { name: '网络 - 飞行模式', uri: 'ms-settings:network-airplanemode', desc: '飞行模式开关', category: '网络' },
  { name: '网络 - 移动热点', uri: 'ms-settings:network-mobilehotspot', desc: '共享网络连接', category: '网络' },
  { name: '网络 - 代理', uri: 'ms-settings:network-proxy', desc: '代理服务器设置', category: '网络' },
  { name: '网络 - VPN', uri: 'ms-settings:network-vpn', desc: '虚拟专用网络', category: '网络' },
  { name: '网络 - 数据使用量', uri: 'ms-settings:datausage', desc: '流量统计', category: '网络' },
  { name: '网络 - 移动网络', uri: 'ms-settings:network-cellular', desc: '蜂窝网络设置', category: '网络' },

  // 个性化
  { name: '个性化 - 背景', uri: 'ms-settings:personalization-background', desc: '桌面背景', category: '个性化' },
  { name: '个性化 - 颜色', uri: 'ms-settings:colors', desc: '主题颜色', category: '个性化' },
  { name: '个性化 - 锁屏', uri: 'ms-settings:lockscreen', desc: '锁屏界面', category: '个性化' },
  { name: '个性化 - 主题', uri: 'ms-settings:themes', desc: '主题设置', category: '个性化' },
  { name: '个性化 - 字体', uri: 'ms-settings:fonts', desc: '字体管理', category: '个性化' },
  { name: '个性化 - 开始', uri: 'ms-settings:personalization-start', desc: '开始菜单', category: '个性化' },
  { name: '个性化 - 任务栏', uri: 'ms-settings:taskbar', desc: '任务栏设置', category: '个性化' },

  // 应用
  { name: '应用 - 应用和功能', uri: 'ms-settings:appsfeatures', desc: '卸载或移动应用', category: '应用' },
  { name: '应用 - 默认应用', uri: 'ms-settings:defaultapps', desc: '设置默认程序', category: '应用' },
  { name: '应用 - 可选功能', uri: 'ms-settings:optionalfeatures', desc: 'Windows 可选功能', category: '应用' },
  { name: '应用 - 离线地图', uri: 'ms-settings:maps', desc: '下载离线地图', category: '应用' },
  { name: '应用 - 网站的应用', uri: 'ms-settings:appsforwebsites', desc: '应用权限管理', category: '应用' },
  { name: '应用 - 视频播放', uri: 'ms-settings:videoplayback', desc: '视频播放设置', category: '应用' },
  { name: '应用 - 启动', uri: 'ms-settings:startupapps', desc: '启动项管理', category: '应用' },

  // 账户
  { name: '账户 - 你的信息', uri: 'ms-settings:yourinfo', desc: '账户资料', category: '账户' },
  { name: '账户 - 电子邮件和账户', uri: 'ms-settings:emailandaccounts', desc: '关联账户', category: '账户' },
  { name: '账户 - 登录选项', uri: 'ms-settings:signinoptions', desc: '密码、PIN 和生物识别', category: '账户' },
  { name: '账户 - 访问工作或学校账户', uri: 'ms-settings:workplace', desc: '工作或学校账户', category: '账户' },
  { name: '账户 - 家庭和其他用户', uri: 'ms-settings:otherusers', desc: '添加其他用户', category: '账户' },
  { name: '账户 - 同步你的设置', uri: 'ms-settings:sync', desc: '跨设备同步', category: '账户' },

  // 时间和语言
  { name: '时间和语言 - 日期和时间', uri: 'ms-settings:dateandtime', desc: '日期时间设置', category: '时间和语言' },
  { name: '时间和语言 - 区域', uri: 'ms-settings:regionformatting', desc: '区域格式', category: '时间和语言' },
  { name: '时间和语言 - 语言', uri: 'ms-settings:regionlanguage', desc: '语言包管理', category: '时间和语言' },
  { name: '时间和语言 - 语音', uri: 'ms-settings:speech', desc: '语音识别', category: '时间和语言' },

  // 游戏
  { name: '游戏 - 游戏栏', uri: 'ms-settings:gaming-gamebar', desc: '录制游戏片段', category: '游戏' },
  { name: '游戏 - 屏幕截图', uri: 'ms-settings:gaming-gamedvr', desc: '游戏录制设置', category: '游戏' },
  { name: '游戏 - 游戏模式', uri: 'ms-settings:gaming-gamemode', desc: '优化游戏性能', category: '游戏' },
  { name: '游戏 - Xbox 网络', uri: 'ms-settings:gaming-xboxnetworking', desc: 'Xbox Live 网络', category: '游戏' },

  // 辅助功能
  { name: '辅助功能 - 显示', uri: 'ms-settings:easeofaccess-display', desc: '显示辅助选项', category: '辅助功能' },
  { name: '辅助功能 - 鼠标指针', uri: 'ms-settings:easeofaccess-mouse', desc: '鼠标指针设置', category: '辅助功能' },
  { name: '辅助功能 - 文本光标', uri: 'ms-settings:easeofaccess-cursor', desc: '文本光标指示器', category: '辅助功能' },
  { name: '辅助功能 - 放大镜', uri: 'ms-settings:easeofaccess-magnifier', desc: '屏幕放大', category: '辅助功能' },
  { name: '辅助功能 - 颜色滤镜', uri: 'ms-settings:easeofaccess-colorfilter', desc: '色盲辅助', category: '辅助功能' },
  { name: '辅助功能 - 高对比度', uri: 'ms-settings:easeofaccess-highcontrast', desc: '高对比度主题', category: '辅助功能' },
  { name: '辅助功能 - 讲述人', uri: 'ms-settings:easeofaccess-narrator', desc: '屏幕阅读器', category: '辅助功能' },
  { name: '辅助功能 - 音频', uri: 'ms-settings:easeofaccess-audio', desc: '音频辅助选项', category: '辅助功能' },
  { name: '辅助功能 - 隐藏式字幕', uri: 'ms-settings:easeofaccess-closedcaptioning', desc: '字幕样式', category: '辅助功能' },
  { name: '辅助功能 - 语音', uri: 'ms-settings:easeofaccess-speechrecognition', desc: '语音识别', category: '辅助功能' },
  { name: '辅助功能 - 键盘', uri: 'ms-settings:easeofaccess-keyboard', desc: '屏幕键盘和粘滞键', category: '辅助功能' },
  { name: '辅助功能 - 眼球控制', uri: 'ms-settings:easeofaccess-eyecontrol', desc: '眼动追踪', category: '辅助功能' },

  // 隐私
  { name: '隐私 - 常规', uri: 'ms-settings:privacy', desc: '隐私设置', category: '隐私' },
  { name: '隐私 - 位置', uri: 'ms-settings:privacy-location', desc: '位置权限', category: '隐私' },
  { name: '隐私 - 相机', uri: 'ms-settings:privacy-webcam', desc: '相机权限', category: '隐私' },
  { name: '隐私 - 麦克风', uri: 'ms-settings:privacy-microphone', desc: '麦克风权限', category: '隐私' },
  { name: '隐私 - 语音激活', uri: 'ms-settings:privacy-voiceactivation', desc: '语音助手权限', category: '隐私' },
  { name: '隐私 - 通知', uri: 'ms-settings:privacy-notifications', desc: '通知权限', category: '隐私' },
  { name: '隐私 - 账户信息', uri: 'ms-settings:privacy-accountinfo', desc: '账户信息访问', category: '隐私' },
  { name: '隐私 - 联系人', uri: 'ms-settings:privacy-contacts', desc: '联系人权限', category: '隐私' },
  { name: '隐私 - 日历', uri: 'ms-settings:privacy-calendar', desc: '日历权限', category: '隐私' },
  { name: '隐私 - 通话记录', uri: 'ms-settings:privacy-callhistory', desc: '通话记录权限', category: '隐私' },
  { name: '隐私 - 电子邮件', uri: 'ms-settings:privacy-email', desc: '电子邮件权限', category: '隐私' },
  { name: '隐私 - 任务', uri: 'ms-settings:privacy-tasks', desc: '任务权限', category: '隐私' },
  { name: '隐私 - 消息', uri: 'ms-settings:privacy-messaging', desc: '短信权限', category: '隐私' },
  { name: '隐私 - 无线电收发器', uri: 'ms-settings:privacy-radios', desc: '蓝牙等无线功能', category: '隐私' },
  { name: '隐私 - 其他设备', uri: 'ms-settings:privacy-customdevices', desc: '其他设备权限', category: '隐私' },
  { name: '隐私 - 反馈和诊断', uri: 'ms-settings:privacy-feedback', desc: '诊断数据', category: '隐私' },
  { name: '隐私 - 后台应用', uri: 'ms-settings:privacy-backgroundapps', desc: '后台运行权限', category: '隐私' },
  { name: '隐私 - 应用诊断', uri: 'ms-settings:privacy-appdiagnostics', desc: '应用诊断信息', category: '隐私' },
  { name: '隐私 - 文档', uri: 'ms-settings:privacy-documents', desc: '文档库权限', category: '隐私' },
  { name: '隐私 - 图片', uri: 'ms-settings:privacy-pictures', desc: '图片库权限', category: '隐私' },
  { name: '隐私 - 视频', uri: 'ms-settings:privacy-videos', desc: '视频库权限', category: '隐私' },
  { name: '隐私 - 文件系统', uri: 'ms-settings:privacy-broadfilesystemaccess', desc: '文件系统访问', category: '隐私' },

  // 更新和安全
  { name: '更新 - Windows 更新', uri: 'ms-settings:windowsupdate', desc: '检查更新', category: '更新和安全' },
  { name: '更新 - 传递优化', uri: 'ms-settings:delivery-optimization', desc: '更新下载设置', category: '更新和安全' },
  { name: '更新 - Windows 安全中心', uri: 'ms-settings:windowsdefender', desc: 'Windows Defender', category: '更新和安全' },
  { name: '更新 - 备份', uri: 'ms-settings:backup', desc: '文件备份', category: '更新和安全' },
  { name: '更新 - 故障排除', uri: 'ms-settings:troubleshoot', desc: '系统诊断', category: '更新和安全' },
  { name: '更新 - 恢复', uri: 'ms-settings:recovery', desc: '重置此电脑', category: '更新和安全' },
  { name: '更新 - 激活', uri: 'ms-settings:activation', desc: 'Windows 激活', category: '更新和安全' },
  { name: '更新 - 查找我的设备', uri: 'ms-settings:findmydevice', desc: '定位设备', category: '更新和安全' },
  { name: '更新 - 开发者选项', uri: 'ms-settings:developers', desc: '开发人员模式', category: '更新和安全' },
  { name: '更新 - Windows 预览体验计划', uri: 'ms-settings:windowsinsider', desc: 'Insider 计划', category: '更新和安全' },

  // 其他
  { name: 'Cortana - 权限', uri: 'ms-settings:cortana-permissions', desc: 'Cortana 权限', category: '其他' },
  { name: 'Cortana - 更多详细信息', uri: 'ms-settings:cortana-moredetails', desc: 'Cortana 详情', category: '其他' },
  { name: 'Cortana - 通知', uri: 'ms-settings:cortana-notifications', desc: 'Cortana 通知', category: '其他' },
  { name: 'Cortana - 语言', uri: 'ms-settings:cortana-language', desc: 'Cortana 语言', category: '其他' },
  { name: '混合现实', uri: 'ms-settings:holographic', desc: 'Windows Mixed Reality', category: '其他' },
  { name: '家庭组', uri: 'ms-settings:family-group', desc: '家庭组管理', category: '其他' }
];

/**
 * 获取所有 Windows 设置项
 */
export function getMsSettings(): SystemFeature[] {
  const settingsExePath = join(SYSTEM32_PATH, 'SystemSettingsAdminFlows.exe');

  return MS_SETTINGS.map(item => ({
    name: item.name,
    command: item.uri,
    path: settingsExePath,
    description: item.desc
  }));
}

