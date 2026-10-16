// Reads a prompt and guesses how much model it needs: a tier from 0 (trivial)
// to 4 (critical), the reasons, and whether the rules are sure of it.

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
  // A hunt: a bug described without detail or whose cause hides (it comes and
  // goes, it shows far from where it starts), or tests written to catch bugs
  // nobody has found yet. Strong models need more effort on these, not less.
  isHunt?: true
}

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

// Lowercases and folds Turkish letters, so "Çalışmıyor" and "calismiyor" read alike.
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/̇/g, '')
    .replace(/[çğıöşüâîû]/g, letter => FOLD[letter] ?? letter)
}

// A token that is code, a path or an identifier, not words: `add(a, b)`,
// `server.js`, `./utils/date`, `MAX_RETRIES`, `user_id`.
const CODE_TOKEN = /[(){};=<>]|^[.~/\\]|\w\.\w|^[A-Z0-9]+_[A-Z0-9_]+$|^[a-z0-9]+(?:_[a-z0-9]+)+$/i

const EDGE_PUNCTUATION = /^["'“”‘’([]+|["'“”‘’)\],.:;!?]+$/g

// The prompt's prose: code and names in it carry words ("add", "test",
// "DATABASE") that say nothing about how hard the work is.
export function prose(raw: string): string {
  return raw
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
  return [...new Set(words)].map(word => ({ word, pattern: new RegExp(`(?:^|[^a-z0-9])(?:${word})`) }))
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

const word = (source: string): RegExp => new RegExp(`(?:^|[^a-z0-9])(?:${source})`)

// Failures whose cause has to be hunted down: they come and go, lock up, leak,
// or show far from where they start.
const ELUSIVE_WORDS = [
  'race condition', 'deadlock', 'kilitlen', 'memory leak', 'sizinti',
  'kok neden', 'root cause', 'bazen', 'rastgele', 'ara sira', 'arada bir', 'sometimes', 'randomly', 'intermittent',
  'flaky', 'donuyor', 'cokuyor', 'takiliyor', 'tutarsiz', 'inconsistent',
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
  ...ELUSIVE_WORDS,
])

// Hard only beside another sign: "neden" may be a quick question or a hunt.
const MAYBE_HARD = cues([
  'neden', 'niye', 'nicin', 'sebep', 'sebeb', 'why', 'tasarla', 'tasarim', 'design', 'analiz', 'analy', 'karsilastir',
  'compar', 'strateji', 'strateg', 'degerlendir', 'evaluat', 'avantaj', 'dezavantaj', 'artilari', 'eksileri',
  'pros and cons', 'trade.?off', 'arastir', 'investigat', 'incele', 'nasil calisiyor', 'how does', 'kapsamli',
  'derinlemesine', 'in depth', 'deep dive', 'yol haritasi', 'roadmap', 'yetkilendirme', 'authoriz', 'kimlik dogrula',
  'authenticat', 'should i', 'alternatif', 'alternative', 'baska (?:bir )?yol', 'another way',
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
  'plan (?:yap|cikar|hazirla|olustur|kur)|planla(?!n)|yol haritasi|roadmap|nasil (?:yapalim|ilerleyelim|ilerlemeliyiz)|adim adim (?:plan|yol haritasi)|(?:make|write|draft|propose) (?:a |an )?(?:plan|implementation plan)|plan (?:out|for|the|how)(?![a-z])|how should we (?:approach|do|implement|build|structure|tackle)',
)

// Asking for a look into something: work of its own, which Haiku may not call trivial.
const INVESTIGATE = word('incele|arastir|investigat|look into')

// A choice between options: "Redux mı Zustand mı", "geçmeli miyiz".
const DECISION = word('[a-z]+ mi [a-z]+ mi(?![a-z])|should we|which (?:one )?(?:is|would be) better|hangisi daha|versus|vs\\.?(?![a-z])')

const WHY = word('neden|niye|nicin|sebep|sebeb|why')
const HUNT = word('bul|find|figure out|arastir|investigat|incele|tespit|anla|understand|debug')
const FAILURE = word('hata|error|fail|crash|cok|don|takil|bozul|broken|yanlis|wrong|duplicate|cift|iki kez|twice|kayb|lost|null|undefined|yavas|slow')

// "X'ten Y'ye taşı/geçir", "migrate ... from X to Y".
const MIGRATION = new RegExp(
  "'?(?:ten|tan|den|dan)\\s+[^,.;]{0,40}?'?(?:ye|ya|e|a)\\s+(?:gec|tasi|cevir|donustur|aktar)|(?:migrat|convert|rewrite)[^.]{0,60}from [^.]{1,40} to |(?:^|[^a-z])migrat",
)
const WHOLE = word('uygulama(?:yi|nin)?(?![a-z])|tum|butun|proje(?:yi|nin)?(?![a-z])|codebase|whole|entire|the app(?![a-z])|our app|her sey')

const REPEATED_FAILURE = cues([
  '(?:gun|hafta|ay|saat)(?:ler|lar)?d[iu]r(?![a-z])', 'gundur', 'defalarca', 'kac (?:kere|defa|kez)', 'her denemede',
  'her seferinde', 'bir turlu', 'tekrar tekrar', 'hicbir sey ise yaramadi', 'her yer bozul', 'again and again',
  'for days', 'for hours', 'keeps? (?:failing|breaking)', 'nothing works', 'tried everything',
])

const SCOPE = cues([
  'complete', 'full(?:-| )?(?:stack|featured)', 'entire', 'whole', 'bastan sona', 'sifirdan', 'eksiksiz', 'komple',
  'from scratch', 'end.to.end', 'uctan uca',
])

const DESIGN = word('tasarla|design|architect|planla|kurgula')
const SYSTEM = word('sistem|system|sema|schema|veritaban|database|mimari|architecture|api|yapi|altyapi|infrastructure|servis|service')
const MONEY = word('odeme|payment|stripe|iyzico|paypal|fatura|billing')
const INTEGRATION = word('entegr|integrat|webhook')

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
])

