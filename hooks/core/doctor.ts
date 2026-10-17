// `/gear doctor`: what autogear can see about its own setup, read as a short
// list of checks, each saying what is wrong and what to do about it.

import type { AutogearMode } from '../../types'
import { effortRank, familyOf, familyRank, type Effort } from './models'
import { L, profileName, type Lang, type LangSetting } from './text'

export type Facts = {
  // The state in force: stood down shows as 'down'.
  mode: AutogearMode
  profile: string
  // The picker's model and effort as the last request saw them; none before one.
  ceiling: { model: string; display: string; effort: Effort | undefined } | undefined
  // Claude Code's version, when it says; the newest one autogear was tried on.
  version: string | undefined
  testedThrough: string
  isNewer: boolean
  // Settings, log and totals can be written and read back.
  isStoreWorking: boolean
  // Turns in a row answered by another model than the one chosen.
  mismatches: number
  mismatchLimit: number
  // Models a request got no answer from this session.
  unavailable: string[]
  hasDecided: boolean
  hasLimits: boolean
  isPlanning: boolean
  isFooterOn: boolean
  isBandOn: boolean
  lang: Lang
  langSetting: LangSetting
  // Environment settings that can hold the effort or the helpers' model.
  env: { effortLevel: string | undefined; subagentModel: string | undefined }
}

type Check = { level: 'ok' | 'fix' | 'info'; text: string }

const MARK = { ok: '✓', fix: '⚠', info: 'ℹ' } as const

function modeCheck(facts: Facts): Check {
  switch (facts.mode) {
    case 'auto':
      return { level: 'ok', text: L('autogear is on: it picks the model and effort for each message.', 'autogear açık: her mesaj için model ve eforu seçiyor.') }
    case 'shadow':
      return {
        level: 'fix',
        text: L(
          "autogear is in shadow: it writes its choices down but applies none, the picker's model answers. To use it: `/gear on`.",
          'autogear gölgede: seçimlerini yazıyor ama hiçbirini uygulamıyor, cevabı seçicideki model veriyor. Kullanmak için: `/gear on`.',
        ),
      }
    case 'pin':
      return {
        level: 'fix',
        text: L("autogear is off: every request goes with the picker's model. To use it: `/gear on`.", 'autogear kapalı: bütün istekler seçicideki modelle gidiyor. Kullanmak için: `/gear on`.'),
      }
    case 'down':
      return {
        level: 'fix',
        text: L(
          "autogear stopped itself: its choices were not applied for several turns, so Claude Code may have changed its plugin API. Try `/gear on`; if it stops again, update autogear.",
          'autogear kendini durdurdu: seçimleri üst üste birkaç tur uygulanmadı, Claude Code eklenti arayüzünü değiştirmiş olabilir. `/gear on` ile dene; yine durursa autogear\'ı güncelle.',
        ),
      }
  }
}

function pickerCheck(facts: Facts): Check {
  const { ceiling } = facts
  if (ceiling === undefined) {
    return { level: 'info', text: L('No request seen yet, so the picker is unknown. Send a message and run `/gear doctor` again.', 'Henüz istek görülmedi, seçici bilinmiyor. Bir mesaj gönderip `/gear doctor`u yeniden çalıştır.') }
  }
  const family = familyOf(ceiling.model)
  const effort = ceiling.effort === undefined ? L('default effort', 'varsayılan efor') : ceiling.effort
  const held = family !== undefined && familyRank(family) < familyRank('opus')
  const lowEffort = ceiling.effort !== undefined && effortRank(ceiling.effort) < effortRank('high')
  if (held || lowEffort) {
    return {
      level: 'fix',
      text: L(
        `The picker holds ${ceiling.display} · ${effort}. autogear never goes above the picker, so it cannot use ${held ? 'Opus' : 'high effort'}. For full automation choose Opus · high in the model picker.`,
        `Seçici ${ceiling.display} · ${effort} tutuyor. autogear seçicinin üstüne çıkmaz, bu yüzden ${held ? 'Opus' : 'yüksek eforu'} kullanamaz. Tam otomatik için model seçicide Opus · high seç.`,
      ),
    }
  }

  return { level: 'ok', text: L(`The picker holds ${ceiling.display} · ${effort}: autogear has the whole range under it.`, `Seçici ${ceiling.display} · ${effort} tutuyor: autogear'ın altında tüm aralık açık.`) }
}

function versionCheck(facts: Facts): Check | undefined {
  if (facts.version === undefined) {
    return undefined
  }
  if (facts.isNewer) {
    return {
      level: 'fix',
      text: L(
        `Claude Code ${facts.version} is newer than the newest version autogear was tried on (${facts.testedThrough}). It keeps working unless its choices stop being applied; then it stops itself.`,
        `Claude Code ${facts.version}, autogear'ın denendiği en yeni sürümden (${facts.testedThrough}) yeni. Seçimleri uygulanmaz hâle gelmedikçe çalışmaya devam eder; gelirse kendini durdurur.`,
      ),
    }
  }

  return { level: 'ok', text: L(`Claude Code ${facts.version} is a version autogear was tried on (up to ${facts.testedThrough}).`, `Claude Code ${facts.version}, autogear'ın denendiği sürümlerden (en yeni ${facts.testedThrough}).`) }
}

