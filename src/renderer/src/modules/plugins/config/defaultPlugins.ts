import type { PluginConfig } from "@/typings/pluginTypes";

/**
 * 使用 import.meta.glob 动态导入 base-plugins 目录下的所有插件
 */
const pluginModules = import.meta.glob('../base-plugins/*.ts', { eager: true });

/**
 * 获取默认插件列表
 * 动态从 base-plugins 目录加载所有插件
 */
export function getDefaultPlugins(): PluginConfig[] {
  const plugins: PluginConfig[] = [];

  console.log('🔍 开始加载默认插件...');
  console.log('📋 找到的模块路径:', Object.keys(pluginModules));

  // 遍历所有导入的模块
  for (const path in pluginModules) {
    const module = pluginModules[path] as any;
    console.log(`📦 处理模块: ${path}`);
    console.log('  - 模块内容:', Object.keys(module));

    // 处理单个插件导出的情况
    if (module.default && Array.isArray(module.default)) {
      // 如果模块有 default 导出且是数组，说明是多个插件的集合
      console.log(`  ✅ 找到 default 数组导出，插件数量: ${module.default.length}`);
      plugins.push(...module.default);
    } else if (module.default && typeof module.default === 'object' && module.default.id) {
      // 如果模块有 default 导出且是单个插件对象
      console.log(`  ✅ 找到 default 对象导出: ${module.default.id}`);
      plugins.push(module.default);
    } else {
      // 处理命名导出的情况，查找所有以 Plugin 结尾的导出
      let foundCount = 0;
      for (const key in module) {
        if (key.endsWith('Plugin') && typeof module[key] === 'object' && module[key].id) {
          console.log(`  ✅ 找到命名导出: ${key} (id: ${module[key].id})`);
          plugins.push(module[key]);
          foundCount++;
        }
      }
      if (foundCount === 0) {
        console.warn(`  ⚠️ 未找到以Plugin结尾的导出`);
      }
    }
  }

  console.log('🔌 动态加载的默认插件数量:', plugins.length);
  console.log('📊 插件列表:', plugins.map(p => ({ id: p.id, name: p.name })));
  return plugins;
}

/**
 * 根据ID获取默认插件
 */
export function getDefaultPluginById(pluginId: string): PluginConfig | null {
  const plugins = getDefaultPlugins();
  return plugins.find(plugin => plugin.id === pluginId) || null;
}
