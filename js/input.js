// ============================================================
// 输入：指针 / 触摸 / 键盘 / 拖拽 / 捏合 / 点击
// ============================================================

/* ---------- 浏览器默认行为拦截 ---------- */

['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => {
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
});

document.addEventListener('dragstart', (e) => e.preventDefault());
document.addEventListener('drop',      (e) => e.preventDefault());
document.addEventListener('dragover',  (e) => e.preventDefault());

document.addEventListener('mousedown', (e) => {
  if (e.button === 1) e.preventDefault();
});

window.addEventListener('wheel', (e) => {
  if (e.ctrlKey || e.metaKey) e.preventDefault();
}, { passive: false });

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && ['+','-','=','0'].includes(e.key)) {
    e.preventDefault();
  }
  if ((e.ctrlKey || e.metaKey) && ['a','s','p'].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});

document.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

let _lastCanvasTouchEnd = 0;
canvas.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - _lastCanvasTouchEnd <= 320) {
    e.preventDefault();
  }
  _lastCanvasTouchEnd = now;
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  if (e.target === canvas) e.preventDefault();
}, { passive: false });

document.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch' && e.isPrimary === false) {
    e.preventDefault();
  }
}, { passive: false });

/* ---------- 全局指针移动 / 抬起（拖拽手牌、捏合） ---------- */

document.addEventListener('pointermove', (e) => {
  if (activePointers.has(e.pointerId)) {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }
  if (pinchState.active) {
    updatePinch();
    return;
  }
  if (!dragState.active) return;
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
  if (!dragState.moved && Math.hypot(dx, dy) > 5) dragState.moved = true;

  const sellRect = sellHandBtn.getBoundingClientRect();
  const overSell = (
    e.clientX >= sellRect.left && e.clientX <= sellRect.right &&
    e.clientY >= sellRect.top && e.clientY <= sellRect.bottom
  );
  dragState.overSellBtn = overSell;
  if (overSell) {
    sellHandBtn.classList.add('btn-dragover');
  } else {
    sellHandBtn.classList.remove('btn-dragover');
  }

  const rect = canvas.getBoundingClientRect();
  state.mouseX = e.clientX - rect.left;
  state.mouseY = e.clientY - rect.top;
  if (state.mouseX >= 0 && state.mouseX <= W &&
      state.mouseY >= 0 && state.mouseY <= H &&
      !overSell) {
    const [wx, wy] = screenToWorld(state.mouseX, state.mouseY);
    state.hoveredUnit = getUnitAtWorld(wx, wy);
  } else {
    state.hoveredUnit = null;
  }
  if (!overSell) canvas.style.cursor = 'grabbing';
  else canvas.style.cursor = 'default';
});

document.addEventListener('pointerup', (e) => {
  activePointers.delete(e.pointerId);

  if (pinchState.active) {
    if (activePointers.size < 2) exitPinch();
    return;
  }

  if (!dragState.active) return;
  const moved = dragState.moved;
  const handIdx = dragState.handIndex;
  const wasOverSell = dragState.overSellBtn;
  dragState.active = false;
  dragState.handIndex = -1;
  dragState.moved = false;
  dragState.overSellBtn = false;
  sellHandBtn.classList.remove('btn-dragover');
  sellHandBtn.classList.remove('btn-drop-target');

  if (!state.running || state.gameOver || state.paused) {
    state.selectedHand = -1;
    state.hoveredUnit = null;
    renderHand();
    updateHUD();
    return;
  }

  if (wasOverSell) {
    sellHandCard(handIdx);
  } else if (moved) {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    if (sx >= 0 && sx <= W && sy >= 0 && sy <= H) {
      handleDragDrop(sx, sy, handIdx);
    } else {
      // 拖到画布外：视为放弃
      state.selectedHand = -1;
      renderHand();
    }
  } else {
    state.selectedHand = -1;
    renderHand();
  }

  state.hoveredUnit = null;
  updateHUD();
  if (state.dragMode) canvas.style.cursor = 'grab';
});

