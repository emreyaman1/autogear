// Reads a prompt and guesses how much model it needs: a tier from 0 (trivial)
// to 4 (critical), the reasons, and whether the rules are sure of it.

import * as words from './languages'
import type { Effort, Family } from './models'
import { toTier, type Tier } from './tiers'

export type Override = { family?: Family; effort?: Effort; tier?: Tier }

export type RuleSource = 'rules' | 'override' | 'inherit' | 'escalate'

// What the prompt is, beside how hard: work asked for, a question, a chore
// (commit, push, typo), a greeting, a go-ahead, a complaint, or nothing the
// rules can name. The router holds a task's tier through what is not new work.
export type RuleKind = 'work' | 'question' | 'chore' | 'greeting' | 'followup' | 'complaint' | 'none'

export type RuleResult = {
  tier: Tier
  // low: the rules could not tell, and the router may ask Haiku.
  confidence: 'high' | 'low'
  source: RuleSource
  kind: RuleKind
  reasons: string[]
  override?: Override
  // The least Haiku may answer for it, where the rules saw a sure sign of work.
  floor?: Tier
  // A hunt, worked at more effort, not less: "vague", a bug told without
  // detail ("bu çalışmıyor, düzelt"); "located", a bug whose cause hides (it
  // comes and goes, it shows far from where it starts) but which is told
  // plainly, or tests written to catch bugs nobody has found yet.
  hunt?: Hunt
}

export type Hunt = 'vague' | 'located'

export type RuleContext = {
  // The tier of the previous prompt in this session.
  prevTier?: Tier
  hasAttachments?: boolean
  // How many prompts in a row have already complained.
  frustrationStreak?: number
}

// The notes Claude Code puts ahead of a person's message (the folder it
// started in, the date, the model): not what the person wrote.
const SYSTEM_NOTE = /<system-reminder>[\s\S]*?<\/system-reminder>/g

export const withoutNotes = (text: string): string => text.replace(SYSTEM_NOTE, ' ').trim()

const FOLD: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' }

// Other Latin letters that have no accent to take off.
const LATIN_EXTRA: Record<string, string> = { ß: 'ss', æ: 'ae', œ: 'oe', ø: 'o', ł: 'l', đ: 'd' }

// Lowercases and folds Turkish letters, so "Çalışmıyor" and "calismiyor" read alike;
// other Latin accents come off the same way ("café", "über", "señor").
// Folded, "dönüyor" (it returns: "500 hatası dönüyor") would read as
// "donuyor" (it freezes), a hunt; it is said as what it means first.
const RETURNS = /(^|[^a-zçğıöşü])dön(?:üyor|üyo|dürüyor)(?![a-zçğıöşü])/gi

export function normalize(text: string): string {
  return text
    .replace(RETURNS, '$1veriyor')
    .toLowerCase()
    .replace(/̇/g, '')
    .replace(/[çğıöşüâîû]/g, letter => FOLD[letter] ?? letter)
    .replace(/[à-ɏ]/g, letter => LATIN_EXTRA[letter] ?? letter.normalize('NFD').replace(/[̀-ͯ]/g, ''))
}

// Chinese, Japanese and Korean run on without spaces.
const CJK_RUN = /([぀-ヿ㐀-鿿가-힯]+)/g

// The prompt with its Chinese, Japanese and Korean runs set apart, so that a
// sentence is not one "word" that happens to hold a file name.
const spaced = (raw: string): string => raw.replace(CJK_RUN, ' $1 ')

// How long a prompt reads: a Chinese, Japanese or Korean character says as
// much as a few Latin ones.
export function weight(text: string): number {
  return text.length + 2 * (text.match(CJK_RUN)?.join('').length ?? 0)
}

// A token that is code, a path or an identifier, not words: `add(a, b)`,
// `server.js`, `./utils/date`, `MAX_RETRIES`, `user_id`.
const CODE_TOKEN = /[(){};=<>]|^[.~/\\]|\w\.\w|^[A-Z0-9]+_[A-Z0-9_]+$|^[a-z0-9]+(?:_[a-z0-9]+)+$/i

const EDGE_PUNCTUATION = /^["'“”‘’([]+|["'“”‘’)\],.:;!?]+$/g

// The prompt's prose: code and names in it carry words ("add", "test",
// "DATABASE") that say nothing about how hard the work is.
export function prose(raw: string): string {
  return spaced(raw)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/\{[^{}]*\}/g, ' ')
    .replace(/[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\([^()\n]*\)/g, ' ')
    .split(/\s+/)
    .filter(token => !CODE_TOKEN.test(token.replace(EDGE_PUNCTUATION, '')))
    .join(' ')
}

type Cue = { word: string; pattern: RegExp }

// A cue matches at the start of a word and lets any suffix follow, as Turkish
// needs ("hata", "hatayı", "hatası"); stems stop before a consonant that
// mutates ("özelli" for özellik/özelliği, "ren[kg]" for renk/rengi).
function cues(words: readonly string[]): readonly Cue[] {
  return [...new Set(words)].map(word => ({ word, pattern: new RegExp(`(?:^|[^a-z0-9а-яё])(?:${word})`) }))
}

// The cue as a reason shows it: its regex syntax taken out.
function label(word: string): string {
  return word
    .replace(/\(\?[!=][^)]*\)/g, '')
    .replace(/\(\?:[^)]*\)\??/g, '')
    .replace(/\[([^\]])[^\]]*\]/g, '$1')
    .replace(/\.\?/g, ' ')
    .replace(/[?*+\\]/g, '')
    .trim()
}

function found(list: readonly Cue[], text: string): string[] {
  return list.filter(cue => cue.pattern.test(text)).map(cue => label(cue.word))
}

const word = (source: string): RegExp => new RegExp(`(?:^|[^a-z0-9а-яё])(?:${source})`)

// Failures whose cause has to be hunted down: they come and go, lock up, leak,
// or show far from where they start.
const ELUSIVE_WORDS = [
  'race condition', 'deadlock', 'kilitlen', 'memory leak', 'sizinti',
  'kok neden', 'root cause', 'bazen', 'rastgele', 'ara sira', 'arada bir', 'sometimes', 'randomly', 'intermittent',
  'flaky', 'donuyor', 'cokuyor', 'takiliyor', 'tutarsiz', 'inconsistent',
  ...words.ELUSIVE_I18N,
  ...words.ELUSIVE_MORE,
]

const ELUSIVE = cues(ELUSIVE_WORDS)

// Hard on their own: architecture, concurrency, performance, security, and
// failures that are hard to pin down.
const HARD = cues([
  'mimari', 'architect', 'refactor', 'refaktor', 'yeniden yapilandir', 'yeniden duzenle', 'restructur', 'katman',
  'monorepo', 'mikroservis', 'microservice', 'monolit', 'design pattern', 'strategy pattern', 'multi.?tenant', 'coklu kiraci',
  'eszamanli', 'ayni anda', 'concurren', 'thread.?safe',
  'performans', 'performance', 'yavas', 'slow', 'hizlandir', 'speed up', 'latency', 'optimiz', 'optimis', 'olcekle', 'scalab',
  'guvenli[kg]?', 'security', 'zafiyet', 'vulnerab', 'injection', 'xss', 'csrf',
  ...words.HARD_I18N,
  ...words.HARD_MORE,
  ...words.HARD_MORE2,
  ...words.SLOW_I18N,
  ...words.CAUSE_I18N,
  ...ELUSIVE_WORDS,
])

