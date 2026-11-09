export type Mood = 'idle' | 'wave' | 'jump' | 'thinking' | 'walk' | 'sad'

declare module 'claude-code' {
  interface PluginState {
    'eli-mascot': { mood: Mood }
  }
}
