/* =========================================================
 * 爆款总结 · 季节知识库 + 小红书真实搜索词
 * 暴露全局 SEASONAL，供「爆款总结」tab 读取。
 * - styleIds/keywords/tip：季节趋势知识参考（基于内置 14 款 + 美甲经验）
 * - searchKw：去小红书抓「当月/当季真实爆款」用的主题词（每月不同，避免图雷同）
 * 样式 id 必须能在 data.js 的 STYLES 里找到。
 * ========================================================= */

const SEASONAL = {
  /* 月份（键为 1-12），每月给出：主题 / 推荐款式(知识参考) / 真实搜索词 / 运营提示 */
  MONTHS: {
    '1': {
      name: '1月 · 隆冬新年',
      theme: '红金香槟 · 新年主场',
      styleIds: ['velvet-snow', 'blush-glitter', 'chrome-french', 'maillard-blur', 'galaxy-cateye', 'matte-nude'],
      keywords: ['新年美甲', '春节美甲红', '显白美甲', '聚会美甲', '香槟金美甲'],
      searchKw: ['新年美甲', '春节美甲红'],
      tip: '红金 / 香槟色 + 闪片是新年绝对主场；雪花绒毛甲的圣诞余温可延续到元旦。主推「显白 + 有年味」的款，客人拍照发圈意愿最强。'
    },
    '2': {
      name: '2月 · 冬末情人节',
      theme: '甜蜜粉调 · 爱心约会',
      styleIds: ['bow-cream', 'blush-glitter', 'pearl-moon', 'chrome-french', 'velvet-snow', 'galaxy-cateye'],
      keywords: ['情人节美甲', '爱心美甲', '甜美美甲', '新年美甲', '粉色显白'],
      searchKw: ['情人节美甲', '爱心美甲'],
      tip: '蝴蝶结、爆闪钻、贝母是情人节三组 safest bet。可上「情侣款 / 闺蜜款」组合，提高客单价。'
    },
    '3': {
      name: '3月 · 早春',
      theme: '樱花温柔 · 通勤回春',
      styleIds: ['bow-cream', 'pearl-moon', 'chrome-french', 'micro-french', 'matte-nude', 'jelly-ice'],
      keywords: ['樱花美甲', '春天美甲', '通勤美甲', '显白', '温柔风'],
      searchKw: ['樱花美甲', '春天美甲'],
      tip: '3 月是「全年款 + 初春甜美」的过渡。奶油粉、贝母、裸色法式最易被上班族接受，翻台快。'
    },
    '4': {
      name: '4月 · 春',
      theme: '清透约会 · 春日氛围',
      styleIds: ['pearl-moon', 'bow-cream', 'jelly-ice', 'chrome-french', 'micro-french', 'matte-nude'],
      keywords: ['春日美甲', '约会美甲', '清透美甲', '温柔', '珍珠美甲'],
      searchKw: ['春日美甲', '清透美甲'],
      tip: '清明踏青 + 春游场景，透色果冻和贝母开始起量。强调「自然光下好看」的拍摄点。'
    },
    '5': {
      name: '5月 · 春夏之交',
      theme: '果冻清凉 · 五一出游',
      styleIds: ['jelly-ice', 'bow-cream', 'pearl-moon', 'bubble-glass', 'chrome-french', 'blush-glitter'],
      keywords: ['五一美甲', '果冻美甲', '清凉美甲', '出游美甲', '透明感'],
      searchKw: ['五一美甲', '果冻美甲'],
      tip: '五一前后果冻甲搜索量明显抬头，建议 4 月底前铺好果冻透色胶。出游场景主推「冰透 + 极光」组合。'
    },
    '6': {
      name: '6月 · 盛夏毕业',
      theme: '冰透毕业 · 夏日元气',
      styleIds: ['jelly-ice', 'bubble-glass', 'chrome-french', 'micro-french', 'wear-butterfly', 'bow-cream'],
      keywords: ['毕业美甲', '冰透果冻', '夏天美甲', '清透', '穿戴甲'],
      searchKw: ['毕业美甲', '冰透果冻美甲'],
      tip: '毕业季 + 暑期前，穿戴甲（蝶翼镭射）是增长最猛的品类，适合做可售卖成品。冰透果冻是夏天的流量款。'
    },
    '7': {
      name: '7月 · 盛夏',
      theme: '抢眼 Y2K · 海岛度假',
      styleIds: ['bubble-glass', 'jelly-ice', 'wear-butterfly', 'blush-glitter', 'galaxy-cateye', 'chrome-french'],
      keywords: ['夏季美甲', '度假美甲', '极光玻璃甲', 'Y2K美甲', '爆闪'],
      searchKw: ['夏季美甲', '极光玻璃甲'],
      tip: '暑期度假场景，视频里「转动会变色」的玻璃甲、爆闪钻完播率最高。可主推抖音向的抢眼款。'
    },
    '8': {
      name: '8月 · 盛夏',
      theme: '清凉爆闪 · 海岛风',
      styleIds: ['jelly-ice', 'bubble-glass', 'blush-glitter', 'galaxy-cateye', 'wear-butterfly', 'bow-cream'],
      keywords: ['夏天美甲', '爆闪美甲', '清凉', '海岛美甲', '极光'],
      searchKw: ['爆闪美甲', '海岛度假美甲'],
      tip: '高温天客人偏好「看起来凉快」的透色。果冻 + 玻璃纸组合复购高，注意备足果冻透色胶。'
    },
    '9': {
      name: '9月 · 初秋',
      theme: '美拉德 · 开学高级感',
      styleIds: ['maillard-blur', 'sand-cateye', 'bubble-glass', 'chrome-french', 'matte-nude', 'jelly-ice'],
      keywords: ['美拉德美甲', '开学美甲', '初秋美甲', '焦糖', '高级感'],
      searchKw: ['美拉德美甲', '初秋美甲'],
      tip: '9 月是「夏末清凉 → 初秋大地色」的拐点。美拉德晕染、流沙猫眼开始起量，磨砂封层需求回升。'
    },
    '10': {
      name: '10月 · 深秋',
      theme: '焦糖高级 · 万圣暗调',
      styleIds: ['maillard-blur', 'sand-cateye', 'galaxy-cateye', 'chrome-french', 'matte-nude', 'bubble-glass'],
      keywords: ['焦糖美甲', '万圣美甲', '高级感美甲', '大地色', '猫眼'],
      searchKw: ['万圣美甲', '焦糖美甲'],
      tip: '国庆 + 万圣双节点。焦糖晕染、深色猫眼是暗调高级感主力；可加少量万圣元素做限时款。'
    },
    '11': {
      name: '11月 · 秋冬双11',
      theme: '猫眼磨砂 · 双11囤货',
      styleIds: ['sand-cateye', 'galaxy-cateye', 'maillard-blur', 'matte-nude', 'wear-butterfly', 'blush-glitter'],
      keywords: ['双11美甲', '猫眼美甲', '磨砂美甲', '显白', '穿戴甲'],
      searchKw: ['猫眼美甲', '磨砂美甲'],
      tip: '双 11 是电商选品关键节点：猫眼胶 + 磨砂封层捆绑、甲片果冻胶包装盒三件套是刚需。门店主推哑光猫眼（蓝海词）。'
    },
    '12': {
      name: '12月 · 隆冬圣诞',
      theme: '圣诞绒毛 · 新年预热',
      styleIds: ['velvet-snow', 'blush-glitter', 'sand-cateye', 'chrome-french', 'wear-butterfly', 'galaxy-cateye'],
      keywords: ['圣诞美甲', '雪花美甲', '新年美甲', '节日美甲', '绒毛'],
      searchKw: ['圣诞美甲', '新年美甲红金'],
      tip: '圣诞 + 元旦双节，绒毛甲、闪片钻、镜面法式是节日三件套。12 月中旬后主推「新年红金」预热元旦。'
    }
  },

  /* 季度（键为 Q1-Q4），searchKw 取当季代表主题，去重抓真实爆款 */
  QUARTERS: {
    'Q1': {
      name: 'Q1 · 1-3月',
      theme: '新年红金 + 早春樱花',
      styleIds: ['velvet-snow', 'bow-cream', 'blush-glitter', 'chrome-french', 'pearl-moon', 'galaxy-cateye', 'matte-nude'],
      searchKw: ['新年美甲', '樱花美甲'],
      tip: '节日（新年 / 情人节）与早春温柔并行。红金闪片 + 奶油甜美是主线，通勤裸色法式兜底翻台。'
    },
    'Q2': {
      name: 'Q2 · 4-6月',
      theme: '春樱 → 盛夏冰透',
      styleIds: ['bow-cream', 'jelly-ice', 'pearl-moon', 'bubble-glass', 'chrome-french', 'wear-butterfly'],
      searchKw: ['果冻美甲', '毕业美甲'],
      tip: '从春樱甜美过渡到盛夏清透。果冻、贝母、玻璃纸是核心，毕业季叠加穿戴甲爆量。'
    },
    'Q3': {
      name: 'Q3 · 7-9月',
      theme: '盛夏抢眼 + 初秋美拉德',
      styleIds: ['bubble-glass', 'jelly-ice', 'blush-glitter', 'maillard-blur', 'galaxy-cateye', 'wear-butterfly'],
      searchKw: ['夏季美甲', '美拉德美甲'],
      tip: '盛夏以「玻璃 / 爆闪 / 极光」抢眼款冲流量，9 月用美拉德晕染、流沙猫眼承接初秋高级感需求。'
    },
    'Q4': {
      name: 'Q4 · 10-12月',
      theme: '秋冬三件套 + 节日闪片',
      styleIds: ['maillard-blur', 'sand-cateye', 'velvet-snow', 'galaxy-cateye', 'blush-glitter', 'chrome-french'],
      searchKw: ['万圣美甲', '圣诞美甲'],
      tip: '焦糖晕染 + 哑光猫眼 + 磨砂封层的「秋冬三件套」贯穿全季；双 11 电商囤货 + 圣诞元旦节日闪片绒毛收尾。'
    }
  },

  /* 全年常青款（任何月份都可接，作兜底推荐） */
  EVERGREEN: ['chrome-french', 'micro-french', 'matte-nude', 'blush-glitter', 'galaxy-cateye', 'wear-butterfly', 'jp-line'],

  /* 每日自动抓取的种子关键词（已被 searchKw 逻辑取代，保留向下兼容） */
  DAILY_KEYWORDS: ['美甲', '猫眼美甲', '穿戴甲', '法式美甲', '短甲美甲', '显白美甲', '新娘美甲', '圣诞美甲']
};

if (typeof module !== 'undefined') module.exports = SEASONAL;
