// ============================================================
// 单位 / 敌人 / 合成 / 抽卡 / 出售 / 主更新逻辑
// ============================================================

function createIntermediate(atoms, x, y, cost) {
  const sorted = [...atoms].sort();
  const key = 'IM:' + sorted.join('+');
  if (!DEFS[key]) {
    DEFS[key] = {
      atoms: sorted,
      name: '过渡态',
      symbol: buildIntermediateSymbol(sorted),
      color: '#5a6a7a',
      stroke: '#384858',
      atk: 0, range: 0, cd: 999,
      hp: 100 * HP_SCALE,
      tier: 1,
      isIntermediate: true,
    };
  }
  const def = DEFS[key];
  const unit = {
    id: Math.random().toString(36).slice(2),
    key, x, y,
    radius: WORLD.TOWER_BASE_R * computeSizeFactor(sorted),
    hp: def.hp, maxHp: def.hp,
    baseAtk: 0, baseRange: 0, baseCd: 999,
    atk: 0, range: 0, cd: 999,
    cdTimer: 999,
    atoms: [...sorted],
    hitFlash: 0,
    bonusDamage: 0, bonusCooldown: 0, bonusRange: 0,
    receivedAuras: {},
    isIntermediate: true,
    cost: cost || 0,
  };
  state.units.push(unit);
  flashMessage(`过渡态 ${def.symbol}`, '#a0b8d0');
  return unit;
}
function placeUnit(key, x, y, cost) {
  const def = DEFS[key];
  const isInter = !!def.unstable;
  const unit = {
    id: Math.random().toString(36).slice(2),
    key, x, y,
    radius: WORLD.TOWER_BASE_R * computeSizeFactor(def.atoms),
    hp: def.hp * HP_SCALE,
    maxHp: def.hp * HP_SCALE,
    baseAtk: isInter ? 0 : (def.atk || 0),
    baseRange: isInter ? 0 : (def.range || 0),
    baseCd: isInter ? 999 : (def.cd || 999),
    atk: isInter ? 0 : (def.atk || 0),
    range: isInter ? 0 : (def.range || 0),
    cd: isInter ? 999 : (def.cd || 999),
    cdTimer: isInter ? 999 : 0,
    atoms: [...def.atoms],
    hitFlash: 0,
    bonusDamage: 0, bonusCooldown: 0, bonusRange: 0,
    receivedAuras: {},
    isIntermediate: isInter,
    cost: cost || 0,
  };
  state.units.push(unit);
  return unit;
}
function removeUnit(u) {
  const idx = state.units.indexOf(u);
  if (idx >= 0) state.units.splice(idx, 1);
  if (state.selectedUnit === u) {
    state.selectedUnit = null;
    hideContextMenu();
  }
}
function getUnitAtWorld(wx, wy, screenPadding = 6) {
  const tol = screenPadding / camera.zoom;
  let best = null, bestD = Infinity;
  for (const u of state.units) {
    const d = Math.hypot(u.x - wx, u.y - wy);
    if (d < u.radius + tol && d < bestD) { best = u; bestD = d; }
  }
  return best;
}
function getEnemyAtWorld(wx, wy, screenPadding = 6) {
  const tol = screenPadding / camera.zoom;
  let best = null, bestD = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - wx, e.y - wy);
    if (d < e.radius + tol && d < bestD) { best = e; bestD = d; }
  }
  return best;
}
function getCoreAtWorld(wx, wy, screenPadding = 6) {
  const tol = screenPadding / camera.zoom;
  return Math.hypot(wx, wy) < WORLD.CORE_RADIUS + tol;
}
function tryPlace(wx, wy) {
  const d = Math.hypot(wx, wy);
  if (d < WORLD.PLACE_MIN_R || d > WORLD.PLACE_MAX_R) return false;
  if (state.units.length >= state.unitLimit) return false;
  for (const u of state.units) {
    if (Math.hypot(u.x - wx, u.y - wy) < u.radius + WORLD.TOWER_BASE_R * 0.7) return false;
  }
  return true;
}

