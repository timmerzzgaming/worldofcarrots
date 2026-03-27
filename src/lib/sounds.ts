const STORAGE_KEY = 'woc-sound'

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY) !== 'off'
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
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

function noise(duration: number, volume = 0.1, startTime = 0) {
  const ctx = getCtx()
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * volume
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume, ctx.currentTime + startTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration)
  source.connect(gain)
  gain.connect(ctx.destination)
  source.start(ctx.currentTime + startTime)
}

// --- Sound effects ---

/** Pleasant ascending chime — correct answer */
export function playCorrect() {
  if (!isSoundEnabled()) return
  tone(523, 0.12, 'sine', 0.25, 0)      // C5
  tone(659, 0.12, 'sine', 0.25, 0.08)    // E5
  tone(784, 0.25, 'sine', 0.3, 0.16)     // G5
}

/** Descending buzz — wrong answer */
export function playWrong() {
  if (!isSoundEnabled()) return
  tone(350, 0.15, 'square', 0.15, 0)
  tone(250, 0.25, 'square', 0.12, 0.1)
}

/** Deep note with echo/delay effect */
function echoTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.3,
  startTime = 0,
) {
  const ctx = getCtx()
  const t = ctx.currentTime + startTime

  // Main oscillator
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.value = freq

  // Dry gain
  const dry = ctx.createGain()
  dry.gain.setValueAtTime(volume, t)
  dry.gain.exponentialRampToValueAtTime(0.001, t + duration)

  // Delay for echo
  const delay = ctx.createDelay(1)
  delay.delayTime.value = 0.18

  // Echo gain (feedback)
  const feedback = ctx.createGain()
  feedback.gain.value = 0.35

  // Second echo
  const delay2 = ctx.createDelay(1)
  delay2.delayTime.value = 0.36
  const feedback2 = ctx.createGain()
  feedback2.gain.value = 0.15

  osc.connect(dry)
  dry.connect(ctx.destination)

  dry.connect(delay)
  delay.connect(feedback)
  feedback.connect(ctx.destination)

  dry.connect(delay2)
  delay2.connect(feedback2)
  feedback2.connect(ctx.destination)

  osc.start(t)
  osc.stop(t + duration + 0.5)
}

/** Deep ascending melody with echo — game start */
export function playGameStart() {
  if (!isSoundEnabled()) return
  echoTone(196, 0.15, 'sine', 0.2, 0)       // G3 (deep)
  echoTone(262, 0.15, 'sine', 0.22, 0.12)   // C4
  echoTone(330, 0.15, 'sine', 0.25, 0.24)   // E4
  echoTone(392, 0.15, 'sine', 0.28, 0.36)   // G4
  echoTone(523, 0.15, 'sine', 0.3, 0.48)    // C5 (resolve)
}

/** Descending melody — game over */
export function playGameOver() {
  if (!isSoundEnabled()) return
  tone(523, 0.2, 'sine', 0.25, 0)        // C5
  tone(440, 0.2, 'sine', 0.2, 0.2)       // A4
  tone(349, 0.2, 'sine', 0.2, 0.4)       // F4
  tone(262, 0.4, 'sine', 0.25, 0.6)      // C4
}

/** Soft click/pop — hint used */
export function playHintUsed() {
  if (!isSoundEnabled()) return
  tone(800, 0.06, 'sine', 0.2, 0)
  tone(600, 0.08, 'sine', 0.15, 0.05)
}

/** Quick whoosh — skip */
export function playSkip() {
  if (!isSoundEnabled()) return
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(600, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15)
  gain.gain.setValueAtTime(0.15, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.15)
}

/** Urgent tick — timer warning (< 5s) */
export function playTimerWarning() {
  if (!isSoundEnabled()) return
  tone(880, 0.05, 'square', 0.1, 0)
}

/** Celebratory fanfare — new high score */
export function playHighScore() {
  if (!isSoundEnabled()) return
  tone(523, 0.12, 'sine', 0.25, 0)       // C5
  tone(659, 0.12, 'sine', 0.25, 0.12)    // E5
  tone(784, 0.12, 'sine', 0.25, 0.24)    // G5
  tone(1047, 0.3, 'sine', 0.3, 0.36)     // C6
  tone(784, 0.12, 'sine', 0.2, 0.55)     // G5
  tone(1047, 0.4, 'sine', 0.35, 0.67)    // C6
}

/** Thud — life lost */
export function playLifeLost() {
  if (!isSoundEnabled()) return
  tone(150, 0.2, 'sine', 0.3, 0)
  noise(0.1, 0.08, 0)
}

/** Positive notification — hint earned */
export function playHintEarned() {
  if (!isSoundEnabled()) return
  tone(660, 0.1, 'sine', 0.2, 0)
  tone(880, 0.15, 'sine', 0.25, 0.1)
}

