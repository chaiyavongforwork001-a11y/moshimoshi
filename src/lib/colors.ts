import type { MochiColor, TagCategory } from './types'

export interface MochiPalette {
  base: string
  shade: string
  light: string
  /** readable ink for text placed on `base` */
  ink: string
}

export const MOCHI: Record<MochiColor, MochiPalette> = {
  peach: { base: '#FFC4AE', shade: '#FF9C82', light: '#FFE7DD', ink: '#5A2A1E' },
  butter: { base: '#FFE08A', shade: '#FFC54D', light: '#FFF4CF', ink: '#5A4210' },
  mint: { base: '#A8EBD2', shade: '#68D3AE', light: '#DDF8EE', ink: '#174D3B' },
  lavender: { base: '#CFC3FF', shade: '#A493FF', light: '#ECE7FF', ink: '#33276E' },
  sky: { base: '#BDE2FF', shade: '#86C6FF', light: '#E3F2FF', ink: '#18456B' },
  pink: { base: '#FFC6D6', shade: '#FF97B4', light: '#FFE6EE', ink: '#6A2140' },
  cream: { base: '#FFF1E2', shade: '#F2D2B6', light: '#FFF9F2', ink: '#5A3B22' },
}

export const MOCHI_COLORS = Object.keys(MOCHI) as MochiColor[]

export const CATEGORY_COLOR: Record<TagCategory, MochiColor> = {
  game: 'lavender',
  anime: 'pink',
  music: 'peach',
  film: 'sky',
  food: 'butter',
  outdoor: 'mint',
  lang: 'sky',
  study: 'mint',
  pet: 'butter',
  art: 'pink',
  book: 'lavender',
  life: 'peach',
}

/** gradient used by the signal meter, from cool (weak) to warm (strong) */
export const SIGNAL_GRADIENT = ['#B8A8FF', '#C9A2F2', '#FF9FBA', '#FF8E80', '#FF7A6B'] as const
