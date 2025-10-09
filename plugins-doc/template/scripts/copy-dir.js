import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 递归复制目录
 * @param {string} src - 源目录路径
 * @param {string} dest - 目标目录路径
 */
function copyDirectory(src, dest) {
  // 创建目标目录
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // 读取源目录内容
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // 递归复制子目录
      copyDirectory(srcPath, destPath);
    } else {
      // 复制文件
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 递归删除目录
 * @param {string} dirPath - 要删除的目录路径
 */
function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`已删除现有目录: ${dirPath}`);
  }
}

/**
 * 获取目录信息
 * @param {string} dirPath - 目录路径
 * @returns {object} 目录信息
 */
function getDirectoryInfo(dirPath) {
  let fileCount = 0;
  let dirCount = 0;
  let totalSize = 0;

  function traverse(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        dirCount++;
        traverse(fullPath);
      } else {
        fileCount++;
        const stats = fs.statSync(fullPath);
        totalSize += stats.size;
      }
    }
  }

  if (fs.existsSync(dirPath)) {
    traverse(dirPath);
  }

  return { fileCount, dirCount, totalSize };
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 询问用户确认
 * @param {string} question - 问题
 * @returns {Promise<boolean>} 用户是否确认
 */
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const normalizedAnswer = answer.trim().toLowerCase();
      resolve(normalizedAnswer === 'y' || normalizedAnswer === 'yes' || normalizedAnswer === '是');
    });
  });
}

/**
 * 主函数：复制 dist 目录到目标路径
 */
async function main() {
  // 获取命令行参数中的目标路径
  const targetPath = process.argv[2];

  if (!targetPath) {
    console.error('错误：请提供目标路径作为参数');
    console.log('用法: node copy-dir.js <目标绝对路径>');
    console.log('示例: node copy-dir.js C:\\path\\to\\destination');
    process.exit(1);
  }

  // 检查目标路径是否为绝对路径
  if (!path.isAbsolute(targetPath)) {
    console.error('错误：请提供绝对路径');
    process.exit(1);
  }

  // 源目录路径（当前项目的 dist 目录）
  const sourceDir = path.join(__dirname, '..', 'dist');

  // 检查源目录是否存在
  if (!fs.existsSync(sourceDir)) {
    console.error(`错误：源目录不存在: ${sourceDir}`);
    console.log('请先构建项目生成 dist 目录');
    process.exit(1);
  }

  // 目标目录路径（直接使用用户提供的路径）
  const destDir = targetPath;

  try {
    console.log(`开始复制操作...`);
    console.log(`源目录: ${sourceDir}`);
    console.log(`目标目录: ${destDir}`);

    // 如果目标目录已存在，先显示信息并询问是否删除
    if (fs.existsSync(destDir)) {
      console.log('\n⚠️  目标目录已存在！');
      console.log(`路径: ${destDir}`);

      // 获取并显示目录信息
      const dirInfo = getDirectoryInfo(destDir);
      console.log(`\n目录信息:`);
      console.log(`  - 文件数量: ${dirInfo.fileCount}`);
      console.log(`  - 文件夹数量: ${dirInfo.dirCount}`);
      console.log(`  - 总大小: ${formatSize(dirInfo.totalSize)}`);

      // 询问用户是否确认删除
      console.log('\n此目录将被完全删除后进行复制！');
      const confirmed = await askConfirmation('是否继续删除并复制？(y/yes/是 或 n/no/否): ');

      if (!confirmed) {
        console.log('\n已取消操作。');
        process.exit(0);
      }

      console.log('\n正在删除现有目录...');
      removeDirectory(destDir);
    }

    // 复制目录
    console.log('正在复制文件...');
    copyDirectory(sourceDir, destDir);

    console.log('\n✓ 复制完成！');
  } catch (error) {
    console.error('复制过程中出错:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main();

