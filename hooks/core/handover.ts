// Moving a large conversation to a clean one: when a piece of work has just
// finished, gearbox offers a hand-over note and a /clear; the note goes with
// the first prompt of the clean conversation.

import { L } from './text'

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

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

export function dayOf(ms: number): string {
  const date = new Date(ms)

  return L(`${MONTHS_EN[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`, `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`)
}

// What the fork of the conversation is asked: the note alone, about eight lines.
export function notePrompt(day: string): string {
  return L(
    [
      'This conversation will be handed over to a clean, empty one. The Claude in the new conversation will not see this one; it will only read the note you write.',
      'Write a hand-over note of at most 8 lines. Write nothing else: no introduction, no explanation, no code block. Use no tools.',
      'The lines, in this order, one line each:',
      `Hand-over note: <project name> (${day})`,
      'Project: <folder path>, branch <branch name>, last commit <short id and subject>',
      'Done: <the work finished in this conversation, briefly>',
      'Open: <work left half done or next in line; "none" if there is none>',
      'Rules: <the rules and preferences the person set; e.g. what language and how to explain, what is never done without asking>',
      'Read: <the files the new conversation should read first, including the files that hold lasting decisions>',
      'Do not invent anything that is not in the conversation; if you do not know, write "unknown".',
    ].join('\n'),
    [
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
    ].join('\n'),
  )
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
  return `${L('Old conversation', 'Eski sohbet')}: claude --resume ${sessionId}`
}

// What the clean conversation's first prompt carries beside it, unseen.
export function handoverContext(note: string, oldSessionId: string | undefined): string {
  return [
    L(
      'The user cleared the earlier, large conversation and moved to this one. Hand-over note from the earlier conversation:',
      'Kullanıcı önceki, büyük sohbeti temizleyip bu sohbete geçti. Önceki sohbetten devir notu:',
    ),
    '',
    note,
    ...(oldSessionId === undefined ? [] : [resumeLine(oldSessionId)]),
    '',
    L('The note may be incomplete: for decisions, look at the files on the "Read" line.', 'Not eksik olabilir: kararlar için "Oku" satırındaki dosyalara bak.'),
  ].join('\n')
}
