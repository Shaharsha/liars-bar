// Procedural sound engine using Web Audio API
// Zero dependencies, zero network requests, zero bundle size increase

class GameAudio {
  private ctx: AudioContext | null = null

  private getCtx(): AudioContext | null {
    try {
      if (!this.ctx) this.ctx = new AudioContext()
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return this.ctx
    } catch {
      return null
    }
  }

  /** Call from any user-gesture handler to pre-warm the AudioContext */
  init() {
    this.getCtx()
  }

  /** Trigger haptic feedback (mobile) */
  haptic(pattern: number | number[]) {
    try {
      navigator?.vibrate?.(pattern)
    } catch {
      /* not supported */
    }
  }

  /** Single metallic tick (cylinder ratchet) */
  tick(volume = 0.08) {
    const ctx = this.getCtx()
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(1500, t)
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.015)
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.04)
  }

  /** Cylinder spin — series of decelerating metallic ticks over ~1.8s */
  cylinderSpin() {
    let time = 0
    for (let i = 0; i < 14; i++) {
      time += 50 + i * 12
      const vol = Math.max(0.01, 0.08 * (1 - i * 0.04))
      setTimeout(() => this.tick(vol), time)
    }
  }

  /** Sharp metallic snap — empty chamber click (survived) */
  click() {
    const ctx = this.getCtx()
    if (!ctx) return
    const t = ctx.currentTime
    // Sharp transient
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(1800, t)
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.03)
    gain.gain.setValueAtTime(0.2, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.06)
    // Metallic resonance
    const res = ctx.createOscillator()
    const resGain = ctx.createGain()
    res.type = 'sine'
    res.frequency.setValueAtTime(3200, t)
    resGain.gain.setValueAtTime(0.04, t)
    resGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
    res.connect(resGain).connect(ctx.destination)
    res.start(t)
    res.stop(t + 0.1)
    this.haptic(15)
  }

  /** Gunshot — noise burst + bass impact (death) */
  bang() {
    const ctx = this.getCtx()
    if (!ctx) return
    const t = ctx.currentTime
    // Initial crack (high-freq noise burst)
    const crackLen = Math.floor(ctx.sampleRate * 0.05)
    const crackBuf = ctx.createBuffer(1, crackLen, ctx.sampleRate)
    const crackData = crackBuf.getChannelData(0)
    for (let i = 0; i < crackLen; i++) {
      crackData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.005))
    }
    const crack = ctx.createBufferSource()
    crack.buffer = crackBuf
    const crackGain = ctx.createGain()
    crackGain.gain.setValueAtTime(0.4, t)
    crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    crack.connect(crackGain).connect(ctx.destination)
    crack.start(t)
    // Main body (filtered noise with decay)
    const bodyLen = Math.floor(ctx.sampleRate * 0.3)
    const bodyBuf = ctx.createBuffer(1, bodyLen, ctx.sampleRate)
    const bodyData = bodyBuf.getChannelData(0)
    for (let i = 0; i < bodyLen; i++) {
      bodyData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04))
    }
    const body = ctx.createBufferSource()
    body.buffer = bodyBuf
    const bodyFilter = ctx.createBiquadFilter()
    bodyFilter.type = 'lowpass'
    bodyFilter.frequency.setValueAtTime(3000, t)
    bodyFilter.frequency.exponentialRampToValueAtTime(100, t + 0.3)
    const bodyGain = ctx.createGain()
    bodyGain.gain.setValueAtTime(0.35, t)
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    body.connect(bodyFilter).connect(bodyGain).connect(ctx.destination)
    body.start(t)
    // Bass impact
    const bass = ctx.createOscillator()
    const bassGain = ctx.createGain()
    bass.type = 'sine'
    bass.frequency.setValueAtTime(80, t)
    bass.frequency.exponentialRampToValueAtTime(20, t + 0.3)
    bassGain.gain.setValueAtTime(0.35, t)
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
    bass.connect(bassGain).connect(ctx.destination)
    bass.start(t)
    bass.stop(t + 0.5)
    this.haptic([100, 30, 200])
  }

  /** Heartbeat — low double-thump (lub-dub) */
  heartbeat() {
    const ctx = this.getCtx()
    if (!ctx) return
    const t = ctx.currentTime
    const beat = (time: number, vol: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(55, time)
      osc.frequency.exponentialRampToValueAtTime(25, time + 0.15)
      gain.gain.setValueAtTime(vol, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2)
      osc.connect(gain).connect(ctx.destination)
      osc.start(time)
      osc.stop(time + 0.25)
    }
    beat(t, 0.3)
    beat(t + 0.12, 0.2)
    this.haptic([30, 50, 20])
  }

  /** LIAR! dramatic sting — dissonant chord + impact thud */
  liarSting() {
    const ctx = this.getCtx()
    if (!ctx) return
    const t = ctx.currentTime
    // Dark minor chord
    ;[110, 130.8, 164.8].forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.06, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(1500, t)
      filter.frequency.exponentialRampToValueAtTime(150, t + 0.5)
      osc.connect(filter).connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.7)
    })
    // Impact thud
    const thud = ctx.createOscillator()
    const thudGain = ctx.createGain()
    thud.type = 'sine'
    thud.frequency.setValueAtTime(90, t)
    thud.frequency.exponentialRampToValueAtTime(30, t + 0.15)
    thudGain.gain.setValueAtTime(0.3, t)
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
    thud.connect(thudGain).connect(ctx.destination)
    thud.start(t)
    thud.stop(t + 0.25)
    this.haptic(50)
  }
}

export const gameAudio = new GameAudio()
