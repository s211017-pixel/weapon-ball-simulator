// Character data and skill logic live here so balance changes do not require
// reopening the UI and engine flow.
const ROSTER = {
          cacamus: {
            id: 'cacamus', faction: 'TimeAdmin', name: '卡卡繆思', title: '棋手 / 西西里防禦', color: '#E5E7EB', mass: 1.0,
            desc: '【性相】啟之性相\n【被動】展開8x8棋盤，自身死亡時棋盤與棋子一同消散。每10秒、血量減少或碰角落可增兵。\n【主動】每5秒部署兵。\n【棋子】具備70點血量，視為不可鎖定之實體。每3秒移動並造成十字範圍傷害，形成實體持續阻擋敵人。',
            initLogic: (ball) => { 
                ball.pawnsInHand = 2; ball.pawnGenTimer = 0; ball.pawnDeployTimer = 0; 
                ball.cornerCooldowns = [0, 0, 0, 0]; ball.lastHpMilestone = ball.maxHp; 
                ball.scalingValue = `手牌: 2 兵`; 
            },
            update: (ball, engine) => {
                // 1. 條件增兵：時間 (每10秒)
                ball.pawnGenTimer += DT;
                if (ball.pawnGenTimer >= 10) {
                    ball.pawnGenTimer = 0;
                    if (ball.pawnsInHand < 8) { ball.pawnsInHand++; engine.spawnParticle({type:'text', x:ball.x, y:ball.y-30, text:'+1 兵 (時間)', color:'#E5E7EB'}); }
                }


                // 2. 條件增兵：血量 (每損失 10%)
                if (ball.lastHpMilestone - ball.hp >= ball.maxHp * 0.1) {
                    ball.lastHpMilestone -= ball.maxHp * 0.1;
                    if (ball.pawnsInHand < 8) { ball.pawnsInHand++; engine.spawnParticle({type:'text', x:ball.x, y:ball.y-30, text:'+1 兵 (受損)', color:'#E5E7EB'}); }
                }


                // 3. 條件增兵：觸碰四個角落
                const corners = [ {x: 0, y: 0}, {x: engine.arenaSize, y: 0}, {x: 0, y: engine.arenaSize}, {x: engine.arenaSize, y: engine.arenaSize} ];
                corners.forEach((c, idx) => {
                    if (ball.cornerCooldowns[idx] > 0) ball.cornerCooldowns[idx] -= DT;
                    else if (distance(ball.x, ball.y, c.x, c.y) < 120) {
                        if (ball.pawnsInHand < 8) { ball.pawnsInHand++; engine.spawnParticle({type:'text', x:ball.x, y:ball.y-30, text:'+1 兵 (角落)', color:'#E5E7EB'}); }
                        ball.cornerCooldowns[idx] = 10; 
                    }
                });


                // 部署兵
                ball.pawnDeployTimer += DT;
                if (ball.pawnDeployTimer >= 5) {
                    ball.pawnDeployTimer = 0;
                    let piecesOnBoard = engine.balls.filter(b => b.isChessPiece && b.ownerId === ball.uniqueId && b.hp > 0).length;
                    
                    // 一口氣放置手牌區的所有兵（直到場上達到 8 顆上限）
                    while (ball.pawnsInHand > 0 && piecesOnBoard < 8) {
                        // 一半機率護衛自己，一半機率追擊敵人
                        const pBehavior = Math.random() < 0.5 ? 'protect' : 'attack';
                        const nearestEnemy = engine.getNearestEnemy(ball);
                        let deployTarget = pBehavior === 'protect' ? ball : nearestEnemy;
                        if (!deployTarget) deployTarget = ball;


                        const cellSize = engine.arenaSize / 8;
                        let tCol = Math.floor(deployTarget.x / cellSize);
                        let tRow = Math.floor(deployTarget.y / cellSize);
                        tCol = Math.max(0, Math.min(7, tCol));
                        tRow = Math.max(0, Math.min(7, tRow));
                        
                        // 不管生在哪裡，兵前進的方向永遠面向最近的敵人
                        const dir = nearestEnemy ? (nearestEnemy.y > ball.y ? 1 : -1) : 1;


                        // 防重疊邏輯：如果該格子已有棋子，尋找周圍最近的空位
                        const isOccupied = (c, r) => engine.balls.some(b => b.isChessPiece && b.col === c && b.row === r && b.hp > 0);
                        if (isOccupied(tCol, tRow)) {
                            let found = false;
                            for (let radius = 1; radius < 8 && !found; radius++) {
                                for (let dc = -radius; dc <= radius && !found; dc++) {
                                    for (let dr = -radius; dr <= radius && !found; dr++) {
                                        let nc = tCol + dc, nr = tRow + dr;
                                        if (nc >= 0 && nc <= 7 && nr >= 0 && nr <= 7 && !isOccupied(nc, nr)) {
                                            tCol = nc; tRow = nr; found = true;
                                        }
                                    }
                                }
                            }
                        }


                        // 直接升變邏輯：如果生成在最頂端或最底端，直接成為高級棋子
                        let pType = 'pawn';
                        if (tRow === 0 || tRow === 7) {
                            const pieces = ['knight', 'bishop', 'rook', 'queen'];
                            pType = pieces[Math.floor(Math.random() * pieces.length)];
                            engine.spawnParticle({type:'text', x: (tCol + 0.5) * cellSize, y: (tRow + 0.5) * cellSize - 30, text:'✨ 升變!', color:'#FCD34D'});
                        }


                        engine.spawnParticle({type:'text', x: (tCol + 0.5) * cellSize, y: (tRow + 0.5) * cellSize - 40, text: pBehavior === 'protect' ? '🛡️ 護衛' : '⚔️ 突擊', color:'#9CA3AF', maxLifespan: 1.0});


                        const pieceBall = engine.createBall(ROSTER.chess_piece, ball.team, `${ball.uniqueId}_piece_${Date.now()}_${Math.random()}`, false, 70, (tCol + 0.5) * cellSize, (tRow + 0.5) * cellSize);
                        pieceBall.ownerId = ball.uniqueId;
                        pieceBall.pieceType = pType;
                        pieceBall.col = tCol; pieceBall.row = tRow;
                        pieceBall.direction = dir;
                        pieceBall.behavior = pBehavior;
                        pieceBall.color = ball.color;
                        engine.balls.push(pieceBall);
                        
                        ball.pawnsInHand--;
                        piecesOnBoard++; // 同步更新場上數量，確保 while 迴圈上限判斷正確
                    }
                }
                const currentPiecesOnBoard = engine.balls.filter(b => b.isChessPiece && b.ownerId === ball.uniqueId && b.hp > 0).length;
                ball.scalingValue = `場上: ${currentPiecesOnBoard}/8 | 手牌: ${ball.pawnsInHand}/8 兵 | 產出: ${(10 - ball.pawnGenTimer).toFixed(1)}s`;
            }
          },
          carrie: {
            id: 'carrie', faction: 'TimeAdmin', name: '奧恩斯·凱瑞', title: '坦克 / 蓄壓反擊', color: '#4A6FA5', mass: 1.8,
            desc: '【性相】穩之性相\n【被動】承受物理攻擊時轉為壓力，壓力越高減傷越高(最高50%)。\n【主動】壓力滿(3層)時釋放高速彈片。\n【成長】永久提升彈片傷害。',
            initLogic: (ball) => { ball.pressure = 0; ball.maxPressure = 3; ball.shrapnelDmg = 4; ball.scalingValue = `蓄壓: 0/3`; },
            onTakeDamage: (ball, amount, source, engine, damageType) => {
              const drRate = Math.min(0.5, (ball.pressure / ball.maxPressure) * 0.5);
              const actualDamage = amount * (1 - drRate);
              if (['collision', 'projectile', 'wall_collision'].includes(damageType)) {
                  ball.pressure += 1 * (ball.noGrowth ? 0 : 1); 
                  ball.scalingValue = `蓄壓: ${Math.floor(ball.pressure)}/3 | 彈片傷害: ${ball.shrapnelDmg.toFixed(1)}`;
                  if (ball.pressure >= ball.maxPressure) {
                    const shrapnelCount = 9;
                    for (let i = 0; i < shrapnelCount; i++) {
                      const angle = (Math.PI * 2 * i) / shrapnelCount;
                      engine.spawnProjectile({
                        x: ball.x, y: ball.y, vx: Math.cos(angle) * 500, vy: Math.sin(angle) * 500,
                        radius: 6, color: '#A0BBE8', ownerId: ball.uniqueId, damage: ball.shrapnelDmg, bounces: 2, lifespan: 3
                      });
                    }
                    ball.pressure = 0;
                    ball.shrapnelDmg += 2 * (ball.noGrowth ? 0 : 1); 
                    ball.scalingValue = `蓄壓: 0/3 | 彈片傷害: ${ball.shrapnelDmg.toFixed(1)}`;
                  }
              }
              return actualDamage; 
            }
          },
          melis: {
            id: 'melis', faction: 'TimeAdmin', name: '梅樂絲·布雷茲', title: '元素 / 範圍灼燒', color: '#FF6B35', mass: 1.0,
            desc: '【性相】氳之性相 / 沌之性相\n【被動】召喚火靈。自身碰撞或火靈命中皆附加燃燒。\n【主動】若受致命傷，免疫該傷並消耗傷害紀錄恢復血量，擴散火環引爆燃燒(每局一次)。\n【成長】永久提升燃燒秒傷。',
            initLogic: (ball) => { ball.burnDamage = 1.5; ball.scalingValue = `燃燒秒傷: ${ball.burnDamage.toFixed(1)}`; ball.spiritTimer = 0; ball.hasRevived = false; },
            update: (ball, engine) => {
              ball.spiritTimer += DT;
              if (ball.spiritTimer >= 6) {
                 ball.spiritTimer = 0;
                 engine.spawnProjectile({
                    type: 'spirit', x: ball.x, y: ball.y, vx: (Math.random() - 0.5) * 150, vy: (Math.random() - 0.5) * 150,
                    radius: 12, color: '#FF4500', ownerId: ball.uniqueId, damage: 0, bounces: 1, lifespan: 4,
                    isTracking: true, maxSpeed: 180,
                    onHit: (proj, target, eng) => {
                       eng.applyStatus(target.uniqueId, 'burn', { duration: 3, dps: ball.burnDamage, sourceId: ball.uniqueId });
                       ball.burnDamage += 0.4 * (ball.noGrowth ? 0 : 1);
                       ball.scalingValue = `燃燒秒傷: ${ball.burnDamage.toFixed(1)}`;
                    }
                 });
              }
            },
            onCollide: (ball, other, relSpeed, engine) => {
              engine.applyStatus(other.uniqueId, 'burn', { duration: 3, dps: ball.burnDamage, sourceId: ball.uniqueId });
              ball.burnDamage += 0.4 * (ball.noGrowth ? 0 : 1);
              ball.scalingValue = `燃燒秒傷: ${ball.burnDamage.toFixed(1)}`;
            }
          },
          eli: {
            id: 'eli', faction: 'TimeAdmin', name: '伊萊·萊特', title: '機動 / 劍環聯動', color: '#E0FAFF', mass: 0.9,
            desc: '【性相】啟之性相\n【被動】真理之劍逆時針高速環繞周身，洞穿觸碰的敵人。\n【主動】碰撞發射必然收束的螺旋環刃。\n【成長】環刃與劍命中皆增加環刃數量與傷害(各0.25)。',
            initLogic: (ball) => {
              ball.ringDmg = 4; ball.ringCountRaw = 1; ball.ringCount = 1; ball.ringHits = 0;
              ball.rapierAngle = 0; ball.rapierCooldowns = {};
              ball.scalingValue = `數量: ${ball.ringCount} | 傷害: ${ball.ringDmg.toFixed(2)}`;
              ball.speedMult = 1.2; 
            },
            update: (ball, engine) => {
              ball.rapierAngle -= 10 * DT; 
              const rRadius = ball.radius + 35;
              const swordX = ball.x + Math.cos(ball.rapierAngle) * rRadius;
              const swordY = ball.y + Math.sin(ball.rapierAngle) * rRadius;
              
              Object.keys(ball.rapierCooldowns).forEach(k => ball.rapierCooldowns[k] -= DT);
              engine.balls.forEach(target => {
                if (target.hp <= 0 || !engine.isEnemy(target.uniqueId, ball.uniqueId) || target.isBlank) return;
                const cd = ball.rapierCooldowns[target.uniqueId] || 0;
                if (cd <= 0 && distance(swordX, swordY, target.x, target.y) < target.radius + 20) {
                   engine.applyDamage(target, 5, ball.uniqueId, 'collision'); 
                   ball.rapierCooldowns[target.uniqueId] = 0.5;
                   if (!ball.noGrowth) { ball.ringHits++; ball.ringDmg += 0.25; ball.ringCountRaw += 0.25; ball.ringCount = Math.floor(ball.ringCountRaw); }
                   ball.scalingValue = `數量: ${ball.ringCount} | 傷害: ${ball.ringDmg.toFixed(2)}`;
                }
              });
            },
            onCollide: (ball, other, relSpeed, engine) => {
              for (let i = 0; i < ball.ringCount; i++) {
                const norm = normalize(ball.vx, ball.vy);
                const angleOffset = ball.ringCount > 1 ? (Math.PI / 8) * (i - (ball.ringCount - 1) / 2) : 0;
                const cosT = Math.cos(angleOffset), sinT = Math.sin(angleOffset);
                const dirX = -norm.x * cosT - (-norm.y) * sinT, dirY = -norm.x * sinT + (-norm.y) * cosT;


                engine.spawnProjectile({
                  type: 'ring', x: ball.x, y: ball.y, vx: dirX * 200 + (Math.random()-0.5)*50, vy: dirY * 200 + (Math.random()-0.5)*50,
                  radius: 10, color: '#00FFFF', ownerId: ball.uniqueId, damage: ball.ringDmg, bounces: 3, lifespan: 4,
                  customUpdate: (p, dt) => {
                    const rotationSpeed = 8, dTheta = -rotationSpeed * dt; 
                    const cos = Math.cos(dTheta), sin = Math.sin(dTheta);
                    let nvx = p.vx * cos - p.vy * sin, nvy = p.vx * sin + p.vy * cos;
                    const currentSpeed = Math.hypot(nvx, nvy);
                    const newSpeed = currentSpeed + 120 * dt; 
                    p.vx = (nvx / currentSpeed) * newSpeed; p.vy = (nvy / currentSpeed) * newSpeed;
                  },
                  onHit: (proj, target, engine) => {
                    if (!ball.noGrowth) { ball.ringHits++; ball.ringDmg += 0.25; ball.ringCountRaw += 0.25; ball.ringCount = Math.floor(ball.ringCountRaw); }
                    ball.scalingValue = `數量: ${ball.ringCount} | 傷害: ${ball.ringDmg.toFixed(2)}`;
                  }
                });
              }
            }
          },
          abraham: {
            id: 'abraham', faction: 'TimeAdmin', name: '亞伯拉罕·慕恩', title: '支援 / 全場干預', color: '#D4AF37', mass: 1.2,
            desc: '【性相】穩之性相\n【被動】對己方提供治癒與淨化，並給予機制成長與觸發主動技能。\n【主動】每 5 秒發出創世鐘聲排斥彈道。波紋對敵方造成傷害、暈眩並重置機制。',
            initLogic: (ball) => { ball.bellTimer = 0; ball.waveRadius = 100; ball.scalingValue = `鐘聲半徑: ${ball.waveRadius}`; },
            update: (ball, engine) => {
              ball.bellTimer += DT;
              if (ball.bellTimer >= 5) { 
                ball.bellTimer = 0;
                const deceleration = 2000; 
                const initialSpeed = Math.sqrt(2 * deceleration * ball.waveRadius); 


                engine.spawnWave({
                  x: ball.x, y: ball.y, startRadius: 0, maxRadius: ball.waveRadius, 
                  speed: initialSpeed, deceleration: deceleration, 
                  color: '#F1D302', ownerId: ball.uniqueId, lingerDuration: 1.5, deflectsProjectiles: true, 
                  onHit: (target) => {
                    if (engine.isEnemy(target.uniqueId, ball.uniqueId)) {
                        engine.applyDamage(target, 8, ball.uniqueId, 'magic');
                        const norm = normalize(target.x - ball.x, target.y - ball.y);
                        engine.applyStatus(target.uniqueId, 'bell_shock', { duration: 0.5, dx: norm.x, dy: norm.y });
                        engine.applyStatus(target.uniqueId, 'stun', { duration: 1.5 });


                        const effectiveId = target.copied || target.id;
                        if (effectiveId === 'cacamus') { target.pawnsInHand = 0; target.scalingValue = `手牌: 0/8 兵 | 產出: ${(10 - target.pawnGenTimer).toFixed(1)}s`; }
                        if (effectiveId === 'carrie') { target.pressure = 0; target.maxPressure = 3; target.shrapnelDmg = 4; target.scalingValue = `蓄壓: 0/3`; }
                        if (effectiveId === 'melis') { target.burnDamage = 1.5; target.scalingValue = `燃燒秒傷: ${target.burnDamage.toFixed(1)}`; }
                        if (effectiveId === 'eli') { target.ringDmg = 4; target.ringCountRaw = 1; target.ringCount = 1; target.ringHits = 0; target.scalingValue = `數量: 1 | 傷害: 4.00`; }
                        if (effectiveId === 'gordon') { target.tokens = 0; target.daggerCount = 1; target.scalingValue = `籌碼數: 0 (匕首: 1把)`; }
                        if (effectiveId === 'thoth') { target.massStacks = 0; target.mass = 1.8; target.scalingValue = `質量層數: 0`; }
                        if (effectiveId === 'cetus') { target.convictDmg = 10; target.scalingValue = `定罪傷害: 10`; }
                        if (effectiveId === 'ino') { target.bounces = 0; target.scalingValue = `彈射次數: 0`; }
                        if (effectiveId === 'kate') { target.wallDamage = 5; target.scalingValue = `能量牆秒傷: 5.0 (共 ${target.walls ? target.walls.length : 0}/3 道)`; }
                        if (effectiveId === 'olynx') { target.materials = 0; target.bonusLifespan = 0; target.generateCount = 0; target.scalingValue = `原料: 0/3 (延時: +0s)`; }
                        if (effectiveId === 'miller') { target.doomHeal = {}; } 
                        if (effectiveId === 'hao') { target.totalDistance = 0; target.currentPaint = 'blue'; target.redPhase = false; target.radius = BALL_RADIUS * (target.radiusMult || 1); target.mass = ROSTER[effectiveId].mass; target.speedMult = 1.0; target.scalingValue = `藍墨 | 距離: 0`; }
                        if (effectiveId === 'fasimir') { target.stacks = 0; target.ultimate = false; target.scalingValue = `進入: 0/10`; } 
                        if (effectiveId === 'grimm') { target.collectedCores = 0; target.isGathering = false; target.isSlashing = false; target.scalingValue = `念核: 0/12 | 受擊: ${target.hitCount}`; } 


                        // 移除半徑成長的天花板，讓鐘聲範圍能夠無限擴張
                        ball.waveRadius += 10 * (ball.noGrowth ? 0 : 1);
                        ball.scalingValue = `鐘聲半徑: ${Math.floor(ball.waveRadius)}`;
                    } else {
                        engine.applyHeal(target, 10);
                        engine.spawnParticle({ type: 'text', x: target.x, y: target.y - 20, text: '✨ 淨化', color: '#F1D302' });
                        if (target.statuses) {
                            target.statuses = target.statuses.filter(s => !['burn', 'stun', 'slow', 'rooted', 'silenced', 'warning', 'bell_shock'].includes(s.type));
                        }
                        
                        if (target.uniqueId !== ball.uniqueId) {
                            const effectiveId = target.copied || target.id;
                            if (effectiveId === 'cacamus') { if (target.pawnsInHand < 8) target.pawnsInHand += 1 * (target.noGrowth ? 0 : 1); }
                            else if (effectiveId === 'carrie') { 
                                target.shrapnelDmg += 2 * (target.noGrowth ? 0 : 1);
                                const shrapnelCount = 9;
                                for (let i = 0; i < shrapnelCount; i++) {
                                    const angle = (Math.PI * 2 * i) / shrapnelCount;
                                    engine.spawnProjectile({
                                        x: target.x, y: target.y, vx: Math.cos(angle) * 500, vy: Math.sin(angle) * 500,
                                        radius: 6, color: '#A0BBE8', ownerId: target.uniqueId, damage: target.shrapnelDmg, bounces: 2, lifespan: 3
                                    });
                                }
                            } else if (effectiveId === 'melis') { target.burnDamage += 0.4 * (target.noGrowth ? 0 : 1); target.spiritTimer = 99; }
                            else if (effectiveId === 'eli') { 
                                if (!target.noGrowth) { target.ringHits += 3; target.ringDmg += 0.75; target.ringCountRaw += 0.75; target.ringCount = Math.floor(target.ringCountRaw); }
                                if (ROSTER.eli.onCollide) ROSTER.eli.onCollide(target, target, 0, engine);
                            } else if (effectiveId === 'gordon') { target.tokens += 1 * (target.noGrowth ? 0 : 1); target.daggerCount = 1 + Math.floor(target.tokens / 2); target.daggerTimer = 99; }
                            else if (effectiveId === 'thoth') { if (!target.noGrowth) { target.massStacks++; target.mass += 0.4; } target.beamTimer = 99; }
                            else if (effectiveId === 'cetus') { target.convictDmg += 2 * (target.noGrowth ? 0 : 1); target.pageTimer = 99; }
                            else if (effectiveId === 'ino') { target.bounces += 1 * (target.noGrowth ? 0 : 1); target.birdTimer = 99; target.scalingValue = `彈射次數: ${Math.floor(target.bounces)}`; }
                            else if (effectiveId === 'kate') { target.wallDamage += 1.25 * (target.noGrowth ? 0 : 1); }
                            else if (effectiveId === 'olynx') { target.materials = 3; target.generateCount += 1 * (target.noGrowth ? 0 : 1); if (ROSTER.olynx.onWallBounce) ROSTER.olynx.onWallBounce(target, engine); }
                            else if (effectiveId === 'miller') { target.sacramentTimer = 99; target.sproutTimer = 99; target.knightTimer = 99; target.steedTimer = 99; }
                            else if (effectiveId === 'isaac') { target.wordTimer = 99; }
                            else if (effectiveId === 'anonymous') { target.skillTimer = 99; }
                            else if (effectiveId === 'ocalis') { target.proofreadTimer = 99; }
                            else if (effectiveId === 'kongmie') { target.actTimer += 5; }
                            else if (effectiveId === 'hao') { target.totalDistance += 3000; } 
                            else if (effectiveId === 'fasimir') { target.stacks += 1 * (target.noGrowth ? 0 : 1); } 
                            else if (effectiveId === 'grimm') { 
                                if (!target.noGrowth) target.collectedCores++; 
                                target.scalingValue = `念核: ${target.collectedCores}/12 | 受擊: ${target.hitCount}`;
                            } 
                        }
                    }
                  }
                });
              }
            }
          },
          gordon: {
            id: 'gordon', faction: 'TimeAdmin', name: '戈登', title: '賭博 / 隨機強化', color: '#F9DC5C', mass: 1.0,
            desc: '【性相】意之性相\n【被動】定期投擲匕首。碰撞或匕首命中時60%機率觸發賭局。勝：傷害3.5倍，負：減半。\n【成長】獲勝得籌碼，增加匕首數量(無上限)。',
            initLogic: (ball) => { ball.tokens = 0; ball.daggerCount = 1; ball.scalingValue = `籌碼數: 0 (匕首: 1把)`; ball.daggerTimer = 0; },
            gamble: (ball, baseDamage, engine, x, y) => {
              let finalDmg = baseDamage;
              if (Math.random() < 0.60) { 
                if (Math.random() < 0.55) {
                  engine.spawnParticle({ type: 'text', x: x, y: y - 30, text: '💰 3.5x!', color: '#F9DC5C' });
                  finalDmg *= 3.5; 
                  ball.tokens += 1 * (ball.noGrowth ? 0 : 1);
                  ball.daggerCount = 1 + Math.floor(ball.tokens / 2);
                  ball.scalingValue = `籌碼數: ${Math.floor(ball.tokens)} (匕首: ${ball.daggerCount}把)`;
                } else {
                  engine.spawnParticle({ type: 'text', x: x, y: y - 30, text: '📉 0.5x', color: '#888888' });
                  finalDmg *= 0.5;
                }
              }
              return finalDmg;
            },
            update: (ball, engine) => {
               ball.daggerTimer += DT;
               if (ball.daggerTimer >= 3) {
                   ball.daggerTimer = 0;
                   const target = engine.getNearestEnemy(ball);
                   const norm = target ? normalize(target.x - ball.x, target.y - ball.y) : normalize(ball.vx, ball.vy);
                   const baseAngle = Math.atan2(norm.y, norm.x);
                   const spreadAngle = Math.PI / 3; 
                   const startAngle = ball.daggerCount > 1 ? baseAngle - spreadAngle / 2 : baseAngle;
                   const angleStep = ball.daggerCount > 1 ? spreadAngle / (ball.daggerCount - 1) : 0;
                   for (let i = 0; i < ball.daggerCount; i++) {
                       const finalAngle = startAngle + i * angleStep;
                       engine.spawnProjectile({
                          type: 'dagger', x: ball.x, y: ball.y, vx: Math.cos(finalAngle) * 500, vy: Math.sin(finalAngle) * 500,
                          radius: 6, color: '#FFD700', ownerId: ball.uniqueId, damage: 0, bounces: 1, lifespan: 3,
                          onHit: (proj, t, eng) => eng.applyDamage(t, ROSTER.gordon.gamble(ball, 6, eng, t.x, t.y), ball.uniqueId, 'magic')
                       });
                   }
               }
            },
            modifyDamageOut: (ball, baseDamage, engine) => ROSTER.gordon.gamble(ball, baseDamage, engine, ball.x, ball.y)
          },
          thoth: {
            id: 'thoth', faction: 'TimeAdmin', name: '托特·歐珀', title: '重擊 / 質量積累', color: '#5B5F66', mass: 1.8, radiusMult: 1.2, 
            desc: '【性相】穩之性相\n【被動】碰撞提升質量(無上限)，附加擊退狀態。\n【主動】每 5.5 秒，0.5秒預瞄後發射光束擊退敵人。\n【成長】每三層質量為所有傷害+1。',
            initLogic: (ball) => { ball.massStacks = 0; ball.scalingValue = `質量層數: ${ball.massStacks}`; ball.beamTimer = 0; ball.isAiming = false; ball.aimTimer = 0; },
            modifyDamageOut: (ball, baseDamage, engine) => baseDamage + Math.floor(ball.massStacks / 3),
            onCollide: (ball, other, relSpeed, engine) => {
              engine.applyStatus(other.uniqueId, 'knockback', { duration: 1.5, sourceId: ball.uniqueId });
              if (!ball.noGrowth) { ball.massStacks++; ball.mass += 0.4; }
              ball.scalingValue = `質量層數: ${Math.floor(ball.massStacks)}`;
            },
            update: (ball, engine) => {
              if (ball.isAiming) {
                ball.aimTimer -= DT;
                if (ball.aimTimer > 0.1) {
                  const target = engine.getNearestEnemy(ball);
                  if (target) ball.aimDir = normalize(target.x - ball.x, target.y - ball.y);
                }
                if (ball.aimTimer <= 0) {
                  ball.isAiming = false;
                  const endX = ball.x + ball.aimDir.x * engine.arenaSize * 2;
                  const endY = ball.y + ball.aimDir.y * engine.arenaSize * 2;
                  engine.balls.forEach(t => {
                      if (t.hp > 0 && engine.isEnemy(t.uniqueId, ball.uniqueId) && !t.isBlank) {
                          const dist = Math.abs(ball.aimDir.y * t.x - ball.aimDir.x * t.y + ball.aimDir.x * ball.y - ball.aimDir.y * ball.x);
                          const dot = (t.x - ball.x) * ball.aimDir.x + (t.y - ball.y) * ball.aimDir.y;
                          if (dist < t.radius + 15 && dot > 0) {
                              engine.applyDamage(t, 5 + Math.floor(ball.massStacks / 3), ball.uniqueId, 'magic'); 
                              engine.applyStatus(t.uniqueId, 'knockback', { duration: 1.5, sourceId: ball.uniqueId });
                              const pushForce = 600 + (ball.massStacks * 25);
                              t.vx += ball.aimDir.x * pushForce; t.vy += ball.aimDir.y * pushForce;
                              if (!ball.noGrowth) { ball.massStacks++; ball.mass += 0.4; }
                              ball.scalingValue = `質量層數: ${Math.floor(ball.massStacks)}`;
                          }
                      }
                  });
                  engine.spawnParticle({ type: 'laser', x: ball.x, y: ball.y, tx: endX, ty: endY, color: '#A9A9A9', lifespan: 0.2, maxLifespan: 0.2 });
                }
              } else {
                ball.beamTimer += DT;
                if (ball.beamTimer >= 5.5) {
                  ball.beamTimer = 0;
                  const target = engine.getNearestEnemy(ball);
                  if (target) { ball.isAiming = true; ball.aimTimer = 0.5; ball.aimDir = normalize(target.x - ball.x, target.y - ball.y); }
                }
              }
            }
          },
          cetus: {
            id: 'cetus', faction: 'TimeAdmin', name: '塞特斯', title: '控制 / 規則懲戒', color: '#8A2BE2', mass: 1.1,
            desc: '【性相】穩之性相\n【被動】免疫警告目標的傷害。直接改變軌道飛撞警告目標，引爆定罪並附加擊退。\n【主動】發射法令附加警告。',
            initLogic: (ball) => { ball.pageTimer = 0; ball.convictDmg = 10; ball.scalingValue = `定罪傷害: ${ball.convictDmg}`; },
            onTakeDamage: (ball, amount, sourceId, engine) => {
               if (sourceId) {
                   const sourceBall = engine.balls.find(b => b.uniqueId === sourceId);
                   if (sourceBall && sourceBall.statuses.some(s => s.type === 'warning')) return 0; 
               }
               return amount;
            },
            update: (ball, engine) => {
              ball.pageTimer += DT;
              const warnedEnemy = engine.balls.find(b => engine.isEnemy(b.uniqueId, ball.uniqueId) && !b.isBlank && b.statuses.some(s => s.type === 'warning'));
              if (warnedEnemy && distance(ball.x, ball.y, warnedEnemy.x, warnedEnemy.y) < 350) {
                  const norm = normalize(warnedEnemy.x - ball.x, warnedEnemy.y - ball.y);
                  ball.vx += norm.x * 1200 * DT; ball.vy += norm.y * 1200 * DT;
              }
              if (ball.pageTimer >= 4) {
                ball.pageTimer = 0;
                const target = engine.getNearestEnemy(ball);
                const norm = target ? normalize(target.x - ball.x, target.y - ball.y) : normalize(ball.vx, ball.vy);
                engine.spawnProjectile({
                  type: 'page', x: ball.x, y: ball.y, vx: norm.x * 400, vy: norm.y * 400,
                  radius: 12, color: '#DDA0DD', ownerId: ball.uniqueId, damage: 0, bounces: 1, lifespan: 3, isPageTracking: true,
                  onHit: (proj, target, eng) => {
                    eng.applyStatus(target.uniqueId, 'warning', { duration: 3 });
                    const owner = eng.balls.find(b => b.uniqueId === proj.ownerId);
                    if (owner) { owner.vx += (Math.random() - 0.5) * 200; owner.vy += (Math.random() - 0.5) * 200; }
                  }
                });
              }
            },
            onCollide: (ball, other, relSpeed, engine) => {
              const warnStatus = other.statuses?.find(s => s.type === 'warning');
              if (warnStatus) {
                engine.applyDamage(other, ball.convictDmg, ball.uniqueId, 'magic');
                engine.applyStatus(other.uniqueId, 'knockback', { duration: 1.5, sourceId: ball.uniqueId });
                ball.convictDmg += 2 * (ball.noGrowth ? 0 : 1); 
                ball.scalingValue = `定罪傷害: ${Math.floor(ball.convictDmg)}`;
                other.statuses = other.statuses.filter(s => s.type !== 'warning'); 
                const norm = normalize(other.x - ball.x, other.y - ball.y);
                other.vx += norm.x * 600; other.vy += norm.y * 600;
              }
            }
          },
          ino: {
            id: 'ino', faction: 'TimeAdmin', name: '銀諾·諾克薩斯', title: '遠程 / 穿透彈射', color: '#00B4D8', mass: 0.9,
            desc: '【性相】型之性相\n【被動】機械鳥可穿透敵人。\n【主動】每秒發射無追蹤機械鳥，造成物理傷害。\n【成長】本體碰撞或機械鳥命中時，永久增加機械鳥彈射次數(無上限)。',
            initLogic: (ball) => { ball.birdTimer = 0; ball.bounces = 0; ball.scalingValue = `彈射次數: 0`; },
            onCollide: (ball, other, relSpeed, engine) => {
                ball.bounces += 1 * (ball.noGrowth ? 0 : 1);
                ball.scalingValue = `彈射次數: ${Math.floor(ball.bounces)}`;
            },
            update: (ball, engine) => {
              ball.birdTimer += DT;
              if (ball.birdTimer >= 1.0) { 
                ball.birdTimer = 0;
                const target = engine.getNearestEnemy(ball);
                const norm = target ? normalize(target.x - ball.x, target.y - ball.y) : normalize(ball.vx, ball.vy);
                const angle = Math.atan2(norm.y, norm.x) + (Math.random() - 0.5) * 0.2;
                engine.spawnProjectile({
                  type: 'bird', x: ball.x, y: ball.y, vx: Math.cos(angle) * 500, vy: Math.sin(angle) * 500,
                  radius: 6, color: '#90E0EF', ownerId: ball.uniqueId, damage: 4, bounces: Math.floor(ball.bounces), lifespan: 5 + Math.floor(ball.bounces) * 0.5, 
                  isTracking: false, penetrating: true, 
                  onHit: (proj, target, eng) => {
                    ball.bounces += 1 * (ball.noGrowth ? 0 : 1);
                    ball.scalingValue = `彈射次數: ${Math.floor(ball.bounces)}`;
                  }
                });
              }
            }
          },
          kate: {
            id: 'kate', faction: 'TimeAdmin', name: '奧恩斯·凱特', title: '工事 / 能量牽引', color: '#D95D39', mass: 1.1,
            desc: '【性相】型之性相\n【被動】雷射電線會對穿越的敵人造成高頻切割傷害。\n【主動】觸壁施工：每次碰牆更新錨點並連線成能量牆(最多3道)。',
            initLogic: (ball) => { ball.walls = []; ball.currentAnchor = null; ball.wallDamage = 5; ball.wallHitsTimer = 0; ball.scalingValue = `能量牆秒傷: ${ball.wallDamage.toFixed(1)} (共 0/3 道)`; },
            onWallBounce: (ball, engine) => {
              if (ball.walls.length >= 3) return; 
              let ox = Math.max(45, Math.min(engine.arenaSize - 45, ball.x)), oy = Math.max(45, Math.min(engine.arenaSize - 45, ball.y));
              if (!ball.currentAnchor) { ball.currentAnchor = { x: ox, y: oy }; } 
              else { ball.walls.push({ p1: ball.currentAnchor, p2: { x: ox, y: oy } }); ball.currentAnchor = null; }
              ball.scalingValue = `能量牆秒傷: ${ball.wallDamage.toFixed(1)} (共 ${ball.walls.length}/3 道)`;
            },
            update: (ball, engine) => {
              const checkLaserHit = (p1, p2) => {
                 engine.balls.forEach(other => {
                     if (other.hp <= 0) return;
                     if (engine.isEnemy(other.uniqueId, ball.uniqueId) && !other.isBlank) {
                         const l2 = (p2.x - p1.x)**2 + (p2.y - p1.y)**2;
                         if (l2 === 0) return;
                         let t = ((other.x - p1.x) * (p2.x - p1.x) + (other.y - p1.y) * (p2.y - p1.y)) / l2;
                         t = Math.max(0, Math.min(1, t));
                         const px = p1.x + t * (p2.x - p1.x), py = p1.y + t * (p2.y - p1.y);
                         if (distance(other.x, other.y, px, py) < other.radius + 8) { 
                             engine.applyDamage(other, ball.wallDamage * DT, ball.uniqueId, 'laser'); 
                             ball.wallHitsTimer += DT;
                             if (ball.wallHitsTimer >= 1) {
                                 ball.wallDamage += 1.25 * (ball.noGrowth ? 0 : 1);
                                 ball.wallHitsTimer -= 1; ball.scalingValue = `能量牆秒傷: ${ball.wallDamage.toFixed(1)} (共 ${ball.walls.length}/3 道)`;
                             }
                         }
                     }
                 });
              };
              if (ball.currentAnchor) checkLaserHit(ball.currentAnchor, { x: ball.x, y: ball.y }); 
              ball.walls.forEach(w => checkLaserHit(w.p1, w.p2)); 
            }
          },
          isaac: {
            id: 'isaac', faction: 'TimeAdmin', name: '以撒·薩恩', title: '法術 / 條件爆發', color: '#E2E8F0', mass: 1.0,
            desc: '【性相】啟之性相\n【被動】每 8 秒發射律令(具備 x1/x2/x5/x10 倍率)，命中造成對應乘算效果(神聖打擊/強制驅逐/生命虹吸/絕對封印/恩典再生)。\n【主動】血量小於35%時，殘影呈指數級瘋狂湧出並具物理碰撞。',
            initLogic: (ball) => { 
                ball.wordTimer = 8; ball.shadowsActive = false; ball.isSpawningShadows = false; ball.shadowSpawnTimer = 0; 
                
                // 開局預載第一發律令與倍率
                const words = ['神聖打擊', '強制驅逐', '生命虹吸', '絕對封印', '恩典再生'];
                ball.nextWord = words[Math.floor(Math.random() * words.length)];
                const rand = Math.random();
                if (rand < 0.30) ball.nextMult = 1;
                else if (rand < 0.80) ball.nextMult = 2;
                else if (rand < 0.95) ball.nextMult = 5;
                else ball.nextMult = 10;
                
                ball.scalingValue = `下發: ${ball.nextWord} x${ball.nextMult}`; 
            },
            update: (ball, engine) => {
              ball.wordTimer += DT;
              ball.scalingValue = `下發: ${ball.nextWord} x${ball.nextMult} (${Math.max(0, 8 - ball.wordTimer).toFixed(1)}s)`;


              if (ball.wordTimer >= 8) {
                ball.wordTimer = 0;
                // 發射預載的律令
                const word = ball.nextWord;
                const mult = ball.nextMult;
                
                // 預載下一發律令
                const words = ['神聖打擊', '強制驅逐', '生命虹吸', '絕對封印', '恩典再生'];
                ball.nextWord = words[Math.floor(Math.random() * words.length)];
                const rand = Math.random();
                if (rand < 0.30) ball.nextMult = 1;
                else if (rand < 0.80) ball.nextMult = 2;
                else if (rand < 0.95) ball.nextMult = 5;
                else ball.nextMult = 10;


                const target = engine.getNearestEnemy(ball);
                const norm = target ? normalize(target.x - ball.x, target.y - ball.y) : normalize(ball.vx, ball.vy);
                
                engine.spawnProjectile({
                    type: 'word', text: word, mult: mult, x: ball.x, y: ball.y, vx: norm.x * 400, vy: norm.y * 400,
                    radius: 20, color: '#FFFFFF', ownerId: ball.uniqueId, damage: 5 * mult, bounces: 1, lifespan: 4,
                    isTracking: true, maxSpeed: 450,
                    onHit: (proj, t, eng) => {
                        const owner = eng.balls.find(b => b.uniqueId === proj.ownerId);
                        const m = proj.mult || 1;
                        if (proj.text === '神聖打擊') {
                            eng.applyDamage(t, 15 * m, proj.ownerId, 'magic'); eng.spawnParticle({ type: 'text', x: t.x, y: t.y - 30, text: `💥 打擊! x${m}`, color: '#FFFFFF' });
                        } else if (proj.text === '強制驅逐') {
                            const n = normalize(t.x - proj.x, t.y - proj.y); t.vx += n.x * 1200 * m; t.vy += n.y * 1200 * m;
                            eng.applyStatus(t.uniqueId, 'knockback', { duration: 1.5 * m, sourceId: proj.ownerId }); eng.spawnParticle({ type: 'text', x: t.x, y: t.y - 30, text: `💨 驅逐! x${m}`, color: '#FFFFFF' });
                        } else if (proj.text === '生命虹吸') {
                            if (owner) eng.applyHeal(owner, 40 * (owner.isCreator ? 2 : 1) * m);
                            eng.spawnParticle({ type: 'text', x: owner ? owner.x : t.x, y: (owner ? owner.y : t.y) - 30, text: `🧛 虹吸! x${m}`, color: '#DC143C' });
                        } else if (proj.text === '絕對封印') {
                            eng.applyStatus(t.uniqueId, 'silenced', { duration: 5 * m }); eng.spawnParticle({ type: 'text', x: t.x, y: t.y - 30, text: `🔒 封印! x${m}`, color: '#9333EA' });
                        } else if (proj.text === '恩典再生') {
                            if (owner) { eng.applyStatus(owner.uniqueId, 'regen', { duration: 5 * m }); eng.spawnParticle({ type: 'text', x: owner.x, y: owner.y - 30, text: `✨ 再生! x${m}`, color: '#34D399' }); }
                        }
                    }
                });
              }


              if (ball.hp > 0 && ball.hp < ball.maxHp * 0.35 && !ball.shadowsActive) {
                ball.shadowsActive = true; ball.isSpawningShadows = true; ball.shadowSpawnTimer = 0;
              }
              if (ball.isSpawningShadows) {
                ball.shadowSpawnTimer += DT;
                const progress = ball.shadowSpawnTimer / 1.0;
                const spawnCount = Math.floor(Math.random() * 2) + 1 + Math.floor(Math.pow(progress, 3) * 20);
                for (let i = 0; i < spawnCount; i++) {
                  const angle = Math.random() * Math.PI * 2;
                  engine.spawnProjectile({
                    type: 'shadow', x: ball.x, y: ball.y, vx: Math.cos(angle) * (300 + Math.random() * 200), vy: Math.sin(angle) * (300 + Math.random() * 200),
                    radius: 12, color: '#4A5568', ownerId: ball.uniqueId, damage: 0, bounces: 5, lifespan: 3 + Math.random() * 2, penetrating: true,
                    customUpdate: (p, dt, eng) => {
                        if (!p.physCooldowns) p.physCooldowns = {};
                        Object.keys(p.physCooldowns).forEach(k => p.physCooldowns[k] -= dt);
                        eng.balls.forEach(target => {
                            if (target.hp <= 0 || target.isBlank || !eng.isEnemy(target.uniqueId, p.ownerId)) return;
                            const cd = p.physCooldowns[target.uniqueId] || 0;
                            if (cd <= 0) {
                                const dx = p.x - target.x, dy = p.y - target.y, dist = Math.hypot(dx, dy);
                                if (dist < p.radius + target.radius) {
                                    const nx = dx / dist, ny = dy / dist, dot = p.vx * nx + p.vy * ny;
                                    if (dot < 0) { p.vx -= 2 * dot * nx; p.vy -= 2 * dot * ny; }
                                    target.vx -= nx * 150; target.vy -= ny * 150;
                                    eng.applyDamage(target, 1, p.ownerId, 'projectile');
                                    p.physCooldowns[target.uniqueId] = 0.2; 
                                }
                            }
                        });
                    }
                  });
                }
                if (ball.shadowSpawnTimer >= 1.0) ball.isSpawningShadows = false;
              }
            }
          },
          olynx: {
            id: 'olynx', faction: 'TimeAdmin', name: '奧林克斯', title: '煉金 / 原料轉化', color: '#A0522D', mass: 1.1,
            desc: '【性相】型之性相\n【被動】碰牆收集原料，滿3層隨機發射武器(鋼錐/電能領域/爆裂彈)。\n【成長】每累積生成2次道具，增加後續道具存在時間1秒。',
            initLogic: (ball) => { ball.materials = 0; ball.generateCount = 0; ball.bonusLifespan = 0; ball.scalingValue = `原料: 0/3 (延時: +0s)`; },
            onWallBounce: (ball, engine) => {
              if (ball.materials < 3) {
                ball.materials += 1 * (ball.noGrowth ? 0 : 1); ball.scalingValue = `原料: ${Math.floor(ball.materials)}/3 (延時: +${ball.bonusLifespan}s)`;
              }
              if (ball.materials >= 3) {
                ball.materials = 0; ball.generateCount += 1 * (ball.noGrowth ? 0 : 1);
                ball.bonusLifespan = Math.floor(ball.generateCount / 2);
                ball.scalingValue = `原料: 0/3 (延時: +${ball.bonusLifespan}s)`;
                const weaponTypes = ['iron', 'energy', 'bomb'];
                const chosen = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
                const target = engine.getNearestEnemy(ball);
                const norm = target ? normalize(target.x - ball.x, target.y - ball.y) : normalize(ball.vx, ball.vy);
                
                if (chosen === 'iron') {
                  engine.spawnProjectile({
                    type: 'cone', x: ball.x, y: ball.y, vx: norm.x * 600, vy: norm.y * 600, radius: 12, color: '#A9A9A9', ownerId: ball.uniqueId, damage: 8, bounces: 99, lifespan: 4 + ball.bonusLifespan, penetrating: true, 
                    isTracking: false, pierceTimer: 0,
                    customUpdate: (p, dt, eng) => {
                        if (p.pierceTimer > 0) {
                            p.pierceTimer -= dt;
                            if (p.pierceTimer <= 0 && p.hitSet) {
                                p.hitSet.clear(); 
                            }
                        } else {
                            let target = null; let minDist = Infinity;
                            eng.balls.forEach(b => {
                                if (b.hp <= 0 || b.isBlank || !eng.isEnemy(b.uniqueId, p.ownerId)) return;
                                if (p.hitSet && p.hitSet.has(b.uniqueId)) return; 
                                const d = distance(p.x, p.y, b.x, b.y);
                                if (d < minDist) { minDist = d; target = b; }
                            });
                            
                            if (target) {
                                const targetNorm = normalize(target.x - p.x, target.y - p.y);
                                p.vx += targetNorm.x * 40; p.vy += targetNorm.y * 40;
                                const speed = Math.hypot(p.vx, p.vy);
                                if (speed > 700) { p.vx = (p.vx/speed) * 700; p.vy = (p.vy/speed) * 700; }
                            }
                        }
                    },
                    onHit: (proj, target, eng) => {
                        proj.pierceTimer = 0.5; 
                    }
                  });
                } else if (chosen === 'energy') {
                  engine.spawnProjectile({
                    type: 'energy_domain', x: ball.x, y: ball.y, vx: norm.x * 200, vy: norm.y * 200, radius: 100, color: 'rgba(0, 250, 154, 0.16)', ownerId: ball.uniqueId, damage: 0, bounces: 5, lifespan: 5 + ball.bonusLifespan, penetrating: true,
                    customUpdate: (p, dt, eng) => {
                        if (!p.hitCooldowns) p.hitCooldowns = {};
                        Object.keys(p.hitCooldowns).forEach(k => p.hitCooldowns[k] -= dt);
                        eng.balls.forEach(t => {
                            if (t.hp <= 0 || t.isBlank || !eng.isEnemy(t.uniqueId, p.ownerId)) return;
                            if (distance(p.x, p.y, t.x, t.y) < p.radius + t.radius) {
                                eng.applyStatus(t.uniqueId, 'slow', { duration: 0.5 }); 
                                const pullNorm = normalize(p.x - t.x, p.y - t.y);
                                t.vx += pullNorm.x * 250 * dt;
                                t.vy += pullNorm.y * 250 * dt;
                                
                                if ((p.hitCooldowns[t.uniqueId] || 0) <= 0) { 
                                    eng.applyDamage(t, 1, p.ownerId, 'magic'); 
                                    eng.spawnParticle({ type: 'laser', x: p.x, y: p.y, tx: t.x, ty: t.y, color: '#00FA9A', lifespan: 0.1, maxLifespan: 0.1 }); 
                                    p.hitCooldowns[t.uniqueId] = 0.2; 
                                }
                            }
                        });
                    }
                  });
                } else if (chosen === 'bomb') {
                  engine.spawnProjectile({
                    type: 'bomb', x: ball.x, y: ball.y, vx: norm.x * 400, vy: norm.y * 400, radius: 14, color: '#DC143C', ownerId: ball.uniqueId, damage: 0, bounces: 3, lifespan: 2.5, 
                    onDeath: (proj, eng) => eng.spawnObstacle({ type: 'damage_field', x: proj.x, y: proj.y, radius: 120, color: 'rgba(220, 20, 60, 0.2)', ownerId: ball.uniqueId, team: ball.team, lifespan: 4 + ball.bonusLifespan })
                  });
                }
              }
            }
          },


          // ==================== 神性大教堂 (4位) ====================
          topiharin: {
            id: 'topiharin', faction: 'DivineCathedral', name: '托匹哈鈴', title: '音律 / 階段演進', color: '#FF1493', mass: 1.0,
            desc: '【性相】氳之性相\n【被動】每15秒切換樂章(減反傷/警戒射線/輕快音符/撞牆震盪)。\n【主動】敵方進入特定樂章範圍時受到對應懲戒效果。',
            initLogic: (ball) => { ball.musicTimer = 0; ball.currentPhase = 1; ball.orbitAngle = 0; ball.quartetInRange = new Set(); },
            update: (ball, engine) => {
                const hasSynesthesia = ball.statuses.some(s => s.type === 'synesthesia');
                ball.musicTimer = (ball.musicTimer + DT) % 60;
                if (hasSynesthesia) {
                    ball.currentPhase = 4; ball.scalingValue = `聽，那便是普世音律！ (聯覺)`;
                } else {
                    if (ball.musicTimer < 15) { ball.currentPhase = 1; ball.scalingValue = `獨奏 (${(15 - ball.musicTimer).toFixed(1)}s) | 減反傷 10%`; } 
                    else if (ball.musicTimer < 30) {
                        ball.currentPhase = 2; ball.scalingValue = `弦樂四重奏 (${(30 - ball.musicTimer).toFixed(1)}s) | 警戒射線`;
                        ball.orbitAngle += 2 * DT;
                        if (!ball.quartetInRange) ball.quartetInRange = new Set();
                        const inRangeNow = new Set();
                        engine.balls.forEach(target => {
                            if (target.hp <= 0 || !engine.isEnemy(target.uniqueId, ball.uniqueId) || target.isBlank) return;
                            if (distance(ball.x, ball.y, target.x, target.y) <= 250) {
                                inRangeNow.add(target.uniqueId);
                                if (!ball.quartetInRange.has(target.uniqueId)) {
                                    const effects = ['slow', 'damage', 'knockback'].sort(() => 0.5 - Math.random()).slice(0, 2);
                                    engine.spawnParticle({ type: 'laser', x: ball.x, y: ball.y, tx: target.x, ty: target.y, color: '#FF1493', lifespan: 0.3, maxLifespan: 0.3 });
                                    effects.forEach(eff => {
                                        if (eff === 'damage') { engine.applyDamage(target, 15, ball.uniqueId, 'magic'); }
                                        else if (eff === 'slow') { engine.applyStatus(target.uniqueId, 'slow', { duration: 3 }); }
                                        else if (eff === 'knockback') {
                                            const norm = normalize(target.x - ball.x, target.y - ball.y);
                                            target.vx += norm.x * 600; target.vy += norm.y * 600;
                                            engine.applyStatus(target.uniqueId, 'knockback', { duration: 1.5, sourceId: ball.uniqueId });
                                        }
                                    });
                                }
                            }
                        });
                        ball.quartetInRange = inRangeNow;
                    } else if (ball.musicTimer < 45) { ball.currentPhase = 3; ball.scalingValue = `二重奏 (${(45 - ball.musicTimer).toFixed(1)}s) | 輕快＆音符`; } 
                    else { ball.currentPhase = 4; ball.scalingValue = `聽，那便是普世音律！ (${(60 - ball.musicTimer).toFixed(1)}s)`; }
                }


                if (ball.currentPhase === 3) { ball.radius = BALL_RADIUS * 0.6 * (ball.radiusMult || 1); ball.speedMult = 1.5; } 
                else { ball.radius = BALL_RADIUS * (ball.radiusMult || 1); ball.speedMult = 1.0; }
            },
            onTakeDamage: (ball, amount, sourceId, engine, damageType) => {
                let actualDamage = amount;
                if (ball.currentPhase === 1) {
                    actualDamage *= 0.9;
                    if (sourceId && damageType !== 'reflect') {
                        const sourceBall = engine.balls.find(b => b.uniqueId === sourceId);
                        if (sourceBall && engine.isEnemy(ball.uniqueId, sourceId)) { engine.applyDamage(sourceBall, amount * 0.1, ball.uniqueId, 'reflect'); }
                    }
                } else if (ball.currentPhase === 4) { actualDamage *= 0.5; }
                return actualDamage;
            },
            onWallBounce: (ball, engine) => {
                if (ball.currentPhase === 3) {
                    engine.spawnProjectile({
                        type: 'note', x: ball.x, y: ball.y, vx: (Math.random() - 0.5) * 250, vy: (Math.random() - 0.5) * 250,
                        radius: 7, color: '#FFB6C1', ownerId: ball.uniqueId, damage: 6, bounces: 1, lifespan: 4, isTracking: true, trackingRange: 300, maxSpeed: 250
                    });
                }
            }
          },
          miller: {
            id: 'miller', faction: 'DivineCathedral', name: '米勒', title: '情感 / 慟哭閱讀', color: '#FBBF24', mass: 1.0,
            desc: '【性相】氳之性相\n【被動】依血量發動四書：>75%產聖餐；50~75%降雨禁錮；25~50%召喚騎士與駿馬。\n【主動】<25%依百分比持續治癒敵方，治癒量大於當前血量即死。',
            initLogic: (ball) => { ball.sacramentTimer = 0; ball.sproutTimer = 0; ball.steedTimer = 0; ball.knightTimer = 0; ball.doomHeal = {}; ball.scalingValue = `未開始閱讀`; },
            update: (ball, engine) => {
              const hasSynesthesia = ball.statuses.some(s => s.type === 'synesthesia');
              const hpPct = ball.hp / ball.maxHp;
              
              if (hasSynesthesia || hpPct < 0.25) {
                  ball.scalingValue = hasSynesthesia ? `卷四：顫動著、哭泣著、庇佑著 (聯覺)` : `卷四：顫動著、哭泣著、庇佑著`;
                  const healPctRate = 0.10; 
                  engine.balls.forEach(t => {
                      if (t.hp > 0 && engine.isEnemy(t.uniqueId, ball.uniqueId) && !t.isBlank) {
                          const h = t.maxHp * healPctRate * DT;
                          engine.applyHeal(t, h);
                          if (!ball.doomHeal[t.uniqueId]) ball.doomHeal[t.uniqueId] = 0;
                          ball.doomHeal[t.uniqueId] += h;
                          
                          if (Math.random() < 0.1) engine.spawnParticle({ type: 'laser', x: ball.x, y: ball.y, tx: t.x, ty: t.y, color: '#FCD34D', lifespan: 0.1, maxLifespan: 0.1 });
                          if (ball.doomHeal[t.uniqueId] >= t.hp) {
                              engine.applyDamage(t, 9999, ball.uniqueId, 'magic');
                              engine.spawnParticle({ type: 'text', x: t.x, y: t.y, text: '✝️ 救贖', color: '#FBBF24' });
                          }
                      }
                  });
              }
              else if (hpPct >= 0.75) {
                  ball.scalingValue = `卷一：執柄司書的戒律`;
                  ball.sacramentTimer += DT;
                  if (ball.sacramentTimer >= 10) {
                      ball.sacramentTimer = 0;
                      engine.spawnObstacle({ type: 'sacrament', x: 50 + Math.random() * (engine.arenaSize - 100), y: 50 + Math.random() * (engine.arenaSize - 100), radius: 12, color: '#FBBF24', lifespan: 8, ownerId: ball.uniqueId });
                  }
              }
              else if (hpPct >= 0.50) {
                  ball.scalingValue = `卷二：春意盎然·萌芽的時節`;
                  engine.projectiles.forEach(p => {
                      if (engine.isEnemy(p.ownerId, ball.uniqueId) && !p.wetAffected && p.type !== 'sacrament' && p.type !== 'sprout') {
                          if (Math.random() < 0.5) { 
                              const angleShift = (Math.random() - 0.5) * Math.PI / 1.5; 
                              const speed = Math.hypot(p.vx, p.vy), currentAngle = Math.atan2(p.vy, p.vx);
                              p.vx = Math.cos(currentAngle + angleShift) * speed; p.vy = Math.sin(currentAngle + angleShift) * speed;
                          }
                          p.wetAffected = true; 
                      }
                  });
                  ball.sproutTimer += DT;
                  if (ball.sproutTimer >= 1.0) { 
                      ball.sproutTimer = 0;
                      engine.spawnProjectile({
                          type: 'sprout', x: 50 + Math.random() * (engine.arenaSize - 100), y: 50 + Math.random() * (engine.arenaSize - 100), vx: 0, vy: 0, radius: 14, color: '#4ADE80', lifespan: 8, ownerId: ball.uniqueId, damage: 2, bounces: 0,
                          isTracking: true, maxSpeed: 90, trackingRange: 9999, 
                          onHit: (proj, target, eng) => {
                              eng.applyStatus(target.uniqueId, 'rooted', { duration: 2 });
                              eng.spawnParticle({ type: 'text', x: target.x, y: target.y - 20, text: '🌿 禁錮', color: '#4ADE80' });
                          }
                      });
                  }
              }
              else if (hpPct >= 0.25) {
                  ball.scalingValue = `卷三：騎士與駿馬`;
                  ball.knightTimer += DT;
                  if (ball.knightTimer >= 5) {
                      ball.knightTimer = 0;
                      const target = engine.getNearestEnemy(ball);
                      if (target) {
                          const norm = normalize(target.x - ball.x, target.y - ball.y);
                          engine.spawnProjectile({
                              type: 'knight', x: ball.x, y: ball.y, vx: norm.x * 1200, vy: norm.y * 1200, radius: 14, color: '#CBD5E1', ownerId: ball.uniqueId, damage: 15, bounces: 99, lifespan: 8, penetrating: true, state: 'charging', chargeTimer: 0.4,
                              customUpdate: (p, dt, eng) => {
                                  if (p.state === 'charging') {
                                      p.chargeTimer -= dt; if (p.chargeTimer <= 0) p.state = 'returning';
                                  } else if (p.state === 'returning') {
                                      const owner = eng.balls.find(b => b.uniqueId === p.ownerId);
                                      if (owner) {
                                          const retNorm = normalize(owner.x - p.x, owner.y - p.y);
                                          p.vx = retNorm.x * 1600; p.vy = retNorm.y * 1600;
                                          if (distance(p.x, p.y, owner.x, owner.y) < p.radius + owner.radius) {
                                              eng.applyStatus(owner.uniqueId, 'shield', { duration: 5 });
                                              eng.spawnParticle({ type: 'text', x: owner.x, y: owner.y - 20, text: '🛡️ 護盾', color: '#CBD5E1' });
                                              p.lifespan = 0;
                                          }
                                      } else { p.lifespan = 0; }
                                  }
                              },
                              onHit: (proj) => { if (proj.state === 'charging') proj.state = 'returning'; }
                          });
                      }
                  }


                  ball.steedTimer += DT;
                  if (ball.steedTimer >= 4) {
                      ball.steedTimer = 0;
                      const target = engine.getNearestEnemy(ball);
                      if (target) {
                          const norm = normalize(target.x - ball.x, target.y - ball.y);
                          engine.spawnProjectile({ type: 'steed', x: ball.x, y: ball.y, vx: norm.x * 600, vy: norm.y * 600, radius: 18, color: '#F8FAFC', ownerId: ball.uniqueId, damage: 15, bounces: 1, lifespan: 2 });
                      }
                  }
              }
            }
          },
          kongmie: {
            id: 'kongmie', faction: 'DivineCathedral', name: '孔滅', title: '劇作家 / 三幕悲喜劇', color: '#8B5CF6', mass: 1.0,
            desc: '【性相】境之性相\n【被動】第一幕：若死亡則滿血復活進分支A，存活進分支B。\n【主動】第二幕A：擴散緩速與推離。第二幕B：我方全體雙倍移速與激昂。\n【終幕】第三幕：免疫敵方彈道並為隊友附帶聯覺強制躍遷。',
            initLogic: (ball) => { ball.act = 1; ball.path = null; ball.actTimer = 0; ball.act3Threshold = 60; ball.checkedSynergy = false; ball.scalingValue = `準備揭幕...`; },
            update: (ball, engine) => {
                if (!ball.checkedSynergy) {
                    const divineCount = engine.balls.filter(b => b.team === ball.team && b.uniqueId !== ball.uniqueId && ROSTER[b.copied || b.id]?.faction === 'DivineCathedral').length;
                    ball.act3Threshold = Math.max(40, 60 - divineCount * 10);
                    ball.checkedSynergy = true;
                }
                ball.actTimer += DT;
                if (ball.act !== 3 && ball.actTimer >= ball.act3Threshold) {
                    ball.act = 3; engine.spawnParticle({ type: 'text', x: ball.x, y: ball.y - 40, text: '第三幕·過去的過去，未到的來到', color: '#8B5CF6' });
                }


                if (ball.act === 1) {
                    if (ball.actTimer >= 30) {
                        ball.act = 2; ball.path = 'B';
                        engine.spawnParticle({ type: 'text', x: ball.x, y: ball.y - 40, text: '第二幕·於是我心昂首抬頭', color: '#FCD34D' });
                    } else { ball.scalingValue = `第一幕: 驚人兇殺案 (${(30 - ball.actTimer).toFixed(1)}s)`; }
                } else if (ball.act === 2) {
                    if (ball.path === 'A') {
                        ball.scalingValue = `第二幕: 狂風驟雨 (距終幕: ${(ball.act3Threshold - ball.actTimer).toFixed(1)}s)`;
                        ball.waveTimer = (ball.waveTimer || 0) + DT;
                        if (ball.waveTimer >= 4) { 
                            ball.waveTimer = 0;
                            engine.spawnWave({
                                x: engine.arenaSize/2, y: engine.arenaSize/2, startRadius: 0, maxRadius: 800, speed: 400, color: 'rgba(59, 130, 246, 0.4)', ownerId: ball.uniqueId, lingerDuration: 0.1, deflectsProjectiles: true,
                                onHit: (t) => {
                                    if (engine.isEnemy(t.uniqueId, ball.uniqueId)) {
                                        engine.applyDamage(t, 15, ball.uniqueId, 'magic'); engine.applyStatus(t.uniqueId, 'slow', { duration: 2 });
                                        const norm = normalize(t.x - engine.arenaSize/2, t.y - engine.arenaSize/2);
                                        t.vx += norm.x * 500; t.vy += norm.y * 500;
                                    }
                                }
                            });
                        }
                    } else if (ball.path === 'B') {
                        ball.scalingValue = `第二幕: 昂首抬頭 (距終幕: ${(ball.act3Threshold - ball.actTimer).toFixed(1)}s)`;
                        ball.speedMult = 2.0;
                        engine.balls.forEach(b => {
                            if (b.team === ball.team && b.hp > 0) {
                                engine.applyStatus(b.uniqueId, 'excited', { duration: 1.5 });
                                if (b.uniqueId !== ball.uniqueId) engine.applyStatus(b.uniqueId, 'haste_double', { duration: 1.5 });
                            }
                        });
                    }
                } else if (ball.act === 3) {
                    ball.scalingValue = `第三幕: 過去未到 (終幕) | 衍生物免疫`;
                    engine.balls.forEach(b => {
                        if (b.team === ball.team && b.hp > 0 && ROSTER[b.copied || b.id]?.faction === 'DivineCathedral') { engine.applyStatus(b.uniqueId, 'synesthesia', { duration: 1.5 }); }
                    });
                }
            },
            onTakeDamage: (ball, amount, sourceId, engine, damageType) => {
                if (ball.act === 3 && damageType === 'projectile') return 0; 
                return amount;
            }
          },
          hao: {
            id: 'hao', faction: 'DivineCathedral', name: '昊', title: '畫家 / 潑墨天地', color: '#60A5FA', mass: 1.0,
            desc: '【性相】境之性相\n【被動】隨行走距離改變顏料：藍(加速/減速) -> 黃(減傷/易傷) -> 綠(回血/偏軌)。\n【終幕】紅相：巨型化、3倍速、5倍衝撞威力，染紅全場。',
            initLogic: (ball) => { ball.totalDistance = 0; ball.currentPaint = 'blue'; ball.redPhase = false; ball.lastPaintPos = null; ball.scalingValue = `藍墨 | 距離: 0`; },
            update: (ball, engine) => {
                if (ball.lastPos) {
                    const distMoved = distance(ball.x, ball.y, ball.lastPos.x, ball.lastPos.y);
                    const isSynesthesia = ball.statuses.some(s => s.type === 'synesthesia');
                    ball.totalDistance += distMoved * (isSynesthesia ? 50 : 1) * (ball.isCreator ? 1.5 : 1);
                }
                ball.lastPos = { x: ball.x, y: ball.y };


                const D_YELLOW = 6000, D_GREEN = 12000, D_RED = 30000;


                if (!ball.redPhase) {
                    if (ball.currentPaint === 'blue' && ball.totalDistance >= D_YELLOW) {
                        ball.currentPaint = 'yellow'; engine.spawnParticle({type:'text', x:ball.x, y:ball.y-40, text:'黃墨：堅壁與易傷', color:'#FCD34D'});
                    } else if (ball.currentPaint === 'yellow' && ball.totalDistance >= D_GREEN) {
                        ball.currentPaint = 'green'; engine.spawnParticle({type:'text', x:ball.x, y:ball.y-40, text:'綠墨：復甦與迷向', color:'#4ADE80'});
                    } else if (ball.currentPaint === 'green' && ball.totalDistance >= D_RED) {
                        ball.currentPaint = 'red'; ball.redPhase = true;
                        ball.radius = BALL_RADIUS * (ball.radiusMult || 1) * 1.5;
                        ball.mass = ROSTER[ball.copied || ball.id].mass * 2;
                        ball.speedMult = 3.0;
                        engine.spawnParticle({type:'text', x:ball.x, y:ball.y-40, text:'紅墨：全場傾瀉！', color:'#EF4444'});
                    }
                }


                if (ball.redPhase) {
                    ball.scalingValue = `紅墨 | 全場傾瀉`;
                } else {
                    ball.scalingValue = `${ball.currentPaint === 'blue' ? '藍' : (ball.currentPaint === 'yellow' ? '黃' : '綠')}墨 | 距: ${Math.floor(ball.totalDistance)}`;
                    if (!ball.lastPaintPos || distance(ball.x, ball.y, ball.lastPaintPos.x, ball.lastPaintPos.y) > 30) {
                        let pColor = '';
                        if (ball.currentPaint === 'blue') pColor = 'rgba(59, 130, 246, 0.4)';
                        else if (ball.currentPaint === 'yellow') pColor = 'rgba(252, 211, 77, 0.4)';
                        else if (ball.currentPaint === 'green') pColor = 'rgba(74, 222, 128, 0.4)';


                        engine.spawnObstacle({ type: 'paint_puddle', x: ball.x, y: ball.y, radius: 30, color: pColor, paintType: ball.currentPaint, ownerId: ball.uniqueId, lifespan: 10 });
                        ball.lastPaintPos = { x: ball.x, y: ball.y };
                    }
                }
            },
            modifyDamageOut: (ball, baseDamage, engine) => { if (ball.redPhase) return baseDamage * 5; return baseDamage; },
            onCollide: (ball, other, relSpeed, engine) => {
                if (ball.redPhase) { const norm = normalize(other.x - ball.x, other.y - ball.y); other.vx += norm.x * 500; other.vy += norm.y * 500; }
            }
          },


          // ==================== 永滅故事集委員會 (4位) ====================
          creator: {
            id: 'creator', faction: 'StorybookCommittee', name: '創世神', title: '永滅 / 權能複製', color: '#F8F9FA', mass: 1.0,
            desc: '【性相】秘之性相\n【被動】開局等待5秒鐘，然後鎖定敵方(波多亞斯格除外)如鏡像般完全同化複製其機制。\n【強化】將此機制的基礎數值乘以兩倍，但是不會再成長。',
            initLogic: (ball) => { ball.creatorTimer = 0; ball.isCreator = true; ball.copied = false; ball.scalingValue = `尋找宿主中...`; },
            update: (ball, engine) => {
              if (!ball.copied) {
                 ball.creatorTimer += DT;
                 ball.scalingValue = `觀測中... (${(5 - ball.creatorTimer).toFixed(1)}s)`;
                 if (ball.creatorTimer >= 5) {
                     const enemies = engine.balls.filter(b => engine.isEnemy(b.uniqueId, ball.uniqueId) && b.isMain && b.hp > 0 && b.id !== 'podoasg' && b.copied !== 'podoasg');
                     if (enemies.length > 0) {
                        const enemy = enemies[Math.floor(Math.random() * enemies.length)];
                        ball.copied = enemy.id;
                        const template = ROSTER[enemy.id];
                        if (template.initLogic) template.initLogic(ball);
                        ball.isCreator = true; ball.noGrowth = true;


                        if (ball.copied === 'cacamus') { ball.pawnsInHand = 4; }
                        if (ball.copied === 'carrie') { ball.shrapnelDmg = 8; ball.maxPressure = 3; }
                        if (ball.copied === 'melis') { ball.burnDamage = 3.0; }
                        if (ball.copied === 'eli') { ball.ringDmg = 8; ball.ringCountRaw = 2; ball.ringCount = 2; }
                        if (ball.copied === 'abraham') { ball.waveRadius = 200; }
                        if (ball.copied === 'gordon') { ball.daggerCount = 2; }
                        if (ball.copied === 'thoth') { ball.massStacks = 6; ball.mass += 2.4; }
                        if (ball.copied === 'cetus') { ball.convictDmg = 20; }
                        if (ball.copied === 'ino') { ball.bounces = 4; }
                        if (ball.copied === 'kate') { ball.wallDamage = 10; }
                        if (ball.copied === 'olynx') { ball.bonusLifespan = 4; }
                        if (ball.copied === 'grimm') { ball.hitCount = 10; }
                        if (ball.copied === 'fasimir') { ball.stacks = 20; }


                        ball.onTakeDamage = template.onTakeDamage; ball.copiedUpdate = template.update;
                        ball.onCollide = template.onCollide; ball.modifyDamageOut = template.modifyDamageOut; ball.onWallBounce = template.onWallBounce;
                     }
                 }
              } else {
                 if (ball.copiedUpdate) ball.copiedUpdate(ball, engine);
              }
            }
          },
          anonymous: {
            id: 'anonymous', faction: 'StorybookCommittee', name: '佚名', title: '永滅 / 扉頁箴言', color: '#D1D5DB', mass: 1.0,
            desc: '【性相】秘之性相\n【被動】場上所有人損失的血量將化為「記憶」，每100點強化1點主動技能數值（單次傷害、單次治療量、圓環持續時間）。\n【主動】每 6 秒挑選箴言：從本質來(十字雷射)；到情感去(範圍恢復)；至平衡處(平衡圓環)。',
            initLogic: (ball) => { ball.skillTimer = 0; ball.memoryStacks = 0; ball.scalingValue = `讀書中...`; },
            update: (ball, engine) => {
              ball.skillTimer += DT;
              ball.memoryStacks = Math.floor((engine.globalLostHp || 0) / 100);
              const mem = ball.memoryStacks;


              if (ball.skillTimer >= 6) {
                 ball.skillTimer = 0;
                 const r = Math.random();
                 if (r < 0.33) {
                     engine.spawnProjectile({
                         type: 'cross_laser', x: engine.arenaSize/2, y: engine.arenaSize/2, vx: 0, vy: 0,
                         radius: 0, color: '#FFFFFF', ownerId: ball.uniqueId, damage: 0, bounces: 0, lifespan: 10 * (ball.isCreator ? 2 : 1), maxLifespan: 10 * (ball.isCreator ? 2 : 1), penetrating: true, angle: 0, hitCooldowns: {}, baseDamage: 10 + mem
                     });
                     ball.scalingValue = `箴言：從本質來 | 記憶: ${mem}`;
                 } else if (r < 0.66) {
                     engine.spawnObstacle({ type: 'heal_field', x: ball.x, y: ball.y, radius: 150, color: 'rgba(16, 185, 129, 0.2)', ownerId: ball.uniqueId, team: ball.team, lifespan: 5 * (ball.isCreator ? 2 : 1), healAmount: 3 + mem });
                     ball.scalingValue = `箴言：到情感去 | 記憶: ${mem}`;
                 } else {
                     engine.spawnObstacle({ type: 'balance_ring', x: engine.arenaSize/2, y: engine.arenaSize/2, radius: 250, color: 'rgba(245, 158, 11, 0.3)', ownerId: ball.uniqueId, team: ball.team, lifespan: (10 + mem) * (ball.isCreator ? 2 : 1) });
                     ball.scalingValue = `箴言：至平衡處 | 記憶: ${mem}`;
                 }
              } else {
                 if (ball.scalingValue.includes('記憶:')) {
                     ball.scalingValue = ball.scalingValue.replace(/記憶: \d+/, `記憶: ${mem}`);
                 } else {
                     ball.scalingValue = ball.scalingValue + ` | 記憶: ${mem}`;
                 }
              }
            }
          },
          ocalis: {
            id: 'ocalis', faction: 'StorybookCommittee', name: '奧卡利斯', title: '永滅 / 必然收束', color: '#9CA3AF', mass: 0.5, radiusMult: 0.6,
            desc: '【性相】秘之性相\n【被動】化為敵人的衛星在絕對軌道上順時針緩慢環繞，受傷大幅減免。\n【主動】每 5 秒扣除目標 5% 最大生命值。',
            initLogic: (ball) => { ball.maxHp = ball.maxHp * 0.3; ball.baseMaxHp = ball.maxHp; ball.hp = ball.maxHp; ball.proofreadTimer = 0; ball.attachedTargetId = null; ball.orbitAngle = 0; ball.scalingValue = `校訂準備中...`; },
            update: (ball, engine) => {
              ball.proofreadTimer += DT;
              let target = engine.balls.find(b => b.uniqueId === ball.attachedTargetId);
              if (!target || target.hp <= 0 || target.isBlank) {
                  target = engine.getNearestEnemy(ball);
                  if (target) ball.attachedTargetId = target.uniqueId;
                  else ball.attachedTargetId = null;
              }
              if (target) {
                 ball.scalingValue = `目標: ${target.name.substring(0,4)}`;
                 ball.orbitAngle += 1.2 * DT; 
                 const idealOrbitRadius = target.radius + ball.radius + 100;
                 const targetX = target.x + Math.cos(ball.orbitAngle) * idealOrbitRadius, targetY = target.y + Math.sin(ball.orbitAngle) * idealOrbitRadius;
                 ball.x = Math.max(ball.radius, Math.min(engine.arenaSize - ball.radius, targetX));
                 ball.y = Math.max(ball.radius, Math.min(engine.arenaSize - ball.radius, targetY));
                 ball.vx = 0; ball.vy = 0;
                 if (ball.proofreadTimer >= 5) {
                    ball.proofreadTimer = 0;
                    engine.applyDamage(target, target.maxHp * 0.05 * (ball.isCreator ? 2 : 1), ball.uniqueId, 'magic');
                 }
              }
            },
            modifyDamageOut: () => 0, 
            onTakeDamage: (ball, amount) => amount * 0.1
          },
          podoasg: {
            id: 'podoasg', faction: 'StorybookCommittee', name: '波多亞斯格', title: '永滅 / 委員會召喚', color: '#F1F5F9', mass: 1.0,
            desc: '【性相】秘之性相\n【被動】開局遁入「空白」。每 20 秒在場地留下持續 10 秒的混亂牆壁。\n【主動】牆壁或本體被觸碰時，將隨機觸發任一負面狀態或傷害(觸牆效果翻倍)。\n【終幕】若無隊友存活，召喚數值減半的其他委員會成員，且親自下場參與戰鬥。',
            initLogic: (ball) => { 
                ball.isBlank = true; ball.wallTimer = 0; ball.hasJoined = false; ball.scalingValue = `狀態: 空白`; 
                ball.podoasgCooldowns = {}; ball.blankTimer = 0;
            },
            update: (ball, engine) => {
                if (ball.hasJoined && ball.isBlank) {
                    ball.blankTimer -= DT;
                    if (ball.blankTimer <= 0) { ball.isBlank = false; }
                }


                if (!ball.hasJoined) {
                    ball.isBlank = true;
                    ball.wallTimer += DT;
                    if (ball.wallTimer >= 20) {
                        ball.wallTimer = 0;
                        const v = [];
                        for(let i=0; i<8; i++){
                            const a = (i/8)*Math.PI*2 + Math.random()*0.5;
                            const r = 50 + Math.random()*30;
                            v.push({x: Math.cos(a)*r, y: Math.sin(a)*r});
                        }
                        engine.spawnObstacle({
                            type: 'podoasg_wall', x: ball.x, y: ball.y, radius: 70, vertices: v,
                            color: 'rgba(148, 163, 184, 0.5)', ownerId: ball.uniqueId, lifespan: 10
                        });
                    }


                    const realTeammates = engine.balls.filter(b => b.team === ball.team && b.hp > 0 && b.uniqueId !== ball.uniqueId && !b.isSummon);
                    if (realTeammates.length === 0) {
                        ball.hasJoined = true;
                        ball.isBlank = false;
                        
                        const committee = ['creator', 'anonymous', 'ocalis'];
                        const randomSeed = Math.floor(Math.random() * 999999) + Date.now() + Math.floor(Math.random() * 100);
                        const pick = committee[randomSeed % committee.length];
                        
                        const sid = ball.uniqueId + '_summon_' + Date.now();
                        const template = ROSTER[pick];
                        const minion = engine.createBall(template, ball.team, sid, false, ball.maxHp * 0.5, ball.x + (Math.random() - 0.5)*20, ball.y + (Math.random() - 0.5)*20);
                        minion.isSummon = true;
                        minion.radiusMult = (template.radiusMult || 1) * 0.7;
                        minion.radius = BALL_RADIUS * minion.radiusMult;
                        minion.mass = (template.mass || 1) * 0.5;
                        engine.balls.push(minion);
                        engine.spawnParticle({ type: 'text', x: ball.x, y: ball.y - 30, text: '📖 續寫故事！', color: '#F1F5F9' });
                    }
                }


                ball.scalingValue = !ball.hasJoined ? `幕後 | 牆壁: ${(20 - ball.wallTimer).toFixed(1)}s` : (ball.isBlank ? `空白 (${ball.blankTimer.toFixed(1)}s)` : `親自下場`);


                if (ball.podoasgCooldowns) {
                    Object.keys(ball.podoasgCooldowns).forEach(k => ball.podoasgCooldowns[k] -= DT);
                }
                if (ball.reactionWallCooldown > 0) ball.reactionWallCooldown -= DT;
            },
            onTakeDamage: (ball, amount, sourceId, engine) => {
              if (ball.isBlank) return 0; 
              if (amount > 0 && ball.hasJoined) {
                  if (!ball.reactionWallCooldown || ball.reactionWallCooldown <= 0) {
                      ball.reactionWallCooldown = 1.5;
                      const v = [];
                      for(let i=0; i<8; i++){
                          const a = (i/8)*Math.PI*2 + Math.random()*0.5;
                          const r = 50 + Math.random()*30;
                          v.push({x: Math.cos(a)*r, y: Math.sin(a)*r});
                      }
                      engine.spawnObstacle({
                          type: 'podoasg_wall', x: ball.x, y: ball.y, radius: 70, vertices: v,
                          color: 'rgba(148, 163, 184, 0.5)', ownerId: ball.uniqueId, lifespan: 10
                      });
                  }
              }
              return amount;
            },
            modifyDamageOut: () => 0,
            onCollide: (ball, other, relSpeed, engine) => {
                if (!ball.isBlank && engine.isEnemy(ball.uniqueId, other.uniqueId)) {
                    if ((ball.podoasgCooldowns[other.uniqueId] || 0) <= 0) {
                        ball.podoasgCooldowns[other.uniqueId] = 1.0; 
                        const nx = Math.sign(other.x - ball.x) || 1, ny = Math.sign(other.y - ball.y) || 1;
                        if (engine.applyRandomPodoasgEffect) engine.applyRandomPodoasgEffect(other, ball.uniqueId, nx, ny);
                    }
                }
            }
          },


          // ==================== 明日公司 (2位) ====================
          fasimir: {
            id: 'fasimir', faction: 'TomorrowCompany', name: '法西米爾·箭頭', title: '本質 / 赫萊森', color: '#38BDF8', mass: 1.0,
            desc: '【性相】型之性相\n【被動】建立敵方無法進入的「赫萊森」圓域。\n【主動】進入場地隨機獲得：杖(傳送/追蹤)、鎚(範圍打擊)、怒(天雷)，並為隊友賦予神器(可疊加)。\n【終幕】10次後本體化為場地獲極高質量，敵方撞擊受傷且定時落雷。',
            initLogic: (ball) => {
                ball.stacks = 0; ball.wasInZone = false;
                ball.hermesList = []; ball.hephaestusList = []; ball.zeusList = [];
                ball.ultimate = false; ball.ultHephaestusTimer = 10; ball.ultZeusTimer = 5;
                ball.horizonSpawned = false; ball.collisionCooldowns = {}; ball.takeCollisionCooldowns = {};
                ball.scalingValue = `赫萊森未啟動`;
            },
            update: (ball, engine) => {
                if (ball.ultimate) {
                    if (ball.collisionCooldowns) Object.keys(ball.collisionCooldowns).forEach(k => ball.collisionCooldowns[k] -= DT);
                    if (ball.takeCollisionCooldowns) Object.keys(ball.takeCollisionCooldowns).forEach(k => ball.takeCollisionCooldowns[k] -= DT);
                }
                if (!ball.horizonSpawned) {
                   engine.spawnObstacle({ type: 'horizon_zone', x: engine.arenaSize/2, y: engine.arenaSize/2, radius: 100, ownerId: ball.uniqueId, lifespan: 99999 });
                   ball.horizonSpawned = true;
                }


                const cx = engine.arenaSize / 2, cy = engine.arenaSize / 2;


                if (!ball.ultimate) {
                    const d = distance(ball.x, ball.y, cx, cy);
                    const inZone = (d < 100);


                    if (inZone && !ball.wasInZone) {
                        ball.stacks += 1 * (ball.noGrowth ? 0 : 1);
                        
                        const eff = Math.floor(Math.random() * 3);
                        if (eff === 0) { ball.hermesList.push(5); engine.spawnParticle({type:'text', x:ball.x, y:ball.y-30, text:'杖: 傳送預備', color:'#38BDF8'}); } 
                        else if (eff === 1) { ball.hephaestusList.push(10); engine.spawnParticle({type:'text', x:ball.x, y:ball.y-30, text:'鎚: 鎖定打擊', color:'#F87171'}); } 
                        else { ball.zeusList.push(15); engine.spawnParticle({type:'text', x:ball.x, y:ball.y-30, text:'怒: 雷霆降臨', color:'#FBBF24'}); }


                        engine.balls.forEach(t => {
                            if (t.hp > 0 && t.team === ball.team && t.uniqueId !== ball.uniqueId && !t.isBlank) {
                                if (!t.hermesList) t.hermesList = []; if (!t.hephaestusList) t.hephaestusList = []; if (!t.zeusList) t.zeusList = [];
                                const tEff = Math.floor(Math.random() * 3);
                                if (tEff === 0) { t.hermesList.push(5); engine.spawnParticle({type:'text', x:t.x, y:t.y-30, text:'杖: 傳送預備', color:'#38BDF8'}); } 
                                else if (tEff === 1) { t.hephaestusList.push(10); engine.spawnParticle({type:'text', x:t.x, y:t.y-30, text:'鎚: 鎖定打擊', color:'#F87171'}); } 
                                else { t.zeusList.push(15); engine.spawnParticle({type:'text', x:t.x, y:t.y-30, text:'怒: 雷霆降臨', color:'#FBBF24'}); }
                            }
                        });


                        if (ball.stacks >= 10) {
                            ball.ultimate = true;
                            if (ball.hermesList) ball.hermesList = ball.hermesList.map(() => 0);
                            if (ball.hephaestusList) ball.hephaestusList = ball.hephaestusList.map(() => 0);
                            if (ball.zeusList) ball.zeusList = ball.zeusList.map(() => 0);
                            ball.ultHephaestusTimer = 0; ball.ultZeusTimer = 0;


                            ball.x = cx; ball.y = cy; ball.vx = 0; ball.vy = 0; ball.speedMult = 0; ball.radius = 100 * (ball.radiusMult || 1); ball.mass = 999999;
                            engine.spawnParticle({type:'text', x:cx, y:cy-120, text:'赫萊森·絕對領域', color:'#FFFFFF'});


                            engine.obstacles.forEach(o => { if (o.type === 'horizon_zone' && o.ownerId === ball.uniqueId) o.lifespan = 0; });
                        }
                    }
                    ball.wasInZone = inZone;
                    ball.scalingValue = `進入: ${Math.floor(ball.stacks)}/10`;
                } else {
                    ball.x = cx; ball.y = cy; ball.vx = 0; ball.vy = 0;
                    ball.scalingValue = `赫萊森完全體`;
                }


                const processArtifacts = (targetBall) => {
                    const fireHammer = () => {
                        const target = engine.getNearestEnemy(targetBall);
                        if (target) {
                            engine.spawnParticle({ type: 'laser', x: targetBall.x, y: targetBall.y, tx: target.x, ty: target.y, color: '#F87171', lifespan: 0.5, maxLifespan: 0.5 });
                            engine.spawnWave({
                                x: target.x, y: target.y, startRadius: 0, maxRadius: 150, speed: 600, color: 'rgba(248, 113, 113, 0.5)', ownerId: targetBall.uniqueId,
                                onHit: (t) => {
                                    if (engine.isEnemy(t.uniqueId, targetBall.uniqueId)) {
                                        engine.applyDamage(t, 25, targetBall.uniqueId, 'magic');
                                        const n = normalize(t.x - target.x, t.y - target.y);
                                        t.vx += n.x * 600; t.vy += n.y * 600;
                                    }
                                }
                            });
                        }
                    };


                    const fireZeus = () => {
                        engine.spawnParticle({type: 'text', x: targetBall.x, y: targetBall.y - 50, text: '⚡ 宙斯之怒', color: '#FBBF24', maxLifespan: 1.5});
                        engine.balls.forEach(t => {
                            if (t.hp > 0 && engine.isEnemy(t.uniqueId, targetBall.uniqueId) && !t.isBlank) {
                                engine.applyDamage(t, 30, targetBall.uniqueId, 'magic');
                                const segments = [];
                                let currX = t.x, currY = t.y - engine.arenaSize;
                                segments.push({x: currX, y: currY});
                                while (currY < t.y) {
                                    currX += (Math.random() - 0.5) * 60; currY += 40 + Math.random() * 60;
                                    if (currY >= t.y) { currX = t.x; currY = t.y; }
                                    segments.push({x: currX, y: currY});
                                }
                                engine.spawnParticle({ type: 'lightning', x: t.x, y: t.y, segments: segments, color: '#FBBF24', maxLifespan: 0.4 });
                            }
                        });
                        engine.projectiles = engine.projectiles.filter(p => !engine.isEnemy(p.ownerId, targetBall.uniqueId));
                        engine.waves = engine.waves.filter(w => !engine.isEnemy(w.ownerId, targetBall.uniqueId));
                        engine.obstacles = engine.obstacles.filter(o => o.type === 'horizon_zone' || !engine.isEnemy(o.ownerId || 'god', targetBall.uniqueId));
                    };


                    if (targetBall.hermesList && targetBall.hermesList.length > 0) {
                        for (let i = targetBall.hermesList.length - 1; i >= 0; i--) {
                            targetBall.hermesList[i] -= DT;
                            if (targetBall.hermesList[i] <= 0) {
                                targetBall.hermesList.splice(i, 1);
                                const norm = normalize(targetBall.vx, targetBall.vy);
                                let dirX = norm.x, dirY = norm.y;
                                if (dirX === 0 && dirY === 0) { dirX = 1; dirY = 0; } 
                                const oldX = targetBall.x, oldY = targetBall.y;


                                targetBall.x += dirX * 250; targetBall.y += dirY * 250;
                                targetBall.x = Math.max(targetBall.radius, Math.min(engine.arenaSize - targetBall.radius, targetBall.x));
                                targetBall.y = Math.max(targetBall.radius, Math.min(engine.arenaSize - targetBall.radius, targetBall.y));


                                const spawnBullet = (bx, by) => {
                                    engine.spawnProjectile({ type: 'tracker', x: bx, y: by, vx: (Math.random()-0.5)*100, vy: (Math.random()-0.5)*100, radius: 8, color: '#38BDF8', ownerId: targetBall.uniqueId, damage: 8, bounces: 2, lifespan: 4, isTracking: true, trackingRange: 500, maxSpeed: 450 });
                                };
                                spawnBullet(oldX, oldY); spawnBullet(targetBall.x, targetBall.y);
                                engine.spawnParticle({type:'laser', x:oldX, y:oldY, tx:targetBall.x, ty:targetBall.y, color:'#38BDF8', lifespan:0.2, maxLifespan:0.2});
                            }
                        }
                    }


                    if (targetBall.hephaestusList && targetBall.hephaestusList.length > 0) {
                        for (let i = 0; i < targetBall.hephaestusList.length; i++) {
                            targetBall.hephaestusList[i] -= DT;
                            if (targetBall.hephaestusList[i] <= 0) { targetBall.hephaestusList[i] = 10; fireHammer(); }
                        }
                    }


                    if (targetBall.zeusList && targetBall.zeusList.length > 0) {
                        for (let i = 0; i < targetBall.zeusList.length; i++) {
                            targetBall.zeusList[i] -= DT;
                            if (targetBall.zeusList[i] <= 0) { targetBall.zeusList[i] = 15; fireZeus(); }
                        }
                    }


                    if (targetBall.ultimate) {
                        if (targetBall.ultHephaestusTimer === undefined) targetBall.ultHephaestusTimer = 10;
                        targetBall.ultHephaestusTimer -= DT;
                        if (targetBall.ultHephaestusTimer <= 0) { targetBall.ultHephaestusTimer = 10; fireHammer(); }
                        
                        if (targetBall.ultZeusTimer === undefined) targetBall.ultZeusTimer = 5;
                        targetBall.ultZeusTimer -= DT;
                        if (targetBall.ultZeusTimer <= 0) { targetBall.ultZeusTimer = 5; fireZeus(); }
                    }
                };


                processArtifacts(ball);


                engine.balls.forEach(t => {
                    if (t.hp > 0 && t.team === ball.team && t.uniqueId !== ball.uniqueId && !t.isBlank) {
                        const isFasimir = (t.id === 'fasimir' || t.copied === 'fasimir');
                        if (!isFasimir && t.lastArtifactProcessTime !== engine.time) {
                            t.lastArtifactProcessTime = engine.time;
                            processArtifacts(t);
                        }
                    }
                });
            },
            modifyDamageOut: (ball, baseDamage, engine, targetBall) => {
                if (ball.ultimate) {
                    if (!ball.collisionCooldowns) ball.collisionCooldowns = {};
                    if ((ball.collisionCooldowns[targetBall.uniqueId] || 0) > 0) return 0;
                    ball.collisionCooldowns[targetBall.uniqueId] = 0.5; 
                    return 15;
                }
                return baseDamage;
            },
            onCollide: (ball, other, relSpeed, engine) => {
                if (ball.ultimate) {
                    const norm = normalize(other.x - ball.x, other.y - ball.y);
                    other.vx += norm.x * 2500; 
                    other.vy += norm.y * 2500;
                }
            },
            onTakeDamage: (ball, amount, sourceId, engine, damageType) => {
                if (ball.ultimate && ['collision', 'wall_collision'].includes(damageType)) {
                    if (!ball.takeCollisionCooldowns) ball.takeCollisionCooldowns = {};
                    const sid = sourceId || 'env';
                    if ((ball.takeCollisionCooldowns[sid] || 0) > 0) return 0;
                    ball.takeCollisionCooldowns[sid] = 0.5; 
                    return amount;
                }
                return amount;
            }
          },
          lisi: {
            id: 'lisi', faction: 'TomorrowCompany', name: '李斯', title: '本質 / 明日新聞', color: '#F472B6', mass: 1.0,
            desc: '【性相】意之性相\n【被動】周圍環繞照相機，每 0.8 秒對前方扇形範圍照相，造成隨距離遞減的傷害。\n【主動】進入大新聞狀態記錄全場，期間受擊喚出狂熱粉絲公審。\n【回溯】5秒後全場位置回到紀錄狀態(不影響血量與成長)，進入10秒冷卻。',
            initLogic: (ball) => {
                ball.newsTimer = 0; ball.newsState = true; ball.needsSnapshot = true; ball.fanCooldowns = {}; ball.cameraAngle = 0; ball.photoTimer = 0; ball.scalingValue = `大新聞！準備中...`;
            },
            update: (ball, engine) => {
                ball.cameraAngle += 3 * DT; 
                ball.photoTimer += DT;
                if (ball.photoTimer >= 0.8) { 
                    ball.photoTimer = 0;
                    const rRadius = ball.radius + 35;
                    const camX = ball.x + Math.cos(ball.cameraAngle) * rRadius;
                    const camY = ball.y + Math.sin(ball.cameraAngle) * rRadius;
                    const flashRange = 300;
                    
                    engine.spawnParticle({ type: 'photo_flash', x: camX, y: camY, angle: ball.cameraAngle, range: flashRange, color: 'rgba(255, 255, 255, 0.8)', maxLifespan: 0.4 });


                    engine.balls.forEach(t => {
                        if (t.hp > 0 && engine.isEnemy(t.uniqueId, ball.uniqueId) && !t.isBlank) {
                            const dx = t.x - camX, dy = t.y - camY, dist = Math.hypot(dx, dy);
                            if (dist <= flashRange) {
                                let angleToT = Math.atan2(dy, dx), angleDiff = Math.abs(angleToT - ball.cameraAngle);
                                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                                angleDiff = Math.abs(angleDiff);
                                if (angleDiff <= Math.PI / 4) { 
                                    const dmg = 4 * (1 - dist / flashRange); 
                                    engine.applyDamage(t, Math.max(1, dmg), ball.uniqueId, 'magic');
                                }
                            }
                        }
                    });
                }


                if (ball.needsSnapshot) {
                    ball.needsSnapshot = false;
                    engine.spawnParticle({ type: 'text', x: ball.x, y: ball.y - 40, text: '📸 大新聞！', color: '#F472B6' });
                    ball.snapshot = { balls: cloneBalls(engine.balls), projectiles: cloneProjs(engine.projectiles), waves: cloneProjs(engine.waves), obstacles: engine.obstacles.map(o => ({...o})) };
                    ball.fanCooldowns = {};
                }


                ball.newsTimer += DT;
                if (ball.newsState && ball.newsTimer >= 5) { 
                    ball.newsState = false; ball.newsTimer = 0;
                    engine.spawnParticle({ type: 'text', x: ball.x, y: ball.y - 40, text: '⏪ 狀態回溯', color: '#38BDF8' });
                    if (ball.snapshot) {
                        const snapSelf = ball.snapshot.balls.find(b => b.uniqueId === ball.uniqueId);
                        if (snapSelf) ball.hp = snapSelf.hp;


                        engine.balls.forEach(b => {
                            const snapB = ball.snapshot.balls.find(sb => sb.uniqueId === b.uniqueId);
                            if (snapB) { b.x = snapB.x; b.y = snapB.y; b.vx = snapB.vx; b.vy = snapB.vy; }
                        });


                        engine.projectiles = cloneProjs(ball.snapshot.projectiles);
                        engine.waves = cloneProjs(ball.snapshot.waves);
                        engine.obstacles = ball.snapshot.obstacles.map(o => ({...o}));
                        ball.snapshot = null;
                    }
                } else if (!ball.newsState && ball.newsTimer >= 10) { 
                    ball.newsState = true; ball.newsTimer = 0; ball.needsSnapshot = true;
                }
                ball.scalingValue = ball.newsState ? `大新聞！ (${(5 - ball.newsTimer).toFixed(1)}s)` : `新聞冷卻 (${(10 - ball.newsTimer).toFixed(1)}s)`;
            },
            onTakeDamage: (ball, amount, sourceId, engine) => {
                if (ball.newsState && sourceId && amount > 0) {
                    const sourceBall = engine.balls.find(b => b.uniqueId === sourceId);
                    if (sourceBall && engine.isEnemy(ball.uniqueId, sourceId) && (ball.fanCooldowns[sourceId] || 0) <= 0) {
                        ball.fanCooldowns[sourceId] = 0.2;
                        const corners = [{x: 50, y: 50}, {x: engine.arenaSize - 50, y: 50}, {x: 50, y: engine.arenaSize - 50}, {x: engine.arenaSize - 50, y: engine.arenaSize - 50}];
                        corners.forEach((c, idx) => {
                            const fan = engine.createBall(ROSTER.fanatic_fan, ball.team, `${ball.uniqueId}_fan_${sourceId}_${idx}_${Date.now()}_${Math.random()}`, false, 10, c.x, c.y);
                            fan.targetId = sourceId; engine.balls.push(fan);
                        });
                        engine.spawnParticle({ type: 'text', x: ball.x, y: ball.y - 60, text: '📢 公審開始！', color: '#F43F5E' });
                    }
                }
                return amount;
            }
          },
          fanatic_fan: {
              id: 'fanatic_fan', faction: 'TomorrowCompany', name: '狂熱粉絲', title: '公審', color: '#F43F5E', mass: 0.8, radiusMult: 0.5,
              desc: '公審目標',
              initLogic: (b) => { b.speedMult = 1.6; },
              update: (b, engine) => {
                  let target = engine.balls.find(tb => tb.uniqueId === b.targetId && tb.hp > 0 && !tb.isBlank);
                  
                  if (!target) {
                      target = engine.getNearestEnemy(b);
                      if (target) b.targetId = target.uniqueId;
                  }
                  
                  if (target) {
                      const norm = normalize(target.x - b.x, target.y - b.y);
                      b.vx += norm.x * 50; b.vy += norm.y * 50;
                      const speed = Math.hypot(b.vx, b.vy);
                      if (speed > 450) { b.vx = (b.vx/speed)*450; b.vy = (b.vy/speed)*450; }
                  } else {
                      b.hp = 0; 
                  }
              },
              modifyDamageOut: () => 1,
              onCollide: () => {}
          },
          chess_piece: {
              id: 'chess_piece', faction: 'Other', name: '戰棋', title: '召喚物', color: '#E5E7EB', mass: 9999, radiusMult: 22/35,
              desc: '卡卡繆思的戰棋。',
              initLogic: (ball) => {
                  ball.isChessPiece = true;
                  ball.isUntargetable = true;
                  ball.speedMult = 0;
                  ball.vx = 0; 
                  ball.vy = 0; 
                  ball.moveTimer = 0;
                  ball.moveProgress = 0;
                  ball.isMoving = false;
                  ball.blockCooldowns = {};
                  ball.scalingValue = `棋子`;
              },
              update: (o, engine) => {
                  o.vx = 0; 
                  o.vy = 0; 


                  const owner = engine.balls.find(b => b.uniqueId === o.ownerId);
                  if (!owner || owner.hp <= 0) {
                      o.hp = 0; return;
                  }


                  Object.keys(o.blockCooldowns).forEach(k => o.blockCooldowns[k] -= DT);


                  if (o.isMoving) {
                      o.moveProgress += DT * 2; 
                      if (o.moveProgress >= 1) {
                          o.moveProgress = 1;
                          o.isMoving = false;
                          
                          const cellSize = engine.arenaSize / 8;
                          const affectedCells = [
                              { c: o.col, r: o.row },
                              { c: o.col + 1, r: o.row },
                              { c: o.col - 1, r: o.row },
                              { c: o.col, r: o.row + 1 },
                              { c: o.col, r: o.row - 1 }
                          ];
                          
                          const hitThisMove = new Set();
                          affectedCells.forEach(cell => {
                              if (cell.c >= 0 && cell.c <= 7 && cell.r >= 0 && cell.r <= 7) {
                                  const cx = (cell.c + 0.5) * cellSize;
                                  const cy = (cell.r + 0.5) * cellSize;
                                  
                                  engine.spawnParticle({
                                      type: 'rect_flash', x: cx, y: cy, size: cellSize, color: 'rgba(229, 231, 235, 0.4)', maxLifespan: 0.3
                                  });
                                  
                                  engine.balls.forEach(t => {
                                      if (t.hp > 0 && !t.isBlank && engine.isEnemy(t.uniqueId, o.ownerId) && !t.isChessPiece) {
                                          const left = cell.c * cellSize;
                                          const right = (cell.c + 1) * cellSize;
                                          const top = cell.r * cellSize;
                                          const bottom = (cell.r + 1) * cellSize;
                                          
                                          const closestX = Math.max(left, Math.min(t.x, right));
                                          const closestY = Math.max(top, Math.min(t.y, bottom));
                                          const dx = t.x - closestX;
                                          const dy = t.y - closestY;
                                          
                                          if ((dx * dx + dy * dy) < (t.radius * t.radius)) {
                                              if (!hitThisMove.has(t.uniqueId)) {
                                                  hitThisMove.add(t.uniqueId);
                                                  engine.applyDamage(t, 8, o.ownerId, 'magic');
                                                  engine.spawnParticle({ type: 'text', x: t.x, y: t.y - 30, text: '⚔️ 將軍!', color: o.color });
                                              }
                                          }
                                      }
                                  });
                              }
                          });


                          if (o.pieceType === 'pawn' && (o.row === 0 || o.row === 7)) {
                              const pieces = ['knight', 'bishop', 'rook', 'queen'];
                              o.pieceType = pieces[Math.floor(Math.random() * pieces.length)];
                              engine.spawnParticle({type:'text', x:o.x, y:o.y-30, text:'✨ 升變!', color:'#FCD34D'});
                          }
                      }
                      o.x = o.moveStartX + (o.moveEndX - o.moveStartX) * o.moveProgress;
                      o.y = o.moveStartY + (o.moveEndY - o.moveStartY) * o.moveProgress;
                  } else {
                      o.moveTimer += DT;
                      if (o.moveTimer >= 3) {
                          o.moveTimer = 0;
                          
                          let targetToFollow = null;
                          if (o.behavior === 'protect') {
                              targetToFollow = engine.balls.find(b => b.uniqueId === o.ownerId && b.hp > 0 && !b.isBlank);
                          }
                          if (!targetToFollow) {
                              let minDist = Infinity;
                              engine.balls.forEach(b => {
                                  if(b.hp > 0 && engine.isEnemy(b.uniqueId, o.ownerId) && !b.isBlank && !b.isChessPiece){
                                      const d = distance(b.x, b.y, o.x, o.y);
                                      if(d < minDist){ minDist = d; targetToFollow = b; }
                                  }
                              });
                          }
                          
                          if (targetToFollow) {
                              const cellSize = engine.arenaSize / 8;
                              const moves = [];
                              const c = o.col, r = o.row;
                              
                              if (o.pieceType === 'pawn') {
                                  moves.push({c: c, r: r + o.direction});
                              } else if (o.pieceType === 'knight') {
                                  const offsets = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
                                  offsets.forEach(off => moves.push({c: c+off[0], r: r+off[1]}));
                              } else if (o.pieceType === 'bishop' || o.pieceType === 'rook' || o.pieceType === 'queen') {
                                  const dirs = [];
                                  if (o.pieceType !== 'rook') dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
                                  if (o.pieceType !== 'bishop') dirs.push([1,0],[-1,0],[0,1],[0,-1]);
                                  dirs.forEach(d => {
                                      for(let k=1; k<=7; k++) moves.push({c: c+d[0]*k, r: r+d[1]*k});
                                  });
                              }
                              
                              let bestMove = null; let bestDist = Infinity;
                              moves.forEach(m => {
                                  if (m.c >= 0 && m.c <= 7 && m.r >= 0 && m.r <= 7) {
                                      const occupied = engine.balls.some(ob => ob.isChessPiece && ob.uniqueId !== o.uniqueId && ob.col === m.c && ob.row === m.r && ob.hp > 0);
                                      if (!occupied) {
                                          const cx = (m.c + 0.5) * cellSize;
                                          const cy = (m.r + 0.5) * cellSize;
                                          const d = distance(cx, cy, targetToFollow.x, targetToFollow.y);
                                          if (d < bestDist) { bestDist = d; bestMove = m; }
                                      }
                                  }
                              });
                              
                              if (bestMove && (bestMove.c !== o.col || bestMove.r !== o.row)) {
                                  o.isMoving = true;
                                  o.moveStartX = o.x; o.moveStartY = o.y;
                                  o.moveEndX = (bestMove.c + 0.5) * cellSize;
                                  o.moveEndY = (bestMove.r + 0.5) * cellSize;
                                  o.col = bestMove.c; o.row = bestMove.r;
                                  o.moveProgress = 0;
                              }
                          }
                      }
                  }
              },
              modifyDamageOut: () => 0,
              onCollide: () => {}
          },
          endless_minion: {
              id: 'endless_minion', faction: 'Other', name: '無盡狂熱者', title: '小兵', color: '#14B8A6', mass: 0.8, radiusMult: 0.5,
              desc: '無盡模式專用小兵',
              initLogic: (b) => { b.speedMult = 1.6; },
              update: (b, engine) => {
                  const target = engine.getNearestEnemy(b);
                  if (target) {
                      const norm = normalize(target.x - b.x, target.y - b.y);
                      b.vx += norm.x * 50; b.vy += norm.y * 50; 
                      const speed = Math.hypot(b.vx, b.vy);
                      if (speed > 450) { b.vx = (b.vx/speed)*450; b.vy = (b.vy/speed)*450; } 
                  }
              },
              modifyDamageOut: () => 1,
              onCollide: () => {}
          },
          grimm: {
            id: 'grimm', faction: 'AnchorOfDestiny', name: '格林·吉奧', title: '念核 / 『志』之錨', color: '#34D399', mass: 1.1,
            desc: '【性相】穩之性相\n【被動】每2秒生成念核。本體拾取化為軌道；敵方拾取受傷；我方拾取恢復。\n【主動】滿12顆時將念核收束為巨劍，消耗念核並基於累積受擊次數揮砍，隨機鎖定敵人造成傷害。',
            initLogic: (ball) => {
                ball.coreTimer = 0; ball.collectedCores = 0; ball.hitCount = 0; ball.baseOrbitAngle = 0; 
                ball.isGathering = false; ball.gatherTimer = 0; ball.isSlashing = false; ball.slashCount = 0;
                ball.totalSlashes = 0; ball.slashInterval = 0; ball.slashComboCount = 0; ball.hitCooldowns = {};   
                ball.scalingValue = `念核: 0/12 | 受擊: 0`;
            },
            update: (ball, engine) => {
                if (!ball.orbitCooldowns) ball.orbitCooldowns = {};
                Object.keys(ball.orbitCooldowns).forEach(k => ball.orbitCooldowns[k] -= DT);
                if (!ball.hitCooldowns) ball.hitCooldowns = {};
                Object.keys(ball.hitCooldowns).forEach(k => ball.hitCooldowns[k] -= DT);


                ball.baseOrbitAngle = (ball.baseOrbitAngle || 0) + 6 * DT; 


                if (ball.isGathering) {
                    ball.gatherTimer -= DT;
                    if (ball.gatherTimer <= 0) {
                        ball.isGathering = false; ball.totalSlashes = Math.max(1, ball.hitCount);
                        ball.collectedCores = 0; ball.slashComboCount = 0; ball.isSlashing = true; ball.slashCount = 0; ball.slashInterval = 0;
                        engine.spawnParticle({ type: 'text', x: ball.x, y: ball.y - 40, text: '⚔️ 形念·巨劍', color: '#10B981' });
                    }
                } else if (ball.isSlashing) {
                    ball.slashInterval -= DT;
                    if (ball.slashInterval <= 0) {
                        ball.slashCount++; ball.slashComboCount++;
                        if (ball.slashComboCount >= 5) { ball.slashInterval = 0.4; ball.slashComboCount = 0; } 
                        else { ball.slashInterval = 0.08; }
                        
                        const enemies = engine.balls.filter(t => t.hp > 0 && engine.isEnemy(t.uniqueId, ball.uniqueId) && !t.isBlank);
                        if (enemies.length > 0) {
                            const target = enemies[Math.floor(Math.random() * enemies.length)];
                            const angle = Math.random() * Math.PI * 2;
                            const length = engine.arenaSize * 3; 
                            const p1 = { x: target.x + Math.cos(angle) * length/2, y: target.y + Math.sin(angle) * length/2 };
                            const p2 = { x: target.x - Math.cos(angle) * length/2, y: target.y - Math.sin(angle) * length/2 };
                            
                            engine.spawnParticle({ type: 'slash', p1, p2, color: '#34D399', maxLifespan: 0.25 });
                            engine.applyDamage(target, 10, ball.uniqueId, 'magic');
                        }


                        if (ball.slashCount >= ball.totalSlashes) {
                            ball.isSlashing = false; ball.scalingValue = `念核: ${ball.collectedCores}/12 | 受擊: ${ball.hitCount}`;
                        } else { ball.scalingValue = `形念巨劍: 揮砍 ${ball.slashCount}/${ball.totalSlashes}`; }
                    }
                } else {
                    if (ball.collectedCores >= 12) {
                        ball.isGathering = true; ball.gatherTimer = 1.0; ball.scalingValue = `念核匯聚中...`;
                    } else {
                        ball.coreTimer += DT;
                        if (ball.coreTimer >= 2) {
                            ball.coreTimer = 0;
                            engine.spawnObstacle({ type: 'thought_core', x: 50 + Math.random() * (engine.arenaSize - 100), y: 50 + Math.random() * (engine.arenaSize - 100), radius: 10, color: '#10B981', ownerId: ball.uniqueId, lifespan: 15 });
                        }
                        
                        if (ball.collectedCores > 0) {
                            const orbitRadius = ball.radius + 60; 
                            engine.balls.forEach(t => {
                                if (t.hp > 0 && engine.isEnemy(t.uniqueId, ball.uniqueId) && !t.isBlank) {
                                    for(let i=0; i<ball.collectedCores; i++) {
                                        const cdKey = `${t.uniqueId}_core_${i}`;
                                        const cd = ball.orbitCooldowns[cdKey] || 0;
                                        if (cd <= 0) {
                                            const angle = (ball.baseOrbitAngle || 0) + (i * Math.PI * 2 / ball.collectedCores);
                                            const cx = ball.x + Math.cos(angle) * orbitRadius;
                                            const cy = ball.y + Math.sin(angle) * orbitRadius;
                                            if (distance(cx, cy, t.x, t.y) < t.radius + 15) { 
                                                engine.applyDamage(t, 2, ball.uniqueId, 'magic'); 
                                                ball.orbitCooldowns[cdKey] = 0.5; 
                                            }
                                        }
                                    }
                                }
                            });
                        }
                        ball.scalingValue = `念核: ${ball.collectedCores}/12 | 受擊: ${ball.hitCount}`;
                    }
                }
            },
            onTakeDamage: (ball, amount, sourceId, engine, damageType) => {
                if (amount > 0) {
                    if (damageType === 'projectile') {
                        if (!ball.noGrowth) ball.hitCount++;
                        if (!ball.isSlashing && !ball.isGathering) ball.scalingValue = `念核: ${ball.collectedCores}/12 | 受擊: ${ball.hitCount}`;
                    } else {
                        const sid = sourceId || damageType || 'env'; 
                        if (!ball.hitCooldowns) ball.hitCooldowns = {};
                        if ((ball.hitCooldowns[sid] || 0) <= 0) {
                            if (!ball.noGrowth) ball.hitCount++;
                            ball.hitCooldowns[sid] = 0.5; 
                            if (!ball.isSlashing && !ball.isGathering) ball.scalingValue = `念核: ${ball.collectedCores}/12 | 受擊: ${ball.hitCount}`;
                        }
                    }
                }
                return amount;
            }
          },
          quzhe: {
            id: 'quzhe', faction: 'AnchorOfDestiny', name: '曲哲', title: '雙生 / 『象』之錨', color: '#059669', mass: 1.0,
            desc: '【性相】境之性相\n【被動】有無雙生：本體與虛影各分配50%血量，一方受傷另一方恢復同等血量，受治療反之。兩者互不碰撞且皆為半透明。\n【主動】一方血量歸零時，另一方會撕裂現實展開無盡之境。領域內敵人每秒流失「ln(血量總變化值)」% 血量上限。離開領域則每秒恢復1%上限。\n【反制】存活方受擊時，會在原地撕裂出新的境界裂口，有5秒冷卻。若裂口重疊，邊界將會如細胞般交融蔓延。',
            initLogic: (ball) => {
                ball.isQuzheMain = true;
                ball.phantomId = null;
                ball.totalHpChange = 0;
                ball.hasTriggeredDomain = false;
                ball.phantomSpawned = false;
                ball.hp = ball.maxHp * 0.5;
                ball.lastHp = ball.hp;
                ball.twinHealQueue = 0;
                ball.twinDamageQueue = 0;
                ball.riftCooldown = 0;
                ball.scalingValue = `變化積累: 0`;
            },
            update: (ball, engine) => {
                if (ball.isQuzheMain && !ball.phantomSpawned) {
                    ball.phantomSpawned = true;
                    const pId = `${ball.uniqueId}_phantom`;
                    ball.phantomId = pId;
                    const phantom = engine.createBall(ROSTER.quzhe_phantom, ball.team, pId, false, ball.baseMaxHp, ball.x + (Math.random()-0.5)*100, ball.y + (Math.random()-0.5)*100);
                    phantom.mainId = ball.uniqueId;
                    
                    // 新增召喚者追溯宣告，讓虛影造成的傷害能完美計入曲哲本體的結算面板
                    phantom.summonerId = ball.uniqueId;
                    phantom.isSummon = true; 
                    
                    phantom.radiusMult = ball.radiusMult || 1;
                    phantom.radius = ball.radius;
                    phantom.mass = ball.mass;
                    phantom.isBoss = ball.isBoss;


                    phantom.hp = phantom.maxHp * 0.5; 
                    phantom.lastHp = phantom.hp;
                    phantom.twinHealQueue = 0;
                    phantom.twinDamageQueue = 0;
                    phantom.riftCooldown = 0;
                    engine.balls.push(phantom);
                }


                if (ball.lastHp === undefined) ball.lastHp = ball.hp;
                if (ball.twinHealQueue === undefined) ball.twinHealQueue = 0;
                if (ball.twinDamageQueue === undefined) ball.twinDamageQueue = 0;
                if (ball.riftCooldown === undefined) ball.riftCooldown = 0;
                
                if (ball.riftCooldown > 0) ball.riftCooldown -= DT;
                
                // 1. 結算環境造成的血量波動 (傷害與治療皆計算)
                const hpDiff = ball.hp - ball.lastHp;
                if (Math.abs(hpDiff) > 0.01) {
                    const diff = Math.abs(hpDiff);
                    const mainBall = ball.isQuzheMain ? ball : engine.balls.find(b => b.uniqueId === ball.mainId);
                    if (mainBall) mainBall.totalHpChange += diff;
                    
                    const otherId = ball.isQuzheMain ? ball.phantomId : ball.mainId;
                    const other = engine.balls.find(b => b.uniqueId === otherId);
                    if (other && other.hp > 0) {
                        if (hpDiff < 0) {
                            // 此球受傷，另一球補血
                            other.twinHealQueue = (other.twinHealQueue || 0) + diff;
                        } else if (hpDiff > 0) {
                            // 此球補血，另一球受傷
                            other.twinDamageQueue = (other.twinDamageQueue || 0) + diff;
                        }
                    }
                    ball.lastHp = ball.hp;
                }
                
                // 2. 結算從另一半雙生傳遞過來的治療與傷害量 (並防止迴圈)
                if (ball.twinHealQueue > 0) {
                    engine.applyHeal(ball, ball.twinHealQueue);
                    ball.lastHp = ball.hp; // 吸收這次治療，防止下個幀重複觸發波動
                    ball.twinHealQueue = 0;
                }
                if (ball.twinDamageQueue > 0) {
                    engine.applyDamage(ball, ball.twinDamageQueue, ball.uniqueId, 'magic');
                    ball.lastHp = ball.hp; // 吸收這次傷害，防止下個幀重複觸發波動
                    ball.twinDamageQueue = 0;
                }


                if (ball.isQuzheMain) {
                    ball.scalingValue = `雙生相依 | 變化積累: ${Math.floor(ball.totalHpChange)}`;
                }
            },
            onTakeDamage: (ball, amount, sourceId, engine, damageType) => {
                const actualLoss = Math.min(ball.hp, amount);
                const otherId = ball.isQuzheMain ? ball.phantomId : ball.mainId;
                const other = engine.balls.find(b => b.uniqueId === otherId);
                
                if (ball.hp - actualLoss <= 0 && other && other.hp > 0 && !ball.hasTriggeredDomain) {
                    ball.hasTriggeredDomain = true;
                    other.hasTriggeredDomain = true;
                    
                    const mainBall = ball.isQuzheMain ? ball : other;
                    mainBall.totalHpChange += actualLoss;
                    
                    // 將對數的底數改為自然底數 e (Math.log)
                    const erosionRate = Math.log(Math.max(1, mainBall.totalHpChange)) / 100;
                    
                    engine.spawnObstacle({
                        type: 'quzhe_domain', x: other.x, y: other.y, 
                        radius: 0, maxRadius: engine.arenaSize * 1.5,
                        color: 'rgba(16, 185, 129, 0.2)', ownerId: other.uniqueId,
                        lifespan: 9999, expandSpeed: 20, erosionRate: erosionRate,
                        tears: Array.from({length: 3}, () => ({
                            angle: Math.random() * Math.PI * 2,
                            length: 0,
                            speed: 30 + Math.random() * 20
                        }))
                    });
                    engine.spawnParticle({ type: 'text', x: other.x, y: other.y - 30, text: '無盡之境！', color: '#059669', maxLifespan: 2 });
                } else if (ball.hasTriggeredDomain && amount > 0) {
                    const mainBall = ball.isQuzheMain ? ball : (other || ball);
                    if ((ball.riftCooldown || 0) <= 0) {
                        ball.riftCooldown = 5.0;
                        const erosionRate = Math.log(Math.max(1, mainBall.totalHpChange)) / 100;
                        engine.spawnObstacle({
                            type: 'quzhe_rift', x: ball.x, y: ball.y, 
                            radius: 0, maxRadius: 160,
                            color: 'rgba(16, 185, 129, 0.2)', ownerId: ball.uniqueId,
                            lifespan: 9999, expandSpeed: 40, erosionRate: erosionRate,
                            tears: Array.from({length: 3}, () => ({ angle: Math.random() * Math.PI * 2, length: 0, speed: 20 + Math.random() * 20 }))
                        });
                        engine.spawnParticle({ type: 'text', x: ball.x, y: ball.y - 30, text: '💥 境界撕裂!', color: '#059669', maxLifespan: 2 });
                    }
                }
                return amount;
            }
          },
          quzhe_phantom: {
            id: 'quzhe_phantom', faction: 'Other', name: '曲哲 (虛影)', title: '雙生虛影', color: '#6EE7B7', mass: 1.0,
            desc: '曲哲的雙生虛影。',
            initLogic: (ball) => {
                ball.isQuzhePhantom = true;
                ball.hasTriggeredDomain = false;
            },
            update: (ball, engine) => {
                ROSTER.quzhe.update(ball, engine);
            },
            onTakeDamage: (ball, amount, sourceId, engine, damageType) => {
                return ROSTER.quzhe.onTakeDamage(ball, amount, sourceId, engine, damageType);
            }
          },
          piancha: {
            id: 'piancha', faction: 'AnchorOfDestiny', name: '偏差', title: '空間 / 『移』之錨', color: '#A855F7', mass: 0.9,
            desc: '【性相】型之性相\n【被動】無邊界：碰觸牆壁時直接穿透並從地圖另一端出現，同時在兩端留下一對傳送門。\n【主動】受傷時進行全地圖隨機躍遷，並留下一對傳送門(1秒冷卻)。成對傳送門逐漸貼近並在碰觸時湮滅，任何人穿梭會造成1點傷害或治療。\n【命路遠延】生命歸零不死亡，進入倒數(秒數等於生前躍遷次數)，期間受擊轉為負載並依然能產生躍遷與傳送門。成對傳送門湮滅時，將爆發等同當前負載量的範圍傷害。倒數結束時真實死亡。',
            initLogic: (ball) => {
                ball.wallWrap = true;
                ball.blinkCooldown = 0;
                ball.wallPortalCooldown = 0;
                ball.teleportCount = 0;
                ball.isUndead = false;
                ball.deathCountdown = 0;
                ball.negativeHpDebt = 0;
                ball.scalingValue = `『移』之錨 | 躍遷: 0次`;
            },
            update: (ball, engine) => {
                if (ball.blinkCooldown > 0) ball.blinkCooldown -= DT;
                if (ball.wallPortalCooldown > 0) ball.wallPortalCooldown -= DT;


                if (ball.isUndead) {
                    ball.deathCountdown -= DT;
                    ball.scalingValue = `命路遠延: ${Math.max(0, ball.deathCountdown).toFixed(1)}s | 負載: ${Math.floor(ball.negativeHpDebt)}`;
                    
                    if (ball.deathCountdown <= 0) {
                        const explosionDmg = ball.negativeHpDebt; 
                        ball.negativeHpDebt = 0; // 消耗負載
                        let portals = engine.obstacles.filter(o => o.type === 'portal' && o.ownerId === ball.uniqueId);
                        
                        const triggerExplosion = (x, y) => {
                            engine.spawnWave({
                                x: x, y: y, startRadius: 0, maxRadius: 250, speed: 1000, color: 'rgba(168, 85, 247, 0.8)', ownerId: ball.uniqueId, lingerDuration: 0.2, deflectsProjectiles: true,
                                onHit: (t) => {
                                    if (explosionDmg > 0 && engine.isEnemy(t.uniqueId, ball.uniqueId)) {
                                        const dist = distance(x, y, t.x, t.y);
                                        const decay = Math.max(0.1, 1 - (dist / 250)); // 距離衰減：中心最高，邊緣最低(保留10%保底)
                                        engine.applyDamage(t, explosionDmg * decay, ball.uniqueId, 'magic');
                                    }
                                }
                            });
                            // 新增：極度顯眼的空間崩落特效
                            engine.spawnParticle({ type: 'collapse', x: x, y: y, maxRadius: 250, maxLifespan: 0.5 });
                            if (explosionDmg > 0) {
                                engine.spawnParticle({ type: 'text', x: x, y: y - 30, text: `💥 崩落 (${Math.floor(explosionDmg)})`, color: '#E9D5FF', maxLifespan: 1.5 });
                            }
                        };


                        // 讓所有的傳送門引爆，若場上無傳送門則自爆
                        if (portals.length > 0) {
                            portals.forEach(p => { triggerExplosion(p.x, p.y); p.lifespan = 0; });
                        } else {
                            triggerExplosion(ball.x, ball.y);
                        }
                        
                        engine.spawnParticle({ type: 'text', x: ball.x, y: ball.y - 50, text: '💀 命路終焉', color: '#A855F7', maxLifespan: 2 });
                        ball.hp = 0; // 觸發真實死亡
                    }
                } else {
                    ball.scalingValue = `『移』之錨 | 躍遷: ${ball.teleportCount}次`;
                }
            },
            onWallBounce: (ball, engine, oldX, oldY) => {
                if (oldX !== undefined && oldY !== undefined && ball.wallPortalCooldown <= 0) {
                    ball.wallPortalCooldown = 0.5; 
                    if (!ball.isUndead) ball.teleportCount++; // 只有生前計算躍遷次數
                    const pid1 = `${ball.uniqueId}_portal_${Date.now()}_1`;
                    const pid2 = `${ball.uniqueId}_portal_${Date.now()}_2`;


                    engine.spawnObstacle({ type: 'portal', portalId: pid1, targetId: pid2, x: oldX, y: oldY, radius: 25, color: '#D8B4FE', lifespan: 9999, ownerId: ball.uniqueId });
                    engine.spawnObstacle({ type: 'portal', portalId: pid2, targetId: pid1, x: ball.x, y: ball.y, radius: 25, color: '#D8B4FE', lifespan: 9999, ownerId: ball.uniqueId });
                }
            },
            onTakeDamage: (ball, amount, sourceId, engine, damageType) => {
                let actualLoss = amount;


                // 不論是否進入命路遠延，受傷都能觸發躍遷與傳送門
                if (amount > 0 && damageType !== 'portal' && ball.blinkCooldown <= 0) {
                    ball.blinkCooldown = 1.0; 
                    if (!ball.isUndead) ball.teleportCount++; // 只有生前計算躍遷次數
                    
                    let newX = ball.radius + Math.random() * (engine.arenaSize - ball.radius * 2);
                    let newY = ball.radius + Math.random() * (engine.arenaSize - ball.radius * 2);


                    const oldX = ball.x;
                    const oldY = ball.y;


                    ball.x = newX;
                    ball.y = newY;


                    const pid1 = `${ball.uniqueId}_portal_${Date.now()}_1`;
                    const pid2 = `${ball.uniqueId}_portal_${Date.now()}_2`;
                    
                    engine.spawnObstacle({ type: 'portal', portalId: pid1, targetId: pid2, x: oldX, y: oldY, radius: 25, color: '#D8B4FE', lifespan: 9999, ownerId: ball.uniqueId });
                    engine.spawnObstacle({ type: 'portal', portalId: pid2, targetId: pid1, x: newX, y: newY, radius: 25, color: '#D8B4FE', lifespan: 9999, ownerId: ball.uniqueId });
                    
                    engine.spawnParticle({ type: 'text', x: oldX, y: oldY - 30, text: '🌀 躍遷', color: '#D8B4FE', maxLifespan: 1.0 });
                }


                if (ball.isUndead) {
                    ball.negativeHpDebt += amount;
                    return 0; // 進入命路遠延後免疫常規傷害，轉為負載
                }


                if (ball.hp - actualLoss <= 0 && ball.teleportCount > 0) {
                    ball.isUndead = true;
                    ball.deathCountdown = ball.teleportCount;
                    ball.negativeHpDebt = actualLoss - ball.hp;
                    engine.spawnParticle({ type: 'text', x: ball.x, y: ball.y - 40, text: '⏳ 命路遠延', color: '#A855F7', maxLifespan: 2 });
                    return ball.hp - 0.1; // 鎖血 0.1 以防引擎判定過早死亡
                }


                return actualLoss;
            }
          },


          // ==================== 木樁模式專用目標 ====================
          dummy: {
            id: 'dummy', faction: 'Other', name: '巨大木樁', title: '測試用', color: '#8B4513', mass: 15, radiusMult: 3,
            desc: '無情靶子。無視攻擊、無技能，供測試傷害數據。',
            initLogic: (ball) => { ball.scalingValue = `木樁模式`; ball.speedMult = 0; },
            modifyDamageOut: () => 0
          }
        };