// Hard only beside another sign: "neden" may be a quick question or a hunt.
const MAYBE_HARD = cues([
  'neden', 'niye', 'nicin', 'sebep', 'sebeb', 'why', 'tasarla', 'tasarim', 'design', 'analiz', 'analy', 'karsilastir',
  'compar', 'strateji', 'strateg', 'degerlendir', 'evaluat', 'avantaj', 'dezavantaj', 'artilari', 'eksileri',
  'pros and cons', 'trade.?off', 'arastir', 'investigat', 'incele(?!mede|meye|n)', 'nasil calisiyor', 'how does', 'kapsamli',
  'derinlemesine', 'in depth', 'deep dive', 'yol haritasi', 'roadmap', 'yetkilendirme', 'authoriz', 'kimlik dogrula',
  'authenticat', 'should i', 'alternatif', 'alternative', 'baska (?:bir )?yol', 'another way',
  ...words.MAYBE_HARD_I18N,
  ...words.MAYBE_HARD_MORE,
])

// "yapmalıyız", "nasıl tasarlamalıyım": a suffix, so no cue (cues match at a
// word's start); "geçmeli miyiz" asks to choose.
const SHOULD = /[a-z](?:meli|mali)(?:yim|yiz)(?![a-z])/
const SHOULD_WE = /[a-z](?:meli|mali) mi(?:yim|yiz)(?![a-z])/

// Work done step by step on the person's computer or a website, or left open
// ("yapman gereken ne varsa yap"): long and many-sided, whatever the words.
const AGENTIC = cues([
  'bilgisayar(?:im|imiz)?(?:a|i|in)? (?:eris|kullan|kontrol)', 'computer use', 'kayit ol(?![a-z])(?! sayfa| form| buton| ekran| akis)',
  'basvur(?![a-z])', 'basvuru(?:mu|yu)? yap', 'formu? doldur', 'yapman gereken (?:her ?seyi|ne varsa)', 'gereken her ?seyi yap',
  'ne gerekiyorsa yap', 'siteye (?:gir(?:ip|erek)?|baglan(?:ip|arak)?)(?![a-z])', 'tarayici(?:yi|da|yla)? (?:kullan(?:arak|ip)?|ac(?:arak|ip)?)(?![a-z])',
])

// Asking for a plan: how to go about the work, before doing it. Carrying out a
// plan ("planı uygula") is not this.
const PLANNING = word(
  [...words.PLANNING_I18N, ...words.STRUCTURE_I18N].join('|') + '|plan (?:yap|cikar|hazirla|olustur|kur)|planla(?!n|dig|mis|di|ri)|yol haritasi|roadmap|nasil (?:yapalim|ilerleyelim|ilerlemeliyiz)|adim adim (?:plan|yol haritasi)|(?:make|write|draft|propose) (?:a |an )?(?:plan|implementation plan)|plan (?:out|for|the|how)(?![a-z])|how should we (?:approach|do|implement|build|structure|tackle)',
)

// Asking for a look into something: work of its own, which Haiku may not call trivial.
// "incelemede" (under review), "incelendi": a state, not a request.
const INVESTIGATE = word('incele(?!mede|meye|n)|arastir|investigat|look into')

// A choice between options: "Redux mı Zustand mı", "geçmeli miyiz".
const DECISION = word(
  '[a-z]+ mi [a-z]+ mi(?![a-z])|should we|which (?:one )?(?:is|would be) better|hangisi daha|versus|vs\\.?(?![a-z])|' + words.DECISION_I18N.join('|'),
)

const WHY = word('neden|niye|nicin|sebep|sebeb|why|' + words.WHY_I18N.join('|'))
const HUNT = word('bul|find|figure out|arastir|investigat|incele|tespit|anla|understand|debug|' + words.HUNT_I18N.join('|'))
// "çok" (very) folds like "çöktü" (it crashed), "döngü" (a loop) like "dondu"
// (it froze), "çift tırnak" like "çift sipariş": the forms that name a fault.
const FAILURE = word(
  'hata|error|fail|crash|cok(?:tu|uyor|uyo|me|er|ecek)(?![a-z])|don(?:uyor|uyo|du|ma|ar|ak)(?![a-z])|takil|bozul|broken|yanlis|wrong|duplicate|cift (?:siparis|kayit|odeme|islem|mail|e-?posta|ucret|cekim)|ciftlen|iki kez|twice|kayb|lost|null|undefined|yavas|slow|' +
    words.FAILURE_I18N.join('|'),
)

// A number or a measure changed ("30'dan 60'a", "from 5s to 15s", "从 30 改成 60"), not a
// product's version ("Python 2'den 3'e"; the name before it is the sign).
const VALUE_CHANGE = new RegExp(
  "(?:^|[^a-z0-9])(?<!(?:python|node|vue|react|angular|java|php|ruby|go|django|rails|laravel|spring|net|ios|android|postgres|mysql|v|surum|version|versiyon) )[0-9]+(?:[a-z%]{0,3})'?(?:ten|tan|den|dan)\\s+[0-9]+(?:[a-z%]{0,3})'?(?:ye|ya|e|a)(?![a-z])|from [0-9]+[a-z%]{0,3} to [0-9]+|从 ?[0-9]+[^。，]{0,6}(?:改成|换成|改为) ?[0-9]+|[0-9]+[^0-9、。]{0,3}から[0-9]+",
)
// A database migration file to write: no move.
const DB_MIGRATION = word(
  'migration (?:file|dosya|script)|migration dosyas|(?:write|add|create|generate|yaz|ekle) (?:a |an |the |bir )?(?:[a-z]+ )?migration|migration(?:u|i)? (?:yaz|ekle|olustur)|fichier de migration|archivo de migracion|migrationsdatei|alembic|flyway|liquibase',
)

// "40 kadar dosya", "about 60 files", "около 60 файлов": work counted in files.
const COUNTED_FILES = /(?:^|[^0-9])[1-9][0-9]+ ?(?:kadar |civari |tane |adet )?(?:dosya|files?(?![a-z])|archivos|fichiers|dateien|файл|个文件|个 ?文件|ファイル)/
// Replacing one thing with another, in the languages CHANGE does not read.
const REPLACE = word('replace|degistir|reemplaz|sustitu|ersetz|austausch|remplac|замен|替换|置き換')
// A text file named: "docs/api.md", "notes.txt".
const DOC_FILE = /.(?:md|mdx|txt|rst|adoc)(?![a-z])/i
// A commit message asked for first, its content after it: a chore.
const COMMIT_FIRST = /^(?:commit (?:mesaji|message|msg)|(?:write|suggest) (?:a |the |me a )?commit message)|commit (?:mesaji|message|msg)[^:]{0,20}:/

// "X'ten Y'ye taşı/geçir", "migrate ... from X to Y".
const MIGRATION = new RegExp(
  "'?(?:ten|tan|den|dan)\\s+[^,.;]{0,40}?'?(?:ye|ya|e|a)\\s+(?:gec|tasi|cevir|donustur|aktar)|(?:migrat|convert|rewrite)[^.]{0,60}from [^.]{1,40} to |(?:^|[^a-z])migrat|yeni [^,.;]{0,40}?(?:yapi|mimari|sistem|altyapi|kutuphane|framework|modul)[a-z]*(?:ya|ye|na|ne|a|e) (?:gec|tasi|aktar|donustur)",
)
const WHOLE = word(
  'uygulama(?:yi|nin)?(?![a-z])|tum|butun|proje(?:yi|nin)?(?![a-z])|codebase|whole|entire|the app(?![a-z])|our app|her sey|all our|all the|' + words.WHOLE_I18N.join('|'),
)