document.addEventListener('pointercancel', (e) => {
  activePointers.delete(e.pointerId);
  if (pinchState.active && activePointers.size < 2) {
    exitPinch();
  }
  if (dragState.active) {
    dragState.active = false;
    dragState.handIndex = -1;
    dragState.moved = false;
    dragState.overSellBtn = false;
    sellHandBtn.classList.remove('btn-dragover');
    sellHandBtn.classList.remove('btn-drop-target');
    state.selectedHand = -1;
    state.hoveredUnit = null;
    renderHand();
    updateHUD();
  }
});

function handleDragDrop(sx, sy, handIdx) {
  if (handIdx < 0 || handIdx >= state.hand.length) return;
  const card = state.hand[handIdx];
  const handKey = card.key;
  const [wx, wy] = screenToWorld(sx, sy);

  const clickedUnit = getUnitAtWorld(wx, wy);
  if (clickedUnit) {
    const ok = synthesizeWithHand(clickedUnit, handKey, card.cost);
    if (ok) {
      state.hand.splice(handIdx, 1);
      state.selectedHand = -1;
    } else {
      // ★ 合成失败：保留选中，玩家可继续尝试或换牌
      state.selectedHand = handIdx;
    }
    renderHand();
    return;
  }
  if (tryPlace(wx, wy)) {
    placeUnit(handKey, wx, wy, card.cost);
    state.hand.splice(handIdx, 1);
    state.selectedHand = -1;
    renderHand();
  } else {
    flashMessage('无法放置', '#ff5a5a');
    // ★ 放置失败：保留选中
    state.selectedHand = handIdx;
    renderHand();
  }
}

/* ---------- 捏合 ---------- */

function enterPinch() {
  const pts = [...activePointers.values()];
  if (pts.length < 2) return;
  const p1 = pts[0], p2 = pts[1];
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const cx = (p1.x + p2.x) / 2;
  const cy = (p1.y + p2.y) / 2;
  const rect = canvas.getBoundingClientRect();
  const sx = cx - rect.left;
  const sy = cy - rect.top;
  const [wx, wy] = screenToWorld(sx, sy);

  pinchState.active = true;
  pinchState.startDist = Math.max(dist, 1);
  pinchState.startZoom = camera.zoom;
  pinchState.worldCenterX = wx;
  pinchState.worldCenterY = wy;

  pointerDown = false;
  hasDragged = false;
  activeButton = -1;

  if (dragState.active) {
    dragState.active = false;
    dragState.handIndex = -1;
    dragState.moved = false;
    dragState.overSellBtn = false;
    sellHandBtn.classList.remove('btn-dragover');
    sellHandBtn.classList.remove('btn-drop-target');
    state.selectedHand = -1;
    state.hoveredUnit = null;
    renderHand();
  }

  canvas.style.cursor = 'grabbing';
}

function updatePinch() {
  if (!pinchState.active) return;
  const pts = [...activePointers.values()];
  if (pts.length < 2) return;
  const p1 = pts[0], p2 = pts[1];
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const cx = (p1.x + p2.x) / 2;
  const cy = (p1.y + p2.y) / 2;
  const rect = canvas.getBoundingClientRect();
  const sx = cx - rect.left;
  const sy = cy - rect.top;

  const ratio = dist / pinchState.startDist;
  const newZoom = clamp(pinchState.startZoom * ratio,
                        camera.fitZoom * 0.3, camera.fitZoom * 4);
  camera.zoom = newZoom;
  camera.x = pinchState.worldCenterX - (sx - W / 2) / newZoom;
  camera.y = pinchState.worldCenterY - (sy - H / 2) / newZoom;
  updateZoomDisplay();
}

function exitPinch() {
  pinchState.active = false;
  canvas.style.cursor = 'grab';
}

/* ---------- Canvas 指针事件：平移 + 缩放 + 点击 ---------- */

canvas.addEventListener('pointerdown', (e) => {
  if (state.paused || state.gameOver || !state.running || state.rolling) return;
  if (dragState.active) return;

  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (activePointers.size === 2) {
    enterPinch();
    return;
  }
  if (activePointers.size > 2) return;

  if (e.button === 1) e.preventDefault();
  pointerDown = true;
  activeButton = e.button;
  pointerStartX = e.clientX;
  pointerStartY = e.clientY;
  panStartCamX = camera.x;
  panStartCamY = camera.y;
  hasDragged = false;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
});

