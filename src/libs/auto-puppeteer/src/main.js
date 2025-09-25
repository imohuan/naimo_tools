const { app, BrowserWindow, ipcMain, session, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const puppeteer = require('puppeteer-core');
const pie = require('puppeteer-in-electron');
pie.initialize(app);

// 下载管理器
const downloadManager = {
  downloads: new Map(),
  nextId: 1,

  startDownload(url, filePath, metadata) {
    const downloadId = this.nextId++;

    const downloadItem = {
      id: downloadId,
      url,
      filePath,
      metadata,
      progress: 0,
      status: 'pending',
      bytesReceived: 0,
      totalBytes: 0,
      paused: false,
      request: null,
      response: null,
      fileStream: null
    };

    this.downloads.set(downloadId, downloadItem);

    this.performDownload(downloadItem);
    return downloadId;
  },

  performDownload(item, isResume = false) {
    const protocol = item.url.startsWith('https') ? https : http;

    try {
      // 如果是续传，检查已下载的文件大小
      if (isResume && fs.existsSync(item.filePath)) {
        const stat = fs.statSync(item.filePath);
        item.bytesReceived = stat.size;
      }

      // 构建请求选项
      const options = {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      };

      // 如果是续传，添加Range头
      if (isResume && item.bytesReceived > 0) {
        options.headers['Range'] = `bytes=${item.bytesReceived}-`;
      }

      const request = protocol.request(item.url, options, (response) => {
        try {
          // 处理重定向
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            console.log(`重定向到: ${response.headers.location}`);
            item.url = response.headers.location;
            this.performDownload(item, isResume);
            return;
          }

          // 处理Range请求响应
          if (response.statusCode === 206) {
            // 部分内容响应，续传成功
            const contentRange = response.headers['content-range'];
            if (contentRange) {
              const match = contentRange.match(/bytes (\d+)-(\d+)\/(\d+)/);
              if (match) {
                item.totalBytes = parseInt(match[3], 10);
              }
            }
          } else if (response.statusCode === 200) {
            // 完整内容响应
            item.totalBytes = parseInt(response.headers['content-length'] || '0', 10);
            if (isResume) {
              // 服务器不支持Range，重新开始下载
              item.bytesReceived = 0;
              if (fs.existsSync(item.filePath)) {
                fs.unlinkSync(item.filePath);
              }
            }
          } else {
            // 错误响应
            console.error(`HTTP错误: ${response.statusCode} ${response.statusMessage}`);
            item.status = 'error';
            this.sendToRenderer('download-error', {
              id: item.id,
              error: `HTTP ${response.statusCode}: ${response.statusMessage}`
            });
            return;
          }

          item.status = 'downloading';
          item.response = response;

          // 创建文件写入流（续传时使用追加模式）
          const writeOptions = isResume && item.bytesReceived > 0 ? { flags: 'a' } : {};
          let file;
          try {
            file = fs.createWriteStream(item.filePath, writeOptions);
            item.fileStream = file;
          } catch (fileError) {
            console.error('创建文件流失败:', fileError);
            item.status = 'error';
            this.sendToRenderer('download-error', {
              id: item.id,
              error: '创建文件流失败: ' + fileError.message
            });
            return;
          }

          console.log(`下载${isResume ? '续传' : '开始'}: ${item.filePath}, 已下载: ${item.bytesReceived} bytes`);

          response.on('data', (chunk) => {
            try {
              if (item.paused) {
                response.pause();
                return;
              }

              item.bytesReceived += chunk.length;
              item.progress = item.totalBytes ? Math.floor((item.bytesReceived / item.totalBytes) * 100) : 0;

              this.sendToRenderer('download-progress', {
                id: item.id,
                progress: item.progress,
                status: item.status,
                bytesReceived: item.bytesReceived,
                totalBytes: item.totalBytes
              });
            } catch (dataError) {
              console.error('处理数据块时出错:', dataError);
            }
          });

          response.on('end', () => {
            try {
              if (item.status !== 'cancelled' && !item.paused) {
                item.status = 'completed';
                this.sendToRenderer('download-completed', {
                  id: item.id,
                  filePath: item.filePath,
                  metadata: item.metadata
                });
              }
              if (item.fileStream) {
                item.fileStream.end();
              }
            } catch (endError) {
              console.error('结束下载时出错:', endError);
            }
          });

          response.on('error', (err) => {
            console.error('响应流错误:', err);
            // 只有在状态不是暂停或取消时才设置为错误
            if (item.status !== 'paused' && item.status !== 'cancelled') {
              item.status = 'error';
              this.sendToRenderer('download-error', {
                id: item.id,
                error: err.message
              });
            }
            if (item.fileStream) {
              item.fileStream.end();
            }
          });

          response.on('aborted', () => {
            console.log('响应被中止');
            // 不要在这里改变状态，因为暂停时也会触发这个事件
            // 状态已经在 pauseDownload 方法中正确设置了
          });

          // 将响应数据写入文件
          response.pipe(file);

          file.on('finish', () => {
            console.log('文件写入完成:', item.filePath);
          });

          file.on('error', (err) => {
            console.error('文件写入错误:', err);
            item.status = 'error';
            this.sendToRenderer('download-error', {
              id: item.id,
              error: err.message
            });
          });
        } catch (responseError) {
          console.error('处理响应时出错:', responseError);
          item.status = 'error';
          this.sendToRenderer('download-error', {
            id: item.id,
            error: '处理响应时出错: ' + responseError.message
          });
        }
      });

      request.on('error', (err) => {
        console.error('请求错误:', err);
        // 只有在状态不是暂停或取消时才设置为错误
        if (item.status !== 'paused' && item.status !== 'cancelled') {
          item.status = 'error';
          this.sendToRenderer('download-error', {
            id: item.id,
            error: err.message
          });
        }
      });

      request.on('timeout', () => {
        console.log('请求超时');
        item.status = 'error';
        this.sendToRenderer('download-error', {
          id: item.id,
          error: '请求超时'
        });
      });

      // 设置超时
      request.setTimeout(30000); // 30秒超时

      // 保存请求对象以便取消
      item.request = request;
      request.end();
    } catch (error) {
      console.error('执行下载时出错:', error);
      item.status = 'error';
      this.sendToRenderer('download-error', {
        id: item.id,
        error: '执行下载时出错: ' + error.message
      });
    }
  },

  // 安全地发送消息到渲染进程
  sendToRenderer(channel, data) {
    try {
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0 && windows[0]?.webContents) {
        windows[0].webContents.send(channel, data);
      }
    } catch (error) {
      console.error('发送消息到渲染进程失败:', error);
    }
  },

  pauseDownload(downloadId) {
    const item = this.downloads.get(downloadId);
    if (item && item.status === 'downloading') {
      item.paused = true;
      item.status = 'paused';

      // 暂停响应流
      if (item.response) {
        item.response.pause();
      }

      // 关闭请求和文件流
      if (item.request) {
        item.request.destroy();
      }
      if (item.fileStream) {
        item.fileStream.end();
      }

      this.sendToRenderer('download-paused', {
        id: downloadId
      });

      console.log(`下载已暂停: ${item.filePath}, 已下载: ${item.bytesReceived} bytes`);
      return true;
    }
    return false;
  },

  resumeDownload(downloadId) {
    const item = this.downloads.get(downloadId);
    if (item && item.status === 'paused') {
      item.paused = false;

      console.log(`恢复下载: ${item.filePath}, 从 ${item.bytesReceived} bytes 继续`);

      // 重新开始下载（续传模式）
      this.performDownload(item, true);

      this.sendToRenderer('download-resumed', {
        id: downloadId
      });

      return true;
    }
    return false;
  },

  cancelDownload(downloadId) {
    const item = this.downloads.get(downloadId);
    if (item && (item.status === 'downloading' || item.status === 'paused')) {
      item.status = 'cancelled';

      // 关闭所有流和请求
      if (item.request) {
        item.request.destroy();
      }
      if (item.response) {
        item.response.destroy();
      }
      if (item.fileStream) {
        item.fileStream.end();
      }

      this.sendToRenderer('download-cancelled', {
        id: downloadId
      });

      console.log(`下载已取消: ${item.filePath}`);
      return true;
    }
    return false;
  },

  getDownloadStatus(downloadId) {
    return this.downloads.get(downloadId);
  },

  getAllDownloads() {
    return Array.from(this.downloads.values());
  }
};