const REPEATED_FAILURE = cues([
  'defalarca', 'kac (?:kere|defa|kez)', 'her denemede',
  'bir turlu', 'tekrar tekrar', 'hicbir sey ise yaramadi', 'her yer bozul', 'again and again',
  'keeps? (?:failing|breaking)', 'nothing works', 'back and forth',
  '(?:last|after|past|previous) (?:two|three|four|five|few|several|[0-9]+) (?:attempts|tries)', '(?:two|three|four|five|[0-9]+) attempts? (?:at|to)', 'tried everything', 'every attempt', 'each attempt',
  ...words.REPEATED_FAILURE_I18N,
  ...words.REPEATED_MORE,
  ...words.REPEATED_MORE2,
])

// "3 gündür", "for days": a fault that has lasted, but only beside a word of
// the fault in the same sentence; "3 gündür görüşmüyoruz", "2 aydır
// geliştirdiğim proje" are no failure.
const DURATION = cues([
  '(?:gun|hafta|ay|saat)(?:ler|lar)?d[iu]r(?![a-z])', 'gundur', 'saattir', 'her seferinde', 'for an? (?:hour|day|week|month)', 'for days', 'for hours', 'for (?:a |two |several )?weeks?(?![a-z])',
  'for [0-9]+ (?:days?|hours?|weeks?|months?)',
  ...words.DURATION_I18N,
])
const STRUGGLE = word(
  'hata|coz|olmuyor|olmadi|calismiyor|calismadi|bozuk|bozul|ugras|calisiyo(?:r)?sun|deniyo|dene|duzel|sorun|problem|becereme|basarama|takil|fix|fail|error|bug|broken|struggl|stuck|trying|tried|issue|crash|' +
    // the same in the other languages: struggle, break down, fail, cannot fix
    'luch|pele|falla|no funciona|arregl|kampf|kaputt|funktioniert nicht|absturz|reparier|lutt|panne|plant|echou|marche pas|correctif|бь[её]мся|борем|лома|слома|не работает|не можем|не получается|почин|折腾|搞不定|修不好|崩溃|失败|直らな|壊れ|失敗|苦戦|' +
    [...words.FAILURE_I18N, ...words.DEBUG_I18N, ...words.FRUSTRATION_I18N].join('|'),
)

const SCOPE = cues([
  'complete', 'full(?:-| )?(?:stack|featured)', 'entire', 'whole', 'bastan sona', 'sifirdan', 'eksiksiz', 'komple',
  'from scratch', 'end.to.end', 'uctan uca',
  ...words.SCOPE_I18N,
])

const DESIGN = word('tasarla|design|architect|planla(?!n|dig|mis|di|ri)|kurgula|' + words.DESIGN_I18N.join('|'))
const SYSTEM = word(
  'sistem|system|sema|schema|veritaban|database|mimari|architecture|api|yapi|altyapi|infrastructure|servis|service|permission|role model|access model|data model|rbac|' +
    words.SYSTEM_I18N.join('|'),
)
const MONEY = word('odeme|payment|stripe|iyzico|paypal|fatura|billing|' + words.MONEY_I18N.join('|'))
const INTEGRATION = word('entegr|integrat|webhook|' + words.INTEGRATION_I18N.join('|'))
const PREVENT = word(words.PREVENT_I18N.join('|'))

// What a feature is made of; its verbs are the ADD ones.
const FEATURE = cues([
  'ozelli', 'feature', 'deste[kg]', 'support', 'fatura', 'billing', 'filtre', 'filter', 'siralama', 'sort', 'arama', 'search', 'kuyruk', 'queue',
  'yukleme', 'upload', 'entegr', 'integrat', 'sistem', 'system', 'modul', 'module', 'sayfa', 'page', 'form(?!at)',
  'dogrulama', 'validat', 'oturum', 'session', 'bildirim', 'notification', 'cache', 'onbellek', 'sepet', 'cart',
  'odeme', 'payment', 'rapor', 'report', 'dashboard', 'panel', 'disa aktar', 'export', 'sayfalama', 'pagination',
  'endpoint', 'api(?! ?key| anahtar)', 'hook', 'servis', 'service', 'kutucu', 'checkbox', 'kutusu', 'secici', 'picker', 'dark mode',
  'tema', 'theme', 'sifre', 'password', 'e-?posta', 'email', 'tarih', 'timezone', 'saat dilimi', 'rol(?:e|ler)',
  'izin(?! ver)', 'permission', 'webhook', 'cron', 'zamanla', 'schedul', 'auth', 'login', 'giris', 'kayit', 'signup',
  'profil', 'user management', 'kullanici yonetimi', 'veritaban', 'database', 'schema', 'backend', 'frontend',
  'arayuz', 'debounce', 'throttle', 'retry', 'yeniden dene', 'cubu[kg]', 'bar(?![a-z])', 'spinner', 'modal', 'popup',
  'tooltip', 'dropdown', 'menu', 'sekme', 'progress', 'ilerleme', 'banner', 'toast', 'badge', 'grafik', 'chart',
  'animasyon', 'animation', 'yukle(?:me|rken|nen)',
  ...words.FEATURE_I18N,
])

const ADD = cues([
  'ekle', 'add(?:s|ed|ing)?(?![a-z])', 'olustur', 'create', 'implement', 'build', 'gelistir', 'develop', 'yaz(?![a-z])',
  'yaz[ai]', 'write', 'entegre', 'integrate', 'destekle', 'goster', 'display',
  ...words.ADD_I18N,
])

const CHANGE = cues([
  'degistir', 'guncelle', 'yap(?![a-z])', 'sil(?![a-z])', 'kaldir', 'tasi(?![a-z])', 'ayarla', 'cevir', 'yukselt',
  'change', 'update', 'set(?![a-z])', 'remove', 'delete', 'move', 'tweak', 'adjust', 'bump', 'make',
])

// Small things a change touches: a color, a label, a number.
const SMALL = cues([
  'ren[kg]', 'colou?r', 'metin', 'metni', 'text', 'yazi', 'label', 'baslik', 'title', 'satir', 'line(?![a-z])', 'yil(?:i|ini|in)?(?![a-z])',
  'year', 'boyut', 'size', 'port(?![a-z])', 'deger', 'value', 'sure(?:si|sini)', 'timeout', 'duration', 'link',
  'logo', 'ikon', 'icon', 'padding', 'margin', 'bosluk', 'spacing', 'font', 'kalin', 'bold', 'versiyon', 'version',
  'sabit', 'constant', 'import', 'yorum', 'comment', 'mesaj', 'message', 'varsayilan', 'default',
])

// Phrases that settle a prompt as trivial even beside a work verb ("yorum ekle").
const TRIVIAL = cues([
  'commit mesaji', 'commit message', 'commit', 'push', 'yazim hata', 'typo', 'formatla', 'prettier', 'girinti',
  'indent', 'yorum ekle', 'yorum satiri', 'add (?:a )?comments?', 'yeniden adlandir',
  'adini [^,.]{0,30}(?:yap|degistir|olarak)', 'rename',
  ...words.TRIVIAL_I18N,
])

// Questions about code already in view.
const QUESTION = cues([
  'ne yapiyor', 'ne ise yariyor', 'nedir', 'ne demek', 'ne anlama gel', 'acikla(?:r mi|yabilir|yin)?(?![a-z])',
  'anlat(?:ir mi|abilir|in)?(?![a-z])', 'ozetle', 'ozet(?![a-z])', 'ne degisti',
  'hangi dosya', 'nerede', 'kac tane', 'what does', 'what is', 'what.?s(?! (?:going on|wrong|happening|up with))', 'explain', 'summari[sz]', 'how many',
  'where is', 'which file', 'what changed',
  ...words.QUESTION_I18N,
])