canvas.addEventListener('pointermove', (e) => {
  if (activePointers.has(e.pointerId)) {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }
  if (pinchState.active) {
    updatePinch();
    return;
  }
  if (dragState.active) return;
  const rect = canvas.getBoundingClientRect();
  state.mouseX = e.clientX - rect.left;
  state.mouseY = e.clientY - rect.top;

  if (pointerDown && !state.paused) {
    const dx = e.clientX - pointerStartX;
    const dy = e.clientY - pointerStartY;
    if (!hasDragged && Math.hypot(dx, dy) > 5) hasDragged = true;
    if (hasDragged) {
      camera.x = panStartCamX - dx / camera.zoom;
      camera.y = panStartCamY - dy / camera.zoom;
      hideContextMenu();
      state.selectedUnit = null;
      state.selectedEnemy = null;
      state.selectedCore = false;
    }
  }

  const [wx, wy] = screenToWorld(state.mouseX, state.mouseY);
  state.hoveredUnit = getUnitAtWorld(wx, wy);

  if (state.paused || state.gameOver || !state.running) {
    canvas.style.cursor = 'default';
    return;
  }
  if (hasDragged) canvas.style.cursor = 'grabbing';
  else if (state.selectedHand >= 0) canvas.style.cursor = 'crosshair';
  else if (state.hoveredUnit) canvas.style.cursor = 'pointer';
  else {
    const hoverE = getEnemyAtWorld(wx, wy);
    const hoverCore = !hoverE && getCoreAtWorld(wx, wy);
    canvas.style.cursor = (hoverE || hoverCore) ? 'pointer' : 'grab';
  }
});

canvas.addEventListener('pointerup', (e) => {
  activePointers.delete(e.pointerId);

  const wasPointerDown = pointerDown;
  const wasHasDragged = hasDragged;
  const wasActiveButton = activeButton;
  pointerDown = false;
  hasDragged = false;
  activeButton = -1;
  try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}

  if (pinchState.active) {
    if (activePointers.size < 2) exitPinch();
    return;
  }

  if (dragState.active) return;

  if (!wasPointerDown) return;
  if (!wasHasDragged && !state.paused && !state.gameOver && state.running) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleClick(x, y, wasActiveButton);
  }
});

canvas.addEventListener('pointercancel', (e) => {
  activePointers.delete(e.pointerId);
  if (pinchState.active && activePointers.size < 2) {
    exitPinch();
  }
  pointerDown = false;
  hasDragged = false;
  activeButton = -1;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (state.paused || state.gameOver || !state.running || state.rolling) return;
  if (pinchState.active) return;
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  const before = screenToWorld(sx, sy);
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  camera.zoom = clamp(camera.zoom * factor,
                      camera.fitZoom * 0.3,
                      camera.fitZoom * 4);
  const after = screenToWorld(sx, sy);
  camera.x += before[0] - after[0];
  camera.y += before[1] - after[1];
  updateZoomDisplay();
}, { passive: false });

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

/* ---------- 点击处理 ---------- */

