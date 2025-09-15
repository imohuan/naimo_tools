import type { PluginConfig } from "@/typings/plugin-types";
import { PluginExecuteType, PluginCategoryType } from "@/typings/plugin-types";

/**
 * 实用工具插件示例
 */
export const utilityToolsPlugin: PluginConfig = {
  id: "utility-tools",
  name: "实用工具",
  description: "提供日常使用的实用工具集合",
  version: "1.0.0",
  author: "Naimo Tools",
  icon: "🔧",
  category: PluginCategoryType.OTHER,
  enabled: true,
  items: [
    {
      name: "计算器",
      path: "utility:calculator",
      icon: "🧮",
      pluginId: "utility-tools",
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('打开计算器...');
          // 这里可以添加计算器功能的逻辑
          context.console.log('计算器已启动');
        `,
      },
      visible: true,
      weight: 1,
    },
    {
      name: "二维码生成器",
      path: "utility:qrcode",
      icon: "📱",
      pluginId: "utility-tools",
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('生成二维码...');
          // 这里可以添加二维码生成的逻辑
          context.console.log('二维码生成完成');
        `,
      },
      visible: true,
      weight: 2,
    },
    {
      name: "颜色选择器",
      path: "utility:color-picker",
      icon: "🎨",
      pluginId: "utility-tools",
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('打开颜色选择器...');
          // 这里可以添加颜色选择器的逻辑
          context.console.log('颜色选择器已启动');
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

/**
 * 开发工具插件示例
 */
export const devToolsPlugin: PluginConfig = {
  id: "dev-tools",
  name: "开发工具",
  description: "为开发者提供的专业工具集",
  version: "1.0.0",
  author: "Naimo Tools",
  icon: "💻",
  category: PluginCategoryType.DEVELOPER_ESSENTIALS,
  enabled: true,
  items: [
    {
      name: "JSON格式化",
      path: "dev:json-formatter",
      icon: "📄",
      pluginId: "dev-tools",
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('JSON格式化工具...');
          // 这里可以添加JSON格式化的逻辑
          context.console.log('JSON格式化完成');
        `,
      },
      visible: true,
      weight: 1,
    },
    {
      name: "Base64编码",
      path: "dev:base64-encode",
      icon: "🔐",
      pluginId: "dev-tools",
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('Base64编码工具...');
          // 这里可以添加Base64编码的逻辑
          context.console.log('Base64编码完成');
        `,
      },
      visible: true,
      weight: 2,
    },
    {
      name: "正则测试器",
      path: "dev:regex-tester",
      icon: "🔍",
      pluginId: "dev-tools",
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('正则表达式测试器...');
          // 这里可以添加正则测试的逻辑
          context.console.log('正则测试完成');
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

/**
 * 媒体工具插件示例
 */
export const mediaToolsPlugin: PluginConfig = {
  id: "media-tools",
  name: "媒体工具",
  description: "处理图片、视频等媒体文件的工具",
  version: "1.0.0",
  author: "Naimo Tools",
  icon: "🎬",
  category: PluginCategoryType.MEDIA_TOOLS,
  enabled: true,
  items: [
    {
      name: "图片压缩",
      path: "media:image-compress",
      icon: "🗜️",
      pluginId: "media-tools",
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('图片压缩工具...');
          // 这里可以添加图片压缩的逻辑
          context.console.log('图片压缩完成');
        `,
      },
      visible: true,
      weight: 1,
    },
    {
      name: "视频转换",
      path: "media:video-convert",
      icon: "🎥",
      pluginId: "media-tools",
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('视频转换工具...');
          // 这里可以添加视频转换的逻辑
          context.console.log('视频转换完成');
        `,
      },
      visible: true,
      weight: 2,
    },
    {
      name: "音频提取",
      path: "media:audio-extract",
      icon: "🎵",
      pluginId: "media-tools",
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('音频提取工具...');
          // 这里可以添加音频提取的逻辑
          context.console.log('音频提取完成');
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

/**
 * 网络工具插件示例
 */
export const networkToolsPlugin: PluginConfig = {
  id: "network-tools",
  name: "网络工具",
  description: "网络相关的实用工具集合",
  version: "1.0.0",
  author: "Naimo Tools",
  icon: "🌐",
  category: PluginCategoryType.DEVELOPER_ESSENTIALS,
  enabled: true,
  items: [
    {
      name: "Ping测试",
      path: "network:ping",
      icon: "📡",
      pluginId: "network-tools",
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('Ping测试工具...');
          // 这里可以添加Ping测试的逻辑
          context.console.log('Ping测试完成');
        `,
      },
      visible: true,
      weight: 1,
    },
    {
      name: "端口扫描",
      path: "network:port-scan",
      icon: "🔍",
      pluginId: "network-tools",
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('端口扫描工具...');
          // 这里可以添加端口扫描的逻辑
          context.console.log('端口扫描完成');
        `,
      },
      visible: true,
      weight: 2,
    },
    {
      name: "网络速度测试",
      path: "network:speed-test",
      icon: "⚡",
      pluginId: "network-tools",
      executeType: PluginExecuteType.CUSTOM_CODE,
      executeParams: {
        code: `
          console.log('网络速度测试...');
          // 这里可以添加网络速度测试的逻辑
          context.console.log('网络速度测试完成');
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

// 导出所有插件
export default [
  utilityToolsPlugin,
  devToolsPlugin,
  mediaToolsPlugin,
  networkToolsPlugin,
];