// 创建主窗口
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.fullScreen = true

  // 开发环境下打开开发者工具
  mainWindow.webContents.openDevTools();
  if (process.env.NODE_ENV === 'development') {
  }
}

// 应用准备就绪后创建窗口
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // 在macOS上，当单击dock图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});


/**
 * 使用 JSON 配置驱动浏览器自动化
 * @param {object[]} config - 自动化步骤的 JSON 数组，每个对象包含 'action' 和 'args'
 * 
 * 
 * {
    url: 'https://www.baidu.com',
    requestInterception: {
      enabled: true, // 开启请求拦截
      regex: [
        /\.(jpg|png|gif)$/i, // 仅拦截图片
        /\.(css)$/i // 拦截 CSS
      ]
    },
    steps: [
      { action: 'type', args: ['#kw', 'Puppeteer Electron 自动化'] },
      // { action: 'click', args: ['#su'] },
      { action: 'keyboard.press', args: ['Enter'] },
      { action: 'waitForNavigation', args: [] },
    ]
  };
 */
async function runAutomationTask(config) {
  // 连接到 Electron 浏览器实例
  const browser = await pie.connect(app, puppeteer);

  // 创建一个隐藏的窗口来执行自动化任务
  const win = new BrowserWindow({
    show: config.show || false,
    webPreferences: {
      nodeIntegration: false
    }
  });

  const ses = win.webContents.session;

  // 根据配置决定是否开启请求拦截
  if (config.requestInterception && config.requestInterception.enabled) {
    let regexList;
    if (config.requestInterception.regex && config.requestInterception.regex.length > 0) {
      // 从配置中获取正则表达式对象列表
      regexList = config.requestInterception.regex;
    } else {
      // 默认正则，匹配一些常见的资源
      regexList = [/\.(png|jpg|jpeg|gif|svg|webp)$/i, /\.(css|woff2?|ttf|eot)$/i];
    }

    // 使用 webRequest.onBeforeRequest 拦截所有网络请求
    ses.webRequest.onBeforeRequest({
      urls: ['*://*/*']
    }, (details, callback) => {
      const shouldCancel = regexList.some(regex => regex.test(details.url));

      if (shouldCancel) {
        callback({
          cancel: true
        });
      } else {
        callback({});
      }
    });
  }

  const url = config.url || 'about:blank';
  let page;
  let timeoutId; // 用于清除 setTimeout 的 ID

  try {
    // 设置超时时间，默认为 60 秒
    const timeout = config.timeout || 5000;

    // 创建一个超时 Promise，超时后将 reject
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`AUTOMATION_TIMEOUT Automation task timed out after ${timeout / 1000} seconds.`));
      }, timeout);
    });

    // 将任务逻辑封装在一个 Promise 中
    const taskPromise = (async () => {
      // 使用 Promise 封装 loadURL 和 did-finish-load 事件
      await new Promise((resolve, reject) => {
        win.webContents.once('did-finish-load', () => {
          console.log(`页面 ${url} 加载完成。`);
          resolve();
        });
        win.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
          // 如果加载失败，拒绝 Promise
          reject(new Error(`页面加载失败: ${errorDescription} (错误码: ${errorCode})`));
        });
        win.loadURL(url);
      });

      // await win.loadURL(url);
      page = await pie.getPage(browser, win);
      console.log(`Puppeteer 已连接到新窗口，开始执行自动化任务...`);

      const customFunctions = {
        'waitForTimeout': async (t) => new Promise(resolve => setTimeout(resolve, t))
      };

      for (const step of config.steps) {
        const { action, args } = step;
        if (typeof customFunctions[action] === 'function') {
          console.log(`正在执行自定义动作: ${action} with args:`, args);
          await customFunctions[action](...args);
        } else {
          const parts = action.split('.');
          let context = page;
          let func = page;

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (func && typeof func[part] !== 'undefined') {
              context = func;
              func = func[part];
            } else {
              func = null;
              break;
            }
          }

          if (typeof func === 'function') {
            console.log(`正在执行Puppeteer动作: ${action} with args:`, args);
            if (['type', 'click'].includes(parts[parts.length - 1])) {
              const selector = args[0];
              await page.waitForSelector(selector);
            }
            await func.apply(context, args);
          } else {
            console.warn(`未知的动作: ${action}`);
          }
        }
      }
      const html = await page.content();
      console.log('自动化任务完成，正在返回页面源码。');
      return html;
    })();

    // 使用 Promise.race 让任务 Promise 和超时 Promise 竞争
    return await Promise.race([taskPromise, timeoutPromise]);
  } catch (error) {
    if (error.message.includes('AUTOMATION_TIMEOUT')) {
      console.error('自动化任务超时。正在获取当前页面 HTML...');
      // 检查 page 对象是否已经创建
      if (page) {
        try {
          const html = await page.content();
          return html;
        } catch (htmlError) {
          // 获取 HTML 时再次出错
          console.error('获取超时页面的 HTML 失败:', htmlError.message);
          throw error; // 仍然抛出原始的超时错误
        }
      } else {
        const html = await win.webContents.executeJavaScript('document.documentElement.outerHTML');
        if (html) return html
        // 如果 page 对象都还没创建，说明在 loadURL 之前就超时了
        console.warn('任务在 Puppeteer 连接前超时，无法获取 HTML。');
        throw error;
      }
    } else {
      // 处理其他类型的错误
      console.error('自动化执行过程中出错:', error.message);
      throw error;
    }
  } finally {
    // 清除计时器，防止在任务成功后依然触发
    if (timeoutId) clearTimeout(timeoutId);
    // 任务完成后销毁窗口
    if (win && !win.isDestroyed()) {
      win.destroy();
    }
  }
}

