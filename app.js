/* =========================================================
   美甲爆款工作台 · 交互逻辑
   ========================================================= */

const LS = 'nailWorkbench.v1';
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const yuan = n => '¥' + (Math.round(n * 100) / 100).toLocaleString('zh-CN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

// 是否有后端代理（静态分享版无后端时为 false：封面走原图、抓取页回退本地缓存）
let BACKEND = true;

/* ============ 前端视觉识别（直连 DashScope，无需后端）============ */
const VISION_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const VISION_MODEL = 'qwen-vl-max';
const VISION_SYSTEM = `你是一位资深美甲用品采购顾问。用户会上传一张美甲款式照片，你需要识别其中用到的材料、工具、饰品、设备，并给出采购建议。
只输出 JSON，不要任何多余文字或 Markdown 代码块标记。格式：
{"items":[{"name":"底胶","category":"基础耗材","reason":"打底必备，几乎所有款式都需要"},{"name":"猫眼胶","category":"特效材料","reason":"图中明显的猫眼效果"}]}
category 必须是以下之一：基础耗材 / 色料 / 特效材料 / 饰品配件 / 甲片穿戴 / 手工具 / 设备。
name 请使用常见美甲材料名称（如：底胶、封层、甲油胶、猫眼胶、镜面铬粉、晕染胶、平底钻、异形珍珠、美甲光疗灯、打磨机 等），便于后续在物料库里匹配比价。最多列出 12 项，按重要性排序。`;
const MATERIAL_VISION_SYSTEM = `你是一位美甲材料库管理员。用户会上传一张自己购买的美甲材料实物照片（可能是一件或多件材料摆在一起拍的）。请识别照片中出现的材料，逐项输出：
{"items":[{"name":"猫眼胶","category":"特效材料","brand":"","spec":"8ml","count":1},{"name":"平底钻","category":"饰品配件","brand":"","spec":"混装","count":1}]}
要求：
- name：材料常用名（如 底胶 / 甲油胶 / 猫眼胶 / 镜面铬粉 / 晕染胶 / 平底钻 / 异形珍珠 / 光疗灯 / 打磨机 / 死皮剪 / 全贴甲片 等）。
- category：必须是以下之一：基础耗材 / 色料 / 特效材料 / 饰品配件 / 甲片穿戴 / 手工具 / 设备。
- brand：品牌（看清就写，看不清或没标写空字符串 ""）。
- spec：规格或色号（如 "8ml"、"#05 奶茶色"、"48W"，看不清写 ""）。
- count：图中可见的大致件数（整数，看不清填 1）。`;
const TUTORIAL_SYSTEM = `你是一位资深美甲培训师。用户会上传一张美甲款式照片，你需要根据照片中实际看到的款式，给出该款式的拆解分析 + 详细、可上手的分步教程。

只输出 JSON，不要任何多余文字或 Markdown 代码块标记。格式：
{
  "styleName": "猫眼极光美甲",
  "summary": "深蓝底配银白极光猫眼，转动有流动光带，显白又高级。",
  "breakdown": {
    "elements": ["猫眼","极光","镜面"],
    "shapes": ["椭圆甲"],
    "ornaments": ["钻","珍珠"],
    "handDrawn": false,
    "catEye": true,
    "difficulty": "进阶",
    "colors": ["深蓝","银白"],
    "materials": ["猫眼胶","极光粉","免洗封层","粘钻胶"]
  },
  "audience": ["想要显白款","进阶新手"],
  "tutorial": [
    {"step":1,"title":"前置修甲","detail":"修整甲型为椭圆，推死皮、打磨甲面至哑光，除尘后上结合剂。","tools":["死皮剪","海绵锉","结合剂"],"time":15,"tips":"甲面一定要去油去水，否则后期易起翘。"},
    {"step":2,"title":"打底+上色","detail":"薄涂底胶照灯；再涂两遍深蓝猫眼胶，每遍照灯60秒。","tools":["底胶","深蓝猫眼胶","光疗机"],"time":15,"tips":"底色要薄而匀，太厚猫眼光吸不出来。"}
  ]
}

要求：
- breakdown.elements：照片里能看到的工艺/元素（猫眼、晕染、法式、渐变、镜面、手绘、磨砂、延长、镶钻 等）。
- breakdown.shapes：指甲形状（椭圆、方圆、尖形、短圆、芭蕾甲 等）。
- breakdown.ornaments：饰品（钻、珍珠、金箔、链条、立体雕花、蝴蝶结 等）；没有就写 []。
- breakdown.handDrawn / catEye：按照片实际判断是否手绘 / 是否有猫眼效果（布尔）。
- breakdown.difficulty：入门 / 进阶 / 高手 三选一。
- breakdown.colors：照片主色（中文）。
- breakdown.materials：做出这款需要的材料/工具（中文常用名）。
- tutorial：4-8 个分步，必须紧扣照片这款式的真实做法（不要通用套话）；每步含 title、detail、tools（字符串数组）、time（分钟整数）、tips。
- 一定基于图片判断，不同款式给出不同教程，不要千篇一律。`;

function getVisionKey() { try { return (localStorage.getItem('nailVisionKey') || '').trim(); } catch (e) { return ''; } }
function setVisionKey(k) { try { localStorage.setItem('nailVisionKey', (k || '').trim()); } catch (e) {} }

// 前端直连 DashScope 视觉识别（已实测浏览器 CORS 支持，无需后端）
async function visionAnalyze(image, system) {
  const key = getVisionKey();
  if (!key) return { needKey: true, error: '未配置视觉模型 Key，请在「⚙️ 设置」填入 DashScope Key 后重试' };
  const messages = [
    { role: 'system', content: system || VISION_SYSTEM },
    { role: 'user', content: [
      { type: 'image_url', image_url: { url: image } },
      { type: 'text', text: '请分析这张美甲图，按约定 JSON 格式返回。' }
    ]}
  ];
  try {
    const r = await fetch(VISION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: VISION_MODEL, messages, temperature: 0.3 })
    });
    if (!r.ok) {
      let detail = ''; try { detail = (await r.text()).slice(0, 400); } catch (e) {}
      return { ok: false, error: '视觉模型调用失败（' + r.status + '）：' + detail };
    }
    const js = await r.json();
    const content = (js.choices && js.choices[0] && js.choices[0].message && js.choices[0].message.content) || '';
    let parsed = null;
    try { parsed = JSON.parse(content); } catch (e) {
      const m = content.match(/\{[\s\S]*\}/); if (m) { try { parsed = JSON.parse(m[0]); } catch (e2) {} }
    }
    if (!parsed) return { ok: false, error: '视觉模型返回无法解析：' + content.slice(0, 120) };
    if (Array.isArray(parsed)) return { ok: true, items: parsed };
    if (parsed.items) return { ok: true, items: parsed.items };
    return { ok: true, result: parsed };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

let state = {
  persona: 'artist',
  cart: [],
  drafts: [],
  custom: [],
  incGear: false,
  labor: 60,
  overhead: 15,
  target: 65,
  daily: { searches: [], notes: [], updated: '' },
  analysisKeys: [],
  analysisCustom: []
};

/* ---------------- 持久化 ---------------- */
function save() { try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) {} }
function load() {
  try {
    const r = localStorage.getItem(LS);
    if (r) state = Object.assign(state, JSON.parse(r));
  } catch (e) {}
}

/* ---------------- 数据计算 ---------------- */
/** 归一化：AI 拆解录入的自定义款式可能字段不全，统一在入口补齐，避免各渲染点各打补丁 */
function normalize(s) {
  if (s._n) return s;
  s.palette = s.palette?.length ? s.palette : ['#F5F0EC', '#E8DFD9', '#D9C3B8', '#B9B4B0', '#8E8B89'];
  s.platform = s.platform || []; s.tags = s.tags || []; s.seasons = s.seasons || ['全年'];
  s.elements = s.elements || []; s.steps = s.steps || []; s.bom = s.bom || []; s.shoot = s.shoot || [];
  s.heat = s.heat || {}; s.diff = s.diff || 1; s.trend = s.trend ?? 0;
  s.price = s.price || {}; s.price.retail = s.price.retail || [0, 0];
  s.time = s.time || s.steps.reduce((a, x) => a + (x.min || 0), 0) || 30;
  s._n = 1;
  return s;
}
function allStyles() { return [...STYLES, ...state.custom].map(normalize); }
function findStyle(id) { return allStyles().find(s => s.id === id); }

/** 单次材料成本（不含设备），mode: 'retail' | 'b2b' */
function matCost(style, mode = 'retail') {
  return (style.bom || []).reduce((sum, b) => {
    const m = MATERIALS[b.m];
    if (!m || m.cat === 'gear') return sum;
    return sum + (m[mode] / m.uses) * (b.q || 1);
  }, 0);
}
/** 首次购齐这套所需的整件采购总额 */
function buyCost(style, mode = 'retail', withGear = false) {
  return (style.bom || []).reduce((sum, b) => {
    const m = MATERIALS[b.m];
    if (!m) return sum;
    if (m.cat === 'gear' && !withGear) return sum;
    return sum + m[mode];
  }, 0);
}
function totalTime(style) {
  return style.time || (style.steps || []).reduce((s, x) => s + (x.min || 0), 0);
}
function suggestPrice(style) {
  const mat = matCost(style, 'retail');
  const labor = state.labor * (totalTime(style) / 60);
  const cost = mat + labor + Number(state.overhead);
  const byMargin = cost / (1 - state.target / 100);
  const mkt = style.price?.retail || [0, 0];
  // 建议价：目标毛利算出的价格，夹在真实市场区间内。
  // 若目标毛利要求的价格已超出市场上限 → 说明这个款在当前工时费下达不到目标毛利，
  // 此时取市场上限并标记 capped，让毛利率如实暴露，而不是给一个卖不出去的价。
  let p = byMargin, capped = false;
  if (mkt[0] && p < mkt[0]) p = mkt[0];
  if (mkt[1] && p > mkt[1]) { p = mkt[1]; capped = true; }
  const price = Math.round(p / 10) * 10;
  return { mat, labor, overhead: Number(state.overhead), cost, price, capped, mkt };
}
function stars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }
function heatText(s) {
  const p = [];
  if (s.heat?.xhs) p.push('小红书 ' + s.heat.xhs);
  if (s.heat?.dy) p.push('抖音 ' + s.heat.dy);
  return p.join(' · ') || '—';
}

/* ---------------- Toast ---------------- */
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 2000);
}

/* ---------------- 人设视角 ---------------- */
const PERSONA = {
  artist: { hint: '<strong>美甲师视角</strong>：卡片突出复刻难度、耗时和单客成本；详情页会给你报价建议和话术要点。', focus: 'cost' },
  diy:    { hint: '<strong>在家自己做</strong>：优先看「新手友好」的款；采购比价会算出你第一次要花多少钱把工具买齐。', focus: 'buy' },
  seller: { hint: '<strong>电商选品视角</strong>：卡片显示 1688 进货价与零售差，详情页给出选品建议；建议重点看爆款指数高 + 材料集中的款。', focus: 'b2b' },
  creator:{ hint: '<strong>博主创作视角</strong>：详情页会展开拍摄要点和爆款钩子；优先看抖音热度高、有"过程可看性"的款。', focus: 'shoot' }
};