function synthesizeWithHand(unit, handKey, handCost) {
  if (!unit || !handKey) return false;
  const totalCost = (unit.cost || 0) + (handCost || 0);

  for (const rx of SPECIAL_REACTIONS) {
    if ((unit.key === rx.a && handKey === rx.b) ||
        (unit.key === rx.b && handKey === rx.a)) {
      const exX = unit.x, exY = unit.y;
      triggerExplosion(exX, exY, rx.damage, rx.radius);
      flashMessage(rx.hint, '#ffaa3a');

      const unitIsKeep = unit.key === rx.keep;
      const handIsKeep = handKey === rx.keep;

      if (unitIsKeep) {
        unit.cost = totalCost;
      } else if (handIsKeep) {
        removeUnit(unit);
        placeUnit(handKey, exX, exY, totalCost);
      } else {
        removeUnit(unit);
      }
      return true;
    }
  }

  const handDef = DEFS[handKey];
  if (!handDef) return false;
  const all = [...unit.atoms, ...handDef.atoms].sort();

  // ★ 晶格化优先：同种可晶格元素持续叠加（C₂、C₃、C₄…）
  const latticeKey = ensureLatticeDef(getLatticeKey(all));
  if (latticeKey) {
    const x = unit.x, y = unit.y;
    const latDef = DEFS[latticeKey];
    removeUnit(unit);
    placeUnit(latticeKey, x, y, totalCost);
    flashMessage(`晶格 ${latDef.symbol}`, '#a0d0ff');
    return true;
  }

  const molKey = findMoleculeMatch(all);
  if (molKey) {
    const x = unit.x, y = unit.y;
    removeUnit(unit);
    placeUnit(molKey, x, y, totalCost);
    flashMessage(`合成 ${DEFS[molKey].name}`, '#6bc4ff');
    return true;
  }
  if (all.length >= 2) {
    const superKey = findSupersetMolecule(all);
    if (superKey) {
      const x = unit.x, y = unit.y;
      removeUnit(unit);
      createIntermediate(all, x, y, totalCost);
      return true;
    }
  }
  flashMessage('该组合不稳定', '#ff5a5a');
  return false;
}

// ---------- 光环 ----------

function recalcAuras() {
  for (const u of state.units) {
    u.bonusDamage = 0;
    u.bonusRange = 0;
    u.bonusCooldown = 0;
    u.receivedAuras = {};
  }
  for (const src of state.units) {
    if (src.isIntermediate) continue;
    const def = DEFS[src.key];
    if (!def || !def.aura) continue;
    if (def.aura.target !== 'tower') continue;

    const aura = def.aura;
    const auraName = getSourceTagName(def);
    for (const tgt of state.units) {
      if (tgt === src || tgt.isIntermediate) continue;
      // ★ 圆相碰判定：目标塔圆与光环圈有任何重叠即生效
      if (Math.hypot(tgt.x - src.x, tgt.y - src.y) < aura.radius + tgt.radius) {
        const type = aura.type;
        if (!tgt.receivedAuras[type]) {
          tgt.receivedAuras[type] = {
            name: auraName,
            value: aura.value,
            sources: [src.key],
          };
        } else {
          if (Math.abs(aura.value) > Math.abs(tgt.receivedAuras[type].value)) {
            tgt.receivedAuras[type].value = aura.value;
            tgt.receivedAuras[type].name = auraName;
          }
          if (!tgt.receivedAuras[type].sources.includes(src.key)) {
            tgt.receivedAuras[type].sources.push(src.key);
          }
        }
      }
    }
  }
  for (const u of state.units) {
    if (u.isIntermediate) { u.atk = 0; u.range = 0; u.cd = 999; continue; }
    const recv = u.receivedAuras || {};
    u.bonusDamage = recv.damage ? recv.damage.value : 0;
    u.bonusRange = recv.range ? recv.range.value : 0;
    u.bonusCooldown = recv.cooldown ? recv.cooldown.value : 0;
    u.atk   = u.baseAtk   * (1 + u.bonusDamage);
    u.range = u.baseRange * (1 + u.bonusRange);
    u.cd    = Math.max(0.15, u.baseCd * (1 + u.bonusCooldown));
  }
}

