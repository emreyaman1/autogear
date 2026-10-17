# gearbox

[English](README.md) · [Türkçe](README.tr.md)

Automatic gear shifting for Claude Code. For every message gearbox picks the model (Haiku, Sonnet or Opus) and the effort the work needs, never above what the model picker (bottom right) holds, and keeps count of what that saved. Your usage limits last longer, and hard work still goes to the strong model.

> Status: 0.8.2. Built on Claude Code's **early access** plugin API (function hooks), which can change between releases. The safety nets below exist for that reason.

## What you get

- **The right model per message.** "What does this function do" runs on Haiku · low, a clear one-place change on Sonnet · medium, an unclear bug or an architecture question on Opus.
- **Nothing above your picker.** Set the picker to your strongest model once; gearbox chooses at or below it.
- **A state row.** A row above the prompt shows whether gearbox is on, in shadow mode or off, with buttons named for what they do.
- **Every answer explains itself.** The line under it names the model and effort that answered, the tier and why, and what the turn cost against the picker's model:

  ```
  ⚙ Haiku 5.5 · low · T0 önemsiz (kural: soru: "ne yapiyor") · önbellek 0 okundu / 100.0K yazıldı · $0,013 (seçici modeliyle $0,020)
  ```
- **A savings counter.** The status text at the bottom right carries the session's saving, and `/gear tasarruf` draws a card with the details.

## Install

In Claude Code:

```
/plugin install gearbox --marketplace emreyaman1/gearbox
```

Then set the picker to your strongest model once (for example **Opus · high**). Open a new chat after installing; chats that were already open do not load new plugins.

To install from a local copy, in a terminal:

```bash
claude plugin marketplace add C:\gearbox
```

```bash
claude plugin install gearbox@gearbox
```

It then runs in every Claude Code session you open, the desktop app included. Needs Claude Code 2.1.295 or newer (tested on 2.1.295 and 2.1.299). Claude Code checks a hooks module against its own plugin API before running any of it and refuses the whole module if one event or call is unknown, and a plugin cannot declare a minimum version, so on an older build gearbox does not load at all and cannot say why; 2.1.278 refuses 0.7 as well as 0.8. The desktop app brings its own up-to-date Claude Code; a `claude` installed separately in a terminal may be older (`claude --version`, `claude update`).

## Using it

**The picker is the ceiling.** gearbox never spends more than the model and effort the picker holds. Change the picker and it tells you the new ceiling. With the picker on **Opus · high** it is fully automatic.

**The state row.** A small row above the prompt shows what gearbox is doing: a badge reads **AÇIK** (on, green), **GÖLGE** (shadow, violet), **KAPALI** (off, gray) or **DURDU** (stood down, amber; see Safety nets). Its dot moves a little to say what gearbox is doing: a soft pulse while it routes, a slow breath in shadow mode, still when off, a slow blink when stood down; with "reduce motion" set in your system it stays still. Beside it stands the last choice ("Sonnet · medium · T1 rutin"; in shadow mode what gearbox would have picked), or before one, what the state means. Beside it are buttons for the other states, each named for what a press does: **aç** (turn on), **gölgeye al** (shadow mode), **kapat** (turn off); stood down, **yeniden dene** (try again). When off, every request goes out exactly as the picker says. The status text at the bottom right shows the model and effort chosen for the last message and the session's saving. While a rate-limit window is nearly full or spent too fast, the row also shows a warning (see Pace below).

**Shadow mode.** `/gear golge` lets gearbox choose without applying the choice: every request goes out as the picker says, and gearbox writes what it would have picked under each answer (`⚙ gölge: Haiku · low · T0 önerirdi · cevap: Opus 5.5`) and in its log. The picker is the ceiling here too; when it cut the choice, both are written: `⚙ gölge: Sonnet · high · T3 zor önerirdi, tavan olmasa Opus · medium`, so a need for Opus shows even under a Sonnet picker. A new version can be tried this way on real work without touching that work, and `/gear yanlis` still marks its choices. `/gear oto` turns routing back on.

