// All tunable numbers live here. Economy/boss/tip content adapted from Grok's brief (docs/grok-design-brief.md).
(function () {
  'use strict';
  const PQ = window.PQ;

  PQ.CFG = {
    title: 'UPTIME QUEST',
    subtitle: 'THE TECH$$$ RUN',
    edition: 'SYSTEM ENGINEER EDITION',

    // Ticket economy: raw = floor(base * levelMult * urgencyMult)
    urgency: {
      green: { mult: 1.0, sla: 150 },
      yellow: { mult: 1.25, sla: 110 },
      red: { mult: 1.5, sla: 85 },
    },
    levelMult: [1, 1.5, 2],
    urgencyWeights: { 1: [50, 35, 15], 2: [30, 40, 30], 3: [15, 35, 50] },
    speedBonusMax: 0.5,
    blownMult: 0.5,
    dnsPay: 1,
    dnsAfter: 20,
    certBonus: [0, 0, 0.1, 0.25], // raw bonus by cert tier
    chainEvery: 3,
    chainMult: 1.25,
    queueSize: 4,
    queueRefill: 12,
    lives: 3,
    burnoutTax: 0.1,
    autoPayMult: 0.6,      // Automation Scroll closes Password Reset tickets for 60%
    autoMission: 'password',

    // missions unlocked by cert tier (0 = none, 1 = Access, 2 = Server, 3 = Security)
    missionsByCert: [['disk', 'password'], ['patch', 'vm'], ['backup', 'gpo', 'script'], ['ransom']],

    // Read-Only Friday: a change on Friday after 15:00 summons a surprise boss
    fridayHour: 15,
    fridayBonus: 25,

    pagerChance: 0.3,
    pagerBonus: 5,
    pagerPenalty: 15,
    pagerSites: ['P1: Payroll server down', 'P2: Printer jammed (again)', 'P1: VPN concentrator CPU 100%', 'P3: Teams is "slow"', 'P1: SAN path failover', 'P2: Exchange queue backing up'],

    ranks: [
      { name: 'Tier 1 Admin', at: 0 },
      { name: 'Systems Administrator', at: 150 },
      { name: 'System Engineer', at: 450 },
      { name: 'Senior Engineer', at: 900 },
      { name: 'Architect', at: 1500 },
      { name: 'Principal of the Server Realm', at: 2500 },
    ],

    shop: [
      { id: 'wand', name: 'REMOTE DESKTOP WAND', price: 100, desc: 'Work your active ticket from the HQ terminal. No walking.' },
      { id: 'mug', name: 'COFFEE MUG', price: 15, desc: 'C = full stamina. Stacks to 3.' },
      { id: 'label', name: 'GOLDEN RUNBOOK', price: 120, desc: 'Closed sites get documented: +25% pay there. The Auditor cares.' },
      { id: 'auto', name: 'AUTOMATION SCROLL', price: 200, desc: 'Scripts password resets: those tickets close themselves for 60%.' },
      { id: 'cert1', name: 'CERT SCROLL: ACCESS', price: 80, desc: 'Unlocks Patch Tuesday and VM Tetris tickets.' },
      { id: 'cert2', name: 'CERT SCROLL: SERVER', price: 200, desc: 'Unlocks Backup Restore, GPO Maze, Script Commit. +10% pay.' },
      { id: 'cert3', name: 'CERT SCROLL: SECURITY', price: 450, desc: 'Unlocks Ransomware Siege (100 T$). +25% pay. Needed for the BSOD.' },
      { id: 'shield', name: 'IMMUTABLE BACKUP SHIELD', price: 150, desc: 'Survive one failed fix per world without losing a life.' },
      { id: 'drone', name: 'AI SIDEKICK DRONE', price: 500, desc: '3 charges. D on a mission intro = auto-solve.' },
      { id: 'hat', name: 'HOODIE', price: 40, desc: 'Cosmetic. Server rooms are cold.' },
      { id: 'vest', name: 'LANYARD OF MANY BADGES', price: 60, desc: 'Cosmetic. Opens every door except the one you need.' },
      { id: 'tee', name: '"TURN IT OFF AND ON AGAIN" TEE', price: 100, desc: 'Legendary cosmetic.' },
    ],

    bosses: {
      loop: { name: 'THE DISK HOG', site: 'branch', reward: 100, phases: [['disk', 'boss'], ['password', 2], ['patch', 'boss']],
        taunt: 'I fill my own drives. Mid-fight. Out of spite.', need: 'SYSADMIN RANK + 3 WORLD-1 CLOSES' },
      bgp: { name: 'COUNT DNS-ULA', site: 'castle', reward: 200, phases: [['script', 'boss'], ['gpo', 'boss'], ['backup', 2]],
        taunt: 'Your attacks resolve... to MY address.', need: 'DISK HOG DOWN + SYSTEM ENGINEER + ACCESS CERT', dnsFriendly: true },
      auditor: { name: 'THE AUDITOR', site: 'tower', reward: 350, phases: [['patch', 'boss'], ['docs', 3], ['backup', 'boss']],
        taunt: 'Show me the patch report. And the runbooks.', need: 'DNS-ULA DOWN + SENIOR ENGINEER + SERVER CERT' },
      outage: { name: 'THE BLUE SCREEN OF DOOM', site: 'noc', reward: 1000, lateReward: 400,
        taunt: 'Every server ran into a problem and needs to restart.', need: 'ALL 3 BOSSES + ARCHITECT + SECURITY CERT' },
      friday: { name: 'THE CHANGE THAT COULD HAVE WAITED', reward: 25,
        taunt: 'It is Friday afternoon. You touched prod. Bold.' },
    },
    // Blue Screen of Doom triage: cards with `after` stay locked until that card is restored.
    outageCards: [
      { name: 'IDENTITY (AD/DNS)', game: 'script', level: 2, timer: 100 },
      { name: 'STORAGE (SAN)', game: 'disk', level: 2, timer: 170, after: 0 },
      { name: 'APPS (PAYROLL)', game: 'patch', level: 1, timer: 240, after: 0 },
      { name: 'USERS (VPN/DESK)', game: 'password', level: 1, timer: 300, after: 0 },
    ],
    finale: ['ransom', 'boss'],

    tips: [
      'Test restores. A backup you never restored is a wish.',
      '3-2-1 backups: 3 copies, 2 media, 1 offsite. Add 1 offline.',
      'Lower DNS TTL before a cutover; raise it again after.',
      'set -euo pipefail makes Bash fail closed on errors.',
      'Never pipe curl or wget straight into a shell.',
      'rm -rf "$dir/" hits / if dir is empty. Use ${dir:?}.',
      'kill -9 only after a normal kill fails. It skips cleanup.',
      'Patch the test box first. Reboot it. Then do prod.',
      "Don't reboot both domain controllers in the same hour.",
      'Verify the caller before you unlock an account.',
      'Admin accounts get no mailbox and no web browsing.',
      'Service accounts: long random passwords, or gMSA.',
      'Link a GPO to the OU that needs it, not the domain root.',
      'Block inheritance only with a documented reason.',
      'MFA on VPN and email. A password alone is not enough.',
      'Immutable (object-lock) backups survive a stolen admin login.',
      'Snapshots are not backups. They live on the same datastore.',
      'Too many vCPUs per VM adds CPU ready time, not speed.',
      'Leave RAM headroom on hosts for HA failover.',
      'Full inodes look like free disk. Check df -i too.',
      'Kerberos needs clocks within 5 minutes. Watch NTP.',
      'Alert on certificates 30 days out, not the day they expire.',
      'Keep RDP off the internet. VPN first, then RDP inside.',
      'Daily-driver account and admin account: always two accounts.',
      'Reset KRBTGT twice, hours apart, after a domain compromise.',
      'SPF, DKIM and DMARC together stop spoofed mail.',
      'Read-Only Friday: if it cannot roll back, it waits.',
      'Write the restore steps where on-call will actually look.',
      'Event ID 4740 in the DC security log = account locked out.',
      'Get-Help <cmdlet> -Examples is faster than searching.',
    ],

    flavor: {
      disk: ['The shared drive says 0 bytes', 'I only copied one ISO, I swear', 'Logs ate the C: drive overnight', "Outlook won't open. Disk full.", 'Temp is bigger than my house'],
      password: ['I typed it right. It hates me', 'Unlock me, meeting NOW', 'Caps lock was on since Monday', 'My MFA phone is in the lake', 'Can it be Password1?'],
      patch: ["Reboot it, I'm at lunch anyway", "Don't reboot, closing a sale", 'Is prod the one named prod-old?', 'My app died after updates', 'It popped up. I clicked yes.'],
      vm: ["Just one more VM. It's tiny.", "Give it 32 cores. It's Java.", 'RAM is a suggestion, right?', 'Clone prod. Name it prod-final2', 'CPU ready is pegged. Add more?'],
      backup: ['Deleted the file. Meeting is now', 'Restore Tuesday. Not Monday.', 'The CFO needs that spreadsheet', 'I emptied the recycle bin twice', 'Not the whole server. One file.'],
      gpo: ['Nobody on 3rd floor can log in', 'I linked it at the domain. Sorry', 'Mapped drives vanished at logon', 'Screen lock is now 10 seconds', 'Legal got the intern wallpaper'],
      script: ['It ran fine on my laptop', 'Just deploy it to all servers', 'The variable was empty. Once.', 'Please review before cron hits', 'Works if you run it as root'],
      ransom: ['A file named README got weird', 'All the shares end in .locked', 'I opened the invoice attachment', "Accounting can't open anything", "Don't pay them. Right? Right?"],
    },
    closeLines: {
      disk: ['Rotate your logs. Future you says thanks.', 'Alert at 80%, not at 100%.'],
      password: ['Verify the caller, then reset.', 'Self-service reset saves the help desk.'],
      patch: ['Test, then prod. Never prod at 2 PM.', 'Maintenance windows exist for a reason.'],
      vm: ['Right-size VMs. Overcommit kills.', 'Keep HA pairs on different hosts.'],
      backup: ['A tested restore is the only backup.', 'Know your retention before you need it.'],
      gpo: ['Link GPOs to the narrowest OU.', 'gpresult /r tells you what applied.'],
      script: ['-WhatIf before you run it for real.', 'Quote your variables. Always.'],
      ransom: ['Layers: EDR, MFA, immutable backups.', 'Offline backups do not get encrypted.'],
    },
  };

  PQ.rankOf = function (earned) {
    let r = 0;
    PQ.CFG.ranks.forEach((rk, i) => { if (earned >= rk.at) r = i; });
    const last = PQ.CFG.ranks.length - 1;
    if (r === last && !(PQ.state && PQ.state.bosses.outage)) r = last - 1;
    return r;
  };

  PQ.TRACKS = {
    title: {
      bpm: 120, drums: true,
      lead: ['D4', 'F4', 'A4', 'F4', 'A4', 'F4', 'D4', 'A3', 'C4', 'E4', 'G4', 'E4', 'G4', 'E4', 'C4', 'G3',
        'F4', 'A4', 'C5', 'A4', 'C5', 'A4', 'F4', 'C4', 'A4', 'F4', 'E4', 'D4', 'F4', 'E4', 'D4', 'D4'],
      bass: ['D2', '-', 'D3', '-', 'D2', '-', 'D3', '-', 'C2', '-', 'C3', '-', 'C2', '-', 'C3', '-',
        'F2', '-', 'F3', '-', 'F2', '-', 'F3', '-', 'D2', '-', 'D3', '-', 'D2', '-', 'D3', '-'],
    },
    overworld: {
      bpm: 126, drums: true,
      lead: ['G4', 'B4', 'D5', 'B4', 'C5', '-', 'A4', '-', 'G4', 'B4', 'D5', 'G5', 'F#5', '-', 'D5', '-',
        'E5', 'D5', 'C5', 'B4', 'A4', '-', 'C5', '-', 'B4', 'A4', 'G4', 'A4', 'G4', '-', '-', '-'],
      bass: ['G2', '-', 'D3', '-', 'C3', '-', 'A2', '-', 'G2', '-', 'D3', '-', 'D3', '-', 'D2', '-'],
    },
    minigame: {
      bpm: 160, drums: true,
      lead: ['E5', 'B4', 'E5', 'G5', 'F#5', 'E5', 'B4', 'E5', 'C5', 'G4', 'C5', 'E5', 'D5', 'B4', 'G4', 'B4'],
      bass: ['E2', '-', 'E3', 'E2', 'E2', '-', 'E3', 'E2', 'C2', '-', 'C3', 'C2', 'D2', '-', 'D3', 'D2'],
    },
    boss: {
      bpm: 172, drums: true,
      lead: ['A4', 'A4', 'C5', 'A4', 'D#5', 'D5', 'C5', 'A4', 'G4', 'G4', 'A#4', 'G4', 'C#5', 'C5', 'A#4', 'G4'],
      bass: ['A1', 'A2', 'A1', 'A2', 'A1', 'A2', 'A1', 'A2', 'G1', 'G2', 'G1', 'G2', 'G1', 'G2', 'G1', 'G2'],
    },
    shop: {
      bpm: 100,
      lead: ['C5', '-', 'E5', 'G5', 'C6', '-', 'B5', '-', 'A5', '-', 'F5', 'A5', 'G5', '-', '-', '-'],
      bass: ['C3', '-', 'G3', '-', 'F3', '-', 'C3', '-', 'F3', '-', 'D3', '-', 'G3', '-', 'G2', '-'],
    },
  };
})();
