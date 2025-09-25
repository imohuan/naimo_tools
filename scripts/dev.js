#!/usr/bin/env node

/**
 * 开发服务器管理器 - 重构版本
 * 
 * 这是一个基于类的开发服务器管理器，用于管理 Electron 应用的开发环境。
 * 主要功能包括：
 * 
 * 1. WebSocket 服务器 - 与客户端通信，提供实时状态更新
 * 2. Vite 开发服务器 - 渲染进程的热重载开发服务器
 * 3. 主进程编译 - 使用 Vite 编译主进程代码
 * 4. Preload 脚本管理 - 单独编译和监听 preload 脚本
 * 5. Electron 进程管理 - 启动、重启和监控 Electron 应用
 * 6. IPC Types 自动生成 - 监听 IPC modules 变化并自动生成类型定义
 * 7. 文件监听 - 监听配置文件变化并自动重建
 * 8. 日志记录 - 记录开发过程中的日志
 * 
 * 使用方法：
 * - 普通模式：node scripts/dev-class.js
 * - 主进程调试：node scripts/dev-class.js --debug
 * - 渲染进程调试：node scripts/dev-class.js --renderer-debug
 * - 启用 IPC Types：node scripts/dev-class.js --enable-ipc-types
 * - 启用日志记录：node scripts/dev-class.js --enable-log
 * 
 * @author 重构自 dev.js
 * @version 2.0.0
 */
import net from 'net';
import chokidar from 'chokidar';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { join, dirname } from 'path';
import { spawn } from 'child_process';
import { existsSync, rmSync, mkdirSync, readFileSync, readdirSync, appendFileSync, writeFileSync } from 'fs';

// ==================== 配置区域 ====================
/**
 * 开发服务器配置
 * 所有配置项都在这里统一管理，便于维护和修改
 */
const CONFIG = {
  // 端口配置 - 各种服务使用的端口号
  ports: {
    webSocket: 9109,        // WebSocket 服务器端口，用于与客户端通信
    mainDebug: 9229,        // 主进程调试端口，用于 VSCode 调试器连接
    rendererDebug: 9222,    // 渲染进程调试端口，用于 Chrome DevTools 连接
    rendererDefault: 5173   // 渲染进程开发服务器默认端口（Vite） package.json找找不到配置的情况下使用 package.json中的config.dev.rendererPort
  },

  // 功能开关 - 控制各种功能的启用/禁用
  features: {
    enableDebugLog: process.argv.includes('--debug-log'),       // 是否启用调试日志 在终端显示，默认写入dev.log文件
    enableMainDebug: process.argv.includes('--debug'),           // 是否启用主进程调试模式
    enableRendererDebug: process.argv.includes('--renderer-debug'),       // 是否启用渲染进程调试模式
    enableIpcTypesGeneration: process.argv.includes('--enable-ipc-types') || process.env.ENABLE_IPC_TYPES === 'true',   // 是否启用 IPC Types 自动生成功能
    enableWebSocketLog: false,      // 是否启用 WebSocket 日志
  },

  logPath: join(getDirname(), 'dev.log'), // 日志文件路径

  // 防抖延迟配置（毫秒）- 防止频繁触发操作
  debounce: {
    electronRestart: 500,           // Electron 重启防抖延迟
    preloadRebuild: 1000,           // Preload 脚本重建防抖延迟
    ipcTypesGeneration: 1000,       // IPC Types 生成防抖延迟
    mainProcessRebuild: 1000        // Main 进程重建防抖延迟
  },

  // 等待配置 - 各种等待操作的超时和重试设置
  wait: {
    portCheckMaxAttempts: 30,       // 端口检查最大尝试次数
    portCheckInterval: 1000,        // 端口检查间隔（毫秒）
    electronStartDelay: 3000,       // Electron 启动延迟（等待编译完成）
    electronRestartDelay: 1000      // Electron 重启延迟（等待进程完全关闭）
  },

  // 进程管理配置 - 子进程的默认设置
  process: {
    forceColor: '1',                // 强制启用颜色输出
    stdio: ['ignore', 'pipe', 'pipe'] // 标准输入输出配置：忽略输入，管道输出和错误
  }
};

// ==================== 开发服务器管理类 ====================
/**
 * 开发服务器管理器
 * 负责管理整个开发环境的启动、监控和清理
 * 包括：WebSocket 服务器、Vite 开发服务器、Electron 进程、文件监听等
 */
