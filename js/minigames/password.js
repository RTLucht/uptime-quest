// PASSWORD RESET RUSH: Tapper-style help desk. Slide resets down the lanes to users before they storm off. Don't reset scammers.
(function () {
  'use strict';
  const PQ = window.PQ;
  const C = PQ.C;
  const LANES = [62, 102, 142, 182], DESK_X = 56;
  const ASKS = ['LOCKED OUT', 'FORGOT PW', 'NEW PHONE MFA', 'PW EXPIRED', 'CAPS LOCK?', 'LOCKED AGAIN'];
  const SCAMS = ["I'M THE CEO!", 'URGENT, NO TIME', 'JUST READ IT TO ME', 'SKIP THE MFA'];
  const SHIRTS = [C.green, C.sky, C.orange, C.purple, C.yellow, C.cyan];

  PQ.registerMinigame({
    id: 'password',
    title: 'PASSWORD RESET RUSH',
    payout: 10,
    help: [
      'Users are lining up at the desk.',
      'UP/DOWN pick a lane, SPACE slides',
      'a reset token down the lane.',
      'Users who reach the desk angry',
      '= strike. RED HOODIES are social',
      'engineers: DO NOT reset them!',
      'Click a lane also works.',
    ],
    create(api) {
      const lvl = api.boss ? 3 : api.level;
      const need = [12, 16, 20][lvl - 1] + (api.boss ? 4 : 0);
      const spawnEvery = [2.2, 1.8, 1.4][lvl - 1] * (api.boss ? 0.85 : 1);
      const speed = [14, 18, 22][lvl - 1] * (api.boss ? 1.15 : 1);
      const scamChance = [0.1, 0.18, 0.25][lvl - 1] + (api.boss ? 0.08 : 0);
      let lane = 1, users = [], tokens = [], served = 0, strikes = 0, t = 0, spawnT = 0.5, cd = 0, done = false, shake = 0, msg = null;
      const fx = [];

      function finish(success) {
        if (done) return;
        done = true;
        api.finish({ success, quality: success ? PQ.clamp(1 - strikes * 0.25, 0.2, 1) : 0 });
      }
      function strike(s) {
        strikes++; shake = 0.4; PQ.sfx('error'); msg = { s, t: 1.5, col: C.red };
        if (strikes >= 3) finish(false);
      }
      function send(l) {
        if (cd > 0) return;
        cd = 0.25; lane = l;
        tokens.push({ lane: l, x: DESK_X + 4 });
        PQ.sfx('blip');
      }

      return {
        update(dt) {
          if (done) return;
          t += dt; cd = Math.max(0, cd - dt); shake = Math.max(0, shake - dt);
          if (msg) { msg.t -= dt; if (msg.t <= 0) msg = null; }
          const I = PQ.input, m = I.mouse;
          if (I.anyPressed('ArrowUp', 'KeyW')) { lane = Math.max(0, lane - 1); PQ.sfx('step'); }
          if (I.anyPressed('ArrowDown', 'KeyS')) { lane = Math.min(3, lane + 1); PQ.sfx('step'); }
          if (I.anyPressed('Space', 'Enter')) send(lane);
          if (m.clicked && m.y > 44 && m.y < 204) send(PQ.clamp(Math.floor((m.y - 44) / 40), 0, 3));

          spawnT -= dt;
          if (spawnT <= 0) {
            spawnT = spawnEvery * PQ.rand(0.7, 1.3);
            const scam = Math.random() < scamChance;
            const open = [0, 1, 2, 3].filter((l) => !users.some((u) => u.lane === l && !u.leaving && u.x > 290));
            if (open.length) users.push({ lane: PQ.pick(open), x: 330, scam, ask: PQ.pick(scam ? SCAMS : ASKS), shirt: PQ.pick(SHIRTS), leaving: 0, walk: 0 });
          }
          users.forEach((u) => {
            u.walk += dt;
            if (u.leaving) { u.x += 90 * dt; u.leaving -= dt; return; }
            u.x -= speed * dt * (u.scam ? 1.2 : 1);
            if (u.x <= DESK_X + 8) {
              u.gone = true;
              if (u.scam) { PQ.sfx('coin'); msg = { s: 'VERIFIED CALLER... DENIED. NICE.', t: 1.3, col: C.green }; }
              else strike('USER STORMED OFF TO YOUR MANAGER!');
            }
          });
          tokens.forEach((tk) => {
            tk.x += 170 * dt;
            const hit = users.filter((u) => !u.gone && !u.leaving && u.lane === tk.lane && u.x <= tk.x + 6 && u.x > tk.x - 12).sort((a, b) => a.x - b.x)[0];
            if (hit) {
              tk.gone = true;
              for (let i = 0; i < 6; i++) fx.push({ x: hit.x, y: LANES[hit.lane], vx: PQ.rand(-30, 30), vy: PQ.rand(-50, -10), t: 0.6, col: hit.scam ? C.red : C.yellow });
              if (hit.scam) { hit.gone = true; strike('YOU RESET A SCAMMER! ACCOUNT TAKEOVER!'); }
              else { hit.leaving = 4; served++; PQ.sfx('coin'); if (served >= need) { PQ.sfx('cash'); finish(true); } }
            }
            if (tk.x > 330) tk.gone = true;
          });
          users = users.filter((u) => !u.gone && !(u.leaving && u.x > 340));
          tokens = tokens.filter((tk) => !tk.gone);
          fx.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; p.t -= dt; });
          for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t <= 0) fx.splice(i, 1);
        },
        draw(g) {
          g.save();
          if (shake > 0) g.translate(PQ.randi(-2, 2), 0);
          PQ.rect(g, -4, 16, 328, 224, C.black);
          PQ.text(g, 'SERVED ' + served + '/' + need, 8, 22, C.yellow, { size: 6 });
          for (let i = 0; i < 3; i++) PQ.rect(g, 294 + i * 8, 22, 6, 6, i < 3 - strikes ? C.red : C.dgrey);
          if (api.boss) PQ.text(g, api.bossName || 'BOSS', 160, 22, C.red, { size: 6, align: 'center' });
          PQ.text(g, 'HELP DESK  ext. 4357 (HELP)', 160, 226, C.grey, { size: 8, align: 'center', font: PQ.MONO });
          LANES.forEach((y, i) => {
            PQ.rect(g, DESK_X, y - 4, 268, 16, i % 2 ? C.navy : C.blue);
            PQ.rect(g, DESK_X, y + 12, 268, 2, C.dgrey);
            PQ.rect(g, DESK_X - 12, y - 12, 14, 26, C.brown);
            PQ.rect(g, DESK_X - 10, y - 10, 10, 7, C.black);
            PQ.rect(g, DESK_X - 9, y - 9, 8, 5, Math.floor(t * 2 + i) % 2 ? C.cyan : C.sky);
          });
          const ty = LANES[lane];
          PQ.rect(g, 18, ty - 6, 10, 12, C.royal);
          PQ.rect(g, 19, ty - 14, 8, 8, '#f0c090');
          PQ.rect(g, 18, ty - 15, 10, 3, C.dgrey);
          PQ.rect(g, 28, ty - 12, 2, 6, C.dgrey);
          PQ.rect(g, 19, ty + 6, 3, 5, C.dgrey); PQ.rect(g, 24, ty + 6, 3, 5, C.dgrey);
          tokens.forEach((tk) => { const y = LANES[tk.lane]; PQ.rect(g, tk.x, y, 8, 6, C.yellow); PQ.rect(g, tk.x + 2, y + 2, 4, 1, C.brown); });
          const front = {};
          users.forEach((u) => { if (!u.leaving && (!front[u.lane] || u.x < front[u.lane].x)) front[u.lane] = u; });
          users.forEach((u) => {
            const y = LANES[u.lane], x = Math.round(u.x), bob = Math.floor(u.walk * 6) % 2;
            PQ.rect(g, x - 4, y - 6 + bob, 9, 12, u.scam ? C.red : u.shirt);
            if (u.scam) PQ.rect(g, x - 5, y - 16 + bob, 11, 4, C.red);
            PQ.rect(g, x - 3, y - 14 + bob, 7, 8, '#f0c090');
            if (u.scam) PQ.rect(g, x - 3, y - 12 + bob, 7, 2, C.black);
            else { PQ.rect(g, x - 2, y - 11 + bob, 1, 1, C.black); PQ.rect(g, x + 1, y - 11 + bob, 1, 1, C.black); }
            PQ.rect(g, x - 3, y + 6, 3, 4, C.dgrey); PQ.rect(g, x + 1, y + 6, 3, 4, C.dgrey);
            if (!u.leaving && front[u.lane] !== u) PQ.text(g, '...', x, y - 24, C.grey, { size: 8, align: 'center', font: PQ.MONO });
            else if (!u.leaving) PQ.text(g, u.ask, x, y - 27, u.scam ? C.orange : u.x < 140 ? C.red : C.white, { size: 8, align: 'center', font: PQ.MONO });
            else PQ.text(g, 'THANKS!', x, y - 27, C.green, { size: 8, align: 'center', font: PQ.MONO });
          });
          fx.forEach((p) => PQ.rect(g, p.x, p.y, 2, 2, p.col));
          if (msg) PQ.text(g, msg.s, 160, 214, msg.col, { size: 10, align: 'center', font: PQ.MONO });
          g.restore();
        },
      };
    },
  });
})();
