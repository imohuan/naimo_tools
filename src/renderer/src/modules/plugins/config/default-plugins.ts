import type { PluginConfig } from "@/typings/plugin-types";
import { PluginExecuteType, PluginCategoryType } from "@/typings/plugin-types";

/**
 * 默认插件配置
 * 这些插件直接在前端项目中定义，无需外部文件
 */
export const defaultPlugins: PluginConfig[] = [
  {
    id: "system-tools",
    name: "系统工具",
    description: "系统相关的实用工具",
    version: "1.0.0",
    author: "Naimo Tools",
    icon: "🔧",
    category: PluginCategoryType.SYSTEM_TOOLS,
    enabled: true,
    items: [
      {
        pluginId: "system-tools",
        name: "任务管理器",
        path: "taskmgr.exe",
        icon: "📊",
        description: "打开系统任务管理器",
        visible: true,
        weight: 100,
        executeType: PluginExecuteType.OPEN_APP,
        executeParams: {}
      },
      {
        pluginId: "system-tools",
        name: "控制面板",
        path: "control.exe",
        icon: "⚙️",
        description: "打开系统控制面板",
        visible: true,
        weight: 90,
        executeType: PluginExecuteType.OPEN_APP,
        executeParams: {}
      },
      {
        pluginId: "system-tools",
        name: "设备管理器",
        path: "devmgmt.msc",
        icon: "🔌",
        description: "打开设备管理器",
        visible: true,
        weight: 80,
        executeType: PluginExecuteType.OPEN_APP,
        executeParams: {}
      }
    ],
    options: {},
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      installedAt: Date.now()
    }
  },
  {
    id: "web-tools",
    name: "网页工具",
    description: "常用的网页工具和网站",
    version: "1.0.0",
    author: "Naimo Tools",
    icon: "🌐",
    category: PluginCategoryType.OTHER,
    enabled: true,
    items: [
      {
        pluginId: "web-tools",
        name: "百度搜索",
        path: "https://www.baidu.com",
        icon: "🔍",
        description: "打开百度搜索",
        visible: true,
        weight: 100,
        executeType: PluginExecuteType.SHOW_WEBPAGE,
        executeParams: {
          url: "https://www.baidu.com",
          closeAction: "hide",
          enableSearch: true
        }
      },
      {
        pluginId: "web-tools",
        name: "GitHub",
        path: "https://github.com",
        icon: "🐙",
        description: "打开GitHub",
        visible: true,
        weight: 90,
        executeType: PluginExecuteType.SHOW_WEBPAGE,
        executeParams: {
          url: "https://github.com",
          closeAction: "hide",
          enableSearch: true
        }
      },
      {
        pluginId: "web-tools",
        name: "Stack Overflow",
        path: "https://stackoverflow.com",
        icon: "📚",
        description: "打开Stack Overflow",
        visible: true,
        weight: 80,
        executeType: PluginExecuteType.SHOW_WEBPAGE,
        executeParams: {
          url: "https://stackoverflow.com",
          closeAction: "hide",
          enableSearch: true
        }
      }
    ],
    options: {},
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      installedAt: Date.now()
    }
  },
  {
    id: "developer-tools",
    name: "开发者工具",
    description: "程序员常用的开发工具",
    version: "1.0.0",
    author: "Naimo Tools",
    icon: "💻",
    category: PluginCategoryType.DEVELOPER_ESSENTIALS,
    enabled: true,
    items: [
      {
        pluginId: "developer-tools",
        name: "Visual Studio Code",
        path: "code",
        icon: "📝",
        description: "打开VS Code",
        visible: true,
        weight: 100,
        executeType: PluginExecuteType.OPEN_APP,
        executeParams: {}
      },
      {
        pluginId: "developer-tools",
        name: "Git Bash",
        path: "git-bash.exe",
        icon: "🐚",
        description: "打开Git Bash",
        visible: true,
        weight: 90,
        executeType: PluginExecuteType.OPEN_APP,
        executeParams: {}
      },
      {
        pluginId: "developer-tools",
        name: "Node.js 版本管理",
        path: "nvm-version-manager",
        icon: "🟢",
        description: "Node.js版本管理工具",
        visible: true,
        weight: 80,
        executeType: PluginExecuteType.CUSTOM_CODE,
        executeParams: {
          code: `
            // 显示当前Node.js版本
            const { exec } = require('child_process');
            exec('node --version', (error, stdout, stderr) => {
              if (error) {
                console.error('获取Node.js版本失败:', error);
                return;
              }
              alert('当前Node.js版本: ' + stdout.trim());
            });
          `
        }
      }
    ],
    options: {},
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      installedAt: Date.now()
    }
  }
];

/**
 * 获取默认插件列表
 */
export function getDeafultPlugins(): PluginConfig[] {
  return defaultPlugins;
}

/**
 * 根据ID获取默认插件
 */
export function getDeafultPluginById(pluginId: string): PluginConfig | null {
  return defaultPlugins.find(plugin => plugin.id === pluginId) || null;
}