// ---------- 全局效果 ----------

function computeGlobalEffects() {
  state.hasCombustion = false;
  state.radiationBonus = 0;

  const globals = {};   // 按 global key 聚合

  for (const u of state.units) {
    if (u.isIntermediate) continue;
    const def = DEFS[u.key];
    if (!def) continue;

    if (def.global === 'combustion') state.hasCombustion = true;
    if (def.global === 'radiation' && def.radiationBonus) {
      state.radiationBonus += def.radiationBonus;
    }

    if (def.global) {
      if (!globals[def.global]) {
        globals[def.global] = {
          type: def.global,
          name: def.globalName || def.global,
          count: 0,
          value: 0,
        };
      }
      globals[def.global].count++;
      if (def.radiationBonus) globals[def.global].value += def.radiationBonus;
    }
  }

  state.activeGlobals = Object.values(globals);
}

// ---------- 持续伤害 ----------

function applyDot(enemy, kind, dps, duration) {
  if (!enemy.dots) enemy.dots = {};
  const cur = enemy.dots[kind];
  if (!cur || dps > cur.dps) {
    enemy.dots[kind] = {
      dps,
      timer: duration,
      tick: cur ? cur.tick : 0,
    };
  } else {
    cur.timer = duration;
  }
}

function tickDots(e, dt) {
  if (!e.dots) return;
  for (const kind of Object.keys(e.dots)) {
    const dot = e.dots[kind];
    dot.timer -= dt;
    dot.tick += dt;
    while (dot.tick >= 0.5) {
      dot.tick -= 0.5;
      const pd = dot.dps * 0.5;
      e.hp -= pd;
      showDamagePopup(e, pd, { dotKind: kind });
      if (e.hp <= 0) break;
    }
    if (dot.timer <= 0) delete e.dots[kind];
  }
}

// ---------- 抽卡 ----------

function pickWeightedKey(atomKeys) {
  let total = 0;
  for (const k of atomKeys) total += (ROLL_WEIGHTS[k] || 1);
  let r = Math.random() * total;
  for (const k of atomKeys) {
    r -= (ROLL_WEIGHTS[k] || 1);
    if (r <= 0) return k;
  }
  return atomKeys[atomKeys.length - 1];
}

function playRollAnimation(finalKey) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('rollOverlay');
    const box = document.getElementById('rollBox');
    const symEl = document.getElementById('rollSymbol');
    const labelEl = document.getElementById('rollLabel');

    if (!overlay || !box || !symEl || !labelEl || !DEFS[finalKey]) {
      console.warn('[playRollAnimation] DOM 或 finalKey 无效，跳过动画');
      resolve();
      return;
    }

    const isFast = state.rollMode === 'fast';
    const atomKeys = getUnlockedAtoms(state.stage);
    const totalSpins = isFast ? 6 : 10;
    const baseWait   = isFast ? 32 : 45;
    const tailGrowth = isFast ? 11 : 18;
    const startDelay = isFast ? 30 : 45;
    const holdMs     = isFast ? 240 : 540;
    const finalDef = DEFS[finalKey];

    overlay.classList.remove('hidden');
    box.classList.remove('done');
    labelEl.textContent = '抽取中...';
    symEl.textContent = '?';
    symEl.style.color = '#889';
    symEl.style.textShadow = '0 0 12px rgba(120,140,180,0.5)';

    let i = 0;
    const tickOnce = () => {
      if (!state.rolling) {
        overlay.classList.add('hidden');
        resolve();
        return;
      }
      if (i >= totalSpins) {
        symEl.textContent = finalDef.symbol;
        symEl.style.color = finalDef.color;
        symEl.style.textShadow = `0 0 30px ${finalDef.stroke}`;
        symEl.classList.add('tick');
        setTimeout(() => symEl.classList.remove('tick'), 80);
        box.classList.add('done');
        labelEl.textContent = '获得 ' + finalDef.name;
        setTimeout(() => {
          overlay.classList.add('hidden');
          box.classList.remove('done');
          resolve();
        }, holdMs);
        return;
      }
      const rk = pickWeightedKey(atomKeys);
      const rd = DEFS[rk] || finalDef;
      symEl.textContent = rd.symbol;
      symEl.style.color = rd.color;
      symEl.style.textShadow = `0 0 20px ${rd.stroke}`;
      symEl.classList.add('tick');
      setTimeout(() => symEl.classList.remove('tick'), 60);
      let wait = baseWait;
      const half = totalSpins * 0.5;
      if (i > half) wait = baseWait + Math.pow(i - half, 1.5) * tailGrowth;
      i++;
      setTimeout(tickOnce, wait);
    };
    setTimeout(tickOnce, startDelay);
  });
}

