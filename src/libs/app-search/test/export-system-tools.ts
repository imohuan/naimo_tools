import { writeFile } from 'fs/promises';
import { join } from 'path';
import { getSystemTools } from '../system-tools/index';
import { getDirname } from '@main/utils';


const __dirname = getDirname(import.meta.url);

/**
 * 测试：导出系统工具列表到 JSON 文件
 */
async function exportSystemToolsToJson() {
  try {
    console.log('开始获取系统工具列表...');

    // 获取系统工具列表
    const systemTools = await getSystemTools();

    console.log(`获取到 ${systemTools.length} 个系统工具`);

    // 输出文件路径
    const outputPath = join(__dirname, 'system-tools-output.json');

    // 将结果写入 JSON 文件
    await writeFile(
      outputPath,
      JSON.stringify(systemTools, null, 2),
      'utf-8'
    );

    console.log(`✅ 成功导出到: ${outputPath}`);
    console.log(`📊 统计信息:`);
    console.log(`  - 总数: ${systemTools.length}`);
    console.log(`  - 有图标: ${systemTools.filter(t => t.icon).length}`);
    console.log(`  - 有描述: ${systemTools.filter(t => t.description).length}`);
    console.log(`  - 有命令: ${systemTools.filter(t => t.command).length}`);

  } catch (error) {
    console.error('❌ 导出失败:', error);
    process.exit(1);
  }
}

// 执行测试
exportSystemToolsToJson();

