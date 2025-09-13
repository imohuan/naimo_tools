<template>
  <div class="w-full h-full bg-gray-50">
    <div class="p-4">
      <h1 class="text-2xl font-bold text-gray-800 mb-4">快捷键拦截组件演示</h1>
      
      <!-- 快捷键拦截组件 -->
      <div class="bg-white rounded-lg shadow-lg overflow-hidden" style="height: 500px;">
        <HotkeyInterceptor ref="hotkeyRef" />
      </div>
      
      <!-- 控制按钮 -->
      <div class="mt-4 flex gap-4">
        <button
          @click="clearAllHotkeys"
          class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          清除所有快捷键
        </button>
        <button
          @click="addSampleHotkey"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          添加示例快捷键
        </button>
        <button
          @click="showHotkeys"
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          显示所有快捷键
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import HotkeyInterceptor from './components/HotkeyInterceptor.vue'

const hotkeyRef = ref<InstanceType<typeof HotkeyInterceptor>>()

const clearAllHotkeys = () => {
  hotkeyRef.value?.clearAllHotkeys()
  console.log('已清除所有快捷键')
}

const addSampleHotkey = () => {
  hotkeyRef.value?.addHotkey(['Ctrl', 'Shift', 'A'])
  console.log('已添加示例快捷键: Ctrl + Shift + A')
}

const showHotkeys = () => {
  const hotkeys = hotkeyRef.value?.savedHotkeys
  console.log('当前所有快捷键:', hotkeys)
}
</script>