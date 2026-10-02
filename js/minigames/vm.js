(function () {
  'use strict';
  const PQ = window.PQ, C = PQ.C;
  const RULES = { goals: [10, 14, 18], seconds: [90, 105, 115], cpu: 16, ram: 64, motion: 15, stuck: 22 };
  PQ.registerMinigame({
    id: 'vm', title: 'VM TETRIS', payout: 20,
    help: ['LEFT/RIGHT or A/D: select host.', 'DOWN/S or SPACE: drop VM.', 'Click a host to select and drop.', 'Fit BOTH CPU and RAM. 3 strikes lose.', 'HA PAIR partners need separate hosts.', 'X / click vMotion: move a placed VM.', 'vMotion recharges every 15 seconds.'],
    create(api) {
      const level = api.boss ? 3 : PQ.clamp(api.level || 1, 1, 3), perks = api.perks || {};
      const goal = api.boss ? 24 : RULES.goals[level - 1], limit = api.boss ? 140 : RULES.seconds[level - 1];
      const count = level === 1 ? 3 : 4, width = 304 / count;
      const hosts = Array.from({ length: count }, () => ({ cpu: 0, ram: 0, vms: [] }));
      // This resource cycle fits when dealt round-robin, including all 24 boss VMs.
      const queue = Array.from({ length: goal }, (_, i) => ({
        name: ['SQL', 'WEB', 'APP'][i % 3] + String(i + 1).padStart(2, '0'),
        cpu: [2, 4, 2][i % 3], ram: [8, 8, 16][i % 3],
        pair: level >= 2 && i % 4 < 2 ? Math.floor(i / 4) + 1 : 0
      }));
      const particles = [];
      let placed = 0, strikes = 0, lane = 0, y = 75, elapsed = 0, cooldown = 0, stuck = 0;
      let done = false, pause = 0, repeat = 0, lastDir = 0, flash = 0, shake = 0;
      let notice = 'BALANCE CPU + RAM ACROSS HOSTS';
      function fits(h, vm) {
        return h.cpu + vm.cpu <= RULES.cpu && h.ram + vm.ram <= RULES.ram &&
          (!vm.pair || !h.vms.some(v => v.pair === vm.pair));
      }
      function burst(x, color) {
        for (let i = 0; i < 12; i++) particles.push({ x, y: 145, vx: (Math.random() - 0.5) * 70, vy: -20 - Math.random() * 50, life: 0.6, color });
      }
      function finish(success) {
        if (done) return;
        done = true;
        const loads = hosts.map(h => (h.cpu / RULES.cpu + h.ram / RULES.ram) / 2);
        const balance = 1 - (Math.max(...loads) - Math.min(...loads));
        api.finish({ success, quality: success ? PQ.clamp(0.65 * (1 - strikes / 3) + 0.35 * balance, 0, 1) : 0 });
      }
      function drop() {
        if (done || pause > 0) return;
        const vm = queue[placed], h = hosts[lane];
        if (!fits(h, vm)) {
          strikes++; notice = vm.pair && h.vms.some(v => v.pair === vm.pair) ? 'HA PAIR MUST USE DIFFERENT HOSTS!' : 'OVERCOMMIT! CHECK CPU AND RAM';
          flash = 1; shake = 0.4; pause = 0.9; y = 75; PQ.sfx('error'); burst(8 + (lane + 0.5) * width, C.red);
          if (strikes >= 3) finish(false);
          return;
        }
        h.vms.push(vm); h.cpu += vm.cpu; h.ram += vm.ram; placed++; stuck = 0;
        notice = vm.name + ' ONLINE'; PQ.sfx('coin'); burst(8 + (lane + 0.5) * width, C.green);
        y = 75; pause = 0.35;
        if (placed >= goal) finish(true);
      }
      function motion() {
        if (cooldown > 0 || done) return;
        const moves = [];
        hosts.forEach((from, a) => from.vms.forEach((vm, index) => hosts.forEach((to, b) => {
          if (a === b || !fits(to, vm)) return;
          const remainder = { cpu: from.cpu - vm.cpu, ram: from.ram - vm.ram, vms: from.vms.filter((_, i) => i !== index) };
          moves.push({ from, to, vm, index, frees: fits(remainder, queue[placed]) });
        })));
        if (!moves.length) { notice = 'NO LEGAL vMOTION - REBALANCE EARLY'; PQ.sfx('error'); return; }
        const helpful = moves.filter(m => m.frees), pool = helpful.length ? helpful : moves;
        const m = pool[Math.floor(Math.random() * pool.length)];
        m.from.vms.splice(m.index, 1); m.from.cpu -= m.vm.cpu; m.from.ram -= m.vm.ram;
        m.to.vms.push(m.vm); m.to.cpu += m.vm.cpu; m.to.ram += m.vm.ram;
        cooldown = RULES.motion; notice = 'vMOTION: ' + m.vm.name + ' MOVED'; PQ.sfx('zap');
      }
      return {
        update(dt) {
          if (done) return;
          dt = PQ.clamp(dt, 0, 0.05); elapsed += dt; cooldown = Math.max(0, cooldown - dt);
          pause = Math.max(0, pause - dt); flash = Math.max(0, flash - dt); shake = Math.max(0, shake - dt);
          particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 100 * dt; p.life -= dt; });
          for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
          if (elapsed >= limit) { finish(false); return; }
          const I = PQ.input, m = I.mouse;
          if (I.pressed('KeyX') || (m.clicked && PQ.inRect(m, 190, 218, 122, 21))) motion();
          const dir = (I.down('ArrowRight') || I.down('KeyD') ? 1 : 0) - (I.down('ArrowLeft') || I.down('KeyA') ? 1 : 0);
          repeat -= dt;
          if (dir && (dir !== lastDir || repeat <= 0)) { lane = PQ.clamp(lane + dir, 0, count - 1); repeat = 0.19; PQ.sfx('blip'); }
          lastDir = dir;
          let clickDrop = false;
          if (m.clicked && PQ.inRect(m, 8, 72, 304, 143)) { lane = Math.floor((m.x - 8) / width); clickDrop = true; }
          const room = hosts.some(h => fits(h, queue[placed]));
          stuck = room ? 0 : stuck + dt;
          if (!room && pause <= 0) notice = 'NO HOST FITS! X vMOTION: ' + Math.ceil(RULES.stuck - stuck) + 's';
          if (stuck >= RULES.stuck) { finish(false); return; }
          if (pause > 0) return;
          if (clickDrop || I.pressed('Space') || I.pressed('ArrowDown') || I.pressed('KeyS')) { drop(); return; }
          // A blocked queue waits for vMotion rather than repeatedly auto-striking.
          if (room) { y += (level === 1 ? 11 : 15) * dt; if (y >= 139) drop(); }
        },
        draw(g) {
          PQ.rect(g, 0, 16, 320, 224, C.black);
          if (api.boss) {
            PQ.text(g, api.bossName || 'HYPERVISOR BOSS', 8, 18, C.red, { size: 7, font: PQ.MONO });
            PQ.rect(g, 8, 28, 304, 3, C.dgrey); PQ.rect(g, 8, 28, 304 * (1 - placed / goal), 3, C.red);
          }
          PQ.text(g, 'VM ' + placed + '/' + goal, 8, 35, C.ice);
          PQ.text(g, 'X ' + strikes + '/3', 126, 35, strikes ? C.red : C.grey);
          PQ.text(g, Math.ceil(Math.max(0, limit - elapsed)) + 's', 312, 35, C.yellow, { align: 'right' });
          PQ.text(g, notice, 160, 49, flash ? C.yellow : C.cyan, { size: 8, font: PQ.MONO, align: 'center' });
          const current = queue[Math.min(placed, goal - 1)];
          PQ.text(g, current.name + ' ' + current.cpu + 'c/' + current.ram + 'G' + (current.pair ? '  HA PAIR ' + current.pair : ''), 160, 61, C.white, { size: 9, font: PQ.MONO, align: 'center' });
          const sx = shake > 0 ? Math.round(Math.sin(elapsed * 95) * 2) : 0;
          hosts.forEach((h, i) => {
            const x = 8 + i * width + sx, hot = i === lane;
            PQ.rect(g, x, 74, width - 3, 73, hot ? C.navy : C.black);
            PQ.box(g, x, 148, width - 3, 67, hot ? C.blue : C.navy);
            PQ.text(g, 'HOST ' + (i + 1), x + 4, 152, hot ? C.yellow : C.ice, { size: 8, font: PQ.MONO });
            PQ.rect(g, x + width - 12, 153, 3, 3, Math.floor(elapsed * 4 + i) % 2 ? C.green : C.dgrey);
            [['CPU', h.cpu, RULES.cpu, C.cyan], ['RAM', h.ram, RULES.ram, C.purple]].forEach((r, j) => {
              PQ.text(g, r[0] + ' ' + r[1] + '/' + r[2], x + 4, 164 + j * 20, C.ice, { size: 8, font: PQ.MONO });
              PQ.rect(g, x + 4, 175 + j * 20, width - 11, 5, C.black);
              PQ.rect(g, x + 4, 175 + j * 20, (width - 11) * r[1] / r[2], 5, r[3]);
            });
            PQ.text(g, h.vms.length + ' VMs', x + 4, 204, C.grey, { size: 8, font: PQ.MONO });
            h.vms.forEach((v, j) => {
              PQ.rect(g, x + 4, 142 - j * 8, width - 11, 6, v.pair ? C.purple : C.blue);
              if (v.pair) PQ.text(g, 'HA ' + v.pair, x + 6, 141 - j * 8, C.white, { size: 7, font: PQ.MONO });
            });
            if (perks.label && !done && fits(h, current)) PQ.text(g, 'FIT', x + width - 23, 204, C.green, { size: 7, font: PQ.MONO });
          });
          if (!done) {
            const x = 8 + lane * width + sx + 4, w = width - 11, h = 19 + current.ram / 4;
            PQ.box(g, x, y, w, h, flash ? C.red : C.royal);
            PQ.text(g, current.name, x + w / 2, y + 3, C.white, { size: 8, font: PQ.MONO, align: 'center' });
            PQ.text(g, current.cpu + 'c/' + current.ram + 'G', x + w / 2, y + 13, C.yellow, { size: 8, font: PQ.MONO, align: 'center' });
          }
          particles.forEach(p => { if (p.y >= 74 && p.y < 213) PQ.rect(g, p.x, p.y, 2, 2, p.color); });
          PQ.text(g, 'A/D SELECT  SPACE DROP', 8, 226, C.grey, { size: 7, font: PQ.MONO });
          PQ.box(g, 190, 218, 122, 21, cooldown ? C.navy : C.blue);
          PQ.text(g, 'X vMotion ' + (cooldown ? Math.ceil(cooldown) + 's' : 'READY'), 251, 225, cooldown ? C.grey : C.green, { size: 8, font: PQ.MONO, align: 'center' });
        }
      };
    }
  });
})();
