import type { PluginConfig } from "@/typings/pluginTypes";

/**
 * 使用 import.meta.glob 动态导入 base-plugins 目录下的所有插件
 */
const pluginModules = import.meta.glob('../base-plugins/*.ts', { eager: true });

/**
 * 获取默认插件列表
 * 动态从 base-plugins 目录加载所有插件
 */
export function getDeafultPlugins(): PluginConfig[] {
  const plugins: PluginConfig[] = [];

  // 遍历所有导入的模块
  for (const path in pluginModules) {
    const module = pluginModules[path] as any;
    // 处理单个插件导出的情况
    if (module.default && Array.isArray(module.default)) {
      // 如果模块有 default 导出且是数组，说明是多个插件的集合
      plugins.push(...module.default);
    } else if (module.default && typeof module.default === 'object' && module.default.id) {
      // 如果模块有 default 导出且是单个插件对象
      plugins.push(module.default);
    } else {
      // 处理命名导出的情况，查找所有以 Plugin 结尾的导出
      for (const key in module) {
        if (key.endsWith('Plugin') && typeof module[key] === 'object' && module[key].id) {
          plugins.push(module[key]);
        }
      }
    }
  }

  console.log('🔌 动态加载的默认插件数量:', plugins.length);
  return plugins;
}

/**
 * 根据ID获取默认插件
 */
export function getDeafultPluginById(pluginId: string): PluginConfig | null {
  const plugins = getDeafultPlugins();
  return plugins.find(plugin => plugin.id === pluginId) || null;
}
