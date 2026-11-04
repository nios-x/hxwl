// Three identical bars side by side: the same node, scaled horizontally
export function Mark() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
            <rect x="1" y="2" width="4" height="14" rx="1" />
            <rect x="7" y="2" width="4" height="14" rx="1" />
            <rect x="13" y="2" width="4" height="14" rx="1" />
        </svg>
    )
}

export function Slash() {
    return (
        <svg className="slash" width="16" height="24" viewBox="0 0 16 24" fill="none" aria-hidden="true">
            <path d="M11 3 5 21" stroke="currentColor" strokeWidth="1" />
        </svg>
    )
}

export function Chevron({ left = false }: { left?: boolean }) {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d={left ? "M10 3 5 8l5 5" : "m6 3 5 5-5 5"} stroke="currentColor" strokeWidth="1.5" />
        </svg>
    )
}

export function ArrowRight() {
    return (
        <svg className="path-arrow" width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
            <path d="M0.5 5H13M9 1l4 4-4 4" stroke="currentColor" strokeWidth="1.25" />
        </svg>
    )
}

export function SortIcon({ dir }: { dir: 1 | -1 | null }) {
    return (
        <svg className="sort-icon" width="8" height="12" viewBox="0 0 8 12" aria-hidden="true">
            <path d="M4 1 7.5 5h-7z" fill="currentColor" opacity={dir === 1 ? 1 : 0.3} />
            <path d="M4 11 .5 7h7z" fill="currentColor" opacity={dir === -1 ? 1 : 0.3} />
        </svg>
    )
}

// Coin logos are trademarks we don't have, so every coin gets a monogram with a hue of its own
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
    let hash = 0
    for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % 360
    return (
        <span
            className="avatar"
            aria-hidden="true"
            style={{
                width: size,
                height: size,
                fontSize: size * 0.36,
                background: `hsl(${hash} 55% 16%)`,
                color: `hsl(${hash} 85% 78%)`,
            }}
        >
            {name.slice(0, 2)}
        </span>
    )
}