function addHandCard(key, cost) {
  if (!DEFS[key]) {
    console.error('[addHandCard] 未知 key:', key);
    return;
  }
  state.hand.push({ key, cost: cost || 0 });
  const idx = state.hand.length - 1;
  freshHandIndices.add(idx);
  renderHand();
  updateHUD();
  setTimeout(() => { freshHandIndices.delete(idx); }, 400);
}

async function roll() {
  if (state.gameOver || !state.running || state.paused) return;
  if (state.rolling) return;
  if (state.gold < state.rollCost) { flashMessage('金币不足', '#ff5a5a'); return; }

  const paid = state.rollCost;
  state.gold -= paid;
  showGoldPopup(-paid);

  const atomKeys = getUnlockedAtoms(state.stage);
  const key = pickWeightedKey(atomKeys);

  if (!key || !DEFS[key]) {
    console.error('[roll] 无效 key:', key, 'atomKeys:', atomKeys);
    state.gold += paid;
    updateHUD();
    return;
  }

  state.rollsUsed++;
  state.rollCost = Math.min(BASE_ROLL_COST + state.rollsUsed * 2, 60);

  if (state.rollMode === 'instant') {
    addHandCard(key, paid);
    updateHUD();
    return;
  }

  state.rolling = true;
  updateHUD();
  try {
    await playRollAnimation(key);
  } catch (e) {
    console.error('[roll] 动画抛错:', e);
  } finally {
    state.rolling = false;
    if (state.running && !state.gameOver) {
      addHandCard(key, paid);
    }
    updateHUD();
  }
}

function buyUnitLimit() {
  if (state.gameOver || !state.running || state.paused || state.rolling) return;
  if (state.gold < state.unitLimitCost) { flashMessage('金币不足', '#ff5a5a'); return; }
  state.gold -= state.unitLimitCost;
  showGoldPopup(-state.unitLimitCost);
  state.unitLimit += 1;
  state.unitLimitCost = Math.floor(state.unitLimitCost * 1.4);
  flashMessage(`单位上限 → ${state.unitLimit}`, '#c8b8ff');
  updateHUD();
}

function sellUnit(u) {
  if (state.paused || state.rolling) return;
  const value = sellValueOfCost(u.cost);
  state.gold += value;
  removeUnit(u);
  showGoldPopup(value);
  updateHUD();
}

function sellHandCard(idx) {
  if (idx < 0 || idx >= state.hand.length) return;
  const card = state.hand[idx];
  const price = sellValueOfCost(card.cost);
  state.gold += price;
  showGoldPopup(price);
  state.hand.splice(idx, 1);
  state.selectedHand = -1;
  if (bulkSellMode) {
    bulkSellMode = false;
    bulkSellSet.clear();
  }
  renderHand();
  updateHUD();
  if (state.dragMode) canvas.style.cursor = 'grab';
}

