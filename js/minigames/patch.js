// PATCH TUESDAY: whack-a-mole. Patch servers as they pop up; rebooting PROD during business hours costs a life.
(function () {
  'use strict';
  const PQ = window.PQ;
  const C = PQ.C;
  const COLS = 4, ROWS = 3, CW = 70, CH = 50, GX = 20, GY = 48;
  const KEYS = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyZ', 'KeyX', 'KeyC', 'KeyV'];
  const NAMES = ['WEB01', 'WEB02', 'SQL01', 'FS01', 'DC01', 'EXCH01', 'APP01', 'APP02', 'PRINT01', 'CTX01', 'BKP01', 'ERP01'];

  PQ.registerMinigame({
    id: 'patch',
    title: 'PATCH TUESDAY',
    payout: 20,
    help: [
      'Second Tuesday. Patches are out.',
      'YELLOW servers need a patch:',
      'CLICK them (or Q-R / A-F / Z-V).',
      'RED = PROD. Rebooting it before',
      '17:00 costs a LIFE. After 17:00',
      'the maintenance window opens.',
      'Missed patches = vuln meter.',
    ],
    create(api) {
      const lvl = api.boss ? 3 : api.level;
      const need = [18, 24, 30][lvl - 1] + (api.boss ? 4 : 0);
      const life = [2.2, 1.8, 1.4][lvl - 1] * (api.boss ? 0.9 : 1);
      const every = [0.9, 0.75, 0.6][lvl - 1];
      const prodChance = [0.2, 0.28, 0.35][lvl - 1];
      const DUR = 60, VULN_MAX = 5;
      const servers = NAMES.map((n) => ({ name: n, state: 'idle', t: 0, max: 1 }));
      let t = 0, spawnT = 0.6, patched = 0, lives = 3, vuln = 0, done = false, shake = 0, cur = 0, msg = null;
      const hour = () => 9 + (t / DUR) * 9;
      const windowOpen = () => hour() >= 17;

      function finish(success) {
        if (done) return;
        done = true;
        api.finish({ success, quality: success ? PQ.clamp(0.4 + lives * 0.15 + (1 - vuln / VULN_MAX) * 0.2 - (t / DUR) * 0.1, 0.1, 1) : 0 });
      }
      function hit(i) {
        const s = servers[i];
        cur = i;
        if (s.state === 'patch' || (s.state === 'prod' && windowOpen())) {
          s.state = 'done'; s.t = 0.5; patched++; PQ.sfx('coin');
          if (patched >= need) { PQ.sfx('cash'); finish(true); }
        } else if (s.state === 'prod') {
          s.state = 'crash'; s.t = 1; lives--; shake = 0.5; PQ.sfx('boom');
          msg = { s: s.name + ' REBOOTED AT ' + Math.floor(hour()) + ':00! USERS FURIOUS', t: 1.8 };
          if (lives <= 0) finish(false);
        } else PQ.sfx('blip');
      }

      return {
        update(dt) {
          if (done) return;
          t += dt; shake = Math.max(0, shake - dt);
          if (msg) { msg.t -= dt; if (msg.t <= 0) msg = null; }
          if (t >= DUR) { PQ.sfx('fail'); finish(false); return; }
          spawnT -= dt;
          if (spawnT <= 0) {
            spawnT = every * PQ.rand(0.6, 1.3);
            const free = servers.map((s, i) => (s.state === 'idle' ? i : -1)).filter((i) => i >= 0);
            if (free.length) {
              const s = servers[PQ.pick(free)];
              s.state = Math.random() < prodChance ? 'prod' : 'patch';
              s.t = s.max = s.state === 'prod' ? life * 1.4 : life;
            }
          }
          servers.forEach((s) => {
            if (s.state === 'idle') return;
            s.t -= dt;
            if (s.t > 0) return;
            if (s.state === 'patch') {
              vuln++; shake = 0.2; PQ.sfx('error');
              msg = { s: s.name + ' MISSED A PATCH. CVE OPEN.', t: 1.2 };
              if (vuln >= VULN_MAX) { msg = { s: 'BREACHED VIA AN UNPATCHED CVE!', t: 2 }; finish(false); }
            }
            s.state = 'idle';
          });
          const I = PQ.input, m = I.mouse;
          KEYS.forEach((k, i) => { if (I.pressed(k)) hit(i); });
          if (I.pressed('ArrowLeft')) cur = (cur + 11) % 12;
          if (I.pressed('ArrowRight')) cur = (cur + 1) % 12;
          if (I.pressed('ArrowUp')) cur = (cur + 8) % 12;
          if (I.pressed('ArrowDown')) cur = (cur + 4) % 12;
          if (I.anyPressed('Space', 'Enter')) hit(cur);
          if (m.clicked && PQ.inRect(m, GX, GY, COLS * CW, ROWS * CH)) hit(Math.floor((m.y - GY) / CH) * COLS + Math.floor((m.x - GX) / CW));
        },
        draw(g) {
          g.save();
          if (shake > 0) g.translate(PQ.randi(-3, 3), PQ.randi(-1, 1));
          PQ.rect(g, -4, 16, 328, 224, C.black);
          const h = Math.min(18, hour()), hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
          const open = windowOpen();
          PQ.text(g, String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'), 8, 22, open ? C.green : C.ice, { size: 8 });
          PQ.text(g, open ? 'MAINT WINDOW OPEN' : 'BUSINESS HOURS', 56, 23, open ? C.green : C.orange, { size: 6 });
          PQ.text(g, 'PATCHED ' + patched + '/' + need, 200, 23, C.yellow, { size: 6 });
          for (let i = 0; i < 3; i++) PQ.rect(g, 296 + i * 8, 34, 6, 6, i < lives ? C.red : C.dgrey);
          PQ.text(g, 'VULN', 8, 35, C.red, { size: 6 });
          PQ.rect(g, 36, 35, 60, 5, C.dgrey); PQ.rect(g, 36, 35, (60 * vuln) / VULN_MAX, 5, C.red);
          if (api.boss) PQ.text(g, api.bossName || 'BOSS', 200, 35, C.red, { size: 6 });
          servers.forEach((s, i) => {
            const x = GX + (i % COLS) * CW, y = GY + Math.floor(i / COLS) * CH;
            PQ.rect(g, x + 4, y + 2, CW - 8, CH - 6, C.dgrey);
            PQ.rect(g, x + 6, y + 4, CW - 12, CH - 10, C.navy);
            for (let u = 0; u < 3; u++) {
              PQ.rect(g, x + 8, y + 7 + u * 9, CW - 16, 7, C.blue);
              PQ.rect(g, x + CW - 14, y + 9 + u * 9, 2, 2, Math.floor(PQ.time * 5 + i + u * 2) % 3 ? C.green : C.black);
              PQ.rect(g, x + CW - 18, y + 9 + u * 9, 2, 2, Math.floor(PQ.time * 3 + i) % 2 ? C.orange : C.black);
            }
            PQ.text(g, s.name, x + CW / 2, y + CH - 15, C.ice, { size: 8, align: 'center', font: PQ.MONO });
            PQ.text(g, KEYS[i].slice(3), x + 9, y + CH - 15, C.dgrey, { size: 6 });
            if (s.state === 'patch' || s.state === 'prod') {
              const pop = Math.min(1, (s.max - s.t) * 6) * 6;
              const col = s.state === 'patch' ? C.yellow : open ? C.green : C.red;
              PQ.rect(g, x + 8, y + 12 - pop, CW - 16, 24, col);
              PQ.text(g, s.state === 'patch' ? 'PATCH ME' : open ? 'PATCH NOW' : 'PROD!', x + CW / 2, y + 14 - pop, C.black, { size: 9, align: 'center', font: PQ.MONO, shadow: false });
              PQ.text(g, s.state === 'prod' && !open ? 'DO NOT REBOOT' : 'KB50' + (31000 + i * 7), x + CW / 2, y + 25 - pop, C.black, { size: 7, align: 'center', font: PQ.MONO, shadow: false });
              PQ.rect(g, x + 8, y + 36 - pop, (CW - 16) * Math.max(0, s.t / s.max), 2, C.white);
            } else if (s.state === 'done') {
              PQ.text(g, 'OK', x + CW / 2, y + 12, C.green, { size: 10, align: 'center' });
            } else if (s.state === 'crash') {
              PQ.rect(g, x + 8, y + 6, CW - 16, 26, C.royal);
              PQ.text(g, ':(', x + CW / 2, y + 12, C.white, { size: 10, align: 'center' });
            }
            if (i === cur) PQ.stroke(g, x + 2, y, CW - 4, CH - 2, Math.floor(PQ.time * 4) % 2 ? C.yellow : C.white);
          });
          if (msg) PQ.text(g, msg.s, 160, 210, C.red, { size: 10, align: 'center', font: PQ.MONO });
          g.restore();
        },
      };
    },
  });
})();
