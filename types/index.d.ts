// What autogear keeps in the session's plugin state: the values its band draws
// from, and whether the session is in plan mode.
export type AutogearMode = 'auto' | 'pin' | 'shadow' | 'down'

declare module 'claude-code' {
  interface PluginState {
    // warning: a rate-limit window under pressure, as the band shows it; '' when none.
    // planning: the session is in plan mode, as the engine's plan-mode notes say.
    // note: the last choice as the band shows it; '' before one.
    // handover: the hand-over note the band offers, '' when none; handoverTokens:
    // the conversation's size when it was written; handoverArmed: /clear has run
    // and the note waits for the first prompt; handoverPending: a note is being
    // written after the turn.
    autogear: {
      mode: AutogearMode
      warning: string
      planning: boolean
      note: string
      handover: string
      handoverTokens: number
      handoverArmed: boolean
      handoverPending: boolean
    }
  }
}
