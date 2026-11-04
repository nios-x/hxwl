const formatters = new Map<number, Intl.NumberFormat>()

export function priceDecimals(p: number) {
    if (p >= 1000) return 2
    if (p >= 1) return 4
    if (p >= 0.01) return 5
    return 8
}

export function formatPrice(p: number) {
    const digits = priceDecimals(p)
    let f = formatters.get(digits)
    if (!f) {
        f = new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })
        formatters.set(digits, f)
    }
    return f.format(p)
}

export function formatChange(pct: number) {
    const sign = pct < 0 ? "−" : "+"
    return `${sign}${Math.abs(pct).toFixed(3)}%`
}

export function formatDuration(ms: number) {
    const total = Math.floor(ms / 1000)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = String(total % 60).padStart(2, "0")
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`
    return `${m}m ${s}s`
}

export function formatClock(t: number) {
    const d = new Date(t)
    return (
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) +
        "." +
        String(d.getMilliseconds()).padStart(3, "0").slice(0, 1)
    )
}