/* ---------------- 渲染：爆款库 ---------------- */
function renderLibrary() {
  const q = $('#q').value.trim().toLowerCase();
  const fp = $('#fPlatform').value, fd = $('#fDiff').value, fs = $('#fSeason').value, sort = $('#fSort').value;

  let list = allStyles().filter(s => {
    if (q) {
      const hay = [s.name, s.alias, s.desc, ...(s.tags || []), ...(s.elements || [])].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (fp && !(s.platform || []).includes(fp)) return false;
    if (fd) {
      if (fd === '1-2' && s.diff > 2) return false;
      if (fd === '3' && s.diff !== 3) return false;
      if (fd === '4-5' && s.diff < 4) return false;
    }
    if (fs && !(s.seasons || []).includes(fs)) return false;
    return true;
  });

  const cmp = {
    trend: (a, b) => (b.trend || 0) - (a.trend || 0),
    cost:  (a, b) => matCost(a) - matCost(b),
    diff:  (a, b) => (a.diff || 0) - (b.diff || 0),
    time:  (a, b) => totalTime(a) - totalTime(b),
    margin:(a, b) => (suggestPrice(b).price - suggestPrice(b).cost) - (suggestPrice(a).price - suggestPrice(a).cost)
  }[sort];
  list.sort(cmp);

  const focus = PERSONA[state.persona].focus;
  $('#grid').innerHTML = list.map(s => {
    const inCart = state.cart.includes(s.id);
    const mc = matCost(s), sp = suggestPrice(s);
    let m3;
    if (focus === 'b2b') {
      m3 = `<div class="metric"><b>${yuan(buyCost(s, 'b2b'))}</b><span>1688 备货</span></div>
            <div class="metric"><b style="color:var(--green)">${Math.round((1 - buyCost(s,'b2b') / Math.max(buyCost(s,'retail'),1)) * 100)}%</b><span>低于零售</span></div>`;
    } else if (focus === 'buy') {
      m3 = `<div class="metric"><b>${yuan(buyCost(s, 'retail'))}</b><span>购齐花费</span></div>
            <div class="metric"><b>${yuan(mc)}</b><span>单次成本</span></div>`;
    } else if (focus === 'shoot') {
      m3 = `<div class="metric"><b>${s.heat?.dy || '—'}</b><span>抖音热度</span></div>
            <div class="metric"><b>${totalTime(s)}′</b><span>可拍时长</span></div>`;
    } else {
      m3 = `<div class="metric"><b>${yuan(mc)}</b><span>单客材料</span></div>
            <div class="metric"><b style="color:var(--accent)">${yuan(sp.price)}</b><span>建议报价</span></div>`;
    }
    return `<article class="card">
      ${s.img
        ? `<div class="card-img"><img src="${s.img}" alt="${s.name}" loading="lazy"><span class="img-badge">AI 参考图</span></div>`
        : `<div class="swatch">${s.palette.map(c => `<i style="background:${c}"></i>`).join('')}</div>`}
      <div class="card-body">
        <div class="card-top">
          <div><div class="card-name">${s.name}</div><div class="card-alias">${s.alias || ''}</div></div>
          <span class="trend-chip">${s.trend || '—'}</span>
        </div>
        ${s.img ? `<div class="card-palette">${s.palette.map(c => `<i style="background:${c}"></i>`).join('')}</div>` : ''}
        <div class="tag-row">
          ${(s.platform || []).map(p => `<span class="tag plat-${p}">${p === 'xhs' ? '小红书' : '抖音'}</span>`).join('')}
          ${(s.tags || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
        <p class="card-desc">${s.desc || ''}</p>
        <div class="metrics">
          <div class="metric"><b class="stars">${stars(s.diff || 1)}</b><span>难度</span></div>
          <div class="metric"><b>${totalTime(s)}′</b><span>耗时</span></div>
          ${m3}
        </div>
        <div class="card-actions">
          <button class="btn-detail" data-detail="${s.id}">查看拆解</button>
          <button class="btn-cart ${inCart ? 'in' : ''}" data-cart="${s.id}">${inCart ? '✓ 已加入' : '加入采购'}</button>
        </div>
      </div>
    </article>`;
  }).join('');

  $('#emptyLib').hidden = list.length > 0;
  setBadge('#cntLib', allStyles().length);
  // 贴纸装饰：给卡片加随机轻微旋转
  $$('.card').forEach((c, i) => {
    const r = (i % 3 - 1) * 0.6;
    c.style.transform = `rotate(${r}deg)`;
    c.onmouseenter = () => c.style.transform = 'translateY(-3px) rotate(0deg)';
    c.onmouseleave = () => c.style.transform = `rotate(${r}deg)`;
  });
}

function setBadge(sel, n) {
  const el = $(sel);
  el.textContent = n;
  el.dataset.zero = n ? '0' : '1';
}

/* ---------------- 渲染：详情抽屉 ---------------- */
function openDetail(id) {
  const s = findStyle(id);
  if (!s) return;
  const mkt = s.price.retail;
  const mc = matCost(s), mcb = matCost(s, 'b2b'), sp = suggestPrice(s);
  const inCart = state.cart.includes(s.id);

  const bomRows = (s.bom || []).map(b => {
    const m = MATERIALS[b.m]; if (!m) return '';
    const unit = m.cat === 'gear' ? 0 : (m.retail / m.uses) * (b.q || 1);
    return `<tr>
      <td><div class="mname">${m.name}</div>${b.note ? `<div class="mnote">${b.note}</div>` : ''}</td>
      <td><span class="cat-tag">${CATS[m.cat]}</span></td>
      <td class="num">${m.spec}</td>
      <td class="num">${m.cat === 'gear' ? '<span class="mnote">设备</span>' : yuan(unit)}</td>
      <td>${shopLinks(m.kw)}</td>
    </tr>`;
  }).join('');

  const personaBox = {
    artist: `<div class="persona-box"><h4>💼 接单要点</h4><ul class="d-list">
        <li>单客材料成本 <b>${yuan(mc)}</b>，按 ¥${state.labor}/小时工时 + ¥${state.overhead} 分摊，总成本约 <b>${yuan(sp.cost)}</b>。</li>
        <li>市场价区间 ${mkt[0] ? yuan(mkt[0]) + ' – ' + yuan(mkt[1]) : '待补充'}，建议挂 <b>${yuan(sp.price)}</b>，毛利率 ${Math.round((1 - sp.cost / sp.price) * 100)}%${sp.capped ? '（已触市场上限，想提毛利只能提速）' : ''}。</li>
        <li>预约时长按 <b>${totalTime(s)} 分钟</b> 排，新手加 20 分钟缓冲。</li>
        <li>难度 ${stars(s.diff)}，${s.diff >= 4 ? '建议先在假手上练熟再接单。' : s.diff <= 2 ? '可以放心接，翻台快。' : '中等难度，注意关键步骤别赶时间。'}</li>
      </ul></div>`,
    diy: `<div class="persona-box"><h4>🏠 在家做的话</h4><ul class="d-list">
        <li>第一次购齐所有材料约 <b>${yuan(buyCost(s, 'retail'))}</b>（不含光疗灯等设备）。</li>
        <li>买齐后每做一次只花 <b>${yuan(mc)}</b>，做 ${Math.ceil(buyCost(s,'retail') / Math.max(sp.price - mc, 1))} 次就回本（对比去店里做）。</li>
        <li>难度 ${stars(s.diff)}，${s.diff <= 2 ? '适合新手直接上手。' : s.diff === 3 ? '建议先练熟基础款再试。' : '不建议新手首选，容易挫败。'}</li>
        <li>预留 <b>${totalTime(s) + 30} 分钟</b>，新手实际耗时通常是教程的 1.5 倍。</li>
      </ul></div>`,
    seller: `<div class="persona-box"><h4>📦 选品分析</h4><ul class="d-list">
        <li>整套材料 1688 备货 <b>${yuan(buyCost(s, 'b2b'))}</b>，零售端合计 <b>${yuan(buyCost(s, 'retail'))}</b>，价差 <b>${Math.round((1 - buyCost(s,'b2b') / buyCost(s,'retail')) * 100)}%</b>。</li>
        <li>单次使用成本：零售价口径 ${yuan(mc)} / 批发价口径 ${yuan(mcb)}。</li>
        <li>爆款指数 <b>${s.trend || '—'}</b>，热度：${heatText(s)}。</li>
        ${s.price.b2bNote ? `<li>${s.price.b2bNote}</li>` : ''}
      </ul></div>`,
    creator: `<div class="persona-box"><h4>🎬 内容创作</h4><ul class="d-list">
        ${(s.shoot || []).map(x => `<li>${x}</li>`).join('')}
        ${s.hook ? `<li><b>爆款钩子：</b>${s.hook}</li>` : ''}
        <li>热度参考：${heatText(s)}</li>
      </ul></div>`
  }[state.persona];

  $('#drawerBody').innerHTML = `
    <div class="d-hero">
      ${s.img ? `<div class="d-hero-img"><img src="${s.img}" alt="${s.name}"><span class="img-badge">AI 参考图</span></div>` : ''}
      <h2>${s.name}</h2>
      <div class="card-alias">${s.alias || ''} · 爆款指数 ${s.trend || '—'} · ${heatText(s)}</div>
      <div class="tag-row">
        ${(s.platform || []).map(p => `<span class="tag plat-${p}">${p === 'xhs' ? '小红书' : '抖音'}</span>`).join('')}
        ${(s.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
        ${(s.seasons || []).map(t => `<span class="tag">${t}</span>`).join('')}
      </div>
      <div class="d-swatch">${s.palette.map(c => `<i style="background:${c}" data-c="${c}"></i>`).join('')}</div>
    </div>
    <div class="d-body">
      <div class="d-actions">
        <button class="${inCart ? 'ghost-btn' : 'primary-btn'}" data-cart="${s.id}">${inCart ? '✓ 已在采购车' : '加入采购车'}</button>
        <a class="ghost-btn" href="${SOCIALS.xhs.url(s.name + ' 美甲')}" target="_blank" rel="noopener">在小红书看同款</a>
        <a class="ghost-btn" href="${SOCIALS.dy.url(s.name + ' 美甲教程')}" target="_blank" rel="noopener">在抖音看教程</a>
      </div>

      ${personaBox}

      <div class="d-sec" style="margin-top:26px">
        <h3>这个款为什么火</h3>
        <p class="d-desc">${s.desc}</p>
      </div>

      <div class="d-sec">
        <h3>核心元素拆解</h3>
        <ul class="d-list">${(s.elements || []).map(e => `<li>${e}</li>`).join('')}</ul>
      </div>

      <div class="d-sec">
        <h3>分步教程 · 共 ${totalTime(s)} 分钟</h3>
        ${(s.steps || []).map((st, i) => `
          <div class="step">
            <div class="step-head">
              <div class="step-no">${i + 1}</div>
              <div class="step-title">${st.t}</div>
              <div class="step-min">${st.min}′</div>
            </div>
            <p class="step-d">${st.d}</p>
            ${st.tools?.length ? `<div class="step-tools">${st.tools.map(t => `<i>${MATERIALS[t]?.name || t}</i>`).join('')}</div>` : ''}
            ${st.pit ? `<div class="step-pit"><b>⚠ 翻车点：</b>${st.pit}</div>` : ''}
          </div>`).join('')}
      </div>

      <div class="d-sec">
        <h3>材料清单 & 比价</h3>
        <div class="table-wrap">
          <table class="mat-table bom-table" style="min-width:600px">
            <thead><tr><th>材料</th><th>类别</th><th class="num">规格</th><th class="num">单次成本</th><th>比价直达</th></tr></thead>
            <tbody>
              ${bomRows}
              <tr class="total-row">
                <td colspan="3">单次材料成本合计（不含设备）</td>
                <td class="num">${yuan(mc)}</td>
                <td><span class="mnote">整套购齐 ${yuan(buyCost(s, 'retail'))}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`;

  $('#drawer').classList.add('on');
  $('#mask').classList.add('on');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  $('#drawer').classList.remove('on');
  $('#mask').classList.remove('on');
  document.body.style.overflow = '';
}

/* ---------------- 小红书真实笔记 · 图文 + 自动拆解 ---------------- */
const BREAKDOWN = {
  color: [['红', '红色系'], ['粉', '粉色系'], ['蓝', '蓝色系'], ['紫', '紫色系'], ['绿', '绿色系'], ['黄', '黄色系'], ['橙', '橙色系'], ['裸', '裸色/奶茶'], ['奶茶', '奶茶色'], ['香槟', '香槟金'], ['金', '金色'], ['银', '银色'], ['黑', '黑色系'], ['白', '白色/清透'], ['渐变', '渐变'], ['晕染', '晕染'], ['磨砂', '磨砂雾面'], ['镜面', '镜面'], ['冰透', '冰透'], ['果冻', '果冻透色'], ['绒毛', '绒毛/绒感'], ['雪花', '雪花绒'], ['贝壳', '贝壳/珠光'], ['腮红', '腮红甲']],
  element: [['法式', '法式'], ['线条', '线条/勾边'], ['晕染', '晕染'], ['渐变', '渐变'], ['雪花', '雪花'], ['樱花', '樱花'], ['爱心', '爱心'], ['蝴蝶', '蝴蝶'], ['星星', '星星'], ['月亮', '月亮'], ['字母', '字母/英文'], ['贝壳', '贝壳'], ['玻璃', '玻璃纸/气泡'], ['浮雕', '浮雕'], ['猫眼', '猫眼磁吸'], ['极光', '极光'], ['棋盘', '棋盘格'], ['格纹', '格纹'], ['大理石', '大理石纹']],
  ornament: [['钻', '水钻/碎钻'], ['珍珠', '珍珠'], ['钢珠', '钢珠/铆钉'], ['铆钉', '铆钉'], ['亮片', '亮片/金葱'], ['金箔', '金箔'], ['链条', '链条'], ['锆石', '锆石'], ['干花', '干花'], ['贴纸', '贴纸'], ['蝴蝶结', '蝴蝶结'], ['立体', '立体雕花'], ['金属', '金属片']],
  shape: [['短甲', '短甲'], ['长甲', '长甲'], ['方圆', '方圆甲'], ['椭圆', '椭圆甲'], ['杏仁', '杏仁甲'], ['圆甲', '圆甲'], ['尖甲', '尖甲'], ['芭蕾', '芭蕾甲'], ['梯型', '梯型甲'], ['棺材', '棺材甲'], ['腮红', '腮红甲'], ['穿戴', '穿戴甲']],
  handDrawn: ['手绘', '彩绘', '手绘花', '卡通', '勾边手绘', '晕染手绘'],
  catEye: ['猫眼', '极光猫眼', '银河猫眼', '星空猫眼'],
  diff: [['新手', '新手友好'], ['手残', '新手友好'], ['简单', '简单'], ['易', '简单'], ['零基础', '新手友好'], ['复杂', '偏复杂'], ['难', '偏难'], ['高阶', '高阶'], ['手绘', '需手绘功底'], ['进阶', '进阶']]
};

function analyzeBreakdown(text) {
  const t = (text || '').toLowerCase();
  const pick = (arr) => arr.filter(([k]) => t.includes(k.toLowerCase())).map(([, label]) => label);
  const colors = pick(BREAKDOWN.color);
  const elements = pick(BREAKDOWN.element);
  const ornaments = pick(BREAKDOWN.ornament);
  const shapes = pick(BREAKDOWN.shape);
  const diff = pick(BREAKDOWN.diff);
  const handDrawn = BREAKDOWN.handDrawn.some(k => t.includes(k.toLowerCase()));
  const catEye = BREAKDOWN.catEye.some(k => t.includes(k.toLowerCase()));
  // 材料匹配（从内置材料库 kw 里找命中词）
  const mats = [];
  for (const id in MATERIALS) {
    const kw = (MATERIALS[id].kw || '');
    if (kw && t.includes(kw.toLowerCase().split(' ')[0]) && !mats.includes(MATERIALS[id].name)) mats.push(MATERIALS[id].name);
  }
  return {
    colors: colors.length ? colors : ['以原帖图为准'],
    elements: elements.length ? elements : ['以原帖图为准'],
    ornaments: ornaments.length ? ornaments : ['无明显饰品（以绘画/底色为主）'],
    shapes: shapes.length ? shapes : ['通用甲型'],
    diff: diff.length ? diff : ['中等'],
    handDrawn, catEye,
    mats: mats.slice(0, 8),
    audience: recommendAudience({ shapes, elements, ornaments, handDrawn, catEye, colors })
  };
}

// 根据拆解结果生成「推荐人群」建议
function recommendAudience(bd) {
  const out = [];
  const sh = bd.shapes.join('');
  if (/椭圆|杏仁/.test(sh)) out.push('椭圆甲 / 杏仁甲最显手指修长，适合手指纤细、甲床偏长的客户，视觉上拉长手型。');
  if (/方圆|圆甲/.test(sh)) out.push('方圆甲 / 圆甲耐磕碰、好打理，适合指甲偏短、肉手或日常通勤党。');
  if (/短甲/.test(sh)) out.push('短甲干净利落，适合指甲天生偏短、不想留长或职场素颜的客户。');
  if (/长甲/.test(sh)) out.push('长甲气场足、造型空间大，适合指甲本身长、爱拍照出片或做新娘款。');
  if (/芭蕾|梯型|棺材/.test(sh)) out.push('个性甲型辨识度高，适合追求独特风格、敢尝新的客户。');
  if (bd.catEye) out.push('猫眼 / 极光自带高级感且显白，适合喜欢轻奢风、想低调又有质感的客户。');
  if (/钻|珍珠|铆钉|钢珠|金箔|锆石|链条/.test(bd.ornaments.join(''))) out.push('饰品偏多（钻 / 珍珠 / 铆钉），精致华丽，适合约会、聚会、新娘或想要「贵气感」的客户。');
  if (bd.handDrawn) out.push('含手绘，独一无二有温度，适合追求定制化、愿意为手艺加价的客户。');
  if (/极光|镜面|晕染|渐变/.test(bd.elements.join(''))) out.push('极光 / 镜面 / 晕染上镜又酷感，适合爱拍照、发小红书的年轻客户。');
  if (/磨砂|裸|奶茶|冰透/.test(bd.colors.join(''))) out.push('磨砂 / 裸色 / 冰透低调耐看，适合职场、素颜或走极简风的客户。');
  if (out.length < 2) out.push('通用百搭款不挑手型，新手也能轻松驾驭，适合第一次尝试美甲的客户。');
  return out;
}

// 根据拆解结果生成「详细分步上手教程」——按款式真实做法，每步含 title/detail/tools/time/tips（与视觉模型返回格式一致）
function buildDetailedTutorial(bd, titleText) {
  const t = (titleText || '').toLowerCase();
  const elem = bd.elements.join('');
  const col = bd.colors.join('');
  const orn = bd.ornaments.join('');
  const isCat = bd.catEye;
  const isHd = bd.handDrawn;
  const diff = (bd.diff || ['中等'])[0];
  const steps = [];
  let stepNum = 0;

  function push(s) { steps.push({ step: ++stepNum, ...s }); }

  // ===== 第1步：前置处理（始终有，但内容随款式变）=====
  const freeAdvice = /法式|渐变|晕染|镜面|极光|大理石|星空|银河|全覆盖|延长/.test(elem + col)
    ? '这款' + (/法式/.test(elem) ? '需沿微笑线精确留白' : '颜色/效果覆盖至指尖') + '，底胶+色胶要顺延包住游离线做出完整甲面。'
    : /裸|奶茶|冰透|果冻|透/.test(col)
      ? '半透款游离线保留自然通透感即可，只需在前端薄薄包边防起翘，不要刻意遮盖。'
      : '常规款自然留白；若甲面需全覆盖则顺延遮住游离线。';
  push({
    title: '前置修甲与预处理',
    detail: '根据目标甲型修整形状（' + (bd.shapes.length ? bd.shapes.join('/') : '椭圆甲') + '），推死皮、打磨甲面至哑光、除尘。' + freeAdvice,
    tools: ['死皮剪', '海绵锉', '除尘刷', '结合剂'],
    time: 15,
    tips: '甲面去油去水是保持时间的基础，建议用酒精棉片再擦一遍再上结合剂。'
  });

  // ===== 第2步：底色/打底（随色系和元素变化）=====
  const hasColor = !/裸|透|果冻|冰透/.test(col) || /渐变|晕染|法式|猫眼/.test(elem);
  if (/渐变/.test(elem)) {
    push({
      title: '渐变底色',
      detail: '由指尖向根部做渐变：海绵蘸取' + (col || '主色') + '甲油胶，从指甲前端轻拍向根部，深→浅过渡。拍2-3层，每层照灯60秒。',
      tools: ['海绵', (col || '主色') + '甲油胶', '光疗机'],
      time: 20,
      tips: '渐变要少量多次薄拍，别一次堆太厚否则积胶起皱。'
    });
  } else if (/晕染/.test(elem)) {
    push({
      title: '晕染底色',
      detail: '先薄涂' + (col || '底色') + '照灯；再用笔刷蘸取晕染胶（或用两色甲油胶在半干状态混合），在甲面上点蘸推开形成' + (col ? col + '调' : '') + '晕染效果。',
      tools: ['晕染笔/排笔', '甲油胶×2-3色', '洗笔水', '光疗机'],
      time: 25,
      tips: '晕染胶半干时操作最佳（约10-15秒后），太湿会混成一团、太干推不开。边缘可用洗笔水轻轻晕开更自然。'
    });
  } else if (isCat) {
    push({
      title: '猫眼底色',
      detail: '涂' + (col || '猫眼胶自带色') + '底胶照灯；再涂猫眼胶' + (/宽光|宽猫眼|极光|银河|星空|横扫|拉丝/.test(t) ? '2遍（宽光款需要较厚胶层才能吸出光带）' : '1-2遍') + '，每遍照灯60秒。',
      tools: ['底胶', '猫眼胶', '光疗机'],
      time: 15,
      tips: '猫眼胶不能太薄也不能太厚——薄了吸不出光带，厚了容易流动不均。'
    });
  } else if (/法式/.test(elem)) {
    push({
      title: '法式底色',
      detail: (col && !/透明|透|裸/.test(col) ? '全甲薄涂' + col + '作为底色照灯；然后' : '') + '用细笔或法式贴纸沿微笑线勾勒' + (/斜法式/.test(t) ? '斜向' : '') + '法式边，留白宽度保持一致（约1-2mm）。',
      tools: ['细笔', (col || '裸色/奶白') + '甲油胶', '法式贴纸(可选)', '光疗机'],
      time: 20,
      tips: '法式边最考验稳度——手抖就用法式贴纸辅助，贴好后刷色再撕贴，边缘超整齐。'
    });
  } else if (hasColor) {
    push({
      title: '上底色',
      detail: '薄涂底胶照灯30秒；再涂' + (col || '主色') + '甲油胶' + (/镜面|极光|铬金/.test(elem + col) ? '（镜面/铬金款底色要饱和均匀，后续扫粉才显效果）' : '') + '，2遍为佳，每遍照灯60秒。',
      tools: ['底胶', (col || '甲油胶'), '光疗机'],
      time: 15,
      tips: '每遍色胶要薄！包边包裹指甲前端和两侧，这是防起翘的关键动作。'
    });
  }

  // ===== 第3步：特效/元素（核心差异化步骤）=====
  if (isCat) {
    const wide = /宽光|宽猫眼|极光|银河|星空|光猫|横扫|拉丝/.test(t);
    const bead = /玻璃珠|龙眼|聚拢|点状|圆点|钢珠猫眼/.test(t);
    push({
      title: wide ? '猫眼宽光吸光' : (bead ? '猫眼玻璃珠聚光' : '猫眼光效'),
      detail: wide
        ? '磁铁横向贴近甲面，从根部往指尖匀速慢扫，停留3-5秒吸出宽幅光带。可重复1-2次增强。' + (/极光|银河|星空/.test(elem) ? '极光/银河感靠这层宽光打底，之后叠极光粉会更梦幻。' : '')
        : bead
          ? '磁铁垂直于甲面中心点停2-3秒，吸出聚拢圆点光效。适合做点缀款，可在甲面不同位置多点几个。'
          : '通用猫眼吸光：横向扫=宽光带（适合极光/银河）；垂直点=玻璃珠（适合点缀）。吸好后立即照灯定形。',
      tools: ['猫眼磁铁(宽光/珠光)', '光疗机'],
      time: 10,
      tips: '吸光前确认胶面平整无气泡——气泡处光带会断。吸光后务必先照灯再进行下一步，否则光效会被破坏。'
    });
  }
  if (/镜面|铬金|镜面粉/.test(elem)) {
    push({
      title: '镜面/铬金效果',
      detail: '免洗封层照灯后，用拇指取适量镜面粉/铬金粉，轻扫或按压在甲面上，整面覆盖至镜面反光效果。然后用软刷扫去浮粉。',
      tools: ['镜面粉/铬金粉', '免洗封层', '软毛刷'],
      time: 10,
      tips: '粉要少！扫多了反而发乌。底层必须是免洗封层且完全照干，否则粉会氧化变色。'
    });
  }
  if (/极光/.test(elem) && !/猫眼/.test(elem)) {
    push({
      title: '极光粉效果',
      detail: '底色照干后薄涂一层免洗封层（半干状态最佳），用小号眼影刷蘸取极光粉，以"点-扫-晕"三步上粉：指尖先点粉→向根部轻扫→边缘晕开。',
      tools: ['极光粉', '免洗封层', '小号眼影刷/硅胶笔'],
      time: 12,
      tips: '极光粉在不同底色上呈现完全不同——深底显冷艳、浅底显甜美。想效果强就叠两层（中间隔一层封层）。'
    });
  }
  if (/磨砂/.test(col) || /磨砂/.test(elem)) {
    push({
      title: '磨砂处理',
      detail: '完成所有颜色和效果后，上免洗封层照灯90秒；待彻底冷却后用海绵锉或磨砂块轻轻打磨甲面至均匀雾面。',
      tools: ['免洗封层', '海绵锉/磨砂块'],
      time: 8,
      tips: '磨砂款千万别蹭到护手霜/油脂，一蹭就发亮斑。做完建议等5分钟再碰水。'
    });
  }
  if (isHd) {
    push({
      title: '手绘图案',
      detail: '根据款式' + (/花朵|花卉|花/.test(t) ? '画花朵（先勾勒花瓣轮廓再填色，由外向内叠色）' : /线条|几何|拉线/.test(t) ? '画几何线条（拉线笔蘸取甲油胶，固定角度匀速拉出直线/折线）' : /卡通|动漫/.test(t) ? '画卡通图案（先用铅笔画草稿定位，再细笔勾线填色）' : '绘制手绘图案（先构线再填色，落笔要稳）') + '。完成后照灯60秒。',
      tools: ['细笔/拉线笔', '甲油胶(绘图色)', '光疗机'],
      time: isHd ? 25 : 15,
      tips: '手绘前确保底色完全照干，否则笔尖会把底色带起来混色。复杂图案分多次照灯，每次只画一小部分。'
    });
  }
  if (/大理石|大理石纹/.test(elem)) {
    push({
      title: '大理石纹',
      detail: '在甲面上涂抹2-3种相邻色块（不照灯），用细笔尖端在色块交界处来回拉动，形成自然石材纹理。满意后照灯定形。',
      tools: ['细笔', '甲油胶×2-3色', '光疗机'],
      time: 18,
      tips: '关键是不照灯状态下操作！胶没干时才能拉开纹理。动作要快不然胶干了拉不动。'
    });
  }

  // ===== 第4步：饰品（如有）=====
  if (/钻|珍珠|铆钉|钢珠|金箔|锆石|链条|金属|立体|蝴蝶结|贝壳|亮片/.test(orn)) {
    const ornList = orn.match(/钻|珍珠|铆钉|钢珠|金箔|锆石|链条|金属|蝴蝶结|贝壳|亮片/g) || [orn];
    push({
      title: '饰品粘贴与固定',
      detail: '用粘钻胶/光疗胶在甲面设计位置点一小珠，镊子夹取' + ornList.slice(0,3).join('/') + '放正。大颗饰品建议分布在甲面前1/2区，避免影响抓握。全部摆好照灯60秒。',
      tools: ['粘钻胶', '镊子', ...ornList.slice(0,3), '光疗机'],
      time: 15,
      tips: '饰品根部必须用封层"包边"（裹住饰品底部一半），否则洗澡/梳头时很容易被挂掉。大颗钻建议埋进封层2/3更牢固。'
    });
  }

  // ===== 第5步：封层收尾（随表面处理变化）=====
  const topDetail = /磨砂/.test(col + elem)
    ? '上磨砂封层（或普通封层照灯后再打磨出雾面）。'
    : /镜面|极光|铬金/.test(elem)
      ? '先上一层免洗封层锁住效果（镜面/极光粉易氧化），照灯后再检查是否需要补粉。'
      : '上免洗封层均匀覆盖全甲，包裹饰品根部（包边）。';
  push({
    title: '封层与收尾',
    detail: topDetail + ' 最后检查游离线和甲面前端是否都包到了——包边不到位是3天内起翘的头号原因。',
    tools: [/磨砂/.test(col + elem) ? ['磨砂封层/封层+打磨'] : ['免洗封层'], '光疗机'],
    time: 10,
    tips: '封层不要太厚（尤其饰品周围），厚了容易缩胶露白边。照灯时间要足（UV灯120秒/LED灯60-90秒）。'
  });

  return steps;
}

// 弹窗内标签/徽章小工具
function nmTags(arr) { return (arr || []).map(x => `<span class="nm-chip">${esc(x)}</span>`).join(''); }
function nmYesNo(b) { return `<span class="nm-badge ${b ? 'yes' : 'no'}">${b ? '✓ 有' : '✕ 无'}</span>`; }

// 视觉升级缓存（同一张图不重复调用视觉模型）
const _tutCache = {};
let _nmToken = 0;

// 弹窗：爆款中心「看图拆解 + 上手教程」。先秒开标题快速版，再用视觉模型升级为图片专属版
async function openNoteDetail(noteId, titleHint, coverHint, likesHint) {
  if (!noteId) return;
  const token = ++_nmToken;
  const bd = analyzeBreakdown(titleHint || '');
  const tut = buildDetailedTutorial(bd, titleHint || '');
  const heroImg = coverHint ? `<div class="nm-hero"><img src="${xhsImg(coverHint)}" alt="" onerror="this.parentNode.style.background='var(--surface-2)';this.style.display='none'"></div>` : '';
  const title = esc(titleHint || '小红书爆款美甲');
  const sub = likesHint ? '♡ ' + esc(likesHint) + ' 赞 · ' : '';
  $('#noteModalBody').innerHTML = `
    <div class="nm-head">
      <div class="nm-title">${title}</div>
      <div class="nm-sub">${sub}<a href="https://www.xiaohongshu.com/explore/${esc(noteId)}" target="_blank" rel="noopener">看小红书原帖 ↗</a></div>
    </div>
    ${heroImg}
    <div class="nm-style-head" id="nmStyleHead"></div>
    <div class="nm-section">
      <div class="nm-sec-title">🔍 自动拆解</div>
      <div class="nm-grid" id="nmBreakGrid">
        <div class="nm-card"><div class="nm-card-l">美甲元素</div><div class="nm-card-v">${nmTags(bd.elements)}</div></div>
        <div class="nm-card"><div class="nm-card-l">甲型</div><div class="nm-card-v">${nmTags(bd.shapes)}</div></div>
        <div class="nm-card"><div class="nm-card-l">饰品</div><div class="nm-card-v">${nmTags(bd.ornaments)}</div></div>
        <div class="nm-card"><div class="nm-card-l">是否手绘</div><div class="nm-card-v">${nmYesNo(bd.handDrawn)}</div></div>
        <div class="nm-card"><div class="nm-card-l">是否猫眼</div><div class="nm-card-v">${nmYesNo(bd.catEye)}</div></div>
        <div class="nm-card"><div class="nm-card-l">难度</div><div class="nm-card-v">${nmTags(bd.diff)}</div></div>
        <div class="nm-card"><div class="nm-card-l">配色</div><div class="nm-card-v">${nmTags(bd.colors)}</div></div>
        <div class="nm-card"><div class="nm-card-l">可能材料</div><div class="nm-card-v">${bd.mats.length ? nmTags(bd.mats) : '<span class="nm-chip">需看原帖判断</span>'}</div></div>
      </div>
    </div>
    <div class="nm-audience" id="nmAudience">
      <div class="nm-sec-title">👥 推荐人群</div>
      <ul>${bd.audience.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
    </div>
    <div class="nm-tutorial">
      <div class="nm-sec-title">🛠️ 上手教程</div>
      <div class="nm-tut-status" id="nmTutStatus"><span class="nm-spinner"></span> 正在识别图片生成专属教程…</div>
      <div class="nm-tut-list" id="nmTutList">
        ${tut.map(s => `
          <div class="nm-step">
            <div class="nm-step-top">
              <span class="nm-step-num">${esc(String(s.step))}</span>
              <span class="nm-step-title">${esc(s.title || '')}</span>
              ${s.time ? `<span class="nm-step-time">⏱ ${esc(String(s.time))} min</span>` : ''}
            </div>
            <div class="nm-step-detail">${esc(s.detail || '')}</div>
            ${(s.tools && s.tools.length) ? `<div class="nm-step-tools"><span class="nm-step-tools-l">🧰 工具/材料</span>${s.tools.map(t => `<span class="nm-chip">${esc(t)}</span>`).join('')}</div>` : ''}
            ${s.tips ? `<div class="nm-step-tip">💡 ${esc(s.tips)}</div>` : ''}
          </div>`).join('')}
      </div>
    </div>
    <div class="nm-extra" id="nmExtra">
      <button class="nm-extra-btn" id="nmExtraBtn">🔄 看原帖更多图文（可选）</button>
    </div>
    <p class="nm-note">教程基于款式拆解自动生成（按标题关键词定制分步步骤）；图片识别成功后会升级为「按图识别版」。完整教程点「看小红书原帖」。</p>`;
  openNoteModal();
  const btn = $('#nmExtraBtn');
  if (btn) btn.onclick = () => loadNoteExtra(noteId, coverHint);
  if (coverHint) enrichTutorialWithVision(coverHint, token, bd);
}

// 用视觉模型识别封面图，升级「自动拆解 + 上手教程」为图片专属版本
async function enrichTutorialWithVision(cover, token, bd) {
  const headEl = $('#nmStyleHead'), gridEl = $('#nmBreakGrid'), audEl = $('#nmAudience'), listEl = $('#nmTutList'), statusEl = $('#nmTutStatus');
  const fail = (msg) => { if (statusEl && token === _nmToken) statusEl.textContent = msg; };
  try {
    let data;
    if (_tutCache[cover]) data = _tutCache[cover];
    else {
      // 获取图片并检测空图
      let dataUrl = '';
      try { dataUrl = await urlToDataUrl(xhsImg(cover)); } catch (e) { /* fetch failed */ }
      if (!dataUrl || dataUrl.length < 100 || !dataUrl.startsWith('data:image')) {
        return fail('⚠️ 图片加载失败（Cookie 可能已过期），已按标题关键词生成详细教程。可在工作台更新 Cookie 后重试。');
      }
      if (token !== _nmToken) return;
      const r = await visionAnalyze(dataUrl, TUTORIAL_SYSTEM);
      data = r;
      if (token !== _nmToken) return;
      _tutCache[cover] = data;
    }
    if (!data || !data.ok) {
      return fail(data && data.needKey
        ? '⚠️ 未配置视觉模型 Key（点右上角 ⚙️ 设置 填入），已按款式拆解生成详细教程'
        : '⚠️ 图片识别暂不可用，已按款式拆解生成详细教程（基于款式拆解的定制步骤）');
    }
    const res = data.result || {};
    // 始终展示能拿到的视觉信息（风格名、拆解、推荐人群）
    if (headEl && token === _nmToken) {
      headEl.innerHTML = (res.styleName ? `<div class="nm-style-name">${esc(res.styleName)}</div>` : '') + (res.summary ? `<div class="nm-style-sum">${esc(res.summary)}</div>` : '');
    }
    if (gridEl && token === _nmToken) {
      const b = res.breakdown || {};
      const mats = (b.materials || []).map(m => `<span class="nm-chip">${esc(m)}</span>`).join('') || '<span class="nm-chip">需看原帖判断</span>';
      gridEl.innerHTML = `
        <div class="nm-card"><div class="nm-card-l">美甲元素</div><div class="nm-card-v">${nmTags(b.elements)}</div></div>
        <div class="nm-card"><div class="nm-card-l">甲型</div><div class="nm-card-v">${nmTags(b.shapes)}</div></div>
        <div class="nm-card"><div class="nm-card-l">饰品</div><div class="nm-card-v">${nmTags(b.ornaments)}</div></div>
        <div class="nm-card"><div class="nm-card-l">是否手绘</div><div class="nm-card-v">${nmYesNo(!!b.handDrawn)}</div></div>
        <div class="nm-card"><div class="nm-card-l">是否猫眼</div><div class="nm-card-v">${nmYesNo(!!b.catEye)}</div></div>
        <div class="nm-card"><div class="nm-card-l">难度</div><div class="nm-card-v">${nmTags(b.difficulty ? [b.difficulty] : [])}</div></div>
        <div class="nm-card"><div class="nm-card-l">配色</div><div class="nm-card-v">${nmTags(b.colors)}</div></div>
        <div class="nm-card"><div class="nm-card-l">可能材料</div><div class="nm-card-v">${mats}</div></div>`;
    }
    if (audEl && token === _nmToken) {
      const ul = audEl.querySelector('ul');
      const aud = (res.audience || []).map(a => `<li>${esc(a)}</li>`).join('');
      if (ul) ul.innerHTML = aud || '<li>通用百搭款，新手也能驾驭。</li>';
    }
    // 教程：优先视觉分步 -> 否则用增强版标题教程（不再显示"未返回教程"）
    if (listEl && token === _nmToken) {
      const steps = Array.isArray(res.tutorial) && res.tutorial.length ? res.tutorial : null;
      if (steps) {
        listEl.innerHTML = steps.map(s => `
          <div class="nm-step">
            <div class="nm-step-top">
              <span class="nm-step-num">${esc(s.step || '')}</span>
              <span class="nm-step-title">${esc(s.title || '')}</span>
              ${s.time ? `<span class="nm-step-time">⏱ ${esc(s.time)} min</span>` : ''}
            </div>
            <div class="nm-step-detail">${esc(s.detail || '')}</div>
            ${(s.tools && s.tools.length) ? `<div class="nm-step-tools"><span class="nm-step-tools-l">🧰 工具/材料</span>${s.tools.map(t => `<span class="nm-chip">${esc(t)}</span>`).join('')}</div>` : ''}
            ${s.tips ? `<div class="nm-step-tip">💡 ${esc(s.tips)}</div>` : ''}
          </div>`).join('');
        if (statusEl) statusEl.innerHTML = '✅ 已按图片款式生成专属教程（视觉识别）';
      } else {
        // 视觉没返回步骤 -> 用视觉拆解信息构建增强版（比纯标题更准）
        const visionBd = res.breakdown || {};
        const mergedBd = {
          elements: visionBd.elements && visionBd.elements.length ? visionBd.elements : bd.elements,
          shapes: visionBd.shapes && visionBd.shapes.length ? visionBd.shapes : bd.shapes,
          ornaments: visionBd.ornaments && visionBd.ornaments.length ? visionBd.ornaments : bd.ornaments,
          handDrawn: typeof visionBd.handDrawn === 'boolean' ? visionBd.handDrawn : bd.handDrawn,
          catEye: typeof visionBd.catEye === 'boolean' ? visionBd.catEye : bd.catEye,
          diff: visionBd.difficulty ? [visionBd.difficulty] : bd.diff,
          colors: visionBd.colors && visionBd.colors.length ? visionBd.colors : bd.colors,
        };
        const fallbackSteps = buildDetailedTutorial(mergedBd, '');
        listEl.innerHTML = fallbackSteps.map(s => `
          <div class="nm-step">
            <div class="nm-step-top">
              <span class="nm-step-num">${esc(String(s.step))}</span>
              <span class="nm-step-title">${esc(s.title || '')}</span>
              ${s.time ? `<span class="nm-step-time">⏱ ${esc(String(s.time))} min</span>` : ''}
            </div>
            <div class="nm-step-detail">${esc(s.detail || '')}</div>
            ${(s.tools && s.tools.length) ? `<div class="nm-step-tools"><span class="nm-step-tools-l">🧰 工具/材料</span>${s.tools.map(t => `<span class="nm-chip">${esc(t)}</span>`).join('')}</div>` : ''}
            ${s.tips ? `<div class="nm-step-tip">💡 ${esc(s.tips)}</div>` : ''}
          </div>`).join('');
        if (statusEl) statusEl.innerHTML = res.styleName
          ? `✅ 已识别为「${esc(res.styleName)}」（视觉拆解），教程基于识别结果生成`
          : '✅ 已按图片拆解结果生成详细教程（视觉识别）';
      }
    }
  } catch (e) {
    fail('⚠️ 图片识别异常，已按标题关键词生成详细教程（基于款式拆解的定制步骤）');
  }
}


// 真实网图卡片点击：打开看图弹窗（显示大图 + 风格 + 来源链接，非小红书原帖）
function openWebImageModal(d) {
  const title = esc(d.title || '真实美甲');
  const lenLabel = LEN_LABEL[d.len] || '';
  const style = esc(d.style || '');
  const srcUrl = esc(d.url || '');
  $('#noteModalBody').innerHTML = `
    <div class="nm-head">
      <div class="nm-title">${title} <span class="nm-chip nm-web-chip">🌐 真实网图</span></div>
      <div class="nm-sub">风格：${style || '—'} · 甲型：${lenLabel || '—'}</div>
    </div>
    <div class="nm-hero"><img src="${xhsImg(d.cover)}" alt="" onerror="this.parentNode.style.background='var(--surface-2)'"></div>
    <div class="nm-section">
      <div class="nm-sec-title">📷 款式说明</div>
      <p class="nm-desc-text">${esc(d.desc || '来自腾讯新闻的真实美甲照片，非小红书帖子。')}</p>
      ${srcUrl ? `<p style="margin-top:8px"><a href="${srcUrl}" target="_blank" rel="noopener" style="color:var(--accent);font-weight:600">🔗 查看来源页面 ↗</a></p>` : ''}
    </div>`;
  openNoteModal();
}


// 按需拉取原帖更多图文（不阻塞拆解展示，带超时保护，避免弹窗卡住）
async function loadNoteExtra(noteId, coverHint) {
  const box = $('#nmExtra');
  if (!box) return;
  box.innerHTML = '<div class="nm-loading"><div class="nm-spinner"></div><p>正在补充原帖更多图文…（可随时关弹窗）</p></div>';
  try {
    const ctrl = ('AbortController' in window) ? new AbortController() : null;
    const to = ctrl ? setTimeout(() => ctrl.abort(), 15000) : null;
    const res = await fetch('/api/xhs/note?url=' + encodeURIComponent('https://www.xiaohongshu.com/explore/' + noteId), ctrl ? { signal: ctrl.signal } : undefined);
    if (to) clearTimeout(to);
    const data = await res.json();
    if (data.error === 'NO_COOKIE') { closeNoteModal(); showCookieBox(); return; }
    const extra = (data.images || []).filter(Boolean);
    if (extra.length > 1 || (extra.length === 1 && extra[0] !== coverHint)) {
      box.outerHTML = '<div class="nm-gallery">' + extra.map(u => `<div class="nm-thumb"><img src="${xhsImg(u)}" alt="" loading="lazy" onerror="this.parentNode.style.display='none'"></div>`).join('') + '</div>';
    } else {
      box.innerHTML = '<div class="nm-extra-note">原帖暂未返回更多图（可能被平台限制），封面已显示 ✅</div>';
    }
    if (data.desc) {
      const sec = document.createElement('div');
      sec.className = 'nm-desc';
      sec.innerHTML = '<div class="nm-sec-title">📝 原帖文案</div><p>' + esc(data.desc) + '</p>';
      const gall = document.querySelector('.nm-gallery') || box;
      gall.after(sec);
    }
  } catch (e) {
    box.innerHTML = '<div class="nm-extra-note">补充图文超时或被限制，封面已显示 ✅。可稍后重试。</div>';
  }
}

function openNoteModal() {
  $('#noteModal').classList.add('on');
  $('#noteMask').classList.add('on');
  document.body.style.overflow = 'hidden';
}
function closeNoteModal() {
  $('#noteModal').classList.remove('on');
  $('#noteMask').classList.remove('on');
  if (!$('#drawer').classList.contains('on')) document.body.style.overflow = '';
  $('#noteModalBody').innerHTML = '';
}

function shopLinks(kw) {
  return `<div class="shop-links">${Object.entries(SHOPS).map(([k, v]) =>
    `<a data-s="${k}" href="${v.url(kw)}" target="_blank" rel="noopener">${v.name}</a>`).join('')}</div>`;
}

/* ---------------- 视觉分析：上传/收藏照片 → 识别所需材料 ---------------- */
// 把模型返回的材料名匹配到物料库 key（便于出价格/比价链接）
function matchMaterial(name) {
  const n = (name || '').toLowerCase();
  if (!n) return null;
  let best = null, bestScore = 0;
  for (const [k, m] of Object.entries(MATERIALS)) {
    const mname = m.name.toLowerCase();
    const kw = (m.kw || '').toLowerCase();
    let score = 0;
    if (n.includes(mname) || mname.includes(n)) score = 90;
    else kw.split(/\s+/).forEach(t => { if (t.length >= 2 && n.includes(t)) score = Math.max(score, 45); });
    if (score > bestScore) { bestScore = score; best = k; }
  }
  return bestScore >= 45 ? best : null;
}

function urlToDataUrl(u) {
  return fetch(u).then(r => r.blob()).then(b => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(b);
  }));
}

