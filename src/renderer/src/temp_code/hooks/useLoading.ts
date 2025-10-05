import { ref } from "vue";

/**
 * 加载状态管理 Hook
 */
export function useLoading() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * 核心包装逻辑 - 处理 Promise
   * @param promise Promise 实例
   * @param errorMessage 错误提示信息
   * @param shouldThrow 是否抛出错误
   */
  const wrapPromise = async <T>(
    promise: Promise<T>,
    errorMessage?: string,
    shouldThrow = true
  ): Promise<T | undefined> => {
    loading.value = true;
    error.value = null;
    try {
      return await promise;
    } catch (err: any) {
      const message = errorMessage
        ? errorMessage + ": " + err?.message
        : err?.message
          ? err?.message
          : "操作失败";

      error.value = message;
      console.error(message, err);
      if (shouldThrow) throw err;
      return undefined;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 包装异步函数，自动管理加载状态
   * @param fn 异步函数
   * @param errorMessage 错误提示信息
   */
  const withLoading = <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    errorMessage?: string
  ): T => {
    return ((...args: any[]) =>
      wrapPromise(fn(...args), errorMessage, true)) as T;
  };

  /**
   * 包装异步函数，自动管理加载状态（安全版本 - 不会抛出错误）
   * @param fn 异步函数
   * @param errorMessage 错误提示信息
   */
  const withLoadingSafe = <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    errorMessage?: string
  ): T => {
    return ((...args: any[]) =>
      wrapPromise(fn(...args), errorMessage, false)) as T;
  };

  /**
   * 清除错误信息
   */
  const clearError = () => {
    error.value = null;
  };

  /**
   * 设置加载状态
   */
  const setLoading = (value: boolean) => {
    loading.value = value;
  };

  /**
   * 设置错误信息
   */
  const setError = (message: string) => {
    error.value = message;
  };

  return {
    loading,
    error,
    withLoading,
    withLoadingSafe,
    clearError,
    setLoading,
    setError,
  };
}