class DevServerManager {
  constructor(config) {
    // 基础配置 - 引用全局配置对象
    this.config = config;

    // WebSocket 相关 - 用于与客户端通信
    this.webSocketServer = null;        // WebSocket 服务器实例
    this.webSocketClients = new Set();  // 连接的客户端集合

    // 进程管理 - 跟踪所有子进程
    this.processes = [];                // 所有进程的通用列表
    this.viteMainProcess = null;        // Vite 主进程编译进程
    this.viteRendererProcess = null;    // Vite 渲染进程开发服务器
    this.vitePreloadProcesses = [];     // Vite Preload 脚本编译进程列表
    this.electronProcess = null;        // Electron 主进程

    // 状态管理 - 控制重启和防抖
    this.isElectronRestarting = false;  // 是否正在重启 Electron
    this.electronRestartTimeout = null; // Electron 重启防抖定时器

    // 监听器管理 - 文件变化监听
    this.preloadWatchers = [];          // Preload 配置文件监听器
    this.preloadRebuildTimeout = null;  // Preload 重建防抖定时器
    this.ipcTypesWatchers = [];         // IPC Types 监听器
    this.ipcTypesGenerationTimeout = null; // IPC Types 生成防抖定时器

    // 主进程监听器
    this.mainProcessWatcher = null;    // 主进程监听器
    this.mainProcessRebuildTimeout = null; // 主进程重建防抖定时器
  }



