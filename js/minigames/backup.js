(function () {
  'use strict';
  const PQ = window.PQ, C = PQ.C;
  const RULES = { clocks: [75, 70, 60], runs: [60, 55, 48], speeds: [48, 56, 64], floor: 207 };
  const DATES = ['MON 09/21', 'TUE 09/22', 'WED 09/23', 'THU 09/24', 'FRI 09/25'];
  PQ.registerMinigame({
    id: 'backup', title: 'BACKUP RESTORE RUN', payout: 50,
    help: ['Auto-run through the tape vault.', 'UP/W/SPACE: jump; again: double jump.', 'DOWN/S: slide. A/D: adjust run speed.', 'Click JUMP; hold SLIDE with mouse.', 'Get TUE tape, then reach the exit.', 'Wrong dates cost 3s. CORRUPT hurts.', 'Dodge robots, racks and tape stacks.'],
    create(api) {
      const level = api.boss ? 3 : PQ.clamp(api.level || 1, 1, 3), perks = api.perks || {};
      const limit = RULES.clocks[level - 1], speed = RULES.speeds[level - 1];
      const exit = 60 + speed * RULES.runs[level - 1], floor = RULES.floor;
      const tapes = [], hazards = [], particles = [], tapeCount = Math.floor((exit - 350) / 310);
      const rightIndex = Math.floor(tapeCount * 0.65);
      for (let i = 0; i < tapeCount; i++) {
        const day = i === rightIndex ? 1 : [0, 2, 3, 4][i % 4];
        tapes.push({ x: 280 + i * 310, y: floor - 16, day, corrupt: false, taken: false });
      }
      // Tape stations and hazards have separate run-ups, so the required tape is always reachable.
      const spacing = (level === 1 ? 310 : 260) / (api.boss ? 1.3 : 1);
      for (let x = 440, i = 0; x < exit - 180; x += spacing, i++) {
        if (tapes.some(t => Math.abs(t.x - x) < 85)) continue;
        const kind = ['rack', 'robot', 'stack'][i % 3];
        hazards.push({ x, kind, w: kind === 'rack' ? 44 : 22, y: 89, vy: 0, triggered: false, warning: 0, hit: false, phase: i });
        if (i % 3 === 1 && !tapes.some(t => Math.abs(t.x - x - 90) < 70)) tapes.push({ x: x + 90, y: floor - 16, corrupt: true, taken: false });
      }
      let x = 60, foot = floor, vy = 0, jumps = 0, hearts = 3, left = limit, elapsed = 0;
      let done = false, gotTape = false, slide = false, invincible = 0, shake = 0, flash = 0;
      let message = 'RESTORE THE TUESDAY SNAPSHOT', messageTime = 3;
      function burst(px, py, color) {
        for (let i = 0; i < 10; i++) particles.push({ x: px, y: py, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 60, life: 0.6, color });
      }
      function finish(success) {
        if (done) return;
        done = true;
        api.finish({ success, quality: success ? PQ.clamp(0.55 * left / limit + 0.45 * hearts / 3, 0, 1) : 0 });
      }
      function hurt(reason) {
        if (invincible > 0 || done) return;
        hearts--; invincible = 1.4; shake = 0.35; flash = 0.15;
        message = reason; messageTime = 2; PQ.sfx('hit'); burst(x, foot - 12, C.red);
        if (hearts <= 0) finish(false);
      }
      function hazardRect(h) {
        if (h.kind === 'rack') return { x: h.x, y: 148, w: h.w, h: 48 };
        if (h.kind === 'robot') return { x: h.x, y: 152 + Math.sin(elapsed * (1.8 + level * 0.2) + h.phase) * 33, w: h.w, h: 22 };
        return { x: h.x, y: h.y, w: h.w, h: 27 };
      }
      return {
        update(dt) {
          if (done) return;
          dt = PQ.clamp(dt, 0, 0.05); elapsed += dt; left -= dt;
          invincible = Math.max(0, invincible - dt); shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt); messageTime -= dt;
          particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 100 * dt; p.life -= dt; });
          for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
          if (left <= 0) { finish(false); return; }
          const I = PQ.input, m = I.mouse;
          const mouseSlide = m.down && PQ.inRect(m, 246, 217, 68, 22);
          slide = foot >= floor && (I.down('ArrowDown') || I.down('KeyS') || mouseSlide);
          const jump = I.pressed('ArrowUp') || I.pressed('KeyW') || I.pressed('Space') || (m.clicked && m.y >= 75 && !PQ.inRect(m, 246, 217, 68, 22));
          if (jump && jumps < 2 && !slide) { vy = -205; jumps++; PQ.sfx('blip'); burst(x, foot, C.cyan); }
          const adjust = (I.down('ArrowRight') || I.down('KeyD') ? 8 : 0) - (I.down('ArrowLeft') || I.down('KeyA') ? 8 : 0);
          x += (speed + adjust) * dt; vy += 400 * dt; foot += vy * dt;
          if (foot >= floor) { foot = floor; vy = 0; jumps = 0; }
          if (foot < 102) { foot = 102; vy = Math.max(0, vy); }
          const height = slide ? 9 : 23;
          hazards.forEach(h => {
            if (h.kind === 'stack' && x > h.x - 140 && !h.triggered) { h.triggered = true; h.warning = 0.65; }
            if (h.triggered) {
              h.warning -= dt;
              if (h.warning <= 0) { h.vy += 170 * dt; h.y = Math.min(floor - 27, h.y + h.vy * dt); }
            }
            const r = hazardRect(h);
            if (!h.hit && x + 12 > r.x && x < r.x + r.w && foot > r.y && foot - height < r.y + r.h) {
              h.hit = true; hurt(h.kind === 'rack' ? 'LOW RACK! HOLD DOWN TO SLIDE' : h.kind === 'robot' ? 'TAPE ROBOT COLLISION' : 'FALLING TAPE STACK!');
            }
          });
          if (done) return;
          for (const t of tapes) {
            if (t.taken || Math.abs(x + 6 - t.x) > (perks.reach ? 24 : 17) || foot < t.y - 3 || foot - height > t.y + 8) continue;
            t.taken = true;
            if (t.corrupt) { hurt('CORRUPT TAPE! -1 HEART'); if (done) return; }
            else if (t.day === 1) {
              gotTape = true; message = 'TUE SNAPSHOT VERIFIED - FIND EXIT'; messageTime = 3;
              PQ.sfx('cash'); burst(t.x, t.y, C.green);
            } else {
              left -= 3; message = 'WRONG DATE: ' + DATES[t.day] + '  -3s'; messageTime = 2;
              PQ.sfx('error'); burst(t.x, t.y, C.orange);
            }
          }
          if (left <= 0) { finish(false); return; }
          if (x >= exit) { message = gotTape ? 'RESTORE COMPLETE' : 'NO TUE TAPE - RESTORE FAILED'; finish(gotTape); }
        },
        draw(g) {
          PQ.rect(g, 0, 16, 320, 224, C.black);
          if (api.boss) {
            PQ.text(g, api.bossName || 'TAPE VAULT BOSS', 8, 18, C.red, { size: 7, font: PQ.MONO });
            PQ.rect(g, 8, 28, 304, 3, C.dgrey); PQ.rect(g, 8, 28, 304 * PQ.clamp((exit - x) / (exit - 60), 0, 1), 3, C.red);
          }
          PQ.text(g, 'RESTORE: Q3-BUDGET.XLSX from TUE', 8, 35, C.yellow, { size: 9, font: PQ.MONO });
          PQ.text(g, 'MEETING ' + Math.ceil(Math.max(0, left)) + 's', 8, 49, left < 15 ? C.red : C.ice, { size: 7 });
          PQ.text(g, 'HP ' + hearts, 141, 49, C.green, { size: 7 });
          PQ.text(g, gotTape ? 'TUE: VERIFIED' : 'TUE: MISSING', 312, 49, gotTape ? C.green : C.orange, { size: 8, font: PQ.MONO, align: 'right' });
          PQ.rect(g, 8, 61, 304, 3, C.navy); PQ.rect(g, 8, 61, 304 * PQ.clamp((x - 60) / (exit - 60), 0, 1), 3, C.cyan);
          if (messageTime > 0 || done) PQ.text(g, message, 160, 67, C.yellow, { size: 8, font: PQ.MONO, align: 'center' });
          const camera = x - 65 + (shake ? Math.sin(elapsed * 100) * 3 : 0);
          g.save(); g.beginPath(); g.rect(0, 79, 320, 136); g.clip();
          PQ.rect(g, 0, 79, 320, 136, flash ? C.dgrey : C.navy);
          for (let i = 0; i < 9; i++) {
            const rx = i * 48 - (x * 0.25 % 48);
            PQ.box(g, rx, 94, 38, 110, C.black);
            for (let j = 0; j < 6; j++) {
              PQ.rect(g, rx + 5, 102 + j * 15, 28, 10, C.blue);
              PQ.rect(g, rx + 8, 105 + j * 15, 3, 3, (Math.floor(elapsed * 3) + i + j) % 3 ? C.cyan : C.green);
            }
          }
          PQ.rect(g, 0, floor, 320, 8, C.royal); PQ.rect(g, 0, floor, 320, 2, C.cyan);
          hazards.forEach(h => {
            const r = hazardRect(h), hx = r.x - camera;
            if (hx < -70 || hx > 350) return;
            if (h.kind === 'robot') { PQ.rect(g, hx + 8, 79, 5, r.y - 79, C.grey); PQ.rect(g, hx - 2, r.y + 8, r.w + 4, 4, C.orange); }
            PQ.box(g, hx, r.y, r.w, r.h, h.hit ? C.dgrey : C.red);
            if (h.kind === 'stack') for (let j = 0; j < 3; j++) PQ.rect(g, hx + 3, r.y + 4 + j * 8, r.w - 6, 3, C.yellow);
            PQ.text(g, h.kind === 'rack' ? 'SLIDE' : h.kind === 'robot' ? 'ROBOT' : 'DROP!', hx + r.w / 2, r.y - 11, C.yellow, { size: 8, font: PQ.MONO, align: 'center' });
            if (h.warning > 0) PQ.text(g, '!', hx + 10, floor - 13, Math.floor(elapsed * 10) % 2 ? C.white : C.red);
          });
          tapes.forEach(t => {
            const tx = t.x - camera;
            if (t.taken || tx < -40 || tx > 360) return;
            const color = t.corrupt ? C.red : t.day === 1 ? C.green : C.cyan;
            PQ.box(g, tx - 10, t.y - 6, 20, 13, color);
            PQ.rect(g, tx - 6, t.y - 3, 4, 4, C.black); PQ.rect(g, tx + 2, t.y - 3, 4, 4, C.black);
            PQ.text(g, t.corrupt ? 'CORRUPT' : DATES[t.day], tx, t.y - 17, color, { size: 8, font: PQ.MONO, align: 'center' });
            if (!t.corrupt && t.day === 1) PQ.text(g, 'GET THIS', tx, t.y - 29, C.green, { size: 8, font: PQ.MONO, align: 'center' });
          });
          const ex = exit - camera;
          PQ.box(g, ex, 154, 36, 53, gotTape ? C.green : C.orange);
          PQ.text(g, 'EXIT', ex + 18, 167, C.black, { size: 8, font: PQ.MONO, shadow: false, align: 'center' });
          if (!(invincible > 0 && Math.floor(elapsed * 12) % 2)) {
            const px = x - camera, h = slide ? 9 : 23;
            PQ.rect(g, px, foot - h, 12, h, C.cyan); PQ.rect(g, px + 7, foot - h + 3, 4, 3, C.black);
            PQ.rect(g, px + (Math.floor(elapsed * 12) % 2 ? 0 : 7), foot - 3, 5, 3, C.white);
            if (gotTape) PQ.rect(g, px - 4, foot - 9, 4, 6, C.green);
          }
          particles.forEach(p => PQ.rect(g, p.x - camera, p.y, 2, 2, p.color));
          g.restore();
          PQ.text(g, 'W JUMP / S SLIDE', 8, 225, C.grey, { size: 8, font: PQ.MONO });
          PQ.box(g, 174, 217, 68, 22, C.blue); PQ.text(g, 'JUMP', 208, 224, C.white, { size: 8, font: PQ.MONO, align: 'center' });
          PQ.box(g, 246, 217, 68, 22, slide ? C.royal : C.blue); PQ.text(g, 'SLIDE', 280, 224, C.white, { size: 8, font: PQ.MONO, align: 'center' });
        }
      };
    }
  });
})();
