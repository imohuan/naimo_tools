import { ipcRenderer } from "electron";
import debounce from "lodash-es/debounce";
import { serializeError } from "serialize-error";
import { ERROR_HANDLER_CHANNEL } from "./config";
import { ensureError } from "./common";

export class RendererErrorHandler {
  private static instance: RendererErrorHandler;
  private isInstalled = false;

  static getInstance(): RendererErrorHandler {
    if (!RendererErrorHandler.instance) {
      RendererErrorHandler.instance = new RendererErrorHandler();
    }
    return RendererErrorHandler.instance;
  }

  /**
   * 调用主进程的错误处理器
   * @param title 错误标题，默认为 'App encountered an error'
   * @param error 错误对象
   */
  async invokeErrorHandler(title = "App encountered an error", error: any) {
    try {
      // 尝试直接调用主进程的错误处理器
      await ipcRenderer.invoke(ERROR_HANDLER_CHANNEL, title, error);
    } catch (invokeError: any) {
      // 如果对象无法克隆（序列化失败）
      if (invokeError.message === "An object could not be cloned.") {
        // 1. 强制将传入的参数转换为错误格式
        error = ensureError(error);
        // 2. 尝试序列化每个属性，如果失败则默认为 undefined
        const serialized = serializeError(error);
        // 3. 使用序列化后的错误属性再次调用错误处理器
        ipcRenderer.invoke(ERROR_HANDLER_CHANNEL, title, serialized);
      }
    }
  }

  /**
   * 初始化未处理错误捕获
   * 安装全局错误和Promise拒绝监听器
   */
  install() {
    // 防止重复安装
    if (this.isInstalled) {
      console.log("⚠️ 错误处理器已经安装，跳过重复安装");
      return;
    }
    this.isInstalled = true;

    console.log("🔧 正在安装渲染进程错误处理器...");

    // 使用防抖处理，因为某些包（如React）由于错误边界特性会抛出大量相同的未捕获错误
    const errorHandler = debounce((error: any) => {
      console.error("🚨 捕获到未处理的错误:", error);
      this.invokeErrorHandler("Unhandled Error", error);
    }, 200);

    // 监听全局错误事件
    window.addEventListener("error", (event) => {
      console.log("🎯 捕获到error事件:", event);
      event.preventDefault(); // 阻止默认错误处理
      errorHandler(event.error || event);
    });

    // 使用防抖处理Promise拒绝
    const rejectionHandler = debounce((reason: any) => {
      console.error("🚨 捕获到未处理的Promise拒绝:", reason);
      this.invokeErrorHandler("Unhandled Promise Rejection", reason);
    }, 200);

    // 监听未处理的Promise拒绝事件
    window.addEventListener("unhandledrejection", (event) => {
      console.log("🎯 捕获到unhandledrejection事件:", event);
      event.preventDefault(); // 阻止默认拒绝处理
      rejectionHandler(event.reason);
    });

    console.log("✅ 渲染进程错误处理器已安装，现在会捕获所有未处理的错误");
  }

  /**
   * 手动记录错误
   * @param error 错误对象
   * @param options 选项，包含可选的错误标题
   */
  logError(error: any, options: { title?: string } = {}) {
    this.invokeErrorHandler(options.title, error);
  }
}
