import { PinyinSearch } from './pinyin-search'

/**
 * 拼音搜索测试函数
 * 可以在浏览器控制台中调用进行测试
 */
export function testPinyinSearch() {
  console.log('🧪 开始测试拼音搜索功能...')

  const testCases = [
    // 中文测试
    { text: '微信', query: 'weixin', expected: true },
    { text: '微信', query: 'wx', expected: true },
    { text: '微信', query: '微信', expected: true },
    { text: '微信', query: 'weix', expected: true },

    // 英文测试
    { text: 'Chrome', query: 'chrome', expected: true },
    { text: 'Chrome', query: 'ch', expected: true },
    { text: 'Chrome', query: 'Chrome', expected: true },

    // 中英文混合测试
    { text: 'VS Code', query: 'vs', expected: true },
    { text: 'VS Code', query: 'code', expected: true },
    { text: 'VS Code', query: 'vscode', expected: true },

    // 拼音首字母测试
    { text: '百度网盘', query: 'bdwp', expected: true },
    { text: '百度网盘', query: 'baidu', expected: true },
    { text: '百度网盘', query: 'wangpan', expected: true },
    { text: '百度网盘', query: 'bd', expected: true },

    // 更多中文测试
    { text: '腾讯QQ', query: 'tengxun', expected: true },
    { text: '腾讯QQ', query: 'tx', expected: true },
    { text: '腾讯QQ', query: 'qq', expected: true },
    { text: '网易云音乐', query: 'wangyi', expected: true },
    { text: '网易云音乐', query: 'wy', expected: true },
    { text: '网易云音乐', query: 'yinyue', expected: true },

    // 不匹配测试
    { text: '微信', query: 'qq', expected: false },
    { text: 'Chrome', query: 'firefox', expected: false },
    { text: '百度网盘', query: 'alibaba', expected: false },
  ]

  let passed = 0
  let failed = 0

  testCases.forEach((testCase, index) => {
    const result = PinyinSearch.match(testCase.text, testCase.query)
    const success = result === testCase.expected

    if (success) {
      passed++
      console.log(`✅ 测试 ${index + 1}: "${testCase.text}" 匹配 "${testCase.query}" = ${result}`)
    } else {
      failed++
      console.error(`❌ 测试 ${index + 1}: "${testCase.text}" 匹配 "${testCase.query}" = ${result}, 期望 ${testCase.expected}`)

      // 添加调试信息
      console.log(`   📝 调试信息:`)
      console.log(`   - 文本拼音: "${PinyinSearch.getPinyin(testCase.text)}"`)
      console.log(`   - 文本首字母: "${PinyinSearch.getInitials(testCase.text)}"`)
      console.log(`   - 查询拼音: "${PinyinSearch.getPinyin(testCase.query)}"`)
      console.log(`   - 查询首字母: "${PinyinSearch.getInitials(testCase.query)}"`)
    }
  })

  console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`)

  // 显示拼音转换示例
  console.log('\n🔤 拼音转换示例:')
  const examples = ['微信', '百度网盘', 'VS Code', 'Chrome', '腾讯QQ', '网易云音乐']
  examples.forEach(text => {
    console.log(`"${text}" -> 拼音: "${PinyinSearch.getPinyin(text)}", 首字母: "${PinyinSearch.getInitials(text)}"`)
  })

  // 测试 pinyin-pro 库的基本功能
  console.log('\n🧪 测试 pinyin-pro 库基本功能:')
  import('pinyin-pro').then(({ pinyin }) => {
    try {
      const testText = '微信'
      const fullPinyin = pinyin(testText, {
        toneType: 'none',
        type: 'string',
        nonZh: 'consecutive'
      })
      const initials = pinyin(testText, {
        toneType: 'none',
        type: 'string',
        nonZh: 'consecutive',
        pattern: 'first'
      })
      console.log(`✅ pinyin-pro 库工作正常: "${testText}" -> 拼音: "${fullPinyin}", 首字母: "${initials}"`)
    } catch (error) {
      console.error('❌ pinyin-pro 库测试失败:', error)
    }
  }).catch(error => {
    console.error('❌ 导入 pinyin-pro 库失败:', error)
  })

  return { passed, failed, total: testCases.length }
}

// 在开发环境下自动运行测试
if (import.meta.env.DEV) {
  // 延迟执行，确保页面加载完成
  setTimeout(() => {
    console.log('🚀 自动运行拼音搜索测试...')
    testPinyinSearch()
  }, 1000)
}
