# autogear

[English](README.md) · [Türkçe](README.tr.md)

Automatic gear shifting for Claude Code. For every message autogear picks the model (Haiku, Sonnet or Opus) and the effort the work needs, never above what the model picker (bottom right) holds, and keeps count of what that saved. Your usage limits last longer: in its own measurements the strong model solved nothing the cheaper one could not, so Opus is kept for critical work, plan mode and when you ask for it.

> Status: 0.12.2. A Claude Code Mod, built on the plugin API's function hooks, which can change between Claude Code releases. The safety nets below exist for that reason. Release notes: [CHANGELOG.md](CHANGELOG.md). What it keeps and what it sends: [Privacy](#privacy).

![autogear in 28 seconds: each message gets the model it needs, never above your picker](docs/demo/autogear-demo.gif)

*An illustration made from autogear's own tiers and measurements, not a screen recording. The source is `docs/demo/demo.html`; `docs/demo/render.py` renders it.*

## What you get

- **The right model per message.** "What does this function do" runs on Haiku · low, a clear one-place change on Sonnet · medium, an unclear bug or an architecture question on Sonnet · high, long many-sided work and plan mode on Opus.
- **Nothing above your picker.** Set the picker to your strongest model once; autogear chooses at or below it.
- **A state row.** A row above the prompt shows whether autogear is on, in shadow mode or off, with buttons named for what they do.
- **Every answer says who gave it.** One italic line under it names the model and effort that answered, and the helpers' models when helpers ran (with autogear on, in shadow or off). The reasons and the money are one command away:

  ```
  Opus 5.5 · effort medium · helpers: Sonnet 5.5
  ```
- **A savings counter.** The status text at the bottom right carries the session's saving, and `/gear savings` draws a card with the details.

## Install

In Claude Code:

```
/plugin install autogear --marketplace emreyaman1/autogear
```

Then set the picker to your strongest model once (for example **Opus · high**). Open a new chat after installing; chats that were already open do not load new plugins.

To install from a local copy, in a terminal:

```bash
claude plugin marketplace add <path to your copy of the repository>
```

```bash
claude plugin install autogear@autogear
```

It then runs in every Claude Code session you open, the desktop app included. Needs Claude Code 2.1.295 or newer (tested on 2.1.295 and 2.1.299; the live smoke test passed on 2.1.299). Claude Code checks a hooks module against its own plugin API before running any of it and refuses the whole module if one event or call is unknown, and a plugin cannot declare a minimum version, so on an older build autogear does not load at all and cannot say why; 2.1.278 refuses every version since 0.7. The desktop app brings its own up-to-date Claude Code; a `claude` installed separately in a terminal may be older (`claude --version`, `claude update`).

## Using it

**The picker is the ceiling.** autogear never spends more than the model and effort the picker holds. Change the picker and it tells you the new ceiling. With the picker on **Opus · high** it is fully automatic.

**The state row.** A small row above the prompt shows what autogear is doing: a badge reads **ON** (green), **SHADOW** (violet), **OFF** (gray) or **STOPPED** (stood down, amber; see Safety nets); on a Turkish system the words are AÇIK, GÖLGE, KAPALI and DURDU. Its dot moves a little to say what autogear is doing: a soft pulse while it routes, a slow breath in shadow mode, still when off, a slow blink when stood down; with "reduce motion" set in your system it stays still. Beside it stands the last choice ("Sonnet · medium · T1 routine"; in shadow mode what autogear would have picked), or before one, what the state means. Beside it are buttons for the other states, each named for what a press does: **turn on**, **to shadow**, **turn off**; stood down, **try again**. When off, every request goes out exactly as the picker says. The status text at the bottom right shows the model and effort chosen for the last message and the session's saving. While a rate-limit window is nearly full or spent too fast, the row also shows a warning (see Pace below).

**Shadow mode.** `/gear shadow` lets autogear choose without applying the choice: every request goes out as the picker says, and autogear writes what it would have picked in its log and on the state row (`Haiku · low · T0 would choose`). The line under the answer says only which model answered. The picker is the ceiling here too; when it cut the choice, both are written to the log (`Sonnet · high (without the ceiling Opus · high)`), so a need for Opus shows even under a Sonnet picker. A new version can be tried this way on real work without touching that work, and `/gear wrong` still marks its choices. `/gear on` turns routing back on.

**Plan mode.** In Claude Code's plan mode every request goes to Opus, at an effort by the size of the plan as the rules read it: medium for a small one, high for a middling one, xhigh for a large one with many parts. It never goes above the picker, and a model you name (`+sonnet`) still wins. autogear sees plan mode from the note Claude Code adds for the model, so plan mode switched on in the middle of an answer counts from the next message. Outside plan mode, a request for a plan ("make a plan", "how should we approach this", "a roadmap for the release", "plan the migration") counts as hard work (T3). The line under the answer says `plan mode` and the log says so too.

