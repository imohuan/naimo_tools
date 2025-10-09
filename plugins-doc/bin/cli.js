#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

program
  .name('naimo-plugin')
  .description('Naimo plugin development template initializer')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize a new Naimo plugin project in the current directory')
  .option('-f, --force', 'Force initialization even if files already exist')
  .action(async (options) => {
    try {
      const targetDir = process.cwd();
      const templateDir = path.join(__dirname, '../template');

      console.log(chalk.blue('📦 Initializing Naimo plugin template...'));
      console.log(chalk.gray(`Target directory: ${targetDir}`));

      // Check if template directory exists
      if (!fs.existsSync(templateDir)) {
        console.error(chalk.red('❌ Template directory not found!'));
        process.exit(1);
      }

      // Get all files in template directory
      const files = fs.readdirSync(templateDir);

      if (files.length === 0) {
        console.error(chalk.red('❌ Template directory is empty!'));
        process.exit(1);
      }

      let copiedCount = 0;
      let skippedCount = 0;

      // Copy each file
      for (const file of files) {
        const sourcePath = path.join(templateDir, file);
        const targetPath = path.join(targetDir, file);

        // Check if file already exists
        if (fs.existsSync(targetPath) && !options.force) {
          console.log(chalk.yellow(`⚠️  Skipping ${file} (already exists)`));
          skippedCount++;
          continue;
        }

        // Copy file
        await fs.copy(sourcePath, targetPath);
        console.log(chalk.green(`✓ Created ${file}`));
        copiedCount++;
      }

      console.log('');
      console.log(chalk.green.bold(`✨ Successfully initialized Naimo plugin template!`));
      console.log(chalk.gray(`   ${copiedCount} file(s) created`));

      if (skippedCount > 0) {
        console.log(chalk.gray(`   ${skippedCount} file(s) skipped (use --force to overwrite)`));
      }

      console.log('');
      console.log(chalk.cyan('📚 Next steps:'));
      console.log(chalk.gray('   1. Read 插件开发指南.md for development guide'));
      console.log(chalk.gray('   2. Check schema.json for plugin manifest schema'));
      console.log(chalk.gray('   3. Use naimo.d.ts for TypeScript type definitions'));
      console.log('');

    } catch (error) {
      console.error(chalk.red('❌ Error during initialization:'), error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

