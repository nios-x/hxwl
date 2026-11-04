"use client"
import Link from "next/link"
import { memo, useEffect, useMemo, useRef, useState } from "react"
import { registerRow } from "../lib/live"
import { channels, holdChannels } from "../lib/stream"
import { coinNames, groupOf, groups } from "../listings"
import { Avatar, SortIcon } from "./Icons"
import { SignalPath, StreamStats } from "./StreamStats"

const RERANK_MS = 3000
const FEATURED = ["BTC", "ETH", "SOL", "BNB"]

type Tab = "all" | "gainers" | "losers"
type SortKey = "name" | "price" | "change"
type Sort = { key: SortKey; dir: 1 | -1 } | null

const TABS: { id: Tab; label: string }[] = [
    { id: "all", label: "All coins" },
    { id: "gainers", label: "Gainers" },
    { id: "losers", label: "Losers" },
]

function moveOf(name: string) {
    const ch = channels.get(name)
    if (!ch || ch.last === null || !ch.first) return null
    return (ch.last - ch.first) / ch.first
}

const FeaturedCard = memo(function FeaturedCard({ name }: { name: string }) {
    const rootRef = useRef<HTMLAnchorElement>(null)
    const sparkRef = useRef<HTMLCanvasElement>(null)
    const priceRef = useRef<HTMLSpanElement>(null)
    const changeRef = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        if (!rootRef.current) return
        return registerRow({
            name,
            root: rootRef.current,
            spark: sparkRef.current,
            price: priceRef.current,
            change: changeRef.current,
            fill: true,
        })
    }, [name])

    return (
        <Link ref={rootRef} href={`/coin/${name}`} className="card" prefetch={false}>
            <span className="card-head">
                <Avatar name={name} />
                <span className="card-name">{name}</span>
                <span className="change">
                    <span className="tri" aria-hidden="true" />
                    <span ref={changeRef}>—</span>
                </span>
            </span>
            <span ref={priceRef} className="card-price">
                —
            </span>
            <canvas ref={sparkRef} className="card-spark" aria-hidden="true" />
        </Link>
    )
})

const MarketRow = memo(function MarketRow({ name }: { name: string }) {
    const rootRef = useRef<HTMLTableRowElement>(null)
    const sparkRef = useRef<HTMLCanvasElement>(null)
    const priceRef = useRef<HTMLSpanElement>(null)
    const changeRef = useRef<HTMLSpanElement>(null)
    const highRef = useRef<HTMLTableCellElement>(null)
    const lowRef = useRef<HTMLTableCellElement>(null)

    useEffect(() => {
        if (!rootRef.current) return
        return registerRow({
            name,
            root: rootRef.current,
            spark: sparkRef.current,
            price: priceRef.current,
            change: changeRef.current,
            high: highRef.current,
            low: lowRef.current,
        })
    }, [name])

    return (
        <tr ref={rootRef} className="market-row">
            <td>
                <Link href={`/coin/${name}`} className="asset" prefetch={false}>
                    <Avatar name={name} />
                    <span className="asset-text">
                        <strong>{name}</strong>
                        <small>{groupOf(name)}</small>
                    </span>
                </Link>
            </td>
            <td className="num">
                <span ref={priceRef} className="price">
                    —
                </span>
            </td>
            <td className="num">
                <span className="change">
                    <span className="tri" aria-hidden="true" />
                    <span ref={changeRef}>—</span>
                </span>
            </td>
            <td ref={highRef} className="num muted hide-small">
                —
            </td>
            <td ref={lowRef} className="num muted hide-small">
                —
            </td>
            <td className="spark-cell hide-small">
                <canvas ref={sparkRef} className="row-spark" aria-hidden="true" />
            </td>
        </tr>
    )
})

function SortHeader({ label, sortKey, sort, onSort, numeric = true }: { label: string; sortKey: SortKey; sort: Sort; onSort: (key: SortKey) => void; numeric?: boolean }) {
    const dir = sort?.key === sortKey ? sort.dir : null
    const ariaSort = dir === null ? "none" : dir === 1 ? "ascending" : "descending"
    return (
        <th scope="col" className={numeric ? "num" : undefined} aria-sort={ariaSort}>
            <button type="button" className="sort" onClick={() => onSort(sortKey)}>
                {label}
                <SortIcon dir={dir} />
            </button>
        </th>
    )
}