**A clean conversation (0.10, first version).** Every step of a turn sends the whole conversation again, so a large one costs more on every message. When the conversation is past 150K tokens and a piece of work has just finished (a commit or push, or a passing test run), the row above the prompt offers a clean one: `Preparing the hand-over note…` while the note is written, then `Hand-over note ready · conversation 180K tokens` with **clean conversation**, **see note** and **×**. The offer stays while you write on, until you press one of them or a newer note replaces it. autogear has the model write a short hand-over note (project, last commit, what was done, what is open, your rules, what to read); **see note** shows it, **clean conversation** runs `/clear` and sends the note, unseen, with your next message. Nothing is cleared unless you press it, and the old conversation stays on disk: the note ends with the `claude --resume` line that opens it again. Tried in a real desktop conversation of 447K tokens: the offer, the note and the press work, and the clean conversation began without the old one, carrying only the note. Right after the press the desktop app still shows the old messages above and may show the old size in its context box; what goes to the model is the clean conversation.

**Overrides.** Tokens at the start of a message set the choice for that message only and are removed before the model sees them: `+haiku` `+sonnet` `+opus`, `+low` … `+max`, `+cheap` (T0), `+deep` (T4). Writing `ultrathink` means T4.

Or say it in words: "use opus", "switch to sonnet at max", "go with haiku", "max effort" pick the model, and the effort when one is named, for that message (the Turkish forms work too). Talking about a model ("haiku did that", "is opus expensive?") picks nothing. A choice made in words, like a token, may go above the picker.

**Commands.**

