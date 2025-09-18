import { ref } from "vue"
import { useEventListener } from "@vueuse/core"

/**
 * 快捷键监听器 Hook
 * 处理快捷键输入监听和按键映射
 */
export function useHotkeyListener() {
  const isListening = ref(false)
  const currentKeys = ref<string[]>([])
  let callback: ((keys: string[]) => void) | null = null

  // 按键映射 - 映射为 hotkeys-js 可识别的格式
  const keyMap: Record<string, string> = {
    Control: "ctrl",
    Meta: "cmd",
    Alt: "alt",
    Shift: "shift",
    " ": "space",
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    Enter: "enter",
    Escape: "esc",
    Backspace: "backspace",
    Delete: "delete",
    Tab: "tab",
    CapsLock: "capslock",
    F1: "f1",
    F2: "f2",
    F3: "f3",
    F4: "f4",
    F5: "f5",
    F6: "f6",
    F7: "f7",
    F8: "f8",
    F9: "f9",
    F10: "f10",
    F11: "f11",
    F12: "f12",
    // 数字键
    "0": "0",
    "1": "1",
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    // 字母键（统一转为小写）
    a: "a",
    A: "a",
    b: "b",
    B: "b",
    c: "c",
    C: "c",
    d: "d",
    D: "d",
    e: "e",
    E: "e",
    f: "f",
    F: "f",
    g: "g",
    G: "g",
    h: "h",
    H: "h",
    i: "i",
    I: "i",
    j: "j",
    J: "j",
    k: "k",
    K: "k",
    l: "l",
    L: "l",
    m: "m",
    M: "m",
    n: "n",
    N: "n",
    o: "o",
    O: "o",
    p: "p",
    P: "p",
    q: "q",
    Q: "q",
    r: "r",
    R: "r",
    s: "s",
    S: "s",
    t: "t",
    T: "t",
    u: "u",
    U: "u",
    v: "v",
    V: "v",
    w: "w",
    W: "w",
    x: "x",
    X: "x",
    y: "y",
    Y: "y",
    z: "z",
    Z: "z",
    // 特殊符号（映射到对应的数字键）
    "!": "1",
    "@": "2",
    "#": "3",
    $: "4",
    "%": "5",
    "^": "6",
    "&": "7",
    "*": "8",
    "(": "9",
    ")": "0",
    _: "-",
    "+": "=",
    "{": "[",
    "}": "]",
    "|": "\\",
    ":": ";",
    '"': "'",
    "<": ",",
    ">": ".",
    "?": "/",
    "~": "`",
  }

  const modifierKeys = ["Control", "Meta", "Alt", "Shift"]

  // 获取当前按下的按键（按正确顺序）
  const getCurrentPressedKeys = (event: KeyboardEvent): string[] => {
    const keys: string[] = []

    // 按顺序添加修饰键
    if (event.ctrlKey) keys.push("ctrl")
    if (event.shiftKey) keys.push("shift")
    if (event.altKey) keys.push("alt")

    // 添加非修饰键（只能有一个）
    const key = event.key
    let normalizedKey = keyMap[key] || key.toLowerCase()

    // 如果按下了 Shift 键，需要特殊处理
    if (event.shiftKey && !modifierKeys.includes(key)) {
      // 对于字母，Shift 会产生大写字母，但我们统一使用小写
      if (key.length === 1 && /[A-Z]/.test(key)) {
        normalizedKey = key.toLowerCase()
      }
      // 对于数字键上的符号，Shift 会产生特殊符号，但 hotkeys-js 需要数字
      else if (key.length === 1 && /[!@#$%^&*()_+{}|:"<>?~]/.test(key)) {
        // 特殊符号已经映射到对应的数字键，保持不变
        normalizedKey = keyMap[key] || key
      }
    }

    // 只有当按键不是修饰键时才添加
    if (!modifierKeys.includes(key)) {
      keys.push(normalizedKey)
    }

    return keys
  }

  // 开始监听快捷键输入
  const startListening = () => {
    isListening.value = true
    currentKeys.value = []
  }

  // 停止监听
  const stopListening = () => {
    isListening.value = false
  }

  // 获取监听结果
  const getListening = (): Promise<string[]> => {
    return new Promise((resolve) => {
      startListening()
      callback = (keys: string[]) => {
        resolve(keys)
        callback = null
      }
    })
  }

  // 清除当前按键
  const clearCurrentKeys = () => {
    currentKeys.value = []
  }

  // 处理按键按下
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isListening.value) return

    event.preventDefault()
    event.stopPropagation()

    const key = event.key

    // 处理特殊按键
    if (key === "Escape") {
      clearCurrentKeys()
      stopListening()
      return
    }

    // 获取当前按下的所有按键
    const pressedKeys = getCurrentPressedKeys(event)
    currentKeys.value = pressedKeys
  }

  // 处理按键松开
  const handleKeyUp = (event: KeyboardEvent) => {
    if (!isListening.value) return

    console.log("KeyUp:", event.key, "code:", event.code)

    // 检查是否所有按键都已松开
    // 对于修饰键，检查对应的属性
    // 对于其他键，检查 event.key 是否在排除列表中
    const hasPressedKeys =
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.metaKey ||
      (event.key &&
        !["Control", "Meta", "Alt", "Shift", " "].includes(event.key) &&
        !modifierKeys.includes(event.key))

    console.log("Has pressed keys:", hasPressedKeys)

    if (!hasPressedKeys) {
      // 所有按键都已松开，停止监听
      console.log("All keys released, calling callback with:", currentKeys.value)
      if (callback) callback([...currentKeys.value])
      clearCurrentKeys()
      stopListening()
    }
  }

  // 使用 useEventListener 管理事件监听
  useEventListener(document, "keydown", handleKeyDown)
  useEventListener(document, "keyup", handleKeyUp)

  return {
    // 状态
    isListening,
    currentKeys,

    // 方法
    getListening,
    startListening,
    stopListening,
    clearCurrentKeys,
  }
}
