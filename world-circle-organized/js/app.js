const CharacterOptions = () => (
  <React.Fragment>
            <optgroup label="命定之錨">{Object.values(ROSTER).filter(c => c.faction === 'AnchorOfDestiny').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
            <optgroup label="神性大教堂">{Object.values(ROSTER).filter(c => c.faction === 'DivineCathedral').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
            <optgroup label="時間總局 (主任)">{Object.values(ROSTER).filter(c => c.faction === 'TimeAdmin').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
            <optgroup label="永滅故事集委員會">{Object.values(ROSTER).filter(c => c.faction === 'StorybookCommittee' && c.id !== 'dummy').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
            <optgroup label="明日公司">{Object.values(ROSTER).filter(c => c.faction === 'TomorrowCompany' && c.id !== 'fanatic_fan').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
          </React.Fragment>
  );
// App state, rendering, and match flow.
function App() {
          const canvasRef = useRef(null);
          const [gameState, setGameState] = useState('menu'); 
          const [gameMode, setGameMode] = useState('ffa'); 
          const [scene, setScene] = useState('default');
          const [testType, setTestType] = useState('dummy');
          
          const [ffaCount, setFfaCount] = useState(2);
          const [ffaIds, setFfaIds] = useState(['kongmie', 'topiharin', 'grimm', 'eli', 'fasimir']);
          const [ffaLocks, setFfaLocks] = useState([false, false, false, false, false]);


          const [p1Ids, setP1Ids] = useState(['kongmie', 'topiharin', 'grimm', 'eli']);
          const [p2Ids, setP2Ids] = useState(['fasimir', 'anonymous', 'creator']);


          const [p1Locks, setP1Locks] = useState([false, false, false, false]);
          const [p2Locks, setP2Locks] = useState([false, false, false, false]);
          
          const [isPaused, setIsPaused] = useState(false);
          const isPausedRef = useRef(false);
          const [gameSpeed, setGameSpeed] = useState(1);
          const speedRef = useRef(1);
          
          const [uiStats, setUiStats] = useState({ p1: [], p2: [] });
          const [winner, setWinner] = useState(null);


          const engineRef = useRef(null);


          const togglePause = () => { isPausedRef.current = !isPausedRef.current; setIsPaused(isPausedRef.current); };
          const toggleSpeed = () => { const nextSpeed = gameSpeed === 1 ? 2 : 1; setGameSpeed(nextSpeed); speedRef.current = nextSpeed; };
          const goToMenu = () => { setGameState('menu'); setIsPaused(false); isPausedRef.current = false; setGameSpeed(1); speedRef.current = 1; setWinner(null); };


          const triggerIntervention = (type) => {
              const engine = engineRef.current;
              if (!engine) return;
              
              switch(type) {
                  case 'heal':
                      for(let i=0; i<3; i++) engine.spawnObstacle({ type: 'sacrament', x: 50 + Math.random() * (engine.arenaSize - 100), y: 50 + Math.random() * (engine.arenaSize - 100), radius: 12, color: '#FBBF24', lifespan: 10, ownerId: 'god' });
                      engine.spawnParticle({ type: 'text', x: engine.arenaSize/2, y: engine.arenaSize/2, text: '✨ 天降聖餐', color: '#FBBF24', maxLifespan: 2 });
                      break;
                  case 'bomb':
                      for(let i=0; i<6; i++) {
                          engine.spawnProjectile({
                              type: 'bomb', x: 50 + Math.random() * (engine.arenaSize - 100), y: 50 + Math.random() * (engine.arenaSize - 100),
                              vx: 0, vy: 0, radius: 14, color: '#DC143C', ownerId: 'god', damage: 0, bounces: 0, lifespan: 0.5 + Math.random() * 1.5, 
                              onDeath: (proj, eng) => eng.spawnObstacle({ type: 'damage_field', x: proj.x, y: proj.y, radius: 120, color: 'rgba(220, 20, 60, 0.2)', ownerId: 'god', team: 'none', lifespan: 4 })
                          });
                      }
                      engine.spawnParticle({ type: 'text', x: engine.arenaSize/2, y: engine.arenaSize/2, text: '☄️ 天降火雨', color: '#DC143C', maxLifespan: 2 });
                      break;
                  case 'chaos':
                      engine.balls.forEach(b => { if (b.hp > 0 && !b.isBlank) { b.vx = (Math.random() - 0.5) * 2000; b.vy = (Math.random() - 0.5) * 2000; engine.applyStatus(b.uniqueId, 'knockback', { duration: 1.5, sourceId: 'god' }); } });
                      engine.spawnParticle({ type: 'text', x: engine.arenaSize/2, y: engine.arenaSize/2, text: '🌀 混亂風暴', color: '#8B5CF6', maxLifespan: 2 });
                      break;
                  case 'stun':
                      engine.balls.forEach(b => { if (b.hp > 0 && !b.isBlank) engine.applyStatus(b.uniqueId, 'stun', { duration: 2.5 }); });
                      engine.spawnParticle({ type: 'text', x: engine.arenaSize/2, y: engine.arenaSize/2, text: '⏳ 時間凍結', color: '#FCD34D', maxLifespan: 2 });
                      break;
                  case 'rule_damage':
                      engine.globalDamageMultiplier = engine.globalDamageMultiplier === 2 ? 1 : 2;
                      engine.spawnParticle({ type: 'text', x: engine.arenaSize/2, y: engine.arenaSize/2, text: engine.globalDamageMultiplier === 2 ? '⚔️ 死鬥法則：開啟 (200% 傷害)' : '🛡️ 死鬥法則：關閉 (正常傷害)', color: '#EF4444', maxLifespan: 2 });
                      break;
              }
          };


          const startGame = () => {
            const engine = {
              arenaSize: (gameMode === '3v3' || gameMode === '1v4') ? 900 : 600,
              scene: gameMode === '3v3' ? scene : 'default',
              balls: [], projectiles: [], waves: [], particles: [], obstacles: [], time: 0, timeLimit: null, healthPackTimer: 0,
              globalDamageMultiplier: 1, globalLostHp: 0,
              applyRandomPodoasgEffect: (target, sourceId, nx = 0, ny = 0, mult = 1) => {
                  const effects = ['stun', 'slow', 'rooted', 'burn', 'knockback', 'warning', 'silenced', 'vulnerable', 'damage'];
                  const effect = effects[Math.floor(Math.random() * effects.length)];
                  if (effect === 'stun') { engine.applyStatus(target.uniqueId, 'stun', { duration: 3 * mult }); engine.spawnParticle({ type: 'text', x: target.x, y: target.y - 30, text: '💫 暈眩', color: '#FCD34D' }); }
                  else if (effect === 'slow') { engine.applyStatus(target.uniqueId, 'slow', { duration: 3 * mult }); engine.spawnParticle({ type: 'text', x: target.x, y: target.y - 30, text: '🐌 緩速', color: '#3B82F6' }); }
                  else if (effect === 'rooted') { engine.applyStatus(target.uniqueId, 'rooted', { duration: 3 * mult }); engine.spawnParticle({ type: 'text', x: target.x, y: target.y - 30, text: '⛓️ 禁錮', color: '#4ADE80' }); }
                  else if (effect === 'burn') { engine.applyStatus(target.uniqueId, 'burn', { duration: 3 * mult, dps: 5 * mult, sourceId: sourceId }); engine.spawnParticle({ type: 'text', x: target.x, y: target.y - 30, text: '🔥 燃燒', color: '#EF4444' }); }
                  else if (effect === 'knockback') { engine.applyStatus(target.uniqueId, 'knockback', { duration: 3, sourceId: sourceId }); target.vx += nx * 800 * mult; target.vy += ny * 800 * mult; engine.spawnParticle({ type: 'text', x: target.x, y: target.y - 30, text: '💨 擊退', color: '#94A3B8' }); }
                  else if (effect === 'warning') { engine.applyStatus(target.uniqueId, 'warning', { duration: 3 * mult }); engine.spawnParticle({ type: 'text', x: target.x, y: target.y - 30, text: '⚠️ 警告', color: '#FF00FF' }); }
                  else if (effect === 'silenced') { engine.applyStatus(target.uniqueId, 'silenced', { duration: 3 * mult }); engine.spawnParticle({ type: 'text', x: target.x, y: target.y - 30, text: '🔇 沉默', color: '#9333EA' }); }
                  else if (effect === 'vulnerable') { engine.applyStatus(target.uniqueId, 'vulnerable', { duration: 3 * mult }); engine.spawnParticle({ type: 'text', x: target.x, y: target.y - 30, text: '💔 易傷', color: '#EF4444' }); }
                  else if (effect === 'damage') { engine.applyDamage(target, 10 * mult, sourceId, 'magic'); engine.spawnParticle({ type: 'text', x: target.x, y: target.y - 30, text: '💥 傷害', color: '#EF4444' }); }
              },
              spawnProjectile: (p) => { engine.projectiles.push(p); },
              spawnWave: (w) => { w.currentRadius = w.startRadius || 0; w.hitSet = new Set(); w.lingerTimer = 0; engine.waves.push(w); },
              spawnParticle: (p) => { engine.particles.push({ ...p, lifespan: p.maxLifespan || 1.5, maxLifespan: p.maxLifespan || 1.5 }); },
              spawnObstacle: (o) => { engine.obstacles.push(o); },
              applyHeal: (targetBall, amount) => {
                 if (targetBall.hp <= 0 || targetBall.isBlank) return;
                 const actualHeal = Math.min(targetBall.maxHp - targetBall.hp, amount);
                 if (actualHeal <= 0) return;
                 
                 targetBall.hp += actualHeal;
                 targetBall._healAccumulator = (targetBall._healAccumulator || 0) + actualHeal;
                 if (targetBall._healAccumulator >= 1) {
                     const showHeal = Math.floor(targetBall._healAccumulator);
                     engine.spawnParticle({
                         type: 'floating_number', x: targetBall.x + (Math.random() - 0.5) * 20, y: targetBall.y - targetBall.radius,
                         text: `+${showHeal}`, color: '#10B981', vx: (Math.random() - 0.5) * 40, vy: -80 - Math.random() * 40, lifespan: 0.8, maxLifespan: 0.8
                     });
                     targetBall._healAccumulator -= showHeal;
                 }
              },
              applyDamage: (targetBall, amount, sourceId, damageType = 'normal') => {
                 if (targetBall.hp <= 0) return 0; 
                 
                 const shieldIndex = targetBall.statuses.findIndex(s => s.type === 'shield');
                 if (shieldIndex !== -1 && damageType !== 'burn' && damageType !== 'dot') {
                     targetBall.statuses.splice(shieldIndex, 1);
                     engine.spawnParticle({ type: 'text', x: targetBall.x, y: targetBall.y - 25, text: '🛡️ 免疫', color: '#CBD5E1' });
                     return 0; 
                 }


                 let finalDmg = amount * engine.globalDamageMultiplier;
                 if (targetBall.statuses) {
                     if (targetBall.statuses.some(s => s.type === 'vulnerable')) finalDmg *= 1.2;
                     if (targetBall.statuses.some(s => s.type === 'shield_dr')) finalDmg *= 0.8;
                 }


                 if (targetBall.onTakeDamage) finalDmg = targetBall.onTakeDamage(targetBall, finalDmg, sourceId, engine, damageType);
                 finalDmg = Math.max(0, finalDmg);
                 
                 const actualHpLoss = Math.min(targetBall.hp, finalDmg);
                 engine.globalLostHp = (engine.globalLostHp || 0) + actualHpLoss;


                 targetBall._dmgAccumulator = (targetBall._dmgAccumulator || 0) + finalDmg;
                 if (targetBall._dmgAccumulator >= 1) {
                     const showDmg = Math.floor(targetBall._dmgAccumulator);
                     engine.spawnParticle({
                         type: 'floating_number', x: targetBall.x + (Math.random() - 0.5) * 20, y: targetBall.y - targetBall.radius,
                         text: `-${showDmg}`, color: '#EF4444', vx: (Math.random() - 0.5) * 40, vy: -80 - Math.random() * 40, lifespan: 0.8, maxLifespan: 0.8
                     });
                     targetBall._dmgAccumulator -= showDmg;
                 }
                 
                 if (['collision', 'wall_collision', 'projectile'].includes(damageType) && finalDmg > 0) {
                     engine.applyStatus(targetBall.uniqueId, 'hitstop', { duration: 0.08 });
                 }


                 if (targetBall.hp - finalDmg <= 0 && (targetBall.id === 'kongmie' || targetBall.copied === 'kongmie') && targetBall.act === 1) {
                     targetBall.hp = targetBall.maxHp; targetBall.act = 2; targetBall.path = 'A'; targetBall.waveTimer = 0;
                     engine.spawnParticle({ type: 'text', x: targetBall.x, y: targetBall.y - 40, text: '第二幕·見那狂風驟雨', color: '#3B82F6' });
                     return 0; 
                 }


                 if (targetBall.hp - finalDmg <= 0 && (targetBall.id === 'melis' || targetBall.copied === 'melis') && !targetBall.hasRevived) {
                     const healAmt = Math.max(1, (targetBall.damageDealt || 0) / 3);
                     targetBall.hp = 0.1; 
                     engine.applyHeal(targetBall, healAmt);
                     targetBall.hasRevived = true;
                     engine.spawnParticle({ type: 'text', x: targetBall.x, y: targetBall.y - 30, text: `🔥浴火重生`, color: '#FF6B35' });
                     
                     engine.spawnWave({
                         x: targetBall.x, y: targetBall.y, startRadius: targetBall.radius, maxRadius: 450,
                         speed: 700, color: 'rgba(255, 69, 0, 0.6)', ownerId: targetBall.uniqueId, lingerDuration: 0.1, deflectsProjectiles: false,
                         onHit: (t) => {
                             if (engine.isEnemy(t.uniqueId, targetBall.uniqueId)) {
                                 const burnStatus = t.statuses?.find(s => s.type === 'burn');
                                 if (burnStatus && burnStatus.timer < burnStatus.duration) {
                                     const burstDmg = burnStatus.dps * (burnStatus.duration - burnStatus.timer);
                                     engine.applyDamage(t, burstDmg, targetBall.uniqueId, 'magic');
                                     engine.spawnParticle({ type: 'text', x: t.x, y: t.y - 30, text: `💥 引爆!`, color: '#FF4500' });
                                 }
                                 engine.applyStatus(t.uniqueId, 'burn', { duration: 3, dps: targetBall.burnDamage, sourceId: targetBall.uniqueId });
                                 targetBall.burnDamage += 0.4 * (targetBall.noGrowth ? 0 : 1);
                                 targetBall.scalingValue = `燃燒秒傷: ${targetBall.burnDamage.toFixed(1)}`;
                             }
                         }
                     });
                     return 0; 
                 }


                 if (targetBall.hp - finalDmg <= 0 && engine.scene === 'court' && engine.judgeId === targetBall.uniqueId) {
                     engine.judgeId = null;
                     engine.plaintiffTeam = null;
                     engine.spawnObstacle({
                         type: 'gavel', x: targetBall.x, y: targetBall.y, radius: 25, color: '#A8A29E', lifespan: 99999
                     });
                     engine.spawnParticle({ type: 'text', x: targetBall.x, y: targetBall.y - 40, text: '⚖️ 法槌掉落！', color: '#D6D3D1' });
                 }


                 targetBall.hp -= finalDmg;


                 if (sourceId && finalDmg > 0) {
                     const sourceBall = engine.balls.find(b => b.uniqueId === sourceId);
                     let actualSource = sourceBall;
                     if (sourceBall && sourceBall.summonerId) actualSource = engine.balls.find(b => b.uniqueId === sourceBall.summonerId) || sourceBall;
                     if (actualSource) actualSource.damageDealt = (actualSource.damageDealt || 0) + finalDmg;
                 }
                 return finalDmg;
              },
              applyStatus: (targetId, type, data) => {
                const target = engine.balls.find(b => b.uniqueId === targetId);
                if (target) {
                  if (!target.statuses) target.statuses = [];
                  const existing = target.statuses.find(s => s.type === type);
                  if (existing) {
                     existing.duration = data.duration; existing.timer = 0; 
                     if(data.dps) existing.dps = data.dps; if(data.dx) existing.dx = data.dx; if(data.dy) existing.dy = data.dy;
                     if(data.sourceId) existing.sourceId = data.sourceId;
                  } else { target.statuses.push({ ...data, type, timer: 0 }); }
                }
              },
              isEnemy: (id1, id2) => {
                 const b1 = engine.balls.find(b => b.uniqueId === id1);
                 const b2 = engine.balls.find(b => b.uniqueId === id2);
                 if (!b1 || !b2) return true;
                 return b1.team !== b2.team;
              },
              getNearestEnemy: (sourceBall) => {
                 let nearest = null; let minDist = Infinity;
                 engine.balls.forEach(b => {
                     if (b.hp <= 0 || b.isUntargetable) return; 
                     if (engine.isEnemy(b.uniqueId, sourceBall.uniqueId) && !b.isBlank) {
                         const d = distance(b.x, b.y, sourceBall.x, sourceBall.y);
                         if (d < minDist) { minDist = d; nearest = b; }
                     }
                 });
                 return nearest;
              },
              createBall: (template, team, uniqueId, isMain = false, maxHp = 100, x, y) => {
                const b = {
                  ...template, uniqueId: uniqueId, team: team, isMain: isMain, hp: maxHp, maxHp: maxHp, baseMaxHp: maxHp, erodedMaxHp: 0,
                  x: x, y: y, vx: (Math.random() - 0.5) * BASE_SPEED, vy: (Math.random() - 0.5) * BASE_SPEED,
                  radius: BALL_RADIUS * (template.radiusMult || 1), statuses: [], damageDealt: 0
                };
                if (b.initLogic) b.initLogic(b);
                
                ['birdTimer', 'bellTimer', 'pageTimer', 'skillTimer', 'musicTimer', 'wordTimer', 'daggerTimer', 'beamTimer', 'photoTimer', 'coreTimer', 'sacramentTimer', 'creatorTimer'].forEach(key => {
                    if (b[key] !== undefined && typeof b[key] === 'number') b[key] -= Math.random() * 1.5;
                });
                
                return b;
              },
              init: () => {
                engine.balls = []; engine.projectiles = []; engine.waves = []; engine.particles = []; engine.obstacles = []; engine.time = 0; engine.healthPackTimer = 0;
                engine.globalLostHp = 0;


                if (engine.scene === 'court') {
                    engine.judgeId = null;
                    engine.plaintiffTeam = null;
                    engine.spawnObstacle({
                        type: 'gavel', x: engine.arenaSize / 2, y: engine.arenaSize / 2, radius: 25, color: '#A8A29E', lifespan: 99999
                    });
                }


                if (gameMode === 'ffa') {
                    for (let i = 0; i < ffaCount; i++) {
                        const angle = i * (Math.PI * 2 / ffaCount) - Math.PI / 2;
                        const r = engine.arenaSize * 0.35;
                        const cx = engine.arenaSize / 2 + Math.cos(angle) * r;
                        const cy = engine.arenaSize / 2 + Math.sin(angle) * r;
                        engine.balls.push(engine.createBall(ROSTER[ffaIds[i]], `p${i+1}`, `p${i+1}_main`, true, 100, cx, cy));
                    }
                } else if (gameMode === 'intervention') {
                    engine.balls.push(engine.createBall(ROSTER[p1Ids[0]], 'p1', 'p1_main', true, 100, engine.arenaSize * 0.25, engine.arenaSize / 2));
                    engine.balls.push(engine.createBall(ROSTER[p2Ids[0]], 'p2', 'p2_main', true, 100, engine.arenaSize * 0.75, engine.arenaSize / 2));
                } else if (gameMode === '3v3') {
                    p1Ids.slice(0, 3).forEach((id, i) => engine.balls.push(engine.createBall(ROSTER[id], 'p1', `p1_main_${i}`, true, 500, engine.arenaSize * 0.2, engine.arenaSize * (0.25 + i * 0.25))));
                    p2Ids.slice(0, 3).forEach((id, i) => engine.balls.push(engine.createBall(ROSTER[id], 'p2', `p2_main_${i}`, true, 500, engine.arenaSize * 0.8, engine.arenaSize * (0.25 + i * 0.25))));
                } else if (gameMode === '1v4') {
                    p1Ids.slice(0, 4).forEach((id, i) => engine.balls.push(engine.createBall(ROSTER[id], 'p1', `p1_main_${i}`, true, 250, engine.arenaSize * 0.2, engine.arenaSize * (0.2 + i * 0.2))));
                    const boss = engine.createBall(ROSTER[p2Ids[0]], 'p2', 'p2_boss', true, 5000, engine.arenaSize * 0.8, engine.arenaSize / 2);
                    boss.radiusMult = (ROSTER[p2Ids[0]].radiusMult || 1) * 3;
                    boss.radius = BALL_RADIUS * boss.radiusMult;
                    boss.mass = (ROSTER[p2Ids[0]].mass || 1) * 10;
                    boss.isBoss = true;
                    engine.balls.push(boss);
                } else if (gameMode === 'test') { 
                    engine.dpsRecords = [];
                    engine.lastRecordTime = 0;
                    if (testType === 'dummy') {
                        engine.timeLimit = 120;
                        engine.balls.push(engine.createBall(ROSTER[p1Ids[0]], 'p1', 'p1_main', true, 100, engine.arenaSize * 0.25, engine.arenaSize / 2));
                        engine.balls.push(engine.createBall(ROSTER['dummy'], 'p2', 'p2_main', true, 5000, engine.arenaSize * 0.75, engine.arenaSize / 2));
                    } else if (testType === 'endless') {
                        engine.endlessWave = 1;
                        engine.balls.push(engine.createBall(ROSTER[p1Ids[0]], 'p1', 'p1_main', true, 100, engine.arenaSize * 0.25, engine.arenaSize / 2));
                        engine.balls.push(engine.createBall(ROSTER['endless_minion'], 'p2', `endless_1`, true, 1, engine.arenaSize / 2, 60));
                    }
                }
              },
              update: () => {
                engine.time += DT;
                
                if (gameMode === 'test') {
                    if (testType === 'dummy' && engine.timeLimit !== null) {
                        engine.timeLimit -= DT;
                        if (engine.timeLimit <= 0) return 'p2'; 
                    }
                    if (engine.time - engine.lastRecordTime >= 30) {
                        engine.lastRecordTime += 30;
                        const p1 = engine.balls.find(b => b.team === 'p1' && b.isMain);
                        if (p1) {
                            const currentDps = ((p1.damageDealt || 0) / engine.time).toFixed(1);
                            engine.dpsRecords.push({ time: engine.lastRecordTime, dps: currentDps });
                            engine.spawnParticle({ type: 'text', x: engine.arenaSize/2, y: engine.arenaSize/4, text: `${engine.lastRecordTime}s 紀錄: ${currentDps} DPS`, color: '#FCD34D', maxLifespan: 3 });
                        }
                    }
                }
                
                if (gameMode === 'test' && testType === 'endless') {
                    const enemies = engine.balls.filter(b => b.team === 'p2' && b.hp > 0);
                    if (enemies.length === 0) {
                        engine.endlessWave++;
                        engine.balls = engine.balls.filter(b => b.team !== 'p2');
                        const minion = engine.createBall(ROSTER['endless_minion'], 'p2', `endless_${engine.endlessWave}`, true, engine.endlessWave, engine.arenaSize / 2, 60);
                        engine.balls.push(minion);
                    }
                }
                
                engine.healthPackTimer += DT;
                if (engine.healthPackTimer >= 30) {
                    engine.healthPackTimer = 0;
                    engine.spawnObstacle({ type: 'health_pack', x: 50 + Math.random() * (engine.arenaSize - 100), y: 50 + Math.random() * (engine.arenaSize - 100), radius: 15, color: '#10B981', lifespan: 14 });
                }


                // 在每幀開始前重置標記
                engine.balls.forEach(ball => {
                    ball.inQuzheDomain = false;
                    if (ball.baseMaxHp === undefined) ball.baseMaxHp = ball.maxHp;
                    if (ball.erodedMaxHp === undefined) ball.erodedMaxHp = 0;
                    if (ball.portalCooldown !== undefined && ball.portalCooldown > 0) ball.portalCooldown -= DT;
                });


                engine.balls.forEach(ball => {
                  if (ball.hp <= 0) return; 


                  const activeStatuses = new Set((ball.statuses || []).map(s => s.type));
                  const isHitstopped = activeStatuses.has('hitstop');


                  if (!isHitstopped) {
                      ball.x += ball.vx * DT; 
                      ball.y += ball.vy * DT;
                  }


                  let bouncedWall = false;
                  let impactSpeed = 0;


                  if (ball.wallWrap) {
                      let wrapped = false;
                      const oldX = ball.x, oldY = ball.y;
                      
                      if (ball.x - ball.radius < 0) { ball.x = engine.arenaSize - ball.radius - 1; wrapped = true; }
                      else if (ball.x + ball.radius > engine.arenaSize) { ball.x = ball.radius + 1; wrapped = true; }
                      
                      if (ball.y - ball.radius < 0) { ball.y = engine.arenaSize - ball.radius - 1; wrapped = true; }
                      else if (ball.y + ball.radius > engine.arenaSize) { ball.y = ball.radius + 1; wrapped = true; }
                      
                      if (wrapped && !isHitstopped && ball.onWallBounce) {
                          ball.onWallBounce(ball, engine, oldX, oldY);
                      }
                  } else {
                      if (ball.x - ball.radius < 0) { ball.x = ball.radius; impactSpeed = Math.abs(ball.vx); ball.vx *= -1; bouncedWall = true; }
                      else if (ball.x + ball.radius > engine.arenaSize) { ball.x = engine.arenaSize - ball.radius; impactSpeed = Math.abs(ball.vx); ball.vx *= -1; bouncedWall = true; }
                      
                      if (ball.y - ball.radius < 0) { ball.y = ball.radius; impactSpeed = Math.max(impactSpeed, Math.abs(ball.vy)); ball.vy *= -1; bouncedWall = true; }
                      else if (ball.y + ball.radius > engine.arenaSize) { ball.y = engine.arenaSize - ball.radius; impactSpeed = Math.max(impactSpeed, Math.abs(ball.vy)); ball.vy *= -1; bouncedWall = true; }


                      if (bouncedWall && !isHitstopped) {
                          if (ball.onWallBounce) ball.onWallBounce(ball, engine);
                          
                          engine.balls.forEach(tb => {
                              if (tb.hp > 0 && tb.currentPhase === 4 && (tb.id === 'topiharin' || tb.copied === 'topiharin') && engine.isEnemy(ball.uniqueId, tb.uniqueId) && !ball.isBlank) {
                                  engine.spawnWave({
                                      x: ball.x, y: ball.y, startRadius: 0, maxRadius: 150,
                                      speed: 600, color: 'rgba(255, 20, 147, 0.4)', ownerId: tb.uniqueId, lingerDuration: 0.1, deflectsProjectiles: false,
                                      onHit: (t) => { if (engine.isEnemy(t.uniqueId, tb.uniqueId)) engine.applyDamage(t, 10, tb.uniqueId, 'magic'); }
                                  });
                              }
                          });


                          const kbStatus = ball.statuses?.find(s => s.type === 'knockback');
                          const threshold = BASE_SPEED + 200; 
                          if (kbStatus && impactSpeed > threshold) {
                              const excessSpeed = impactSpeed - threshold;
                              let dmg = Math.pow(excessSpeed, 0.7) * 0.45; 
                              const maxWallDmg = ball.maxHp * 0.35; 
                              if (dmg > maxWallDmg) dmg = maxWallDmg;
                              
                              engine.applyDamage(ball, dmg, kbStatus.sourceId, 'wall_collision');
                              ball.statuses = ball.statuses.filter(s => s.type !== 'knockback');
                          }
                      }
                  }


                  if (ball.statuses) {
                    let currentSpeedMult = 1;
                    ball.statuses.forEach(s => {
                      s.timer += DT;
                      if (s.type === 'burn' && s.dps) engine.applyDamage(ball, s.dps * DT, s.sourceId, 'burn');
                      if (s.type === 'slow') currentSpeedMult = 0.5; 
                      if (s.type === 'haste') currentSpeedMult *= 1.5; 
                      if (s.type === 'haste_double') currentSpeedMult *= 2.0; 
                      if (s.type === 'stun') currentSpeedMult = 0.05; 
                      if (s.type === 'rooted' || s.type === 'hitstop') currentSpeedMult = 0; 
                      if (s.type === 'regen') engine.applyHeal(ball, 5 * DT); 
                      if (s.type === 'regen_small') engine.applyHeal(ball, 3.75 * DT); 
                      if (s.type === 'bell_shock' && !isHitstopped) { ball.vx += s.dx * 600 * DT; ball.vy += s.dy * 600 * DT; }
                    });
                    
                    if (!isHitstopped) { 
                        const targetSpeed = BASE_SPEED * (ball.speedMult || 1) * currentSpeedMult;
                        const currentSpeed = Math.hypot(ball.vx, ball.vy);
                        if (currentSpeed > 0) {
                           const lerpFactor = currentSpeed > targetSpeed ? 0.015 : 0.05;
                           const newSpeed = currentSpeed * (1 - lerpFactor) + targetSpeed * lerpFactor;
                           ball.vx = (ball.vx / currentSpeed) * newSpeed; ball.vy = (ball.vy / currentSpeed) * newSpeed;
                        }
                    }
                    ball.statuses = ball.statuses.filter(s => s.timer < s.duration);
                  }


                  if (engine.scene === 'court' && engine.judgeId && !ball.isBlank && gameMode !== 'ffa') {
                      if (ball.team === engine.plaintiffTeam) {
                          engine.applyStatus(ball.uniqueId, 'haste', { duration: 0.1 });
                      } else {
                          engine.applyStatus(ball.uniqueId, 'slow', { duration: 0.1 });
                      }


                      if (ball.uniqueId !== engine.judgeId) {
                          const inGrayCircle = distance(ball.x, ball.y, engine.arenaSize / 2, engine.arenaSize / 2) <= 130;
                          const inGrayBand = Math.abs(ball.x - engine.arenaSize / 2) <= 55;
                          
                          let inOpponentTerritory = false;
                          if (!inGrayCircle && !inGrayBand) {
                              const myTerritoryLeft = ball.team === 'p1';
                              inOpponentTerritory = myTerritoryLeft ? (ball.x > engine.arenaSize / 2 + 55) : (ball.x < engine.arenaSize / 2 - 55);
                          }


                          if (inOpponentTerritory && !ball.wasInOpponentTerritory) {
                              engine.applyStatus(ball.uniqueId, 'silenced', { duration: 1 });
                              engine.spawnParticle({ type: 'text', x: ball.x, y: ball.y - 20, text: '⚖️ 肅靜！', color: '#D6D3D1', maxLifespan: 1 });
                          }
                          ball.wasInOpponentTerritory = inOpponentTerritory;
                      }
                  }


                  if (ball.update && !activeStatuses.has('silenced') && !isHitstopped) ball.update(ball, engine);
                });


                for (let i = engine.obstacles.length - 1; i >= 0; i--) {
                    const o = engine.obstacles[i];
                    
                    if (o.type === 'horizon_zone') {
                        const owner = engine.balls.find(b => b.uniqueId === o.ownerId);
                        if (!owner || owner.hp <= 0) {
                            o.lifespan = 0;
                        } else {
                            if (!owner.ultimate) {
                                engine.balls.forEach(b => {
                                    if (b.hp <= 0 || b.isBlank) return;
                                    if (engine.isEnemy(b.uniqueId, o.ownerId)) {
                                        const dist = distance(b.x, b.y, o.x, o.y);
                                        if (dist < o.radius + b.radius) {
                                            let nx = 1, ny = 0;
                                            if (dist > 0) { nx = (b.x - o.x) / dist; ny = (b.y - o.y) / dist; }
                                            const dot = b.vx * nx + b.vy * ny;
                                            if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; }
                                            const overlap = o.radius + b.radius - dist;
                                            b.x += nx * overlap; b.y += ny * overlap; 
                                        }
                                    }
                                });
                                engine.projectiles.forEach(p => {
                                    if (engine.isEnemy(p.ownerId, o.ownerId)) {
                                        const dist = distance(p.x, p.y, o.x, o.y);
                                        if (dist < o.radius + p.radius) {
                                            let nx = 1, ny = 0;
                                            if (dist > 0) { nx = (p.x - o.x) / dist; ny = (p.y - o.y) / dist; }
                                            const dot = p.vx * nx + p.vy * ny;
                                            if (dot < 0) { p.vx -= 2 * dot * nx; p.vy -= 2 * dot * ny; } 
                                            const overlap = o.radius + p.radius - dist;
                                            p.x += nx * overlap; p.y += ny * overlap;
                                        }
                                    }
                                });
                            }
                        }
                    } else if (o.type === 'podoasg_wall') {
                        engine.balls.forEach(b => {
                            if (b.hp <= 0 || b.isBlank) return;
                            const dist = distance(b.x, b.y, o.x, o.y);
                            if (dist < o.radius + b.radius) {
                                const isEnemy = engine.isEnemy(b.uniqueId, o.ownerId);
                                if (isEnemy) {
                                    let nx = 1, ny = 0;
                                    if (dist > 0) { nx = (b.x - o.x) / dist; ny = (b.y - o.y) / dist; }
                                    const dot = b.vx * nx + b.vy * ny;
                                    if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; }
                                    const overlap = o.radius + b.radius - dist;
                                    b.x += nx * overlap; b.y += ny * overlap; 
                                    
                                    if (!o.hitSet) o.hitSet = new Set();
                                    if (!o.hitSet.has(b.uniqueId)) {
                                        o.hitSet.add(b.uniqueId);
                                        if (engine.applyRandomPodoasgEffect) engine.applyRandomPodoasgEffect(b, o.ownerId, nx, ny, 2);
                                    }
                                } else {
                                    if (!o.buffSet) o.buffSet = new Set();
                                    if (!o.buffSet.has(b.uniqueId)) {
                                        o.buffSet.add(b.uniqueId);
                                        const buffs = ['haste', 'regen', 'shield', 'excited', 'heal'];
                                        const buff = buffs[Math.floor(Math.random() * buffs.length)];
                                        if (buff === 'heal') { engine.applyHeal(b, 40); engine.spawnParticle({ type: 'text', x: b.x, y: b.y - 30, text: '💚 恢復', color: '#10B981' }); }
                                        else if (buff === 'haste') { engine.applyStatus(b.uniqueId, 'haste', { duration: 6 }); engine.spawnParticle({ type: 'text', x: b.x, y: b.y - 30, text: '⚡ 加速', color: '#38BDF8' }); }
                                        else if (buff === 'regen') { engine.applyStatus(b.uniqueId, 'regen', { duration: 6 }); engine.spawnParticle({ type: 'text', x: b.x, y: b.y - 30, text: '✨ 再生', color: '#34D399' }); }
                                        else if (buff === 'shield') { engine.applyStatus(b.uniqueId, 'shield', { duration: 6 }); engine.spawnParticle({ type: 'text', x: b.x, y: b.y - 30, text: '🛡️ 護盾', color: '#CBD5E1' }); }
                                        else if (buff === 'excited') { engine.applyStatus(b.uniqueId, 'excited', { duration: 6 }); engine.spawnParticle({ type: 'text', x: b.x, y: b.y - 30, text: '🔥 激昂', color: '#FCD34D' }); }
                                    }
                                }
                            } else {
                                if (o.buffSet && o.buffSet.has(b.uniqueId)) o.buffSet.delete(b.uniqueId);
                            }
                        });
                    } else if (o.type === 'portal') {
                        const targetPortal = engine.obstacles.find(ob => ob.type === 'portal' && ob.portalId === o.targetId);
                        
                        if (targetPortal && targetPortal.lifespan > 0 && o.lifespan > 0) {
                            const distToTarget = distance(o.x, o.y, targetPortal.x, targetPortal.y);
                            if (distToTarget < 15) {
                                // 互相貼近後湮滅
                                o.lifespan = 0;
                                targetPortal.lifespan = 0; // 確保成對的門同時湮滅，防止重複觸發
                                
                                // 偏差命路遠延的空間崩落爆發
                                const owner = engine.balls.find(b => b.uniqueId === o.ownerId);
                                if (owner && owner.isUndead) {
                                    const explosionDmg = owner.negativeHpDebt;
                                    owner.negativeHpDebt = 0; // 消耗掉自上次爆發以來的累積負載
                                    
                                    const ex = (o.x + targetPortal.x) / 2;
                                    const ey = (o.y + targetPortal.y) / 2;
                                    engine.spawnWave({
                                        x: ex, y: ey, startRadius: 0, maxRadius: 250, speed: 1000, color: 'rgba(168, 85, 247, 0.8)', ownerId: owner.uniqueId, lingerDuration: 0.2, deflectsProjectiles: true,
                                        onHit: (t) => {
                                            if (explosionDmg > 0 && engine.isEnemy(t.uniqueId, owner.uniqueId)) {
                                                const dist = distance(ex, ey, t.x, t.y);
                                                const decay = Math.max(0.1, 1 - (dist / 250)); // 距離衰減計算
                                                engine.applyDamage(t, explosionDmg * decay, owner.uniqueId, 'magic');
                                            }
                                        }
                                    });
                                    // 新增：極度顯眼的空間崩落特效
                                    engine.spawnParticle({ type: 'collapse', x: ex, y: ey, maxRadius: 250, maxLifespan: 0.5 });
                                    if (explosionDmg > 0) {
                                        engine.spawnParticle({ type: 'text', x: ex, y: ey - 30, text: `💥 崩落 (${Math.floor(explosionDmg)})`, color: '#E9D5FF', maxLifespan: 1.5 });
                                    }
                                }
                            } else {
                                // 逐漸飄向彼此，速度隨著距離縮短而衰減 (最低保持 10)
                                const norm = normalize(targetPortal.x - o.x, targetPortal.y - o.y);
                                const speed = Math.max(10, distToTarget * 0.4);
                                o.x += norm.x * speed * DT; 
                                o.y += norm.y * speed * DT;
                            }
                        } else if (!targetPortal) {
                            // 失去對應目標時直接消失
                            o.lifespan = 0;
                        }


                        // 只有傳送門還存活時才判定穿梭
                        if (o.lifespan > 0) {
                            engine.balls.forEach(b => {
                                if (b.hp <= 0 || b.isBlank || b.isChessPiece) return;
                                const dist = distance(b.x, b.y, o.x, o.y);
                                if (dist <= o.radius + b.radius) {
                                    if ((b.portalCooldown || 0) <= 0) {
                                        if (targetPortal) {
                                            b.x = targetPortal.x;
                                            b.y = targetPortal.y;
                                            b.portalCooldown = 1.0; 
                                            
                                            // 辨識陣營給予傷害或恢復 (數值皆下調為 1)
                                            if (engine.isEnemy(b.uniqueId, o.ownerId)) {
                                                engine.applyDamage(b, 1, o.ownerId, 'portal'); 
                                            } else {
                                                engine.applyHeal(b, 1);
                                            }
                                            
                                            engine.spawnParticle({ type: 'text', x: b.x, y: b.y - 30, text: '🌀 穿梭', color: '#D8B4FE', maxLifespan: 1 });
                                        }
                                    }
                                }
                            });
                        }
                    } else if (o.type === 'quzhe_domain' || o.type === 'quzhe_rift') {
                        // 移除強制合併為正圓的邏輯，保留獨立個體以呈現不規則蔓延
                        if (o.radius < o.maxRadius) o.radius += o.expandSpeed * DT;
                        if (o.tears) {
                            o.tears.forEach(t => {
                                // 限制裂痕尖刺長度不無止盡延伸
                                if (t.length < o.maxRadius * 0.8) t.length += t.speed * DT;
                            });
                        }


                        engine.balls.forEach(b => {
                            if (b.hp <= 0 || b.isBlank || !engine.isEnemy(b.uniqueId, o.ownerId)) return;
                            
                            const dist = distance(b.x, b.y, o.x, o.y);
                            let inside = false;
                            
                            if (dist <= o.radius + b.radius) {
                                inside = true;
                            } else {
                                // 判斷是否處於任何裂痕（尖刺）的範圍內
                                if (o.tears) {
                                    for (let t of o.tears) {
                                        let angleDiff = Math.abs(Math.atan2(b.y - o.y, b.x - o.x) - t.angle);
                                        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                                        angleDiff = Math.abs(angleDiff);
                                        
                                        const tearWidth = 0.35; // 裂痕的扇形寬度
                                        if (angleDiff < tearWidth && dist <= o.radius + t.length + b.radius) {
                                            inside = true; break;
                                        }
                                    }
                                }
                            }


                            if (inside) {
                                b.inQuzheDomain = true; 
                                b.currentErosionRate = o.erosionRate || 0.02; 
                            }
                        });
                    } else if (o.type === 'heal_field') {
                        engine.balls.forEach(b => {
                            if (b.hp > 0 && b.team === o.team && distance(b.x, b.y, o.x, o.y) <= o.radius + b.radius) {
                                const healAmt = o.healAmount !== undefined ? o.healAmount : 3;
                                engine.applyHeal(b, healAmt * DT);
                            }
                        });
                    } else if (o.type === 'damage_field') {
                        engine.balls.forEach(b => {
                            if (b.hp > 0 && (engine.isEnemy(b.uniqueId, o.ownerId) || o.ownerId === 'god') && distance(b.x, b.y, o.x, o.y) <= o.radius + b.radius && !b.isBlank) engine.applyDamage(b, 5 * DT, o.ownerId, 'magic');
                        });
                    } else if (o.type === 'balance_ring') {
                        engine.balls.forEach(b => {
                            if (b.hp > 0 && engine.isEnemy(b.uniqueId, o.ownerId) && !b.isBlank) {
                                const dist = distance(b.x, b.y, o.x, o.y);
                                if (dist + b.radius > o.radius) {
                                    let nx = 1, ny = 0;
                                    if (dist > 0) { nx = (b.x - o.x) / dist; ny = (b.y - o.y) / dist; }
                                    const dot = b.vx * nx + b.vy * ny;
                                    if (dot > 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; }
                                    const overlap = dist + b.radius - o.radius;
                                    b.x -= nx * overlap; b.y -= ny * overlap;
                                }
                            }
                        });
                    } else if (o.type === 'health_pack') {
                        engine.balls.forEach(b => {
                            if (b.hp > 0 && !b.isBlank && distance(b.x, b.y, o.x, o.y) <= o.radius + b.radius) {
                                engine.applyHeal(b, (gameMode === '3v3' || gameMode === '1v4') ? 50 : 25);
                                o.lifespan = 0; 
                            }
                        });
                    } else if (o.type === 'sacrament') {
                        const owner = engine.balls.find(b => b.uniqueId === o.ownerId);
                        if (owner) {
                            const norm = normalize(owner.x - o.x, owner.y - o.y);
                            o.x += norm.x * 40 * DT; o.y += norm.y * 40 * DT;
                        }
                        engine.balls.forEach(b => {
                            if (b.hp > 0 && !b.isBlank && distance(b.x, b.y, o.x, o.y) <= o.radius + b.radius) {
                                engine.applyHeal(b, 20);
                                o.lifespan = 0; 
                            }
                        });
                    } else if (o.type === 'gavel') {
                        engine.balls.forEach(b => {
                            if (b.hp > 0 && !b.isBlank && distance(b.x, b.y, o.x, o.y) <= o.radius + b.radius) {
                                engine.judgeId = b.uniqueId;
                                engine.plaintiffTeam = b.team;
                                o.lifespan = 0;
                                engine.spawnParticle({ type: 'text', x: b.x, y: b.y - 40, text: '⚖️ 法官就位！', color: '#D6D3D1' });
                            }
                        });
                    } else if (o.type === 'paint_puddle') {
                        engine.balls.forEach(b => {
                            if (b.hp > 0 && !b.isBlank && distance(b.x, b.y, o.x, o.y) <= o.radius + b.radius) {
                                const isEnemy = engine.isEnemy(b.uniqueId, o.ownerId);
                                
                                if (o.paintType === 'blue') {
                                    if (!isEnemy) engine.applyStatus(b.uniqueId, 'haste', { duration: 0.2 });
                                    else engine.applyStatus(b.uniqueId, 'slow', { duration: 0.2 });
                                } else if (o.paintType === 'yellow') {
                                    if (!isEnemy) engine.applyStatus(b.uniqueId, 'shield_dr', { duration: 0.2 });
                                    else engine.applyStatus(b.uniqueId, 'vulnerable', { duration: 0.2 });
                                } else if (o.paintType === 'green') {
                                    if (!isEnemy) engine.applyStatus(b.uniqueId, 'regen_small', { duration: 0.2 });
                                    else {
                                        b.vx += (Math.random() - 0.5) * 1200 * DT; b.vy += (Math.random() - 0.5) * 1200 * DT;
                                    }
                                }
                            }
                        });
                    } else if (o.type === 'thought_core') {
                        engine.balls.forEach(b => {
                            if (b.hp <= 0 || b.isBlank || o.lifespan <= 0) return;
                            if (distance(b.x, b.y, o.x, o.y) <= o.radius + b.radius) {
                                const owner = engine.balls.find(ob => ob.uniqueId === o.ownerId);
                                if (owner && !owner.isSlashing && !owner.isGathering) {
                                    if (!owner.noGrowth) owner.collectedCores++;
                                    owner.scalingValue = `念核: ${owner.collectedCores}/12 | 受擊: ${owner.hitCount}`;
                                }
                                if (b.uniqueId !== o.ownerId) {
                                    if (engine.isEnemy(b.uniqueId, o.ownerId)) engine.applyDamage(b, 5, o.ownerId, 'magic');
                                    else engine.applyHeal(b, 5);
                                }
                                o.lifespan = 0;
                            }
                        });
                    }
                    
                    if (o.lifespan !== 99999 && o.lifespan !== 9999) {
                        o.lifespan -= DT;
                        if (o.lifespan <= 0) engine.obstacles.splice(i, 1);
                    }
                }


                // 處理無盡之境的侵蝕結算
                engine.balls.forEach(b => {
                    if (b.hp <= 0 || b.isBlank) return;
                    
                    if (b.inQuzheDomain) {
                        const rate = b.currentErosionRate !== undefined ? b.currentErosionRate : 0.02;
                        b.erodedMaxHp += b.baseMaxHp * rate * DT; // 套用對數級侵蝕速度
                        if (b.erodedMaxHp >= b.baseMaxHp) {
                            b.erodedMaxHp = b.baseMaxHp;
                            if (b.hp > 0) {
                                b.hp = 0; // 修改：直接將血量歸零，無須再走扣除超大額傷害的流程
                                engine.spawnParticle({ type: 'text', x: b.x, y: b.y - 30, text: '💀 侵蝕殆盡!', color: '#059669', maxLifespan: 2 });
                            }
                        }
                    } else if (b.erodedMaxHp > 0) {
                        b.erodedMaxHp = Math.max(0, b.erodedMaxHp - b.baseMaxHp * 0.01 * DT);
                    }
                    
                    b.maxHp = b.baseMaxHp - b.erodedMaxHp;
                    if (b.hp > b.maxHp && b.hp > 0) b.hp = b.maxHp;
                });


                for (let i = 0; i < engine.balls.length; i++) {
                  for (let j = i + 1; j < engine.balls.length; j++) {
                    const b1 = engine.balls[i], b2 = engine.balls[j];
                    if (b1.hp <= 0 || b2.hp <= 0) continue; 
                    if (b1.isBlank || b2.isBlank) continue;


                    // 獨立處理曲哲雙生互不碰撞
                    if (b1.phantomId === b2.uniqueId || b2.phantomId === b1.uniqueId || b1.mainId === b2.uniqueId || b2.mainId === b1.uniqueId) {
                        continue;
                    }


                    // 獨立處理卡卡繆思棋子的物理碰撞
                    if (b1.isChessPiece || b2.isChessPiece) {
                        const dist = distance(b1.x, b1.y, b2.x, b2.y);
                        if (dist < b1.radius + b2.radius) {
                            let piece = b1.isChessPiece ? b1 : b2;
                            let other = b1.isChessPiece ? b2 : b1;
                            if (piece.isChessPiece && other.isChessPiece) continue;
                            
                            if (engine.isEnemy(piece.ownerId, other.uniqueId)) {
                                // 移除3秒物理穿透冷卻，改為永遠實心阻擋
                                let nx = 1, ny = 0;
                                if (dist > 0) { nx = (other.x - piece.x) / dist; ny = (other.y - piece.y) / dist; }
                                const dot = other.vx * nx + other.vy * ny;
                                if (dot < 0) { other.vx -= 2 * dot * nx; other.vy -= 2 * dot * ny; }
                                
                                const overlap = piece.radius + other.radius - dist;
                                other.x += nx * overlap; other.y += ny * overlap; 
                                
                                // 保留 0.5 秒的標準受傷冷卻以防止 70HP 被 60FPS 的碰撞瞬間秒殺
                                const cd = piece.blockCooldowns[other.uniqueId] || 0;
                                if (cd <= 0) {
                                    piece.blockCooldowns[other.uniqueId] = 0.5; 
                                    const calcDmg = (attacker, target) => Math.max(0, attacker.modifyDamageOut ? attacker.modifyDamageOut(attacker, 5, engine, target) : 5);
                                    engine.applyDamage(piece, calcDmg(other, piece), other.uniqueId, 'collision');
                                }
                            }
                        }
                        continue;
                    }


                    const dist = distance(b1.x, b1.y, b2.x, b2.y);
                    if (dist < b1.radius + b2.radius) {
                        let nx = 1, ny = 0;
                        if (dist > 0) { nx = (b2.x - b1.x) / dist; ny = (b2.y - b1.y) / dist; }
                        const overlap = (b1.radius + b2.radius - dist) / 2;
                        
                        const massSum = b1.mass + b2.mass;
                        const r1 = b2.mass / massSum, r2 = b1.mass / massSum;
                        b1.x -= nx * overlap * 2 * r1; b2.x += nx * overlap * 2 * r2;


                        const kx = b1.vx - b2.vx, ky = b1.vy - b2.vy, relVelocity = nx * kx + ny * ky;


                        if (relVelocity > 0) {
                            const p = (2) * relVelocity / massSum;
                            b1.vx -= p * b2.mass * nx; b1.vy -= p * b2.mass * ny;
                            b2.vx += p * b1.mass * nx; b2.vy += p * b1.mass * ny;


                            const relSpeed = Math.hypot(kx, ky);
                            if (engine.isEnemy(b1.uniqueId, b2.uniqueId)) {
                                const calcDmg = (attacker, target) => Math.max(0, attacker.modifyDamageOut ? attacker.modifyDamageOut(attacker, 5, engine, target) : 5);
                                engine.applyDamage(b1, calcDmg(b2, b1), b2.uniqueId, 'collision');
                                engine.applyDamage(b2, calcDmg(b1, b2), b1.uniqueId, 'collision');
                                
                                if (b1.onCollide) b1.onCollide(b1, b2, relSpeed, engine);
                                if (b2.onCollide) b2.onCollide(b2, b1, relSpeed, engine);
                            }
                        }
                    }
                  }
                }


                for (let i = engine.projectiles.length - 1; i >= 0; i--) {
                  const p = engine.projectiles[i];
                  const owner = engine.balls.find(b => b.uniqueId === p.ownerId);
                  let isExcited = owner && owner.statuses && owner.statuses.some(s => s.type === 'excited');
                  
                  if (isExcited) {
                      p.penetrating = false;
                      const target = engine.getNearestEnemy({ uniqueId: p.ownerId, x: p.x, y: p.y });
                      if (target) {
                          const norm = normalize(target.x - p.x, target.y - p.y);
                          p.vx += norm.x * 50; p.vy += norm.y * 50; 
                          const speed = Math.hypot(p.vx, p.vy);
                          const maxSpeed = Math.max(p.maxSpeed || 0, 700);
                          if (speed > maxSpeed) { p.vx = (p.vx/speed) * maxSpeed; p.vy = (p.vy/speed) * maxSpeed; }
                      }
                  }


                  if (p.customUpdate) p.customUpdate(p, DT, engine);


                  if (p.type === 'cross_laser') {
                      p.angle += (Math.PI * 2 / 10) * DT; 
                      engine.balls.forEach(b => {
                          if (b.hp <= 0 || !engine.isEnemy(b.uniqueId, p.ownerId) || b.isBlank) return; 
                          const dx1 = Math.cos(p.angle), dy1 = Math.sin(p.angle);
                          const dx2 = -Math.sin(p.angle), dy2 = Math.cos(p.angle); 
                          const dist1 = Math.abs((b.x - p.x)*dy1 - (b.y - p.y)*dx1);
                          const dist2 = Math.abs((b.x - p.x)*dy2 - (b.y - p.y)*dx2);
                          if (dist1 < b.radius + 5 || dist2 < b.radius + 5) {
                              if (!p.hitCooldowns[b.uniqueId]) p.hitCooldowns[b.uniqueId] = 0;
                              if (p.hitCooldowns[b.uniqueId] <= 0) {
                                  const baseDmg = p.baseDamage !== undefined ? p.baseDamage : 10;
                                  engine.applyDamage(b, baseDmg * (p.lifespan / (p.maxLifespan || 10)), p.ownerId, 'laser'); 
                                  p.hitCooldowns[b.uniqueId] = 0.5; 
                              }
                          }
                      });
                      if(p.hitCooldowns) Object.keys(p.hitCooldowns).forEach(k => p.hitCooldowns[k] -= DT);
                  }


                  if (p.isTracking && !isExcited) { 
                     const target = engine.getNearestEnemy({ uniqueId: p.ownerId, x: p.x, y: p.y });
                     if (target) {
                         const dist = distance(p.x, p.y, target.x, target.y);
                         if (!p.trackingRange || dist <= p.trackingRange) {
                             const norm = normalize(target.x - p.x, target.y - p.y);
                             p.vx += norm.x * 25; p.vy += norm.y * 25;
                             const speed = Math.hypot(p.vx, p.vy);
                             const maxSpeed = p.maxSpeed || 400; 
                             if (speed > maxSpeed) { p.vx = (p.vx/speed) * maxSpeed; p.vy = (p.vy/speed) * maxSpeed; }
                         } else if (p.trackingRange && dist > p.trackingRange) { p.vx *= 0.92; p.vy *= 0.92; }
                     }
                  }
                  
                  if (p.isPageTracking && !isExcited) {
                     const target = engine.getNearestEnemy({ uniqueId: p.ownerId, x: p.x, y: p.y });
                     if (target) {
                         const norm = normalize(target.x - p.x, target.y - p.y);
                         p.vx += norm.x * 12; p.vy += norm.y * 12;
                         const speed = Math.hypot(p.vx, p.vy);
                         if (speed > 450) { p.vx = (p.vx/speed) * 450; p.vy = (p.vy/speed) * 450; }
                     }
                  }


                  p.x += p.vx * DT; p.y += p.vy * DT; p.lifespan -= DT;


                  let hitWall = false;
                  if (p.x - p.radius < 0) { p.x = p.radius; p.vx *= -1; hitWall = true; }
                  else if (p.x + p.radius > engine.arenaSize) { p.x = engine.arenaSize - p.radius; p.vx *= -1; hitWall = true; }
                  
                  if (p.y - p.radius < 0) { p.y = p.radius; p.vy *= -1; hitWall = true; }
                  else if (p.y + p.radius > engine.arenaSize) { p.y = engine.arenaSize - p.radius; p.vy *= -1; hitWall = true; }
                  
                  if (hitWall) {
                    if (p.bounces !== undefined) p.bounces--;
                    if (p.bounces < 0 && !p.penetrating) p.lifespan = 0;
                    if (p.type === 'bird') { if (p.bounces < 0) p.lifespan = 0; if (p.hitSet) p.hitSet.clear(); }
                  }


                  engine.balls.forEach(ball => {
                     if (ball.hp <= 0 || !engine.isEnemy(ball.uniqueId, p.ownerId) || ball.isBlank) return;
                     if (distance(p.x, p.y, ball.x, ball.y) < p.radius + ball.radius) {
                         const damageToApply = isExcited ? p.damage * 2 : p.damage;
                         if (p.penetrating) {
                             if (!p.hitSet) p.hitSet = new Set();
                             if (!p.hitSet.has(ball.uniqueId)) {
                                 p.hitSet.add(ball.uniqueId);
                                 if (damageToApply > 0) engine.applyDamage(ball, damageToApply, p.ownerId, 'projectile');
                                 if (p.onHit) p.onHit(p, ball, engine);
                             }
                         } else {
                             if (damageToApply > 0) engine.applyDamage(ball, damageToApply, p.ownerId, 'projectile');
                             if (p.onHit) p.onHit(p, ball, engine);
                             p.lifespan = 0;
                         }
                     }
                  });


                  if (p.lifespan <= 0) {
                     if (p.onDeath) p.onDeath(p, engine);
                     engine.projectiles.splice(i, 1);
                  }
                }


                for (let i = engine.waves.length - 1; i >= 0; i--) {
                    const w = engine.waves[i];
                    if (w.deceleration) {
                        w.speed -= w.deceleration * DT;
                        if (w.speed > 0) { w.currentRadius += w.speed * DT; } else { w.lingerTimer += DT; }
                    } else {
                        if (w.currentRadius < w.maxRadius) {
                            w.currentRadius += w.speed * DT;
                            if (w.currentRadius >= w.maxRadius) w.currentRadius = w.maxRadius;
                        } else { w.lingerTimer += DT; }
                    }


                    if (w.deflectsProjectiles) {
                        engine.projectiles.forEach(p => {
                            if (engine.isEnemy(p.ownerId, w.ownerId) && distance(w.x, w.y, p.x, p.y) <= w.currentRadius + p.radius) {
                                const norm = normalize(p.x - w.x, p.y - w.y);
                                p.vx += norm.x * 1200 * DT; p.vy += norm.y * 1200 * DT;
                            }
                        });
                    }
                    
                    engine.balls.forEach(ball => {
                        if (ball.hp <= 0 || ball.isBlank || w.hitSet.has(ball.uniqueId)) return; 
                        if (distance(w.x, w.y, ball.x, ball.y) <= w.currentRadius + ball.radius) {
                            if(w.onHit) w.onHit(ball);
                            w.hitSet.add(ball.uniqueId);
                        }
                    });


                    if (w.lingerTimer >= (w.lingerDuration || 0)) engine.waves.splice(i, 1);
                }


                for (let i = engine.particles.length - 1; i >= 0; i--) {
                    const p = engine.particles[i];
                    if (p.type === 'floating_number') { p.x += p.vx * DT; p.y += p.vy * DT; p.vy += 250 * DT; } 
                    else if (p.type === 'text') { p.y -= 30 * DT; }
                    
                    p.lifespan -= DT;
                    if (p.lifespan <= 0) engine.particles.splice(i, 1);
                }


                const aliveTeams = new Set();
                engine.balls.forEach(b => {
                    // 修復：只要是玩家本體，或是曲哲的虛影還活著，該隊伍就不算戰敗
                    if ((b.isMain || b.isQuzhePhantom) && b.hp > 0) aliveTeams.add(b.team);
                });
                
                if (gameMode === 'test' && testType === 'endless') {
                    if (!aliveTeams.has('p1')) return 'p2';
                    return null; 
                }
                
                if (aliveTeams.size <= 1) {
                    if (aliveTeams.size === 1) return Array.from(aliveTeams)[0];
                    return 'draw';
                }
                
                return null; 
              }
            };


            engine.init();
            engineRef.current = engine;
            isPausedRef.current = false;
            setIsPaused(false);
            setGameState('playing');
            setGameSpeed(1);
            speedRef.current = 1;
            setWinner(null);
          };


          const handleRandomMatch = () => {
             // 修復：將 'chess_piece' 與 'quzhe_phantom' 從隨機可用角色池中徹底排除，防止它被隨機選中
             const keys = Object.keys(ROSTER).filter(k => !['dummy', 'fanatic_fan', 'endless_minion', 'chess_piece', 'quzhe_phantom'].includes(k));
             const randomizeTeamWithLocks = (currentIds, locks, size) => {
                 return Array.from({ length: size }, (_, i) => locks[i] ? currentIds[i] : keys[Math.floor(Math.random() * keys.length)]);
             };
             
             if (gameMode === 'ffa') {
                 setFfaIds(prev => randomizeTeamWithLocks(prev, ffaLocks, 5));
             } else if (gameMode === 'intervention' || gameMode === 'test') {
                 setP1Ids(prev => { const r = randomizeTeamWithLocks(prev, p1Locks, 1); return [r[0], prev[1], prev[2], prev[3]]; });
                 if (gameMode !== 'test') setP2Ids(prev => { const r = randomizeTeamWithLocks(prev, p2Locks, 1); return [r[0], prev[1], prev[2], prev[3]]; });
             } else if (gameMode === '3v3') {
                 setP1Ids(prev => { const r = randomizeTeamWithLocks(prev, p1Locks, 3); return [r[0], r[1], r[2], prev[3]]; });
                 setP2Ids(prev => randomizeTeamWithLocks(prev, p2Locks, 3));
             } else if (gameMode === '1v4') {
                 setP1Ids(prev => randomizeTeamWithLocks(prev, p1Locks, 4));
                 setP2Ids(prev => { const r = randomizeTeamWithLocks(prev, p2Locks, 1); return [r[0], prev[1], prev[2], prev[3]]; });
             }
          };


          const toggleLock = (side, index) => {
              if (side === 'p1') { const n = [...p1Locks]; n[index] = !n[index]; setP1Locks(n); } 
              else { const n = [...p2Locks]; n[index] = !n[index]; setP2Locks(n); }
          };


          useEffect(() => {
            if (gameState !== 'playing') return;
            const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
            let animationFrameId, lastTime = performance.now(), lastUiTime = performance.now(), accumulator = 0;


            const render = (currentTime) => {
              const engine = engineRef.current;
              if (!engine) return;


              let currentResult = null;
              if (!isPausedRef.current) {
                let frameTime = Math.min((currentTime - lastTime) / 1000, 0.1);
                accumulator += frameTime * speedRef.current;
                while (accumulator >= DT) {
                  currentResult = engine.update(); 
                  accumulator -= DT;
                  if (currentResult) break; 
                }
              }
              lastTime = currentTime;


              ctx.fillStyle = '#0F172A'; ctx.fillRect(0, 0, engine.arenaSize, engine.arenaSize);


              // 繪製卡卡繆思的 8x8 棋盤背景
              const hasCacamus = engine.balls.some(b => (b.id === 'cacamus' || b.copied === 'cacamus') && b.hp > 0);
              if (hasCacamus) {
                  const cellSize = engine.arenaSize / 8;
                  for (let c = 0; c < 8; c++) {
                      for (let r = 0; r < 8; r++) {
                          if ((c + r) % 2 !== 0) {
                              ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                              ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
                          }
                      }
                  }
              }


              if (engine.scene === 'court') {
                  ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'; ctx.fillRect(0, 0, engine.arenaSize / 2, engine.arenaSize);
                  ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'; ctx.fillRect(engine.arenaSize / 2, 0, engine.arenaSize / 2, engine.arenaSize);
                  
                  ctx.fillStyle = '#0F172A'; ctx.fillRect(engine.arenaSize / 2 - 55, 0, 110, engine.arenaSize);
                  ctx.beginPath(); ctx.arc(engine.arenaSize / 2, engine.arenaSize / 2, 130, 0, Math.PI * 2); ctx.fill();


                  ctx.fillStyle = 'rgba(120, 113, 108, 0.3)'; ctx.fillRect(engine.arenaSize / 2 - 55, 0, 110, engine.arenaSize);
                  ctx.beginPath(); ctx.arc(engine.arenaSize / 2, engine.arenaSize / 2, 130, 0, Math.PI * 2); ctx.fill();
              }


              const isRedPhaseActive = engine.balls.some(b => (b.id === 'hao' || b.copied === 'hao') && b.hp > 0 && b.redPhase);
              if (isRedPhaseActive) { ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'; ctx.fillRect(0, 0, engine.arenaSize, engine.arenaSize); }
              
              if (gameMode === 'test') {
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                  if (testType === 'dummy' && engine.timeLimit !== null) {
                      ctx.font = 'bold 150px sans-serif'; ctx.fillText(`${Math.ceil(engine.timeLimit)}s`, engine.arenaSize / 2, engine.arenaSize / 2);
                  } else if (testType === 'endless' && engine.endlessWave) {
                      ctx.font = 'bold 120px sans-serif'; ctx.fillText(`Wave ${engine.endlessWave}`, engine.arenaSize / 2, engine.arenaSize / 2);
                  }
                  
                  if (engine.dpsRecords && engine.dpsRecords.length > 0) {
                      ctx.textAlign = 'left';
                      ctx.textBaseline = 'top';
                      engine.dpsRecords.forEach((rec, idx) => {
                          ctx.fillStyle = 'rgba(252, 211, 77, 0.9)';
                          ctx.font = 'bold 22px "Segoe UI", sans-serif';
                          ctx.fillText(`[${rec.time}s] DPS: ${rec.dps}`, 20, 20 + idx * 30);
                      });
                  }
              }


              ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
              for(let i=0; i<engine.arenaSize; i+=50) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, engine.arenaSize); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(engine.arenaSize, i); ctx.stroke();
              }


              // 新增：提取所有曲哲領域，統一繪製以達到「邊界交融」且透明度不疊加的視覺效果
              const quzheDomains = engine.obstacles.filter(o => o.type === 'quzhe_domain' || o.type === 'quzhe_rift');
              if (quzheDomains.length > 0) {
                  // 先預計算所有裂口的幾何多邊形節點
                  const domainPaths = quzheDomains.map(o => {
                      const segments = 90; // 高解析度計算邊緣
                      const points = [];
                      for (let i = 0; i < segments; i++) {
                          const a = (i / segments) * Math.PI * 2;
                          let r = o.radius;
                          
                          // 加上所有裂痕的隆起長度
                          if (o.tears) {
                              o.tears.forEach(t => {
                                  let diff = Math.abs(a - t.angle);
                                  while (diff > Math.PI) diff -= Math.PI * 2;
                                  diff = Math.abs(diff);
                                  const width = 0.35; 
                                  if (diff < width) {
                                      const factor = 1 - (diff / width);
                                      r += t.length * Math.pow(factor, 1.5); // 讓尖刺形狀更銳利
                                  }
                              });
                          }
                          
                          // 加入抖動雜訊讓邊緣看起來像是不穩定的撕裂狀
                          r += Math.sin(a * 25 + engine.time * 15) * 6;
                          points.push({x: o.x + Math.cos(a) * r, y: o.y + Math.sin(a) * r});
                      }
                      return { points, o };
                  });


                  // 1. 繪製所有領域的外發光邊框 (重疊處此時會有內部網格)
                  ctx.strokeStyle = '#059669';
                  ctx.lineWidth = 2 + Math.random(); // 閃爍感邊框
                  domainPaths.forEach(({points}) => {
                      ctx.beginPath();
                      ctx.moveTo(points[0].x, points[0].y);
                      for(let i=1; i<points.length; i++) ctx.lineTo(points[i].x, points[i].y);
                      ctx.closePath();
                      ctx.stroke();
                  });


                  // 2. 利用純黑虛空底色覆蓋實心區域 (這會將重疊處多餘的「內部邊框」完美遮罩蓋掉！)
                  ctx.fillStyle = '#020617'; // 極其漆黑的虛空底色，與遊戲背景相同
                  domainPaths.forEach(({points}) => {
                      ctx.beginPath();
                      ctx.moveTo(points[0].x, points[0].y);
                      for(let i=1; i<points.length; i++) ctx.lineTo(points[i].x, points[i].y);
                      ctx.closePath();
                      ctx.fill();
                  });


                  // 3. 繪製所有領域的半透明綠色覆蓋層
                  ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
                  domainPaths.forEach(({points}) => {
                      ctx.beginPath();
                      ctx.moveTo(points[0].x, points[0].y);
                      for(let i=1; i<points.length; i++) ctx.lineTo(points[i].x, points[i].y);
                      ctx.closePath();
                      ctx.fill();
                  });


                  // 4. 繪製裂痕內部的跳動神經/紋路
                  domainPaths.forEach(({o}) => {
                      if (!o.tears) return;
                      o.tears.forEach(t => {
                          ctx.beginPath();
                          ctx.moveTo(o.x, o.y);
                          const ex = o.x + Math.cos(t.angle) * (o.radius + t.length);
                          const ey = o.y + Math.sin(t.angle) * (o.radius + t.length);
                          for(let step=1; step<=4; step++) {
                              let nx = o.x + (ex - o.x)*(step/4) + (Math.random()-0.5)*15;
                              let ny = o.y + (ey - o.y)*(step/4) + (Math.random()-0.5)*15;
                              if(step === 4) { nx = ex; ny = ey; }
                              ctx.lineTo(nx, ny);
                          }
                          ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
                          ctx.lineWidth = 1.5;
                          ctx.stroke();
                      });
                  });
              }


              engine.obstacles.forEach(o => {
                  if (o.type === 'podoasg_wall') {
                      ctx.save(); ctx.translate(o.x, o.y); ctx.beginPath();
                      o.vertices.forEach((v, i) => { if (i === 0) ctx.moveTo(v.x, v.y); else ctx.lineTo(v.x, v.y); });
                      ctx.closePath(); ctx.fillStyle = o.color; ctx.fill(); ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
                  } else if (o.type === 'heal_field') {
                      ctx.beginPath(); ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2); ctx.fillStyle = o.color; ctx.fill();
                      ctx.strokeStyle = '#10B981'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
                  } else if (o.type === 'damage_field') {
                      ctx.beginPath(); ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2); ctx.fillStyle = o.color; ctx.fill();
                      ctx.strokeStyle = '#DC143C'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
                  } else if (o.type === 'balance_ring') {
                      ctx.beginPath(); ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2); ctx.strokeStyle = o.color; ctx.lineWidth = 15; ctx.stroke();
                  } else if (o.type === 'health_pack') {
                      ctx.beginPath(); ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2); ctx.fillStyle = 'rgba(16, 185, 129, 0.3)'; ctx.fill();
                      ctx.strokeStyle = '#10B981'; ctx.lineWidth = 3; ctx.stroke();
                      ctx.fillStyle = '#10B981'; ctx.fillRect(o.x - 2, o.y - 8, 4, 16); ctx.fillRect(o.x - 8, o.y - 2, 16, 4);
                  } else if (o.type === 'sacrament') {
                      ctx.beginPath(); ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2); ctx.fillStyle = 'rgba(251, 191, 36, 0.4)'; ctx.fill();
                      ctx.strokeStyle = '#FBBF24'; ctx.lineWidth = 2; ctx.stroke();
                      ctx.fillStyle = '#FBBF24'; ctx.fillRect(o.x - 2, o.y - 6, 4, 12); ctx.fillRect(o.x - 6, o.y - 2, 12, 4);
                  } else if (o.type === 'paint_puddle') {
                      ctx.beginPath(); ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2); ctx.fillStyle = o.color; ctx.globalAlpha = Math.max(0, o.lifespan / 10); ctx.fill(); ctx.globalAlpha = 1.0;
                  } else if (o.type === 'horizon_zone') {
                      ctx.beginPath(); ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2); ctx.fillStyle = 'rgba(56, 189, 248, 0.05)'; ctx.fill();
                      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'; ctx.lineWidth = 2; ctx.setLineDash([10, 10]); ctx.stroke(); ctx.setLineDash([]);
                      ctx.beginPath(); ctx.arc(o.x, o.y, o.radius - 10, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)'; ctx.lineWidth = 1; ctx.stroke();
                  } else if (o.type === 'gavel') {
                      ctx.beginPath(); ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
                      ctx.fillStyle = '#78716C'; ctx.fill(); ctx.strokeStyle = '#D6D3D1'; ctx.lineWidth = 3; ctx.stroke();
                      ctx.fillStyle = '#FFF'; ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⚖️', o.x, o.y);
                  } else if (o.type === 'portal') {
                      const rotation = engine.time * 2;
                      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(rotation);
                      ctx.beginPath(); ctx.arc(0, 0, o.radius, 0, Math.PI * 2); 
                      ctx.fillStyle = 'rgba(168, 85, 247, 0.2)'; ctx.fill();
                      ctx.strokeStyle = '#D8B4FE'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]);
                      ctx.beginPath(); ctx.arc(0, 0, o.radius * 0.6, 0, Math.PI * 2); 
                      ctx.strokeStyle = '#9333EA'; ctx.lineWidth = 3; ctx.stroke();
                      ctx.restore();
                  } else if (o.type === 'thought_core') {
                      ctx.beginPath(); ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2); ctx.fillStyle = 'rgba(52, 211, 153, 0.6)'; ctx.fill();
                      ctx.strokeStyle = '#10B981'; ctx.lineWidth = 2; ctx.stroke();
                      ctx.beginPath(); ctx.arc(o.x, o.y, o.radius / 2, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
                  } else if (o.type === 'chess_piece') {
                      ctx.beginPath(); ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
                      ctx.fillStyle = 'rgba(229, 231, 235, 0.2)'; ctx.fill();
                      ctx.strokeStyle = o.color; ctx.lineWidth = 2; ctx.stroke();
                      
                      const pieceIcons = { 'pawn': '♟', 'knight': '♞', 'bishop': '♝', 'rook': '♜', 'queen': '♛' };
                      ctx.fillStyle = o.color;
                      ctx.font = '24px sans-serif';
                      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                      ctx.fillText(pieceIcons[o.pieceType] || '♟', o.x, o.y);
                  }
              });


              engine.balls.forEach(ball => {
                  if (ball.hp <= 0) return;
                  if ((ball.id === 'kate' || ball.copied === 'kate') && (ball.currentAnchor || (ball.walls && ball.walls.length > 0))) {
                      const drawLaserWall = (p1, p2, isFinished) => {
                          ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
                          ctx.strokeStyle = 'rgba(255, 69, 0, 0.4)'; ctx.lineWidth = isFinished ? 18 : 10; ctx.stroke();
                          ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
                          ctx.strokeStyle = ball.color; ctx.lineWidth = isFinished ? 6 : 3; ctx.stroke();
                          ctx.beginPath(); ctx.arc(p1.x, p1.y, 8, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = ball.color; ctx.stroke();
                          if (isFinished) { ctx.beginPath(); ctx.arc(p2.x, p2.y, 8, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = ball.color; ctx.stroke(); }
                      };
                      if (ball.walls) ball.walls.forEach(w => drawLaserWall(w.p1, w.p2, true));
                      if (ball.currentAnchor) drawLaserWall(ball.currentAnchor, ball, false);
                  }
              });


              engine.waves.forEach(w => {
                let alpha = 1;
                if (w.deceleration && w.speed <= 0 && w.lingerTimer) alpha = 0.5 * Math.max(0, 1 - (w.lingerTimer / w.lingerDuration));
                else if (!w.deceleration) {
                    if (w.currentRadius < w.maxRadius) alpha = 1 - (w.currentRadius / w.maxRadius) * 0.5; 
                    else if (w.lingerTimer) alpha = 0.5 * Math.max(0, 1 - (w.lingerTimer / w.lingerDuration));
                }
                ctx.beginPath(); ctx.arc(w.x, w.y, w.currentRadius, 0, Math.PI * 2);
                ctx.fillStyle = w.color; ctx.globalAlpha = alpha * 0.2; ctx.fill();
                ctx.strokeStyle = w.color; ctx.lineWidth = 3; ctx.globalAlpha = alpha; ctx.stroke(); ctx.globalAlpha = 1.0;
              });


              engine.projectiles.forEach(p => {
                ctx.beginPath();
                if (p.type === 'page') {
                  ctx.rect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2); ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.stroke();
                } else if (p.type === 'bird' || p.type === 'cone' || p.type === 'dagger' || p.type === 'steed') {
                  const angle = Math.atan2(p.vy, p.vx);
                  const drawRadius = (p.type === 'bird' || p.type === 'dagger') ? p.radius * 2.5 : (p.type === 'steed' ? p.radius * 1.5 : p.radius * 2);
                  const backRadius = p.type === 'cone' ? p.radius : drawRadius * (p.type === 'dagger' ? 0.4 : 1);
                  ctx.moveTo(p.x + Math.cos(angle) * drawRadius, p.y + Math.sin(angle) * drawRadius);
                  ctx.lineTo(p.x + Math.cos(angle + 2.5) * backRadius, p.y + Math.sin(angle + 2.5) * backRadius);
                  ctx.lineTo(p.x + Math.cos(angle - 2.5) * backRadius, p.y + Math.sin(angle - 2.5) * backRadius);
                  ctx.closePath(); ctx.fillStyle = p.color; ctx.fill();
                  if (p.type === 'steed') { ctx.strokeStyle = '#94A3B8'; ctx.stroke(); }
                } else if (p.type === 'knight') {
                  const angle = Math.atan2(p.vy, p.vx);
                  ctx.translate(p.x, p.y); ctx.rotate(angle);
                  ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-10, 10); ctx.lineTo(-10, -10); ctx.closePath();
                  ctx.fillStyle = '#CBD5E1'; ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();
                  ctx.rotate(-angle); ctx.translate(-p.x, -p.y);
                } else if (p.type === 'spirit') {
                  ctx.arc(p.x, p.y, p.radius + 6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 69, 0, 0.4)'; ctx.fill();
                  ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
                } else if (p.type === 'sprout') {
                  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fillStyle = 'rgba(74, 222, 128, 0.3)'; ctx.fill();
                  ctx.strokeStyle = '#4ADE80'; ctx.lineWidth = 2; ctx.stroke();
                  ctx.beginPath(); ctx.moveTo(p.x, p.y+4); ctx.quadraticCurveTo(p.x+8, p.y-8, p.x, p.y-8); ctx.quadraticCurveTo(p.x-8, p.y-8, p.x, p.y+4); ctx.fillStyle = '#4ADE80'; ctx.fill();
                } else if (p.type === 'note') {
                  ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
                  ctx.fillRect(p.x + p.radius - 2, p.y - p.radius * 2, 3, p.radius * 2); ctx.fillRect(p.x + p.radius - 2, p.y - p.radius * 2, p.radius * 1.5, 3);
                } else if (p.type === 'energy_domain') {
                  ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                  ctx.fillStyle = p.color; ctx.fill();
                  ctx.strokeStyle = 'rgba(0, 250, 154, 0.3)'; ctx.lineWidth = 2; ctx.setLineDash([15, 10]); ctx.stroke(); ctx.setLineDash([]);
                  ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0, 250, 154, 0.5)'; ctx.fill();
                } else if (p.type === 'cross_laser') {
                  ctx.moveTo(p.x - engine.arenaSize * Math.cos(p.angle), p.y - engine.arenaSize * Math.sin(p.angle)); ctx.lineTo(p.x + engine.arenaSize * Math.cos(p.angle), p.y + engine.arenaSize * Math.sin(p.angle));
                  ctx.moveTo(p.x - engine.arenaSize * Math.cos(p.angle + Math.PI/2), p.y - engine.arenaSize * Math.sin(p.angle + Math.PI/2)); ctx.lineTo(p.x + engine.arenaSize * Math.cos(p.angle + Math.PI/2), p.y + engine.arenaSize * Math.sin(p.angle + Math.PI/2));
                  ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0.2, p.lifespan/10)})`; ctx.lineWidth = 10; ctx.stroke();
                } else if (p.type === 'word') {
                  ctx.fillStyle = p.color; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                  const angle = Math.atan2(p.vy, p.vx); ctx.translate(p.x, p.y); ctx.rotate(angle); 
                  const displayWord = p.mult > 1 ? `${p.text} x${p.mult}` : p.text;
                  ctx.fillText(displayWord, 0, 0); 
                  ctx.rotate(-angle); ctx.translate(-p.x, -p.y);
                } else if (p.type === 'quzhe_spike') {
                  const angle = Math.atan2(p.vy, p.vx);
                  ctx.translate(p.x, p.y); ctx.rotate(angle);
                  ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-12, 10); ctx.lineTo(-6, 0); ctx.lineTo(-12, -10); ctx.closePath();
                  ctx.fillStyle = p.color; ctx.fill(); ctx.strokeStyle = '#10B981'; ctx.lineWidth = 2; ctx.stroke();
                  ctx.rotate(-angle); ctx.translate(-p.x, -p.y);
                } else {
                  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                  if (p.type === 'ring') { ctx.strokeStyle = p.color; ctx.lineWidth = 4; ctx.stroke(); } 
                  else {
                    ctx.fillStyle = p.color; ctx.fill();
                    if (['beam', 'orb', 'shadow'].includes(p.type)) { ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 6, 0, Math.PI * 2); ctx.fillStyle = `rgba(255, 255, 255, 0.3)`; ctx.fill(); }
                  }
                }
              });


              engine.particles.forEach(p => {
                if (p.type === 'photo_flash') {
                    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, p.range, -Math.PI/4, Math.PI/4); ctx.closePath();
                    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.range);
                    grad.addColorStop(0, `rgba(255, 255, 255, ${0.8 * (p.lifespan / p.maxLifespan)})`); grad.addColorStop(1, `rgba(244, 114, 182, 0)`);
                    ctx.fillStyle = grad; ctx.fill(); ctx.restore();
                } else if (p.type === 'rect_flash') {
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = Math.max(0, p.lifespan / p.maxLifespan);
                    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
                    ctx.globalAlpha = 1.0;
                } else if (p.type === 'laser') {
                    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.tx, p.ty); ctx.strokeStyle = 'rgba(169, 169, 169, 0.4)'; ctx.lineWidth = 25 * (p.lifespan / p.maxLifespan); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.tx, p.ty); ctx.strokeStyle = p.color; ctx.lineWidth = 10 * (p.lifespan / p.maxLifespan); ctx.stroke();
                } else if (p.type === 'lightning') { 
                    ctx.beginPath(); ctx.moveTo(p.segments[0].x, p.segments[0].y); for(let i=1; i<p.segments.length; i++) ctx.lineTo(p.segments[i].x, p.segments[i].y);
                    ctx.strokeStyle = `rgba(251, 191, 36, ${p.lifespan/p.maxLifespan})`; ctx.lineWidth = 15 * (p.lifespan/p.maxLifespan); ctx.stroke();
                    ctx.strokeStyle = `rgba(255, 255, 255, ${p.lifespan/p.maxLifespan})`; ctx.lineWidth = 5 * (p.lifespan/p.maxLifespan); ctx.stroke();
                    ctx.beginPath(); ctx.arc(p.x, p.y, 50 * (1 - p.lifespan/p.maxLifespan), 0, Math.PI*2); ctx.fillStyle = `rgba(251, 191, 36, ${p.lifespan/p.maxLifespan})`; ctx.fill();
                } else if (p.type === 'slash') { 
                    ctx.beginPath(); ctx.moveTo(p.p1.x, p.p1.y); ctx.lineTo(p.p2.x, p.p2.y);
                    ctx.strokeStyle = p.color; ctx.lineWidth = 15 * (p.lifespan / p.maxLifespan); ctx.lineCap = 'round'; ctx.stroke();
                    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5 * (p.lifespan / p.maxLifespan); ctx.stroke(); ctx.lineCap = 'butt';
                }
              });


              engine.balls.forEach(ball => {
                if (ball.hp <= 0) return; 
                const activeStatuses = new Set((ball.statuses || []).map(s => s.type));


                if (ball.id === 'kongmie' || ball.copied === 'kongmie') {
                    const r = ball.radius + 25;
                    ctx.beginPath(); ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 3; ctx.stroke();
                    ctx.beginPath(); ctx.arc(ball.x, ball.y, r, -Math.PI/2, -Math.PI/2 + (ball.actTimer / ball.act3Threshold) * Math.PI * 2); ctx.strokeStyle = '#8B5CF6'; ctx.stroke();
                    ctx.fillStyle = '#8B5CF6'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(['I', 'II', 'III'][ball.act - 1] || 'III', ball.x, ball.y - ball.radius - 25);
                }


                if (ball.id === 'miller' || ball.copied === 'miller') {
                    const hpPct = ball.hp / ball.maxHp, activeBook = hpPct >= 0.75 ? 0 : (hpPct >= 0.5 ? 1 : (hpPct >= 0.25 ? 2 : 3)), colors = ['#FBBF24', '#4ADE80', '#CBD5E1', '#DC143C'];
                    for (let i = 0; i < 4; i++) {
                        const bx = ball.x + Math.cos(engine.time * 2 + i * Math.PI / 2) * (ball.radius + 25), by = ball.y + Math.sin(engine.time * 2 + i * Math.PI / 2) * (ball.radius + 25);
                        ctx.fillStyle = i === activeBook ? colors[i] : 'rgba(255, 255, 255, 0.15)';
                        ctx.beginPath(); ctx.moveTo(bx, by - 6); ctx.lineTo(bx + 4, by); ctx.lineTo(bx, by + 6); ctx.lineTo(bx - 4, by); ctx.fill();
                    }
                }


                if (ball.id === 'topiharin' || ball.copied === 'topiharin') {
                    ctx.lineWidth = 4;
                    for (let i = 0; i < 4; i++) {
                        ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius + 18, -Math.PI/2 + i * Math.PI/2, -Math.PI/2 + (i+1) * Math.PI/2 - 0.1);
                        if (ball.currentPhase > i + 1 || ball.currentPhase === 4) ctx.strokeStyle = '#FF1493';
                        else if (ball.currentPhase === i + 1) ctx.strokeStyle = `rgba(255, 20, 147, ${(ball.musicTimer % 15) / 15})`;
                        else ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                        ctx.stroke();
                    }
                }


                if (ball.id === 'eli' || ball.copied === 'eli') {
                    const rRadius = ball.radius + 35, swordX = ball.x + Math.cos(ball.rapierAngle) * rRadius, swordY = ball.y + Math.sin(ball.rapierAngle) * rRadius;
                    ctx.beginPath(); ctx.arc(ball.x, ball.y, rRadius, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)'; ctx.lineWidth = 1; ctx.stroke();
                    ctx.save(); ctx.translate(swordX, swordY); ctx.rotate(ball.rapierAngle - Math.PI / 2);
                    ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(-10, 3); ctx.lineTo(-10, -3); ctx.closePath();
                    ctx.fillStyle = '#00FFFF'; ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1; ctx.stroke();
                    ctx.fillStyle = '#94A3B8'; ctx.fillRect(-14, -8, 4, 16); ctx.fillRect(-22, -2, 8, 4); ctx.restore();
                }


                if (ball.id === 'lisi' || ball.copied === 'lisi') {
                    const rRadius = ball.radius + 35, camX = ball.x + Math.cos(ball.cameraAngle) * rRadius, camY = ball.y + Math.sin(ball.cameraAngle) * rRadius;
                    ctx.beginPath(); ctx.arc(ball.x, ball.y, rRadius, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(244, 114, 182, 0.15)'; ctx.lineWidth = 1; ctx.stroke();
                    ctx.save(); ctx.translate(camX, camY); ctx.rotate(ball.cameraAngle);
                    ctx.fillStyle = '#1F2937'; ctx.fillRect(-10, -8, 20, 16);
                    ctx.fillStyle = '#D1D5DB'; ctx.fillRect(10, -5, 8, 10);
                    ctx.beginPath(); ctx.arc(18, 0, 4, 0, Math.PI*2); ctx.fillStyle = '#60A5FA'; ctx.fill(); 
                    ctx.fillStyle = '#F472B6'; ctx.beginPath(); ctx.arc(0, -8, 3, 0, Math.PI*2); ctx.fill();
                    ctx.restore();
                }


                if (ball.id === 'fasimir' || ball.copied === 'fasimir') {
                    const r = ball.radius;
                    if (ball.hermesList && ball.hermesList.length > 0) {
                        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)'; ctx.lineWidth = 3;
                        ball.hermesList.forEach((timer, idx) => { ctx.beginPath(); ctx.arc(ball.x, ball.y, r + 10 + idx * 5, -Math.PI/2, -Math.PI/2 + (timer/5)*Math.PI*2); ctx.stroke(); });
                    }
                    if (ball.hephaestusList && ball.hephaestusList.length > 0) {
                        ctx.strokeStyle = 'rgba(248, 113, 113, 0.8)'; ctx.lineWidth = 3;
                        ball.hephaestusList.forEach((timer, idx) => { ctx.beginPath(); ctx.arc(ball.x, ball.y, r + 20 + idx * 5, -Math.PI/2, -Math.PI/2 + (timer/10)*Math.PI*2); ctx.stroke(); });
                    }
                    if (ball.zeusList && ball.zeusList.length > 0) {
                        ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)'; ctx.lineWidth = 3;
                        ball.zeusList.forEach((timer, idx) => { ctx.beginPath(); ctx.arc(ball.x, ball.y, r + 28 + idx * 5, -Math.PI/2, -Math.PI/2 + (timer/15)*Math.PI*2); ctx.stroke(); });
                    }
                    if (ball.ultimate) {
                        ctx.strokeStyle = 'rgba(248, 113, 113, 1)'; ctx.lineWidth = 4;
                        ctx.beginPath(); ctx.arc(ball.x, ball.y, r + 40, -Math.PI/2, -Math.PI/2 + ((ball.ultHephaestusTimer || 10)/10)*Math.PI*2); ctx.stroke();
                        ctx.strokeStyle = 'rgba(251, 191, 36, 1)'; ctx.lineWidth = 4;
                        ctx.beginPath(); ctx.arc(ball.x, ball.y, r + 45, -Math.PI/2, -Math.PI/2 + ((ball.ultZeusTimer || 5)/5)*Math.PI*2); ctx.stroke();
                    }
                }


                if (ball.id === 'grimm' || ball.copied === 'grimm') {
                    if (ball.isGathering) {
                        const progress = 1 - (ball.gatherTimer / 1.0), orbitRadius = (ball.radius + 60) * (1 - progress);
                        ctx.beginPath(); ctx.arc(ball.x, ball.y, Math.max(0, orbitRadius), 0, Math.PI * 2); ctx.strokeStyle = `rgba(16, 185, 129, ${0.3 * (1-progress)})`; ctx.lineWidth = 1; ctx.stroke();
                        for (let i = 0; i < 12; i++) {
                            const angle = (ball.baseOrbitAngle || 0) + (i * Math.PI * 2 / 12) + (progress * Math.PI * 4);
                            ctx.beginPath(); ctx.arc(ball.x + Math.cos(angle) * orbitRadius, ball.y + Math.sin(angle) * orbitRadius, 5, 0, Math.PI * 2);
                            ctx.fillStyle = '#34D399'; ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1; ctx.stroke();
                        }
                        ctx.save(); ctx.translate(ball.x, ball.y); ctx.globalAlpha = progress;
                        ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(10, -10); ctx.lineTo(10, 20); ctx.lineTo(-10, 20); ctx.lineTo(-10, -10); ctx.closePath();
                        ctx.fillStyle = 'rgba(52, 211, 153, 0.8)'; ctx.fill(); ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
                    } else if (ball.collectedCores > 0 && !ball.isSlashing) {
                        const orbitRadius = ball.radius + 60; 
                        ctx.beginPath(); ctx.arc(ball.x, ball.y, orbitRadius, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)'; ctx.lineWidth = 1; ctx.stroke();
                        for (let i = 0; i < ball.collectedCores; i++) {
                            const angle = (ball.baseOrbitAngle || 0) + (i * Math.PI * 2 / ball.collectedCores);
                            ctx.beginPath(); ctx.arc(ball.x + Math.cos(angle) * orbitRadius, ball.y + Math.sin(angle) * orbitRadius, 5, 0, Math.PI * 2);
                            ctx.fillStyle = '#34D399'; ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1; ctx.stroke();
                        }
                    }
                }


                if (ball.auraActive || activeStatuses.has('excited')) { 
                    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius * 2.5, 0, Math.PI * 2); ctx.fillStyle = activeStatuses.has('excited') ? '#FCD34D' : ball.color; ctx.globalAlpha = 0.2; ctx.fill(); ctx.globalAlpha = 1.0;
                }
                
                if (activeStatuses.has('shield')) {
                    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius + 12, 0, Math.PI * 2); ctx.fillStyle = 'rgba(203, 213, 225, 0.2)'; ctx.fill(); ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 4; ctx.stroke();
                }


                if (ball.isBlank) ctx.globalAlpha = 0.3; 
                if (ball.isQuzhePhantom) ctx.globalAlpha = 0.5;


                if (ball.isChessPiece) {
                    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
                    ctx.fillStyle = ball.behavior === 'protect' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(248, 113, 113, 0.15)'; 
                    ctx.fill();
                    ctx.strokeStyle = ball.behavior === 'protect' ? '#38BDF8' : '#F87171'; 
                    ctx.lineWidth = 2; ctx.stroke();
                    
                    const pieceIcons = { 'pawn': '♟', 'knight': '♞', 'bishop': '♝', 'rook': '♜', 'queen': '♛' };
                    ctx.fillStyle = ball.color;
                    ctx.font = '24px sans-serif';
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(pieceIcons[ball.pieceType] || '♟', ball.x, ball.y);
                } else if (ball.isQuzheMain || ball.isQuzhePhantom) {
                    ctx.globalAlpha = 0.6; 
                    
                    ctx.beginPath(); 
                    ctx.arc(ball.x, ball.y, ball.radius, Math.PI/2, Math.PI*1.5);
                    ctx.fillStyle = ball.isQuzheMain ? '#FFFFFF' : ball.color;
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.arc(ball.x, ball.y, ball.radius, -Math.PI/2, Math.PI/2);
                    ctx.fillStyle = ball.isQuzheMain ? ball.color : '#FFFFFF';
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
                    ctx.strokeStyle = ball.isMain ? '#FFFFFF' : '#888888'; 
                    ctx.lineWidth = ball.isMain ? 2 : 1; 
                    ctx.stroke();
                } else {
                    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); ctx.fillStyle = ball.color; ctx.fill();
                    ctx.strokeStyle = ball.isMain ? '#FFFFFF' : '#888888'; ctx.lineWidth = ball.isMain ? 2 : 1; ctx.stroke(); 
                }
                ctx.globalAlpha = 1.0; 


                if (gameMode === 'ffa' && ball.isMain) {
                    const TEAM_COLORS = { p1: '#3B82F6', p2: '#EF4444', p3: '#10B981', p4: '#F59E0B', p5: '#8B5CF6' };
                    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius + 4, 0, Math.PI * 2);
                    ctx.strokeStyle = TEAM_COLORS[ball.team] || '#FFFFFF';
                    ctx.lineWidth = 3; ctx.stroke();
                }


                if (activeStatuses.has('hitstop')) { ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; ctx.fill(); }
                
                if (engine.scene === 'court' && engine.judgeId === ball.uniqueId && gameMode !== 'ffa') {
                    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius + 16, 0, Math.PI * 2); ctx.strokeStyle = '#D6D3D1'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
                    ctx.fillStyle = '#FFF'; ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⚖️', ball.x, ball.y - ball.radius - 22);
                }


                if (activeStatuses.has('burn')) { ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius + 5, 0, Math.PI * 2); ctx.strokeStyle = '#EF4444'; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]); }
                if (activeStatuses.has('warning')) { ctx.fillStyle = '#FF00FF'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center'; ctx.fillText('!', ball.x, ball.y - ball.radius - 15); }
                if (activeStatuses.has('knockback')) { ctx.fillStyle = '#EF4444'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.fillText('»', ball.x - ball.radius - 10, ball.y); }
                if (activeStatuses.has('rooted')) { ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius + 12, 0, Math.PI * 2); ctx.strokeStyle = '#4ADE80'; ctx.lineWidth = 4; ctx.stroke(); }
                if (activeStatuses.has('slow')) { ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius + 8, 0, Math.PI * 2); ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = 3; ctx.stroke(); }
                if (activeStatuses.has('stun')) { ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius + 8, 0, Math.PI * 2); ctx.strokeStyle = '#FCD34D'; ctx.lineWidth = 4; ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([]); }
                if (activeStatuses.has('silenced')) {
                   ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius + 12, 0, Math.PI * 2); ctx.strokeStyle = '#9333EA'; ctx.lineWidth = 4; ctx.stroke();
                   ctx.beginPath(); ctx.moveTo(ball.x - ball.radius, ball.y - ball.radius); ctx.lineTo(ball.x + ball.radius, ball.y + ball.radius); ctx.stroke();
                }
                
                if (activeStatuses.has('shield_dr')) {
                    const hx = ball.x + ball.radius * 0.7, hy = ball.y - ball.radius * 0.7; ctx.beginPath();
                    for(let k=0; k<6; k++) { const angle = k * Math.PI / 3 - Math.PI / 6; ctx.lineTo(hx + Math.cos(angle) * 8, hy + Math.sin(angle) * 8); }
                    ctx.closePath(); ctx.fillStyle = 'rgba(96, 165, 250, 0.8)'; ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5; ctx.stroke();
                }
                if (activeStatuses.has('vulnerable')) {
                    const tx = ball.x + ball.radius * 0.7, ty = ball.y + ball.radius * 0.7;
                    ctx.beginPath(); ctx.moveTo(tx - 7, ty - 4); ctx.lineTo(tx + 7, ty - 4); ctx.lineTo(tx, ty + 8); ctx.closePath();
                    ctx.fillStyle = 'rgba(239, 68, 68, 0.8)'; ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5; ctx.stroke();
                }


                const displayHp = ball.isUndead ? -Math.floor(ball.negativeHpDebt) : Math.max(0, Math.floor(ball.hp));
                ctx.fillStyle = '#FFFFFF'; ctx.font = ball.isMain ? 'bold 24px "Segoe UI", sans-serif' : 'bold 14px "Segoe UI", sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = '#000000'; 
                ctx.strokeText(displayHp, ball.x, ball.y); ctx.fillText(displayHp, ball.x, ball.y);


                if (ball.isSummon && !ball.isQuzhePhantom) {
                    ctx.font = 'bold 12px "Segoe UI", sans-serif';
                    ctx.strokeText(ball.name, ball.x, ball.y - ball.radius - 22);
                    ctx.fillText(ball.name, ball.x, ball.y - ball.radius - 22);
                }


                const doomHealAmt = engine.balls.reduce((sum, m) => {
                    if ((m.id === 'miller' || m.copied === 'miller') && m.doomHeal && m.doomHeal[ball.uniqueId]) {
                        return sum + m.doomHeal[ball.uniqueId];
                    }
                    return sum;
                }, 0);
                if (doomHealAmt > 0 && ball.hp > 0) {
                    const ratio = Math.min(1, doomHealAmt / ball.hp);
                    const barWidth = 40;
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(ball.x - barWidth/2, ball.y + ball.radius + 18, barWidth, 6);
                    ctx.fillStyle = '#FBBF24'; 
                    ctx.fillRect(ball.x - barWidth/2, ball.y + ball.radius + 18, barWidth * ratio, 6);
                    ctx.strokeStyle = '#000000'; ctx.lineWidth = 1;
                    ctx.strokeRect(ball.x - barWidth/2, ball.y + ball.radius + 18, barWidth, 6);
                }


                // 新增：侵蝕進度可視化 (顯示在場上目標的下方)
                if (ball.erodedMaxHp > 0 && ball.hp > 0) {
                    const eRatio = Math.min(1, ball.erodedMaxHp / ball.baseMaxHp);
                    const barWidth = 40;
                    const barY = ball.y + ball.radius + (doomHealAmt > 0 ? 28 : 18); // 避免與米勒救贖血條重疊
                    
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(ball.x - barWidth/2, barY, barWidth, 6);
                    ctx.fillStyle = '#6B7280'; // 灰色侵蝕條，從右側延伸
                    ctx.fillRect(ball.x - barWidth/2 + barWidth*(1-eRatio), barY, barWidth * eRatio, 6);
                    ctx.strokeStyle = '#000000'; ctx.lineWidth = 1;
                    ctx.strokeRect(ball.x - barWidth/2, barY, barWidth, 6);
                    
                    ctx.fillStyle = '#9CA3AF';
                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${Math.floor(eRatio*100)}%`, ball.x + barWidth/2 + 4, barY + 3);
                }
              });


              // 修復：把被截斷遺失的文字與傷害跳字重新獨立抽出來到最上層繪製
              engine.particles.forEach(p => {
                if (p.type === 'text') {
                    ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.lifespan / p.maxLifespan);
                    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.text, p.x, p.y); ctx.globalAlpha = 1.0;
                } else if (p.type === 'floating_number') {
                    ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.lifespan / p.maxLifespan);
                    ctx.font = '900 20px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 3;
                    ctx.strokeText(p.text, p.x, p.y); ctx.fillText(p.text, p.x, p.y); ctx.globalAlpha = 1.0;
                }
              });


              if (currentTime - lastUiTime > 100) {
                const getTeamStats = (team) => engine.balls.filter(b => b.team === team && b.isMain).map(b => { 
                      let displayHp = Math.max(0, b.hp);
                      if (b.isUndead) displayHp = -Math.floor(b.negativeHpDebt);
                      let isSplit = false;
                      let pHP = 0;
                      let mHP = Math.max(0, b.hp);
                      if (b.id === 'quzhe' || b.copied === 'quzhe') {
                          const phantom = engine.balls.find(x => x.uniqueId === b.phantomId);
                          pHP = phantom ? Math.max(0, phantom.hp) : 0;
                          if (mHP > 0 && pHP > 0) {
                              isSplit = true;
                              displayHp = mHP + pHP;
                          } else if (mHP <= 0 && pHP > 0) {
                              displayHp = pHP;
                          }
                      }
                      return { 
                          id: b.uniqueId, name: b.name, hp: displayHp, maxHp: b.baseMaxHp || b.maxHp, erodedMaxHp: b.erodedMaxHp || 0, scale: b.scalingValue, tid: b.id,
                          totalDmg: Math.floor(b.damageDealt || 0), dps: engine.time > 0 ? ((b.damageDealt || 0) / engine.time).toFixed(1) : "0.0",
                          isSplit: isSplit, mainHp: mHP, phantomHp: pHP
                      };
                });
                setUiStats({ p1: getTeamStats('p1'), p2: getTeamStats('p2'), p3: getTeamStats('p3'), p4: getTeamStats('p4'), p5: getTeamStats('p5') });
                lastUiTime = currentTime;
              }


              if (currentResult) { setGameState('over'); setWinner(currentResult); } 
              else { animationFrameId = requestAnimationFrame(render); }
            };


            animationFrameId = requestAnimationFrame(render);
            return () => cancelAnimationFrame(animationFrameId);
          }, [gameState, gameMode, testType, p1Ids, p2Ids, ffaIds, ffaCount, scene]);


          const renderFfaCard = (index) => {
             const pid = ffaIds[index];
             const char = ROSTER[pid];
             const stat = uiStats[`p${index+1}`]?.[0];
             const locked = ffaLocks[index];


             const themes = [
                 { border: 'border-blue-500', bg: 'bg-blue-950/30', text: 'text-blue-400', title: 'text-blue-300', label: 'Player 1', lockBg: 'bg-blue-600/50' },
                 { border: 'border-red-500', bg: 'bg-red-950/30', text: 'text-red-400', title: 'text-red-300', label: 'Player 2', lockBg: 'bg-red-600/50' },
                 { border: 'border-emerald-500', bg: 'bg-emerald-950/30', text: 'text-emerald-400', title: 'text-emerald-300', label: 'Player 3', lockBg: 'bg-emerald-600/50' },
                 { border: 'border-amber-500', bg: 'bg-amber-950/30', text: 'text-amber-400', title: 'text-amber-300', label: 'Player 4', lockBg: 'bg-amber-600/50' },
                 { border: 'border-purple-500', bg: 'bg-purple-950/30', text: 'text-purple-400', title: 'text-purple-300', label: 'Player 5', lockBg: 'bg-purple-600/50' }
             ];
             const t = themes[index];


             return (
                 <div key={`ffa_${index}`} className={`p-3 rounded-xl border-2 ${t.border} ${t.bg} flex flex-col gap-1.5 transition-all duration-300 w-full`}>
                     <div className="flex justify-between items-center mb-1">
                         <span className={`text-sm font-bold ${t.text}`}>{t.label}</span>
                         <button onClick={() => {
                             const n = [...ffaLocks]; n[index] = !n[index]; setFfaLocks(n);
                         }} className={`p-1 rounded ${locked ? `${t.lockBg} text-white` : 'bg-transparent text-gray-500 hover:text-gray-300'}`}>
                             {locked ? '🔒' : '🔓'}
                         </button>
                     </div>
                     <select value={pid} onChange={(e) => { 
                         const n = [...ffaIds]; n[index] = e.target.value; setFfaIds(n);
                     }} disabled={gameState === 'playing'} className="bg-gray-800 text-white p-1.5 text-sm rounded outline-none border border-gray-700 font-bold focus:border-indigo-500 transition-colors w-full">
                         <CharacterOptions />
                     </select>


                     <span className={`text-xs ${t.title} font-semibold mt-1`}>{char.title}</span>
                     <p className="text-xs text-gray-400 leading-relaxed h-28 overflow-y-auto pr-1 mt-0.5 whitespace-pre-wrap">{char.desc}</p>
                     
                     {gameState !== 'menu' && stat && (
                         <div className="mt-1 p-2.5 bg-gray-900/80 rounded border border-gray-700/50">
                             <div className="flex justify-between text-[11px] font-bold mb-1">
                                 <span className="text-gray-400">HP / Max {stat.erodedMaxHp > 0 && <span className="text-gray-500 ml-1 font-normal">(侵蝕 {Math.floor((stat.erodedMaxHp/stat.maxHp)*100)}%)</span>}</span>
                                 <span className={stat.hp < 30 ? 'text-red-400' : 'text-emerald-400'}>{Math.floor(stat.hp)} / {Math.floor(stat.maxHp - stat.erodedMaxHp)}</span>
                             </div>
                             {stat.isSplit ? (
                                 <div className="flex w-full bg-gray-800 h-2 rounded-full overflow-hidden mb-1 relative">
                                     <div className="h-full bg-emerald-100 transition-all duration-200 border-r border-gray-900" style={{ width: `${(stat.mainHp / stat.maxHp) * 100}%` }}></div>
                                     <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${(stat.phantomHp / stat.maxHp) * 100}%` }}></div>
                                     {stat.erodedMaxHp > 0 && <div className="absolute top-0 right-0 h-full bg-gray-500 transition-all duration-200" style={{ width: `${(stat.erodedMaxHp / stat.maxHp) * 100}%` }}></div>}
                                 </div>
                             ) : (
                                 <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mb-1 relative">
                                     <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${Math.max(0, stat.hp / stat.maxHp * 100)}%` }}></div>
                                     {stat.erodedMaxHp > 0 && <div className="absolute top-0 right-0 h-full bg-gray-500 transition-all duration-200" style={{ width: `${(stat.erodedMaxHp / stat.maxHp) * 100}%` }}></div>}
                                 </div>
                             )}
                             <div className="flex justify-between text-[11px] mt-2 text-yellow-300 font-semibold bg-gray-800/50 p-1.5 rounded border border-gray-700"><span>機制狀態</span><span className="text-right tracking-wide">{stat.scale || '-'}</span></div>
                             <div className="flex justify-between text-[10px] text-gray-400 border-t border-gray-700/50 pt-1.5 mt-1.5">
                                 <span>總傷害: <span className="text-indigo-300 font-bold text-xs">{stat.totalDmg}</span></span>
                                 <span>DPS: <span className="text-orange-300 font-bold text-xs">{stat.dps}</span></span>
                             </div>
                         </div>
                     )}
                 </div>
             );
          };


          const renderPlayerCard = (side, specialMode = null) => {
             const isDummy = specialMode === 'dummy';
             const isEndless = specialMode === 'endless';
             const pid = side === 'p1' ? p1Ids[0] : (isDummy ? 'dummy' : isEndless ? 'endless_minion' : p2Ids[0]);
             const char = ROSTER[pid] || ROSTER['dummy'];
             const stat = uiStats[side]?.[0];
             
             const t = {
                 p1: { border: 'border-blue-500', bg: 'bg-blue-950/30', text: 'text-blue-400', title: 'text-indigo-300', label: 'Player 1' },
                 p2: { border: 'border-red-500', bg: 'bg-red-950/30', text: 'text-red-400', title: 'text-red-300', label: 'Player 2' },
                 dummy: { border: 'border-amber-500', bg: 'bg-amber-950/30', text: 'text-amber-400', title: 'text-amber-300', label: 'Target' },
                 endless: { border: 'border-teal-500', bg: 'bg-teal-950/30', text: 'text-teal-400', title: 'text-teal-300', label: 'Endless Swarm' }
             }[specialMode || side];


             return (
                 <div className={`p-3 rounded-xl border-2 ${t.border} ${t.bg} flex flex-col gap-1.5 transition-all duration-300 w-full`}>
                     <div className="flex justify-between items-center mb-1">
                         <span className={`text-sm font-bold ${t.text}`}>{t.label}</span>
                         {!(isDummy || isEndless) && (
                             <button onClick={() => toggleLock(side, 0)} className={`p-1 rounded ${side === 'p1' ? (p1Locks[0] ? 'bg-blue-600/50 text-white' : 'bg-transparent text-gray-500 hover:text-gray-300') : (p2Locks[0] ? 'bg-red-600/50 text-white' : 'bg-transparent text-gray-500 hover:text-gray-300')}`}>
                                 {side === 'p1' ? (p1Locks[0] ? '🔒' : '🔓') : (p2Locks[0] ? '🔒' : '🔓')}
                             </button>
                         )}
                         {(isDummy || isEndless) && (
                             <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: char.color, boxShadow: `0 0 8px ${char.color}` }}></div>
                         )}
                     </div>
                     
                     {isDummy ? (
                         <div className="bg-gray-800 text-amber-100 p-1.5 rounded font-bold text-center border border-amber-900/50 text-sm">巨大木樁 (HP: 5000)</div>
                     ) : isEndless ? (
                         <div className="bg-gray-800 text-teal-100 p-1.5 rounded font-bold text-center border border-teal-900/50 text-sm">無盡狂熱者 (Wave: {stat ? Math.floor(stat.maxHp) : 1})</div>
                     ) : (
                         <select value={pid} onChange={(e) => { 
                             const n = side === 'p1' ? [...p1Ids] : [...p2Ids]; n[0] = e.target.value;
                             side === 'p1' ? setP1Ids(n) : setP2Ids(n); 
                         }} disabled={gameState === 'playing'} className="bg-gray-800 text-white p-1.5 text-sm rounded outline-none border border-gray-700 font-bold focus:border-indigo-500 transition-colors w-full">
                             <CharacterOptions />
                         </select>
                     )}


                     <span className={`text-xs ${t.title} font-semibold mt-1`}>{char.title}</span>
                     <p className="text-xs text-gray-400 leading-relaxed h-28 overflow-y-auto pr-1 mt-0.5 whitespace-pre-wrap">{char.desc}</p>
                     
                     {gameState !== 'menu' && stat && (
                         <div className="mt-1 p-2.5 bg-gray-900/80 rounded border border-gray-700/50">
                             <div className="flex justify-between text-[11px] font-bold mb-1">
                                 <span className="text-gray-400">HP / Max {stat.erodedMaxHp > 0 && <span className="text-gray-500 ml-1 font-normal">(侵蝕 {Math.floor((stat.erodedMaxHp/stat.maxHp)*100)}%)</span>}</span>
                                 <span className={stat.hp < (isDummy ? 500 : 30) ? 'text-red-400' : 'text-emerald-400'}>{Math.floor(stat.hp)} / {Math.floor(stat.maxHp - stat.erodedMaxHp)}</span>
                             </div>
                             {stat.isSplit ? (
                                 <div className="flex w-full bg-gray-800 h-2 rounded-full overflow-hidden mb-1 relative">
                                     <div className="h-full bg-emerald-100 transition-all duration-200 border-r border-gray-900" style={{ width: `${(stat.mainHp / stat.maxHp) * 100}%` }}></div>
                                     <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${(stat.phantomHp / stat.maxHp) * 100}%` }}></div>
                                     {stat.erodedMaxHp > 0 && <div className="absolute top-0 right-0 h-full bg-gray-500 transition-all duration-200" style={{ width: `${(stat.erodedMaxHp / stat.maxHp) * 100}%` }}></div>}
                                 </div>
                             ) : (
                                 <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mb-1 relative">
                                     <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${Math.max(0, stat.hp / stat.maxHp * 100)}%` }}></div>
                                     {stat.erodedMaxHp > 0 && <div className="absolute top-0 right-0 h-full bg-gray-500 transition-all duration-200" style={{ width: `${(stat.erodedMaxHp / stat.maxHp) * 100}%` }}></div>}
                                 </div>
                             )}
                             {!(isDummy || isEndless) && (
                                 <React.Fragment>
                                     <div className="flex justify-between text-[11px] mt-2 text-yellow-300 font-semibold bg-gray-800/50 p-1.5 rounded border border-gray-700"><span>機制狀態</span><span className="text-right tracking-wide">{stat.scale || '-'}</span></div>
                                     <div className="flex justify-between text-[10px] text-gray-400 border-t border-gray-700/50 pt-1.5 mt-1.5">
                                         <span>總傷害: <span className="text-indigo-300 font-bold text-xs">{stat.totalDmg}</span></span>
                                         <span>DPS: <span className="text-orange-300 font-bold text-xs">{stat.dps}</span></span>
                                     </div>
                                 </React.Fragment>
                             )}
                         </div>
                     )}
                 </div>
             );
          };


          const renderTeamCard = (side) => {
             const isP1 = side === 'p1';
             const baseIds = isP1 ? p1Ids : p2Ids;
             const setter = isP1 ? setP1Ids : setP2Ids;
             const count = isP1 ? (gameMode === '1v4' ? 4 : 3) : (gameMode === '1v4' ? 1 : 3);
             const ids = baseIds.slice(0, count);
             
             const teamLabel = gameMode === '1v4' ? (isP1 ? '討伐小隊 (HP:250)' : '首領 BOSS (HP:5000)') : `Team ${isP1 ? '1' : '2'}`;
             
             return (
               <div className={`p-3 rounded-xl border-2 ${isP1 ? 'border-blue-500 bg-blue-950/30' : 'border-red-500 bg-red-950/30'} flex flex-col gap-2 transition-all duration-300 w-full`}>
                 <div className="flex justify-between items-center mb-1">
                     <span className={`text-sm font-bold ${isP1 ? 'text-blue-400' : 'text-red-400'}`}>{teamLabel}</span>
                     <Users size={16} className={isP1 ? 'text-blue-400' : 'text-red-400'} />
                 </div>
                 
                 {ids.map((cid, index) => {
                     const char = ROSTER[cid];
                     const stat = uiStats[side]?.[index];
                     return (
                       <div key={index} className="flex flex-col gap-1 p-1.5 bg-gray-900/60 rounded-lg border border-gray-800 relative">
                         <div className="flex items-center gap-1.5">
                             <button onClick={() => toggleLock(side, index)} className={`shrink-0 p-0.5 rounded text-[10px] ${isP1 ? (p1Locks[index] ? 'bg-blue-600/50 text-white' : 'bg-transparent text-gray-600 hover:text-gray-400') : (p2Locks[index] ? 'bg-red-600/50 text-white' : 'bg-transparent text-gray-600 hover:text-gray-400')}`}>
                                 {isP1 ? (p1Locks[index] ? '🔒' : '🔓') : (p2Locks[index] ? '🔒' : '🔓')}
                             </button>
                             <select value={cid} onChange={(e) => { const newIds = [...baseIds]; newIds[index] = e.target.value; setter(newIds); }}
                                 disabled={gameState === 'playing'} className="bg-transparent text-white text-xs font-bold outline-none flex-1 truncate cursor-pointer hover:bg-gray-800 rounded px-1 py-0.5">
                               <CharacterOptions />
                             </select>
                         </div>
                         {gameState !== 'menu' && stat && (
                             <div className="mt-0.5">
                                 <div className="flex justify-between text-[10px] font-bold mb-0.5">
                                     <span className="text-gray-400">HP / Max {stat.erodedMaxHp > 0 && <span className="text-gray-500 ml-1 font-normal">(侵蝕 {Math.floor((stat.erodedMaxHp/stat.maxHp)*100)}%)</span>}</span>
                                     <span className={stat.hp < (gameMode === '3v3' || gameMode === 'dummy' || gameMode === '1v4' ? 150 : 30) ? 'text-red-400' : 'text-emerald-400'}>{Math.floor(stat.hp)} / {Math.floor(stat.maxHp - stat.erodedMaxHp)}</span>
                                 </div>
                                 {stat.isSplit ? (
                                     <div className="flex w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mb-1 relative">
                                         <div className="h-full bg-emerald-100 transition-all duration-200 border-r border-gray-900" style={{ width: `${(stat.mainHp / stat.maxHp) * 100}%` }}></div>
                                         <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${(stat.phantomHp / stat.maxHp) * 100}%` }}></div>
                                         {stat.erodedMaxHp > 0 && <div className="absolute top-0 right-0 h-full bg-gray-500 transition-all duration-200" style={{ width: `${(stat.erodedMaxHp / stat.maxHp) * 100}%` }}></div>}
                                     </div>
                                 ) : (
                                     <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mb-1 relative">
                                         <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${Math.max(0, stat.hp / stat.maxHp * 100)}%` }}></div>
                                         {stat.erodedMaxHp > 0 && <div className="absolute top-0 right-0 h-full bg-gray-500 transition-all duration-200" style={{ width: `${(stat.erodedMaxHp / stat.maxHp) * 100}%` }}></div>}
                                     </div>
                                 )}
                                 <div className="text-[10px] text-yellow-300 font-semibold tracking-wide truncate mb-1">{stat.scale}</div>
                                 <div className="flex justify-between text-[10px] text-gray-400 border-t border-gray-700/50 pt-1">
                                     <span>總傷害: <span className="text-indigo-300 font-bold">{stat.totalDmg}</span></span>
                                     <span>DPS: <span className="text-orange-300 font-bold">{stat.dps}</span></span>
                                 </div>
                             </div>
                         )}
                       </div>
                     );
                 })}
               </div>
             );
          };


          return (
            <div className="min-h-screen bg-gray-950 text-white font-sans p-4 flex flex-col items-center overflow-x-hidden">
              <header className="mb-4 text-center w-full max-w-[1280px] relative">
                <h1 className="text-2xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 drop-shadow-sm">
                  世界圈 · 武器球對決
                </h1>
                
                {gameState === 'menu' && (
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                       {[{ id: 'ffa', label: '單人作戰', color: 'indigo' }, { id: '3v3', label: '3v3 大亂鬥', color: 'orange' }, 
                         { id: '1v4', label: '1v4 討伐戰', color: 'rose' }, { id: 'test', label: '傷害測試', color: 'amber' }, 
                         { id: 'intervention', label: '神之手 (干預模式)', color: 'purple' }].map(m => (
                           <button key={m.id} onClick={() => setGameMode(m.id)} 
                                   className={`px-3 py-1 rounded-full text-xs font-bold border-2 transition-colors ${gameMode === m.id ? `bg-${m.color}-600 border-${m.color}-400 text-white shadow-[0_0_15px_currentColor]` : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                               {m.label}
                           </button>
                       ))}
                    </div>
                )}
                {gameState === 'menu' && gameMode === 'ffa' && (
                    <div className="mt-2.5 flex justify-center items-center gap-3 bg-gray-900/50 p-1.5 rounded-lg border border-gray-800 w-fit mx-auto">
                        <span className="text-gray-400 text-xs font-bold">參戰人數：</span>
                        {[2, 3, 4, 5].map(num => (
                            <button key={num} onClick={() => setFfaCount(num)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${ffaCount === num ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-indigo-400'}`}>
                                {Array(num).fill('1').join('v')}
                            </button>
                        ))}
                    </div>
                )}
                {gameState === 'menu' && gameMode === '3v3' && (
                    <div className="mt-2.5 flex justify-center items-center gap-3 bg-gray-900/50 p-1.5 rounded-lg border border-gray-800 w-fit mx-auto">
                        <span className="text-gray-400 text-xs font-bold">對戰場景：</span>
                        <button onClick={() => setScene('default')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${scene === 'default' ? 'bg-gray-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>常規競技場</button>
                        <button onClick={() => setScene('court')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${scene === 'court' ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.6)]' : 'text-gray-500 hover:text-indigo-400'}`}>星宇法庭</button>
                    </div>
                )}
                {gameState === 'menu' && gameMode === 'test' && (
                    <div className="mt-2.5 flex justify-center items-center gap-3 bg-gray-900/50 p-1.5 rounded-lg border border-gray-800 w-fit mx-auto">
                        <span className="text-gray-400 text-xs font-bold">測試項目：</span>
                        <button onClick={() => setTestType('dummy')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${testType === 'dummy' ? 'bg-amber-600 text-white shadow-md' : 'text-gray-500 hover:text-amber-400'}`}>巨大木樁</button>
                        <button onClick={() => setTestType('endless')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${testType === 'endless' ? 'bg-teal-600 text-white shadow-[0_0_10px_rgba(20,184,166,0.6)]' : 'text-gray-500 hover:text-teal-400'}`}>無盡生存</button>
                    </div>
                )}
                {gameState !== 'menu' && (
                    <p className="text-gray-400 text-xs mt-2 flex items-center justify-center gap-2">
                      <Activity size={14} className={{ 'test': testType === 'dummy' ? 'text-amber-400' : 'text-teal-400', 'intervention': 'text-purple-400', '1v4': 'text-rose-400', '3v3': 'text-orange-400' }[gameMode] || 'text-indigo-400'} /> 
                      {gameMode === '3v3' ? '大地圖亂鬥模式' : (gameMode === '1v4' ? '四人協力討伐巨型首領' : (gameMode === 'test' ? (testType === 'dummy' ? '極限 DPS 測試' : '無限波次生存挑戰') : (gameMode === 'intervention' ? '神明介入戰局' : '多陣營單人混戰')))} 
                      <Activity size={14} className={{ 'test': testType === 'dummy' ? 'text-amber-400' : 'text-teal-400', 'intervention': 'text-purple-400', '1v4': 'text-rose-400', '3v3': 'text-orange-400' }[gameMode] || 'text-indigo-400'} />
                    </p>
                )}
              </header>


              <div className="flex flex-col md:flex-row gap-4 w-full max-w-[1300px] justify-center items-start relative">
                
                {/* 左側：藍方 Player 1 */}
                <div className="w-full md:w-56 lg:w-64 flex flex-col gap-3 order-2 md:order-1 md:sticky top-4 shrink-0 max-h-[calc(100vh-2rem)] overflow-y-auto">
                   {gameMode === 'ffa' ? (
                       Array.from({length: Math.ceil(ffaCount/2)}).map((_, i) => renderFfaCard(i))
                   ) : ['test', 'intervention'].includes(gameMode) ? renderPlayerCard('p1') : renderTeamCard('p1')}
                   
                   {gameState === 'menu' && (
                       <div className="w-full flex flex-col gap-2 mt-1">
                          <button onClick={() => handleRandomMatch()} className="w-full py-2 rounded-xl text-xs font-bold border-2 bg-transparent border-teal-700 text-teal-400 hover:border-teal-500 hover:bg-teal-900/30 transition-colors flex items-center justify-center gap-2">
                              🎲 隨機配置陣容
                          </button>
                      </div>
                   )}
                </div>


                {/* 中間：戰場 Canvas 與控制列 */}
                <div className={`order-1 md:order-2 flex-1 w-full ${gameMode === '3v3' || gameMode === '1v4' ? 'max-w-[720px]' : 'max-w-[480px]'} flex flex-col items-center min-w-[280px]`}>
                    <div className="p-2 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-gray-700 w-full relative">
                        <canvas ref={canvasRef} width={gameMode === '3v3' || gameMode === '1v4' ? 900 : 600} height={gameMode === '3v3' || gameMode === '1v4' ? 900 : 600} className="bg-black rounded-xl block w-full h-auto aspect-square" />
                        
                        {gameState === 'over' && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 rounded-2xl backdrop-blur-md">
                                <div className="text-center bg-gray-900 p-6 rounded-2xl border border-gray-700 shadow-2xl transform scale-100">
                                    <h2 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 drop-shadow-md">
                                        {winner === 'draw' ? '平局' : (gameMode === 'test' ? (testType === 'dummy' ? (winner === 'p1' ? '挑戰成功' : '時間耗盡') : '挑戰結束！') : (gameMode === '1v4' ? (winner === 'p1' ? '討伐成功！' : '首領獲勝！') : (gameMode === 'ffa' ? `Player ${winner.replace('p', '')} 勝出` : `Team ${winner === 'p1' ? '1' : '2'} 勝出`)))}
                                    </h2>
                                    <p className="text-gray-400 mb-5 text-sm">{gameMode === 'test' ? (testType === 'dummy' ? '木樁測試結束' : `共存活了 ${engineRef.current?.endlessWave - 1} 波`) : (gameMode === '1v4' ? '討伐戰結束' : '全自動機制演練完畢')}</p>
                                    <button onClick={goToMenu} className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold flex items-center gap-2 mx-auto transition-colors border border-gray-600 shadow-lg text-sm">
                                        <RotateCcw size={16} /> 返回配置
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {gameState === 'menu' && (
                        <div className="w-full mt-3">
                            <button onClick={() => startGame()} className={`w-full py-3 rounded-xl font-bold text-base shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 transition-transform active:scale-95 ${gameMode === '3v3' ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500' : (gameMode === '1v4' ? 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500' : (gameMode === 'test' ? (testType === 'dummy' ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500' : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500') : (gameMode === 'intervention' ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500')))}`}>
                                <Play size={20} fill="currentColor" /> {gameMode === '3v3' ? '展開大亂鬥' : (gameMode === '1v4' ? '開始討伐' : (gameMode === 'test' ? (testType === 'dummy' ? '開始木樁測試' : '開始無盡生存') : (gameMode === 'intervention' ? '降臨干預模式' : '啟動大逃殺')))}
                            </button>
                        </div>
                    )}


                    {gameState === 'playing' && (
                        <div className="flex flex-col gap-2.5 mt-3 w-full">
                            {gameMode === 'intervention' && (
                                <div className="w-full p-3 rounded-xl border-2 border-purple-500 bg-purple-900/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                                    <h3 className="text-purple-300 font-bold mb-2 text-center text-sm tracking-widest border-b border-purple-500/30 pb-1.5">✨ 神之手干預</h3>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button onClick={() => triggerIntervention('heal')} className="py-1.5 bg-emerald-600/30 border border-emerald-500 text-emerald-300 hover:bg-emerald-600/50 rounded text-xs font-bold transition-colors">🩸 天降聖餐</button>
                                        <button onClick={() => triggerIntervention('bomb')} className="py-1.5 bg-red-600/30 border border-red-500 text-red-300 hover:bg-red-600/50 rounded text-xs font-bold transition-colors">☄️ 天降火雨</button>
                                        <button onClick={() => triggerIntervention('chaos')} className="py-1.5 bg-violet-600/30 border border-violet-500 text-violet-300 hover:bg-violet-600/50 rounded text-xs font-bold transition-colors">🌀 混亂風暴</button>
                                        <button onClick={() => triggerIntervention('stun')} className="py-1.5 bg-amber-600/30 border border-amber-500 text-amber-300 hover:bg-amber-600/50 rounded text-xs font-bold transition-colors">⏳ 時間凍結</button>
                                        <button onClick={() => triggerIntervention('rule_damage')} className="py-1.5 col-span-2 bg-gray-800 border border-gray-500 text-gray-300 hover:bg-gray-700 rounded text-xs font-bold transition-colors mt-0.5">⚔️ 切換死鬥法則 (200%傷害)</button>
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-2 w-full">
                                <button onClick={toggleSpeed} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-1 transition-colors ${gameSpeed === 2 ? 'bg-indigo-600/80 border-indigo-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'}`}>
                                  <FastForward size={16} fill="currentColor" /> {gameSpeed}x
                                </button>
                                <button onClick={togglePause} className={`flex-[1.5] py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${isPaused ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'}`}>
                                  {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />} 
                                  {isPaused ? '繼續' : '暫停'}
                                </button>
                                <button onClick={goToMenu} className="flex-1 py-2.5 bg-red-600/90 hover:bg-red-500 rounded-xl text-sm font-bold flex items-center justify-center gap-1 transition-transform active:scale-95 text-white">
                                  <RotateCcw size={16} /> 返回
                                </button>
                            </div>
                        </div>
                    )}
                </div>


                {/* 右側：紅方 Player 2 */}
                <div className="w-full md:w-56 lg:w-64 flex flex-col gap-3 order-3 md:sticky top-4 shrink-0 max-h-[calc(100vh-2rem)] overflow-y-auto">
                   {gameMode === 'ffa' ? (
                       Array.from({length: Math.floor(ffaCount/2)}).map((_, i) => renderFfaCard(i + Math.ceil(ffaCount/2)))
                   ) : ['test', 'intervention'].includes(gameMode) ? renderPlayerCard('p2', gameMode === 'test' ? testType : null) : renderTeamCard('p2')}
                </div>


              </div>
            </div>
          );
        }


        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
