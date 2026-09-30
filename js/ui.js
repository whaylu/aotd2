// ============================================================
// UI：HUD / 手牌 / 上下文菜单 / 设置面板 / 游戏结束
// ============================================================

const menuEl = document.getElementById('contextMenu');
let menuTargetRef = null;
let menuCacheKey = '';

function hideContextMenu() {
  menuEl.classList.add('hidden');
  menuTargetRef = null;
  menuCacheKey = '';
  state.selectedCore = false;
}

function hpClass(pct) {
  return pct > 0.25 ? 'hpval' : 'hpval low';
}

// 生成塔的攻击机制说明（行数组，可能为空）
function describeBulletMechanics(def) {
  const lines = [];
  const mode = def.bulletMode || 'single';
  switch (mode) {
    case 'splash':
      lines.push(`机制：溅射 · 半径 ${def.splashRadius || 70} · 溅射伤害 ${Math.round((def.splashRatio || 0.5) * 100)}%`);
      break;
    case 'pierce':
      lines.push(`机制：穿透 · 贯穿直线上的所有敌人`);
      break;
    case 'chain':
      lines.push(`机制：连锁 · 弹射 ${def.chainCount || 2} 次 · 每次伤害 ×0.7`);
      break;
    case 'burst':
      lines.push(`机制：多发 · 同时攻击 ${def.burstCount || 2} 个目标`);
      break;
    case 'knockback':
      lines.push(`机制：击退 · 命中后推远 ${def.knockbackDist || 80}`);
      break;
  }
  if (def.bulletEffect) {
    const d = DOTS[def.bulletEffect];
    if (d) lines.push(`附加：${d.name} · 每秒 ${Math.round(d.dpsRatio * 100)}% 攻击力 · ${d.duration}s`);
  }
  if (def.reflect) {
    lines.push(`反伤：被攻击时反弹 ${Math.round(def.reflect * 100)}%`);
  }
  return lines;
}

// 生成光环塔的效果说明（单行字符串）
function describeAura(aura) {
  if (!aura) return '';
  const tgt = aura.target === 'enemy' ? '敌人' : '附近塔';
  let effectDesc = '';
  if (aura.type === 'damage')        effectDesc = `${tgt}伤害 +${Math.round(aura.value * 100)}%`;
  else if (aura.type === 'range')    effectDesc = `${tgt}射程 +${Math.round(aura.value * 100)}%`;
  else if (aura.type === 'cooldown') effectDesc = `${tgt}冷却 ${Math.round(aura.value * 100)}%`;
  else if (aura.type === 'shield')   effectDesc = `${tgt}受到伤害 -${Math.round(aura.value * 100)}%`;
  else if (aura.dotKind) {
    const d = DOTS[aura.dotKind];
    effectDesc = `${tgt}持续 ${d ? d.name : aura.dotKind}`;
  }
  return `光环：${aura.name || '光环'} · 半径 ${aura.radius}\n${effectDesc}`;
}

