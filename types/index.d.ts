// What gearbox keeps in the session's plugin state: the values its band draws
// from, and whether the session is in plan mode.
export type GearboxMode = 'auto' | 'pin' | 'shadow' | 'down'

declare module 'claude-code' {
  interface PluginState {
    // warning: a rate-limit window under pressure, as the band shows it; '' when none.
    // planning: the session is in plan mode, as the engine's plan-mode notes say.
    // note: the last choice as the band shows it; '' before one.
    // handover: the hand-over note the band offers, '' when none; handoverTokens:
    // the conversation's size when it was written; handoverArmed: /clear has run
    // and the note waits for the first prompt.
    gearbox: {
      mode: GearboxMode
      warning: string
      planning: boolean
      note: string
      handover: string
      handoverTokens: number
      handoverArmed: boolean
    }
  }
}
