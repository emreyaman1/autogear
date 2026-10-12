# gearbox

[English](README.md) · [Türkçe](README.tr.md)

Automatic gear shifting for Claude Code. For every message gearbox picks the model (Haiku, Sonnet or Opus) and the effort the work needs, never above what the model picker (bottom right) holds, and keeps count of what that saved. Your usage limits last longer, and hard work still goes to the strong model.

> Status: 0.5.0. Built on Claude Code's **early access** plugin API (function hooks), which can change between releases. The safety nets below exist for that reason.

## What you get

- **The right model per message.** "What does this function do" runs on Haiku · low, a clear one-place change on Sonnet · medium, an unclear bug or an architecture question on Opus.
- **Nothing above your picker.** Set the picker to your strongest model once; gearbox chooses at or below it.
- **A switch.** A row above the prompt shows whether gearbox is on, with an ON / OFF switch you click.
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

It then runs in every Claude Code session you open, the desktop app included. Needs a Claude Code build with plugin function hooks (tested through 2.1.295).

## Using it

**The picker is the ceiling.** gearbox never spends more than the model and effort the picker holds. Change the picker and it tells you the new ceiling. With the picker on **Opus · high** it is fully automatic.

**The on/off row.** A small row above the prompt shows whether gearbox is on. Its **ON / OFF switch** (green with the knob on the right when on, gray with the knob on the left when off) turns gearbox off and on. When off, every request goes out exactly as the picker says. The status text at the bottom right shows the model and effort chosen for the last message and the session's saving.

**Overrides.** Tokens at the start of a message set the choice for that message only and are removed before the model sees them: `+haiku` `+sonnet` `+opus`, `+low` … `+max`, `+ucuz` (T0), `+derin` (T4). Writing `ultrathink` means T4.

**Commands.**

