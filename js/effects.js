// ============================================================
// 特效与提示：粒子、爆炸、飘字、消息
// ============================================================

function addParticle(p) {
  if (!state.showParticles) return;
  state.particles.push(p);
}

function triggerExplosion(x, y, damage, radius) {
  state.explosions.push({ x, y, radius, maxRadius: radius, life: 0.55, maxLife: 0.55 });
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < radius) {
      const baseDmg = damage * (1 - d / radius * 0.5);
      const { dmg, isCrit } = calcDamage(baseDmg);
      e.hp -= dmg;
      showDamagePopup(e, dmg, { isCrit });
    }
  }
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * 240 + 80;
    addParticle({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.5 + Math.random() * 0.4, maxLife: 0.9,
      color: i % 2 ? '#ffaa3a' : '#ff6030', size: 8 + Math.random() * 8,
    });
  }
}

const toastContainer = document.getElementById('toastContainer');
function flashMessage(text, color = '#ffaa3a') {
  while (toastContainer.children.length >= 5) {
    toastContainer.firstChild.remove();
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  el.style.color = color;
  el.style.borderColor = color;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function pushPopup(p) {
  state.popups.push(p);
  if (state.popups.length > 200) state.popups.shift();
}

function showDamagePopup(target, amount, opts = {}) {
  if (!state.showDamagePopups) return;
  const n = Math.max(0, Math.round(amount));
  if (n <= 0) return;

  const isCrit = !!opts.isCrit;
  let color = '#ffffff';
  if (isCrit) color = '#ff3a3a';
  else if (opts.dotKind && DOTS[opts.dotKind]) color = DOTS[opts.dotKind].color;

  pushPopup({
    x: target.x + (Math.random() - 0.5) * 24,
    y: target.y - 34 + (Math.random() - 0.5) * 10,
    vx: (Math.random() - 0.5) * 40,
    vy: -70 - Math.random() * 30,
    life: isCrit ? 1.15 : 0.9,
    maxLife: isCrit ? 1.15 : 0.9,
    text: String(n),
    color,
    size: isCrit ? 30 : 20,
    isWorld: true,
    isCrit,
  });
}
function showCoreDamagePopup(amount) {
  if (!state.showDamagePopups) return;
  const n = Math.max(0, Math.round(amount));
  if (n <= 0) return;
  const a = Math.random() * Math.PI * 2;
  pushPopup({
    x: Math.cos(a) * WORLD.CORE_RADIUS * 0.7,
    y: Math.sin(a) * WORLD.CORE_RADIUS * 0.7 - 30,
    vx: (Math.random() - 0.5) * 40,
    vy: -70 - Math.random() * 30,
    life: 0.9, maxLife: 0.9,
    text: String(n),
    color: '#ffffff',
    size: 22,
    isWorld: true,
  });
}
function showGoldPopup(delta) {
  const sign = delta >= 0 ? '+' : '';
  pushPopup({
    x: 180 + (Math.random() - 0.5) * 24,
    y: 36 + (Math.random() - 0.5) * 8,
    vx: (Math.random() - 0.5) * 30,
    vy: -55,
    life: 0.9, maxLife: 0.9,
    text: `${sign}${Math.round(delta)}`,
    color: '#ffd166',
    size: 22,
    isWorld: false,
  });
}
function showScorePopup(delta) {
  const sign = delta >= 0 ? '+' : '';
  pushPopup({
    x: W / 2 + 130 + (Math.random() - 0.5) * 24,
    y: 46 + (Math.random() - 0.5) * 8,
    vx: (Math.random() - 0.5) * 30,
    vy: -55,
    life: 0.9, maxLife: 0.9,
    text: `${sign}${Math.round(delta)}`,
    color: '#6bc4ff',
    size: 22,
    isWorld: false,
  });
}