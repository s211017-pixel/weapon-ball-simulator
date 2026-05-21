const ROSTER = {
          cacamus: { id:'cacamus', faction:'TimeAdmin', name:'卡卡繆思', title:'棋手 / 西西里防禦', color:'#E5E7EB', mass:1.0, desc:'【性相】啟之性相\n【被動】展開8x8棋盤，死亡時棋子消散。每10秒、血量減少或碰角落增兵。\n【主動】每5秒部署兵。\n【棋子】具備70血量不可鎖定，形成阻擋。',
            initLogic: b => { b.pawnsInHand=2; b.pawnGenTimer=b.pawnDeployTimer=0; b.cornerCooldowns=[0,0,0,0]; b.lastHpMilestone=b.maxHp; b.scalingValue=`手牌: 2 兵`; },
            update: (b, eng) => {
              if ((b.pawnGenTimer+=DT)>=10) { b.pawnGenTimer=0; if(b.pawnsInHand<8) { b.pawnsInHand++; sTxt(eng,b.x,b.y,'+1 兵 (時間)','#E5E7EB'); } }
              if (b.lastHpMilestone-b.hp>=b.maxHp*0.1) { b.lastHpMilestone-=b.maxHp*0.1; if(b.pawnsInHand<8){ b.pawnsInHand++; sTxt(eng,b.x,b.y,'+1 兵 (受損)','#E5E7EB'); } }
              [{x:0,y:0},{x:eng.arenaSize,y:0},{x:0,y:eng.arenaSize},{x:eng.arenaSize,y:eng.arenaSize}].forEach((c,i)=>{ if(b.cornerCooldowns[i]>0) b.cornerCooldowns[i]-=DT; else if(distance(b.x,b.y,c.x,c.y)<120){ if(b.pawnsInHand<8){b.pawnsInHand++; sTxt(eng,b.x,b.y,'+1 兵 (角落)','#E5E7EB');} b.cornerCooldowns[i]=10; } });
              if ((b.pawnDeployTimer+=DT)>=5) { b.pawnDeployTimer=0; let pOB = eng.balls.filter(x=>x.isChessPiece&&x.ownerId===b.uniqueId&&x.hp>0).length;
                while(b.pawnsInHand>0 && pOB<8) {
                  const pB = random()<0.5?'protect':'attack', nE = eng.getNearestEnemy(b), dT = pB==='protect'?b:(nE||b), cs = eng.arenaSize/8;
                  let tc=max(0,min(7,floor(dT.x/cs))), tr=max(0,min(7,floor(dT.y/cs))), isO=(c,r)=>eng.balls.some(x=>x.isChessPiece&&x.col===c&&x.row===r&&x.hp>0);
                  if(isO(tc,tr)){ let f=false; for(let rad=1;rad<8&&!f;rad++) for(let dc=-rad;dc<=rad&&!f;dc++) for(let dr=-rad;dr<=rad&&!f;dr++){ let nc=tc+dc,nr=tr+dr; if(nc>=0&&nc<=7&&nr>=0&&nr<=7&&!isO(nc,nr)){ tc=nc; tr=nr; f=true; } } }
                  let pT='pawn'; if(tr===0||tr===7){ pT=['knight','bishop','rook','queen'][floor(random()*4)]; sTxt(eng,(tc+.5)*cs,(tr+.5)*cs,'✨ 升變!','#FCD34D'); }
                  sTxt(eng,(tc+.5)*cs,(tr+.5)*cs,pB==='protect'?'🛡️ 護衛':'⚔️ 突擊','#9CA3AF',-40);
                  const p = eng.createBall(ROSTER.chess_piece,b.team,`${b.uniqueId}_p_${Date.now()}_${random()}`,false,70,(tc+.5)*cs,(tr+.5)*cs);
                  Object.assign(p, {ownerId:b.uniqueId, pieceType:pT, col:tc, row:tr, direction:nE?(nE.y>b.y?1:-1):1, behavior:pB, color:b.color}); eng.balls.push(p); b.pawnsInHand--; pOB++;
                }
              } b.scalingValue = `場上: ${eng.balls.filter(x=>x.isChessPiece&&x.ownerId===b.uniqueId&&x.hp>0).length}/8 | 手牌: ${b.pawnsInHand}/8 兵 | 產出: ${(10-b.pawnGenTimer).toFixed(1)}s`;
            }
          },
          carrie: { id:'carrie', faction:'TimeAdmin', name:'奧恩斯·凱瑞', title:'坦克 / 蓄壓反擊', color:'#4A6FA5', mass:1.8, desc:'【被動】承傷轉壓力，越高減傷越高。【主動】壓力滿(3層)放彈片。【成長】提升彈片傷害。',
            initLogic: b => { b.pressure=0; b.maxPressure=3; b.shrapnelDmg=4; b.scalingValue=`蓄壓: 0/3`; },
            onTakeDamage: (b, amt, src, eng, dType) => { const dr = min(0.5, (b.pressure/b.maxPressure)*0.5);
              if(['collision','projectile','wall_collision'].includes(dType)){ b.pressure+=b.noGrowth?0:1; b.scalingValue=`蓄壓: ${floor(b.pressure)}/3 | 彈片: ${b.shrapnelDmg.toFixed(1)}`;
                if(b.pressure>=b.maxPressure){ for(let i=0;i<9;i++) eng.spawnProjectile({x:b.x,y:b.y,vx:cos(PI*2*i/9)*500,vy:sin(PI*2*i/9)*500,radius:6,color:'#A0BBE8',ownerId:b.uniqueId,damage:b.shrapnelDmg,bounces:2,lifespan:3}); b.pressure=0; b.shrapnelDmg+=b.noGrowth?0:2; b.scalingValue=`蓄壓: 0/3 | 彈片: ${b.shrapnelDmg.toFixed(1)}`; }
              } return amt*(1-dr); }
          },
          melis: { id:'melis', faction:'TimeAdmin', name:'梅樂絲·布雷茲', title:'元素 / 範圍灼燒', color:'#FF6B35', mass:1.0, desc:'【被動】召喚火靈，附加燃燒。【主動】致死免疫，擴散火環引爆燃燒。【成長】提升燃燒秒傷。',
            initLogic: b => { b.burnDamage=1.5; b.scalingValue=`燃燒秒傷: ${b.burnDamage.toFixed(1)}`; b.spiritTimer=0; b.hasRevived=false; },
            update: (b, eng) => { if((b.spiritTimer+=DT)>=6){ b.spiritTimer=0; eng.spawnProjectile({type:'spirit',x:b.x,y:b.y,vx:(random()-.5)*150,vy:(random()-.5)*150,radius:12,color:'#FF4500',ownerId:b.uniqueId,damage:0,bounces:1,lifespan:4,isTracking:true,maxSpeed:180,onHit:(p,t)=>{ eng.applyStatus(t.uniqueId,'burn',{duration:3,dps:b.burnDamage,sourceId:b.uniqueId}); b.burnDamage+=b.noGrowth?0:0.4; b.scalingValue=`燃燒秒傷: ${b.burnDamage.toFixed(1)}`; }}); } },
            onCollide: (b, o, rel, eng) => { eng.sound('collision', { intensity: 1.15 }); eng.applyStatus(o.uniqueId,'burn',{duration:3,dps:b.burnDamage,sourceId:b.uniqueId}); b.burnDamage+=b.noGrowth?0:0.4; b.scalingValue=`燃燒秒傷: ${b.burnDamage.toFixed(1)}`; }
          },
          eli: { id:'eli', faction:'TimeAdmin', name:'伊萊·萊特', title:'機動 / 劍環聯動', color:'#E0FAFF', mass:0.9, desc:'【被動】真理劍環繞洞穿敵人。【主動】碰撞發螺旋環刃。【成長】命中增加環刃數量與傷害。\n【聯動】三菱鏡。',
            initLogic: b => { b.ringDmg=4; b.ringCountRaw=b.ringCount=1; b.ringHits=b.rapierAngle=0; b.rapierCooldowns={}; b.scalingValue=`數量: 1 | 傷害: 4.00`; b.speedMult=1.2; },
            update: (b, eng) => { b.rapierAngle-=10*DT; const r=b.radius+35, sx=b.x+cos(b.rapierAngle)*r, sy=b.y+sin(b.rapierAngle)*r; Object.keys(b.rapierCooldowns).forEach(k=>b.rapierCooldowns[k]-=DT); eng.balls.forEach(t=>{ if(t.hp>0&&eng.isEnemy(t.uniqueId,b.uniqueId)&&!t.isBlank&&distance(sx,sy,t.x,t.y)<t.radius+20&&(b.rapierCooldowns[t.uniqueId]||0)<=0){ eng.applyDamage(t,5,b.uniqueId,'collision'); b.rapierCooldowns[t.uniqueId]=0.5; if(!b.noGrowth){b.ringHits++; b.ringDmg+=0.25; b.ringCountRaw+=0.25; b.ringCount=floor(b.ringCountRaw);} b.scalingValue=`數量: ${b.ringCount} | 傷害: ${b.ringDmg.toFixed(2)}`; } }); },
            onCollide: (b, o, rel, eng) => { const n=normalize(b.vx,b.vy); for(let i=0;i<b.ringCount;i++){ const aOff=b.ringCount>1?(PI/8)*(i-(b.ringCount-1)/2):0, cT=cos(aOff), sT=sin(aOff), dX=-n.x*cT+n.y*sT, dY=-n.x*sT-n.y*cT; eng.spawnProjectile({type:'ring',x:b.x,y:b.y,vx:dX*200+(random()-.5)*50,vy:dY*200+(random()-.5)*50,radius:10,color:'#00FFFF',ownerId:b.uniqueId,damage:b.ringDmg,bounces:3,lifespan:4,customUpdate:(p,dt)=>{const c=cos(-8*dt),s=sin(-8*dt),nvx=p.vx*c-p.vy*s,nvy=p.vx*s+p.vy*c,cs=hypot(nvx,nvy),ns=cs+120*dt; p.vx=(nvx/cs)*ns; p.vy=(nvy/cs)*ns;},onHit:()=>{if(!b.noGrowth){b.ringHits++; b.ringDmg+=0.25; b.ringCountRaw+=0.25; b.ringCount=floor(b.ringCountRaw);} b.scalingValue=`數量: ${b.ringCount} | 傷害: ${b.ringDmg.toFixed(2)}`;}}); } }
          },
          abraham: { id:'abraham', faction:'TimeAdmin', name:'亞伯拉罕·慕恩', title:'支援 / 全場干預', color:'#D4AF37', mass:1.2, desc:'【被動】治癒淨化我方並觸發成長。【主動】發創世波紋排斥彈道，對敵暈眩並重置機制。\n【聯動】三菱鏡。',
            initLogic: b => { b.bellTimer=0; b.waveRadius=100; b.scalingValue=`鐘聲半徑: ${b.waveRadius}`; },
            update: (b, eng) => { if((b.bellTimer+=DT)>=5){ b.bellTimer=0; eng.spawnWave({x:b.x,y:b.y,startRadius:0,maxRadius:b.waveRadius,speed:Math.sqrt(4000*b.waveRadius),deceleration:2000,color:'#F1D302',ownerId:b.uniqueId,lingerDuration:1.5,deflectsProjectiles:true,onHit:t=>{ if(eng.isEnemy(t.uniqueId,b.uniqueId)){ eng.applyDamage(t,8,b.uniqueId,'magic'); const n=normalize(t.x-b.x,t.y-b.y); eng.applyStatus(t.uniqueId,'bell_shock',{duration:0.5,dx:n.x,dy:n.y}); eng.applyStatus(t.uniqueId,'stun',{duration:1.5}); const eId=t.copied||t.id; if(eId==='cacamus'){t.pawnsInHand=0;} else if(eId==='carrie'){t.pressure=0;t.shrapnelDmg=4;} else if(eId==='melis'){t.burnDamage=1.5;} else if(eId==='eli'){t.ringDmg=4;t.ringCountRaw=t.ringCount=1;} else if(eId==='gordon'){t.tokens=0;t.daggerCount=1;} else if(eId==='thoth'){t.massStacks=0;t.mass=1.8;} else if(eId==='cetus'){t.convictDmg=10;} else if(eId==='ino'){t.bounces=0;} else if(eId==='kate'){t.wallDamage=5;} else if(eId==='olynx'){t.materials=t.bonusLifespan=t.generateCount=0;} else if(eId==='miller'){t.doomHeal={};} else if(eId==='hao'){t.totalDistance=0;t.currentPaint='blue';t.redPhase=false;} else if(eId==='fasimir'){t.stacks=0;t.ultimate=false;} else if(eId==='grimm'){t.collectedCores=0;t.isGathering=t.isSlashing=false;} b.waveRadius+=10*(b.noGrowth?0:1); b.scalingValue=`鐘聲半徑: ${floor(b.waveRadius)}`; } else { eng.applyHeal(t,10, b); sTxt(eng,t.x,t.y-20,'✨ 淨化','#F1D302'); if(t.statuses) t.statuses=t.statuses.filter(s=>!['burn','stun','slow','rooted','silenced','warning','bell_shock'].includes(s.type)); if(t.uniqueId!==b.uniqueId){ const eId=t.copied||t.id; if(eId==='cacamus'&&t.pawnsInHand<8) t.pawnsInHand+=t.noGrowth?0:1; else if(eId==='carrie'){t.shrapnelDmg+=t.noGrowth?0:2; for(let i=0;i<9;i++) eng.spawnProjectile({x:t.x,y:t.y,vx:cos(PI*2*i/9)*500,vy:sin(PI*2*i/9)*500,radius:6,color:'#A0BBE8',ownerId:t.uniqueId,damage:t.shrapnelDmg,bounces:2,lifespan:3});} else if(eId==='melis'){t.burnDamage+=0.4*(t.noGrowth?0:1);t.spiritTimer=99;} else if(eId==='eli'){if(!t.noGrowth){t.ringHits+=3;t.ringDmg+=0.75;t.ringCountRaw+=0.75;t.ringCount=floor(t.ringCountRaw);} ROSTER.eli.onCollide(t,t,0,eng);} else if(eId==='gordon'){t.tokens+=t.noGrowth?0:1;t.daggerCount=1+floor(t.tokens/2);t.daggerTimer=99;} else if(eId==='thoth'){if(!t.noGrowth){t.massStacks++;t.mass+=0.4;}t.beamTimer=99;} else if(eId==='cetus'){t.convictDmg+=2*(t.noGrowth?0:1);t.pageTimer=99;} else if(eId==='ino'){t.bounces+=t.noGrowth?0:1;t.birdTimer=99;} else if(eId==='kate'){t.wallDamage+=1.25*(t.noGrowth?0:1);} else if(eId==='olynx'){t.materials=3;t.generateCount+=t.noGrowth?0:1;if(ROSTER.olynx.onWallBounce) ROSTER.olynx.onWallBounce(t,eng);} else if(eId==='miller'){t.sacramentTimer=t.sproutTimer=t.knightTimer=t.steedTimer=99;} else if(eId==='isaac') t.wordTimer=99; else if(eId==='anonymous') t.skillTimer=99; else if(eId==='ocalis') t.proofreadTimer=99; else if(eId==='kongmie') t.actTimer+=5; else if(eId==='hao') t.totalDistance+=3000; else if(eId==='fasimir') t.stacks+=t.noGrowth?0:1; else if(eId==='grimm'&&!t.noGrowth){t.collectedCores++;} } } }}); } }
          },
          gordon: { id:'gordon', faction:'TimeAdmin', name:'戈登', title:'賭博 / 隨機強化', color:'#F9DC5C', mass:1.0, desc:'【被動】擲匕首或碰撞觸發賭局。勝3.5倍傷，負減半。【成長】增匕首數。',
            initLogic: b => { b.tokens=0; b.daggerCount=1; b.scalingValue=`籌碼: 0`; b.daggerTimer=0; },
            gamble: (b, dmg, eng, x, y) => { let f=dmg; if(random()<0.6){ if(random()<0.55){ sTxt(eng,x,y,'💰 3.5x!','#F9DC5C'); f*=3.5; b.tokens+=b.noGrowth?0:1; b.daggerCount=1+floor(b.tokens/2); b.scalingValue=`籌碼: ${floor(b.tokens)} (匕首: ${b.daggerCount})`; } else { sTxt(eng,x,y,'📉 0.5x','#888'); f*=0.5; } } return f; },
            update: (b, eng) => { if((b.daggerTimer+=DT)>=3){ b.daggerTimer=0; const t=eng.getNearestEnemy(b), n=t?normalize(t.x-b.x,t.y-b.y):normalize(b.vx,b.vy), a=atan2(n.y,n.x), sA=b.daggerCount>1?a-PI/6:a, st=b.daggerCount>1?(PI/3)/(b.daggerCount-1):0; for(let i=0;i<b.daggerCount;i++){ eng.spawnProjectile({type:'dagger',x:b.x,y:b.y,vx:cos(sA+i*st)*500,vy:sin(sA+i*st)*500,radius:6,color:'#FFD700',ownerId:b.uniqueId,damage:0,bounces:1,lifespan:3,onHit:(p,tg,e)=>e.applyDamage(tg,ROSTER.gordon.gamble(b,6,e,tg.x,tg.y),b.uniqueId,'magic')}); } } },
            modifyDamageOut: (b, dmg, eng) => ROSTER.gordon.gamble(b, dmg, eng, b.x, b.y)
          },
          thoth: { id:'thoth', faction:'TimeAdmin', name:'托特·歐珀', title:'重擊 / 質量積累', color:'#5B5F66', mass:1.8, radiusMult:1.2, desc:'【被動】碰撞加質量擊退。【主動】預瞄發射光束。【成長】3層質量傷+1。',
            initLogic: b => { b.massStacks=0; b.scalingValue=`質量: 0`; b.beamTimer=0; b.isAiming=false; b.aimTimer=0; }, modifyDamageOut: (b, d) => d+floor(b.massStacks/3),
            onCollide: (b, o, rel, eng) => { eng.applyStatus(o.uniqueId,'knockback',{duration:1.5,sourceId:b.uniqueId}); if(!b.noGrowth){b.massStacks++; b.mass+=0.4;} b.scalingValue=`質量: ${floor(b.massStacks)}`; },
            update: (b, eng) => { if(b.isAiming){ if((b.aimTimer-=DT)>0.1){ const t=eng.getNearestEnemy(b); if(t) b.aimDir=normalize(t.x-b.x,t.y-b.y); } if(b.aimTimer<=0){ b.isAiming=false; const ex=b.x+b.aimDir.x*eng.arenaSize*2, ey=b.y+b.aimDir.y*eng.arenaSize*2; eng.balls.forEach(t=>{ if(t.hp>0&&eng.isEnemy(t.uniqueId,b.uniqueId)&&!t.isBlank){ if(abs(b.aimDir.y*t.x-b.aimDir.x*t.y+b.aimDir.x*b.y-b.aimDir.y*b.x)<t.radius+15 && (t.x-b.x)*b.aimDir.x+(t.y-b.y)*b.aimDir.y>0){ eng.applyDamage(t,5+floor(b.massStacks/3),b.uniqueId,'magic'); eng.applyStatus(t.uniqueId,'knockback',{duration:1.5,sourceId:b.uniqueId}); t.vx+=b.aimDir.x*(600+b.massStacks*25); t.vy+=b.aimDir.y*(600+b.massStacks*25); if(!b.noGrowth){b.massStacks++;b.mass+=0.4;} b.scalingValue=`質量: ${floor(b.massStacks)}`; } } }); eng.spawnParticle({type:'laser',x:b.x,y:b.y,tx:ex,ty:ey,color:'#A9A9A9',maxLifespan:0.2}); } } else if((b.beamTimer+=DT)>=5.5){ b.beamTimer=0; const t=eng.getNearestEnemy(b); if(t){b.isAiming=true; b.aimTimer=0.5; b.aimDir=normalize(t.x-b.x,t.y-b.y);} } }
          },
          cetus: { id:'cetus', faction:'TimeAdmin', name:'塞特斯', title:'控制 / 規則懲戒', color:'#8A2BE2', mass:1.1, desc:'【被動】免疫警告目標傷害，飛撞引爆定罪。【主動】發射法令附加警告。',
            initLogic: b => { b.pageTimer=0; b.convictDmg=10; b.scalingValue=`定罪: ${b.convictDmg}`; }, onTakeDamage: (b, amt, src, eng) => { const s=eng.balls.find(x=>x.uniqueId===src); return (s&&s.statuses.some(x=>x.type==='warning'))?0:amt; },
            update: (b, eng) => { const wE=eng.balls.find(x=>eng.isEnemy(x.uniqueId,b.uniqueId)&&!x.isBlank&&x.statuses.some(s=>s.type==='warning')); if(wE&&distance(b.x,b.y,wE.x,wE.y)<350){ const n=normalize(wE.x-b.x,wE.y-b.y); b.vx+=n.x*1200*DT; b.vy+=n.y*1200*DT; } if((b.pageTimer+=DT)>=4){ b.pageTimer=0; const t=eng.getNearestEnemy(b), n=t?normalize(t.x-b.x,t.y-b.y):normalize(b.vx,b.vy); eng.spawnProjectile({type:'page',x:b.x,y:b.y,vx:n.x*400,vy:n.y*400,radius:12,color:'#DDA0DD',ownerId:b.uniqueId,damage:0,bounces:1,lifespan:3,isPageTracking:true,onHit:(p,tg,e)=>{e.applyStatus(tg.uniqueId,'warning',{duration:3}); const o=e.balls.find(x=>x.uniqueId===p.ownerId); if(o){o.vx+=(random()-.5)*200;o.vy+=(random()-.5)*200;}}}); } },
            onCollide: (b, o, rel, eng) => { if(o.statuses?.some(s=>s.type==='warning')){ eng.applyDamage(o,b.convictDmg,b.uniqueId,'magic'); eng.applyStatus(o.uniqueId,'knockback',{duration:1.5,sourceId:b.uniqueId}); b.convictDmg+=2*(b.noGrowth?0:1); b.scalingValue=`定罪: ${floor(b.convictDmg)}`; o.statuses=o.statuses.filter(s=>s.type!=='warning'); const n=normalize(o.x-b.x,o.y-b.y); o.vx+=n.x*600; o.vy+=n.y*600; } }
          },
          ino: { id:'ino', faction:'TimeAdmin', name:'銀諾·諾克薩斯', title:'遠程 / 穿透彈射', color:'#00B4D8', mass:0.9, desc:'【被動】鳥穿透敵人。【主動】發射鳥物理傷害。【成長】增加彈射次數。',
            initLogic: b => { b.birdTimer=0; b.bounces=0; b.scalingValue=`彈射: 0`; }, onCollide: (b) => { b.bounces+=1*(b.noGrowth?0:1); b.scalingValue=`彈射: ${floor(b.bounces)}`; },
            update: (b, eng) => { if((b.birdTimer+=DT)>=1){ b.birdTimer=0; const t=eng.getNearestEnemy(b), n=t?normalize(t.x-b.x,t.y-b.y):normalize(b.vx,b.vy), a=atan2(n.y,n.x)+(random()-.5)*0.2; eng.spawnProjectile({type:'bird',x:b.x,y:b.y,vx:cos(a)*500,vy:sin(a)*500,radius:6,color:'#90E0EF',ownerId:b.uniqueId,damage:4,bounces:floor(b.bounces),lifespan:5+floor(b.bounces)*0.5,penetrating:true,onHit:()=>{b.bounces+=b.noGrowth?0:1; b.scalingValue=`彈射: ${floor(b.bounces)}`;}}); } }
          },
          kate: { id:'kate', faction:'TimeAdmin', name:'奧恩斯·凱特', title:'工事 / 能量牽引', color:'#D95D39', mass:1.1, desc:'【被動】雷射牆切割敵人。【主動】觸壁結牆(最多3道)。',
            initLogic: b => { b.walls=[]; b.currentAnchor=null; b.wallDamage=5; b.wallHitsTimer=0; b.scalingValue=`牆傷: ${b.wallDamage.toFixed(1)} (0/3)`; },
            onWallBounce: (b, eng) => { if(b.walls.length>=3)return; let ox=max(45,min(eng.arenaSize-45,b.x)), oy=max(45,min(eng.arenaSize-45,b.y)); if(!b.currentAnchor) b.currentAnchor={x:ox,y:oy}; else{ b.walls.push({p1:b.currentAnchor,p2:{x:ox,y:oy}}); b.currentAnchor=null; } b.scalingValue=`牆傷: ${b.wallDamage.toFixed(1)} (${b.walls.length}/3)`; },
            update: (b, eng) => { const cHit=(p1,p2)=>eng.balls.forEach(o=>{ if(o.hp>0&&eng.isEnemy(o.uniqueId,b.uniqueId)&&!o.isBlank){ const l2=(p2.x-p1.x)**2+(p2.y-p1.y)**2; if(l2===0)return; const t=max(0,min(1, ((o.x-p1.x)*(p2.x-p1.x)+(o.y-p1.y)*(p2.y-p1.y))/l2)), px=p1.x+t*(p2.x-p1.x), py=p1.y+t*(p2.y-p1.y); if(distance(o.x,o.y,px,py)<o.radius+8){ eng.applyDamage(o,b.wallDamage*DT,b.uniqueId,'laser'); if((b.wallHitsTimer+=DT)>=1){b.wallDamage+=1.25*(b.noGrowth?0:1); b.wallHitsTimer-=1; b.scalingValue=`牆傷: ${b.wallDamage.toFixed(1)} (${b.walls.length}/3)`;} } } }); if(b.currentAnchor) cHit(b.currentAnchor,b); b.walls.forEach(w=>cHit(w.p1,w.p2)); }
          },
          isaac: { id:'isaac', faction:'TimeAdmin', name:'以撒·薩恩', title:'法術 / 條件爆發', color:'#E2E8F0', mass:1.0, desc:'【被動】8秒發律令乘算效果。【主動】血小於35%湧出大量物理殘影。\n【聯動】三菱鏡。',
            initLogic: b => { b.wordTimer=8; b.shadowsActive=false; b.isSpawningShadows=false; b.shadowSpawnTimer=0; const w=['神聖打擊','強制驅逐','生命虹吸','絕對封印','恩典再生'], r=random(); b.nextWord=w[floor(random()*w.length)]; b.nextMult=r<0.3?1:(r<0.8?2:(r<0.95?5:10)); b.scalingValue=`下發: ${b.nextWord} x${b.nextMult}`; },
            update: (b, eng) => { b.scalingValue=`下發: ${b.nextWord} x${b.nextMult} (${max(0,8-(b.wordTimer+=DT)).toFixed(1)}s)`; if(b.wordTimer>=8){ b.wordTimer=0; const w=b.nextWord, m=b.nextMult, t=eng.getNearestEnemy(b), n=t?normalize(t.x-b.x,t.y-b.y):normalize(b.vx,b.vy); const nw=['神聖打擊','強制驅逐','生命虹吸','絕對封印','恩典再生'], r=random(); b.nextWord=nw[floor(random()*nw.length)]; b.nextMult=r<0.3?1:(r<0.8?2:(r<0.95?5:10)); eng.spawnProjectile({type:'word',text:w,mult:m,x:b.x,y:b.y,vx:n.x*400,vy:n.y*400,radius:20,color:'#FFF',ownerId:b.uniqueId,damage:5*m,bounces:1,lifespan:4,isTracking:true,maxSpeed:450,onHit:(p,tg,e)=>{const o=e.balls.find(x=>x.uniqueId===p.ownerId), mm=p.mult||1; if(p.text==='神聖打擊'){e.applyDamage(tg,15*mm,p.ownerId,'magic');sTxt(e,tg.x,tg.y,`💥 打擊! x${mm}`,'#FFF');}else if(p.text==='強制驅逐'){const nn=normalize(tg.x-p.x,tg.y-p.y);tg.vx+=nn.x*1200*mm;tg.vy+=nn.y*1200*mm;e.applyStatus(tg.uniqueId,'knockback',{duration:1.5*mm,sourceId:p.ownerId});sTxt(e,tg.x,tg.y,`💨 驅逐! x${mm}`,'#FFF');}else if(p.text==='生命虹吸'){if(o)e.applyHeal(o,40*(o.isCreator?2:1)*mm, p.ownerId);sTxt(e,o?o.x:tg.x,o?o.y:tg.y,`🧛 虹吸! x${mm}`,'#DC143C');}else if(p.text==='絕對封印'){e.applyStatus(tg.uniqueId,'silenced',{duration:5*mm});sTxt(e,tg.x,tg.y,`🔒 封印! x${mm}`,'#9333EA');}else if(p.text==='恩典再生'){if(o){e.applyStatus(o.uniqueId,'regen',{duration:5*mm});sTxt(e,o.x,o.y,`✨ 再生! x${mm}`,'#34D399');}}}}); }
              if(b.hp>0&&b.hp<b.maxHp*0.35&&!b.shadowsActive){ b.shadowsActive=b.isSpawningShadows=true; b.shadowSpawnTimer=0; }
              if(b.isSpawningShadows){ const pg=(b.shadowSpawnTimer+=DT)/1.0, c=floor(random()*2)+1+floor(Math.pow(pg,3)*20); for(let i=0;i<c;i++){ const a=random()*PI*2; eng.spawnProjectile({type:'shadow',x:b.x,y:b.y,vx:cos(a)*(300+random()*200),vy:sin(a)*(300+random()*200),radius:12,color:'#4A5568',ownerId:b.uniqueId,damage:0,bounces:5,lifespan:3+random()*2,penetrating:true,customUpdate:(p,dt,e)=>{if(!p.physCooldowns)p.physCooldowns={};Object.keys(p.physCooldowns).forEach(k=>p.physCooldowns[k]-=dt);e.balls.forEach(t=>{if(t.hp>0&&!t.isBlank&&e.isEnemy(t.uniqueId,p.ownerId)&&(p.physCooldowns[t.uniqueId]||0)<=0){const dx=p.x-t.x,dy=p.y-t.y,d=hypot(dx,dy);if(d<p.radius+t.radius){const nx=dx/d,ny=dy/d,dot=p.vx*nx+p.vy*ny;if(dot<0){p.vx-=2*dot*nx;p.vy-=2*dot*ny;}t.vx-=nx*150;t.vy-=ny*150;e.applyDamage(t,1,p.ownerId,'projectile');p.physCooldowns[t.uniqueId]=0.2;}}});}}); } if(b.shadowSpawnTimer>=1) b.isSpawningShadows=false; }
            }
          },
          olynx: { id:'olynx', faction:'TimeAdmin', name:'奧林克斯', title:'煉金 / 原料轉化', color:'#A0522D', mass:1.1, desc:'【被動】碰牆滿3層隨機發射武器。【成長】累積發射增道具時間。',
            initLogic: b => { b.materials=b.generateCount=b.bonusLifespan=0; b.scalingValue=`原料: 0/3 (+0s)`; },
            onWallBounce: (b, eng) => { if(b.materials<3) b.materials+=b.noGrowth?0:1; b.scalingValue=`原料: ${floor(b.materials)}/3 (+${b.bonusLifespan}s)`; if(b.materials>=3){ b.materials=0; b.generateCount+=b.noGrowth?0:1; b.bonusLifespan=floor(b.generateCount/2); b.scalingValue=`原料: 0/3 (+${b.bonusLifespan}s)`; const w=['iron','energy','bomb'][floor(random()*3)], t=eng.getNearestEnemy(b), n=t?normalize(t.x-b.x,t.y-b.y):normalize(b.vx,b.vy);
              if(w==='iron') eng.spawnProjectile({type:'cone',x:b.x,y:b.y,vx:n.x*600,vy:n.y*600,radius:12,color:'#A9A9A9',ownerId:b.uniqueId,damage:8,bounces:99,lifespan:4+b.bonusLifespan,penetrating:true,pierceTimer:0,customUpdate:(p,dt,e)=>{if(p.pierceTimer>0){if((p.pierceTimer-=dt)<=0&&p.hitSet)p.hitSet.clear();}else{let tg=null,md=Infinity;e.balls.forEach(ob=>{if(ob.hp>0&&!ob.isBlank&&e.isEnemy(ob.uniqueId,p.ownerId)&&(!p.hitSet||!p.hitSet.has(ob.uniqueId))){const d=distance(p.x,p.y,ob.x,ob.y);if(d<md){md=d;tg=ob;}}});if(tg){const tn=normalize(tg.x-p.x,tg.y-p.y);p.vx+=tn.x*40;p.vy+=tn.y*40;const s=hypot(p.vx,p.vy);if(s>700){p.vx=(p.vx/s)*700;p.vy=(p.vy/s)*700;}}}},onHit:p=>p.pierceTimer=0.5});
              else if(w==='energy') eng.spawnProjectile({type:'energy_domain',x:b.x,y:b.y,vx:n.x*200,vy:n.y*200,radius:100,color:'rgba(0,250,154,0.16)',ownerId:b.uniqueId,damage:0,bounces:5,lifespan:5+b.bonusLifespan,penetrating:true,customUpdate:(p,dt,e)=>{if(!p.hitCooldowns)p.hitCooldowns={};Object.keys(p.hitCooldowns).forEach(k=>p.hitCooldowns[k]-=dt);e.balls.forEach(tg=>{if(tg.hp>0&&!tg.isBlank&&e.isEnemy(tg.uniqueId,p.ownerId)&&distance(p.x,p.y,tg.x,tg.y)<p.radius+tg.radius){e.applyStatus(tg.uniqueId,'slow',{duration:0.5});const pn=normalize(p.x-tg.x,p.y-tg.y);tg.vx+=pn.x*250*dt;tg.vy+=pn.y*250*dt;if((p.hitCooldowns[tg.uniqueId]||0)<=0){e.applyDamage(tg,1,p.ownerId,'magic');e.spawnParticle({type:'laser',x:p.x,y:p.y,tx:tg.x,ty:tg.y,color:'#00FA9A',maxLifespan:0.1});p.hitCooldowns[tg.uniqueId]=0.2;}}});}});
              else eng.spawnProjectile({type:'bomb',x:b.x,y:b.y,vx:n.x*400,vy:n.y*400,radius:14,color:'#DC143C',ownerId:b.uniqueId,damage:0,bounces:3,lifespan:2.5,onDeath:(p,e)=>e.spawnObstacle({type:'damage_field',x:p.x,y:p.y,radius:120,color:'rgba(220,20,60,0.2)',ownerId:b.uniqueId,team:b.team,lifespan:4+b.bonusLifespan})});
            } }
          },
          topiharin: { id:'topiharin', faction:'DivineCathedral', name:'托匹哈鈴', title:'音律 / 階段演進', color:'#FF1493', mass:1.0, desc:'【被動】每15秒切換樂章。【主動】敵方進入特定範圍受懲戒。\n【聯動】三菱鏡。',
            initLogic: b => { b.musicTimer=b.orbitAngle=0; b.currentPhase=1; b.quartetInRange=new Set(); },
            update: (b, eng) => { const hS=b.statuses.some(s=>s.type==='synesthesia'); b.musicTimer=(b.musicTimer+DT)%60;
              if(hS) { b.currentPhase=4; b.scalingValue=`聽，那便是普世音律！ (聯覺)`; } else {
                if(b.musicTimer<15){ b.currentPhase=1; b.scalingValue=`獨奏 (${(15-b.musicTimer).toFixed(1)}s) | 減反傷 10%`; }
                else if(b.musicTimer<30){ b.currentPhase=2; b.scalingValue=`弦樂四重奏 (${(30-b.musicTimer).toFixed(1)}s) | 警戒射線`; b.orbitAngle+=2*DT; if(!b.quartetInRange)b.quartetInRange=new Set(); const inR=new Set(); eng.balls.forEach(t=>{ if(t.hp>0&&eng.isEnemy(t.uniqueId,b.uniqueId)&&!t.isBlank&&distance(b.x,b.y,t.x,t.y)<=250){ inR.add(t.uniqueId); if(!b.quartetInRange.has(t.uniqueId)){ ['slow','damage','knockback'].sort(()=>0.5-random()).slice(0,2).forEach(ef=>{ eng.spawnParticle({type:'laser',x:b.x,y:b.y,tx:t.x,ty:t.y,color:'#FF1493',maxLifespan:0.3}); if(ef==='damage')eng.applyDamage(t,15,b.uniqueId,'magic'); else if(ef==='slow')eng.applyStatus(t.uniqueId,'slow',{duration:3}); else{ const n=normalize(t.x-b.x,t.y-b.y); t.vx+=n.x*600; t.vy+=n.y*600; eng.applyStatus(t.uniqueId,'knockback',{duration:1.5,sourceId:b.uniqueId}); } }); } } }); b.quartetInRange=inR; }
                else if(b.musicTimer<45){ b.currentPhase=3; b.scalingValue=`二重奏 (${(45-b.musicTimer).toFixed(1)}s) | 輕快＆音符`; } else { b.currentPhase=4; b.scalingValue=`普世音律！ (${(60-b.musicTimer).toFixed(1)}s)`; }
              } b.radius=BALL_RADIUS*(b.currentPhase===3?0.6:1)*(b.radiusMult||1); b.speedMult=b.currentPhase===3?1.5:1.0; },
            onTakeDamage: (b, amt, src, eng, dType) => { let a=amt; if(b.currentPhase===1){ a*=0.9; if(src&&dType!=='reflect'){const s=eng.balls.find(x=>x.uniqueId===src); if(s&&eng.isEnemy(b.uniqueId,src)) eng.applyDamage(s,amt*0.1,b.uniqueId,'reflect');} } else if(b.currentPhase===4) a*=0.5; return a; },
            onWallBounce: (b, eng) => { if(b.currentPhase===3) eng.spawnProjectile({type:'note',x:b.x,y:b.y,vx:(random()-.5)*250,vy:(random()-.5)*250,radius:7,color:'#FFB6C1',ownerId:b.uniqueId,damage:6,bounces:1,lifespan:4,isTracking:true,trackingRange:300,maxSpeed:250}); }
          },
          miller: { id:'miller', faction:'DivineCathedral', name:'米勒', title:'情感 / 慟哭閱讀', color:'#FBBF24', mass:1.0, desc:'【被動】依血量發動四書：聖餐/降雨/召喚騎士。\n【主動】<25%依百分比持續治癒敵方，過量即死。\n【聯動】三菱鏡。',
            initLogic: b => { b.sacramentTimer=b.sproutTimer=b.steedTimer=b.knightTimer=0; b.doomHeal={}; b.scalingValue=`未開始閱讀`; },
            update: (b, eng) => { const hS=b.statuses.some(s=>s.type==='synesthesia'), hP=b.hp/b.maxHp;
              if(hS||hP<0.25){ b.scalingValue=hS?`卷四：顫動著、哭泣著、庇佑著 (聯覺)`:`卷四：顫動著、哭泣著、庇佑著`; eng.balls.forEach(t=>{ if(t.hp>0&&eng.isEnemy(t.uniqueId,b.uniqueId)&&!t.isBlank){ const h=t.maxHp*0.1*DT; eng.applyHeal(t,h, b.uniqueId); b.doomHeal[t.uniqueId]=(b.doomHeal[t.uniqueId]||0)+h; if(random()<0.1) eng.spawnParticle({type:'laser',x:b.x,y:b.y,tx:t.x,ty:t.y,color:'#FCD34D',maxLifespan:0.1}); if(b.doomHeal[t.uniqueId]>=t.hp){ eng.applyDamage(t,9999,b.uniqueId,'magic'); sTxt(eng,t.x,t.y,'✝️ 救贖','#FBBF24'); } } }); }
              else if(hP>=0.75){ b.scalingValue=`卷一：執柄司書的戒律`; if((b.sacramentTimer+=DT)>=10){ b.sacramentTimer=0; eng.spawnObstacle({type:'sacrament',x:50+random()*(eng.arenaSize-100),y:50+random()*(eng.arenaSize-100),radius:12,color:'#FBBF24',lifespan:8,ownerId:b.uniqueId}); } }
              else if(hP>=0.50){ b.scalingValue=`卷二：春意盎然·萌芽的時節`; eng.projectiles.forEach(p=>{if(eng.isEnemy(p.ownerId,b.uniqueId)&&!p.wetAffected&&p.type!=='sacrament'&&p.type!=='sprout'){if(random()<0.5){const aS=(random()-.5)*PI/1.5,s=hypot(p.vx,p.vy),cA=atan2(p.vy,p.vx); p.vx=cos(cA+aS)*s; p.vy=sin(cA+aS)*s;} p.wetAffected=true;}}); if((b.sproutTimer+=DT)>=1.0){ b.sproutTimer=0; eng.spawnProjectile({type:'sprout',x:50+random()*(eng.arenaSize-100),y:50+random()*(eng.arenaSize-100),vx:0,vy:0,radius:14,color:'#4ADE80',lifespan:8,ownerId:b.uniqueId,damage:2,bounces:0,isTracking:true,maxSpeed:90,trackingRange:9999,onHit:(p,t,e)=>{e.applyStatus(t.uniqueId,'rooted',{duration:2}); sTxt(e,t.x,t.y-20,'🌿 禁錮','#4ADE80');}}); } }
              else if(hP>=0.25){ b.scalingValue=`卷三：騎士與駿馬`; if((b.knightTimer+=DT)>=5){ b.knightTimer=0; const t=eng.getNearestEnemy(b); if(t){ const n=normalize(t.x-b.x,t.y-b.y); eng.spawnProjectile({type:'knight',x:b.x,y:b.y,vx:n.x*1200,vy:n.y*1200,radius:14,color:'#CBD5E1',ownerId:b.uniqueId,damage:15,bounces:99,lifespan:8,penetrating:true,state:'charging',chargeTimer:0.4,customUpdate:(p,dt,e)=>{if(p.state==='charging'){if((p.chargeTimer-=dt)<=0)p.state='returning';}else{const o=e.balls.find(x=>x.uniqueId===p.ownerId);if(o){const rn=normalize(o.x-p.x,o.y-p.y);p.vx=rn.x*1600;p.vy=rn.y*1600;if(distance(p.x,p.y,o.x,o.y)<p.radius+o.radius){e.applyStatus(o.uniqueId,'shield',{duration:5}); sTxt(e,o.x,o.y-20,'🛡️ 護盾','#CBD5E1'); p.lifespan=0;}}else p.lifespan=0;}},onHit:p=>{if(p.state==='charging')p.state='returning';}}); } } if((b.steedTimer+=DT)>=4){ b.steedTimer=0; const t=eng.getNearestEnemy(b); if(t){ const n=normalize(t.x-b.x,t.y-b.y); eng.spawnProjectile({type:'steed',x:b.x,y:b.y,vx:n.x*600,vy:n.y*600,radius:18,color:'#F8FAFC',ownerId:b.uniqueId,damage:15,bounces:1,lifespan:2}); } } }
            }
          },
          kongmie: { id:'kongmie', faction:'DivineCathedral', name:'孔滅', title:'劇作家 / 三幕悲喜劇', color:'#8B5CF6', mass:1.0, desc:'【被動】死亡滿血復活進分支A，存活進分支B。【終幕】免疫彈道附帶聯覺。\n【聯動】三菱鏡。',
            initLogic: b => { b.act=1; b.path=null; b.actTimer=0; b.act3Threshold=60; b.checkedSynergy=false; b.scalingValue=`準備揭幕...`; }, onTakeDamage: (b, a, s, e, dt) => (b.act===3&&dt==='projectile')?0:a,
            update: (b, eng) => { if(!b.checkedSynergy){ b.act3Threshold=max(40,60-eng.balls.filter(x=>x.team===b.team&&x.uniqueId!==b.uniqueId&&ROSTER[x.copied||x.id]?.faction==='DivineCathedral').length*10); b.checkedSynergy=true; } if(b.act!==3&&(b.actTimer+=DT)>=b.act3Threshold){ b.act=3; sTxt(eng,b.x,b.y-40,'第三幕·過去的過去，未到的來到','#8B5CF6'); }
              if(b.act===1){ if(b.actTimer>=30){ b.act=2; b.path='B'; sTxt(eng,b.x,b.y-40,'第二幕·於是我心昂首抬頭','#FCD34D'); } else b.scalingValue=`一幕: 兇殺案 (${(30-b.actTimer).toFixed(1)}s)`; }
              else if(b.act===2){ if(b.path==='A'){ b.scalingValue=`二幕: 狂風驟雨 (距終幕: ${(b.act3Threshold-b.actTimer).toFixed(1)}s)`; if((b.waveTimer=(b.waveTimer||0)+DT)>=4){ b.waveTimer=0; eng.spawnWave({x:eng.arenaSize/2,y:eng.arenaSize/2,startRadius:0,maxRadius:800,speed:400,color:'rgba(59,130,246,0.4)',ownerId:b.uniqueId,lingerDuration:0.1,deflectsProjectiles:true,onHit:t=>{if(eng.isEnemy(t.uniqueId,b.uniqueId)){eng.applyDamage(t,15,b.uniqueId,'magic');eng.applyStatus(t.uniqueId,'slow',{duration:2});const n=normalize(t.x-eng.arenaSize/2,t.y-eng.arenaSize/2);t.vx+=n.x*500;t.vy+=n.y*500;}}}); } } else { b.scalingValue=`二幕: 昂首抬頭 (距終幕: ${(b.act3Threshold-b.actTimer).toFixed(1)}s)`; b.speedMult=2.0; eng.balls.forEach(t=>{if(t.team===b.team&&t.hp>0){eng.applyStatus(t.uniqueId,'excited',{duration:1.5}); if(t.uniqueId!==b.uniqueId) eng.applyStatus(t.uniqueId,'haste_double',{duration:1.5});}}); } }
              else if(b.act===3){ b.scalingValue=`第三幕: 過去未到 (終幕) | 衍生物免疫`; eng.balls.forEach(t=>{if(t.team===b.team&&t.hp>0&&ROSTER[t.copied||t.id]?.faction==='DivineCathedral') eng.applyStatus(t.uniqueId,'synesthesia',{duration:1.5});}); }
            }
          },
          hao: { id:'hao', faction:'DivineCathedral', name:'昊', title:'畫家 / 潑墨天地', color:'#60A5FA', mass:1.0, desc:'【被動】行走改變顏料藍->黃->綠。【終幕】紅相巨型化、3倍速衝撞染紅全場。\n【聯動】三菱鏡。',
            initLogic: b => { b.totalDistance=0; b.currentPaint='blue'; b.redPhase=false; b.lastPaintPos=null; b.scalingValue=`藍墨 | 距離: 0`; }, modifyDamageOut: (b, d) => b.redPhase?d*5:d, onCollide: (b, o) => { if(b.redPhase){ const n=normalize(o.x-b.x,o.y-b.y); o.vx+=n.x*500; o.vy+=n.y*500; } },
            update: (b, eng) => { if(b.lastPos) b.totalDistance += distance(b.x,b.y,b.lastPos.x,b.lastPos.y)*(b.statuses.some(s=>s.type==='synesthesia')?50:1)*(b.isCreator?1.5:1); b.lastPos={x:b.x,y:b.y}; if(!b.redPhase){ if(b.currentPaint==='blue'&&b.totalDistance>=6000){ b.currentPaint='yellow'; sTxt(eng,b.x,b.y-40,'黃墨：堅壁與易傷','#FCD34D'); } else if(b.currentPaint==='yellow'&&b.totalDistance>=12000){ b.currentPaint='green'; sTxt(eng,b.x,b.y-40,'綠墨：復甦與迷向','#4ADE80'); } else if(b.currentPaint==='green'&&b.totalDistance>=30000){ b.currentPaint='red'; b.redPhase=true; b.radius=BALL_RADIUS*(b.radiusMult||1)*1.5; b.mass=ROSTER[b.copied||b.id].mass*2; b.speedMult=3.0; sTxt(eng,b.x,b.y-40,'紅墨：全場傾瀉！','#EF4444'); } } if(b.redPhase) b.scalingValue=`紅墨 | 全場傾瀉`; else { b.scalingValue=`${{'blue':'藍','yellow':'黃','green':'綠'}[b.currentPaint]}墨 | 距: ${floor(b.totalDistance)}`; if(!b.lastPaintPos||distance(b.x,b.y,b.lastPaintPos.x,b.lastPaintPos.y)>30){ eng.spawnObstacle({type:'paint_puddle',x:b.x,y:b.y,radius:30,color:{'blue':'rgba(59,130,246,0.4)','yellow':'rgba(252,211,77,0.4)','green':'rgba(74,222,128,0.4)'}[b.currentPaint],paintType:b.currentPaint,ownerId:b.uniqueId,lifespan:10}); b.lastPaintPos={x:b.x,y:b.y}; } } }
          },


          creator: { id:'creator', faction:'StorybookCommittee', name:'創世神', title:'永滅 / 權能複製', color:'#F8F9FA', mass:1.0, desc:'【被動】等待5秒後複製敵方機制。\n【強化】基礎數值乘二但無成長。',
            initLogic: b => { b.creatorTimer=0; b.isCreator=true; b.copied=false; b.scalingValue=`尋找宿主...`; },
            update: (b, eng) => { if(!b.copied){ b.scalingValue=`觀測中... (${(5-(b.creatorTimer+=DT)).toFixed(1)}s)`; if(b.creatorTimer>=5){ const es=eng.balls.filter(x=>eng.isEnemy(x.uniqueId,b.uniqueId)&&x.isMain&&x.hp>0&&x.id!=='podoasg'&&x.copied!=='podoasg'); if(es.length>0){ const e=es[floor(random()*es.length)], t=ROSTER[e.id]; b.copied=e.id; if(t.initLogic) t.initLogic(b); b.isCreator=b.noGrowth=true; if(b.copied==='cacamus')b.pawnsInHand=4; if(b.copied==='carrie'){b.shrapnelDmg=8;b.maxPressure=3;} if(b.copied==='melis')b.burnDamage=3; if(b.copied==='eli'){b.ringDmg=8;b.ringCountRaw=b.ringCount=2;} if(b.copied==='abraham')b.waveRadius=200; if(b.copied==='gordon')b.daggerCount=2; if(b.copied==='thoth'){b.massStacks=6;b.mass+=2.4;} if(b.copied==='cetus')b.convictDmg=20; if(b.copied==='ino')b.bounces=4; if(b.copied==='kate')b.wallDamage=10; if(b.copied==='olynx')b.bonusLifespan=4; if(b.copied==='grimm')b.hitCount=10; if(b.copied==='fasimir')b.stacks=20; b.onTakeDamage=t.onTakeDamage; b.copiedUpdate=t.update; b.onCollide=t.onCollide; b.modifyDamageOut=t.modifyDamageOut; b.onWallBounce=t.onWallBounce; } } } else if(b.copiedUpdate) b.copiedUpdate(b,eng); }
          },
          anonymous: { id:'anonymous', faction:'StorybookCommittee', name:'佚名', title:'永滅 / 扉頁箴言', color:'#D1D5DB', mass:1.0, desc:'【被動】全場失血化記憶強化技能。\n【主動】隨機箴言(雷射/恢復/圓環)。',
            initLogic: b => { b.skillTimer=b.memoryStacks=0; b.scalingValue=`讀書中...`; },
            update: (b, eng) => { const mem = b.memoryStacks = floor((eng.globalLostHp||0)/100); if((b.skillTimer+=DT)>=6){ b.skillTimer=0; const r=random(), mul=b.isCreator?2:1; if(r<0.33){ eng.spawnProjectile({type:'cross_laser',x:eng.arenaSize/2,y:eng.arenaSize/2,vx:0,vy:0,radius:0,color:'#FFF',ownerId:b.uniqueId,damage:0,bounces:0,lifespan:10*mul,maxLifespan:10*mul,penetrating:true,angle:0,hitCooldowns:{},baseDamage:10+mem}); b.scalingValue=`箴言: 本質 | 記憶: ${mem}`; } else if(r<0.66){ eng.spawnObstacle({type:'heal_field',x:b.x,y:b.y,radius:150,color:'rgba(16,185,129,0.2)',ownerId:b.uniqueId,team:b.team,lifespan:5*mul,healAmount:3+mem}); b.scalingValue=`箴言: 情感 | 記憶: ${mem}`; } else { eng.spawnObstacle({type:'balance_ring',x:eng.arenaSize/2,y:eng.arenaSize/2,radius:250,color:'rgba(245,158,11,0.3)',ownerId:b.uniqueId,team:b.team,lifespan:(10+mem)*mul}); b.scalingValue=`箴言: 平衡 | 記憶: ${mem}`; } } else { b.scalingValue = b.scalingValue.includes('記憶:') ? b.scalingValue.replace(/記憶: \d+/, `記憶: ${mem}`) : b.scalingValue + ` | 記憶: ${mem}`; } }
          },
          ocalis: { id:'ocalis', faction:'StorybookCommittee', name:'奧卡利斯', title:'永滅 / 必然收束', color:'#9CA3AF', mass:0.5, radiusMult:0.6, desc:'【被動】化為衛星環繞減傷。\n【主動】扣除目標5%最大生命。',
            initLogic: b => { b.baseMaxHp=b.maxHp*=0.3; b.hp=b.maxHp; b.proofreadTimer=b.orbitAngle=0; b.attachedTargetId=null; b.scalingValue=`校訂準備...`; }, modifyDamageOut: ()=>0, onTakeDamage: (b, a) => a*0.1,
            update: (b, eng) => { let t = eng.balls.find(x=>x.uniqueId===b.attachedTargetId); if(!t||t.hp<=0||t.isBlank){ t=eng.getNearestEnemy(b); b.attachedTargetId=t?t.uniqueId:null; } if(t){ b.scalingValue=`目標: ${t.name.substring(0,4)}`; const r=t.radius+b.radius+100; b.orbitAngle+=1.2*DT; b.x=max(b.radius,min(eng.arenaSize-b.radius,t.x+cos(b.orbitAngle)*r)); b.y=max(b.radius,min(eng.arenaSize-b.radius,t.y+sin(b.orbitAngle)*r)); b.vx=b.vy=0; if((b.proofreadTimer+=DT)>=5){b.proofreadTimer=0; eng.applyDamage(t,t.maxHp*0.05*(b.isCreator?2:1),b.uniqueId,'magic');} } }
          },
          podoasg: { id:'podoasg', faction:'StorybookCommittee', name:'波多亞斯格', title:'永滅 / 委員會召喚', color:'#F1F5F9', mass:1.0, desc:'【被動】開局空白，定期放牆。【終幕】隊友死盡召喚夥伴並親自下場。',
            initLogic: b => { b.isBlank=true; b.wallTimer=b.blankTimer=0; b.hasJoined=false; b.podoasgCooldowns={}; b.scalingValue=`狀態: 空白`; }, modifyDamageOut: ()=>0,
            update: (b, eng) => { if(b.hasJoined&&b.isBlank&&(b.blankTimer-=DT)<=0) b.isBlank=false; if(!b.hasJoined){ b.isBlank=true; if((b.wallTimer+=DT)>=20){ b.wallTimer=0; const v=Array.from({length:8},(_,i)=>{const a=i/8*PI*2+random()*.5,r=50+random()*30; return {x:cos(a)*r,y:sin(a)*r};}); eng.spawnObstacle({type:'podoasg_wall',x:b.x,y:b.y,radius:70,vertices:v,color:'rgba(148,163,184,0.5)',ownerId:b.uniqueId,lifespan:10}); } if(!eng.balls.some(x=>x.team===b.team&&x.hp>0&&x.uniqueId!==b.uniqueId&&!x.isSummon)){ b.hasJoined=true; b.isBlank=false; const c=['creator','anonymous','ocalis'], p=c[floor(random()*999999)%3], t=ROSTER[p], m=eng.createBall(t,b.team,`${b.uniqueId}_sum_${Date.now()}`,false,b.maxHp*.5,b.x+(random()-.5)*20,b.y+(random()-.5)*20); m.isSummon=true; m.radiusMult=(t.radiusMult||1)*.7; m.radius=BALL_RADIUS*m.radiusMult; m.mass=(t.mass||1)*.5; eng.balls.push(m); sTxt(eng,b.x,b.y-30,'📖 續寫故事！','#F1F5F9'); } } b.scalingValue=!b.hasJoined?`幕後: ${(20-b.wallTimer).toFixed(1)}s`:(b.isBlank?`空白 (${b.blankTimer.toFixed(1)}s)`:`親自下場`); if(b.podoasgCooldowns) Object.keys(b.podoasgCooldowns).forEach(k=>b.podoasgCooldowns[k]-=DT); if(b.reactionWallCooldown>0) b.reactionWallCooldown-=DT; },
            onTakeDamage: (b, a, s, eng) => { if(b.isBlank) return 0; if(a>0&&b.hasJoined&&(!b.reactionWallCooldown||b.reactionWallCooldown<=0)){ b.reactionWallCooldown=1.5; const v=Array.from({length:8},(_,i)=>{const an=i/8*PI*2+random()*.5,r=50+random()*30; return {x:cos(an)*r,y:sin(an)*r};}); eng.spawnObstacle({type:'podoasg_wall',x:b.x,y:b.y,radius:70,vertices:v,color:'rgba(148,163,184,0.5)',ownerId:b.uniqueId,lifespan:10}); } return a; },
            onCollide: (b, o, rel, eng) => { if(!b.isBlank&&eng.isEnemy(b.uniqueId,o.uniqueId)&&(b.podoasgCooldowns[o.uniqueId]||0)<=0){ b.podoasgCooldowns[o.uniqueId]=1.0; if(eng.applyRandomPodoasgEffect) eng.applyRandomPodoasgEffect(o,b.uniqueId,sign(o.x-b.x)||1,sign(o.y-b.y)||1); } }
          },
          fasimir: { id:'fasimir', faction:'TomorrowCompany', name:'法西米爾·箭頭', title:'本質 / 赫萊森', color:'#38BDF8', mass:1.0, desc:'【被動】建赫萊森域。【主動】賦予神器。\n【聯動】ECMO: 阿斯克勒庇俄斯的蛇杖。\n【終幕】10次後化為場地極高質量雷池。',
            initLogic: b => { b.stacks=0; b.wasInZone=b.ultimate=b.horizonSpawned=false; b.hermesList=[]; b.hephaestusList=[]; b.zeusList=[]; b.snakeWands=[]; b.ultHephaestusTimer=10; b.ultZeusTimer=5; b.collisionCooldowns={}; b.takeCollisionCooldowns={}; b.scalingValue=`赫萊森未啟動`; },
            update: (b, eng) => { if(b.ultimate){ if(b.collisionCooldowns)Object.keys(b.collisionCooldowns).forEach(k=>b.collisionCooldowns[k]-=DT); if(b.takeCollisionCooldowns)Object.keys(b.takeCollisionCooldowns).forEach(k=>b.takeCollisionCooldowns[k]-=DT); } const cx=eng.arenaSize/2, cy=eng.arenaSize/2; if(!b.horizonSpawned){ eng.spawnObstacle({type:'horizon_zone',x:cx,y:cy,radius:100,ownerId:b.uniqueId,lifespan:99999}); b.horizonSpawned=true; }
              const hasEcmo = eng.balls.some(x=>x.team===b.team&&x.hp>0&&(x.id==='ecmo'||x.copied==='ecmo'));
              if(!b.ultimate){ const inZ = distance(b.x,b.y,cx,cy)<100; if(inZ&&!b.wasInZone){ b.stacks+=b.noGrowth?0:1; const g = tb => {
                let pool = [0,1,2]; if(hasEcmo) pool.push(3);
                const ef = pool[floor(random()*pool.length)];
                if(ef===0){tb.hermesList.push(5);sTxt(eng,tb.x,tb.y-30,'杖: 傳送預備','#38BDF8');} else if(ef===1){tb.hephaestusList.push(10);sTxt(eng,tb.x,tb.y-30,'鎚: 鎖定打擊','#F87171');} else if(ef===2){tb.zeusList.push(15);sTxt(eng,tb.x,tb.y-30,'怒: 雷霆降臨','#FBBF24');} else if(ef===3){tb.snakeWands.push(5);sTxt(eng,tb.x,tb.y-30,'🐍 蛇杖充能','#10B981');}
              }; g(b); eng.balls.forEach(t=>{if(t.hp>0&&t.team===b.team&&t.uniqueId!==b.uniqueId&&!t.isBlank){if(!t.hermesList)t.hermesList=[]; if(!t.hephaestusList)t.hephaestusList=[]; if(!t.zeusList)t.zeusList=[]; if(!t.snakeWands)t.snakeWands=[]; g(t);}}); if(b.stacks>=10){ b.ultimate=true; b.hermesList=b.hermesList.map(()=>0); b.hephaestusList=b.hephaestusList.map(()=>0); b.zeusList=b.zeusList.map(()=>0); b.snakeWands=b.snakeWands.map(()=>0); b.ultHephaestusTimer=b.ultZeusTimer=0; b.x=cx; b.y=cy; b.vx=b.vy=b.speedMult=0; b.radius=100*(b.radiusMult||1); b.mass=999999; sTxt(eng,cx,cy-120,'赫萊森·絕對領域','#FFF'); eng.obstacles.forEach(o=>{if(o.type==='horizon_zone'&&o.ownerId===b.uniqueId) o.lifespan=0;}); } } b.wasInZone=inZ; b.scalingValue=`進入: ${floor(b.stacks)}/10`; } else { b.x=cx; b.y=cy; b.vx=b.vy=0; b.scalingValue=`赫萊森完全體`; }
              const pArt = tb => {
                const fH=()=>{const t=eng.getNearestEnemy(tb);if(t){eng.spawnParticle({type:'laser',x:tb.x,y:tb.y,tx:t.x,ty:t.y,color:'#F87171',maxLifespan:0.5}); eng.spawnWave({x:t.x,y:t.y,startRadius:0,maxRadius:150,speed:600,color:'rgba(248,113,113,0.5)',ownerId:tb.uniqueId,onHit:x=>{if(eng.isEnemy(x.uniqueId,tb.uniqueId)){eng.applyDamage(x,25,tb.uniqueId,'magic');const n=normalize(x.x-t.x,x.y-t.y);x.vx+=n.x*600;x.vy+=n.y*600;}}});}};
                const fZ=()=>{sTxt(eng,tb.x,tb.y-50,'⚡ 宙斯之怒','#FBBF24',0,1.5); eng.balls.forEach(t=>{if(t.hp>0&&eng.isEnemy(t.uniqueId,tb.uniqueId)&&!t.isBlank){eng.applyDamage(t,30,tb.uniqueId,'magic');const segs=[{x:t.x,y:t.y-eng.arenaSize}];let cx=t.x,cy=t.y-eng.arenaSize;while(cy<t.y){cx+=(random()-.5)*60;cy+=40+random()*60;if(cy>=t.y){cx=t.x;cy=t.y;}segs.push({x:cx,y:cy});} eng.spawnParticle({type:'lightning',x:t.x,y:t.y,segments:segs,color:'#FBBF24',maxLifespan:0.4});}}); eng.projectiles=eng.projectiles.filter(p=>!eng.isEnemy(p.ownerId,tb.uniqueId)); eng.waves=eng.waves.filter(w=>!eng.isEnemy(w.ownerId,tb.uniqueId)); eng.obstacles=eng.obstacles.filter(o=>o.type==='horizon_zone'||!eng.isEnemy(o.ownerId||'god',tb.uniqueId));};
                const fS=()=>{
                  const eT=eng.getNearestEnemy(tb); let aT=null, md=Infinity; eng.balls.forEach(x=>{if(x.team===tb.team&&x.uniqueId!==tb.uniqueId&&x.hp>0){const d=distance(tb.x,tb.y,x.x,x.y);if(d<md){md=d;aT=x;}}});
                  if(!aT) aT=tb; if(eT){
                    eng.spawnParticle({type:'laser',x:tb.x,y:tb.y,tx:eT.x,ty:eT.y,color:'#10B981',maxLifespan:0.3}); eng.spawnParticle({type:'laser',x:tb.x,y:tb.y,tx:aT.x,ty:aT.y,color:'#10B981',maxLifespan:0.3});
                    eng.applyDamage(eT, 15, tb.uniqueId, 'magic');
                    sTxt(eng, eT.x, eT.y-30, '-15 (蛇杖)', '#10B981');
                    eng.applyHeal(aT, 15, tb.uniqueId, true);
                    sTxt(eng, aT.x, aT.y-30, '+15 (蛇杖)', '#10B981');
                  }
                };
                if(tb.hermesList?.length>0){for(let i=tb.hermesList.length-1;i>=0;i--){if((tb.hermesList[i]-=DT)<=0){tb.hermesList.splice(i,1);const n=normalize(tb.vx,tb.vy),dx=n.x||1,dy=n.y,ox=tb.x,oy=tb.y; tb.x=max(tb.radius,min(eng.arenaSize-tb.radius,tb.x+dx*250)); tb.y=max(tb.radius,min(eng.arenaSize-tb.radius,tb.y+dy*250)); const sB=(bx,by)=>eng.spawnProjectile({type:'tracker',x:bx,y:by,vx:(random()-.5)*100,vy:(random()-.5)*100,radius:8,color:'#38BDF8',ownerId:tb.uniqueId,damage:8,bounces:2,lifespan:4,isTracking:true,trackingRange:500,maxSpeed:450}); sB(ox,oy); sB(tb.x,tb.y); eng.spawnParticle({type:'laser',x:ox,y:oy,tx:tb.x,ty:tb.y,color:'#38BDF8',maxLifespan:0.2});}}}
                if(tb.hephaestusList?.length>0) tb.hephaestusList.forEach((v,i,a)=>{if((a[i]-=DT)<=0){a[i]=10;fH();}});
                if(tb.zeusList?.length>0) tb.zeusList.forEach((v,i,a)=>{if((a[i]-=DT)<=0){a[i]=15;fZ();}});
                if(tb.snakeWands?.length>0) tb.snakeWands.forEach((v,i,a)=>{if((a[i]-=DT)<=0){a[i]=5;fS();}});
                if(tb.ultimate){if((tb.ultHephaestusTimer=(tb.ultHephaestusTimer||10)-DT)<=0){tb.ultHephaestusTimer=10;fH();} if((tb.ultZeusTimer=(tb.ultZeusTimer||5)-DT)<=0){tb.ultZeusTimer=5;fZ();}}
              };
              pArt(b); eng.balls.forEach(t=>{if(t.hp>0&&t.team===b.team&&t.uniqueId!==b.uniqueId&&!t.isBlank&&t.id!=='fasimir'&&t.copied!=='fasimir'&&t.lastArtProc!==eng.time){t.lastArtProc=eng.time;pArt(t);}});
            }, modifyDamageOut: (b, d, e, t) => { if(b.ultimate){ if((b.collisionCooldowns[t.uniqueId]||0)>0) return 0; b.collisionCooldowns[t.uniqueId]=0.5; return 15; } return d; }, onCollide: (b, o) => { }, onTakeDamage: (b, a, src, eng, dType) => { if(b.ultimate&&['collision','wall_collision'].includes(dType)){ return 0; } return a; }
          },
          lisi: { id:'lisi', faction:'TomorrowCompany', name:'李斯', title:'本質 / 明日新聞', color:'#F472B6', mass:1.0, desc:'【被動】閃光燈照相傷害。【主動】大新聞記錄全場，受擊喚出狂熱粉絲。【回溯】5秒後回溯狀態。\n【聯動】ECMO: 大新聞期間受擊依比例回血(可超量)。',
            initLogic: b => { b.newsTimer=b.photoTimer=b.cameraAngle=0; b.newsState=b.needsSnap=true; b.fanCooldowns={}; b.scalingValue=`大新聞！準備中...`; b.newsDamageTaken=0; },
            update: (b, eng) => { b.cameraAngle+=3*DT;
              if((b.photoTimer+=DT)>=0.8){ b.photoTimer=0; const r=b.radius+35, cx=b.x+cos(b.cameraAngle)*r, cy=b.y+sin(b.cameraAngle)*r; eng.spawnParticle({type:'photo_flash',x:cx,y:cy,angle:b.cameraAngle,range:300,color:'rgba(255,255,255,0.8)',maxLifespan:0.4}); eng.balls.forEach(t=>{ if(t.hp>0&&eng.isEnemy(t.uniqueId,b.uniqueId)&&!t.isBlank){ const d=hypot(t.x-cx,t.y-cy); if(d<=300){ let aD=abs(atan2(t.y-cy,t.x-cx)-b.cameraAngle); while(aD>PI)aD-=PI*2; if(abs(aD)<=PI/4) eng.applyDamage(t,max(1,4*(1-d/300)),b.uniqueId,'magic'); } } }); }
              if(b.needsSnap){ b.needsSnap=false; sTxt(eng,b.x,b.y-40,'📸 大新聞！','#F472B6'); b.snapshot={balls:cloneBalls(eng.balls), projectiles:cloneProjs(eng.projectiles), waves:cloneProjs(eng.waves), obstacles:eng.obstacles.map(o=>({...o}))}; b.fanCooldowns={}; b.newsDamageTaken=0; b.newsEcmoDamageTimer=0; }
              const hasEcmo = eng.balls.some(x=>x.team===b.team&&x.hp>0&&(x.id==='ecmo'||x.copied==='ecmo'));
              if(b.newsState) {
                if(hasEcmo) {
                  if((b.newsEcmoDamageTimer+=DT)>=3) {
                     b.newsEcmoDamageTimer=0;
                     eng.applyDamage(b, 1, 'ecmo_news_drain', 'magic');
                  }
                }
                if((b.newsTimer+=DT)>=5){
                  b.newsState=false; b.newsTimer=0; sTxt(eng,b.x,b.y-40,'⏪ 狀態回溯','#38BDF8');
                  if(b.snapshot){ const ss=b.snapshot.balls.find(x=>x.uniqueId===b.uniqueId); if(ss) b.hp=ss.hp;
                    if(hasEcmo && b.newsDamageTaken > 0) {
                      const healAmt = b.newsDamageTaken * 0.25;
                      eng.applyHeal(b, healAmt, b.uniqueId, true);
                      sTxt(eng,b.x,b.y-60, `💚 大新聞回饋 (+${floor(healAmt)})`, '#10B981');
                    }
                    eng.balls.forEach(tb=>{const sb=b.snapshot.balls.find(x=>x.uniqueId===tb.uniqueId); if(sb){tb.x=sb.x; tb.y=sb.y; tb.vx=sb.vx; tb.vy=sb.vy;}}); eng.projectiles=cloneProjs(b.snapshot.projectiles); eng.waves=cloneProjs(b.snapshot.waves); eng.obstacles=b.snapshot.obstacles.map(o=>({...o})); b.snapshot=null;
                  }
                }
              } else if(!b.newsState&&(b.newsTimer+=DT)>=10){ b.newsState=b.needsSnap=true; b.newsTimer=0; }
              b.scalingValue=b.newsState?`大新聞！ (${(5-b.newsTimer).toFixed(1)}s)`:`新聞冷卻 (${(10-b.newsTimer).toFixed(1)}s)`;
            },
            onTakeDamage: (b, a, s, eng) => {
              if(b.newsState) {
                 b.newsDamageTaken += a;
                 if(s&&a>0&&eng.isEnemy(b.uniqueId,s)&&(b.fanCooldowns[s]||0)<=0){ b.fanCooldowns[s]=0.2; [{x:50,y:50},{x:eng.arenaSize-50,y:50},{x:50,y:eng.arenaSize-50},{x:eng.arenaSize-50,y:eng.arenaSize-50}].forEach((c,i)=>{ const f=eng.createBall(ROSTER.fanatic_fan,b.team,`${b.uniqueId}_fan_${s}_${i}_${Date.now()}`,false,10,c.x,c.y); f.targetId=s; eng.balls.push(f); }); sTxt(eng,b.x,b.y-60,'📢 公審開始！','#F43F5E'); }
              }
              return a;
            }
          },
          ecmo: { id:'ecmo', faction:'TomorrowCompany', name:'ECMO', title:'醫療照護', color:'#10B981', mass:1.0, desc:'【被動】承傷/造傷累積素材，每10秒扣10%血換10%素材。\n【主動】滿100增殖。上限後發生物電，敵方麻痺我方回血(可超量)。\n【聯動】解鎖隊友超量機制。',
             initLogic: b => { b.drawTimer=0; b.scalingValue=`素材: 0`; b.isEcmoClone=false; },
             update: (b, eng) => {
               if(eng.teamFleshMaterials === undefined) eng.teamFleshMaterials = {};
               if(eng.teamFleshMaterials[b.team] === undefined) eng.teamFleshMaterials[b.team] = 0;
               let currentMats = eng.teamFleshMaterials[b.team];


               if((b.drawTimer+=DT) >= 10) {
                 b.drawTimer = 0;
                 const hpCost = b.hp * 0.1;
                 const matGain = b.maxHp * 0.1;
                 eng.applyDamage(b, hpCost, b.uniqueId, 'magic');
                 currentMats += matGain;
                 sTxt(eng, b.x, b.y-30, `💉 抽血換材 (+${floor(matGain)})`, '#FCA5A5');
               }


               const maxEcmoCount = 3;
               const currentEcmoCount = eng.balls.filter(x => x.team === b.team && (x.id === 'ecmo' || x.copied === 'ecmo') && x.hp > 0).length;


               if(currentMats >= 100 && currentEcmoCount < maxEcmoCount && !b.isEcmoClone) {
                 currentMats -= 100;
                 const cid = `${b.uniqueId}_clone_${Date.now()}`;
                 const clone = eng.createBall(ROSTER.ecmo, b.team, cid, true, b.baseMaxHp, b.x + (random()-.5)*50, b.y + (random()-.5)*50);
                 clone.isEcmoClone = true;
                 eng.balls.push(clone);
                 sTxt(eng, b.x, b.y-50, '🧬 增殖！', '#10B981', 0, 2);
               }


               if(currentEcmoCount >= maxEcmoCount && currentMats >= 50) {
                 currentMats -= 50;
                 eng.spawnWave({x: b.x, y: b.y, startRadius: b.radius, maxRadius: 300, speed: 450, color: 'rgba(16, 185, 129, 0.4)', ownerId: b.uniqueId, lingerDuration: 0.1, deflectsProjectiles: false, onHit: t => {
                     if(eng.isEnemy(t.uniqueId, b.uniqueId)) {
                         eng.applyStatus(t.uniqueId, 'stun', {duration: 2});
                         sTxt(eng, t.x, t.y-20, '⚡ 麻痺', '#FCD34D');
                     } else {
                         eng.applyHeal(t, 10, b.uniqueId, true);
                         sTxt(eng, t.x, t.y-20, '💚 復甦', '#10B981');
                     }
                 }});
                 sTxt(eng, b.x, b.y-50, '⚡ 生物電！', '#10B981', 0, 1.5);
               }
               eng.teamFleshMaterials[b.team] = currentMats;
               b.scalingValue = `共用素材: ${floor(eng.teamFleshMaterials[b.team])} | 抽血: ${(10-b.drawTimer).toFixed(1)}s`;
             },
             onTakeDamage: (b, amt, src, eng, dType) => {
               if(amt > 0 && dType !== 'burn') {
                  if(eng.teamFleshMaterials === undefined) eng.teamFleshMaterials = {};
                  if(eng.teamFleshMaterials[b.team] === undefined) eng.teamFleshMaterials[b.team] = 0;
                  eng.teamFleshMaterials[b.team] += amt;
               }
               return amt;
             },
             onDealDamage: (b, amt, tg, eng) => {
               if(amt > 0) {
                  if(eng.teamFleshMaterials === undefined) eng.teamFleshMaterials = {};
                  if(eng.teamFleshMaterials[b.team] === undefined) eng.teamFleshMaterials[b.team] = 0;
                  eng.teamFleshMaterials[b.team] += amt;
               }
             }
          },


          fanatic_fan: { id:'fanatic_fan', faction:'TomorrowCompany', name:'狂熱粉絲', title:'公審', color:'#F43F5E', mass:0.8, radiusMult:0.5, desc:'公審目標', initLogic: b => b.speedMult=1.6, update: (b, e) => { let t=e.balls.find(x=>x.uniqueId===b.targetId&&x.hp>0&&!x.isBlank); if(!t){t=e.getNearestEnemy(b); if(t)b.targetId=t.uniqueId;} if(t){ const n=normalize(t.x-b.x,t.y-b.y); b.vx+=n.x*50; b.vy+=n.y*50; const s=hypot(b.vx,b.vy); if(s>450){b.vx=(b.vx/s)*450; b.vy=(b.vy/s)*450;} } else b.hp=0; }, modifyDamageOut: ()=>1, onCollide: ()=>{} },
          chess_piece: { id:'chess_piece', faction:'Other', name:'戰棋', title:'召喚物', color:'#E5E7EB', mass:9999, radiusMult:22/35, desc:'卡卡繆思的戰棋。', initLogic: b => { b.isChessPiece=b.isUntargetable=true; b.speedMult=b.vx=b.vy=b.moveTimer=b.moveProgress=0; b.isMoving=false; b.blockCooldowns={}; b.scalingValue=`棋子`; }, modifyDamageOut: ()=>0, onCollide: ()=>{},
            update: (o, eng) => { o.vx=o.vy=0; const ow=eng.balls.find(b=>b.uniqueId===o.ownerId); if(!ow||ow.hp<=0){o.hp=0;return;} Object.keys(o.blockCooldowns).forEach(k=>o.blockCooldowns[k]-=DT); if(o.isMoving){ o.moveProgress+=DT*2; if(o.moveProgress>=1){ o.moveProgress=1; o.isMoving=false; const cs=eng.arenaSize/8, hit=new Set(); [{c:o.col,r:o.row},{c:o.col+1,r:o.row},{c:o.col-1,r:o.row},{c:o.col,r:o.row+1},{c:o.col,r:o.row-1}].forEach(c=>{ if(c.c>=0&&c.c<=7&&c.r>=0&&c.r<=7){ eng.spawnParticle({type:'rect_flash',x:(c.c+.5)*cs,y:(c.r+.5)*cs,size:cs,color:'rgba(229,231,235,0.4)',maxLifespan:0.3}); eng.balls.forEach(t=>{ if(t.hp>0&&!t.isBlank&&eng.isEnemy(t.uniqueId,o.ownerId)&&!t.isChessPiece){ const cx=max(c.c*cs,min(t.x,(c.c+1)*cs)), cy=max(c.r*cs,min(t.y,(c.r+1)*cs)); if((t.x-cx)**2+(t.y-cy)**2<t.radius**2&&!hit.has(t.uniqueId)){ hit.add(t.uniqueId); eng.applyDamage(t,8,o.ownerId,'magic'); sTxt(eng,t.x,t.y-30,'⚔️ 將軍!',o.color); } } }); } }); if(o.pieceType==='pawn'&&(o.row===0||o.row===7)){ o.pieceType=['knight','bishop','rook','queen'][floor(random()*4)]; sTxt(eng,o.x,o.y-30,'✨ 升變!','#FCD34D'); } } o.x=o.moveStartX+(o.moveEndX-o.moveStartX)*o.moveProgress; o.y=o.moveStartY+(o.moveEndY-o.moveStartY)*o.moveProgress; } else if((o.moveTimer+=DT)>=3){ o.moveTimer=0; let t=o.behavior==='protect'?ow:null, md=Infinity; if(!t) eng.balls.forEach(b=>{if(b.hp>0&&eng.isEnemy(b.uniqueId,o.ownerId)&&!b.isBlank&&!b.isChessPiece){const d=distance(b.x,b.y,o.x,o.y);if(d<md){md=d;t=b;}}}); if(t){ const cs=eng.arenaSize/8, moves=[], c=o.col, r=o.row; if(o.pieceType==='pawn') moves.push({c,r:r+o.direction}); else if(o.pieceType==='knight') [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]].forEach(of=>moves.push({c:c+of[0],r:r+of[1]})); else { const dirs=[]; if(o.pieceType!=='rook') dirs.push([1,1],[1,-1],[-1,1],[-1,-1]); if(o.pieceType!=='bishop') dirs.push([1,0],[-1,0],[0,1],[0,-1]); dirs.forEach(d=>{for(let k=1;k<=7;k++)moves.push({c:c+d[0]*k,r:r+d[1]*k});}); } let bm=null, bmd=Infinity; moves.forEach(m=>{ if(m.c>=0&&m.c<=7&&m.r>=0&&m.r<=7&&!eng.balls.some(ob=>ob.isChessPiece&&ob.uniqueId!==o.uniqueId&&ob.col===m.c&&ob.row===m.r&&ob.hp>0)){ const d=distance((m.c+.5)*cs,(m.r+.5)*cs,t.x,t.y); if(d<bmd){bmd=d;bm=m;} } }); if(bm&&(bm.c!==o.col||bm.r!==o.row)){ o.isMoving=true; o.moveStartX=o.x; o.moveStartY=o.y; o.moveEndX=(bm.c+.5)*cs; o.moveEndY=(bm.r+.5)*cs; o.col=bm.c; o.row=bm.r; o.moveProgress=0; } } } }
          },
          endless_minion: { id:'endless_minion', faction:'Other', name:'無盡狂熱者', title:'小兵', color:'#14B8A6', mass:0.8, radiusMult:0.5, desc:'無盡模式專用小兵', initLogic: b => b.speedMult=1.6, modifyDamageOut: ()=>1, onCollide: ()=>{}, update: (b, e) => { const t=e.getNearestEnemy(b); if(t){ const n=normalize(t.x-b.x,t.y-b.y); b.vx+=n.x*50; b.vy+=n.y*50; const s=hypot(b.vx,b.vy); if(s>450){b.vx=(b.vx/s)*450; b.vy=(b.vy/s)*450;} } } },
          grimm: { id:'grimm', faction:'AnchorOfDestiny', name:'格林·吉奧', title:'念核 / 『志』之錨', color:'#34D399', mass:1.1, desc:'【被動】生念核。本體拾取化軌道；敵方拾取受傷；我方恢復。\n【主動】滿12顆收束巨劍，依累積受擊揮砍。',
            initLogic: b => { b.coreTimer=b.collectedCores=b.hitCount=b.baseOrbitAngle=b.gatherTimer=b.slashCount=b.totalSlashes=b.slashInterval=b.slashComboCount=0; b.isGathering=b.isSlashing=false; b.hitCooldowns={}; b.orbitCooldowns={}; b.scalingValue=`念核: 0/12 | 受擊: 0`; },
            update: (b, eng) => { const tCD=o=>{if(o)Object.keys(o).forEach(k=>o[k]-=DT);}; tCD(b.orbitCooldowns); tCD(b.hitCooldowns); b.baseOrbitAngle+=6*DT; if(b.isGathering){ if((b.gatherTimer-=DT)<=0){ b.isGathering=false; b.totalSlashes=max(1,b.hitCount); b.collectedCores=b.slashComboCount=b.slashCount=b.slashInterval=0; b.isSlashing=true; sTxt(eng,b.x,b.y-40,'⚔️ 形念·巨劍','#10B981'); } } else if(b.isSlashing){ if((b.slashInterval-=DT)<=0){ b.slashCount++; b.slashComboCount++; if(b.slashComboCount>=5){b.slashInterval=0.4; b.slashComboCount=0;} else b.slashInterval=0.08; const es=eng.balls.filter(t=>t.hp>0&&eng.isEnemy(t.uniqueId,b.uniqueId)&&!t.isBlank); if(es.length>0){ const t=es[floor(random()*es.length)], a=random()*PI*2, l=eng.arenaSize*3; eng.spawnParticle({type:'slash',p1:{x:t.x+cos(a)*l/2,y:t.y+sin(a)*l/2},p2:{x:t.x-cos(a)*l/2,y:t.y-sin(a)*l/2},color:'#34D399',maxLifespan:0.25}); eng.applyDamage(t,10,b.uniqueId,'magic'); } if(b.slashCount>=b.totalSlashes){ b.isSlashing=false; b.scalingValue=`念核: ${b.collectedCores}/12 | 受擊: ${b.hitCount}`; } else b.scalingValue=`形念巨劍: 揮砍 ${b.slashCount}/${b.totalSlashes}`; } } else { if(b.collectedCores>=12){ b.isGathering=true; b.gatherTimer=1.0; b.scalingValue=`念核匯聚中...`; } else { if((b.coreTimer+=DT)>=2){ b.coreTimer=0; eng.spawnObstacle({type:'thought_core',x:50+random()*(eng.arenaSize-100),y:50+random()*(eng.arenaSize-100),radius:10,color:'#10B981',ownerId:b.uniqueId,lifespan:15}); } if(b.collectedCores>0){ const r=b.radius+60; eng.balls.forEach(t=>{ if(t.hp>0&&eng.isEnemy(t.uniqueId,b.uniqueId)&&!t.isBlank){ for(let i=0;i<b.collectedCores;i++){ const cK=`${t.uniqueId}_core_${i}`; if((b.orbitCooldowns[cK]||0)<=0){ const a=b.baseOrbitAngle+(i*PI*2/b.collectedCores); if(distance(b.x+cos(a)*r,b.y+sin(a)*r,t.x,t.y)<t.radius+15){ eng.applyDamage(t,2,b.uniqueId,'magic'); b.orbitCooldowns[cK]=0.5; } } } } }); } b.scalingValue=`念核: ${b.collectedCores}/12 | 受擊: ${b.hitCount}`; } } },
            onTakeDamage: (b, a, src, eng, dType) => { if(a>0){ if(dType==='projectile'){ if(!b.noGrowth) b.hitCount++; if(!b.isSlashing&&!b.isGathering) b.scalingValue=`念核: ${b.collectedCores}/12 | 受擊: ${b.hitCount}`; } else { const sId=src||dType||'env'; if((b.hitCooldowns[sId]||0)<=0){ if(!b.noGrowth) b.hitCount++; b.hitCooldowns[sId]=0.5; if(!b.isSlashing&&!b.isGathering) b.scalingValue=`念核: ${b.collectedCores}/12 | 受擊: ${b.hitCount}`; } } } return a; }
          },
          quzhe: { id:'quzhe', faction:'AnchorOfDestiny', name:'曲哲', title:'雙生 / 『象』之錨', color:'#059669', mass:1.0, desc:'【被動】本體與虛影分擔血量，互通傷害治療。【主動】一死展無盡之境侵蝕。【反制】存活受擊生裂口交融。',
            initLogic: b => { b.isQuzheMain=true; b.phantomId=null; b.totalHpChange=b.twinHealQueue=b.twinDamageQueue=b.riftCooldown=0; b.hasTriggeredDomain=b.phantomSpawned=false; b.hp=b.lastHp=b.maxHp*0.5; b.scalingValue=`變化積累: 0`; },
            update: (b, eng) => { if(b.isQuzheMain&&!b.phantomSpawned){ b.phantomSpawned=true; const pId=`${b.uniqueId}_phantom`; b.phantomId=pId; const p=eng.createBall(ROSTER.quzhe_phantom,b.team,pId,false,b.baseMaxHp,b.x+(random()-.5)*100,b.y+(random()-.5)*100); Object.assign(p,{mainId:b.uniqueId,summonerId:b.uniqueId,isSummon:true,radiusMult:b.radiusMult||1,radius:b.radius,mass:b.mass,isBoss:b.isBoss,hp:p.maxHp*0.5,lastHp:p.maxHp*0.5,twinHealQueue:0,twinDamageQueue:0,riftCooldown:0}); eng.balls.push(p); } if(b.lastHp===undefined) b.lastHp=b.hp; if(b.riftCooldown>0) b.riftCooldown-=DT; const hD=b.hp-b.lastHp; if(abs(hD)>0.01){ const df=abs(hD), mB=b.isQuzheMain?b:eng.balls.find(x=>x.uniqueId===b.mainId); if(mB) mB.totalHpChange+=df; const o=eng.balls.find(x=>x.uniqueId===(b.isQuzheMain?b.phantomId:b.mainId)); if(o&&o.hp>0){ if(hD<0) o.twinHealQueue=(o.twinHealQueue||0)+df; else if(hD>0) o.twinDamageQueue=(o.twinDamageQueue||0)+df; } b.lastHp=b.hp; } if(b.twinHealQueue>0){ eng.applyHeal(b,b.twinHealQueue); b.lastHp=b.hp; b.twinHealQueue=0; } if(b.twinDamageQueue>0){ eng.applyDamage(b,b.twinDamageQueue,b.uniqueId,'magic'); b.lastHp=b.hp; b.twinDamageQueue=0; } if(b.isQuzheMain) b.scalingValue=`雙生相依 | 變化積累: ${floor(b.totalHpChange)}`; },
            onTakeDamage: (b, a, s, eng) => { const aL=min(b.hp,a), oId=b.isQuzheMain?b.phantomId:b.mainId, o=eng.balls.find(x=>x.uniqueId===oId); if(b.hp-aL<=0&&o&&o.hp>0&&!b.hasTriggeredDomain){ b.hasTriggeredDomain=o.hasTriggeredDomain=true; const mB=b.isQuzheMain?b:o; mB.totalHpChange+=aL; eng.spawnObstacle({type:'quzhe_domain',x:o.x,y:o.y,radius:0,maxRadius:eng.arenaSize*1.5,color:'rgba(16,185,129,0.2)',ownerId:o.uniqueId,lifespan:9999,expandSpeed:20,erosionRate:Math.log(max(1,mB.totalHpChange))/100,tears:Array.from({length:3},()=>({angle:random()*PI*2,length:0,speed:30+random()*20}))}); sTxt(eng,o.x,o.y-30,'無盡之境！','#059669',0,2); } else if(b.hasTriggeredDomain&&a>0){ const mB=b.isQuzheMain?b:(o||b); if((b.riftCooldown||0)<=0){ b.riftCooldown=5; eng.spawnObstacle({type:'quzhe_rift',x:b.x,y:b.y,radius:0,maxRadius:160,color:'rgba(16,185,129,0.2)',ownerId:b.uniqueId,lifespan:9999,expandSpeed:40,erosionRate:Math.log(max(1,mB.totalHpChange))/100,tears:Array.from({length:3},()=>({angle:random()*PI*2,length:0,speed:20+random()*20}))}); sTxt(eng,b.x,b.y-30,'💥 境界撕裂!','#059669',0,2); } } return a; }
          },
          quzhe_phantom: { id:'quzhe_phantom', faction:'Other', name:'曲哲 (虛影)', title:'雙生虛影', color:'#6EE7B7', mass:1.0, desc:'曲哲的雙生虛影。', initLogic: b => { b.isQuzhePhantom=true; b.hasTriggeredDomain=false; }, update: (b, e) => ROSTER.quzhe.update(b, e), onTakeDamage: (b, a, s, e, dt) => ROSTER.quzhe.onTakeDamage(b, a, s, e, dt) },
          piancha: { id:'piancha', faction:'AnchorOfDestiny', name:'偏差', title:'空間 / 『移』之錨', color:'#A855F7', mass:0.9, desc:'【被動】穿透牆壁生傳送門。【主動】受傷全地圖躍遷生門。【命路】死後轉負載，傳送門湮滅爆發負載傷害。',
            initLogic: b => { b.wallWrap=true; b.blinkCooldown=b.wallPortalCooldown=b.teleportCount=b.deathCountdown=b.negativeHpDebt=0; b.isUndead=false; b.scalingValue=`『移』之錨 | 躍遷: 0次`; },
            update: (b, eng) => { if(b.blinkCooldown>0)b.blinkCooldown-=DT; if(b.wallPortalCooldown>0)b.wallPortalCooldown-=DT; if(b.isUndead){ b.deathCountdown-=DT; b.scalingValue=`命路遠延: ${max(0,b.deathCountdown).toFixed(1)}s | 負載: ${floor(b.negativeHpDebt)}`; if(b.deathCountdown<=0){ const d=b.negativeHpDebt; b.negativeHpDebt=0; const ps=eng.obstacles.filter(o=>o.type==='portal'&&o.ownerId===b.uniqueId), tE=(x,y)=>{ eng.spawnWave({x,y,startRadius:0,maxRadius:250,speed:1000,color:'rgba(168,85,247,0.8)',ownerId:b.uniqueId,lingerDuration:0.2,deflectsProjectiles:true,onHit:t=>{if(d>0&&eng.isEnemy(t.uniqueId,b.uniqueId))eng.applyDamage(t,d*max(0.1,1-(distance(x,y,t.x,t.y)/250)),b.uniqueId,'magic');}}); eng.spawnParticle({type:'collapse',x,y,maxRadius:250,maxLifespan:0.5}); if(d>0)sTxt(eng,x,y-30,`💥 崩落 (${floor(d)})`,'#E9D5FF',0,1.5); }; if(ps.length>0) ps.forEach(p=>{tE(p.x,p.y);p.lifespan=0;}); else tE(b.x,b.y); sTxt(eng,b.x,b.y-50,'💀 命路終焉','#A855F7',0,2); b.hp=0; } } else b.scalingValue=`『移』之錨 | 躍遷: ${b.teleportCount}次`; },
            onWallBounce: (b, eng, ox, oy) => { if(ox!==undefined&&b.wallPortalCooldown<=0){ b.wallPortalCooldown=0.5; if(!b.isUndead)b.teleportCount++; const p1=`${b.uniqueId}_p_${Date.now()}_1`, p2=`${b.uniqueId}_p_${Date.now()}_2`; eng.spawnObstacle({type:'portal',portalId:p1,targetId:p2,x:ox,y:oy,radius:25,color:'#D8B4FE',lifespan:9999,ownerId:b.uniqueId}); eng.spawnObstacle({type:'portal',portalId:p2,targetId:p1,x:b.x,y:b.y,radius:25,color:'#D8B4FE',lifespan:9999,ownerId:b.uniqueId}); } },
            onTakeDamage: (b, a, s, eng, dt) => { if(b.isUndead){b.negativeHpDebt+=a;return 0;} if(a>0&&dt!=='portal'&&b.blinkCooldown<=0){ b.blinkCooldown=1; if(!b.isUndead)b.teleportCount++; const ox=b.x, oy=b.y, nx=b.radius+random()*(eng.arenaSize-b.radius*2), ny=b.radius+random()*(eng.arenaSize-b.radius*2); b.x=nx; b.y=ny; const p1=`${b.uniqueId}_p_${Date.now()}_1`, p2=`${b.uniqueId}_p_${Date.now()}_2`; eng.spawnObstacle({type:'portal',portalId:p1,targetId:p2,x:ox,y:oy,radius:25,color:'#D8B4FE',lifespan:9999,ownerId:b.uniqueId}); eng.spawnObstacle({type:'portal',portalId:p2,targetId:p1,x:nx,y:ny,radius:25,color:'#D8B4FE',lifespan:9999,ownerId:b.uniqueId}); sTxt(eng,ox,oy-30,'🌀 躍遷','#D8B4FE'); } if(b.hp-a<=0&&b.teleportCount>0){ b.isUndead=true; b.deathCountdown=b.teleportCount; b.negativeHpDebt=a-b.hp; sTxt(eng,b.x,b.y-40,'⏳ 命路遠延','#A855F7',0,2); return b.hp-0.1; } return a; }
          },
          aclas: { id:'aclas', faction:'AnchorOfDestiny', name:'艾克拉斯·天輝', title:'誓約 / 『誓』之錨', color:'#000000', mass:1.0, desc:'【被動】每秒生出紅綠藍色光(波包形態)。拾取改變自身顏色，上限各8層。\n【滿層質變】當單一色光達8層時，該屬性加成翻倍！\n【紅】動機：傷害，每層+4\n【綠】激發：擊退，每層+200\n【藍】能力：範圍，每層+20度\n【主動】每8秒釋放激光攻擊。\n【增幅】發射前根據總色光數乘2恢復血量。',
            initLogic: b => { b.r=0; b.g=0; b.b=0; b.lightTimer=0; b.attackTimer=0; b.updateColor=()=>{ const toH=v=>floor(v*255/8).toString(16).padStart(2,'0'); b.color=`#${toH(b.r)}${toH(b.g)}${toH(b.b)}`; b.scalingValue=`R:${b.r} G:${b.g} B:${b.b} | 倒數: ${(8-b.attackTimer).toFixed(1)}s`; }; b.updateColor(); },
            update: (b, eng) => {
              if((b.lightTimer+=DT)>=1){ b.lightTimer=0; const t=['R','G','B'][floor(random()*3)]; eng.spawnObstacle({type:'rgb_light', cType:t, x:50+random()*(eng.arenaSize-100), y:50+random()*(eng.arenaSize-100), radius:32, color:t==='R'?'#EF4444':(t==='G'?'#22C55E':'#3B82F6'), ownerId:b.uniqueId, lifespan:8}); }
              eng.obstacles.forEach(o=>{ if(o.type==='rgb_light'&&o.ownerId===b.uniqueId&&o.lifespan>0){
                o.x += 80 * DT;
                if(o.x > eng.arenaSize + o.radius) o.x = -o.radius;
                if(o.pickupCooldown > 0) o.pickupCooldown -= DT;
                if((o.pickupCooldown||0)<=0 && distance(b.x,b.y,o.x,o.y)<=b.radius+o.radius){
                  const ox = b.x, oy = b.y;
                  if(o.cType==='R'&&b.r<8)b.r++; else if(o.cType==='G'&&b.g<8)b.g++; else if(o.cType==='B'&&b.b<8)b.b++; b.updateColor(); o.lifespan=0; sTxt(eng,o.x,o.y-10,'+1 '+o.cType,o.color);
                  const n=normalize(b.vx,b.vy); const tpDist = 120; b.x+=n.x*tpDist; b.y+=n.y*tpDist; b.x=max(b.radius,min(eng.arenaSize-b.radius,b.x)); b.y=max(b.radius,min(eng.arenaSize-b.radius,b.y));
                  eng.spawnObstacle({type:'rgb_light', cType:o.cType, x:ox, y:oy, radius:32, color:o.color, ownerId:b.uniqueId, lifespan:4, isClone:true, pickupCooldown: 0.5});
                  eng.spawnParticle({type:'laser', x:ox, y:oy, tx:b.x, ty:b.y, color:o.color, maxLifespan:0.25}); eng.spawnParticle({type:'rect_flash', x:b.x, y:b.y, size:90, color:'rgba(255,255,255,0.6)', maxLifespan:0.3}); eng.spawnParticle({type:'rect_flash', x:ox, y:oy, size:60, color:o.color, maxLifespan:0.3});
                  sTxt(eng,b.x,b.y-30,'🌀 躍遷','#FFF');
                }
              }});
              if((b.attackTimer+=DT)>=8){ b.attackTimer=0;
                  const totalLights = b.r + b.g + b.b;
                  if(totalLights > 0) { eng.applyHeal(b, totalLights * 2); sTxt(eng, b.x, b.y-20, `💚 誓約恢復 (+${totalLights*2})`, '#10B981'); }
                  const dmg=(1+b.r*4)*(b.r===8?2:1), kb=(b.g*200)*(b.g===8?2:1), sp=((b.b*20)*PI/180)*(b.b===8?2:1), t=eng.getNearestEnemy(b), a=t?atan2(t.y-b.y,t.x-b.x):atan2(b.vy,b.vx); const ry=b.b===0?1:(3+b.b); eng.sound('laserBurst', { intensity: 1 + (b.r + b.g + b.b) / 12 }); for(let i=0;i<ry;i++){ const ca=ry===1?a:a-sp/2+(sp/(ry-1))*i; eng.spawnParticle({type:'laser', x:b.x, y:b.y, tx:b.x+cos(ca)*eng.arenaSize*2, ty:b.y+sin(ca)*eng.arenaSize*2, color:b.color==='#000000'?'#FFF':b.color, maxLifespan:0.5}); } eng.balls.forEach(tg=>{ if(tg.hp>0&&eng.isEnemy(tg.uniqueId,b.uniqueId)&&!tg.isBlank){ const dx=tg.x-b.x, dy=tg.y-b.y, d=hypot(dx,dy); let ad=abs(atan2(dy,dx)-a); while(ad>PI)ad-=PI*2; ad=abs(ad); let ht=false; if(b.b===0){ if(abs(sin(a)*dx-cos(a)*dy)<tg.radius+15 && dx*cos(a)+dy*sin(a)>0) ht=true; }else{ if(ad<=sp/2) ht=true; } if(ht){ eng.applyDamage(tg,dmg,b.uniqueId,'magic'); if(kb>0){ eng.applyStatus(tg.uniqueId,'knockback',{duration:1.5,sourceId:b.uniqueId}); const n=normalize(dx,dy); tg.vx+=n.x*kb; tg.vy+=n.y*kb; } } } }); sTxt(eng,b.x,b.y-40,b.r===8||b.g===8||b.b===8?'✨ 極限誓約·天輝！':'🌈 誓約·天輝！',b.color==='#000000'?'#FFF':b.color); b.r=b.g=b.b=0; b.updateColor(); }
              else b.scalingValue=`R:${b.r} G:${b.g} B:${b.b} | 倒數: ${(8-b.attackTimer).toFixed(1)}s`;
            }
          },
          si: {
            id: 'si', faction: 'AnchorOfDestiny', name: '糸', title: '絲線 / 『繫』之錨', color: '#E2E8F0', mass: 1.0,
            desc: '【性相】型之性相\n【被動】碰撞敵人時為其捆上絲線(可反覆疊加)。自身受傷時，將該次傷害的 8% 乘上絲線層數，傳遞給所有受捆綁的敵人，並免除同等比例的傷害。\n【主動】萬維交織：全場絲線總數量達12層時強制收束，每層對目標造成5點傷害，並將所有受捆綁的敵人強制拉向戰場中心，隨後清空絲線。',
            initLogic: (ball) => { 
                ball.boundOrder = []; // 用於記錄 舊敵人 -> 新敵人 的順序
                ball.threadPulse = 0;
                ball.scalingValue = `絲線總數: 0/12`; 
            },
            onCollide: (ball, other, relSpeed, engine) => {
                if (engine.isEnemy(ball.uniqueId, other.uniqueId) && !other.isBlank) {
                    if (!other.threadStacks) other.threadStacks = {};
                    other.threadStacks[ball.uniqueId] = (other.threadStacks[ball.uniqueId] || 0) + 1;
                    other.lastThreadedBy = ball.uniqueId;
                    other.threadFlash = 0.35;
                    
                    // 維護綑綁順序：重複綑綁會將該敵人移到連線的最末端 (最新)
                    if (!ball.boundOrder) ball.boundOrder = [];
                    const idx = ball.boundOrder.indexOf(other.uniqueId);
                    if (idx > -1) ball.boundOrder.splice(idx, 1);
                    ball.boundOrder.push(other.uniqueId);
                    ball.threadPulse = 0.35;

                    engine.spawnParticle({ type: 'text', x: other.x, y: other.y - 30, text: '🧵 繫綁', color: '#E2E8F0', maxLifespan: 0.8 });
                }
            },
            onTakeDamage: (ball, amount, sourceId, engine, damageType) => {
                if (amount > 0 && ball.boundOrder && ball.boundOrder.length > 0) {
                    let reductionRate = 0;
                    ball.boundOrder.forEach(targetId => {
                        const b = engine.balls.find(x => x.uniqueId === targetId);
                        if (b && b.hp > 0 && b.threadStacks && b.threadStacks[ball.uniqueId] > 0) {
                            const stackRate = 0.08 * b.threadStacks[ball.uniqueId];
                            reductionRate += stackRate;
                            const transferDmg = amount * stackRate;
                            if (transferDmg > 0) {
                                engine.applyDamage(b, transferDmg, ball.uniqueId, 'magic');
                                // 傳導傷害時給予微小的向糸方向的拉力
                                const dx = ball.x - b.x;
                                const dy = ball.y - b.y;
                                const dist = Math.hypot(dx, dy) || 1;
                                b.vx += (dx / dist) * 15;
                                b.vy += (dy / dist) * 15;
                            }
                        }
                    });
                    return amount * (1 - min(0.9, reductionRate));
                }
                return amount;
            },
            update: (ball, engine) => {
                let totalThreads = 0;
                if (!ball.boundOrder) ball.boundOrder = [];
                ball.threadPulse = max(0, (ball.threadPulse || 0) - DT);
                
                // 清理已經死亡或被淨化的目標，並統計總層數
                ball.boundOrder = ball.boundOrder.filter(targetId => {
                    const b = engine.balls.find(x => x.uniqueId === targetId);
                    if (b && b.hp > 0 && b.threadStacks && b.threadStacks[ball.uniqueId] > 0) {
                        totalThreads += b.threadStacks[ball.uniqueId];
                        return true;
                    }
                    return false;
                });

                // 萬維交織：收束絲線
                if (totalThreads >= 12) {
                    engine.spawnParticle({ type: 'text', x: ball.x, y: ball.y - 40, text: '🕸️ 萬維交織！', color: '#E2E8F0', maxLifespan: 1.5 });
                    
                    const cx = engine.arenaSize / 2;
                    const cy = engine.arenaSize / 2;

                    ball.boundOrder.forEach(targetId => {
                        const b = engine.balls.find(x => x.uniqueId === targetId);
                        if (b && b.hp > 0 && b.threadStacks && b.threadStacks[ball.uniqueId] > 0) {
                            const stacks = b.threadStacks[ball.uniqueId];
                            
                            // 1. 造成傷害
                            engine.applyDamage(b, 5 * stacks, ball.uniqueId, 'magic');
                            engine.spawnParticle({ type: 'text', x: b.x, y: b.y - 30, text: `💥 收束 (${5 * stacks})`, color: '#94A3B8' });
                            
                            // 2. 往戰場中心收束的動能
                            const dist = Math.hypot(cx - b.x, cy - b.y);
                            if (dist > 0) {
                                const pullForce = 800 + (stacks * 150); // 層數越高，拉力越強
                                b.vx += ((cx - b.x) / dist) * pullForce;
                                b.vy += ((cy - b.y) / dist) * pullForce;
                                engine.applyStatus(b.uniqueId, 'thread_converge', { duration: 0.6, centerX: cx, centerY: cy, strength: 280 + stacks * 40 });
                            }
                            
                            // 3. 收束後清空該敵人的絲線
                            b.threadStacks[ball.uniqueId] = 0; 
                            b.threadFlash = 0.8;
                        }
                    });
                    
                    ball.boundOrder = [];
                    ball.threadPulse = 1.0;
                    totalThreads = 0;
                }
                
                ball.scalingValue = `絲線總數: ${totalThreads}/12`;
            }
          },
          dummy: { id:'dummy', faction:'Other', name:'巨大木樁', title:'測試用', color:'#8B4513', mass:15, radiusMult:3, desc:'無情靶子。', initLogic: b => { b.scalingValue=`木樁模式`; b.speedMult=0; }, modifyDamageOut: ()=>0 }
        };