const ADD = cues([
  'ekle', 'add(?:s|ed|ing)?(?![a-z])', 'olustur', 'create', 'implement', 'build', 'gelistir', 'develop', 'yaz(?![a-z])',
  'yaz[ai]', 'write', 'entegre', 'integrate', 'destekle', 'goster', 'display',
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
])

// Questions about code already in view.
const QUESTION = cues([
  'ne yapiyor', 'ne ise yariyor', 'nedir', 'ne demek', 'ne anlama gel', 'acikla(?:r mi|yabilir|yin)?(?![a-z])',
  'anlat(?:ir mi|abilir|in)?(?![a-z])', 'ozetle', 'ozet(?![a-z])', 'ne degisti',
  'hangi dosya', 'nerede', 'kac tane', 'what does', 'what is', 'what.?s', 'explain', 'summari[sz]', 'how many',
  'where is', 'which file', 'what changed',
])

const LIST = word('listele|goster|show|list(?![a-z])|neler var|ne var')
const INFO = word(
  'dosya|file|klasor|folder|dizin|director|script|todo|yorum|comment|log(?![a-z])|loglar|degisiklik|diff|commit|branch|bagimlilik|dependenc|paket|package|route|fonksiyon|function|sinif|class',
)

const CONVERSION = /(?:typescript|javascript|python|kotlin|swift|go(?:lang)?|rust|java)(?:'?[a-z]{0,3})?\s+(?:cevir|donustur)|convert[^.]{0,40}to (?:typescript|javascript|python)/

const TEST_WRITE = word(
  '(?:test|birim test|unit test|entegrasyon test|integration test)[a-z]*[^.?!]{0,40}(?:yaz|write|ekle|add|olustur|create)|(?:write|add|create)[^.?!]{0,30}tests?(?![a-z])',
)

// Tests meant to catch what nobody knows is broken yet: edge cases, a module's
// hidden bugs, thorough coverage. Tests for a feature just built are not this.
const TEST_HUNT = word(
  'edge.?cases?|uc durum|sinir durum|kenar durum|hata(?:lar)?(?:i|ini)? (?:yakala|bul)|hata(?:lari)? yakalayan|bug(?:s|lar)?(?:i)? (?:yakala|bul)|catch(?:es)? (?:bugs|edge)|find bugs|kirmaya calis|try to break|kapsamli|thorough|coverage',
)

// What makes a bug report clear: the error itself, where it happens, a number
// to go on, when it happens, what should happen instead. "bu çalışmıyor,
// düzelt" has none; "tarayıcı açıldığında konsolda hata veriyor" says when.
const EXPECTED = word('olmali|olmasi gerek|beklen|bekliyor|gerekiyor|yerine|expected|should|instead|supposed to')
const WHEN = /[a-z]{2,}(?:[iu]nca|[iu]nce|d[iu]g[iu]nd[ae]|t[iu]g[iu]nd[ae]|ken)(?![a-z])|(?:^|[^a-z])(?:when|whenever|after|while|once)(?![a-z])/

// Past this length a report has room to say what is wrong, though it may not.
const VAGUE_LENGTH = 120

const DEBUG = word(
  'hata(?:si|yi)? (?:veriyor|aliyorum|cikiyor|firlatiyor|donuyor)|kiriliyor|patliyor|calismiyor|calismadi|bozuk|fail(?:s|ed|ing)?(?![a-z])|broken|exception|crash|[45]\\d\\d hatasi|error',
)

// Something that should be on screen, or should happen, is not: "düğme
// görünmüyor", "pencere açılmadı", "it doesn't show".
const SYMPTOM = word(
  '(?:gorun|gozuk|cik|gel|acil|yuklen|kaydedil|degis|guncellen|tetiklen)(?:mi|mu)yor|(?:gorun|gozuk|cik|gel|acil|yuklen|kaydedil|degis|guncellen|tetiklen)(?:me|ma)(?:di|du)(?![a-z])|tepki vermiyor|yanit vermiyor|(?:does ?n.?t|does not|did ?n.?t|not) (?:show|appear|load|open|update|fire|trigger)',
)

const FRUSTRATION = cues([
  'olmadi', 'olmuyor', 'hala (?:ayni|hata|calism|olm|bozuk)', 'yine (?:ayni|hata|olmadi|calism|bozuk)', 'tekrar hata',
  'calismiyor', 'calismadi', 'yanlis', 'bozuldu', 'bozdun', 'duzelmedi', 'ayni hata', 'anlamadin',
  'istedigim (?:bu|gibi) degil', 'istedigim (?:sey(?:i)? )?(?:bu degil|olmamis|olmadi)', 'istedigim gibi (?:olmamis|olmadi)',
  'yapmamissin', 'yanlis anla', 'anlamamissin', 'still', 'same error', 'doesn.?t work', 'does not work', 'didn.?t work',
  'not working', 'wrong', 'broken', 'that.?s not', 'not what i',
])

// "o tuş çıkmadı yine", "hâlâ görünmüyor": it did not happen, again.
const AGAIN = /[a-z]{2,}(?:ma|me)(?:di|du) (?:yine|gene)(?![a-z])|(?:yine|gene|hala) [a-z]{2,}(?:ma|me)(?:di|du)(?![a-z])|hala [a-z]{2,}(?:mi|mu)yor/

const ACK =
  /^(?:evet|tamam|tamamdir|ok|okay|okey|olur|devam|peki|aynen|guzel|super|harika|tesekkur|sagol|eyvallah|uygula|yap|onayladim|onayliyorum|onaylandi|kabul|yes|yep|yeah|sure|go|continue|proceed|thanks|thank you|lgtm)(?![a-z])/

// "sonraki iki bölümü de yap", "onu da yap", "kalanları da hallet": more of the
// work in hand, at its tier.
const MORE_OF_THE_SAME =
  /^(?:simdi |peki |tamam |o zaman )?(?:sonraki|kalan(?:lar)?(?:i|ini)?|geri kalan(?:lar)?(?:i|ini)?|diger(?:ler)?(?:i|ini)?|digerlerini|devami(?:ni)?|aynisini|bunu ?da|onu ?da|onlari ?da|hepsini)(?![a-z])[^.?!]{0,60}?(?:^|\s)(?:yap|et|hallet|bitir|tamamla|uygula|devam)(?:in|iver|ar misin|abilir misin)?(?![a-z])/

// A greeting and nothing else: "merhaba", "merhba", "selam", "hi".
const GREETING =
  /^(?:mer?h?a?b+a+|mrb|slm|selam(?:lar)?|selamun aleykum|gunaydin|iyi (?:gunler|aksamlar|geceler)|hey|hi|hello|naber|nasilsin)(?:\s+(?:claude|dostum|abi|hocam))?[\s!.,?]*$/

const ERROR_OUTPUT =
  /traceback \(most recent call last\)|\b\w*(?:error|exception)\b:|\berr!|^\s+at \S.*:\d+(?::\d+)?\)?\s*$|segmentation fault|panic:|exit code [1-9]|failed to compile|stack ?trace|uncaught|unhandled|\bhata:/im

