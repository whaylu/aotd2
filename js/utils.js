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
  return { dmg: isCrit ? baseAtk * CRIT_MULT : baseAtk, isCrit };
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
    const defSorted = [...def.atoms].sort();
    if (defSorted.length === sorted.length &&
        defSorted.every((v, i) => v === sorted[i])) return key;
  }
  return null;
}

function findSupersetMolecule(atoms) {
  const sorted = [...atoms].sort();

  // ★ 单元素组合（H₃、C₂、O₃…）无法通向任何已定义分子，
  //    拒绝生成。修复 H₂+H → H₃ → +C → CH₃ 的假过渡态链。
  if (new Set(sorted).size < 2) return null;

  let best = null;
  for (const key in DEFS) {
    const def = DEFS[key];
    if (def.tier === 0 || def.isIntermediate) continue;
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

// 化学式元素顺序：金属 → 碳 → 氮 → 氢 → 其余（按字母序）
// 修正字母序导致的 "ClH"/"ClNa"/"H₂N" 等错误写法
const FORMULA_PRIORITY = {
  // 金属：数字小的在前
  K: 1, Ca: 2, Na: 3, Mg: 4, Al: 5, Zn: 6, Fe: 7, Cu: 8, Ag: 9, Au: 10,
  // 类金属 / 碳
  Si: 15, C: 16,
  // 非金属：N / P 在 H 前（NH₃、PH₃ 惯例）
  N: 20, P: 22,
  // H
  H: 25,
  // 后续
  S: 30, O: 35, Cl: 40, F: 42,
};

function buildIntermediateSymbol(atoms) {
  const counts = {};
  for (const a of atoms) counts[a] = (counts[a] || 0) + 1;

  // 下标字符映射表：精确按数字索引 0~9 对应
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

// 从塔的 tags 里找出"发出类"标签名（用作光环名）
function getSourceTagName(def) {
  if (!def || !def.tags) return '光环';
  for (const id of def.tags) {
    const t = TAGS[id];
    if (t && t.cat === 'source') return t.name;
  }
  return '光环';
}