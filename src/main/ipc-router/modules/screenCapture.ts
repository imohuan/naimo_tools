import { desktopCapturer, BrowserWindow, ipcMain, screen, clipboard, nativeImage } from "electron";
import { dirname, resolve as pathResolve } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { isDevelopment } from "@shared/utils";
import { getRendererUrl } from "@main/window/windowConfig";
import { NewWindowManager } from "@main/window/NewWindowManager";


function getCurrentDirname(metaUrl: string): string {
  return dirname(fileURLToPath(metaUrl));
}


/**
 * 获取屏幕源列表
 * @param event IPC事件对象
 * @param options 获取屏幕源的选项
 * @returns 屏幕源列表
 */
export async function getSources(event: Electron.IpcMainInvokeEvent, options: {
  types: ("screen" | "window")[];
  thumbnailSize?: { width: number; height: number };
}): Promise<Electron.DesktopCapturerSource[]> {
  try {
    const sources = await desktopCapturer.getSources(options);
    return sources;
  } catch (error) {
    console.error("获取屏幕源失败:", error);
    throw new Error(`获取屏幕源失败: ${(error as Error).message}`);
  }
}

/**
 * 截图并裁剪，返回临时文件地址或复制到剪切板
 * @param options 截图选项
 * @returns 操作结果
 */
export async function captureAndGetFilePath(event: Electron.IpcMainInvokeEvent, options: { sourceId?: string; } = {}): Promise<{ success: boolean; filePath?: string; error?: string }> {
  // 新窗口管理器中，我们需要不同的方式获取主窗口
  // 由于 BaseWindow 和 BrowserWindow API 有差异，这里暂时注释掉旧逻辑
  // TODO: 实现新的主窗口隐藏逻辑

  try {
    // 旧的窗口隐藏逻辑被移除，因为新架构中使用不同的窗口管理方式
    // 截图功能现在直接进行，不依赖于特定的窗口隐藏逻辑

    // 获取屏幕源
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 0, height: 0 }
    });

    if (sources.length === 0) {
      throw new Error('无法获取屏幕源');
    }

    const selectedSource = options.sourceId
      ? sources.find(s => s.id === options.sourceId) || sources[0]
      : sources[0];

    // 获取屏幕尺寸
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // 先进行截图
    const screenshotData = await captureScreen(selectedSource.id);

    // 显示裁剪窗口，传入截图数据
    const filePath = await showCropWindow({
      sourceId: selectedSource.id,
      sourceName: selectedSource.name,
      screenWidth: width,
      screenHeight: height,
      screenshotData: screenshotData,
    });

    return { success: true, filePath };

  } catch (error) {
    console.error("截图失败:", error);
    return { success: false, error: (error as Error).message };
  } finally {
    // 恢复主窗口的显示状态
    if (mainWindow) {
      mainWindow.webContents.send("window-main-show");
    }
  }
}

/**
 * 进行屏幕截图
 * @param sourceId 屏幕源ID
 * @returns base64格式的截图数据
 */
async function captureScreen(sourceId: string): Promise<string> {
  try {
    // 获取屏幕显示信息以确定正确的分辨率
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;

    // 使用 desktopCapturer 获取高分辨率截图
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.min(width * 2, 4096),  // 限制最大宽度
        height: Math.min(height * 2, 4096) // 限制最大高度
      }
    });

    const source = sources.find(s => s.id === sourceId) || sources[0];
    if (!source) {
      throw new Error('无法找到指定的屏幕源');
    }

    // 获取缩略图数据
    const thumbnail = source.thumbnail;
    const dataURL = thumbnail.toDataURL();

    console.log('截图成功，大小:', thumbnail.getSize());
    return dataURL;
  } catch (error) {
    console.error('截图失败:', error);
    throw new Error(`截图失败: ${(error as Error).message}`);
  }
}

/**
 * 显示裁剪窗口并等待用户完成操作
 * @param screenInfo 屏幕信息
 * @returns 临时文件地址（如果保存到文件）或空字符串（如果复制到剪切板）
 */
async function showCropWindow(screenInfo: {
  sourceId: string;
  sourceName: string;
  screenWidth: number;
  screenHeight: number;
  screenshotData: string;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const htmlPath = isDevelopment() ?
      getRendererUrl() + '/src/pages/crop-window/' :
      pathResolve(getCurrentDirname(import.meta.url), '../renderer/crop-window.html');

    // 创建全屏无边框透明窗口
    const cropWindow = new BrowserWindow({
      width: width,
      height: height,
      x: 0,
      y: 0,
      frame: false,
      // transparent: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });
    // cropWindow.webContents.openDevTools({ mode: "bottom" });

    // 加载裁剪窗口HTML
    if (htmlPath.startsWith("http")) {
      cropWindow.loadURL(htmlPath)
    } else {
      cropWindow.loadFile(htmlPath);
    }

    // 发送屏幕信息和截图数据到窗口
    cropWindow.webContents.once('did-finish-load', () => {
      cropWindow.webContents.send('screen-info', {
        sourceId: screenInfo.sourceId,
        sourceName: screenInfo.sourceName,
        screenWidth: screenInfo.screenWidth,
        screenHeight: screenInfo.screenHeight,
        screenshotData: screenInfo.screenshotData
      });
    });

    // 设置窗口为全屏
    cropWindow.setFullScreen(true);

    // 统一的复制到剪切板处理器
    const copyToClipboardHandler = async (event: any, imageData: string) => {
      try {
        // 将base64数据转换为buffer
        const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // 创建nativeImage对象并复制到剪切板
        const image = nativeImage.createFromBuffer(buffer);
        clipboard.writeImage(image);

        // 关闭窗口
        cropWindow.close();
        resolve(''); // 复制到剪切板不需要返回文件路径
      } catch (error) {
        console.error('复制到剪切板失败:', error);
        cropWindow.close();
        reject(error);
      }
    };

    const closeHandler = () => {
      cropWindow.close();
      reject(new Error('用户取消了截图操作'));
    };

    // 保存到文件处理器（仅在非剪切板模式下使用）
    const saveToTempHandler = async (event: any, imageData: string) => {
      try {
        // 创建临时目录
        const tempDir = pathResolve(tmpdir(), 'naimo-screenshots');
        if (!existsSync(tempDir)) {
          mkdirSync(tempDir, { recursive: true });
        }

        // 生成临时文件名
        const timestamp = Date.now();
        const fileName = `screenshot-${timestamp}.png`;
        const filePath = pathResolve(tempDir, fileName);

        // 将base64数据转换为buffer并保存
        const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // 创建nativeImage对象并复制到剪切板
        const image = nativeImage.createFromBuffer(buffer);
        clipboard.writeImage(image);

        // 保存到文件
        writeFileSync(filePath, buffer);

        // 关闭窗口并返回文件路径
        cropWindow.close();
        resolve(filePath);
      } catch (error) {
        cropWindow.close();
        reject(error);
      }
    };

    // 注册IPC处理器
    ipcMain.handle('save-cropped-image', saveToTempHandler);
    ipcMain.handle('copy-to-clipboard', copyToClipboardHandler);
    ipcMain.handle('close-crop-window', closeHandler);

    // 窗口关闭时清理
    cropWindow.on('closed', () => {
      ipcMain.removeHandler('save-cropped-image');
      ipcMain.removeHandler('copy-to-clipboard');
      ipcMain.removeHandler('close-crop-window');
    });

    cropWindow.on("blur", () => {
      cropWindow.close();
      reject(new Error('用户取消了截图操作'));
    })
  });
}
