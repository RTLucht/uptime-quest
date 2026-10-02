(function () {
  'use strict';
  const PQ = window.PQ, C = PQ.C;
  const GRID = { x: 10, y: 88, size: 20, cols: 15, rows: 7 };
  const TASKS = [
    { name: 'USB Lockdown', target: 'Kiosks' },
    { name: 'Screen Timeout', target: 'Nurses' },
    { name: 'Audit Baseline', target: 'Servers', enforced: true },
    { name: 'Drive Mapping', target: 'Executives' },
    { name: 'App Allowlist', target: 'Kiosks' }
  ];
  PQ.registerMinigame({
    id: 'gpo', title: 'GROUP POLICY MAZE', payout: 50,
    help: ['ARROWS/WASD: move. SPACE: LINK GPO.', 'Click a tile to walk; click LINK.', 'Match the GPO to its named OU room.', 'Wrong links lock out a whole floor!', 'Get Delegation keys for Deny ACLs.', 'Block Inheritance: link there DIRECT.', 'Enforced links prevent overrides.'],
    create(api) {
      const level = api.boss ? 3 : PQ.clamp(api.level || 1, 1, 3), perks = api.perks || {};
      const total = [3, 4, 5][level - 1], limit = api.boss ? 62 : [90, 85, 80][level - 1];
      const rooms = [
        { name: 'Nurses', x: 0, y: 0, w: 4, h: 2 }, { name: 'Kiosks', x: 11, y: 0, w: 4, h: 2 },
        { name: 'Servers', x: 0, y: 5, w: 4, h: 2 }, { name: 'Executives', x: 11, y: 5, w: 4, h: 2 },
        { name: 'Floor', x: 6, y: 0, w: 3, h: 2 }
      ];
      const cells = Array.from({ length: GRID.rows }, () => Array(GRID.cols).fill(false));
      rooms.forEach(r => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) cells[y][x] = true; });
      [[3, 2], [3, 3], [4, 3], [5, 3], [5, 2], [6, 2], [7, 2], [7, 3], [7, 4], [8, 4], [9, 4], [9, 3], [10, 3], [11, 3], [11, 2], [3, 4], [11, 4]].forEach(([x, y]) => { cells[y][x] = true; });
      const locks = level >= 2 ? [{ x: 11, y: 2, key: 'A', color: C.yellow }] : [];
      if (level >= 3) locks.push({ x: 3, y: 4, key: 'B', color: C.cyan });
      const keys = [{ x: 9, y: 4, key: 'A', color: C.yellow }, { x: 5, y: 2, key: 'B', color: C.cyan }].filter(k => locks.some(l => l.key === k.key));
      const held = new Set(), linked = [], particles = [];
      let px = 7, py = 3, index = 0, strikes = 0, elapsed = 0, done = false;
      let repeat = 0, lastDir = '', linkDelay = 0, flash = 0, shake = 0, route = [];
      let notice = 'DELIVER EACH POLICY TO ITS OU', noticeTime = 3;
      function roomAt(x, y) { return rooms.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h); }
      function open(x, y) {
        return !!(cells[y] && cells[y][x]) && !locks.some(l => l.x === x && l.y === y && !held.has(l.key));
      }
      function finish(success) {
        if (done) return;
        done = true;
        api.finish({ success, quality: success ? PQ.clamp(0.7 * (1 - strikes / 3) + 0.3 * (1 - elapsed / limit), 0, 1) : 0 });
      }
      function burst(color) {
        for (let i = 0; i < 12; i++) particles.push({ x: GRID.x + px * 20 + 10, y: GRID.y + py * 20 + 10, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.5, color });
      }
      function move(x, y) {
        if (!open(x, y)) {
          const lock = locks.find(l => l.x === x && l.y === y && !held.has(l.key));
          if (lock) { notice = 'DENY ACL ' + lock.key + ': GET DELEGATION ' + lock.key; noticeTime = 2; PQ.sfx('beep'); }
          return;
        }
        px = x; py = y; PQ.sfx('step');
        keys.forEach(k => {
          if (k.x === px && k.y === py && !held.has(k.key)) {
            held.add(k.key); notice = 'DELEGATION ' + k.key + ' GRANTED - ACL OPEN'; noticeTime = 2; burst(k.color); PQ.sfx('coin');
          }
        });
      }
      function pathTo(tx, ty) {
        if (!open(tx, ty)) {
          const lock = locks.find(l => l.x === tx && l.y === ty);
          notice = lock ? 'GET DELEGATION ' + lock.key + ' FIRST' : 'NO WALKABLE PATH'; noticeTime = 1.5; return [];
        }
        const queue = [{ x: px, y: py, path: [] }], seen = new Set([px + ',' + py]);
        for (let i = 0; i < queue.length; i++) {
          const node = queue[i];
          if (node.x === tx && node.y === ty) return node.path;
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
            const x = node.x + dx, y = node.y + dy, key = x + ',' + y;
            if (open(x, y) && !seen.has(key)) { seen.add(key); queue.push({ x, y, path: node.path.concat([{ x, y }]) }); }
          });
        }
        notice = 'PATH LOCKED - FIND DELEGATION KEY'; noticeTime = 2; return [];
      }
      function link() {
        if (done || linkDelay > 0) return;
        const room = roomAt(px, py), task = TASKS[index];
        linkDelay = 0.5;
        if (!room) { notice = 'ENTER AN OU ROOM BEFORE LINKING'; noticeTime = 2; PQ.sfx('beep'); return; }
        if (room.name !== task.target) {
          strikes++; flash = 0.3; shake = 0.4; burst(C.red); PQ.sfx('error');
          notice = 'WHOLE FLOOR LOCKED OUT'; noticeTime = 2.5;
          if (strikes >= 3) finish(false);
          return;
        }
        linked.push({ room: room.name, enforced: level >= 3 && !!task.enforced });
        index++; burst(C.green); PQ.sfx('success'); notice = 'LINKED DIRECTLY: OU=' + room.name; noticeTime = 2;
        route = [];
        if (index >= total) finish(true);
      }
      return {
        update(dt) {
          if (done) return;
          dt = PQ.clamp(dt, 0, 0.05); elapsed += dt; repeat -= dt; linkDelay -= dt; noticeTime -= dt;
          flash = Math.max(0, flash - dt); shake = Math.max(0, shake - dt);
          particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
          for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
          if (elapsed >= limit) { finish(false); return; }
          const I = PQ.input, m = I.mouse;
          if (m.clicked && PQ.inRect(m, GRID.x, GRID.y, 300, 140)) {
            const tx = Math.floor((m.x - GRID.x) / 20), ty = Math.floor((m.y - GRID.y) / 20);
            if (tx === px && ty === py) link(); else route = pathTo(tx, ty);
          }
          if (done) return;
          const dx = (I.down('ArrowRight') || I.down('KeyD') ? 1 : 0) - (I.down('ArrowLeft') || I.down('KeyA') ? 1 : 0);
          const dy = (I.down('ArrowDown') || I.down('KeyS') ? 1 : 0) - (I.down('ArrowUp') || I.down('KeyW') ? 1 : 0);
          const dir = dx ? dx + ',0' : dy ? '0,' + dy : '';
          if (dir) {
            route = [];
            if (repeat <= 0 || dir !== lastDir) { move(px + dx, py + (dx ? 0 : dy)); repeat = 0.14; }
          } else if (route.length && repeat <= 0) { const step = route.shift(); move(step.x, step.y); repeat = 0.14; }
          lastDir = dir;
          if (I.pressed('Space') || I.pressed('Enter') || (m.clicked && PQ.inRect(m, 252, 68, 60, 18))) link();
        },
        draw(g) {
          PQ.rect(g, 0, 16, 320, 224, C.black);
          if (api.boss) {
            PQ.text(g, api.bossName || 'POLICY BOSS', 8, 18, C.red, { size: 7, font: PQ.MONO });
            PQ.rect(g, 8, 28, 304, 3, C.dgrey); PQ.rect(g, 8, 28, 304 * (1 - index / total), 3, C.red);
          }
          PQ.text(g, 'LINK ' + index + '/' + total, 8, 35, C.ice);
          PQ.text(g, 'X ' + strikes + '/3', 127, 35, strikes ? C.red : C.grey);
          PQ.text(g, Math.ceil(Math.max(0, limit - elapsed)) + 's', 312, 35, C.yellow, { align: 'right' });
          const task = TASKS[Math.min(index, total - 1)], current = roomAt(px, py);
          PQ.text(g, 'GPO: ' + task.name + ' -> ' + task.target, 8, 48, C.yellow, { size: 9, font: PQ.MONO });
          const blocked = level >= 3 && task.target === 'Kiosks';
          PQ.text(g, blocked ? 'BLOCK INHERITANCE: DIRECT LINK REQUIRED' : level >= 3 && task.enforced ? 'ENFORCED: CHILD OVERRIDES DISABLED' : 'ARROWS/WASD WALK / SPACE LINK', 8, 61, blocked ? C.orange : C.grey, { size: 8, font: PQ.MONO });
          PQ.text(g, current ? 'HERE: OU=' + current.name : 'HERE: OU corridor', 8, 76, C.cyan, { size: 8, font: PQ.MONO });
          PQ.box(g, 252, 68, 60, 18, C.blue); PQ.text(g, 'LINK', 282, 73, C.white, { size: 8, font: PQ.MONO, align: 'center' });
          const sx = shake ? Math.round(Math.sin(elapsed * 95) * 2) : 0;
          for (let y = 0; y < GRID.rows; y++) for (let x = 0; x < GRID.cols; x++) {
            const rx = GRID.x + x * 20 + sx, ry = GRID.y + y * 20;
            PQ.rect(g, rx, ry, 19, 19, cells[y][x] ? (flash ? C.red : C.navy) : C.blue);
            if (!cells[y][x]) { PQ.rect(g, rx + 2, ry + 3, 15, 2, C.royal); PQ.rect(g, rx + 2, ry + 12, 15, 2, C.royal); }
          }
          rooms.forEach(r => {
            const x = GRID.x + r.x * 20 + sx, y = GRID.y + r.y * 20;
            const target = perks.label && r.name === task.target;
            PQ.stroke(g, x, y, r.w * 20 - 1, 39, target ? C.yellow : C.cyan);
            PQ.text(g, 'OU=' + r.name, x + r.w * 10, y + 3, C.ice, { size: 8, font: PQ.MONO, align: 'center' });
            if (level >= 3 && r.name === 'Kiosks') {
              PQ.text(g, 'BLOCK', x + 4, y + 16, C.orange, { size: 8, font: PQ.MONO });
              PQ.text(g, 'INHERITANCE', x + 4, y + 27, C.orange, { size: 8, font: PQ.MONO });
            } else if (r.name === 'Floor') PQ.text(g, 'PARENT', x + 6, y + 18, C.grey, { size: 8, font: PQ.MONO });
            else if (linked.some(l => l.room === r.name)) PQ.text(g, linked.some(l => l.room === r.name && l.enforced) ? 'ENFORCED' : 'LINK OK', x + 4, y + 17, C.green, { size: 8, font: PQ.MONO });
          });
          locks.forEach(l => {
            const x = GRID.x + l.x * 20 + sx, y = GRID.y + l.y * 20, unlocked = held.has(l.key);
            PQ.rect(g, x + 1, y + 1, 17, 17, unlocked ? C.green : l.color);
            PQ.text(g, unlocked ? 'OK' : l.key, x + 10, y + 5, C.black, { size: 8, font: PQ.MONO, shadow: false, align: 'center' });
            if (!unlocked) PQ.text(g, 'Deny ACL ' + l.key, x + (l.x < 7 ? 24 : -4), y + 5, l.color, { size: 8, font: PQ.MONO, align: l.x < 7 ? 'left' : 'right' });
          });
          keys.forEach(k => {
            if (held.has(k.key)) return;
            const x = GRID.x + k.x * 20 + sx, y = GRID.y + k.y * 20;
            PQ.rect(g, x + 4, y + 7, 11, 4, k.color); PQ.stroke(g, x + 2, y + 4, 7, 9, k.color);
            PQ.text(g, 'Delegation ' + k.key, x + (k.x < 7 ? -4 : 24), y + 3, k.color, { size: 8, font: PQ.MONO, align: k.x < 7 ? 'right' : 'left' });
          });
          route.forEach(p => PQ.rect(g, GRID.x + p.x * 20 + 9 + sx, GRID.y + p.y * 20 + 9, 2, 2, C.grey));
          const x = GRID.x + px * 20 + sx, y = GRID.y + py * 20;
          PQ.rect(g, x + 6, y + 8, 8, 10, C.white); PQ.rect(g, x + 7, y + 5, 6, 6, C.cyan);
          PQ.rect(g, x + 13, y + 11, 5, 6, C.yellow);
          particles.forEach(p => { if (p.y >= 88 && p.y < 226) PQ.rect(g, p.x, p.y, 2, 2, p.color); });
          PQ.text(g, noticeTime > 0 ? notice : 'DELEGATION KEYS: ' + ([...held].join(' + ') || 'NONE'), 160, 232, noticeTime > 0 ? C.yellow : C.grey, { size: 8, font: PQ.MONO, align: 'center' });
        }
      };
    }
  });
})();
