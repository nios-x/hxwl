"use client"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { memo, useEffect, useRef, useState } from "react"
import {
    CandlestickSeries,
    createChart,
    ColorType,
    LineSeries,
    type Time,
    type UTCTimestamp,
} from "lightweight-charts"
import { Avatar, Chevron } from "../../components/Icons"
import { Nav } from "../../components/Nav"
import { SignalPath, StreamStats } from "../../components/StreamStats"
import { formatChange, formatClock, formatPrice, priceDecimals } from "../../lib/format"
import { registerRow } from "../../lib/live"
import { channels, holdChannels } from "../../lib/stream"
import { coinNames, groupOf } from "../../listings"

// ---- Tuning knobs ----
const INTERVALS = [
    { label: "1s", ms: 1000 },
    { label: "5s", ms: 5000 },
    { label: "15s", ms: 15000 },
    { label: "1m", ms: 60000 },
] as const
const MAX_CANDLES = 5000
const TRIM_BATCH = 500         // trim in batches so we don't rebuild the series every frame
const TICK_BAR_SCALE = 0.04    // a tick this big, in percent, fills its row's bar

type ChartKind = "candles" | "line"
type Candle = { time: UTCTimestamp; open: number; high: number; low: number; close: number }

const clock = (t: Time) =>
    new Date((t as number) * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })

const MarketLink = memo(function MarketLink({ name, current }: { name: string; current: boolean }) {
    const rootRef = useRef<HTMLAnchorElement>(null)
    const priceRef = useRef<HTMLSpanElement>(null)
    const changeRef = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        if (!rootRef.current) return
        return registerRow({ name, root: rootRef.current, price: priceRef.current, change: changeRef.current })
    }, [name])

    return (
        <Link ref={rootRef} href={`/coin/${name}`} className="side-row" aria-current={current ? "page" : undefined} prefetch={false}>
            <Avatar name={name} size={20} />
            <strong>{name}</strong>
            <span ref={priceRef} className="side-price">
                —
            </span>
            <span className="change">
                <span ref={changeRef}>—</span>
            </span>
        </Link>
    )
})