// 生成塔的标签列表
function getUnitTags(unit) {
  if (unit.isIntermediate) return [];
  const def = DEFS[unit.key];
  if (!def) return [];

  const out = [];

  // 1) 元素自身标签（self 类，蓝色）
  for (const id of (def.tags || [])) {
    const t = TAGS[id];
    if (t) out.push({ label: t.name, cat: t.cat, desc: t.desc });
  }

  // 2) 塔发出的光环（source 类，金色）
  if (def.aura) {
    const a = def.aura;
    const tgt = a.target === 'enemy' ? '敌人' : '附近塔';
    let effectDesc = '';
    if (a.type === 'damage') effectDesc = `${tgt}伤害 +${Math.round(a.value * 100)}%`;
    else if (a.type === 'range') effectDesc = `${tgt}射程 +${Math.round(a.value * 100)}%`;
    else if (a.type === 'cooldown') effectDesc = `${tgt}冷却 ${Math.round(a.value * 100)}%`;
    else if (a.type === 'shield') effectDesc = `${tgt}受到伤害 -${Math.round(a.value * 100)}%`;
    else if (a.type === 'dot') {
      const d = DOTS[a.dotKind];
      effectDesc = `${tgt}持续 ${d ? d.name : a.dotKind}`;
    }
    out.push({
      label: a.name || '光环',
      cat: 'source',
      desc: `发出光环 · 半径 ${a.radius}\n${effectDesc}`,
    });
  }

  // 3) 塔发出的全局效果（source 类，金色）
  if (def.global) {
    out.push({
      label: def.globalName || def.global,
      cat: 'source',
      desc: `发出全局效果 · 影响全场\n（无需范围，全场生效）`,
    });
  }

  // 4) 接收到的塔-塔光环（target 类，绿色）
  if (unit.receivedAuras) {
    for (const [type, info] of Object.entries(unit.receivedAuras)) {
      const sources = [...new Set(info.sources)];
      const pct = Math.round(info.value * 100);
      let effectDesc = '';
      if (type === 'damage') effectDesc = `伤害 +${pct}%`;
      else if (type === 'range') effectDesc = `射程 +${pct}%`;
      else if (type === 'cooldown') effectDesc = `冷却 ${pct}%`;
      else if (type === 'shield') effectDesc = `受到伤害 -${pct}%`;
      out.push({
        label: info.name,
        cat: 'target',
        desc: `接收光环 · ${info.name}\n${effectDesc}\n来源：${sources.join('、')}`,
      });
    }
  }

  return out;
}

function renderEffectTags(container, tags) {
  container.innerHTML = '';
  if (tags.length === 0) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');
  for (const t of tags) {
    const el = document.createElement('span');
    el.className = 'eff-tag cat-' + t.cat;
    el.textContent = t.label;
    el.setAttribute('data-tip', t.desc);
    container.appendChild(el);
  }
}

function buildUnitMenu(unit) {
  const def = DEFS[unit.key];
  menuEl.querySelector('.context-title').innerHTML =
    `${def.name} <span class="sym">${def.symbol}</span>`;

  const infoEl = menuEl.querySelector('.context-info');
  const hpPct = unit.hp / unit.maxHp;
  const hpLine = `血量 <span class="${hpClass(hpPct)}">${Math.max(0, Math.ceil(unit.hp))}</span> / <span class="val">${unit.maxHp}</span>`;
  const atomCount = unit.atoms.length;
  const cost = unit.cost || 0;
  const sellValue = sellValueOfCost(cost);
  const atomLine = `原子 <span class="val">${atomCount}</span> · 投入 <span class="val">${cost}</span> 金 · 售价 <span class="val">${sellValue}</span> 金`;

  const lines = [];

  if (unit.isIntermediate) {
    lines.push('过渡态 · 无法攻击 · 可继续合成');
  } else if (def.attack === 'aura') {
    const desc = describeAura(def.aura);
    if (desc) lines.push(desc);
    if (def.reflect) lines.push(`反伤：被攻击时反弹 ${Math.round(def.reflect * 100)}%`);
  } else if (def.attack === 'global') {
    lines.push(`全局效果：${def.globalName || def.global}（全场生效）`);
  } else if (def.attack === 'economy') {
    lines.push(`经济：每 ${def.economy.interval} 秒产出 <span class="val">+${def.economy.gold}</span> 金`);
  } else {
    lines.push(`攻击 <span class="val">${unit.atk.toFixed(1)}</span> · 射程 <span class="val">${Math.floor(unit.range)}</span> · CD <span class="val">${unit.cd.toFixed(1)}s</span>`);
    for (const l of describeBulletMechanics(def)) lines.push(l);
  }

  lines.push(hpLine);
  lines.push(atomLine);
  infoEl.innerHTML = lines.join('\n');

  const effectsEl = menuEl.querySelector('.context-effects');
  renderEffectTags(effectsEl, getUnitTags(unit));

  const sellBtn = menuEl.querySelector('.context-btn.sell');
  sellBtn.classList.remove('hidden');
  sellBtn.textContent = `出售 +${sellValue} 金`;
  sellBtn.onclick = (e) => {
    e.stopPropagation();
    sellUnit(unit);
    state.selectedUnit = null;
    hideContextMenu();
  };
}

