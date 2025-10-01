import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { readFileSync, writeFileSync, readdirSync, copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from "path"

import JavaScriptObfuscator from "javascript-obfuscator";
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

/**
 * 精简package.json
 * @param {*} buildPath 
 */
function prunePackageJson(buildPath) {
  const packageJsonPath = join(buildPath, "package.json");
  const packageJsonContent = readFileSync(packageJsonPath, "utf8");
  const packageJson = JSON.parse(packageJsonContent);
  // 只保留指定的字段
  const allowedFields = ['name', 'version', 'main', 'author', 'description', 'repository', 'license'];
  Object.keys(packageJson).forEach((key) => {
    if (!allowedFields.includes(key)) {
      delete packageJson[key];
    }
  });
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

/**
 * 复制图标文件到 resources 目录（在 asar 外部）
 * @param {*} buildPath 
 */
function copyIconToResources(buildPath) {
  try {
    const sourceIcon = resolve(process.cwd(), 'setup/exe.ico');
    const targetDir = join(buildPath, 'resources');
    const targetIcon = join(targetDir, 'app-icon.ico');

    // 确保 resources 目录存在
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    // 复制图标文件
    if (existsSync(sourceIcon)) {
      copyFileSync(sourceIcon, targetIcon);
      console.log('✅ 图标文件复制成功:', targetIcon);
    } else {
      console.warn('⚠️ 源图标文件不存在:', sourceIcon);
    }
  } catch (error) {
    console.error('❌ 复制图标文件失败:', error.message);
  }
}

/**
 * 混淆主进程代码
 * @param {*} buildPath 
 */
function obfuscateMainProcess(buildPath) {
  console.log('[混淆调试] 开始处理目录:', buildPath);
  try {
    // 匹配主进程 JS 文件（根据你的入口文件调整模式）
    const distPath = join(buildPath, 'dist');
    const files = [];

    // 递归查找所有JS文件
    function findJsFiles(dir) {
      const items = readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = join(dir, item.name);
        if (item.isDirectory()) {
          findJsFiles(fullPath);
        } else if (item.name.endsWith('.js')) {
          files.push(fullPath.replace(distPath + '/', ''));
        }
      }
    }

    findJsFiles(distPath);
    console.log(files, '查询到的JS文件， 开始混淆');

    // 混淆配置（根据需求调整）
    // JavaScript Obfuscator 配置项，详细文档见：https://github.com/javascript-obfuscator/javascript-obfuscator
    const obfuscationOptions = {
      // 是否压缩输出代码
      compact: true,
      // 启用控制流扁平化（增加反调试难度，可能影响性能）
      controlFlowFlattening: true,
      // 控制流扁平化的应用概率（0-1之间，越高越混淆）
      controlFlowFlatteningThreshold: 0.75,
      // 将数字字面量替换为更复杂的表达式
      numbersToExpressions: true,
      // 启用简化代码（删除未使用的代码等）
      simplify: true,
      // 打乱字符串数组的顺序
      stringArrayShuffle: true,
      // 拆分字符串为子串
      splitStrings: true,
      // 拆分字符串的概率
      stringArrayThreshold: 0.75,
      // 保留的变量名（防止 Electron 关键 API 被混淆）
      reservedNames: [
        'electron', 'require', 'module', 'exports',
        'BrowserWindow', 'app'
      ],
      // 是否重命名全局变量
      renameGlobals: false,
    };

    // 批量混淆文件, linux环境上file是相对路径
    for (const file of files) {
      const filePath = resolve(distPath, file);
      console.log("文件绝对路径", filePath);
      const code = readFileSync(filePath, "utf8");
      const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, obfuscationOptions).getObfuscatedCode();
      writeFileSync(filePath, obfuscatedCode);
    }
    console.log('✅ 所有JS文件混淆完成');
  } catch (error) {
    throw new Error(`混淆失败: ${error.message}`);
  }
}


