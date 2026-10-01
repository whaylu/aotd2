// ============================================================
// 游戏状态
// ============================================================

const state = {
  gold: 100,
  coreHp: CORE_MAX_HP,
  coreMaxHp: CORE_MAX_HP,
  units: [],
  enemies: [],
  projectiles: [],
  explosions: [],
  particles: [],
  popups: [],
  hand: [
    { key:'H', cost: BASE_HAND_COST },
    { key:'H', cost: BASE_HAND_COST },
    { key:'H', cost: BASE_HAND_COST },
  ],
  selectedHand: -1,
  selectedUnit: null,
  selectedEnemy: null,
  selectedCore: false,
  hoveredUnit: null,
  mouseX: 0, mouseY: 0,
  time: 0,
  running: false,
  gameOver: false,
  paused: false,
  speedMultiplier: 1,
  spawnTimer: 2,
  spawnInterval: 2.5,
  stage: 1,
  stageTimer: 0,
  stageDuration: 25,
  kills: 0,
  score: 0,
  rollCost: BASE_ROLL_COST,
  rollsUsed: 0,
  unitLimit: START_UNIT_LIMIT,
  unitLimitCost: 60,
  coreHitFlash: 0,
  maxStage: 1,
  dragMode: false,
  showAuras: true,
  showDamagePopups: true,
  showParticles: true,
  settingsOpen: false,
  rolling: false,
  rollMode: 'normal',
  hasCombustion: false,
  radiationBonus: 0,   // ★ 全局辐射增伤（0~N）
  activeGlobals: [],   // 当前激活的全局效果列表（由 computeGlobalEffects 填充）
};

let bulkSellMode = false;
const bulkSellSet = new Set();
let freshHandIndices = new Set();

const dragState = {
  active: false,
  handIndex: -1,
  startX: 0,
  startY: 0,
  moved: false,
  overSellBtn: false,
};

const activePointers = new Map();
const pinchState = {
  active: false,
  startDist: 1,
  startZoom: 1,
  worldCenterX: 0,
  worldCenterY: 0,
};

let pointerDown = false;
let pointerStartX = 0, pointerStartY = 0;
let panStartCamX = 0, panStartCamY = 0;
let hasDragged = false;
let activeButton = -1;