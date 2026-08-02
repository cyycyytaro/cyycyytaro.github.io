/* =========================================================
   美甲爆款工作台 · 数据层
   - MATERIALS: 材料/工具库（零售参考价、1688批发参考价、可用次数）
   - STYLES:    爆款款式库（配色 / 分步教程 / BOM / 拍摄 / 定价）
   价格为 2026 年市场参考区间，用于估算，实际以比价结果为准。
   ========================================================= */

const CATS = {
  base: '基础耗材',
  color: '色料',
  fx: '特效材料',
  deco: '饰品配件',
  tip: '甲片/穿戴',
  tool: '手工具',
  gear: '设备（一次性投入）'
};

/* usesPerUnit = 一件能做多少次美甲（10指为1次），用于摊销单次成本 */
const MATERIALS = {
  prep:    { name: '死皮软化剂 + 钢推棒', spec: '15ml + 单支', cat: 'base', retail: 22,  b2b: 8,   uses: 60,   kw: '死皮软化剂 美甲 钢推' },
  cleanser:{ name: '清洁液 + 无尘棉片',   spec: '100ml + 200片', cat: 'base', retail: 24, b2b: 9,  uses: 100,  kw: '美甲清洁液 无尘棉片' },
  base:    { name: '底胶',                spec: '15ml',   cat: 'base', retail: 28,  b2b: 12,  uses: 80,   kw: '美甲底胶 光疗 免打磨' },
  top:     { name: '光面封层',            spec: '15ml',   cat: 'base', retail: 32,  b2b: 14,  uses: 110,  kw: '美甲封层 免洗 高亮' },
  matte:   { name: '磨砂雾面封层',        spec: '15ml',   cat: 'base', retail: 30,  b2b: 13,  uses: 100,  kw: '磨砂封层 雾面 美甲' },
  armor:   { name: '加固/延长胶',         spec: '30ml',   cat: 'base', retail: 45,  b2b: 19,  uses: 40,   kw: '延长加固甲油胶 可卸' },

  color:   { name: '甲油胶（单色）',       spec: '8ml',    cat: 'color', retail: 15, b2b: 5.5, uses: 80,  kw: '甲油胶 显色 8ml' },
  nude:    { name: '奶油裸色甲油胶',       spec: '8ml',    cat: 'color', retail: 16, b2b: 6,   uses: 80,  kw: '奶茶裸色甲油胶 奶油' },
  whitegel:{ name: '手绘勾线白胶',        spec: '5ml',    cat: 'color', retail: 18, b2b: 7,   uses: 100,  kw: '美甲勾线胶 手绘白胶' },
  jellycol:{ name: '果冻透色胶',          spec: '8ml',    cat: 'color', retail: 17, b2b: 6.5, uses: 70,  kw: '果冻甲油胶 透明感' },

  cateye:  { name: '猫眼胶',              spec: '8ml',    cat: 'fx', retail: 23,  b2b: 9,   uses: 70,   kw: '猫眼甲油胶 磁性' },
  chrome:  { name: '镜面铬粉',            spec: '1g',     cat: 'fx', retail: 20,  b2b: 7,   uses: 150,  kw: '美甲镜面粉 铬粉 摩擦粉' },
  aurora:  { name: '极光/贝壳粉',         spec: '1g',     cat: 'fx', retail: 17,  b2b: 5.5, uses: 150,  kw: '美甲极光粉 贝壳粉 珠光' },
  bloom:   { name: '晕染胶 (Blooming)',   spec: '8ml',    cat: 'fx', retail: 26,  b2b: 11,  uses: 60,   kw: '晕染胶 blooming gel' },
  glitter: { name: '爆闪金葱/亮片胶',      spec: '8ml',    cat: 'fx', retail: 18,  b2b: 6.5, uses: 80,   kw: '美甲亮片胶 爆闪 金葱' },
  velvet:  { name: '雪花绒/绒毛粉',        spec: '5g',     cat: 'fx', retail: 15,  b2b: 5,   uses: 60,   kw: '美甲绒毛粉 雪花绒' },
  bubble:  { name: '气泡/玻璃纸',          spec: '10片',   cat: 'fx', retail: 12,  b2b: 4,   uses: 40,   kw: '美甲玻璃纸 气泡贴 极光膜' },

  foil:    { name: '铝箔纸/碎冰贴',        spec: '20片',   cat: 'deco', retail: 13, b2b: 4.5, uses: 40,  kw: '美甲铝箔纸 碎冰 贴纸' },
  bow:     { name: '金属蝴蝶结饰品',       spec: '20枚',   cat: 'deco', retail: 21, b2b: 6.5, uses: 20,  kw: '美甲蝴蝶结 金属饰品' },
  pearl:   { name: '异形珍珠混装',         spec: '1盒',    cat: 'deco', retail: 19, b2b: 5.5, uses: 30,  kw: '美甲异形珍珠 混装' },
  stone:   { name: '平底钻混装',           spec: '1盒',    cat: 'deco', retail: 26, b2b: 8,   uses: 30,  kw: '美甲平底钻 混装 玻璃钻' },
  guide:   { name: '法式引导贴',           spec: '100条',  cat: 'deco', retail: 10, b2b: 3,   uses: 30,  kw: '美甲法式引导贴' },
  charm:   { name: '合金链条/星月配件',     spec: '1套',    cat: 'deco', retail: 23, b2b: 7,   uses: 25,  kw: '美甲合金配件 链条' },

  tips:    { name: '全贴甲片',            spec: '500片',  cat: 'tip', retail: 32,  b2b: 12,  uses: 50,   kw: '美甲全贴甲片 500片' },
  jelly:   { name: '穿戴甲果冻胶',         spec: '20贴',   cat: 'tip', retail: 18,  b2b: 6,   uses: 40,   kw: '穿戴甲果冻胶 可反复' },
  boxset:  { name: '穿戴甲包装盒+绒袋',    spec: '20套',   cat: 'tip', retail: 28,  b2b: 9,   uses: 20,   kw: '穿戴甲包装盒 首饰盒' },

  magnet:  { name: '猫眼磁棒（多面）',      spec: '单支',   cat: 'tool', retail: 18, b2b: 6,   uses: 800,  kw: '猫眼磁铁 磁棒 多功能' },
  liner:   { name: '拉线笔',              spec: '单支',   cat: 'tool', retail: 12,  b2b: 4,   uses: 300,  kw: '美甲拉线笔 超细' },
  fanbrush:{ name: '晕染笔/扇形笔',        spec: '单支',   cat: 'tool', retail: 15,  b2b: 5,   uses: 300,  kw: '美甲晕染笔 扇形笔' },
  dotpen:  { name: '点钻笔 + 蜡笔',        spec: '1套',    cat: 'tool', retail: 14,  b2b: 4.5, uses: 400,  kw: '美甲点钻笔 蜡笔' },
  file:    { name: '搓条/海绵砂条',        spec: '10支',   cat: 'tool', retail: 12,  b2b: 4,   uses: 60,   kw: '美甲搓条 海绵砂条' },

  lamp:    { name: '光疗灯 48W',          spec: '整机',   cat: 'gear', retail: 95,  b2b: 48,  uses: 1500, kw: '美甲光疗灯 48W 感应' },
  efile:   { name: '打磨机',              spec: '整机',   cat: 'gear', retail: 165, b2b: 82,  uses: 1500, kw: '美甲打磨机 便携 无线' },
  vacuum:  { name: '吸尘器/集尘垫',        spec: '整机',   cat: 'gear', retail: 120, b2b: 58,  uses: 1500, kw: '美甲吸尘器 集尘' },
  airbrush:{ name: '便携喷枪套装',         spec: '整机',   cat: 'gear', retail: 215, b2b: 118, uses: 800,  kw: '美甲喷枪 便携 套装' }
};