let _visionItems = [];
let _visionPending = null;

function openVisionAnalyzer(image, opts) {
  opts = opts || {};
  const mask = $('#visionMask'), body = $('#visionBody');
  if (!mask || !body) return;
  if (!opts.autoAdd) mask.classList.add('on');
  body.innerHTML = '<div class="xhs-banner">🤖 正在请视觉模型分析图片…（首次可能需数秒）</div>';
  visionAnalyze(image, VISION_SYSTEM).then(d => {
    if (d.needKey) {
      if (opts.autoAdd) toast('未配置视觉分析 Key：请点右上角 ⚙️ 设置 填入 DashScope Key');
      else body.innerHTML = `<div class="xhs-banner">⚠️ ${esc(d.error)}</div>`;
      return;
    }
    if (!d.ok) {
      if (!opts.autoAdd) body.innerHTML = `<div class="xhs-banner">⚠️ 分析失败：${esc(d.error || '未知错误')}</div>`;
      return;
    }
    _visionItems = (d.items || []).map(it => ({ name: it.name, cat: it.category || '', reason: it.reason || '', key: matchMaterial(it.name) }));
    if (opts.autoAdd) {
      if (!_visionItems.length) { toast('没识别出明确材料，换个角度拍清楚点试试～'); return; }
      _visionItems.forEach(it => {
        if (it.key) { if (!state.analysisKeys.includes(it.key)) state.analysisKeys.push(it.key); }
        else if (!state.analysisCustom.some(x => x.name === it.name)) state.analysisCustom.push({ name: it.name, cat: it.cat, reason: it.reason });
      });
      save(); renderCart();
      toast('已加入采购车 🛒');
    } else {
      renderVisionList();
    }
  }).catch(e => { if (!opts.autoAdd) body.innerHTML = `<div class="xhs-banner">⚠️ 请求出错：${esc(e.message)}</div>`; });
}

