<template>
  <div class="relative w-full h-full bg-transparent" ref="containerRef">
    <img v-if="screenshotData" :src="screenshotData" class="w-full h-full object-contain block" ref="imageRef" alt="截图"
      @load="onImageLoad" />

    <!-- 裁剪选择区域 -->
    <div v-if="showSelection" class="absolute top-0 left-0 w-full h-full pointer-events-none">
      <!-- 背景遮罩 -->
      <div class="absolute bg-gray-950 opacity-50 pointer-events-none z-10" :style="maskTopStyle"></div>
      <div class="absolute bg-gray-950 opacity-50 pointer-events-none z-10" :style="maskBottomStyle"></div>
      <div class="absolute bg-gray-950 opacity-50 pointer-events-none z-10" :style="maskLeftStyle"></div>
      <div class="absolute bg-gray-950 opacity-50 pointer-events-none z-10" :style="maskRightStyle"></div>

      <!-- 选择区域 -->
      <div class="absolute border-2 border-blue-500 bg-transparent pointer-events-auto cursor-move min-w-5 min-h-5 z-20"
        :style="selectionStyle" @mousedown="onSelectionMouseDown">
        <!-- 调整手柄 -->
        <div v-for="handle in handles" :key="handle.position"
          :class="['absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full pointer-events-auto z-30', handle.position]"
          @mousedown.stop="onHandleMouseDown($event, handle.position)"></div>
      </div>
    </div>

    <!-- 信息显示 -->
    <div
      class="absolute top-4 left-4 bg-white bg-opacity-90 text-gray-800 px-3 py-2 rounded-lg text-sm shadow-lg backdrop-blur-sm select-none">
      {{ infoText }}
    </div>

    <!-- 工具栏 -->
    <div v-if="showSelection"
      class="absolute bg-white bg-opacity-95 rounded-xl shadow-xl border border-gray-200 p-1 flex gap-2 items-center backdrop-blur-sm z-50"
      :style="toolbarStyle">
      <button
        class="flex items-center justify-center text-gray-600 rounded-lg transition-all duration-200 border border-transparent hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200"
        :style="toolbarButtonStyle" @click="copyCrop" title="复制 (Ctrl+C)">
        <IconMdiContentCopy :style="toolbarIconStyle" />
      </button>
      <button
        class="flex items-center justify-center text-gray-600 rounded-lg transition-all duration-200 border border-transparent hover:text-green-600 hover:bg-green-50 hover:border-green-200"
        :style="toolbarButtonStyle" @click="downloadCrop" title="下载 (Ctrl+S)">
        <IconMdiDownload :style="toolbarIconStyle" />
      </button>
      <button
        class="flex items-center justify-center text-gray-600 rounded-lg transition-all duration-200 border border-transparent hover:text-purple-600 hover:bg-purple-50 hover:border-purple-200"
        :style="toolbarButtonStyle" @click="pinToScreen" title="固定到屏幕 (Ctrl+T)">
        <IconMdiPin :style="toolbarIconStyle" />
      </button>
      <div class="w-px h-6 bg-gray-300"></div>
      <button
        class="flex items-center justify-center text-gray-600 rounded-lg transition-all duration-200 border border-transparent hover:text-red-600 hover:bg-red-50 hover:border-red-200"
        :style="toolbarButtonStyle" @click="closeWindow" title="关闭 (Esc)">
        <IconMdiClose :style="toolbarIconStyle" />
      </button>
    </div>

    <!-- 快捷键菜单 -->
    <div
      class="absolute bottom-4 left-4 bg-white bg-opacity-95 rounded-xl shadow-xl border border-gray-200 p-4 text-gray-700 text-sm backdrop-blur-sm select-none">
      <div class="flex items-center gap-3 mb-2">
        <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">W/A/S/D</span>
        <span>移动鼠标光标</span>
      </div>
      <div class="flex items-center gap-3 mb-2">
        <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">Shift+C</span>
        <span>检测文本并复制</span>
      </div>
      <div class="flex items-center gap-3 mb-2">
        <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">,</span>
        <span>显示或隐藏光标</span>
      </div>
      <div class="flex items-center gap-3 mb-2">
        <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">Ctrl+T</span>
        <span>固定到屏幕</span>
      </div>
      <div class="flex items-center gap-3">
        <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">Esc</span>
        <span>关闭</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ==================== 类型定义 ====================
