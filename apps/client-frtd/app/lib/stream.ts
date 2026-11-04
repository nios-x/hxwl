import { useSyncExternalStore } from "react"
import { coinNames } from "../listings"

// One WebSocket for the whole app. Pages say which coins they need with holdChannels(),
// and the socket sends start/stop to match, so ws-server only pushes what is on screen.

export type Status = "connecting" | "live" | "retrying"

export type Frame = { t: number; raw: string; price: number }

export type Channel = {
    name: string
    first: number | null    // the first price this tab received
    previous: number | null
    last: number | null
    high: number | null
    low: number | null
    ticks: number
    lastAt: number
    times: number[]
    prices: number[]
    frames: Frame[]         // newest first
}

export type Telemetry = {
    status: Status
    url: string
    framesPerSecond: number
    channelCount: number
    reconnects: number
    connectedAt: number | null
    retryAt: number | null
    lastFrameAt: number
    now: number
}

// Ticks can pause for a few seconds between Kafka batches. A gap longer than this means
// the coin really stopped, so sparklines break there and its numbers lose their colour.
export const GAP_MS = 6000

const HISTORY = 7200            // 30 minutes at 4 ticks/sec, enough to fill the candle chart
const TRIM_BATCH = 400
const FRAMES_KEPT = 40
const SILENT_AFTER_MS = 3000
const RECONNECT_MAX_MS = 10000
const RATE_WINDOW_SECONDS = 3

export const channels = new Map<string, Channel>(
    coinNames.map((name) => [
        name,
        { name, first: null, previous: null, last: null, high: null, low: null, ticks: 0, lastAt: 0, times: [], prices: [], frames: [] },
    ]),
)

const serverSnapshot: Telemetry = {
    status: "connecting",
    url: "",
    framesPerSecond: 0,
    channelCount: 0,
    reconnects: 0,
    connectedAt: null,
    retryAt: null,
    lastFrameAt: 0,
    now: 0,
}

let telemetry = serverSnapshot
const listeners = new Set<() => void>()

let socket: WebSocket | null = null
let started = false
let attempts = 0
let everConnected = false
let framesThisSecond = 0
const rateHistory: number[] = []

const wanted = new Map<string, number>()
const active = new Set<string>()
let syncQueued = false

function publish(changes: Partial<Telemetry>) {
    telemetry = { ...telemetry, ...changes, channelCount: active.size, now: Date.now() }
    for (const listener of listeners) listener()
}

function streamUrl() {
    if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL
    return `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:3001`
}

function receive(raw: string) {
    let frame: { name?: unknown; basePrice?: unknown }
    try {
        frame = JSON.parse(raw)
    } catch {
        return
    }
    const ch = channels.get(String(frame.name))
    const price = frame.basePrice
    if (!ch || typeof price !== "number") return

    const now = Date.now()
    ch.first ??= price
    ch.previous = ch.last
    ch.last = price
    ch.high = ch.high === null ? price : Math.max(ch.high, price)
    ch.low = ch.low === null ? price : Math.min(ch.low, price)
    ch.ticks++
    ch.lastAt = now
    ch.times.push(now)
    ch.prices.push(price)
    if (ch.times.length > HISTORY + TRIM_BATCH) {
        ch.times.splice(0, TRIM_BATCH)
        ch.prices.splice(0, TRIM_BATCH)
    }
    ch.frames.unshift({ t: now, raw, price })
    if (ch.frames.length > FRAMES_KEPT) ch.frames.pop()

    framesThisSecond++
    telemetry.lastFrameAt = now
}

function sync() {
    syncQueued = false
    if (socket?.readyState !== WebSocket.OPEN) return
    for (const name of wanted.keys()) {
        if (active.has(name)) continue
        active.add(name)
        socket.send(JSON.stringify({ start: name }))
    }
    for (const name of active) {
        if (wanted.has(name)) continue
        active.delete(name)
        socket.send(JSON.stringify({ stop: name }))
    }
    publish({})
}

function connect() {
    const ws = new WebSocket(telemetry.url)
    socket = ws

    ws.onopen = () => {
        attempts = 0
        const reconnects = telemetry.reconnects + (everConnected ? 1 : 0)
        everConnected = true
        active.clear()
        publish({ status: "live", connectedAt: Date.now(), retryAt: null, reconnects })
        sync()
    }
    ws.onmessage = (ev) => receive(ev.data)
    ws.onclose = () => {
        if (socket !== ws) return
        socket = null
        active.clear()
        const delay = Math.min(1000 * 2 ** attempts, RECONNECT_MAX_MS)
        attempts++
        publish({ status: "retrying", connectedAt: null, retryAt: Date.now() + delay })
        setTimeout(connect, delay)
    }
}

function start() {
    if (started) return
    started = true
    telemetry = { ...telemetry, url: streamUrl() }
    connect()
    setInterval(() => {
        rateHistory.push(framesThisSecond)
        framesThisSecond = 0
        if (rateHistory.length > RATE_WINDOW_SECONDS) rateHistory.shift()
        const sum = rateHistory.reduce((a, b) => a + b, 0)
        publish({ framesPerSecond: Math.round(sum / rateHistory.length) })
    }, 1000)
}

// Returns a release function. Syncing waits a tick so that when one page leaves and the next
// arrives in the same commit, a coin they share keeps streaming without a stop and start.
export function holdChannels(names: string[]) {
    start()
    for (const name of names) wanted.set(name, (wanted.get(name) ?? 0) + 1)
    queueSync()
    return () => {
        for (const name of names) {
            const count = (wanted.get(name) ?? 0) - 1
            if (count > 0) wanted.set(name, count)
            else wanted.delete(name)
        }
        queueSync()
    }
}

function queueSync() {
    if (syncQueued) return
    syncQueued = true
    setTimeout(sync, 0)
}

function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

export const getTelemetry = () => telemetry

export function describeStream(t: Telemetry) {
    if (t.status === "connecting") return { label: "Connecting", live: false, notice: "" }
    if (t.status === "retrying") {
        const seconds = Math.max(0, Math.ceil(((t.retryAt ?? 0) - t.now) / 1000))
        return {
            label: "No connection",
            live: false,
            notice: `No connection to ${t.url}. Retrying in ${seconds} s. Check that ws-server is running.`,
        }
    }
    if (t.channelCount > 0 && t.now - Math.max(t.lastFrameAt, t.connectedAt ?? 0) > SILENT_AFTER_MS) {
        return {
            label: "No prices",
            live: false,
            notice: "Connected, but no prices are arriving. Check that exchange-server is running.",
        }
    }
    return { label: "Live", live: true, notice: "" }
}

export const useTelemetry = () => useSyncExternalStore(subscribe, getTelemetry, () => serverSnapshot)
