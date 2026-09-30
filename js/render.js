// ============================================================
// 渲染：主渲染循环 + 绘制辅助
// ============================================================

function render() {
  ctx.fillStyle = '#07070c';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  applyCamera();

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, WORLD.SPAWN_R * 1.2);
  grad.addColorStop(0, 'rgba(28, 38, 68, 0.55)');
  grad.addColorStop(1, 'rgba(7, 7, 12, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(-WORLD.SPAWN_R * 1.5, -WORLD.SPAWN_R * 1.5,
               WORLD.SPAWN_R * 3, WORLD.SPAWN_R * 3);

  ctx.beginPath();
  ctx.arc(0, 0, WORLD.PLACE_MAX_R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(107, 196, 255, 0.10)';
  ctx.lineWidth = 1 / camera.zoom * 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, WORLD.PLACE_MIN_R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(107, 196, 255, 0.10)';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, WORLD.SPAWN_R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 90, 90, 0.14)';
  ctx.lineWidth = 1 / camera.zoom * 2;
  ctx.setLineDash([20 / camera.zoom, 20 / camera.zoom]);
  ctx.stroke();
  ctx.setLineDash([]);

  if (state.showAuras) {
    for (const u of state.units) {
      if (u.isIntermediate) continue;
      const def = DEFS[u.key];
      if (!def || !def.aura) continue;
      ctx.beginPath();
      ctx.arc(u.x, u.y, def.aura.radius, 0, Math.PI * 2);
      ctx.strokeStyle = def.aura.target === 'enemy'
        ? 'rgba(160, 220, 100, 0.22)'
        : 'rgba(255, 200, 100, 0.22)';
      ctx.lineWidth = 1 / camera.zoom * 1.5;
      ctx.setLineDash([6 / camera.zoom, 8 / camera.zoom]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (let i = 0; i < state.units.length; i++) {
      for (let j = i + 1; j < state.units.length; j++) {
        const a = state.units[i], b = state.units[j];
        if (a.isIntermediate || b.isIntermediate) continue;
        const da = DEFS[a.key] && DEFS[a.key].aura;
        const db = DEFS[b.key] && DEFS[b.key].aura;
        const hasTowerAura = (da && da.target === 'tower') || (db && db.target === 'tower');
        if (!hasTowerAura) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < WORLD.AURA_RADIUS) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = 'rgba(255, 200, 100, 0.35)';
          ctx.lineWidth = 1.5 / camera.zoom * 1.5;
          ctx.setLineDash([5 / camera.zoom, 5 / camera.zoom]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  }

  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, WORLD.CORE_RADIUS * 2.4);
  coreGrad.addColorStop(0, 'rgba(107, 196, 255, 0.55)');
  coreGrad.addColorStop(0.5, 'rgba(107, 196, 255, 0.12)');
  coreGrad.addColorStop(1, 'rgba(107, 196, 255, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, WORLD.CORE_RADIUS * 2.4, 0, Math.PI * 2);
  ctx.fill();

  if (state.selectedCore) {
    ctx.beginPath();
    ctx.arc(0, 0, WORLD.CORE_RADIUS + 22, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3 / camera.zoom;
    ctx.setLineDash([10 / camera.zoom, 6 / camera.zoom]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.beginPath();
  ctx.arc(0, 0, WORLD.CORE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = state.coreHitFlash > 0 ? '#3a1a2a' : '#12182a';
  ctx.fill();
  ctx.strokeStyle = state.coreHitFlash > 0 ? '#ff5a5a' : '#6bc4ff';
  ctx.lineWidth = 2 / camera.zoom * 1.2;
  ctx.stroke();

  const hpPct = Math.max(0, state.coreHp / state.coreMaxHp);
  ctx.beginPath();
  ctx.arc(0, 0, WORLD.CORE_RADIUS + 14, -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * hpPct);
  ctx.strokeStyle = hpPct > 0.5 ? '#6bc4ff' : hpPct > 0.25 ? '#ffaa3a' : '#ff5a5a';
  ctx.lineWidth = 6 / camera.zoom * 1.2;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.fillStyle = state.coreHitFlash > 0 ? '#ff5a5a' : '#6bc4ff';
  ctx.font = `bold ${WORLD.CORE_RADIUS * 0.75}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('核', 0, 0);

  for (const u of state.units) {
    drawUnit(u, u === state.selectedUnit);
  }

  if (state.selectedHand >= 0 && state.hoveredUnit) {
    const hover = state.hoveredUnit;
    const handKey = state.hand[state.selectedHand].key;
    const merged = [...hover.atoms, ...DEFS[handKey].atoms].sort();
    const molKey = findMoleculeMatch(merged);
    let previewSym = null;
    if (molKey) previewSym = DEFS[molKey].symbol;
    else if (merged.length >= 2 && findSupersetMolecule(merged)) {
      previewSym = buildIntermediateSymbol(merged);
    }

    let specialReaction = null;
    for (const rx of SPECIAL_REACTIONS) {
      if ((hover.key === rx.a && handKey === rx.b) ||
          (hover.key === rx.b && handKey === rx.a)) {
        specialReaction = rx;
        break;
      }
    }
    const isSpecial = !!specialReaction;

    if (isSpecial) {
      ctx.beginPath();
      ctx.arc(hover.x, hover.y, specialReaction.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 170, 58, 0.10)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hover.x, hover.y, specialReaction.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 170, 58, 0.75)';
      ctx.lineWidth = 2.5 / camera.zoom;
      ctx.setLineDash([14 / camera.zoom, 8 / camera.zoom]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(hover.x, hover.y, hover.radius + 4 / camera.zoom, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 170, 58, 0.25)';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(hover.x, hover.y, hover.radius + 14 / camera.zoom, 0, Math.PI * 2);
    ctx.strokeStyle = isSpecial ? '#ffaa3a' : (previewSym ? '#6bc4ff' : '#ff5a5a');
    ctx.lineWidth = 3 / camera.zoom;
    ctx.stroke();

    ctx.fillStyle = isSpecial ? '#ffaa3a' : (previewSym ? '#6bc4ff' : '#ff5a5a');
    ctx.font = `bold ${18 / camera.zoom}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      previewSym ? `→ ${previewSym}` : (isSpecial ? '→ 反应' : '不可合成'),
      hover.x, hover.y - hover.radius - 20 / camera.zoom
    );

    if (isSpecial) {
      ctx.fillStyle = 'rgba(255, 200, 100, 0.9)';
      ctx.font = `bold ${14 / camera.zoom}px system-ui`;
      ctx.fillText(
        `爆炸半径 ${specialReaction.radius}`,
        hover.x, hover.y - hover.radius - 44 / camera.zoom
      );
    }
  }

  for (const e of state.enemies) {
    drawEnemy(e, e === state.selectedEnemy);
  }

  for (const p of state.projectiles) {
    const t = p.life / p.maxLife;
    ctx.beginPath();
    ctx.moveTo(p.x1, p.y1);
    ctx.lineTo(p.x2, p.y2);
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = t;
    ctx.lineWidth = 4 / camera.zoom;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';

  for (const ex of state.explosions) {
    const t = 1 - ex.life / ex.maxLife;
    const r = ex.maxRadius * (0.3 + t * 0.7);
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 170, 58, ${1 - t})`;
    ctx.lineWidth = 5 / camera.zoom;
    ctx.stroke();
    const g = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, r);
    g.addColorStop(0, `rgba(255, 210, 120, ${(1 - t) * 0.7})`);
    g.addColorStop(1, 'rgba(255, 100, 30, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.showParticles) {
    for (const p of state.particles) {
      const t = p.life / p.maxLife;
      ctx.globalAlpha = Math.min(1, t * 1.5);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, p.size * t), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  for (const p of state.popups) {
    if (!p.isWorld) continue;
    drawPopup(p, true);
  }

  const shouldShowPlacePreview =
    state.selectedHand >= 0 &&
    !state.hoveredUnit &&
    !dragState.overSellBtn;
  if (shouldShowPlacePreview) {
    const handKey = state.hand[state.selectedHand].key;
    const def = DEFS[handKey];
    const [wx, wy] = screenToWorld(state.mouseX, state.mouseY);
    const valid = tryPlace(wx, wy);
    const previewR = WORLD.TOWER_BASE_R * computeSizeFactor(def.atoms);

    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(wx, wy, previewR, 0, Math.PI * 2);
    ctx.fillStyle = valid ? 'rgba(107, 196, 255, 0.35)' : 'rgba(255, 90, 90, 0.35)';
    ctx.fill();
    ctx.strokeStyle = valid ? '#6bc4ff' : '#ff5a5a';
    ctx.lineWidth = 2 / camera.zoom;
    ctx.stroke();
    if (def && def.range > 0) {
      ctx.beginPath();
      ctx.arc(wx, wy, def.range, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(107, 196, 255, 0.25)';
      ctx.lineWidth = 1 / camera.zoom;
      ctx.stroke();
    } else if (def && def.aura) {
      ctx.beginPath();
      ctx.arc(wx, wy, def.aura.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 200, 100, 0.25)';
      ctx.lineWidth = 1 / camera.zoom;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  for (const p of state.popups) {
    if (p.isWorld) continue;
    drawPopup(p, false);
  }

  refreshMenuContent();
  updateMenuPosition();
}

function drawPopup(p, isWorld) {
  const t = p.life / p.maxLife;
  const alpha = t < 0.4 ? t / 0.4 : 1;
  ctx.globalAlpha = alpha;
  ctx.font = `800 ${p.size}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lw = isWorld ? 3 / camera.zoom : 3;
  ctx.lineWidth = lw;
  ctx.strokeStyle = p.isCrit ? 'rgba(80,0,0,0.85)' : 'rgba(0,0,0,0.75)';
  ctx.strokeText(p.text, p.x, p.y);

  if (p.isCrit) {
    ctx.shadowColor = p.color;
    ctx.shadowBlur = isWorld ? 12 / camera.zoom : 12;
  }
  ctx.fillStyle = p.color;
  ctx.fillText(p.text, p.x, p.y);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawUnit(u, showRange) {
  const def = DEFS[u.key];
  const r = u.radius;

  if (showRange && !u.isIntermediate && u.range > 0) {
    ctx.beginPath();
    ctx.arc(u.x, u.y, u.range, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(107, 196, 255, 0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(107, 196, 255, 0.55)';
    ctx.lineWidth = 2 / camera.zoom;
    ctx.setLineDash([10 / camera.zoom, 6 / camera.zoom]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (showRange && !u.isIntermediate && def && def.aura) {
    ctx.beginPath();
    ctx.arc(u.x, u.y, def.aura.radius, 0, Math.PI * 2);
    ctx.strokeStyle = def.aura.target === 'enemy'
      ? 'rgba(160, 220, 100, 0.55)'
      : 'rgba(255, 200, 100, 0.55)';
    ctx.lineWidth = 2 / camera.zoom;
    ctx.setLineDash([8 / camera.zoom, 6 / camera.zoom]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (u.isIntermediate) {
    // 外发光（暖橙，暗示"待反应"）
    const glow = ctx.createRadialGradient(u.x, u.y, r * 0.4, u.x, u.y, r + 10);
    glow.addColorStop(0, 'rgba(255, 180, 80, 0.18)');
    glow.addColorStop(1, 'rgba(255, 180, 80, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(u.x, u.y, r + 10, 0, Math.PI * 2);
    ctx.fill();

    // 主体：半透明填充（体现"不完整"）
    ctx.beginPath();
    ctx.arc(u.x, u.y, r, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(def.color, 0.35);
    ctx.fill();

    // 虚线描边（暖橙，与合成预览一致）
    ctx.beginPath();
    ctx.arc(u.x, u.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 180, 80, 0.85)';
    ctx.lineWidth = 2.5 / camera.zoom;
    ctx.setLineDash([7 / camera.zoom, 5 / camera.zoom]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (u.hitFlash > 0) {
      ctx.beginPath();
      ctx.arc(u.x, u.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${(u.hitFlash / 0.15) * 0.5})`;
      ctx.fill();
    }

    // symbol：白色半透明
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = `bold ${Math.max(14, r * 0.8)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.symbol, u.x, u.y);

    drawHpArc(u, r + 14 / camera.zoom);
    return;
  }

  ctx.beginPath();
  ctx.arc(u.x, u.y + 4, r + 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(u.x, u.y, r, 0, Math.PI * 2);
  ctx.fillStyle = def.color;
  ctx.fill();
  ctx.strokeStyle = def.stroke;
  ctx.lineWidth = 3 / camera.zoom;
  ctx.stroke();

  if (showRange) {
    ctx.beginPath();
    ctx.arc(u.x, u.y, r + 10, 0, Math.PI * 2);
    ctx.strokeStyle = '#6bc4ff';
    ctx.lineWidth = 3 / camera.zoom;
    ctx.stroke();
  }

  if (u.hitFlash > 0) {
    ctx.beginPath();
    ctx.arc(u.x, u.y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${(u.hitFlash / 0.15) * 0.5})`;
    ctx.fill();
  }

  ctx.fillStyle = def.tier === 0 ? '#111' : '#fff';
  ctx.font = `bold ${Math.max(14, r * 0.85)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.symbol, u.x, u.y);

  drawHpArc(u, r + 14 / camera.zoom);
}

function drawHpArc(u, arcR) {
  if (u.hp >= u.maxHp) return;
  const pct = Math.max(0, Math.min(1, u.hp / u.maxHp));
  const startA = Math.PI * 0.75;
  const spanA  = Math.PI * 0.5;
  const lineW  = 7 / camera.zoom;

  ctx.beginPath();
  ctx.arc(u.x, u.y, arcR, startA, startA - spanA, true);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.lineWidth = lineW;
  ctx.lineCap = 'round';
  ctx.stroke();

  if (pct > 0.005) {
    const currentEnd = startA - spanA * pct;
    ctx.beginPath();
    ctx.arc(u.x, u.y, arcR, startA, currentEnd, true);
    ctx.strokeStyle = pct > 0.5 ? '#6be86b' : pct > 0.25 ? '#ffaa3a' : '#ff5a5a';
    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

function drawEnemy(e, selected) {
  const pulse = 1 + Math.sin(state.time * 5 + e.x * 0.01) * 0.06;
  const r = e.radius * pulse;
  const pct = Math.max(0, e.hp / e.maxHp);

  ctx.beginPath();
  ctx.arc(e.x, e.y, r + 12, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(e.color, 0.14);
  ctx.fill();

  // 状态外环 —— 只依赖 DOTS 表
  const dots = e.dots || {};
  const dotKinds = Object.keys(dots);
  for (let i = 0; i < dotKinds.length; i++) {
    const d = DOTS[dotKinds[i]];
    if (!d) continue;
    const rOff = r + 6 + i * 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, rOff, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(d.color, 0.85);
    ctx.lineWidth = 2 / camera.zoom;
    ctx.setLineDash([4 / camera.zoom, 4 / camera.zoom]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.beginPath();
  ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(e.color, 0.28);
  ctx.fill();

  if (dots.burn) {
    ctx.beginPath();
    ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(DOTS.burn.color, 0.22);
    ctx.fill();
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
  ctx.clip();
  const fillH = r * 2 * pct;
  const fillTop = e.y + r - fillH;
  ctx.fillStyle = e.color;
  ctx.fillRect(e.x - r, fillTop, r * 2, fillH);
  if (pct > 0.02 && pct < 0.98) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(e.x - r, fillTop, r * 2, 2 / camera.zoom);
  }
  ctx.restore();

  if (selected) {
    ctx.beginPath();
    ctx.arc(e.x, e.y, r + 14, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3 / camera.zoom;
    ctx.setLineDash([6 / camera.zoom, 4 / camera.zoom]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.beginPath();
  ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 / camera.zoom;
  ctx.stroke();

  if (e.attacking) {
    ctx.beginPath();
    ctx.arc(e.x, e.y, r + 6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 90, 90, ${0.4 + Math.sin(state.time * 10) * 0.3})`;
    ctx.lineWidth = 3 / camera.zoom;
    ctx.stroke();
  }

  // 状态图标 —— 也只依赖 DOTS 表
  for (let i = 0; i < dotKinds.length; i++) {
    const d = DOTS[dotKinds[i]];
    if (!d) continue;
    ctx.fillStyle = d.color;
    ctx.font = `bold ${Math.max(12, r * 0.7)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.icon, e.x + (i - (dotKinds.length - 1) / 2) * r * 0.7, e.y - r * 0.85);
  }
}