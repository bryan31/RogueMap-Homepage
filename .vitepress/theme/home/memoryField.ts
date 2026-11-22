/**
 * Hero 背景：一张"堆外内存页"网格。
 * - 方形波纹从 Logo 的橙色破壁块位置向外扩散（数据冲出堆内存，写入 mmap 页）
 * - 鼠标是一个"写入头"，经过的页会被点亮
 * - 少量随机写入保持画面呼吸感
 * 只绘制被点亮的格子，静态网格预渲染到离屏画布。
 */

interface Wave {
  x: number
  y: number
  t0: number
}

interface Palette {
  dot: string
  on: string
  rogue: string
}

export interface FieldOptions {
  /** 返回波纹原点（相对 canvas 的 CSS 像素坐标） */
  origin: () => { x: number; y: number } | null
  /** Logo 所在区域，不在这里画格子（相对 canvas 的 CSS 像素） */
  hole: () => { x: number; y: number; w: number; h: number } | null
  reducedMotion: boolean
}

const WAVE_SPEED = 260 // px / s
const WAVE_BAND = 1.15 // cells
const WAVE_INTERVAL = 2800 // ms
const POINTER_RADIUS = 96 // px

export class MemoryField {
  private ctx: CanvasRenderingContext2D
  private base: HTMLCanvasElement
  private dpr = 1
  private w = 0
  private h = 0
  private cell = 18
  private cols = 0
  private rows = 0
  private level = new Float32Array(0)
  private rogue = new Uint8Array(0)
  private waves: Wave[] = []
  private lastWave = -Infinity
  private pointer = { x: 0, y: 0, active: false }
  private raf = 0
  private last = 0
  private running = false
  private palette: Palette = { dot: '#ccc', on: '#3451b2', rogue: '#f29d00' }

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: FieldOptions
  ) {
    this.ctx = canvas.getContext('2d')!
    this.base = document.createElement('canvas')
  }

  readPalette() {
    const s = getComputedStyle(this.canvas)
    this.palette = {
      dot: s.getPropertyValue('--rh-field-dot').trim() || this.palette.dot,
      on: s.getPropertyValue('--rh-field-on').trim() || this.palette.on,
      rogue: s.getPropertyValue('--rh-field-rogue').trim() || this.palette.rogue
    }
    this.paintBase()
    if (!this.running) this.draw()
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.w = rect.width
    this.h = rect.height
    this.cell = rect.width < 640 ? 15 : 18
    this.canvas.width = Math.round(this.w * this.dpr)
    this.canvas.height = Math.round(this.h * this.dpr)
    this.cols = Math.ceil(this.w / this.cell) + 1
    this.rows = Math.ceil(this.h / this.cell) + 1
    this.level = new Float32Array(this.cols * this.rows)
    this.rogue = new Uint8Array(this.cols * this.rows)
    this.paintBase()
    if (this.opts.reducedMotion) this.seedStatic()
    if (!this.running) this.draw()
  }

  /** 首次进入：立刻放出一道波纹 */
  burst(now = performance.now()) {
    const o = this.opts.origin()
    if (!o) return
    this.waves.push({ x: o.x, y: o.y, t0: now })
    this.lastWave = now
  }

  setPointer(x: number, y: number, active: boolean) {
    this.pointer.x = x
    this.pointer.y = y
    this.pointer.active = active
  }

  start() {
    if (this.running || this.opts.reducedMotion) return
    this.running = true
    this.last = performance.now()
    const loop = (t: number) => {
      if (!this.running) return
      this.step(t)
      this.draw()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  destroy() {
    this.stop()
  }

  private paintBase() {
    const b = this.base
    b.width = this.canvas.width
    b.height = this.canvas.height
    const c = b.getContext('2d')!
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    c.clearRect(0, 0, this.w, this.h)
    c.fillStyle = this.palette.dot
    const s = 1.6
    for (let r = 0; r < this.rows; r++) {
      for (let q = 0; q < this.cols; q++) {
        const x = q * this.cell + this.cell / 2 - s / 2
        const y = r * this.cell + this.cell / 2 - s / 2
        c.fillRect(x, y, s, s)
      }
    }
  }

  private seedStatic() {
    // 减少动效时：画一圈静止的"已映射页"
    const o = this.opts.origin()
    if (!o) return
    for (let r = 0; r < this.rows; r++) {
      for (let q = 0; q < this.cols; q++) {
        const cx = q * this.cell + this.cell / 2
        const cy = r * this.cell + this.cell / 2
        const d = Math.max(Math.abs(cx - o.x), Math.abs(cy - o.y)) / this.cell
        const ring = Math.abs(d - 7) < 0.6 || Math.abs(d - 13) < 0.6
        if (ring) {
          const i = r * this.cols + q
          this.level[i] = d < 10 ? 0.75 : 0.4
          this.rogue[i] = Math.random() < 0.06 ? 1 : 0
        }
      }
    }
  }

  private light(i: number, v: number, rogueChance: number) {
    if (v <= this.level[i]) return
    if (this.level[i] < 0.08) this.rogue[i] = Math.random() < rogueChance ? 1 : 0
    this.level[i] = v
  }

  private step(t: number) {
    const dt = Math.min(64, t - this.last)
    this.last = t
    const decay = Math.pow(0.935, dt / 16.67)
    const { cell, cols, rows, level } = this

    for (let i = 0; i < level.length; i++) {
      if (level[i] > 0) level[i] = level[i] < 0.01 ? 0 : level[i] * decay
    }

    if (t - this.lastWave > WAVE_INTERVAL) this.burst(t)

    const maxR = Math.hypot(this.w, this.h)
    this.waves = this.waves.filter((wv) => (t - wv.t0) * WAVE_SPEED / 1000 < maxR)

    for (const wv of this.waves) {
      const radius = ((t - wv.t0) * WAVE_SPEED) / 1000 / cell
      const fade = Math.max(0, 1 - radius / (maxR / cell)) ** 0.8
      const q0 = Math.max(0, Math.floor((wv.x / cell) - radius - 2))
      const q1 = Math.min(cols - 1, Math.ceil((wv.x / cell) + radius + 2))
      const r0 = Math.max(0, Math.floor((wv.y / cell) - radius - 2))
      const r1 = Math.min(rows - 1, Math.ceil((wv.y / cell) + radius + 2))
      for (let r = r0; r <= r1; r++) {
        const cy = (r * cell + cell / 2 - wv.y) / cell
        for (let q = q0; q <= q1; q++) {
          const cx = (q * cell + cell / 2 - wv.x) / cell
          const d = Math.max(Math.abs(cx), Math.abs(cy))
          const off = Math.abs(d - radius)
          if (off < WAVE_BAND) {
            // 波前稍微"破碎"一点，像真实的页写入，而不是完美的线
            if (Math.random() < 0.18) continue
            this.light(r * cols + q, (1 - off / WAVE_BAND) * fade, 0.07)
          }
        }
      }
    }

    if (this.pointer.active) {
      const pr = POINTER_RADIUS / cell
      const pq = this.pointer.x / cell
      const prw = this.pointer.y / cell
      const q0 = Math.max(0, Math.floor(pq - pr))
      const q1 = Math.min(cols - 1, Math.ceil(pq + pr))
      const r0 = Math.max(0, Math.floor(prw - pr))
      const r1 = Math.min(rows - 1, Math.ceil(prw + pr))
      for (let r = r0; r <= r1; r++) {
        for (let q = q0; q <= q1; q++) {
          const d = Math.hypot(q + 0.5 - pq, r + 0.5 - prw) / pr
          if (d < 1) this.light(r * cols + q, (1 - d) * 0.9, 0.12)
        }
      }
    }

    // 随机写入
    const sprinkles = Math.random() < 0.5 ? 1 : 2
    for (let k = 0; k < sprinkles; k++) {
      const i = (Math.random() * level.length) | 0
      this.light(i, 0.55 + Math.random() * 0.35, 0.3)
    }
  }

  private draw() {
    const { ctx, cell, cols, level, rogue, palette } = this
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.drawImage(this.base, 0, 0)
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    const maxSize = cell - 5
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass === 0 ? palette.on : palette.rogue
      for (let i = 0; i < level.length; i++) {
        const v = level[i]
        if (v < 0.04 || rogue[i] !== pass) continue
        const q = i % cols
        const r = (i / cols) | 0
        const size = 2 + v * (maxSize - 2)
        ctx.globalAlpha = Math.min(1, v * 1.15)
        ctx.fillRect(
          q * cell + (cell - size) / 2,
          r * cell + (cell - size) / 2,
          size,
          size
        )
      }
    }
    ctx.globalAlpha = 1

    const hole = this.opts.hole()
    if (hole) ctx.clearRect(hole.x, hole.y, hole.w, hole.h)
  }
}
