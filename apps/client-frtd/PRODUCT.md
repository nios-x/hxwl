# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences on one screen. People watching live prices across many coins, and engineers evaluating how the WebSocket layer behaves while it streams those prices.

## Product Purpose

hxwl is an exchange price app built on a horizontally scalable WebSocket layer. It streams live prices for 72 coins to the browser and lets a visitor scan the whole market, then open any coin for its live chart. It succeeds when the prices are readable at a glance and the stream itself is visibly working.

## Positioning

Prices flow from an exchange service through Kafka into a WebSocket layer, and each socket subscribes per coin. The interface shows that stream honestly as it happens, using only what the browser can measure.

## Operating Context

Read-only. No accounts, orders, balances, or trading. Visitors keep the board open and watch it, then drill into one coin. Every coin updates about four times a second, so the board can receive roughly 288 messages per second.

## Capabilities and Constraints

- Stack: Next.js app in `apps/client-frtd`, with `lightweight-charts` available. The browser connects to the `ws-lb` load balancer on port 3001, which forwards each socket to a `ws-server` container.
- Protocol: `{ "start": "<COIN>" }` subscribes and `{ "stop": "<COIN>" }` unsubscribes, on one socket. Messages carry only `name`, `basePrice`, and `rateOfIncreseChances`, and optionally `peg`.
- Prices are simulated by `exchange-server` with a random walk. They are not real market data, and the UI must say so.
- There is no history. Change, high, and low can only be measured from when the visitor opened the page, and must be labelled that way. There is no 24h change, volume, or market cap.
- Messages have no server timestamp, so the UI cannot measure end-to-end latency.
- Compose runs 4 `ws-server` containers behind `ws-lb`. The browser cannot tell which one it reached, so the UI must not show node identity or a node count.

## Brand Commitments

The product name is hxwl, lowercase, standing for a horizontally scaled WebSocket layer based exchange price app.

## Evidence on Hand

The live stream and the 72-coin list in `apps/exchange-server/src/prices.ts`. No customers, benchmarks, throughput figures, or real market data exist, and none may be invented.

## Product Principles

- Live data leads. The stream is the product, so it is the first thing a visitor sees.
- Only show what is measured. Every number is either from the stream or counted in this browser.
- Say what is simulated, plainly, without apologising for it.
- Stay legible at four updates a second. Motion reports change and never competes with reading the number.
