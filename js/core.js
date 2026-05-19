// Shared React hooks, icons, constants, and helper functions.
const { useState, useEffect, useRef } = React;


        const Play = ({ size = 24, fill = "none" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>);
        const Pause = ({ size = 24, fill = "none" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>);
        const FastForward = ({ size = 24, fill = "none" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 19 22 12 13 5 13 19"></polygon><polygon points="2 19 11 12 2 5 2 19"></polygon></svg>);
        const RotateCcw = ({ size = 24 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>);
        const Activity = ({ size = 24, className }) => (<svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>);
        const Users = ({ size = 24 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>);


        const FPS = 60;
        const DT = 1 / FPS;
        const BASE_SPEED = 320;
        const BALL_RADIUS = 35;


        const distance = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const normalize = (vx, vy) => {
          const len = Math.hypot(vx, vy);
          if (len === 0) return { x: 0, y: 0 };
          return { x: vx / len, y: vy / len };
        };


        const cloneProjs = (arr) => arr.map(p => {
            const copy = {...p};
            if (p.hitSet) copy.hitSet = new Set(p.hitSet);
            if (p.hitCooldowns) copy.hitCooldowns = {...p.hitCooldowns};
            if (p.physCooldowns) copy.physCooldowns = {...p.physCooldowns};
            return copy;
        });
        
        const cloneBalls = (arr) => arr.map(b => {
            const copy = {...b, statuses: b.statuses.map(s => ({...s}))};
            if (b.walls) copy.walls = b.walls.map(w => ({...w}));
            if (b.hermesList) copy.hermesList = [...b.hermesList];
            if (b.hephaestusList) copy.hephaestusList = [...b.hephaestusList];
            if (b.zeusList) copy.zeusList = [...b.zeusList];
            if (b.doomHeal) copy.doomHeal = {...b.doomHeal};
            if (b.snapshot) copy.snapshot = null; 
            return copy;
        });

