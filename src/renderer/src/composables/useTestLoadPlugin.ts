import { ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { usePluginStore } from '@/store'

/**
 * 测试加载插件 Hook
 * 主要功能：监听 Ctrl+Alt+1 快捷键，触发文件夹zip打包功能
 */
export function useTestLoadPlugin() {
  const isProcessing = ref(false)
  const lastZipPath = ref<string | null>(null)
  const error = ref<string | null>(null)

  const pluginStore = usePluginStore()

  useEventListener(document, 'keydown', (event: KeyboardEvent) => {
    // 检查是否按下了 Ctrl+Alt+1
    if (event.ctrlKey && event.key === '1') {
      event.preventDefault()
      event.stopPropagation()
      handleHotkeyTrigger()
    }
  })

  // 处理快捷键触发
  const handleHotkeyTrigger = async () => {
    if (isProcessing.value) {
      console.log('正在处理中，请稍候...')
      return
    }

    try {
      isProcessing.value = true
      error.value = null

      console.log('🎯 触发测试插件打包功能')

      // // 选择要打包的文件夹
      // const selectedFolders = await api.ipcRouter.filesystemSelectFolder({
      //   properties: ['openDirectory'],
      //   title: '选择要打包的文件夹'
      // })

      // if (!selectedFolders || selectedFolders.length === 0) {
      //   console.log('用户取消了文件夹选择')
      //   return
      // }

      // const sourceDir = selectedFolders[0]
      // console.log('选择的文件夹:', sourceDir)

      // // 选择保存zip文件的位置
      // const savePath = await api.ipcRouter.filesystemSaveFile({
      //   title: '保存zip文件',
      //   defaultPath: `${sourceDir.split('\\').pop() || 'folder'}.zip`,
      //   filters: [
      //     { name: 'ZIP文件', extensions: ['zip'] }
      //   ]
      // })

      // if (!savePath) {
      //   console.log('用户取消了保存位置选择')
      //   return
      // }

      const sourceDir = 'E:\\Code\\Git\\naimo_tools\\plugins\\example-plugin'
      const savePath = 'E:\\Code\\Git\\naimo_tools\\plugins\\example-plugin\\example-plugin.zip'

      console.log('保存路径:', savePath)

      // 调用主进程的zip打包功能
      const success = await api.ipcRouter.filesystemZipDirectory(sourceDir, savePath)

      if (success) {
        lastZipPath.value = savePath
        console.log('✅ 文件夹打包成功:', savePath)
        pluginStore.installZip(savePath)
        // 这里可以添加成功提示
      } else {
        throw new Error('打包失败')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      error.value = errorMessage
      console.error('❌ 打包过程中发生错误:', errorMessage)
    } finally {
      isProcessing.value = false
    }
  }


  // 手动触发打包（用于测试）
  const triggerZipPack = async () => {
    await handleHotkeyTrigger()
  }


  onMounted(() => {
    triggerZipPack()
  })

  return {
    // 状态
    isProcessing,
    lastZipPath,
    error,

    // 方法
    triggerZipPack
  }
}
