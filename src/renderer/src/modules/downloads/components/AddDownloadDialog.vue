<template>
  <div class="h-full flex flex-col bg-white">
    <!-- 头部 -->
    <div class="border-b border-gray-200 px-3 py-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-gray-900">添加下载</h3>
        <button @click="$emit('close')"
          class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
          <IconMdiClose class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="flex-1 overflow-auto p-3">
      <form @submit.prevent="handleSubmit" class="space-y-3">
        <!-- URL 输入 -->
        <div>
          <label for="url" class="block text-xs font-medium text-gray-700 mb-1">
            下载链接 <span class="text-red-500">*</span>
          </label>
          <input id="url" v-model="form.url" type="url" required placeholder="https://example.com/file.zip"
            class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
        </div>

        <!-- 文件名输入 -->
        <div>
          <label for="filename" class="block text-xs font-medium text-gray-700 mb-1">
            文件名（可选）
          </label>
          <input id="filename" v-model="form.filename" type="text" placeholder="自动从URL获取"
            class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
        </div>

        <!-- 保存路径 -->
        <div>
          <label for="directory" class="block text-xs font-medium text-gray-700 mb-1">
            保存路径（可选）
          </label>
          <div class="flex space-x-2">
            <input id="directory" v-model="form.directory" type="text" placeholder="使用默认下载目录"
              class="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
            <button type="button" @click="selectDirectory"
              class="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
              选择
            </button>
          </div>
        </div>

        <!-- 下载选项 -->
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-2">下载选项</label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input v-model="form.persistOnAppClose" type="checkbox"
                class="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-1" />
              <span class="ml-2 text-xs text-gray-700">启用持久化下载（应用关闭时自动保存，重启后恢复）</span>
            </label>
            <label class="flex items-center">
              <input v-model="form.overwrite" type="checkbox"
                class="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-1" />
              <span class="ml-2 text-xs text-gray-700">覆盖同名文件</span>
            </label>
          </div>
        </div>
      </form>
    </div>

    <!-- 底部按钮 -->
    <div class="border-t border-gray-200 px-3 py-2">
      <div class="flex justify-end space-x-2">
        <button type="button" @click="$emit('close')"
          class="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
          取消
        </button>
        <button @click="handleSubmit" :disabled="!form.url.trim() || isSubmitting"
          class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          <span v-if="isSubmitting">添加中...</span>
          <span v-else>添加下载</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
/** @ts-ignore */
import IconMdiClose from "~icons/mdi/close";

// Emits
interface Emits {
  (e: 'close'): void;
  (e: 'add', params: {
    url: string;
    saveAsFilename?: string;
    directory?: string;
    persistOnAppClose?: boolean;
    overwrite?: boolean;
  }): void;
}

const emit = defineEmits<Emits>();

// 表单数据
const form = ref({
  url: '',
  filename: '',
  directory: '',
  persistOnAppClose: true, // 默认启用持久化
  overwrite: false
});

const isSubmitting = ref(false);

// 选择目录
const selectDirectory = async () => {
  try {
    const selectedPath = await naimo.download.selectDownloadDirectory();
    if (selectedPath) {
      form.value.directory = selectedPath;
    }
  } catch (error) {
    console.error('选择目录失败:', error);
  }
};

// 提交表单
const handleSubmit = async () => {
  if (!form.value.url.trim()) return;

  isSubmitting.value = true;

  try {
    const params: {
      url: string;
      saveAsFilename?: string;
      directory?: string;
      persistOnAppClose?: boolean;
      overwrite?: boolean;
    } = {
      url: form.value.url.trim(),
      persistOnAppClose: form.value.persistOnAppClose,
      overwrite: form.value.overwrite
    };

    if (form.value.filename.trim()) {
      params.saveAsFilename = form.value.filename.trim();
    }

    if (form.value.directory.trim()) {
      params.directory = form.value.directory.trim();
    }

    emit('add', params);

    // 重置表单
    form.value = {
      url: '',
      filename: '',
      directory: '',
      persistOnAppClose: true,
      overwrite: false
    };
  } catch (error) {
    console.error('添加下载失败:', error);
  } finally {
    isSubmitting.value = false;
  }
};
</script>
