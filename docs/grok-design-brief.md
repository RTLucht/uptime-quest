> Grok design brief for Uptime Quest (2026-10-02). Adopted (adapted to the existing engine) into js/config.js: economy, shop, cert tiers, boss phases, Blue Screen triage order, Read-Only Friday, uptime sign, tips, flavor lines.

Assumptions: the shipped pay formula, SLA clocks (150/110/85s), speed bonus, DNS=1 TD, and rank gates stay as they are. L1/L2/L3 are World 1/2/3. A round loss boots you to the map with the ticket still open and the SLA still running. A win closes it. Hearts: 3. Contact is 1 heart unless noted. 0 hearts wakes you at HQ. Pad: D-pad, A, B.

## 1. Mini-games

Round caps sit inside the SLA. Quota not met at the cap is a loss.

**Disk Space Panic** (base 10). 20×12 grid. Snake starts at length 3. A eats the cell ahead. Walls and your own tail cost 1 life, add +10% volume, and reset you to length 3. Volume starts high and rises every second. Junk is −space. A SYS block looks like a log and adds space. Win: eat the quota while volume stays under 100%. Three lives on L1–L2, two on L3.

| | Start | Rise | Junk | Quota | Speed | Notes | Cap |
|---|---|---|---|---|---|---|---|
| L1 | 70% | +1.0%/s | −8%, 1 on grid | 10 | 5 cells/s | no SYS | 80s |
| L2 | 78% | +1.4%/s | −6%, 2 on grid | 14 | 7 | 1 SYS decoy | 75s |
| L3 | 85% | +1.8%/s | −5%, 2 on grid | 16 | 8 | SYS always up, plus a moving write-head | 70s |

Boss mode: start 80%, +1.0%/s, junk −10%, quota 8, cap 60s, 2 lives. Volume jumps +18% at 15s and at 40s. Both spikes must be survived.

**Password Reset Rush** (base 10). Four desk lanes, six paces deep. Up/Down changes lane. A cycles Unlock / Reset / MFA. B serves that tool down the lane. The user walks toward you one pace at a time. They storm off on the last pace, or if a VIP hits pace 3. Win: serve the quota. Storm-offs are strikes.

| | Lanes | Tools | Spawn | Pace | Quota | Strikes | Cap |
|---|---|---|---|---|---|---|---|
| L1 | 2 | Unlock, Reset | 4.0s | 1.2s | 10 | 3 | 80s |
| L2 | 3 | all 3 | 2.6s | 0.95s | 14 | 3 | 75s |
| L3 | 4 | all 3 | 2.0s | 0.75s | 18 | 2 | 70s |

L1 wrong tool: user walks back to the rear once; a second wrong serve is a strike. L2–L3: any wrong serve is a strike. L3: 20% of users are VIP (3-pace patience). Boss mode: 3 lanes, pace 0.8s, quota 9, cap 60s, 2 strikes. Every 12s the icons shuffle for 3s.

**Patch Tuesday** (base 20). 3×3 rack. Cursor + A patches the lit server. A good server counts toward quota. An IN USE server costs 1 life. A good server that goes dark is a miss.

| | Lit | Gap | IN USE | Quota | Lives | Misses | Cap |
|---|---|---|---|---|---|---|---|
| L1 | 1.8s | 0.6s | 25% | 14 | 3 | 6 | 75s |
| L2 | 1.25s | 0.4s | 35% | 18 | 3 | 4 | 70s |
| L3 | 0.9s | 0.3s | 40% | 22 | 2 | 3 | 65s |

L2: one PAIR couple. Patching both within 1.5s costs a life. L3: at 20s and 40s, a 5s blackout makes every lit server IN USE. Boss mode: all 9 stay visible. A patched host reverts after 6s. Traps stay traps. Win: 6 patched at the same moment. Cap 60s, 2 lives.

**Script Commit** (base 50). Nine-line window, auto-scroll. A moves the cursor. B flags that line, then A picks one of three fixes. The bug line and the right fix are both required. Either miss is a strike. A commented-out landmine is never the bug.

| | Scripts | Read time | Strikes | What the bug looks like | Cap |
|---|---|---|---|---|---|
| L1 | 3 | 16s | 2 | `curl\|bash`, plaintext password, `rm -rf /` | 70s |
| L2 | 4 | 13s | 2 | unquoted `$var/`, missing `set -euo pipefail`, `Invoke-Expression` on input | 75s |
| L3 | 4 | 11s | 1 | inverted `if` plus a destructive line; one decoy is commented out | 65s |

