// Gathers the decisions gearbox made in your sessions, applied or in shadow
// mode, from Claude Code's own transcripts: each prompt as you wrote it, what
// gearbox chose and why, Haiku's answer when it was asked, and what answered.
// The result is the raw material for a real-use set: label it, and a new
// version can be played over it before anyone runs it.
//
//   node scripts/harvest.mjs [--since 2026-10-16]
//
// Reads ~/.claude/projects/*/*.jsonl and writes eval/.work/harvest.json.
// Nothing leaves this machine, and nothing of it belongs in the repository:
// the prompts are your work.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'

import { ROOT } from './claude.mjs'

const PROJECTS = join(homedir(), '.claude', 'projects')
const OUT = join(ROOT, 'eval', '.work', 'harvest.json')
const NOTE = /<system-reminder>[\s\S]*?<\/system-reminder>/g
const NOT_A_PROMPT = ['<local-command-caveat>', '<command-name>', '<local-command-stdout>', 'Base directory for this skill', '<task-notification>', '[Request interrupted']
const SHADOW = /⚙ gölge: (?<family>\S+) · (?<effort>\w+) · T(?<tier>\d) (?<label>\S+) önerirdi \((?<source>[^:]+): (?<why>.*?)\) · cevap: (?<answered>.+)$/
const APPLIED = /⚙ (?<model>[^·]+?) · (?<effort>\w+) · T(?<tier>\d) (?<label>\S+) \((?<source>[^:]+): (?<why>.*?)\)(?<rest>.*)$/

const sinceArg = process.argv.indexOf('--since')
const since = sinceArg >= 0 ? process.argv[sinceArg + 1] ?? '' : ''

// The person's own words in a user entry, or undefined for a tool result,
// a command's echo or a skill being loaded.
function promptOf(message) {
  const content = message?.content
  if (typeof content === 'string') {
    return { text: content, images: 0 }
  }
  if (!Array.isArray(content) || content.some(part => part?.type === 'tool_result')) {
    return undefined
  }
  const text = content.filter(part => part?.type === 'text').map(part => part.text ?? '').join('\n')

  return { text, images: content.filter(part => part?.type === 'image').length }
}

function decisionOf(content) {
  const shadow = SHADOW.exec(content)
  if (shadow !== null) {
    const { family, effort, tier, label, source, why, answered } = shadow.groups

    return { isShadow: true, family, effort, tier: Number(tier), label, source, why, answered: answered.trim(), haiku: haikuOf(why) }
  }
  const applied = APPLIED.exec(content)
  if (applied !== null) {
    const { model, effort, tier, label, source, why, rest } = applied.groups

    return { isShadow: false, model: model.trim(), effort, tier: Number(tier), label, source, why, rest: rest.trim(), haiku: haikuOf(why) }
  }

  return undefined
}

function haikuOf(why) {
  const match = /Haiku: T(\d)/.exec(why)

  return match === null ? undefined : Number(match[1])
}

const rows = []
for (const folder of existsSync(PROJECTS) ? readdirSync(PROJECTS) : []) {
  // gearbox's own measurements run in temporary folders: not someone's work.
  if (folder.includes('AppData-Local-Temp')) {
    continue
  }
  const dir = join(PROJECTS, folder)
  if (!statSync(dir).isDirectory()) {
    continue
  }
  for (const name of readdirSync(dir).filter(file => file.endsWith('.jsonl'))) {
    let current
    for (const line of readFileSync(join(dir, name), 'utf8').split('\n')) {
      let entry
      try {
        entry = JSON.parse(line)
      } catch {
        continue
      }
      if (entry.isSidechain === true || (since !== '' && (entry.timestamp ?? '') < since)) {
        continue
      }
      if (entry.type === 'user' && entry.isMeta !== true) {
        const prompt = promptOf(entry.message)
        const said = prompt === undefined ? undefined : prompt.text.replace(NOTE, ' ').trim()
        if (prompt !== undefined && !NOT_A_PROMPT.some(marker => said.startsWith(marker))) {
          current = { project: folder, session: basename(name, '.jsonl'), at: entry.timestamp, text: said, images: prompt.images, decision: undefined, models: {} }
          rows.push(current)
        }
      } else if (entry.type === 'assistant' && current !== undefined) {
        const model = entry.message?.model
        if (typeof model === 'string' && model !== '<synthetic>') {
          current.models[model] = (current.models[model] ?? 0) + 1
        }
      } else if (entry.type === 'system' && current !== undefined && String(entry.content ?? '').includes('⚙')) {
        current.decision = decisionOf(String(entry.content)) ?? current.decision
      }
    }
  }
}

const decided = rows.filter(row => row.decision !== undefined).sort((a, b) => String(a.at).localeCompare(String(b.at)))
mkdirSync(join(ROOT, 'eval', '.work'), { recursive: true })
writeFileSync(OUT, JSON.stringify(decided, null, 1))
const shadows = decided.filter(row => row.decision.isShadow).length
const sessions = new Set(decided.map(row => row.session)).size
const byTier = [0, 1, 2, 3, 4].map(tier => `T${tier} ${decided.filter(row => row.decision.tier === tier).length}`).join(' · ')
console.log(`${decided.length} karar, ${sessions} oturumda (${shadows} gölgede, ${decided.length - shadows} uygulanmış) · ${byTier}`)
console.log(`Haiku'ya sorulan: ${decided.filter(row => row.decision.haiku !== undefined).length}`)
console.log(`Yazıldı: ${OUT}`)
