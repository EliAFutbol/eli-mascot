import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Mood } from '../types'
import { FRAMES } from './frames'

const PANE = 'eli'
const TITLE = 'Eli'
const LABEL: Record<Mood, string> = {
  idle: 'Eli is hanging out',
  wave: 'Eli says hi',
  jump: 'Eli is celebrating',
  thinking: 'Eli is thinking',
  walk: 'Eli is on the move',
  sad: 'Eli is a little sad',
}

const mood = atom({ plugin: 'eli-mascot', key: 'mood' } as const, 'idle' as Mood)

// Width in CSS pixels that keeps a mood's drawing in proportion at `height`.
function widthAt(m: Mood, height: number): number {
  const box = /viewBox="0 0 (\d+) (\d+)"/.exec(FRAMES[m])
  return box ? Math.round((height * Number(box[1])) / Number(box[2])) : height
}

let settle: { cancel: () => void } | undefined

// Show a mood now; with `ms`, drift back to idle after that long.
async function show($: EngineInterface, next: Mood, ms?: number) {
  settle?.cancel()
  settle = undefined
  await update($, mood, () => next)
  if (ms !== undefined) {
    settle = $.clock.after(ms, () => {
      void update($, mood, () => 'idle' as Mood)
    })
  }
}

export const register: Register = on => {
  let toolsRunning = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'eli', description: 'Open Eli, your mascot, in a bigger side pane' })
    await show($, 'wave', 3500)

    return next(e)
  })

  on('command.run', { command: 'eli' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    await show($, 'wave', 3000)

    return { text: 'Eli is here.' }
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      toolsRunning = 0
      await show($, 'thinking')
    }

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    // Eli's mood never gets in the way of a tool: failures here are dropped.
    toolsRunning += 1
    if (toolsRunning === 1) await show($, 'walk').catch(() => {})
    try {
      return await next(e)
    } finally {
      toolsRunning = Math.max(0, toolsRunning - 1)
      if (toolsRunning === 0) {
        await read($, mood)
          .then(now => (now === 'walk' ? show($, 'thinking') : undefined))
          .catch(() => {})
      }
    }
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      toolsRunning = 0
      if (e.reason === 'answer') await show($, 'jump', 2500)
      else if (e.reason === 'aborted') await show($, 'idle')
      else await show($, 'sad', 4000)
    }

    return next(e)
  })

  // Eli lives just above the prompt, so he stays in view while you type.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const ui = $.ui.resolve(e)
    if (!('Svg' in ui)) return next(e)
    const { Box, Text } = ui
    const now = await read($, mood)

    return (
      <Box flexDirection="row" alignItems="flex-end">
        <ui.Svg source={FRAMES[now]} alt={LABEL[now]} width={widthAt(now, 88)} height={88} isInteractive />
        <Text dimColor>{LABEL[now]}</Text>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const now = await read($, mood)

    return (
      <Box flexDirection="column" alignItems="center">
        {'Svg' in ui ? (
          <ui.Svg source={FRAMES[now]} alt={LABEL[now]} width={widthAt(now, 200)} height={200} isInteractive />
        ) : (
          <Text>(•‿•) Eli</Text>
        )}
        <Text dimColor>{LABEL[now]}</Text>
      </Box>
    )
  })
}
