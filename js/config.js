// ============================================================
// 全局配置
// ============================================================

const WORLD = {
  CORE_RADIUS: 70, PLACE_MIN_R: 150, PLACE_MAX_R: 820,
  SPAWN_R: 920, TOWER_BASE_R: 50, AURA_RADIUS: 140,
};

const HP_SCALE = 20;
const CORE_MAX_HP = 10000;
const START_UNIT_LIMIT = 12;
const BASE_ROLL_COST = 10;
const BASE_HAND_COST = 10;
const CRIT_CHANCE = 0.10;
const CRIT_MULT = 2.0;

const ATOM_MASS = {
  H:1, He:4, C:12, N:14, O:16, F:19, Na:23, Mg:24,
  Al:27, Si:28, P:31, S:32, Cl:35.5, K:39, Ca:40,
  Fe:56, Cu:64, Zn:65, Ag:108, Au:197,
};

// ============================================================
// 元素解锁顺序 —— 按原子序排列
// ============================================================
const ELEMENT_UNLOCK_ORDER = [
  'H',   // 1
  'He',  // 2
  'C',   // 6
  'N',   // 7
  'O',   // 8
  'F',   // 9
  'Na',  // 11
  'Mg',  // 12
  'Al',  // 13
  'Si',  // 14
  'P',   // 15
  'S',   // 16
  'Cl',  // 17
  'K',   // 19
  'Ca',  // 20
  'Fe',  // 26
  'Cu',  // 29
  'Zn',  // 30
  'Ag',  // 47
  'Au',  // 79
];

// 阶段解锁机制已取消：所有元素从一开始就可抽
function getUnlockedAtoms(_stage) {
  return ELEMENT_UNLOCK_ORDER.slice();
}

// ============================================================
// 抽卡权重 —— 越大越容易抽到
//   攻击者/常用过渡态 → 高权重
//   光环/经济         → 低权重
// ============================================================
const ROLL_WEIGHTS = {
  H: 12, C: 12, O: 10,
  N: 7, Na: 6,
  S: 5, Cl: 5, Cu: 5, Si: 5, Al: 5,
  P: 4, F: 4, K: 4, Mg: 4, Zn: 4,
  Ca: 3, Fe: 3, He: 3, Ag: 3,
  Au: 2,
};

const TAGS = {
  bullet:    { name:'子弹',   cat:'self', desc:'发射弹丸命中目标' },
  chain:     { name:'连锁',   cat:'self', desc:'命中后弹射到附近敌人' },
  knockback: { name:'击退',   cat:'self', desc:'命中把敌人推远' },
  splash:    { name:'溅射',   cat:'self', desc:'命中点周围也受伤' },
  burst:     { name:'多发',   cat:'self', desc:'一次攻击同时打多个目标' },
  reflect:   { name:'反伤',   cat:'self', desc:'被攻击时反弹部分伤害' },
  flammable: { name:'可燃',   cat:'self', desc:'场上存在"助燃"时，攻击附加燃烧' },
  acid:      { name:'酸蚀',   cat:'self', desc:'命中附加酸蚀' },
  salt:      { name:'盐',     cat:'self', desc:'离子晶体' },
  water:     { name:'水',     cat:'self', desc:'极性溶剂' },
  alkali:    { name:'碱金属', cat:'self', desc:'遇水爆炸' },
  alkaline:  { name:'碱土金属',cat:'self',desc:'护盾/结构金属' },
  halogen:   { name:'卤素',   cat:'self', desc:'氧化性卤族' },
  metal:     { name:'金属',   cat:'self', desc:'导电导热' },
  nonmetal:  { name:'非金属', cat:'self', desc:'非金属元素' },
  metalloid: { name:'类金属', cat:'self', desc:'半导体性质' },
  noble:     { name:'稀有气体',cat:'self',desc:'不参与化学反应' },
  inert:     { name:'惰性',   cat:'self', desc:'化学性质极稳定' },
  heavy:     { name:'重金属', cat:'self', desc:'密度大、毒性强' },
  economy:   { name:'经济',   cat:'self', desc:'持续产出金币' },
};

