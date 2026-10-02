(function () {
  'use strict';
  const PQ = window.PQ, C = PQ.C;
  const GRID = { x: 16, y: 94, w: 32, h: 28, cols: 9, rows: 4 };
  const DEFENSES = [
    { name: 'EDR', cost: 35, color: C.cyan },
    { name: 'MFA', cost: 20, color: C.yellow },
    { name: 'BACKUP', cost: 25, color: C.green }
  ];
  const RULES = { waves: [3, 4, 5], packets: [6, 8, 10], income: 4, build: 6, waveGap: 22, spawnGap: 1.6 };
  PQ.registerMinigame({
    id: 'ransom', title: 'RANSOMWARE SIEGE', payout: 100,
    help: ['Click defense, then tile to build.', '1 EDR / 2 MFA / 3 IMMUTABLE BACKUP.', 'ARROWS/WASD: tile. SPACE: build.', 'Right-click or X: sell for 60%.', 'EDR shoots/slows worms + encryptors.', 'Only MFA stops credential stealers.', 'Backup restores once. Lose 2 servers.'],
    create(api) {
      const level = api.boss ? 3 : PQ.clamp(api.level || 1, 1, 3), perks = api.perks || {};
      const waves = RULES.waves[level - 1], packets = Math.ceil(RULES.packets[level - 1] * (api.boss ? 1.3 : 1));
      const total = waves * packets, deadline = RULES.build + waves * RULES.waveGap + 40;
      const towers = [], enemies = [], particles = [], beams = [];
      const servers = Array.from({ length: GRID.rows }, () => ({ encrypted: false, backup: false, used: false, flash: 0 }));
      let selected = 0, cx = 3, cy = 1, budget = 130, elapsed = 0, wave = 0, spawned = 0, resolved = 0;
      let nextWave = RULES.build, spawnClock = 0, repeat = 0, lastDir = '', done = false, shake = 0;
      let notice = '4 LANES: BUILD MFA + EDR BEFORE CONTACT', noticeTime = 5;
      function say(text, sound) { notice = text; noticeTime = 2.5; if (sound) PQ.sfx(sound); }
      function finish(success) {
        if (done) return;
        done = true;
        api.finish({ success, quality: servers.filter(s => !s.encrypted).length / servers.length });
      }
      function burst(x, y, color) {
        for (let i = 0; i < 10; i++) particles.push({ x, y, vx: (Math.random() - 0.5) * 70, vy: (Math.random() - 0.5) * 70, life: 0.5, color });
      }
      function build() {
        const def = DEFENSES[selected], server = servers[cy];
        if (selected === 2) {
          if (cx !== 8) { say('IMMUTABLE BACKUP GOES ON A SERVER', 'beep'); return; }
          if (server.encrypted || server.backup || server.used) { say(server.used ? 'RESTORE ALREADY USED ON THIS SERVER' : 'CHOOSE AN UNPROTECTED LIVE SERVER', 'beep'); return; }
        } else if (cx === 8 || towers.some(t => t.x === cx && t.y === cy)) { say('CHOOSE AN EMPTY LANE TILE', 'beep'); return; }
        if (budget < def.cost) { say('BUDGET REGENERATES: +4 EACH SECOND', 'beep'); return; }
        budget -= def.cost;
        if (selected === 2) server.backup = true;
        else towers.push({ x: cx, y: cy, type: selected, cooldown: 0, pulse: 0 });
        burst(GRID.x + cx * GRID.w + 16, GRID.y + cy * GRID.h + 14, def.color);
        say(def.name + ' DEPLOYED', 'select');
      }
      function sell() {
        if (cx === 8 && servers[cy].backup) { servers[cy].backup = false; budget += Math.floor(DEFENSES[2].cost * 0.6); say('BACKUP SOLD', 'coin'); return; }
        const i = towers.findIndex(t => t.x === cx && t.y === cy);
        if (i < 0) return;
        budget += Math.floor(DEFENSES[towers[i].type].cost * 0.6); towers.splice(i, 1); say('DEFENSE SOLD: 60% REFUND', 'coin');
      }
      function spawn() {
        const type = ['worm', 'credential', 'worm', 'encryptor', 'credential', 'encryptor'][spawned % 6];
        const hp = type === 'encryptor' ? 7 + level : type === 'worm' ? 3 : 1;
        enemies.push({ x: GRID.x - 9, lane: (spawned + wave - 1) % 4, type, hp, maxHp: hp, slow: 0, dead: false });
        spawned++;
      }
      function kill(e, color) {
        if (e.dead) return;
        e.dead = true; resolved++; budget += 2;
        burst(e.x, GRID.y + e.lane * GRID.h + 14, color); PQ.sfx('zap');
      }
      function encrypt(e) {
        const s = servers[e.lane]; e.dead = true; resolved++;
        if (s.encrypted) return;
        if (s.backup) {
          s.backup = false; s.used = true; s.flash = 1.3;
          burst(GRID.x + 8 * GRID.w + 16, GRID.y + e.lane * GRID.h + 14, C.green);
          say('IMMUTABLE RESTORE: SERVER ' + (e.lane + 1) + ' RECOVERED', 'cash');
        } else {
          s.encrypted = true; s.flash = 0.6; shake = 0.4;
          burst(GRID.x + 8 * GRID.w + 16, GRID.y + e.lane * GRID.h + 14, C.red);
          say('SERVER ' + (e.lane + 1) + ' ENCRYPTED!', 'boom');
          if (servers.filter(server => server.encrypted).length >= servers.length / 2) finish(false);
        }
      }
      return {
        update(dt) {
          if (done) return;
          dt = PQ.clamp(dt, 0, 0.05); elapsed += dt; budget = Math.min(999, budget + RULES.income * dt);
          noticeTime -= dt; repeat -= dt; shake = Math.max(0, shake - dt);
          particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
          for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
          for (let i = beams.length - 1; i >= 0; i--) { beams[i].life -= dt; if (beams[i].life <= 0) beams.splice(i, 1); }
          servers.forEach(s => { s.flash = Math.max(0, s.flash - dt); });
          const I = PQ.input, m = I.mouse;
          for (let i = 0; i < 3; i++) if (I.pressed('Digit' + (i + 1)) || (m.clicked && PQ.inRect(m, 8 + i * 104, 49, 96, 22))) { selected = i; PQ.sfx('blip'); }
          const dx = (I.down('ArrowRight') || I.down('KeyD') ? 1 : 0) - (I.down('ArrowLeft') || I.down('KeyA') ? 1 : 0);
          const dy = (I.down('ArrowDown') || I.down('KeyS') ? 1 : 0) - (I.down('ArrowUp') || I.down('KeyW') ? 1 : 0);
          const dir = dx + ',' + dy;
          if ((dx || dy) && (repeat <= 0 || dir !== lastDir)) { cx = PQ.clamp(cx + dx, 0, 8); cy = PQ.clamp(cy + dy, 0, 3); repeat = 0.16; }
          lastDir = dir;
          const gridClick = (m.clicked || m.rclicked) && PQ.inRect(m, GRID.x, GRID.y, GRID.cols * GRID.w, GRID.rows * GRID.h);
          if (gridClick) { cx = Math.floor((m.x - GRID.x) / GRID.w); cy = Math.floor((m.y - GRID.y) / GRID.h); }
          if ((gridClick && m.rclicked) || I.pressed('KeyX') || I.pressed('Delete')) sell();
          else if ((gridClick && m.clicked) || I.pressed('Space') || I.pressed('Enter')) build();
          if (wave < waves && elapsed >= nextWave) {
            wave++; spawned = 0; spawnClock = 0; nextWave += RULES.waveGap;
            say('WAVE ' + wave + ': RED LOCKS INBOUND', 'pager');
          }
          if (wave > 0 && spawned < packets) { spawnClock -= dt; if (spawnClock <= 0) { spawn(); spawnClock += RULES.spawnGap; } }
          towers.forEach(t => {
            t.cooldown = Math.max(0, t.cooldown - dt); t.pulse = Math.max(0, t.pulse - dt);
            if (t.type !== 0 || t.cooldown > 0) return;
            const tx = GRID.x + t.x * GRID.w + 16, ty = GRID.y + t.y * GRID.h + 14;
            const range = perks.reach ? 86 : 72;
            const targets = enemies.filter(e => !e.dead && e.type !== 'credential' && Math.hypot(e.x - tx, (e.lane - t.y) * GRID.h) <= range);
            targets.sort((a, b) => b.x - a.x);
            const target = targets[0];
            if (!target) return;
            target.hp--; target.slow = 0.8; t.cooldown = 0.55; t.pulse = 0.15;
            beams.push({ x: tx, y: ty, ex: target.x, ey: GRID.y + target.lane * GRID.h + 14, life: 0.1 });
            PQ.sfx('blip'); if (target.hp <= 0) kill(target, C.cyan);
          });
          for (const e of enemies) {
            if (e.dead) continue;
            const old = e.x, velocity = e.type === 'worm' ? 22 : e.type === 'credential' ? 17 : 12;
            e.slow = Math.max(0, e.slow - dt); e.x += velocity * (e.slow > 0 ? 0.55 : 1) * dt;
            if (e.type === 'credential') {
              const gate = towers.find(t => t.type === 1 && t.y === e.lane && t.cooldown <= 0 && old <= GRID.x + t.x * GRID.w + 24 && e.x >= GRID.x + t.x * GRID.w + 8);
              if (gate) { gate.cooldown = 0.7; gate.pulse = 0.4; kill(e, C.yellow); continue; }
            }
            if (e.x >= GRID.x + 8 * GRID.w) { encrypt(e); if (done) return; }
          }
          for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead) enemies.splice(i, 1);
          if (wave === waves && spawned === packets && !enemies.length) { finish(true); return; }
          if (elapsed >= deadline) finish(false);
        },
        draw(g) {
          PQ.rect(g, 0, 16, 320, 224, C.black);
          if (api.boss) {
            PQ.text(g, api.bossName || 'RANSOMWARE BOSS', 8, 18, C.red, { size: 7, font: PQ.MONO });
            PQ.rect(g, 8, 28, 304, 3, C.dgrey); PQ.rect(g, 8, 28, 304 * PQ.clamp(1 - resolved / total, 0, 1), 3, C.red);
          }
          PQ.text(g, '$' + Math.floor(budget), 8, 35, C.yellow);
          PQ.text(g, 'WAVE ' + wave + '/' + waves, 87, 35, C.ice);
          PQ.text(g, 'LIVE ' + servers.filter(s => !s.encrypted).length + '/4', 312, 35, C.green, { align: 'right' });
          DEFENSES.forEach((d, i) => {
            PQ.box(g, 8 + i * 104, 49, 96, 22, selected === i ? C.royal : C.navy);
            PQ.text(g, (i + 1) + ' ' + d.name + ' $' + d.cost, 56 + i * 104, 56, d.color, { size: 8, font: PQ.MONO, align: 'center' });
          });
          const hint = selected === 0 ? 'EDR: SHOOT + SLOW / CREDENTIALS IMMUNE' : selected === 1 ? 'MFA GATE: BLOCKS CREDENTIAL STEALERS' : 'IMMUTABLE BACKUP: ONE RESTORE / SERVER';
          PQ.text(g, noticeTime > 0 ? notice : hint, 160, 74, C.yellow, { size: 8, font: PQ.MONO, align: 'center' });
          PQ.text(g, 'PHISHING EMAIL >', 8, 85, C.red, { size: 7, font: PQ.MONO });
          PQ.text(g, 'SERVERS', 304, 85, C.cyan, { size: 7, font: PQ.MONO, align: 'right' });
          g.save(); g.beginPath(); g.rect(0, 93, 320, 114); g.clip();
          if (shake) g.translate(Math.round(Math.sin(elapsed * 100) * 2), 0);
          for (let row = 0; row < 4; row++) for (let col = 0; col < 9; col++) {
            const x = GRID.x + col * GRID.w, y = GRID.y + row * GRID.h;
            PQ.rect(g, x, y, 31, 27, col === 8 ? C.blue : C.navy);
            if (col < 8) { PQ.rect(g, x + 4, y + 13, 20, 1, C.blue); PQ.text(g, '>', x + 12, y + 9, C.blue, { size: 8, font: PQ.MONO }); }
          }
          servers.forEach((s, row) => {
            const x = GRID.x + 8 * GRID.w + 3, y = GRID.y + row * GRID.h + 2;
            const color = s.encrypted ? C.red : s.flash > 0 ? C.green : C.royal;
            PQ.box(g, x, y, 26, 23, color);
            for (let j = 0; j < 3; j++) {
              PQ.rect(g, x + 4, y + 4 + j * 6, 17, 4, C.black);
              PQ.rect(g, x + 5, y + 5 + j * 6, 2, 2, s.encrypted ? C.red : (Math.floor(elapsed * 4 + j) % 2 ? C.green : C.cyan));
            }
            if (s.backup) PQ.text(g, 'B', x + 18, y + 11, C.green, { size: 8, font: PQ.MONO });
            if (s.used && !s.encrypted) PQ.text(g, '1', x + 18, y + 11, C.grey, { size: 8, font: PQ.MONO });
            if (s.encrypted) { PQ.stroke(g, x + 9, y + 5, 8, 8, C.white); PQ.rect(g, x + 7, y + 10, 12, 9, C.red); PQ.rect(g, x + 12, y + 12, 2, 4, C.white); }
          });
          towers.forEach(t => {
            const x = GRID.x + t.x * GRID.w + 4, y = GRID.y + t.y * GRID.h + 5, color = DEFENSES[t.type].color;
            PQ.box(g, x, y, 24, 18, t.pulse > 0 ? color : C.blue);
            PQ.text(g, DEFENSES[t.type].name, x + 12, y + 6, t.pulse > 0 ? C.black : color, { size: 8, font: PQ.MONO, shadow: false, align: 'center' });
            if (t.type === 1) { PQ.rect(g, x - 2, y - 3, 2, 24, C.yellow); PQ.rect(g, x + 24, y - 3, 2, 24, C.yellow); }
          });
          beams.forEach(b => {
            const steps = Math.max(1, Math.ceil(Math.hypot(b.ex - b.x, b.ey - b.y) / 3));
            for (let i = 0; i <= steps; i++) PQ.rect(g, b.x + (b.ex - b.x) * i / steps, b.y + (b.ey - b.y) * i / steps, 2, 2, C.cyan);
          });
          enemies.forEach(e => {
            const x = e.x, y = GRID.y + e.lane * GRID.h + 14, col = e.type === 'credential' ? C.orange : C.red;
            PQ.stroke(g, x - 4, y - 9, 8, 9, col); PQ.rect(g, x - 7, y - 4, 14, 11, col);
            PQ.rect(g, x - 1, y - 1, 2, 5, C.black);
            PQ.text(g, e.type === 'credential' ? 'C' : e.type === 'worm' ? 'W' : 'E', x, y + 8, col, { size: 7, font: PQ.MONO, align: 'center' });
            PQ.rect(g, x - 7, y - 12, 14, 2, C.dgrey); PQ.rect(g, x - 7, y - 12, 14 * e.hp / e.maxHp, 2, e.slow > 0 ? C.cyan : col);
          });
          PQ.stroke(g, GRID.x + cx * GRID.w, GRID.y + cy * GRID.h, 31, 27, C.white);
          particles.forEach(p => PQ.rect(g, p.x, p.y, 2, 2, p.color));
          g.restore();
          PQ.text(g, 'W WORM  C CREDENTIAL  E ENCRYPTOR', 160, 211, C.grey, { size: 8, font: PQ.MONO, align: 'center' });
          const remaining = wave < waves ? 'NEXT WAVE ' + Math.ceil(Math.max(0, nextWave - elapsed)) + 's' : enemies.length + ' PACKETS LEFT';
          PQ.text(g, remaining, 8, 225, C.cyan, { size: 8, font: PQ.MONO });
          PQ.text(g, 'SPACE BUILD / X SELL', 312, 225, C.grey, { size: 8, font: PQ.MONO, align: 'right' });
        }
      };
    }
  });
})();