**Plan mode.** In Claude Code's plan mode every request goes to Opus, at an effort by the size of the plan as the rules read it: medium for a small one, high for a middling one, xhigh for a large one with many parts. It never goes above the picker, and a model you name (`+sonnet`) still wins. gearbox sees plan mode from the note Claude Code adds for the model, so plan mode switched on in the middle of an answer counts from the next message. Outside plan mode, a request for a plan ("plan çıkar", "nasıl yapalım", "yol haritası", "plan the migration") counts as hard work (T3). The line under the answer and the log say `plan modu`.

**Overrides.** Tokens at the start of a message set the choice for that message only and are removed before the model sees them: `+haiku` `+sonnet` `+opus`, `+low` … `+max`, `+ucuz` (T0), `+derin` (T4). Writing `ultrathink` means T4.

Or say it in words: "bu görevi sonnet'e max ile ver", "opus ile yap", "opus, sen de bak", "use opus" pick the model, and the effort when one is named, for that message. Talking about a model ("haiku ile yaptı", "opus pahalı mı?") picks nothing. A choice made in words, like a token, may go above the picker.

**Commands.**

| Command | Does |
|---|---|
| `/gear` | status, last decision and reason, limits, statistics, this list |
| `/gear tasarruf` | the savings card (see below) |
| `/gear kayit` | the log of gearbox's latest decisions and the doubtful ones |
| `/gear yanlis zayif\|fazla` | mark the latest decision: model too weak, or more than the work needed |
| `/gear sifirla` | reset the savings counter and the log |
| `/gear oto` / `/gear sabitle` | turn gearbox on / off (off: the picker's model is used) |
| `/gear golge` | shadow mode: choose and write it down, apply nothing |
| `/gear profil tasarruf\|dengeli\|kalite` | which tier table to use |
| `/gear haiku aç\|kapa` | may trivial work go to Haiku |
| `/gear sor aç\|kapa` | may the rules ask Haiku when unsure |
| `/gear not aç\|kapa` | the line under each answer |
| `/gear bant aç\|kapa` | the state row above the prompt |

(`aç` = on, `kapa` = off, `oto` = auto, `sabitle` = pin, `sifirla` = reset.)

## How it works

```
message ─► classify ─► settle ─► decide ─► apply     ─► answer ─► verify        ─► count
           signals     settle    tiers     turn.step              turn.complete    savings
           llm                   policy                                            prices
                                 pacing
```

1. **Classify** (`hooks/core/signals.ts`): a message becomes tier T0 to T4. Turkish and English cues are read; code, paths and identifiers inside the message are ignored; verbs are read together with their object ("change the color" is not "add a payment system"). The notes Claude Code puts ahead of a message are skipped, a greeting is T0 at once, and a message with nothing written (only an image) carries on with the last choice. When the rules are unsure, one short question goes to Haiku (`hooks/core/llm.ts`).
2. **Settle** (`hooks/core/settle.ts`): Haiku reads the message alone, without the screenshot or the work around it, so its answer goes at most one tier below what the rules saw, and not under T2 for a request to look into something. A message in the middle of work at T2 or above (a question, a remark, one only Haiku could place) goes at most one tier below that work; new work the rules are sure of, a chore such as a commit, or a greeting starts afresh.
3. **Decide** (`hooks/core/tiers.ts`, `policy.ts`, `pacing.ts`): the tier maps to a model and effort through a profile, then passes two limits and a look at the rate-limit windows:
   - **Ceiling:** never above the picker's model and effort.
   - **Cache:** with a large context (40K+ tokens) a one-tier difference changes only the effort, because switching models re-sends the whole conversation uncached. A warm cache never keeps harder work on Haiku.
   - **Pace:** a rate-limit window never lowers the model or the effort: finishing the work matters more than the window. When the 5-hour or weekly window is at 90% or more, or spent faster than an even pace (30%+ used and 20 points ahead), the line under the answer and the state row carry a warning instead (`⚠ 5 saatlik limit %92: bu iş Opus · high ile yapılıyor, limit dolabilir`). If a window is nearly over with at most half used, hard and critical work (T3 and up) gets one step more effort, never as far as max and never above the picker. Standard work is left as it is: on clearly described work more effort did not help in the measurements behind the tier table.
4. **Apply** (`hooks/register.tsx`, `turn.step`): right before each model request. All requests of a turn use the same model, so the turn keeps its cache. Subagents are left alone.
5. **Verify** (`turn.complete`): the API names the model that really answered; it is compared with the choice (see Safety nets).
6. **Count** (`hooks/core/savings.ts`): the turn's real tokens are priced twice, once on the model that answered and once on the picker's model, and added to the session's and the lifetime totals.

| Tier | Example | `tasarruf` (Pro) |
|---|---|---|
| T0 trivial | "what does this function do", commit message, rename | Haiku · low |
| T1 routine | clear one-place change | Sonnet · medium |
| T2 standard | feature, tests for it, debugging with the error in hand | Sonnet · medium |
| T3 hard | architecture, performance, security, a choice between options | Opus · medium |
| T3 vague hunt | a bug told without detail ("this doesn't work, fix it"), with no error, file, number or moment, and no screenshot | Opus · high |
| T3 located hunt | a bug told plainly whose cause hides (it comes and goes, it shows far from where it starts), tests written to catch bugs nobody has found yet | Sonnet · high (xhigh at T4) |
| T4 critical | long multi-step work, repeated failure | Opus · high |

Profiles: `tasarruf` (saver, for Pro), `dengeli` (balanced) and `kalite` (quality) spend more, for Max plans. In every profile clearly described routine and standard work runs on Sonnet · medium, a vague hunt on Opus · high, a located one on Sonnet · high, and no tier runs at max unless you ask for it (`+max`, "max ile"). The evidence: in a public measurement on real Python projects with hidden tests (Forn AI, 4 October 2026), Sonnet · medium fixed 13 of 13 bugs whose place was clear at a third of Opus · high's cost, and raising Sonnet's effort on clear work did not help; a bug whose error pointed at the wrong file went 6 of 6 on Opus · high and 4 of 6 on Sonnet · medium, the same bug told vaguely 0 of 2 on Sonnet, and tests that had to catch 22 hidden bugs 22 of 22 on Opus · high against 16 to 19 on Sonnet. Some of these rest on 2 to 6 runs, so the table is a starting point that gearbox's own comparison is to check. In that comparison (Measurements) Sonnet · medium passed every hunt Opus · high passed, which is why a located hunt now goes to Sonnet at more effort; the vague kind stays on Opus until harder tasks say otherwise.

A bug report counts as clear when it holds the error, a file, code, a number, the moment it happens ("when I click...") or what should happen instead; a screenshot beside it counts too.

## Reviewing its decisions

The classifier numbers below were measured on labels we wrote. To see how gearbox does on your own work, it keeps a log of its decisions on your machine: the start of each message (100 characters), the tier, the model and effort that answered, what gearbox wanted when the picker cut it, the source of the choice, what the turn cost, and what happened next. The last 200 are kept.

- `/gear kayit` shows the latest 25 as a table, the tiers used, and the **doubtful decisions**: those the work itself called into question (you complained and gearbox moved up a tier; the tests or build failed at the end of the turn) and those you marked.
- When a decision was wrong, say so right after the answer: `/gear yanlis zayif` (the model was too weak) or `/gear yanlis fazla` (stronger than the work needed). The mark lands on the latest message.
- The doubtful share is a floor: a wrong choice nobody noticed is not counted. With a few days of use it shows which kinds of message the rules get wrong, which is where to tune next.
- `/gear sifirla` clears the log. It never leaves your machine.

## Savings

**Where it shows.**

- The line under each answer: this turn's cost and what it would have cost on the picker's model.
- The status text at the bottom right: the session's total saving.
- `/gear tasarruf`: a card drawn in the transcript with
  - two bars, the saving this session and in total, each with its share of the picker's bill;
  - the share of each model, as a bar and a legend;
  - a table per model: turns, input, output, cache read, cache write, cache hit rate, spend, spend on the picker's model, saving;
  - the 5-hour and weekly rate-limit windows.

  On a narrow screen the table becomes one line per model. Where a surface cannot draw the card, the same figures come as a markdown table. Both read the same stored totals.
- `/gear sifirla` starts the count again. The totals live in the plugin's store on your machine, and the date counting began is on the card.

**How it is computed.** Each turn's real token counts (input, output, cache read, cache write) times the list price of the model that answered, against the same tokens times the list price of the picker's model. The prices are in `hooks/core/prices.ts`:

| Model | Input | Output | Cache read | Cache write (5 min) |
|---|---|---|---|---|
| Haiku 5.5 | $0.10 | $0.50 | $0.01 | $0.125 |
| Sonnet 5.5 | $2 | $10 | $0.20 | $2.50 |
| Opus 5.5 | $4 | $20 | $0.20 | $5 |
| Fable 5.1 | $10 | $50 | $0.25 | $12.50 |

Dollars per million tokens. A Haiku prompt over 100K tokens costs five times as much.

**It is an estimate.**

- On a subscription you pay no dollars; the quota drains at roughly that ratio.
- A turn that switched model rewrote its cache. On the picker's model that cache would have been warm, so those writes are priced as reads there: the cost of switching counts against gearbox.
- Lower effort emits fewer tokens. That is not credited, so the saving can read a little low.
- gearbox's own Haiku questions are subtracted. Subagents are not counted.

## Safety nets

- **Self-check:** after every turn it compares the model the API says answered with the one it chose. If 3 turns in a row differ (a Claude Code update changed the plugin API), it switches itself off and tells you; `/gear oto` tries again.
- **Fallback model:** if a chosen model gives no answer (retired id, not on your plan), the request is re-sent on the picker's model and the failed one is avoided for the session.
- **Snowball brake:** if a turn done on a cheap model ends with failing tests or build, the next turn goes one tier up. Complaints ("still broken") also raise the tier, two tiers on the second in a row.
- **Version notice:** one notice when Claude Code is newer than the version gearbox was tested on (`hooks/core/version.ts`).
- **Weekly compatibility CI:** `.github/workflows/compat.yml` validates and tests against the newest Claude Code every week.
- **Live smoke test:** `node scripts/smoke.mjs` sends three short messages and checks from the API's reply that the model really changed (spends a little usage).

## Measurements

**Classifier** (`eval/`): 143 labeled messages in three sets: the one the rules were tuned on (66), one set aside before tuning (43), and one written after tuning and measured once (34). Labels follow "how strong a model should do this". On the last two sets together (77 messages):

| Method | Exact | Within 1 tier | Severe* | Asked Haiku |
|---|---|---|---|---|
| Rules only | 83% | 94% | 4 | 0% |
| Haiku only | 77% | 97% | 0 | 100% |
| Rules, Haiku when unsure (0.5) | 90% | 100% | 0 | 19% |
| **Rules, Haiku when unsure, held to the rules' signs (0.6)** | **88%** | **100%** | **0** | **19%** |
| Always Haiku, take the higher | 74% | 96% | 0 | 100% |

How the 143 labelled messages are routed, by the rules alone, with the picker on Opus · high (0.8, `tasarruf`; `claude plugin test .` prints it as `EVAL route`): T0 Haiku · low 24, T1 Sonnet · medium 37, T2 Sonnet · medium 33, T3 Opus · medium 26, T3 located hunt Sonnet · high 10, T4 Opus · high 13. Until 0.7 the 33 standard ones ran on Sonnet · high and the 10 hunts on Opus · medium; the tiers themselves did not change.

\* Putting hard work (T3+) at T0/T1, or two tiers or more too low. The held-out errors were seen once, and the fresh-set errors informed the "ask when unsure" threshold, so true accuracy may be somewhat lower. The bound of 0.6 costs one message here ("bu import neden kullanılıyor?" is now T1, not T0) and is what keeps the real-use errors below from happening.

**Real use**: the 49 decisions gearbox made in 11 sessions between 11 and 16 October 2026, each labelled afterwards from what the work turned out to be (one reviewer's judgment, not a panel's). What gearbox chose then, and the same messages played again through 0.6:

| | Exact | Within 1 tier | Severe* | Too low | Too high |
|---|---|---|---|---|---|
| gearbox 0.3 to 0.5, as it ran | 51% | 82% | 7 | 17 | 7 |
| gearbox 0.6, played again | 61% | 100% | 0 | 10 | 9 |

What went wrong in the first row: the note Claude Code puts ahead of a message in a new session was read as the message, so a bare "merhaba" went to Opus · high; Haiku called bug reports that came with a screenshot trivial ("o tuş çıkmadı yine", "inceler misin"); a remark in the middle of a long task dropped the task to Haiku; a model asked for in words ("sonnet'e max ile ver") was ignored. The fixes of 0.6 were made from these same messages, so the second row shows that they hold, not how 0.6 does on messages it has not seen, and two of the replayed messages would go to Haiku with no logged answer. The decision log is what will tell. The messages are someone's real work, so the set and the test that replays it are kept on the developer's machine, not in this repository.

**External benchmarks** (`eval/external.mjs`): difficulty set by other people, on public sets of coding-agent work. [SWE-bench Verified](https://huggingface.co/datasets/princeton-nlp/SWE-bench_Verified): 500 GitHub issues, each with the time annotators judged an engineer would need to fix it. [Terminal-Bench](https://github.com/harbor-framework/terminal-bench-1): 241 tasks done in a terminal, each with its author's estimate of an expert's time. Time maps to tier (under 15 minutes T1, under an hour T2, under four hours T3, more T4); neither set holds trivial work. Each set is split in two by a hash of the task id: the rules may be tuned while looking at one half, the other is only measured. The texts are fetched into `eval/.work` and never kept in this repository, as the benchmarks ask.

| Held-out half of both (350), 0.7 | Exact | Within 1 tier | Severe* | Too high | Rank agreement |
|---|---|---|---|---|---|
| Rules alone | 36% | 79% | 9 (3%) | 183 | 0.10 |
| **gearbox: rules, Haiku when unsure** | **31%** | **78%** | **6 (2%)** | **207** | **0.16** |

By set, gearbox as it runs: SWE-bench Verified 36% exact, 83% within one tier, 1 severe case in 500; Terminal-Bench 30%, 73%, 8 severe cases in 241 (3%). Before the two rule fixes of 0.7 (a chore word such as "commit" inside a long description no longer makes it trivial; a long description of work is no small change) the rules had 21 severe cases (6%) on the held-out half. Asking Haiku where the rules are unsure lowers the severe cases further and raises the rank agreement, at the price of more work sent a tier or two too high, since Haiku answers the higher tier when torn. The measurement asked Haiku 177 times, $0.38 at list price. These numbers are from 0.7: 0.8 moved three kinds of request up to T3 (a bug told without detail, tests written to catch hidden bugs, a request for a plan) and has not been measured on these sets again.

What it shows: gearbox rarely sends hard work to a weak model, but on long English issues and task statements it hardly tells a fifteen-minute fix from a four-hour one (rank agreement 0.16), and it spends on the safe side. These texts are unlike the short prompts people type, which is what the rules were built for; and the time-to-tier mapping is ours, so some of "too high" is a tier the work may well have deserved (a quick fix in an unfamiliar codebase is still a hunt).

**Output quality** (`eval/tasks/`): ten real tasks on a small project, each checked by tests Claude never saw, run under six setups (`node eval/tasks.mjs <arm>`). Costs at API list prices, one run each, on Claude Code 2.1.299, 17 October 2026; ✗ marks a failed task.

| Task | Kind | gearbox | Opus · high | Opus · medium | Sonnet · medium | opusplan | Sonnet + Opus advisor |
|---|---|---|---|---|---|---|---|
| 1 | rename | $0.01 Haiku | $0.21 | $0.21 | $0.06 | $0.09 | $0.10 |
| 2 | small change | $0.06 Sonnet | $0.21 | $0.14 | $0.06 | $0.06 | $0.07 |
| 3 | feature with tests | $0.10 Sonnet | $0.29 | $0.25 | $0.09 | $0.10 | $0.10 |
| 4 | bug, place given | $0.06 Sonnet | $0.24 | $0.18 | $0.06 | $0.06 | $0.07 |
| 5 | bug whose cause hides | $0.36 Opus | $0.34 | $0.23 | $0.10 | $0.08 | $0.11 |
| 6 | bug, place given | $0.07 Sonnet | $0.26 | $0.21 | $0.07 | $0.07 | $0.09 |
| 7 | misleading bug: the error points at the wrong file | $0.08 Sonnet | $0.33 | $0.24 | $0.07 | $0.08 | ✗ $0.09 |
| 8 | the same bug told as "bu çalışmıyor, düzelt" | $0.33 Opus | $0.35 | $0.24 | $0.08 | $0.09 | $0.11 |
| 9 | tests that must catch six inserted bugs | $0.81 Opus | $0.58 | $0.45 | $0.12 | $0.13 | $0.13 |
| 10 | small refactor | $0.08 Sonnet | $0.28 | $0.19 | $0.09 | $0.09 | $0.04 |
| **Total** | | **10/10, $1.96** | **10/10, $3.09** | **10/10, $2.33** | **10/10, $0.81** | **10/10, $0.85** | **9/10, $0.92** |

What it shows, the unflattering part first:

- **On these tasks Sonnet · medium alone did as well as anything, for the least.** Every setup but one passed all ten, so this set does not tell the models apart: it is too easy. Sonnet · medium spent $0.81, gearbox $1.96, Opus · high $3.09.
- **gearbox costs more than Sonnet alone here** because it sent the three hunts (5, 8, 9) to Opus · high: $1.50 of its $1.96, on work Sonnet also passed. Whether that pays off on harder work is what the next measurement has to show (bigger projects, three runs each).
- gearbox is 37% cheaper than Opus · high and 16% cheaper than Opus · medium, at the same result, and 40% faster than Opus · high.
- **Model or effort:** Opus · medium did what Opus · high did for 25% less; Sonnet · medium did it for a third of Opus · medium.
- opusplan ran Sonnet throughout: these tasks were not done in plan mode.
- The one failure was Sonnet with Opus as its advisor, on the misleading bug: it fixed the file the error pointed at, not the cause. gearbox sent that task to Sonnet too, since an error message in hand reads as a clear bug, and passed. One run, so this is luck as much as anything; the measurement does not show whether the advisor was consulted.
- One run per cell on a small project: direction, not certainty. In an earlier run (0.7, six tasks) gearbox matched Opus · high on four tasks for $0.31 against $2.38.

**A real project** (`--set sqlglot`): ten bugs fixed in [sqlglot](https://github.com/tobymao/sqlglot) after July 2026, a 100K-line SQL parser, each set up as the code stood before the fix and checked by the tests the fix added. One run each, Claude Code 2.1.299, 17 October 2026. gearbox 0.8.1 is the version that sent every hunt to Opus · high; 0.8.2 sends a located one to Sonnet · high.

| Task | Kind | gearbox 0.8.2 | gearbox 0.8.1 | Sonnet · medium | Opus · high |
|---|---|---|---|---|---|
| sq-tsql-output | vaguely told bug | ✗ $1.28 Opus | ✗ $0.94 Opus | ✗ $0.28 | ✗ $1.38 |
| sq-duckdb-sample | placed bug | $0.23 Sonnet | $0.22 Sonnet | $0.25 | $0.88 |
| sq-snowflake-join-marker | feature | $0.55 Opus | ✗ $0.54 Opus | $0.22 | $0.69 |
| sq-oracle-q-quote | feature | $0.28 Sonnet | $0.32 Sonnet | $0.41 | $1.05 |
| sq-starrocks-like | misleading bug | $0.43 Opus | $0.40 Opus | $0.21 | $0.62 |
| sq-mysql-charset-cast | vaguely told bug | $0.78 Opus | $0.80 Opus | $0.24 | $1.08 |
| sq-duckdb-array-insert | bug whose cause hides | $0.22 Sonnet | $0.65 Opus | $0.16 | $0.62 |
| sq-quoted-escapes | placed bug | ✗ $0.39 Sonnet | $0.42 Sonnet | $0.35 | $1.54 |
| sq-nulls-order-alias | bug whose cause hides | $0.27 Sonnet | $0.74 Opus | $0.15 | $0.62 |
| sq-duckdb-empty-regexp | placed bug | $0.48 Opus | $0.39 Opus | $0.22 | $0.52 |
| **Total** | | **8/10, $4.90** | **8/10, $5.43** | **9/10, $2.49** | **9/10, $8.98** |

What it shows, the unflattering part first:

- **Sonnet · medium alone solved 9 of 10 for $2.49; Opus · high solved the same 9 for $8.98; gearbox 8 for about $5.** Over both sets, twenty tasks, Opus never solved one that Sonnet · medium failed: the one Sonnet failed (`sq-tsql-output`, a vague report whose quick fix breaks T-SQL's OUTPUT clause) every setup failed.
- gearbox's two failures are tasks Sonnet · medium passed on its own, one on Sonnet and one on Opus: on one run that reads as noise, not as a model too weak.
- **The hunt split held:** the two located hunts went to Sonnet under 0.8.2 and passed for $0.49, against $1.39 on Opus under 0.8.1.
- gearbox sends work to Opus that Sonnet does as well here: the two vague reports, the misleading one and two others cost $3.52 on Opus against $1.17 for Sonnet · medium on the same tasks.
- One run per cell. Three runs would cost about $65 more at list price.

## Project layout

| Path | What it holds |
|---|---|
| `hooks/register.tsx` | the hooks module: events, the `/gear` command, the state row, the card hook |
| `hooks/card.tsx` | the savings card, a tree of Box and Text |
| `hooks/core/signals.ts` | the classifier: rules, overrides, Turkish and English cues |
| `hooks/core/llm.ts` | the question put to Haiku when the rules are unsure |
| `hooks/core/tiers.ts` | profiles: tier to model and effort |
| `hooks/core/policy.ts` | ceiling and cache applied to a tier, and the windows it warns about |
| `hooks/core/pacing.ts` | reads the rate-limit windows and words the warning |
| `hooks/core/models.ts` | model families, ids, effort levels |
| `hooks/core/prices.ts` | list prices and the cost of a turn |
| `hooks/core/journal.ts` | the decision log: entries, complaint and failing-check flags, your marks, the report |
| `hooks/core/settle.ts` | how the rules, Haiku's answer and the work in hand settle a tier |
| `hooks/core/savings.ts` | per-model totals, the saving, the markdown report |
| `hooks/core/settings.ts` | stored settings and statistics, `/gear` parsing |
| `hooks/core/switch.ts` | the drawing of the state badge |
| `hooks/core/version.ts` | the newest Claude Code version it was tested on |
| `tests/` | rules, policy, prices and savings; the router against a mock engine; the classifier eval |
| `eval/` | classifier measurement, the external benchmarks (`external.mjs`) and the output-quality tasks |
| `scripts/` | the live smoke test; `harvest.mjs`, which gathers gearbox's decisions from your transcripts |

## Development

```bash
claude plugin validate .
```

```bash
claude plugin test .
```

```bash
node eval/haiku.mjs
```

```bash
node eval/tasks.mjs
```

`node eval/tasks.mjs <arm>` takes `--runs N` and `--set sqlglot`: ten real bugs of [sqlglot](https://github.com/tobymao/sqlglot) (MIT, about 100K lines), each set up as the code stood just before its fix, without git history, and checked by the tests that fix added. It needs sqlglot cloned into `eval/.work/repos/sqlglot` and Python 3.9+. `--dry` checks every such task for free: it must fail as given and pass with the real fix. The arm `gearbox-0.8.1` is gearbox before the hunt split, to compare the two rules.

The last two call real models and spend usage; Haiku answers are cached under `eval/.work`. `plugin test` needs Claude Code 2.1.295 or newer (2.1.295 and 2.1.299 were used): on older builds the hooks module does not load and the router tests fail (2.1.278: 75 pass, 30 fail). The `claude` on your PATH can be older than the desktop app's own build; on Windows that one lives under `%APPDATA%\Claude\claude-code\` or, in newer apps, `%LOCALAPPDATA%\Claude-Data\<profile>\claude-code\`. The measurement scripts pick the newest of them themselves (`CLAUDE_BIN` overrides) and stop before spending anything on a build older than 2.1.295.

**Developing without making yourself the test.** A new version goes through four steps, each before the next, and only the last touches real work:

1. Offline: `claude plugin test .` (rules, policy, router, the eval sets) and `node eval/external.mjs` (the external benchmarks, free; `--haiku` adds Haiku's answers for a little usage).
2. In shadow mode (`/gear golge`) on real work: gearbox chooses and writes down, the picker's model answers.
3. `node scripts/harvest.mjs` gathers those choices from the transcripts into `eval/.work/harvest.json`; labelled, they become a real-use set to replay the next version over.
4. Only then `/gear oto`.

**Trying a change in your own Claude Code.** Claude Code runs an installed copy of the plugin, not the folder. After editing, raise `version` in `.claude-plugin/plugin.json`, then:

```bash
claude plugin marketplace update gearbox
```

```bash
claude plugin update gearbox@gearbox
```

Restart the app and open a new chat.

**After a Claude Code update:**

1. Run `claude plugin test .` and `node scripts/smoke.mjs`.
2. If both pass, raise `TESTED_THROUGH` in `hooks/core/version.ts` to the new version.
3. When new models ship, update `MODEL_IDS` in `hooks/core/models.ts` and the price table in `hooks/core/prices.ts`.

## Roadmap

- [x] Live verification, self-check, fallback model, snowball brake
- [x] Classifier and output-quality measurements
- [x] Per-turn cost, savings counter and card
- [x] English README, MIT license, published on GitHub
- [x] Shadow mode, external benchmarks and a harvest of real decisions, so a new version is judged before it routes anyone's work (0.7)
- [x] Rate-limit windows warn instead of lowering the choice; the effort table retuned from measurements (Sonnet · medium for clear work, hunts at high, no max unasked); a state row that shows on, shadow and off apart; the shadow log keeps what the picker cut; plan mode goes to Opus (0.8)
- [ ] Subagent rules: their requests reach the hook (they carry an `agentId`) and are passed through untouched today; routing exploration agents to Haiku · low is next, once their share of the quota is measured
- [x] Decision log with your marks, to see where the rules go wrong
- [x] Review of real use: system notes, the bound on Haiku, the hold on work in hand, models named in words (0.6)
- [ ] Learning from those corrections

## License

MIT
