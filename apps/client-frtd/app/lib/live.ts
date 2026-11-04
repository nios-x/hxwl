import { formatChange, formatPrice } from "./format"
import { channels, GAP_MS, type Channel } from "./stream"

// One shared rAF loop writes the numbers and sparklines of every visible row,
// so a stream of 288 frames/sec never has to go through React.

// ---- Tuning knobs ----
const FRAME_MS = 66             // about 15 fps is plenty for a sparkline
const REDUCED_FRAME_MS = 1000   // with reduced motion, rows update once a second
const SPARK_WINDOW_MS = 60000   // the most history a sparkline shows
const MIN_SPARK_WINDOW_MS = 8000 // a new sparkline stretches its first seconds across the full width
const MIN_SPAN = 0.0004         // a sparkline spans at least 0.04% of the price, so noise stays small
const SCALE_EASE_MS = 300       // how quickly a sparkline's vertical range follows the price
const FLASH_MS = 220            // shorter than the gap between ticks, so a row settles between flashes
const PADDING = 3
const MIN_POINT_GAP = 1         // skip points closer than this many pixels

export type RowParts = {
    name: string
    root: HTMLElement
    spark?: HTMLCanvasElement | null
    price?: HTMLElement | null
    change?: HTMLElement | null
    high?: HTMLElement | null
    low?: HTMLElement | null
    fill?: boolean
}

type Row = RowParts & {
    channel: Channel
    ctx: CanvasRenderingContext2D | null
    width: number
    height: number
    dpr: number
    visible: boolean
    lo: number | null
    hi: number | null
    seen: number
}

const rows = new Set<Row>()
const rowOf = new WeakMap<Element, Row>()

let raf = 0
let lastFrame = 0
let colors: Record<"up" | "down" | "upFlash" | "downFlash", string> | null = null

function readColors() {
    const css = getComputedStyle(document.documentElement)
    const get = (name: string) => css.getPropertyValue(name).trim()
    return { up: get("--up"), down: get("--down"), upFlash: get("--up-flash"), downFlash: get("--down-flash") }
}

function writeNumbers(row: Row, wall: number, reduced: boolean) {
    const ch = row.channel
    const lifted = wall - ch.lastAt > GAP_MS
    if (row.root.dataset.stale !== String(lifted)) row.root.dataset.stale = String(lifted)
    if (row.seen === ch.ticks || ch.last === null || ch.first === null || !colors) return

    const pct = ((ch.last - ch.first) / ch.first) * 100
    if (row.price) row.price.textContent = formatPrice(ch.last)
    if (row.change) row.change.textContent = formatChange(pct)
    if (row.high && ch.high !== null) row.high.textContent = formatPrice(ch.high)
    if (row.low && ch.low !== null) row.low.textContent = formatPrice(ch.low)
    row.root.dataset.dir = pct < 0 ? "down" : "up"

    // Only a single new tick flashes, so returning to a row that was off screen stays calm
    if (row.price && !reduced && row.seen === ch.ticks - 1 && ch.previous !== null && ch.previous !== ch.last) {
        row.price.animate(
            { backgroundColor: [ch.last > ch.previous ? colors.upFlash : colors.downFlash, "transparent"] },
            { duration: FLASH_MS, easing: "ease-out" },
        )
    }
    row.seen = ch.ticks
}

