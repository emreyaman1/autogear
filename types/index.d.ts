// What gearbox keeps in the session's plugin state: the values its band draws
// from, and whether the session is in plan mode.
export type GearboxMode = 'auto' | 'pin' | 'shadow' | 'down'

declare module 'claude-code' {
  interface PluginState {
    // warning: a rate-limit window under pressure, as the band shows it; '' when none.
    // planning: the session is in plan mode, as the engine's plan-mode notes say.
    gearbox: { mode: GearboxMode; warning: string; planning: boolean }
  }
}