function renderVisionList() {
  const body = $('#visionBody');
  if (!_visionItems.length) { body.innerHTML = '<div class="xhs-banner">没识别出明确的材料，换个角度拍清楚点试试～</div>'; return; }
  body.innerHTML = `
    <div class="vision-head">
      <div>
        <h3 class="occ-title">🤖 识别出以下材料</h3>
        <p class="tip">勾选要买的，点「加入采购车」即可合并进比价表（已自动匹配物料库价格）。</p>
      </div>
      <button class="ghost-btn small" id="visionToggleAll">全选/取消</button>
    </div>
    <ul class="vision-list">
      ${_visionItems.map((it, i) => {
        const m = it.key ? MATERIALS[it.key] : null;
        return `<li class="vision-item">
          <label>
            <input type="checkbox" class="vchk" data-i="${i}" checked>
            <div class="vinfo">
              <div class="vname">${esc(it.name)} ${m ? `<span class="cat-tag">已匹配：${esc(m.name)}</span>` : `<span class="tag bb-style">未匹配物料库</span>`}</div>
              <div class="mnote">${esc(it.reason || '')}</div>
              ${m ? `<div class="vprice">零售 ${yuan(m.retail)} · 1688 ${yuan(m.b2b)} · ${shopLinks(m.kw)}</div>` : ''}
            </div>
          </label>
        </li>`;
      }).join('')}
    </ul>
    <div class="vision-foot">
      <button class="primary-btn" id="visionAdd">🛒 加入采购车</button>
      <button class="ghost-btn" id="visionClose">关闭</button>
    </div>`;
  $('#visionToggleAll').onclick = () => {
    const all = $$('.vchk'); const anyUnchecked = all.some(c => !c.checked);
    all.forEach(c => c.checked = anyUnchecked);
  };
  $('#visionAdd').onclick = () => {
    $$('.vchk').filter(c => c.checked).map(c => +c.dataset.i).forEach(i => {
      const it = _visionItems[i];
      if (it.key) { if (!state.analysisKeys.includes(it.key)) state.analysisKeys.push(it.key); }
      else if (!state.analysisCustom.some(x => x.name === it.name)) state.analysisCustom.push({ name: it.name, cat: it.cat, reason: it.reason });
    });
    save(); renderCart();
    closeVision(); toast('已加入采购车 🛒');
  };
  $('#visionClose').onclick = closeVision;
}
function closeVision() { const m = $('#visionMask'); if (m) m.classList.remove('on'); }

function previewVisionFile(f) {
  if (!f || !f.type.startsWith('image/')) { toast('请选择图片文件'); return; }
  const fr = new FileReader();
  fr.onload = () => {
    _visionPending = fr.result;
    const prev = $('#visionPreview');
    prev.src = fr.result; prev.hidden = false;
    $('#visionDrop').classList.add('has-img');
    $('#btnVisionAnalyze').disabled = false;
  };
  fr.readAsDataURL(f);
}

/* ---------------- 渲染：采购比价 ---------------- */
function renderCart() {
  setBadge('#cntCart', state.cart.length);
  const styles = state.cart.map(findStyle).filter(Boolean);

  $('#cartStyles').innerHTML = styles.map(s =>
    `<span class="chip">${s.name}<button data-rm="${s.id}" title="移出">✕</button></span>`).join('');

  // 合并 BOM：同材料取最大用量倍数（一件材料可复用于多款）
  const merged = {};
  styles.forEach(s => (s.bom || []).forEach(b => {
    const m = MATERIALS[b.m]; if (!m) return;
    if (m.cat === 'gear' && !state.incGear) return;
    if (!merged[b.m]) merged[b.m] = { m, q: 0, from: [] };
    merged[b.m].q += (b.q || 1);
    merged[b.m].from.push(s.name);
  }));
  // 视觉分析识别出的材料（来自上传照片 / 收藏夹分析）
  (state.analysisKeys || []).forEach(k => {
    const m = MATERIALS[k]; if (!m) return;
    if (m.cat === 'gear' && !state.incGear) return;
    if (!merged[k]) merged[k] = { m, q: 0, from: [] };
    merged[k].q += 1;
    merged[k].from.push('视觉分析');
  });
  const customItems = state.analysisCustom || [];
  const rows = Object.values(merged).sort((a, b) =>
    Object.keys(CATS).indexOf(a.m.cat) - Object.keys(CATS).indexOf(b.m.cat) || b.m.retail - a.m.retail);

  const has = rows.length > 0;
  $('#emptyCart').hidden = has;
  $('#cartTable').closest('.table-wrap').hidden = !has;
  $('#cartSummary').hidden = !has;

  if (has) {
    const totalRetail = rows.reduce((s, r) => s + r.m.retail, 0);
    const totalB2B = rows.reduce((s, r) => s + r.m.b2b, 0);
    const perUse = styles.reduce((s, x) => s + matCost(x), 0);
    const revenue = styles.reduce((s, x) => s + suggestPrice(x).price, 0);

    $('#cartSummary').innerHTML = `
      <div class="stat"><b>${rows.length}</b><span>需采购品项</span></div>
      <div class="stat"><b>${yuan(totalRetail)}</b><span>零售渠道合计</span></div>
      <div class="stat good"><b>${yuan(totalB2B)}</b><span>1688 批发合计 · 省 ${Math.round((1 - totalB2B / totalRetail) * 100)}%</span></div>
      <div class="stat"><b>${yuan(perUse)}</b><span>这 ${styles.length} 款各做一次的材料成本</span></div>
      <div class="stat accent"><b>${yuan(revenue)}</b><span>各做一单的建议收入</span></div>`;

    $('#cartTable').querySelector('tbody').innerHTML = rows.map(r => {
      const unit = r.m.cat === 'gear' ? 0 : (r.m.retail / r.m.uses) * r.q;
      const save = Math.round((1 - r.m.b2b / r.m.retail) * 100);
      return `<tr>
        <td><div class="mname">${r.m.name}</div><div class="mnote">用于：${[...new Set(r.from)].join('、')}</div></td>
        <td>${r.m.spec}</td>
        <td><span class="cat-tag">${CATS[r.m.cat]}</span></td>
        <td class="num"><b>${yuan(r.m.retail)}</b></td>
        <td class="num"><b>${yuan(r.m.b2b)}</b> <span class="save-tag">-${save}%</span></td>
        <td class="num">${r.m.uses} 次</td>
        <td class="num">${r.m.cat === 'gear' ? '—' : yuan(unit)}</td>
        <td>${shopLinks(r.m.kw)}</td>
      </tr>`;
    }).join('');
  }

  // 视觉分析识别但物料库未收录的自定义材料
  const vWrap = $('#visionCustom');
  if (vWrap) {
    if (customItems.length) {
      vWrap.hidden = false;
      vWrap.innerHTML = `
        <h3 class="sec-title tight"><img class="sec-icon" src="stickers/cute-star.png" alt=""> AI 识别的额外材料（物料库未收录）</h3>
        <ul class="vision-custom-list">
          ${customItems.map((it, i) => `<li>
            <div class="vinfo">
              <div class="vname">${esc(it.name)} ${it.cat ? `<span class="cat-tag">${esc(it.cat)}</span>` : ''}</div>
              <div class="mnote">${esc(it.reason || 'AI 从照片识别')}</div>
            </div>
            <button class="ghost-btn small" data-rmcustom="${i}" title="移除">✕</button>
          </li>`).join('')}
        </ul>`;
      vWrap.querySelectorAll('[data-rmcustom]').forEach(btn => btn.onclick = () => {
        state.analysisCustom.splice(+btn.dataset.rmcustom, 1);
        save(); renderCart(); toast('已移除');
      });
    } else { vWrap.hidden = true; vWrap.innerHTML = ''; }
  }

  // 起步装备表
  $('#gearTable').querySelector('tbody').innerHTML = Object.entries(MATERIALS)
    .filter(([, m]) => m.cat === 'gear')
    .map(([, m]) => `<tr>
      <td class="mname">${m.name}</td>
      <td class="mnote">${m.spec} · 约可用 ${m.uses} 次</td>
      <td class="num"><b>${yuan(m.retail)}</b></td>
      <td class="num"><b>${yuan(m.b2b)}</b> <span class="save-tag">-${Math.round((1 - m.b2b / m.retail) * 100)}%</span></td>
      <td>${shopLinks(m.kw)}</td>
    </tr>`).join('');
}

/* ---------------- 渲染：成本定价 ---------------- */
function renderPricing() {
  const list = allStyles().slice().sort((a, b) => (b.trend || 0) - (a.trend || 0));
  $('#priceTable').querySelector('tbody').innerHTML = list.map(s => {
    const sp = suggestPrice(s);
    const margin = Math.round((1 - sp.cost / sp.price) * 100);
    const cls = margin >= 70 ? 'margin-good' : margin >= 50 ? 'margin-mid' : 'margin-bad';
    const mkt = s.price?.retail || [0, 0];
    return `<tr>
      <td><div class="mname">${s.name}</div><div class="mnote">${(s.tags || []).slice(0, 2).join(' · ')}</div></td>
      <td class="num stars">${stars(s.diff)}</td>
      <td class="num">${totalTime(s)}′</td>
      <td class="num">${yuan(sp.mat)}</td>
      <td class="num">${yuan(sp.labor)}</td>
      <td class="num"><b>${yuan(sp.cost)}</b></td>
      <td class="num mnote">${yuan(mkt[0])}–${yuan(mkt[1])}</td>
      <td class="num"><b style="color:var(--accent)">${yuan(sp.price)}</b>${sp.capped ? '<div class="mnote">已触市场上限</div>' : ''}</td>
      <td class="num ${cls}">${margin}%</td>
    </tr>`;
  }).join('');

  const capped = list.filter(s => suggestPrice(s).capped);
  const lowM = list.filter(s => { const p = suggestPrice(s); return (1 - p.cost / p.price) < 0.5; });

  const best = list.slice().sort((a, b) => {
    const A = suggestPrice(a), B = suggestPrice(b);
    return ((B.price - B.cost) / (totalTime(b) / 60)) - ((A.price - A.cost) / (totalTime(a) / 60));
  }).slice(0, 3);

  $('#pricingNote').innerHTML = `
    <b>💰 时薪最高的三个款（毛利 ÷ 耗时）：</b>${best.map((s, i) => {
      const sp = suggestPrice(s);
      return `${i + 1}. ${s.name}（${yuan((sp.price - sp.cost) / (totalTime(s) / 60))}/小时）`;
    }).join('　')}<br>
    ${lowM.length ? `<b>⚠ 毛利偏低（&lt;50%）：</b>${lowM.map(s => s.name).join('、')} —— 这几个款人工占比过高，
      按单件手做不划算。穿戴甲类建议改成<b>批量预制 + 现货售卖</b>，把工时摊薄；其余的适合当引流款而非主推。<br>` : ''}
    ${capped.length ? `<b>📌 触及市场价上限：</b>${capped.length} 个款在 ¥${state.labor}/小时的工时费下，
      要达到 ${state.target}% 目标毛利就得超出市场可接受价。已按市场上限取值，毛利率是真实值。
      想提毛利，要么降工时费预期，要么提速。<br>` : ''}
    <b>说明：</b>材料成本按零售价口径估算，走 1688 备货可再降 55%–65%（见「采购比价」）。
    人工按 ¥${state.labor}/小时 × 实际耗时计，另加 ¥${state.overhead}/单店铺分摊。毛利率 =（建议价 − 总成本）÷ 建议价。`;
}

/* ---------------- 每日爆款（小红书真实图） ---------------- */
// 本地化封面（img/xhs/...）直接返回相对路径；远程小红书图按 BACKEND 走代理或直链
function xhsImg(u) {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return BACKEND ? '/api/xhs/img?u=' + encodeURIComponent(u) : u;
  return u;
}
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function setBadge(sel, n) { const el = $(sel); if (el) el.textContent = n; }

function renderDaily() {
  const d = state.daily || (state.daily = { searches: [], notes: [], updated: '' });
  setBadge('#cntDaily', (d.searches.length + d.notes.length));
  $('#dailyUpdated').textContent = d.updated ? '上次更新：' + d.updated : '';
  $('#emptyDaily').hidden = d.searches.length > 0 || d.notes.length > 0;

  const sr = $('#dailySearchResult');
  if (d.searches.length) {
    sr.innerHTML = d.searches.map(it => `
      <article class="xhs-card" data-note="${esc(it.noteId || '')}" data-cover="${esc(it.cover)}" data-title="${esc(it.title)}" data-url="${esc(it.url)}" data-likes="${esc(it.likes)}">
        <div class="xhs-img"><img src="${xhsImg(it.cover)}" alt="" loading="lazy" onerror="this.parentNode.style.background='var(--surface-2)'"></div>
        <div class="xhs-meta">
          <div class="xhs-title">${esc(it.title)}</div>
          <div class="xhs-sub"><span class="xhs-like">♡ ${esc(it.likes)}</span><span class="xhs-link">看图文拆解 ↗</span></div>
          <div class="xhs-sub"><span>${it.author ? '@' + esc(it.author) : ''}</span></div>
        </div>
      </article>`).join('');
  } else sr.innerHTML = '';

  const nd = $('#dailyNotes');
  if (d.notes.length) {
    nd.innerHTML = d.notes.map(n => `
      <article class="xhs-note" data-id="${esc(n.noteId)}" data-note="${esc(n.noteId)}" data-cover="${esc((n.images || [])[0] || '')}" data-title="${esc(n.title)}" data-url="${esc(n.url)}" data-likes="${esc(n.likes)}">
        <div class="xhs-hero"><img src="${xhsImg(n.images[0])}" alt="" loading="lazy"></div>
        <div class="xhs-thumbs">${n.images.map((u, i) => `<img src="${xhsImg(u)}" data-full="${esc(u)}" class="${i === 0 ? 'active' : ''}">`).join('')}</div>
        <div class="xhs-body">
          <div class="xhs-title">${esc(n.title)}</div>
          <div class="xhs-desc">${esc(n.desc)}</div>
          <div class="xhs-sub"><span class="xhs-like">♡ ${esc(n.likes)}</span><span>@${esc(n.author)}</span></div>
          <div class="xhs-sub"><a class="xhs-link" href="${esc(n.url)}" target="_blank" rel="noopener">看原帖 ↗</a><span>${esc(n.time || '')}</span></div>
        </div>
      </article>`).join('');
  } else nd.innerHTML = '';
}

/* ---------------- 爆款总结（每月 / 每季度） ---------------- */
function summaryStyleCard(s) {
  const thumb = s.img
    ? `<img src="${esc(s.img)}" alt="" loading="lazy" onerror="this.style.display='none'">`
    : `<span class="sum-grad" style="background:linear-gradient(135deg,${esc(s.palette[0])},${esc(s.palette[2] || s.palette[1])})"></span>`;
  const seasons = (s.seasons || ['全年']).join('·');
  return `<div class="sum-style" data-detail="${esc(s.id)}" title="点击看完整教程">
    <div class="sum-thumb">${thumb}</div>
    <div class="sum-name">${esc(s.name)}</div>
    <div class="sum-meta"><span class="sum-trend">🔥 ${s.trend}</span><span class="sum-season">${esc(seasons)}</span></div>
  </div>`;
}

/* ---------------- 爆款总结：小红书真实每月/每季度爆款 ---------------- */
function summaryStyleCard(s) {
  return `<div class="sum-style"><span class="ss-name">${esc(s.name)}</span><span class="ss-idx">${s.heat || ''}</span></div>`;
}

function renderSummaryNav() {
  const curM = String(new Date().getMonth() + 1);
  const curQ = 'Q' + (Math.floor(new Date().getMonth() / 3) + 1);
  const M = SEASONAL.MONTHS, Q = SEASONAL.QUARTERS;

  // 逐月：每卡显示月份+主题+当月真实搜索词，可点开抓真实爆款
  $('#monthGrid').innerHTML = Object.keys(M).sort((a, b) => a - b).map(k => {
    const m = M[k];
    return `<div class="month-card${k === curM ? ' current' : ''}" data-scope="month" data-key="${k}">
      <div class="month-head"><span class="month-name">${esc(m.name)}</span>${k === curM ? '<span class="now-tag">本月</span>' : ''}</div>
      <div class="month-theme">${esc(m.theme)}</div>
      <div class="month-kw">${(m.searchKw || []).map(kw => `<span class="kw-chip">${esc(kw)}</span>`).join('')}</div>
      <button class="scope-grab" data-scope="month" data-key="${k}">🔍 看本月真实爆款</button>
    </div>`;
  }).join('');

  // 分季度
  $('#quarterGrid').innerHTML = Object.keys(Q).map(k => {
    const q = Q[k];
    return `<div class="quarter-card${k === curQ ? ' current' : ''}" data-scope="quarter" data-key="${k}">
      <div class="quarter-head"><span class="quarter-name">${esc(q.name)}</span>${k === curQ ? '<span class="now-tag">本季</span>' : ''}</div>
      <div class="month-theme">${esc(q.theme)}</div>
      <div class="month-kw">${(q.searchKw || []).map(kw => `<span class="kw-chip">${esc(kw)}</span>`).join('')}</div>
      <button class="scope-grab" data-scope="quarter" data-key="${k}">🔍 看本季真实爆款</button>
    </div>`;
  }).join('');
}