const LIST = word('listele|goster|show|list(?![a-z])|neler var|ne var|' + words.LIST_I18N.join('|'))
const INFO = word(
  'dosya|file|klasor|folder|dizin|director|script|todo|yorum|comment|log(?![a-z])|loglar|degisiklik|diff|commit|branch|bagimlilik|dependenc|paket|package|route|fonksiyon|function|sinif|class|variable|' + words.INFO_I18N.join('|'),
)

// A close read of work already written, to find what is wrong in it: "gözden
// geçir", "review", "proofread"; or a read asked for again, closely or from the
// top, with something in it to fix ("baştan tekrar oku ... düzeltilmesi
// gereken detaylar"). Haiku has called such a prompt trivial, and a weak model
// reading for faults misses them.
const REVIEW = word(
  'gozden gecir(?!il)|elden gecir(?!il)|redakte|review(?:ing)?(?![a-z])|proofread|look (?:it |them |this |everything )?over|comb through|' +
    words.REVIEW_I18N.join('|'),
)
const READ = word('oku(?![a-z])|okuy|okur musun|kontrol et|kontrol ed|tara(?![a-z])|re.?read|read(?![a-z])|check(?![a-z])|double.?check|go (?:through|over)(?![a-z])|' + words.READ_I18N.join('|'))
const CLOSELY = word(
  'bastan|tekrar|yeniden|bir daha|bir kez daha|dikkat|detayli|ayrintili|satir satir|tek tek|kelime kelime|iyice|ince ince|tamamini|again|carefully|thoroughly|closely|line by line|in detail|from the (?:top|start|beginning)|once more|whole|entire|every|' +
    words.CLOSELY_I18N.join('|'),
)
const TO_FIX = word(
  'duzelt|hata|eksik|sorun|tutarsiz|yanlis|detaylar|ayrintilar|kusur|fix|mistake|error|issue|problem|typo|inconsisten|wrong|correct|' +
    words.TO_FIX_I18N.join('|'),
)

// Asked to put right: "düzelt", "fix", "korrigiere", "исправь".
const FIX_VERB = word('duzelt|fix|correct|corrig|korrigier|beheb|arregl|исправ|修改|修正|改正|直し|直す|直して')
// Typos are a chore of their own (TRIVIAL), in the languages TRIVIAL does not read too.
const TYPO = word('typo|yazim|imla|faute(?:s)? de frappe|tippfehler|errata|опечат|错别字|誤字|タイプミス')

// The fix spelled out: a word in quotes, or "x -> y". A one-place change, not a read.
const NAMED_FIX = /["'“”«»„][^"'“”«»„\n]{1,40}["'“”«»„]|->|→/

// A text rather than a program: a README, the docs, a translation.
const DOC = word(
  'readme|docs?(?![a-z])|documentation|dokuman|dokumantasyon|belge(?:de|deki|yi|nin)?(?![a-z])|metin|metni|metindeki|yazi(?:si|daki|lar)|text(?![a-z])|cumle|paragraf|ceviri|translation|wording|changelog|' +
    words.DOC_I18N.join('|'),
)
// Faults named as such: "hatalar", "errors", "Fehler".
const ERRORS = word('hata|yanlis|error|mistake|fehler|erreur|faute|errores|ошибк|错误|错|間違|誤り')
// A program failing: then the fault is a bug, whatever text it is in.
const RUNTIME = word(
  'calismiyor|calismadi|kiriliyor|patliyor|crash|exception|fail|build|derle|compil|test|sayfa|page|ekran|screen|konsol|console|server|sunucu|api(?![a-z])|link',
)

// Work begun or carried out beside a chore or a question: "sırayı uygula, sonra
// commit et", "anlat ve sıradakine başla".
const WORK_GO = word('basla|baslat|uygula|implement|start (?:on|with|the)|begin|devam et|hallet|bitir|yap(?![a-z])|guncelle(?![a-z])|degistir(?![a-z])|kaldir(?![a-z])|apply|carry out|go ahead')

// Work to carry out beside a question cue: run, measure, install.
const RUN = word('calistir|olc(?![a-z])|olcum[a-z]* yap|test et|kur(?![a-z])|run(?![a-z])|measure|install|deploy|' + words.RUN_I18N.join('|'))

