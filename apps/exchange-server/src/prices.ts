
interface CoinPrice {
    name: string
    basePrice: number
    rateOfIncreseChances: number
}

export const stockPrices: CoinPrice[] = [
    // ---------- Stablecoins ----------
    { name: "USDT",   basePrice: 0.9995,      rateOfIncreseChances: 0.01 },
    { name: "USDC",   basePrice: 1.0001,      rateOfIncreseChances: 0.01 },
    { name: "DAI",    basePrice: 0.9998,      rateOfIncreseChances: 0.01 },
    { name: "FDUSD",  basePrice: 0.9997,      rateOfIncreseChances: 0.01 },
    { name: "TUSD",   basePrice: 0.9992,      rateOfIncreseChances: 0.012 },
    { name: "PYUSD",  basePrice: 0.9996,      rateOfIncreseChances: 0.01 },
    { name: "USDE",   basePrice: 0.9994,      rateOfIncreseChances: 0.012 },

    // ---------- Majors ----------
    { name: "BTC",    basePrice: 104250.00,   rateOfIncreseChances: 0.02 },
    { name: "ETH",    basePrice: 3850.00,     rateOfIncreseChances: 0.025 },
    { name: "BNB",    basePrice: 690.00,      rateOfIncreseChances: 0.025 },
    { name: "SOL",    basePrice: 185.00,      rateOfIncreseChances: 0.035 },
    { name: "XRP",    basePrice: 2.35,        rateOfIncreseChances: 0.035 },
    { name: "ADA",    basePrice: 0.78,        rateOfIncreseChances: 0.04 },
    { name: "TRX",    basePrice: 0.27,        rateOfIncreseChances: 0.03 },
    { name: "TON",    basePrice: 3.40,        rateOfIncreseChances: 0.04 },
    { name: "AVAX",   basePrice: 28.50,       rateOfIncreseChances: 0.045 },
    { name: "DOT",    basePrice: 5.20,        rateOfIncreseChances: 0.045 },
    { name: "LINK",   basePrice: 17.80,       rateOfIncreseChances: 0.04 },
    { name: "LTC",    basePrice: 98.00,       rateOfIncreseChances: 0.035 },
    { name: "BCH",    basePrice: 465.00,      rateOfIncreseChances: 0.04 },
    { name: "XLM",    basePrice: 0.32,        rateOfIncreseChances: 0.04 },
    { name: "XMR",    basePrice: 215.00,      rateOfIncreseChances: 0.035 },
    { name: "ETC",    basePrice: 23.40,       rateOfIncreseChances: 0.045 },
    { name: "HBAR",   basePrice: 0.24,        rateOfIncreseChances: 0.05 },
    { name: "ATOM",   basePrice: 5.80,        rateOfIncreseChances: 0.045 },

    // ---------- L1 / L2 alts ----------
    { name: "NEAR",   basePrice: 3.10,        rateOfIncreseChances: 0.055 },
    { name: "APT",    basePrice: 6.90,        rateOfIncreseChances: 0.06 },
    { name: "SUI",    basePrice: 3.60,        rateOfIncreseChances: 0.065 },
    { name: "ICP",    basePrice: 7.40,        rateOfIncreseChances: 0.055 },
    { name: "POL",    basePrice: 0.42,        rateOfIncreseChances: 0.055 },
    { name: "ARB",    basePrice: 0.58,        rateOfIncreseChances: 0.06 },
    { name: "OP",     basePrice: 1.25,        rateOfIncreseChances: 0.06 },
    { name: "SEI",    basePrice: 0.34,        rateOfIncreseChances: 0.07 },
    { name: "TIA",    basePrice: 4.10,        rateOfIncreseChances: 0.07 },
    { name: "INJ",    basePrice: 18.50,       rateOfIncreseChances: 0.065 },
    { name: "STX",    basePrice: 1.30,        rateOfIncreseChances: 0.06 },
    { name: "KAS",    basePrice: 0.11,        rateOfIncreseChances: 0.065 },
    { name: "ALGO",   basePrice: 0.27,        rateOfIncreseChances: 0.05 },
    { name: "VET",    basePrice: 0.032,       rateOfIncreseChances: 0.05 },
    { name: "EGLD",   basePrice: 28.00,       rateOfIncreseChances: 0.055 },
    { name: "S",      basePrice: 0.68,        rateOfIncreseChances: 0.065 },
    { name: "FIL",    basePrice: 4.20,        rateOfIncreseChances: 0.055 },
    { name: "QNT",    basePrice: 105.00,      rateOfIncreseChances: 0.045 },
    { name: "THETA",  basePrice: 1.60,        rateOfIncreseChances: 0.055 },

    // ---------- DeFi ----------
    { name: "UNI",    basePrice: 9.80,        rateOfIncreseChances: 0.05 },
    { name: "AAVE",   basePrice: 265.00,      rateOfIncreseChances: 0.05 },
    { name: "MKR",    basePrice: 1850.00,     rateOfIncreseChances: 0.05 },
    { name: "LDO",    basePrice: 1.60,        rateOfIncreseChances: 0.06 },
    { name: "CRV",    basePrice: 0.62,        rateOfIncreseChances: 0.065 },
    { name: "SNX",    basePrice: 1.40,        rateOfIncreseChances: 0.065 },
    { name: "RUNE",   basePrice: 2.10,        rateOfIncreseChances: 0.07 },
    { name: "GRT",    basePrice: 0.17,        rateOfIncreseChances: 0.06 },
    { name: "PYTH",   basePrice: 0.24,        rateOfIncreseChances: 0.07 },

    // ---------- Solana ecosystem ----------
    { name: "JUP",    basePrice: 0.82,        rateOfIncreseChances: 0.07 },
    { name: "JTO",    basePrice: 2.60,        rateOfIncreseChances: 0.07 },
    { name: "RAY",    basePrice: 3.40,        rateOfIncreseChances: 0.075 },
    { name: "ORCA",   basePrice: 2.90,        rateOfIncreseChances: 0.075 },
    { name: "HNT",    basePrice: 4.80,        rateOfIncreseChances: 0.07 },
    { name: "RENDER", basePrice: 5.60,        rateOfIncreseChances: 0.07 },

    // ---------- Gaming / Metaverse ----------
    { name: "IMX",    basePrice: 1.05,        rateOfIncreseChances: 0.07 },
    { name: "SAND",   basePrice: 0.38,        rateOfIncreseChances: 0.07 },
    { name: "MANA",   basePrice: 0.42,        rateOfIncreseChances: 0.07 },
    { name: "AXS",    basePrice: 5.60,        rateOfIncreseChances: 0.075 },
    { name: "APE",    basePrice: 0.95,        rateOfIncreseChances: 0.08 },

    // ---------- Memecoins ----------
    { name: "DOGE",   basePrice: 0.21,        rateOfIncreseChances: 0.10 },
    { name: "SHIB",   basePrice: 0.0000182,   rateOfIncreseChances: 0.11 },
    { name: "PEPE",   basePrice: 0.0000128,   rateOfIncreseChances: 0.13 },
    { name: "BONK",   basePrice: 0.0000265,   rateOfIncreseChances: 0.14 },
    { name: "WIF",    basePrice: 1.45,        rateOfIncreseChances: 0.14 },
    { name: "FLOKI",  basePrice: 0.000135,    rateOfIncreseChances: 0.13 },
    { name: "POPCAT", basePrice: 0.48,        rateOfIncreseChances: 0.15 },
    { name: "BRETT",  basePrice: 0.085,       rateOfIncreseChances: 0.15 },
]