// 步骤 3: 绑定 ipcMain.handle
// 这是一个监听器，只有当渲染进程调用 ipcRenderer.invoke 时才会执行
ipcMain.handle('automate-with-json', async (event, config) => {
  // 这里调用我们定义的自动化执行函数
  return runAutomationTask(config);
});

ipcMain.handle('start-download', async (event, { url, filePath, metadata }) => {
  return downloadManager.startDownload(url, filePath, metadata);
});

ipcMain.handle('pause-download', (event, downloadId) => {
  return downloadManager.pauseDownload(downloadId);
});

ipcMain.handle('resume-download', (event, downloadId) => {
  return downloadManager.resumeDownload(downloadId);
});

ipcMain.handle('cancel-download', (event, downloadId) => {
  return downloadManager.cancelDownload(downloadId);
});

ipcMain.handle('get-download-status', (event, downloadId) => {
  return downloadManager.getDownloadStatus(downloadId);
});

ipcMain.handle('get-all-downloads', () => {
  return downloadManager.getAllDownloads();
});

ipcMain.handle('select-download-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (result.canceled) return null;
  return result.filePaths[0];
});

// 打开文件夹
ipcMain.handle('open-download-folder', async (event, filePath) => {
  try {
    // 获取文件所在目录
    const dir = require('path').dirname(filePath);
    await shell.openPath(dir);
    return true;
  } catch (error) {
    console.error('打开文件夹失败:', error);
    return false;
  }
});

