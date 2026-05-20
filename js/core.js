const { useState, useEffect, useRef } = React;
        const { PI, cos, sin, random, floor, max, min, hypot, atan2, abs, sign } = Math;
        const Play = ({ size=24, fill="none" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>);
        const Pause = ({ size=24, fill="none" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>);
        const FastForward = ({ size=24, fill="none" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 19 22 12 13 5 13 19"></polygon><polygon points="2 19 11 12 2 5 2 19"></polygon></svg>);
        const RotateCcw = ({ size=24 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>);
        const Activity = ({ size=24, className }) => (<svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>);
        const Users = ({ size=24, className }) => (<svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>);


        const DT = 1/60, BASE_SPEED = 320, BALL_RADIUS = 35;
        const distance = (x1, y1, x2, y2) => hypot(x2-x1, y2-y1);
        const normalize = (vx, vy) => { const l = hypot(vx, vy); return l===0 ? {x:0, y:0} : {x:vx/l, y:vy/l}; };
        const sTxt = (e, x, y, text, color, dy=-30, maxL=1) => e.spawnParticle({type:'text', x, y:y+dy, text, color, maxLifespan:maxL});
const cloneProjs = arr => arr.map(p => { const c={...p}; if(p.hitSet) c.hitSet=new Set(p.hitSet); if(p.hitCooldowns) c.hitCooldowns={...p.hitCooldowns}; if(p.physCooldowns) c.physCooldowns={...p.physCooldowns}; return c; });
const cloneBalls = arr => arr.map(b => { const c={...b, statuses:b.statuses.map(s=>({...s}))}; if(b.walls) c.walls=b.walls.map(w=>({...w})); if(b.hermesList) c.hermesList=[...b.hermesList]; if(b.hephaestusList) c.hephaestusList=[...b.hephaestusList]; if(b.zeusList) c.zeusList=[...b.zeusList]; if(b.doomHeal) c.doomHeal={...b.doomHeal}; c.snapshot=null; return c; });

const createSoundManager = () => {
  let ctx = null;
  let enabled = true;
  const cooldowns = new Map();
  let masterGain = null;
  let compressor = null;

  const ensureContext = () => {
    if (ctx) return ctx;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.9;
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 10;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.18;
    masterGain.connect(compressor);
    compressor.connect(ctx.destination);
    return ctx;
  };

  const now = () => performance.now();
  const throttled = (key, ms) => {
    const t = now();
    const prev = cooldowns.get(key) || 0;
    if (t - prev < ms) return true;
    cooldowns.set(key, t);
    return false;
  };

  const tone = (audioCtx, {
    type = "sine",
    frequency = 440,
    frequencyEnd = null,
    duration = 0.12,
    volume = 0.04,
    attack = 0.005,
    release = 0.08,
    detune = 0,
  }) => {
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t0);
    if (frequencyEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, frequencyEnd), t0 + duration);
    if (detune) osc.detune.value = detune;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(attack + 0.01, duration + release));
    osc.connect(gain);
    gain.connect(masterGain || audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + release + 0.02);
  };

  const noise = (audioCtx, {
    duration = 0.05,
    volume = 0.02,
    attack = 0.001,
    release = 0.03,
    highpass = 600,
    lowpass = 4800,
  }) => {
    const frameCount = Math.max(1, floor(audioCtx.sampleRate * duration));
    const buffer = audioCtx.createBuffer(1, frameCount, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      data[i] = (random() * 2 - 1) * (1 - i / frameCount);
    }
    const source = audioCtx.createBufferSource();
    const hp = audioCtx.createBiquadFilter();
    const lp = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    const t0 = audioCtx.currentTime;
    source.buffer = buffer;
    hp.type = "highpass";
    hp.frequency.value = highpass;
    lp.type = "lowpass";
    lp.frequency.value = lowpass;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration + release);
    source.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(masterGain || audioCtx.destination);
    source.start(t0);
    source.stop(t0 + duration + release + 0.02);
  };

  return {
    unlock() {
      const audioCtx = ensureContext();
      if (!audioCtx) return;
      if (audioCtx.state === "suspended") audioCtx.resume();
    },
    setEnabled(value) {
      enabled = value;
    },
    play(name, options = {}) {
      if (!enabled) return;
      const audioCtx = ensureContext();
      if (!audioCtx) return;
      if (audioCtx.state === "suspended") return;

      const intensity = Math.max(0.6, Math.min(2, options.intensity || 1));

      if (name === "collision") {
        if (throttled("collision", 45)) return;
        noise(audioCtx, { duration: 0.03, volume: 0.02 * intensity, highpass: 900, lowpass: 4200 });
        tone(audioCtx, { type: "triangle", frequency: 220 * intensity, frequencyEnd: 92, duration: 0.1, volume: 0.048 * intensity, release: 0.06 });
        tone(audioCtx, { type: "square", frequency: 132, frequencyEnd: 72, duration: 0.07, volume: 0.022 * intensity, release: 0.05, detune: 7 });
      } else if (name === "projectileHit") {
        if (throttled("projectileHit", 40)) return;
        noise(audioCtx, { duration: 0.022, volume: 0.014 * intensity, highpass: 1600, lowpass: 7200 });
        tone(audioCtx, { type: "square", frequency: 520, frequencyEnd: 210, duration: 0.06, volume: 0.028 * intensity, release: 0.04 });
        tone(audioCtx, { type: "triangle", frequency: 860, frequencyEnd: 320, duration: 0.035, volume: 0.015 * intensity, release: 0.03 });
      } else if (name === "wallHit") {
        if (throttled("wallHit", 60)) return;
        noise(audioCtx, { duration: 0.035, volume: 0.017 * intensity, highpass: 700, lowpass: 3800 });
        tone(audioCtx, { type: "sawtooth", frequency: 170, frequencyEnd: 74, duration: 0.11, volume: 0.038 * intensity, release: 0.07 });
        tone(audioCtx, { type: "triangle", frequency: 90, frequencyEnd: 55, duration: 0.09, volume: 0.02 * intensity, release: 0.07 });
      } else if (name === "rebirth") {
        noise(audioCtx, { duration: 0.06, volume: 0.018, highpass: 900, lowpass: 6000 });
        tone(audioCtx, { type: "sawtooth", frequency: 180, frequencyEnd: 540, duration: 0.28, volume: 0.055, release: 0.16 });
        tone(audioCtx, { type: "triangle", frequency: 260, frequencyEnd: 780, duration: 0.22, volume: 0.042, attack: 0.01, release: 0.18, detune: 12 });
      } else if (name === "laserBurst") {
        if (throttled("laserBurst", 120)) return;
        noise(audioCtx, { duration: 0.025, volume: 0.012, highpass: 2400, lowpass: 9200 });
        tone(audioCtx, { type: "sawtooth", frequency: 980, frequencyEnd: 250, duration: 0.18, volume: 0.034, release: 0.08 });
        tone(audioCtx, { type: "triangle", frequency: 480, frequencyEnd: 170, duration: 0.15, volume: 0.024, release: 0.08, detune: -8 });
      } else if (name === "fireCast") {
        if (throttled("fireCast", 80)) return;
        tone(audioCtx, { type: "sawtooth", frequency: 280, frequencyEnd: 120, duration: 0.14, volume: 0.026, release: 0.07 });
        tone(audioCtx, { type: "triangle", frequency: 520, frequencyEnd: 260, duration: 0.08, volume: 0.014, release: 0.05 });
      } else if (name === "iceArcane") {
        if (throttled("iceArcane", 70)) return;
        tone(audioCtx, { type: "triangle", frequency: 640, frequencyEnd: 320, duration: 0.12, volume: 0.02, release: 0.06 });
        tone(audioCtx, { type: "sine", frequency: 960, frequencyEnd: 720, duration: 0.06, volume: 0.012, release: 0.04 });
      } else if (name === "holyCast") {
        if (throttled("holyCast", 90)) return;
        tone(audioCtx, { type: "sine", frequency: 520, frequencyEnd: 780, duration: 0.16, volume: 0.024, release: 0.1 });
        tone(audioCtx, { type: "triangle", frequency: 780, frequencyEnd: 1180, duration: 0.12, volume: 0.014, release: 0.09 });
      } else if (name === "natureCast") {
        if (throttled("natureCast", 80)) return;
        tone(audioCtx, { type: "triangle", frequency: 240, frequencyEnd: 360, duration: 0.11, volume: 0.02, release: 0.06 });
        tone(audioCtx, { type: "sine", frequency: 420, frequencyEnd: 300, duration: 0.1, volume: 0.012, release: 0.06 });
      } else if (name === "shadowCast") {
        if (throttled("shadowCast", 80)) return;
        tone(audioCtx, { type: "sawtooth", frequency: 220, frequencyEnd: 110, duration: 0.13, volume: 0.02, release: 0.08 });
        tone(audioCtx, { type: "triangle", frequency: 330, frequencyEnd: 150, duration: 0.1, volume: 0.012, release: 0.08, detune: -14 });
      } else if (name === "lightningCast") {
        if (throttled("lightningCast", 70)) return;
        tone(audioCtx, { type: "square", frequency: 1200, frequencyEnd: 260, duration: 0.08, volume: 0.018, release: 0.04 });
        tone(audioCtx, { type: "triangle", frequency: 700, frequencyEnd: 180, duration: 0.1, volume: 0.014, release: 0.05 });
      } else if (name === "portalCast") {
        if (throttled("portalCast", 100)) return;
        tone(audioCtx, { type: "sine", frequency: 180, frequencyEnd: 420, duration: 0.12, volume: 0.018, release: 0.09 });
        tone(audioCtx, { type: "triangle", frequency: 360, frequencyEnd: 140, duration: 0.14, volume: 0.012, release: 0.08 });
      } else if (name === "summonCast") {
        if (throttled("summonCast", 110)) return;
        tone(audioCtx, { type: "triangle", frequency: 300, frequencyEnd: 520, duration: 0.16, volume: 0.02, release: 0.08 });
      } else if (name === "buffCast") {
        if (throttled("buffCast", 70)) return;
        tone(audioCtx, { type: "sine", frequency: 520, frequencyEnd: 700, duration: 0.09, volume: 0.014, release: 0.05 });
      } else if (name === "debuffCast") {
        if (throttled("debuffCast", 70)) return;
        tone(audioCtx, { type: "square", frequency: 300, frequencyEnd: 180, duration: 0.08, volume: 0.014, release: 0.05 });
      } else if (name === "explosionCast") {
        if (throttled("explosionCast", 100)) return;
        tone(audioCtx, { type: "sawtooth", frequency: 160, frequencyEnd: 50, duration: 0.18, volume: 0.03, release: 0.08 });
      }
    },
    playProjectile(projectile = {}) {
      const type = projectile.type || "";
      if (["spirit", "bomb"].includes(type)) return this.play("fireCast");
      if (["ring", "tracker", "page", "word", "cross_laser"].includes(type)) return this.play("iceArcane");
      if (["sprout", "bird"].includes(type)) return this.play("natureCast");
      if (["dagger", "cone", "knight", "steed"].includes(type)) return this.play("collision");
      if (["shadow"].includes(type)) return this.play("shadowCast");
      if (["energy_domain"].includes(type)) return this.play("natureCast");
      if (["note"].includes(type)) return this.play("holyCast");
      return this.play("projectileHit");
    },
    playWave(wave = {}) {
      if (wave.color?.includes("255,69,0")) return this.play("fireCast");
      if (wave.color?.includes("248,113,113")) return this.play("explosionCast");
      if (wave.color?.includes("251,191,36")) return this.play("holyCast");
      if (wave.color?.includes("216, 180, 254") || wave.color?.includes("168,85,247")) return this.play("portalCast");
      return this.play("laserBurst");
    },
    playObstacle(obstacle = {}) {
      const type = obstacle.type || "";
      if (["portal"].includes(type)) return this.play("portalCast");
      if (["thought_core", "sprout", "heal_field", "health_pack"].includes(type)) return this.play("natureCast");
      if (["sacrament", "balance_ring", "gavel"].includes(type)) return this.play("holyCast");
      if (["damage_field", "rgb_light"].includes(type)) return this.play("explosionCast");
      if (["podoasg_wall", "quzhe_domain", "quzhe_rift", "horizon_zone"].includes(type)) return this.play("shadowCast");
      return this.play("buffCast");
    },
    playStatus(type) {
      if (["burn", "warning", "vulnerable"].includes(type)) return this.play("fireCast");
      if (["stun", "slow", "knockback"].includes(type)) return this.play("lightningCast");
      if (["regen", "regen_small", "shield", "shield_dr", "haste", "haste_double", "excited"].includes(type)) return this.play("buffCast");
      if (["rooted"].includes(type)) return this.play("natureCast");
      if (["silenced", "bell_shock", "synesthesia"].includes(type)) return this.play("debuffCast");
    },
  };
};