function drawSpark(row: Row, wall: number, dt: number, reduced: boolean) {
    const { ctx, width: w, height: h, dpr, channel: ch } = row
    if (!ctx || w === 0 || h === 0 || !colors) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const { times, prices, first, last } = ch
    const n = times.length
    if (n === 0 || first === null || last === null) return

    let start = n - 1
    let lo = prices[n - 1]!
    let hi = lo
    const windowMs = Math.min(SPARK_WINDOW_MS, Math.max(wall - times[0]!, MIN_SPARK_WINDOW_MS))
    const oldest = wall - windowMs
    while (start > 0 && times[start - 1]! >= oldest) {
        start--
        lo = Math.min(lo, prices[start]!)
        hi = Math.max(hi, prices[start]!)
    }

    const span = Math.max(hi - lo, last * MIN_SPAN) * 1.15
    const mid = (hi + lo) / 2
    const follow = row.lo === null || reduced ? 1 : 1 - Math.exp(-dt / SCALE_EASE_MS)
    row.lo = (row.lo ?? 0) + (mid - span / 2 - (row.lo ?? 0)) * follow
    row.hi = (row.hi ?? 0) + (mid + span / 2 - (row.hi ?? 0)) * follow
    const bottom = row.lo
    const range = row.hi - bottom || 1
    const yAt = (p: number) => h - PADDING - ((p - bottom) / range) * (h - PADDING * 2)
    const xAt = (t: number) => w - (wall - t) * (w / windowMs)

    const color = last >= first ? colors.up : colors.down
    const line = new Path2D()
    const area = new Path2D()
    let runStart = 0
    let prevX = -Infinity
    let prevT = 0

    for (let i = start; i < n; i++) {
        const t = times[i]!
        const x = xAt(t)
        const y = yAt(prices[i]!)
        if (i === start || t - prevT > GAP_MS) {
            if (i !== start) {
                area.lineTo(prevX, h)
                area.lineTo(runStart, h)
                area.closePath()
            }
            line.moveTo(x, y)
            area.moveTo(x, y)
            runStart = x
            prevX = x
        } else if (x - prevX >= MIN_POINT_GAP || i === n - 1) {
            line.lineTo(x, y)
            area.lineTo(x, y)
            prevX = x
        }
        prevT = t
    }

    if (wall - ch.lastAt < GAP_MS) {
        line.lineTo(w, yAt(last))
        area.lineTo(w, yAt(last))
        prevX = w
    }

    if (row.fill) {
        area.lineTo(prevX, h)
        area.lineTo(runStart, h)
        area.closePath()
        const shade = ctx.createLinearGradient(0, 0, 0, h)
        shade.addColorStop(0, `${color}38`)
        shade.addColorStop(1, `${color}00`)
        ctx.fillStyle = shade
        ctx.fill(area)
    }

    ctx.strokeStyle = color
    ctx.lineWidth = row.fill ? 1.5 : 1.25
    ctx.lineJoin = "round"
    ctx.stroke(line)
}

function frame(now: number) {
    raf = requestAnimationFrame(frame)
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
    if (now - lastFrame < (reduced ? REDUCED_FRAME_MS : FRAME_MS)) return
    const dt = Math.min(now - lastFrame, 200)
    lastFrame = now

    const wall = Date.now()
    for (const row of rows) {
        if (!row.visible) continue
        writeNumbers(row, wall, reduced)
        if (row.spark) drawSpark(row, wall, dt, reduced)
    }
}

const visibility =
    typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => {
              for (const entry of entries) {
                  const row = rowOf.get(entry.target)
                  if (row) row.visible = entry.isIntersecting
              }
          })

const sizing =
    typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver((entries) => {
              for (const entry of entries) {
                  const row = rowOf.get(entry.target)
                  if (!row?.spark) continue
                  row.dpr = window.devicePixelRatio || 1
                  row.width = entry.contentRect.width
                  row.height = entry.contentRect.height
                  row.spark.width = Math.round(row.width * row.dpr)
                  row.spark.height = Math.round(row.height * row.dpr)
              }
          })

export function registerRow(parts: RowParts) {
    const channel = channels.get(parts.name)
    if (!channel) return () => {}

    colors ??= readColors()
    const row: Row = {
        ...parts,
        channel,
        ctx: parts.spark?.getContext("2d") ?? null,
        width: 0,
        height: 0,
        dpr: 1,
        visible: true,
        lo: null,
        hi: null,
        seen: -1,
    }
    rows.add(row)
    rowOf.set(parts.root, row)
    visibility?.observe(parts.root)
    if (parts.spark) {
        rowOf.set(parts.spark, row)
        sizing?.observe(parts.spark)
    }
    if (rows.size === 1) raf = requestAnimationFrame(frame)

    return () => {
        rows.delete(row)
        visibility?.unobserve(parts.root)
        if (parts.spark) sizing?.unobserve(parts.spark)
        if (rows.size === 0) cancelAnimationFrame(raf)
    }
}
