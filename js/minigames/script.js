// SCRIPT COMMIT: spot the bugs in a scrolling PowerShell/Bash script before it runs against every prod server. Wrong flag = rollback (lose a life).
(function () {
  'use strict';
  const PQ = window.PQ;
  const C = PQ.C;

  // [good line, bad variant, why] - bad variants are the typos you hunt.
  const BLOCKS = [
    [
      ['# Nightly cleanup - runs on ALL prod servers'],
      ['$servers = Get-Content .\servers.txt'],
      ['foreach ($s in $servers) {', 'foreach ($s in $server) {', '$server is never set'],
      ['  Invoke-Command -ComputerName $s -ScriptBlock {'],
      ['    Remove-Item "C:\Temp\*" -Recurse', '    Remove-Item "C:\*" -Recurse', 'deletes all of C:'],
      ['    Stop-Service -Name Spooler', '    Stop-Service -Name * -Force', 'stops EVERY service'],
      ['    Start-Service -Name Spooler'],
      ['  }'],
      ['}'],
    ],
    [
      ['# Disable stale AD accounts'],
      ['$cutoff = (Get-Date).AddDays(-90)', '$cutoff = (Get-Date).AddDays(90)', 'future date = everyone'],
      ['Get-ADUser -Filter {LastLogonDate -lt $cutoff} |', 'Get-ADUser -Filter * |', 'no filter: all users'],
      ['  Disable-ADAccount -WhatIf', '  Remove-ADUser -Confirm:$false', 'deletes, no undo'],
    ],
    [
      ['#!/usr/bin/env bash'],
      ['set -euo pipefail', '# set -euo pipefail', 'safety rails disabled'],
      ['LOGDIR="/var/log/app"'],
      ['find "$LOGDIR" -name "*.log" -mtime +30 -delete', 'find "$LOGDIR" -name "*.log" -mtime -30 -delete', 'deletes NEW logs'],
      ['rm -rf "${CACHE_DIR:?}/"*', 'rm -rf "$CACHE_DIR/"*', 'unset var = rm -rf /*'],
      ['chmod 640 /etc/app/secrets.env', 'chmod 777 /etc/app/secrets.env', 'world-writable secrets'],
      ['USE=$(df --output=pcent / | tail -1 | tr -dc 0-9)'],
      ['if [ "$USE" -gt 90 ]; then', 'if [ "$USE" -lt 90 ]; then', 'inverted check'],
      ['  systemctl restart app.service'],
      ['fi'],
    ],
    [
      ['# Provision new VM disk'],
      ['DISK=/dev/sdb'],
      ['dd if=/dev/zero of="$DISK" bs=1M count=100', 'dd if=/dev/zero of=/dev/sda bs=1M count=100', 'wipes the OS disk'],
      ['mkfs.xfs "$DISK"'],
      ['echo "$DISK /data xfs defaults 0 0" >> /etc/fstab', 'echo "$DISK /data xfs defaults 0 0" > /etc/fstab', '> overwrites fstab'],
      ['curl -fsSLO https://repo.corp/agent.sh'],
      ['sha256sum -c agent.sh.sha256 && bash agent.sh', 'curl -fsSL http://x.co/a.sh | sudo bash', 'curl | sudo bash'],
    ],
    [
      ['# Firewall'],
      ['ufw allow from 10.0.0.0/8 to any port 22', 'ufw allow from any to any port 22', 'SSH open to world'],
      ['ufw deny 3389/tcp', 'ufw allow 3389/tcp', 'RDP open to internet'],
      ['$pw = Read-Host -AsSecureString', '$pw = "Summer2026!"', 'plaintext password'],
    ],
  ];

  function build(nTypos) {
    const lines = [];
    BLOCKS.forEach((b) => {
      b.forEach((l) => lines.push({ good: l[0], bad: l[1], why: l[2], typo: false, found: false, wrong: 0 }));
      lines.push({ good: '!', typo: false, found: false, wrong: 0 });
    });
    const cands = lines.map((l, i) => (l.bad ? i : -1)).filter((i) => i >= 0);
    PQ.shuffle(cands).slice(0, nTypos).forEach((i) => { lines[i].typo = true; });
    return lines;
  }

  PQ.registerMinigame({
    id: 'script',
    title: 'SCRIPT COMMIT',
    payout: 50,
    help: [
      'This script runs against EVERY',
      'prod server when the timer hits',
      'zero. Find every BUG line.',
      'UP/DOWN or MOUSE = pick line',
      'SPACE / CLICK = flag as typo',
      'Wrong flag = ROLLBACK (-1 life)',
      '3 rollbacks and you are out.',
    ],
    create(api) {
      const lvl = api.boss ? 3 : api.level;
      const nTypos = [2, 3, 4][lvl - 1] + (api.boss ? 1 : 0);
      const limit = [60, 55, 50][lvl - 1] + (api.boss ? 15 : 0);
      const scrollSpeed = [6, 9, 12][lvl - 1];
      const lines = build(nTypos);
      const LH = 12, VIEW_Y = 40, VIEW_H = 168, VISIBLE = Math.floor(VIEW_H / LH);
      let scroll = 0, sel = 0, lives = 3, found = 0, t = 0, done = false, shake = 0, msg = null, autoScroll = true;
      const maxScroll = Math.max(0, lines.length * LH - VIEW_H);

      function finish(success) {
        if (done) return;
        done = true;
        api.finish({ success, quality: success ? PQ.clamp(0.3 + 0.5 * (1 - t / limit) + 0.1 * (lives - 1), 0.1, 1) : 0 });
      }
      function flag(i) {
        const l = lines[i];
        if (!l || l.found) return;
        if (l.typo) {
          l.found = true; found++; PQ.sfx('coin');
          msg = { s: 'FIXED: ' + l.why, t: 1.5, col: C.green };
          if (found === nTypos) { PQ.sfx('cash'); finish(true); }
        } else {
          l.wrong = 1; lives--; shake = 0.4; PQ.sfx('error');
          msg = { s: 'ROLLBACK! That line was fine', t: 1.5, col: C.red };
          if (lives <= 0) finish(false);
        }
      }

      return {
        update(dt) {
          if (done) return;
          t += dt;
          shake = Math.max(0, shake - dt);
          if (msg) { msg.t -= dt; if (msg.t <= 0) msg = null; }
          lines.forEach((l) => { if (l.wrong) l.wrong = Math.max(0, l.wrong - dt); });
          if (t >= limit) { PQ.sfx('boom'); finish(false); return; }

          const I = PQ.input, m = I.mouse;
          if (autoScroll) {
            scroll += scrollSpeed * dt;
            if (scroll >= maxScroll) { scroll = maxScroll; autoScroll = false; }
          }
          if (I.pressed('ArrowDown') || I.pressed('KeyS')) { sel = Math.min(lines.length - 1, sel + 1); autoScroll = false; PQ.sfx('blip'); }
          if (I.pressed('ArrowUp') || I.pressed('KeyW')) { sel = Math.max(0, sel - 1); autoScroll = false; PQ.sfx('blip'); }
          if (I.pressed('PageDown')) { sel = Math.min(lines.length - 1, sel + VISIBLE); autoScroll = false; }
          if (I.pressed('PageUp')) { sel = Math.max(0, sel - VISIBLE); autoScroll = false; }
          if (!autoScroll) {
            if (sel * LH < scroll) scroll = sel * LH;
            if (sel * LH > scroll + VIEW_H - LH) scroll = sel * LH - VIEW_H + LH;
          } else {
            sel = PQ.clamp(sel, Math.ceil(scroll / LH), Math.floor((scroll + VIEW_H - LH) / LH));
          }
          if (PQ.inRect(m, 8, VIEW_Y, 304, VIEW_H)) {
            const hov = Math.floor((m.y - VIEW_Y + scroll) / LH);
            if (hov >= 0 && hov < lines.length && m.clicked) { sel = hov; flag(hov); }
          }
          if (I.pressed('Space') || I.pressed('Enter')) flag(sel);
          scroll = PQ.clamp(scroll, 0, maxScroll);
        },
        draw(g) {
          const sx = shake > 0 ? PQ.randi(-3, 3) : 0;
          g.save(); g.translate(sx, 0);
          PQ.rect(g, -4, 16, 328, 224, C.black);
          const left = limit - t;
          PQ.text(g, 'RUNS IN ' + PQ.fmtTime(left), 8, 22, left < 10 ? (Math.floor(t * 6) % 2 ? C.red : C.yellow) : C.ice, { size: 6 });
          PQ.text(g, 'BUGS ' + found + '/' + nTypos, 160, 22, C.green, { size: 6, align: 'center' });
          for (let i = 0; i < 3; i++) PQ.rect(g, 286 + i * 10, 22, 7, 7, i < lives ? C.red : C.dgrey);
          if (api.boss) PQ.text(g, (api.bossName || 'BOSS') + ' IS WATCHING', 160, 31, C.red, { size: 6, align: 'center' });
          PQ.box(g, 4, VIEW_Y - 4, 312, VIEW_H + 8, C.black);
          g.save(); g.beginPath(); g.rect(8, VIEW_Y, 304, VIEW_H); g.clip();
          const first = Math.max(0, Math.floor(scroll / LH));
          const hov = PQ.inRect(PQ.input.mouse, 8, VIEW_Y, 304, VIEW_H) ? Math.floor((PQ.input.mouse.y - VIEW_Y + scroll) / LH) : -1;
          for (let i = first; i < Math.min(lines.length, first + VISIBLE + 2); i++) {
            const l = lines[i], y = VIEW_Y + i * LH - scroll;
            if (i === sel) PQ.rect(g, 8, y - 1, 304, LH, C.blue);
            else if (i === hov) PQ.rect(g, 8, y - 1, 304, LH, C.navy);
            if (l.wrong) PQ.rect(g, 8, y - 1, 304, LH, C.red);
            const s = l.typo ? (l.found ? l.good : l.bad) : l.good;
            const col = l.found ? C.green : s === '!' ? C.dgrey : /^\S/.test(s) ? C.cyan : C.ice;
            PQ.text(g, String(i + 1).padStart(2, ' '), 10, y + 1, C.grey, { size: 9, font: PQ.MONO, shadow: false });
            PQ.text(g, s, 26, y + 1, col, { size: 10, font: PQ.MONO, shadow: false });
            if (l.found) PQ.text(g, 'OK', 306, y, C.green, { size: 6, align: 'right', shadow: false });
          }
          g.restore();
          const sbH = VIEW_H * Math.min(1, VIEW_H / (lines.length * LH));
          PQ.rect(g, 313, VIEW_Y + (VIEW_H - sbH) * (maxScroll ? scroll / maxScroll : 0), 2, sbH, C.sky);
          if (msg) { PQ.rect(g, 0, 212, 320, 12, C.navy); PQ.text(g, msg.s, 160, 214, msg.col, { size: 6, align: 'center' }); }
          else PQ.text(g, 'PS> .\deploy.ps1 -AllServers  (queued)', 160, 214, C.dgrey, { size: 6, align: 'center' });
          g.restore();
        },
      };
    },
  });
})();