export function Markets() {
    const [query, setQuery] = useState("")
    const [tab, setTab] = useState<Tab>("all")
    const [group, setGroup] = useState("all")
    const [sort, setSort] = useState<Sort>(null)
    const [rank, setRank] = useState(0)
    const searchRef = useRef<HTMLInputElement>(null)

    useEffect(() => holdChannels(coinNames), [])

    // Live orders are re-ranked on a slow timer, so rows don't jump on every tick
    const ranking = tab !== "all" || (sort !== null && sort.key !== "name")
    useEffect(() => {
        if (!ranking) return
        setRank((r) => r + 1)
        const timer = setInterval(() => setRank((r) => r + 1), RERANK_MS)
        return () => clearInterval(timer)
    }, [ranking])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "/" || e.target instanceof HTMLInputElement) return
            e.preventDefault()
            searchRef.current?.focus()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [])

    const needle = query.trim().toUpperCase()
    const list = useMemo(() => {
        let names = coinNames.filter((name) => name.includes(needle))
        if (group !== "all") names = names.filter((name) => groupOf(name) === group)
        if (tab === "gainers") names = names.filter((name) => (moveOf(name) ?? 0) > 0)
        if (tab === "losers") names = names.filter((name) => (moveOf(name) ?? 0) < 0)

        const value = (name: string, key: SortKey) => {
            if (key === "price") return channels.get(name)?.last ?? 0
            return moveOf(name) ?? 0
        }
        if (sort?.key === "name") return [...names].sort((a, b) => a.localeCompare(b) * sort.dir)
        if (sort) return [...names].sort((a, b) => (value(a, sort.key) - value(b, sort.key)) * sort.dir)
        if (tab === "gainers") return [...names].sort((a, b) => (moveOf(b) ?? 0) - (moveOf(a) ?? 0))
        if (tab === "losers") return [...names].sort((a, b) => (moveOf(a) ?? 0) - (moveOf(b) ?? 0))
        return names
        // rank is the timer that re-reads live prices
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [needle, group, tab, sort, rank])

    const onSort = (key: SortKey) => {
        setSort((s) => {
            if (s?.key !== key) return { key, dir: key === "name" ? 1 : -1 }
            if (s.dir === (key === "name" ? 1 : -1)) return { key, dir: key === "name" ? -1 : 1 }
            return null
        })
    }

    const clear = () => {
        setQuery("")
        setGroup("all")
        setTab("all")
    }

    return (
        <main className="page">
            <div className="page-head">
                <div>
                    <h1>Markets</h1>
                    <p>{coinNames.length} coins streaming live over one WebSocket.</p>
                </div>
                <SignalPath />
            </div>

            <section aria-label="Stream health" className="panel">
                <StreamStats />
            </section>

            <section aria-label="Featured coins" className="cards">
                {FEATURED.map((name) => (
                    <FeaturedCard key={name} name={name} />
                ))}
            </section>

            <section aria-label="All coins" className="markets">
                <div className="toolbar">
                    <div className="tabs" role="group" aria-label="Show">
                        {TABS.map((t) => (
                            <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div className="toolbar-right">
                        <label className="select">
                            <span className="sr-only">Group</span>
                            <select value={group} onChange={(e) => setGroup(e.target.value)}>
                                <option value="all">All groups</option>
                                {groups.map((g) => (
                                    <option key={g.name} value={g.name}>
                                        {g.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="search">
                            <span className="sr-only">Search coins</span>
                            <input
                                ref={searchRef}
                                type="search"
                                placeholder="Search coins"
                                value={query}
                                autoComplete="off"
                                spellCheck={false}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Escape") setQuery("")
                                }}
                            />
                            <kbd>/</kbd>
                        </label>
                    </div>
                </div>

                {list.length === 0 ? (
                    <div className="empty">
                        <p>
                            {tab !== "all" && !needle && group === "all"
                                ? `No ${tab} yet. Change is measured from when this tab first saw each coin.`
                                : "No coins match these filters."}
                        </p>
                        <button type="button" className="button" onClick={clear}>
                            Show all coins
                        </button>
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <SortHeader label="Coin" sortKey="name" sort={sort} onSort={onSort} numeric={false} />
                                <SortHeader label="Price (USD)" sortKey="price" sort={sort} onSort={onSort} />
                                <SortHeader label="Change" sortKey="change" sort={sort} onSort={onSort} />
                                <th scope="col" className="num hide-small">
                                    High
                                </th>
                                <th scope="col" className="num hide-small">
                                    Low
                                </th>
                                <th scope="col" className="spark-cell hide-small">
                                    Trend
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((name) => (
                                <MarketRow key={name} name={name} />
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            <footer className="footer">
                <p>Prices are simulated by exchange-server, not real markets. Change, high and low count from when this tab first saw each coin.</p>
            </footer>
        </main>
    )
}