Boss mode: 3 scripts, 10s each, 1 strike, no pause. The live bug is a prod target (`*` or `All-Servers`). Dev-only lines are decoys.

Host DNS button on these four: auto-clears the round for 1 TD and the trombone. Count DNS-ula overrides that in §4.

## 2. Enemies

- **Memory Leak Blob:** drifts toward you, +1 size every 8s (max 3 tiles) and faster as it grows. Contact: 1 heart and a 2s slow. Each zap shrinks one stage. At size 0 it dies. A Restart Service pad kills it at any size.
- **Zombie Processes:** 0.5 tile/s, cardinal shamble, bounce off racks. Contact: 1 heart. One zap stuns 1s and it gets back up. Three zaps inside 6s (`kill -9`) kill it. Anything less and it respawns 4s later at half size.
- **Expired Cert Ghost:** spawns at 00:00, gone at 04:00, drifts through walls toward the nearest HTTPS terminal. Contact, or using a terminal it reached: 1 heart and RDP/fast-travel locked 45s. Zap passes through. Renew by holding A on that terminal for 2s, or burn a Cert charge.
- **Service Account Phantom:** visible 3s, invisible 3s, fixed patrol. Contact has no damage. Zap the owner plaque first (name appears), then zap the phantom once: it retires and drops 15 TD. Zapping it before the plaque respawns it and sets payouts ×0.5 for 90s.
- **Snapshot Hoarder:** sits on one datastore. Every 20s it eats a snapshot and locks one chest. Contact: 2 hearts and knockback. Zaps bounce off. Pick up the 3 snapshot orbs in the room and drop them on the trash pad. The pile caves in and it leaves. Zapping the pile adds a snapshot.
- **Shadow IT Slime:** hops at you. First zap splits it into 2 mid slimes. Each mid zap splits into 2 tiny ones that run for the map edge. Contact at any size: 1 heart and a new ticket one urgency step higher. Only tinies can be removed, and only by walking them into the sanctioned-zone gate.

## 3. Shop

| Item | Price | Effect |
|---|---|---|
| Remote Desktop Wand | 100, permanent | From the HQ terminal, start the active ticket's mini-game on this world. Boss doors and Friday still require you at the site. |
| Coffee Mug | 15, hold max 3 | A drinks one and restores 1 heart. At full hearts the depot refuses the sale. |
| Golden Runbook | 120, buy up to 3 | Bind to one building. That building stops spawning tickets. The last building in a world cannot be bound. |
| Automation Scroll | 200, permanent | Bind to one unlocked mission. The first ticket of that type each world auto-closes for `floor(raw × 0.6)`, SLA counted as met, speed bonus 0. |
| Access Cert | 80 | Gate: 3 Disk Space closes. Unlocks Patch Tuesday and VM Tetris. |
| Server Cert | 200 | Gate: 3 Patch Tuesday closes. Unlocks Backup Restore, Group Policy Maze, Script Commit. Stacks +10% on raw, after urgency, before the SLA modifier. |
| Security Cert | 450 | Gate: 2 Script Commit closes. Unlocks Ransomware Siege and World 3 red tickets. Stacks another +15% the same way. |
| Immutable Backup Shield | 150, one held | One charge per world. On a Ransomware loss or a lethal Shadow IT / Blue Screen hit, you stay up at 1 heart, the ticket stays open, SLA pauses 10s. |
| AI Drone | 500 per charge | Once per world, from the intro card, skip one mini-game or one boss phase. Pay is raw with speed bonus 0. The finale refuses it. |
| Hoodie | 40 | Sprite only. |
| Lanyard of Many Badges | 60 | Badge puff on each close. |
| "Have You Tried Turning It Off and On Again?" tee | 100 | Buyable at lifetime ≥ 2500. Sprite only. |

## 4. Bosses

You enter with your current hearts. Each phase allows one retry. A second phase fail, or 0 hearts, ends the fight: no reward, uptime resets to 0. §1 boss mode applies unless the line below replaces it.

