<template>
  <div class="flex items-start gap-6 py-3">
    <!-- 左侧：设置项标题和描述 -->
    <div class="flex-1 min-w-0">
      <label class="block text-sm font-medium text-gray-900 mb-1">
        {{ setting.title }}
        <span v-if="setting.required" class="text-red-500 ml-1">*</span>
      </label>
      <p v-if="setting.description" class="text-xs text-gray-600">
        {{ setting.description }}
      </p>
    </div>

    <!-- 右侧：动态渲染设置控件 -->
    <div class="flex-shrink-0 w-64">
      <!-- 输入框 -->
      <div v-if="setting.type === 'input'" class="relative">
        <input v-model="localValue" :type="getInputType(setting.type)" :placeholder="`请输入${setting.title}`"
          class="w-full px-3 py-2 border border-gray-300 rounded-md outline-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
      </div>

      <!-- 密码输入框 -->
      <div v-else-if="setting.type === 'password'" class="relative">
        <input v-model="localValue" :type="showPassword ? 'text' : 'password'" :placeholder="`请输入${setting.title}`"
          class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md outline-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        <button type="button" @click="togglePasswordVisibility"
          class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
          <!-- 眼睛图标 - 显示状态 -->
          <svg v-if="showPassword" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <!-- 眼睛图标 - 隐藏状态 -->
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
          </svg>
        </button>
      </div>

      <!-- 文本域 -->
      <textarea v-else-if="setting.type === 'textarea'" v-model="localValue" :placeholder="`请输入${setting.title}`"
        rows="3"
        class="w-full px-3 py-2 border border-gray-300 rounded-md outline-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" />

      <!-- 数字输入 -->
      <input v-else-if="setting.type === 'number'" v-model.number="localValue" type="number"
        :placeholder="`请输入${setting.title}`"
        class="w-full px-3 py-2 border border-gray-300 rounded-md outline-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />

      <!-- 复选框 -->
      <div v-else-if="setting.type === 'checkbox'" class="flex items-center">
        <input v-model="localValue" type="checkbox" :id="`${pluginId}-${setting.name}`"
          class="h-4 w-4 outline-none text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
        <label :for="`${pluginId}-${setting.name}`" class="ml-2 text-sm text-gray-700">
          {{ setting.title }}
        </label>
      </div>

      <!-- 选择框 -->
      <select v-else-if="setting.type === 'select'" v-model="localValue"
        class="w-full px-3 py-2 border border-gray-300 outline-none rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
        <option value="">请选择{{ setting.title }}</option>
        <option v-for="option in getSelectOptions(setting)" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <!-- 颜色选择器 -->
      <div v-else-if="setting.type === 'color'" class="flex items-center gap-2">
        <input v-model="localValue" type="color"
          class="w-10 h-8 border border-gray-300 rounded outline-none cursor-pointer flex-shrink-0" />
        <input v-model="localValue" type="text" :placeholder="`请输入${setting.title}`"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-md outline-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
      </div>

      <!-- 范围滑块 -->
      <div v-else-if="setting.type === 'range'" class="space-y-2">
        <input v-model.number="localValue" type="range" :min="getRangeMin(setting)" :max="getRangeMax(setting)"
          :step="getRangeStep(setting)" class="w-full outline-none" />
        <div class="flex justify-between text-xs text-gray-600">
          <span>{{ getRangeMin(setting) }}</span>
          <span class="font-medium">{{ localValue }}</span>
          <span>{{ getRangeMax(setting) }}</span>
        </div>
      </div>

      <!-- 文件选择 -->
      <div v-else-if="setting.type === 'file'" class="flex items-center gap-2">
        <input v-model="localValue" type="text" :placeholder="`请输入${setting.title}`"
          class="flex-1 px-3 py-2 border outline-none border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        <button type="button"
          class="px-2 py-2 bg-gray-100 text-gray-700 text-xs rounded-md hover:bg-gray-200 transition-colors flex-shrink-0">
          选择
        </button>
      </div>

      <!-- 其他类型使用输入框 -->
      <input v-else v-model="localValue" :type="getInputType(setting.type)" :placeholder="`请输入${setting.title}`"
        class="w-full px-3 py-2 border outline-none border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
    </div>

    <!-- 子设置项 -->
    <div v-if="setting.children && setting.children.length > 0" class="mt-4 ml-4 space-y-3">
      <SettingItem v-for="child in setting.children" :key="child.name" :setting="child" :plugin-id="pluginId"
        :value="value && value[child.name] !== undefined ? value[child.name] : getDefaultValue(child)"
        @update:value="updateChildValue(child.name, $event)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SettingConfig } from '@/typings/pluginTypes'
import type { SelectOption } from '@/typings/composableTypes'

// 组件属性
interface Props {
  setting: SettingConfig
  pluginId: string
  value: any
}

// 组件事件
interface Emits {
  (e: 'update:value', value: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 密码显示状态
const showPassword = ref(false)

// 切换密码显示状态
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

// 本地值计算属性
const localValue = computed({
  get: () => props.value,
  set: (newValue) => emit('update:value', newValue)
})

// 更新子设置项的值
const updateChildValue = (childName: string, childValue: any) => {
  const newValue = { ...props.value, [childName]: childValue }
  emit('update:value', newValue)
}

// 获取输入框类型
const getInputType = (type: string): string => {
  const typeMap: Record<string, string> = {
    'email': 'email',
    'password': 'password',
    'tel': 'tel',
    'url': 'url',
    'search': 'search',
    'date': 'date',
    'time': 'time',
    'datetime': 'datetime-local'
  }
  return typeMap[type] || 'text'
}

// 获取选择框选项
const getSelectOptions = (_setting: SettingConfig): SelectOption[] => {
  // 这里可以根据setting的配置返回选项
  // 暂时返回空数组，实际使用时需要根据插件配置来设置
  return _setting?.option?.options || []
}

// 获取范围滑块的最小值
const getRangeMin = (_setting: SettingConfig): number => {
  return 0
}

// 获取范围滑块的最大值
const getRangeMax = (_setting: SettingConfig): number => {
  return 100
}

// 获取范围滑块的步长
const getRangeStep = (_setting: SettingConfig): number => {
  return 1
}

// 获取默认值
const getDefaultValue = (setting: SettingConfig): any => {
  if (setting.defaultValue !== undefined) {
    if (typeof setting.defaultValue === 'function') {
      return setting.defaultValue()
    }
    return setting.defaultValue
  }

  // 根据类型返回默认值
  switch (setting.type) {
    case 'checkbox':
      return false
    case 'number':
    case 'range':
      return 0
    case 'color':
      return '#000000'
    default:
      return ''
  }
}
</script>
