import express from "express"
import WebSocket, { WebSocketServer } from 'ws';
import { Kafka } from "kafkajs";
import client from "prom-client";
import dns from "node:dns/promises";
import os from "node:os";


const kafka = new Kafka({
    clientId: "ws-server", brokers: [process.env.KAFKA_BROKER ?? "localhost:9092"]
})
const consumer = kafka.consumer({ groupId: `ws-${crypto.randomUUID()}` });
await consumer.connect()

// A regex subscription only matches existing topics, so wait for exchange-server to create them
const admin = kafka.admin()
await admin.connect()
while (!(await admin.listTopics()).some(t => t.startsWith("prices-"))) {
    await new Promise<void>((res) => setTimeout(res, 1000))
}
await admin.disconnect()

await consumer.subscribe({ topics: [/^prices-.*/], fromBeginning: false })


const app = express() 
const PORT = 3001

const server = app.listen(PORT, () => {
    console.log("Application is listening on", PORT);
})

const wss = new WebSocketServer({ server: server })

// Docker's DNS knows each replica by the name "docker compose ps" shows, so charts can use it.
// Outside Docker there is no such name, so fall back to the hostname.
async function serverName() {
    try {
        const { address } = await dns.lookup(os.hostname())
        const [name] = await dns.resolvePtr(`${address.split(".").reverse().join(".")}.in-addr.arpa`)
        return name?.match(/ws-server-\d+/)?.[0] ?? os.hostname()
    } catch {
        return os.hostname()
    }
}

client.register.setDefaultLabels({ server: await serverName() })
client.collectDefaultMetrics()
new client.Gauge({
    name: "ws_connections",
    help: "Open WebSocket connections on this server",
    collect() {
        this.set(wss.clients.size)
    },
})

// Prometheus reads this from each container directly. ws-lb blocks it from outside.
app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", client.register.contentType)
    res.end(await client.register.metrics())
})

const websocketsToIdMap = new Map();
const idToWebsocketsMap = new Map();
const roomToIdMap = new Map();

//1. Subscribe
//3. Close 

wss.on("connection", (socket) => {
    const id = crypto.randomUUID()
    idToWebsocketsMap.set(id, socket)
    websocketsToIdMap.set(socket, id)
    const joinedRooms = new Set<string>()

    const leaveRoom = (name: string) => {
        joinedRooms.delete(name);
        const room = roomToIdMap.get(name);
        if (room) {
            room.delete(id);
            if (room.size === 0) {
                roomToIdMap.delete(name);
            }
        }
    }

    socket.on("message", (data, isBinary) => {
        if (isBinary) return;
        const action = JSON.parse(data.toString());
        if (action?.start) {
            joinedRooms.add(action.start);
            if (roomToIdMap.has(action.start)) {
                roomToIdMap.get(action.start).add(id);
            } else {
                roomToIdMap.set(action.start, new Set([id]));
            }
        }
        if (action?.stop) {
            leaveRoom(action.stop);
        }
    });
    socket.on("close", () => {
        for (const name of joinedRooms) {
            leaveRoom(name);
        }
        idToWebsocketsMap.delete(id);
        websocketsToIdMap.delete(socket);
    })
    socket.on("error", () => {
        console.log("Some error Occured")
    })
})
await consumer.run({
    eachMessage: async ({ topic, message }) => {
        const data = message.value?.toString()
        if (!data) return

        // "prices-BTC" → "BTC"
        const room = topic.slice("prices-".length)
        const ids: Set<string> | undefined = roomToIdMap.get(room)
        if (!ids) return                      // nobody is watching this coin

        for (const id of ids) {
            const ws: WebSocket | undefined = idToWebsocketsMap.get(id)
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(data)
            }
        }
    },
})