// Reads a prompt and guesses how much model it needs: a tier from 0 (trivial)
// to 4 (critical), the reasons, and whether the rules are sure of it.

import type { Effort, Family } from './models'
import { toTier, type Tier } from './tiers'

export type Override = { family?: Family; effort?: Effort; tier?: Tier }

export type RuleSource = 'rules' | 'override' | 'inherit' | 'escalate'

export type RuleResult = {
  tier: Tier
  // low: the rules could not tell, and the router may ask Haiku.
  confidence: 'high' | 'low'
  source: RuleSource
  reasons: string[]
  override?: Override
}

export type RuleContext = {
  // The tier of the previous prompt in this session.
  prevTier?: Tier
  hasAttachments?: boolean
  // How many prompts in a row have already complained.
  frustrationStreak?: number
}

const FOLD: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' }

// Lowercases and folds Turkish letters, so "Çalışmıyor" and "calismiyor" read alike.
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/̇/g, '')
    .replace(/[çğıöşüâîû]/g, letter => FOLD[letter] ?? letter)
}

type Cue = { word: string; pattern: RegExp }

// A cue matches at the start of a word and lets any suffix follow, as Turkish
// needs ("hata", "hatayı", "hatası"); stems stop before a consonant that
// mutates ("özelli" for özellik/özelliği).
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

const HARD = cues([
  'neden', 'niye', 'nicin', 'sebep', 'sebeb', 'kok neden', 'mimari', 'tasarla', 'tasarim', 'refactor',
  'refaktor', 'yeniden yapilandir', 'yeniden tasarla', 'optimiz', 'performans', 'yavas', 'olcekle',
  'race condition', 'deadlock', 'kilitlen', 'sizinti', 'guvenli', 'zafiyet', 'eszamanli', 'algoritma',
  'karmasi', 'arastir', 'analiz', 'karsilastir', 'strateji', 'yol haritasi', 'sifirdan', 'tum proje',
  'butun proje', 'tum kod', 'butun kod', 'kapsamli', 'derinlemesine', 'nasil calisiyor',
  'why', 'root cause', 'architect', 'design', 'redesign', 'restructur', 'optimi', 'performance', 'slow',
  'scalab', 'memory leak', 'security', 'vulnerab', 'concurren', 'algorithm', 'complex', 'investigat',
  'analy', 'compar', 'trade.?off', 'strateg', 'roadmap', 'migrat', 'from scratch', 'entire codebase',
  'whole project', 'whole codebase', 'in depth', 'deep dive', 'how does',
])

const WORK = cues([
  'ekle', 'ozelli', 'implement', 'uygula(?!ma)', 'olustur', 'gelistir', 'entegre', 'endpoint', 'bilesen',
  'sayfa', 'form(?!at)', 'veritaban', 'test', 'debug', 'hata ayikla', 'duzelt', 'hata', 'sorun', 'kurulum',
  'yapilandir', 'baglan',
  'add(?:s|ed|ing)?(?![a-z])', 'feature', 'create', 'build', 'develop', 'integrat', 'component', 'page',
  'database', 'schema', 'fix', 'bugs?(?![a-z])', 'error', 'issue', 'set ?up', 'configur', 'connect', 'install',
])

const ROUTINE = cues([
  'degistir', 'guncelle', 'sil', 'kaldir', 'tasi', 'ayarla', 'ren[kg]', 'metin', 'metni', 'buton', 'bosluk',
  'hizala', 'import',
  'change', 'update', 'delete', 'remove', 'move', 'tweak', 'adjust', 'colou?r', 'text', 'button', 'spacing',
  'align', 'bump',
])

// Phrases that settle a prompt as trivial even beside a work verb ("yorum ekle").
const TRIVIAL_STRONG = cues([
  'commit mesaji', 'commit message', 'commit', 'push', 'yazim hatasi', 'typo', 'formatla', 'girinti', 'indent',
  'yorum ekle', 'yorum satiri', 'add (?:a )?comments?', 'yeniden adlandir', 'adini degistir', 'rename',
])

// Question words that mark a prompt trivial only when it is short and asks nothing else.
const TRIVIAL_WEAK = cues([
  'ne yapiyor', 'ne ise yariyor', 'nedir', 'ne demek', 'acikla', 'anlat', 'ozetle', 'ozet', 'listele',
  'goster', 'hangi dosya', 'nerede', 'cevir',
  'what does', 'what is', 'what.?s', 'explain', 'summari[sz]', 'list', 'show', 'where is', 'which file',
  'how many', 'translate',
])

const FRUSTRATION = cues([
  'olmadi', 'olmuyor', 'hala (?:ayni|hata|calism|olm|bozuk)', 'yine (?:ayni|hata|olmadi|calism|bozuk)',
  'tekrar hata', 'calismiyor', 'calismadi', 'yanlis', 'bozuldu', 'bozdun', 'duzelmedi', 'ayni hata',
  'anlamadin', 'istedigim (?:bu|gibi) degil',
  'still', 'same error', 'doesn.?t work', 'does not work', 'didn.?t work', 'not working', 'wrong', 'broken',
  'that.?s not', 'not what i',
])

const ACK =
  /^(?:evet|tamam|tamamdir|ok|okay|okey|olur|devam|peki|aynen|guzel|super|harika|tesekkur|sagol|eyvallah|uygula|yap|yes|yep|yeah|sure|go|continue|proceed|thanks|thank you|lgtm)(?![a-z])/

