"use client"
import Link from "next/link"
import { describeStream, useTelemetry } from "../lib/stream"
import { Mark, Slash } from "./Icons"

export function Nav({ coin }: { coin?: string }) {
    const t = useTelemetry()
    const stream = describeStream(t)

    return (
        <>
            <header className="nav">
                <nav className="nav-path" aria-label="Breadcrumb">
                    <Link href="/" className="brand">
                        <Mark />
                        hxwl
                    </Link>
                    <Slash />
                    <Link href="/" className="crumb" aria-current={coin ? undefined : "page"}>
                        Markets
                    </Link>
                    {coin && (
                        <>
                            <Slash />
                            <span className="crumb" aria-current="page">
                                {coin}
                            </span>
                        </>
                    )}
                </nav>
                <div className="nav-right">
                    <span className="badge">Simulated prices</span>
                    <span className="pill">
                        <span className="dot" data-live={stream.live} aria-hidden="true" />
                        {stream.label}
                        <span className="pill-rate">{t.framesPerSecond}/s</span>
                    </span>
                </div>
            </header>
            <div className="notice" role="status">
                {stream.notice}
            </div>
        </>
    )
}
