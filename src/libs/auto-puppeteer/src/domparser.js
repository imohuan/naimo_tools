const cheerio = require('cheerio');


/**
 * 根据配置对象从 HTML 中提取数据
 * @param {object[]} config - 配置数组
 * @param {string} html - HTML 字符串
 * @param {object} [root=null] - 递归调用时的根节点
 * @returns {object|array} 解析后的数据
 */
function parseHtmlByConfig(config, html, root = null) {
  const $ = root ? root : cheerio.load(html);

  if (!Array.isArray(config)) {
    return parseNode(config, $, root);
  }

  const result = {};

  config.forEach(cfg => {
    result[cfg.name] = parseNode(cfg, $, root);
  });

  return result;
}

/**
 * 辅助函数，用于从 Cheerio 节点中提取并处理单个值
 * @param {object} node - 要处理的 Cheerio 节点。
 * @param {string} funcName - 要应用的函数名称（例如 'text'、'attr'）。
 * @param {string} attrName - 'attr' 函数对应的属性名称。
 * @param {function} processFn - 配置中可选的后处理函数。
 * @returns {any} 提取和处理后的值。
 */
function processValue(node, funcName, attrName, processFn) {
  let value = null;
  switch (funcName) {
    case 'text':
      value = node.text().trim();
      break;
    case 'attr':
      value = attrName ? node.attr(attrName) : null;
      break;
    case 'html':
      value = node.html();
      break;
    default:
      value = null;
  }

  if (processFn && typeof processFn === 'function') {
    return processFn(value);
  }
  return value;
}

/**
 * 解析单个配置节点
 * @param {object} cfg - 单个配置对象
 * @param {object} $ - Cheerio 实例
 * @param {object} [root=null] - 递归调用时的根节点
 * @returns {any} 解析后的数据
 */
