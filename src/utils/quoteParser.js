// src/utils/quoteParser.js

const BLOCK_START_RE = /L\s*\d+\s*(?:\(\s*(?:内|外)\s*\))?\s*\*\s*W\s*\d+\s*\*\s*H\s*\d+(?:mm)?/gi;
const HEADER_RE = /L\s*(\d+)\s*(?:\(\s*(内|外)\s*\))?\s*\*\s*W\s*(\d+)\s*\*\s*H\s*(\d+)\s*(?:mm)?/i;

const QTY_MAIN_SUB_RE = /(?:数量\s*:\s*)?(\d+)\s*主架\s*(\d+)\s*副架/i;
const QTY_MAIN_ONLY_RE = /(?:数量\s*:\s*)?(\d+)\s*主架/i;
const QTY_SUB_ONLY_RE = /(?:数量\s*:\s*)?(\d+)\s*副架/i;

const BEAM_LAYER_RE = /(\d+)\s*层\s*(?:横梁|梁)(?!板)/i;
const SHELF_LAYER_RE = /(\d+)\s*层\s*(?:层板|拣货层|放货层)/i;
const ANY_LAYER_RE = /(\d+)\s*层/i;

const LOAD_RE = /载重\s*:\s*(\d+(?:\.\d+)?)\s*kg\/层/gi;

// 【重要修正】包含“放货”，确保主架副架网层板全覆盖
const NET_PANEL_KEYWORD_RE = /(网层板|网板|网片板|网格板|钢网板|网层)/i;
const SHELF_KEYWORD_RE = /(层板|拣货层|放货层)/i;

const THICKNESS_RE_1 = /厚\s*:\s*(\d+(?:\.\d+)?\s*mm)/i;
const THICKNESS_RE_2 = /\(\s*厚\s*:\s*(\d+(?:\.\d+)?\s*mm)\s*\)/i;

// 【重要修正】全部改为 name 映射
const ORDER_MAP = {
  '立柱片': 1,
  '横梁': 2,
  '网层板': 3,
  '层板': 4,
  '连接杆': 5,
  '防撞护脚': 6,
  '防撞护栏': 7,
};

// --- 工具函数精简 ---
const normalizeText = (text) => String(text || '')
  .replace(/\r\n?/g, '\n').replace(/[（]/g, '(').replace(/[）]/g, ')')
  .replace(/[：]/g, ':').replace(/[，]/g, ',').replace(/[×]/g, '*')
  .replace(/[　\t]/g, ' ').trim();

const splitRackBlocks = (text) => {
  const matches = [...text.matchAll(BLOCK_START_RE)];
  if (!matches.length) return [];
  const starts = matches.map(m => m.index);
  starts.push(text.length);
  return starts.slice(0, -1).map((start, i) => text.slice(start, starts[i + 1]).trim()).filter(Boolean);
};

const parseQty = (block) => {
  const both = QTY_MAIN_SUB_RE.exec(block);
  if (both) return { mainCount: Number(both[1]), subCount: Number(both[2]) };
  const main = QTY_MAIN_ONLY_RE.exec(block);
  const sub = QTY_SUB_ONLY_RE.exec(block);
  return { mainCount: main ? Number(main[1]) : 0, subCount: sub ? Number(sub[1]) : 0 };
};

const parsePrimaryLayerCount = (block) => {
  const match = BEAM_LAYER_RE.exec(block) || SHELF_LAYER_RE.exec(block) || ANY_LAYER_RE.exec(block);
  return match ? Number(match[1]) : 0;
};

const findLastLayerInText = (text, re) => {
  const matches = [...text.matchAll(new RegExp(re.source, 'gi'))];
  return matches.length ? Number(matches[matches.length - 1][1]) : null;
};

const buildEvenDistribution = (total, count) => {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  let remain = total % count;
  return Array.from({ length: count }, () => base + (remain-- > 0 ? 1 : 0));
};

// 【重要修正】推入数组时，字段名统一使用 name
const addPart = (parts, seq, name, spec, unit, qty) => {
  seq.value += 1;
  parts.push({ order: seq.value, name, spec, unit, qty: Number(qty) || 0 });
};

// --- 业务解析逻辑 ---
const parseBeamParts = (block, rackCount, beamLength, seq) => {
  const parts = [];
  const beamLayers = parsePrimaryLayerCount(block);
  if (!beamLayers) return parts;

  const loadItems = [...block.matchAll(LOAD_RE)].map(m => ({ load: Number(m[1]), index: m.index }));

  if (!loadItems.length) {
    addPart(parts, seq, '横梁', `L${beamLength}mm`, '根', 2 * beamLayers * rackCount);
    return parts;
  }

  const groups = loadItems.map((item) => {
    const prefixText = block.slice(0, item.index);
    const layers = findLastLayerInText(prefixText, BEAM_LAYER_RE) || findLastLayerInText(prefixText, SHELF_LAYER_RE) || null;
    return { load: item.load, layers };
  });

  if (groups.length === 1) {
    groups[0].layers = groups[0].layers || beamLayers;
  } else {
    const fixedSum = groups.reduce((sum, item) => sum + (item.layers || 0), 0);
    const emptyIdx = groups.map((it, i) => it.layers == null ? i : -1).filter(i => i >= 0);
    if (emptyIdx.length) {
      const dist = buildEvenDistribution(Math.max(0, beamLayers - fixedSum), emptyIdx.length);
      emptyIdx.forEach((idx, i) => { groups[idx].layers = dist[i]; });
    }
  }

  groups.filter(g => g.layers > 0).forEach(group => {
    const spec = `L${beamLength}mm（载重：${String(group.load).replace(/\.0$/, '')}kg/层）`;
    addPart(parts, seq, '横梁', spec, '根', 2 * group.layers * rackCount);
  });
  return parts;
};

