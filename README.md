# hxwl

**A horizontally scaled WebSocket layer that streams live exchange prices.**

An exchange service publishes price ticks for 72 coins to Kafka. Every WebSocket server receives every tick and forwards it only to the sockets watching that coin. An nginx load balancer sends each new connection to the least-loaded server, and Prometheus and Grafana track every replica. Add more WebSocket servers with a single command, and the load balancer and metrics pick them up on their own.

> **Prices are simulated.** `exchange-server` generates them with a random walk. They are not real market data.

---

## Architecture
<img width="5253" height="2519" alt="Untitled-2026-07-16-0001" src="https://github.com/user-attachments/assets/23449112-a3e1-47c6-b47d-ee0e3d57acd9" />
<img width="1920" height="1080" alt="Screenshot 2026-11-05 195712" src="https://github.com/user-attachments/assets/f8540975-f297-470c-8cf5-07d78ca4f97b" />
<img width="1920" height="1080" alt="Screenshot 2026-11-05 195552" src="https://github.com/user-attachments/assets/d5366327-690b-48fc-9da0-07a8e12969ff" />
<img width="1920" height="1080" alt="Screenshot 2026-11-05 195538" src="https://github.com/user-attachments/assets/74c490fe-46c9-4f82-b4f7-d4e327565178" />


```
exchange-server ──▶ Kafka (prices-<COIN>) ──▶ ws-server × N ──▶ ws-lb (nginx) ──▶ browser
                                                   │
                                                   └── /metrics ──▶ Prometheus ──▶ Grafana
```

| In the diagram      | Service           | What it does |
| ------------------- | ----------------- | ------------ |
| Exchange/server     | `exchange-server` | Simulates prices for 72 coins and publishes a tick for each one every 250 ms |
| pub/sub             | `kafka`           | One topic per coin (`prices-BTC`, `prices-ETH`, …), running in KRaft mode |
| server              | `ws-server`       | Consumes every topic and pushes each tick to the sockets subscribed to that coin. Runs 4 replicas by default |
| Router              | `ws-lb`           | nginx with `least_conn`: each new socket goes to the replica with the fewest open connections |
| prometheus + grafana| `prometheus`, `grafana` | Scrapes every replica and shows connections, CPU and memory per server |
| client              | `client` (`web`)  | Next.js markets board and per-coin live charts |
| SCALING             | `docker compose --scale` | Changes the replica count; nginx and Prometheus find new replicas through Docker DNS |

## How it works

### Fan-out through Kafka
- `exchange-server` creates one topic per coin (`prices-<COIN>`, 1 partition, 1 hour retention) and publishes about 4 ticks per second for every coin, which adds up to roughly 288 messages per second.
- Each `ws-server` replica joins Kafka with **its own consumer group** (`ws-<uuid>`). The replicas therefore don't split the work: every replica receives every tick, so whichever server a client lands on can serve any coin.
- Replicas subscribe with the pattern `^prices-.*` and start from the latest offset, so a new replica begins with live prices instead of replaying history.

### Per-coin rooms
- A client tells the server which coins it wants, all over one socket. The server keeps a map from each coin to the sockets watching it.
- When a tick arrives, the server forwards it only to that coin's sockets. Ticks for coins nobody is watching are dropped.
- When a socket closes, it leaves all of its rooms.

### Load balancing
- WebSocket connections are long-lived, so `ws-lb` balances on **open connections** (`least_conn`) instead of using round-robin.
- nginx re-resolves `ws-server` through Docker DNS every 5 seconds, so it picks up replicas added with `--scale` without a restart.
- Proxy timeouts are set to 1 hour, so quiet sockets stay open, and `/metrics` is blocked from outside.

### Observability
- Each replica exposes `/metrics` through `prom-client`: a `ws_connections` gauge plus the default process metrics. Every series carries a `server` label (`ws-server-1`, `ws-server-2`, …) that matches the name shown by `docker compose ps`.
- Prometheus finds replicas with DNS service discovery and scrapes them every 5 seconds.
- Grafana loads a ready-made **WebSocket servers** dashboard with these panels: servers up, total open connections, and connections, CPU and memory per server.