function CoinView({ name }: { name: string }) {
    const router = useRouter()
    const pageRef = useRef<HTMLElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const priceRef = useRef<HTMLParagraphElement>(null)
    const changeRef = useRef<HTMLSpanElement>(null)
    const firstRef = useRef<HTMLElement>(null)
    const highRef = useRef<HTMLElement>(null)
    const lowRef = useRef<HTMLElement>(null)
    const ticksRef = useRef<HTMLElement>(null)
    const legendRef = useRef<HTMLParagraphElement>(null)
    const lastFrameRef = useRef<HTMLElement>(null)
    const ticksListRef = useRef<HTMLOListElement>(null)

    const [interval, setIntervalChoice] = useState(0)
    const [kind, setKind] = useState<ChartKind>("candles")
    const [query, setQuery] = useState("")

    const index = coinNames.indexOf(name)
    const previous = coinNames[(index - 1 + coinNames.length) % coinNames.length]
    const next = coinNames[(index + 1) % coinNames.length]

    useEffect(() => holdChannels(coinNames), [])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey || e.target instanceof HTMLInputElement) return
            if (e.key === "ArrowLeft") router.push(`/coin/${previous}`)
            if (e.key === "ArrowRight") router.push(`/coin/${next}`)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [router, previous, next])

    // ---------- Pair bar and recent ticks ----------
    useEffect(() => {
        const ch = channels.get(name)
        if (!ch) return
        let seen = -1
        let raf = 0

        const row = (price: number, older: number | undefined, t: number) => {
            const pct = older ? ((price - older) / older) * 100 : 0
            const li = document.createElement("li")
            li.dataset.dir = pct < 0 ? "down" : "up"
            li.style.setProperty("--bar", `${Math.min(Math.abs(pct) / TICK_BAR_SCALE, 1) * 100}%`)
            for (const text of [formatPrice(price), formatChange(pct), formatClock(t)]) {
                const span = document.createElement("span")
                span.textContent = text
                li.append(span)
            }
            return li
        }

        const frame = () => {
            raf = requestAnimationFrame(frame)
            if (ch.ticks === seen || ch.last === null || ch.first === null) return
            seen = ch.ticks
            const pct = ((ch.last - ch.first) / ch.first) * 100
            if (priceRef.current) priceRef.current.textContent = formatPrice(ch.last)
            if (changeRef.current) changeRef.current.textContent = formatChange(pct)
            if (firstRef.current) firstRef.current.textContent = formatPrice(ch.first)
            if (highRef.current && ch.high !== null) highRef.current.textContent = formatPrice(ch.high)
            if (lowRef.current && ch.low !== null) lowRef.current.textContent = formatPrice(ch.low)
            if (ticksRef.current) ticksRef.current.textContent = ch.ticks.toLocaleString("en-US")
            if (pageRef.current) pageRef.current.dataset.dir = pct < 0 ? "down" : "up"
            if (lastFrameRef.current && ch.frames[0]) lastFrameRef.current.textContent = ch.frames[0].raw
            ticksListRef.current?.replaceChildren(
                ...ch.frames.map((f, i) => row(f.price, ch.frames[i + 1]?.price, f.t)),
            )
        }
        raf = requestAnimationFrame(frame)
        return () => cancelAnimationFrame(raf)
    }, [name])

    // ---------- Chart ----------
    useEffect(() => {
        const el = containerRef.current
        const ch = channels.get(name)
        if (!el || !ch) return

        const css = getComputedStyle(el)
        const color = (token: string) => css.getPropertyValue(token).trim()
        const UP = color("--up")
        const DOWN = color("--down")
        const intervalMs = INTERVALS[interval]!.ms

        const chart = createChart(el, {
            autoSize: true,
            layout: {
                background: { type: ColorType.Solid, color: color("--bg") },
                textColor: color("--muted"),
                fontFamily: color("--font-mono") || "monospace",
                fontSize: 11,
                attributionLogo: false,
            },
            grid: {
                vertLines: { color: color("--chart-grid") },
                horzLines: { color: color("--chart-grid") },
            },
            rightPriceScale: { borderColor: color("--border"), scaleMargins: { top: 0.12, bottom: 0.08 } },
            timeScale: {
                borderColor: color("--border"),
                barSpacing: 9,
                minBarSpacing: 1,
                rightOffset: 6,
                tickMarkFormatter: (t: Time) => clock(t),
            },
            localization: { timeFormatter: (t: Time) => clock(t) },
            crosshair: {
                mode: 0,
                vertLine: { color: color("--border-strong"), labelBackgroundColor: color("--surface-2") },
                horzLine: { color: color("--border-strong"), labelBackgroundColor: color("--surface-2") },
            },
        })

        const series =
            kind === "candles"
                ? chart.addSeries(CandlestickSeries, {
                      upColor: UP,
                      downColor: DOWN,
                      wickUpColor: UP,
                      wickDownColor: DOWN,
                      borderVisible: false,
                      priceLineColor: color("--muted"),
                  })
                : chart.addSeries(LineSeries, { color: color("--text"), lineWidth: 2, priceLineColor: color("--muted") })

        // Candles are built here from the live ticks, because the stream only carries prices
        const candles: Candle[] = []
        const addTick = (t: number, p: number) => {
            const time = ((Math.floor(t / intervalMs) * intervalMs) / 1000) as UTCTimestamp
            const open = candles[candles.length - 1]
            if (open && open.time === time) {
                open.high = Math.max(open.high, p)
                open.low = Math.min(open.low, p)
                open.close = p
                return open
            }
            const start = open?.close ?? p
            const candle = { time, open: start, high: Math.max(start, p), low: Math.min(start, p), close: p }
            candles.push(candle)
            return candle
        }
        const point = (c: Candle) => (kind === "candles" ? { ...c } : { time: c.time, value: c.close })
        const setAll = () => (series.setData as (data: ReturnType<typeof point>[]) => void)(candles.map(point))
        const push = (c: Candle) => (series.update as (bar: ReturnType<typeof point>) => void)(point(c))

        const writeLegend = (c: Candle | undefined) => {
            if (!legendRef.current || !c) return
            const parts: [string, number][] = [["O", c.open], ["H", c.high], ["L", c.low], ["C", c.close]]
            legendRef.current.replaceChildren(
                ...parts.flatMap(([label, value]) => {
                    const span = document.createElement("span")
                    const b = document.createElement("b")
                    b.textContent = label
                    span.append(b, ` ${formatPrice(value)}`)
                    return [span]
                }),
            )
        }

        ch.times.forEach((t, i) => addTick(t, ch.prices[i]!))
        if (candles.length > 0) setAll()
        writeLegend(candles[candles.length - 1])

        chart.subscribeCrosshairMove((param) => {
            const hovered = param.time === undefined ? undefined : candles.find((c) => c.time === param.time)
            writeLegend(hovered ?? candles[candles.length - 1])
        })

        let lastT = ch.times[ch.times.length - 1] ?? 0
        let seen = ch.ticks
        let precision: number | null = null
        let raf = 0

        const setPrecision = () => {
            if (ch.last === null) return
            const digits = priceDecimals(ch.last)
            if (digits === precision) return
            precision = digits
            series.applyOptions({ priceFormat: { type: "price", precision: digits, minMove: 1 / 10 ** digits } })
        }
        setPrecision()

        const frame = () => {
            raf = requestAnimationFrame(frame)
            if (ch.ticks === seen) return
            seen = ch.ticks
            setPrecision()

            // Ticks only ever append, so walk back to the first one this chart hasn't drawn
            let i = ch.times.length
            while (i > 0 && ch.times[i - 1]! > lastT) i--
            for (; i < ch.times.length; i++) {
                const candle = addTick(ch.times[i]!, ch.prices[i]!)
                push(candle)
                writeLegend(candle)
                lastT = ch.times[i]!
            }

            if (candles.length > MAX_CANDLES + TRIM_BATCH) {
                candles.splice(0, TRIM_BATCH)
                setAll()
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            chart.remove()
        }
    }, [name, interval, kind])

    const needle = query.trim().toUpperCase()
    const sideList = coinNames.filter((coin) => coin.includes(needle))

    return (
        <main ref={pageRef} className="coin" data-dir="up">
            <div className="pair">
                <div className="pair-name">
                    <Avatar name={name} size={36} />
                    <div>
                        <h1>{name}/USD</h1>
                        <p>{groupOf(name)}</p>
                    </div>
                    <div className="pair-step">
                        <Link href={`/coin/${previous}`} className="icon-button" aria-label={`Previous coin, ${previous}`}>
                            <Chevron left />
                        </Link>
                        <Link href={`/coin/${next}`} className="icon-button" aria-label={`Next coin, ${next}`}>
                            <Chevron />
                        </Link>
                    </div>
                </div>
                <div className="pair-price">
                    <p ref={priceRef}>—</p>
                    <span className="change">
                        <span className="tri" aria-hidden="true" />
                        <span ref={changeRef}>—</span>
                    </span>
                </div>
                <dl className="pair-stats">
                    <div>
                        <dt>First seen</dt>
                        <dd ref={firstRef}>—</dd>
                    </div>
                    <div>
                        <dt>Session high</dt>
                        <dd ref={highRef}>—</dd>
                    </div>
                    <div>
                        <dt>Session low</dt>
                        <dd ref={lowRef}>—</dd>
                    </div>
                    <div>
                        <dt>Ticks received</dt>
                        <dd ref={ticksRef}>0</dd>
                    </div>
                </dl>
            </div>

            <div className="terminal">
                <section className="term-chart" aria-label={`${name} price chart`}>
                    <div className="chart-bar">
                        <div className="tabs tabs-compact" role="group" aria-label="Candle interval">
                            {INTERVALS.map((option, i) => (
                                <button key={option.label} type="button" aria-pressed={interval === i} onClick={() => setIntervalChoice(i)}>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <p ref={legendRef} className="chart-legend" />
                        <div className="tabs tabs-compact" role="group" aria-label="Chart type">
                            <button type="button" aria-pressed={kind === "candles"} onClick={() => setKind("candles")}>
                                Candles
                            </button>
                            <button type="button" aria-pressed={kind === "line"} onClick={() => setKind("line")}>
                                Line
                            </button>
                        </div>
                    </div>
                    <div className="chart">
                        <div ref={containerRef} className="chart-mount" />
                    </div>
                </section>

                <section className="term-ticks" aria-label="Recent ticks">
                    <h2>Recent ticks</h2>
                    <div className="ticks-head" aria-hidden="true">
                        <span>Price (USD)</span>
                        <span>Move</span>
                        <span>Time</span>
                    </div>
                    <ol ref={ticksListRef} className="ticks" />
                </section>

                <aside className="term-side">
                    <section className="side-markets" aria-label="Markets">
                        <label className="search search-full">
                            <span className="sr-only">Search coins</span>
                            <input
                                type="search"
                                placeholder="Search coins"
                                value={query}
                                autoComplete="off"
                                spellCheck={false}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </label>
                        <div className="side-list">
                            {sideList.map((coin) => (
                                <MarketLink key={coin} name={coin} current={coin === name} />
                            ))}
                            {sideList.length === 0 && <p className="side-empty">No coins match.</p>}
                        </div>
                    </section>
                    <section className="side-stream" aria-label="Stream">
                        <h2>Stream</h2>
                        <StreamStats />
                        <SignalPath />
                        <dl className="wire">
                            <div>
                                <dt>Sent</dt>
                                <dd>{JSON.stringify({ start: name })}</dd>
                            </div>
                            <div>
                                <dt>Last</dt>
                                <dd ref={lastFrameRef}>Waiting for the first frame</dd>
                            </div>
                        </dl>
                        <p className="side-credit">
                            Prices are simulated. Chart by{" "}
                            <a href="https://www.tradingview.com/lightweight-charts/" target="_blank" rel="noreferrer">
                                TradingView Lightweight Charts
                            </a>
                            .
                        </p>
                    </section>
                </aside>
            </div>
        </main>
    )
}

export default function Page() {
    const params = useParams()
    const name = String(params.id).toUpperCase()
    const known = channels.has(name)

    return (
        <div className="coin-page">
            <Nav coin={known ? name : undefined} />
            {known ? (
                <CoinView key={name} name={name} />
            ) : (
                <main className="empty empty-page">
                    <h1>There is no coin called {name} on this stream.</h1>
                    <Link href="/" className="button">
                        Back to markets
                    </Link>
                </main>
            )}
        </div>
    )
}