const CONVERSION = /(?:typescript|javascript|python|kotlin|swift|go(?:lang)?|rust|java)(?:'?[a-z]{0,3})?\s+(?:cevir|donustur)|convert[^.]{0,40}to (?:typescript|javascript|python)/

const TEST_WRITE = word(
  '(?:test|birim test|unit test|entegrasyon test|integration test)[a-z]*[^.?!]{0,40}(?:yaz|write|ekle|add|olustur|create)|(?:write|add|create)[^.?!]{0,30}tests?(?![a-z])|' +
    words.TEST_WRITE_I18N.join('|'),
)

// Tests meant to catch what nobody knows is broken yet: edge cases, a module's
// hidden bugs, thorough coverage. Tests for a feature just built are not this.
const TEST_HUNT = word(
  'edge.?cases?|uc durum|sinir durum|kenar durum|hata(?:lar)?(?:i|ini)? (?:yakala|bul)|hata(?:lari)? yakalayan|bug(?:s|lar)?(?:i)? (?:yakala|bul)|catch(?:es)? (?:bugs|edge)|find bugs|kirmaya calis|try to break|kapsamli|thorough|coverage',
)

// What makes a bug report clear: the error itself, where it happens, a number
// to go on, when it happens, what should happen instead. "bu çalışmıyor,
// düzelt" has none; "tarayıcı açıldığında konsolda hata veriyor" says when.
const EXPECTED = word('olmali|olmasi gerek|beklen|bekliyor|gerekiyor|yerine|expected|should|instead|supposed to|' + words.EXPECTED_I18N.join('|'))
const WHEN = new RegExp(
  '[a-z]{2,}(?:[iu]nca|[iu]nce|d[iu]g[iu]nd[ae]|t[iu]g[iu]nd[ae]|ken)(?![a-z])|(?:^|[^a-z])(?:when|whenever|after|while|once)(?![a-z])|' + words.WHEN_I18N,
)

// Past this length a report has room to say what is wrong, though it may not.
const VAGUE_LENGTH = 120

const DEBUG = word(
  'hata(?:si|yi)? (?:veriyor|aliyorum|cikiyor|firlatiyor|donuyor)|kiriliyor|patliyor|calismiyor|calismadi|bozuk|fail(?:s|ed|ing)?(?![a-z])|broken|exception|crash|[45]\\d\\d hatasi|error|not found|bulunamadi|bulunamiyor|' +
    words.DEBUG_I18N.join('|'),
)

// Something that should be on screen, or should happen, is not: "düğme
// görünmüyor", "pencere açılmadı", "it doesn't show".
const SYMPTOM = word(
  '(?:gorun|gozuk|cik|gel|acil|yuklen|kaydedil|degis|guncellen|tetiklen)(?:mi|mu)yor|(?:gorun|gozuk|cik|gel|acil|yuklen|kaydedil|degis|guncellen|tetiklen)(?:me|ma)(?:di|du)(?![a-z])|tepki vermiyor|yanit vermiyor|(?:does ?n.?t|does not|did ?n.?t|not) (?:show|appear|load|open|update|fire|trigger)',
)

const FRUSTRATION = cues([
  'olmadi(?![a-z])', 'olmuyor', 'hala (?:ayni|hata|calism|olm|bozuk)', 'yine (?:ayni|hata|olmadi|calism|bozuk)', 'tekrar hata',
  'calismiyor', 'calismadi', 'yanlis(?!likla)', 'bozuldu', 'bozdun', 'duzelmedi', 'ayni hata', 'anlamadin',
  'istedigim (?:bu|gibi) degil', 'istedigim (?:sey(?:i)? )?(?:bu degil|olmamis|olmadi)', 'istedigim gibi (?:olmamis|olmadi)',
  'yapmamissin', 'yanlis anla', 'anlamamissin', 'still', 'same error', 'doesn.?t work', 'does not work', 'didn.?t work',
  'not working', 'wrong', 'broken', 'that.?s not', 'not what i',
  ...words.FRUSTRATION_I18N,
])

// "o tuş çıkmadı yine", "hâlâ görünmüyor": it did not happen, again.
const AGAIN = /[a-z]{2,}(?:ma|me)(?:di|du) (?:yine|gene)(?![a-z])|(?:yine|gene|hala) [a-z]{2,}(?:ma|me)(?:di|du)(?![a-z])|hala [a-z]{2,}(?:mi|mu)yor/

const ACK = new RegExp(
  '^(?:evet|tamam|tamamdir|ok|okay|okey|olur|devam|peki|aynen|guzel|super|harika|tesekkur|sagol|eyvallah|uygula|yap|onayladim|onayliyorum|onaylandi|kabul|yes|yep|yeah|sure|go|continue|proceed|thanks|thank you|lgtm|' +
    `${words.ACK_LATIN})(?![a-z])|^(?:${words.ACK_CYRILLIC})(?![а-я])|^(?:${words.ACK_CJK})(?=\\s|$)`,
)

// A go-ahead's first word, when it is only that: "evet", "tamam", "ok".
const ACK_ONLY = /^(?:evet|tamam|tamamdir|ok|okay|okey|olur|peki|yes|yep|yeah|sure)(?![a-z])/

// The work in hand asked to go on: "devam", "uygula", "hallet", "continue".
const CARRY_ON = word('devam|uygula|hallet|bitir|tamamla|yap(?![a-z])|apply|continue|proceed|go on|go ahead|finish|do it|sigue|continua|adelante|hazlo|aplicalo|weiter|mach es|vas y|applique|продолжа|продолжи|давай|继续|接着|続けて|進めて')

// "sonraki iki bölümü de yap", "onu da yap", "kalanları da hallet": more of the
// work in hand, at its tier.
const MORE_OF_THE_SAME =
  /^(?:simdi |peki |tamam |o zaman )?(?:sonraki|kalan(?:lar)?(?:i|ini)?|geri kalan(?:lar)?(?:i|ini)?|diger(?:ler)?(?:i|ini)?|digerlerini|devami(?:ni)?|aynisini|bunu ?da|onu ?da|onlari ?da|hepsini)(?![a-z])[^.?!]{0,60}?(?:^|\s)(?:yap|et|hallet|bitir|tamamla|uygula|devam)(?:in|iver|ar misin|abilir misin)?(?![a-z])/

// A greeting and nothing else: "merhaba", "merhba", "selam", "hi".
const GREETING = new RegExp(
  '^(?:mer?h?a?b+a+|mrb|slm|selam(?:lar)?|selamun aleykum|gunaydin|iyi (?:gunler|aksamlar|geceler)|hey|hi|hello|naber|nasilsin|' +
    `${words.GREETING_I18N})(?:\\s+(?:claude|dostum|abi|hocam))?[\\s!.,?]*$`,
)

const ERROR_OUTPUT =
  /traceback \(most recent call last\)|\b\w*(?:error|exception)\b:|\berr!|^\s+at \S.*:\d+(?::\d+)?\)?\s*$|segmentation fault|panic:|exit code [1-9]|failed to compile|stack ?trace|uncaught|unhandled|\bhata:/im

