import type { Mood } from '../types'
import { SPRITES } from './sprites'

type Sprite = { w: number; h: number; ms: number; palette: string[]; frames: string[] }

const SYMS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

// One frame's run-length pixels as SVG paths, one path per colour.
function framePaths(sprite: Sprite, data: string): string {
  const paths = new Map<string, string[]>()
  let at = 0
  const runs = data.matchAll(/([.A-Za-z])(\d*)/g)
  for (const [, sym = '.', count] of runs) {
    let left = count ? Number(count) : 1
    while (left > 0) {
      const y = Math.floor(at / sprite.w)
      const x = at % sprite.w
      const n = Math.min(left, sprite.w - x)
      if (sym !== '.') {
        const fill = sprite.palette[SYMS.indexOf(sym)] ?? '000000'
        const list = paths.get(fill) ?? []
        list.push(`M${x} ${y}h${n}v1h-${n}z`)
        paths.set(fill, list)
      }
      at += n
      left -= n
    }
  }
  return [...paths].map(([fill, d]) => `<path fill="#${fill}" d="${d.join('')}"/>`).join('')
}

// A mood's frames as one SVG that flips through them with SMIL.
function moodSvg(sprite: Sprite): string {
  const n = sprite.frames.length
  const dur = (n * sprite.ms) / 1000
  const groups = sprite.frames.map((data, i) => {
    const values = sprite.frames.map((_, j) => (j === i ? '1' : '0')).join(';')
    const anim = `<animate attributeName="opacity" values="${values}" dur="${dur}s" calcMode="discrete" repeatCount="indefinite"/>`
    return `<g opacity="${i === 0 ? 1 : 0}">${anim}${framePaths(sprite, data)}</g>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sprite.w} ${sprite.h}" shape-rendering="crispEdges">${groups.join('')}</svg>`
}

const all = SPRITES as Record<Mood, Sprite>

export const FRAMES: Record<Mood, string> = {
  idle: moodSvg(all.idle),
  wave: moodSvg(all.wave),
  jump: moodSvg(all.jump),
  thinking: moodSvg(all.thinking),
  walk: moodSvg(all.walk),
  sad: moodSvg(all.sad),
}
