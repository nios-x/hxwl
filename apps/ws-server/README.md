# ws-server

The WebSocket layer of hxwl. It consumes every `prices-<COIN>` Kafka topic and pushes each tick only to the sockets that asked for that coin.

It runs as several identical replicas behind `ws-lb` (nginx). Any replica can serve any coin, so the load balancer can send a client to whichever server has the fewest connections. See the [root README](../../README.md) for the full system.

## How it works

1. **Wait for topics.** On startup the server connects to Kafka and checks every second until at least one `prices-` topic exists. This lets it start before `exchange-server` has created its topics. Port 3001 does not open until this step finishes.
2. **Subscribe to every coin.** It subscribes to the pattern `^prices-.*` from the latest offset, so a new replica starts with live prices instead of replaying history.
3. **Get every tick.** Each process uses its own consumer group (`ws-<uuid>`). The replicas therefore don't split partitions between them: every replica receives every tick.
4. **Fan out by room.** The server keeps a map from each coin to the sockets watching it. When a tick arrives on `prices-BTC`, the Kafka message value is sent unchanged to every open socket in the `BTC` room. Ticks for coins nobody is watching are dropped.
5. **Clean up.** When a socket closes, it leaves all of its rooms, and empty rooms are deleted.

Express and the WebSocket server share one HTTP server on port 3001.

## Protocol

Client → server, as JSON text frames (binary frames are ignored):

```json
{ "start": "BTC" }
{ "stop": "BTC" }
```

One socket can join any number of rooms. Coin names are not validated, so starting an unknown coin just never receives ticks.

Server → client: one message per tick, forwarded exactly as `exchange-server` published it:

```json
{ "name": "BTC", "basePrice": 104251.37, "rateOfIncreseChances": 0.02 }
```

## Endpoints

| Path            | What |
| --------------- | ---- |
| `ws://<host>:3001` | WebSocket connection |
| `GET /metrics`  | Prometheus metrics |

`ws-lb` returns 404 for `/metrics`, so it is never exposed through the load balancer. Prometheus scrapes each replica directly.

## Metrics

- `ws_connections`: a gauge of the sockets open on this replica
- the default `prom-client` process metrics (CPU, memory, event loop, GC)

Every series carries a `server` label. Inside Docker Compose the label comes from a reverse DNS lookup of the container's IP, so it matches the name shown by `docker compose ps` (`ws-server-1`, `ws-server-2`, …). Outside Docker it falls back to the machine's hostname.

## Running

### Local development

From the repo root:

```bash
bun install
docker compose up -d kafka   # Kafka on localhost:9092
bun run dev                  # starts exchange-server, ws-server and the web app
```

To run only this server, start Kafka and `exchange-server`, then:

```bash
cd apps/ws-server
bun run dev                  # bun --watch src/index.ts
```

Try it with any WebSocket client:

```bash
bunx wscat -c ws://localhost:3001
> {"start":"BTC"}
```

### Docker

`dockerfiles/Dockerfile.ws-server` builds the image from the repo root and runs `bun src/index.ts` directly, with no build step. Compose starts 4 replicas with `KAFKA_BROKER=kafka:29092`. Only `ws-lb` is published to the host, on port 3001.

To change the number of replicas:

```bash
docker compose up -d --scale ws-server=8
```

`ws-lb` and Prometheus both find replicas through Docker DNS and pick up new ones within about 5 seconds.

## Configuration

| Variable       | Default          |
| -------------- | ---------------- |
| `KAFKA_BROKER` | `localhost:9092` |

The port is fixed at 3001 in `src/index.ts`.

## Dependencies

`ws` (WebSocket server), `express` (HTTP and `/metrics`), `prom-client` (metrics), and `kafkajs` (Kafka consumer). `kafkajs` is declared in the root `package.json`, not in this one.

## Troubleshooting

- **Connection refused on port 3001**: the server is still waiting for `prices-` topics. Start `exchange-server`.
- **Connected, but no messages arrive**: check that you sent a `start` message for a coin `exchange-server` publishes, and that `exchange-server` is running.