function bulkSellSelected() {
  if (bulkSellSet.size === 0) return;
  const indices = [...bulkSellSet]
    .filter(i => i >= 0 && i < state.hand.length)
    .sort((a, b) => b - a);
  if (indices.length === 0) {
    bulkSellMode = false;
    bulkSellSet.clear();
    renderHand();
    updateSellBtn();
    return;
  }
  let price = 0;
  for (const idx of indices) {
    price += sellValueOfCost(state.hand[idx].cost);
    state.hand.splice(idx, 1);
  }
  state.gold += price;
  showGoldPopup(price);
  bulkSellMode = false;
  bulkSellSet.clear();
  renderHand();
  updateHUD();
}

function handleSellBtnClick() {
  if (state.paused || state.gameOver || !state.running || state.rolling) return;
  if (bulkSellMode) {
    if (bulkSellSet.size === 0) {
      bulkSellMode = false;
      renderHand();
      updateSellBtn();
      return;
    }
    bulkSellSelected();
    return;
  }
  if (!state.dragMode && state.selectedHand >= 0) {
    sellHandCard(state.selectedHand);
    return;
  }
  if (state.hand.length === 0) return;
  bulkSellMode = true;
  bulkSellSet.clear();
  state.selectedUnit = null;
  state.selectedEnemy = null;
  state.selectedCore = false;
  hideContextMenu();
  renderHand();
  updateSellBtn();
}

function updateSellBtn() {
  const btn = document.getElementById('sellHandBtn');
  if (!btn) return;

  const noHands = state.hand.length === 0;
  const busy = state.gameOver || !state.running || state.paused || state.rolling;

  if (bulkSellMode) {
    const n = bulkSellSet.size;
    btn.textContent = n > 0 ? `卖 ${n}` : '取消';
    btn.disabled = busy;
    btn.classList.add('bulk-mode');
    btn.classList.remove('btn-drop-target');
    btn.classList.remove('btn-dragover');
    return;
  }
  if (state.dragMode) {
    btn.textContent = '卖';
    btn.disabled = busy || noHands;
    btn.classList.remove('bulk-mode');
    if (dragState.active && !busy && !noHands) {
      btn.classList.add('btn-drop-target');
    } else {
      btn.classList.remove('btn-drop-target');
    }
    return;
  }
  btn.classList.remove('btn-drop-target');
  btn.classList.remove('bulk-mode');
  if (state.selectedHand >= 0) {
    const card = state.hand[state.selectedHand];
    const price = card ? sellValueOfCost(card.cost) : 0;
    btn.textContent = `卖 +${price}`;
    btn.disabled = busy || noHands;
  } else {
    btn.textContent = '卖';
    btn.disabled = busy || noHands;
  }
}

