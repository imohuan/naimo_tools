/**
 * 文件粘贴处理
 */

const getClipboardText = (item: DataTransferItem): Promise<string> => {
  return new Promise((resolve) => {
    item.getAsString((text: string) => {
      const trimmedText = text.trim()
      resolve(trimmedText || "")
    })
  })
}


export function useFilePaste() {
  const handleFilePaste = async (
    event: ClipboardEvent,
    addFiles: (files: File[]) => Promise<void>
  ) => {
    const items = event.clipboardData?.items
    if (!items) return

    // 第一步：同步检查剪贴板内容类型
    let hasFile = false
    const textItems: DataTransferItem[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file') {
        hasFile = true
      } else if (item.kind === 'string' && item.type === 'text/plain') {
        textItems.push(item)
      }
    }

    // 策略：如果有文件，立即阻止默认行为
    // 如果只有文本，也先阻止，然后根据长度决定如何处理
    if (hasFile || textItems.length > 0) {
      event.preventDefault()
      event.stopPropagation()
    } else {
      return // 没有可处理的内容
    }

    // 第二步：异步处理文件和文本
    const files: File[] = []

    // 处理文件
    if (hasFile) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
      }
      // 有文件时直接处理文件，不处理文本
      await addFiles(files)
      return
    }

    // 处理纯文本内容（只有在没有文件时才执行到这里）
    if (textItems.length > 0) {
      for (const item of textItems) {
        const trimmedText = await getClipboardText(item)

        if (trimmedText.length > 30) {
          // 长文本：转换为文件
          const fileName = trimmedText.slice(0, 10) + '.txt'
          const blob = new Blob([trimmedText], { type: 'text/plain;charset=utf-8' })
          const file = new File([blob], fileName, { type: 'text/plain' })
          files.push(file)
        } else if (trimmedText.length > 0) {
          // 短文本：手动插入到输入框（如果是输入框的话）
          // 获取当前焦点元素
          const target = event.target as HTMLInputElement | HTMLTextAreaElement
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
            const start = target.selectionStart || 0
            const end = target.selectionEnd || 0
            const value = target.value
            target.value = value.slice(0, start) + trimmedText + value.slice(end)
            target.selectionStart = target.selectionEnd = start + trimmedText.length
            // 触发 input 事件，让 Vue 知道值已改变
            target.dispatchEvent(new Event('input', { bubbles: true }))
          }
        }
      }

      // 处理转换的文件
      if (files.length > 0) {
        await addFiles(files)
      }
    }
  }

  return {
    handleFilePaste
  }
}