export default {
  packagerConfig: {
    icon: './setup/exe.ico', // 需要准备图标文件
    name: pkg.name,
    executableName: pkg.name,
    appVersion: pkg.version,
    buildVersion: pkg.version,
    appCopyright: `Copyright © 2024 ${pkg.author}`,
    // ElectronForge 默认会将项目根目录下的所有文件和目录打包到 resources 目录中
    // 因此需要通过 ignore 配置排除不需要打包进安装包的内容
    // node_modules 目录只会包含 dependencies 依赖，devDependencies 不会被打包
    // 注意：ignore 仅支持字符串或正则表达式数组，不能使用通配符
    // 建议根据实际项目结构，定期检查和优化忽略列表，避免无关文件被打包
    ignore: [
      /^\/src/,
      /^\/\.vscode/,
      /^\/\.git/,
      /^\/scripts/,
      /^\/docs/,
      /\.ts$/,
      /\.map$/,
      /README\.md$/,
      /\.gitignore$/,
      /tsconfig\.json$/,
      /vite\.config\.ts$/,
      /pnpm-lock\.yaml$/,
      /pnpm-workspace\.yaml$/
    ],
    // 平台特定配置
    osxSign: {},
    osxNotarize: {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    },
    win32metadata: {
      CompanyName: 'IMOHUAN',
      ProductName: pkg.name,
      FileDescription: pkg.description,
      InternalName: pkg.name
      // 安装包需要以管理员权限运行
      // "requested-execution-level": "requireAdministrator"
    },
    // 是否使用asar压缩资源
    asar: true,
  },
  // 定义钩子，更多钩子请参考：https://www.electronforge.io/config/hooks
  hooks: {
    // 在文件拷贝完成后触发
    packageAfterCopy: async (config, buildPath, electronVersion, platform, arch) => {
      console.log(`🚀 packageAfterCopy hook 开始执行! 📁 buildPath: ${buildPath} 🔧 platform: ${platform} 🏗️ arch: ${arch}`);
      // 比如在拷贝完成后需要删除src目录
      //await fsPromises.rmdir(path.join(buildPath, "src"), { recursive: true });
      try {
        console.log('🔍 开始执行混淆和精简操作...');
        // 复制图标文件到 resources 目录（在 asar 外部，运行时可访问）
        copyIconToResources(buildPath);
        // 加密生产代码，不影响 build 目录下代码
        obfuscateMainProcess(buildPath);
        // 精简package.json，删除无需暴露的属性
        prunePackageJson(buildPath);
        console.log('✅ packageAfterCopy hook 执行完成!');
      } catch (error) {
        console.error('❌ packageAfterCopy hook 执行失败:', error);
        throw error;
      }
    },
    packageAfterPrune: async (config, buildPath) => {
      console.log('清理完成...');
    },
  },
  rebuildConfig: {},
  makers: [
    // 通用ZIP格式 - 所有平台都支持
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32', 'darwin', 'linux'],
    },
    // Windows 专用安装包
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: pkg.name,
        setupIcon: './setup/exe.ico',
        // 以下配置确保创建开始菜单和桌面快捷方式
        setupExe: `${pkg.name}-${pkg.version}-setup.exe`,
        // 不跳过创建快捷方式
        noMsi: true,
        // 安装后自动启动
        // remoteReleases: false,

        // 创建桌面快捷方式的关键配置
        loadingGif: undefined,
        // 设置应用程序快捷方式
        // Squirrel 会在首次运行时创建快捷方式，我们通过 setupIcon 来设置图标
      },
    },
    // macOS 专用安装包
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {
        background: './setup/background.png',
        format: 'ULFO'
      }
    },
    // Linux 专用安装包
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {
        options: {
          maintainer: pkg.author,
          homepage: pkg.repository.url,
          license: pkg.license
        }
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      platforms: ['linux'],
      config: {
        options: {
          maintainer: pkg.author,
          homepage: pkg.repository.url,
          license: pkg.license
        }
      },
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: pkg.repository.owner, // 替换为你的 GitHub 用户名
          name: pkg.repository.name    // 替换为你的仓库名
        },
        prerelease: false,
        draft: true,
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ]
};
