import type { PluginConfig } from "@/typings/plugin-types";
import { PluginExecuteType, PluginCategoryType } from "@/typings/plugin-types";

/**
 * 系统工具插件示例
 */
export const systemToolsPlugin: PluginConfig = {
  id: "system-tools",
  name: "系统工具",
  description: "提供系统管理和维护工具",
  version: "1.0.0",
  author: "Naimo Tools",
  icon: "⚙️",
  category: PluginCategoryType.SYSTEM_TOOLS,
  enabled: true,
  items: [
    {
      name: "清理临时文件",
      path: "system:clean-temp",
      icon: null,
      pluginId: "system-tools",
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('开始清理临时文件...');
          // 这里可以添加清理临时文件的逻辑
          // 例如调用系统API清理 %TEMP% 目录
          context.console.log('临时文件清理完成');
        `,
      },
      visible: true,
      weight: 1,
    },
    {
      name: "系统信息",
      path: "system:info",
      icon: null,
      pluginId: "system-tools",
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('获取系统信息...');
          // 这里可以添加获取系统信息的逻辑
          // 例如显示CPU、内存、磁盘使用情况
          context.console.log('系统信息获取完成');
        `,
      },
      visible: true,
      weight: 2,
    },
    {
      name: "重启应用",
      path: "system:restart-app",
      icon: null,
      pluginId: "system-tools",
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('准备重启应用...');
          // 这里可以添加重启应用的逻辑
          // 例如调用 electron 的 app.relaunch()
          context.console.log('应用重启中...');
        `,
      },
      visible: true,
      weight: 3,
    },
  ],
  metadata: {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    installedAt: Date.now(),
  },
};
