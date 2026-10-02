// DISK SPACE PANIC: snake-style. Eat junk files to free space before the volume hits 100%. Never eat system files.
(function () {
  'use strict';
  const PQ = window.PQ;
  const C = PQ.C;
  const CELL = 10, COLS = 30, ROWS = 17, GX = 10, GY = 44;

  const JUNK = ['app.log', 'debug.log', '~tmp123.tmp', 'MEMORY.DMP', 'old.bak', 'setup.msi', 'core.4411', 'IIS.log', 'cache.db-wal', 'thumbs.db'];
  const SYSTEM = ['ntoskrnl.exe', '/etc/passwd', 'pagefile.sys', 'NTDS.dit', '/boot/vmlinuz', 'hiberfil.sys'];

  PQ.registerMinigame({
    id: 'disk',
    title: 'DISK SPACE PANIC',
    payout: 10,
    help: [
      'C: is filling up fast!',
      'Eat old logs and temp junk to',
      'free space before it hits 100%.',
      'RED files are SYSTEM files:',
      'eating one = strike.',
      'Walls/yourself = strike.',
      'ARROWS / WASD to steer.',
    ],
    create(api) {
      const lvl = api.boss ? 3 : api.level;
      const need = [12, 15, 18][lvl - 1] + (api.boss ? 4 : 0);
      const step = [0.13, 0.11, 0.095][lvl - 1] * (api.boss ? 0.92 : 1);
      const growth = [1.0, 1.3, 1.6][lvl - 1] * (api.boss ? 1.2 : 1); // % per second
      let snake, dir, nextDir, acc = 0, vol = 68, eaten = 0, strikes = 0, t = 0, done = false, shake = 0, flash = 0, spurt = 6;
      const items = [];
      const parts = [];
      let msg = null;

      function reset() {
        snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
        dir = { x: 1, y: 0 }; nextDir = dir;
      }
      reset();
      const occupied = (x, y) => snake.some((s) => s.x === x && s.y === y) || items.some((it) => it.x === x && it.y === y);
      function spawn(sys) {
        for (let i = 0; i < 100; i++) {
          const x = PQ.randi(1, COLS - 2), y = PQ.randi(1, ROWS - 2);
          if (!occupied(x, y) && Math.abs(x - snake[0].x) + Math.abs(y - snake[0].y) > 3) {
            items.push({ x, y, sys, name: PQ.pick(sys ? SYSTEM : JUNK), size: sys ? 0 : PQ.randi(4, 9) });
            return;
          }
        }
      }
      for (let i = 0; i < 3; i++) spawn(false);
      for (let i = 0; i < lvl; i++) spawn(true);

      function finish(success) {
        if (done) return;
        done = true;
        api.finish({ success, quality: success ? PQ.clamp(1 - vol / 100 + 0.4 - strikes * 0.15, 0.1, 1) : 0 });
      }
      function strike(why) {
        strikes++; shake = 0.4; flash = 0.4; PQ.sfx('error');
        msg = { s: why, t: 1.4 };
        if (strikes >= 3) { finish(false); return; }
        reset();
      }
      function burst(x, y, col) { for (let i = 0; i < 10; i++) parts.push({ x, y, vx: PQ.rand(-60, 60), vy: PQ.rand(-60, 60), t: 0.5, col }); }

      return {
        update(dt) {
          if (done) return;
          t += dt; shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt);
          if (msg) { msg.t -= dt; if (msg.t <= 0) msg = null; }
          parts.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; });
          for (let i = parts.length - 1; i >= 0; i--) if (parts[i].t <= 0) parts.splice(i, 1);

          vol += growth * dt;
          if (api.boss) {
            spurt -= dt;
            if (spurt <= 0) { spurt = PQ.rand(5, 8); vol += 8; shake = 0.3; PQ.sfx('boom'); msg = { s: 'THE DISK HOG DUMPS A 40GB CRASH LOG!', t: 1.5 }; }
          }
          if (vol >= 100) { vol = 100; PQ.sfx('boom'); finish(false); return; }

          const I = PQ.input;
          const want = (x, y) => { if (x !== -dir.x || y !== -dir.y) nextDir = { x, y }; };
          if (I.anyPressed('ArrowUp', 'KeyW')) want(0, -1);
          if (I.anyPressed('ArrowDown', 'KeyS')) want(0, 1);
          if (I.anyPressed('ArrowLeft', 'KeyA')) want(-1, 0);
          if (I.anyPressed('ArrowRight', 'KeyD')) want(1, 0);

          acc += dt;
          while (acc >= step && !done) {
            acc -= step;
            dir = nextDir;
            const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
            if (h.x < 0 || h.y < 0 || h.x >= COLS || h.y >= ROWS) { strike('HIT THE PARTITION WALL!'); return; }
            if (snake.some((s) => s.x === h.x && s.y === h.y)) { strike('RECURSIVE DELETE OF YOURSELF!'); return; }
            snake.unshift(h);
            const idx = items.findIndex((it) => it.x === h.x && it.y === h.y);
            if (idx >= 0) {
              const it = items.splice(idx, 1)[0];
              const px = GX + it.x * CELL + 5, py = GY + it.y * CELL + 5;
              if (it.sys) { burst(px, py, C.red); spawn(true); strike('DELETED ' + it.name + '!'); return; }
              eaten++; vol = Math.max(5, vol - it.size); PQ.sfx('coin'); burst(px, py, C.green);
              msg = { s: 'rm ' + it.name + '  -' + it.size + '%', t: 0.9 };
              spawn(false);
              if (Math.random() < 0.25 && items.filter((x) => x.sys).length < lvl + 1) spawn(true);
              if (eaten >= need) { PQ.sfx('cash'); finish(true); return; }
              if (snake.length > 14) snake.pop(); // cap length so late game stays fair
            } else snake.pop();
          }
        },
        draw(g) {
          g.save();
          if (shake > 0) g.translate(PQ.randi(-2, 2), PQ.randi(-1, 1));
          PQ.rect(g, -4, 16, 328, 224, C.black);
          const vc = vol < 75 ? C.green : vol < 90 ? C.orange : C.red;
          PQ.text(g, 'C:\\', 8, 22, C.ice, { size: 6 });
          PQ.rect(g, 30, 21, 180, 9, C.dgrey);
          PQ.rect(g, 31, 22, 178 * vol / 100, 7, vc);
          for (let i = 1; i < 10; i++) PQ.rect(g, 30 + i * 18, 21, 1, 9, C.black);
          PQ.text(g, Math.floor(vol) + '% USED', 216, 22, vc, { size: 6 });
          PQ.text(g, eaten + '/' + need, 312, 22, C.yellow, { size: 6, align: 'right' });
          for (let i = 0; i < 3; i++) PQ.rect(g, 294 + i * 7, 33, 5, 5, i < 3 - strikes ? C.red : C.dgrey);
          if (api.boss) PQ.text(g, api.bossName || 'BOSS', 8, 33, C.red, { size: 6 });

          PQ.rect(g, GX - 2, GY - 2, COLS * CELL + 4, ROWS * CELL + 4, flash > 0 ? C.red : C.sky);
          PQ.rect(g, GX, GY, COLS * CELL, ROWS * CELL, C.navy);
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if ((x + y) % 2 === 0) PQ.rect(g, GX + x * CELL + 4, GY + y * CELL + 4, 2, 2, C.blue);

          items.forEach((it) => {
            const px = GX + it.x * CELL, py = GY + it.y * CELL;
            PQ.rect(g, px + 1, py, 8, 10, it.sys ? C.red : C.ice);
            PQ.rect(g, px + 6, py, 3, 3, C.navy);
            PQ.rect(g, px + 2, py + 4, 5, 1, it.sys ? C.yellow : C.grey);
            PQ.rect(g, px + 2, py + 6, 5, 1, it.sys ? C.yellow : C.grey);
            PQ.text(g, it.name, PQ.clamp(px + 5, 34, 286), py - 9, it.sys ? C.red : C.cyan, { size: 8, align: 'center', font: PQ.MONO });
          });
          snake.forEach((s, i) => {
            const px = GX + s.x * CELL, py = GY + s.y * CELL;
            if (i === 0) {
              PQ.rect(g, px, py, CELL, CELL, C.yellow);
              PQ.rect(g, px + 2 + dir.x * 2, py + 3 + dir.y * 2, 2, 2, C.black);
              PQ.rect(g, px + 6 + dir.x * 2, py + 3 + dir.y * 2, 2, 2, C.black);
            } else PQ.rect(g, px + 1, py + 1, CELL - 2, CELL - 2, i % 2 ? C.green : '#1f7a44');
          });
          parts.forEach((p) => PQ.rect(g, p.x, p.y, 2, 2, p.col));
          if (msg) PQ.text(g, msg.s, 160, 224, msg.s.startsWith('rm') ? C.green : C.red, { size: 10, align: 'center', font: PQ.MONO });
          g.restore();
        },
      };
    },
  });
})();
