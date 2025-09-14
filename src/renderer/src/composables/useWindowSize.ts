import { ref, computed, nextTick, type Ref } from "vue";
import { useResizeObserver, useDebounceFn, watchDebounced } from "@vueuse/core";

export interface WindowSizeConfig {
  headerHeight: number;
  headerPadding: number;
  maxContentHeight: number;
  defaultContentHeight: number;
}

export function useWindowSize(config: WindowSizeConfig, externalContentAreaRef?: Ref<HTMLElement | undefined>) {
  const { headerHeight, headerPadding, maxContentHeight, defaultContentHeight } = config;

  // ==================== 响应式数据 ====================
  const contentAreaRef = externalContentAreaRef || ref<HTMLElement>();
  const contentAreaVisible = ref(false);
  const contentAreaHeight = ref(defaultContentHeight);

  // ==================== 计算属性 ====================
  const windowHeight = computed(() => headerHeight + headerPadding * 2);

  // ==================== VueUse 组合式函数 ====================

  // 使用 useResizeObserver 监听内容区域尺寸变化
  useResizeObserver(contentAreaRef, () => {
    if (contentAreaVisible.value && contentAreaRef.value) {
      updateWindowSizeDebounced();
    }
  });

  // ==================== 方法 ====================
  // 直接获取元素的实际尺寸
  const getElementSize = () => {
    if (!contentAreaRef.value) {
      return {
        height: 0,
        width: 0,
        scrollHeight: 0,
        clientHeight: 0,
        offsetHeight: 0,
      };
    }

    const element = contentAreaRef.value;
    const rect = element.getBoundingClientRect();

    return {
      height: rect.height,
      width: rect.width,
      scrollHeight: element.scrollHeight || 0,
      clientHeight: element.clientHeight || 0,
      offsetHeight: element.offsetHeight || 0,
    };
  };

  // 计算实际需要的内容高度
  const getCalculatedContentHeight = () => {
    if (!contentAreaRef.value) {
      return defaultContentHeight
    }

    // 获取内容区域内的实际内容元素
    const contentElement = contentAreaRef.value.querySelector(
      "#content-scroll-container"
    );
    if (!contentElement) {
      return defaultContentHeight
    }

    // 临时移除高度限制，让内容自然展开
    const originalHeight = contentAreaRef.value.style.height;
    const originalOverflow = contentAreaRef.value.style.overflow;
    const originalMaxHeight = contentAreaRef.value.style.maxHeight;

    contentAreaRef.value.style.height = "auto";
    contentAreaRef.value.style.overflow = "visible";
    contentAreaRef.value.style.maxHeight = "none";

    // 获取真实的内容高度
    const scrollHeight = (contentElement as HTMLElement).scrollHeight;
    const offsetHeight = (contentElement as HTMLElement).offsetHeight;

    // 恢复原始样式
    contentAreaRef.value.style.height = originalHeight;
    contentAreaRef.value.style.overflow = originalOverflow;
    contentAreaRef.value.style.maxHeight = originalMaxHeight;

    // 使用scrollHeight作为实际高度，因为它反映了内容的真实高度
    const realHeight = scrollHeight;

    // console.log("高度计算详情:", {
    //   scrollHeight,
    //   offsetHeight,
    //   realHeight,
    //   childrenCount: contentElement.children.length,
    // });

    // 确保高度在合理范围内，但不强制使用最大高度
    const calculatedHeight = Math.max(realHeight, 100);

    // 只有当内容确实需要更多空间时才使用最大高度
    if (realHeight > maxContentHeight) {
      return maxContentHeight;
    }

    return calculatedHeight;
  };

  // 动态设置窗口大小 - 简化版本
  const updateWindowSize = () => {
    if (contentAreaVisible.value) {
      // 使用 requestAnimationFrame 确保在下一帧计算，此时DOM已完全渲染
      requestAnimationFrame(() => {
        const actualHeight = getCalculatedContentHeight();
        const totalHeight = actualHeight + windowHeight.value;

        // const elementSize = getElementSize();
        // console.log("更新窗口大小:", totalHeight, {
        //   contentHeight: actualHeight,
        //   windowHeight: windowHeight.value,
        //   totalHeight,
        //   elementSize: {
        //     height: elementSize.height,
        //     width: elementSize.width,
        //     scrollHeight: elementSize.scrollHeight,
        //     clientHeight: elementSize.clientHeight,
        //     offsetHeight: elementSize.offsetHeight,
        //   },
        // });

        contentAreaHeight.value = actualHeight;
        api.ipcRouter.windowSetSize(-1, totalHeight);
      });
    } else {
      api.ipcRouter.windowSetSize(-1, windowHeight.value);
    }
  };

  // 使用 useDebounceFn 防抖窗口大小设置
  const updateWindowSizeDebounced = useDebounceFn(updateWindowSize, 100);

  // 切换内容区域可见性
  const toggleContentArea = () => {
    contentAreaVisible.value = !contentAreaVisible.value;

    // 使用 nextTick 确保 DOM 更新后再设置窗口大小
    nextTick(() => {
      updateWindowSize();
    });
  };

  // 显示内容区域
  const showContentArea = () => {
    contentAreaVisible.value = true;
    nextTick(() => {
      updateWindowSize();
    });
  };

  // 隐藏内容区域
  const hideContentArea = () => {
    contentAreaVisible.value = false;
    nextTick(() => {
      updateWindowSize();
    });
  };

  // 设置内容区域高度
  const setContentAreaHeight = (height: number) => {
    contentAreaHeight.value = height;
    if (contentAreaVisible.value) {
      nextTick(() => {
        updateWindowSize();
      });
    }
  };

  // ==================== 监听器 ====================
  // 使用 VueUse 的 watchDebounced 监听内容区域可见性变化
  watchDebounced(
    contentAreaVisible,
    () => {
      nextTick(() => {
        updateWindowSize();
      });
    },
    { debounce: 50 }
  );

  // 监听内容区域高度变化
  watchDebounced(
    contentAreaHeight,
    () => {
      if (contentAreaVisible.value) {
        nextTick(() => {
          updateWindowSize();
        });
      }
    },
    { debounce: 100 }
  );

  // 初始化窗口大小
  const initializeWindowSize = () => {
    api.ipcRouter.windowSetSize(-1, windowHeight.value);
  };

  return {
    // 响应式数据
    contentAreaRef,
    contentAreaVisible,
    contentAreaHeight,
    windowHeight,

    // 方法
    updateWindowSize,
    updateWindowSizeDebounced,
    toggleContentArea,
    showContentArea,
    hideContentArea,
    setContentAreaHeight,
    initializeWindowSize,
    getCalculatedContentHeight,
    getElementSize,
  };
}