// --- 业务解析逻辑修正 ---

const parseNetPanelParts = (block, mainCount, subCount, beamLength, width, shortestBeam, seq) => {
  const parts = [];
  // 只有明确出现“网”字辈的关键词，才触发网层板计算
  if (!NET_PANEL_KEYWORD_RE.test(block)) return parts;

  const beamLayers = parsePrimaryLayerCount(block);
  const panelsPerLayer = Math.ceil(beamLength / 1600);
  const totalQty = panelsPerLayer * beamLayers * (mainCount + subCount);

  if (totalQty > 0) {
    const basePanels = Math.ceil(shortestBeam / 1600);
    const singleL = Math.floor((shortestBeam - (basePanels + 1) * 16.6) / basePanels);
    const spec = `L${singleL}*W${width}mm（100*50*5.0mm一板4筋；镀锌）`;
    addPart(parts, seq, '网层板', spec, '块', totalQty);
  }
  return parts;
};

const parseShelfParts = (block, rackCount, beamLength, width, seq) => {
  const parts = [];
  // 修正：不再因为有网层板就直接 return，而是只在匹配到层板关键字时才计算
  if (!SHELF_KEYWORD_RE.test(block)) return parts;

  const tMatch = THICKNESS_RE_1.exec(block) || THICKNESS_RE_2.exec(block);
  const thick = tMatch ? tMatch[1] : '0.6mm';
  
  // 匹配 “3层放货” 或 “3层层板”
  const shelfMatches = [...block.matchAll(/(\d+)\s*层\s*(层板|拣货层|放货层)/gi)];
  
  shelfMatches.forEach(match => {
    const layers = Number(match[1]);
    const L = Math.round((beamLength - 170) / 2);
    // 注意：这里你可以根据需求决定是否保留 "层板12" 这个名称，或者统一为 "层板"
    addPart(parts, seq, '层板', `L${L}*W${width - 40}mm（厚：${thick}）`, '块', 2 * layers * rackCount);
  });
  return parts;
};
const parseManualParts = (block, seq) => {
  const items = [{ n: '连接杆', u: '根' }, { n: '防撞护脚', u: '个' }, { n: '防撞护栏', u: '个' }];
  const parts = [];
  items.forEach(({ n, u }) => {
    const re = new RegExp(`${n}\\s*([^\\n\\r]*?)\\s*(\\d+(?:\\.\\d+)?)\\s*${u}`, 'gi');
    [...block.matchAll(re)].forEach(m => {
      addPart(parts, seq, n, (m[1] || '').trim() || '未注明', u, Number(m[2]));
    });
  });
  return parts;
};

// 【合并统计逻辑】：依据 name, spec, unit 严格归类并累加 qty
const aggregateParts = (rawParts) => {
  const map = new Map();
  rawParts.forEach((row) => {
    const key = `${row.name}||${row.spec}||${row.unit}`;
    if (!map.has(key)) {
      map.set(key, { ...row, qty: 0, firstOrder: row.order });
    }
    const item = map.get(key);
    item.qty += Number(row.qty) || 0;
    item.firstOrder = Math.min(item.firstOrder, row.order);
  });

  return Array.from(map.values()).sort((a, b) => {
    const ao = ORDER_MAP[a.name] || 99;
    const bo = ORDER_MAP[b.name] || 99;
    return ao !== bo ? ao - bo : a.firstOrder - b.firstOrder;
  });
};

// --- 主入口 ---
export const parseQuoteText = (inputText) => {
  const text = normalizeText(inputText);
  const blocks = splitRackBlocks(text);
  if (!blocks.length) return { parts: [], errors: ['未识别到货架'], warnings: [] };

  // 全局预扫描：找出所有横梁中最短的长度（为了网层板规格统一）
  const beamLengths = blocks.map(b => {
    const match = HEADER_RE.exec(b);
    return match ? Number(match[1]) : null;
  }).filter(Boolean);
  const shortestBeam = beamLengths.length ? Math.min(...beamLengths) : 0;

  const seq = { value: 0 };
  const allParts = [], errors = [], warnings = [];

  blocks.forEach((block, index) => {
    const header = HEADER_RE.exec(block);
    if (!header) {
      errors.push(`第 ${index + 1} 条尺寸识别失败。`);
      return;
    }
    const [ , lengthStr, , widthStr, heightStr ] = header;
    const length = Number(lengthStr), width = Number(widthStr), height = Number(heightStr);
    
    const qty = parseQty(block);
    const rackCount = qty.mainCount + qty.subCount;
    if (rackCount === 0) {
      errors.push(`第 ${index + 1} 条数量识别失败。`);
      return;
    }

    // 依序执行各个零部件的解析
    addPart(allParts, seq, '立柱片', `H${height}*W${width}mm`, '片', qty.mainCount * 2 + qty.subCount);
    allParts.push(...parseBeamParts(block, rackCount, length, seq));
    allParts.push(...parseNetPanelParts(block, qty.mainCount, qty.subCount, length, width, shortestBeam, seq));
    allParts.push(...parseShelfParts(block, rackCount, length, width, seq));
    allParts.push(...parseManualParts(block, seq));
  });

  return { parts: aggregateParts(allParts), errors, warnings };
};