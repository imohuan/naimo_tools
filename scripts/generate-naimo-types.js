/**
 * 生成 Naimo API 类型声明文件
 * 
 * 使用 dts-bundle-generator 从 webpagePreload.ts 生成插件开发所需的类型声明
 * 输出：plugins-doc/template/naimo.d.ts
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置路径
const PROJECT_ROOT = path.join(__dirname, '..');
const TSCONFIG = path.join(PROJECT_ROOT, 'tsconfig.dts.json');
const SOURCE_FILE = path.join(PROJECT_ROOT, 'src/main/preloads/webpagePreload.ts');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'plugins-doc/template/typings/naimo.d.ts');

console.log('🚀 开始生成 Naimo API 类型声明...\n');

try {
  // 检查源文件是否存在
  if (!fs.existsSync(SOURCE_FILE)) {
    throw new Error(`源文件不存在: ${SOURCE_FILE}`);
  }

  // 检查 tsconfig 是否存在
  if (!fs.existsSync(TSCONFIG)) {
    throw new Error(`TypeScript 配置文件不存在: ${TSCONFIG}`);
  }

  console.log('📖 源文件:', path.relative(PROJECT_ROOT, SOURCE_FILE));
  console.log('⚙️  配置文件:', path.relative(PROJECT_ROOT, TSCONFIG));
  console.log('📄 输出文件:', path.relative(PROJECT_ROOT, OUTPUT_FILE));
  console.log('\n🔨 执行 dts-bundle-generator...\n');

  // 构建命令
  const command = `npx dts-bundle-generator --project "${TSCONFIG}" -o "${OUTPUT_FILE}" "${SOURCE_FILE}"`;

  // 执行命令
  const output = execSync(command, {
    cwd: PROJECT_ROOT,
    encoding: 'utf-8',
    stdio: 'inherit'
  });

  // 检查输出文件是否生成成功
  if (!fs.existsSync(OUTPUT_FILE)) {
    throw new Error('类型声明文件生成失败');
  }

  console.log('\n📝 添加自定义内容...\n');

  // 读取生成的文件内容
  let content = fs.readFileSync(OUTPUT_FILE, 'utf-8');

  // 获取当前日期
  const today = new Date().toISOString().split('T')[0];

  // 构建顶部注释
  const headerComment = `/**
 * Naimo Tools 插件 API 类型声明
 * 
 * @version 2.0
 * @date ${today}
 * 
 * 本文件由脚本自动生成，请勿手动修改
 * 生成脚本: scripts/generate-naimo-types.js
 * 源文件: src/main/preloads/webpagePreload.ts (动态分析提取)
 */

`;

  // 构建底部全局声明
  const globalDeclaration = `
declare global {
  interface Window {
    /**
     * Naimo Tools 插件 API
     * 
     * 可在插件的 HTML 页面中通过 window.naimo 访问
     */
    naimo: Naimo;
  }
  const naimo: Naimo;
}
`;

  // 组合最终内容：顶部注释 + 原始内容 + 底部全局声明
  const finalContent = headerComment + content + globalDeclaration;

  // 写回文件
  fs.writeFileSync(OUTPUT_FILE, finalContent, 'utf-8');

  // 获取文件统计信息
  const stats = fs.statSync(OUTPUT_FILE);
  const lineCount = finalContent.split('\n').length;

  console.log('✅ 类型声明文件生成成功！');
  console.log(`📄 输出路径: ${path.relative(PROJECT_ROOT, OUTPUT_FILE)}`);
  console.log(`📊 文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`📝 总行数: ${lineCount}`);

} catch (error) {
  console.error('\n❌ 生成失败:', error.message);
  if (error.stderr) {
    console.error('\n错误输出:');
    console.error(error.stderr.toString());
  }
  process.exit(1);
}