function buildEnemyMenu(enemy) {
  const t = ENEMY_TYPES[enemy.type];
  menuEl.querySelector('.context-title').innerHTML =
    `${t.name} <span class="enemy-tag">敌方</span>`;

  const infoEl = menuEl.querySelector('.context-info');
  const hpPct = enemy.hp / enemy.maxHp;
  infoEl.innerHTML =
    `攻击 <span class="val">${Math.floor(enemy.damage)}</span> · 速度 <span class="val">${Math.floor(enemy.speed)}</span> · CD <span class="val">${enemy.attackInterval.toFixed(1)}s</span>\n` +
    `血量 <span class="${hpClass(hpPct)}">${Math.max(0, Math.ceil(enemy.hp))}</span> / <span class="val">${Math.ceil(enemy.maxHp)}</span>\n` +
    `击杀奖励：分数 <span class="val">${enemy.score}</span> · 金币 <span class="val">${enemy.gold}</span>`;

  const effectsEl = menuEl.querySelector('.context-effects');
  const tags = [];
  if (enemy.dots) {
    for (const [kind, d] of Object.entries(enemy.dots)) {
      const dotDef = DOTS[kind];
      if (!dotDef) continue;
      tags.push({
        label: dotDef.name,
        cat: 'target',
        desc: `状态 · ${dotDef.name}\n当前 ${Math.round(d.dps)}/s · 剩余 ${d.timer.toFixed(1)}s`,
      });
    }
  }
  renderEffectTags(effectsEl, tags);

  menuEl.querySelector('.context-btn.sell').classList.add('hidden');
}

function buildCoreMenu() {
  menuEl.querySelector('.context-title').innerHTML =
    `反应核心 <span class="core-tag">核心</span>`;

  const infoEl = menuEl.querySelector('.context-info');
  const hpPct = state.coreHp / state.coreMaxHp;
  const coreHpCls = hpPct > 0.5 ? 'corehp' : (hpPct > 0.25 ? 'corehp' : 'corehp low');
  const m = Math.floor(state.time / 60);
  const s = Math.floor(state.time % 60);
  const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  let info =
    `血量 <span class="${coreHpCls}">${Math.max(0, Math.ceil(state.coreHp))}</span> / <span class="val">${state.coreMaxHp}</span>\n` +
    `当前阶段 <span class="val">${state.stage}</span> · 存活 <span class="val">${timeStr}</span>\n` +
    `当前分数 <span class="val">${state.score}</span>`;

  if (state.hasCombustion) info += '\n已激活全局效果：助燃';

  infoEl.innerHTML = info;
  menuEl.querySelector('.context-effects').classList.add('hidden');
  menuEl.querySelector('.context-btn.sell').classList.add('hidden');
}

function refreshMenuContent() {
  if (menuEl.classList.contains('hidden')) {
    menuTargetRef = null;
    menuCacheKey = '';
    return;
  }

  if (state.selectedCore) {
    const key = `C|${Math.ceil(state.coreHp)}|${state.stage}|${Math.floor(state.time)}|${state.score}|${state.hasCombustion}`;
    if (menuTargetRef === 'CORE' && menuCacheKey === key) return;
    menuTargetRef = 'CORE';
    menuCacheKey = key;
    buildCoreMenu();
    return;
  }

  let target = null, isEnemy = false;
  if (state.selectedUnit && state.units.includes(state.selectedUnit)) {
    target = state.selectedUnit;
  } else if (state.selectedEnemy && state.enemies.includes(state.selectedEnemy)) {
    target = state.selectedEnemy;
    isEnemy = true;
  } else {
    hideContextMenu();
    return;
  }

  const hp = Math.max(0, Math.ceil(target.hp));
  const auraKey = target.receivedAuras
    ? Object.entries(target.receivedAuras)
        .map(([t, i]) => `${t}:${Math.round(i.value * 100)}:${i.sources.join(',')}`)
        .sort().join('|')
    : '';
  const dotKey = isEnemy && target.dots
    ? Object.entries(target.dots)
        .map(([k, d]) => `${k}:${Math.round(d.dps)}:${d.timer.toFixed(1)}`)
        .sort().join('|')
    : '';
  const key = isEnemy
    ? `E|${hp}|${target.attacking}|${dotKey}`
    : `U|${hp}|${target.atk.toFixed(1)}|${Math.floor(target.range)}|${target.cd.toFixed(1)}|${auraKey}`;

  if (menuTargetRef === target && menuCacheKey === key) return;
  menuTargetRef = target;
  menuCacheKey = key;

  if (isEnemy) buildEnemyMenu(target);
  else buildUnitMenu(target);
}

