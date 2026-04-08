# Codebase Summary — magic-safe-builder-example

## The Big Picture
A generic Polymarket trading app where users log in, browse markets by category (politics, sports, crypto, etc.), and place Yes/No bets. Our goal is to transform it into a LoL-focused esports prediction platform.

---

## Layer by Layer

### Authentication — Magic Link + Safe Wallet
- User logs in with email via Magic Link (no browser wallet needed)
- This creates an **EOA** (Externally Owned Account) behind the scenes
- A **Gnosis Safe** wallet is deterministically derived from that EOA and deployed on Polygon
- The Safe is what actually holds the user's USDC and places trades

### Trading Session Setup (`hooks/useTradingSession.ts`)
Before a user can trade, a 4-step setup runs:
1. Initialize RelayClient with Builder credentials
2. Deploy the Safe wallet (if first time)
3. Create L2 API credentials (for CLOB order signing)
4. Set USDC token approvals for the CTF Exchange

### Builder Signing (`app/api/polymarket/sign/route.ts`)
- A **server-side** route that holds your Builder API key/secret/passphrase
- Frontend never sees these credentials — it just asks the server to sign requests
- This is how trades get attributed to you as a Builder (for rewards)

### Markets (`app/api/polymarket/markets/route.ts` + `hooks/useMarkets.ts`)
- Pulls events from **Gamma API**, filters by category tag, liquidity, and tradability
- Then enriches each market with **real-time bid/ask prices** from the CLOB API
- Categories are generic: politics, sports, crypto, etc.

### UI Components
- `MarketCard` → shows a market with Yes/No odds
- `OrderModal` → lets user pick side, amount, order type (market/limit), and submit
- `Positions` → shows user's open positions
- `TradingSession` → the setup wizard (deploy safe, approvals, etc.)

---

## What We Need to Change/Add

| What | Status |
|---|---|
| Replace category tabs with LoL leagues (LCK, LPL, LCS…) | Build new |
| Filter Gamma API for LoL markets only | Build new |
| Esports dark theme UI | Redesign |
| Market detail page with odds chart + AI analysis | Build new |
| Portfolio page | Build new |
| Top holders / whale tracker | Build new |

The core **wallet + trading + Builder signing** infrastructure is already done and solid — we keep all of that and build on top.

---

## Build Plan (Phase by Phase)

### Phase 1 — MVP Core
1. LoL market listing page (Gamma API filtered for LoL)
2. Replace category tabs with LoL leagues
3. Esports dark theme UI

### Phase 2 — Data Layer
1. Top holders / whale tracker (Data API)
2. Odds history chart (CLOB API + Recharts)

### Phase 3 — Differentiators
1. AI match analysis sidebar (Claude API)
2. Cross-platform odds comparison (Kalshi API)
3. Team/player stats (Riot Games API or Oracle's Elixir)

### Phase 4 — Advanced
1. Value bet finder
2. Match schedule calendar
3. Real-time WebSocket price updates
