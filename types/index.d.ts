// What gearbox keeps for the toggle band above the prompt: the one value it draws from.
export type GearboxMode = 'auto' | 'pin' | 'down'

declare module 'claude-code' {
  interface PluginState {
    gearbox: { mode: GearboxMode }
  }
}