function parseNode(cfg, $, root = null) {
  const selector = cfg.cls;

  let pureSelector = '';
  let funcStr = '';
  let node = null;
  const isBatch = selector.startsWith('@');

  // 处理 | 分隔符，实现或关系
  const selectors = selector.replace('@', '').split('|').map(s => s.trim());

  for (const s of selectors) {
    // 分离纯粹的选择器和函数
    const parts = s.split('::');
    pureSelector = parts[0];
    funcStr = parts[1] || '';

    // 处理特殊选择器 ^，表示根节点
    if (root && pureSelector === '^') {
      node = root;
    } else {
      node = $(pureSelector, root);
    }

    if (node.length > 0) {
      break; // 找到匹配项，跳出循环
    }
  }

  // 如果有子节点配置，且匹配到了多于一个的元素，则递归处理
  if (cfg.children && node && node.length > 0) {
    const list = [];
    node.each((i, el) => {
      const childData = {};
      cfg.children.forEach(childCfg => {
        childData[childCfg.name] = parseNode(childCfg, $, $(el));
      });
      list.push(childData);
    });
    return list;
  }

  // 如果没有匹配到节点，返回 null
  if (!node || !node.length) {
    return null;
  }

  // 执行函数
  if (funcStr) {
    const funcName = funcStr.split('(')[0];
    const attrMatch = funcStr.match(/\(([^)]+)\)/);
    const attrName = attrMatch ? attrMatch[1].replace(/['"]/g, '') : null;

    if (isBatch) {
      const results = [];
      node.each((i, el) => {
        results.push(processValue($(el), funcName, attrName, cfg.process));
      });
      return results;
    } else {
      return processValue(node, funcName, attrName, cfg.process);
    }
  }

  // 如果没有函数，返回 Cheerio 节点本身
  return node;
}


function test() {
  // 示例 HTML
  const html = `
  <div class="user-info">
    <a href="/profile/123" class="age-link">25</a>
  </div>
  <ul class="items-list">
    <li><span class="item-name">苹果</span><span class="price">5元</span></li>
    <li><span class="item-name">香蕉</span><span class="price">3元</span></li>
  </ul>
`;

  // 示例配置
  const config = [
    {
      name: 'age',
      cls: '.age-link::attr(href)',
      // 后处理函数，提取href中的数字
      process: (value) => value ? parseInt(value.replace('/profile/', ''), 10) : null
    },
    {
      name: 'list',
      cls: 'ul.items-list li',
      children: [
        {
          name: 'item',
          cls: '.item-name::text'
        },
        {
          name: 'price',
          cls: '.price::text',
          // 后处理函数，移除'元'并转换为数字
          process: (value) => value ? parseFloat(value.replace('元', '')) : null
        }
      ]
    },
    {
      name: 'firstItemText',
      cls: '.items-list li:first-child::text'
    },
    {
      name: 'nonExistent',
      cls: '.non-existent-class::text | a.age-link::text'
    },
    {
      name: 'allItemNames',
      cls: '@.item-name::text' // 使用 @ 批量获取
    },
    {
      name: 'allPrices',
      cls: '@.price::text',
      // 批量后处理函数，移除'元'并转换为数字
      process: (value) => value ? parseFloat(value.replace('元', '')) : null
    }
  ];

  // 执行解析
  const data = parseHtmlByConfig(config, html);

  console.log(JSON.stringify(data, null, 2));

  /*
    输出结果:
    {
      "age": 123,
      "list": [
        {
          "item": "苹果",
          "price": 5
        },
        {
          "item": "香蕉",
          "price": 3
        }
      ],
      "firstItemText": "苹果",
      "nonExistent": "25",
      "allItemNames": [
        "苹果",
        "香蕉"
      ],
      "allPrices": [
        5,
        3
      ]
    }
  */

}


function test2() {
  const html = `
      <html><head></head><body><div><li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss47836?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="//i0.hdslb.com/bfs/bangumi/image/07a4ec8e2a95558a99859e1e374fe4b634e47aaf.png@320w_428h.webp" lazy="loaded" class=""></div> <div class="shadow">1708.5万追番</div> <span class="corner-tag badge_0" style="background-color: rgb(251, 114, 153);">大会员</span></a> <a href="//www.bilibili.com/bangumi/play/ss47836?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">鬼灭之刃 柱训练篇</a> <p class="pub-info">全8话</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss44860?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="//i0.hdslb.com/bfs/bangumi/image/6806055cb3a313ff70bb57f899ef49189e5d4c42.png@320w_428h.webp" lazy="loaded" class=""></div> <div class="shadow">1598.7万追番</div> <span class="corner-tag badge_1" style="background-color: rgb(0, 192, 255);">独家</span></a> <a href="//www.bilibili.com/bangumi/play/ss44860?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">鬼灭之刃 刀匠村篇</a> <p class="pub-info">全13话</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss39433?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="//i0.hdslb.com/bfs/bangumi/image/f641f81aa1933d73c91d5ef76b525acbcdbcf3e7.png@320w_428h.webp" lazy="loaded" class=""></div> <div class="shadow">1443.5万追番</div> <span class="corner-tag badge_1" style="background-color: rgb(0, 192, 255);">独家</span></a> <a href="//www.bilibili.com/bangumi/play/ss39433?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">鬼灭之刃 游郭篇</a> <p class="pub-info">全11话</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss39444?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="//i0.hdslb.com/bfs/bangumi/image/7c100a22fe2e48c6eb9a739b4ed2999dd401dc8b.png@320w_428h.webp" lazy="loaded" class=""></div> <div class="shadow">1377.2万追番</div> <span class="corner-tag badge_1" style="background-color: rgb(0, 192, 255);">独家</span></a> <a href="//www.bilibili.com/bangumi/play/ss39444?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">鬼灭之刃 无限列车篇</a> <p class="pub-info">全7话</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss26801?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="//i0.hdslb.com/bfs/bangumi/image/4179b4398bad6f92e876e352cae21be7b8ceb8bf.png@320w_428h.webp" lazy="loaded" class=""></div> <div class="shadow">1360.1万追番</div> <span class="corner-tag badge_1" style="background-color: rgb(0, 192, 255);">独家</span></a> <a href="//www.bilibili.com/bangumi/play/ss26801?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">鬼灭之刃</a> <p class="pub-info">全26话</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss48001?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="//i0.hdslb.com/bfs/bangumi/image/0082a5c243151ef989439578e745785268c58e7d.png@320w_428h.webp" lazy="loaded" class=""></div> <div class="shadow">1354.5万追番</div> <span class="corner-tag badge_0" style="background-color: rgb(251, 114, 153);">大会员</span></a> <a href="//www.bilibili.com/bangumi/play/ss48001?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">剧场版 咒术回战 0</a> <p class="pub-info">全1话</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss34430?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="//i0.hdslb.com/bfs/bangumi/image/91e9534cc55aa1a6dc959e7d6d33bde970208232.png@320w_428h.webp" lazy="loaded" class=""></div> <div class="shadow">1324.5万追番</div> <span class="corner-tag badge_0" style="background-color: rgb(251, 114, 153);">大会员</span></a> <a href="//www.bilibili.com/bangumi/play/ss34430?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">咒术回战</a> <p class="pub-info">全24话</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss45574?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="//i0.hdslb.com/bfs/bangumi/image/69683aa3df3dbfc946afc0526296e8c80dfdfed3.png@320w_428h.webp" lazy="loaded" class=""></div> <div class="shadow">1292.3万追番</div> <span class="corner-tag badge_0" style="background-color: rgb(251, 114, 153);">大会员</span></a> <a href="//www.bilibili.com/bangumi/play/ss45574?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">咒术回战 第二季</a> <p class="pub-info">全23话</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss41410?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="//i0.hdslb.com/bfs/bangumi/image/f50a08cc1562f2c1e933b656c00db3fcafd110e9.png@320w_428h.webp" lazy="loaded" class=""></div> <div class="shadow">1282.5万追番</div> <span class="corner-tag badge_0" style="background-color: rgb(251, 114, 153);">大会员</span></a> <a href="//www.bilibili.com/bangumi/play/ss41410?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">间谍过家家</a> <p class="pub-info">全25话</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss46085?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="//i0.hdslb.com/bfs/bangumi/image/a524567f86ec21368731f6dc283f66bd1bd0af92.png@320w_428h.webp" lazy="loaded" class=""></div> <div class="shadow">1256万追番</div> <span class="corner-tag badge_0" style="background-color: rgb(251, 114, 153);">大会员</span></a> <a href="//www.bilibili.com/bangumi/play/ss46085?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">间谍过家家 第二季</a> <p class="pub-info">全12话</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss48852?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="//i0.hdslb.com/bfs/bangumi/image/9c716a761afd055e6b65c96aac7880d2a960dd0b.png@320w_428h.webp" lazy="loaded" class=""></div> <div class="shadow">1048.1万追番</div> <span class="corner-tag badge_0" style="background-color: rgb(251, 114, 153);">大会员</span></a> <a href="//www.bilibili.com/bangumi/play/ss48852?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">关于我转生变成史莱姆这档事 第三季</a> <p class="pub-info">全24话</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss44864?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="//i0.hdslb.com/bfs/bangumi/image/9c730181da9d1e56c1ac6c345380ae619d781420.png@320w_428h.webp" lazy="loaded" class=""></div> <div class="shadow">967万追番</div> <span class="corner-tag badge_1" style="background-color: rgb(0, 192, 255);">独家</span></a> <a href="//www.bilibili.com/bangumi/play/ss44864?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">辉夜大小姐想让我告白 剧场版</a> <p class="pub-info"></p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss21542?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="//i0.hdslb.com/bfs/bangumi/image/6565f297b31fb4a4a0337557033426930c3b88c0.png@320w_428h.webp" lazy="loaded" class=""></div> <div class="shadow">960.7万追番</div> <span class="corner-tag badge_1" style="background-color: rgb(0, 192, 255);">独家</span></a> <a href="//www.bilibili.com/bangumi/play/ss21542?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">紫罗兰永恒花园</a> <p class="pub-info">全14话</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss47794?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="//i0.hdslb.com/bfs/bangumi/image/db3f15b8e5a9eb21890447745ce1c8215a985d52.png@320w_428h.webp" lazy="loaded" class=""></div> <div class="shadow">957.5万追番</div> <span class="corner-tag badge_0" style="background-color: rgb(251, 114, 153);">大会员</span></a> <a href="//www.bilibili.com/bangumi/play/ss47794?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">间谍过家家 第二季 中配版</a> <p class="pub-info">全12话</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss43622?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="//i0.hdslb.com/bfs/bangumi/image/b35f2f8e9a445e1b7d1db1e9053ea0f70bd35527.png@320w_428h.webp" lazy="loaded" class=""></div> <div class="shadow">946万追番</div> <span class="corner-tag badge_0" style="background-color: rgb(251, 114, 153);">大会员</span></a> <a href="//www.bilibili.com/bangumi/play/ss43622?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">间谍过家家 中配版</a> <p class="pub-info">全25话</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss41411?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="//i0.hdslb.com/bfs/bangumi/image/ffe6ebdf6770e7975bf830bee73a03c79e81b690.png@320w_428h.webp" lazy="loaded" class=""></div> <div class="shadow">941.1万追番</div> <span class="corner-tag badge_1" style="background-color: rgb(0, 192, 255);">独家</span></a> <a href="//www.bilibili.com/bangumi/play/ss41411?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">辉夜大小姐想让我告白 -究极浪漫-</a> <p class="pub-info">全13话</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss36170?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="" class=""></div> <div class="shadow">919.6万追番</div> <span class="corner-tag badge_0" style="background-color: rgb(251, 114, 153);">大会员</span></a> <a href="//www.bilibili.com/bangumi/play/ss36170?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">关于我转生变成史莱姆这档事 第二季</a> <p class="pub-info">全26话</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss38939?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="" class=""></div> <div class="shadow">901.4万追剧</div> <span class="corner-tag badge_1" style="background-color: rgb(0, 192, 255);">独家</span></a> <a href="//www.bilibili.com/bangumi/play/ss38939?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">工作细胞：细胞大作战</a> <p class="pub-info">2021年4月9日上映</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss43056?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="" class=""></div> <div class="shadow">894.6万追番</div> <span class="corner-tag badge_0" style="background-color: rgb(251, 114, 153);">大会员</span></a> <a href="//www.bilibili.com/bangumi/play/ss43056?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">间谍过家家 粤配版</a> <p class="pub-info">全25话</p></li>
<li class="bangumi-item selected-element" style=""><a href="//www.bilibili.com/bangumi/play/ss39462?from_spmid=666.14.0.0" target="_blank" class="cover-wrapper"><div class="common-lazy-img"><img alt="" src="" class=""></div> <div class="shadow">891.1万追番</div> <span class="corner-tag badge_1" style="background-color: rgb(0, 192, 255);">独家</span></a> <a href="//www.bilibili.com/bangumi/play/ss39462?from_spmid=666.14.0.0" target="_blank" class="bangumi-title">国王排名</a> <p class="pub-info">全23话</p></li></div></body></html>
      `;

  // 示例配置
  const config = {
    "cls": "@.bangumi-item",
    "children": [
      {
        "name": "coverImageUrl",
        "cls": "div.common-lazy-img img::attr(src)",
        "desc": "封面图片URL"
      },
      {
        "name": "followersCount",
        "cls": "div.shadow::text",
        "desc": "追番人数"
      },
      {
        "name": "badgeText",
        "cls": "span.corner-tag::text",
        "desc": "角标文本（如大会员）"
      },
      {
        "name": "badgeBackgroundColor",
        "cls": "span.corner-tag::attr(style)",
        "desc": "角标背景颜色样式"
      },
      {
        "name": "title",
        "cls": "a.bangumi-title::text",
        "desc": "番剧的标题"
      },
      {
        "name": "link",
        "cls": "a.bangumi-title::attr(href)",
        "desc": "番剧的链接"
      },
      {
        "name": "pubInfo",
        "cls": "p.pub-info::text",
        "desc": "发布信息（如全8话）"
      }
    ]
  }

  const data = parseHtmlByConfig(config, html);
  console.log(JSON.stringify(data, null, 2));
}

console.log(test2());


module.exports = parseHtmlByConfig