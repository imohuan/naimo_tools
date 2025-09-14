import { ref, nextTick } from 'vue'

/**
 * 文本宽度计算 hooks
 * 用于动态计算文本的显示宽度，支持中文输入法的预输入字符
 */
export function useTextWidth() {
  // 创建Canvas用于测量文字宽度（只创建一次）
  let measureCanvas: HTMLCanvasElement | null = null
  let measureContext: CanvasRenderingContext2D | null = null

  const initMeasureCanvas = () => {
    if (!measureCanvas) {
      measureCanvas = document.createElement('canvas')
      measureContext = measureCanvas.getContext('2d')
    }
  }

  /**
   * 计算文本宽度
   * @param text 要测量的文本
   * @param element 参考元素，用于获取字体样式
   * @param options 计算选项
   * @returns 计算后的宽度（像素）
   */
  const calculateTextWidth = (
    text: string,
    element: HTMLElement,
    options: {
      padding?: number
      minWidth?: number
      maxWidth?: number
      extraWidth?: number
    } = {}
  ): number => {
    // console.log("calculateTextWidth", text, element, options);
    if (!element) return 0

    // 计算最终宽度选项
    const {
      padding = 32,
      minWidth = 200,
      maxWidth = window.innerWidth - 100,
      extraWidth = 20
    } = options

    // 如果没有文本，直接返回最小宽度
    if (!text) {
      return minWidth
    }

    // 初始化测量Canvas
    initMeasureCanvas()
    if (!measureContext) return minWidth

    // 获取元素的字体样式
    const computedStyle = getComputedStyle(element)
    const fontSize = computedStyle.fontSize
    const fontFamily = computedStyle.fontFamily
    const fontWeight = computedStyle.fontWeight
    const letterSpacing = computedStyle.letterSpacing

    // 设置Canvas字体样式
    measureContext.font = `${fontWeight} ${fontSize} ${fontFamily}`
    measureContext.letterSpacing = letterSpacing

    // 使用Canvas测量文字宽度
    const textMetrics = measureContext.measureText(text)
    const textWidth = textMetrics.width

    // 计算最终宽度
    const calculatedWidth = Math.max(
      minWidth,
      Math.min(maxWidth, textWidth + padding + extraWidth)
    )

    return calculatedWidth
  }

  /**
   * 创建响应式的文本宽度计算器
   * @param elementRef 输入框元素的引用
   * @param options 计算选项
   * @returns 响应式的宽度值和计算函数
   */
  const useTextWidthCalculator = (
    elementRef: Ref<HTMLElement | undefined>,
    options: {
      padding?: number
      minWidth?: number
      maxWidth?: number
      extraWidth?: number
    } = {}
  ) => {
    const width = ref<string>('200px')

    const updateWidth = (text: string) => {
      if (!elementRef.value) return
      const calculatedWidth = calculateTextWidth(text, elementRef.value, options)
      width.value = `${calculatedWidth}px`
    }

    const updateWidthAsync = (text: string) => {
      nextTick(() => updateWidth(text))
    }
    return { width, updateWidth, updateWidthAsync }
  }

  return { calculateTextWidth, useTextWidthCalculator }
}