function renderXhsCards(el, items) {
  if (!items || !items.length) { el.innerHTML = ''; return false; }
  el.innerHTML = items.map(it => `
    <article class="xhs-card" data-note="${esc(it.noteId)}" data-cover="${esc(it.cover)}" data-title="${esc(it.title)}" data-url="${esc(it.url)}" data-likes="${esc(it.likes)}">
      <div class="xhs-img"><img src="${xhsImg(it.cover)}" alt="" loading="lazy" onerror="this.parentNode.style.background='var(--surface-2)'"></div>
      <div class="xhs-meta">
        <div class="xhs-title">${esc(it.title)}</div>
        <div class="xhs-sub"><span class="xhs-like">♡ ${esc(it.likes)}</span><span class="xhs-link">看图文拆解 ↗</span></div>
      </div>
    </article>`).join('');
  return true;
}

async function loadScopeReal(scope, key, opts = {}) {
  state.summary = { scope, key };
  if (location.protocol === 'file:') {
    $('#realDetail').hidden = false;
    $('#realDetailTitle').textContent = '请用 http://localhost:8787 打开';
    $('#realDetailGrid').innerHTML = '<div class="xhs-banner">⚠️ 真实爆款需要服务端抓取，请用 http://localhost:8787 打开工作台（不要双击 index.html）。</div>';
    return;
  }
  const titleEl = $('#realDetailTitle'), grid = $('#realDetailGrid');
  $('#realDetail').hidden = false;
  const label = scope === 'month' ? (SEASONAL.MONTHS[key] ? SEASONAL.MONTHS[key].name : '本月') : (SEASONAL.QUARTERS[key] ? SEASONAL.QUARTERS[key].name : '本季');
  titleEl.textContent = `🔄 抓取「${label}」真实爆款中…（约 ${scope === 'month' ? 20 : 15} 秒，勿关页面）`;
  grid.innerHTML = '<div class="xhs-banner">小红书抓取中 🔄 浏览器正在加载搜索结果…</div>';
  try {
    const fresh = opts.force ? '&fresh=1' : '';
    const res = await fetch(`/api/xhs/summary?scope=${scope}&key=${encodeURIComponent(key)}${fresh}`);
    const data = await res.json();
    if (data.error === 'NO_COOKIE') { $('#realDetail').hidden = false; showCookieBox(); return; }
    if (data.error) { grid.innerHTML = `<div class="xhs-banner">⚠️ ${esc(data.error)}</div>`; return; }
    const items = data.items || [];
    titleEl.textContent = `${label} · 小红书真实爆款（${items.length} 条${data.cached ? ' · 缓存' : ' · 刚抓'}，按点赞排序）`;
    if (!items.length) { grid.innerHTML = '<div class="xhs-banner">这次没抓到结果，可能是 cookie 过期。请重新从浏览器 F12→Network 复制最新 Cookie 保存后再试。</div>'; return; }
    renderXhsCards(grid, items);
  } catch (e) {
    // 离线静态分享版：回退到本地缓存（xhs_monthly.json），让分享出去的页面也有真实爆款可看
    try {
      const c = await (await fetch('/xhs_monthly.json?t=' + Date.now())).json();
      const node = c[`${scope}#${key}`];
      if (node && node.items && node.items.length) {
        titleEl.textContent = `${label} · 小红书真实爆款（${node.items.length} 条 · 本地缓存）`;
        renderXhsCards(grid, node.items);
        return;
      }
    } catch (_) {}
    grid.innerHTML = `<div class="xhs-banner">这是离线分享版，实时抓取需在本地打开工作台（http://localhost:8787）。当前展示的是上次抓取的缓存数据。</div>`;
  }
}

function renderSummary() {
  renderSummaryNav();
  // 进入本页默认抓当前月真实爆款
  const curM = String(new Date().getMonth() + 1);
  loadScopeReal('month', curM);
}

function showCookieBox() {
  // 注意：提示只显示在【右栏真实爆款区】，绝不能覆盖左栏「每日爆款」容器
  const rd = $('#realDetail');
  const sr = $('#realDetailGrid');
  if (rd) rd.hidden = false;
  sr.innerHTML = `<div class="xhs-banner cookie-box">
    ⚠️ 小红书 cookie 已失效或缺失，抓不到真实图。<br>把你的 cookie 粘贴到下面保存即可（不用去翻隐藏文件）：
    <textarea id="xhsCookieInput" class="cookie-input" placeholder="从浏览器 F12→Network→任意 xiaohongshu.com 请求头里复制 Cookie 整行值，形如 a1=...; web_session=...;"></textarea>
    <button id="btnSaveCookie" class="primary-btn">保存并立即抓取</button>
    <div class="cookie-hint">保存在本地 <code>.xhs_cookie.txt</code>，不会泄露；cookie 会过期（几天到几周），刷不出图时重导一次即可。</div>
  </div>`;
  sr.querySelector('#btnSaveCookie').onclick = async () => {
    const v = sr.querySelector('#xhsCookieInput').value.trim();
    if (!v) return toast('先粘贴 cookie');
    if (/^cookie:/i.test(v)) v = v.replace(/^cookie:\s*/i, ''); // 去掉误带的 "Cookie: " 前缀
    const btn = sr.querySelector('#btnSaveCookie');
    btn.disabled = true; btn.textContent = '保存中…';
    try {
      const r = await fetch('/api/xhs/cookie', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'cookie=' + encodeURIComponent(v) });
      const j = await r.json();
      if (j.ok) {
        toast('✅ cookie 已保存');
        if (state.summary && state.summary.scope) { await loadScopeReal(state.summary.scope, state.summary.key, { force: true }); }
        else if (!$('#dailyKw').value.trim()) $('#dailyKw').value = '美甲';
      }
      else { btn.disabled = false; btn.textContent = '保存并立即抓取'; dailyShowError(j.error || '保存失败'); }
    } catch (e) { btn.disabled = false; btn.textContent = '保存并立即抓取'; dailyShowError('保存失败：' + e.message); }
  };
}

function dailyShowError(msg) {
  const sr = $('#dailySearchResult');
  if (/NO_COOKIE|cookie/i.test(msg)) return showCookieBox();
  const fileTip = (location.protocol === 'file:')
    ? '<br><b>提示：当前页面是用本地文件(file://)打开的，所有抓取请求都会失败。请改用 http://localhost:8787 打开工作台（不要双击 index.html）。</b>'
    : '';
  sr.innerHTML = `<div class="xhs-banner">⚠️ ${esc(msg)}${fileTip}<br>请把你的小红书 cookie 填进项目里的 <code>.xhs_cookie.txt</code> 文件（替换掉 placeholder 那行），保存后重试。cookie 在浏览器 F12 → Network → 任意 xiaohongshu.com 请求的 Request Headers 里复制。</div>`;
}

async function dailySearch() {
  const kw = $('#dailyKw').value.trim();
  if (!kw) return toast('先输入关键词');
  $('#dailySearchResult').innerHTML = '<div class="xhs-banner">抓取中… 🔄</div>';
  try {
    const res = await fetch('/api/xhs/search?kw=' + encodeURIComponent(kw));
    const data = await res.json();
    if (data.error === 'NO_COOKIE') return showCookieBox();
    if (data.error) {
      // 小红书返回301=cookie失效/被风控，给更明确的引导
      if (/跳转|cookie.*失效|风控/i.test(data.error)) {
        showCookieBox();
        const sr = $('#dailySearchResult');
        const box = sr.querySelector('.cookie-box');
        if (box) {
          const tip = document.createElement('div');
          tip.style.cssText = 'margin-top:10px;padding:10px;background:#fff3cd;color:#856404;border-radius:8px;font-size:13px;line-height:1.6';
          tip.innerHTML = '<b>🔍 小红书拒绝了当前 cookie（返回登录跳转）</b><br>最可能的原因：之前用控制台 document.cookie 复制的 cookie 不完整（缺少 HttpOnly 字段）。<br><b>正确方法：</b>F12 → Network 标签 → 刷新页面 → 点任意请求 → Request Headers 里复制 Cookie 整行值。';
          box.appendChild(tip);
        }
        return;
      }
      return dailyShowError(data.error);
    }
    if (!data.items || !data.items.length) {
      // cookie 失效时浏览器可能加载出登录墙，导致 0 条；给明确提示
      showCookieBox();
      const sr = $('#dailySearchResult');
      const box = sr.querySelector('.cookie-box');
      if (box) {
        const tip = document.createElement('div');
        tip.style.cssText = 'margin-top:10px;padding:10px;background:#fff3cd;color:#856404;border-radius:8px;font-size:13px;line-height:1.6';
        tip.innerHTML = '<b>🔍 这次抓到 0 条</b><br>大概率是 cookie 过期/被踢下线了。请重新从浏览器 F12 → Network → 复制最新 Cookie 整行值，粘贴保存后再试。';
        box.appendChild(tip);
      }
      return;
    }
    state.daily.searches = data.items || [];
    state.daily.updated = new Date().toLocaleString('zh-CN');
    save(); renderDaily();
    toast(`抓到 ${state.daily.searches.length} 条「${kw}」爆款`);
  } catch (e) { dailyShowError('请求失败：' + e.message); }
}

async function dailyImport() {
  const raw = $('#dailyLinks').value.trim();
  if (!raw) return toast('先粘贴笔记链接');
  const urls = raw.split(/\s+/).map(s => s.trim()).filter(Boolean).filter(u => u.includes('xiaohongshu.com'));
  if (!urls.length) return toast('没识别到小红书链接');
  $('#dailyNotes').innerHTML = '<div class="xhs-banner">导入中… 🔄</div>';
  let ok = 0, fail = 0;
  for (const u of urls) {
    try {
      const res = await fetch('/api/xhs/note?url=' + encodeURIComponent(u));
      const data = await res.json();
      if (data.error === 'NO_COOKIE') { showCookieBox(); return; }
      if (data.error) { fail++; continue; }
      data.time = new Date().toLocaleDateString('zh-CN');
      state.daily.notes.unshift(data);
      ok++;
    } catch { fail++; }
  }
  save(); renderDaily();
  toast(`导入完成：成功 ${ok} 条${fail ? '，失败 ' + fail + ' 条' : ''}`);
  if (fail) dailyShowError('部分笔记获取失败（可能 cookie 过期或链接无效）。');
}