**The Disk Hog** (World 1, Branch Office). Unlock: lifetime ≥ 150, standing in the branch server room. Reward: 100 TD. Opens the World 2 road.
1. Disk Space Panic, §1 boss mode.
2. Password Reset Rush: only Reset scores. Unlock or MFA is a strike. Quota 8, cap 60s, 2 strikes.
3. Patch Tuesday on 4 racks, 2 of them IN USE (the backup job). Hold the 2 safe servers patched for 10s. Cap 50s, 2 lives.

**Count DNS-ula** (World 2, DC Castle). Unlock: lifetime ≥ 450 and Disk Hog down. Reward: 150 TD. Opens World 3.
1. Script Commit boss mode. Every bug is a bad resolver or a `hosts` override.
2. Short GPO: 5 rooms plus 2 side rooms, 50s. You carry one token, "DNS Suffix." Link it to the room marked DC-OU. Any other room fails the phase.
3. Patch-style record board, 60s, quota 9, 2 lives. The prompt names A, PTR, or CNAME. Patching a different type costs a life. The host DNS button fixes one record on this phase, then locks for the rest of the fight.

**The Auditor** (World 3, HQ). Unlock: lifetime ≥ 900, Count down, plus two stamps this world: one Patch Tuesday closed, and one Script Commit closed (a Golden Runbook bound to an HQ building counts as the second stamp). The door stays shut until both stamps are on. Reward: 200 TD. Opens the tower.
1. Patch Tuesday, §1 boss mode (6 of 9 held for 8s).
2. Script Commit boss mode. The bug is an outdated runbook step.
3. Backup Restore: side-scroll, 55s, pick up 3 tapes at fixed spots. A pit sends you to the start.

**The Blue Screen of Doom** (tower). Unlock: lifetime ≥ 1500, Auditor down, one Backup Restore closed. Reward: 350 TD. Rank still follows lifetime (Principal at 2500).

Four cards, then a finale. Correct order: **Identity → Storage → Apps → Users.** Each card is 45s. A card played out of that order runs on a 30s clock. One retry per card. The finale has no retry.

- Identity (Domain Controller): Script Commit, 2 scripts, 12s each, 1 strike. Played anywhere but first: every later card loses 15s.
- Storage (file server): Disk boss mode with a single +18% spike at 15s, quota 6, cap 45s. Played before Identity: the card fails on start and burns its retry.
- Apps (payroll and mail): Patch Tuesday, quota 8, 2 lives, cap 45s.
- Users (VPN and help desk): Password Reset, 2 lanes, quota 6, cap 45s.

Finale: Ransomware Siege, 70s, 8 servers in a row. A wave takes one server every 4s, left to right. Inventory is EDR ×2, MFA ×2, Immutable ×1, Reboot ×2. A cycles the tool, B places it. EDR, MFA, or Immutable saves that server. Reboot and empty servers fall. You need 5 survivors, so all 5 real tools have to land before the wave reaches those slots. Each card that was played out of order cuts the finale by 8s (floor 40s). A held shield saves one falling server.

## 5. Read-Only Friday and the uptime sign

The HQ clock starts Monday 00:00. A day is 180 real seconds and pauses during mini-games and menus (one in-game hour = 7.5s). The sign shows `FRI 15:42` style. Friday afternoon is day-of-week Friday and hour ≥ 15.

Starting any ticket mini-game in that window (depot purchases do nothing) calls **The Change That Could Have Waited**, once that Friday:
1. The ticket you launched, forced to L3 numbers, cap 60s.
2. Script Commit rollback: 2 scripts, 12s each. The bug is the change you just made.

Win: ticket pays raw with the speed bonus capped at +10%, plus 25 TD. Loss: payout ×0.5, uptime resets to 0, ticket stays open, you wake at HQ.

**Days since last outage** sits on the HQ sign. It starts at 0. At each Monday 00:00 it goes +1, unless an outage flag was set this week, in which case it becomes 0 and the sad jingle plays. The flag is set by a red-urgency SLA miss, any boss loss, 0 hearts, a Ransomware loss, patching an IN USE server, a Cert Ghost reaching a terminal, or losing the Friday fight. Green and yellow SLA misses leave it alone. The DNS button leaves it alone. One-time plaques: 10 days = 10 TD, 30 = 25 TD, 100 = 50 TD.

## 6. Loading-screen tips