function appliedChecks(facts: Facts): Check[] {
  const checks: Check[] = []
  if (facts.mismatches > 0) {
    checks.push({
      level: 'fix',
      text: L(
        `The last ${facts.mismatches} turn(s) were answered by another model than the one chosen; at ${facts.mismatchLimit} in a row autogear stops itself.`,
        `Son ${facts.mismatches} tur seçilenden başka bir modelle cevaplandı; üst üste ${facts.mismatchLimit} olursa autogear kendini durdurur.`,
      ),
    })
  } else if (facts.hasDecided) {
    checks.push({ level: 'ok', text: L('The last choices were applied: the models that answered are the ones chosen.', 'Son seçimler uygulandı: cevap veren modeller seçilenlerle aynı.') })
  } else {
    checks.push({ level: 'info', text: L('No choice made yet in this session, so nothing to check against the answers.', 'Bu oturumda henüz seçim yapılmadı, cevaplarla karşılaştıracak bir şey yok.') })
  }
  if (facts.unavailable.length > 0) {
    checks.push({
      level: 'fix',
      text: L(
        `These models gave no answer this session and are avoided: ${facts.unavailable.join(', ')}. Your plan may not include them.`,
        `Bu modeller bu oturumda cevap vermedi, kullanılmıyor: ${facts.unavailable.join(', ')}. Aboneliğin bunları içermiyor olabilir.`,
      ),
    })
  }

  return checks
}

function envChecks(facts: Facts): Check[] {
  const checks: Check[] = []
  if (facts.env.effortLevel !== undefined) {
    checks.push({
      level: 'fix',
      text: L(
        `CLAUDE_CODE_EFFORT_LEVEL=${facts.env.effortLevel} is set in the environment: it can hold the effort for every request. Remove it if autogear's effort choices do not show.`,
        `Ortamda CLAUDE_CODE_EFFORT_LEVEL=${facts.env.effortLevel} ayarlı: bütün isteklerin eforunu sabitleyebilir. autogear'ın efor seçimleri görünmüyorsa kaldır.`,
      ),
    })
  }
  if (facts.env.subagentModel !== undefined) {
    checks.push({
      level: 'fix',
      text: L(
        `CLAUDE_CODE_SUBAGENT_MODEL=${facts.env.subagentModel} is set: every helper (subagent) runs on it whatever the work is. Remove it to let the helpers follow the picker.`,
        `CLAUDE_CODE_SUBAGENT_MODEL=${facts.env.subagentModel} ayarlı: işi ne olursa olsun bütün yardımcılar (alt ajanlar) bununla çalışır. Yardımcıların seçiciyi izlemesi için kaldır.`,
      ),
    })
  }

  return checks
}

function languageCheck(facts: Facts): Check {
  const name = facts.lang === 'tr' ? 'Türkçe' : 'English'
  const how = facts.langSetting === 'auto' ? L("following the system's language", 'sistemin dilini izliyor') : L('set by hand', 'elle seçilmiş')

  return { level: 'info', text: L(`Language: ${name}, ${how}. Change it with \`/gear lang en\`, \`tr\` or \`auto\`.`, `Dil: ${name}, ${how}. Değiştirmek için \`/gear lang en\`, \`tr\` ya da \`auto\`.`) }
}

export function doctorChecks(facts: Facts): Check[] {
  return [
    modeCheck(facts),
    pickerCheck(facts),
    versionCheck(facts),
    ...appliedChecks(facts),
    ...envChecks(facts),
    facts.isStoreWorking
      ? { level: 'ok' as const, text: L('Settings, the log and the savings totals are saved and read back.', 'Ayarlar, günlük ve tasarruf toplamları kaydediliyor ve geri okunuyor.') }
      : {
          level: 'fix' as const,
          text: L('The store refuses writes: settings, the log and the savings totals will not be kept.', 'Depo yazmayı reddediyor: ayarlar, günlük ve tasarruf toplamları saklanmayacak.'),
        },
    facts.hasLimits
      ? { level: 'ok' as const, text: L('The rate-limit windows are readable, so limit warnings work.', 'Limit pencereleri okunabiliyor, limit uyarıları çalışır.') }
      : { level: 'info' as const, text: L('The rate-limit windows are not known yet (no data from Claude Code); limit warnings wait for them.', 'Limit pencereleri henüz bilinmiyor (Claude Code veri vermedi); limit uyarıları bunu bekliyor.') },
    facts.isFooterOn ? undefined : { level: 'info' as const, text: L('The line under each answer is off: `/gear note on` shows which model answered.', 'Cevabın altındaki satır kapalı: `/gear note on` hangi modelin cevapladığını gösterir.') },
    facts.isBandOn ? undefined : { level: 'info' as const, text: L('The band above the prompt is off: `/gear band on` brings back the on/off buttons.', 'İstem kutusunun üstündeki bant kapalı: `/gear band on` aç/kapa düğmelerini geri getirir.') },
    facts.isPlanning ? { level: 'info' as const, text: L('Plan mode is on: requests go to Opus, with effort by the plan\'s size.', 'Plan modu açık: istekler Opus\'a gidiyor, efor planın büyüklüğüne göre.') } : undefined,
    languageCheck(facts),
  ].filter((check): check is Check => check !== undefined)
}

export function doctorText(facts: Facts): string {
  const checks = doctorChecks(facts)
  const toFix = checks.filter(check => check.level === 'fix').length

  return [
    `**autogear doctor** · ${L('profile', 'profil')} ${profileName(facts.profile)}`,
    '',
    toFix === 0 ? L('Nothing to fix.', 'Düzeltilecek bir şey yok.') : L(`${toFix} thing(s) to look at, marked ⚠.`, `Bakılacak ${toFix} şey var, ⚠ ile işaretli.`),
    '',
    ...checks.map(check => `- ${MARK[check.level]} ${check.text}`),
  ].join('\n')
}