  /**
   * 去除 ANSI 转义序列的函数
   */
  stripAnsiCodes(text) {
    return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
      .replace(/\x1b\]0;.*?\x07/g, '')  // 去除标题设置序列
      .replace(/\x1b\].*?\x07/g, '')     // 去除其他 ESC 序列
      .replace(/\x1b[0-9;]*[a-zA-Z]/g, ''); // 去除其他转义序列
  }

  printWrite(...texts) {
    const text = texts.join(' ');
    const cleanText = this.stripAnsiCodes(text);

    // 如果内容为空或只包含空白字符，跳过记录
    if (!cleanText.trim()) {
      return;
    }

    // 保留年月日
    const timestamp = new Date().toISOString();
    let logEntry = `[${timestamp}] ${cleanText}`;

    // 如果 logEntry没有在结尾换行
    if (!logEntry.trimEnd().endsWith('\n')) {
      logEntry += '\n';
    }

    if (this.config.features.enableDebugLog) {
      process.stdout.write(cleanText);
    } else {
      appendFileSync(this.config.logPath, logEntry, 'utf8');
    }
  }

  // ==================== 初始化方法 ====================

  /**
   * 初始化开发服务器管理器
   */
  async initialize() {
    console.log('🚀 初始化开发服务器管理器...');

    // 输出调试模式信息
    if (this.config.features.enableMainDebug || this.config.features.enableRendererDebug) {
      this.logDebugModeInfo();
    } else {
      console.log('🚀 启动开发模式...\n');
    }

    if (this.config.features.enableIpcTypesGeneration) {
      console.log('📝 IPC Types 自动生成已启用');
    }

    // 确保必要目录存在
    this.ensureDirectoriesExist();

    // 设置环境变量
    this.setupEnvironment();

    // 启动 WebSocket 服务器
    await this.createWebSocketServer();

    console.log('✅ 开发服务器管理器初始化完成');
  }


  /**
   * 输出调试模式信息
   */
  logDebugModeInfo() {
    console.log('🐛 启动调试模式...\n');

    if (this.config.features.enableMainDebug) {
      console.log(`📍 主进程调试端口: ${this.config.ports.mainDebug}`);
      console.log('🔧 主进程断点: 在 src/main/ 目录下设置断点');
      console.log('🔧 Preload断点: 在 src/main/preloads/ 目录下设置断点');
    }

    if (this.config.features.enableRendererDebug) {
      console.log(`📍 渲染进程调试端口: ${this.config.ports.rendererDebug}`);
      console.log('🔧 渲染进程断点: 在 src/renderer/src/ 目录下设置断点');
      console.log('🔧 等待应用启动后，在浏览器中访问 chrome://inspect 进行渲染进程调试');
    }

    console.log('⚡ 请在 VSCode 中使用以下调试配置：');
    console.log('   - "🚀 启动开发服务器" - 启动开发环境');
    console.log('   - "🚀 Electron: 全部调试" - 同时调试主进程和渲染进程');
    console.log('   - "🛠️ Electron: 主进程+Preload" - 调试主进程和Preload脚本');
    console.log();
  }

  /**
   * 确保必要目录存在
   */
  ensureDirectoriesExist() {
    if (!existsSync('dist')) {
      mkdirSync('dist', { recursive: true });
    }
  }

  /**
   * 设置环境变量
   */
  setupEnvironment() {
    process.env.NODE_ENV = 'development';
  }

  // ==================== WebSocket 服务器管理 ====================

  /**
   * 创建 WebSocket 服务器
   */
  async createWebSocketServer() {

    try {
      this.webSocketServer = new WebSocketServer({
        port: this.config.ports.webSocket,
        perMessageDeflate: false
      });

      this.webSocketServer.on('connection', (ws, req) => {
        this.handleWebSocketConnection(ws, req);
      });

      this.webSocketServer.on('error', (error) => {
        if (error.message.includes("listen EADDRINUSE: address already in use")) {
          console.log("😎 你的服务已经启用，无需重新启动~");
          process.exit(0);
        }

        console.error('❌ WebSocket服务器错误:', error);
      });

      console.log(`🌐 WebSocket服务器已启动，端口: ${this.config.ports.webSocket}`);
      return true;
    } catch (error) {
      console.error('❌ 创建WebSocket服务器失败:', error);
    }
  }

  /**
   * 处理 WebSocket 连接
   */
  handleWebSocketConnection(ws, req) {
    const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
    this.webSocketClients.add(ws);
    if (this.config.features.enableWebSocketLog) {
      console.log(`🔌 WebSocket客户端连接: ${clientId} (总连接数: ${this.webSocketClients.size})`);
    }

    // 发送欢迎消息
    ws.send(JSON.stringify({
      type: 'welcome',
      message: '已连接到开发服务器',
      timestamp: new Date().toISOString(),
      clientId: clientId
    }));

    // 处理客户端消息
    ws.on('message', (data) => {
      this.handleWebSocketMessage(data, ws, clientId);
    });

    // 处理连接关闭
    ws.on('close', (code, reason) => {
      this.webSocketClients.delete(ws);
      if (this.config.features.enableWebSocketLog) {
        console.log(`🔌 WebSocket客户端断开: ${clientId} (代码: ${code}, 原因: ${reason || '未知'}) (剩余连接数: ${this.webSocketClients.size})`);
      }
    });

    // 处理连接错误
    ws.on('error', (error) => {
      this.webSocketClients.delete(ws);
      console.error(`❌ WebSocket客户端错误 [${clientId}]:`, error);
    });
  }

  /**
   * 处理 WebSocket 消息
   */
  handleWebSocketMessage(data, ws, clientId) {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 收到WebSocket消息 [${clientId}]:`, message);

      switch (message.type) {
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;
        case 'request_status':
          ws.send(JSON.stringify({
            type: 'status',
            data: {
              processes: this.processes.length,
              isDebugMode: this.config.features.enableMainDebug,
              isRendererDebugMode: this.config.features.enableRendererDebug,
              rendererPort: this.getRendererPort()
            },
            timestamp: new Date().toISOString()
          }));
          break;
        default:
          console.log(`📨 未知消息类型: ${message.type}`);
      }
    } catch (error) {
      console.error('❌ 解析WebSocket消息失败:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: '消息格式错误',
        timestamp: new Date().toISOString()
      }));
    }
  }

  /**
   * 向所有 WebSocket 客户端发送消息
   */
  sendToWebSocketClients(message) {
    if (!this.webSocketServer || this.webSocketClients.size === 0) {
      return;
    }

    const messageData = typeof message === 'string' ? message : JSON.stringify({
      type: 'notification',
      data: message,
      timestamp: new Date().toISOString()
    });

    let sentCount = 0;
    this.webSocketClients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN = 1
        try {
          client.send(messageData);
          sentCount++;
        } catch (error) {
          console.error('❌ 发送WebSocket消息失败:', error);
          this.webSocketClients.delete(client);
        }
      } else {
        this.webSocketClients.delete(client);
      }
    });

    if (sentCount > 0) {
      if (this.config.features.enableWebSocketLog) {
        console.log(`📤 已向 ${sentCount} 个WebSocket客户端发送消息`);
      }
    }
  }

  // ==================== 进程管理 ====================



  /**
   * 创建进程
   */
  createProcess(command, args, options = {}) {
    const defaultOptions = {
      stdio: this.config.process.stdio,
      shell: true,
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: this.config.process.forceColor },
      ...options
    };

    this.printWrite(`🔧 创建进程: ${command} ${args.join(' ')}; ENV: ${JSON.stringify(defaultOptions.env)}`);
    const childProcess = spawn(command, args, defaultOptions);

    // 设置输出编码和处理
    if (childProcess.stdout) {
      childProcess.stdout.setEncoding('utf8');
      if (options.onStdout) {
        childProcess.stdout.on('data', options.onStdout);
      }

      childProcess.stdout.on('data', (data) => {
        const prefix = options.prefix || '';
        // 按行分割处理，避免空行
        const lines = data.split('\n');
        lines.forEach(line => {
          if (line.trim()) { // 只处理非空行
            const text = prefix ? `[${prefix}] ${line}` : line;
            this.printWrite(text);
          }
        });
      });
    }

    if (childProcess.stderr) {
      childProcess.stderr.setEncoding('utf8');
      if (options.onStderr) {
        childProcess.stderr.on('data', options.onStderr);
      }

      childProcess.stderr.on('data', (data) => {
        const prefix = options.prefix || '';
        // 按行分割处理，避免空行
        const lines = data.split('\n');
        lines.forEach(line => {
          if (line.trim()) { // 只处理非空行
            const text = prefix ? `[${prefix}] ${line}` : line;
            this.printWrite(text);
          }
        });
      });
    }

    // 错误处理
    if (options.onError) {
      childProcess.on('error', options.onError);
    }

    // 关闭处理
    if (options.onClose) {
      childProcess.on('close', options.onClose);
    }

    this.processes.push(childProcess);
    return childProcess;
  }

  // ==================== 端口管理 ====================

  /**
   * 检查端口是否可用
   */
  checkPortAvailable(port, host = 'localhost') {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, host, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      server.on('error', () => resolve(false));
    });
  }

  /**
   * 等待端口可用
   */
  waitForPortAvailable(port, maxAttempts = null, interval = null) {
    const attempts = maxAttempts || this.config.wait.portCheckMaxAttempts;
    const checkInterval = interval || this.config.wait.portCheckInterval;

    return new Promise((resolve, reject) => {
      let attemptCount = 0;
      const check = () => {
        attemptCount++;
        const socket = new net.Socket();
        socket.setTimeout(1000);

        socket.on('connect', () => {
          socket.destroy();
          resolve(true);
        });

        socket.on('timeout', () => {
          socket.destroy();
          if (attemptCount >= attempts) {
            reject(new Error(`端口 ${port} 在 ${attempts} 次尝试后仍不可用`));
          } else {
            setTimeout(check, checkInterval);
          }
        });

        socket.on('error', () => {
          if (attemptCount >= attempts) {
            reject(new Error(`端口 ${port} 在 ${attempts} 次尝试后仍不可用`));
          } else {
            setTimeout(check, checkInterval);
          }
        });

        socket.connect(port, 'localhost');
      };
      check();
    });
  }

  /**
   * 获取渲染进程端口
   */
  getRendererPort() {
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      return packageJson.config?.dev?.rendererPort || this.config.ports.rendererDefault;
    } catch (error) {
      console.warn('无法读取 package.json 配置，使用默认端口:', error);
      return this.config.ports.rendererDefault;
    }
  }

  // ==================== 构建管理 ====================

  /**
   * 检查构建完成信息
   * `../../../dist/main/preloads/basic.js  31.15 kB │ gzip: 8.15 kB │ map: 64.59 kB`
   * 这是构建消息，但是原字符有许多颜色字符，导致不能直接全部获取
   */
  isBuildCompleted(data, fileName) {
    return data.includes(fileName) && data.includes('kB') && data.includes('gzip');
  }

  /**
   * 构建 Electron 启动参数
   */
  buildElectronArguments() {
    const electronArgs = [];

    if (this.config.features.enableMainDebug) {
      electronArgs.push(`--inspect-brk=${this.config.ports.mainDebug}`);
    }

    if (this.config.features.enableRendererDebug) {
      electronArgs.push(`--remote-debugging-port=${this.config.ports.rendererDebug}`);
      electronArgs.push('--disable-web-security');
      electronArgs.push('--disable-features=VizDisplayCompositor');
      electronArgs.push('--enable-logging');
      electronArgs.push('--enable-blink-features=LayoutNG');
    }

    electronArgs.push('dist/main/main.js');
    return electronArgs;
  }

  // ==================== Preload 管理 ====================

  /**
   * 构建 preload 脚本
   * Preload 脚本需要单独构建，因为：
   * 1. 需要使用绝对路径（相对路径在 Electron 中可能有问题）
   * 2. 不允许有分块（chunk），必须打包成单个文件
   * 3. 每个 preload 文件都需要单独构建
   * 4. 支持热重载，监听配置文件变化
   */
  async buildPreloadScripts() {
    this.cleanupPreloadScripts();

    const preloadsDir = join(process.cwd(), 'src/main/preloads');
    const preloadFiles = [];

    try {
      const files = readdirSync(preloadsDir);
      files.forEach(file => {
        if (file.endsWith('.ts')) {
          const name = file.replace('.ts', '');
          preloadFiles.push(name);
        }
      });
    } catch (error) {
      console.log('No preloads directory found or empty', error);
      return;
    }

    for (const preloadFile of preloadFiles) {
      console.log(`  📦 打包 ${preloadFile}.ts...`);
      const vitePreloadProcess = this.createProcess('vite', ['build', '--config', 'vite.config.preloads.ts', '--watch'], {
        env: { ...process.env, NODE_ENV: 'development', PRELOAD_ENTRY: preloadFile },
        prefix: 'Preloads Build',
        onStdout: (data) => {
          if (this.isBuildCompleted(data, `${preloadFile}.js`)) {
            this.sendToWebSocketClients({
              type: 'preload_build_completed',
              name: preloadFile,
              message: `${preloadFile}.js 构建完成，准备重启 Electron 页面`
            });
          }
        },
        onError: (error) => {
          console.error('❌ Vite preloads 错误:', error);
        }
      });
      this.vitePreloadProcesses.push(vitePreloadProcess);
    }

    this.setupPreloadConfigWatcher();
  }

  /**
   * 清理 preload 相关进程和监听器
   */
  cleanupPreloadScripts() {
    // 关闭所有 preload 进程
    this.vitePreloadProcesses.forEach(childProcess => {
      if (childProcess && !childProcess.killed) {
        console.log(`正在关闭 preload 进程 (PID: ${childProcess.pid})...`);
        childProcess.kill();
      }
    });
    this.vitePreloadProcesses = [];

    // 关闭所有 preload watcher
    this.preloadWatchers.forEach(watcher => {
      if (watcher) {
        watcher.close();
      }
    });
    this.preloadWatchers = [];
  }

  /**
   * 设置 preload 配置文件监听器
   */
  setupPreloadConfigWatcher() {
    const viteConfigPath = join(process.cwd(), 'vite.config.preloads.ts');

    // 检查是否已经存在 watcher
    const existingWatcher = this.preloadWatchers.find(watcher =>
      watcher && watcher.getWatched && Object.keys(watcher.getWatched()).includes(viteConfigPath)
    );

    if (existingWatcher) {
      return;
    }

    const watcher = chokidar.watch(viteConfigPath);
    this.preloadWatchers.push(watcher);

    watcher.on('change', () => {
      console.log(`🔍 配置 ${viteConfigPath} 发生变化，准备重新编译...`);

      if (this.preloadRebuildTimeout) {
        clearTimeout(this.preloadRebuildTimeout);
      }

      this.preloadRebuildTimeout = setTimeout(() => {
        console.log(`🔄 重新构建 preload 脚本...`);

        this.sendToWebSocketClients({
          type: 'preload_rebuilding',
          message: '检测到 preload 配置变化，正在重新构建...'
        });

        this.buildPreloadScripts();
      }, this.config.debounce.preloadRebuild);
    });

    watcher.on('error', (error) => {
      console.error('❌ Preload 配置监听器错误:', error);
    });
  }

  // ==================== IPC Types 管理 ====================

  /**
   * 生成 IPC types
   * 自动生成 TypeScript 类型定义，用于主进程和渲染进程之间的 IPC 通信
   * 只有在启用 IPC Types 自动生成功能时才会执行
   */
  async generateIpcTypes() {
    if (!this.config.features.enableIpcTypesGeneration) {
      return;
    }

    console.log('📝 生成 IPC types...');

    try {
      const generateProcess = this.createProcess('npm', ['run', 'generate:ipc-types'], {
        prefix: 'IPC Types',
        onStdout: (data) => {
          const prefix = 'IPC Types';
          process.stdout.write(`[${prefix}] ${data}`);
        },
        onError: (error) => {
          console.error('❌ IPC types 生成错误:', error);
        },
        onClose: (code) => {
          if (code === 0) {
            console.log('✅ IPC types 生成完成');
            this.sendToWebSocketClients({
              type: 'ipc_types_generated',
              message: 'IPC types 生成完成'
            });
          } else {
            console.error(`❌ IPC types 生成失败，退出代码: ${code}`);
          }
        }
      });
    } catch (error) {
      console.error('❌ 启动 IPC types 生成失败:', error);
    }
  }

  /**
   * 设置 IPC modules 目录监听器
   */
  setupIpcModulesWatcher() {
    if (!this.config.features.enableIpcTypesGeneration) {
      return;
    }

    const modulesDir = join(process.cwd(), 'src/main/ipc-router/modules');

    if (!existsSync(modulesDir)) {
      console.log('📁 IPC modules 目录不存在，跳过监听');
      return;
    }

    // 先生成一次 IPC types
    this.generateIpcTypes();

    console.log(`👀 开始监听 IPC modules 目录: ${modulesDir}`);

    const watcher = chokidar.watch(modulesDir, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true
    });

    this.ipcTypesWatchers.push(watcher);

    watcher.on('change', (path) => {
      this.handleIpcModuleChange(path, 'change');
    });

    watcher.on('add', (path) => {
      this.handleIpcModuleChange(path, 'add');
    });

    watcher.on('unlink', (path) => {
      this.handleIpcModuleChange(path, 'unlink');
    });

    watcher.on('error', (error) => {
      console.error('❌ IPC modules 监听器错误:', error);
    });
  }

  /**
   * 处理 IPC module 变化
   */
  handleIpcModuleChange(path, eventType) {
    const eventMessages = {
      change: 'IPC module 文件发生变化',
      add: '新增 IPC module 文件',
      unlink: '删除 IPC module 文件'
    };

    console.log(`🔍 ${eventMessages[eventType]}: ${path}`);

    if (this.ipcTypesGenerationTimeout) {
      clearTimeout(this.ipcTypesGenerationTimeout);
    }

    this.ipcTypesGenerationTimeout = setTimeout(() => {
      console.log('🔄 重新生成 IPC types...');

      this.sendToWebSocketClients({
        type: 'ipc_types_generating',
        message: `检测到 IPC modules ${eventType}，正在重新生成 types...`
      });

      this.generateIpcTypes();
    }, this.config.debounce.ipcTypesGeneration);
  }

  // ==================== Electron 管理 ====================

  /**
   * 启动 Electron
   */
  startElectron() {
    const electronArgs = this.buildElectronArguments();
    const debugModeText = (this.config.features.enableMainDebug || this.config.features.enableRendererDebug) ? ' (调试模式)' : '';

    this.sendToWebSocketClients({
      type: 'electron_starting',
      message: `启动 Electron${debugModeText}`,
      debugMode: this.config.features.enableMainDebug || this.config.features.enableRendererDebug
    });

    console.log(`⚡ 启动 Electron ${debugModeText}...`);
    console.log("参数:", electronArgs);

    this.electronProcess = this.createProcess('npx', ['electron', ...electronArgs], {
      prefix: 'Electron',
      onClose: (code) => {
        console.log(`\n⚡ Electron 进程退出，代码: ${code}`);
        if (!this.isElectronRestarting) {
          this.cleanup();
        }
      },
      onError: (error) => {
        console.error('❌ Electron 启动错误:', error);
      }
    });
  }

  /**
   * 停止 Electron
   */
  stopElectron() {
    if (!this.electronProcess || this.electronProcess.killed) return;
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', this.electronProcess.pid, '/f', '/t'], { stdio: 'ignore' });
    } else {
      this.electronProcess.kill('SIGTERM');
    }
  }

  /**
   * 重启 Electron（带防抖）
   */
  restartElectron() {
    if (this.electronRestartTimeout) {
      clearTimeout(this.electronRestartTimeout);
    }

    this.electronRestartTimeout = setTimeout(() => {
      if (this.electronProcess && !this.electronProcess.killed) {
        console.log('🔄 检测到主进程更新，重启 Electron...');

        this.sendToWebSocketClients({
          type: 'electron_restarting',
          message: '检测到主进程更新，正在重启 Electron...'
        });

        this.isElectronRestarting = true;

        this.stopElectron();

        setTimeout(() => {
          this.startElectron();
          this.isElectronRestarting = false;
        }, this.config.wait.electronRestartDelay);
      }
      this.electronRestartTimeout = null;
    }, this.config.debounce.electronRestart);
  }

  // ==================== 主流程管理 ====================

  /**
   * 启动主进程
   * 这是整个开发环境的核心启动流程：
   * 1. 等待渲染进程开发服务器启动
   * 2. 编译 preload 脚本
   * 3. 设置 IPC modules 监听器
   * 4. 启动主进程编译
   * 5. 启动 Electron 应用
   */
  async startMainProcess() {
    try {
      const rendererPort = this.getRendererPort();
      console.log(`⏳ 等待渲染进程开发服务器启动 (端口: ${rendererPort})...`);
      await this.waitForPortAvailable(rendererPort);
      console.log('✅ 渲染进程开发服务器已启动');

      this.sendToWebSocketClients({
        type: 'renderer_started',
        message: '渲染进程开发服务器已启动',
        port: rendererPort
      });

      console.log('🔧 编译 preload 脚本...');
      await this.buildPreloadScripts();

      // 设置 IPC modules 监听器
      this.setupIpcModulesWatcher();

      // 启动主进程编译


      console.log('🔧 编译主进程...');
      // 方式1 不太灵活
      // const cmd1 = ["vite", 'build', '--config', 'vite.config.ts', '--watch']
      // // const cmd2 = ["nodemon", 'src/main/main.ts', '--command', cmd1.slice(0, -1).join(' ')]
      // const [cmdProcess, ...cmdArgs] = cmd1
      // console.log('🔍 主进程编译命令:', cmdProcess, cmdArgs);
      // this.viteMainProcess = this.createProcess(cmdProcess, cmdArgs, {
      //   env: { ...process.env, NODE_ENV: 'development' },
      //   prefix: 'Main Build',
      //   onStdout: (data) => {
      //     console.log('🔍 主进程编译输出:', data);
      //     if (this.isBuildCompleted(data, 'main.js')) {
      //       this.sendToWebSocketClients({
      //         type: 'main_build_completed',
      //         message: '主进程构建完成，准备重启 Electron'
      //       });
      //       // 这里很多程序文件都会触发这里的重启，所以需要判断是否是主进程的构建完成
      //       this.restartElectron();
      //     }
      //   },
      //   onError: (error) => {
      //     console.error('❌ Vite 主进程错误:', error);
      //   }
      // });

      // 方式2 监听单一文件变化
      // 监听 src/main/main.ts 文件变化
      this.mainProcessWatcher = chokidar.watch('src/main/main.ts', {
        persistent: true,
        ignoreInitial: true
      });


      const buildMainProcess = (isInit = false) => {
        const cmd1 = ["vite", 'build', '--config', 'vite.config.ts']
        const [cmdProcess, ...cmdArgs] = cmd1
        console.log('🔍 主进程文件变化，重新构建...');
        this.viteMainProcess = this.createProcess(cmdProcess, cmdArgs, {
          env: { ...process.env, NODE_ENV: 'development' },
          prefix: 'Main Build',
          onStdout: (data) => {
            if (this.isBuildCompleted(data, 'main.js')) {
              this.sendToWebSocketClients({
                type: 'main_build_completed',
                message: '主进程构建完成，准备重启 Electron'
              });
              // 这里很多程序文件都会触发这里的重启，所以需要判断是否是主进程的构建完成
              if (!isInit) {
                this.restartElectron();
              }
            }
          },
          onError: (error) => {
            console.error('❌ Vite 主进程错误:', error);
          }
        });

      }

      this.mainProcessWatcher.on('change', () => {
        if (this.mainProcessRebuildTimeout) {
          clearTimeout(this.mainProcessRebuildTimeout);
        }
        this.mainProcessRebuildTimeout = setTimeout(() => {
          buildMainProcess()
        }, this.config.debounce.mainProcessRebuild);
      });

      buildMainProcess(true)

      // 等待编译完成后启动 Electron
      setTimeout(() => {
        this.startElectron();
      }, this.config.wait.electronStartDelay);

    } catch (error) {
      console.error('❌ 启动失败:', error);
      this.cleanup();
    }
  }

  /**
   * 启动渲染进程开发服务器
   * 使用 Vite 启动渲染进程的开发服务器，提供热重载功能
   * 如果端口已被占用，则跳过启动（可能已有其他实例在运行）
   */
  async startRendererProcess() {
    const rendererPort = this.getRendererPort();

    if (await this.checkPortAvailable(rendererPort)) {
      console.log('📦 启动渲染进程开发服务器...');
      this.viteRendererProcess = this.createProcess('vite', ['src/renderer', '--config', 'src/renderer/vite.config.ts'], {
        prefix: 'Renderer',
        onError: (error) => {
          console.error('❌ Vite 渲染进程错误:', error);
        }
      });
    } else {
      console.log('📦 渲染进程开发服务器端口可用，无需启动');
    }
  }

  // ==================== 清理和退出 ====================

  /**
   * 清理所有进程和资源
   * 优雅地关闭所有服务：
   * 1. 通知 WebSocket 客户端服务器即将关闭
   * 2. 关闭 WebSocket 服务器
   * 3. 清除所有定时器
   * 4. 清理 preload 和 IPC types 相关资源
   * 5. 终止所有子进程
   * 6. 强制退出主进程
   */
  cleanup() {
    console.log('\n🛑 正在停止所有进程...');

    this.sendToWebSocketClients({
      type: 'server_shutting_down',
      message: '开发服务器正在关闭...'
    });

    // 关闭 WebSocket 服务器
    if (this.webSocketServer) {
      console.log('🔌 关闭 WebSocket 服务器...');
      this.webSocketClients.forEach((client) => {
        if (client.readyState === 1) {
          client.close(1000, '服务器关闭');
        }
      });
      this.webSocketClients.clear();
      this.webSocketServer.close(() => {
        console.log('✅ WebSocket 服务器已关闭');
      });
    }

    // 清除所有定时器
    this.clearAllTimeouts();

    // 清理 preload 相关资源
    this.cleanupPreloadScripts();

    // 关闭所有 IPC types watcher
    this.ipcTypesWatchers.forEach(watcher => {
      if (watcher) {
        watcher.close();
      }
    });
    this.ipcTypesWatchers = [];

    // 关闭所有进程
    this.processes.forEach((childProcess, index) => {
      if (childProcess && !childProcess.killed) {
        console.log(`终止进程 ${index + 1}...`);
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', childProcess.pid, '/f', '/t'], { stdio: 'ignore' });
        } else {
          childProcess.kill('SIGTERM');
        }
      }
    });

    // 关闭主进程监听器
    if (this.mainProcessWatcher) {
      this.mainProcessWatcher.close();
    }


    // 强制退出
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }

  /**
   * 清除所有定时器
   */
  clearAllTimeouts() {
    if (this.electronRestartTimeout) {
      clearTimeout(this.electronRestartTimeout);
      this.electronRestartTimeout = null;
    }

    if (this.preloadRebuildTimeout) {
      clearTimeout(this.preloadRebuildTimeout);
      this.preloadRebuildTimeout = null;
    }

    if (this.ipcTypesGenerationTimeout) {
      clearTimeout(this.ipcTypesGenerationTimeout);
      this.ipcTypesGenerationTimeout = null;
    }
  }
}

// ==================== 主程序入口 ====================

/**
 * 获取当前文件的目录
 */
function getDirname() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return __dirname;
}

/**
 * 设置进程信号处理
 */
function setupProcessSignalHandler() {
  // 进程信号处理
  process.on('SIGINT', () => {
    console.log('\n🛑 收到 SIGINT 信号，正在清理...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 收到 SIGTERM 信号，正在清理...');
    process.exit(0);
  });

  process.on('SIGHUP', () => {
    console.log('\n🛑 收到 SIGHUP 信号，正在清理...');
    process.exit(0);
  });

  process.on('uncaughtException', (error) => {
    console.error('❌ 未捕获的异常:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未处理的 Promise 拒绝:', reason);
    process.exit(1);
  });
}


async function main() {
  const devServerManager = new DevServerManager(CONFIG);
  const oldConsoleLog = console.log;
  console.log = (...args) => {
    devServerManager.printWrite(...args);
    oldConsoleLog(...args);
  };
  // 清空dist目录
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true });
  }

  // 清空日志文件
  writeFileSync(devServerManager.config.logPath, '', 'utf-8');

  try {
    // 初始化开发服务器管理器
    await devServerManager.initialize();
    // 启动渲染进程开发服务器
    await devServerManager.startRendererProcess();
    // 启动主进程
    await devServerManager.startMainProcess();
  } catch (error) {
    console.error('❌ 启动失败:', error);
    devServerManager.cleanup();
  }
}

// 启动主程序
if (import.meta.url.includes("dev.js")) {
  setupProcessSignalHandler()
  main();
} 