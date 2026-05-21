const CharacterOptions = () => (
          <React.Fragment>
            <optgroup label="命定之錨">{Object.values(ROSTER).filter(c=>c.faction==='AnchorOfDestiny').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
            <optgroup label="神性大教堂">{Object.values(ROSTER).filter(c=>c.faction==='DivineCathedral').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
            <optgroup label="時間總局">{Object.values(ROSTER).filter(c=>c.faction==='TimeAdmin').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
            <optgroup label="永滅故事集委員會">{Object.values(ROSTER).filter(c=>c.faction==='StorybookCommittee'&&c.id!=='dummy').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
            <optgroup label="明日公司">{Object.values(ROSTER).filter(c=>c.faction==='TomorrowCompany'&&c.id!=='fanatic_fan').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
          </React.Fragment>
        );


        const StatPanel = ({ stat, isDummy, isEndless, hpThreshold = 30 }) => {
            if (!stat) return null;
            const current = stat.hp;
            const maxHp = stat.maxHp;
            const erodedMaxHp = stat.erodedMaxHp || 0;
            const effMax = max(maxHp, current);
            const baseHp = min(current, maxHp);
            const overHp = max(0, current - maxHp);
            const basePct = (baseHp / effMax) * 100;
            const overPct = (overHp / effMax) * 100;
            const erodedPct = (erodedMaxHp / effMax) * 100;


            return (
                <div className="mt-1 p-2 bg-gray-900/80 rounded border border-gray-700/50">
                    <div className="flex justify-between text-[11px] font-bold mb-1"><span className="text-gray-400">HP/Max {erodedMaxHp>0&&<span className="text-gray-500 font-normal ml-1">(侵蝕 {floor((erodedMaxHp/maxHp)*100)}%)</span>}</span><span className={current<hpThreshold?'text-red-400':(overHp>0?'text-cyan-400':'text-emerald-400')}>{floor(current)} / {floor(maxHp-erodedMaxHp)}</span></div>
                    {stat.isSplit ? ( <div className="flex w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mb-1 relative"><div className="h-full bg-emerald-100 transition-all duration-200 border-r border-gray-900" style={{width:`${(min(stat.mainHp, maxHp) / effMax) * 100}%`}}></div><div className="h-full bg-emerald-500 transition-all duration-200" style={{width:`${(min(stat.phantomHp, maxHp) / effMax) * 100}%`}}></div>{overHp > 0 && <div className="h-full bg-cyan-400 transition-all duration-200 shadow-[0_0_8px_rgba(34,211,238,0.8)] border-l border-cyan-200/50" style={{width:`${overPct}%`}}></div>}{erodedMaxHp>0&&<div className="absolute top-0 right-0 h-full bg-gray-500 transition-all" style={{width:`${erodedPct}%`}}></div>}</div> ) : ( <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mb-1 relative flex"><div className="h-full bg-emerald-500 transition-all duration-200" style={{width:`${basePct}%`}}></div>{overHp > 0 && <div className="h-full bg-cyan-400 transition-all duration-200 shadow-[0_0_8px_rgba(34,211,238,0.8)] border-l border-cyan-200/50" style={{width:`${overPct}%`}}></div>}{erodedMaxHp>0&&<div className="absolute top-0 right-0 h-full bg-gray-500 transition-all" style={{width:`${erodedPct}%`}}></div>}</div> )}
                    {!(isDummy||isEndless) && ( <><div className="flex justify-between text-[10px] mt-2 text-yellow-300 font-semibold bg-gray-800/50 p-1.5 rounded border border-gray-700"><span>機制狀態</span><span className="text-right tracking-wide truncate">{stat.scale||'-'}</span></div><div className="flex justify-between text-[10px] text-gray-400 border-t border-gray-700/50 pt-1 mt-1"><span>總傷害: <span className="text-indigo-300 font-bold">{stat.totalDmg}</span></span><span>DPS: <span className="text-orange-300 font-bold">{stat.dps}</span></span></div></> )}
                </div>
            );
        };

        const getTeamSlotCount = (mode, team) => {
            if (mode === '3v3') return 3;
            if (mode === 'regen') return 4;
            if (mode === '1v4') return team === 'p1' ? 4 : 1;
            return 4;
        };


        function App() {
          const canvasRef = useRef(null), engineRef = useRef(null), isPausedRef = useRef(false), speedRef = useRef(1), soundRef = useRef(createSoundManager());
          const [gameState, setGameState] = useState('menu'), [gameMode, setGameMode] = useState('ffa'), [scene, setScene] = useState('default'), [testType, setTestType] = useState('dummy'), [ffaCount, setFfaCount] = useState(2);
          const [ffaIds, setFfaIds] = useState(['kongmie', 'topiharin', 'grimm', 'eli', 'fasimir']), [ffaLocks, setFfaLocks] = useState([false, false, false, false, false]);
          const [p1Ids, setP1Ids] = useState(['kongmie', 'topiharin', 'grimm', 'eli']), [p2Ids, setP2Ids] = useState(['fasimir', 'ecmo', 'creator', 'lisi']);
          const [p1Locks, setP1Locks] = useState([false, false, false, false]), [p2Locks, setP2Locks] = useState([false, false, false, false]);
          const [isPaused, setIsPaused] = useState(false), [gameSpeed, setGameSpeed] = useState(1), [uiStats, setUiStats] = useState({p1:[],p2:[]}), [winner, setWinner] = useState(null), [soundEnabled, setSoundEnabled] = useState(true);


          const wakeAudio = () => soundRef.current.unlock();
          const togglePause = () => { isPausedRef.current=!isPausedRef.current; setIsPaused(isPausedRef.current); };
          const toggleSpeed = () => { const ns=gameSpeed===1?2:1; setGameSpeed(ns); speedRef.current=ns; };
          const goToMenu = () => { setGameState('menu'); setIsPaused(false); isPausedRef.current=false; setGameSpeed(1); speedRef.current=1; setWinner(null); };
          const toggleSound = () => { wakeAudio(); setSoundEnabled(prev => !prev); };

          useEffect(() => {
              soundRef.current.setEnabled(soundEnabled);
          }, [soundEnabled]);


          const triggerIntervention = type => {
              const e=engineRef.current; if(!e)return;
              if(type==='heal'){ for(let i=0;i<3;i++) e.spawnObstacle({type:'sacrament',x:50+random()*(e.arenaSize-100),y:50+random()*(e.arenaSize-100),radius:12,color:'#FBBF24',lifespan:10,ownerId:'god'}); sTxt(e,e.arenaSize/2,e.arenaSize/2,'✨ 天降聖餐','#FBBF24',0,2); }
              else if(type==='bomb'){ for(let i=0;i<6;i++) e.spawnProjectile({type:'bomb',x:50+random()*(e.arenaSize-100),y:50+random()*(e.arenaSize-100),vx:0,vy:0,radius:14,color:'#DC143C',ownerId:'god',damage:0,bounces:0,lifespan:0.5+random()*1.5,onDeath:(p,en)=>en.spawnObstacle({type:'damage_field',x:p.x,y:p.y,radius:120,color:'rgba(220,20,60,0.2)',ownerId:'god',team:'none',lifespan:4})}); sTxt(e,e.arenaSize/2,e.arenaSize/2,'☄️ 天降火雨','#DC143C',0,2); }
              else if(type==='chaos'){ e.balls.forEach(b=>{if(b.hp>0&&!b.isBlank){b.vx=(random()-.5)*2000; b.vy=(random()-.5)*2000; e.applyStatus(b.uniqueId,'knockback',{duration:1.5,sourceId:'god'});}}); sTxt(e,e.arenaSize/2,e.arenaSize/2,'🌀 混亂風暴','#8B5CF6',0,2); }
              else if(type==='stun'){ e.balls.forEach(b=>{if(b.hp>0&&!b.isBlank)e.applyStatus(b.uniqueId,'stun',{duration:2.5});}); sTxt(e,e.arenaSize/2,e.arenaSize/2,'⏳ 時間凍結','#FCD34D',0,2); }
              else if(type==='rule_damage'){ e.globalDamageMultiplier=e.globalDamageMultiplier===2?1:2; sTxt(e,e.arenaSize/2,e.arenaSize/2,e.globalDamageMultiplier===2?'⚔️ 死鬥法則：開啟 (200% 傷害)':'🛡️ 死鬥法則：關閉 (正常傷害)','#EF4444',0,2); }
          };


          const startGame = () => {
            wakeAudio();
            const engine = {
              arenaSize: (gameMode==='3v3'||gameMode==='1v4'||gameMode==='regen')?900:600, scene: gameMode==='3v3'?scene:'default', balls:[], projectiles:[], waves:[], particles:[], obstacles:[], time:0, timeLimit:null, healthPackTimer:0, globalDamageMultiplier:1, globalLostHp:0,
              teamDeathCounts: {p1:0, p2:0},
              teamFleshMaterials: {},
              sound: (name, options) => soundRef.current.play(name, options),
              applyRandomPodoasgEffect: (tg, src, nx=0, ny=0, mul=1) => { const ef=['stun','slow','rooted','burn','knockback','warning','silenced','vulnerable','damage'][floor(random()*9)]; if(ef==='stun'){engine.applyStatus(tg.uniqueId,'stun',{duration:3*mul}); sTxt(engine,tg.x,tg.y,'💫 暈眩','#FCD34D');} else if(ef==='slow'){engine.applyStatus(tg.uniqueId,'slow',{duration:3*mul}); sTxt(engine,tg.x,tg.y,'🐌 緩速','#3B82F6');} else if(ef==='rooted'){engine.applyStatus(tg.uniqueId,'rooted',{duration:3*mul}); sTxt(engine,tg.x,tg.y,'⛓️ 禁錮','#4ADE80');} else if(ef==='burn'){engine.applyStatus(tg.uniqueId,'burn',{duration:3*mul,dps:5*mul,sourceId:src}); sTxt(engine,tg.x,tg.y,'🔥 燃燒','#EF4444');} else if(ef==='knockback'){engine.applyStatus(tg.uniqueId,'knockback',{duration:3,sourceId:src}); tg.vx+=nx*800*mul; tg.vy+=ny*800*mul; sTxt(engine,tg.x,tg.y,'💨 擊退','#94A3B8');} else if(ef==='warning'){engine.applyStatus(tg.uniqueId,'warning',{duration:3*mul}); sTxt(engine,tg.x,tg.y,'⚠️ 警告','#FF00FF');} else if(ef==='silenced'){engine.applyStatus(tg.uniqueId,'silenced',{duration:3*mul}); sTxt(engine,tg.x,tg.y,'🔇 沉默','#9333EA');} else if(ef==='vulnerable'){engine.applyStatus(tg.uniqueId,'vulnerable',{duration:3*mul}); sTxt(engine,tg.x,tg.y,'💔 易傷','#EF4444');} else if(ef==='damage'){engine.applyDamage(tg,10*mul,src,'magic'); sTxt(engine,tg.x,tg.y,'💥 傷害','#EF4444');} },
              spawnProjectile: p => { soundRef.current.playProjectile(p); engine.projectiles.push(p); }, spawnWave: w => { w.currentRadius=w.startRadius||0; w.hitSet=new Set(); w.lingerTimer=0; soundRef.current.playWave(w); engine.waves.push(w); }, spawnParticle: p => engine.particles.push({...p,lifespan:p.maxLifespan||1.5,maxLifespan:p.maxLifespan||1.5}), spawnObstacle: o => { soundRef.current.playObstacle(o); engine.obstacles.push(o); },
              applyHeal: (t, a, src, allowOverheal = false) => {
                 if(t.hp<=0||t.isBlank)return;
                 let canOverheal = false;
                 if(allowOverheal && engine.balls.some(x => x.team === t.team && x.hp > 0 && (x.id === 'ecmo' || x.copied === 'ecmo'))) {
                     canOverheal = true;
                 }


                 const effectiveMaxHp = canOverheal ? (t.maxHp + 100) : t.maxHp;
                 const h = min(effectiveMaxHp - t.hp, a);
                 if(h<=0)return;
                 t.hp+=h; t._hA=(t._hA||0)+h;
                 if(t._hA>=1){const s=floor(t._hA); engine.spawnParticle({type:'floating_number',x:t.x+(random()-.5)*20,y:t.y-t.radius,text:`+${s}`,color:'#10B981',vx:(random()-.5)*40,vy:-80-random()*40,maxLifespan:0.8}); t._hA-=s;}
              },
              applyDamage: (t, a, src, dT='normal') => { if(t.hp<=0)return 0; const sIdx=t.statuses.findIndex(s=>s.type==='shield'); if(sIdx!==-1&&!['burn','dot'].includes(dT)){t.statuses.splice(sIdx,1);sTxt(engine,t.x,t.y+5,'🛡️ 免疫','#CBD5E1');return 0;} let fd=a*engine.globalDamageMultiplier; if(t.statuses){if(t.statuses.some(s=>s.type==='vulnerable'))fd*=1.2;if(t.statuses.some(s=>s.type==='shield_dr'))fd*=0.8;} if(t.onTakeDamage)fd=max(0,t.onTakeDamage(t,fd,src,engine,dT)); const ls=min(t.hp,fd); engine.globalLostHp=(engine.globalLostHp||0)+ls; t._dA=(t._dA||0)+fd; if(t._dA>=1){const s=floor(t._dA);engine.spawnParticle({type:'floating_number',x:t.x+(random()-.5)*20,y:t.y-t.radius,text:`-${s}`,color:'#EF4444',vx:(random()-.5)*40,vy:-80-random()*40,maxLifespan:0.8});t._dA-=s;} if(fd>0){ if(dT==='collision')engine.sound('collision',{intensity:Math.min(1.8, fd/6)}); else if(dT==='wall_collision')engine.sound('wallHit',{intensity:Math.min(2, fd/8)}); else if(dT==='projectile')engine.sound('projectileHit',{intensity:Math.min(1.6, fd/5)}); } if(['collision','wall_collision','projectile'].includes(dT)&&fd>0)engine.applyStatus(t.uniqueId,'hitstop',{duration:0.08}); if(t.hp-fd<=0&&(t.id==='kongmie'||t.copied==='kongmie')&&t.act===1){t.hp=t.maxHp;t.act=2;t.path='A';t.waveTimer=0;sTxt(engine,t.x,t.y-40,'第二幕·見那狂風驟雨','#3B82F6');return 0;} if(t.hp-fd<=0&&(t.id==='melis'||t.copied==='melis')&&!t.hasRevived){t.hp=0.1;engine.applyHeal(t,max(1,(t.damageDealt||0)/3));t.hasRevived=true;engine.sound('rebirth');sTxt(engine,t.x,t.y-30,'🔥浴火重生','#FF6B35');engine.spawnWave({x:t.x,y:t.y,startRadius:t.radius,maxRadius:450,speed:700,color:'rgba(255,69,0,0.6)',ownerId:t.uniqueId,lingerDuration:0.1,onHit:tg=>{if(engine.isEnemy(tg.uniqueId,t.uniqueId)){const bs=tg.statuses?.find(s=>s.type==='burn');if(bs&&bs.timer<bs.duration)engine.applyDamage(tg,bs.dps*(bs.duration-bs.timer),t.uniqueId,'magic'); engine.applyStatus(tg.uniqueId,'burn',{duration:3,dps:t.burnDamage,sourceId:t.uniqueId});t.burnDamage+=0.4*(t.noGrowth?0:1);t.scalingValue=`燃燒秒傷: ${t.burnDamage.toFixed(1)}`;}}});return 0;}
              if(t.hp-fd<=0&&engine.scene==='court'&&engine.judgeId===t.uniqueId){engine.judgeId=engine.plaintiffTeam=null;engine.spawnObstacle({type:'gavel',x:t.x,y:t.y,radius:25,color:'#A8A29E',lifespan:99999});sTxt(engine,t.x,t.y-40,'⚖️ 法槌掉落！','#D6D3D1');}


              if(t.hp-fd<=0) {
                 const hasEcmoAlive = engine.balls.some(x=>x.team===t.team&&x.hp>0&&(x.id==='ecmo'||x.copied==='ecmo'));
                 const hasPrism = hasEcmoAlive && ['abraham','isaac','eli','miller','topiharin','kongmie','hao'].some(id => engine.balls.some(x=>x.team===t.team&&x.hp>0&&(x.id===id||x.copied===id)));
                 if(hasPrism && !t.hasUsedPrismRevive) {
                     t.hasUsedPrismRevive = true;
                     t.hp = t.maxHp * 0.5;
                     sTxt(engine, t.x, t.y-40, '💎 稜鏡復活！', '#D8B4FE');
                     engine.spawnWave({x:t.x,y:t.y,startRadius:0,maxRadius:200,speed:500,color:'rgba(216, 180, 254, 0.5)',ownerId:t.uniqueId,lingerDuration:0.2});
                     return 0;
                 }


                 if(gameMode === 'regen' && t.isMain) {
                    engine.teamDeathCounts[t.team]++;
                    t.hp = t.maxHp;
                    t.x = engine.arenaSize/2 + (random()-.5)*200;
                    t.y = t.team === 'p1' ? 100 : engine.arenaSize-100;
                    t.vx = t.vy = 0;
                    sTxt(engine, t.x, t.y-40, '♻️ 再生！', '#34D399');
                    engine.applyStatus(t.uniqueId, 'shield', {duration: 3});
                    return 0;
                 }
              }


              t.hp-=fd; if(src&&fd>0){const sb=engine.balls.find(b=>b.uniqueId===src);let as=sb;if(sb&&sb.summonerId)as=engine.balls.find(b=>b.uniqueId===sb.summonerId)||sb;if(as){as.damageDealt=(as.damageDealt||0)+fd; if(as.onDealDamage)as.onDealDamage(as, fd, t, engine);}} return fd; },
              applyStatus: (tid, type, d) => { const t=engine.balls.find(b=>b.uniqueId===tid); if(t){if(!t.statuses)t.statuses=[]; const e=t.statuses.find(s=>s.type===type); if(e){e.duration=d.duration;e.timer=0;if(d.dps)e.dps=d.dps;if(d.dx)e.dx=d.dx;if(d.dy)e.dy=d.dy;if(d.sourceId)e.sourceId=d.sourceId;}else { soundRef.current.playStatus(type); t.statuses.push({...d,type,timer:0}); }} },
              isEnemy: (i1, i2) => { const b1=engine.balls.find(b=>b.uniqueId===i1), b2=engine.balls.find(b=>b.uniqueId===i2); return !b1||!b2||b1.team!==b2.team; },
              getNearestEnemy: (src) => { let nr=null, md=Infinity; engine.balls.forEach(b=>{if(b.hp>0&&!b.isUntargetable&&engine.isEnemy(b.uniqueId,src.uniqueId)&&!b.isBlank){const d=distance(b.x,b.y,src.x,src.y);if(d<md){md=d;nr=b;}}}); return nr; },
              createBall: (tmp, tm, uid, isM=false, mHp=100, x, y) => { const b={...tmp,uniqueId:uid,team:tm,isMain:isM,hp:mHp,maxHp:mHp,baseMaxHp:mHp,erodedMaxHp:0,x,y,vx:(random()-.5)*BASE_SPEED,vy:(random()-.5)*BASE_SPEED,radius:BALL_RADIUS*(tmp.radiusMult||1),statuses:[],damageDealt:0}; if(b.initLogic)b.initLogic(b); ['birdTimer','bellTimer','pageTimer','skillTimer','musicTimer','wordTimer','daggerTimer','beamTimer','photoTimer','coreTimer','sacramentTimer','creatorTimer'].forEach(k=>{if(b[k]!==undefined)b[k]-=random()*1.5;}); return b; },
              init: () => { engine.balls=[]; engine.projectiles=[]; engine.waves=[]; engine.particles=[]; engine.obstacles=[]; engine.time=engine.healthPackTimer=engine.globalLostHp=0; if(engine.scene==='court')engine.spawnObstacle({type:'gavel',x:engine.arenaSize/2,y:engine.arenaSize/2,radius:25,color:'#A8A29E',lifespan:99999}); if(gameMode==='ffa')for(let i=0;i<ffaCount;i++)engine.balls.push(engine.createBall(ROSTER[ffaIds[i]],`p${i+1}`,`p${i+1}_m`,true,100,engine.arenaSize/2+cos(i*(PI*2/ffaCount)-PI/2)*engine.arenaSize*0.35,engine.arenaSize/2+sin(i*(PI*2/ffaCount)-PI/2)*engine.arenaSize*0.35)); else if(gameMode==='intervention'){engine.balls.push(engine.createBall(ROSTER[p1Ids[0]],'p1','p1_m',true,100,engine.arenaSize*.25,engine.arenaSize/2));engine.balls.push(engine.createBall(ROSTER[p2Ids[0]],'p2','p2_m',true,100,engine.arenaSize*.75,engine.arenaSize/2));} else if(gameMode==='3v3'){p1Ids.slice(0,3).forEach((id,i)=>engine.balls.push(engine.createBall(ROSTER[id],'p1',`p1_m_${i}`,true,500,engine.arenaSize*.2,engine.arenaSize*(.25+i*.25))));p2Ids.slice(0,3).forEach((id,i)=>engine.balls.push(engine.createBall(ROSTER[id],'p2',`p2_m_${i}`,true,500,engine.arenaSize*.8,engine.arenaSize*(.25+i*.25))));} else if(gameMode==='1v4'){p1Ids.slice(0,4).forEach((id,i)=>engine.balls.push(engine.createBall(ROSTER[id],'p1',`p1_m_${i}`,true,250,engine.arenaSize*.2,engine.arenaSize*(.2+i*.2))));const bs=engine.createBall(ROSTER[p2Ids[0]],'p2','p2_b',true,5000,engine.arenaSize*.8,engine.arenaSize/2);bs.radiusMult=(ROSTER[p2Ids[0]].radiusMult||1)*3;bs.radius=BALL_RADIUS*bs.radiusMult;bs.mass=(ROSTER[p2Ids[0]].mass||1)*10;bs.isBoss=true;engine.balls.push(bs);} else if(gameMode==='test'){engine.dpsRecords=[];engine.lastRecordTime=0;engine.balls.push(engine.createBall(ROSTER[p1Ids[0]],'p1','p1_m',true,100,engine.arenaSize*.25,engine.arenaSize/2));if(testType==='dummy'){engine.timeLimit=120;engine.balls.push(engine.createBall(ROSTER['dummy'],'p2','p2_m',true,5000,engine.arenaSize*.75,engine.arenaSize/2));}else{engine.endlessWave=1;engine.balls.push(engine.createBall(ROSTER['endless_minion'],'p2',`e_1`,true,1,engine.arenaSize/2,60));}} else if(gameMode==='regen'){p1Ids.slice(0,4).forEach((id,i)=>engine.balls.push(engine.createBall(ROSTER[id],'p1',`p1_m_${i}`,true,250,engine.arenaSize*.2,engine.arenaSize*(.2+i*.2))));p2Ids.slice(0,4).forEach((id,i)=>engine.balls.push(engine.createBall(ROSTER[id],'p2',`p2_m_${i}`,true,250,engine.arenaSize*.8,engine.arenaSize*(.2+i*.2))));} },
              update: () => {
                engine.time+=DT;
                if(gameMode==='regen') {
                   if(engine.teamDeathCounts.p1 >= 20) return 'p2';
                   if(engine.teamDeathCounts.p2 >= 20) return 'p1';
                }
                if(gameMode==='test'){if(testType==='dummy'&&engine.timeLimit!==null){if((engine.timeLimit-=DT)<=0)return 'p2';} if(engine.time-engine.lastRecordTime>=30){engine.lastRecordTime+=30;const p1=engine.balls.find(b=>b.team==='p1'&&b.isMain);if(p1){const d=(p1.damageDealt||0)/engine.time;engine.dpsRecords.push({time:engine.lastRecordTime,dps:d.toFixed(1)});engine.spawnParticle({type:'text',x:engine.arenaSize/2,y:engine.arenaSize/4,text:`${engine.lastRecordTime}s 紀錄: ${d.toFixed(1)} DPS`,color:'#FCD34D',maxLifespan:3});}} if(testType==='endless'&&engine.balls.filter(b=>b.team==='p2'&&b.hp>0).length===0){engine.endlessWave++;engine.balls=engine.balls.filter(b=>b.team!=='p2');engine.balls.push(engine.createBall(ROSTER['endless_minion'],'p2',`e_${engine.endlessWave}`,true,engine.endlessWave,engine.arenaSize/2,60));}}
                if((engine.healthPackTimer+=DT)>=30){engine.healthPackTimer=0;engine.spawnObstacle({type:'health_pack',x:50+random()*(engine.arenaSize-100),y:50+random()*(engine.arenaSize-100),radius:15,color:'#10B981',lifespan:14});}
                engine.balls.forEach(b=>{b.inQuzheDomain=false;if(b.baseMaxHp===undefined)b.baseMaxHp=b.maxHp;if(b.erodedMaxHp===undefined)b.erodedMaxHp=0;if(b.portalCooldown>0)b.portalCooldown-=DT;if(b.threadFlash>0)b.threadFlash=max(0,b.threadFlash-DT);});


                engine.balls.forEach(b => { if(b.hp<=0)return; const aS=new Set((b.statuses||[]).map(s=>s.type)), isH=aS.has('hitstop');
                  if(!isH){ b.x+=b.vx*DT; b.y+=b.vy*DT; } let bW=false, iS=0;
                  if(b.wallWrap){ let wp=false,ox=b.x,oy=b.y,as=engine.arenaSize,r=b.radius; if(b.x-r<0){b.x=as-r-1;wp=true;}else if(b.x+r>as){b.x=r+1;wp=true;} if(b.y-r<0){b.y=as-r-1;wp=true;}else if(b.y+r>as){b.y=r+1;wp=true;} if(wp&&!isH&&b.onWallBounce)b.onWallBounce(b,engine,ox,oy); }
                  else{ const as=engine.arenaSize, r=b.radius; if(b.x-r<0){b.x=r;iS=abs(b.vx);b.vx*=-1;bW=true;}else if(b.x+r>as){b.x=as-r;iS=abs(b.vx);b.vx*=-1;bW=true;} if(b.y-r<0){b.y=r;iS=max(iS,abs(b.vy));b.vy*=-1;bW=true;}else if(b.y+r>as){b.y=as-r;iS=max(iS,abs(b.vy));b.vy*=-1;bW=true;}
                    if(bW&&!isH){ if(b.onWallBounce)b.onWallBounce(b,engine); engine.balls.forEach(tb=>{if(tb.hp>0&&tb.currentPhase===4&&(tb.id==='topiharin'||tb.copied==='topiharin')&&engine.isEnemy(b.uniqueId,tb.uniqueId)&&!b.isBlank)engine.spawnWave({x:b.x,y:b.y,startRadius:0,maxRadius:150,speed:600,color:'rgba(255,20,147,0.4)',ownerId:tb.uniqueId,lingerDuration:0.1,onHit:t=>{if(engine.isEnemy(t.uniqueId,tb.uniqueId))engine.applyDamage(t,10,tb.uniqueId,'magic');}});}); const kS=b.statuses?.find(s=>s.type==='knockback'), th=BASE_SPEED+200; if(kS&&iS>th){engine.applyDamage(b,min(b.maxHp*.35,Math.pow(iS-th,.7)*.45),kS.sourceId,'wall_collision');b.statuses=b.statuses.filter(s=>s.type!=='knockback');} }
                  }
                  if(b.statuses){ let cSM=1; b.statuses.forEach(s=>{ s.timer+=DT; if(s.type==='burn'&&s.dps)engine.applyDamage(b,s.dps*DT,s.sourceId,'burn'); if(s.type==='slow')cSM=0.5; if(s.type==='haste')cSM*=1.5; if(s.type==='haste_double')cSM*=2; if(s.type==='stun')cSM=0.05; if(s.type==='rooted'||s.type==='hitstop')cSM=0; if(s.type==='regen')engine.applyHeal(b,5*DT); if(s.type==='regen_small')engine.applyHeal(b,3.75*DT); if(s.type==='bell_shock'&&!isH){b.vx+=s.dx*600*DT; b.vy+=s.dy*600*DT;} if(s.type==='thread_converge'&&!isH){const dx=s.centerX-b.x,dy=s.centerY-b.y,d=hypot(dx,dy)||1;b.vx+=(dx/d)*(s.strength||280)*DT;b.vy+=(dy/d)*(s.strength||280)*DT;} }); if(!isH){const tS=BASE_SPEED*(b.speedMult||1)*cSM, cS=hypot(b.vx,b.vy); if(cS>0){const ns=cS*(1-(cS>tS?.015:.05))+tS*(cS>tS?.015:.05);b.vx=(b.vx/cS)*ns;b.vy=(b.vy/cS)*ns;}} b.statuses=b.statuses.filter(s=>s.timer<s.duration); }
                  if(engine.scene==='court'&&engine.judgeId&&!b.isBlank&&gameMode!=='ffa'){ engine.applyStatus(b.uniqueId,b.team===engine.plaintiffTeam?'haste':'slow',{duration:0.1}); if(b.uniqueId!==engine.judgeId){const iO=!(distance(b.x,b.y,engine.arenaSize/2,engine.arenaSize/2)<=130||abs(b.x-engine.arenaSize/2)<=55)?(b.team==='p1'?(b.x>engine.arenaSize/2+55):(b.x<engine.arenaSize/2-55)):false; if(iO&&!b.wasInO){engine.applyStatus(b.uniqueId,'silenced',{duration:1});sTxt(engine,b.x,b.y-20,'⚖️ 肅靜！','#D6D3D1',0,1);} b.wasInO=iO; } }
                  if(b.update&&!aS.has('silenced')&&!isH) b.update(b,engine);
                });


                for(let i=engine.obstacles.length-1;i>=0;i--){ const o=engine.obstacles[i];
                  if(o.type==='horizon_zone'){const ow=engine.balls.find(b=>b.uniqueId===o.ownerId); if(!ow||ow.hp<=0)o.lifespan=0; else if(!ow.ultimate){engine.balls.forEach(b=>{if(b.hp>0&&!b.isBlank&&engine.isEnemy(b.uniqueId,o.ownerId)){const d=distance(b.x,b.y,o.x,o.y);if(d<o.radius+b.radius){let nx=(b.x-o.x)/d||1,ny=(b.y-o.y)/d||0,dot=b.vx*nx+b.vy*ny;if(dot<0){b.vx-=2*dot*nx;b.vy-=2*dot*ny;}b.x+=nx*(o.radius+b.radius-d);b.y+=ny*(o.radius+b.radius-d);}}});engine.projectiles.forEach(p=>{if(engine.isEnemy(p.ownerId,o.ownerId)){const d=distance(p.x,p.y,o.x,o.y);if(d<o.radius+p.radius){let nx=(p.x-o.x)/d||1,ny=(p.y-o.y)/d||0,dot=p.vx*nx+p.vy*ny;if(dot<0){p.vx-=2*dot*nx;p.vy-=2*dot*ny;}p.x+=nx*(o.radius+p.radius-d);p.y+=ny*(o.radius+p.radius-d);}}});}}
                  else if(o.type==='podoasg_wall'){engine.balls.forEach(b=>{if(b.hp>0&&!b.isBlank){const d=distance(b.x,b.y,o.x,o.y);if(d<o.radius+b.radius){if(engine.isEnemy(b.uniqueId,o.ownerId)){let nx=(b.x-o.x)/d||1,ny=(b.y-o.y)/d||0,dot=b.vx*nx+b.vy*ny;if(dot<0){b.vx-=2*dot*nx;b.vy-=2*dot*ny;}b.x+=nx*(o.radius+b.radius-d);b.y+=ny*(o.radius+b.radius-d);if(!o.hitSet)o.hitSet=new Set();if(!o.hitSet.has(b.uniqueId)){o.hitSet.add(b.uniqueId);if(engine.applyRandomPodoasgEffect)engine.applyRandomPodoasgEffect(b,o.ownerId,nx,ny,2);}}else{if(!o.buffSet)o.buffSet=new Set();if(!o.buffSet.has(b.uniqueId)){o.buffSet.add(b.uniqueId);const bf=['haste','regen','shield','excited','heal'][floor(random()*5)];if(bf==='heal'){engine.applyHeal(b,40);sTxt(engine,b.x,b.y-30,'💚 恢復','#10B981');}else{engine.applyStatus(b.uniqueId,bf,{duration:6});sTxt(engine,b.x,b.y-30,{'haste':'⚡ 加速','regen':'✨ 再生','shield':'🛡️ 護盾','excited':'🔥 激昂'}[bf],{'haste':'#38BDF8','regen':'#34D399','shield':'#CBD5E1','excited':'#FCD34D'}[bf]);}}}}else{if(o.buffSet&&o.buffSet.has(b.uniqueId))o.buffSet.delete(b.uniqueId);}}});}
                  else if(o.type==='portal'){const tp=engine.obstacles.find(x=>x.type==='portal'&&x.portalId===o.targetId); if(tp&&tp.lifespan>0&&o.lifespan>0){const d=distance(o.x,o.y,tp.x,tp.y);if(d<15){o.lifespan=tp.lifespan=0;const ow=engine.balls.find(b=>b.uniqueId===o.ownerId);if(ow&&ow.isUndead){const dmg=ow.negativeHpDebt;ow.negativeHpDebt=0;const ex=(o.x+tp.x)/2,ey=(o.y+tp.y)/2;engine.spawnWave({x:ex,y:ey,startRadius:0,maxRadius:250,speed:1000,color:'rgba(168,85,247,0.8)',ownerId:ow.uniqueId,lingerDuration:0.2,deflectsProjectiles:true,onHit:t=>{if(dmg>0&&engine.isEnemy(t.uniqueId,ow.uniqueId))engine.applyDamage(t,dmg*max(.1,1-distance(ex,ey,t.x,t.y)/250),ow.uniqueId,'magic');}});engine.spawnParticle({type:'collapse',x:ex,y:ey,maxRadius:250,maxLifespan:0.5});if(dmg>0)sTxt(engine,ex,ey-30,`💥 崩落 (${floor(dmg)})`,'#E9D5FF',0,1.5);}}else{const n=normalize(tp.x-o.x,tp.y-o.y),s=max(10,d*0.4);o.x+=n.x*s*DT;o.y+=n.y*s*DT;}}else if(!tp)o.lifespan=0; if(o.lifespan>0)engine.balls.forEach(b=>{if(b.hp>0&&!b.isBlank&&!b.isChessPiece&&distance(b.x,b.y,o.x,o.y)<=o.radius+b.radius&&(b.portalCooldown||0)<=0&&tp){b.x=tp.x;b.y=tp.y;b.portalCooldown=1;if(engine.isEnemy(b.uniqueId,o.ownerId))engine.applyDamage(b,1,o.ownerId,'portal');else engine.applyHeal(b,1);sTxt(engine,b.x,b.y-30,'🌀 穿梭','#D8B4FE');}});}
                  else if(o.type==='quzhe_domain'||o.type==='quzhe_rift'){if(o.radius<o.maxRadius)o.radius+=o.expandSpeed*DT; if(o.tears)o.tears.forEach(t=>{if(t.length<o.maxRadius*0.8)t.length+=t.speed*DT;}); engine.balls.forEach(b=>{if(b.hp>0&&!b.isBlank&&engine.isEnemy(b.uniqueId,o.ownerId)){const d=distance(b.x,b.y,o.x,o.y);let ins=d<=o.radius+b.radius; if(!ins&&o.tears)for(let t of o.tears){let aD=abs(atan2(b.y-o.y,b.x-o.x)-t.angle);while(aD>PI)aD-=PI*2;if(abs(aD)<0.35&&d<=o.radius+t.length+b.radius){ins=true;break;}} if(ins){b.inQuzheDomain=true;b.currentErosionRate=o.erosionRate||0.02;}}});}
                  else if(o.type==='heal_field')engine.balls.forEach(b=>{if(b.hp>0&&b.team===o.team&&distance(b.x,b.y,o.x,o.y)<=o.radius+b.radius)engine.applyHeal(b,(o.healAmount||3)*DT);});
                  else if(o.type==='damage_field')engine.balls.forEach(b=>{if(b.hp>0&&(engine.isEnemy(b.uniqueId,o.ownerId)||o.ownerId==='god')&&distance(b.x,b.y,o.x,o.y)<=o.radius+b.radius&&!b.isBlank)engine.applyDamage(b,5*DT,o.ownerId,'magic');});
                  else if(o.type==='balance_ring')engine.balls.forEach(b=>{if(b.hp>0&&engine.isEnemy(b.uniqueId,o.ownerId)&&!b.isBlank){const d=distance(b.x,b.y,o.x,o.y);if(d+b.radius>o.radius){const nx=(b.x-o.x)/d||1,ny=(b.y-o.y)/d||0,dot=b.vx*nx+b.vy*ny;if(dot>0){b.vx-=2*dot*nx;b.vy-=2*dot*ny;}b.x-=nx*(d+b.radius-o.radius);b.y-=ny*(d+b.radius-o.radius);}}});
                  else if(o.type==='health_pack')engine.balls.forEach(b=>{if(b.hp>0&&!b.isBlank&&distance(b.x,b.y,o.x,o.y)<=o.radius+b.radius){engine.applyHeal(b,['3v3','1v4','regen'].includes(gameMode)?50:25);o.lifespan=0;}});
                  else if(o.type==='sacrament'){const ow=engine.balls.find(b=>b.uniqueId===o.ownerId);if(ow){const n=normalize(ow.x-o.x,ow.y-o.y);o.x+=n.x*40*DT;o.y+=n.y*40*DT;} engine.balls.forEach(b=>{if(b.hp>0&&!b.isBlank&&distance(b.x,b.y,o.x,o.y)<=o.radius+b.radius){engine.applyHeal(b,20);o.lifespan=0;}});}
                  else if(o.type==='gavel')engine.balls.forEach(b=>{if(b.hp>0&&!b.isBlank&&distance(b.x,b.y,o.x,o.y)<=o.radius+b.radius){engine.judgeId=b.uniqueId;engine.plaintiffTeam=b.team;o.lifespan=0;sTxt(engine,b.x,b.y-40,'⚖️ 法官就位！','#D6D3D1');}});
                  else if(o.type==='paint_puddle')engine.balls.forEach(b=>{if(b.hp>0&&!b.isBlank&&distance(b.x,b.y,o.x,o.y)<=o.radius+b.radius){const iE=engine.isEnemy(b.uniqueId,o.ownerId);if(o.paintType==='blue')engine.applyStatus(b.uniqueId,iE?'slow':'haste',{duration:0.2});else if(o.paintType==='yellow')engine.applyStatus(b.uniqueId,iE?'vulnerable':'shield_dr',{duration:0.2});else if(o.paintType==='green'){if(iE){b.vx+=(random()-.5)*1200*DT;b.vy+=(random()-.5)*1200*DT;}else engine.applyStatus(b.uniqueId,'regen_small',{duration:0.2});}}});
                  else if(o.type==='thought_core')engine.balls.forEach(b=>{if(b.hp>0&&!b.isBlank&&o.lifespan>0&&distance(b.x,b.y,o.x,o.y)<=o.radius+b.radius){const ow=engine.balls.find(x=>x.uniqueId===o.ownerId);if(ow&&!ow.isSlashing&&!ow.isGathering&&!ow.noGrowth){ow.collectedCores++;ow.scalingValue=`念核: ${ow.collectedCores}/12 | 受擊: ${ow.hitCount}`;} if(b.uniqueId!==o.ownerId){if(engine.isEnemy(b.uniqueId,o.ownerId))engine.applyDamage(b,5,o.ownerId,'magic');else engine.applyHeal(b,5);}o.lifespan=0;}});
                  if(o.lifespan!==99999&&o.lifespan!==9999&&((o.lifespan-=DT)<=0)) engine.obstacles.splice(i,1);
                }


                engine.balls.forEach(b=>{ if(b.hp<=0||b.isBlank)return; if(b.inQuzheDomain){b.erodedMaxHp+=b.baseMaxHp*(b.currentErosionRate||0.02)*DT;if(b.erodedMaxHp>=b.baseMaxHp){b.erodedMaxHp=b.baseMaxHp;if(b.hp>0){b.hp=0;sTxt(engine,b.x,b.y-30,'💀 侵蝕殆盡!','#059669',0,2);}}}else if(b.erodedMaxHp>0)b.erodedMaxHp=max(0,b.erodedMaxHp-b.baseMaxHp*0.01*DT); b.maxHp=b.baseMaxHp-b.erodedMaxHp; if(b.hp>b.maxHp+100&&b.hp>0)b.hp=b.maxHp+100; });


                for(let i=0;i<engine.balls.length;i++){ for(let j=i+1;j<engine.balls.length;j++){ const b1=engine.balls[i], b2=engine.balls[j]; if(b1.hp<=0||b2.hp<=0||b1.isBlank||b2.isBlank||(b1.phantomId===b2.uniqueId||b2.phantomId===b1.uniqueId||b1.mainId===b2.uniqueId||b2.mainId===b1.uniqueId))continue;
                  if(b1.isChessPiece||b2.isChessPiece){const d=distance(b1.x,b1.y,b2.x,b2.y); if(d<b1.radius+b2.radius){const p=b1.isChessPiece?b1:b2, o=b1.isChessPiece?b2:b1; if(p.isChessPiece&&o.isChessPiece)continue; if(engine.isEnemy(p.ownerId,o.uniqueId)){const nx=(o.x-p.x)/d||1,ny=(o.y-p.y)/d||0,dot=o.vx*nx+o.vy*ny;if(dot<0){o.vx-=2*dot*nx;o.vy-=2*dot*ny;}o.x+=nx*(p.radius+o.radius-d);o.y+=ny*(p.radius+o.radius-d);if((p.blockCooldowns[o.uniqueId]||0)<=0){p.blockCooldowns[o.uniqueId]=0.5;engine.applyDamage(p,max(0,o.modifyDamageOut?o.modifyDamageOut(o,5,engine,p):5),o.uniqueId,'collision');}}} continue;}
                  const d=distance(b1.x,b1.y,b2.x,b2.y); if(d<b1.radius+b2.radius){const nx=(b2.x-b1.x)/d||1,ny=(b2.y-b1.y)/d||0,ov=(b1.radius+b2.radius-d)/2,ms=b1.mass+b2.mass,r1=b2.mass/ms,r2=b1.mass/ms; b1.x-=nx*ov*2*r1; b2.x+=nx*ov*2*r2; const kx=b1.vx-b2.vx,ky=b1.vy-b2.vy,rV=nx*kx+ny*ky; if(rV>0){const p=2*rV/ms;b1.vx-=p*b2.mass*nx;b1.vy-=p*b2.mass*ny;b2.vx+=p*b1.mass*nx;b2.vy+=p*b1.mass*ny;if(engine.isEnemy(b1.uniqueId,b2.uniqueId)){const cD=(a,t)=>max(0,a.modifyDamageOut?a.modifyDamageOut(a,5,engine,t):5);engine.applyDamage(b1,cD(b2,b1),b2.uniqueId,'collision');engine.applyDamage(b2,cD(b1,b2),b1.uniqueId,'collision');const rs=hypot(kx,ky);if(b1.onCollide)b1.onCollide(b1,b2,rs,engine);if(b2.onCollide)b2.onCollide(b2,b1,rs,engine);}}} } }


                for(let i=engine.projectiles.length-1;i>=0;i--){ const p=engine.projectiles[i], o=engine.balls.find(b=>b.uniqueId===p.ownerId), iE=o&&o.statuses?.some(s=>s.type==='excited');
                  if(iE){ p.penetrating=false; const t=engine.getNearestEnemy({uniqueId:p.ownerId,x:p.x,y:p.y}); if(t){const n=normalize(t.x-p.x,t.y-p.y);p.vx+=n.x*50;p.vy+=n.y*50;const s=hypot(p.vx,p.vy),ms=max(p.maxSpeed||0,700);if(s>ms){p.vx=(p.vx/s)*ms;p.vy=(p.vy/s)*ms;}} }
                  if(p.customUpdate) p.customUpdate(p,DT,engine);
                  if(p.type==='cross_laser'){ p.angle+=PI/5*DT; engine.balls.forEach(b=>{if(b.hp>0&&engine.isEnemy(b.uniqueId,p.ownerId)&&!b.isBlank){const d1=abs((b.x-p.x)*sin(p.angle)-(b.y-p.y)*cos(p.angle)), d2=abs((b.x-p.x)*cos(p.angle)-(b.y-p.y)*-sin(p.angle)); if(d1<b.radius+5||d2<b.radius+5){if((p.hitCooldowns[b.uniqueId]||0)<=0){engine.applyDamage(b,(p.baseDamage||10)*(p.lifespan/(p.maxLifespan||10)),p.ownerId,'laser');p.hitCooldowns[b.uniqueId]=0.5;}}}}); if(p.hitCooldowns)Object.keys(p.hitCooldowns).forEach(k=>p.hitCooldowns[k]-=DT); }
                  if((p.isTracking||p.isPageTracking)&&!iE){const t=engine.getNearestEnemy({uniqueId:p.ownerId,x:p.x,y:p.y});if(t){const d=distance(p.x,p.y,t.x,t.y);if(!p.trackingRange||d<=p.trackingRange){const n=normalize(t.x-p.x,t.y-p.y),ms=p.isPageTracking?450:(p.maxSpeed||400);p.vx+=n.x*(p.isPageTracking?12:25);p.vy+=n.y*(p.isPageTracking?12:25);const s=hypot(p.vx,p.vy);if(s>ms){p.vx=(p.vx/s)*ms;p.vy=(p.vy/s)*ms;}}else if(p.trackingRange&&d>p.trackingRange){p.vx*=0.92;p.vy*=0.92;}}}
                  p.x+=p.vx*DT; p.y+=p.vy*DT; p.lifespan-=DT; let hW=false, as=engine.arenaSize, r=p.radius; if(p.x-r<0){p.x=r;p.vx*=-1;hW=true;}else if(p.x+r>as){p.x=as-r;p.vx*=-1;hW=true;} if(p.y-r<0){p.y=r;p.vy*=-1;hW=true;}else if(p.y+r>as){p.y=as-r;p.vy*=-1;hW=true;} if(hW){if(p.bounces!==undefined)p.bounces--; if(p.bounces<0&&!p.penetrating)p.lifespan=0; if(p.type==='bird'){if(p.bounces<0)p.lifespan=0;if(p.hitSet)p.hitSet.clear();}}
                  engine.balls.forEach(b=>{if(b.hp>0&&engine.isEnemy(b.uniqueId,p.ownerId)&&!b.isBlank&&distance(p.x,p.y,b.x,b.y)<p.radius+b.radius){const dmg=iE?p.damage*2:p.damage; if(p.penetrating){if(!p.hitSet)p.hitSet=new Set();if(!p.hitSet.has(b.uniqueId)){p.hitSet.add(b.uniqueId);if(dmg>0)engine.applyDamage(b,dmg,p.ownerId,'projectile');if(p.onHit)p.onHit(p,b,engine);}}else{if(dmg>0)engine.applyDamage(b,dmg,p.ownerId,'projectile');if(p.onHit)p.onHit(p,b,engine);p.lifespan=0;}}});
                  if(p.lifespan<=0){if(p.onDeath)p.onDeath(p,engine);engine.projectiles.splice(i,1);}
                }
                for(let i=engine.waves.length-1;i>=0;i--){ const w=engine.waves[i]; if(w.deceleration){w.speed-=w.deceleration*DT;if(w.speed>0)w.currentRadius+=w.speed*DT;else w.lingerTimer+=DT;} else{if(w.currentRadius<w.maxRadius){w.currentRadius+=w.speed*DT;if(w.currentRadius>=w.maxRadius)w.currentRadius=w.maxRadius;}else w.lingerTimer+=DT;} if(w.deflectsProjectiles)engine.projectiles.forEach(p=>{if(engine.isEnemy(p.ownerId,w.ownerId)&&distance(w.x,w.y,p.x,p.y)<=w.currentRadius+p.radius){const n=normalize(p.x-w.x,p.y-w.y);p.vx+=n.x*1200*DT;p.vy+=n.y*1200*DT;}}); engine.balls.forEach(b=>{if(b.hp>0&&!b.isBlank&&!w.hitSet.has(b.uniqueId)&&distance(w.x,w.y,b.x,b.y)<=w.currentRadius+b.radius){if(w.onHit)w.onHit(b);w.hitSet.add(b.uniqueId);}}); if(w.lingerTimer>=(w.lingerDuration||0))engine.waves.splice(i,1); }
                for(let i=engine.particles.length-1;i>=0;i--){ const p=engine.particles[i]; if(p.type==='floating_number'){p.x+=p.vx*DT;p.y+=p.vy*DT;p.vy+=250*DT;} else if(p.type==='text')p.y-=30*DT; if((p.lifespan-=DT)<=0)engine.particles.splice(i,1); }
                const aT=new Set(); engine.balls.forEach(b=>{if(((b.isMain && b.team !== 'p1' && b.team !== 'p2') || (b.team === 'p1' || b.team === 'p2') && b.hp > 0 && !b.isBlank && b.id !== 'endless_minion' && b.id !== 'dummy' && b.id !== 'chess_piece') && b.hp>0)aT.add(b.team);});
                if(gameMode==='test'){if(!aT.has('p1'))return 'p2'; return null;}
                if(gameMode==='regen') return null;
                return aT.size<=1?(aT.size===1?Array.from(aT)[0]:'draw'):null;
              }
            };
            engine.init(); engineRef.current=engine; isPausedRef.current=false; setIsPaused(false); setGameState('playing'); setGameSpeed(1); speedRef.current=1; setWinner(null);
          };


          const handleRandomMatch = () => {
             const keys=Object.keys(ROSTER).filter(k=>!['dummy','fanatic_fan','endless_minion','chess_piece','quzhe_phantom'].includes(k));
             const rT=(c, l, s) => Array.from({length:s},(_,i)=>l[i]?c[i]:keys[floor(random()*keys.length)]);
             if(gameMode==='ffa') setFfaIds(p=>rT(p,ffaLocks,5));
             else if(['intervention','test'].includes(gameMode)){ setP1Ids(p=>{const r=rT(p,p1Locks,1);return [r[0],p[1],p[2],p[3]];}); if(gameMode!=='test')setP2Ids(p=>{const r=rT(p,p2Locks,1);return [r[0],p[1],p[2],p[3]];}); }
             else if(gameMode==='3v3'){ setP1Ids(p=>{const r=rT(p,p1Locks,3);return [r[0],r[1],r[2],p[3]];}); setP2Ids(p=>rT(p,p2Locks,3)); }
             else if(['1v4', 'regen'].includes(gameMode)){ setP1Ids(p=>rT(p,p1Locks,4)); setP2Ids(p=>rT(p,p2Locks,4)); }
          };
          const toggleLock = (s, i) => s==='p1'?setP1Locks(p=>{const n=[...p];n[i]=!n[i];return n;}):setP2Locks(p=>{const n=[...p];n[i]=!n[i];return n;});


          useEffect(() => {
            if(gameState!=='playing')return; const ctx=canvasRef.current.getContext('2d');
            let aId, lT=performance.now(), lU=performance.now(), acc=0;
            const render = cT => {
              const eng=engineRef.current; if(!eng)return; let res=null;
              if(!isPausedRef.current){ acc+=min((cT-lT)/1000,0.1)*speedRef.current; while(acc>=DT){res=eng.update();acc-=DT;if(res)break;} } lT=cT;


              const as=eng.arenaSize; ctx.fillStyle='#0F172A'; ctx.fillRect(0,0,as,as);
              if(eng.balls.some(b=>(b.id==='cacamus'||b.copied==='cacamus')&&b.hp>0)){ctx.fillStyle='rgba(255,255,255,0.05)';const cs=as/8;for(let c=0;c<8;c++)for(let r=0;r<8;r++)if((c+r)%2!==0)ctx.fillRect(c*cs,r*cs,cs,cs);}
              if(eng.scene==='court'){ctx.fillStyle='rgba(59,130,246,0.15)';ctx.fillRect(0,0,as/2,as);ctx.fillStyle='rgba(239,68,68,0.15)';ctx.fillRect(as/2,0,as/2,as);ctx.fillStyle='#0F172A';ctx.fillRect(as/2-55,0,110,as);ctx.beginPath();ctx.arc(as/2,as/2,130,0,PI*2);ctx.fill();ctx.fillStyle='rgba(120,113,108,0.3)';ctx.fillRect(as/2-55,0,110,as);ctx.beginPath();ctx.arc(as/2,as/2,130,0,PI*2);ctx.fill();}
              if(eng.balls.some(b=>(b.id==='hao'||b.copied==='hao')&&b.hp>0&&b.redPhase)){ctx.fillStyle='rgba(239,68,68,0.15)';ctx.fillRect(0,0,as,as);}
              if(gameMode==='test'){ctx.fillStyle='rgba(255,255,255,0.05)';ctx.textAlign='center';ctx.textBaseline='middle';if(testType==='dummy'&&eng.timeLimit!==null){ctx.font='bold 150px sans-serif';ctx.fillText(`${Math.ceil(eng.timeLimit)}s`,as/2,as/2);}else if(testType==='endless'&&eng.endlessWave){ctx.font='bold 120px sans-serif';ctx.fillText(`Wave ${eng.endlessWave}`,as/2,as/2);}if(eng.dpsRecords?.length>0){ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='rgba(252,211,77,0.9)';ctx.font='bold 22px "Segoe UI", sans-serif';eng.dpsRecords.forEach((r,i)=>ctx.fillText(`[${r.time}s] DPS: ${r.dps}`,20,20+i*30));}}
              if(gameMode==='regen'){ctx.fillStyle='rgba(255,255,255,0.1)';ctx.font='bold 120px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(`${eng.teamDeathCounts.p1} : ${eng.teamDeathCounts.p2}`,as/2,as/2);}
              ctx.strokeStyle='#1E293B'; ctx.lineWidth=1; for(let i=0;i<as;i+=50){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,as);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(as,i);ctx.stroke();}
              const qDs=eng.obstacles.filter(o=>o.type==='quzhe_domain'||o.type==='quzhe_rift');
              if(qDs.length>0){ const dPs=qDs.map(o=>{const pts=[];for(let i=0;i<90;i++){const a=i/90*PI*2;let r=o.radius;if(o.tears)o.tears.forEach(t=>{let df=abs(a-t.angle);while(df>PI)df-=PI*2;df=abs(df);if(df<0.35)r+=t.length*Math.pow(1-df/0.35,1.5);});r+=sin(a*25+eng.time*15)*6;pts.push({x:o.x+cos(a)*r,y:o.y+sin(a)*r});}return {pts,o};}); const dr=(fs,lw,ss)=>{ctx.fillStyle=fs;ctx.strokeStyle=ss||fs;ctx.lineWidth=lw;dPs.forEach(({pts})=>{ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();if(fs)ctx.fill();if(ss)ctx.stroke();});}; dr(null,2+random(),'#059669'); dr('#020617',0,null); dr('rgba(16,185,129,0.2)',0,null); dPs.forEach(({o})=>{if(!o.tears)return;o.tears.forEach(t=>{ctx.beginPath();ctx.moveTo(o.x,o.y);const ex=o.x+cos(t.angle)*(o.radius+t.length),ey=o.y+sin(t.angle)*(o.radius+t.length);for(let s=1;s<=4;s++){let nx=o.x+(ex-o.x)*s/4+(random()-.5)*15,ny=o.y+(ey-o.y)*s/4+(random()-.5)*15;if(s===4){nx=ex;ny=ey;}ctx.lineTo(nx,ny);}ctx.strokeStyle='rgba(52,211,153,0.5)';ctx.lineWidth=1.5;ctx.stroke();});});}


              eng.obstacles.forEach(o=>{
                if(o.type==='podoasg_wall'){ctx.save();ctx.translate(o.x,o.y);ctx.beginPath();o.vertices.forEach((v,i)=>i===0?ctx.moveTo(v.x,v.y):ctx.lineTo(v.x,v.y));ctx.closePath();ctx.fillStyle=o.color;ctx.fill();ctx.strokeStyle='#CBD5E1';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
                else if(o.type==='heal_field'){ctx.beginPath();ctx.arc(o.x,o.y,o.radius,0,PI*2);ctx.fillStyle=o.color;ctx.fill();ctx.strokeStyle='#10B981';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.stroke();ctx.setLineDash([]);}
                else if(o.type==='damage_field'){ctx.beginPath();ctx.arc(o.x,o.y,o.radius,0,PI*2);ctx.fillStyle=o.color;ctx.fill();ctx.strokeStyle='#DC143C';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.stroke();ctx.setLineDash([]);}
                else if(o.type==='balance_ring'){ctx.beginPath();ctx.arc(o.x,o.y,o.radius,0,PI*2);ctx.strokeStyle=o.color;ctx.lineWidth=15;ctx.stroke();}
                else if(o.type==='health_pack'){ctx.beginPath();ctx.arc(o.x,o.y,o.radius,0,PI*2);ctx.fillStyle='rgba(16,185,129,0.3)';ctx.fill();ctx.strokeStyle='#10B981';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#10B981';ctx.fillRect(o.x-2,o.y-8,4,16);ctx.fillRect(o.x-8,o.y-2,16,4);}
                else if(o.type==='sacrament'){ctx.beginPath();ctx.arc(o.x,o.y,o.radius,0,PI*2);ctx.fillStyle='rgba(251,191,36,0.4)';ctx.fill();ctx.strokeStyle='#FBBF24';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#FBBF24';ctx.fillRect(o.x-2,o.y-6,4,12);ctx.fillRect(o.x-6,o.y-2,12,4);}
                else if(o.type==='paint_puddle'){ctx.beginPath();ctx.arc(o.x,o.y,o.radius,0,PI*2);ctx.fillStyle=o.color;ctx.globalAlpha=max(0,o.lifespan/10);ctx.fill();ctx.globalAlpha=1;}
                else if(o.type==='horizon_zone'){ctx.beginPath();ctx.arc(o.x,o.y,o.radius,0,PI*2);ctx.fillStyle='rgba(56,189,248,0.05)';ctx.fill();ctx.strokeStyle='rgba(56,189,248,0.4)';ctx.lineWidth=2;ctx.setLineDash([10,10]);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(o.x,o.y,o.radius-10,0,PI*2);ctx.strokeStyle='rgba(56,189,248,0.2)';ctx.lineWidth=1;ctx.stroke();}
                else if(o.type==='gavel'){ctx.beginPath();ctx.arc(o.x,o.y,o.radius,0,PI*2);ctx.fillStyle='#78716C';ctx.fill();ctx.strokeStyle='#D6D3D1';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#FFF';ctx.font='24px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚖️',o.x,o.y);}
                else if(o.type==='portal'){ctx.save();ctx.translate(o.x,o.y);ctx.rotate(eng.time*2);ctx.beginPath();ctx.arc(0,0,o.radius,0,PI*2);ctx.fillStyle='rgba(168,85,247,0.2)';ctx.fill();ctx.strokeStyle='#D8B4FE';ctx.lineWidth=2;ctx.setLineDash([8,8]);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(0,0,o.radius*.6,0,PI*2);ctx.strokeStyle='#9333EA';ctx.lineWidth=3;ctx.stroke();ctx.restore();}
                else if(o.type==='thought_core'){ctx.beginPath();ctx.arc(o.x,o.y,o.radius,0,PI*2);ctx.fillStyle='rgba(52,211,153,0.6)';ctx.fill();ctx.strokeStyle='#10B981';ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(o.x,o.y,o.radius/2,0,PI*2);ctx.fillStyle='#FFF';ctx.fill();}
                else if(o.type==='rgb_light'){ctx.save();ctx.translate(o.x,o.y);const wl=o.cType==='R'?0.25:(o.cType==='G'?0.4:0.6);const sp=o.cType==='R'?12:(o.cType==='G'?18:24);ctx.beginPath();for(let px=-o.radius;px<=o.radius;px+=2){const env=Math.exp(-(px*px)/(o.radius*o.radius*0.25));const py=Math.sin(px*wl-eng.time*sp)*o.radius*0.8*env;if(px===-o.radius)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.strokeStyle=o.color;ctx.lineWidth=4;ctx.shadowColor=o.color;ctx.shadowBlur=12;ctx.lineCap='round';ctx.stroke();ctx.globalAlpha=0.3;ctx.lineWidth=8;ctx.stroke();ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.fillStyle='#FFF';ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(o.cType,0,-o.radius-8);ctx.restore();}
                else if(o.type==='chess_piece'){ctx.beginPath();ctx.arc(o.x,o.y,o.radius,0,PI*2);ctx.fillStyle='rgba(229,231,235,0.2)';ctx.fill();ctx.strokeStyle=o.color;ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=o.color;ctx.font='24px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText({'pawn':'♟','knight':'♞','bishop':'♝','rook':'♜','queen':'♛'}[o.pieceType]||'♟',o.x,o.y);}
              });

              eng.balls.forEach(owner => {
                if (owner.hp <= 0 || (owner.id !== 'si' && owner.copied !== 'si') || !owner.boundOrder?.length) return;
                const chain = owner.boundOrder.map(id => eng.balls.find(x => x.uniqueId === id)).filter(Boolean).filter(x => x.hp > 0 && x.threadStacks?.[owner.uniqueId] > 0);
                if (!chain.length) return;
                const pulse = 0.65 + 0.35 * sin(eng.time * 8 + (owner.threadPulse || 0) * 6);
                ctx.save();
                ctx.lineCap = 'round';
                for (let i = 0; i < chain.length; i++) {
                  const from = chain[i];
                  const to = chain[i + 1] || owner;
                  const stacks = max(1, from.threadStacks?.[owner.uniqueId] || 1);
                  const mx = (from.x + to.x) / 2;
                  const my = (from.y + to.y) / 2;
                  const dx = to.x - from.x;
                  const dy = to.y - from.y;
                  const len = hypot(dx, dy) || 1;
                  const nx = -dy / len;
                  const ny = dx / len;
                  const sway = 8 + stacks * 1.5;
                  ctx.beginPath();
                  ctx.moveTo(from.x, from.y);
                  ctx.quadraticCurveTo(mx + nx * sway * pulse, my + ny * sway * pulse, to.x, to.y);
                  ctx.strokeStyle = `rgba(226,232,240,${0.18 + stacks * 0.05})`;
                  ctx.lineWidth = 4 + stacks * 2.2;
                  ctx.stroke();
                  ctx.beginPath();
                  ctx.moveTo(from.x, from.y);
                  ctx.quadraticCurveTo(mx + nx * sway * pulse, my + ny * sway * pulse, to.x, to.y);
                  ctx.strokeStyle = `rgba(248,250,252,${0.7 + 0.04 * min(stacks, 4)})`;
                  ctx.lineWidth = 1.2 + stacks * 0.65;
                  ctx.stroke();
                }
                ctx.restore();
              });


              eng.balls.forEach(b=>{if(b.hp>0&&(b.id==='kate'||b.copied==='kate')&&(b.currentAnchor||b.walls?.length>0)){const dW=(p1,p2,f)=>{ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.strokeStyle='rgba(255,69,0,0.4)';ctx.lineWidth=f?18:10;ctx.stroke();ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.strokeStyle=b.color;ctx.lineWidth=f?6:3;ctx.stroke();const dC=p=>{ctx.beginPath();ctx.arc(p.x,p.y,8,0,PI*2);ctx.fillStyle='#FFF';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle=b.color;ctx.stroke();};dC(p1);if(f)dC(p2);}; if(b.walls)b.walls.forEach(w=>dW(w.p1,w.p2,true)); if(b.currentAnchor)dW(b.currentAnchor,b,false);}});
              eng.waves.forEach(w=>{let a=1;if(w.deceleration&&w.speed<=0&&w.lingerTimer)a=.5*max(0,1-w.lingerTimer/w.lingerDuration);else if(!w.deceleration){if(w.currentRadius<w.maxRadius)a=1-(w.currentRadius/w.maxRadius)*.5;else if(w.lingerTimer)a=.5*max(0,1-w.lingerTimer/w.lingerDuration);} ctx.beginPath();ctx.arc(w.x,w.y,w.currentRadius,0,PI*2);ctx.fillStyle=w.color;ctx.globalAlpha=a*0.2;ctx.fill();ctx.strokeStyle=w.color;ctx.lineWidth=3;ctx.globalAlpha=a;ctx.stroke();ctx.globalAlpha=1;});


              eng.projectiles.forEach(p=>{ctx.beginPath();
                if(p.type==='page'){ctx.rect(p.x-p.radius,p.y-p.radius,p.radius*2,p.radius*2);ctx.strokeStyle=p.color;ctx.lineWidth=2;ctx.stroke();}
                else if(['bird','cone','dagger','steed'].includes(p.type)){const a=atan2(p.vy,p.vx), dR=p.type==='bird'||p.type==='dagger'?p.radius*2.5:(p.type==='steed'?p.radius*1.5:p.radius*2), bR=p.type==='cone'?p.radius:dR*(p.type==='dagger'?0.4:1); ctx.moveTo(p.x+cos(a)*dR,p.y+sin(a)*dR);ctx.lineTo(p.x+cos(a+2.5)*bR,p.y+sin(a+2.5)*bR);ctx.lineTo(p.x+cos(a-2.5)*bR,p.y+sin(a-2.5)*bR);ctx.closePath();ctx.fillStyle=p.color;ctx.fill();if(p.type==='steed'){ctx.strokeStyle='#94A3B8';ctx.stroke();}}
                else if(p.type==='knight'){const a=atan2(p.vy,p.vx);ctx.translate(p.x,p.y);ctx.rotate(a);ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(-10,10);ctx.lineTo(-10,-10);ctx.closePath();ctx.fillStyle='#CBD5E1';ctx.fill();ctx.strokeStyle='#FFF';ctx.lineWidth=2;ctx.stroke();ctx.rotate(-a);ctx.translate(-p.x,-p.y);}
                else if(p.type==='spirit'){ctx.arc(p.x,p.y,p.radius+6,0,PI*2);ctx.fillStyle='rgba(255,69,0,0.4)';ctx.fill();ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,PI*2);ctx.fillStyle=p.color;ctx.fill();}
                else if(p.type==='sprout'){ctx.arc(p.x,p.y,p.radius,0,PI*2);ctx.fillStyle='rgba(74,222,128,0.3)';ctx.fill();ctx.strokeStyle='#4ADE80';ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.moveTo(p.x,p.y+4);ctx.quadraticCurveTo(p.x+8,p.y-8,p.x,p.y-8);ctx.quadraticCurveTo(p.x-8,p.y-8,p.x,p.y+4);ctx.fillStyle='#4ADE80';ctx.fill();}
                else if(p.type==='note'){ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,PI*2);ctx.fill();ctx.fillRect(p.x+p.radius-2,p.y-p.radius*2,3,p.radius*2);ctx.fillRect(p.x+p.radius-2,p.y-p.radius*2,p.radius*1.5,3);}
                else if(p.type==='energy_domain'){ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,PI*2);ctx.fillStyle=p.color;ctx.fill();ctx.strokeStyle='rgba(0,250,154,0.3)';ctx.lineWidth=2;ctx.setLineDash([15,10]);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(p.x,p.y,15,0,PI*2);ctx.fillStyle='rgba(0,250,154,0.5)';ctx.fill();}
                else if(p.type==='cross_laser'){ctx.moveTo(p.x-as*cos(p.angle),p.y-as*sin(p.angle));ctx.lineTo(p.x+as*cos(p.angle),p.y+as*sin(p.angle));ctx.moveTo(p.x-as*cos(p.angle+PI/2),p.y-as*sin(p.angle+PI/2));ctx.lineTo(p.x+as*cos(p.angle+PI/2),p.y+as*sin(p.angle+PI/2));ctx.strokeStyle=`rgba(255,255,255,${max(.2,p.lifespan/10)})`;ctx.lineWidth=10;ctx.stroke();}
                else if(p.type==='word'){ctx.fillStyle=p.color;ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';const a=atan2(p.vy,p.vx);ctx.translate(p.x,p.y);ctx.rotate(a);ctx.fillText(p.mult>1?`${p.text} x${p.mult}`:p.text,0,0);ctx.rotate(-a);ctx.translate(-p.x,-p.y);}
                else if(p.type==='quzhe_spike'){const a=atan2(p.vy,p.vx);ctx.translate(p.x,p.y);ctx.rotate(a);ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-12,10);ctx.lineTo(-6,0);ctx.lineTo(-12,-10);ctx.closePath();ctx.fillStyle=p.color;ctx.fill();ctx.strokeStyle='#10B981';ctx.lineWidth=2;ctx.stroke();ctx.rotate(-a);ctx.translate(-p.x,-p.y);}
                else {ctx.arc(p.x,p.y,p.radius,0,PI*2);if(p.type==='ring'){ctx.strokeStyle=p.color;ctx.lineWidth=4;ctx.stroke();}else{ctx.fillStyle=p.color;ctx.fill();if(['beam','orb','shadow'].includes(p.type)){ctx.beginPath();ctx.arc(p.x,p.y,p.radius+6,0,PI*2);ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fill();}}}
              });


              eng.particles.forEach(p=>{
                if(p.type==='photo_flash'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,p.range,-PI/4,PI/4);ctx.closePath();const g=ctx.createRadialGradient(0,0,0,0,0,p.range);g.addColorStop(0,`rgba(255,255,255,${.8*(p.lifespan/p.maxLifespan)})`);g.addColorStop(1,'rgba(244,114,182,0)');ctx.fillStyle=g;ctx.fill();ctx.restore();}
                else if(p.type==='rect_flash'){ctx.fillStyle=p.color;ctx.globalAlpha=max(0,p.lifespan/p.maxLifespan);ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);ctx.globalAlpha=1;}
                else if(p.type==='laser'){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.tx,p.ty);ctx.strokeStyle='rgba(169,169,169,0.4)';ctx.lineWidth=25*(p.lifespan/p.maxLifespan);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.tx,p.ty);ctx.strokeStyle=p.color;ctx.lineWidth=10*(p.lifespan/p.maxLifespan);ctx.stroke();}
                else if(p.type==='lightning'){ctx.beginPath();ctx.moveTo(p.segments[0].x,p.segments[0].y);for(let i=1;i<p.segments.length;i++)ctx.lineTo(p.segments[i].x,p.segments[i].y);ctx.strokeStyle=`rgba(251,191,36,${p.lifespan/p.maxLifespan})`;ctx.lineWidth=15*(p.lifespan/p.maxLifespan);ctx.stroke();ctx.strokeStyle=`rgba(255,255,255,${p.lifespan/p.maxLifespan})`;ctx.lineWidth=5*(p.lifespan/p.maxLifespan);ctx.stroke();ctx.beginPath();ctx.arc(p.x,p.y,50*(1-p.lifespan/p.maxLifespan),0,PI*2);ctx.fillStyle=`rgba(251,191,36,${p.lifespan/p.maxLifespan})`;ctx.fill();}
                else if(p.type==='slash'){ctx.beginPath();ctx.moveTo(p.p1.x,p.p1.y);ctx.lineTo(p.p2.x,p.p2.y);ctx.strokeStyle=p.color;ctx.lineWidth=15*(p.lifespan/p.maxLifespan);ctx.lineCap='round';ctx.stroke();ctx.strokeStyle='#FFF';ctx.lineWidth=5*(p.lifespan/p.maxLifespan);ctx.stroke();ctx.lineCap='butt';}
              });


              eng.balls.forEach(b=>{if(b.hp<=0)return; const aS=new Set((b.statuses||[]).map(s=>s.type));
                if(b.id==='kongmie'||b.copied==='kongmie'){const r=b.radius+25;ctx.beginPath();ctx.arc(b.x,b.y,r,0,PI*2);ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=3;ctx.stroke();ctx.beginPath();ctx.arc(b.x,b.y,r,-PI/2,-PI/2+(b.actTimer/b.act3Threshold)*PI*2);ctx.strokeStyle='#8B5CF6';ctx.stroke();ctx.fillStyle='#8B5CF6';ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(['I','II','III'][b.act-1]||'III',b.x,b.y-r);}
                if(b.id==='miller'||b.copied==='miller'){const hP=b.hp/b.maxHp, aB=hP>=.75?0:(hP>=.5?1:(hP>=.25?2:3)), cs=['#FBBF24','#4ADE80','#CBD5E1','#DC143C']; for(let i=0;i<4;i++){const bx=b.x+cos(eng.time*2+i*PI/2)*(b.radius+25), by=b.y+sin(eng.time*2+i*PI/2)*(b.radius+25); ctx.fillStyle=i===aB?cs[i]:'rgba(255,255,255,0.15)'; ctx.beginPath();ctx.moveTo(bx,by-6);ctx.lineTo(bx+4,by);ctx.lineTo(bx,by+6);ctx.lineTo(bx-4,by);ctx.fill();}}
                if(b.id==='topiharin'||b.copied==='topiharin'){ctx.lineWidth=4;for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(b.x,b.y,b.radius+18,-PI/2+i*PI/2,-PI/2+(i+1)*PI/2-0.1);if(b.currentPhase>i+1||b.currentPhase===4)ctx.strokeStyle='#FF1493';else if(b.currentPhase===i+1)ctx.strokeStyle=`rgba(255,20,147,${(b.musicTimer%15)/15})`;else ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.stroke();}}
                if(b.id==='eli'||b.copied==='eli'){const r=b.radius+35, sx=b.x+cos(b.rapierAngle)*r, sy=b.y+sin(b.rapierAngle)*r; ctx.beginPath();ctx.arc(b.x,b.y,r,0,PI*2);ctx.strokeStyle='rgba(0,255,255,0.15)';ctx.lineWidth=1;ctx.stroke();ctx.save();ctx.translate(sx,sy);ctx.rotate(b.rapierAngle-PI/2);ctx.beginPath();ctx.moveTo(25,0);ctx.lineTo(-10,3);ctx.lineTo(-10,-3);ctx.closePath();ctx.fillStyle='#00FFFF';ctx.fill();ctx.strokeStyle='#FFF';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#94A3B8';ctx.fillRect(-14,-8,4,16);ctx.fillRect(-22,-2,8,4);ctx.restore();}
                if(b.id==='lisi'||b.copied==='lisi'){const r=b.radius+35, cx=b.x+cos(b.cameraAngle)*r, cy=b.y+sin(b.cameraAngle)*r; ctx.beginPath();ctx.arc(b.x,b.y,r,0,PI*2);ctx.strokeStyle='rgba(244,114,182,0.15)';ctx.lineWidth=1;ctx.stroke();ctx.save();ctx.translate(cx,cy);ctx.rotate(b.cameraAngle);ctx.fillStyle='#1F2937';ctx.fillRect(-10,-8,20,16);ctx.fillStyle='#D1D5DB';ctx.fillRect(10,-5,8,10);ctx.beginPath();ctx.arc(18,0,4,0,PI*2);ctx.fillStyle='#60A5FA';ctx.fill();ctx.fillStyle='#F472B6';ctx.beginPath();ctx.arc(0,-8,3,0,PI*2);ctx.fill();ctx.restore();}
                if(b.id==='fasimir'||b.copied==='fasimir'){const r=b.radius; if(b.hermesList?.length>0){ctx.strokeStyle='rgba(56,189,248,0.8)';ctx.lineWidth=3;b.hermesList.forEach((t,i)=>{ctx.beginPath();ctx.arc(b.x,b.y,r+10+i*5,-PI/2,-PI/2+(t/5)*PI*2);ctx.stroke();});} if(b.hephaestusList?.length>0){ctx.strokeStyle='rgba(248,113,113,0.8)';ctx.lineWidth=3;b.hephaestusList.forEach((t,i)=>{ctx.beginPath();ctx.arc(b.x,b.y,r+20+i*5,-PI/2,-PI/2+(t/10)*PI*2);ctx.stroke();});} if(b.zeusList?.length>0){ctx.strokeStyle='rgba(251,191,36,0.8)';ctx.lineWidth=3;b.zeusList.forEach((t,i)=>{ctx.beginPath();ctx.arc(b.x,b.y,r+28+i*5,-PI/2,-PI/2+(t/15)*PI*2);ctx.stroke();});} if(b.snakeWands?.length>0){ctx.strokeStyle='rgba(16,185,129,0.8)';ctx.lineWidth=3;b.snakeWands.forEach((t,i)=>{ctx.beginPath();ctx.arc(b.x,b.y,r+36+i*5,-PI/2,-PI/2+(t/5)*PI*2);ctx.stroke();});} if(b.ultimate){ctx.strokeStyle='rgba(248,113,113,1)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(b.x,b.y,r+45,-PI/2,-PI/2+((b.ultHephaestusTimer||10)/10)*PI*2);ctx.stroke();ctx.strokeStyle='rgba(251,191,36,1)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(b.x,b.y,r+50,-PI/2,-PI/2+((b.ultZeusTimer||5)/5)*PI*2);ctx.stroke();}}
                if(b.id==='grimm'||b.copied==='grimm'){if(b.isGathering){const p=1-(b.gatherTimer/1.0), r=(b.radius+60)*(1-p); ctx.beginPath();ctx.arc(b.x,b.y,max(0,r),0,PI*2);ctx.strokeStyle=`rgba(16,185,129,${0.3*(1-p)})`;ctx.lineWidth=1;ctx.stroke();for(let i=0;i<12;i++){const a=(b.baseOrbitAngle||0)+(i*PI*2/12)+(p*PI*4);ctx.beginPath();ctx.arc(b.x+cos(a)*r,b.y+sin(a)*r,5,0,PI*2);ctx.fillStyle='#34D399';ctx.fill();ctx.strokeStyle='#FFF';ctx.lineWidth=1;ctx.stroke();}ctx.save();ctx.translate(b.x,b.y);ctx.globalAlpha=p;ctx.beginPath();ctx.moveTo(0,-30);ctx.lineTo(10,-10);ctx.lineTo(10,20);ctx.lineTo(-10,20);ctx.lineTo(-10,-10);ctx.closePath();ctx.fillStyle='rgba(52,211,153,0.8)';ctx.fill();ctx.strokeStyle='#FFF';ctx.lineWidth=2;ctx.stroke();ctx.restore();}else if(b.collectedCores>0&&!b.isSlashing){const r=b.radius+60; ctx.beginPath();ctx.arc(b.x,b.y,r,0,PI*2);ctx.strokeStyle='rgba(16,185,129,0.3)';ctx.lineWidth=1;ctx.stroke();for(let i=0;i<b.collectedCores;i++){const a=(b.baseOrbitAngle||0)+(i*PI*2/b.collectedCores);ctx.beginPath();ctx.arc(b.x+cos(a)*r,b.y+sin(a)*r,5,0,PI*2);ctx.fillStyle='#34D399';ctx.fill();ctx.strokeStyle='#FFF';ctx.lineWidth=1;ctx.stroke();}}}
                if((b.threadStacks && Object.keys(b.threadStacks).length > 0) || b.threadFlash > 0){const totalStack = Object.values(b.threadStacks || {}).reduce((sum, value) => sum + value, 0); const flash = b.threadFlash || 0; if(totalStack > 0){const baseR = b.radius + 10; for(let i=0;i<min(totalStack, 5);i++){ctx.beginPath();ctx.arc(b.x,b.y,baseR + i * 4 + sin(eng.time * 6 + i) * 1.5, -PI/2 + i * 0.45, PI * 1.2 + i * 0.45);ctx.strokeStyle=`rgba(226,232,240,${0.42 + min(totalStack,6)*0.05})`;ctx.lineWidth=1.5 + totalStack * 0.75;ctx.stroke();} ctx.beginPath();ctx.arc(b.x,b.y,b.radius + 8 + totalStack * 1.2,0,PI*2);ctx.strokeStyle=`rgba(248,250,252,${0.18 + min(totalStack,6)*0.04})`;ctx.lineWidth=1 + totalStack * 0.35;ctx.setLineDash([4, 6]);ctx.stroke();ctx.setLineDash([]);} if(flash > 0){ctx.beginPath();ctx.arc(b.x,b.y,b.radius + 18 + flash * 8,0,PI*2);ctx.strokeStyle=`rgba(255,255,255,${flash * 0.7})`;ctx.lineWidth=2.5 + totalStack * 0.2;ctx.stroke();}}
                if(b.auraActive||aS.has('excited')){ctx.beginPath();ctx.arc(b.x,b.y,b.radius*2.5,0,PI*2);ctx.fillStyle=aS.has('excited')?'#FCD34D':b.color;ctx.globalAlpha=0.2;ctx.fill();ctx.globalAlpha=1;}
                if(aS.has('shield')){ctx.beginPath();ctx.arc(b.x,b.y,b.radius+12,0,PI*2);ctx.fillStyle='rgba(203,213,225,0.2)';ctx.fill();ctx.strokeStyle='#CBD5E1';ctx.lineWidth=4;ctx.stroke();}
                if(b.isBlank)ctx.globalAlpha=0.3; if(b.isQuzhePhantom)ctx.globalAlpha=0.5;
                if(b.isChessPiece){ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,PI*2);ctx.fillStyle=b.behavior==='protect'?'rgba(56,189,248,0.15)':'rgba(248,113,113,0.15)';ctx.fill();ctx.strokeStyle=b.behavior==='protect'?'#38BDF8':'#F87171';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=b.color;ctx.font='24px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText({'pawn':'♟','knight':'♞','bishop':'♝','rook':'♜','queen':'♛'}[b.pieceType]||'♟',b.x,b.y);}
                else if(b.isQuzheMain||b.isQuzhePhantom){ctx.globalAlpha=0.6; ctx.beginPath();ctx.arc(b.x,b.y,b.radius,PI/2,PI*1.5);ctx.fillStyle=b.isQuzheMain?'#FFF':b.color;ctx.fill();ctx.beginPath();ctx.arc(b.x,b.y,b.radius,-PI/2,PI/2);ctx.fillStyle=b.isQuzheMain?b.color:'#FFF';ctx.fill();ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,PI*2);ctx.strokeStyle=b.isMain?'#FFF':'#888';ctx.lineWidth=b.isMain?2:1;ctx.stroke();}
                else{ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,PI*2);ctx.fillStyle=b.color;ctx.fill();ctx.strokeStyle=b.isMain?'#FFF':'#888';ctx.lineWidth=b.isMain?2:1;ctx.stroke();}
                ctx.globalAlpha=1;
                if((gameMode==='ffa'||gameMode==='regen')&&b.isMain){ctx.beginPath();ctx.arc(b.x,b.y,b.radius+4,0,PI*2);ctx.strokeStyle={'p1':'#3B82F6','p2':'#EF4444','p3':'#10B981','p4':'#F59E0B','p5':'#8B5CF6'}[b.team]||'#FFF';ctx.lineWidth=3;ctx.stroke();}
                if(aS.has('hitstop')){ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,PI*2);ctx.fillStyle='rgba(255,255,255,0.6)';ctx.fill();}
                if(eng.scene==='court'&&eng.judgeId===b.uniqueId&&gameMode!=='ffa'){ctx.beginPath();ctx.arc(b.x,b.y,b.radius+16,0,PI*2);ctx.strokeStyle='#D6D3D1';ctx.lineWidth=3;ctx.setLineDash([6,6]);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#FFF';ctx.font='22px sans-serif';ctx.textAlign='center';ctx.fillText('⚖️',b.x,b.y-b.radius-22);}
                if(aS.has('burn')){ctx.beginPath();ctx.arc(b.x,b.y,b.radius+5,0,PI*2);ctx.strokeStyle='#EF4444';ctx.setLineDash([5,5]);ctx.stroke();ctx.setLineDash([]);}
                if(aS.has('warning')){ctx.fillStyle='#FF00FF';ctx.font='bold 24px Arial';ctx.textAlign='center';ctx.fillText('!',b.x,b.y-b.radius-15);}
                if(aS.has('knockback')){ctx.fillStyle='#EF4444';ctx.font='bold 20px Arial';ctx.textAlign='center';ctx.fillText('»',b.x-b.radius-10,b.y);}
                if(aS.has('rooted')){ctx.beginPath();ctx.arc(b.x,b.y,b.radius+12,0,PI*2);ctx.strokeStyle='#4ADE80';ctx.lineWidth=4;ctx.stroke();}
                if(aS.has('slow')){ctx.beginPath();ctx.arc(b.x,b.y,b.radius+8,0,PI*2);ctx.strokeStyle='#3B82F6';ctx.lineWidth=3;ctx.stroke();}
                if(aS.has('stun')){ctx.beginPath();ctx.arc(b.x,b.y,b.radius+8,0,PI*2);ctx.strokeStyle='#FCD34D';ctx.lineWidth=4;ctx.setLineDash([2,4]);ctx.stroke();ctx.setLineDash([]);}
                if(aS.has('silenced')){ctx.beginPath();ctx.arc(b.x,b.y,b.radius+12,0,PI*2);ctx.strokeStyle='#9333EA';ctx.lineWidth=4;ctx.stroke();ctx.beginPath();ctx.moveTo(b.x-b.radius,b.y-b.radius);ctx.lineTo(b.x+b.radius,b.y+b.radius);ctx.stroke();}
                if(aS.has('thread_converge')){const center = b.statuses.find(s=>s.type==='thread_converge'); if(center){const dx=center.centerX-b.x, dy=center.centerY-b.y, d=hypot(dx,dy)||1; const tipX=b.x+(dx/d)*(b.radius+16); const tipY=b.y+(dy/d)*(b.radius+16); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(tipX, tipY); ctx.strokeStyle='rgba(226,232,240,0.8)'; ctx.lineWidth=2.5; ctx.stroke(); ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(tipX - dy / d * 5 - dx / d * 4, tipY + dx / d * 5 - dy / d * 4); ctx.lineTo(tipX + dy / d * 5 - dx / d * 4, tipY - dx / d * 5 - dy / d * 4); ctx.closePath(); ctx.fillStyle='rgba(248,250,252,0.85)'; ctx.fill(); }}
                if(aS.has('shield_dr')){const hx=b.x+b.radius*.7, hy=b.y-b.radius*.7; ctx.beginPath();for(let k=0;k<6;k++)ctx.lineTo(hx+cos(k*PI/3-PI/6)*8,hy+sin(k*PI/3-PI/6)*8);ctx.closePath();ctx.fillStyle='rgba(96,165,250,0.8)';ctx.fill();ctx.strokeStyle='#FFF';ctx.lineWidth=1.5;ctx.stroke();}
                if(aS.has('vulnerable')){const tx=b.x+b.radius*.7, ty=b.y+b.radius*.7; ctx.beginPath();ctx.moveTo(tx-7,ty-4);ctx.lineTo(tx+7,ty-4);ctx.lineTo(tx,ty+8);ctx.closePath();ctx.fillStyle='rgba(239,68,68,0.8)';ctx.fill();ctx.strokeStyle='#FFF';ctx.lineWidth=1.5;ctx.stroke();}


                const dHp=b.isUndead?-floor(b.negativeHpDebt):max(0,floor(b.hp)); ctx.fillStyle='#FFF'; ctx.font=b.isMain?'bold 24px "Segoe UI", sans-serif':'bold 14px "Segoe UI", sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.lineWidth=4; ctx.strokeStyle='#000'; ctx.strokeText(dHp,b.x,b.y); ctx.fillText(dHp,b.x,b.y);
                if(b.isSummon&&!b.isQuzhePhantom){ctx.font='bold 12px "Segoe UI", sans-serif';ctx.strokeText(b.name,b.x,b.y-b.radius-22);ctx.fillText(b.name,b.x,b.y-b.radius-22);}
                const dhA=eng.balls.reduce((s,m)=>(m.id==='miller'||m.copied==='miller')&&m.doomHeal&&m.doomHeal[b.uniqueId]?s+m.doomHeal[b.uniqueId]:s,0);
                if(dhA>0&&b.hp>0){const r=min(1,dhA/b.hp);ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(b.x-20,b.y+b.radius+18,40,6);ctx.fillStyle='#FBBF24';ctx.fillRect(b.x-20,b.y+b.radius+18,40*r,6);ctx.strokeStyle='#000';ctx.lineWidth=1;ctx.strokeRect(b.x-20,b.y+b.radius+18,40,6);}
                if(b.erodedMaxHp>0&&b.hp>0){const eR=min(1,b.erodedMaxHp/b.baseMaxHp),by=b.y+b.radius+(dhA>0?28:18);ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(b.x-20,by,40,6);ctx.fillStyle='#6B7280';ctx.fillRect(b.x-20+40*(1-eR),by,40*eR,6);ctx.strokeStyle='#000';ctx.lineWidth=1;ctx.strokeRect(b.x-20,by,40,6);ctx.fillStyle='#9CA3AF';ctx.font='bold 10px sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(`${floor(eR*100)}%`,b.x+24,by+3);}
              });


              eng.particles.forEach(p=>{
                if(p.type==='text'){ctx.fillStyle=p.color;ctx.globalAlpha=max(0,p.lifespan/p.maxLifespan);ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText(p.text,p.x,p.y);ctx.globalAlpha=1;}
                else if(p.type==='floating_number'){ctx.fillStyle=p.color;ctx.globalAlpha=max(0,p.lifespan/p.maxLifespan);ctx.font='900 20px "Segoe UI", sans-serif';ctx.textAlign='center';ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.strokeText(p.text,p.x,p.y);ctx.fillText(p.text,p.x,p.y);ctx.globalAlpha=1;}
              });


              if(cT-lU>100){
                const gt = tm => eng.balls.filter(b=>b.team===tm&&b.isMain).map(b=>{ let dHp=max(0,b.hp),isSp=false,mHp=max(0,b.hp),pHp=0,displayBall=b; if((b.id==='ecmo'||b.copied==='ecmo')){ const ecmoGroup=eng.balls.filter(x=>x.team===tm&&x.hp>0&&(x.id==='ecmo'||x.copied==='ecmo')); if(ecmoGroup.length>0){ displayBall=ecmoGroup.reduce((best,current)=>current.hp>best.hp?current:best,ecmoGroup[0]); dHp=max(0,displayBall.hp); mHp=max(0,displayBall.hp); } } if(displayBall.isUndead)dHp=-floor(displayBall.negativeHpDebt); if(b.id==='quzhe'||b.copied==='quzhe'){const p=eng.balls.find(x=>x.uniqueId===b.phantomId);pHp=p?max(0,p.hp):0;if(mHp>0&&pHp>0){isSp=true;dHp=mHp+pHp;}else if(mHp<=0&&pHp>0)dHp=pHp;} return {id:b.uniqueId,name:b.name,hp:dHp,maxHp:displayBall.baseMaxHp||displayBall.maxHp,erodedMaxHp:displayBall.erodedMaxHp||0,scale:displayBall.scalingValue,tid:b.id,totalDmg:floor(displayBall.damageDealt||0),dps:eng.time>0?((displayBall.damageDealt||0)/eng.time).toFixed(1):"0.0",isSplit:isSp,mainHp:mHp,phantomHp:pHp}; });
                setUiStats({p1:gt('p1'),p2:gt('p2'),p3:gt('p3'),p4:gt('p4'),p5:gt('p5')}); lU=cT;
              }
              if(res){setGameState('over');setWinner(res);}else aId=requestAnimationFrame(render);
            };
            aId=requestAnimationFrame(render); return ()=>cancelAnimationFrame(aId);
          }, [gameState, gameMode, testType, p1Ids, p2Ids, ffaIds, ffaCount, scene]);


          const renderFfaCard = i => {
             const pid=ffaIds[i], char=ROSTER[pid], stat=uiStats[`p${i+1}`]?.[0], l=ffaLocks[i];
             const t = [{b:'border-blue-500',bg:'bg-blue-950/30',txt:'text-blue-400',tit:'text-blue-300',lb:'Player 1',lbg:'bg-blue-600/50'},{b:'border-red-500',bg:'bg-red-950/30',txt:'text-red-400',tit:'text-red-300',lb:'Player 2',lbg:'bg-red-600/50'},{b:'border-emerald-500',bg:'bg-emerald-950/30',txt:'text-emerald-400',tit:'text-emerald-300',lb:'Player 3',lbg:'bg-emerald-600/50'},{b:'border-amber-500',bg:'bg-amber-950/30',txt:'text-amber-400',tit:'text-amber-300',lb:'Player 4',lbg:'bg-amber-600/50'},{b:'border-purple-500',bg:'bg-purple-950/30',txt:'text-purple-400',tit:'text-purple-300',lb:'Player 5',lbg:'bg-purple-600/50'}][i];
             return (
                 <div key={`ffa_${i}`} className={`p-3 rounded-xl border-2 ${t.b} ${t.bg} flex flex-col gap-1.5 w-full`}>
                     <div className="flex justify-between items-center mb-1"><span className={`text-sm font-bold ${t.txt}`}>{t.lb}</span><button onClick={()=>{const n=[...ffaLocks];n[i]=!n[i];setFfaLocks(n);}} className={`p-1 rounded ${l?`${t.lbg} text-white`:'text-gray-500 hover:text-gray-300'}`}>{l?'🔒':'🔓'}</button></div>
                     <select value={pid} onChange={e=>{const n=[...ffaIds];n[i]=e.target.value;setFfaIds(n);}} disabled={gameState==='playing'} className="bg-gray-800 text-white p-1.5 text-sm rounded outline-none border border-gray-700 font-bold w-full"><CharacterOptions/></select>
                     <span className={`text-xs ${t.tit} font-semibold mt-1`}>{char.title}</span><p className="text-xs text-gray-400 h-28 overflow-y-auto whitespace-pre-wrap">{char.desc}</p>
                     {gameState!=='menu'&&<StatPanel stat={stat} isDummy={false} isEndless={false} hpThreshold={30} />}
                 </div>
             );
          };


          const renderPlayerCard = (s, sm=null) => {
             const isD=sm==='dummy', isE=sm==='endless', pid=s==='p1'?p1Ids[0]:(isD?'dummy':isE?'endless_minion':p2Ids[0]), char=ROSTER[pid]||ROSTER['dummy'], stat=uiStats[s]?.[0];
             const t = {p1:{b:'border-blue-500',bg:'bg-blue-950/30',txt:'text-blue-400',tit:'text-indigo-300',lb:char.name},p2:{b:'border-red-500',bg:'bg-red-950/30',txt:'text-red-400',tit:'text-red-300',lb:char.name},dummy:{b:'border-amber-500',bg:'bg-amber-950/30',txt:'text-amber-400',tit:'text-amber-300',lb:'Target'},endless:{b:'border-teal-500',bg:'bg-teal-950/30',txt:'text-teal-400',tit:'text-teal-300',lb:'Endless Swarm'}}[sm||s];
             return (
                 <div className={`p-3 rounded-xl border-2 ${t.b} ${t.bg} flex flex-col gap-1.5 w-full`}>
                     <div className="flex justify-between items-center mb-1"><span className={`text-sm font-bold ${t.txt}`}>{t.lb}</span>{!(isD||isE)&&(<button onClick={()=>toggleLock(s,0)} className={`p-1 rounded ${s==='p1'?(p1Locks[0]?'bg-blue-600/50 text-white':'text-gray-500'):(p2Locks[0]?'bg-red-600/50 text-white':'text-gray-500')}`}>{s==='p1'?(p1Locks[0]?'🔒':'🔓'):(p2Locks[0]?'🔒':'🔓')}</button>)}{(isD||isE)&&(<div className="w-3 h-3 rounded-full" style={{backgroundColor:char.color,boxShadow:`0 0 8px ${char.color}`}}></div>)}</div>
                     {isD?<div className="bg-gray-800 text-amber-100 p-1.5 rounded font-bold text-center border border-amber-900/50 text-sm">巨大木樁 (HP: 5000)</div>:isE?<div className="bg-gray-800 text-teal-100 p-1.5 rounded font-bold text-center border border-teal-900/50 text-sm">無盡狂熱者 (Wave: {stat?floor(stat.maxHp):1})</div>:<select value={pid} onChange={e=>{const n=s==='p1'?[...p1Ids]:[...p2Ids];n[0]=e.target.value;s==='p1'?setP1Ids(n):setP2Ids(n);}} disabled={gameState==='playing'} className="bg-gray-800 text-white p-1.5 text-sm rounded border border-gray-700 font-bold w-full"><CharacterOptions/></select>}
                     <span className={`text-xs ${t.tit} font-semibold mt-1`}>{char.title}</span><p className="text-xs text-gray-400 h-28 overflow-y-auto whitespace-pre-wrap">{char.desc}</p>
                     {gameState!=='menu'&&<StatPanel stat={stat} isDummy={isD} isEndless={isE} hpThreshold={isD?500:30} />}
                 </div>
             );
          };


          const renderTeamCard = s => {
             const isP=s==='p1', slotCount=getTeamSlotCount(gameMode, s), ids=(isP?p1Ids:p2Ids).slice(0, slotCount);
             return (
               <div className={`p-3 rounded-xl border-2 ${isP?'border-blue-500 bg-blue-950/30':'border-red-500 bg-red-950/30'} flex flex-col gap-2 w-full`}>
                 <div className="flex justify-between items-center mb-1"><span className={`text-sm font-bold ${isP?'text-blue-400':'text-red-400'}`}>{gameMode==='1v4'?(isP?'討伐小隊 (HP:250)':'首領 BOSS (HP:5000)'):(gameMode==='3v3'?(isP?'Team 1 (3人)':'Team 2 (3人)'):(gameMode==='regen'?(isP?'Team 1 (4人)':'Team 2 (4人)'):`Team ${isP?'1':'2'}`))}</span><Users size={16} className={isP?'text-blue-400':'text-red-400'} /></div>
                 {ids.map((cid, i) => { const stat=uiStats[s]?.[i];
                   const char=ROSTER[cid];
                   const isLocked = isP?p1Locks[i]:p2Locks[i];
                   return (
                   <div key={i} className="flex flex-col gap-1 p-1.5 bg-gray-900/60 rounded-lg border border-gray-800">
                     <div className="flex items-center gap-1.5"><button onClick={()=>toggleLock(s,i)} className={`shrink-0 p-0.5 rounded text-[10px] ${isP?(p1Locks[i]?'bg-blue-600/50 text-white':'text-gray-600'):(p2Locks[i]?'bg-red-600/50 text-white':'text-gray-600')}`}>{isLocked?'🔒':'🔓'}</button><select value={cid} onChange={e=>{const n=[...(isP?p1Ids:p2Ids)];n[i]=e.target.value;(isP?setP1Ids:setP2Ids)(n);}} disabled={gameState==='playing'} className="bg-transparent text-white text-xs font-bold outline-none flex-1 truncate hover:bg-gray-800 rounded px-1 py-0.5"><CharacterOptions/></select></div>
                     {gameState!=='menu'&&stat&&<><StatPanel stat={stat} isDummy={false} isEndless={false} hpThreshold={['3v3','1v4','regen'].includes(gameMode)?150:30} /></>}
                   </div> ); })}
               </div>
             );
          };


          return (
            <div className="min-h-screen bg-gray-950 text-white font-sans p-4 flex flex-col items-center overflow-x-hidden">
              <header className="mb-4 text-center w-full max-w-[1280px]">
                <h1 className="text-2xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 drop-shadow-sm">世界圈 · 武器球對決</h1>
                {gameState === 'menu' && (
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                       {[{id:'ffa',l:'單人作戰',c:'indigo'},{id:'3v3',l:'3v3 大亂鬥',c:'orange'},{id:'regen',l:'4v4 再生模式',c:'emerald'},{id:'1v4',l:'1v4 討伐戰',c:'rose'},{id:'test',l:'傷害測試',c:'amber'},{id:'intervention',l:'神之手干預',c:'purple'}].map(m => <button key={m.id} onClick={()=>{wakeAudio(); setGameMode(m.id);}} className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${gameMode===m.id?`bg-${m.c}-600 border-${m.c}-400 text-white shadow-[0_0_15px_currentColor]`:'border-gray-700 text-gray-400'}`}>{m.l}</button>)}
                       <button onClick={toggleSound} className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${soundEnabled?'border-cyan-400 text-cyan-300':'border-gray-700 text-gray-400'}`}>{soundEnabled?'音效開':'音效關'}</button>
                    </div>
                )}
                {gameState === 'menu' && gameMode === 'ffa' && <div className="mt-2.5 flex justify-center items-center gap-3 bg-gray-900/50 p-1.5 rounded-lg border border-gray-800 w-fit mx-auto"><span className="text-gray-400 text-xs font-bold">參戰人數：</span>{[2,3,4,5].map(n=><button key={n} onClick={()=>setFfaCount(n)} className={`px-3 py-1 rounded-full text-xs font-bold ${ffaCount===n?'bg-indigo-600 text-white':'text-gray-500'}`}>{Array(n).fill('1').join('v')}</button>)}</div>}
                {gameState === 'menu' && gameMode === '3v3' && <div className="mt-2.5 flex justify-center items-center gap-3 bg-gray-900/50 p-1.5 rounded-lg border border-gray-800 w-fit mx-auto"><span className="text-gray-400 text-xs font-bold">對戰場景：</span><button onClick={()=>setScene('default')} className={`px-3 py-1 rounded-full text-xs font-bold ${scene==='default'?'bg-gray-700 text-white':'text-gray-500'}`}>常規競技場</button><button onClick={()=>setScene('court')} className={`px-3 py-1 rounded-full text-xs font-bold ${scene==='court'?'bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.6)]':'text-gray-500'}`}>星宇法庭</button></div>}
                {gameState === 'menu' && gameMode === 'test' && <div className="mt-2.5 flex justify-center items-center gap-3 bg-gray-900/50 p-1.5 rounded-lg border border-gray-800 w-fit mx-auto"><span className="text-gray-400 text-xs font-bold">測試項目：</span><button onClick={()=>setTestType('dummy')} className={`px-3 py-1 rounded-full text-xs font-bold ${testType==='dummy'?'bg-amber-600 text-white':'text-gray-500'}`}>巨大木樁</button><button onClick={()=>setTestType('endless')} className={`px-3 py-1 rounded-full text-xs font-bold ${testType==='endless'?'bg-teal-600 text-white shadow-[0_0_10px_rgba(20,184,166,0.6)]':'text-gray-500'}`}>無盡生存</button></div>}
                {gameState !== 'menu' && <p className="text-gray-400 text-xs mt-2 flex items-center justify-center gap-2"><Activity size={14} className={{'test':testType==='dummy'?'text-amber-400':'text-teal-400','intervention':'text-purple-400','1v4':'text-rose-400','3v3':'text-orange-400','regen':'text-emerald-400'}[gameMode]||'text-indigo-400'} /> {gameMode==='3v3'?'大地圖亂鬥模式':gameMode==='1v4'?'四人協力討伐巨型首領':gameMode==='regen'?'20殺團隊死鬥 (無限復活)':gameMode==='test'?(testType==='dummy'?'極限 DPS 測試':'無限波次生存挑戰'):gameMode==='intervention'?'神明介入戰局':'多陣營單人混戰'} <Activity size={14} className={{'test':testType==='dummy'?'text-amber-400':'text-teal-400','intervention':'text-purple-400','1v4':'text-rose-400','3v3':'text-orange-400','regen':'text-emerald-400'}[gameMode]||'text-indigo-400'} /></p>}
              </header>


              <div className="flex flex-col md:flex-row gap-4 w-full max-w-[1300px] justify-center items-start">
                <div className="w-full md:w-56 lg:w-64 flex flex-col gap-3 order-2 md:order-1 md:sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
                   {gameMode === 'ffa' ? Array.from({length: Math.ceil(ffaCount/2)}).map((_, i) => renderFfaCard(i)) : ['test', 'intervention'].includes(gameMode) ? renderPlayerCard('p1') : renderTeamCard('p1')}
                   {gameState === 'menu' && <div className="w-full mt-1"><button onClick={handleRandomMatch} className="w-full py-2 rounded-xl text-xs font-bold border-2 border-teal-700 text-teal-400 hover:bg-teal-900/30 flex items-center justify-center gap-2">🎲 隨機配置</button></div>}
                </div>


                <div className={`order-1 md:order-2 flex-1 w-full ${['3v3','1v4','regen'].includes(gameMode) ? 'max-w-[720px]' : 'max-w-[480px]'} flex flex-col items-center min-w-[280px]`}>
                    <div className="p-2 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 w-full relative">
                        <canvas ref={canvasRef} width={['3v3','1v4','regen'].includes(gameMode) ? 900 : 600} height={['3v3','1v4','regen'].includes(gameMode) ? 900 : 600} className="bg-black rounded-xl block w-full aspect-square" />
                        {gameState === 'over' && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 rounded-2xl backdrop-blur-md">
                                <div className="text-center bg-gray-900 p-6 rounded-2xl border border-gray-700">
                                    <h2 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">{winner==='draw'?'平局':gameMode==='test'?(testType==='dummy'?(winner==='p1'?'挑戰成功':'時間耗盡'):'挑戰結束！'):gameMode==='1v4'?(winner==='p1'?'討伐成功！':'首領獲勝！'):gameMode==='regen'?`Team ${winner==='p1'?'1':'2'} 先達20殺！`:gameMode==='ffa'?`Player ${winner.replace('p','')} 勝出`:`Team ${winner==='p1'?'1':'2'} 勝出`}</h2>
                                    <p className="text-gray-400 mb-5 text-sm">{gameMode==='test'?(testType==='dummy'?'木樁測試結束':`共存活了 ${engineRef.current?.endlessWave-1} 波`):(gameMode==='1v4'?'討伐戰結束':'全自動演練完畢')}</p>
                                    <button onClick={goToMenu} className="px-5 py-2 bg-gray-800 text-white rounded-lg font-bold flex items-center gap-2 mx-auto border border-gray-600 text-sm"><RotateCcw size={16} /> 返回配置</button>
                                </div>
                            </div>
                        )}
                    </div>
                    {gameState === 'menu' && (
                        <div className="w-full mt-3"><button onClick={startGame} className={`w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 ${gameMode==='3v3'?'bg-gradient-to-r from-orange-600 to-red-600':gameMode==='1v4'?'bg-gradient-to-r from-rose-600 to-pink-600':gameMode==='regen'?'bg-gradient-to-r from-emerald-600 to-teal-600':gameMode==='test'?(testType==='dummy'?'bg-gradient-to-r from-amber-600 to-orange-600':'bg-gradient-to-r from-teal-600 to-emerald-600'):gameMode==='intervention'?'bg-gradient-to-r from-purple-600 to-pink-600':'bg-gradient-to-r from-indigo-600 to-blue-600'}`}><Play size={20} fill="currentColor" /> {gameMode==='3v3'?'展開大亂鬥':gameMode==='1v4'?'開始討伐':gameMode==='regen'?'開始無限再生':gameMode==='test'?(testType==='dummy'?'開始木樁測試':'開始無盡生存'):gameMode==='intervention'?'降臨干預模式':'啟動大逃殺'}</button></div>
                    )}
                    {gameState === 'playing' && (
                        <div className="flex flex-col gap-2.5 mt-3 w-full">
                            {gameMode === 'intervention' && (
                                <div className="w-full p-3 rounded-xl border-2 border-purple-500 bg-purple-900/20">
                                    <h3 className="text-purple-300 font-bold mb-2 text-center text-sm border-b border-purple-500/30 pb-1.5">✨ 神之手干預</h3>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button onClick={()=>triggerIntervention('heal')} className="py-1.5 bg-emerald-600/30 border border-emerald-500 text-emerald-300 rounded text-xs font-bold">🩸 天降聖餐</button>
                                        <button onClick={()=>triggerIntervention('bomb')} className="py-1.5 bg-red-600/30 border border-red-500 text-red-300 rounded text-xs font-bold">☄️ 天降火雨</button>
                                        <button onClick={()=>triggerIntervention('chaos')} className="py-1.5 bg-violet-600/30 border border-violet-500 text-violet-300 rounded text-xs font-bold">🌀 混亂風暴</button>
                                        <button onClick={()=>triggerIntervention('stun')} className="py-1.5 bg-amber-600/30 border border-amber-500 text-amber-300 rounded text-xs font-bold">⏳ 時間凍結</button>
                                        <button onClick={()=>triggerIntervention('rule_damage')} className="py-1.5 col-span-2 bg-gray-800 border border-gray-500 text-gray-300 rounded text-xs font-bold mt-0.5">⚔️ 切換死鬥法則 (200%傷害)</button>
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-2 w-full">
                                <button onClick={toggleSpeed} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-1 ${gameSpeed===2?'bg-indigo-600/80 border-indigo-400 text-white':'bg-gray-800 border-gray-600 text-gray-300'}`}><FastForward size={16} fill="currentColor" /> {gameSpeed}x</button>
                                <button onClick={()=>{wakeAudio(); togglePause();}} className={`flex-[1.5] py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${isPaused?'bg-emerald-600':'bg-amber-600'}`}>{isPaused?<Play size={16} fill="currentColor" />:<Pause size={16} fill="currentColor" />} {isPaused?'繼續':'暫停'}</button>
                                <button onClick={toggleSound} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 ${soundEnabled?'bg-cyan-900/50 border-cyan-500 text-cyan-200':'bg-gray-800 border-gray-600 text-gray-300'}`}>{soundEnabled?'音效開':'音效關'}</button>
                                <button onClick={goToMenu} className="flex-1 py-2.5 bg-red-600/90 rounded-xl text-sm font-bold flex items-center justify-center gap-1 text-white"><RotateCcw size={16} /> 返回</button>
                            </div>
                        </div>
                    )}
                </div>


                <div className="w-full md:w-56 lg:w-64 flex flex-col gap-3 order-3 md:sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
                   {gameMode === 'ffa' ? Array.from({length: floor(ffaCount/2)}).map((_, i) => renderFfaCard(i + Math.ceil(ffaCount/2))) : ['test', 'intervention'].includes(gameMode) ? renderPlayerCard('p2', gameMode==='test'?testType:null) : renderTeamCard('p2')}
                </div>
              </div>
            </div>
          );
        }


        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
