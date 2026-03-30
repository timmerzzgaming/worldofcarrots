/**
 * Casino sound effects for the Carrot Bonus mini-game.
 * Built on Web Audio API, same pattern as lib/sounds.ts.
 */

import { isSoundEnabled } from '@/lib/sounds'

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.3,
  startTime = 0,
) {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(volume, ctx.currentTime + startTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime + startTime)
  osc.stop(ctx.currentTime + startTime + duration)
}

/** Drum roll building suspense — rapid alternating hits */
export function playDrumRoll() {
  if (!isSoundEnabled()) return
  const ctx = getCtx()
  for (let i = 0; i < 16; i++) {
    const t = i * 0.06
    const vol = 0.08 + i * 0.012
    // Low hit
    tone(120, 0.04, 'triangle', vol, t)
    // High hit (offset)
    tone(200, 0.03, 'triangle', vol * 0.7, t + 0.03)
  }
  // Final cymbal crash
  const bufferSize = ctx.sampleRate * 0.3
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.1))
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.12, ctx.currentTime + 0.96)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.3)
  source.connect(gain)
  gain.connect(ctx.destination)
  source.start(ctx.currentTime + 0.96)
}

/** Animal omnomnom — repeated chewing sounds */
export function playOmNomNom() {
  if (!isSoundEnabled()) return
  // 5 rapid chew cycles: jaw close (low pop) + jaw open (high pop)
  for (let i = 0; i < 5; i++) {
    const t = i * 0.18
    tone(280 + i * 15, 0.06, 'square', 0.14, t)        // chomp down
    tone(420 + i * 10, 0.04, 'triangle', 0.08, t + 0.06) // mouth open
    tone(180, 0.03, 'sine', 0.06, t + 0.1)              // lip smack
  }
  // Satisfied gulp at the end
  tone(150, 0.12, 'sine', 0.1, 0.92)
  tone(120, 0.08, 'sine', 0.08, 1.0)
}

/** Coin shower — rapid ascending chimes with metallic clinks */
export function playCoinShower() {
  if (!isSoundEnabled()) return
  const notes = [1047, 1175, 1319, 1397, 1568, 1760, 1976, 2093, 2349, 2637, 2793, 3136, 3520, 3951, 4186, 4699]
  notes.forEach((freq, i) => {
    tone(freq, 0.1, 'sine', 0.12, i * 0.04)
  })
  // Metallic coin clink accents
  for (let i = 0; i < 8; i++) {
    const clinkFreq = 3000 + Math.random() * 2000
    tone(clinkFreq, 0.03, 'square', 0.08, i * 0.08 + 0.02)
  }
}

/** Jackpot fanfare — triumphant cascading melody */
export function playJackpot() {
  if (!isSoundEnabled()) return
  // Triumphant ascending with harmonics
  tone(523, 0.15, 'sine', 0.25, 0)       // C5
  tone(659, 0.15, 'sine', 0.25, 0.12)    // E5
  tone(784, 0.15, 'sine', 0.25, 0.24)    // G5
  tone(1047, 0.2, 'sine', 0.3, 0.36)     // C6
  tone(1319, 0.15, 'sine', 0.25, 0.5)    // E6
  tone(1568, 0.2, 'sine', 0.3, 0.62)     // G6
  tone(2093, 0.35, 'sine', 0.35, 0.74)   // C7 (hold)
  // Sparkle accents
  tone(2637, 0.08, 'sine', 0.15, 0.9)    // E7
  tone(3136, 0.08, 'sine', 0.12, 0.96)   // G7
  tone(4186, 0.12, 'sine', 0.1, 1.02)    // C8
}

/** Card reveal — suspenseful whoosh */
export function playReveal() {
  if (!isSoundEnabled()) return
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(200, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2)
  gain.gain.setValueAtTime(0.2, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.25)
}

/** Small win chime — pleasant but modest */
export function playSmallWin() {
  if (!isSoundEnabled()) return
  tone(659, 0.1, 'sine', 0.2, 0)       // E5
  tone(784, 0.1, 'sine', 0.2, 0.08)    // G5
  tone(1047, 0.15, 'sine', 0.25, 0.16) // C6
}

// --- Casino background music ---

let casinoAudio: HTMLAudioElement | null = null

export function startCasinoMusic() {
  if (!isSoundEnabled()) return
  if (!casinoAudio) {
    casinoAudio = new Audio('/music/casino.mp3')
    casinoAudio.loop = true
  }
  casinoAudio.volume = 0.18
  casinoAudio.currentTime = 0
  casinoAudio.play().catch(() => {})
}

export function stopCasinoMusic() {
  if (!casinoAudio || casinoAudio.paused) return
  const step = 0.02
  const interval = 500 * step / Math.max(casinoAudio.volume, 0.01)
  const audio = casinoAudio
  const fade = setInterval(() => {
    if (audio.volume > step) {
      audio.volume = Math.max(0, audio.volume - step)
    } else {
      audio.volume = 0
      audio.pause()
      clearInterval(fade)
    }
  }, interval)
}