// 缓存管理API
ipcMain.handle('get-cache-data', async (event, key) => {
  try {
    const cacheDir = path.join(app.getPath('userData'), 'cache');
    const cachePath = path.join(cacheDir, `${key}.json`);
    if (fs.existsSync(cachePath)) {
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      // 检查是否过期
      if (data.expiry > Date.now()) {
        return data;
      } else {
        // 删除过期缓存
        fs.unlinkSync(cachePath);
      }
    }
    return null;
  } catch (error) {
    console.error('获取缓存失败:', error);
    return null;
  }
});

ipcMain.handle('set-cache-data', async (event, key, data) => {
  try {
    const cacheDir = path.join(app.getPath('userData'), 'cache');

    // 确保缓存目录存在
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    data.expiry = Date.now() + data.cacheDays * 24 * 60 * 60 * 1000;
    const cachePath = path.join(cacheDir, `${key}.json`);
    fs.writeFileSync(cachePath, JSON.stringify(data), 'utf8');
    return true;
  } catch (error) {
    console.error('设置缓存失败:', error);
    return false;
  }
});

ipcMain.handle('clear-cache', async (event, key) => {
  try {
    const cacheDir = path.join(app.getPath('userData'), 'cache');

    if (key) {
      // 清除特定缓存
      const cachePath = path.join(cacheDir, `${key}.json`);
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
      }
    } else {
      // 清除所有缓存
      if (fs.existsSync(cacheDir)) {
        const files = fs.readdirSync(cacheDir);
        files.forEach(file => {
          fs.unlinkSync(path.join(cacheDir, file));
        });
      }
    }
    return true;
  } catch (error) {
    console.error('清除缓存失败:', error);
    return false;
  }
});