### Client
- Each browser tab opens one WebSocket. Pages declare the coins they need, and the tab sends `start` and `stop` messages to match, so the server only pushes what is on screen.
- If the socket drops, the tab reconnects with exponential backoff (capped at 10 seconds) through `ws-lb`, which sends it to a healthy replica, and then re-sends its subscriptions.
- Prices and sparklines are written to the DOM by one shared `requestAnimationFrame` loop instead of through React, so about 288 updates per second stay smooth.
- Candles (1s, 5s, 15s and 1m) are built in the browser from live ticks.

## Wire protocol

Client → server:

```json
{ "start": "BTC" }
{ "stop": "BTC" }
```

Server → client (one message per tick):

```json
{ "name": "BTC", "basePrice": 104251.37, "rateOfIncreseChances": 0.02 }
```

## Getting started

### Run the whole stack with Docker

Requires Docker with Compose.

```bash
docker compose up --build
```

| What        | URL |
| ----------- | --- |
| App         | http://localhost:3000 |
| WebSocket   | ws://localhost:3001 (through `ws-lb`) |
| Grafana     | http://localhost:3002 (anonymous viewer, no login) |
| Prometheus  | http://localhost:9090 |

Grafana and Prometheus listen only on `127.0.0.1`.

### Scale the WebSocket layer

```bash
docker compose up -d --scale ws-server=8
```

New replicas join Kafka, start receiving ticks, and appear in nginx and Prometheus within about 5 seconds. Existing sockets stay on their current server; **new** connections go to the least-loaded one. Open more tabs to watch the connections spread across replicas in Grafana.

### Local development

Requires [Bun](https://bun.com) 1.3.14 and Node.js 24 or later.

```bash
bun install
docker compose up -d kafka   # Kafka on localhost:9092
bun run dev                  # Turborepo starts exchange-server, ws-server and the web app
```

Open http://localhost:3000. In development, the app connects straight to the single `ws-server` on port 3001.

### Configuration

| Variable             | Used by                        | Default |
| -------------------- | ------------------------------ | ------- |
| `KAFKA_BROKER`       | `exchange-server`, `ws-server` | `localhost:9092` |
| `NEXT_PUBLIC_WS_URL` | `web`                          | `ws://<current host>:3001` |

Tick rate: `DELAY` in `apps/exchange-server/src/index.ts`. Volatility: `VOL_SCALE` in `apps/exchange-server/src/nextprice.ts`.

## Project structure

```
apps/
  exchange-server/     Price simulator and Kafka producer (Bun)
  ws-server/           WebSocket server: Kafka consumer, rooms, /metrics (Bun, ws, Express)
  client-frtd/         Next.js markets board and coin charts (package name: web)
packages/
  ui/                  Shared React components
  eslint-config/       Shared ESLint config
  typescript-config/   Shared tsconfig files
dockerfiles/
  Dockerfile.*         Images for exchange-server, ws-server and the client
  nginx.ws-lb.conf     Load balancer config
  prometheus.yml       Scrape config with DNS service discovery
  grafana/             Datasource and dashboard provisioning
docker-compose.yml     Full stack: Kafka, exchange, 4× ws-server, ws-lb, Prometheus, Grafana, client
```

## Tech stack

TypeScript · Bun · Turborepo · Kafka (KafkaJS) · `ws` · Express · nginx · Prometheus (`prom-client`) · Grafana · Next.js · React · Lightweight Charts · Docker Compose

## Limitations

- Prices are simulated, and there is no price history. Change, high and low are measured from when you opened the page.
- Scaling is manual (`--scale`). The metrics an autoscaler would need are already collected, but no autoscaler is wired up yet.
- Compose runs a single Kafka broker. That is fine for local use, but it is not a highly available setup.