/* ---------------- 事件绑定 ---------------- */
function bind() {
  // tabs
  $$('.tab').forEach(t => t.onclick = () => {
    $$('.tab').forEach(x => x.classList.remove('active'));
    $$('.panel').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    $('#tab-' + t.dataset.tab).classList.add('active');
    if (t.dataset.tab === 'cart') renderCart();
    if (t.dataset.tab === 'pricing') renderPricing();
    if (t.dataset.tab === 'baokuan') { renderSummary(); }
    if (t.dataset.tab === 'portfolio') renderPortfolio();
    if (t.dataset.tab === 'blindbox') renderBlindBox();
    if (t.dataset.tab === 'learn') renderLearn();
    if (t.dataset.tab === 'material') renderMaterials();
  });

  // persona
  $$('#personaSwitch .pill').forEach(p => p.onclick = () => {
    $$('#personaSwitch .pill').forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    state.persona = p.dataset.persona;
    $('#personaHint').innerHTML = PERSONA[state.persona].hint;
    save(); renderLibrary();
  });

  // filters
  ['#q', '#fPlatform', '#fDiff', '#fSeason', '#fSort'].forEach(s => {
    $(s).addEventListener('input', renderLibrary);
    $(s).addEventListener('change', renderLibrary);
  });
  $('#btnReset').onclick = () => {
    $('#q').value = ''; $('#fPlatform').value = ''; $('#fDiff').value = '';
    $('#fSeason').value = ''; $('#fSort').value = 'trend'; renderLibrary();
  };

  // 全局委托
  document.addEventListener('click', e => {
    const fav = e.target.closest('[data-fav]');
    if (fav) {
      e.stopPropagation();
      const id = fav.dataset.fav;
      if (!id) return;
      const p = _noteIndex[id] || getFavs().find(x => x.noteId === id) || (state.daily && state.daily.searches.find(x => x.noteId === id));
      if (!p) return;
      const added = toggleFav(p);
      fav.classList.toggle('on', added);
      fav.textContent = added ? '❤️' : '🤍';
      updateFavCount(); renderFavs();
      toast(added ? '已收藏到我的收藏夹 ❤️' : '已取消收藏');
      return;
    }

    const az = e.target.closest('[data-analyze]');
    if (az) {
      e.stopPropagation();
      const card = az.closest('.fav-card');
      const cover = card && card.dataset.cover;
      if (!cover) return toast('这条收藏没有封面图，无法分析，可在采购页手动上传');
      toast('正在取回封面图…');
      urlToDataUrl(xhsImg(cover))
        .then(d => openVisionAnalyzer(d))
        .catch(() => toast('封面图取回失败，请在采购页手动上传照片分析'));
      return;
    }

    const ac = e.target.closest('[data-addcart]');
    if (ac) {
      e.stopPropagation();
      const card = ac.closest('.fav-card');
      const cover = card && card.dataset.cover;
      if (!cover) return toast('这条收藏没有封面图，无法分析，可在采购页手动上传');
      toast('正在识别材料并加入采购车…');
      urlToDataUrl(xhsImg(cover))
        .then(d => openVisionAnalyzer(d, { autoAdd: true }))
        .catch(() => toast('封面图取回失败，请在采购页手动上传照片分析'));
      return;
    }

    const d = e.target.closest('[data-detail]');
    if (d) return openDetail(d.dataset.detail);

    const sg = e.target.closest('.scope-grab');
    if (sg) { loadScopeReal(sg.dataset.scope, sg.dataset.key); return; }

    const nn = e.target.closest('[data-note]');
    if (nn) {
      if (nn.dataset.web) { openWebImageModal(nn.dataset); return; }
      openNoteDetail(nn.dataset.note, nn.dataset.title, nn.dataset.cover, nn.dataset.likes); return;
    }

    const c = e.target.closest('[data-cart]');
    if (c) {
      const id = c.dataset.cart;
      const i = state.cart.indexOf(id);
      if (i >= 0) { state.cart.splice(i, 1); toast('已移出采购车'); }
      else { state.cart.push(id); toast('已加入采购车'); }
      save(); renderLibrary(); renderCart();
      if ($('#drawer').classList.contains('on')) openDetail(id);
      return;
    }

    const rm = e.target.closest('[data-rm]');
    if (rm) {
      state.cart = state.cart.filter(x => x !== rm.dataset.rm);
      save(); renderCart(); renderLibrary(); return;
    }

    const ldel = e.target.closest('[data-learn-del]');
    if (ldel) {
      if (!confirm('确定删除这条学习记录？')) return;
      learnMutate('delete', { id: ldel.dataset.learnDel })
        .then(() => { renderLearn(); toast('已删除'); })
        .catch(() => toast('删除失败'));
      return;
    }

    const ledit = e.target.closest('[data-learn-edit]');
    if (ledit) { learnStartEdit(ledit.dataset.learnEdit); return; }

    const kw = e.target.closest('[data-kw]');
    if (kw) { window.open(SOCIALS[kw.dataset.p].url(kw.dataset.kw), '_blank', 'noopener'); return; }
  });

  $('#mask').onclick = closeDrawer;
  $('#drawerClose').onclick = closeDrawer;
  $('#noteMask').onclick = closeNoteModal;
  $('#noteModalClose').onclick = closeNoteModal;
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('#noteModal').classList.contains('on')) closeNoteModal();
    else closeDrawer();
  });

  // cart
  $('#incGear').onchange = e => { state.incGear = e.target.checked; save(); renderCart(); };
  $('#btnClearCart').onclick = () => { state.cart = []; state.analysisKeys = []; state.analysisCustom = []; save(); renderCart(); renderLibrary(); toast('采购车已清空'); };

  // pricing
  ['#laborRate', '#overhead', '#targetMargin'].forEach(s => $(s).addEventListener('input', () => {
    state.labor = +$('#laborRate').value || 0;
    state.overhead = +$('#overhead').value || 0;
    state.target = Math.min(94, +$('#targetMargin').value || 0);
    save(); renderPricing(); renderLibrary();
  }));

  // import / export
  // 设置弹窗（视觉识别 Key 等）
  const sb = $('#btnSettings'); if (sb) sb.onclick = () => { const k = $('#setKey'); if (k) k.value = getVisionKey(); $('#settingsMask').classList.add('on'); };
  const ssave = $('#btnSetSave'); if (ssave) ssave.onclick = () => { setVisionKey($('#setKey').value); toast('已保存视觉识别 Key ✅'); $('#settingsMask').classList.remove('on'); };
  const scancel = $('#btnSetCancel'); if (scancel) scancel.onclick = () => $('#settingsMask').classList.remove('on');
  const sclose = $('#btnSetClose'); if (sclose) sclose.onclick = () => $('#settingsMask').classList.remove('on');
  const smask = $('#settingsMask'); if (smask) smask.addEventListener('click', e => { if (e.target === smask) smask.classList.remove('on'); });

  $('#btnExport').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `美甲工作台备份_${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    toast('已导出');
  };
  $('#btnImport').onclick = () => $('#fileImport').click();
  $('#fileImport').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        state = Object.assign(state, JSON.parse(r.result));
        save(); initUI(); toast('导入成功');
      } catch { toast('文件格式不对'); }
    };
    r.readAsText(f);
    e.target.value = '';
  };

  // 每日爆款
  $('#btnDailySearch').onclick = dailySearch;
  $('#dailyKw').addEventListener('keydown', e => { if (e.key === 'Enter') dailySearch(); });
  $('#btnDailyImport').onclick = dailyImport;
  $('#btnDailyClear').onclick = () => {
    if (!confirm('确定清空「我的爆款库」（搜索结果 + 导入的笔记）？')) return;
    state.daily = { searches: [], notes: [], updated: '' }; save(); renderDaily(); toast('已清空');
  };
  // 缩略图切换大图（点缩略图只换大图，不弹窗）
  $('#dailyNotes').addEventListener('click', e => {
    const t = e.target.closest('.xhs-thumbs img'); if (!t) return;
    e.stopPropagation();
    const note = t.closest('.xhs-note');
    note.querySelector('.xhs-hero img').src = xhsImg(t.dataset.full);
    note.querySelectorAll('.xhs-thumbs img').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
  });
}

/* ---------------- 美甲作品集（上传自己的作品） ---------------- */
let pfCat = 'client';     // 当前上传分类
let pfFilter = 'all';     // 当前查看筛选
let pfPending = [];       // 待保存（已选图、未填资料）

function pfFilesOf(it) {
  if (Array.isArray(it.files) && it.files.length) return it.files;
  if (it.file) return [it.file];
  return [];
}
function renderPfItems(items) {
  const cats = { all: items.length, client: items.filter(x => x.cat === 'client').length, wear: items.filter(x => x.cat === 'wear').length };
  $('#cntPortfolio').textContent = items.length;
  $('#cntAll').textContent = cats.all;
  $('#cntClient').textContent = cats.client;
  $('#cntWear').textContent = cats.wear;
  const shown = pfFilter === 'all' ? items : items.filter(x => x.cat === pfFilter);
  const grid = $('#pfGrid');
  if (!shown.length) { grid.innerHTML = ''; $('#emptyPf').hidden = false; }
  else {
    $('#emptyPf').hidden = true;
    grid.innerHTML = shown.map(it => {
      const files = pfFilesOf(it);
      const cover = it.cover || files[0] || '';
      const cap = it.name || '未命名作品';
      const filesJson = JSON.stringify(files);
      const gallery = `
        <div class="pf-gallery">
          <img class="pf-cover" src="${esc(cover)}" alt="${esc(cap)}" data-files='${filesJson}' data-fi="0" data-cap="${esc(cap)}" data-lb>
          ${files.length > 1 ? `<span class="pf-count">📷 ${files.length}</span>` : ''}
        </div>`;
      const thumbs = files.length > 1
        ? `<div class="pf-thumbs">${files.map((f, i) => `<img class="pf-thumb2" src="${esc(f)}" alt="" data-files='${filesJson}' data-fi="${i}" data-cap="${esc(cap)}" data-lb>`).join('')}</div>`
        : '';
      return `
        <figure class="pf-card" data-id="${esc(it.id)}">
          <span class="pf-badge ${it.cat}">${it.cat === 'wear' ? '穿戴甲' : '客户美甲'}</span>
          ${gallery}
          ${thumbs}
          <figcaption>
            <div class="pf-name">${esc(cap)}</div>
            ${it.note ? `<div class="pf-note">${esc(it.note)}</div>` : ''}
            <button class="pf-del" data-del="${esc(it.id)}" title="删除">🗑 删除</button>
          </figcaption>
        </figure>`;
    }).join('');
  }
}
function renderPortfolio() {
  if (BACKEND) {
    fetch('/api/portfolio?t=' + Date.now())
      .then(r => r.json())
      .then(d => renderPfItems(d.items || []))
      .catch(async () => {
        try {
          const c = await (await fetch('/portfolio.json?t=' + Date.now())).json();
          if (c && c.items && c.items.length) { renderPfItems(c.items); return; }
        } catch (_) {}
        $('#cntPortfolio') && ($('#cntPortfolio').textContent = '0');
        $('#emptyPf') && ($('#emptyPf').hidden = false);
      });
    return;
  }
  // 无后端：从 IndexedDB 读取（也可回退静态 portfolio.json）
  _idb.getAll('portfolio').then(items => { renderPfItems(items); }).catch(async () => {
    try {
      const c = await (await fetch('/portfolio.json?t=' + Date.now())).json();
      if (c && c.items && c.items.length) { renderPfItems(c.items); return; }
    } catch (_) {}
    $('#cntPortfolio') && ($('#cntPortfolio').textContent = '0');
    $('#emptyPf') && ($('#emptyPf').hidden = false);
  });
}

function pfPreviewRender() {
  const box = $('#pfPreview');
  if (!pfPending.length) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="pf-preview-head">已选 ' + pfPending.length + ' 张，将作为「同一副作品」的多个角度一起保存：</div>' +
    pfPending.map((f, i) => `<div class="pf-thumb"><img src="${f.data}" alt=""><button class="pf-thumb-x" data-i="${i}">✕</button></div>`).join('');
  box.querySelectorAll('.pf-thumb-x').forEach(b => b.onclick = () => { pfPending.splice(+b.dataset.i, 1); pfPreviewRender(); });
}

function pfUpload() {
  if (!pfPending.length) return toast('先选几张图片吧');
  const name = $('#pfName').value.trim();
  const note = $('#pfNote').value.trim();
  const btn = $('#btnPfUpload'); btn.disabled = true; $('#pfStatus').textContent = '保存中…';
  const files = pfPending.map(f => f.data);
  const saveLocal = () => _idb.put('portfolio', { id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), cat: pfCat, name, note, files, ts: Date.now() });
  const done = () => { pfPending = []; $('#pfName').value = ''; $('#pfNote').value = ''; pfPreviewRender(); $('#pfStatus').textContent = '已保存 ' + files.length + ' 张角度图 ✓'; setTimeout(() => { $('#pfStatus').textContent = ''; }, 2500); btn.disabled = false; renderPortfolio(); };
  const fail = (e) => { btn.disabled = false; $('#pfStatus').textContent = '保存失败'; toast('保存失败：' + ((e && e.message) || '未知错误')); };
  if (BACKEND) {
    fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cat: pfCat, name, note, files })
    }).then(r => r.json()).then(r => { if (!r.ok) return saveLocal().then(done).catch(fail); done(); }).catch(() => saveLocal().then(done).catch(fail));
  } else {
    saveLocal().then(done).catch(fail);
  }
}

let lbList = [];
let lbIdx = 0;
function openLightbox(src, cap) { openGallery([src], 0, cap); }
function openGallery(list, idx, cap) {
  lbList = Array.isArray(list) ? list : [list];
  lbIdx = Math.max(0, Math.min((idx | 0) || 0, lbList.length - 1));
  $('#lbImg').src = lbList[lbIdx] || '';
  $('#lbCap').textContent = cap || '';
  updateLbNav();
  $('#lbMask').classList.add('on');
  $('#lbBox').classList.add('on');
  document.body.style.overflow = 'hidden';
}
function updateLbNav() {
  const multi = lbList.length > 1;
  const prev = $('#lbPrev'), next = $('#lbNext'), counter = $('#lbCounter');
  if (prev) prev.style.display = multi ? '' : 'none';
  if (next) next.style.display = multi ? '' : 'none';
  if (counter) counter.style.display = multi ? '' : 'none';
  if (counter) counter.textContent = (lbIdx + 1) + ' / ' + lbList.length;
}
function lbStep(d) {
  if (lbList.length < 2) return;
  lbIdx = (lbIdx + d + lbList.length) % lbList.length;
  $('#lbImg').src = lbList[lbIdx];
  updateLbNav();
}
function closeLightbox() {
  $('#lbMask').classList.remove('on');
  $('#lbBox').classList.remove('on');
  $('#lbImg').src = '';
  lbList = []; lbIdx = 0;
  document.body.style.overflow = '';
}

/* ---------------- 学习站（笔记 + 链接 个人知识库） ---------------- */
let learnEditId = null;
const LEARN_SEED_OFFLINE = [
  { id: 'learn-seed-1', title: '千聊 · 优惠券领取通道', cat: '优惠/活动',
    url: 'https://h5.qlchat.com/wechat/page/get-coupon-channel/2000022444595437?couponCode=MA52Z8RPNS&officialKey=',
    note: '千聊(qlchat)课程优惠券领取页，链接已带券码 MA52Z8RPNS，点开即可领券后学习课程。', ts: Date.now() }
];

function safeUrl(u) {
  try { const s = new URL(u); if (s.protocol === 'http:' || s.protocol === 'https:') return s.href; } catch (e) {}
  return '';
}
async function learnGet() {
  if (BACKEND) {
    const r = await fetch('/api/learn?t=' + Date.now());
    const d = await r.json();
    return d.items || [];
  }
  try {
    const raw = localStorage.getItem('nailLearn');
    if (raw === null) { localStorage.setItem('nailLearn', JSON.stringify(LEARN_SEED_OFFLINE)); return LEARN_SEED_OFFLINE.slice(); }
    return JSON.parse(raw) || [];
  } catch (e) { return []; }
}
async function learnMutate(kind, payload) {
  if (BACKEND) {
    if (kind === 'delete') {
      const r = await fetch('/api/learn?id=' + encodeURIComponent(payload.id), { method: 'DELETE' });
      return r.json();
    }
    const r = await fetch('/api/learn', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return r.json();
  }
  let list = []; try { list = JSON.parse(localStorage.getItem('nailLearn') || '[]'); } catch (e) {}
  if (kind === 'add') {
    list.unshift({ id: 'learn-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), title: payload.title, cat: payload.cat, url: payload.url, note: payload.note, ts: Date.now() });
  } else if (kind === 'update') {
    const i = list.findIndex(x => x.id === payload.id);
    if (i >= 0) list[i] = Object.assign({}, list[i], { title: payload.title, cat: payload.cat, url: payload.url, note: payload.note });
  } else if (kind === 'delete') {
    list = list.filter(x => x.id !== payload.id);
  }
  localStorage.setItem('nailLearn', JSON.stringify(list));
  return { ok: true };
}
function catColor(cat) {
  const map = { '教程': '#E87AA0', '优惠/活动': '#E8B84A', '工具': '#4AA090', '灵感': '#6BA8D0', '素材': '#9A7BD0', '直播/课程': '#E07090', '其它': '#B09888' };
  return map[cat] || '#B09888';
}
function learnRefreshCats(items) {
  const sel = $('#learnFilterCat');
  const cur = sel.value;
  const cats = [...new Set(items.map(x => x.cat).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">全部分类</option>' + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  sel.value = cats.includes(cur) ? cur : '';
}
/* ---------------- 材料库（拍照上传 + AI 分类 + 搜索 + 找同款） ---------------- */
const MAT_CAT_LIST = ['基础耗材', '色料', '特效材料', '饰品配件', '甲片穿戴', '手工具', '设备'];
const MAT_CAT_COLOR = {
  '基础耗材': '#FFD9E1', '色料': '#FFE7B3', '特效材料': '#D9C2FF',
  '饰品配件': '#BFE3FF', '甲片穿戴': '#C2F0D9', '手工具': '#FFD1B0', '设备': '#D6D6E8'
};

/* ============ IndexedDB 持久化（无后端时存材料库/作品集）============ */
const _idb = (function () {
  let _db = null;
  function openDB() {
    return new Promise((res, rej) => {
      if (_db) return res(_db);
      if (!('indexedDB' in window)) return rej(new Error('浏览器不支持 IndexedDB'));
      const req = indexedDB.open('nailWorkbench', 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('materials')) db.createObjectStore('materials', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('portfolio')) db.createObjectStore('portfolio', { keyPath: 'id' });
      };
      req.onsuccess = e => { _db = e.target.result; res(_db); };
      req.onerror = e => rej(e.target.error);
    });
  }
  function store(name, mode) { return openDB().then(db => db.transaction(name, mode).objectStore(name)); }
  return {
    getAll: name => store(name, 'readonly').then(s => new Promise((res, rej) => { const r = s.getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error); })),
    put: (name, val) => store(name, 'readwrite').then(s => new Promise((res, rej) => { const r = s.put(val); r.onsuccess = () => res(); r.onerror = () => rej(r.error); })),
    del: (name, id) => store(name, 'readwrite').then(s => new Promise((res, rej) => { const r = s.delete(id); r.onsuccess = () => res(); r.onerror = () => rej(r.error); }))
  };
})();

async function materialGet() {
  if (BACKEND) { try { const r = await fetch('/api/materials'); const d = await r.json(); return d.items || []; } catch (e) {} }
  try { return await _idb.getAll('materials'); } catch (e) { return []; }
}
async function materialMutate(kind, payload) {
  if (BACKEND) {
    try {
      const opt = { method: kind === 'delete' ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' } };
      if (kind !== 'delete') opt.body = JSON.stringify(payload);
      const r = await fetch('/api/materials' + (kind === 'delete' ? '?id=' + encodeURIComponent(payload.id) : ''), opt);
      return await r.json();
    } catch (e) {}
  }
  try {
    if (kind === 'delete') await _idb.del('materials', payload.id);
    else { payload.id = payload.id || ('m_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)); payload.ts = payload.ts || Date.now(); await _idb.put('materials', payload); }
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

let _matPending = [];
let _matRecognized = [];

function matPreviewRender() {
  const box = $('#matPreview'); if (!box) return;
  box.innerHTML = _matPending.map((src, i) => `<div class="mat-thumb"><img src="${src}" alt=""><button class="mat-thumb-x" data-mi="${i}" title="移除">✕</button></div>`).join('');
  const ba = $('#btnMatAnalyze'); if (ba) ba.disabled = !_matPending.length;
  box.querySelectorAll('.mat-thumb-x').forEach(b => b.onclick = () => { _matPending.splice(+b.dataset.mi, 1); matPreviewRender(); });
}
function matReadFiles(files) {
  Array.from(files || []).filter(f => f.type.startsWith('image/')).forEach(f => {
    const fr = new FileReader();
    fr.onload = () => { _matPending.push(fr.result); matPreviewRender(); };
    fr.readAsDataURL(f);
  });
}
function toggleMatUpload(force) {
  const body = $('#matUploadBody'); if (!body) return;
  const show = force !== undefined ? force : body.hidden;
  body.hidden = !show;
  if (!show) { _matPending = []; _matRecognized = []; const pv = $('#matPreview'); if (pv) pv.innerHTML = ''; const rc = $('#matRecognize'); if (rc) rc.innerHTML = ''; const sf = $('#matSaveForm'); if (sf) sf.hidden = true; const ba = $('#btnMatAnalyze'); if (ba) ba.disabled = true; }
}
async function matAnalyze() {
  if (!_matPending.length) { toast('请先选择图片'); return; }
  const btn = $('#btnMatAnalyze'); if (btn) btn.disabled = true;
  $('#matRecognize').innerHTML = '<div class="xhs-banner">🤖 正在请视觉模型识别材料（首次可能需数秒）…</div>';
  let all = [];
  for (const img of _matPending) {
    try {
      const d = await visionAnalyze(img, MATERIAL_VISION_SYSTEM);
      if (d.needKey) { $('#matRecognize').innerHTML = `<div class="xhs-banner">⚠️ ${esc(d.error)}</div>`; return; }
      if (d.ok && d.items) all = all.concat(d.items.map(x => ({ name: x.name || '', cat: x.category || '', brand: x.brand || '', spec: x.spec || '', qty: Math.max(1, parseInt(x.count || '1', 10) || 1) })));
      else if (!d.ok) { $('#matRecognize').innerHTML = `<div class="xhs-banner">⚠️ 识别失败：${esc(d.error || '未知错误')}</div>`; return; }
    } catch (e) { $('#matRecognize').innerHTML = `<div class="xhs-banner">⚠️ 请求出错：${esc(e.message)}</div>`; return; }
  }
  _matRecognized = all;
  renderMatRecognize();
  if (btn) btn.disabled = false;
}
function matField(el) {
  const f = el.className.replace('mat-in-', '');
  return f === 'name' ? 'name' : f === 'cat' ? 'cat' : f === 'brand' ? 'brand' : f === 'spec' ? 'spec' : 'qty';
}
function renderMatRecognize() {
  const box = $('#matRecognize');
  if (!_matRecognized.length) { box.innerHTML = '<div class="xhs-banner">没识别出明确的材料，换个角度拍清楚点试试～</div>'; const sf = $('#matSaveForm'); if (sf) sf.hidden = true; return; }
  box.innerHTML = `<div class="mat-rec-head"><h4 class="occ-title">🤖 识别出 ${_matRecognized.length} 件材料（可改分类/名称）</h4><button class="ghost-btn small" id="matRecAll">全选/取消</button></div>
    <ul class="mat-rec-list">${_matRecognized.map((it, i) => `
      <li class="mat-rec-item" data-i="${i}">
        <label class="mat-rec-chk"><input type="checkbox" class="mchk" data-i="${i}" checked></label>
        <div class="mat-rec-fields">
          <input class="mat-in-name" data-i="${i}" value="${esc(it.name)}" placeholder="材料名">
          <select class="mat-in-cat" data-i="${i}">${MAT_CAT_LIST.map(c => `<option ${c === it.cat ? 'selected' : ''}>${c}</option>`).join('')}</select>
          <input class="mat-in-brand" data-i="${i}" value="${esc(it.brand)}" placeholder="品牌">
          <input class="mat-in-spec" data-i="${i}" value="${esc(it.spec)}" placeholder="规格/色号">
          <input class="mat-in-qty" data-i="${i}" type="number" min="1" value="${it.qty}" placeholder="数量">
        </div>
      </li>`).join('')}</ul>
    <div class="mat-rec-foot">
      <button class="primary-btn" id="matSaveSel">💾 存入材料库</button>
      <span class="tip" id="matSaveTip"></span>
    </div>`;
  $('#matRecAll').onclick = () => { const all = $$('.mchk'); const any = all.some(c => !c.checked); all.forEach(c => c.checked = any); };
  $('#matSaveSel').onclick = matSaveSelected;
  box.querySelectorAll('.mat-in-name,.mat-in-cat,.mat-in-brand,.mat-in-spec,.mat-in-qty').forEach(el => {
    const sync = () => { const i = +el.dataset.i; _matRecognized[i][matField(el)] = el.value; };
    el.addEventListener('input', sync); el.addEventListener('change', sync);
  });
}
async function matSaveSelected() {
  const sel = $$('.mchk').filter(c => c.checked).map(c => +c.dataset.i);
  if (!sel.length) { toast('请勾选要存入的材料'); return; }
  const list = await materialGet();
  const names = list.map(x => (x.name || '').trim().toLowerCase());
  let added = 0, existed = 0; const newNames = [];
  const btn = $('#matSaveSel'); if (btn) btn.disabled = true;
  const tip = $('#matSaveTip'); if (tip) tip.textContent = '保存中…';
  for (const i of sel) {
    const it = _matRecognized[i]; if (!it || !it.name || !it.name.trim()) continue;
    const nm = it.name.trim();
    if (names.includes(nm.toLowerCase())) { existed++; continue; }
    const payload = { name: nm, cat: it.cat || '其它', brand: it.brand || '', spec: it.spec || '', qty: Math.max(1, parseInt(it.qty || '1', 10) || 1), unit: '件', location: '', shop: '', price: '', note: '', cover: (_matPending[0] || ''), files: _matPending };
    try { const r = await materialMutate('add', payload); if (r.ok) { added++; newNames.push(nm); names.push(nm.toLowerCase()); } } catch (e) {}
  }
  if (btn) btn.disabled = false;
  if (tip) tip.textContent = `已存入 ${added} 件${existed ? '，' + existed + ' 件库里已有（已跳过）' : ''}`;
  if (newNames.length) {
    const sf = $('#matSaveForm');
    sf.innerHTML = `<div class="mat-newlinks"><b>材料库还没记录「${esc(newNames.join('、'))}」，已帮你找好同款 🔗</b><div class="mat-newlinks-row">${shopLinks(newNames[0])}</div></div>`;
    sf.hidden = false;
  }
  toast(`已存入 ${added} 件材料 ✅`);
  setTimeout(() => { _matPending = []; _matRecognized = []; const pv = $('#matPreview'); if (pv) pv.innerHTML = ''; const rc = $('#matRecognize'); if (rc) rc.innerHTML = ''; $('#matUploadBody').hidden = true; }, 1800);
  renderMaterials();
}
function matShopKw(m) {
  const hit = matchMaterial(m.name);
  return hit ? MATERIALS[hit].kw : m.name;
}
async function renderMaterials() {
  const grid = $('#matGrid'); if (!grid) return;
  const items = await materialGet();
  items.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  setBadge('#cntMaterial', items.length);
  const q = $('#matSearch').value.trim().toLowerCase();
  const fc = $('#matFilterCat').value;
  const shown = items.filter(it => {
    if (fc && it.cat !== fc) return false;
    if (q) { const hay = [it.name, it.brand, it.spec, it.cat, it.note, it.location, it.shop].join(' ').toLowerCase(); if (!hay.includes(q)) return false; }
    return true;
  });
  const stats = {}; MAT_CAT_LIST.forEach(c => stats[c] = 0);
  items.forEach(it => { if (stats[it.cat] !== undefined) stats[it.cat]++; });
  const totalQty = items.reduce((s, x) => s + (parseInt(x.qty || '1', 10) || 1), 0);
  $('#matStats').innerHTML = `<span class="mat-stat"><b>${items.length}</b> 种材料</span><span class="mat-stat"><b>${totalQty}</b> 件库存</span>` +
    MAT_CAT_LIST.filter(c => stats[c]).map(c => `<span class="mat-stat cat" data-c="${c}">${c} <b>${stats[c]}</b></span>`).join('');
  $('#matStats').querySelectorAll('.mat-stat.cat').forEach(s => s.onclick = () => { $('#matFilterCat').value = s.dataset.c; renderMaterials(); });

  if (q && !shown.length) {
    grid.innerHTML = `<div class="mat-miss">
      <div class="mat-miss-ico">🔍</div>
      <h3>材料库里还没有「${esc($('#matSearch').value.trim())}」</h3>
      <p class="tip">没记录过没关系，已帮你打开购物网站的同款搜索：</p>
      <div class="mat-miss-links">${shopLinks($('#matSearch').value.trim())}</div>
    </div>`;
    $('#emptyMat').hidden = true;
    return;
  }
  if (!shown.length) {
    grid.innerHTML = '';
    $('#emptyMat').hidden = false;
    $('#emptyMat').textContent = items.length ? '没有匹配的材料，换个筛选条件试试～ 🌸' : '材料库还是空的，上传第一件材料吧～ 🌸';
    return;
  }
  $('#emptyMat').hidden = true;
  grid.innerHTML = shown.map(it => {
    const kw = matShopKw(it);
    return `<article class="mat-card" data-id="${esc(it.id)}">
      ${it.cover ? `<div class="mat-cover" data-lb="${esc(it.cover)}"><img src="${esc(it.cover)}" alt=""></div>` : `<div class="mat-cover none">🗃️</div>`}
      <span class="mat-cat" style="background:${MAT_CAT_COLOR[it.cat] || '#e7e7ef'}">${esc(it.cat || '其它')}</span>
      <h3 class="mat-name">${esc(it.name)}</h3>
      <div class="mat-meta">${it.brand ? `<span>🏷️ ${esc(it.brand)}</span>` : ''}${it.spec ? `<span>📏 ${esc(it.spec)}</span>` : ''}<span>📦 ${it.qty}${esc(it.unit || '件')}</span>${it.location ? `<span>📍 ${esc(it.location)}</span>` : ''}</div>
      ${it.note ? `<div class="mat-note">${esc(it.note)}</div>` : ''}
      <div class="mat-card-actions">
        <button class="mat-shop-btn" data-shop="1">🛒 找同款 / 补货</button>
        <button class="mat-edit" data-mat-edit="${esc(it.id)}">✏️</button>
        <button class="mat-del" data-mat-del="${esc(it.id)}">🗑</button>
      </div>
      <div class="mat-shop-links" hidden>${shopLinks(kw)}</div>
    </article>`;
  }).join('');
}
function matStartEdit(id) {
  materialGet().then(items => {
    const it = items.find(x => x.id === id); if (!it) return;
    const kw = matShopKw(it);
    const form = $('#matSaveForm');
    $('#matUploadBody').hidden = false; form.hidden = false;
    form.innerHTML = `<h4 class="occ-title">✏️ 编辑材料</h4>
      <div class="mat-edit-form">
        <input id="matEName" value="${esc(it.name)}" placeholder="材料名">
        <select id="matECat">${MAT_CAT_LIST.map(c => `<option ${c === it.cat ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <input id="matEBrand" value="${esc(it.brand)}" placeholder="品牌">
        <input id="matESpec" value="${esc(it.spec)}" placeholder="规格/色号">
        <input id="matEQty" type="number" min="1" value="${it.qty}" placeholder="数量">
        <input id="matEUnit" value="${esc(it.unit || '件')}" placeholder="单位">
        <input id="matELoc" value="${esc(it.location)}" placeholder="存放位置">
        <input id="matEShop" value="${esc(it.shop)}" placeholder="购买店铺">
        <input id="matEPrice" type="number" step="0.01" value="${it.price != null ? it.price : ''}" placeholder="单价 ¥">
        <textarea id="matENote" rows="2" placeholder="备注">${esc(it.note || '')}</textarea>
        <div class="mat-edit-actions">
          <button class="primary-btn" id="matESave">保存修改</button>
          <button class="ghost-btn" id="matECancel">取消</button>
          <span class="tip" id="matETip"></span>
        </div>
      </div>
      <div class="mat-edit-shop"><b>找同款 / 补货：</b><div class="mat-newlinks-row">${shopLinks(kw)}</div></div>`;
    $('#matESave').onclick = async () => {
      const payload = { id, name: $('#matEName').value.trim(), cat: $('#matECat').value, brand: $('#matEBrand').value.trim(), spec: $('#matESpec').value.trim(), qty: Math.max(1, parseInt($('#matEQty').value || '1', 10) || 1), unit: $('#matEUnit').value.trim() || '件', location: $('#matELoc').value.trim(), shop: $('#matEShop').value.trim(), price: $('#matEPrice').value === '' ? null : (parseFloat($('#matEPrice').value) || 0), note: $('#matENote').value.trim() };
      if (!payload.name) { $('#matETip').textContent = '材料名不能为空'; return; }
      $('#matETip').textContent = '保存中…';
      const r = await materialMutate('update', payload);
      if (r.ok) { toast('已保存 ✓'); form.hidden = true; renderMaterials(); } else $('#matETip').textContent = '保存失败：' + (r.error || '');
    };
    $('#matECancel').onclick = () => { form.hidden = true; };
  });
}