function handleClick(sx, sy, button) {
  if (!state.running || state.gameOver || state.paused || state.rolling) return;

  if (bulkSellMode && button === 0) {
    bulkSellMode = false;
    bulkSellSet.clear();
    renderHand();
    updateSellBtn();
    return;
  }

  const [wx, wy] = screenToWorld(sx, sy);
  const clickedUnit = getUnitAtWorld(wx, wy);
  const clickedCore = !clickedUnit && getCoreAtWorld(wx, wy);
  const clickedEnemy = (!clickedUnit && !clickedCore) ? getEnemyAtWorld(wx, wy) : null;

  if (button === 2) {
    if (clickedUnit) {
      sellUnit(clickedUnit);
      state.selectedUnit = null;
      state.selectedEnemy = null;
      state.selectedCore = false;
      hideContextMenu();
    }
    return;
  }
  if (button !== 0) return;

  if (state.selectedHand >= 0) {
    const card = state.hand[state.selectedHand];
    const handKey = card.key;
    if (clickedUnit) {
      const ok = synthesizeWithHand(clickedUnit, handKey, card.cost);
      if (ok) {
        state.hand.splice(state.selectedHand, 1);
        state.selectedHand = -1;
        renderHand();
        updateHUD();
      } else {
        // ★ 合成失败：保留选中，方便重试或换牌
        renderHand();
        updateHUD();
      }
      return;
    }
    if (tryPlace(wx, wy)) {
      placeUnit(handKey, wx, wy, card.cost);
      state.hand.splice(state.selectedHand, 1);
      state.selectedHand = -1;
      renderHand();
      updateHUD();
    } else {
      flashMessage('无法放置', '#ff5a5a');
      // ★ 放置失败：保留选中
      renderHand();
      updateHUD();
    }
    return;
  }

  if (clickedUnit) {
    if (state.selectedUnit === clickedUnit) {
      state.selectedUnit = null;
      hideContextMenu();
    } else {
      state.selectedUnit = clickedUnit;
      state.selectedEnemy = null;
      state.selectedCore = false;
      menuTargetRef = null;
      menuCacheKey = '';
      buildUnitMenu(clickedUnit);
      menuEl.classList.remove('hidden');
      updateMenuPosition();
    }
    return;
  }

  if (clickedCore) {
    if (state.selectedCore) {
      state.selectedCore = false;
      hideContextMenu();
    } else {
      state.selectedUnit = null;
      state.selectedEnemy = null;
      state.selectedCore = true;
      menuTargetRef = null;
      menuCacheKey = '';
      buildCoreMenu();
      menuEl.classList.remove('hidden');
      updateMenuPosition();
    }
    return;
  }

  if (clickedEnemy) {
    if (state.selectedEnemy === clickedEnemy) {
      state.selectedEnemy = null;
      hideContextMenu();
    } else {
      state.selectedUnit = null;
      state.selectedCore = false;
      state.selectedEnemy = clickedEnemy;
      menuTargetRef = null;
      menuCacheKey = '';
      buildEnemyMenu(clickedEnemy);
      menuEl.classList.remove('hidden');
      updateMenuPosition();
    }
    return;
  }

  state.selectedUnit = null;
  state.selectedEnemy = null;
  state.selectedCore = false;
  hideContextMenu();
}

/* ---------- 按钮绑定 ---------- */

document.getElementById('rollBtn').onclick = roll;
document.getElementById('buyLimitBtn').onclick = buyUnitLimit;
document.getElementById('restartBtn').onclick = () => reset();
document.getElementById('zoomInBtn').onclick = () => {
  if (state.paused || state.rolling) return;
  camera.zoom = clamp(camera.zoom * 1.25, camera.fitZoom * 0.3, camera.fitZoom * 4);
  updateZoomDisplay();
};
document.getElementById('zoomOutBtn').onclick = () => {
  if (state.paused || state.rolling) return;
  camera.zoom = clamp(camera.zoom / 1.25, camera.fitZoom * 0.3, camera.fitZoom * 4);
  updateZoomDisplay();
};
document.getElementById('resetViewBtn').onclick = () => {
  if (state.paused || state.rolling) return;
  resetCamera();
};

/* ---------- 键盘 ---------- */

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (state.settingsOpen) {
    if (e.code === 'Escape') {
      e.preventDefault();
      closeSettings();
    }
    return;
  }

  if (state.rolling) return;

  if (e.code === 'Escape' && bulkSellMode) {
    e.preventDefault();
    bulkSellMode = false;
    bulkSellSet.clear();
    renderHand();
    updateSellBtn();
    return;
  }

  if (e.code === 'Space') {
    e.preventDefault();
    togglePause();
    return;
  }

  if (state.paused) return;

  if (e.code === 'Digit1') setSpeed(1);
  else if (e.code === 'Digit2') setSpeed(2);
  else if (e.code === 'Digit3') setSpeed(4);
});

/* ---------- 兜底：窗口失焦时清理所有指针/拖拽状态 ---------- */
window.addEventListener('blur', () => {
  activePointers.clear();
  pinchState.active = false;
  dragState.active = false;
  dragState.handIndex = -1;
  dragState.moved = false;
  dragState.overSellBtn = false;
  pointerDown = false;
  hasDragged = false;
  activeButton = -1;
  canvas.style.cursor = 'default';
});