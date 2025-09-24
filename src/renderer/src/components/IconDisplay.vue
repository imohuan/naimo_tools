<template>
  <div class="icon-display flex items-center justify-center" :class="containerClass">
    <!-- 图片图标 -->
    <img v-if="isImageSource && !hasError && iconSource" :src="iconSource" :alt="alt" :class="iconClass"
      @error="handleImageError" @load="handleImageLoad" />

    <!-- SVG 图标 -->
    <div v-else-if="isSvgSource && !hasError" :class="iconClass" v-html="iconSource" @error="handleSvgError" />

    <!-- 失败回退图标 -->
    <div v-else :class="fallbackClass">
      <slot name="fallback">
        <IconMdiImage class="w-full h-full" />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
/** @ts-ignore */
import IconMdiImage from '~icons/mdi/image';

interface Props {
  /** 图标源：图片URL、base64、SVG代码 */
  src?: string | null;
  /** 图标描述 */
  alt?: string;
  /** 图标容器类名 */
  containerClass?: string;
  /** 图标类名 */
  iconClass?: string;
  /** 失败回退图标类名 */
  fallbackClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  containerClass: '',
  iconClass: 'w-full h-full flex items-center justify-center object-contain',
  fallbackClass: 'w-full h-full flex items-center justify-center bg-gray-300 rounded'
});

const hasError = ref(false);
const isLoaded = ref(false);

// 计算图标源类型
const iconSource = computed(() => props.src);
const isImageSource = computed(() => {
  if (!props.src) return false;
  // 检查是否为base64或URL
  return props.src.startsWith('data:') ||
    props.src.startsWith('http') ||
    props.src.startsWith('/') ||
    props.src.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
});

const isSvgSource = computed(() => {
  if (!props.src) return false;
  // 检查是否为SVG代码
  return props.src.trim().startsWith('<svg') && props.src.includes('</svg>');
});

// 处理图片加载错误
const handleImageError = () => {
  hasError.value = true;
  isLoaded.value = false;
};

// 处理图片加载成功
const handleImageLoad = () => {
  hasError.value = false;
  isLoaded.value = true;
};

// 处理SVG错误
const handleSvgError = () => {
  hasError.value = true;
};

// 监听src变化，重置错误状态
watch(() => props.src, () => {
  hasError.value = false;
  isLoaded.value = false;
});

// 暴露方法
defineExpose({
  hasError: computed(() => hasError.value),
  isLoaded: computed(() => isLoaded.value),
  reload: () => {
    hasError.value = false;
    isLoaded.value = false;
  }
});
</script>

<style scoped>
.icon-display {
  width: 100%;
  height: 100%;
  position: relative;
  display: inline-block;
}

/* 确保SVG内容正确显示 */
.icon-display :deep(svg) {
  display: block;
}
</style>