/* 每款都会用到的通用打底流程材料 */
const COMMON_BOM = [
  { m: 'prep', q: 1 }, { m: 'cleanser', q: 1 }, { m: 'base', q: 1 }, { m: 'file', q: 1 }
];

const STYLES = [
  {
    id: 'galaxy-cateye',
    img: 'img/galaxy-cateye.png',
    name: '深海银河猫眼',
    alias: '9D猫眼 / 银河猫眼',
    platform: ['xhs', 'dy'],
    heat: { xhs: '8.2w 赞藏', dy: '31.4w 赞' },
    trend: 92,
    tags: ['猫眼', '高级感', '深色系', '显白'],
    seasons: ['全年'],
    diff: 3,
    time: 75,
    palette: ['#0B1E3D', '#1B3B6F', '#2E6FA7', '#8FC4E8', '#E8F2FA'],
    desc: '深蓝底 + 多向磁吸拉出流动光带，指甲转动时像银河在走。爆款核心是「光带要窄、要亮、要连贯」，不是整片发光。',
    elements: [
      '深蓝到墨蓝的渐变底色，指尖略深',
      '磁棒斜45°分两次吸，形成"X"交叉光带',
      '1-2枚点缀指做镜面或碎钻，其余保持干净'
    ],
    steps: [
      { t: '基础处理', d: '推死皮、去角质层，海绵条打磨甲面至无反光，清洁液擦净浮尘。', min: 12, tools: ['prep', 'file', 'cleanser'], pit: '甲面残留油脂 → 猫眼胶流动性变差，光带会断。' },
      { t: '上底胶', d: '薄薄一层底胶，封边，照灯30秒。', min: 6, tools: ['base', 'lamp'], pit: '底胶太厚会顶起猫眼层，导致后面磁吸无力。' },
      { t: '打黑底/深底', d: '猫眼胶必须压深色底才亮。刷一层深蓝或黑色甲油胶，照灯。', min: 8, tools: ['color', 'lamp'], pit: '跳过深底直接上猫眼 → 出来是灰扑扑的，这是新手最常见翻车点。' },
      { t: '第一层猫眼', d: '刷猫眼胶，趁未固化立刻用磁棒斜45°贴近甲面2-3秒吸出主光带，照灯60秒。', min: 15, tools: ['cateye', 'magnet', 'lamp'], pit: '磁棒离太远（>3mm）光带会宽而糊；停留太久胶会被吸偏。' },
      { t: '第二层交叉光带', d: '再刷一层猫眼胶，磁棒换另一个角度吸，与第一道光带交叉成"X"或"人字"，照灯。', min: 14, tools: ['cateye', 'magnet', 'lamp'], pit: '两道光带角度太接近会糊成一片，至少差60°。' },
      { t: '点缀指', d: '选1-2指做镜面铬粉或贴2-3颗小碎钻，用点钻笔蘸封层固定。', min: 10, tools: ['chrome', 'stone', 'dotpen'], pit: '钻不封边 → 3天必掉。钻的四周要用封层"围一圈"。' },
      { t: '封层收尾', d: '厚封层饱满封边，照灯60秒，擦除浮胶。', min: 10, tools: ['top', 'lamp', 'cleanser'], pit: '封层太薄会磨掉猫眼光泽感。' }
    ],
    bom: [
      { m: 'color', q: 1, note: '深蓝/墨黑打底' },
      { m: 'cateye', q: 2, note: '两层猫眼，用量翻倍' },
      { m: 'magnet', q: 1, note: '建议买多面磁棒' },
      { m: 'chrome', q: 0.5, note: '点缀指' },
      { m: 'stone', q: 0.5, note: '点缀指' },
      { m: 'dotpen', q: 1 },
      { m: 'top', q: 1 },
      { m: 'lamp', q: 1 }
    ],
    shoot: ['必须拍转动镜头，静态图完全体现不出猫眼', '侧逆光 + 深色背景最出效果', '前3秒就要给光带流动的特写，别拍手部全景'],
    hook: '"这个猫眼我做了3次才成功"——过程翻车 + 最终效果的对比结构最容易爆。',
    price: { cost: 0, retail: [168, 258], b2bNote: '猫眼胶是复购率最高的单品，电商可做"深底色+猫眼胶"组合装' }
  },

  {
    id: 'chrome-french',
    img: 'img/chrome-french.png',
    name: '镜面铬粉法式',
    alias: '液态金属法式 / Chrome French',
    platform: ['xhs', 'dy'],
    heat: { xhs: '12.6w 赞藏', dy: '18.9w 赞' },
    trend: 95,
    tags: ['法式', '镜面', '显手白', '通勤'],
    seasons: ['全年'],
    diff: 3,
    time: 65,
    palette: ['#F3E7E1', '#D9C3B8', '#B9B4B0', '#8E8B89', '#EDEDED'],
    desc: '裸色底 + 指尖一道镜面银/香槟色法式弧。它取代了传统白法式，最大的优势是显手白且不挑肤色。',
    elements: [
      '底色用带灰调的奶茶裸，不要粉调（粉调显黄）',
      '法式弧线要"薄"，占甲面 1/5 以内',
      '镜面粉要在封层"半固化"状态擦，这是唯一的技术门槛'
    ],
    steps: [
      { t: '基础处理 + 底胶', d: '常规打磨清洁，上底胶照灯。', min: 12, tools: ['prep', 'file', 'cleanser', 'base', 'lamp'], pit: '' },
      { t: '裸色底两层', d: '奶茶裸色薄涂两层，每层照灯，确保颜色均匀无刷痕。', min: 14, tools: ['nude', 'lamp'], pit: '一层刷厚 → 边缘堆积起鼓，一定要两薄层。' },
      { t: '半固化封层', d: '刷一层封层，照灯只照 20-25 秒（不要照满），保持表面微粘状态。', min: 6, tools: ['top', 'lamp'], pit: '这步是成败关键：照满了粉擦不上去，照太少会把粉擦花。' },
      { t: '擦镜面粉', d: '硅胶笔/海绵头蘸铬粉，在指尖 1/5 区域来回轻擦至出镜面效果，扫掉余粉。', min: 12, tools: ['chrome', 'dotpen'], pit: '力度要轻、方向要一致，来回乱擦会出现雾斑。' },
      { t: '修法式弧', d: '用清洁液蘸棉签修出干净的弧线边界，或先贴法式引导贴再擦粉。', min: 10, tools: ['cleanser', 'guide'], pit: '新手强烈建议用引导贴，手绘弧线十指对称非常难。' },
      { t: '封层封死', d: '厚封层完整覆盖镜面区并封边，照灯60秒。', min: 11, tools: ['top', 'lamp'], pit: '镜面粉不封层，两天就氧化发暗。' }
    ],
    bom: [
      { m: 'nude', q: 1 }, { m: 'chrome', q: 1 }, { m: 'guide', q: 1 },
      { m: 'dotpen', q: 1 }, { m: 'top', q: 2 }, { m: 'lamp', q: 1 }
    ],
    shoot: ['用金属/玻璃道具反射，强化"液态金属"质感', '手部要拍握杯子/拿书的自然动作，法式弧才好看', '拍摄前用湿巾擦一遍，镜面沾指纹很明显'],
    hook: '"白法式已经过时了，现在都做这个"——对比旧款式的标题结构在小红书转化极高。',
    price: { cost: 0, retail: [148, 218], b2bNote: '铬粉成本极低（单次<¥0.2）但客单价高，是美甲店毛利之王；电商适合做多色铬粉套盒' }
  },

  {
    id: 'bow-cream',
    img: 'img/bow-cream.png',
    name: '蝴蝶结奶油法式',
    alias: '芭蕾蝴蝶结 / Coquette 甜心',
    platform: ['xhs', 'dy'],
    heat: { xhs: '15.3w 赞藏', dy: '42.1w 赞' },
    trend: 97,
    tags: ['蝴蝶结', '甜美', '芭蕾风', '氛围感'],
    seasons: ['春', '夏'],
    diff: 2,
    time: 55,
    palette: ['#FDF2F4', '#F7D9DF', '#EFB9C4', '#E2A0AE', '#FFFFFF'],
    desc: 'Coquette 芭蕾风的延续款，奶油粉底 + 白色细法式 + 单指金属或立体蝴蝶结。上手快、出片率高，是新手最容易做出"店里效果"的款。',
    elements: [
      '奶油粉必须"奶"不能"荧光"，选带白调的雾粉',
      '蝴蝶结只放 1-2 指（无名指最佳），放多了廉价',
      '可加珍珠沿甲缘点缀，3颗以内'
    ],
    steps: [
      { t: '基础处理 + 底胶', d: '常规流程。', min: 12, tools: ['prep', 'file', 'cleanser', 'base', 'lamp'], pit: '' },
      { t: '奶油粉底色', d: '两薄层奶油粉，照灯。', min: 12, tools: ['nude', 'color', 'lamp'], pit: '粉色遮盖力普遍差，务必两层，不然透甲床显脏。' },
      { t: '白色细法式', d: '用拉线笔蘸白胶沿指尖画 1mm 细弧，照灯。', min: 12, tools: ['whitegel', 'liner', 'lamp'], pit: '白胶要"稠"，太稀会晕开。画之前在纸上试一笔。' },
      { t: '贴蝴蝶结', d: '无名指点一小滴封层作胶，放上金属蝴蝶结，用点钻笔调正，照灯30秒固定。', min: 8, tools: ['bow', 'dotpen', 'top', 'lamp'], pit: '蝴蝶结偏斜是最毁图的，放好后一定从正上方复核一次。' },
      { t: '珍珠点缀', d: '甲缘处点 2-3 颗异形珍珠，同样用封层固定。', min: 6, tools: ['pearl', 'dotpen', 'lamp'], pit: '珍珠不要放指尖，容易勾头发。' },
      { t: '封层', d: '避开立体饰品刷封层，饰品周围用封层"围边"加固，照灯。', min: 5, tools: ['top', 'lamp'], pit: '封层盖过蝴蝶结会让金属发雾。' }
    ],
    bom: [
      { m: 'nude', q: 1 }, { m: 'whitegel', q: 1 }, { m: 'liner', q: 1 },
      { m: 'bow', q: 1 }, { m: 'pearl', q: 1 }, { m: 'dotpen', q: 1 },
      { m: 'top', q: 1 }, { m: 'lamp', q: 1 }
    ],
    shoot: ['配丝带、芭蕾鞋、蕾丝布做背景，氛围直接拉满', '柔光 + 略微过曝，符合 Coquette 审美', '拍手指并拢的俯拍，蝴蝶结要在画面黄金分割点'],
    hook: '"新手也能做的蝴蝶结美甲"——低门槛承诺 + 高颜值结果，收藏率极高。',
    price: { cost: 0, retail: [138, 198], b2bNote: '蝴蝶结/珍珠饰品是典型的低价高频复购品，1688 拿货价常低于零售 1/3，适合做饰品混装盒' }
  },

  {
    id: 'maillard-blur',
    img: 'img/maillard-blur.png',
    name: '美拉德晕染',
    alias: '焦糖晕染 / Maillard',
    platform: ['xhs'],
    heat: { xhs: '9.7w 赞藏', dy: '11.2w 赞' },
    trend: 84,
    tags: ['晕染', '大地色', '高级感', '秋冬'],
    seasons: ['秋', '冬'],
    diff: 4,
    time: 80,
    palette: ['#4A2C1A', '#7A4B2A', '#A9744F', '#C9A27E', '#E8D5C0'],
    desc: '焦糖、可可、奶茶三色在甲面自然融合，没有明确边界。难点全在"过渡"——做好了是高级，做不好是脏。',
    elements: [
      '同色系深浅三色，色相不能跨太远',
      '必须用晕染胶（blooming gel）做媒介，普通胶硬晕会糊',
      '每指的晕染走向要不同，才有手绘感'
    ],
    steps: [
      { t: '基础 + 底胶 + 浅底色', d: '常规处理后，铺一层最浅的奶茶色作底，照灯。', min: 18, tools: ['prep', 'file', 'cleanser', 'base', 'nude', 'lamp'], pit: '' },
      { t: '刷晕染胶', d: '薄刷一层晕染胶，**不照灯**，保持湿润。', min: 6, tools: ['bloom'], pit: '晕染胶刷太厚，颜色会整个沉下去变成一坨。' },
      { t: '点色', d: '在湿润的晕染胶上，用拉线笔分别点入中棕、深可可色，点成不规则块状。', min: 16, tools: ['color', 'liner'], pit: '不要画线，要"点"，然后让它自己散。' },
      { t: '等它自己晕', d: '静置 40-60 秒，颜色会自动向外扩散融合。可用干净笔尖轻拨引导方向。', min: 12, tools: [], pit: '最考验耐心的一步。手贱多拨两下就糊了——晕开 70% 就该照灯。' },
      { t: '照灯定色', d: '满意后照灯 60 秒固化。若层次不够，重复"晕染胶+点色"再来一层。', min: 12, tools: ['lamp', 'bloom'], pit: '第二层要更少的颜色，只补深度。' },
      { t: '磨砂封层', d: '这个款配雾面封层质感最好，照灯60秒。', min: 16, tools: ['matte', 'lamp', 'cleanser'], pit: '光面封层会让大地色显得油腻。' }
    ],
    bom: [
      { m: 'nude', q: 1 }, { m: 'color', q: 2, note: '中棕 + 深可可' },
      { m: 'bloom', q: 2 }, { m: 'liner', q: 1 }, { m: 'fanbrush', q: 1 },
      { m: 'matte', q: 1 }, { m: 'lamp', q: 1 }
    ],
    shoot: ['配咖啡、皮革、羊绒围巾，材质呼应色调', '暖色光源，不要用冷白灯', '拍延时：颜色自动晕开的过程本身就是爆款素材'],
    hook: '"颜色自己会跑"的延时过程视频，在抖音是天然的完播率武器。',
    price: { cost: 0, retail: [178, 268], b2bNote: '晕染胶是近两年增长最快的单品，配套"美拉德色系6色套装"是明确的选品机会' }
  },

  {
    id: 'jelly-ice',
    img: 'img/jelly-ice.png',
    name: '冰透果冻甲',
    alias: '玻璃糖 / Jelly Nails',
    platform: ['xhs', 'dy'],
    heat: { xhs: '11.1w 赞藏', dy: '26.8w 赞' },
    trend: 90,
    tags: ['果冻', '透明感', '夏季', '清凉'],
    seasons: ['夏'],
    diff: 2,
    time: 50,
    palette: ['#CFF0EE', '#A8E0DD', '#7ECFCB', '#F7C8D8', '#FFFFFF'],
    desc: '半透明彩色胶叠涂，透出自然甲床，像含在指尖的果冻。夏天绝对的流量款，且是新手最容易做好看的款之一。',
    elements: [
      '甲床本身要干净——这款完全遮不住瑕疵',
      '3-4 层薄涂堆出通透感，不是一层厚涂',
      '可局部加极光粉做"冰晶"感'
    ],
    steps: [
      { t: '基础处理', d: '重点是甲床清洁和死皮处理，因为全部会透出来。', min: 14, tools: ['prep', 'file', 'cleanser'], pit: '甲床有黄斑/横纹的客人不适合这款，先劝退比做完返工强。' },
      { t: '底胶', d: '薄底胶照灯。', min: 5, tools: ['base', 'lamp'], pit: '' },
      { t: '果冻色叠涂 3 层', d: '果冻透色胶极薄涂，每层照灯 30 秒，逐层加深。', min: 18, tools: ['jellycol', 'lamp'], pit: '想快而涂厚 → 直接变成不透明色块，果冻感全无。' },
      { t: '冰晶点缀（可选）', d: '半固化封层上擦少量极光粉，做出光线折射感。', min: 8, tools: ['aurora', 'top', 'dotpen', 'lamp'], pit: '极光粉只在 1-2 指用，全上会显廉价。' },
      { t: '厚封层', d: '厚厚一层光面封层，做出"水润鼓面"，照灯60秒。', min: 5, tools: ['top', 'lamp'], pit: '封层要够厚才有果冻的鼓感，但注意不要流到皮肤。' }
    ],
    bom: [
      { m: 'jellycol', q: 2, note: '建议2色叠加' }, { m: 'aurora', q: 0.5 },
      { m: 'dotpen', q: 1 }, { m: 'top', q: 2 }, { m: 'lamp', q: 1 }
    ],
    shoot: ['逆光拍！透光是这款的全部灵魂', '配冰块、气泡水、透明亚克力道具', '拍手指弯曲的姿势，光从指缝穿过'],
    hook: '"夏天必做的透明感美甲"——季节强关联词，搜索流量稳定。',
    price: { cost: 0, retail: [118, 168], b2bNote: '果冻胶夏季搜索量翻3倍，是明确的季节性备货品；建议 5-6 月前铺货' }
  },

  {
    id: 'pearl-moon',
    img: 'img/pearl-moon.png',
    name: '珍珠月光贝母',
    alias: 'Mermaid / 贝母甲',
    platform: ['xhs'],
    heat: { xhs: '7.4w 赞藏', dy: '9.6w 赞' },
    trend: 81,
    tags: ['贝母', '珠光', '婚礼', '温柔'],
    seasons: ['春', '夏'],
    diff: 3,
    time: 70,
    palette: ['#FBF6F0', '#EDE0D4', '#DCC9BC', '#C6D9E0', '#F0E4EC'],
    desc: '奶白底 + 贝壳粉折射出的柔和虹彩，配异形珍珠。婚礼、伴娘、拍照场景的第一选择，客单价高。',
    elements: [
      '底色是暖奶白，不是纯白',
      '贝壳粉分区擦，制造不均匀的天然贝母纹理',
      '珍珠沿甲缘弧形排列，大小交错'
    ],
    steps: [
      { t: '基础 + 底胶 + 奶白底', d: '两层奶白色打底，照灯。', min: 18, tools: ['prep', 'file', 'cleanser', 'base', 'nude', 'lamp'], pit: '' },
      { t: '半固化封层', d: '封层照灯 20 秒保持微粘。', min: 6, tools: ['top', 'lamp'], pit: '同镜面法式，火候是关键。' },
      { t: '分区擦贝壳粉', d: '硅胶头蘸极光粉，只在甲面局部（如靠甲根侧）不规则擦拭，留出留白区。', min: 16, tools: ['aurora', 'dotpen'], pit: '擦满 = 变成廉价珠光甲。贝母的美感来自"不均匀"。' },
      { t: '铝箔碎片（可选）', d: '撕极小片碎冰铝箔贴，营造贝壳裂纹感。', min: 10, tools: ['foil', 'dotpen'], pit: '碎片要小于 2mm，大了像贴纸。' },
      { t: '珍珠排列', d: '甲缘弧形放 3-5 颗大小交错的异形珍珠，封层固定照灯。', min: 10, tools: ['pearl', 'dotpen', 'top', 'lamp'], pit: '珍珠要"抱"住甲缘弧度，不要排成一条直线。' },
      { t: '封层加固', d: '珍珠周围围封层加固，其余区域正常封层，照灯。', min: 10, tools: ['top', 'lamp', 'cleanser'], pit: '珍珠不围边，一周内必掉。' }
    ],
    bom: [
      { m: 'nude', q: 1 }, { m: 'aurora', q: 1 }, { m: 'foil', q: 1 },
      { m: 'pearl', q: 1 }, { m: 'dotpen', q: 1 }, { m: 'top', q: 2 }, { m: 'lamp', q: 1 }
    ],
    shoot: ['自然光靠窗拍，虹彩才会随角度变化', '配纱、珍珠首饰、贝壳', '一定要拍多角度动图，静态图损失 80% 效果'],
    hook: '婚礼/伴娘关键词是这款的精准流量池，标题带场景词转化率远高于纯款式词。',
    price: { cost: 0, retail: [198, 328], b2bNote: '婚礼场景溢价高，可做"新娘美甲套装"礼盒式选品' }
  },

  {
    id: 'micro-french',
    img: 'img/micro-french.png',
    name: '断层微法式',
    alias: 'Micro French / 隐形法式',
    platform: ['xhs', 'dy'],
    heat: { xhs: '10.5w 赞藏', dy: '14.7w 赞' },
    trend: 88,
    tags: ['法式', '极简', '通勤', '显长'],
    seasons: ['全年'],
    diff: 2,
    time: 45,
    palette: ['#FFFFFF', '#F5F0EB', '#E3DAD2', '#111111', '#C8B6A6'],
    desc: '极细的法式线 + 甲根留白（断层）。最低成本做出"贵"的观感，通勤党回购率最高的款，也是美甲店翻台最快的款。',
    elements: [
      '法式线 ≤ 1mm，粗一点就俗',
      '甲根留 2mm 透明区，视觉上延长甲床',
      '线色可选白/黑/金/焦糖，黑色最出片'
    ],
    steps: [
      { t: '基础 + 底胶', d: '常规处理，底胶照灯。', min: 12, tools: ['prep', 'file', 'cleanser', 'base', 'lamp'], pit: '' },
      { t: '极淡底色（可选）', d: '一层近乎透明的裸色调整甲床色，照灯。', min: 8, tools: ['nude', 'lamp'], pit: '涂厚就失去"隐形"的意思了。' },
      { t: '画细法式线', d: '拉线笔一笔到位画指尖弧线，宽度控制在 1mm。照灯。', min: 16, tools: ['whitegel', 'liner', 'lamp'], pit: '手抖就分两笔从两侧向中间画，比一笔硬撑强。画错立刻用清洁液擦掉重来，别在胶上叠加。' },
      { t: '封层', d: '整甲封层，注意封边，照灯60秒。', min: 9, tools: ['top', 'lamp', 'cleanser'], pit: '细线容易被封层刷带偏，下刷时避开线条方向。' }
    ],
    bom: [
      { m: 'nude', q: 0.5 }, { m: 'whitegel', q: 1 }, { m: 'liner', q: 1 },
      { m: 'top', q: 1 }, { m: 'lamp', q: 1 }
    ],
    shoot: ['特写！这款的卖点全在线条的干净程度', '拍键盘、咖啡杯等通勤场景', '黑线版本在纯白背景下最出片'],
    hook: '"5分钟做完的高级感美甲"——效率型标题，对上班族极其精准。',
    price: { cost: 0, retail: [98, 148], b2bNote: '成本最低的款（单次<¥3），是引流款首选；电商可主推"拉线笔+勾线胶"组合' }
  },

  {
    id: 'bubble-glass',
    img: 'img/bubble-glass.png',
    name: '气泡玻璃甲',
    alias: '极光玻璃纸 / Glass Nails',
    platform: ['dy', 'xhs'],
    heat: { xhs: '6.9w 赞藏', dy: '35.2w 赞' },
    trend: 86,
    tags: ['玻璃纸', '极光', 'Y2K', '抢眼'],
    seasons: ['夏', '秋'],
    diff: 3,
    time: 60,
    palette: ['#E8F4FF', '#BBDDF5', '#F7D6EE', '#D6F5E3', '#FFF6C9'],
    desc: '透明玻璃纸剪碎贴在甲面，形成不规则彩虹折射块。视频里转一下角度就变色，是抖音的天然完播率款。',
    elements: [
      '玻璃纸要剪成不规则多边形，不是方块',
      '碎片之间留缝，不要铺满',
      '底色用浅色或透明，才透得出折射'
    ],
    steps: [
      { t: '基础 + 底胶 + 浅底', d: '常规处理，铺浅色或透明底，照灯。', min: 16, tools: ['prep', 'file', 'cleanser', 'base', 'jellycol', 'lamp'], pit: '' },
      { t: '剪玻璃纸', d: '提前把极光膜剪成 2-4mm 不规则碎片，摊在纸上备用。', min: 8, tools: ['bubble'], pit: '现剪现贴会手忙脚乱，一定提前备料。' },
      { t: '贴片', d: '刷薄封层作胶，用点钻笔蜡头粘起碎片贴到甲面，碎片间留缝，照灯。', min: 16, tools: ['bubble', 'dotpen', 'top', 'lamp'], pit: '贴满 = 廉价贴纸感。留白率至少 40%。' },
      { t: '磨平边缘', d: '碎片边缘会翘，刷一层加固胶把整个甲面找平，照灯。', min: 10, tools: ['armor', 'lamp'], pit: '不找平直接封层 → 表面凹凸，一摸就刮手，客人第二天就来返工。' },
      { t: '厚封层', d: '再一层厚封层做出玻璃鼓面，照灯60秒。', min: 10, tools: ['top', 'lamp', 'cleanser'], pit: '' }
    ],
    bom: [
      { m: 'jellycol', q: 1 }, { m: 'bubble', q: 1 }, { m: 'armor', q: 1 },
      { m: 'dotpen', q: 1 }, { m: 'top', q: 2 }, { m: 'lamp', q: 1 }
    ],
    shoot: ['一定要拍转动+变色的过程，这是全部卖点', '强点光源（手电/补光灯）打斜角', '慢动作转手，配电子音乐，抖音模板化打法'],
    hook: '"转一下会变色"——视觉钩子直白，3秒留人。',
    price: { cost: 0, retail: [138, 188], b2bNote: '玻璃纸单价极低，是典型的"低成本高视觉冲击"选品，适合做直播间引流品' }
  },

  {
    id: 'blush-glitter',
    img: 'img/blush-glitter.png',
    name: '芭蕾粉爆闪钻',
    alias: '碎钻裸粉 / Sparkle Ballet',
    platform: ['xhs', 'dy'],
    heat: { xhs: '9.1w 赞藏', dy: '22.5w 赞' },
    trend: 87,
    tags: ['爆闪', '碎钻', '甜美', 'party'],
    seasons: ['全年'],
    diff: 2,
    time: 55,
    palette: ['#FBE9EE', '#F2CDD8', '#E5B4C3', '#FFFFFF', '#EFE3C8'],
    desc: '芭蕾裸粉底 + 甲根渐变爆闪金葱 + 少量平底钻。低难度高回报，节日、聚会场景的常青款。',
    elements: [
      '闪片从甲根向中部渐变，不要满甲',
      '钻只在 1 指做"点睛"，2-4 颗',
      '闪片要"密集小颗"，不要大亮片'
    ],
    steps: [
      { t: '基础 + 底胶 + 裸粉底', d: '两层芭蕾粉，照灯。', min: 18, tools: ['prep', 'file', 'cleanser', 'base', 'nude', 'lamp'], pit: '' },
      { t: '甲根渐变闪片', d: '扇形笔蘸亮片胶，从甲根向甲中扫，越往前越淡，照灯。', min: 14, tools: ['glitter', 'fanbrush', 'lamp'], pit: '一次扫到位很难，宁可扫两遍薄的做渐变，也不要一次堆厚。' },
      { t: '点钻', d: '选一指，封层作胶，点钻笔放 2-4 颗平底钻，照灯30秒。', min: 10, tools: ['stone', 'dotpen', 'top', 'lamp'], pit: '钻要挑大小不一的搭配，全一样大很死板。' },
      { t: '钻边加固 + 封层', d: '钻的四周围一圈封层，整甲封层，照灯。', min: 13, tools: ['top', 'lamp', 'cleanser'], pit: '闪片甲面粗糙，封层要比平时厚一点才能磨平。' }
    ],
    bom: [
      { m: 'nude', q: 1 }, { m: 'glitter', q: 1 }, { m: 'fanbrush', q: 1 },
      { m: 'stone', q: 1 }, { m: 'dotpen', q: 1 }, { m: 'top', q: 2 }, { m: 'lamp', q: 1 }
    ],
    shoot: ['点光源直射闪片，拍到"炸开"的光斑', '配香槟杯、亮片布、圣诞灯串', '轻微晃动手部拍视频，闪片会流动'],
    hook: '节日节点（跨年/圣诞/生日）发布，蹭时间流量，标题带节日词。',
    price: { cost: 0, retail: [128, 178], b2bNote: '钻和闪片是节前爆发型品类，11-12月备货，其余月份平淡' }
  },

  {
    id: 'jp-line',
    img: 'img/jp-line.png',
    name: '日式手绘线条',
    alias: '极简线条 / Japanese Line Art',
    platform: ['xhs'],
    heat: { xhs: '8.8w 赞藏', dy: '7.3w 赞' },
    trend: 79,
    tags: ['极简', '手绘', '艺术感', '小众'],
    seasons: ['全年'],
    diff: 4,
    time: 70,
    palette: ['#FFFFFF', '#F2EFE9', '#1A1A1A', '#C9A227', '#9AAFA0'],
    desc: '透明或奶白底上手绘不规则线条、色块。技术门槛在"手稳"，但材料成本极低，是美甲师体现功底的款。',
    elements: [
      '线条要有粗细变化，等宽线很呆板',
      '每指图案不同但风格统一',
      '大量留白，这是日式美学的核心'
    ],
    steps: [
      { t: '基础 + 底胶 + 奶白/透明底', d: '常规处理，铺极淡底色，照灯。', min: 16, tools: ['prep', 'file', 'cleanser', 'base', 'nude', 'lamp'], pit: '' },
      { t: '打草稿', d: '先在纸上把十指图案画一遍，确定构图。', min: 10, tools: [], pit: '直接上手画 → 十指风格不统一，这是业余和专业的分水岭。' },
      { t: '画主线条', d: '拉线笔蘸黑/金勾线胶，一笔画完不回笔。运笔时手腕靠在支撑物上。', min: 22, tools: ['whitegel', 'liner', 'color'], pit: '中途停顿会出墨点。画错立即用清洁液擦净，不要修补。' },
      { t: '照灯定型', d: '每 2-3 指画完就照灯，避免蹭花。', min: 8, tools: ['lamp'], pit: '一口气画完十指再照灯，前面的一定被蹭到。' },
      { t: '磨砂或光面封层', d: '按风格选封层，磨砂更"日系"，照灯60秒。', min: 14, tools: ['matte', 'top', 'lamp', 'cleanser'], pit: '封层刷会拖动线条，用"点放"的方式覆盖而不是"刷"。' }
    ],
    bom: [
      { m: 'nude', q: 0.5 }, { m: 'whitegel', q: 1 }, { m: 'color', q: 1, note: '黑色/金色勾线' },
      { m: 'liner', q: 1 }, { m: 'matte', q: 1 }, { m: 'lamp', q: 1 }
    ],
    shoot: ['拍绘制过程的手部特写，"手绘"本身就是内容', '极简背景（水泥灰/宣纸/原木）', '过程视频比成品图流量高 3 倍以上'],
    hook: '"手绘过程"类内容天然有观赏性，适合做系列账号人设。',
    price: { cost: 0, retail: [188, 298], b2bNote: '材料成本极低但技术溢价高；电商可切入"拉线笔/手绘笔专业套装"的细分市场' }
  },

  {
    id: 'sand-cateye',
    img: 'img/sand-cateye.png',
    name: '流沙猫眼渐变',
    alias: '沙滩猫眼 / Sand Cat Eye',
    platform: ['dy', 'xhs'],
    heat: { xhs: '5.8w 赞藏', dy: '28.7w 赞' },
    trend: 83,
    tags: ['猫眼', '渐变', '磨砂', '低调'],
    seasons: ['秋', '冬'],
    diff: 3,
    time: 70,
    palette: ['#EFE6DA', '#D8C4AC', '#B49877', '#8A6F52', '#5C4632'],
    desc: '猫眼胶 + 磨砂封层，做出流沙般的哑光流动感。比亮面猫眼更耐看、更适合日常，秋冬回购率高。',
    elements: [
      '底色用同色系浅色，猫眼层做渐变过渡',
      '磁棒横向吸，做"沙丘"横条纹',
      '磨砂封层是灵魂，光面就变回普通猫眼了'
    ],
    steps: [
      { t: '基础 + 底胶 + 浅棕底', d: '常规处理，浅棕底两层，照灯。', min: 18, tools: ['prep', 'file', 'cleanser', 'base', 'nude', 'lamp'], pit: '' },
      { t: '猫眼渐变', d: '猫眼胶只刷甲面前 2/3，靠甲根处刷薄形成自然渐变。', min: 14, tools: ['cateye'], pit: '甲根刷厚会有明显断层。' },
      { t: '横向磁吸', d: '磁棒平行于甲缘横向吸 2-3 秒，形成横向沙丘纹，照灯60秒。', min: 14, tools: ['magnet', 'lamp'], pit: '磁棒角度不一致 → 十指纹理方向乱，整体很脏。定一个角度做完十指。' },
      { t: '加深指尖（可选）', d: '指尖再补一层深棕猫眼加强层次，照灯。', min: 10, tools: ['cateye', 'color', 'magnet', 'lamp'], pit: '' },
      { t: '磨砂封层', d: '雾面封层完整覆盖，照灯60秒，擦浮胶。', min: 14, tools: ['matte', 'lamp', 'cleanser'], pit: '磨砂封层不能太厚，会盖住猫眼光带。' }
    ],
    bom: [
      { m: 'nude', q: 1 }, { m: 'cateye', q: 2 }, { m: 'color', q: 0.5 },
      { m: 'magnet', q: 1 }, { m: 'matte', q: 1 }, { m: 'lamp', q: 1 }
    ],
    shoot: ['侧光突出磨砂的颗粒质感', '配麂皮、粗陶、燕麦色针织', '转手拍猫眼光带在哑光下的流动'],
    hook: '"哑光猫眼"是搜索蓝海词，竞争比亮面猫眼小很多。',
    price: { cost: 0, retail: [158, 228], b2bNote: '磨砂封层被严重低估，可作为"猫眼胶+磨砂封层"捆绑组合的切入点' }
  },

  {
    id: 'matte-nude',
    img: 'img/matte-nude.png',
    name: '磨砂裸色通勤',
    alias: '素颜甲 / Clean Girl',
    platform: ['xhs'],
    heat: { xhs: '13.9w 赞藏', dy: '16.4w 赞' },
    trend: 89,
    tags: ['裸色', '磨砂', '通勤', '零门槛'],
    seasons: ['全年'],
    diff: 1,
    time: 40,
    palette: ['#F6EFE8', '#EADFD3', '#DCCCBC', '#C9B4A0', '#B09A85'],
    desc: 'Clean Girl 审美的指甲版本。就是一个颜色，但对"颜色选得准"和"边缘做得干净"要求极高。最适合新手起步，也是美甲店的效率之王。',
    elements: [
      '按肤色选调：黄皮选燕麦/焦糖，白皮选粉裸，冷白皮可选灰裸',
      '边缘必须极干净，一点溢胶就毁',
      '磨砂封层 > 光面，更显高级'
    ],
    steps: [
      { t: '基础处理', d: '死皮推净，甲型修统一（圆方甲最百搭）。', min: 14, tools: ['prep', 'file', 'cleanser'], pit: '十指甲型不统一是最大的廉价感来源，比颜色重要。' },
      { t: '底胶', d: '薄底胶照灯。', min: 5, tools: ['base', 'lamp'], pit: '' },
      { t: '裸色两层', d: '两薄层，每层照灯，边缘留 0.5mm 不碰皮肤。', min: 14, tools: ['nude', 'lamp'], pit: '贪快涂到皮肤上 → 3天开始翘边脱落。宁可留缝也不要溢。' },
      { t: '磨砂封层', d: '雾面封层，照灯60秒，擦浮胶。', min: 7, tools: ['matte', 'lamp', 'cleanser'], pit: '磨砂封层擦浮胶要用力均匀，不然会出现亮斑。' }
    ],
    bom: [
      { m: 'nude', q: 1 }, { m: 'matte', q: 1 }, { m: 'lamp', q: 1 }
    ],
    shoot: ['拍生活场景：拿咖啡、翻书、护肤', '自然光，不修图，符合 Clean Girl 的"真实感"', '重点拍甲缘和皮肤的干净衔接'],
    hook: '"黄皮显白裸色"——按肤色分类的内容结构，是裸色赛道最稳的选题。',
    price: { cost: 0, retail: [88, 128], b2bNote: '裸色是全年销量最稳的色号，建议按肤色做"黄皮/白皮"分组套装，转化率高于随机色卡' }
  },

  {
    id: 'velvet-snow',
    img: 'img/velvet-snow.png',
    name: '雪花绒毛甲',
    alias: '天鹅绒 / Velvet Nails',
    platform: ['dy'],
    heat: { xhs: '4.6w 赞藏', dy: '19.8w 赞' },
    trend: 72,
    tags: ['绒毛', '冬季', '节日', '毛绒感'],
    seasons: ['冬'],
    diff: 2,
    time: 50,
    palette: ['#FFFFFF', '#E9F1F7', '#C5D9E8', '#9BB8CE', '#F2E6D8'],
    desc: '在未固化的胶面上撒绒毛粉，做出毛茸茸的立体触感。冬季、圣诞档期的强季节款，视觉和触觉双重记忆点。',
    elements: [
      '只做 2-3 指绒毛，其余保持光面做对比',
      '绒毛粉要"撒"不要"按"',
      '白色/冰蓝最出效果'
    ],
    steps: [
      { t: '基础 + 底胶 + 底色', d: '常规处理，铺白色或冰蓝底，照灯。', min: 16, tools: ['prep', 'file', 'cleanser', 'base', 'color', 'lamp'], pit: '' },
      { t: '刷厚胶', d: '在要做绒毛的指上刷一层较厚的同色胶，**不照灯**。', min: 6, tools: ['color'], pit: '胶太薄，绒毛粘不牢，一天就掉光。' },
      { t: '撒绒毛粉', d: '在纸上方从高处撒绒毛粉覆盖整个湿胶面，静置5秒让粉自然沉降。', min: 10, tools: ['velvet'], pit: '用手指按压 = 绒毛压扁，全毁。只能撒，不能碰。' },
      { t: '照灯 + 清扫余粉', d: '照灯60秒固化，用干净软刷扫掉多余绒毛粉。', min: 10, tools: ['lamp', 'fanbrush'], pit: '扫粉要轻，力大会连带扯下已固定的绒毛。' },
      { t: '其余指封层', d: '绒毛指**不封层**（封了就不毛了），其余指正常封层照灯。', min: 8, tools: ['top', 'lamp', 'cleanser'], pit: '给绒毛指刷封层是最常见的翻车，直接变成一团糊。' }
    ],
    bom: [
      { m: 'color', q: 2 }, { m: 'velvet', q: 1 }, { m: 'fanbrush', q: 1 },
      { m: 'top', q: 1 }, { m: 'lamp', q: 1 }
    ],
    shoot: ['微距拍绒毛质感，这是唯一卖点', '拍手指摩擦绒毛的触感画面（ASMR 向）', '配毛衣、雪景、圣诞元素'],
    hook: '触感类内容（摸起来毛茸茸）在抖音有天然的互动率优势。',
    price: { cost: 0, retail: [128, 178], b2bNote: '强季节品，10-12月集中出货，需注意压货风险，建议小批量多批次' }
  },

  {
    id: 'wear-butterfly',
    img: 'img/wear-butterfly.png',
    name: '蝶翼镭射穿戴甲',
    alias: '成品穿戴甲 / Press-on',
    platform: ['dy', 'xhs'],
    heat: { xhs: '7.7w 赞藏', dy: '44.6w 赞' },
    trend: 94,
    tags: ['穿戴甲', '可复用', '电商向', '镭射'],
    seasons: ['全年'],
    diff: 3,
    time: 90,
    palette: ['#F0E6FF', '#D5C2F0', '#B9E5F0', '#FFD9EC', '#EFEFEF'],
    desc: '不是做在真甲上，而是在甲片上完成整套设计，做成可反复佩戴的成品。这是目前增长最猛的品类——对博主是可售卖商品，对电商是核心 SKU。',
    elements: [
      '甲片要预先按尺码分号（0-9 号）',
      '甲片背面必须打磨，否则果冻胶不贴',
      '成品要配包装盒才有溢价'
    ],
    steps: [
      { t: '甲片分号打磨', d: '按 0-9 号排好，用海绵条打磨甲片正面（上色面）和背面边缘。', min: 14, tools: ['tips', 'file'], pit: '不打磨正面 → 胶附着差，用两次就掉色。' },
      { t: '底胶 + 底色', d: '甲片上底胶照灯，再铺浅紫/浅蓝渐变底色。', min: 18, tools: ['base', 'color', 'lamp'], pit: '甲片是弧面，涂胶容易堆积在弧顶，要薄涂多层。' },
      { t: '镭射蝶翼', d: '半固化封层上擦极光粉，用点钻笔勾出蝶翼脉络。', min: 22, tools: ['aurora', 'chrome', 'dotpen', 'top', 'lamp'], pit: '脉络线要顺着甲片弧度走，横平竖直会很假。' },
      { t: '立体装饰', d: '加合金蝴蝶/链条配件，封层固定照灯。', min: 12, tools: ['charm', 'dotpen', 'top', 'lamp'], pit: '穿戴甲的装饰要比真甲更牢，因为会反复摘戴。四周务必围胶。' },
      { t: '封层 + 修边', d: '厚封层照灯，用打磨机修甲片边缘毛刺，抛光。', min: 14, tools: ['top', 'lamp', 'efile'], pit: '边缘毛刺会刮伤皮肤，是差评重灾区。' },
      { t: '配果冻胶装盒', d: '成品配果冻胶贴、酒精棉片、木推棒，装盒。', min: 10, tools: ['jelly', 'boxset'], pit: '不附使用说明 → 客户戴不牢就给差评。说明卡成本极低但必须有。' }
    ],
    bom: [
      { m: 'tips', q: 1 }, { m: 'color', q: 2 }, { m: 'aurora', q: 1 }, { m: 'chrome', q: 0.5 },
      { m: 'charm', q: 1 }, { m: 'dotpen', q: 1 }, { m: 'top', q: 2 },
      { m: 'jelly', q: 1 }, { m: 'boxset', q: 1 }, { m: 'lamp', q: 1 }, { m: 'efile', q: 1 }
    ],
    shoot: ['拍"戴上去"的过程，3秒变装是核心钩子', '成品摆盒里拍，有商品感才好卖', '强调"可反复佩戴"和"3分钟出门"'],
    hook: '"3分钟拥有一套美甲"——省时承诺 + 可购买闭环，是穿戴甲赛道的标准打法。',
      price: { cost: 0, retail: [88, 168], b2bNote: '★核心选品★ 甲片、果冻胶、包装盒三件套是穿戴甲卖家的刚需，复购稳定；建议优先在1688找一件代发货源' }
  },

  {
    id: 'classic-french',
    img: 'img/classic-french.png',
    name: '经典白法式',
    alias: 'French Tip / 微笑线',
    platform: ['xhs', 'dy'],
    heat: { xhs: '常青款', dy: '常青款' },
    trend: 80,
    tags: ['法式', '经典', '通勤', '百搭'],
    seasons: ['全年'],
    diff: 1,
    time: 40,
    palette: ['#FFFFFF', '#FBEDE8', '#F2D9D0', '#E8C3B8', '#F7F2EE'],
    desc: '最经典的美甲款式，指尖一道干净的白弧线 + 裸粉底色。零门槛、不挑手型，是美甲店翻台最快、客户回购最稳的款，也是新手练手的第一课。',
    elements: ['底色用带粉调的裸色，不要纯白（纯白显假）', '法式弧线要"微笑"弧度，占指尖 1/4 以内', '边缘干净是灵魂，溢胶立刻擦'],
    steps: [
      { t: '基础处理 + 底胶', d: '推死皮、修圆方甲，薄底胶照灯。', min: 12, tools: ['prep', 'file', 'cleanser', 'base', 'lamp'], pit: '' },
      { t: '裸色底两层', d: '粉裸色薄涂两层，照灯，边缘留 0.5mm 不碰皮肤。', min: 14, tools: ['nude', 'lamp'], pit: '一层涂厚 → 边缘堆积起鼓。' },
      { t: '白法式线', d: '拉线笔蘸白胶沿指尖画微笑弧，宽度≤2mm，照灯。', min: 14, tools: ['whitegel', 'liner', 'lamp'], pit: '手抖就分两笔从两侧向中间收，别一笔硬撑；画错用清洁液擦掉重来。' },
      { t: '封层', d: '整甲封层封边，照灯60秒。', min: 10, tools: ['top', 'lamp', 'cleanser'], pit: '封层刷方向避开线条，别把白线带偏。' }
    ],
    bom: [{ m: 'nude', q: 1 }, { m: 'whitegel', q: 1 }, { m: 'liner', q: 1 }, { m: 'top', q: 1 }, { m: 'lamp', q: 1 }],
    shoot: ['拍手部自然动作，法式弧才好看', '纯色 / 浅景深背景最出片', '强调"百搭通勤"'],
    hook: '"永远不过时的法式"——经典款标题稳定有搜量，适合做入门教学。',
    price: { cost: 0, retail: [68, 108], b2bNote: '成本最低的款之一，是引流款首选；电商可主推"拉线笔 + 勾线胶"组合' }
  },

  {
    id: 'blush-jelly',
    img: 'img/blush-jelly.png',
    name: '腮红果冻甲',
    alias: '苹果腮红 / Blush Nails',
    platform: ['xhs', 'dy'],
    heat: { xhs: '9.2w 赞藏', dy: '15.1w 赞' },
    trend: 85,
    tags: ['腮红', '果冻', '甜美', '减龄'],
    seasons: ['春', '夏'],
    diff: 1,
    time: 45,
    palette: ['#FCE7EC', '#F8CFD8', '#F2B3C2', '#FDEEF0', '#FFFFFF'],
    desc: '在指甲中心一团粉嫩"腮红"晕染，像皮肤透出的红晕，四周是清透果冻底。少女感拉满、极显手白，是低难度高回报的甜美款。',
    elements: ['腮红只晕在甲面中心，边缘必须透', '底色用冰透粉 / 裸，不能遮死', '可加一点细闪更灵动'],
    steps: [
      { t: '基础 + 底胶 + 冰透底', d: '常规处理后铺一层极薄冰透粉，照灯。', min: 14, tools: ['prep', 'file', 'cleanser', 'base', 'jellycol', 'lamp'], pit: '' },
      { t: '点腮红', d: '用点钻笔蘸少量粉 / 红胶，点在甲面中心，不清扫开，照灯定形。', min: 12, tools: ['color', 'dotpen', 'lamp'], pit: '下手重 = 变红指甲油。少量多次点，边缘自然淡出。' },
      { t: '晕开边缘（可选）', d: '用干净笔尖或棉签把腮红边缘轻轻拍淡，做出"透出来"的感觉。', min: 8, tools: ['dotpen'], pit: '别来回蹭，会糊成一片。' },
      { t: '厚封层', d: '厚封层做出水润鼓面，照灯60秒。', min: 8, tools: ['top', 'lamp'], pit: '封层够厚才有果冻感。' }
    ],
    bom: [{ m: 'jellycol', q: 1 }, { m: 'color', q: 0.5, note: '腮红色' }, { m: 'dotpen', q: 1 }, { m: 'top', q: 2 }, { m: 'lamp', q: 1 }],
    shoot: ['逆光拍透出的红晕', '配草莓、奶油、马卡龙', '拍手指并拢俯拍'],
    hook: '"看起来好乖的腮红甲"——减龄甜美向标题收藏率高。',
    price: { cost: 0, retail: [98, 138], b2bNote: '腮红款季节性强（春夏），4-6 月铺货；所需材料与果冻甲通用' }
  },

  {
    id: 'color-block',
    img: 'img/color-block.png',
    name: '跳色纯色款',
    alias: 'Skip Color / 撞色',
    platform: ['xhs', 'dy'],
    heat: { xhs: '常青款', dy: '常青款' },
    trend: 78,
    tags: ['跳色', '纯色', '百搭', '新手'],
    seasons: ['全年'],
    diff: 1,
    time: 35,
    palette: ['#F8C8DC', '#B8D4F0', '#D8C8F0', '#C8E8D0', '#FCE8B8'],
    desc: '每根手指一个不同的纯色，拼在一起就是一组配色。最简单的美甲，却是展示"配色审美"的最佳载体，也最适合给客户试色、做色卡。',
    elements: ['选同色系或同明度的几个色，避免脏', '可加 1 指跳个亮色点睛', '边缘一定要干净'],
    steps: [
      { t: '基础 + 底胶', d: '常规处理，薄底胶照灯。', min: 12, tools: ['prep', 'file', 'cleanser', 'base', 'lamp'], pit: '' },
      { t: '逐指上色', d: '每指选一个色，两薄层，照灯，边缘留缝。', min: 16, tools: ['color', 'lamp'], pit: '贪快涂厚 → 边缘堆积、起鼓、不匀。' },
      { t: '封层', d: '整甲封层封边，照灯60秒。', min: 7, tools: ['top', 'lamp', 'cleanser'], pit: '不同色交界处别串色。' }
    ],
    bom: [{ m: 'color', q: 4, note: '多色' }, { m: 'top', q: 1 }, { m: 'lamp', q: 1 }],
    shoot: ['拍十指并排的"色卡"视角', '配同色系小物（花 / 糖 / 布）', '强调配色灵感'],
    hook: '"超治愈的配色"——色卡式内容易收藏，适合做系列。',
    price: { cost: 0, retail: [58, 98], b2bNote: '纯色是验证配色喜好的低成本方式，也是色胶的最直接展示位' }
  },

  {
    id: 'milk-tea-grad',
    img: 'img/milk-tea-grad.png',
    name: '奶茶渐变甲',
    alias: 'Ombre / 奶茶晕染',
    platform: ['xhs', 'dy'],
    heat: { xhs: '10.4w 赞藏', dy: '12.8w 赞' },
    trend: 86,
    tags: ['渐变', '奶茶', '温柔', '显白'],
    seasons: ['秋', '冬', '全年'],
    diff: 2,
    time: 55,
    palette: ['#F6EBDD', '#E8D6BF', '#D6BFA0', '#BFA081', '#A8896A'],
    desc: '从指尖到甲根由浅到深的奶茶色渐变，像一杯分层的奶茶。温柔高级、显手白，是秋冬的流量常青款，也适合做新娘 / 伴娘的素雅款。',
    elements: ['同色系深浅两到三色做过渡', '渐变方向统一（都从甲根深或指尖深）', '可用海绵拍出柔和过渡'],
    steps: [
      { t: '基础 + 底胶 + 浅底', d: '常规处理，铺最浅奶茶色打底，照灯。', min: 16, tools: ['prep', 'file', 'cleanser', 'base', 'nude', 'lamp'], pit: '' },
      { t: '海绵拍渐变', d: '浅色打底后，用海绵蘸深一档奶茶色，从指尖向甲根方向轻拍，做出由深到浅过渡，照灯。', min: 18, tools: ['color', 'file', 'lamp'], pit: '拍太重 = 一块块。要"点拍"不要"涂"，每层薄。' },
      { t: '补过渡（可选）', d: '若交界生硬，再薄拍一层中间色柔化。', min: 10, tools: ['color', 'file', 'lamp'], pit: '' },
      { t: '封层', d: '封层封边，照灯60秒。', min: 8, tools: ['top', 'lamp', 'cleanser'], pit: '渐变款用光面更显柔润。' }
    ],
    bom: [{ m: 'nude', q: 1 }, { m: 'color', q: 2, note: '奶茶深浅两色' }, { m: 'file', q: 1 }, { m: 'top', q: 1 }, { m: 'lamp', q: 1 }],
    shoot: ['配奶茶杯、燕麦色针织', '侧光突出渐变层次', '拍手部托杯的自然动作'],
    hook: '"像一杯奶茶"——食物类比标题在秋冬转化好。',
    price: { cost: 0, retail: [108, 158], b2bNote: '渐变是显技术又百搭的款，可绑定"奶茶色系套装"做选品' }
  }
];