interface ScreenInfo {
  screenshotData?: string;
  [key: string]: any;
}

interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Mouse {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  offsetX: number;
  offsetY: number;
}

interface Handle {
  position: string;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ==================== IPC通信 ====================
const { ipcRenderer } = window.require('electron')

// ==================== 响应式数据 ====================
const containerRef = ref<HTMLElement>()
const imageRef = ref<HTMLImageElement>()
const screenshotData = ref<string>('')
const screenInfo = ref<ScreenInfo | null>(null)

// 工具栏配置
const TOOLBAR_CONFIG = {
  buttonSize: 30,    // 按钮尺寸 (w-10 h-10 = 40px)
  iconSize: 14,      // 图标尺寸 (w-5 h-5 = 20px)
  gap: 8,           // 间距 (gap-2 = 8px)
  padding: 4,       // 内边距 (p-2 = 8px)
  separatorWidth: 1, // 分隔线宽度 (w-px = 1px)
  buttonCount: 4,    // 按钮数量
  controlOffset: 4, // 控制区域偏移量
}

// 选择区域状态
const showSelection = ref(false)
const isSelecting = ref(false)
const isResizing = ref(false)
const isDragging = ref(false)
const resizeHandle = ref<string>('')

// 选择区域位置和尺寸
const selection = reactive<Selection>({
  x: 0,
  y: 0,
  width: 0,
  height: 0
})

// 鼠标状态
const mouse = reactive<Mouse>({
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  offsetX: 0,
  offsetY: 0
})

// 调整手柄配置
const handles: Handle[] = [
  { position: 'nw' },
  { position: 'ne' },
  { position: 'sw' },
  { position: 'se' },
  { position: 'n' },
  { position: 's' },
  { position: 'w' },
  { position: 'e' }
]

// ==================== 计算属性 ====================

// 工具栏按钮样式（包含动态尺寸）
const toolbarButtonStyle = computed(() => ({
  width: `${TOOLBAR_CONFIG.buttonSize}px`,
  height: `${TOOLBAR_CONFIG.buttonSize}px`
}))

// 工具栏图标样式
const toolbarIconStyle = computed(() => ({
  width: `${TOOLBAR_CONFIG.iconSize}px`,
  height: `${TOOLBAR_CONFIG.iconSize}px`
}))

// 计算选择区域样式
const selectionStyle = computed(() => ({
  left: `${selection.x}px`,
  top: `${selection.y}px`,
  width: `${selection.width}px`,
  height: `${selection.height}px`
}))

// 计算背景遮罩样式
const maskTopStyle = computed(() => ({
  top: '0',
  left: '0',
  width: '100%',
  height: `${selection.y}px`
}))

const maskBottomStyle = computed(() => ({
  top: `${selection.y + selection.height}px`,
  left: '0',
  width: '100%',
  height: `calc(100% - ${selection.y + selection.height}px)`
}))

const maskLeftStyle = computed(() => ({
  top: `${selection.y}px`,
  left: '0',
  width: `${selection.x}px`,
  height: `${selection.height}px`
}))

const maskRightStyle = computed(() => ({
  top: `${selection.y}px`,
  left: `${selection.x + selection.width}px`,
  width: `calc(100% - ${selection.x + selection.width}px)`,
  height: `${selection.height}px`
}))

// 计算工具栏位置
const toolbarStyle = computed(() => {
  // 工具栏大小精确计算
  const { buttonSize, gap, padding, separatorWidth, buttonCount, controlOffset } = TOOLBAR_CONFIG
  if (!containerRef.value || !showSelection.value) {
    return {
      position: 'absolute' as const,
      left: `${selection.x + selection.width + controlOffset}px`,
      top: `${selection.y + selection.height + controlOffset}px`,
      transform: 'none'
    }
  }

  // 实际结构: [padding] [按钮1] [gap] [按钮2] [gap] [按钮3] [gap] [分隔线] [gap] [按钮4] [padding]
  // 计算: 左右padding + 4个按钮 + 4个gap + 1个分隔线
  const toolbarWidth = padding * 2 + buttonSize * buttonCount + gap * 4 + separatorWidth
  const toolbarHeight = padding * 2 + buttonSize

  // 获取容器尺寸（即窗口尺寸）
  const containerRect = containerRef.value.getBoundingClientRect()
  const containerWidth = containerRect.width
  const containerHeight = containerRect.height

  // 默认位置：选择区域右下角外侧
  let left = selection.x + selection.width - toolbarWidth
  let top = selection.y + selection.height + controlOffset

  // 调试信息
  console.log('工具栏位置计算:', {
    selection: { x: selection.x, y: selection.y, width: selection.width, height: selection.height },
    container: { width: containerWidth, height: containerHeight },
    toolbar: { width: toolbarWidth, height: toolbarHeight },
    initialPosition: { left, top }
  })

  // 如果工具栏会超出右边界，放到选择区域左侧
  if (left + toolbarWidth > containerWidth) {
    left = selection.x
    console.log('工具栏超出右边界，移到左侧:', left)
  }

  // 如果工具栏会超出下边界，放到选择区域上方
  if (top + toolbarHeight > containerHeight) {
    top = selection.y - toolbarHeight - controlOffset
    console.log('工具栏超出下边界，移到上方:', top)
  }

  // 如果放到左侧还是超出左边界，就放到选择区域内部右侧
  if (left < 0) {
    left = Math.max(controlOffset, selection.x + selection.width - toolbarWidth - controlOffset)
    console.log('工具栏超出左边界，移到内部右侧:', left)
  }

  // 如果放到上方还是超出上边界，就放到选择区域内部下方
  if (top < 0) {
    top = Math.max(controlOffset, selection.y + selection.height - toolbarHeight - controlOffset)
    left -= controlOffset
    console.log('工具栏超出上边界，移到内部下方:', top)
  }

  // 最终边界检查，确保工具栏完全在可视区域内
  left = Math.max(0, Math.min(left, containerWidth - toolbarWidth))
  top = Math.max(0, Math.min(top, containerHeight - toolbarHeight))

  console.log('最终工具栏位置:11', { left, top })

  return {
    position: 'absolute' as const,
    left: `${left}px`,
    top: `${top}px`,
    transform: 'none'
  }
})

// 信息文本
const infoText = computed(() => {
  if (!showSelection.value) {
    return '拖拽选择区域'
  }
  return `选择区域: ${Math.round(selection.width)} × ${Math.round(selection.height)}`
})

// 设置截图数据
function setScreenshotData(imageData: string) {
  screenshotData.value = imageData
  console.log('截图数据已设置')
}

// 图片加载完成
function onImageLoad() {
  console.log('截图加载完成')
}

// 开始选择
function startSelection(e: MouseEvent) {
  if (isResizing.value || !containerRef.value) return

  isSelecting.value = true

  // 获取容器的偏移位置
  const containerRect = containerRef.value.getBoundingClientRect()

  // 转换为相对于容器的坐标
  mouse.startX = e.clientX - containerRect.left
  mouse.startY = e.clientY - containerRect.top

  selection.x = mouse.startX
  selection.y = mouse.startY
  selection.width = 0
  selection.height = 0

  console.log('开始选择:', {
    clientX: e.clientX,
    clientY: e.clientY,
    containerLeft: containerRect.left,
    containerTop: containerRect.top,
    relativeX: mouse.startX,
    relativeY: mouse.startY
  })

  showSelection.value = true
}

// 更新选择
function updateSelection(e: MouseEvent) {
  if (!isSelecting.value && !isResizing.value && !isDragging.value) return
  if (!containerRef.value) return

  // 获取容器的偏移位置
  const containerRect = containerRef.value.getBoundingClientRect()

  // 转换为相对于容器的坐标
  mouse.currentX = e.clientX - containerRect.left
  mouse.currentY = e.clientY - containerRect.top

  if (isSelecting.value) {
    const left = Math.min(mouse.startX, mouse.currentX)
    const top = Math.min(mouse.startY, mouse.currentY)
    const width = Math.abs(mouse.currentX - mouse.startX)
    const height = Math.abs(mouse.currentY - mouse.startY)

    selection.x = left
    selection.y = top
    selection.width = width
    selection.height = height
  } else if (isResizing.value) {
    resizeSelection(e)
  } else if (isDragging.value) {
    dragSelection(e)
  }
}

// 结束选择
function endSelection() {
  isSelecting.value = false
  isResizing.value = false
  isDragging.value = false
  resizeHandle.value = ''
}

// 选择区域鼠标按下
function onSelectionMouseDown(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  if (!containerRef.value) return

  const containerRect = containerRef.value.getBoundingClientRect()

  isDragging.value = true
  mouse.startX = e.clientX - containerRect.left
  mouse.startY = e.clientY - containerRect.top
  mouse.offsetX = (e.clientX - containerRect.left) - selection.x
  mouse.offsetY = (e.clientY - containerRect.top) - selection.y
}

// 手柄鼠标按下
function onHandleMouseDown(e: MouseEvent, handle: string) {
  e.preventDefault()
  e.stopPropagation()
  if (!containerRef.value) return

  const containerRect = containerRef.value.getBoundingClientRect()

  isResizing.value = true
  resizeHandle.value = handle
  mouse.startX = e.clientX - containerRect.left
  mouse.startY = e.clientY - containerRect.top
}

// 拖拽选择区域
function dragSelection(e: MouseEvent) {
  if (!containerRef.value) return

  const containerRect = containerRef.value.getBoundingClientRect()
  const relativeX = e.clientX - containerRect.left
  const relativeY = e.clientY - containerRect.top
  const newX = relativeX - mouse.offsetX
  const newY = relativeY - mouse.offsetY

  // 限制在容器范围内
  const maxX = containerRect.width - selection.width
  const maxY = containerRect.height - selection.height

  selection.x = Math.max(0, Math.min(maxX, newX))
  selection.y = Math.max(0, Math.min(maxY, newY))
}

// 调整选择区域大小
function resizeSelection(e: MouseEvent) {
  if (!containerRef.value) return

  const containerRect = containerRef.value.getBoundingClientRect()
  const currentX = e.clientX - containerRect.left
  const currentY = e.clientY - containerRect.top
  const deltaX = currentX - mouse.startX
  const deltaY = currentY - mouse.startY

  const handle = resizeHandle.value
  let newX = selection.x
  let newY = selection.y
  let newWidth = selection.width
  let newHeight = selection.height

  if (handle.includes('n')) {
    newY += deltaY
    newHeight -= deltaY
  }
  if (handle.includes('s')) {
    newHeight += deltaY
  }
  if (handle.includes('w')) {
    newX += deltaX
    newWidth -= deltaX
  }
  if (handle.includes('e')) {
    newWidth += deltaX
  }

  // 确保最小尺寸
  if (newWidth < 20) {
    if (handle.includes('w')) {
      newX = selection.x + selection.width - 20
    }
    newWidth = 20
  }
  if (newHeight < 20) {
    if (handle.includes('n')) {
      newY = selection.y + selection.height - 20
    }
    newHeight = 20
  }

  // 确保不超出边界
  if (containerRef.value) {
    const containerRect = containerRef.value.getBoundingClientRect()
    newX = Math.max(0, Math.min(containerRect.width - newWidth, newX))
    newY = Math.max(0, Math.min(containerRect.height - newHeight, newY))
  }

  selection.x = newX
  selection.y = newY
  selection.width = newWidth
  selection.height = newHeight

  mouse.startX = currentX
  mouse.startY = currentY
}

// ==================== 方法 ====================
// 获取裁剪区域
function getCropArea(): CropArea | null {
  if (!showSelection.value || !imageRef.value) return null

  const imageRect = imageRef.value.getBoundingClientRect()
  const scaleX = imageRef.value.naturalWidth / imageRect.width
  const scaleY = imageRef.value.naturalHeight / imageRect.height

  return {
    x: Math.round((selection.x - imageRect.left) * scaleX),
    y: Math.round((selection.y - imageRect.top) * scaleY),
    width: Math.round(selection.width * scaleX),
    height: Math.round(selection.height * scaleY)
  }
}

// 裁剪图片
function cropImage(imageData: string, cropArea: CropArea): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = cropArea.width
      canvas.height = cropArea.height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('无法创建canvas上下文'))
        return
      }

      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      )

      const croppedDataURL = canvas.toDataURL('image/png', 1.0)
      resolve(croppedDataURL)
    }

    img.onerror = () => {
      reject(new Error('图片加载失败'))
    }

    img.src = imageData
  })
}

