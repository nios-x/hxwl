export const groups: { name: string; coins: string[] }[] = [
    { name: "Stablecoins", coins: ["USDT", "USDC", "DAI", "FDUSD", "TUSD", "PYUSD", "USDE"] },
    {
        name: "Majors",
        coins: ["BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "TRX", "TON", "AVAX", "DOT", "LINK", "LTC", "BCH", "XLM", "XMR", "ETC", "HBAR", "ATOM"],
    },
    {
        name: "L1 and L2 alts",
        coins: ["NEAR", "APT", "SUI", "ICP", "POL", "ARB", "OP", "SEI", "TIA", "INJ", "STX", "KAS", "ALGO", "VET", "EGLD", "S", "FIL", "QNT", "THETA"],
    },
    { name: "DeFi", coins: ["UNI", "AAVE", "MKR", "LDO", "CRV", "SNX", "RUNE", "GRT", "PYTH"] },
    { name: "Solana ecosystem", coins: ["JUP", "JTO", "RAY", "ORCA", "HNT", "RENDER"] },
    { name: "Gaming and metaverse", coins: ["IMX", "SAND", "MANA", "AXS", "APE"] },
    { name: "Memecoins", coins: ["DOGE", "SHIB", "PEPE", "BONK", "WIF", "FLOKI", "POPCAT", "BRETT"] },
]

export const coinNames = groups.flatMap((g) => g.coins)

export const groupOf = (name: string) => groups.find((g) => g.coins.includes(name))?.name