async function renderLearn() {
  const grid = $('#learnGrid'); if (!grid) return;
  let items = [];
  try { items = await learnGet(); } catch (e) { items = []; }
  items.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  setBadge('#cntLearn', items.length);
  learnRefreshCats(items);
  const q = $('#learnSearch').value.trim().toLowerCase();
  const fc = $('#learnFilterCat').value;
  const shown = items.filter(it => {
    if (fc && it.cat !== fc) return false;
    if (q) {
      const hay = [it.title, it.cat, it.note, it.url].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  if (!shown.length) { grid.innerHTML = ''; $('#emptyLearn').hidden = false; }
  else {
    $('#emptyLearn').hidden = true;
    grid.innerHTML = shown.map(it => {
      const u = safeUrl(it.url || '');
      const linkBtn = u
        ? `<a class="learn-link" href="${esc(u)}" target="_blank" rel="noopener noreferrer">🔗 打开链接</a>`
        : `<span class="learn-link disabled">📝 仅笔记</span>`;
      return `
        <article class="learn-card" data-id="${esc(it.id)}">
          <span class="learn-cat" style="background:${catColor(it.cat)}">${esc(it.cat || '其它')}</span>
          <h3 class="learn-title">${u
            ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer" class="learn-title-link">${esc(it.title || '未命名')}</a>`
            : esc(it.title || '未命名')}</h3>
          ${linkBtn}
          ${it.note ? `<div class="learn-note">${esc(it.note)}</div>` : ''}
          <div class="learn-actions">
            <button class="learn-edit" data-learn-edit="${esc(it.id)}">📝 编辑</button>
            <button class="learn-del" data-learn-del="${esc(it.id)}">🗑 删除</button>
          </div>
        </article>`;
    }).join('');
  }
}
function learnResetForm() {
  learnEditId = null;
  $('#learnTitle').value = ''; $('#learnCat').value = ''; $('#learnUrl').value = ''; $('#learnNote').value = '';
  $('#btnLearnSave').textContent = '保存';
  $('#btnLearnCancel').hidden = true;
  $('#learnStatus').textContent = '';
}
async function learnSubmit() {
  const title = $('#learnTitle').value.trim();
  const url = $('#learnUrl').value.trim();
  const cat = $('#learnCat').value.trim() || '其它';
  const note = $('#learnNote').value.trim();
  if (!title && !url) { $('#learnStatus').textContent = '标题和链接至少填一个～'; return; }
  if (url && !safeUrl(url)) { $('#learnStatus').textContent = '链接需以 http:// 或 https:// 开头'; return; }
  const btn = $('#btnLearnSave'); btn.disabled = true; $('#learnStatus').textContent = learnEditId ? '更新中…' : '保存中…';
  const payload = { title, cat, url, note };
  if (learnEditId) payload.id = learnEditId;
  try {
    const r = await learnMutate(learnEditId ? 'update' : 'add', payload);
    if (!r.ok) { $('#learnStatus').textContent = '保存失败：' + (r.error || '未知错误'); }
    else {
      $('#learnStatus').textContent = (learnEditId ? '已更新 ✓' : '已保存 ✓');
      setTimeout(() => { if ($('#learnStatus').textContent.indexOf('✓') >= 0) $('#learnStatus').textContent = ''; }, 2200);
      learnResetForm();
    }
  } catch (e) { $('#learnStatus').textContent = '保存失败：' + e.message; }
  btn.disabled = false;
  renderLearn();
}
function learnStartEdit(id) {
  learnGet().then(items => {
    const it = items.find(x => x.id === id); if (!it) return;
    learnEditId = id;
    $('#learnTitle').value = it.title || '';
    $('#learnCat').value = it.cat || '';
    $('#learnUrl').value = it.url || '';
    $('#learnNote').value = it.note || '';
    $('#btnLearnSave').textContent = '保存修改';
    $('#btnLearnCancel').hidden = false;
    $('#learnStatus').textContent = '编辑中…';
    $('#learnTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#learnTitle').focus();
  });
}

/* ---------------- 初始化 ---------------- */
function initUI() {
  // 探测后端代理是否可用：静态分享版（无后端）下封面走原图、抓取页回退本地缓存
  fetch('/api/portfolio', { method: 'GET' }).then(async r => {
    // 静态托管（CloudStudio 等）对不存在的 /api 路径常返回 200 的 fallback 页面，
    // 故不能只看状态码，必须确认响应是真正的 JSON 才视为有后端
    let isJson = false; try { JSON.parse(await r.text()); isJson = true; } catch (e) {}
    if (!isJson) { BACKEND = false; if (window.__fixXhsImages) window.__fixXhsImages(); renderDaily(); renderSummary(); }
  }).catch(() => { BACKEND = false; if (window.__fixXhsImages) window.__fixXhsImages(); renderDaily(); renderSummary(); });
  if (location.protocol === 'file:') {
    const warn = document.createElement('div');
    warn.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#ff4d6d;color:#fff;padding:14px 18px;font-size:14px;line-height:1.7;box-shadow:0 2px 12px rgba(0,0,0,.25)';
    warn.innerHTML = '⚠️ <b>打开方式不对</b>：你是用本地文件双击打开的，抓取 / 比价按钮会全部「请求失败」。<br>请改用浏览器访问 <b>http://localhost:8787</b> 打开工作台（不要双击 index.html 文件）。';
    document.body.prepend(warn);
  }
  $$('#personaSwitch .pill').forEach(p => p.classList.toggle('active', p.dataset.persona === state.persona));
  $('#personaHint').innerHTML = PERSONA[state.persona].hint;
  $('#incGear').checked = state.incGear;
  $('#laborRate').value = state.labor;
  $('#overhead').value = state.overhead;
  $('#targetMargin').value = state.target;
  renderLibrary(); renderPortfolio(); renderCart(); renderPricing(); renderDaily(); renderLearn();
  loadDailyCache();
  renderSummary(); // 预载「爆款总结」真实爆款（默认抓当前月）
  const rg = $('#btnReGrab');
  if (rg) rg.onclick = () => { if (state.summary && state.summary.scope) loadScopeReal(state.summary.scope, state.summary.key, { force: true }); };

  // 作品集
  $$('#pfCat button').forEach(b => b.onclick = () => {
    $$('#pfCat button').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); pfCat = b.dataset.cat;
  });
  $('#pfInput').addEventListener('change', e => {
    Array.from(e.target.files || []).forEach(f => {
      const r = new FileReader();
      r.onload = () => { pfPending.push({ name: f.name, data: r.result }); pfPreviewRender(); };
      r.readAsDataURL(f);
    });
    e.target.value = '';
  });
  const drop = $('#pfDrop');
  ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', e => {
    Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/')).forEach(f => {
      const r = new FileReader();
      r.onload = () => { pfPending.push({ name: f.name, data: r.result }); pfPreviewRender(); };
      r.readAsDataURL(f);
    });
  });
  $('#btnPfUpload').onclick = pfUpload;
  $$('.pf-tab').forEach(b => b.onclick = () => {
    $$('.pf-tab').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); pfFilter = b.dataset.pf; renderPortfolio();
  });
  $('#pfGrid').addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del) {
      if (!confirm('确定删除这张作品？')) return;
      if (BACKEND) {
        fetch('/api/portfolio?id=' + encodeURIComponent(del.dataset.del), { method: 'DELETE' })
          .then(r => r.json()).then(() => { renderPortfolio(); toast('已删除'); }).catch(() => toast('删除失败'));
      } else {
        _idb.del('portfolio', del.dataset.del).then(() => { renderPortfolio(); toast('已删除'); }).catch(() => toast('删除失败'));
      }
      return;
    }
    const img = e.target.closest('[data-lb]');
    if (img) {
      try {
        const list = JSON.parse(img.getAttribute('data-files') || '["' + img.src + '"]');
        const idx = parseInt(img.dataset.fi || '0', 10) || 0;
        openGallery(list, idx, img.getAttribute('data-cap') || img.alt);
      } catch (_) { openLightbox(img.src, img.alt); }
      return;
    }
  });
  $('#lbClose').onclick = closeLightbox;
  $('#lbMask').onclick = closeLightbox;
  const lbPrev = $('#lbPrev'), lbNext = $('#lbNext');
  if (lbPrev) lbPrev.onclick = e => { e.stopPropagation(); lbStep(-1); };
  if (lbNext) lbNext.onclick = e => { e.stopPropagation(); lbStep(1); };
  document.addEventListener('keydown', e => {
    if (!$('#lbBox').classList.contains('on')) return;
    if (e.key === 'ArrowLeft') lbStep(-1);
    else if (e.key === 'ArrowRight') lbStep(1);
    else if (e.key === 'Escape') closeLightbox();
  });

  // 材料库（拍照上传 + AI 分类 + 搜索 + 找同款）
  const bMatToggle = $('#btnMatToggleUpload'); if (bMatToggle) bMatToggle.onclick = () => toggleMatUpload();
  const matInput = $('#matInput'); if (matInput) matInput.addEventListener('change', e => { matReadFiles(e.target.files); e.target.value = ''; });
  const bMatPick = $('#btnMatPick'); if (bMatPick) bMatPick.onclick = () => { if (matInput) matInput.click(); };
  const matDrop = $('#matDrop');
  if (matDrop) {
    ['dragover', 'dragenter'].forEach(ev => matDrop.addEventListener(ev, e => { e.preventDefault(); matDrop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => matDrop.addEventListener(ev, e => { e.preventDefault(); matDrop.classList.remove('drag'); }));
    matDrop.addEventListener('drop', e => { matReadFiles(e.dataTransfer.files); });
  }
  const bMatAnalyze = $('#btnMatAnalyze'); if (bMatAnalyze) bMatAnalyze.onclick = matAnalyze;
  const matGrid = $('#matGrid');
  if (matGrid) matGrid.addEventListener('click', e => {
    const del = e.target.closest('[data-mat-del]');
    if (del) {
      if (!confirm('确定删除这件材料？')) return;
      materialMutate('delete', { id: del.dataset.matDel }).then(() => { renderMaterials(); toast('已删除'); }).catch(() => toast('删除失败'));
      return;
    }
    const ed = e.target.closest('[data-mat-edit]');
    if (ed) { matStartEdit(ed.dataset.matEdit); return; }
    const shop = e.target.closest('[data-shop]');
    if (shop) { const links = shop.closest('.mat-card').querySelector('.mat-shop-links'); if (links) links.hidden = !links.hidden; return; }
    const cover = e.target.closest('[data-lb]');
    if (cover) { if (window.openLightbox) openLightbox(cover.dataset.lb, cover.alt || ''); return; }
  });
  ['#matSearch', '#matFilterCat'].forEach(s => { const el = $(s); if (el) { el.addEventListener('input', renderMaterials); el.addEventListener('change', renderMaterials); } });
  const bMatReset = $('#btnMatReset'); if (bMatReset) bMatReset.onclick = () => { const s = $('#matSearch'); if (s) s.value = ''; const f = $('#matFilterCat'); if (f) f.value = ''; renderMaterials(); };

  // 学习站（笔记 + 链接）
  $('#btnLearnSave').onclick = learnSubmit;
  $('#btnLearnCancel').onclick = learnResetForm;
  ['#learnSearch', '#learnFilterCat'].forEach(s => {
    $(s).addEventListener('input', renderLearn);
    $(s).addEventListener('change', renderLearn);
  });
  $('#btnLearnReset').onclick = () => { $('#learnSearch').value = ''; $('#learnFilterCat').value = ''; renderLearn(); };
  $('#learnUrl').addEventListener('keydown', e => { if (e.key === 'Enter') learnSubmit(); });

  // 美甲盲盒
  const bbAgain = $('#btnBlindAgain'); if (bbAgain) bbAgain.onclick = () => { _blindSeed = 'r' + Math.random(); renderBlindBox(); toast('已为你换一组盲盒 ✨'); };
  const btnMatch = $('#btnMatch'); if (btnMatch) btnMatch.onclick = openMatchModal;
  const occInput = $('#occInput'); if (occInput) occInput.addEventListener('keydown', e => { if (e.key === 'Enter') openMatchModal(); });
  $$('#occChips .occ-chip').forEach(b => b.onclick = () => { $('#occInput').value = b.dataset.occ; openMatchModal(); });
  const matchClose = $('#matchClose'); if (matchClose) matchClose.onclick = closeMatchModal;
  const matchMask = $('#matchMask'); if (matchMask) matchMask.onclick = e => { if (e.target.id === 'matchMask') closeMatchModal(); };

  // 美甲盲盒 · 收藏夹
  renderFavs(); updateFavCount();
  const btnClearFav = $('#btnClearFav'); if (btnClearFav) btnClearFav.onclick = () => {
    if (!getFavs().length) return toast('收藏夹是空的');
    if (!confirm('确定清空我的收藏夹？')) return;
    setFavs([]); renderFavs(); updateFavCount(); toast('已清空收藏夹');
  };

  // 视觉分析：上传照片
  const vDrop = $('#visionDrop'), vFile = $('#visionFile');
  if (vDrop && vFile) {
    vDrop.addEventListener('click', () => vFile.click());
    const vPick = $('#visionPick'); if (vPick) vPick.addEventListener('click', e => { e.stopPropagation(); vFile.click(); });
    ['dragover', 'dragenter'].forEach(ev => vDrop.addEventListener(ev, e => { e.preventDefault(); vDrop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => vDrop.addEventListener(ev, e => { e.preventDefault(); vDrop.classList.remove('drag'); }));
    vDrop.addEventListener('drop', e => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) previewVisionFile(f); });
    vFile.addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) previewVisionFile(f); e.target.value = ''; });
    const vAnalyzeBtn = $('#btnVisionAnalyze'); if (vAnalyzeBtn) vAnalyzeBtn.addEventListener('click', () => { if (_visionPending) openVisionAnalyzer(_visionPending); });
    const vX = $('#visionX'); if (vX) vX.addEventListener('click', closeVision);
    const vMask = $('#visionMask'); if (vMask) vMask.addEventListener('click', e => { if (e.target.id === 'visionMask') closeVision(); });
  }
}

// 打开工作台时，若存在每日自动抓取的缓存，则载入展示（自动化写入 daily-cache.json）
async function loadDailyCache() {
  try {
    const r = await fetch('/daily-cache.json?t=' + Date.now());
    if (!r.ok) return;
    const c = await r.json();
    if (!c || !c.searches || !c.searches.length) return;
    const prev = state.daily.searches.length;
    state.daily.searches = c.searches;
    state.daily.updated = c.updated || state.daily.updated;
    save(); renderDaily();
    if (prev === 0) toast('已载入今日自动抓取的 ' + c.searches.length + ' 条爆款～');
  } catch (e) { /* 没缓存就忽略 */ }
}

// 分享版：小红书封面图带 Referer 防盗链，去掉 Referer 即可正常加载（本地后端代理走 /api/ 不受影响）
(function setupNoReferrer(){
  function fix(im){
    const s = im.getAttribute('src') || '';
    // 静态分享版无后端代理：把 /api/xhs/img 代理路径还原成小红书原图直链
    if (!BACKEND && s.indexOf('/api/xhs/img') === 0) {
      try { const u = new URL(s, location.href).searchParams.get('u'); if (u) im.src = u; } catch(e){}
      return;
    }
    if (/xhscdn|xiaohongshu|sns-img|xhs/.test(s)) im.referrerPolicy = 'no-referrer';
  }
  function scan(){ document.querySelectorAll('img').forEach(fix); }
  window.__fixXhsImages = scan; // 供后端探测完成后再次修正已渲染图片
  try { new MutationObserver(scan).observe(document.body, { childList: true, subtree: true }); } catch(e){}
  scan();
})();

/* ============ 美甲盲盒 + 场合匹配 ============ */
const BB_META = {
  'galaxy-cateye':  { length: 'long',   style: '猫眼' },
  'chrome-french':  { length: 'short',  style: '法式' },
  'bow-cream':      { length: 'medium', style: '法式' },
  'maillard-blur':  { length: 'medium', style: '晕染' },
  'jelly-ice':      { length: 'short',  style: '果冻冰透' },
  'pearl-moon':     { length: 'medium', style: '贝母珍珠' },
  'micro-french':   { length: 'short',  style: '法式' },
  'bubble-glass':   { length: 'short',  style: '玻璃Y2K' },
  'blush-glitter':  { length: 'medium', style: '钻饰甜美' },
  'jp-line':        { length: 'short',  style: '手绘艺术' },
  'sand-cateye':    { length: 'long',   style: '猫眼' },
  'matte-nude':     { length: 'short',  style: '磨砂裸色' },
  'velvet-snow':    { length: 'medium', style: '节日绒毛' },
  'wear-butterfly': { length: 'long',   style: '穿戴甲' },
  'classic-french': { length: 'short',  style: '法式' },
  'blush-jelly':    { length: 'short',  style: '果冻冰透' },
  'color-block':    { length: 'short',  style: '纯色跳色' },
  'milk-tea-grad':  { length: 'medium', style: '渐变' }
};
const OCC_MAP = {
  '婚礼': ['婚礼','贝母','珍珠','温柔','高级感','法式','经典','月光','新娘','显白'],
  '通勤': ['通勤','极简','百搭','裸色','磨砂','低调','经典','职场','显长'],
  '派对': ['party','爆闪','抢眼','Y2K','钻','甜美','生日','蹦迪','氛围感'],
  '约会': ['甜美','减龄','温柔','果冻','腮红','芭蕾','氛围感','日常','可爱'],
  '节日': ['节日','冬季','绒毛','红色','毛绒','圣诞','新年','春节','喜庆'],
  '度假': ['夏季','清凉','透明感','果冻','冰透','海边','旅游','海岛','度假'],
  '拍照': ['抢眼','Y2K','爆闪','极光','玻璃纸','艺术感','出片','网红','高级感'],
  '秋冬': ['高级感','大地色','秋冬','晕染','磨砂','低调','气质','显白'],
  '新手': ['新手','零门槛','百搭','纯色','简单','入门','减龄']
};
const LEN_LABEL = { short: '短甲', medium: '中长甲', long: '长甲' };

function todayStr(){ const d = new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
function hashStr(s){ let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>>0; }
function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

let _blindSeed = todayStr();

/* 盲盒数据池：直接复用「每日爆款」的小红书真实帖子（daily-cache.json），
   这样盲盒里的款式就是真实图文，并且能和每日爆款一样点开图文拆解弹窗。 */
let _blindPool = null;
let _noteIndex = {};
async function ensureBlindPool(){
  if (_blindPool) return _blindPool;
  let pool = [];
  try {
    const d = await (await fetch('/daily-cache.json?t=' + Date.now())).json();
    pool = pool.concat((d.searches || []).filter(x => x && x.cover && x.noteId));
  } catch (e) {}
  if (!pool.length && state.daily && state.daily.searches && state.daily.searches.length) pool = state.daily.searches;
  // 并入「爆款中心」的月度/季度真实爆款，扩大候选池、提升风格多样性
  try {
    const m = await (await fetch('/xhs_monthly.json?t=' + Date.now())).json();
    const extra = [];
    ['month#7','quarter#Q3','month#4','quarter#Q2'].forEach(k => { const it = m[k] && m[k].items; if (it) extra.push(...it); });
    pool = pool.concat(extra.filter(x => x && x.cover && x.noteId));
  } catch (e) {}
  // 并入用户导入的笔记
  if (state.daily && state.daily.notes && state.daily.notes.length) pool = pool.concat(state.daily.notes.filter(x => x && x.cover && x.noteId));
  // 并入真实网图扩充集（blindbox-web.json，来自腾讯新闻 qqpublic.qpic.cn 真实美甲照片）
  try {
    const wb = await (await fetch('/blindbox-web.json?t=' + Date.now())).json();
    if (Array.isArray(wb) && wb.length) pool = pool.concat(wb.filter(x => x && x.cover && x.noteId));
  } catch (e) {}
  // 按 noteId 去重
  const seen = new Set(); pool = pool.filter(x => { if (seen.has(x.noteId)) return false; seen.add(x.noteId); return true; });
  _blindPool = pool;
  _noteIndex = {}; _blindPool.forEach(p => { if (p && p.noteId) _noteIndex[p.noteId] = p; });
  return _blindPool;
}

// 从标题/搜索词推断长短甲与风格，用于盲盒的「长短甲都有、风格多样」约束
function realLen(p){
  if (p.len) return p.len;
  const t = p.title || '';
  if (t.includes('短甲')) return 'short';
  if (t.includes('长甲')) return 'long';
  if (t.includes('中长')) return 'medium';
  return 'medium';
}
function realStyle(p){
  if (p.style) return p.style;
  const t = ((p.title || '') + ' ' + (p.kw || '')).toLowerCase();
  if (t.includes('猫眼')) return '猫眼';
  if (t.includes('法式')) return '法式';
  if (t.includes('晕染') || t.includes('渐变')) return '晕染渐变';
  if (t.includes('果冻') || t.includes('冰透') || t.includes('透')) return '果冻冰透';
  if (t.includes('钻') || t.includes('闪') || t.includes('爆闪')) return '钻饰闪钻';
  if (t.includes('手绘') || t.includes('画')) return '手绘艺术';
  if (t.includes('穿戴甲')) return '穿戴甲';
  if (t.includes('裸') || t.includes('奶茶') || t.includes('莫兰迪') || t.includes('极简') || t.includes('裸色')) return '裸色极简';
  if (t.includes('复古') || t.includes('美拉德') || t.includes('棕')) return '复古';
  if (t.includes('节日') || t.includes('圣诞') || t.includes('新年') || t.includes('红色') || t.includes('喜庆') || t.includes('绒')) return '节日';
  if (t.includes('玻璃') || t.includes('y2k') || t.includes('极光')) return '玻璃Y2K';
  return '流行款';
}

// 收藏夹（localStorage，分享版也能用，跨刷新保留）
const FAV_KEY = 'nail_blind_favs_v1';
function getFavs(){ try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch(e){ return []; } }
function setFavs(a){ try { localStorage.setItem(FAV_KEY, JSON.stringify(a)); } catch(e){} }
function isFav(id){ return getFavs().some(x => x.noteId === id); }
function toggleFav(p){
  const a = getFavs(); const i = a.findIndex(x => x.noteId === p.noteId);
  if (i >= 0) a.splice(i, 1);
  else if (p.noteId) a.push({ noteId: p.noteId, cover: p.cover, title: p.title, url: p.url, likes: p.likes, web: p.web });
  setFavs(a); return i < 0;
}
// 多样性挑选：先按风格各取 1，再补不同长短甲，最后补齐（同一风格最多 2 款），避免一堆相似款
function pickDiverse(items, k){
  const chosen = [], seenStyle = new Set(), seenLen = new Set();
  for (const it of items){
    if (chosen.length >= k) break;
    if (!seenStyle.has(it.style)){ chosen.push(it.p); seenStyle.add(it.style); seenLen.add(it.len); }
  }
  for (const it of items){
    if (chosen.length >= k) break;
    if (chosen.includes(it.p)) continue;
    if (!seenLen.has(it.len)){ chosen.push(it.p); seenLen.add(it.len); }
  }
  const styleCount = {};
  chosen.forEach(p => { const s = realStyle(p); styleCount[s] = (styleCount[s] || 0) + 1; });
  for (const it of items){
    if (chosen.length >= k) break;
    if (chosen.includes(it.p)) continue;
    const s = it.style;
    if ((styleCount[s] || 0) >= 2) continue;
    chosen.push(it.p); styleCount[s] = (styleCount[s] || 0) + 1;
  }
  return chosen;
}

// 每天用日期做随机种子抽 10 款：先保长短甲覆盖，再尽量拉满风格多样
function pickBlindReal(seedStr, count, pool){
  count = count || 10;
  const rng = mulberry32(hashStr(seedStr));
  const items = pool.map(p => ({ p, len: realLen(p), style: realStyle(p) }));
  items.sort(() => rng() - 0.5);
  return pickDiverse(items, count);
}

// (tiltCards 已移除：盲盒改用语义一致的真实帖子卡片，沿用每日爆款样式)

function blindRealCard(p){
  const len = LEN_LABEL[realLen(p)] || '';
  const st = realStyle(p);
  const fav = isFav(p.noteId);
  const web = !!p.web;
  const linkTxt = web ? '看大图 🔍' : '看图文拆解 ↗';
  const webBadge = web ? '<span class="web-badge">🌐 真实网图</span>' : '';
  return `<article class="xhs-card blind-real${web ? ' is-web' : ''}" data-note="${esc(p.noteId || '')}" data-cover="${esc(p.cover)}" data-title="${esc(p.title)}" data-url="${esc(p.url || '')}" data-likes="${esc(p.likes || '')}" data-style="${esc(p.style || st)}" data-len="${esc(p.len || realLen(p))}" data-desc="${esc(p.desc || '')}" data-web="${web ? '1' : ''}">
    <button class="fav-heart ${fav ? 'on' : ''}" data-fav="${esc(p.noteId || '')}" title="收藏到我的收藏夹">${fav ? '❤️' : '🤍'}</button>
    <div class="xhs-img">${webBadge}<img src="${xhsImg(p.cover)}" alt="" loading="lazy" onerror="this.parentNode.style.background='var(--surface-2)'"></div>
    <div class="xhs-meta">
      <div class="xhs-title">${esc(p.title)}</div>
      <div class="xhs-sub"><span class="xhs-like">♡ ${esc(p.likes || '—')}</span><span class="xhs-link">${linkTxt}</span></div>
      <div class="bb-chips"><span class="tag bb-style">${st}</span><span class="tag bb-len">${len}</span></div>
    </div>
  </article>`;
}

async function renderBlindBox(){
  const grid = $('#blindGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="xhs-banner">正在抽取今日盲盒 🎲</div>';
  const pool = await ensureBlindPool();
  if (!pool.length){
    grid.innerHTML = '<div class="xhs-banner">暂未拿到真实爆款数据。请在本机打开工作台（http://localhost:8787）刷新「每日爆款」后再来，或稍后重试～</div>';
    return;
  }
  const list = pickBlindReal(_blindSeed, 15, pool);
  grid.innerHTML = list.map(p => blindRealCard(p)).join('');
  const d = $('#blindDate'); if (d) d.textContent = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const c = $('#blindCount'); if (c) c.textContent = list.length;
  const lens = [...new Set(list.map(p => realLen(p)))].map(l => LEN_LABEL[l]).filter(Boolean);
  const lh = $('#blindLenHint'); if (lh) lh.textContent = lens.join(' / ');
}

function matchByOccasion(text){
  text = (text || '').trim();
  if (!text) return { occ: null, list: [] };
  let occ = null, tags = [];
  for (const k of Object.keys(OCC_MAP)){ if (text.includes(k)){ occ = k; tags = tags.concat(OCC_MAP[k]); } }
  const pool = _blindPool || (state.daily && state.daily.searches) || [];
  const poolItems = pool.map(p => ({ p, len: realLen(p), style: realStyle(p) }));
  let scored;
  if (tags.length){
    scored = poolItems.map(it => {
      const hay = ((it.p.title || '') + ' ' + (it.p.kw || '')).toLowerCase();
      let score = 0; tags.forEach(t => { if (hay.includes(t.toLowerCase())) score++; });
      return { p: it.p, len: it.len, style: it.style, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  } else {
    const low = text.toLowerCase();
    scored = poolItems.filter(it => ((it.p.title || '') + ' ' + (it.p.kw || '')).toLowerCase().includes(low));
  }
  let list = pickDiverse(scored, 8);
  // 匹配太少时，用池内高赞且风格多样的真实爆款补足，保证有足够选择、且避免一堆相似款
  if (list.length < 6){
    const chosen = new Set(list.map(p => p.noteId));
    const rest = poolItems
      .filter(it => it.p.noteId && !chosen.has(it.p.noteId))
      .map(it => ({ ...it, score: parseInt(it.p.likes, 10) || 0 }))
      .sort((a, b) => b.score - a.score);
    list = list.concat(pickDiverse(rest, 6 - list.length));
  }
  return { occ, list };
}

async function openMatchModal(){
  const body = $('#matchBody');
  if (!body) return;
  if (!_blindPool) await ensureBlindPool();
  const { occ, list } = matchByOccasion($('#occInput').value);
  if (!list.length){
    body.innerHTML = `<div class="xhs-banner">没找到特别匹配的～ 试试点下面的快捷标签，或填「婚礼 / 通勤 / 派对 / 约会 / 节日 / 度假拍照 / 新手」等关键词 💡</div>`;
  } else {
    const title = occ ? `为你匹配到 ${list.length} 款适合「${occ}」的小红书爆款 ✨` : `为你找到 ${list.length} 款相关爆款 ✨`;
    body.innerHTML = `<div class="match-head">${title}</div><div class="grid">${list.map(p => blindRealCard(p)).join('')}</div>`;
  }
  $('#matchMask').classList.add('on');
}
function closeMatchModal(){ const m = $('#matchMask'); if (m) m.classList.remove('on'); }

// 收藏夹渲染（localStorage）
function renderFavs(){
  const g = $('#favGrid'); if (!g) return;
  const favs = getFavs();
  if (!favs.length){ g.innerHTML = '<div class="xhs-banner">还没有收藏的款式～ 在盲盒或场合匹配里点 🤍 就能收进来 💡</div>'; return; }
  g.innerHTML = favs.map(p => `
    <article class="xhs-card fav-card${p.web ? ' is-web' : ''}" data-note="${esc(p.noteId || '')}" data-cover="${esc(p.cover || '')}" data-title="${esc(p.title || '')}" data-url="${esc(p.url || '')}" data-likes="${esc(p.likes || '')}" data-style="${esc(p.style || '')}" data-len="${esc(p.len || '')}" data-desc="${esc(p.desc || '')}" data-web="${p.web ? '1' : ''}">
      <button class="fav-heart on" data-fav="${esc(p.noteId || '')}" title="取消收藏">❤️</button>
      <div class="xhs-img"><img src="${xhsImg(p.cover)}" alt="" loading="lazy" onerror="this.parentNode.style.background='var(--surface-2)'"></div>
      <div class="xhs-meta">
        <div class="xhs-title">${esc(p.title || '')}</div>
        <div class="xhs-sub"><span class="xhs-like">♡ ${esc(p.likes || '—')}</span><span class="xhs-link">看图文拆解 ↗</span></div>
      </div>
      <div class="fav-card-foot">
        <button class="fav-addcart" data-addcart="1" title="用 AI 识别材料并一键加入采购车">🛒 加入采购车</button>
        <button class="fav-analyze" data-analyze="1" title="用 AI 分析这张款式需要买的材料（可先勾选再添加）">🤖 分析材料</button>
      </div>
    </article>`).join('');
}
function updateFavCount(){ const n = getFavs().length; const el = $('#favCount'); if (el) el.textContent = n; }

load();
bind();
initUI();

// 全局懒加载兜底：给所有未设置 loading 的图片加 lazy（含动态渲染）
(function () {
  function lazyAll(root) {
    root.querySelectorAll('img:not([loading])').forEach(function (im) { im.loading = 'lazy'; });
  }
  lazyAll(document);
  if (window.MutationObserver) {
    var obs = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType === 1) {
            if (n.tagName === 'IMG' && !n.hasAttribute('loading')) n.loading = 'lazy';
            else if (n.querySelectorAll) lazyAll(n);
          }
        });
      });
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
})();