const FILE =
  /(?:^|[\s(`'"@])[\w./\\-]*\w\.(?:tsx?|jsx?|mjs|cjs|py|go|rs|java|kt|cs|cpp|cc|c|h|hpp|rb|php|swift|json|ya?ml|toml|md|html|css|scss|sql|sh|ps1|vue|svelte)(?!\w)/gi

const LIST_ITEM = /^\s*(?:\d+[.)]|[-*•])\s+\S/gm

// Past this many characters a prompt describes work rather than names a small change.
const MID_LENGTH = 300

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

// "evet, devam" carries the last tier on; "tamam ama testleri de yaz" asks for new work.
function isFollowup(text: string): boolean {
  const plain = text.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
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

export function classify(raw: string, context: RuleContext = {}): RuleResult {
  const result = classifyText(raw, context)
  if (context.hasAttachments === true && result.tier < 1) {
    return { ...result, tier: 1, reasons: [...result.reasons, 'görsel/ek var'] }
  }

  return result
}

const hunt = (result: RuleResult): RuleResult => ({ ...result, isHunt: true })

function classifyText(raw: string, { prevTier, frustrationStreak = 0, hasAttachments = false }: RuleContext): RuleResult {
  const text = normalize(prose(raw))
  const length = raw.trim().length
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
  const plain = text.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  if (GREETING.test(plain)) {
    return rule(0, 'high', ['selamlaşma'], 'greeting')
  }
  const complaint = length <= 400 ? [...found(FRUSTRATION, text), ...(AGAIN.test(text) ? ['yine olmadı'] : [])] : []
  if (prevTier !== undefined && length <= 400) {
    if (complaint.length > 0) {
      const bump = frustrationStreak >= 1 ? 2 : 1

      return rule(prevTier + bump, 'high', [`şikâyet ${quote(complaint)}: +${bump} kademe`], 'complaint', 'escalate')
    }
    if (isFollowup(text)) {
      return rule(prevTier, 'high', ['kısa onay: önceki kademe'], 'followup', 'inherit')
    }
    if (MORE_OF_THE_SAME.test(plain) && found(HARD, plain).length === 0 && found(FEATURE, plain).length === 0) {
      return rule(prevTier, 'high', ['aynı işin devamı: önceki kademe'], 'followup', 'inherit')
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
  const parts = (rest.match(/,/g)?.length ?? 0) + (rest.match(/\s(?:ve|and|ile)\s/g)?.length ?? 0)
  const isLong = length > 1200
  const isShort = length <= 200
  const isMigration = MIGRATION.test(rest)
  const isWide = isLong || files >= 3

  // T4: long, many-sided work, or work that has already failed again and again.
  const again = found(REPEATED_FAILURE, rest)
  if (again.length > 0) {
    return rule(4, 'high', [`tekrarlayan başarısızlık: ${quote(again)}`])
  }
  if (isMigration && WHOLE.test(rest)) {
    return rule(4, 'high', ['bütün uygulamanın taşınması'])
  }
  const scope = found(SCOPE, rest)
  if (scope.length > 0 && parts >= 2 && (feature.length > 0 || adds.length > 0)) {
    return rule(4, 'high', [`kapsamlı iş: ${quote(scope)}, ${parts + 1} parça`])
  }
  if (parts >= 3 && feature.length >= 3 && adds.length > 0) {
    return rule(4, 'high', [`çok parçalı özellik: ${quote(feature)}`])
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
  if (hasError) {
    return rule(2, 'high', ['hata çıktısı'])
  }
  if (DEBUG.test(rest)) {
    // "bu çalışmıyor, düzelt": no error, no place, no number, nothing said of
    // what should happen. A screenshot may say it all, so one beside it is not this.
    const isVague =
      files === 0 && !hasCode(raw) && !/\d/.test(rest) && !EXPECTED.test(rest) && !WHEN.test(rest) && length <= VAGUE_LENGTH && !hasAttachments

    return isVague ? hunt(rule(3, 'high', ['belirsiz anlatılmış hata'])) : rule(2, 'high', ['hata ayıklama'])
  }
  if (SYMPTOM.test(rest)) {
    return rule(2, 'high', ['bir şey olması gerektiği gibi olmuyor'])
  }
  // A complaint whose earlier turn gearbox did not see (a restart since):
  // something is broken, so it is debugging.
  if (complaint.length > 0) {
    return rule(2, 'high', [`şikâyet ${quote(complaint)}`], 'complaint')
  }
  if (TEST_WRITE.test(rest)) {
    return rule(2, 'high', ['test yazmak'])
  }

  // T0: questions about code in view, and chores. A chore is asked for in a
  // few words: "commit" or "typo" inside a long description is part of it.
  if (isShort && trivial.length > 0 && (feature.length === 0 || adds.length === 0)) {
    return rule(0, 'high', [`basit iş: ${quote(trivial)}`], 'chore')
  }
  if (isShort && LIST.test(rest) && INFO.test(rest) && feature.length === 0) {
    return rule(0, 'high', ['bilgi listeleme'], 'question')
  }
  if (isShort && question.length > 0 && adds.length === 0) {
    return rule(0, 'high', [`soru: ${quote(question)}`], 'question')
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
