/**
 * 根据指定的键（key）对对象数组进行去重
 * * @param {Array<Object>} array - 需要去重的对象数组
 * @param {string} key - 用于判断唯一性的键名（例如 'id'）
 * @returns {Array<Object>} - 去重后的新数组
 */
export function uniqueArrayByProperty(array: any[], key: string) {
  // 使用 Map 存储已遇到的唯一值。
  // Map 的键是唯一的 key 值（例如 id），值是完整的对象。
  const map = new Map();

  for (const item of array) {
    // 假设 'id' 是唯一标识符
    const uniqueValue = item[key];

    // 如果 Map 中没有这个 uniqueValue，就将当前对象添加到 Map 中。
    // Map 的特性保证了后续遇到的相同 uniqueValue 将不会覆盖第一个。
    // 如果你需要保留最后出现的对象，可以使用 map.set(uniqueValue, item) 无论是否已存在。
    if (!map.has(uniqueValue)) {
      map.set(uniqueValue, item);
    }
  }

  // Map.values() 返回一个包含 Map 中所有值的迭代器。
  // Array.from() 将这个迭代器转换为数组，即去重后的结果。
  return Array.from(map.values());
}
