# Uptime Quest: The Tech$$$ Run — System Engineer Edition

The sequel to [Packet Quest](https://github.com/RTLucht/packet-quest). You are a junior system engineer in The Enterprise: servers crash, disks fill, users forget their passwords. Take tickets at HQ, get to the server room, cloud island, or user's desk, fix it in a mini-game before the SLA runs out, and earn **Tech$$$**. Rank up from Tier 1 Admin to Principal of the Server Realm and defeat The Blue Screen of Doom.

Built by a three-model team: Claude (engine, overworld, flow, 4 mini-games), Codex (4 mini-games, bug review), and Grok (design brief, economy, bosses, tips).

**Play:** https://rtlucht.github.io/uptime-quest/ — or open `index.html` locally. No install, no build. Progress saves to `localStorage`.

## Controls

| Key | Action |
|---|---|
| Arrows / WASD | Move |
| Shift | Run (uses stamina) |
| E / Enter | Interact |
| Space | Zap (kill -9, restart service, delete snapshots...) |
| C | Coffee |
| P | Acknowledge the pager |
| D | Send the AI drone (on a mission intro) |
| M | Mute |
| Esc | Bail out |

## Mini-games

| Mission | Gameplay | Base |
|---|---|---|
| Disk Space Panic | Snake: eat old logs and temp junk before the volume hits 100%. Never eat system files. | 10 |
| Password Reset Rush | Tapper: slide resets to users before they storm off. Don't reset social engineers. | 10 |
| Patch Tuesday | Whack-a-mole: patch servers; rebooting PROD before 17:00 costs a life. | 20 |
| VM Tetris | Place falling VMs on hosts without overcommitting CPU/RAM. Keep HA pairs apart. | 20 |
| Backup Restore Run | Side-scroller through the tape vault to grab the right restore tape. | 50 |
| Group Policy Maze | Walk the OU maze and link each GPO to the right container. | 50 |
| Script Commit | Find the bugs in a PowerShell/Bash script before it runs on every prod server. | 50 |
| Ransomware Siege | Tower defense with EDR, MFA, and immutable backups. | 100 |

## Enemies

Memory Leak Blob (grows until you restart it), Zombie Processes (need three zaps: kill -9), Expired Cert Ghost (midnight only), Service Account Phantom (deleting it might break payroll), Snapshot Hoarder (a dragon on a pile of VM snapshots), Shadow IT Slime (splits into unmanaged cloud accounts).

## Bosses

- **The Disk Hog** (Branch Office) — fills its own drives mid-fight.
- **Count DNS-ula** (DC Castle) — it's DNS. The hidden DNS button shows up early and costs nothing here.
- **The Auditor** (HQ Tower) — weak only if your sites are documented (Golden Runbook).
- **The Blue Screen of Doom** (Data Center) — restore systems from backup in the right order (Identity first), then survive a Ransomware Siege finale.
- **Read-Only Friday** — start a change on Friday after 15:00 and The Change That Could Have Waited appears.

## Fun touches

- "Days since last outage" sign at HQ: +1 per in-game day, resets on red-SLA misses, boss losses, burnout, or Friday failures.
- Hidden **dns** button: solves the puzzle, pays 1 T$, sad trombone.
- On-call pager, 30 real sysadmin tips on loading screens, local leaderboard.

## Development

- `dev.html` launches any mini-game at any level or in boss mode.
- Architecture and the mini-game contract: `CLAUDE.md`. Tunable numbers: `js/config.js`.
- Grok's design brief: `docs/grok-design-brief.md`.
