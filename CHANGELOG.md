# Changelog

Each release, newest first. The evidence behind each change is in `docs/sonraki-adimlar.md` (Turkish) and in the README's Measurements.

## Unreleased (branch gelistirme)

- A close read of written work to fix it ("gözden geçir", "review", "proofread", or "read it again carefully and fix what is wrong", in all eight languages) is no less than T2: Haiku had called such a prompt trivial.
- Work asked for before an "explain" ("bump the version, update the install, tell me how to try it") is no longer a sure question; "yes, push" is the push, not the work before it; "under review" is no request to look into something.
- Tests, builds, commits and pushes run in PowerShell count as they do in Bash, for the snowball brake and the clean-conversation offer.

## 0.12.2 (18 October 2026)

- Ready for the directory's checks: the README says which events autogear hooks, what each does, and that the one command it runs itself is `/clear`, on your press; a listing icon, a gear with a gauge needle; the badge and mark names are plain functions, not getters; the the tests set the language through the stored settings, not a global; an eval fixture names the variable it sets.

## 0.12.1 (18 October 2026)

- After a `/clear` the state row showed autogear as on whatever its state; it now shows the state autogear is in.
- `/gear doctor` now sees `CLAUDE_CODE_EFFORT_LEVEL` and `CLAUDE_CODE_SUBAGENT_MODEL`; before, that check never ran.
- The Turkish texts name the English commands (`/gear wrong`, `/gear reset`); an effort asked for in words shows in English in `/gear`.
- README: the Turkish examples in the English README are in English, the measurements say which version they were taken on, the clean-conversation press is tried, and the privacy section names the two environment variables `/gear doctor` reads and what `eval/external.mjs` downloads.

## 0.12.0 (18 October 2026)

- The commands are English: `/gear on`, `off`, `shadow`, `savings`, `log`, `wrong`, `reset`, `profile saver|balanced|quality`, `haiku`, `ask`, `note`, `band`, `lang`, `doctor`. The old Turkish names keep working.
- autogear speaks English or Turkish; `auto` follows the system's language, `/gear lang` sets it.
- One italic line under every answer, with autogear on, in shadow or off: the model that answered, its effort, the helpers' models. The reasons and the money moved to `/gear`, `/gear log` and `/gear savings`.
- `/gear doctor` checks the setup and says what to fix.
- Tested through Claude Code 2.1.299.

## 0.11.0 (17 October 2026)

- The rules read eight languages; a long, counted or stepwise brief is hard work.

## 0.10.x (17 October 2026)

- A large conversation offers a clean one with a hand-over note; the offer stays until pressed and the band is tidier.

## 0.9.x (17 October 2026)

- In `saver`, hard work runs on Sonnet · high; Opus is kept for critical work, plan mode and when you ask. A large conversation never steps down to a cheaper model.

## 0.8.x (17 October 2026)

- Rate-limit windows warn instead of lowering the choice; the effort table was retuned from measurements; the state row shows on, shadow and off apart; plan mode goes to Opus; a located hunt goes to Sonnet.

## 0.7.1 and earlier (11 to 16 October 2026)

- 0.7: shadow mode, external benchmarks, a harvest of real decisions. 0.6: routing fixed from a review of real use. 0.5: decision log with your marks. 0.4: cost and saving per turn, the savings card. 0.3: the on/off band, English README, MIT license. 0.2: a measured classifier, safety nets. 0.1: automatic model and effort per prompt.
