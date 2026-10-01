// ============================================================
// 工具函数
// ============================================================

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function hexToRgba(hex, alpha) {
  if (!hex || hex[0] !== '#') return hex;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function calcDamage(baseAtk) {
  const isCrit = Math.random() < CRIT_CHANCE;
  const base = isCrit ? baseAtk * CRIT_MULT : baseAtk;
  const bonus = 1 + (state.radiationBonus || 0);
  return { dmg: base * bonus, isCrit };
}

function sellValueOfCost(cost) {
  return Math.floor((cost || 0) / 2);
}

function computeMass(atoms) {
  return atoms.reduce((s, a) => s + (ATOM_MASS[a] || 1), 0);
}

function computeSizeFactor(atoms) {
  return 0.85 + 0.30 * Math.sqrt(computeMass(atoms) / 60);
}

function isSubset(a, b) {
  const bCopy = [...b];
  for (const item of a) {
    const idx = bCopy.indexOf(item);
    if (idx === -1) return false;
    bCopy.splice(idx, 1);
  }
  return true;
}

function findMoleculeMatch(atoms) {
  const sorted = [...atoms].sort();
  for (const key in DEFS) {
    const def = DEFS[key];
    if (def.tier === 0 || def.isIntermediate) continue;
    if (def.isLattice) continue;
    const defSorted = [...def.atoms].sort();
    if (defSorted.length === sorted.length &&
        defSorted.every((v, i) => v === sorted[i])) return key;
  }
  return null;
}

function findSupersetMolecule(atoms) {
  const sorted = [...atoms].sort();
  if (new Set(sorted).size < 2) return null;

  let best = null;
  for (const key in DEFS) {
    const def = DEFS[key];
    if (def.tier === 0 || def.isIntermediate) continue;
    if (def.isLattice) continue;
    const defSorted = [...def.atoms].sort();
    if (defSorted.length <= sorted.length) continue;
    if (!isSubset(sorted, defSorted)) continue;

    const remain = [...defSorted];
    for (const a of sorted) {
      const idx = remain.indexOf(a);
      if (idx >= 0) remain.splice(idx, 1);
    }
    if (new Set(remain).size > 1) continue;

    if (!best || defSorted.length < DEFS[best].atoms.length) best = key;
  }
  return best;
}

// ============================================================
// 晶格化
// ============================================================

function getLatticeKey(atoms) {
  if (atoms.length < 2) return null;
  const first = atoms[0];
  if (!LATTICE_ELEMENTS[first]) return null;
  for (let i = 1; i < atoms.length; i++) {
    if (atoms[i] !== first) return null;
  }
  if (atoms.length > LATTICE_ELEMENTS[first].maxN) return null;
  return 'LAT:' + first + atoms.length;
}

function ensureLatticeDef(key) {
  // ★ 关键修复：key 为 null/undefined 时直接返回，避免 key.match 崩溃
  if (!key) return null;
  if (DEFS[key]) return key;

  const m = key.match(/^LAT:(\w+?)(\d+)$/);
  if (!m) return null;
  const elem = m[1];
  const n = parseInt(m[2], 10);
  const cfg = LATTICE_ELEMENTS[elem];
  if (!cfg || n < 2 || n > cfg.maxN) return null;

  const atkMul   = 1 + cfg.atkLog * Math.log2(n);
  const rangeMul = 1 + cfg.rangePerN * (n - 1);
  const cdMul    = Math.max(0.4, 1 + cfg.cdPerN * (n - 1));

  const atk   = Math.round(cfg.baseAtk   * atkMul);
  const hp    = Math.round(cfg.baseHp    * n * cfg.hpMul);
  const range = Math.round(cfg.baseRange * rangeMul);
  const cd    = cfg.baseCd * cdMul;

  let mode = null, modeExtra = null;
  for (const s of cfg.special) {
    if (n >= s.n) { mode = s.mode; modeExtra = s; }
  }

  const subsMap = ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'];
  const toSub = num => String(num).split('')
    .map(d => subsMap[parseInt(d, 10)] || d).join('');
  const symbol = elem + toSub(n);

  const def = {
    atoms: Array(n).fill(elem),
    name: cfg.name + toSub(n),
    symbol,
    color: cfg.color,
    stroke: cfg.stroke,
    atk, range, cd, hp,
    tier: 1,
    tags: ['bullet', cfg.tag, 'lattice'],
    attack: 'bullet',
    isLattice: true,
    latticeN: n,
    latticeElem: elem,
  };
    // ★ 铀晶格等特殊晶格携带全局辐射
  if (cfg.global) {
    def.global = cfg.global;
    def.globalName = cfg.globalName || cfg.global;
  }
  if (cfg.radiationBonus) {
    def.radiationBonus = cfg.radiationBonus;
    def.tags = def.tags.includes('radioactive')
      ? def.tags
      : [...def.tags, 'radioactive'];
  }
  if (mode === 'splash') {
    def.bulletMode = 'splash';
    def.splashRadius = modeExtra.radius || 80;
    def.splashRatio = modeExtra.ratio || 0.5;
  } else if (mode === 'burst') {
    def.bulletMode = 'burst';
    def.burstCount = modeExtra.count || 2;
  } else if (mode === 'pierce') {
    def.bulletMode = 'pierce';
    def.pierceRange = range + 20;
  } else if (mode === 'chain') {
    def.bulletMode = 'chain';
    def.chainCount = modeExtra.count || 2;
  } else if (mode === 'knockback') {
    def.bulletMode = 'knockback';
    def.knockbackDist = modeExtra.dist || 80;
  }
  DEFS[key] = def;
  return key;
}

// 化学式元素顺序（电正性 → 电负性）
const FORMULA_PRIORITY = {
  K: 1, Ca: 2, Na: 3, Li: 4, Mg: 5, Al: 6,
  Ti: 7, Mn: 8, Fe: 9, Co: 10, Ni: 11, Cu: 12, Zn: 13, Ag: 14, Au: 15,
  B: 20, Si: 21, C: 22,
  N: 30, P: 32,
  H: 35,
  S: 40, O: 45, Cl: 50, F: 52, Br: 54, I: 56,
};

function buildIntermediateSymbol(atoms) {
  const counts = {};
  for (const a of atoms) counts[a] = (counts[a] || 0) + 1;

  const subsMap = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  const toSubscript = num => String(num).split('').map(d => subsMap[parseInt(d, 10)] || d).join('');

  const entries = Object.entries(counts);
  entries.sort((x, y) => {
    const px = FORMULA_PRIORITY[x[0]] ?? 100;
    const py = FORMULA_PRIORITY[y[0]] ?? 100;
    if (px !== py) return px - py;
    return x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0;
  });

  return entries
    .map(([k, v]) => v > 1 ? k + toSubscript(v) : k)
    .join('');
}

function getSourceTagName(def) {
  if (!def) return '光环';
  // 优先使用 aura 定义里已经写好的名字
  if (def.aura && def.aura.name) return def.aura.name;
  if (!def.tags) return '光环';
  for (const id of def.tags) {
    const t = TAGS[id];
    if (t && t.cat === 'source') return t.name;
  }
  return '光环';
}