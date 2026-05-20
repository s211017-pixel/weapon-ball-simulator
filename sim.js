const fs = require('fs');
const vm = require('vm');

const appPath = './js/app.js';
const rosterPath = './js/roster.js';

const appCode = fs.readFileSync(appPath, 'utf-8');
const rosterCode = fs.readFileSync(rosterPath, 'utf-8');

const engineCodeStr = appCode.split('\n').slice(73, 194).join('\n');

const sandbox = {
  Math: Math, Date: Date, console: console,
  DT: 1/60, BASE_SPEED: 320, BALL_RADIUS: 35,
  distance: (x1, y1, x2, y2) => Math.hypot(x2-x1, y2-y1),
  normalize: (vx, vy) => { const l = Math.hypot(vx, vy); return l===0 ? {x:0, y:0} : {x:vx/l, y:vy/l}; },
  sTxt: (e, x, y, text, color, dy=-30, maxL=1) => {},
  cloneProjs: arr => arr.map(p => { const c={...p}; if(p.hitSet) c.hitSet=new Set(p.hitSet); if(p.hitCooldowns) c.hitCooldowns={...p.hitCooldowns}; if(p.physCooldowns) c.physCooldowns={...p.physCooldowns}; return c; }),
  cloneBalls: arr => arr.map(b => { const c={...b, statuses:b.statuses.map(s=>({...s}))}; if(b.walls) c.walls=b.walls.map(w=>({...w})); if(b.hermesList) c.hermesList=[...b.hermesList]; if(b.hephaestusList) c.hephaestusList=[...b.hephaestusList]; if(b.zeusList) c.zeusList=[...b.zeusList]; if(b.doomHeal) c.doomHeal={...b.doomHeal}; c.snapshot=null; return c; }),
  PI: Math.PI, cos: Math.cos, sin: Math.sin, random: Math.random, floor: Math.floor, max: Math.max, min: Math.min, hypot: Math.hypot, atan2: Math.atan2, abs: Math.abs, sign: Math.sign
};

vm.createContext(sandbox);
vm.runInContext(rosterCode + '\nthis.ROSTER = ROSTER;', sandbox);

const factoryCode = "function simulateMatch(id1, id2) {\n" +
  "const gameMode = 'ffa';\n" +
  "const scene = 'default';\n" +
  "const testType = null;\n" +
  "const soundRef = { current: { play:()=>{}, playProjectile:()=>{}, playWave:()=>{}, playObstacle:()=>{}, playStatus:()=>{} } };\n" +
  engineCodeStr + "\n" +
  "engine.init = () => {\n" +
    "engine.balls=[]; engine.projectiles=[]; engine.waves=[]; engine.particles=[]; engine.obstacles=[]; engine.time=engine.healthPackTimer=engine.globalLostHp=0;\n" +
    "engine.balls.push(engine.createBall(ROSTER[id1], 'p1', 'p1_m', true, 100, engine.arenaSize*.25, engine.arenaSize/2));\n" +
    "engine.balls.push(engine.createBall(ROSTER[id2], 'p2', 'p2_m', true, 100, engine.arenaSize*.75, engine.arenaSize/2));\n" +
    "engine.timeLimit = 120;\n" +
  "};\n" +
  "engine.init();\n" +
  "const _update = engine.update;\n" +
  "engine.update = () => {\n" +
    "if ((engine.timeLimit -= DT) <= 0) {\n" +
       "const p1 = engine.balls.find(b=>b.team==='p1'&&b.isMain);\n" +
       "const p2 = engine.balls.find(b=>b.team==='p2'&&b.isMain);\n" +
       "if (!p1 || !p2) return 'draw';\n" +
       "return p1.hp > p2.hp ? 'p1' : (p2.hp > p1.hp ? 'p2' : 'draw');\n" +
    "}\n" +
    "return _update();\n" +
  "};\n" +
  "let res = null;\n" +
  "let ticks = 0;\n" +
  "while (!res && ticks < 120 * 60 * 2) {\n" +
    "try {\n" +
        "res = engine.update();\n" +
    "} catch(e) {\n" +
        "return { winner: 'draw', time: engine.time };\n" +
    "}\n" +
    "ticks++;\n" +
  "}\n" +
  "return { winner: res || 'draw', time: engine.time };\n" +
"}";

vm.runInContext(factoryCode, sandbox);

const simulateMatch = sandbox.simulateMatch;
const ROSTER = sandbox.ROSTER;
const validIds = Object.keys(ROSTER).filter(k => 
  !['dummy','fanatic_fan','endless_minion','chess_piece','quzhe_phantom'].includes(k)
);

const results = {};
validIds.forEach(id => {
  results[id] = { wins: 0, losses: 0, draws: 0, timeToWin: 0, name: ROSTER[id].name };
});

const NUM_MATCHES = 10;
console.log("Running " + validIds.length + " characters round-robin tournament (" + NUM_MATCHES + " matches per pair)...");

for (let i = 0; i < validIds.length; i++) {
  for (let j = i + 1; j < validIds.length; j++) {
    const id1 = validIds[i];
    const id2 = validIds[j];
    
    for (let m = 0; m < NUM_MATCHES; m++) {
      const p1Id = m % 2 === 0 ? id1 : id2;
      const p2Id = m % 2 === 0 ? id2 : id1;
      const matchRes = simulateMatch(p1Id, p2Id);
      
      let winnerId = null;
      if (matchRes.winner === 'p1') winnerId = p1Id;
      else if (matchRes.winner === 'p2') winnerId = p2Id;
      
      if (winnerId === id1) {
         results[id1].wins++; results[id2].losses++;
         results[id1].timeToWin += matchRes.time;
      } else if (winnerId === id2) {
         results[id2].wins++; results[id1].losses++;
         results[id2].timeToWin += matchRes.time;
      } else {
         results[id1].draws++; results[id2].draws++;
      }
    }
  }
}

const totalMatchesPerChar = (validIds.length - 1) * NUM_MATCHES;
validIds.forEach(id => {
  results[id].winRate = (results[id].wins / totalMatchesPerChar * 100);
  results[id].avgTimeToWin = results[id].wins > 0 ? (results[id].timeToWin / results[id].wins) : 0;
});

validIds.sort((a,b) => results[b].winRate - results[a].winRate);

console.log("\n=== 綜合強度梯度表 ===");
validIds.forEach(id => {
  console.log(results[id].name + " (" + id + "): 勝率 " + results[id].winRate.toFixed(1) + "% (" + results[id].wins + "W " + results[id].losses + "L " + results[id].draws + "D) 平均獲勝時間: " + results[id].avgTimeToWin.toFixed(1) + "s");
});