1. Test restores. A backup you never restored is a wish.
2. 3-2-1: 3 copies, 2 media, 1 offsite. Add 1 offline.
3. DNS TTL: lower it before a cutover, raise it after.
4. `set -euo pipefail` so Bash fails closed on bad pipes.
5. Never pipe curl or wget straight into a shell.
6. `rm -rf $dir/` can hit / if dir is empty. Quote it.
7. kill -9 only after a normal kill fails. It skips cleanup.
8. Patch the test box first. Reboot it. Then do prod.
9. Don't reboot a DC and its partner in the same hour.
10. Lockout at 5 tries. Audit the caller before you unlock.
11. Privileged accounts get no mailbox and no web browsing.
12. Service accounts need a long random password, not a shared one.
13. A GPO should hit one OU, not the domain root.
14. Block inheritance only when the ticket says why.
15. MFA on VPN and on email. A password is not access control.
16. Immutable backups (object lock) survive a ransomware login.
17. Snapshots are not backups. They share the datastore.
18. vCPUs past the host's physical cores just add wait.
19. Leave RAM free for the host. Overcommit the guests only.
20. Enable Secure Boot and TPM before you image a new VM.
21. LDAP signing and channel binding stop unsigned binds.
22. Reset KRBTGT twice, 10+ hours apart, to kill golden tickets.
23. SPF, DKIM, and DMARC together, or spoofed mail still lands.
24. RDP stays off the internet. VPN first, then RDP inside.
25. Daily login and local admin should be two accounts.
26. Full inodes look like free disk. Check both.
27. Clocks within 5 minutes, or Kerberos just fails.
28. Cert alerts at 30 days, not the morning it expires.
29. Friday rule: if it cannot roll back, it waits.
30. Write restore steps where the on-call will actually look.

## 7. What the user said

**Disk Space Panic:** "The shared drive says 0 bytes again" · "I only copied one ISO, I swear" · "Can you delete someone else's files?" · "Outlook won't open. Disk full." · "Logs ate the C: drive overnight" · "Temp is bigger than my house" · "Don't delete MY files, just old ones" · "It beeps every time I save"

**Password Reset Rush:** "I typed it right. It hates me" · "Unlock me, I have a meeting NOW" · "Caps lock was on since Monday" · "Can the password be Password1?" · "My MFA phone is in the lake" · "It worked yesterday at 5:01" · "I need admin. Just for today" · "Reset it to what it was before"

**Patch Tuesday:** "Reboot it, I'm at lunch anyway" · "Don't reboot, I'm closing a sale" · "Is prod the one named prod-old?" · "Patch it, but nobody can reboot" · "My app died right after updates" · "The red server is mine. Leave it" · "You patched test. Now do prod." · "It popped up. I clicked yes."

**VM Tetris:** "Just one more VM. It's tiny." · "Give it 32 cores. It's Java." · "RAM is a suggestion, right?" · "Put it on the full host anyway" · "Clone prod. Name it prod-final2" · "The host is slow. Add my VM." · "CPU ready is pegged. Add more?" · "It fit in the quote. Make it fit."

**Backup Restore Run:** "I deleted the file. Meeting is now" · "Restore Tuesday. Not Monday." · "The CFO needs that spreadsheet" · "It's gone from the share and email" · "I emptied the recycle bin twice" · "Please say the tapes still work" · "Not the whole server. One file." · "Third time this month. Sorry."

**Group Policy Maze:** "Nobody on 3rd floor can log in" · "I linked it at the domain. Sorry." · "Mapped drives vanished at logon" · "Screensaver lock is now 10 seconds" · "New OU. Old policies. Chaos." · "Block inheritance. I saw it online." · "Legal got the intern wallpaper" · "Loopback broke the conference room"

**Script Commit:** "It ran fine on my laptop" · "Just deploy it to all servers" · "The variable was empty. Once." · "I tested it in prod. Small prod." · "Please review before the cron hits" · "It deletes old logs. Probably." · "Don't read line 40 too closely" · "Works if you run it as root"

**Ransomware Siege:** "A file named README got weird" · "All the shares end in .locked" · "I opened the invoice attachment" · "Accounting can't open any files" · "Is this the drill or the real one" · "My PC is encrypting the share" · "EDR blinked once, then nothing" · "Don't pay them. Right? Right?"