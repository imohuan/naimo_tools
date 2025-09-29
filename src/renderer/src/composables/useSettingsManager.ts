/**
 * 设置页面管理组合式函数
 * 负责设置页面的创建、关闭、状态管理等功能
 */

import { nextTick } from 'vue'

/**
 * 设置页面管理器
 */
export function useSettingsManager() {

  /**
   * 打开设置页面
   */
  const openSettings = async (dependencies: {
    switchToSettings: () => void
    handleResize: () => void
  }) => {
    try {
      // 切换到设置界面状态
      dependencies.switchToSettings()

      // 确保窗口高度调整到最大高度
      dependencies.handleResize()
      await nextTick()

      // 调用 IPC 方法创建设置页面 WebContentsView
      const result = await naimo.router.windowCreateSettingsView()
      if (result.success) {
        console.log('✅ 设置页面 WebContentsView 创建成功:', result.viewId)
      } else {
        console.error('❌ 设置页面 WebContentsView 创建失败:', result.error)
      }
    } catch (error) {
      console.error('❌ 打开设置页面失败:', error)
    }
  }

  /**
   * 关闭设置页面
   */
  const closeSettings = async (dependencies: {
    switchToSearch: () => void
    handleSearchFocus: () => void
  }) => {
    try {
      // 调用 IPC 方法关闭设置页面 WebContentsView
      const result = await naimo.router.windowCloseSettingsView()
      if (result.success) {
        console.log('✅ 设置页面 WebContentsView 关闭成功')
      } else {
        console.error('❌ 设置页面 WebContentsView 关闭失败:', result.error)
      }
    } catch (error) {
      console.error('❌ 关闭设置页面失败:', error)
    }

    // 切换回搜索界面状态
    dependencies.switchToSearch()

    // 聚焦到搜索输入框
    dependencies.handleSearchFocus()
  }

  return {
    openSettings,
    closeSettings
  }
}
