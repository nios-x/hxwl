import { nextPrice } from "./nextprice";
import { stockPrices } from "./prices";
import { Kafka } from "kafkajs";

const kafka = new Kafka({
    clientId: "exchange-server", brokers: [process.env.KAFKA_BROKER ?? "localhost:9092"]
})
const producer = kafka.producer();
await producer.connect()

const admin = kafka.admin()
await admin.connect()

const existing = new Set(await admin.listTopics())
const missing = stockPrices
    .map(c => `prices-${c.name}`)
    .filter(t => !existing.has(t))

if (missing.length > 0) {
    await admin.createTopics({
        waitForLeaders: true,
        topics: missing.map(topic => ({
            topic,
            numPartitions: 1,
            configEntries: [{ name: "retention.ms", value: "3600000" }],
        })),
    })
}
await admin.disconnect()

const DELAY = 250;         
const sleeper = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

while (true) {
    for (const coin of stockPrices) {
        coin.basePrice = nextPrice(coin);
        await producer.send({ topic: `prices-${coin.name}`, messages: [{ value: JSON.stringify(coin) }] })
    }
    await sleeper(DELAY);
}






