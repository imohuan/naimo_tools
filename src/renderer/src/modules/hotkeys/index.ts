// 导出所有类型
export * from '@/typings/hotkey-types'

// 导出所有配置
export * from './config/callbacks'

// 导出所有管理器
export { getElectronHotkeys } from './electron-hotkeys'
export { getHotkeyCache, useHotkeyCache } from './hooks/useHotkeyCache'
export { getHotkeyManager, useHotkeyManager } from './hooks/useHotkeyManager'
export { getHotkeyInitializer, useGlobalHotkeyInitializer } from './hooks/useHotkeyInitializer'

// 导出键盘导航
export { useKeyboardNavigation } from './hooks/useKeyboardNavigation'

// 导出便捷的初始化函数
export const initializeHotkeys = async () => {
  const { getHotkeyInitializer } = await import('./hooks/useHotkeyInitializer')
  const initializer = getHotkeyInitializer()
  await initializer.initializeGlobalHotkeys()
  return initializer
}

// 导出便捷的获取管理器函数
export const getHotkeyManagers = async () => {
  const { getElectronHotkeys } = await import('./electron-hotkeys')
  const { getHotkeyCache } = await import('./hooks/useHotkeyCache')
  const { getHotkeyManager } = await import('./hooks/useHotkeyManager')
  const { getHotkeyInitializer } = await import('./hooks/useHotkeyInitializer')

  return {
    electron: getElectronHotkeys(),
    cache: getHotkeyCache(),
    manager: getHotkeyManager(),
    initializer: getHotkeyInitializer(),
  }
}