const DOTS = {
  burn:  { name:'燃烧', icon:'🔥', color:'#ff8c3a', dpsRatio:0.30, duration:3   },
  acid:  { name:'酸蚀', icon:'🧪', color:'#a0ff80', dpsRatio:0.35, duration:3   },
  toxic: { name:'毒气', icon:'💀', color:'#82d94e', dpsRatio:0.25, duration:2.5 },
};

const DEFS = {
  // ============================================================
  // 不稳定单原子（过渡态）
  // ============================================================
  H:  { atoms:['H'],  name:'氢原子', symbol:'H',  color:'#d8d8d8', stroke:'#888',
        hp:40, tier:0, unstable:true },
  N:  { atoms:['N'],  name:'氮原子', symbol:'N',  color:'#8090ff', stroke:'#4050a0',
        hp:40, tier:0, unstable:true },
  O:  { atoms:['O'],  name:'氧原子', symbol:'O',  color:'#ff5a5a', stroke:'#a02020',
        hp:40, tier:0, unstable:true },
  S:  { atoms:['S'],  name:'硫原子', symbol:'S',  color:'#ffe060', stroke:'#a08020',
        hp:40, tier:0, unstable:true },
  Cl: { atoms:['Cl'], name:'氯原子', symbol:'Cl', color:'#82d94e', stroke:'#407020',
        hp:40, tier:0, unstable:true },
  P:  { atoms:['P'],  name:'磷原子', symbol:'P',  color:'#ffb040', stroke:'#a06010',
        hp:40, tier:0, unstable:true },
  F:  { atoms:['F'],  name:'氟原子', symbol:'F',  color:'#c0ffb0', stroke:'#40a030',
        hp:40, tier:0, unstable:true },

  // ============================================================
  // 稳定单原子
  // ============================================================
  C:  { atoms:['C'],  name:'碳', symbol:'C', color:'#5a5a5a', stroke:'#222',
        atk:22, range:260, cd:1.5, hp:120, tier:0,
        tags:['bullet','flammable'], attack:'bullet' },
  Na: { atoms:['Na'], name:'钠', symbol:'Na', color:'#f5a623', stroke:'#a06010',
        atk:26, range:220, cd:1.6, hp:140, tier:0,
        tags:['bullet','alkali'], attack:'bullet' },
  K:  { atoms:['K'],  name:'钾', symbol:'K',  color:'#ff9060', stroke:'#a04020',
        atk:28, range:200, cd:1.7, hp:130, tier:0,
        tags:['bullet','alkali'], attack:'bullet' },
  Mg: { atoms:['Mg'], name:'镁', symbol:'Mg', color:'#d8d8c0', stroke:'#808060',
        atk:20, range:240, cd:1.5, hp:150, tier:0,
        tags:['bullet','alkaline'], attack:'bullet' },
  Al: { atoms:['Al'], name:'铝', symbol:'Al', color:'#c8d0d8', stroke:'#607080',
        atk:24, range:250, cd:1.6, hp:170, tier:0,
        tags:['bullet','metal'], attack:'bullet' },
  Si: { atoms:['Si'], name:'硅', symbol:'Si', color:'#a8a8c0', stroke:'#505070',
        atk:22, range:270, cd:1.7, hp:160, tier:0,
        tags:['bullet','metalloid'], attack:'bullet' },
  Ca: { atoms:['Ca'], name:'钙', symbol:'Ca', color:'#c8c8d8', stroke:'#708090',
        atk:0, range:0, cd:9, hp:260, tier:0,
        tags:['alkaline'], attack:'aura',
        aura:{ target:'tower', type:'shield', value:0.20, radius:140, name:'护盾' } },
  Fe: { atoms:['Fe'], name:'铁', symbol:'Fe', color:'#c8a890', stroke:'#806050',
        atk:0, range:0, cd:9, hp:200, tier:0,
        tags:['metal'], attack:'aura',
        aura:{ target:'tower', type:'damage', value:0.25, radius:150, name:'催化' } },
  Cu: { atoms:['Cu'], name:'铜', symbol:'Cu', color:'#e8a878', stroke:'#a06030',
        atk:20, range:280, cd:1.3, hp:160, tier:0,
        tags:['chain','metal'], attack:'bullet',
        bulletMode:'chain', chainCount:2 },
  Zn: { atoms:['Zn'], name:'锌', symbol:'Zn', color:'#b8c0c8', stroke:'#606870',
        atk:26, range:260, cd:1.5, hp:180, tier:0,
        tags:['bullet','metal'], attack:'bullet' },
  Ag: { atoms:['Ag'], name:'银', symbol:'Ag', color:'#e8e8f0', stroke:'#9098a0',
        atk:32, range:300, cd:1.4, hp:150, tier:0,
        tags:['bullet','metal','heavy'], attack:'bullet', bulletEffect:'toxic' },
  Au: { atoms:['Au'], name:'金', symbol:'Au', color:'#ffd166', stroke:'#a08030',
        atk:0, range:0, cd:9, hp:400, tier:0,
        tags:['inert','metal','economy'], attack:'economy',
        economy:{ interval:5, gold:8 } },
  He: { atoms:['He'], name:'氦', symbol:'He', color:'#c8b8ff', stroke:'#8060d0',
        atk:0, range:0, cd:9, hp:120, tier:0,
        tags:['noble'], attack:'aura',
        aura:{ target:'tower', type:'cooldown', value:-0.15, radius:100, name:'冷却' } },

  // ============================================================
  // 双原子分子
  // ============================================================
  H2: { atoms:['H','H'],    name:'氢气', symbol:'H₂', color:'#b8d8f0', stroke:'#6090c0',
        atk:24, range:310, cd:1.0, hp:140, tier:1,
        tags:['chain','flammable'], attack:'bullet',
        bulletMode:'chain', chainCount:2 },
  N2: { atoms:['N','N'],    name:'氮气', symbol:'N₂', color:'#a0b0ff', stroke:'#5060c0',
        atk:0, range:0, cd:9, hp:220, tier:1,
        tags:['inert'], attack:'aura',
        aura:{ target:'tower', type:'shield', value:0.15, radius:140, name:'护盾' } },
  O2: { atoms:['O','O'],    name:'氧气', symbol:'O₂', color:'#ff8080', stroke:'#c04040',
        atk:0, range:0, cd:9, hp:170, tier:1,
        tags:['nonmetal'], attack:'global', global:'combustion', globalName:'助燃' },
  Cl2:{ atoms:['Cl','Cl'],  name:'氯气', symbol:'Cl₂', color:'#a8e888', stroke:'#408020',
        atk:40, range:0, cd:9, hp:120, tier:1,
        tags:['halogen'], attack:'aura',
        aura:{ target:'enemy', dotKind:'toxic', value:0.25, radius:160, name:'毒气' } },
  F2: { atoms:['F','F'],    name:'氟气', symbol:'F₂', color:'#d0ffb8', stroke:'#50a030',
        atk:60, range:280, cd:2.0, hp:100, tier:1,
        tags:['halogen','nonmetal'], attack:'bullet',
        bulletMode:'splash', splashRadius:70, splashRatio:0.5,
        bulletEffect:'acid' },
  HCl:{ atoms:['H','Cl'],   name:'盐酸', symbol:'HCl', color:'#a0ff80', stroke:'#408020',
        atk:36, range:310, cd:1.2, hp:130, tier:1,
        tags:['acid'], attack:'bullet', bulletEffect:'acid' },
  HF: { atoms:['H','F'],    name:'氢氟酸', symbol:'HF', color:'#b0ffb0', stroke:'#40a040',
        atk:44, range:300, cd:1.4, hp:110, tier:1,
        tags:['acid','halogen'], attack:'bullet',
        bulletMode:'splash', splashRadius:60, splashRatio:0.6,
        bulletEffect:'acid' },
  CO: { atoms:['C','O'],    name:'一氧化碳', symbol:'CO', color:'#808080', stroke:'#303030',
        atk:32, range:340, cd:1.5, hp:130, tier:1,
        tags:['bullet','flammable'], attack:'bullet', bulletEffect:'toxic' },
  NO: { atoms:['N','O'],    name:'一氧化氮', symbol:'NO', color:'#c8a8ff', stroke:'#7050a0',
        atk:28, range:320, cd:1.3, hp:120, tier:1,
        tags:['bullet'], attack:'bullet', bulletEffect:'toxic' },
  SO: { atoms:['S','O'],    name:'一氧化硫', symbol:'SO', color:'#d8c060', stroke:'#907020',
        atk:30, range:300, cd:1.4, hp:130, tier:1,
        tags:['bullet'], attack:'bullet' },
  CuO:{ atoms:['Cu','O'],   name:'氧化铜', symbol:'CuO', color:'#707888', stroke:'#404858',
        atk:26, range:280, cd:1.6, hp:180, tier:1,
        tags:['bullet','metal'], attack:'bullet' },
  FeO:{ atoms:['Fe','O'],   name:'氧化亚铁', symbol:'FeO', color:'#806050', stroke:'#402820',
        atk:28, range:280, cd:1.6, hp:190, tier:1,
        tags:['bullet','metal'], attack:'bullet' },
  MgO:{ atoms:['Mg','O'],   name:'氧化镁', symbol:'MgO', color:'#e8e8d8', stroke:'#a0a080',
        atk:24, range:240, cd:1.8, hp:240, tier:1,
        tags:['bullet','alkaline'], attack:'bullet',
        reflect:0.25 },
  ZnO:{ atoms:['Zn','O'],   name:'氧化锌', symbol:'ZnO', color:'#d8d8c8', stroke:'#808070',
        atk:30, range:280, cd:1.5, hp:200, tier:1,
        tags:['bullet','metal'], attack:'bullet' },
  KCl:{ atoms:['K','Cl'],   name:'氯化钾', symbol:'KCl', color:'#e8f0c8', stroke:'#90a060',
        atk:28, range:280, cd:1.6, hp:170, tier:1,
        tags:['bullet','salt','alkali'], attack:'bullet' },
  NaCl:{ atoms:['Na','Cl'],  name:'氯化钠', symbol:'NaCl', color:'#eef4c8', stroke:'#98b060',
      atk:26, range:280, cd:1.6, hp:170, tier:1,
      tags:['bullet','salt','alkali'], attack:'bullet' },
  AgCl:{ atoms:['Ag','Cl'], name:'氯化银', symbol:'AgCl', color:'#e0e0e8', stroke:'#9098a0',
        atk:38, range:300, cd:1.6, hp:160, tier:1,
        tags:['bullet','metal','heavy'], attack:'bullet', bulletEffect:'toxic' },
  SiC:{ atoms:['Si','C'],   name:'碳化硅', symbol:'SiC', color:'#a0a0a8', stroke:'#505058',
        atk:36, range:260, cd:1.8, hp:260, tier:1,
        tags:['bullet','metalloid'], attack:'bullet' },

  // ============================================================
  // 三原子分子
  // ============================================================
  H2O:{ atoms:['H','H','O'],name:'水', symbol:'H₂O', color:'#80c8ff', stroke:'#4080c0',
        atk:0, range:0, cd:9, hp:200, tier:2,
        tags:['water'], attack:'aura',
        aura:{ target:'tower', type:'range', value:0.20, radius:140, name:'溶剂' } },
  CO2:{ atoms:['C','O','O'],name:'二氧化碳', symbol:'CO₂', color:'#b0b0b0', stroke:'#505050',
        atk:44, range:380, cd:2.2, hp:150, tier:2,
        tags:['splash'], attack:'bullet',
        bulletMode:'splash', splashRadius:110, splashRatio:0.5 },
  NO2:{ atoms:['N','O','O'],name:'二氧化氮', symbol:'NO₂', color:'#d89060', stroke:'#905020',
        atk:38, range:320, cd:1.6, hp:140, tier:2,
        tags:['splash'], attack:'bullet',
        bulletMode:'splash', splashRadius:80, splashRatio:0.5,
        bulletEffect:'toxic' },
  SO2:{ atoms:['S','O','O'],name:'二氧化硫', symbol:'SO₂', color:'#e0d080', stroke:'#a09040',
        atk:34, range:320, cd:1.6, hp:150, tier:2,
        tags:['bullet','nonmetal'], attack:'bullet', bulletEffect:'toxic' },
  H2S:{ atoms:['H','H','S'],name:'硫化氢', symbol:'H₂S', color:'#e0e080', stroke:'#a0a040',
        atk:30, range:300, cd:1.3, hp:130, tier:2,
        tags:['bullet','flammable'], attack:'bullet', bulletEffect:'toxic' },
  NaOH:{ atoms:['Na','O','H'],name:'氢氧化钠', symbol:'NaOH', color:'#c8c8ff', stroke:'#7070b0',
        atk:0, range:0, cd:9, hp:200, tier:2,
        tags:['alkaline'], attack:'aura',
        aura:{ target:'tower', type:'shield', value:0.25, radius:150, name:'护盾' } },
  KOH:{ atoms:['K','O','H'], name:'氢氧化钾', symbol:'KOH', color:'#ffd0b0', stroke:'#a06040',
        atk:0, range:0, cd:9, hp:190, tier:2,
        tags:['alkaline'], attack:'aura',
        aura:{ target:'tower', type:'shield', value:0.25, radius:150, name:'护盾' } },
  MgCl2:{ atoms:['Mg','Cl','Cl'], name:'氯化镁', symbol:'MgCl₂', color:'#d8e0c8', stroke:'#809060',
        atk:30, range:280, cd:1.6, hp:200, tier:2,
        tags:['bullet','salt'], attack:'bullet' },
  ZnCl2:{ atoms:['Zn','Cl','Cl'], name:'氯化锌', symbol:'ZnCl₂', color:'#c8d0c8', stroke:'#708070',
        atk:32, range:280, cd:1.6, hp:200, tier:2,
        tags:['bullet','salt','metal'], attack:'bullet' },
  SiO2:{ atoms:['Si','O','O'], name:'二氧化硅', symbol:'SiO₂', color:'#e0e0f0', stroke:'#9090a0',
        atk:28, range:260, cd:1.8, hp:300, tier:2,
        tags:['bullet','salt'], attack:'bullet',
        reflect:0.20 },
  Ag2O:{ atoms:['Ag','Ag','O'], name:'氧化银', symbol:'Ag₂O', color:'#a8a0a8', stroke:'#605060',
        atk:40, range:280, cd:1.8, hp:180, tier:2,
        tags:['bullet','metal','heavy'], attack:'bullet', bulletEffect:'toxic' },
  K2O:{ atoms:['K','K','O'],  name:'氧化钾', symbol:'K₂O', color:'#ffb8a0', stroke:'#a05840',
        atk:34, range:240, cd:1.8, hp:180, tier:2,
        tags:['bullet','alkali'], attack:'bullet' },
  HNO3:{ atoms:['H','N','O','O','O'], name:'硝酸', symbol:'HNO₃', color:'#ff9a9a', stroke:'#a05050',
        atk:48, range:320, cd:1.6, hp:120, tier:3,
        tags:['acid'], attack:'bullet',
        bulletMode:'splash', splashRadius:70, splashRatio:0.5,
        bulletEffect:'acid' },

  // ============================================================
  // 四原子及以上
  // ============================================================
  NH3:{ atoms:['N','H','H','H'], name:'氨', symbol:'NH₃', color:'#c0c8ff', stroke:'#6070b0',
        atk:30, range:320, cd:1.4, hp:160, tier:3,
        tags:['bullet','nonmetal'], attack:'bullet' },
  CH4:{ atoms:['C','H','H','H','H'], name:'甲烷', symbol:'CH₄', color:'#a0a0a0', stroke:'#505050',
        atk:26, range:240, cd:1.5, hp:150, tier:3,
        tags:['splash','flammable'], attack:'bullet',
        bulletMode:'splash', splashRadius:100, splashRatio:0.6 },
  H2O2:{ atoms:['H','H','O','O'], name:'过氧化氢', symbol:'H₂O₂', color:'#80e0c0', stroke:'#408070',
        atk:0, range:0, cd:9, hp:160, tier:3,
        tags:['nonmetal'], attack:'aura',
        aura:{ target:'tower', type:'damage', value:0.50, radius:120, name:'强氧化' } },
  CH3OH:{ atoms:['C','H','H','H','O','H'], name:'甲醇', symbol:'CH₃OH', color:'#c0c8d0', stroke:'#606878',
        atk:28, range:300, cd:1.5, hp:140, tier:4,
        tags:['bullet','flammable'], attack:'bullet', bulletEffect:'acid' },
  C2H2:{ atoms:['C','C','H','H'], name:'乙炔', symbol:'C₂H₂', color:'#ffb060', stroke:'#a06020',
        atk:48, range:260, cd:2.2, hp:100, tier:3,
        tags:['bullet','flammable'], attack:'bullet' },
  C2H4:{ atoms:['C','C','H','H','H','H'], name:'乙烯', symbol:'C₂H₄', color:'#c8d8a0', stroke:'#80a040',
        atk:26, range:300, cd:1.3, hp:150, tier:4,
        tags:['chain','flammable'], attack:'bullet',
        bulletMode:'chain', chainCount:2 },
  C2H6:{ atoms:['C','C','H','H','H','H','H','H'], name:'乙烷', symbol:'C₂H₆', color:'#b8b8b8', stroke:'#686868',
        atk:22, range:300, cd:1.4, hp:170, tier:5,
        tags:['burst','flammable'], attack:'bullet',
        bulletMode:'burst', burstCount:3 },
  C2H5OH:{ atoms:['C','C','H','H','H','O','H','H','H'], name:'乙醇', symbol:'C₂H₅OH', color:'#c0d0c0', stroke:'#607060',
        atk:32, range:320, cd:1.6, hp:160, tier:6,
        tags:['chain','flammable'], attack:'bullet',
        bulletMode:'chain', chainCount:3 },
  H2SO4:{ atoms:['H','H','S','O','O','O','O'], name:'硫酸', symbol:'H₂SO₄', color:'#e0ff80', stroke:'#80a040',
        atk:52, range:340, cd:1.8, hp:130, tier:4,
        tags:['acid'], attack:'bullet',
        bulletMode:'splash', splashRadius:90, splashRatio:0.6,
        bulletEffect:'acid' },
  H3PO4:{ atoms:['H','H','H','P','O','O','O','O'], name:'磷酸', symbol:'H₃PO₄', color:'#ffd080', stroke:'#a08040',
        atk:42, range:320, cd:1.8, hp:150, tier:4,
        tags:['acid'], attack:'bullet',
        bulletMode:'splash', splashRadius:80, splashRatio:0.5,
        bulletEffect:'acid' },
  CaCO3:{ atoms:['Ca','C','O','O','O'], name:'碳酸钙', symbol:'CaCO₃', color:'#e8e8d8', stroke:'#909080',
        atk:24, range:260, cd:1.8, hp:400, tier:4,
        tags:['bullet','salt'], attack:'bullet' },
  MgCO3:{ atoms:['Mg','C','O','O','O'], name:'碳酸镁', symbol:'MgCO₃', color:'#e0e0d0', stroke:'#909080',
        atk:26, range:260, cd:1.8, hp:380, tier:4,
        tags:['bullet','salt'], attack:'bullet' },
  CaOH2:{ atoms:['Ca','O','O','H','H'], name:'氢氧化钙', symbol:'Ca(OH)₂', color:'#e0e0d0', stroke:'#909080',
        atk:0, range:0, cd:9, hp:300, tier:3,
        tags:['alkaline'], attack:'aura',
        aura:{ target:'tower', type:'shield', value:0.30, radius:160, name:'护盾' } },
  MgOH2:{ atoms:['Mg','O','O','H','H'], name:'氢氧化镁', symbol:'Mg(OH)₂', color:'#e8e8e0', stroke:'#909080',
        atk:0, range:0, cd:9, hp:280, tier:3,
        tags:['alkaline'], attack:'aura',
        aura:{ target:'tower', type:'shield', value:0.28, radius:150, name:'护盾' } },
  ZnOH2:{ atoms:['Zn','O','O','H','H'], name:'氢氧化锌', symbol:'Zn(OH)₂', color:'#d8d8d0', stroke:'#808080',
        atk:0, range:0, cd:9, hp:260, tier:3,
        tags:['alkaline'], attack:'aura',
        aura:{ target:'tower', type:'shield', value:0.25, radius:140, name:'护盾' } },
  Na2CO3:{ atoms:['Na','Na','C','O','O','O'], name:'碳酸钠', symbol:'Na₂CO₃', color:'#d0d0ff', stroke:'#7070b0',
        atk:36, range:320, cd:1.8, hp:220, tier:5,
        tags:['splash','salt'], attack:'bullet',
        bulletMode:'splash', splashRadius:120, splashRatio:0.5 },
  K2CO3:{ atoms:['K','K','C','O','O','O'], name:'碳酸钾', symbol:'K₂CO₃', color:'#ffd0c0', stroke:'#a07060',
        atk:38, range:320, cd:1.8, hp:230, tier:5,
        tags:['splash','salt','alkali'], attack:'bullet',
        bulletMode:'splash', splashRadius:120, splashRatio:0.5 },
  NaHCO3:{ atoms:['Na','H','C','O','O','O'], name:'碳酸氢钠', symbol:'NaHCO₃', color:'#e0e0ff', stroke:'#8080c0',
        atk:26, range:300, cd:1.4, hp:180, tier:5,
        tags:['burst','salt'], attack:'bullet',
        bulletMode:'burst', burstCount:2 },
  MgSO4:{ atoms:['Mg','S','O','O','O','O'], name:'硫酸镁', symbol:'MgSO₄', color:'#e8e8f0', stroke:'#9098a0',
        atk:34, range:300, cd:1.6, hp:230, tier:4,
        tags:['bullet','salt'], attack:'bullet' },
  ZnSO4:{ atoms:['Zn','S','O','O','O','O'], name:'硫酸锌', symbol:'ZnSO₄', color:'#d0d8e0', stroke:'#8090a0',
        atk:36, range:300, cd:1.6, hp:240, tier:4,
        tags:['bullet','salt','metal'], attack:'bullet' },
  K2SO4:{ atoms:['K','K','S','O','O','O','O'], name:'硫酸钾', symbol:'K₂SO₄', color:'#ffe0c0', stroke:'#a08060',
        atk:40, range:320, cd:1.8, hp:260, tier:5,
        tags:['bullet','salt'], attack:'bullet' },
  Al2O3:{ atoms:['Al','Al','O','O','O'], name:'氧化铝', symbol:'Al₂O₃', color:'#c0c8d0', stroke:'#7080a0',
        atk:30, range:280, cd:2.0, hp:500, tier:4,
        tags:['bullet','metal'], attack:'bullet',
        reflect:0.30 },
  AlCl3:{ atoms:['Al','Cl','Cl','Cl'], name:'氯化铝', symbol:'AlCl₃', color:'#d0d8e0', stroke:'#708090',
        atk:38, range:280, cd:1.7, hp:200, tier:3,
        tags:['bullet','salt','metal'], attack:'bullet' },
  SiCl4:{ atoms:['Si','Cl','Cl','Cl','Cl'], name:'四氯化硅', symbol:'SiCl₄', color:'#c8d0e0', stroke:'#7080a0',
        atk:40, range:300, cd:1.8, hp:200, tier:4,
        tags:['bullet','halogen','metalloid'], attack:'bullet', bulletEffect:'acid' },
  SiH4:{ atoms:['Si','H','H','H','H'], name:'硅烷', symbol:'SiH₄', color:'#c8d8e8', stroke:'#7088a0',
        atk:44, range:280, cd:2.0, hp:120, tier:3,
        tags:['bullet','flammable','metalloid'], attack:'bullet' },
  PH3:{ atoms:['P','H','H','H'], name:'磷化氢', symbol:'PH₃', color:'#ffd0a0', stroke:'#a07040',
        atk:36, range:280, cd:1.5, hp:130, tier:3,
        tags:['bullet','flammable'], attack:'bullet', bulletEffect:'toxic' },
  P2O5:{ atoms:['P','P','O','O','O','O','O'], name:'五氧化二磷', symbol:'P₂O₅', color:'#ffe0b0', stroke:'#a08060',
        atk:46, range:320, cd:2.0, hp:160, tier:5,
        tags:['splash','acid'], attack:'bullet',
        bulletMode:'splash', splashRadius:100, splashRatio:0.6,
        bulletEffect:'acid' },
  PCl3:{ atoms:['P','Cl','Cl','Cl'], name:'三氯化磷', symbol:'PCl₃', color:'#c8e0b0', stroke:'#508030',
        atk:42, range:300, cd:1.7, hp:160, tier:3,
        tags:['bullet','halogen'], attack:'bullet', bulletEffect:'toxic' },
  CF4:{ atoms:['C','F','F','F','F'], name:'四氟化碳', symbol:'CF₄', color:'#d8ffe0', stroke:'#70a080',
        atk:50, range:320, cd:2.0, hp:140, tier:4,
        tags:['bullet','halogen','nonmetal'], attack:'bullet',
        bulletMode:'splash', splashRadius:80, splashRatio:0.5,
        bulletEffect:'acid' },
  NaF:{ atoms:['Na','F'], name:'氟化钠', symbol:'NaF', color:'#e0ffd0', stroke:'#80b060',
        atk:34, range:280, cd:1.6, hp:160, tier:1,
        tags:['bullet','halogen','salt'], attack:'bullet', bulletEffect:'toxic' },
  AgNO3:{ atoms:['Ag','N','O','O','O'], name:'硝酸银', symbol:'AgNO₃', color:'#e8e8f0', stroke:'#9098a0',
        atk:48, range:320, cd:1.8, hp:170, tier:4,
        tags:['acid','metal','heavy'], attack:'bullet',
        bulletMode:'splash', splashRadius:80, splashRatio:0.5,
        bulletEffect:'acid' },
  K2S:{ atoms:['K','K','S'], name:'硫化钾', symbol:'K₂S', color:'#ffe0b0', stroke:'#a08040',
        atk:30, range:260, cd:1.7, hp:180, tier:2,
        tags:['bullet','salt'], attack:'bullet', bulletEffect:'toxic' },
  Ag2S:{ atoms:['Ag','Ag','S'], name:'硫化银', symbol:'Ag₂S', color:'#a0a0a8', stroke:'#505058',
        atk:42, range:280, cd:1.8, hp:190, tier:2,
        tags:['bullet','metal','heavy'], attack:'bullet', bulletEffect:'toxic' },
  C6H6:{ atoms:['C','C','C','C','C','C','H','H','H','H','H','H'], name:'苯', symbol:'C₆H₆', color:'#e8c060', stroke:'#a08030',
        atk:34, range:320, cd:1.6, hp:180, tier:6,
        tags:['burst','flammable'], attack:'bullet',
        bulletMode:'burst', burstCount:3 },
};

