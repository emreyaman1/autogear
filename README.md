# gearbox

[English](README.md) · [Türkçe](README.tr.md)

Automatic gear shifting for Claude Code: for every message it picks the model (Haiku, Sonnet, Opus) and the effort that the work needs, and never goes above what the model picker (bottom right) holds. The goal: your usage limits last longer, and hard work still goes to the strong model.

> Status: 0.3.2. Built on Claude Code's **early access** plugin API (function hooks), which can change between releases. The safety nets below exist for that reason.

## Install

In Claude Code:

```
/plugin install gearbox --marketplace emreyaman1/gearbox
```

Then set the picker to your strongest model once (for example **Opus · high**). gearbox chooses at or below the picker, never above. Open a new chat after installing; chats that were already open do not load new plugins.

## How it works

1. **Classify** (`hooks/core/signals.ts`): a message becomes tier T0 to T4. Turkish and English cues are read; code, paths and identifiers inside the message are ignored; verbs are read together with their object ("change the color" is not "add a payment system"). When the rules are unsure, one short question goes to Haiku.
2. **Decide** (`hooks/core/policy.ts`): the tier maps to a model and effort through a profile, then passes three limits:
   - **Ceiling:** never above the picker's model and effort.
   - **Cache:** with a large context (40K+ tokens) a one-tier difference changes only the effort, because switching models re-sends the whole conversation uncached.
   - **Pace:** if the 5-hour or weekly window is being spent faster than an even pace, effort drops one step; above 90% Opus is not used.
3. **Apply** (`hooks/register.tsx`): right before each model request. All requests of a turn use the same model. Subagents are left alone.

| Tier | Example | `tasarruf` (Pro) |
|---|---|---|
| T0 trivial | "what does this function do", commit message, rename | Haiku · low |
| T1 routine | clear one-place change | Sonnet · medium |
| T2 standard | feature, writing tests, debugging with an error | Sonnet · high |
| T3 hard | unclear bug, architecture, performance, security | Opus · medium |
| T4 critical | long multi-step work, repeated failure | Opus · high |

Profiles: `tasarruf` (saver, for Pro), `dengeli` (balanced), `kalite` (quality) for Max plans.

## Picker = ceiling, plus an on/off switch

A small row above the prompt shows whether gearbox is on and has an **ON / OFF switch** (green with the knob on the right when on, gray with the knob on the left when off) that you click to turn it off or on. When gearbox is off, every request uses exactly the model and effort the picker shows. The status text at the bottom right shows the model and effort gearbox chose for the last message; every answer also ends with a line saying which model answered and why.

## Control

| Command | Does |
|---|---|
| `/gear` | status, last decision and reason, limits, statistics |
| `/gear oto` / `/gear sabitle` | turn gearbox on / off (off: the picker's model is used) |
| `/gear profil tasarruf\|dengeli\|kalite` | tier table |
| `/gear haiku aç\|kapa` | may trivial work go to Haiku |
| `/gear sor aç\|kapa` | may the rules ask Haiku when unsure |
| `/gear not aç\|kapa` | the line under each answer |
| `/gear bant aç\|kapa` | the on/off row above the prompt |

(`aç` = on, `kapa` = off, `oto` = auto, `sabitle` = pin.)

Tokens at the start of a message set the choice for that message only and are removed before the model sees them: `+haiku` `+sonnet` `+opus`, `+low` … `+max`, `+ucuz` (T0), `+derin` (T4). Writing `ultrathink` means T4.

## Safety nets

- **Self-check:** after every turn it compares the model the API says answered with the one it chose. If 3 turns in a row differ (a Claude Code update changed the plugin API), it switches itself off and tells you.
- **Fallback model:** if a chosen model gives no answer (retired id, not on your plan), the request is re-sent on the picker's model and the failed one is avoided for the session.
- **Snowball brake:** if a turn done on a cheap model ends with failing tests or build, the next turn goes one tier up. Complaints ("still broken") also raise the tier.
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

**Output quality** (`eval/tasks/`): six real tasks on a small project, each checked by tests Claude never saw. With gearbox all 6 pass. Four of them also ran on Opus · high without gearbox: the same 4/4 pass, at $0.31 instead of $2.38 (list prices) and about 8x faster. One run per task on a small project, so this shows direction, not certainty.

## Development

```
claude plugin validate .
claude plugin test .
node eval/haiku.mjs
node eval/tasks.mjs
```

The last two call real models and spend usage. Requires a Claude Code build that has `plugin test` (2.1.295 was used).

After a Claude Code update: run `claude plugin test .` and `node scripts/smoke.mjs`; if both pass, raise `TESTED_THROUGH` in `hooks/core/version.ts`. When new models ship, update `MODEL_IDS` in `hooks/core/models.ts`.

## License

MIT