function updateMenuPosition() {
  if (menuEl.classList.contains('hidden')) return;

  let targetX = 0, targetY = 0, radius = WORLD.CORE_RADIUS;
  if (state.selectedCore) {
    targetX = 0; targetY = 0; radius = WORLD.CORE_RADIUS;
  } else {
    let target = null;
    if (state.selectedUnit) target = state.selectedUnit;
    else if (state.selectedEnemy) target = state.selectedEnemy;
    if (!target) { hideContextMenu(); return; }
    targetX = target.x;
    targetY = target.y;
    radius = target.radius;
  }

  const [sx, sy] = worldToScreen(targetX, targetY);
  const menuWidth = menuEl.offsetWidth || 240;
  const menuHeight = menuEl.offsetHeight || 200;
  const screenRadius = radius * camera.zoom;
  let mx = sx + screenRadius + 14;
  let my = sy - menuHeight / 2;
  if (mx + menuWidth > window.innerWidth - 12) mx = sx - screenRadius - menuWidth - 14;
  if (mx < 12) mx = 12;
  if (my < 12) my = 12;
  if (my + menuHeight > window.innerHeight - 12) my = window.innerHeight - menuHeight - 12;
  menuEl.style.left = mx + 'px';
  menuEl.style.top = my + 'px';
}

