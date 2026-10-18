// The words autogear says to the person, in English or Turkish. The rules, the
// log and the tests keep one Turkish form of each reason; it is turned into
// English only when shown.

export type Lang = 'en' | 'tr'

// What /gear lang sets: a language, or auto (the system's).
export type LangSetting = 'auto' | Lang

export const LANGS: readonly Lang[] = ['en', 'tr']

let current: Lang = resolveLang('auto', systemLocale())

export function setLang(lang: Lang): void {
  current = lang
}

export const getLang = (): Lang => current

// One line, in the language in use.
export const L = (en: string, tr: string): string => (current === 'tr' ? tr : en)

// The system's language. Claude Code's own `language` setting is not offered
// to a Mod, so it is not read.
export function systemLocale(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale
  } catch {
    return undefined
  }
}

export function resolveLang(setting: LangSetting, locale: string | undefined): Lang {
  if (setting !== 'auto') {
    return setting
  }

  return locale?.toLowerCase().startsWith('tr') === true ? 'tr' : 'en'
}

export function asLangSetting(value: unknown): LangSetting {
  return value === 'en' || value === 'tr' ? value : 'auto'
}

// "92%" or, in Turkish, "%92".
export const pct = (value: number | string): string => (current === 'tr' ? `%${value}` : `${value}%`)

// Tier labels and profile names as shown; the Turkish ones stay the ids.
const TIER_NAMES: Record<string, string> = { önemsiz: 'trivial', rutin: 'routine', standart: 'standard', zor: 'hard', kritik: 'critical' }

export const tierName = (label: string): string => (current === 'tr' ? label : (TIER_NAMES[label] ?? label))

const PROFILE_NAMES: Record<string, string> = { tasarruf: 'saver', dengeli: 'balanced', kalite: 'quality' }

export const profileName = (id: string): string => (current === 'tr' ? id : (PROFILE_NAMES[id] ?? id))

