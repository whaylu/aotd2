// ============================================================
// 初始化 / 重置 / 主循环
// ============================================================

function reset() {
  for (const key in DEFS) {
    if (DEFS[key].isIntermediate || DEFS[key].isLattice) delete DEFS[key];
  }
  state.gold = 100;
  state.coreHp = CORE_MAX_HP;
  state.coreMaxHp = CORE_MAX_HP;
  state.units = [];
  state.enemies = [];
  state.projectiles = [];
  state.explosions = [];
  state.particles = [];
  state.popups = [];
  state.hand = [
    { key:'H', cost: BASE_HAND_COST },
    { key:'H', cost: BASE_HAND_COST },
    { key:'H', cost: BASE_HAND_COST },
  ];
  state.selectedHand = -1;
  state.selectedUnit = null;
  state.selectedEnemy = null;
  state.selectedCore = false;
  state.hoveredUnit = null;
  state.time = 0;
  state.running = true;
  state.gameOver = false;
  state.paused = false;
  state.speedMultiplier = 1;
  state.spawnTimer = 2;
  state.spawnInterval = 2.5;
  state.stage = 1;
  state.maxStage = 1;
  state.stageTimer = 0;
  state.kills = 0;
  state.score = 0;
  state.rollCost = BASE_ROLL_COST;
  state.rollsUsed = 0;
  state.unitLimit = START_UNIT_LIMIT;
  state.unitLimitCost = 60;
  state.coreHitFlash = 0;
  state.dragMode = false;
  state.showAuras = true;
  state.showDamagePopups = true;
  state.showParticles = true;
  state.settingsOpen = false;
  state.rolling = false;
  state.rollMode = 'normal';
  state.radiationBonus = 0;
  bulkSellMode = false;
  bulkSellSet.clear();
  freshHandIndices.clear();
  dragState.active = false;
  dragState.handIndex = -1;
  dragState.moved = false;
  dragState.overSellBtn = false;
  activePointers.clear();
  pinchState.active = false;
  sellHandBtn.classList.remove('btn-dragover');
  sellHandBtn.classList.remove('btn-drop-target');
  document.getElementById('rollOverlay').classList.add('hidden');
  document.getElementById('rollBox').classList.remove('done');
  settingsOverlay.classList.add('hidden');
  toastContainer.innerHTML = '';
  hideContextMenu();
  resetCamera();
  updatePauseUI();
  updateSpeedUI();
  updateSettingsUI();
  document.getElementById('gameOver').classList.add('hidden');
  document.querySelector('.panel').style.display = 'flex';
  document.querySelector('.action-bar').style.display = 'flex';
  document.querySelector('.view-controls').style.display = 'flex';
  updateHUD();
  renderHand();
}

const MAX_STEP = 1 / 60;
function stepUpdate(totalDt) {
  let remaining = totalDt;
  let safety = 0;
  while (remaining > 0.0001 && safety < 30) {
    const step = Math.min(remaining, MAX_STEP);
    update(step);
    remaining -= step;
    safety++;
  }
}

let lastTime = 0;
function loop(now) {
  if (!lastTime) lastTime = now;
  const realDt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (state.running && !state.gameOver && !state.paused && !state.rolling) {
    stepUpdate(realDt * state.speedMultiplier);
    updateHUD();
  }
  render();
  requestAnimationFrame(loop);
}

reset();
requestAnimationFrame(loop);