function update(dt) {
  state.time += dt;
  state.stageTimer += dt;
  state.spawnTimer -= dt;
  if (state.coreHitFlash > 0) state.coreHitFlash -= dt;

  if (state.stageTimer >= state.stageDuration) {
    state.stageTimer = 0;
    state.stage++;
    state.maxStage = Math.max(state.maxStage, state.stage);
    state.spawnInterval = Math.max(0.5, 2.5 - state.stage * 0.15);
    flashMessage(`阶段 ${state.stage}`, '#c8b8ff');
  }

  if (state.spawnTimer <= 0) {
    spawnEnemy();
    state.spawnTimer = state.spawnInterval * (0.8 + Math.random() * 0.4);
  }

  computeGlobalEffects();
  updateEnemies(dt);
  recalcAuras();
  updateUnits(dt);

  for (const u of state.units) {
    if (u.isIntermediate) continue;
    const def = DEFS[u.key];
    if (!def || !def.economy) continue;
    if (u.economyTimer === undefined) u.economyTimer = def.economy.interval;
    u.economyTimer -= dt;
    if (u.economyTimer <= 0) {
      u.economyTimer = def.economy.interval;
      state.gold += def.economy.gold;
      showGoldPopup(def.economy.gold);
    }
  }

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    state.projectiles[i].life -= dt;
    if (state.projectiles[i].life <= 0) state.projectiles.splice(i, 1);
  }
  for (let i = state.explosions.length - 1; i >= 0; i--) {
    state.explosions[i].life -= dt;
    if (state.explosions[i].life <= 0) state.explosions.splice(i, 1);
  }
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.96; p.vy *= 0.96;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.popups.length - 1; i >= 0; i--) {
    const p = state.popups[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy *= 0.94;
    p.life -= dt;
    if (p.life <= 0) state.popups.splice(i, 1);
  }

  if (state.selectedEnemy && !state.enemies.includes(state.selectedEnemy)) {
    state.selectedEnemy = null;
    hideContextMenu();
  }
  if (state.selectedUnit && !state.units.includes(state.selectedUnit)) {
    state.selectedUnit = null;
    hideContextMenu();
  }

  if (state.coreHp <= 0 && !state.gameOver) {
    state.coreHp = 0;
    gameOver();
  }
}

function spawnEnemy() {
  const angle = Math.random() * Math.PI * 2;
  const x = Math.cos(angle) * WORLD.SPAWN_R;
  const y = Math.sin(angle) * WORLD.SPAWN_R;

  let type = 'basic';
  const r = Math.random();
  if (state.stage >= 3 && r < 0.30) type = 'fast';
  if (state.stage >= 5 && r > 0.78) type = 'tank';
  if (state.stage >= 8 && state.stage % 8 === 0 && Math.random() < 0.10) type = 'boss';

  const t = ENEMY_TYPES[type];
  const hpScale = 1 + (state.stage - 1) * STAGE_HP_GROWTH;
  const dmgScale = 1 + (state.stage - 1) * STAGE_DMG_GROWTH;
  const spdScale = 1 + (state.stage - 1) * STAGE_SPD_GROWTH;

  state.enemies.push({
    x, y, type,
    hp: t.hp * hpScale, maxHp: t.hp * hpScale,
    speed: t.speed * spdScale,
    damage: t.damage * dmgScale,
    radius: t.radius,
    color: t.color,
    attackInterval: t.attackInterval,
    attackTimer: 0,
    score: t.score,
    gold: t.gold,
    attacking: false,
    dots: {},
  });
}