function updateHUD() {
  document.getElementById('goldDisplay').textContent = Math.floor(state.gold);
  document.getElementById('hpDisplay').textContent = Math.max(0, Math.floor(state.coreHp));
  document.getElementById('scoreDisplay').textContent = state.score;
  document.getElementById('killDisplay').textContent = state.kills;
  const m = Math.floor(state.time / 60);
  const s = Math.floor(state.time % 60);
  document.getElementById('timeDisplay').textContent =
    `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  document.getElementById('unitDisplay').textContent =
    `${state.units.length}/${state.unitLimit}`;
  document.getElementById('stageDisplay').textContent = state.stage;
  document.getElementById('enemyDisplay').textContent = state.enemies.length;

  const rollBtn = document.getElementById('rollBtn');
  rollBtn.textContent = `抽卡 · ${state.rollCost}金`;
  rollBtn.disabled = state.gold < state.rollCost || state.gameOver || state.paused || state.rolling;
  if (state.rolling) rollBtn.classList.add('spinning');
  else rollBtn.classList.remove('spinning');

  const buyBtn = document.getElementById('buyLimitBtn');
  buyBtn.textContent = `增员 · ${state.unitLimitCost}金`;
  buyBtn.disabled = state.gold < state.unitLimitCost || state.gameOver || state.paused || state.rolling;

  updateSellBtn();
}

function renderHand() {
  const container = document.getElementById('hand');
  container.innerHTML = '';

  if (bulkSellMode) {
    for (const idx of [...bulkSellSet]) {
      if (idx >= state.hand.length) bulkSellSet.delete(idx);
    }
  }

  for (let i = 0; i < state.hand.length; i++) {
    const card = state.hand[i];
    const key = card.key;
    const def = DEFS[key];
    // ★ 防御：跳过无效 key，避免整个手牌 UI 崩溃
    if (!def) {
      console.warn('[renderHand] 跳过未知 key:', key);
      continue;
    }
    const slot = document.createElement('div');
    slot.className = 'hand-slot';

    if (bulkSellMode) {
      if (bulkSellSet.has(i)) slot.classList.add('bulk-selected');
    } else {
      if (i === state.selectedHand) slot.classList.add('selected');
    }

    if (freshHandIndices.has(i)) slot.classList.add('fresh');

    if (state.dragMode && !bulkSellMode) slot.classList.add('drag-mode');
    slot.textContent = def.symbol;
    slot.style.background = def.color;
    slot.style.color = def.tier === 0 ? '#111' : '#fff';
    slot.style.textShadow = def.tier === 0 ? 'none' : '0 1px 3px rgba(0,0,0,0.6)';

    slot.addEventListener('click', (e) => {
      if (state.paused || state.gameOver || !state.running || state.rolling) return;

      if (bulkSellMode) {
        if (bulkSellSet.has(i)) bulkSellSet.delete(i);
        else bulkSellSet.add(i);
        renderHand();
        updateSellBtn();
        return;
      }

      if (state.dragMode) return;
      state.selectedHand = (state.selectedHand === i) ? -1 : i;
      if (state.selectedHand >= 0) {
        state.selectedUnit = null;
        state.selectedEnemy = null;
        state.selectedCore = false;
        hideContextMenu();
      }
      renderHand();
      updateSellBtn();
    });

    slot.addEventListener('pointerdown', (e) => {
      if (state.paused || state.gameOver || !state.running || state.rolling) return;
      if (bulkSellMode) return;
      if (!state.dragMode) return;
      if (e.button !== 0) return;
      if (activePointers.size >= 2) return;
      e.preventDefault();
      e.stopPropagation();
      try { slot.setPointerCapture(e.pointerId); } catch (err) {}
      dragState.active = true;
      dragState.handIndex = i;
      dragState.startX = e.clientX;
      dragState.startY = e.clientY;
      dragState.moved = false;
      dragState.overSellBtn = false;
      state.selectedHand = i;
      state.selectedUnit = null;
      state.selectedEnemy = null;
      state.selectedCore = false;
      hideContextMenu();
      renderHand();
      updateSellBtn();
    });

    container.appendChild(slot);
  }
  updateSellBtn();
}

const sellHandBtn = document.getElementById('sellHandBtn');
sellHandBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  handleSellBtnClick();
});

// ---------- 暂停 / 速度 ----------

function togglePause() {
  if (state.gameOver || !state.running) return;
  if (state.settingsOpen) return;
  if (state.rolling) return;
  state.paused = !state.paused;
  updatePauseUI();
  updateSellBtn();
}

function cycleSpeed() {
  if (state.paused || state.rolling) return;
  const speeds = [1, 2, 4];
  const idx = speeds.indexOf(state.speedMultiplier);
  state.speedMultiplier = speeds[(idx + 1) % speeds.length];
  updateSpeedUI();
}

function setSpeed(v) {
  if (state.paused || state.rolling) return;
  state.speedMultiplier = v;
  updateSpeedUI();
}

function updatePauseUI() {
  const overlay = document.getElementById('pauseOverlay');
  const btn = document.getElementById('pauseBtn');
  const showPauseOverlay = state.paused && !state.settingsOpen;
  if (showPauseOverlay) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
  if (state.paused) {
    btn.textContent = '▶';
    btn.classList.add('active');
    hideContextMenu();
  } else {
    btn.textContent = '⏸';
    btn.classList.remove('active');
  }
}

function updateSpeedUI() {
  const btn = document.getElementById('speedBtn');
  btn.textContent = '×' + state.speedMultiplier;
  if (state.speedMultiplier > 1) btn.classList.add('active');
  else btn.classList.remove('active');
}

// ---------- 设置面板 ----------

const settingsOverlay = document.getElementById('settingsOverlay');

function openSettings() {
  if (state.gameOver || !state.running || state.paused || state.rolling) return;
  state.settingsOpen = true;
  state.paused = true;
  settingsOverlay.classList.remove('hidden');
  hideContextMenu();
  updatePauseUI();
  updateSettingsUI();
  updateSellBtn();
}

function closeSettings() {
  state.settingsOpen = false;
  state.paused = false;
  settingsOverlay.classList.add('hidden');
  updatePauseUI();
  updateSellBtn();
}

function updateSettingsUI() {
  document.querySelectorAll('.setting-seg').forEach(seg => {
    const setting = seg.dataset.setting;
    let currentValue = null;
    if (setting === 'mode') currentValue = state.dragMode ? 'drag' : 'click';
    else if (setting === 'speedroll') currentValue = state.rollMode;
    else if (setting === 'auras') currentValue = state.showAuras ? 'on' : 'off';
    else if (setting === 'damage') currentValue = state.showDamagePopups ? 'on' : 'off';
    else if (setting === 'particles') currentValue = state.showParticles ? 'on' : 'off';
    seg.querySelectorAll('.seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === currentValue);
    });
  });
}

document.querySelectorAll('.setting-seg .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const setting = btn.parentElement.dataset.setting;
    const value = btn.dataset.value;
    if (setting === 'mode') {
      state.dragMode = value === 'drag';
      state.selectedHand = -1;
      if (bulkSellMode) {
        bulkSellMode = false;
        bulkSellSet.clear();
      }
      dragState.active = false;
      dragState.handIndex = -1;
      dragState.moved = false;
      dragState.overSellBtn = false;
      sellHandBtn.classList.remove('btn-dragover');
      sellHandBtn.classList.remove('btn-drop-target');
      renderHand();
    } else if (setting === 'speedroll') {
      state.rollMode = value;
    } else if (setting === 'auras') {
      state.showAuras = value === 'on';
    } else if (setting === 'damage') {
      state.showDamagePopups = value === 'on';
    } else if (setting === 'particles') {
      state.showParticles = value === 'on';
      if (!state.showParticles) state.particles.length = 0;
    }
    updateSettingsUI();
    updateSellBtn();
  });
});

document.getElementById('settingsBtn').onclick = openSettings;
document.getElementById('settingsCloseBtn').onclick = closeSettings;
settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) closeSettings();
});

// ---------- 游戏结束 ----------

function gameOver() {
  state.gameOver = true;
  state.running = false;
  state.paused = false;
  state.settingsOpen = false;
  bulkSellMode = false;
  bulkSellSet.clear();
  state.rolling = false;
  document.getElementById('rollOverlay').classList.add('hidden');
  settingsOverlay.classList.add('hidden');
  updatePauseUI();
  hideContextMenu();
  toastContainer.innerHTML = '';
  const m = Math.floor(state.time / 60);
  const s = Math.floor(state.time % 60);
  document.getElementById('finalScore').textContent = state.score;
  document.getElementById('finalTime').textContent =
    `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  document.getElementById('finalKills').textContent = state.kills;
  document.getElementById('finalStage').textContent = state.maxStage;
  document.getElementById('gameOver').classList.remove('hidden');
  document.querySelector('.panel').style.display = 'none';
  document.querySelector('.action-bar').style.display = 'none';
  document.querySelector('.view-controls').style.display = 'none';
}

document.addEventListener('click', (e) => {
  if (menuEl.classList.contains('hidden')) return;
  if (menuEl.contains(e.target)) return;
  if (e.target === canvas) return;
  state.selectedUnit = null;
  state.selectedEnemy = null;
  state.selectedCore = false;
  hideContextMenu();
});

document.getElementById('pauseBtn').onclick = togglePause;
document.getElementById('speedBtn').onclick = cycleSpeed;
document.getElementById('pauseOverlay').addEventListener('click', (e) => {
  e.stopPropagation();
  togglePause();
});