import { ref, computed } from 'vue'
import { DEFAULT_WINDOW_LAYOUT } from '@shared/config/windowLayoutConfig'

/**
 * UI 常量配置管理 Composable
 */
export function useUIConstants() {
  // UI 配置管理
  const uiConstants = ref({
    headerHeight: DEFAULT_WINDOW_LAYOUT.searchHeaderHeight,
    padding: DEFAULT_WINDOW_LAYOUT.appPadding,
  })

  /**
   * 从主进程获取UI常量配置
   */
  const loadUIConstants = async () => {
    try {
      const config = await naimo.router.windowGetUIConstants()
      if (config) {
        uiConstants.value = config
        console.log('✅ UI常量配置加载成功:', config)
        return config
      }
      console.warn('⚠️ 未获取到UI常量配置，使用默认值')
      return uiConstants.value
    } catch (error) {
      console.warn('❌ 获取UI常量配置失败，使用默认值:', error)
      return uiConstants.value
    }
  }

  // 计算属性
  const headerHeight = computed(() => uiConstants.value.headerHeight)
  const padding = computed(() => uiConstants.value.padding)

  return {
    uiConstants,
    loadUIConstants,
    headerHeight,
    padding,
  }
}