function updateEnemies(dt) {
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;

    for (const u of state.units) {
      if (u.isIntermediate) continue;
      const def = DEFS[u.key];
      if (!def || !def.aura) continue;
      if (def.aura.target !== 'enemy') continue;
      if (!def.aura.dotKind) continue;
      const dotDef = DOTS[def.aura.dotKind];
      if (!dotDef) continue;
      const d = Math.hypot(e.x - u.x, e.y - u.y);
      // ★ 圆相碰：敌人圆与光环圈有任何重叠即生效
      if (d < def.aura.radius + e.radius) {
        applyDot(e, def.aura.dotKind, u.atk * def.aura.value, dotDef.duration);
      }
    }

    tickDots(e, dt);
    if (e.hp <= 0) continue;

    let target = null, minDist = Infinity;
    for (const u of state.units) {
      const d = Math.hypot(u.x - e.x, u.y - e.y);
      const rng = u.radius + e.radius + 12;
      if (d < rng && d < minDist) { minDist = d; target = u; }
    }

    if (target) {
      e.attacking = false;
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = e.attackInterval;

        let incoming = e.damage;
        if (target.receivedAuras && target.receivedAuras.shield) {
          incoming *= (1 - target.receivedAuras.shield.value);
        }
        target.hp -= incoming;
        target.hitFlash = 0.15;
        showDamagePopup(target, incoming);

        const tDef = DEFS[target.key];
        if (tDef && tDef.reflect) {
          const reflectDmg = incoming * tDef.reflect;
          e.hp -= reflectDmg;
          showDamagePopup(e, reflectDmg);
        }
      }
    } else {
      const d = Math.hypot(e.x, e.y);
      if (d <= WORLD.CORE_RADIUS + e.radius + 2) {
        e.attacking = true;
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackTimer = e.attackInterval;
          state.coreHp -= e.damage;
          state.coreHitFlash = 0.2;
          showCoreDamagePopup(e.damage);
          for (let i = 0; i < 6; i++) {
            const a = Math.random() * Math.PI * 2;
            addParticle({
              x: Math.cos(a) * WORLD.CORE_RADIUS,
              y: Math.sin(a) * WORLD.CORE_RADIUS,
              vx: Math.cos(a) * 120, vy: Math.sin(a) * 120,
              life: 0.4, maxLife: 0.4, color:'#ff5a5a', size: 4,
            });
          }
        }
      } else {
        e.attacking = false;
        e.x += (-e.x / d) * e.speed * dt;
        e.y += (-e.y / d) * e.speed * dt;
      }
    }
  }

  state.enemies = state.enemies.filter(e => {
    if (e.hp <= 0) {
      state.kills++;
      state.gold += e.gold;
      showGoldPopup(e.gold);
      const scoreGain = e.score * (1 + Math.floor((state.stage - 1) * 0.15));
      state.score += scoreGain;
      showScorePopup(scoreGain);
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        addParticle({
          x: e.x, y: e.y,
          vx: Math.cos(a) * 100, vy: Math.sin(a) * 100,
          life: 0.4, maxLife: 0.4, color: e.color, size: 4,
        });
      }
      return false;
    }
    return true;
  });

  state.units = state.units.filter(u => u.hp > 0);
}

function applyBulletEffect(u, def, target) {
  if (def.bulletEffect) {
    const d = DOTS[def.bulletEffect];
    if (d) applyDot(target, def.bulletEffect, u.atk * d.dpsRatio, d.duration);
  }
  if (state.hasCombustion && def.tags && def.tags.includes('flammable')) {
    const d = DOTS.burn;
    applyDot(target, 'burn', u.atk * d.dpsRatio, d.duration);
  }
}