/* ============ 爆款雷达：平台搜索关键词库 ============ */
const RADAR_KEYWORDS = {
  '按趋势找': ['2026美甲流行', '本月最火美甲', '美甲爆款', '小众高级感美甲', '美甲趋势'],
  '按场景找': ['通勤美甲', '婚礼新娘美甲', '约会美甲', '毕业照美甲', '过年美甲'],
  '按肤色找': ['黄皮显白美甲', '冷白皮美甲', '黑皮显白美甲', '手黑美甲推荐'],
  '按工艺找': ['猫眼美甲教程', '镜面美甲', '晕染美甲教程', '手绘美甲', '穿戴甲制作'],
  '按短甲找': ['短甲美甲', '圆短甲', '素甲显手白', '不留长美甲'],
  '博主选题': ['美甲翻车', '美甲避雷', '美甲师视角', '美甲成本拆解', '在家做美甲']
};

const SHOPS = {
  taobao: { name: '淘宝', url: k => `https://s.taobao.com/search?q=${encodeURIComponent(k)}`, tone: 'retail' },
  pdd:    { name: '拼多多', url: k => `https://mobile.yangkeduo.com/search_result.html?search_key=${encodeURIComponent(k)}`, tone: 'cheap' },
  ali:    { name: '1688', url: k => `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(k)}`, tone: 'b2b' }
};

const SOCIALS = {
  xhs: { name: '小红书', url: k => `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(k)}&type=51` },
  dy:  { name: '抖音',   url: k => `https://www.douyin.com/search/${encodeURIComponent(k)}` }
};
