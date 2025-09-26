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
import { usePathToDataUrl } from '../composables/usePathToDataUrl';

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
const iconSource = ref<string | null>(null);

// 使用路径转换 composable
const { convertPathToDataUrl, isLocalPath } = usePathToDataUrl();

// 处理图标源转换
const handleIconSource = async (src: string | null) => {
  if (!src) {
    iconSource.value = null;
    return;
  }

  // 如果是本地绝对路径，转换为 data URL
  if (isLocalPath(src)) {
    try {
      iconSource.value = await convertPathToDataUrl(src);
      hasError.value = false;
    } catch (error) {
      console.error('转换本地路径失败:', error);
      hasError.value = true;
      iconSource.value = null;
    }
  } else {
    // 其他情况直接使用原始路径
    iconSource.value = src;
    hasError.value = false;
  }
};
const isImageSource = computed(() => {
  if (!iconSource.value) return false;
  // 检查是否为base64或URL
  return iconSource.value.startsWith('data:') ||
    iconSource.value.startsWith('http') ||
    iconSource.value.startsWith('/') ||
    iconSource.value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
});

const isSvgSource = computed(() => {
  if (!iconSource.value) return false;
  // 检查是否为SVG代码
  return iconSource.value.trim().startsWith('<svg') && iconSource.value.includes('</svg>');
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

// 监听src变化，重置错误状态并处理图标源
watch(() => props.src, (newSrc) => {
  hasError.value = false;
  isLoaded.value = false;
  handleIconSource(newSrc || null);
}, { immediate: true });

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