// Turkish reasons the rules, the policy and the router write, with their
// English. $1, $2 are the parts that carry over.
const REASONS: readonly (readonly [RegExp, string])[] = [
  [/^selamlaşma$/, 'greeting'],
  [/^yine olmadı$/, 'still not working'],
  [/^şikâyet (.+): \+(\d) kademe$/, 'complaint $1: +$2 tier'],
  [/^şikâyet (.+)$/, 'complaint $1'],
  [/^kısa onay: önceki kademe$/, 'short go-ahead: same tier as before'],
  [/^aynı işin devamı: önceki kademe$/, 'more of the same work: same tier as before'],
  [/^tekrarlayan başarısızlık: (.+)$/, 'repeated failure: $1'],
  [/^bütün uygulamanın taşınması$/, 'moving the whole application'],
  [/^kapsamlı iş: (.+), (\d+) parça$/, 'wide work: $1, $2 parts'],
  [/^kapsamlı iş: (.+)$/, 'wide work: $1'],
  [/^çok parçalı özellik: (.+)$/, 'feature in many parts: $1'],
  [/^çok sayıda zor sinyali: (.+)$/, 'many signs of hard work: $1'],
  [/^kapsamlı istek$/, 'wide request'],
  [/^zor iş: (.+)$/, 'hard work: $1'],
  [/^plan istemek$/, 'asking for a plan'],
  [/^uzun, çok adımlı iş: (.+)$/, 'long, many-step work: $1'],
  [/^bir sorunu önleme ya da ele alma sorusu$/, 'how to prevent or handle a problem'],
  [/^seçenekler arasında karar$/, 'a decision between options'],
  [/^bir hatanın sebebini bulmak$/, 'finding the cause of a fault'],
  [/^bir yapıdan diğerine geçiş$/, 'moving from one structure to another'],
  [/^zor sinyalleri: (.+)$/, 'signs of hard work: $1'],
  [/^bir sistem tasarlamak$/, 'designing a system'],
  [/^ödeme entegrasyonu$/, 'payment integration'],
  [/^hata yakalayan test yazmak$/, 'writing tests that catch faults'],
  [/^hata çıktısı$/, 'error output'],
  [/^belirsiz anlatılmış hata$/, 'vaguely described fault'],
  [/^hata ayıklama$/, 'debugging'],
  [/^bir şey olması gerektiği gibi olmuyor$/, 'something does not behave as it should'],
  [/^test yazmak$/, 'writing tests'],
  [/^basit iş: (.+)$/, 'simple chore: $1'],
  [/^bilgi listeleme$/, 'listing information'],
  [/^soru: (.+)$/, 'question: $1'],
  [/^soru$/, 'question'],
  [/^uzun, çok cümleli iş tarifi$/, 'long, many-sentence description of work'],
  [/^inceleme isteği: (.+)$/, 'request to look into something: $1'],
  [/^dikkatli okuma ve düzeltme$/, 'a close read to find and fix faults'],
  [/^tek zor sinyali: (.+)$/, 'one sign of hard work: $1'],
  [/^kodu başka bir dile çevirmek$/, 'converting code to another language'],
  [/^uzun istek$/, 'long request'],
  [/^(\d+) dosya$/, '$1 files'],
  [/^(\d+) maddelik liste$/, 'list of $1 items'],
  [/^özellik: (.+)$/, 'feature: $1'],
  [/^uzun bir iş tarifi$/, 'long description of work'],
  [/^küçük değişiklik: (.+)$/, 'small change: $1'],
  [/^iş: (.+)$/, 'work: $1'],
  [/^belirgin sinyal yok$/, 'no clear sign'],
  [/^Türkçe ya da İngilizce değil: Haiku'ya sorulur$/, 'not Turkish or English: Haiku is asked'],
  [/^görsel\/ek var$/, 'image or attachment present'],
  [/^okunamadı: (.+)$/, 'could not read: $1'],
  [/^istek: (\w+) efor$/, 'asked: $1 effort'],
  [/^istek: (.+)$/, 'asked: $1'],
  [/^elle: (.+)$/, 'by hand: $1'],
  [/^Haiku T(\d), kurallar T(\d): en az T(\d)$/, 'Haiku T$1, rules T$2: at least T$3'],
  [/^önceki turda test\/derleme başarısız kaldı: \+1 kademe$/, 'tests or build failed last turn: +1 tier'],
  [/^süren iş T(\d): en çok bir kademe aşağı$/, 'work in hand is T$1: one tier lower at most'],
  [/^plan modu: Opus, efor planın büyüklüğüne göre$/, "plan mode: Opus, effort by the plan's size"],
  [/^yeri belli hata avı: Sonnet$/, 'fault hunt with a known place: Sonnet'],
  [/^bağlam büyük: daha ucuz modele inilmedi \(önbellek\)$/, 'large conversation: no step down to a cheaper model (cache)'],
  [/^bağlam büyük: model aynı kaldı \(önbellek\)$/, 'large conversation: model stayed the same (cache)'],
  [/^(.+) kullanılamıyor$/, '$1 is not available'],
  [/^(.+) yanıt vermedi$/, '$1 gave no answer'],
  [/^seçici tavanı$/, "the picker's ceiling"],
  [/^kullanıcı mesajı yok: son seçim$/, 'no message from the person: last choice'],
  [/^hata avı: efor (\w+)$/, 'fault hunt: effort $1'],
  [/^(.+): artan limit, efor bir kademe yukarı$/, '$1: room left before the reset, effort one step up'],
]

export function reasonText(reason: string): string {
  if (current === 'tr') {
    return reason
  }
  for (const [pattern, english] of REASONS) {
    if (pattern.test(reason)) {
      return reason.replace(pattern, english)
    }
  }

  return reason
}

// A flag the log keeps in Turkish ("şikâyetle yükseltildi"), as shown.
const FLAGS: Record<string, string> = {
  'şikâyetle yükseltildi': 'raised after a complaint',
  'test/derleme kırık': 'tests or build broken',
}

export const flagText = (flag: string): string => (current === 'tr' ? flag : (FLAGS[flag] ?? flag))

// A source the log keeps in Turkish ("kural"), as shown.
const SOURCES: Record<string, string> = { kural: 'rules', elle: 'by hand', devam: 'carry-on', yükseltme: 'escalation' }

export const sourceText = (source: string): string => (current === 'tr' ? source : (SOURCES[source] ?? source))