const SPECIAL_REACTIONS = [
  { a:'Na', b:'H2O',  damage:250, radius:460, hint:'Na + H₂O → 爆炸', keep:'H2O' },
  { a:'Na', b:'H2O2', damage:300, radius:500, hint:'Na + H₂O₂ → 剧烈爆炸', keep:'H2O2' },
  { a:'K',  b:'H2O',  damage:320, radius:520, hint:'K + H₂O → 剧烈爆炸', keep:'H2O' },
  { a:'K',  b:'H2O2', damage:380, radius:560, hint:'K + H₂O₂ → 大爆炸', keep:'H2O2' },
  { a:'Ca', b:'H2O',  damage:200, radius:400, hint:'Ca + H₂O → 反应', keep:'H2O' },
  { a:'Mg', b:'H2O',  damage:180, radius:360, hint:'Mg + H₂O → 反应', keep:'H2O' },
  { a:'Cl2',b:'H2O',  damage:180, radius:360, hint:'Cl₂ + H₂O → 反应', keep:'H2O' },
  { a:'F2', b:'H2O',  damage:280, radius:480, hint:'F₂ + H₂O → 剧烈反应', keep:'H2O' },
  { a:'F2', b:'H2',   damage:400, radius:520, hint:'F₂ + H₂ → 爆炸', keep:'HF' },
  { a:'Na', b:'Cl2',  damage:260, radius:440, hint:'Na + Cl₂ → 反应', keep:'NaCl' },
];

const ENEMY_TYPES = {
  basic: { name:'游荡体', hp: 25,  speed: 55, damage: 20,  radius: 26, color:'#ff5a5a', attackInterval: 1.0, score: 10,  gold: 6 },
  fast:  { name:'疾行体', hp: 15,  speed:110, damage: 12,  radius: 22, color:'#ffaa3a', attackInterval: 0.7, score: 15,  gold: 8 },
  tank:  { name:'重壳体', hp: 80,  speed: 35, damage: 40,  radius: 34, color:'#a06bd0', attackInterval: 1.5, score: 30,  gold: 15 },
  boss:  { name:'核心体', hp:400,  speed: 25, damage:100,  radius: 55, color:'#ff3060', attackInterval: 2.0, score: 200, gold: 80 },
};

const STAGE_HP_GROWTH = 0.22;
const STAGE_DMG_GROWTH = 0.15;
const STAGE_SPD_GROWTH = 0.02;