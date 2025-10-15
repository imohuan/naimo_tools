<template>
  <div
    v-if="showModal"
    class="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click="closeModal"
  >
    <div
      class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300"
      @click.stop
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-4 border-b border-gray-200"
      >
        <h3 class="text-lg font-semibold text-gray-900">GitHub Token 配置</h3>
        <button
          @click="closeModal"
          class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-4 space-y-4">
        <div class="space-y-2">
          <label
            for="token-input"
            class="block text-sm font-medium text-gray-700"
          >
            GitHub Token:
          </label>
          <input
            id="token-input"
            v-model="tokenInput"
            type="password"
            placeholder="请输入您的 GitHub Token"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            @keyup.enter="confirmToken"
          />
        </div>

        <div class="bg-blue-50 p-3 rounded-lg">
          <p class="text-sm text-gray-700">
            获取 Token：
            <a
              href="https://github.com/settings/personal-access-tokens"
              target="_blank"
              class="text-blue-600 hover:text-blue-800 underline"
              >GitHub Token 设置页面</a
            >
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-3 p-4 border-t border-gray-200">
        <button
          @click="closeModal"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          @click="confirmToken"
          :disabled="!tokenInput.trim()"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          确认
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useApp } from "@/core";

const setTokenCallback = useApp().plugin.setGithubToken;

const showModal = ref(false);
const tokenInput = ref("");

function closeModal() {
  showModal.value = false;
  tokenInput.value = "";
}

function confirmToken() {
  if (tokenInput.value.trim()) {
    setTokenCallback(tokenInput.value.trim());
    closeModal();
  }
}
</script>

<style scoped>
@keyframes slide-in-from-bottom-4 {
  from {
    transform: translateY(1rem);
  }

  to {
    transform: translateY(0);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.animate-in {
  animation-fill-mode: both;
}

.slide-in-from-bottom-4 {
  animation-name: slide-in-from-bottom-4;
}

.fade-in {
  animation-name: fade-in;
}

.duration-300 {
  animation-duration: 300ms;
}
</style>