| Command | Does |
|---|---|
| `/gear` | status, last decision and reason, limits, statistics, this list |
| `/gear savings` | the savings card (see below) |
| `/gear log` | the log of autogear's latest decisions and the doubtful ones |
| `/gear wrong weak\|strong` | mark the latest decision: model too weak, or more than the work needed |
| `/gear reset` | reset the savings counter and the log |
| `/gear on` / `/gear off` | turn autogear on / off (off: the picker's model is used) |
| `/gear shadow` | shadow mode: choose and write it down, apply nothing |
| `/gear profile saver\|balanced\|quality` | which tier table to use |
| `/gear haiku on\|off` | may trivial work go to Haiku |
| `/gear ask on\|off` | may the rules ask Haiku when unsure |
| `/gear note on\|off` | the line under each answer |
| `/gear band on\|off` | the state row above the prompt |
| `/gear lang en\|tr\|auto` | the language autogear speaks; auto follows the system's |
| `/gear doctor` | checks the setup and says what to fix: state, picker, Claude Code version, whether choices are applied, the store, limits, language, and the environment settings that can pin effort or the helpers' model |

The commands are English whatever the language. The old Turkish names (`oto`, `sabitle`, `golge`, `tasarruf`, `kayit`, `yanlis zayif|fazla`, `sifirla`, `profil tasarruf|dengeli|kalite`, `sor`, `not`, `bant` with `aç`/`kapa`) go on working.

**Language.** autogear speaks English or Turkish. `auto` (the default) follows the system's language, Turkish on a Turkish system and English elsewhere; Claude Code's own `language` setting is not offered to a Mod, so it is not read. `/gear lang en` or `tr` sets it by hand. The commands, the tags and the model names stay as they are; the rules that read your messages understand eight languages whatever this is set to.

**The line under every answer.** Every answer, with autogear on, in shadow or off, ends with one italic line naming the model that answered, as the API reports it, and the effort it was asked at: *Opus 5.5 · effort medium*. When helpers (subagents) ran, their models follow: *Opus 5.5 · effort medium · helpers: Sonnet 5.5*. Plan mode and a limit warning are added beside it. `/gear note off` takes it away. What autogear read in the message, why it chose, and the money are in `/gear`, `/gear log` and `/gear savings`.

## How it works

```
message ─► classify ─► settle ─► decide ─► apply     ─► answer ─► verify        ─► count
           signals     settle    tiers     turn.step              turn.complete    savings
           llm                   policy                                            prices
                                 pacing
```

1. **Classify** (`hooks/core/signals.ts`): a message becomes tier T0 to T4. Cues in eight languages are read (Turkish, English, Spanish, German, French, Russian, Chinese, Japanese); code, paths and identifiers inside the message are ignored; verbs are read together with their object ("change the color" is not "add a payment system"). The notes Claude Code puts ahead of a message are skipped, a greeting is T0 at once, and a message with nothing written (only an image) carries on with the last choice. When the rules are unsure, one short question goes to Haiku (`hooks/core/llm.ts`).
2. **Settle** (`hooks/core/settle.ts`): Haiku reads the message alone, without the screenshot or the work around it, so its answer goes at most one tier below what the rules saw, and not under T2 for a request to look into something or to read written work closely and fix it ("go through the README again carefully, fix what is off"), nor under T1 for faults to fix in a text or for carrying on ("go ahead") after a trivial message. A message in the middle of work at T2 or above (a question, a remark, one only Haiku could place) goes at most one tier below that work; new work the rules are sure of, a chore such as a commit, or a greeting starts afresh.
3. **Decide** (`hooks/core/tiers.ts`, `policy.ts`, `pacing.ts`): the tier maps to a model and effort through a profile, then passes two limits and a look at the rate-limit windows:
   - **Ceiling:** never above the picker's model and effort.
   - **Cache:** a model switch makes the new model read the whole conversation once at its cache-write price (the old model's cache is not lost: on a subscription it lives an hour, renewed on each read). So with a large context (40K+ tokens) autogear never steps down to a cheaper model, since that one write costs more than the saving (Sonnet writes at $2.50 a million tokens where Opus reads its cache at $0.20; Haiku past 100K tokens pays five times its price): a commit in a long Opus conversation stays on Opus at low effort. A step up of one tier keeps the model as well; two tiers or more, or off Haiku, switches. In a small conversation every message goes to its own model.
   - **Pace:** a rate-limit window never lowers the model or the effort: finishing the work matters more than the window. When the 5-hour or weekly window is at 90% or more, or spent faster than an even pace (30%+ used and 20 points ahead), the line under the answer and the state row carry a warning instead (`⚠ 5-hour limit 92%: this work runs on Opus · high, the limit may run out`). If a window is nearly over with at most half used, hard and critical work (T3 and up) gets one step more effort, never as far as max and never above the picker. Standard work is left as it is: on clearly described work more effort did not help in the measurements behind the tier table.
4. **Apply** (`hooks/register.tsx`, `turn.step`): right before each model request. All requests of a turn use the same model, so the turn keeps its cache. Subagents are left alone.
5. **Verify** (`turn.complete`): the API names the model that really answered; it is compared with the choice (see Safety nets).
6. **Count** (`hooks/core/savings.ts`): the turn's real tokens are priced twice, once on the model that answered and once on the picker's model, and added to the session's and the lifetime totals.

| Tier | Example | `saver` (Pro) |
|---|---|---|
| T0 trivial | "what does this function do", commit message, rename | Haiku · low |
| T1 routine | clear one-place change | Sonnet · medium |
| T2 standard | feature, tests for it, debugging with the error in hand, a close review of written work | Sonnet · medium |
| T3 hard | architecture, performance, security, a choice between options | Sonnet · high |
| T3 vague hunt | a bug told without detail ("this doesn't work, fix it"), with no error, file, number or moment, and no screenshot | Sonnet · high (Opus · high in `balanced` and `quality`) |
| T3 located hunt | a bug told plainly whose cause hides (it comes and goes, it shows far from where it starts), tests written to catch bugs nobody has found yet | Sonnet · high (xhigh at T4) |
| T4 critical | long multi-step work, repeated failure | Opus · high |

Profiles: `saver` (for Pro; stored and still accepted as `tasarruf`), `balanced` (`dengeli`) and `quality` (`kalite`) spend more, for Max plans. In every profile clearly described routine and standard work runs on Sonnet · medium, a located hunt on Sonnet · high, and no tier runs at max unless you ask for it (`+max`, or "max effort" in words). The evidence: in a public measurement on real Python projects with hidden tests (Forn AI, 4 October 2026), Sonnet · medium fixed 13 of 13 bugs whose place was clear at a third of Opus · high's cost, and raising Sonnet's effort on clear work did not help; a bug whose error pointed at the wrong file went 6 of 6 on Opus · high and 4 of 6 on Sonnet · medium, the same bug told vaguely 0 of 2 on Sonnet, and tests that had to catch 22 hidden bugs 22 of 22 on Opus · high against 16 to 19 on Sonnet. Some of these rest on 2 to 6 runs, so the table is a starting point that autogear's own comparison is to check. In that comparison (Measurements) Sonnet · medium passed every hunt Opus · high passed, which is why a located hunt now goes to Sonnet at more effort. In `saver` hard work and a vague hunt now run on Sonnet · high as well: over twenty tasks, two sets, Opus solved none that Sonnet · medium failed, at 3.6 times the cost. `balanced` and `quality` keep Opus for hard work.

A bug report counts as clear when it holds the error, a file, code, a number, the moment it happens ("when I click...") or what should happen instead; a screenshot beside it counts too.

## Reviewing its decisions

The classifier numbers below were measured on labels we wrote. To see how autogear does on your own work, it keeps a log of its decisions on your machine: the start of each message (100 characters), the tier, the model and effort that answered, what autogear wanted when the picker cut it, the source of the choice, what the turn cost, and what happened next. The last 200 are kept.

- `/gear log` shows the latest 25 as a table, the tiers used, and the **doubtful decisions**: those the work itself called into question (you complained and autogear moved up a tier; the tests or build failed at the end of the turn) and those you marked.
- When a decision was wrong, say so right after the answer: `/gear wrong weak` (the model was too weak) or `/gear wrong strong` (stronger than the work needed). The mark lands on the latest message.
- The doubtful share is a floor: a wrong choice nobody noticed is not counted. With a few days of use it shows which kinds of message the rules get wrong, which is where to tune next.
- `/gear reset` clears the log. It never leaves your machine.

## Savings

**Where it shows.**

- The status text at the bottom right: the session's total saving.
- `/gear` and `/gear log`: what each decision cost and what it would have cost on the picker's model.
- `/gear savings`: a card drawn in the transcript with
  - two bars, the saving this session and in total, each with its share of the picker's bill;
  - the share of each model, as a bar and a legend;
  - a table per model: turns, input, output, cache read, cache write, cache hit rate, spend, spend on the picker's model, saving;
  - the 5-hour and weekly rate-limit windows.

  On a narrow screen the table becomes one line per model. Where a surface cannot draw the card, the same figures come as a markdown table. Both read the same stored totals.
- `/gear reset` starts the count again. The totals live in the plugin's store on your machine, and the date counting began is on the card.

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
- A turn that switched model rewrote its cache. On the picker's model that cache would have been warm, so those writes are priced as reads there: the cost of switching counts against autogear.
- Lower effort emits fewer tokens. That is not credited, so the saving can read a little low.
- autogear's own Haiku questions are subtracted. Subagents are not counted.

## Safety nets

- **Self-check:** after every turn it compares the model the API says answered with the one it chose. If 3 turns in a row differ (a Claude Code update changed the plugin API), it switches itself off and tells you; `/gear on` tries again.
- **Fallback model:** if a chosen model gives no answer (retired id, not on your plan), the request is re-sent on the picker's model and the failed one is avoided for the session.
- **Snowball brake:** if a turn done on a cheap model ends with failing tests or build, the next turn goes one tier up. Complaints ("still broken") also raise the tier, two tiers on the second in a row.
- **Version notice:** one notice when Claude Code is newer than the version autogear was tested on (`hooks/core/version.ts`).
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

The table is from 0.5 and 0.6, as its rows say. The rules have changed since; the same 77 messages now give 88% exact, 99% within one tier and no severe case by the rules alone, but both sets have been read while tuning, so that figure flatters.

How the 143 labeled messages are routed, by the rules alone, with the picker on Opus · high (0.12, `saver`; `claude plugin test .` prints it as `EVAL route`): T0 Haiku · low 24, T1 Sonnet · medium 33, T2 Sonnet · medium 33, T3 Sonnet · high 29, T3 located hunt Sonnet · high 10, T4 Opus · high 14. Until 0.7 the 33 standard ones ran on Sonnet · high and the 10 hunts on Opus · medium; the tiers themselves did not change.

\* Putting hard work (T3+) at T0/T1, or two tiers or more too low. The held-out errors were seen once, and the fresh-set errors informed the "ask when unsure" threshold, so true accuracy may be somewhat lower. The bound of 0.6 costs one message here (a Turkish "why is this import used?" is now T1, not T0) and is what keeps the real-use errors below from happening.

**Other languages** (`tests/multilingual.test.ts`, `node eval/haiku.mjs --held`): messages written in eight languages and labeled by the work they need; code and error output left as written. autogear as it runs (0.11.0): rules that read Spanish, German, French, Russian, Chinese and Japanese beside Turkish and English, and Haiku where the rules are unsure or the message is in neither Turkish nor English, held to the rules' floor. The numbers below are for a set written by another model that was shown neither the rules nor their word lists: 24 messages per language, each language its own messages, read once before any tuning. 17 October 2026, 139 Haiku calls, $0.08 at list price. The labels are that model's; no person has checked them.

| Language | Rules: within 1 tier | Rules: severe* | autogear: exact | autogear: within 1 tier | autogear: severe* | Asked Haiku |
|---|---|---|---|---|---|---|
| Turkish | 83% | 2 | 67% | 92% | 0 | 33% |
| English | 92% | 0 | 75% | 92% | 0 | 8% |
| Spanish | 88% | 2 | 79% | 96% | 0 | 88% |
| German | 83% | 2 | 79% | 100% | 0 | 83% |
| French | 92% | 1 | 79% | 96% | 0 | 83% |
| Russian | 83% | 2 | 71% | 96% | 0 | 88% |
| Chinese | 92% | 2 | 54% | 100% | 0 | 96% |
| Japanese | 92% | 1 | 71% | 100% | 0 | 92% |

What it shows, the unflattering part first:

- **The rules alone are not reliable outside Turkish and English:** 83–92% within one tier and one or two severe cases in 24 on the first read, so autogear in these languages is mostly Haiku (83–96% of messages are asked, each a Haiku call of about $0.0005 and the wait for it). Before this work (0.9.1) the translated set of the 143 labeled messages gave 2–7 severe cases in German, French, Chinese and Japanese.
- **With Haiku the goal (within one tier at least 90%, severe cases at most 2%) is met on this set in every language,** no severe case at all. 24 messages is few: one miss is four points.
- **Exact tiers are lower, 54–79%:** Haiku pulls a message a tier down more often than the rules do (Chinese most: 54%). The rules alone are exact more often than autogear here, but they miss badly on phrasings they have not met, so Haiku stays.
- An earlier set written the same way (read once, then tuned on) gave the same picture on its first read: within one tier 92–100%, one severe case (Spanish). Both sets were tuned on after they were read, so the rules' scores on them now are higher and mean nothing.
- Long English task texts (SWE-bench Verified, Terminal-Bench; `node eval/external.mjs`): the rules put a long, counted or stepwise brief at T3 and ask Haiku. Severe cases on Terminal-Bench fell from 7% to 4%; within one tier went from 83% to 78% (SWE-bench) and 76% to 75% (Terminal-Bench), more tasks put a tier too high.
- The translations of the 143 messages are Claude's; no native speaker has checked them.

**Real use**: the 49 decisions autogear made in 11 sessions between 11 and 16 October 2026, each labeled afterwards from what the work turned out to be (one reviewer's judgment, not a panel's). What autogear chose then, and the same messages played again through 0.6:

| | Exact | Within 1 tier | Severe* | Too low | Too high |
|---|---|---|---|---|---|
| autogear 0.3 to 0.5, as it ran | 51% | 82% | 7 | 17 | 7 |
| autogear 0.6, played again | 61% | 100% | 0 | 10 | 9 |

What went wrong in the first row: the note Claude Code puts ahead of a message in a new session was read as the message, so a bare "hello" went to Opus · high; Haiku called bug reports that came with a screenshot trivial ("that button didn't show up again", "could you look into it"); a remark in the middle of a long task dropped the task to Haiku; a model asked for in words ("give it to Sonnet at max") was ignored. The messages were in Turkish; these are translations. The fixes of 0.6 were made from these same messages, so the second row shows that they hold, not how 0.6 does on messages it has not seen, and two of the replayed messages would go to Haiku with no logged answer. The decision log is what will tell. The messages are someone's real work, so the set and the test that replays it are kept on the developer's machine, not in this repository.

**External benchmarks** (`eval/external.mjs`): difficulty set by other people, on public sets of coding-agent work. SWE-bench Verified: 500 GitHub issues, each with the time annotators judged an engineer would need to fix it. [Terminal-Bench](https://github.com/harbor-framework/terminal-bench-1): 241 tasks done in a terminal, each with its author's estimate of an expert's time. Time maps to tier (under 15 minutes T1, under an hour T2, under four hours T3, more T4); neither set holds trivial work. Each set is split in two by a hash of the task id: the rules may be tuned while looking at one half, the other is only measured. The texts are fetched into `eval/.work` and never kept in this repository, as the benchmarks ask.

| Held-out half of both (350), 0.7 | Exact | Within 1 tier | Severe* | Too high | Rank agreement |
|---|---|---|---|---|---|
| Rules alone | 36% | 79% | 9 (3%) | 183 | 0.10 |
| **autogear: rules, Haiku when unsure** | **31%** | **78%** | **6 (2%)** | **207** | **0.16** |

By set, autogear as it runs: SWE-bench Verified 36% exact, 83% within one tier, 1 severe case in 500; Terminal-Bench 30%, 73%, 8 severe cases in 241 (3%). Before the two rule fixes of 0.7 (a chore word such as "commit" inside a long description no longer makes it trivial; a long description of work is no small change) the rules had 21 severe cases (6%) on the held-out half. Asking Haiku where the rules are unsure lowers the severe cases further and raises the rank agreement, at the price of more work sent a tier or two too high, since Haiku answers the higher tier when torn. The measurement asked Haiku 177 times, $0.38 at list price. These numbers are from 0.7: 0.8 moved three kinds of request up to T3 (a bug told without detail, tests written to catch hidden bugs, a request for a plan) and has not been measured on these sets again.

What it shows: autogear rarely sends hard work to a weak model, but on long English issues and task statements it hardly tells a fifteen-minute fix from a four-hour one (rank agreement 0.16), and it spends on the safe side. These texts are unlike the short prompts people type, which is what the rules were built for; and the time-to-tier mapping is ours, so some of "too high" is a tier the work may well have deserved (a quick fix in an unfamiliar codebase is still a hunt).

**Output quality** (`eval/tasks/`): ten real tasks on a small project, each checked by tests Claude never saw, run under six setups (`node eval/tasks.mjs <arm>`). Costs at API list prices, one run each, on Claude Code 2.1.299, 17 October 2026; ✗ marks a failed task.

| Task | Kind | autogear 0.8.1 | Opus · high | Opus · medium | Sonnet · medium | opusplan | Sonnet + Opus advisor |
|---|---|---|---|---|---|---|---|
| 1 | rename | $0.01 Haiku | $0.21 | $0.21 | $0.06 | $0.09 | $0.10 |
| 2 | small change | $0.06 Sonnet | $0.21 | $0.14 | $0.06 | $0.06 | $0.07 |
| 3 | feature with tests | $0.10 Sonnet | $0.29 | $0.25 | $0.09 | $0.10 | $0.10 |
| 4 | bug, place given | $0.06 Sonnet | $0.24 | $0.18 | $0.06 | $0.06 | $0.07 |
| 5 | bug whose cause hides | $0.36 Opus | $0.34 | $0.23 | $0.10 | $0.08 | $0.11 |
| 6 | bug, place given | $0.07 Sonnet | $0.26 | $0.21 | $0.07 | $0.07 | $0.09 |
| 7 | misleading bug: the error points at the wrong file | $0.08 Sonnet | $0.33 | $0.24 | $0.07 | $0.08 | ✗ $0.09 |
| 8 | the same bug told vaguely: "this doesn't work, fix it" | $0.33 Opus | $0.35 | $0.24 | $0.08 | $0.09 | $0.11 |
| 9 | tests that must catch six inserted bugs | $0.81 Opus | $0.58 | $0.45 | $0.12 | $0.13 | $0.13 |
| 10 | small refactor | $0.08 Sonnet | $0.28 | $0.19 | $0.09 | $0.09 | $0.04 |
| **Total** | | **10/10, $1.96** | **10/10, $3.09** | **10/10, $2.33** | **10/10, $0.81** | **10/10, $0.85** | **9/10, $0.92** |

What it shows, the unflattering part first:

- **On these tasks Sonnet · medium alone did as well as anything, for the least.** Every setup but one passed all ten, so this set does not tell the models apart: it is too easy. Sonnet · medium spent $0.81, autogear $1.96, Opus · high $3.09.
- **autogear costs more than Sonnet alone here** because it sent the three hunts (5, 8, 9) to Opus · high: $1.50 of its $1.96, on work Sonnet also passed. That is why 0.8.2 sends a located hunt (5, 9) to Sonnet · high and 0.9 sends a vague one (8) there too in `saver`; this set has not been run again since.
- autogear is 37% cheaper than Opus · high and 16% cheaper than Opus · medium, at the same result, and 40% faster than Opus · high.
- **Model or effort:** Opus · medium did what Opus · high did for 25% less; Sonnet · medium did it for a third of Opus · medium.
- opusplan ran Sonnet throughout: these tasks were not done in plan mode.
- The one failure was Sonnet with Opus as its advisor, on the misleading bug: it fixed the file the error pointed at, not the cause. autogear sent that task to Sonnet too, since an error message in hand reads as a clear bug, and passed. One run, so this is luck as much as anything; the measurement does not show whether the advisor was consulted.
- One run per cell on a small project: direction, not certainty. In an earlier run (0.7, six tasks) autogear matched Opus · high on four tasks for $0.31 against $2.38.

**A real project** (`--set sqlglot`): ten bugs fixed in [sqlglot](https://github.com/tobymao/sqlglot) after July 2026, a 100K-line SQL parser, each set up as the code stood before the fix and checked by the tests the fix added. One run each, Claude Code 2.1.299, 17 October 2026. autogear 0.8.1 is the version that sent every hunt to Opus · high; 0.8.2 sends a located one to Sonnet · high.

| Task | Kind | autogear 0.8.2 | autogear 0.8.1 | Sonnet · medium | Opus · high |
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

- **Sonnet · medium alone solved 9 of 10 for $2.49; Opus · high solved the same 9 for $8.98; autogear 8 for about $5.** Over both sets, twenty tasks, Opus never solved one that Sonnet · medium failed: the one Sonnet failed (`sq-tsql-output`, a vague report whose quick fix breaks T-SQL's OUTPUT clause) every setup failed.
- autogear's two failures are tasks Sonnet · medium passed on its own, one on Sonnet and one on Opus: on one run that reads as noise, not as a model too weak.
- **The hunt split held:** the two located hunts went to Sonnet under 0.8.2 and passed for $0.49, against $1.39 on Opus under 0.8.1.
- autogear sends work to Opus that Sonnet does as well here: the two vague reports, the misleading one and two others cost $3.52 on Opus against $1.17 for Sonnet · medium on the same tasks.
- One run per cell. Three runs would cost about $65 more at list price.
- Since 0.9, `saver` sends hard work and vague reports to Sonnet · high as well, so most of the tasks that went to Opus here would now run on Sonnet; this set has not been run again since.

## Project layout

| Path | What it holds |
|---|---|
| `hooks/register.tsx` | the hooks module: events, the `/gear` command, the state row, the card hook |
| `hooks/card.tsx` | the savings card, a tree of Box and Text |
| `hooks/core/signals.ts` | the classifier: rules, overrides, the Turkish and English cues |
| `hooks/core/languages.ts` | the cues of Spanish, German, French, Russian, Chinese and Japanese |
| `hooks/core/llm.ts` | the question put to Haiku when the rules are unsure |
| `hooks/core/tiers.ts` | profiles: tier to model and effort |
| `hooks/core/policy.ts` | ceiling and cache applied to a tier, and the windows it warns about |
| `hooks/core/pacing.ts` | reads the rate-limit windows and words the warning |
| `hooks/core/models.ts` | model families, ids, effort levels |
| `hooks/core/prices.ts` | list prices and the cost of a turn |
| `hooks/core/journal.ts` | the decision log: entries, complaint and failing-check flags, your marks, the report |
| `hooks/core/settle.ts` | how the rules, Haiku's answer and the work in hand settle a tier |
| `hooks/core/savings.ts` | per-model totals, the saving, the markdown report |
| `hooks/core/handover.ts` | the hand-over note: when it is offered, what the model is asked, what the new conversation gets |
| `hooks/core/settings.ts` | stored settings and statistics, `/gear` parsing |
| `hooks/core/text.ts` | the words autogear says, in English and Turkish, and the language choice |
| `hooks/core/doctor.ts` | `/gear doctor`: the checks and their advice |
| `hooks/core/switch.ts` | the drawing of the state badge |
| `hooks/core/version.ts` | the newest Claude Code version it was tested on |
| `docs/` | `sonraki-adimlar.md` (open steps and decisions, in Turkish) and `demo/` (the animation above and how it is made) |
| `tests/` | rules, policy, prices and savings; the router against a mock engine; the classifier measurement |
| `eval/` | classifier measurement, the external benchmarks (`external.mjs`) and the output-quality tasks |
| `scripts/` | the live smoke test; `harvest.mjs`, which gathers autogear's decisions from your transcripts |

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

`node eval/tasks.mjs <arm>` takes `--runs N` and `--set sqlglot`: ten real bugs of [sqlglot](https://github.com/tobymao/sqlglot) (MIT, about 100K lines), each set up as the code stood just before its fix, without git history, and checked by the tests that fix added. It needs sqlglot cloned into `eval/.work/repos/sqlglot` and Python 3.9+. `--dry` checks every such task for free: it must fail as given and pass with the real fix. The arm `gearbox-0.8.1` is autogear (then called gearbox, which is why the eval arms keep that name) before the hunt split, to compare the two rules.

The last two call real models and spend usage; Haiku answers are cached under `eval/.work`. `plugin test` needs Claude Code 2.1.295 or newer (2.1.295 and 2.1.299 were used): on older builds the hooks module does not load and every test that touches it fails. The `claude` on your PATH can be older than the desktop app's own build; on Windows that one lives under `%APPDATA%\Claude\claude-code\` or, in newer apps, `%LOCALAPPDATA%\Claude-Data\<profile>\claude-code\`. The measurement scripts pick the newest of them themselves (`CLAUDE_BIN` overrides) and stop before spending anything on a build older than 2.1.295.

**Developing without making yourself the test.** A new version goes through four steps, each before the next, and only the last touches real work:

1. Offline: `claude plugin test .` (rules, policy, router, the eval sets) and `node eval/external.mjs` (the external benchmarks, free; `--haiku` adds Haiku's answers for a little usage).
2. In shadow mode (`/gear shadow`) on real work: autogear chooses and writes down, the picker's model answers.
3. `node scripts/harvest.mjs` gathers those choices from the transcripts into `eval/.work/harvest.json`; labeled, they become a real-use set to replay the next version over.
4. Only then `/gear on`.

**Trying a change in your own Claude Code.** Claude Code runs an installed copy of the plugin, not the folder. After editing, raise `version` in `.claude-plugin/plugin.json`, then:

```bash
claude plugin marketplace update autogear
```

```bash
claude plugin update autogear@autogear
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
- [x] Decision log with your marks, to see where the rules go wrong
- [x] Review of real use: system notes, the bound on Haiku, the hold on work in hand, models named in words (0.6)
- [x] Shadow mode, external benchmarks and a harvest of real decisions, so a new version is judged before it routes anyone's work (0.7)
- [x] Rate-limit windows warn instead of lowering the choice; the effort table retuned from measurements (Sonnet · medium for clear work, hunts at high, no max unasked); a state row that shows on, shadow and off apart; the shadow log keeps what the picker cut; plan mode goes to Opus (0.8)
- [x] Measured against five setups on twenty tasks, ten of them real sqlglot bugs; in `saver` hard work moves to Sonnet · high, Opus kept for critical work, plan mode and when asked (0.9)
- [x] A large conversation offers a clean one with a hand-over note (0.10); the rules read eight languages (0.11)
- [x] English commands, English or Turkish speech, one italic line under every answer naming the model that answered, and `/gear doctor` (0.12)
- [ ] Subagent rules: their requests reach the hook (they carry an `agentId`) and are passed through untouched today. Measured on the author's own transcripts (30 July to 18 October 2026, 27 helper runs): helpers were 1.4% of the spend at list prices, so routing them waits until helpers carry more of the work
- [ ] Learning from the log's corrections

## What it hooks and runs

autogear is one hooks module (`hooks/register.tsx`). The events it hooks, and what each does:

- **`prompt.submit`**: reads each message you send, to classify it. It takes a leading override (`+opus`) off before the model sees the message, and after you press **clean conversation** it adds the hand-over note to your first message, once. Nothing else in a message is changed.
- **`turn.step`**: right before each model request of the main conversation, sets the model and effort autogear chose. Requests of helpers (subagents) pass unchanged; only their model is noted for the line under the answer.
- **`turn.complete`**: reads which model answered and the tokens it used, for the self-check and the savings, and adds the italic line under the answer.
- **`tool.call`** (Bash and PowerShell only): after a command has run, reads whether a test, build, commit or push in the main conversation passed or failed, for the snowball brake and the clean-conversation offer. It never changes or blocks a command.
- **`session.append`** (attachments only): reads the notes Claude Code adds in plan mode, to know plan mode is on.
- **`session.start`**, **`session.end`**: loads the settings; notes that a `/clear` happened.
- **`ui.render`**: draws the state row above the prompt, the hand-over note pane and the `/gear savings` card.
- **`command.run`** (`gear`): answers `/gear`.

What it calls on its own:

- **One slash command, `/clear`**, and only when you press **clean conversation** on the state row. autogear runs no other command.
- **A model**, through Claude Code: Haiku when the rules are unsure, and the session's model for the hand-over note (see Privacy).
- **Its store** (settings, log, totals), the status text, short notices, and two environment variables for `/gear doctor` (see Privacy).

## Privacy

autogear has no server and makes no network request of its own. Everything it keeps stays in the plugin's store on your machine, the place Claude Code gives every plugin:

- your settings (mode, profile, language, the switches);
- the decision log: for each of the last 200 messages its first 100 characters, the tier, the model and effort, the reasons, the cost; `/gear reset` clears it;
- the savings totals, and the hand-over note you pressed "clean conversation" for (it is replaced by the next one).

`/gear doctor` reads exactly two environment variables, the one Claude Code has for a fixed effort and the one for a fixed helper model, to tell you whether either is set; their names are in `hooks/register.tsx` and in the list that `claude plugin validate` prints. No other variable or setting is read, and nothing it reads is sent anywhere.

What goes to a model, always through Claude Code itself and your own account, never to a third party:

- **Haiku, when the rules cannot tell.** The first 4,000 characters of the message (and the tier of the one before it) are sent with a short instruction to ask which tier the work is. It is one small request, about $0.0002; `/gear ask off` stops it, and then unsure messages are read by the rules alone.
- **The hand-over note.** When a large conversation has just finished a piece of work, autogear asks the model for an eight-line summary of that conversation, from the same cache. It is shown to you and sent anywhere only if you press "clean conversation", and then to the new conversation alone. `/gear band off` stops the offer.

The measurement scripts in `eval/` and `scripts/` run only when you run them; they call real models and say what they will spend first. `node eval/external.mjs` downloads the public benchmark texts it measures on, from the datasets' public pages (SWE-bench Verified on Hugging Face, Terminal-Bench on GitHub), into `eval/.work`; it sends nothing but the requests for them.

## License

MIT
