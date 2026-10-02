// Overworld: The Enterprise. Tile map, player, sites, roaming enemies, week clock, uptime sign.
(function () {
  'use strict';
  const PQ = window.PQ;
  const C = PQ.C;
  const TS = 16, MW = 48, MH = 30, VIEW_Y = 16, VIEW_H = 224;
  const SOLID = { T: 1, '~': 1, B: 1, G: 1 };
  const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const RANK_SHORT = ['T1 ADMIN', 'SYSADMIN', 'SYS ENGINEER', 'SENIOR ENG', 'ARCHITECT', 'PRINCIPAL'];

  // ---- Map construction (deterministic) ----
  let seed = 2026;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  const tiles = [];
  for (let y = 0; y < MH; y++) { tiles.push([]); for (let x = 0; x < MW; x++) tiles[y].push(x === 0 || y === 0 || x === MW - 1 || y === MH - 1 ? 'T' : '.'); }
  const set = (x, y, c) => { if (x > 0 && y > 0 && x < MW - 1 && y < MH - 1) tiles[y][x] = c; };
  const road = (x, y) => { if (tiles[y][x] === '.') set(x, y, '#'); else if (tiles[y][x] === '~') set(x, y, '='); };

  for (let y = 1; y < MH - 1; y++) { set(14, y, '~'); set(36, y, '~'); }
  for (let x = 15; x < 36; x++) set(x, 9, '~');
  for (let x = 1; x < MW - 1; x++) road(x, 18);
  for (let y = 2; y < MH - 1; y++) road(24, y);
  for (let y = 3; y < MH - 1; y++) { road(7, y); road(42, y); }
  const gates = [
    { x: 36, y: 18, rank: 2, label: 'DC CASTLE BADGE: SYSTEM ENGINEER' },
    { x: 24, y: 9, rank: 3, label: 'HQ CAMPUS BADGE: SENIOR ENGINEER' },
  ];

  PQ.SITES = [];
  function building(id, name, x, y, w, h, doorX, doorSide, jx, jy, info) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, 'B');
    const dy = doorSide === 'top' ? y : y + h - 1;
    set(doorX, dy, 'D');
    let cx = doorX, cy = doorSide === 'top' ? dy - 1 : dy + 1;
    road(cx, cy);
    while (cy !== jy) { cy += Math.sign(jy - cy); road(cx, cy); }
    while (cx !== jx) { cx += Math.sign(jx - cx); road(cx, cy); }
    PQ.SITES.push(Object.assign({ id, name, x, y, w, h, doorX, doorY: dy, doorSide }, info));
  }
  building('hq', 'HQ', 17, 11, 6, 5, 20, 'bottom', 20, 18, { kind: 'hq', world: 0 });
  building('depot', 'SUPPLY DEPOT', 27, 12, 5, 4, 29, 'bottom', 29, 18, { kind: 'shop', world: 0 });
  building('noc', 'DATA CENTER', 27, 21, 6, 4, 29, 'top', 29, 18, { kind: 'final', world: 0 });
  building('branch', 'BRANCH OFFICE', 2, 3, 5, 4, 4, 'bottom', 7, 8, { kind: 'site', world: 1, boss: 'loop' });
  building('helpdesk', 'HELP DESK', 9, 11, 4, 4, 10, 'bottom', 7, 15, { kind: 'site', world: 1 });
  building('closet', 'SERVER CLOSET', 2, 21, 4, 3, 3, 'top', 3, 18, { kind: 'site', world: 1 });
  building('desk', "USER'S DESK", 9, 22, 4, 4, 10, 'top', 10, 18, { kind: 'site', world: 1 });
  building('castle', 'DC CASTLE', 43, 2, 4, 6, 44, 'bottom', 42, 9, { kind: 'site', world: 2, boss: 'bgp' });
  building('srvroom', 'SERVER ROOM', 37, 11, 4, 4, 38, 'bottom', 42, 16, { kind: 'site', world: 2 });
  building('cloud', 'CLOUD ISLAND', 43, 21, 4, 4, 44, 'top', 42, 19, { kind: 'site', world: 2 });
  building('tower', 'HQ TOWER', 17, 2, 6, 5, 19, 'bottom', 24, 7, { kind: 'site', world: 3, boss: 'auditor' });
  building('exec', 'EXEC SUITE', 27, 2, 7, 5, 30, 'bottom', 24, 8, { kind: 'site', world: 3 });
  PQ.siteById = (id) => PQ.SITES.find((s) => s.id === id);

  for (let i = 0; i < 170; i++) {
    const x = 1 + Math.floor(rnd() * (MW - 2)), y = 1 + Math.floor(rnd() * (MH - 2));
    if (tiles[y][x] !== '.') continue;
    let nearRoad = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const c = (tiles[y + dy] || [])[x + dx]; if (c && c !== '.' && c !== 'T' && c !== '~' && c !== 'f') nearRoad = true; }
    if (!nearRoad) set(x, y, rnd() < 0.85 ? 'T' : 'f');
  }

  const worldOf = (tx, ty) => (tx < 14 ? 1 : tx > 36 ? 2 : ty < 9 ? 3 : 0);

  // ---- Static map prerender ----
  let mapCanvas = null;
  const isRoadCh = (c) => c === '#' || c === 'D' || c === '=' || c === 'G';
  function prerender() {
    mapCanvas = document.createElement('canvas');
    mapCanvas.width = MW * TS; mapCanvas.height = MH * TS;
    const g = mapCanvas.getContext('2d');
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        const c = tiles[y][x], px = x * TS, py = y * TS;
        PQ.rect(g, px, py, TS, TS, C.navy);
        if ((x * 7 + y * 13) % 5 === 0) PQ.rect(g, px + 4, py + 10, 1, 1, C.blue);
        if ((x * 3 + y * 11) % 7 === 0) PQ.rect(g, px + 11, py + 4, 1, 1, C.blue);
        if (c === '#' || c === 'D' || c === '=') {
          PQ.rect(g, px, py, TS, TS, C.blue);
          const isR = (xx, yy) => isRoadCh((tiles[yy] || [])[xx]);
          if (!isR(x, y - 1)) PQ.rect(g, px, py, TS, 1, C.sky);
          if (!isR(x, y + 1)) PQ.rect(g, px, py + TS - 1, TS, 1, C.sky);
          if (!isR(x - 1, y)) PQ.rect(g, px, py, 1, TS, C.sky);
          if (!isR(x + 1, y)) PQ.rect(g, px + TS - 1, py, 1, TS, C.sky);
          if (isR(x - 1, y) || isR(x + 1, y)) { PQ.rect(g, px + 2, py + 7, 4, 2, C.royal); PQ.rect(g, px + 10, py + 7, 4, 2, C.royal); }
          else { PQ.rect(g, px + 7, py + 2, 2, 4, C.royal); PQ.rect(g, px + 7, py + 10, 2, 4, C.royal); }
          if (c === '=') {
            if (x === 14 || x === 36) { PQ.rect(g, px, py + 1, TS, 2, C.brown); PQ.rect(g, px, py + 13, TS, 2, C.brown); }
            else { PQ.rect(g, px + 1, py, 2, TS, C.brown); PQ.rect(g, px + 13, py, 2, TS, C.brown); }
          }
        } else if (c === 'T') {
          // server racks instead of trees (LEDs animated in draw)
          PQ.rect(g, px + 3, py + 1, 10, 14, C.dgrey);
          PQ.rect(g, px + 4, py + 2, 8, 12, C.black);
          for (let u = 0; u < 4; u++) PQ.rect(g, px + 5, py + 3 + u * 3, 6, 2, C.blue);
        } else if (c === 'f') {
          PQ.rect(g, px + 4, py + 6, 2, 2, C.cyan); PQ.rect(g, px + 10, py + 9, 2, 2, C.yellow); PQ.rect(g, px + 6, py + 11, 2, 2, C.ice);
        }
      }
    }
    PQ.SITES.forEach((s) => {
      const px = s.x * TS, py = s.y * TS, w = s.w * TS, h = s.h * TS;
      const roof = s.kind === 'hq' ? C.royal : s.kind === 'shop' ? C.brown : s.kind === 'final' ? C.red : s.world === 2 ? C.dgrey : s.world === 3 ? C.purple : C.sky;
      PQ.rect(g, px, py, w, h, C.grey);
      PQ.rect(g, px, py, w, 10, roof);
      PQ.rect(g, px, py + 10, w, 2, C.black);
      for (let wy = py + 16; wy < py + h - 12; wy += 12) for (let wx = px + 6; wx < px + w - 8; wx += 12) { PQ.rect(g, wx, wy, 6, 6, C.cyan); PQ.rect(g, wx, wy, 6, 2, C.ice); }
      if (s.kind === 'hq') PQ.drawBill(g, px + w / 2 - 22, py + 14, 44, 20, '');
      if (s.id === 'castle') for (let i = 0; i < 4; i++) PQ.rect(g, px + 2 + i * 16, py - 4, 8, 6, C.dgrey);
      if (s.id === 'cloud') { PQ.rect(g, px + 6, py + 16, w - 12, 10, C.white); PQ.rect(g, px + 14, py + 12, 20, 8, C.white); }
      const dx = s.doorX * TS, dy = s.doorY * TS, top = s.doorSide === 'top';
      PQ.rect(g, dx + 3, top ? dy : dy + 4, 10, 12, C.black);
      PQ.rect(g, dx + 4, top ? dy + 1 : dy + 5, 8, 11, C.brown);
      PQ.rect(g, dx + 10, top ? dy + 6 : dy + 10, 1, 2, C.yellow);
    });
  }

  // ---- Overworld scene ----
  const OW = (PQ.overworld = {});
  const player = { x: 0, y: 0, dir: 'down', anim: 0, stam: 100, hurt: 0, zap: 0 };
  let enemies = [], chests = [], toasts = [], bills = [], cam = { x: 0, y: 0 }, t = 0, prompt = null, clockMin = 8 * 60;
  OW.player = player;

  OW.reset = function () {
    const st = PQ.state;
    const hq = PQ.siteById('hq');
    player.x = st.px != null ? st.px : hq.doorX * TS + 8;
    player.y = st.py != null ? st.py : (hq.doorY + 1) * TS + 6;
    player.stam = 100;
    enemies = []; chests = []; bills = []; toasts = [];
    clockMin = st.clock || 8 * 60;
  };
  OW.toast = function (s, col) { toasts.push({ s, col: col || C.yellow, t: 3.5 }); if (toasts.length > 4) toasts.shift(); };
  OW.burstBills = function (amount) {
    const n = Math.min(12, Math.max(2, Math.floor(amount / 10)));
    for (let i = 0; i < n; i++) bills.push({ x: 160 + PQ.rand(-30, 30), y: 130 + PQ.rand(-20, 20), vx: PQ.rand(-60, 60), vy: PQ.rand(-120, -40), r: PQ.rand(-1, 1), t: 1.2 + i * 0.03 });
  };

  // Week clock: Read-Only Friday + uptime sign
  OW.dayName = () => DAYS[(PQ.state.day || 0) % 7];
  OW.isReadOnlyFriday = () => (PQ.state.day || 0) % 7 === 4 && clockMin / 60 >= PQ.CFG.fridayHour;
  PQ.outage = function (why) {
    const st = PQ.state;
    if (st.uptime > 0) { PQ.sfx('fail'); OW.toast('UPTIME RESET: ' + why, C.red); }
    st.uptime = 0;
  };

  function solidAt(px, py) {
    const c = (tiles[Math.floor(py / TS)] || [])[Math.floor(px / TS)];
    return c === undefined || !!SOLID[c];
  }
  function gateAt(tx, ty) { return gates.find((g) => g.x === tx && g.y === ty); }
  OW.refreshGates = function () {
    const rank = PQ.rankOf(PQ.state.earned);
    gates.forEach((g) => set(g.x, g.y, rank >= g.rank ? '=' : 'G'));
  };
  const collide = (x, y) => solidAt(x - 5, y - 3) || solidAt(x + 5, y - 3) || solidAt(x - 5, y + 6) || solidAt(x + 5, y + 6);

  const isMidnight = () => Math.floor(clockMin / 60) % 24 < 4;
  function nightAlpha() {
    const h = (clockMin / 60) % 24;
    if (h >= 20 || h < 5) return 0.45;
    if (h >= 18) return ((h - 18) / 2) * 0.45;
    if (h < 7) return ((7 - h) / 2) * 0.45;
    return 0;
  }

  // Enemy roster. ghostly = moves through walls.
  const TYPES = {
    blob: { hp: 1, ghostly: false },
    zombie: { hp: 3, ghostly: false },
    slime: { hp: 1, ghostly: false },
    svc: { hp: 1, ghostly: true },
    hoarder: { hp: 5, ghostly: false },
    cert: { hp: 3, ghostly: true },
  };
  function spawnEnemies(dt) {
    const rank = PQ.rankOf(PQ.state.earned);
    const want = { blob: 2, zombie: 3, slime: rank >= 2 ? 3 : 0, svc: 1, hoarder: rank >= 2 ? 1 : 0, cert: isMidnight() ? 1 : 0 };
    Object.keys(want).forEach((type) => {
      const have = enemies.filter((e) => e.type === type).length;
      if (have >= want[type] || Math.random() > dt * (type === 'cert' ? 3 : 0.5)) return;
      for (let tries = 0; tries < 30; tries++) {
        const tx = PQ.randi(1, MW - 2), ty = PQ.randi(1, MH - 2);
        if (solidAt(tx * TS + 8, ty * TS + 8)) continue;
        const w = worldOf(tx, ty);
        if (type === 'slime' && w !== 2 && w !== 3) continue;
        if (type === 'hoarder' && w !== 2) continue;
        if (type === 'zombie' && w > 1) continue;
        if ((w === 2 && rank < 2) || (w === 3 && rank < 3)) continue;
        const ex = tx * TS + 8, ey = ty * TS + 8;
        if (Math.hypot(ex - player.x, ey - player.y) < 120) continue;
        enemies.push({ type, x: ex, y: ey, vx: 0, vy: 0, t: 0, hp: TYPES[type].hp, size: type === 'slime' ? 2 : 1, stun: 0, hits: 0, hitT: 0, grow: 0, visible: true });
        if (type === 'cert') OW.toast('MIDNIGHT. AN EXPIRED CERT GHOST RISES...', C.purple);
        break;
      }
    });
    if (chests.length < 2 && Math.random() < dt * 0.05) {
      const tx = PQ.randi(2, MW - 3), ty = PQ.randi(2, MH - 3);
      const w = worldOf(tx, ty), rank = PQ.rankOf(PQ.state.earned);
      if (tiles[ty][tx] === '.' && !((w === 2 && rank < 2) || (w === 3 && rank < 3))) chests.push({ x: tx * TS + 8, y: ty * TS + 8 });
    }
  }

  function gain(n, why) { const st = PQ.state; st.td += n; st.earned += n; OW.toast('+' + n + ' T$  ' + why, C.green); }
  function stealTD(n, why) {
    const st = PQ.state;
    const lost = Math.min(st.td, n);
    st.td -= lost;
    OW.toast((lost ? '-' + lost + ' T$  ' : '') + why, C.red);
  }

  function nearDoor() {
    let best = null, bd = 1e9;
    PQ.SITES.forEach((s) => {
      const dx = s.doorX * TS + 8, dy = s.doorSide === 'top' ? s.doorY * TS - 4 : (s.doorY + 1) * TS + 4;
      const d = Math.hypot(dx - player.x, dy - player.y);
      if (d < 18 && d < bd) { bd = d; best = s; }
    });
    return best;
  }

  function zapEnemy(e, spawned) {
    const st = PQ.state;
    if (e.type === 'cert') { e.hp--; e.stun = 0.8; if (e.hp <= 0) { e.dead = true; gain(25, 'CERT RENEWED. HTTPS GREEN.'); OW.burstBills(25); } return; }
    if (e.type === 'svc') {
      if (!e.visible) return;
      e.dead = true;
      if (Math.random() < 0.5) gain(15, 'RETIRED svc_backup01. NOBODY NOTICED.');
      else { stealTD(20, 'svc_backup01 RAN PAYROLL! ROLLED BACK.'); PQ.sfx('error'); }
      return;
    }
    if (e.type === 'hoarder') {
      e.hp--; e.stun = 0.4;
      if (e.hp <= 0) { e.dead = true; gain(20, 'SNAPSHOTS CONSOLIDATED. 2TB FREED.'); OW.burstBills(20); }
      else OW.toast('DELETING SNAPSHOT ' + (5 - e.hp) + '/5', C.cyan);
      return;
    }
    if (e.type === 'blob') { e.size--; e.stun = 0.6; if (e.size <= 0) { e.dead = true; gain(5, 'SERVICE RESTARTED. LEAK GONE.'); } return; }
    if (e.type === 'zombie') {
      e.hits++; e.hitT = 6; e.stun = 1;
      if (e.hits >= 3) { e.dead = true; gain(5, 'kill -9. ZOMBIE REAPED.'); }
      else OW.toast('kill -' + (e.hits === 1 ? '15' : '2') + '... IT IGNORES YOU', C.grey);
      return;
    }
    if (e.type === 'slime') {
      e.stun = 0.6;
      if (e.size > 0) {
        e.size--;
        spawned.push({ type: 'slime', x: e.x + 8, y: e.y, vx: 0, vy: 0, t: 0, hp: 1, size: e.size, stun: 0.6, hits: 0, hitT: 0, grow: 0 });
        OW.toast('SHADOW IT SPLIT! UNMANAGED CLOUD ACCOUNT!', C.purple);
      } else { e.dead = true; st.td += 3; st.earned += 3; OW.toast('+3 T$  ACCOUNT DECOMMISSIONED', C.green); }
    }
  }

  function touch(e, tk) {
    const name = { blob: 'MEMORY LEAK', zombie: 'ZOMBIE PROCESS', slime: 'SHADOW IT SLIME', hoarder: 'SNAPSHOT HOARDER', cert: 'EXPIRED CERT GHOST' }[e.type];
    if (e.type === 'cert') { if (tk) { tk.slaLeft -= 20; OW.toast('-20s SLA  HTTPS BROKEN BY ' + name, C.red); } else stealTD(10, name); return; }
    if (e.type === 'blob') { if (tk) { tk.slaLeft -= 4 * e.size; OW.toast('-' + 4 * e.size + 's SLA  ' + name, C.purple); } else stealTD(2 * e.size, name); return; }
    if (e.type === 'slime') { if (tk) { tk.slaLeft -= 8; OW.toast('-8s SLA  ' + name, C.purple); } else stealTD(3, name); return; }
    if (e.type === 'hoarder') { stealTD(10, 'THE HOARDER ATE YOUR BUDGET'); return; }
    stealTD(5, name + ' ATE YOUR CPU');
  }

  OW.scene = {
    enter() {
      OW.refreshGates();
      if (!mapCanvas) prerender();
      PQ.music(PQ.TRACKS.overworld);
    },
    update(dt) {
      const st = PQ.state, I = PQ.input;
      t += dt;
      st.playTime += dt;
      clockMin += dt * 4;
      if (clockMin >= 24 * 60) {
        clockMin -= 24 * 60;
        st.day = (st.day || 0) + 1;
        st.uptime = (st.uptime || 0) + 1;
        OW.toast(DAYS[st.day % 7] + ' 00:00  UPTIME: ' + st.uptime + ' DAYS', C.cyan);
        if (st.day % 7 === 4) OW.toast("IT'S FRIDAY. READ-ONLY AFTER 15:00!", C.yellow);
      }
      st.clock = clockMin;
      player.hurt = Math.max(0, player.hurt - dt);
      player.zap = Math.max(0, player.zap - dt);
      toasts.forEach((ts) => { ts.t -= dt; });
      toasts = toasts.filter((ts) => ts.t > 0);
      bills.forEach((b) => { b.t -= dt; b.vy += 200 * dt; b.x += b.vx * dt; b.y += b.vy * dt; });
      bills = bills.filter((b) => b.t > 0);

      const tk = st.active;
      let slow = 1;
      enemies.forEach((e) => { if (e.type === 'blob' && Math.hypot(e.x - player.x, e.y - player.y) < 20 + e.size * 8) slow = 0.6; });
      if (tk) { tk.slaLeft -= dt; PQ.checkRedSla(tk); }
      PQ.tickets.tick(dt);
      OW.saveT = (OW.saveT || 0) + dt;
      if (OW.saveT > 5) { OW.saveT = 0; st.px = player.x; st.py = player.y; PQ.save(); }

      let mx = 0, my = 0;
      if (I.down('ArrowLeft') || I.down('KeyA')) mx -= 1;
      if (I.down('ArrowRight') || I.down('KeyD')) mx += 1;
      if (I.down('ArrowUp') || I.down('KeyW')) my -= 1;
      if (I.down('ArrowDown') || I.down('KeyS')) my += 1;
      const sprint = (I.down('ShiftLeft') || I.down('ShiftRight')) && player.stam > 0 && (mx || my);
      const spd = (sprint ? 115 : 72) * slow;
      if (sprint) player.stam = Math.max(0, player.stam - 30 * dt); else player.stam = Math.min(100, player.stam + 8 * dt);
      if (mx || my) {
        const len = Math.hypot(mx, my);
        const nx = player.x + (mx / len) * spd * dt, ny = player.y + (my / len) * spd * dt;
        if (!collide(nx, player.y)) player.x = nx;
        if (!collide(player.x, ny)) player.y = ny;
        player.dir = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? 'left' : 'right') : (my < 0 ? 'up' : 'down');
        const before = Math.floor(player.anim);
        player.anim += dt * (sprint ? 12 : 8);
        if (Math.floor(player.anim) !== before && Math.floor(player.anim) % 2 === 0) PQ.sfx('step');
      }
      const ftx = Math.floor((player.x + mx * 12) / TS), fty = Math.floor((player.y + my * 12) / TS);
      const gt = gateAt(ftx, fty);
      prompt = gt && tiles[fty][ftx] === 'G' && (mx || my) ? { s: 'LOCKED - ' + gt.label, col: C.red } : null;

      if (I.pressed('KeyC') && st.items.mugs > 0 && player.stam < 100) { st.items.mugs--; player.stam = 100; PQ.sfx('coin'); OW.toast('COFFEE! STAMINA FULL', C.orange); }

      if (I.pressed('Space') && player.zap <= 0 && player.stam >= 15) {
        player.zap = 0.35; player.stam -= 15; PQ.sfx('zap');
        const spawned = [];
        enemies.forEach((e) => { if (Math.hypot(e.x - player.x, e.y - player.y) <= 30 + (e.type === 'hoarder' ? 10 : 0)) zapEnemy(e, spawned); });
        enemies = enemies.filter((e) => !e.dead).concat(spawned);
      }

      spawnEnemies(dt);
      enemies.forEach((e) => {
        e.t += dt;
        if (e.hitT > 0) { e.hitT -= dt; if (e.hitT <= 0) e.hits = 0; }
        if (e.type === 'svc') { e.blinkT = (e.blinkT || 0) + dt; e.visible = Math.floor(e.blinkT / 3) % 2 === 0; }
        if (e.type === 'blob') { e.grow += dt; if (e.grow > 8 && e.size < 3) { e.grow = 0; e.size++; } }
        if (e.stun > 0) { e.stun -= dt; return; }
        const dx = player.x - e.x, dy = player.y - e.y, d = Math.hypot(dx, dy) || 1;
        let sp = 0;
        const wander = (every, speed) => { if (e.t > every || (!e.vx && !e.vy)) { e.t = 0; const a = Math.random() * 6.28; e.vx = Math.cos(a); e.vy = Math.sin(a); } sp = speed; };
        if (e.type === 'blob') { if (d < 100) { sp = 12 + e.size * 6; e.vx = dx / d; e.vy = dy / d; } else wander(2, 10); }
        else if (e.type === 'zombie') { if (d < 70) { sp = 22; e.vx = dx / d; e.vy = dy / d; } else wander(2.5, 12); }
        else if (e.type === 'slime') { if (d < 70) { sp = 30; e.vx = dx / d; e.vy = dy / d; } else wander(2, 12); }
        else if (e.type === 'svc') wander(2.5, 18);
        else if (e.type === 'cert') { sp = 36; e.vx = dx / d; e.vy = dy / d; if (!isMidnight()) e.dead = true; }
        const nx = e.x + e.vx * sp * dt, ny = e.y + e.vy * sp * dt;
        if (TYPES[e.type].ghostly || !collide(nx, ny)) { e.x = PQ.clamp(nx, 20, MW * TS - 20); e.y = PQ.clamp(ny, 20, MH * TS - 20); }
        else { e.vx *= -1; e.vy *= -1; }
        const reach = e.type === 'hoarder' ? 18 : e.type === 'blob' ? 8 + e.size * 4 : 12;
        if (d < reach && player.hurt <= 0 && e.type !== 'svc') {
          player.hurt = 1.2; PQ.sfx('hit');
          const a = Math.atan2(dy, dx), kb = e.type === 'hoarder' ? 10 : 6;
          for (let k = 0; k < 4; k++) { const nx2 = player.x + Math.cos(a) * kb, ny2 = player.y + Math.sin(a) * kb; if (!collide(nx2, ny2)) { player.x = nx2; player.y = ny2; } }
          touch(e, tk);
        }
      });
      enemies = enemies.filter((e) => !e.dead);

      for (let i = chests.length - 1; i >= 0; i--) {
        const ch = chests[i];
        if (Math.hypot(ch.x - player.x, ch.y - player.y) < 16 && (I.pressed('KeyE') || I.pressed('Enter'))) {
          chests.splice(i, 1);
          if (Math.random() < 0.45) { PQ.sfx('error'); player.hurt = 1; stealTD(15, 'BAD FIRMWARE! IT BRICKED YOUR GEAR'); }
          else { const n = PQ.pick([10, 10, 20]); st.td += n; st.earned += n; PQ.sfx('cash'); OW.toast('LICENSE KEY FOUND! +' + n + ' T$', C.green); OW.burstBills(n); }
          return;
        }
      }

      const door = nearDoor();
      OW.door = door;
      if (door && (I.pressed('KeyE') || I.pressed('Enter'))) {
        st.px = player.x; st.py = player.y;
        PQ.enterSite(door);
        return;
      }

      cam.x = PQ.clamp(player.x - 160, 0, MW * TS - 320);
      cam.y = PQ.clamp(player.y - VIEW_H / 2, 0, MH * TS - VIEW_H);
    },
    draw(g) {
      const st = PQ.state;
      PQ.rect(g, 0, 0, 320, 240, C.black);
      const cx = Math.round(cam.x), cy = Math.round(cam.y);
      g.drawImage(mapCanvas, cx, cy, 320, VIEW_H, 0, VIEW_Y, 320, VIEW_H);
      g.save(); g.translate(-cx, VIEW_Y - cy);
      const tx0 = Math.floor(cx / TS), ty0 = Math.floor(cy / TS);
      g.font = '8px ' + PQ.FONT; g.textBaseline = 'top'; g.textAlign = 'left';
      for (let y = ty0; y < Math.min(MH, ty0 + 16); y++) {
        for (let x = tx0; x < Math.min(MW, tx0 + 21); x++) {
          const c = tiles[y][x];
          if (c === '~') {
            PQ.rect(g, x * TS, y * TS, TS, TS, C.black);
            const vert = x === 14 || x === 36;
            const off = (t * 20 + (vert ? x : y) * 7) % TS;
            g.fillStyle = C.blue;
            g.fillText((x + y + Math.floor(t * 2)) % 2 ? '1' : '0', x * TS + (vert ? 4 : off - 4), y * TS + (vert ? off - 4 : 4));
            g.fillStyle = C.royal;
            g.fillText((x * y + Math.floor(t * 3)) % 2 ? '0' : '1', x * TS + (vert ? 4 : ((off + 8) % TS) - 4), y * TS + (vert ? ((off + 8) % TS) - 4 : 4));
          } else if (c === 'G') {
            PQ.rect(g, x * TS, y * TS, TS, TS, C.dgrey);
            for (let i = 0; i < 4; i++) PQ.rect(g, x * TS + 1 + i * 4, y * TS, 2, TS, Math.floor(t * 2) % 2 ? C.red : C.orange);
            PQ.rect(g, x * TS + 5, y * TS + 5, 6, 6, C.yellow);
          } else if (c === 'T') {
            for (let u = 0; u < 4; u++) {
              const on = Math.floor(t * 3 + x * 3 + y * 5 + u) % 4;
              PQ.rect(g, x * TS + 10, y * TS + 3 + u * 3, 1, 1, on === 0 ? C.orange : on === 1 ? C.black : C.green);
            }
          }
        }
      }
      PQ.SITES.forEach((s) => {
        const px = s.x * TS + (s.w * TS) / 2, py = s.doorSide === 'top' ? (s.y + s.h) * TS - 10 : s.y * TS + 2;
        PQ.text(g, s.name, px, py, s.kind === 'final' ? C.yellow : C.white, { size: 6, align: 'center' });
        if ((s.boss && PQ.bossAvailable(s.boss)) || (s.kind === 'final' && PQ.bossAvailable('outage')))
          PQ.text(g, s.kind === 'final' ? '! FINAL !' : '! BOSS !', px, s.y * TS - 9, Math.floor(t * 3) % 2 ? C.red : C.yellow, { size: 6, align: 'center' });
        if (st.documented[s.id]) { PQ.rect(g, s.x * TS + s.w * TS - 9, s.y * TS + 14, 6, 4, C.yellow); PQ.rect(g, s.x * TS + s.w * TS - 8, s.y * TS + 15, 4, 1, C.black); }
        if (s.kind === 'hq') {
          const sx = s.x * TS + 4, sy = (s.y + s.h - 2) * TS - 6, sw = s.w * TS - 8;
          PQ.rect(g, sx, sy, sw, 18, C.black);
          PQ.stroke(g, sx, sy, sw, 18, C.yellow);
          PQ.text(g, 'DAYS SINCE LAST OUTAGE', sx + sw / 2, sy + 2, C.yellow, { size: 7, align: 'center', font: PQ.MONO, shadow: false });
          PQ.text(g, String(st.uptime || 0), sx + sw / 2, sy + 9, st.uptime ? C.green : (Math.floor(t * 2) % 2 ? C.red : C.dgrey), { size: 8, align: 'center', font: PQ.MONO, shadow: false });
        }
      });
      const tk = st.active;
      let target = null;
      if (tk) target = PQ.siteById(tk.siteId);
      else if (PQ.tickets.queue.length) target = PQ.siteById('hq');
      if (target) {
        const mx = target.doorX * TS + 8, my = (target.doorSide === 'top' ? target.doorY * TS - 10 : target.doorY * TS - 4) + Math.sin(t * 6) * 3;
        g.fillStyle = tk ? C.yellow : C.cyan;
        g.beginPath(); g.moveTo(mx - 5, my - 6); g.lineTo(mx + 5, my - 6); g.lineTo(mx, my); g.fill();
      }
      chests.forEach((ch) => {
        PQ.rect(g, ch.x - 6, ch.y - 4, 12, 9, C.brown);
        PQ.rect(g, ch.x - 6, ch.y - 4, 12, 3, C.orange);
        PQ.rect(g, ch.x - 1, ch.y - 2, 2, 3, C.yellow);
        if (Math.hypot(ch.x - player.x, ch.y - player.y) < 28) PQ.text(g, 'FIRMWARE? (E)', ch.x, ch.y - 14, C.yellow, { size: 6, align: 'center' });
      });
      enemies.forEach((e) => drawEnemy(g, e));
      drawPlayer(g);
      if (player.zap > 0) {
        g.strokeStyle = Math.floor(t * 30) % 2 ? C.cyan : C.white; g.lineWidth = 1;
        g.beginPath(); g.arc(player.x, player.y, 30 * (1 - (player.zap / 0.35) * 0.5), 0, Math.PI * 2); g.stroke();
      }
      g.restore();

      const na = nightAlpha();
      if (na > 0) { g.globalAlpha = na; PQ.rect(g, 0, VIEW_Y, 320, VIEW_H, C.black); g.globalAlpha = 1; }

      if (target) {
        const sx = target.doorX * TS + 8 - cx, sy = target.doorY * TS - cy + VIEW_Y;
        if (sx < 0 || sx > 320 || sy < VIEW_Y || sy > 240) {
          const a = Math.atan2(sy - 128, sx - 160);
          const ax = PQ.clamp(160 + Math.cos(a) * 150, 8, 312), ay = PQ.clamp(128 + Math.sin(a) * 100, 26, 222);
          g.save(); g.translate(ax, ay); g.rotate(a);
          g.fillStyle = Math.floor(t * 4) % 2 ? C.yellow : C.orange;
          g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, -5); g.lineTo(-5, 5); g.fill();
          g.restore();
        }
      }

      drawHud(g);
      let ps = prompt;
      if (!ps && OW.door) ps = { s: 'E / ENTER: ' + PQ.doorLabel(OW.door), col: C.white };
      if (ps) { PQ.rect(g, 0, 228, 320, 12, C.navy); PQ.text(g, ps.s, 160, 230, ps.col, { size: 6, align: 'center' }); }
      toasts.forEach((ts, i) => PQ.text(g, ts.s, 160, 24 + i * 10, ts.col, { size: 6, align: 'center' }));
      bills.forEach((b) => PQ.drawBill(g, b.x, b.y, 18, 9, '', b.r));
    },
  };

  function drawHud(g) {
    const st = PQ.state;
    PQ.rect(g, 0, 0, 320, 16, C.navy);
    PQ.rect(g, 0, 15, 320, 1, C.cyan);
    PQ.drawTD(g, 3, 4, st.td);
    PQ.text(g, RANK_SHORT[PQ.rankOf(st.earned)], 66, 5, C.ice, { size: 6 });
    const h = Math.floor(clockMin / 60), m = Math.floor(clockMin % 60);
    const fri = OW.isReadOnlyFriday();
    PQ.text(g, OW.dayName() + ' ' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'), 144, 5, fri ? (Math.floor(t * 2) % 2 ? C.yellow : C.red) : isMidnight() ? C.purple : C.grey, { size: 6 });
    PQ.rect(g, 206, 6, 30, 4, C.black); PQ.rect(g, 206, 6, (30 * player.stam) / 100, 4, C.orange);
    for (let i = 0; i < st.items.mugs; i++) { PQ.rect(g, 240 + i * 7, 5, 4, 5, C.ice); PQ.rect(g, 244 + i * 7, 6, 1, 2, C.ice); }
    const tk = st.active;
    if (tk) {
      const col = tk.slaLeft <= 0 ? C.red : tk.slaLeft / tk.sla < 0.3 ? C.yellow : C.green;
      PQ.text(g, tk.slaLeft > 0 ? PQ.fmtTime(tk.slaLeft) : 'BLOWN', 316, 5, col, { size: 6, align: 'right' });
    } else PQ.text(g, 'Q:' + PQ.tickets.queue.length, 316, 5, C.cyan, { size: 6, align: 'right' });
  }

  function drawPlayer(g) {
    const st = PQ.state;
    if (player.hurt > 0 && Math.floor(player.hurt * 12) % 2) return;
    const x = Math.round(player.x), y = Math.round(player.y);
    const step = Math.floor(player.anim) % 2;
    const hoodie = st.wearing === 'hat';
    const shirt = st.wearing === 'tee' ? C.yellow : hoodie ? C.dgrey : C.royal;
    PQ.rect(g, x - 5, y + 7, 10, 2, C.black);
    PQ.rect(g, x - 3, y + 3, 2, 4 + (step ? 1 : 0), C.dgrey);
    PQ.rect(g, x + 1, y + 3, 2, 4 + (step ? 0 : 1), C.dgrey);
    PQ.rect(g, x - 4, y - 3, 8, 7, shirt);
    if (st.wearing === 'tee') PQ.rect(g, x - 2, y - 1, 4, 2, C.navy);
    PQ.rect(g, x - 3, y - 9, 6, 6, '#f0c090');
    if (hoodie) { PQ.rect(g, x - 4, y - 10, 8, 2, C.dgrey); PQ.rect(g, x - 4, y - 9, 1, 6, C.dgrey); PQ.rect(g, x + 3, y - 9, 1, 6, C.dgrey); }
    else PQ.rect(g, x - 3, y - 10, 6, 2, C.brown);
    if (player.dir !== 'up') {
      const ex = player.dir === 'left' ? -1 : player.dir === 'right' ? 1 : 0;
      PQ.rect(g, x - 2 + ex, y - 7, 1, 1, C.black); PQ.rect(g, x + 1 + ex, y - 7, 1, 1, C.black);
    }
    PQ.rect(g, x, y - 2, 1, 3, C.cyan);
    if (st.wearing === 'vest') { PQ.rect(g, x - 2, y + 1, 2, 2, C.red); PQ.rect(g, x, y + 1, 2, 2, C.green); PQ.rect(g, x + 2, y + 1, 2, 2, C.yellow); }
    else PQ.rect(g, x - 1, y + 1, 3, 2, C.white);
    PQ.rect(g, x + 4, y - 1, 4, 3, C.dgrey); // laptop
  }

  function drawEnemy(g, e) {
    const x = Math.round(e.x), y = Math.round(e.y);
    const blink = e.stun > 0 && Math.floor(e.stun * 10) % 2;
    if (e.type === 'blob') { // memory leak: RAM-green goo that grows
      const s = 4 + e.size * 4, wob = Math.sin(e.t * 5) * 1.5;
      PQ.rect(g, x - s, y - s + 2 - wob, s * 2, s * 2 - 2 + wob, blink ? C.white : C.green);
      PQ.rect(g, x - s + 2, y - s + 4, s * 2 - 4, 2, C.ice);
      PQ.rect(g, x - 3, y - 2, 2, 2, C.black); PQ.rect(g, x + 2, y - 2, 2, 2, C.black);
      PQ.text(g, e.size * 4 + 'GB', x, y + s, C.green, { size: 6, align: 'center', shadow: false });
    } else if (e.type === 'zombie') {
      const lean = Math.sin(e.t * 4);
      PQ.rect(g, x - 4 + lean, y - 4, 8, 9, blink ? C.white : C.grey);
      PQ.rect(g, x - 3 + lean, y - 10, 6, 6, '#7a9a7a');
      PQ.rect(g, x - 2 + lean, y - 8, 1, 1, C.red); PQ.rect(g, x + 1 + lean, y - 8, 1, 1, C.red);
      PQ.rect(g, x + 4 + lean, y - 3, 4, 2, '#7a9a7a');
      PQ.rect(g, x - 3, y + 5, 2, 3, C.dgrey); PQ.rect(g, x + 1, y + 5, 2, 3, C.dgrey);
      PQ.text(g, '<defunct>', x, y - 18, C.grey, { size: 6, align: 'center', font: PQ.MONO, shadow: false });
      if (e.hits) PQ.text(g, 'x' + e.hits, x + 8, y - 12, C.red, { size: 6, shadow: false });
    } else if (e.type === 'slime') {
      const s = 4 + e.size * 3, wob = Math.sin(e.t * 6);
      PQ.rect(g, x - s, y - s + 2 + wob, s * 2, s * 2 - 2 - wob, blink ? C.white : C.purple);
      PQ.rect(g, x - s + 2, y - s + 4, s * 2 - 4, 2, C.ice);
      PQ.rect(g, x - 2, y - 1, 4, 3, C.white);
    } else if (e.type === 'svc') {
      g.globalAlpha = e.visible ? 0.85 : 0.12;
      PQ.rect(g, x - 6, y - 10, 12, 16, C.ice);
      for (let i = 0; i < 3; i++) PQ.rect(g, x - 6 + i * 4, y + 6, 3, 2 + ((i + Math.floor(e.t * 6)) % 2), C.ice);
      PQ.rect(g, x - 3, y - 6, 2, 2, C.black); PQ.rect(g, x + 2, y - 6, 2, 2, C.black);
      PQ.text(g, 'svc_???', x, y - 19, C.ice, { size: 7, align: 'center', font: PQ.MONO, shadow: false });
      g.globalAlpha = 1;
    } else if (e.type === 'hoarder') {
      const breathe = Math.sin(e.t * 2);
      for (let i = 0; i < 5; i++) PQ.rect(g, x - 14 + i * 6, y + 6 - (i % 2) * 2, 5, 4, i % 2 ? C.cyan : C.sky);
      PQ.rect(g, x - 10, y - 8 + breathe, 20, 14, blink ? C.white : C.orange);
      PQ.rect(g, x + 8, y - 14 + breathe, 10, 8, C.orange);
      PQ.rect(g, x + 14, y - 12 + breathe, 2, 2, C.black);
      PQ.rect(g, x - 16, y - 12 + breathe, 8, 6, C.red);
      PQ.text(g, '.vmsn x' + (40 + e.hp * 12), x, y - 24, C.orange, { size: 7, align: 'center', font: PQ.MONO, shadow: false });
    } else if (e.type === 'cert') {
      const bob = Math.sin(e.t * 5) * 2;
      g.globalAlpha = 0.85;
      PQ.rect(g, x - 7, y - 10 + bob, 14, 16, blink ? C.white : C.purple);
      PQ.rect(g, x - 5, y - 6 + bob, 3, 3, C.yellow); PQ.rect(g, x + 2, y - 6 + bob, 3, 3, C.yellow);
      PQ.rect(g, x - 4, y + 1 + bob, 8, 3, C.red);
      PQ.text(g, 'EXPIRED', x, y - 19 + bob, C.red, { size: 6, align: 'center', shadow: false });
      g.globalAlpha = 1;
    }
  }
})();
