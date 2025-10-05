/**
 * 文件粘贴处理
 */

export function useFilePaste() {
  const handleFilePaste = async (
    event: ClipboardEvent,
    addFiles: (files: File[]) => Promise<void>
  ) => {
    const items = event.clipboardData?.items
    if (!items) return

    const files: File[] = []
    let hasTextContent = false

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) files.push(file)
      } else if (item.kind === 'string' && item.type === 'text/plain') {
        hasTextContent = true
        item.getAsString((text: string) => {
          const trimmedText = text.trim()
          if (trimmedText.length > 30) {
            const fileName = trimmedText.slice(0, 10) + '.txt'
            const blob = new Blob([trimmedText], { type: 'text/plain;charset=utf-8' })
            const file = new File([blob], fileName, { type: 'text/plain' })
            addFiles([file])
          }
        })
      }
    }

    if (files.length > 0) {
      event.preventDefault()
      await addFiles(files)
    } else if (hasTextContent) {
      event.preventDefault()
    }
  }

  return {
    handleFilePaste
  }
}

