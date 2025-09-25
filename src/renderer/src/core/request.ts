// 封装axios，提供retry机制
import axios, { AxiosError } from 'axios'
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
  CancelTokenSource
} from 'axios'
import * as rax from 'retry-axios'
import type { RetryConfig } from 'retry-axios'

// 请求配置接口
export interface RequestConfig extends AxiosRequestConfig {
  /** 是否启用重试 */
  retry?: boolean
  /** 重试次数 */
  retryTimes?: number
  /** 重试延迟（毫秒） */
  retryDelay?: number
  /** 是否显示loading */
  showLoading?: boolean
  /** 是否显示错误提示 */
  showError?: boolean
  /** 超时时间（毫秒） */
  timeout?: number
}

// 响应数据接口
export interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
  success: boolean
}

// 错误类型
export interface RequestError extends Error {
  code?: string | number
  config?: AxiosRequestConfig
  request?: any
  response?: AxiosResponse
}

class Request {
  private instance: AxiosInstance
  private defaultConfig: RequestConfig

  constructor(config?: RequestConfig) {
    this.defaultConfig = {
      baseURL: '',
      timeout: 10000,
      retry: true,
      retryTimes: 3,
      retryDelay: 1000,
      showLoading: false,
      showError: true,
      headers: {
        'Content-Type': 'application/json;charset=UTF-8'
      },
      ...config
    }

    this.instance = axios.create(this.defaultConfig)
    this.setupInterceptors()
    this.setupRetry()
  }

  /**
   * 设置重试机制
   */
  private setupRetry() {
    const retryConfig: RetryConfig = {
      retry: this.defaultConfig.retryTimes || 3,
      retryDelay: this.defaultConfig.retryDelay || 1000,
      instance: this.instance,
      // 重试条件：网络错误、超时、5xx错误
      shouldRetry: (err: AxiosError) => {
        const cfg = rax.getConfig(err)
        if (!cfg) return false

        // 网络错误
        if (!err.response) return true

        // 服务器错误 (5xx)
        if (err.response.status >= 500) return true

        // 请求超时
        if (err.code === 'ECONNABORTED') return true

        return false
      },
      onRetryAttempt: (err: AxiosError) => {
        const cfg = rax.getConfig(err)
        console.warn(`请求重试第${cfg?.currentRetryAttempt}次:`, err.config?.url)
      }
    }

    this.instance.defaults.raxConfig = retryConfig
    rax.attach(this.instance)
  }

  /**
   * 设置拦截器
   */
  private setupInterceptors() {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // 可以在这里添加token
        // const token = localStorage.getItem('token')
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`
        // }

        // 显示loading
        const requestConfig = config as any
        if (requestConfig.showLoading) {
          this.showLoading(true)
        }

        console.log('发起请求:', config.url, config)
        return config
      },
      (error: AxiosError) => {
        console.error('请求配置错误:', error)
        return Promise.reject(this.handleError(error))
      }
    )

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        const config = response.config as any

        // 隐藏loading
        if (config.showLoading) {
          this.showLoading(false)
        }

        console.log('响应成功:', response.config.url, response)

        // 根据业务需要处理响应数据
        const { data } = response

        // 如果后端返回的是标准格式 {code, data, message}
        if (data && typeof data === 'object' && 'code' in data) {
          if (data.code === 200 || data.code === 0) {
            return data
          } else {
            // 业务错误
            const error = new Error(data.message || '请求失败') as RequestError
            error.code = data.code
            error.response = response

            if (config.showError) {
              this.showError(error.message)
            }

            return Promise.reject(error)
          }
        }

        // 直接返回原始数据
        return data
      },
      (error: AxiosError) => {
        const config = error.config as any

        // 隐藏loading
        if (config?.showLoading) {
          this.showLoading(false)
        }

        console.error('响应错误:', error)

        const handledError = this.handleError(error)

        if (config?.showError) {
          this.showError(handledError.message)
        }

        return Promise.reject(handledError)
      }
    )
  }

  /**
   * 错误处理
   */
  private handleError(error: AxiosError): RequestError {
    const requestError = new Error() as RequestError
    requestError.config = error.config
    requestError.request = error.request
    requestError.response = error.response

    if (error.response) {
      // 服务器响应错误
      const { status, data } = error.response
      requestError.code = status

      switch (status) {
        case 400:
          requestError.message = (data as any)?.message || '请求参数错误'
          break
        case 401:
          requestError.message = '未授权，请重新登录'
          // 可以在这里处理登录跳转
          break
        case 403:
          requestError.message = '拒绝访问'
          break
        case 404:
          requestError.message = '请求资源不存在'
          break
        case 408:
          requestError.message = '请求超时'
          break
        case 500:
          requestError.message = '服务器内部错误'
          break
        case 501:
          requestError.message = '服务未实现'
          break
        case 502:
          requestError.message = '网关错误'
          break
        case 503:
          requestError.message = '服务不可用'
          break
        case 504:
          requestError.message = '网关超时'
          break
        case 505:
          requestError.message = 'HTTP版本不受支持'
          break
        default:
          requestError.message = (data as any)?.message || `请求失败 (${status})`
      }
    } else if (error.request) {
      // 网络错误
      requestError.code = 'NETWORK_ERROR'
      if (error.code === 'ECONNABORTED') {
        requestError.message = '请求超时，请检查网络连接'
      } else {
        requestError.message = '网络连接失败，请检查网络设置'
      }
    } else {
      // 其他错误
      requestError.code = 'UNKNOWN_ERROR'
      requestError.message = error.message || '未知错误'
    }

    return requestError
  }

  /**
   * 显示loading（可以根据项目需要自定义）
   */
  private showLoading(show: boolean) {
    // 这里可以集成你的loading组件
    // 例如：ElLoading.service() 或其他loading方案
    console.log(show ? '显示loading...' : '隐藏loading...')
  }

  /**
   * 显示错误提示（可以根据项目需要自定义）
   */
  private showError(message: string) {
    // 这里可以集成你的提示组件
    // 例如：ElMessage.error() 或其他提示方案
    console.error('错误提示:', message)
  }

  /**
   * GET请求
   */
  get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return this.instance.get(url, config)
  }

  /**
   * POST请求
   */
  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.instance.post(url, data, config)
  }

  /**
   * PUT请求
   */
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.instance.put(url, data, config)
  }

  /**
   * DELETE请求
   */
  delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return this.instance.delete(url, config)
  }

  /**
   * PATCH请求
   */
  patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.instance.patch(url, data, config)
  }

  /**
   * 通用请求方法
   */
  request<T = any>(config: RequestConfig): Promise<T> {
    return this.instance.request(config)
  }

  /**
   * 取消请求
   */
  cancelRequest(source: CancelTokenSource) {
    source.cancel('请求被取消')
  }

  /**
   * 创建取消令牌
   */
  createCancelToken(): CancelTokenSource {
    return axios.CancelToken.source()
  }
}

// 创建默认实例
export const request = new Request()

// 导出Request类，允许创建多个实例
export { Request }

// 导出常用方法
export const { get, post, put, delete: del, patch } = request