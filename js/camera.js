// ============================================================
// Canvas 与相机
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;
let dpr = 1;

const camera = { x: 0, y: 0, zoom: 1, fitZoom: 1, initialized: false };

function computeFitZoom() { return (Math.min(W, H) * 0.4) / WORLD.PLACE_MAX_R; }

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;

  const MAX_CANVAS_PIXELS = 4096 * 2160;
  let rawDpr = window.devicePixelRatio || 1;
  const totalPixels = W * H * rawDpr * rawDpr;
  if (totalPixels > MAX_CANVAS_PIXELS) {
    rawDpr = Math.sqrt(MAX_CANVAS_PIXELS / (W * H));
  }
  dpr = Math.max(1, Math.min(rawDpr, 3));

  canvas.width  = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  document.documentElement.style.setProperty('--vh', (H * 0.01) + 'px');

  camera.fitZoom = computeFitZoom();
  if (!camera.initialized) {
    camera.x = 0; camera.y = 0;
    camera.zoom = camera.fitZoom;
    camera.initialized = true;
  } else {
    camera.zoom = clamp(camera.zoom, camera.fitZoom * 0.3, camera.fitZoom * 4);
  }
  updateZoomDisplay();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', resize);
}
resize();

function screenToWorld(sx, sy) {
  return [(sx - W / 2) / camera.zoom + camera.x, (sy - H / 2) / camera.zoom + camera.y];
}
function worldToScreen(wx, wy) {
  return [(wx - camera.x) * camera.zoom + W / 2, (wy - camera.y) * camera.zoom + H / 2];
}
function applyCamera() {
  ctx.translate(W / 2, H / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
}
function updateZoomDisplay() {
  const el = document.getElementById('zoomDisplay');
  if (el) el.textContent = Math.round((camera.zoom / camera.fitZoom) * 100) + '%';
}
function resetCamera() {
  camera.x = 0; camera.y = 0;
  camera.zoom = camera.fitZoom;
  updateZoomDisplay();
}