// 复制裁剪区域到剪切板
async function copyCrop() {
  const cropArea = getCropArea()
  if (!cropArea) {
    alert('请先选择要复制的区域')
    return
  }

  try {
    const croppedImageData = await cropImage(screenshotData.value, cropArea)

    // 复制到剪切板
    await ipcRenderer.invoke('copy-to-clipboard', croppedImageData)

    // 注意：这里不显示alert，因为主进程会处理剪切板复制并关闭窗口
  } catch (error) {
    console.error('复制失败:', error)
    alert('复制失败: ' + (error as Error).message)
  }
}

// 下载裁剪区域
async function downloadCrop() {
  const cropArea = getCropArea()
  if (!cropArea) {
    alert('请先选择要下载的区域')
    return
  }

  try {
    const croppedImageData = await cropImage(screenshotData.value, cropArea)

    // 创建下载链接
    const link = document.createElement('a')
    link.download = `screenshot-${Date.now()}.png`
    link.href = croppedImageData
    link.click()

    // alert('下载成功')
  } catch (error) {
    console.error('下载失败:', error)
    // alert('下载失败: ' + (error as Error).message)
  }
}

// 固定到屏幕
async function pinToScreen() {
  const cropArea = getCropArea()
  if (!cropArea) {
    alert('请先选择要固定的区域')
    return
  }

  try {
    const croppedImageData = await cropImage(screenshotData.value, cropArea)

    // 通过IPC固定到屏幕
    await ipcRenderer.invoke('crop-and-pin', {
      imageData: croppedImageData,
      cropArea: cropArea
    })
  } catch (error) {
    console.error('固定失败:', error)
    alert('固定失败: ' + (error as Error).message)
  }
}