| Command | Does |
|---|---|
| `/gear` | status, last decision and reason, limits, statistics, this list |
| `/gear tasarruf` | the savings card (see below) |
| `/gear kayit` | the log of gearbox's latest decisions and the doubtful ones |
| `/gear yanlis zayif\|fazla` | mark the latest decision: model too weak, or more than the work needed |
| `/gear sifirla` | reset the savings counter and the log |
| `/gear oto` / `/gear sabitle` | turn gearbox on / off (off: the picker's model is used) |
| `/gear profil tasarruf\|dengeli\|kalite` | which tier table to use |
| `/gear haiku aç\|kapa` | may trivial work go to Haiku |
| `/gear sor aç\|kapa` | may the rules ask Haiku when unsure |
| `/gear not aç\|kapa` | the line under each answer |
| `/gear bant aç\|kapa` | the on/off row above the prompt |

(`aç` = on, `kapa` = off, `oto` = auto, `sabitle` = pin, `sifirla` = reset.)

## How it works

```
message ─► classify ─► decide ─► apply     ─► answer ─► verify        ─► count
           signals     tiers     turn.step              turn.complete    savings
           llm         policy                                            prices
                       pacing
```

1. **Classify** (`hooks/core/signals.ts`): a message becomes tier T0 to T4. Turkish and English cues are read; code, paths and identifiers inside the message are ignored; verbs are read together with their object ("change the color" is not "add a payment system"). When the rules are unsure, one short question goes to Haiku (`hooks/core/llm.ts`).
2. **Decide** (`hooks/core/tiers.ts`, `policy.ts`, `pacing.ts`): the tier maps to a model and effort through a profile, then passes three limits:
   - **Ceiling:** never above the picker's model and effort.
   - **Cache:** with a large context (40K+ tokens) a one-tier difference changes only the effort, because switching models re-sends the whole conversation uncached.
   - **Pace:** if the 5-hour or weekly window is spent faster than an even pace (30%+ used and 20 points ahead), effort drops one step; at 90% Opus is not used. If a window is nearly over with at most half used, effort goes up one step for standard work and above.
3. **Apply** (`hooks/register.tsx`, `turn.step`): right before each model request. All requests of a turn use the same model, so the turn keeps its cache. Subagents are left alone.
4. **Verify** (`turn.complete`): the API names the model that really answered; it is compared with the choice (see Safety nets).
5. **Count** (`hooks/core/savings.ts`): the turn's real tokens are priced twice, once on the model that answered and once on the picker's model, and added to the session's and the lifetime totals.

| Tier | Example | `tasarruf` (Pro) |
|---|---|---|
| T0 trivial | "what does this function do", commit message, rename | Haiku · low |
| T1 routine | clear one-place change | Sonnet · medium |
| T2 standard | feature, writing tests, debugging with an error | Sonnet · high |
| T3 hard | unclear bug, architecture, performance, security | Opus · medium |
| T4 critical | long multi-step work, repeated failure | Opus · high |

Profiles: `tasarruf` (saver, for Pro), `dengeli` (balanced) and `kalite` (quality) spend more, for Max plans.

## Reviewing its decisions

The classifier numbers below were measured on labels we wrote. To see how gearbox does on your own work, it keeps a log of its decisions on your machine: the start of each message (100 characters), the tier, the model and effort that answered, the source of the choice, what the turn cost, and what happened next. The last 200 are kept.

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
| **Rules, Haiku when unsure (gearbox)** | **90%** | **100%** | **0** | **19%** |
| Always Haiku, take the higher | 74% | 96% | 0 | 100% |

\* Putting hard work (T3+) at T0/T1, or two tiers or more too low. The held-out errors were seen once, and the fresh-set errors informed the "ask when unsure" threshold, so true accuracy may be somewhat lower.

**Output quality** (`eval/tasks/`): six real tasks on a small project, each checked by tests Claude never saw.

| Task | gearbox chose | Result | Cost | Opus · high, no gearbox |
|---|---|---|---|---|
| 1 Rename | Haiku | Pass | $0.011 | Pass, $0.277 |
| 2 Shipping threshold | Sonnet | Pass | $0.173 | n/a |
| 3 Coupon feature and tests | Sonnet | Pass | $0.124 | Pass, $1.387 |
| 4 Pagination bug, error given | Sonnet | Pass | $0.072 | Pass, $0.255 |
| 5 Subtle cent-rounding bug | Opus | Pass | $0.423 | n/a |
| 6 Discount also applied to shipping | Sonnet | Pass | $0.099 | Pass, $0.460 |

On the 4 tasks run both ways gearbox spent $0.31 against $2.38 on Opus · high throughout: the same result, about 8x cheaper and 8x faster (73 s against 619 s). Costs are at API list prices. One run per task on a small project, so this shows direction, not certainty.

## Project layout

| Path | What it holds |
|---|---|
| `hooks/register.tsx` | the hooks module: events, the `/gear` command, the on/off row, the card hook |
| `hooks/card.tsx` | the savings card, a tree of Box and Text |
| `hooks/core/signals.ts` | the classifier: rules, overrides, Turkish and English cues |
| `hooks/core/llm.ts` | the question put to Haiku when the rules are unsure |
| `hooks/core/tiers.ts` | profiles: tier to model and effort |
| `hooks/core/policy.ts` | ceiling, cache and pace applied to a tier |
| `hooks/core/pacing.ts` | reads the rate-limit windows |
| `hooks/core/models.ts` | model families, ids, effort levels |
| `hooks/core/prices.ts` | list prices and the cost of a turn |
| `hooks/core/journal.ts` | the decision log: entries, complaint and failing-check flags, your marks, the report |
| `hooks/core/savings.ts` | per-model totals, the saving, the markdown report |
| `hooks/core/settings.ts` | stored settings and statistics, `/gear` parsing |
| `hooks/core/switch.ts` | the drawing of the on/off switch |
| `hooks/core/version.ts` | the newest Claude Code version it was tested on |
| `tests/` | rules, policy, prices and savings; the router against a mock engine; the classifier eval |
| `eval/` | classifier measurement and the output-quality tasks |
| `scripts/` | the live smoke test |

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

The last two call real models and spend usage; Haiku answers are cached under `eval/.work`. `plugin test` needs a Claude Code build whose plugin API matches (2.1.295 was used): on older builds the hooks module does not load and the router tests fail.

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
- [ ] Subagent rules: their requests reach the hook (they carry an `agentId`) and are passed through untouched today; routing exploration agents to Haiku · low is next, once their share of the quota is measured
- [x] Decision log with your marks, to see where the rules go wrong
- [ ] Learning from those corrections

## License

MIT