function performAttack(u, target) {
  const def = DEFS[u.key];
  if (def.attack === 'aura' || def.attack === 'global') return;

  const mode = def.bulletMode || 'single';

  if (mode === 'pierce') {
    const dx = target.x - u.x, dy = target.y - u.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist, ny = dy / dist;
    const pierceRange = def.pierceRange || u.range;

    for (const e of state.enemies) {
      const ex = e.x - u.x, ey = e.y - u.y;
      const proj = ex * nx + ey * ny;
      if (proj < 0 || proj > pierceRange) continue;
      const perp = Math.abs(ex * ny - ey * nx);
      if (perp < e.radius + 8) {
        const { dmg, isCrit } = calcDamage(u.atk);
        e.hp -= dmg;
        showDamagePopup(e, dmg, { isCrit });
      }
    }
    state.projectiles.push({
      x1: u.x, y1: u.y,
      x2: u.x + nx * pierceRange, y2: u.y + ny * pierceRange,
      life: 0.15, maxLife: 0.15, color: def.color,
    });
    applyBulletEffect(u, def, target);
    return;
  }

  if (mode === 'chain') {
    const hitList = [target];
    let current = target;
    const chainCount = def.chainCount || 2;
    for (let i = 0; i < chainCount; i++) {
      let next = null, nd = Infinity;
      for (const e of state.enemies) {
        if (hitList.includes(e)) continue;
        const d = Math.hypot(e.x - current.x, e.y - current.y);
        if (d < 200 && d < nd) { next = e; nd = d; }
      }
      if (!next) break;
      hitList.push(next);
      current = next;
    }
    for (let i = 0; i < hitList.length; i++) {
      const e = hitList[i];
      const factor = Math.pow(0.7, i);
      const { dmg, isCrit } = calcDamage(u.atk * factor);
      e.hp -= dmg;
      showDamagePopup(e, dmg, { isCrit });
      const fromX = i === 0 ? u.x : hitList[i-1].x;
      const fromY = i === 0 ? u.y : hitList[i-1].y;
      state.projectiles.push({
        x1: fromX, y1: fromY, x2: e.x, y2: e.y,
        life: 0.14, maxLife: 0.14, color: def.color,
      });
    }
    applyBulletEffect(u, def, target);
    return;
  }

  if (mode === 'splash') {
    const { dmg, isCrit } = calcDamage(u.atk);
    target.hp -= dmg;
    showDamagePopup(target, dmg, { isCrit });

    const sr = def.splashRadius || 70;
    const ratio = def.splashRatio || 0.5;
    for (const e of state.enemies) {
      if (e === target) continue;
      if (Math.hypot(e.x - target.x, e.y - target.y) < sr) {
        const { dmg: sd, isCrit: sc } = calcDamage(u.atk * ratio);
        e.hp -= sd;
        showDamagePopup(e, sd, { isCrit: sc });
      }
    }
    state.explosions.push({
      x: target.x, y: target.y, radius: sr, maxRadius: sr,
      life: 0.28, maxLife: 0.28,
    });
    state.projectiles.push({
      x1: u.x, y1: u.y, x2: target.x, y2: target.y,
      life: 0.12, maxLife: 0.12, color: def.color,
    });
    applyBulletEffect(u, def, target);
    return;
  }

  if (mode === 'burst') {
    const count = def.burstCount || 2;
    const candidates = state.enemies
      .filter(e => Math.hypot(e.x - u.x, e.y - u.y) < u.range)
      .sort((a, b) =>
        Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y))
      .slice(0, count);
    for (const e of candidates) {
      const { dmg, isCrit } = calcDamage(u.atk);
      e.hp -= dmg;
      showDamagePopup(e, dmg, { isCrit });
      state.projectiles.push({
        x1: u.x, y1: u.y, x2: e.x, y2: e.y,
        life: 0.12, maxLife: 0.12, color: def.color,
      });
    }
    applyBulletEffect(u, def, target);
    return;
  }

  if (mode === 'knockback') {
    const { dmg, isCrit } = calcDamage(u.atk);
    target.hp -= dmg;
    showDamagePopup(target, dmg, { isCrit });

    const dx = target.x - u.x;
    const dy = target.y - u.y;
    const d = Math.hypot(dx, dy) || 1;
    const kd = def.knockbackDist || 80;
    target.x += (dx / d) * kd;
    target.y += (dy / d) * kd;

    state.projectiles.push({
      x1: u.x, y1: u.y, x2: target.x, y2: target.y,
      life: 0.12, maxLife: 0.12, color: def.color,
    });
    applyBulletEffect(u, def, target);
    return;
  }

  const { dmg, isCrit } = calcDamage(u.atk);
  target.hp -= dmg;
  showDamagePopup(target, dmg, { isCrit });
  state.projectiles.push({
    x1: u.x, y1: u.y, x2: target.x, y2: target.y,
    life: 0.12, maxLife: 0.12, color: def.color,
  });
  applyBulletEffect(u, def, target);
}

function updateUnits(dt) {
  for (const u of state.units) {
    if (u.hitFlash > 0) u.hitFlash -= dt;

    if (u.isIntermediate) continue;
    const def = DEFS[u.key];
    if (!def) continue;
    if (def.attack === 'aura' || def.attack === 'global') continue;

    u.cdTimer -= dt;

    let target = null, minDist = Infinity;
    for (const e of state.enemies) {
      const d = Math.hypot(e.x - u.x, e.y - u.y);
      if (d < u.range && d < minDist) { minDist = d; target = e; }
    }

    if (target && u.cdTimer <= 0) {
      u.cdTimer = u.cd;
      performAttack(u, target);
    }
  }
}