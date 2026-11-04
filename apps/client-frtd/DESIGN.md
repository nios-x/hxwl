# Design

A Vercel-style exchange screen: black surfaces, hairline borders, Geist, and nothing decorative. The direction was set by the product owner with two reference screens. The tokens live in `app/globals.css`.

## Color

- Dark only. Backgrounds run `--bg`, `--surface`, `--surface-2`, separated by `--border` hairlines, not shadows.
- Text is `--text`, `--muted`, or `--faint`. The primary control state is inverted: `--text` background with `--bg` text.
- `--up` and `--down` mean price direction and nothing else. Numbers that have stopped updating lose their colour.
- Amber (`--warn-text`) is for stream problems only. Focus rings use `--focus`.

## Type

- Geist Sans for UI text. Geist Mono for prices, percentages, times, and wire data.
- Fixed rem sizes. Most UI text is 0.75 to 0.875rem. Only the Markets heading goes above 1.75rem.

## Shape and layout

- Radius 6px for controls, 12px for panels, full for the status pill and avatars.
- Nav is a sticky breadcrumb with the simulated badge and stream pill on the right.
- Markets: stream stats, four featured cards, then a sortable table with a sticky header.
- Coin: pair bar, then recent ticks, chart, and side panel. Below 1180px these stack with the chart first.

## Components

- Coin logos are monograms. Each coin's hue is derived from its name, because no logo assets exist.
- Sparklines and live numbers are written by the shared loop in `app/lib/live.ts`, not by React.
- Candles are built in the browser from live ticks.

## Motion

- Hover and state changes take 150ms ease-out.
- A price cell flashes once on a new tick. With reduced motion there is no flash and rows update once a second.
