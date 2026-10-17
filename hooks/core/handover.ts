// Moving a large conversation to a clean one: when a piece of work has just
// finished, gearbox offers a hand-over note and a /clear; the note goes with
// the first prompt of the clean conversation.

// Past this size the offer is made. Every step of a turn sends the whole
// conversation again: at Opus's cache-read price ($0.20 per million) 150K
// tokens is $0.03 a step, against about $0.005 for a clean conversation of
// 15-30K. Over a message of 20 steps that is about $0.50 kept, ten times the
// note's own cost (one read of the conversation from the cache). Below it the
// gain is small next to what the clean conversation spends reading files
// again. A starting point, not a measurement (docs/sonraki-adimlar.md, step 17).
export const HANDOVER_TOKENS = 150_000

// A note longer than this is cut: it is meant to be read at a glance.
const MAX_LINES = 12

// A finished piece of work: a commit or a push, or a passing test run.
const COMMIT_COMMAND = /\bgit\b[^|;&\n]*\b(?:commit|push)\b/
// A test runner, not a mere mention of tests (`cat tests/a.test.ts`).
const TEST_COMMAND =
  /\b(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test|plugin test|jest|vitest|pytest|mocha|node --test|go test|cargo test|dotnet test|python -m unittest)\b/

export function isWorkDone(command: string, isError: boolean): boolean {
  return !isError && (COMMIT_COMMAND.test(command) || TEST_COMMAND.test(command))
}

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

export function dayOf(ms: number): string {
  const date = new Date(ms)

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

// What the fork of the conversation is asked: the note alone, about eight lines.
export function notePrompt(day: string): string {
  return [
    'Bu sohbet temiz, boş bir sohbete devredilecek. Yeni sohbetteki Claude bu konuşmayı görmeyecek; yalnızca senin yazacağın notu okuyacak.',
    'En fazla 8 satırlık bir devir notu yaz. Başka hiçbir şey yazma: giriş, açıklama, kod bloğu yok. Araç kullanma.',
    'Satırlar şu sırayla, her biri tek satır:',
    `Devir notu: <proje adı> (${day})`,
    'Proje: <klasör yolu>, dal <dal adı>, son commit <kısa kimlik ve konusu>',
    'Yapılan: <bu sohbette biten işler, kısaca>',
    'Açık: <yarım kalan ya da sıradaki işler; yoksa "yok">',
    'Kurallar: <kullanıcının koyduğu kurallar ve tercihler; ör. hangi dilde ve nasıl anlatılacağı, neyin sorulmadan yapılmayacağı>',
    'Oku: <yeni sohbetin önce okuması gereken dosyalar; kalıcı kararların yazılı olduğu dosyalar dahil>',
    'Konuşmada olmayan bir şeyi uydurma; bilmiyorsan "bilinmiyor" yaz.',
  ].join('\n')
}

// The fork's reply as the note: fences and blank lines dropped, cut short.
export function cleanNote(text: string): string {
  return text
    .split('\n')
    .map(line => line.trimEnd())
    .filter(line => line.trim() !== '' && !line.trim().startsWith('```'))
    .slice(0, MAX_LINES)
    .join('\n')
}

// The line that tells how to go back to the conversation the note came from.
export function resumeLine(sessionId: string): string {
  return `Eski sohbet: claude --resume ${sessionId}`
}

// What the clean conversation's first prompt carries beside it, unseen.
export function handoverContext(note: string, oldSessionId: string | undefined): string {
  return [
    'Kullanıcı önceki, büyük sohbeti temizleyip bu sohbete geçti. Önceki sohbetten devir notu:',
    '',
    note,
    ...(oldSessionId === undefined ? [] : [resumeLine(oldSessionId)]),
    '',
    'Not eksik olabilir: kararlar için "Oku" satırındaki dosyalara bak.',
  ].join('\n')
}