/** Tick sound for timer — every second when < 5s */
export function playTick() {
  if (!isSoundEnabled()) return
  tone(1000, 0.03, 'sine', 0.08, 0)
}

/** Soft click — menu/button press */
export function playClick() {
  if (!isSoundEnabled()) return
  tone(700, 0.06, 'sine', 0.15, 0)
}

/** Subtle techy hover — soft high-frequency blip */
export function playHover() {
  if (!isSoundEnabled()) return
  tone(1200, 0.04, 'sine', 0.06, 0)
}

/** Punchy sweep — title screen "Start Game" button */
export function playEnter() {
  if (!isSoundEnabled()) return
  const ctx = getCtx()
  const t = ctx.currentTime

  // Rising sweep
  const sweep = ctx.createOscillator()
  sweep.type = 'sine'
  sweep.frequency.setValueAtTime(150, t)
  sweep.frequency.exponentialRampToValueAtTime(800, t + 0.3)
  const sweepGain = ctx.createGain()
  sweepGain.gain.setValueAtTime(0.2, t)
  sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
  sweep.connect(sweepGain)
  sweepGain.connect(ctx.destination)
  sweep.start(t)
  sweep.stop(t + 0.4)

  // Impact hit
  echoTone(330, 0.15, 'triangle', 0.25, 0.25)
  echoTone(523, 0.2, 'sine', 0.3, 0.3)
}

/** Coin chime — credits earned */
export function playCreditEarned() {
  if (!isSoundEnabled()) return
  tone(1047, 0.08, 'sine', 0.2, 0)
  tone(1319, 0.1, 'sine', 0.25, 0.08)
  tone(1568, 0.12, 'sine', 0.2, 0.16)
}

/** Triumphant arpeggio — level up */
export function playLevelUp() {
  if (!isSoundEnabled()) return
  // Ascending major arpeggio with longer sustain
  tone(523, 0.12, 'sine', 0.25, 0)     // C5
  tone(659, 0.12, 'sine', 0.25, 0.1)   // E5
  tone(784, 0.12, 'sine', 0.25, 0.2)   // G5
  tone(1047, 0.2, 'sine', 0.3, 0.3)    // C6 (hold)
  // Octave sparkle
  tone(1568, 0.08, 'sine', 0.15, 0.45) // G6
  tone(2093, 0.15, 'sine', 0.2, 0.5)   // C7
}

// --- Background music ---

const MUSIC_VOLUME = 0.15
let gameAudio: HTMLAudioElement | null = null
let menuAudio: HTMLAudioElement | null = null

function fadeOut(audio: HTMLAudioElement, duration = 500) {
  const step = 0.02
  const interval = duration * step / audio.volume
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

function playTrack(audio: HTMLAudioElement) {
  audio.volume = MUSIC_VOLUME
  audio.play().catch(() => {})
}

function fadeIn(audio: HTMLAudioElement, delay = 0, duration = 1500) {
  audio.volume = 0
  setTimeout(() => {
    audio.play().catch(() => {})
    const target = MUSIC_VOLUME
    const step = 0.01
    const interval = duration * step / target
    const fade = setInterval(() => {
      if (audio.volume < target - step) {
        audio.volume = Math.min(target, audio.volume + step)
      } else {
        audio.volume = target
        clearInterval(fade)
      }
    }, interval)
  }, delay)
}

export function startMusic() {
  if (!isSoundEnabled()) return
  if (menuAudio && !menuAudio.paused) {
    fadeOut(menuAudio)
  }
  if (!gameAudio) {
    gameAudio = new Audio('/music/background.mp3')
    gameAudio.loop = true
  }
  gameAudio.currentTime = 0
  fadeIn(gameAudio, 2000, 1500)
}

export function stopMusic() {
  if (gameAudio && !gameAudio.paused) {
    fadeOut(gameAudio)
  }
}

export function startMenuMusic() {
  if (!isSoundEnabled()) return
  if (gameAudio && !gameAudio.paused) {
    fadeOut(gameAudio)
  }
  if (!menuAudio) {
    menuAudio = new Audio('/music/menu.mp3')
    menuAudio.loop = true
  }
  if (menuAudio.paused) {
    playTrack(menuAudio)
  }
}

export function stopMenuMusic() {
  if (menuAudio && !menuAudio.paused) {
    fadeOut(menuAudio)
  }
}

export function syncMusic() {
  if (isSoundEnabled()) {
    if (menuAudio && !menuAudio.paused) menuAudio.volume = MUSIC_VOLUME
    if (gameAudio && !gameAudio.paused) gameAudio.volume = MUSIC_VOLUME
  } else {
    if (menuAudio) menuAudio.pause()
    if (gameAudio) gameAudio.pause()
  }
}
