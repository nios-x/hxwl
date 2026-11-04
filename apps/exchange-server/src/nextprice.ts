const DT = 250 / 1000;    // tick length in seconds
const VOL_SCALE = 0.02;     // master "how lively is the market" knob
const PEG_PULL = 0.5;       // how hard stablecoins snap back to their peg, per second (keep PEG_PULL * DT below 1)

function gaussian(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function nextPrice(coin: any): number {
    const sigma = coin.rateOfIncreseChances * VOL_SCALE;  
    const shock = sigma * Math.sqrt(DT) * gaussian();     
    if (coin.peg !== undefined) {
        const offset = Math.log(coin.basePrice / coin.peg);
        return coin.peg * Math.exp(offset * (1 - PEG_PULL * DT) + shock);
    }
    // Everything else: percentage-based random walk — never negative, no drift toward zero
    return coin.basePrice * Math.exp(shock);
}