// 关闭窗口
function closeWindow() {
  ipcRenderer.invoke('close-crop-window')
}

// 键盘事件处理
function handleKeyboard(e: KeyboardEvent) {
  switch (e.key) {
    case 'Escape':
      closeWindow()
      break
    case 'c':
      if (e.ctrlKey || e.shiftKey) {
        e.preventDefault()
        copyCrop()
      }
      break
    case 's':
      if (e.ctrlKey) {
        e.preventDefault()
        downloadCrop()
      }
      break
    case 't':
      if (e.ctrlKey) {
        e.preventDefault()
        pinToScreen()
      }
      break
  }
}

// 鼠标事件处理
function handleMouseDown(e: MouseEvent) {
  if (e.target === containerRef.value || e.target === imageRef.value) {
    startSelection(e)
  }
}

function handleMouseMove(e: MouseEvent) {
  updateSelection(e)
}

function handleMouseUp() {
  endSelection()
}

// ==================== 生命周期 ====================
onMounted(() => {
  // 监听屏幕信息和截图数据
  ipcRenderer.on('screen-info', (_event: any, data: ScreenInfo) => {
    screenInfo.value = data
    // 直接使用传递过来的截图数据
    if (data.screenshotData) {
      setScreenshotData(data.screenshotData)
    }
  })

  // 绑定事件
  document.addEventListener('keydown', handleKeyboard)
  document.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  // 清理事件
  document.removeEventListener('keydown', handleKeyboard)
  document.removeEventListener('mousedown', handleMouseDown)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<style scoped>
@import "@/style.css";

/* 调整手柄的特殊位置样式 - 无法用 TailwindCSS 表达的样式 */
.nw {
  top: -6px;
  left: -6px;
  cursor: nw-resize;
}

.ne {
  top: -6px;
  right: -6px;
  cursor: ne-resize;
}

.sw {
  bottom: -6px;
  left: -6px;
  cursor: sw-resize;
}

.se {
  bottom: -6px;
  right: -6px;
  cursor: se-resize;
}

.n {
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  cursor: n-resize;
}

.s {
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  cursor: s-resize;
}

.w {
  top: 50%;
  left: -6px;
  transform: translateY(-50%);
  cursor: w-resize;
}

.e {
  top: 50%;
  right: -6px;
  transform: translateY(-50%);
  cursor: e-resize;
}
</style>
