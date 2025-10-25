/**
 * 服务模块统一导出
 * 
 * 这些服务通过 ServiceContainer 和 AppBootstrap 进行管理
 * 每个服务都实现了 Service 接口，支持依赖注入
 */

// 服务实现
export { ErrorService } from './ErrorService'
export { UpdateService } from './UpdateService'
export { WindowService } from './WindowService'
export { TrayService } from './TrayService'
export { DebugService } from './DebugService'
export { AutoLaunchService } from './AutoLaunchService'
export { LoadingService } from './LoadingService'

// 服务配置类型
export type { ErrorServiceConfig } from './ErrorService'
export type { UpdateServiceConfig } from './UpdateService'
export type { WindowServiceConfig } from './WindowService'
export type { TrayServiceConfig } from './TrayService'
export type { DebugServiceConfig } from './DebugService'
export type { LoadingServiceConfig } from './LoadingService'

// 核心接口（从 core 模块重新导出，方便使用）
export type { Service } from '../core/ServiceContainer'
