"use client"
import { formatDuration } from "../lib/format"
import { describeStream, useTelemetry } from "../lib/stream"
import { coinNames } from "../listings"
import { ArrowRight } from "./Icons"

// Every number here is measured in this browser
export function StreamStats() {
    const t = useTelemetry()
    const stream = describeStream(t)

    return (
        <dl className="stats">
            <div>
                <dt>Stream</dt>
                <dd>
                    <span className="dot" data-live={stream.live} aria-hidden="true" />
                    {stream.label}
                </dd>
            </div>
            <div>
                <dt>Frames per second</dt>
                <dd>{t.framesPerSecond}</dd>
            </div>
            <div>
                <dt>Channels</dt>
                <dd>
                    {t.channelCount} of {coinNames.length}
                </dd>
            </div>
            <div>
                <dt>Connected</dt>
                <dd>{t.connectedAt === null ? "Not yet" : formatDuration(t.now - t.connectedAt)}</dd>
            </div>
            <div>
                <dt>Reconnects</dt>
                <dd>{t.reconnects}</dd>
            </div>
        </dl>
    )
}

export function SignalPath() {
    return (
        <p className="path">
            <span className="sr-only">Prices travel from </span>
            exchange-server <ArrowRight /> Kafka <ArrowRight /> ws-server <ArrowRight /> ws-lb <ArrowRight /> this tab
        </p>
    )
}