const ERROR_OUTPUT =
  /traceback \(most recent call last\)|\b\w*(?:error|exception)\b:|\berr!|^\s+at \S.*:\d+(?::\d+)?\)?\s*$|segmentation fault|panic:|exit code [1-9]|failed to compile|stack ?trace|uncaught|unhandled|\bhata:/im

const FILE =
  /(?:^|[\s(`'"@])[\w./\\-]*\w\.(?:tsx?|jsx?|mjs|cjs|py|go|rs|java|kt|cs|cpp|cc|c|h|hpp|rb|php|swift|json|ya?ml|toml|md|html|css|scss|sql|sh|ps1|vue|svelte)(?!\w)/gi

const LIST_ITEM = /^\s*(?:\d+[.)]|[-*•])\s+\S/gm

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

function isFollowup(text: string): boolean {
  const plain = text.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

  return plain.length <= 40 && ACK.test(plain) && found(WORK, plain).length === 0 && found(HARD, plain).length === 0
}

function countFiles(raw: string): number {
  return new Set((raw.match(FILE) ?? []).map(name => name.trim().replace(/^[(`'"@]/, '').toLowerCase())).size
}

const quote = (words: readonly string[]): string =>
  words
    .slice(0, 3)
    .map(word => `"${word}"`)
    .join(', ')

export function classify(raw: string, context: RuleContext = {}): RuleResult {
  const result = classifyText(raw, context)
  if (context.hasAttachments === true && result.tier < 1) {
    return { ...result, tier: 1, reasons: [...result.reasons, 'görsel/ek var'] }
  }

  return result
}

function classifyText(raw: string, { prevTier, frustrationStreak = 0 }: RuleContext): RuleResult {
  const text = normalize(raw)
  const length = raw.trim().length
  const rule = (tier: number, confidence: RuleResult['confidence'], reasons: string[], source: RuleSource = 'rules'): RuleResult => ({
    tier: toTier(tier),
    confidence,
    source,
    reasons,
  })

  if (/(?:^|[^a-z])ultrathink/.test(text)) {
    return rule(4, 'high', ['"ultrathink"'])
  }
  if (prevTier !== undefined && length <= 400) {
    const complaint = found(FRUSTRATION, text)
    if (complaint.length > 0) {
      const bump = frustrationStreak >= 1 ? 2 : 1

      return rule(prevTier + bump, 'high', [`şikâyet ${quote(complaint)}: +${bump} kademe`], 'escalate')
    }
    if (isFollowup(text)) {
      return rule(prevTier, 'high', ['kısa onay: önceki kademe'], 'inherit')
    }
  }

  const strong = found(TRIVIAL_STRONG, text)
  // A trivial phrase's own verb ("yorum ekle") is no sign of other work.
  const rest = TRIVIAL_STRONG.reduce((left, cue) => left.replace(new RegExp(cue.pattern.source, 'g'), ' '), text)
  const hard = found(HARD, rest)
  const work = found(WORK, rest)
  const routine = found(ROUTINE, rest)
  const weak = found(TRIVIAL_WEAK, text)
  const hasError = ERROR_OUTPUT.test(raw)
  const files = countFiles(raw)
  const items = raw.match(LIST_ITEM)?.length ?? 0
  const isLong = length > 1200
  const isShort = length <= 160

  if (hard.length >= 3 && (isLong || files >= 3)) {
    return rule(4, 'high', [`çok sayıda zor sinyali: ${quote(hard)}`, 'kapsamlı istek'])
  }
  if (hard.length >= 2) {
    return rule(3, 'high', [`zor sinyalleri: ${quote(hard)}`])
  }
  if (hard.length === 1 && (hasError || isLong || files >= 3)) {
    return rule(3, 'high', [`zor sinyali: ${quote(hard)}`, hasError ? 'hata çıktısı' : 'kapsamlı istek'])
  }
  if (hard.length === 1) {
    return rule(2, 'low', [`tek zor sinyali: ${quote(hard)}`])
  }
  if (hasError) {
    return rule(2, 'high', ['hata çıktısı'])
  }
  if (isLong || files >= 3 || items >= 4) {
    return rule(2, 'high', [isLong ? 'uzun istek' : files >= 3 ? `${files} dosya` : `${items} maddelik liste`])
  }
  if (work.length >= 2 || (work.length === 1 && length > 500)) {
    return rule(2, 'high', [`iş sinyalleri: ${quote(work)}`])
  }
  if (work.length === 1) {
    return rule(1, 'low', [`iş sinyali: ${quote(work)}`])
  }
  if (routine.length > 0) {
    return rule(1, 'high', [`rutin: ${quote(routine)}`])
  }
  if (strong.length > 0) {
    return rule(0, 'high', [`basit iş: ${quote(strong)}`])
  }
  if (weak.length > 0) {
    return isShort ? rule(0, 'high', [`kısa soru: ${quote(weak)}`]) : rule(1, 'high', [`soru: ${quote(weak)}`])
  }
  if (isShort && (/\?\s*$/.test(raw.trim()) || QUESTION_START.test(text))) {
    return rule(1, 'low', ['kısa soru'])
  }

  return rule(1, 'low', ['belirgin sinyal yok'])
}