const FILE =
  /(?:^|[\s(`'"@])[\w./\\-]*\w\.(?:tsx?|jsx?|mjs|cjs|py|go|rs|java|kt|cs|cpp|cc|c|h|hpp|rb|php|swift|json|ya?ml|toml|md|html|css|scss|sql|sh|ps1|vue|svelte)(?!\w)/gi

const LIST_ITEM = /^\s*(?:\d+[.)]|[-*•])\s+\S/gm

// Past this many characters a prompt describes work rather than names a small change.
const MID_LENGTH = 300

// A description of work: a few sentences, long enough to say what is wrong and what is wanted.
const DESCRIBED_LENGTH = 160

// A chore ("commit and push", "fix the typo") is asked for in a few words.
const CHORE_LENGTH = 100
const SENTENCE_END = /[.!?](?:\s|$)|[。！？]/g

// A count of things: "60 screens", "50 windows", "12 files". Two digits or more, not a year or a port.
const SCALE_NUMBER = /(?:^|[^0-9a-z.:])(?:[1-9][0-9]|[1-9][0-9]{2})(?![0-9:.a-z])/

const QUESTION_START = /^(?:ne|neden|nasil|hangi|nerede|kim|kac|what|why|how|which|where|who|is|are|can|does|do)(?![a-z])/

const ALIASES: Record<string, Override> = {
  haiku: { family: 'haiku' },
  sonnet: { family: 'sonnet' },
  opus: { family: 'opus' },
  fable: { family: 'fable' },
  low: { effort: 'low' },
  dusuk: { effort: 'low' },
  medium: { effort: 'medium' },
  orta: { effort: 'medium' },
  high: { effort: 'high' },
  yuksek: { effort: 'high' },
  xhigh: { effort: 'xhigh' },
  max: { effort: 'max' },
  t0: { tier: 0 },
  t1: { tier: 1 },
  t2: { tier: 2 },
  t3: { tier: 3 },
  t4: { tier: 4 },
  ucuz: { tier: 0 },
  cheap: { tier: 0 },
  derin: { tier: 4 },
  deep: { tier: 4 },
}

export type ParsedPrompt = { text: string; override?: Override; tokens: string[] }

// Takes leading `+opus +max +ucuz ...` tokens off a prompt: they pick the
// model, the effort or the tier for this prompt alone. A prompt whose leading
// token is unknown, or that holds nothing but tokens, is left as it is.
export function parseOverrides(text: string): ParsedPrompt {
  const lead = /^\s*((?:\+\S+\s+)+)/.exec(text)
  if (lead === null) {
    return { text, tokens: [] }
  }
  const tokens = (lead[1] ?? '').trim().split(/\s+/)
  let override: Override = {}
  for (const token of tokens) {
    const alias = ALIASES[normalize(token.slice(1))]
    if (alias === undefined) {
      return { text, tokens: [] }
    }
    override = { ...override, ...alias }
  }
  const rest = text.slice(lead[0].length)

  return rest.trim() === '' ? { text, tokens: [] } : { text: rest, override, tokens }
}

// The words of a prompt with the punctuation gone: Latin letters and digits,
// and the letters of the scripts the cues read.
const plainText = (text: string): string =>
  text
    .replace(/[^a-z0-9\sЀ-ӿ぀-ヿ㐀-鿿가-힯]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// "evet, devam" carries the last tier on; "tamam ama testleri de yaz" asks for new work.
function isFollowup(text: string): boolean {
  const plain = plainText(text)
  const asksMore = found(FEATURE, plain).length > 0 || found(HARD, plain).length > 0 || TEST_WRITE.test(plain)

  return plain.length <= 40 && ACK.test(plain) && !asksMore
}

const wordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length

// Code, a path or an identifier anywhere in the prompt: prose() takes them out.
const hasCode = (raw: string): boolean => wordCount(prose(raw)) !== wordCount(raw)

function countFiles(raw: string): number {
  return new Set((raw.match(FILE) ?? []).map(name => name.trim().replace(/^[(`'"@]/, '').toLowerCase())).size
}

const quote = (words: readonly string[]): string =>
  words
    .slice(0, 3)
    .map(item => `"${item}"`)
    .join(', ')

// The rules read Turkish and English. A prompt in another language is told by
// a script they do not read, or by three words or more with none of the small
// words and common verbs of either; Turkish letters (ı, ğ, ş) settle it as
// Turkish. A wrong "foreign" costs one short question to Haiku, no more.
const NON_LATIN = /[Ѐ-ӿ֐-ۿऀ-ॿ぀-ヿ㐀-鿿가-힯]/
const TURKISH_LETTERS = /[ıİğĞşŞ]/
const TURKISH_OR_ENGLISH = new RegExp(
  '(?:^|[^a-zçğıöşü])(?:' +
    'bu|bir|için|icin|ile|ve|şu|var|yok|mı|mi|mu|mü|değil|gibi|ama|çok|neden|nasıl|olarak|sonra|daha|evet|tamam|hayır|hayir|lütfen|lutfen|bunu|buna|bunun|bunlar|şunu|onu|ona|bana|sana|beni|benim|senin|lazım|lazim|hâlâ|hala|kez|defa|olmuyor|oldu|olsun|' +
    'yap|ekle|yaz|sil|göster|getir|çıkar|düzelt|değiştir|kaldır|taşı|listele|geçir|yükselt|' +
    'the|and|this|that|with|what|why|how|is|are|it|its|to|for|of|my|our|we|you|all|from|into|when|still|again|please|should|now|too|go|yes|' +
    'add|fix|make|write|show|move|remove|suggest|support|feature|message' +
    ')(?![a-zçğıöşü])',
  'i',
)

// A message's language, as far as a shared report needs it: Turkish, English,
// or the script it is written in. Never the words.
export function languageOf(raw: string): string {
  const text = withoutNotes(raw)
  if (/[぀-ヿ]/.test(text)) {
    return 'ja'
  }
  if (/[가-힯]/.test(text)) {
    return 'ko'
  }
  if (/[㐀-鿿]/.test(text)) {
    return 'zh'
  }
  if (/[Ѐ-ӿ]/.test(text)) {
    return 'ru'
  }
  if (!isTurkishOrEnglish(text)) {
    return 'other'
  }

  return TURKISH_LETTERS.test(text) || TURKISH_ONLY.test(text) ? 'tr' : 'en'
}

const TURKISH_ONLY = new RegExp(
  '(?:^|[^a-zçğıöşü])(?:bu|bir|için|icin|ile|ve|var|yok|mı|mi|mu|mü|değil|gibi|ama|çok|neden|nasıl|olarak|sonra|daha|evet|tamam|yap|ekle|yaz|sil|göster|düzelt|değiştir|bunu|bana|lazım)(?![a-zçğıöşü])',
  'i',
)

export function isTurkishOrEnglish(raw: string): boolean {
  const text = withoutNotes(raw)
  if (NON_LATIN.test(text)) {
    return false
  }

  return text.split(/\s+/).filter(Boolean).length < 3 || TURKISH_LETTERS.test(text) || TURKISH_OR_ENGLISH.test(text)
}

// What the rules read the same in any language: the keyword, pasted errors,
// file names, a long or listed description.
const STRUCTURAL = /^(?:"ultrathink"|hata çıktısı|\d+ dosya|\d+ maddelik liste|uzun istek)/

export function classify(raw: string, context: RuleContext = {}): RuleResult {
  const read = classifyText(raw, context)
  // In a language the rules do not read, their sure answer rests on words
  // they happened to match (a "panel", a "rol"): Haiku, who reads every
  // language, is asked, and the rules' tier stands only as its floor.
  const result =
    read.confidence === 'high' && read.source === 'rules' && read.kind !== 'greeting' && !STRUCTURAL.test(read.reasons[0] ?? '') && !isTurkishOrEnglish(raw)
      ? { ...read, confidence: 'low' as const, reasons: [...read.reasons, "Türkçe ya da İngilizce değil: Haiku'ya sorulur"] }
      : read
  if (context.hasAttachments === true && result.tier < 1) {
    return { ...result, tier: 1, reasons: [...result.reasons, 'görsel/ek var'] }
  }

  return result
}

const hunt = (result: RuleResult, kind: Hunt = 'located'): RuleResult => ({ ...result, hunt: kind })

function classifyText(raw: string, { prevTier, frustrationStreak = 0, hasAttachments = false }: RuleContext): RuleResult {
  const text = normalize(prose(raw))
  const length = weight(raw.trim())
  const rule = (
    tier: number,
    confidence: RuleResult['confidence'],
    reasons: string[],
    kind: RuleKind = 'work',
    source: RuleSource = 'rules',
  ): RuleResult => ({
    tier: toTier(tier),
    confidence,
    source,
    kind,
    reasons,
  })

  if (/(?:^|[^a-z])ultrathink/.test(normalize(raw))) {
    return rule(4, 'high', ['"ultrathink"'])
  }
  const plain = plainText(text)
  if (GREETING.test(plain)) {
    return rule(0, 'high', ['selamlaşma'], 'greeting')
  }
  // "devam", "sonraki adımı uygula" after a push or a question: the work it
  // goes on with is not the trivial prompt before it, and its size is not
  // known. Haiku is asked, and no lower than T1.
  const goOnAfterTrivial = (): RuleResult => ({ ...rule(1, 'low', ['önemsiz bir mesajdan sonra devam']), floor: 1 })
  const complaint = length <= 400 ? [...found(FRUSTRATION, text), ...(AGAIN.test(text) ? ['yine olmadı'] : [])] : []
  if (prevTier !== undefined && length <= 400) {
    if (complaint.length > 0) {
      const bump = frustrationStreak >= 1 ? 2 : 1

      return rule(prevTier + bump, 'high', [`şikâyet ${quote(complaint)}: +${bump} kademe`], 'complaint', 'escalate')
    }
    if (isFollowup(text)) {
      // "Evet, pushla.": the go-ahead names a chore and nothing more of the work.
      const chores = found(TRIVIAL, plain)
      const left = TRIVIAL.reduce((rest, cue) => rest.replace(new RegExp(cue.pattern.source, 'g'), ' '), plain.replace(ACK, ' '))
      if (chores.length > 0 && found(CHANGE, left).length === 0 && found(ADD, left).length === 0 && !CARRY_ON.test(left)) {
        return rule(0, 'high', [`basit iş: ${quote(chores)}`], 'chore')
      }

      if (prevTier === 0 && CARRY_ON.test(plain.replace(ACK_ONLY, ' '))) {
        return goOnAfterTrivial()
      }

      return rule(prevTier, 'high', ['kısa onay: önceki kademe'], 'followup', 'inherit')
    }
    if (MORE_OF_THE_SAME.test(plain) && found(HARD, plain).length === 0 && found(FEATURE, plain).length === 0) {
      return prevTier === 0 ? goOnAfterTrivial() : rule(prevTier, 'high', ['aynı işin devamı: önceki kademe'], 'followup', 'inherit')
    }
  }

  const trivial = found(TRIVIAL, text)
  // A trivial phrase's own verb ("yorum ekle") is no sign of other work.
  const rest = TRIVIAL.reduce((left, cue) => left.replace(new RegExp(cue.pattern.source, 'g'), ' '), text)
  const hard = found(HARD, rest)
  const maybeHard = [...found(MAYBE_HARD, rest), ...(SHOULD.test(rest) ? ['-malı'] : [])]
  const feature = found(FEATURE, rest)
  const adds = found(ADD, rest)
  const changes = found(CHANGE, rest)
  const small = found(SMALL, rest)
  const question = found(QUESTION, rest)
  const hasError = ERROR_OUTPUT.test(raw)
  const files = countFiles(raw)
  const items = raw.match(LIST_ITEM)?.length ?? 0
  const parts = (rest.match(/,/g)?.length ?? 0) + (rest.match(words.JOINERS)?.length ?? 0)
  const isLong = length > 1200
  const isShort = length <= 200
  // "rengini maviden yeşile çevir", "timeout 30'dan 60'a", "add the migration file":
  // a value or a database migration, no move from one stack to another.
  const isMigration =
    (MIGRATION.test(rest) || words.MIGRATION_I18N.test(rest) || words.MOVE_FROM_TO.test(rest)) && small.length === 0 && !VALUE_CHANGE.test(rest) && !DB_MIGRATION.test(rest)
  const isWide = isLong || files >= 3

  // T4: long, many-sided work, or work that has already failed again and again.
  const lasting = rest.split(/[.!?\n。！？]/).flatMap(sentence => (STRUGGLE.test(sentence) ? found(DURATION, sentence) : []))
  const again = [...found(REPEATED_FAILURE, rest), ...lasting]
  if (again.length > 0) {
    return rule(4, 'high', [`tekrarlayan başarısızlık: ${quote(again)}`])
  }
  if ((isMigration && WHOLE.test(rest)) || words.MOVE_WHOLE.test(rest)) {
    return rule(4, 'high', ['bütün uygulamanın taşınması'])
  }
  const scope = found(SCOPE, rest)
  if (scope.length > 0 && parts >= 2 && (feature.length > 0 || adds.length > 0)) {
    // Sure, it sent hard work that is not long or many-sided to T4 (3 of 11
    // labelled prompts): Haiku is asked, no lower than T3.
    return { ...rule(4, 'low', [`kapsamlı iş: ${quote(scope)}, ${parts + 1} parça`]), floor: 3 }
  }
  if (parts >= 3 && feature.length >= 3 && adds.length > 0) {
    // The words of one feature count apart ("page", "pagination", "endpoint"):
    // sure, this rule was right on 2 of 7 labelled prompts. Haiku is asked.
    return { ...rule(4, 'low', [`çok parçalı özellik: ${quote(feature)}`]), floor: 2 }
  }
  if (hard.length + maybeHard.length >= 3 && isWide) {
    return rule(4, 'high', [`çok sayıda zor sinyali: ${quote([...hard, ...maybeHard])}`, 'kapsamlı istek'])
  }

  // T3: hard work, decisions, hunts for a cause.
  if (hard.length > 0) {
    const result = rule(3, 'high', [`zor iş: ${quote(hard)}`])

    return found(ELUSIVE, rest).length > 0 ? hunt(result) : result
  }
  if (PLANNING.test(rest)) {
    return rule(3, 'high', ['plan istemek'])
  }
  const agentic = found(AGENTIC, rest)
  if (agentic.length > 0) {
    return rule(3, 'high', [`uzun, çok adımlı iş: ${quote(agentic)}`])
  }
  if (PREVENT.test(rest)) {
    return rule(3, 'high', ['bir sorunu önleme ya da ele alma sorusu'])
  }
  if (DECISION.test(rest) || SHOULD_WE.test(rest)) {
    return rule(3, 'high', ['seçenekler arasında karar'])
  }
  if (WHY.test(rest) && (HUNT.test(rest) || FAILURE.test(rest))) {
    const result = rule(3, 'high', ['bir hatanın sebebini bulmak'])

    return FAILURE.test(rest) ? hunt(result) : result
  }
  if (isMigration) {
    return rule(3, 'high', ['bir yapıdan diğerine geçiş'])
  }
  if (COUNTED_FILES.test(rest) && (adds.length + changes.length > 0 || REPLACE.test(rest))) {
    return { ...rule(3, 'low', ['çok dosyaya yayılan iş']), floor: 2 }
  }
  if (maybeHard.length >= 2 || (maybeHard.length === 1 && (hasError || isWide))) {
    return rule(3, 'high', [`zor sinyalleri: ${quote(maybeHard)}`])
  }
  if (DESIGN.test(rest) && SYSTEM.test(rest)) {
    return rule(3, 'high', ['bir sistem tasarlamak'])
  }
  if (MONEY.test(rest) && INTEGRATION.test(rest)) {
    return rule(3, 'high', ['ödeme entegrasyonu'])
  }
  if (scope.length > 0 && (feature.length > 0 || adds.length > 0)) {
    return rule(3, 'high', [`kapsamlı iş: ${quote(scope)}`])
  }
  if (TEST_WRITE.test(rest) && TEST_HUNT.test(rest)) {
    return hunt(rule(3, 'high', ['hata yakalayan test yazmak']))
  }

  // T2: debugging with an error in hand, and writing tests.
  // A review: a review word, a read asked for closely with something to fix, or a text read and put right.
  const isReview =
    (REVIEW.test(rest) && !(feature.length > 0 && adds.length > 0)) ||
    (READ.test(rest) && TO_FIX.test(rest) && (CLOSELY.test(rest) || DOC.test(rest) || DOC_FILE.test(raw)))
  if (hasError) {
    return rule(2, 'high', ['hata çıktısı'])
  }
  // "fix the errors in the README", "README'deki hataları düzelt": faults in a
  // text, which a read finds; no program is failing, so no hunt.
  if (DOC.test(rest) && FIX_VERB.test(rest) && ERRORS.test(rest) && !TYPO.test(rest) && !RUNTIME.test(rest) && !hasError && files === 0 && !NAMED_FIX.test(raw)) {
    return { ...rule(2, 'low', ['metindeki hataları düzeltmek']), floor: isReview ? 2 : 1 }
  }
  if (DEBUG.test(rest.replace(words.ERROR_MESSAGE_PHRASE, ' '))) {
    // "bu çalışmıyor, düzelt": no error, no place, no number, nothing said of
    // what should happen. A screenshot may say it all, so one beside it is not this.
    const isVague =
      files === 0 && !hasCode(raw) && !/\d/.test(rest) && !EXPECTED.test(rest) && !WHEN.test(rest) && length <= VAGUE_LENGTH && !hasAttachments

    return isVague ? hunt(rule(3, 'high', ['belirsiz anlatılmış hata']), 'vague') : rule(2, 'high', ['hata ayıklama'])
  }
  if (SYMPTOM.test(rest)) {
    return rule(2, 'high', ['bir şey olması gerektiği gibi olmuyor'])
  }
  // A complaint whose earlier turn autogear did not see (a restart since):
  // something is broken, so it is debugging.
  if (complaint.length > 0) {
    return rule(2, 'high', [`şikâyet ${quote(complaint)}`], 'complaint')
  }
  if (TEST_WRITE.test(rest)) {
    return rule(2, 'high', ['test yazmak'])
  }
  // A review of written work, a chore's words in it or not ("baştan oku, yazım
  // hatalarını düzelt"): no less than T2. A feature named with its verb ("add a
  // review form") is the feature's.
  if (isReview) {
    return { ...rule(2, 'low', ['dikkatli okuma ve düzeltme']), floor: 2 }
  }

  // T0: questions about code in view, and chores. A chore is asked for in a
  // few words: "commit" or "typo" inside a long description is part of it.
  const isMoreWork = WORK_GO.test(rest) || RUN.test(rest)
  if (length <= CHORE_LENGTH && trivial.length > 0 && (COMMIT_FIRST.test(text) || ((feature.length === 0 || adds.length === 0) && !isMoreWork))) {
    return rule(0, 'high', [`basit iş: ${quote(trivial)}`], 'chore')
  }
  if (isShort && LIST.test(rest) && INFO.test(rest) && feature.length === 0) {
    return rule(0, 'high', ['bilgi listeleme'], 'question')
  }
  // "sürümü artır, kurulu kopyayı güncelle, nasıl deneyeceğimi anlat": work
  // asked for first, the "anlat" only says how to report it. No question then.
  if (isShort && question.length > 0 && adds.length === 0 && changes.length === 0 && !RUN.test(rest) && !WORK_GO.test(rest)) {
    return rule(0, 'high', [`soru: ${quote(question)}`], 'question')
  }

  // A long account of several sentences that gives a number of things (screens,
  // files, devices) or says what to do first and what next is a big, many-sided
  // job in any language, whatever its words. The rules are not sure of it.
  const sentences = raw.match(SENTENCE_END)?.length ?? 0
  const isCounted = SCALE_NUMBER.test(rest)
  const isSequenced = words.SEQUENCE.test(rest)
  if (length > DESCRIBED_LENGTH && sentences >= 2 && ((isCounted && isSequenced) || (sentences >= 3 && length > MID_LENGTH && (isCounted || isSequenced)))) {
    return rule(3, 'low', ['uzun, çok cümleli iş tarifi'], 'work')
  }

  // T2: features, conversions, wide requests.
  if (maybeHard.length === 1) {
    if (INVESTIGATE.test(rest)) {
      return { ...rule(2, 'low', [`inceleme isteği: ${quote(maybeHard)}`]), floor: 2 }
    }

    return rule(2, 'low', [`tek zor sinyali: ${quote(maybeHard)}`])
  }
  if (CONVERSION.test(rest)) {
    return rule(2, 'high', ['kodu başka bir dile çevirmek'])
  }
  if (isWide || items >= 4) {
    return rule(2, 'high', [isLong ? 'uzun istek' : files >= 3 ? `${files} dosya` : `${items} maddelik liste`])
  }
  if (feature.length > 0 && (small.length === 0 || feature.length >= 2) && (adds.length > 0 || changes.length === 0)) {
    return rule(2, 'high', [`özellik: ${quote(feature)}`])
  }

  // A description of work longer than a few sentences is no small change, whatever its words.
  if (length > MID_LENGTH) {
    return rule(2, 'low', ['uzun bir iş tarifi'], adds.length + changes.length + small.length > 0 ? 'work' : 'none')
  }

  // T1: small, clearly specified changes. Sending hard work to a weak model
  // costs more than a second opinion, so the rules are sure of T1 only when a
  // short prompt names both the thing and the change ("rengini kırmızı yap").
  if (small.length > 0 || changes.length > 0) {
    const isClear = small.length > 0 && changes.length > 0 && length <= 120

    return rule(1, isClear ? 'high' : 'low', [`küçük değişiklik: ${quote([...small, ...changes])}`])
  }
  if (adds.length > 0) {
    return rule(1, 'low', [`iş: ${quote(adds)}`])
  }
  if (RUN.test(rest)) {
    return rule(1, 'low', ['iş: çalıştırmak ya da ölçmek'])
  }
  if (isShort && (/\?\s*$/.test(raw.trim()) || QUESTION_START.test(text) || question.length > 0)) {
    return rule(1, 'low', ['soru'], 'question')
  }

  return rule(1, 'low', ['belirgin sinyal yok'], 'none')
}

// "bu görevi sonnet'e max ile ver", "opus ile yap", "opus, sen de bir bak": a
// model asked for by name, in words. Talk about a model is no request: past
// tense ("haiku ile yaptı") and opinions ("opus pahalı") name no verb here.
const REQUEST_VERB =
  '(?:ver(?:ir misin|ebilir misin|sene|in|iver)?|gec(?:ir|elim|ebilir misin|in)?|kullan(?:arak|ir misin|abilir misin|in|sana)?|yap(?:ar misin|abilir misin|sana|sin|in|iver)?|bak(?:ar misin|abilir misin|sana|sin|in)?|incele(?:r misin|yebilir misin|sin|yin)?|devam(?: et)?|hallet|ustlen|sen ?de|use|switch to)(?![a-z])'
const NAMED_FAMILY = new RegExp(
  String.raw`(?:^|[^a-z])(haiku|sonnet|opus|fable)(?:'?(?:ye|ya|e|a|yle|yla|le|la))?(?:\s+ile)?,?(?=\s+(?:[a-z]+\s+){0,2}?` + `${REQUEST_VERB})`,
  'g',
)
const NAMED_EFFORT: readonly [RegExp, Effort][] = [
  [/(?:^|[^a-z])(?:max|maks|maksimum|en yuksek)(?:'?(?:a|e|ta|te|la|le|ile))?(?![a-z])/, 'max'],
  [/(?:^|[^a-z])xhigh(?![a-z])/, 'xhigh'],
  [/(?:^|[^a-z])yuksek (?:efor|effort)/, 'high'],
  [/(?:^|[^a-z])(?:dusuk|low) (?:efor|effort)/, 'low'],
]
const EFFORT_ALONE = /(?:^|[^a-z])(max|maks(?:imum)?|en yuksek|xhigh|yuksek|dusuk|orta) (?:efor|effort)(?:la|le|da|de|ile)?(?![a-z])/

// "use opus", "switch to sonnet": the English order, the verb first.
const NAMED_FAMILY_EN = /(?:^|[^a-z])(?:use|switch to|go with) (haiku|sonnet|opus|fable)(?![a-z])/g

export type NamedChoice = { override: Override; words: string[] }

export function namedChoice(raw: string): NamedChoice | undefined {
  const text = normalize(prose(raw))
  const families = [...text.matchAll(NAMED_FAMILY), ...text.matchAll(NAMED_FAMILY_EN)].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  const last = families.at(-1)
  const family = FAMILY_WORDS.find(one => one === last?.[1])
  if (last !== undefined && family !== undefined) {
    const near = text.slice(last.index ?? 0, (last.index ?? 0) + 60)
    const effort = NAMED_EFFORT.find(([pattern]) => pattern.test(near))?.[1]

    return { override: effort === undefined ? { family } : { family, effort }, words: [family, ...(effort === undefined ? [] : [effort])] }
  }
  const alone = EFFORT_ALONE.exec(text)
  if (alone !== null) {
    const word = alone[1] ?? ''
    const effort: Effort = /max|maks|en yuksek/.test(word) ? 'max' : word === 'xhigh' ? 'xhigh' : word === 'yuksek' ? 'high' : word === 'orta' ? 'medium' : 'low'

    return { override: { effort }, words: [`${effort} efor`] }
  }

  return undefined
}

const FAMILY_WORDS: readonly Family[] = ['haiku', 'sonnet', 'opus', 'fable']
