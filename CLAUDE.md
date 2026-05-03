# CLAUDE.md — LoL × Polymarket 电竞预测分析平台

## 项目概述

这是一个基于 Polymarket API 的 League of Legends 电竞预测分析 Web App。用户可以浏览 LoL 赛事市场、查看赔率、分析数据，并直接在 app 内下注。

项目基于 Polymarket 官方的 [magic-safe-builder-example](https://github.com/Polymarket/magic-safe-builder-example) fork 而来，使用 Next.js + TypeScript + Magic Link 钱包集成。

## 项目目标（按优先级）

1. **拿到 Polymarket Builder Badge on X** — 需要通过 Builders Program 审核
2. **为未来 Polymarket airdrop 做准备** — 积累交易量和 builder 贡献
3. **赚 Builder 奖励/分成** — Polymarket 每周按交易量分配 USDC 奖励
4. **做一个真正好用的 LoL 预测分析产品**

## 开发者背景

- 代码能力有限：基本 HTML/CSS，一些 JS，能写 React 但不熟练
- 主要依赖 AI 辅助写代码
- 请用中文跟我沟通解释，但所有代码注释、commit messages、console logs 用英文
- 优先使用简单直接的实现方式，避免过度工程化

## 技术栈

- **框架**: Next.js (基于官方示例)
- **语言**: TypeScript
- **钱包**: Magic Link (Web2 风格登录，无需浏览器插件)
- **样式**: Tailwind CSS
- **图表**: Recharts
- **AI**: Anthropic Claude API
- **部署**: Vercel
- **核心 SDK**:
  - `@polymarket/clob-client` — 订单簿交互
  - `@polymarket/builder-signing-sdk` — Builder 认证签名
  - `@polymarket/order-utils` — 订单工具

## Polymarket API 结构

三个独立 API，各有不同用途：

### 1. Gamma API (`https://gamma-api.polymarket.com`)
- **用途**: 市场发现和浏览
- **认证**: 不需要
- **关键端点**:
  - `GET /events` — 获取赛事列表
  - `GET /events/{id}` — 获取单个赛事详情
  - `GET /markets` — 获取市场列表
  - `GET /markets/{id}` — 获取单个市场详情
- **筛选 LoL 市场**: 用 tag 或 search 参数过滤 League of Legends 相关市场

### 2. Data API (`https://data-api.polymarket.com`)
- **用途**: 用户持仓、交易记录、排行榜
- **认证**: 不需要
- **关键端点**:
  - `GET /positions?user={address}` — 用户持仓
  - `GET /trades` — 交易记录
  - `GET /holders` — 市场 top holders
  - `GET /activity?user={address}` — 用户链上活动
- **参数**:
  - `sizeThreshold` — 最小持仓筛选
  - `sortBy` — TOKENS / CURRENT / INITIAL / CASHPNL / PERCENTPNL
  - `sortDirection` — ASC / DESC

### 3. CLOB API (`https://clob.polymarket.com`)
- **用途**: 订单簿、定价、下单交易
- **认证**: 交易操作需要认证
- **关键端点**:
  - `GET /book` — 订单簿快照
  - `GET /price` — 当前价格
  - `GET /midpoint` — 中间价
  - `POST /order` — 下单（需要 EIP-712 签名 + Builder headers）
  - `DELETE /order/{id}` — 取消订单
- **WebSocket**: 提供实时价格和订单簿更新

### Builder 认证流程
```
用户在 app 下单 → app 用 Builder API credentials 签名 → 
带 Builder headers 提交到 CLOB API → Polymarket 匹配订单 + 
覆盖 gas 费 → 交易量记入 Builder 账户
```

## 需要的环境变量

```env
# Polygon RPC
NEXT_PUBLIC_POLYGON_RPC_URL=your_RPC_URL

# Magic Link (从 magic.link dashboard 获取)
NEXT_PUBLIC_MAGIC_API_KEY=pk_live_XXXXXXXX

# Builder credentials (从 polymarket.com/settings?tab=builder 获取)
POLYMARKET_BUILDER_API_KEY=your_builder_api_key
POLYMARKET_BUILDER_SECRET=your_builder_secret
POLYMARKET_BUILDER_PASSPHRASE=your_builder_passphrase

# Anthropic (用于 AI 分析功能)
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## 功能清单（按开发优先级）

### Phase 1: MVP 核心（先做这些）

#### 1.1 LoL 市场浏览页
- 从 Gamma API 拉取所有 League of Legends 相关市场
- 按赛事/联赛分组展示（LCK, LPL, LCS, LEC 等）
- 显示每场比赛的赔率（价格即概率）
- 区分 upcoming / live / resolved 状态

#### 1.2 下注功能（核心 — 这是拿 Builder 奖励的关键）
- 沿用官方示例的 Magic Link 登录流程
- 用户选择市场 → 选 Yes/No → 输入金额 → 下单
- 通过 Builder Relayer 提交订单（gasless）
- 显示用户当前持仓

#### 1.3 基础 UI
- 暗色主题，电竞风格
- 响应式设计
- 清晰的导航：首页 / 市场列表 / 我的持仓

### Phase 2: 数据层

#### 2.1 Top Traders / 大户追踪
- 用 Data API `/holders` 展示每个市场的 top holders
- 显示大户的持仓方向和金额
- 鲸鱼交易提醒（大额交易高亮）

#### 2.2 赔率历史图表
- 用 CLOB API 获取 price history
- Recharts 折线图展示赔率走势
- 支持不同时间范围切换

### Phase 3: 差异化功能

#### 3.1 AI 赛事分析（侧边栏）
- 调用 Claude API 分析比赛
- 输入：战队历史战绩、近期表现、赔率数据
- 输出：胜率预测、关键因素分析
- 以侧边 div 形式展示在比赛详情页

#### 3.2 跨平台赔率对比
- 拉取 Kalshi API 的 LoL 赔率 (`kalshi.com/category/sports/esports/league-of-legends`)
- 对比 Polymarket vs Kalshi 的价格差异
- 高亮 value bet（两平台赔率差异大的市场）
- Shuffle Casino 等如果有 API 也接入，没有就跳过

#### 3.3 Player/Team 信息
- 接入 Riot Games API 或 Oracle's Elixir 数据
- 显示战队和选手的历史战绩
- 近期比赛记录和胜率

#### 3.4 直播链接
- 如果 Polymarket 市场数据里有 stream 信息就展示
- 否则手动链接到 Twitch/YouTube 对应赛事频道

### Phase 4: 进阶功能（有余力再做）

#### 4.1 Value Bet 发现
- 对比战队真实胜率 vs 市场赔率
- 找出被市场低估/高估的下注机会

#### 4.2 赛程日历
- 日历视图展示upcoming matches
- 支持按联赛筛选

#### 4.3 实时数据推送
- WebSocket 连接实时赔率更新
- 价格剧烈变动时弹出通知

## 项目结构参考

基于官方示例的结构扩展：

```
app/
├── api/
│   ├── polymarket/
│   │   └── sign/route.ts        # Builder 签名端点 (已有)
│   ├── markets/route.ts          # LoL 市场数据代理
│   ├── analysis/route.ts         # AI 分析端点
│   └── odds-compare/route.ts     # 跨平台赔率对比
├── page.tsx                      # 首页 — LoL 市场概览
├── market/[id]/page.tsx          # 单个比赛详情页
├── portfolio/page.tsx            # 我的持仓
└── leaderboard/page.tsx          # Top traders

components/
├── MarketCard.tsx                # 比赛卡片
├── OddsChart.tsx                 # 赔率走势图
├── BetPanel.tsx                  # 下注面板
├── TopHolders.tsx                # 大户列表
├── AiAnalysis.tsx                # AI 分析侧边栏
├── OddsComparison.tsx            # 跨平台赔率对比
├── WhaleAlert.tsx                # 鲸鱼交易提醒
└── StreamLink.tsx                # 直播链接

hooks/
├── useMarkets.ts                 # 获取 LoL 市场数据
├── useMarketPrice.ts             # 获取实时价格
├── useTopHolders.ts              # 获取 top holders
├── useTrades.ts                  # 获取交易记录
└── ... (官方示例的 hooks 保留)

lib/
├── gamma.ts                      # Gamma API 封装
├── dataApi.ts                    # Data API 封装
├── kalshi.ts                     # Kalshi API 封装
├── claude.ts                     # Claude API 封装
└── ... (官方示例的 lib 保留)
```

## 设计风格

- **主题**: 暗色，电竞风格，参考 op.gg / u.gg 的设计语言
- **主色**: 深蓝/深紫背景，绿色（涨/买）和红色（跌/卖）作为交互色
- **字体**: JetBrains Mono (数据) + 无衬线体 (正文)
- **特点**: 数据密度高但不杂乱，清晰的信息层次

## 部署

- Vercel（免费 tier 足够 MVP）
- 绑定自定义域名（推荐，申请 Verified tier 时更专业）
- 环境变量在 Vercel dashboard 里配置

## 重要注意事项

1. Builder credentials (API key/secret/passphrase) 是敏感信息，绝不能暴露在前端代码中。所有签名操作通过 `/api/polymarket/sign` 服务端路由处理。
2. 项目所有者在美国，Polymarket 国际版对美国用户有交易限制。这是已知风险，代码层面不需要处理。
3. LoL 市场目前交易量不大（约 $1.7M 总量），竞争也少，是一个好的 niche。
4. 目标是尽快有一个能用的 demo → 申请 Builders Program → 拿 badge → 在 X 上推广 → 积累交易量。

## Claude Code 工作流

### 开始新任务时的 Prompt 模板

```
看一下 CLAUDE.md 了解项目背景。今天要做的任务是 [具体功能]。
先不要写代码，先告诉我：
1. 需要改/创建哪些文件
2. 大概的实现思路
3. 有没有什么依赖要装

等我确认了再开始写。每完成一个小步骤就停下来让我测试。
Write all code comments, git commit messages, and console logs in English.
```

### 结束任务时的 Prompt 模板

```
帮我做三件事：
1. git commit，消息写 "feat: [做了什么]"
2. 在 CLAUDE.md 的 "开发日志" 部分，记录今天做了什么、改了哪些文件、遇到了什么问题、下一步要做什么
3. 确认 npm run dev 能正常跑
```

### 工作原则

- **一个 feature 一轮对话**，做完就 commit + 开新对话
- **对话超过 20 轮就用 `/compact` 或者直接开新对话**
- **所有持久信息写在这个 CLAUDE.md 里**，不要依赖对话记忆
- **每个步骤都要实际测试通过再继续**
- **每完成一个小步骤就 commit + 更新 CLAUDE.md，不要攒到最后。防止 session limit 到了丢失进度**

### Token 节省规则（重要）
```
1. 改代码时优先用 edit/patch 方式，只输出改动的部分，不要重新打印整个文件
2. 不要主动展示完整文件内容，除非我明确要求 "show me the file"
3. 解释尽量简洁，用 2-3 句话说清楚，不需要长篇大论
4. 多个小改动合并成一次操作，不要一行一行改
5. 代码改完直接跑测试验证，不要先展示代码再问我要不要测试
```

## 开发日志

### 2026-04-08 — Project Setup & WalletConnect Planning

**Done:**
- Reviewed entire codebase, created `CODEBASE_SUMMARY.md`
- Installed WalletConnect dependencies: `wagmi`, `@reown/appkit`, `@reown/appkit-adapter-wagmi`
- Fixed `.gitignore` to exclude `.env.local` (was previously tracked with empty values)
- Removed `.env.local` from git tracking to protect credentials
- Set Node.js default to v20.10.0

**Files changed:**
- `.gitignore` — added `.env.local` and `.env*.local`
- `package.json` / `package-lock.json` — added wagmi + reown packages
- `CLAUDE.md` — added dev log
- `CODEBASE_SUMMARY.md` — new file, codebase overview

**Next steps:**
- ~~Update `WalletProvider` to support both Magic Link + WalletConnect~~ ✅
- ~~Create `WagmiProvider` config~~ ✅
- ~~Build login screen with two connection options~~ ✅

### 2026-04-08 — WalletConnect Integration & Dual Login Modal

**Done:**
- Added WalletConnect support alongside existing Magic Link login
- Created Wagmi config with Reown AppKit for WalletConnect QR modal
- Updated `WalletProvider` to handle both connection types, creating ethers signer from either provider so trading flow works unchanged
- Added `walletType` field to `WalletContext` (`"magic" | "walletconnect" | null`)
- Split single `connect` method into `connectMagic` / `connectWalletConnect`
- Built `ConnectModal` — popup with two options: Email (Magic Link) and WalletConnect
- Restructured Header — "PolyLeague" title on left, connect button top-right, opens modal on click
- Wrapped provider tree: `WagmiProvider > QueryProvider > WalletProvider > TradingProvider`

**New files:**
- `lib/wagmi.ts` — Wagmi + WalletConnect config using Reown AppKit adapter
- `providers/WagmiProvider.tsx` — Wagmi provider wrapper + AppKit initialization
- `components/ConnectModal.tsx` — Login modal with Magic Link & WalletConnect options

**Updated files:**
- `providers/WalletContext.tsx` — added `WalletType`, split connect methods
- `providers/WalletProvider.tsx` — dual wallet support, wagmi state sync
- `providers/index.tsx` — added WagmiProvider to provider tree
- `components/Header/index.tsx` — top-right layout with modal trigger

**Next steps:**
- ~~Phase 1.1: LoL market browsing page (Gamma API integration)~~ ✅

### 2026-04-09 — Phase 1.1: LoL Market Browsing

**Done:**
- Built LoL market browsing with Gamma API integration (tag_id=65 = "league of legends")
- API route parses event titles to extract team names, league, best-of format
- Identifies main match-winner market vs prop markets (baron, dragon, handicap, etc.)
- League filter UI (LPL, LFL, LCK, etc.)
- Esports-styled match cards: Team A vs Team B with odds, live/upcoming/resolved status
- LoL Esports is now the default tab on home page
- Markets visible without login (browsing is read-only)

**New files:**
- `app/api/lol-markets/route.ts` — LoL markets API route
- `hooks/useLoLMarkets.ts` — React Query hook with league filtering
- `components/LoL/LeagueFilter.tsx` — League filter buttons
- `components/LoL/LoLMarketCard.tsx` — Match card component
- `components/LoL/LoLMarkets.tsx` — Main LoL markets view

**Updated files:**
- `components/Trading/MarketTabs.tsx` — added LoL Esports tab as default
- `app/page.tsx` — markets visible without login

**Next steps:**
- ~~Add team logo images to LoL market cards~~ ✅
- ~~Lazy loading + Live/Upcoming tabs~~ ✅

### 2026-04-09 — Team Logos, Lazy Loading, Live/Upcoming Tabs

**Done:**
- Team logos fetched from LoL Esports API (1500+ teams) with fuzzy name matching + initials fallback
- Removed "All Markets" tab — app is LoL-only
- Split into **Live** and **Upcoming** tabs (upcoming sorted soonest first)
- Lazy loading via `useInfiniteQuery` + IntersectionObserver (infinite scroll)
- API supports `offset`, `status` (live/upcoming/all) params for pagination

**New files:**
- `app/api/team-logos/route.ts` — Team logo lookup with in-memory cache
- `hooks/useTeamLogos.ts` — Batch team logo resolution hook

**Updated files:**
- `app/api/lol-markets/route.ts` — pagination, status filter, upcoming sort
- `hooks/useLoLMarkets.ts` — switched to useInfiniteQuery
- `components/LoL/LoLMarkets.tsx` — infinite scroll, accepts status prop
- `components/LoL/LoLMarketCard.tsx` — team logos with fallback
- `components/Trading/MarketTabs.tsx` — Live/Upcoming/Positions/Orders tabs

**Next steps:**
- ~~Phase 1.3: Dark theme~~ ✅

### 2026-04-09 — Force Dark Mode

**Done:**
- Fixed white background issue — app was only dark when OS dark mode was on
- Forced dark background (`#0a0a12`) and light text in `globals.css`
- Added `dark` class to `<html>` for Tailwind dark utilities

**Updated files:**
- `app/globals.css` — removed `prefers-color-scheme` media query, always dark
- `app/layout.tsx` — added `className="dark"` to `<html>`

**Next steps:**
- ~~Phase 1.2: Betting functionality via Builder Relayer~~ (in progress)
- Esports-themed UI polish (fonts, colors, visual design)

### 2026-04-10 — Phase 1.2: Auto-Init Trading Session

**Done:**
- Trading session now auto-initializes when wallet connects (no manual button)
- Replaced verbose TradingSession component with compact progress banner showing step labels
- "You may be asked to sign — this is a one-time setup" messaging to reduce user confusion
- Error state shows retry button instead of full session panel
- Clicking a team without wallet opens connect modal (was silently failing)
- Clicking a team during session init is blocked with "Setting up trading session..." prompt
- Header listens for `open-connect-modal` custom event so any component can trigger connect

**Updated files:**
- `hooks/useTradingSession.ts` — auto-init effect with ref guard, added `ethersSigner` dep
- `components/TradingSession/index.tsx` — rewritten as progress-only banner
- `app/page.tsx` — simplified TradingSession props
- `components/LoL/LoLMarketCard.tsx` — buttons clickable without session, prompt on click
- `components/LoL/LoLMarkets.tsx` — passes `isSessionInitializing`, `onConnectPrompt`
- `components/Header/index.tsx` — listens for `open-connect-modal` event

**Also done (same session):**
- Fixed "Error loading balance" — now shows $0.00 with subtle message instead of red error
- Added `retry: 2` and `publicClient` guard to balance query
- Verified full betting flow compiles: connect → auto-init → clobClient ready → order modal

**Updated files (balance fix):**
- `hooks/usePolygonBalances.ts` — added retry, publicClient enabled guard
- `components/PolygonAssets/index.tsx` — graceful error state

### 2026-04-10 — Esports UI Polish

**Done:**
- Replaced Geist fonts with Inter (body) + JetBrains Mono (data/numbers)
- Gradient PolyLeague logo + branded connect button
- Darker background (#080810), refined card/border opacities throughout
- Match cards: larger team logos, mono font odds with subtle % sign, glow-on-hover
- Tab bar: purple active state, compact rounded pills
- Balance card: cleaner layout with mono font
- Connect modal: refined spacing, hover colors
- League filter: uppercase tracking, smaller pills
- Custom scrollbar, `.font-data` utility, `.glow-*` classes
- Narrowed max-width to `max-w-4xl` for better readability
- Updated metadata title/description

**Updated files:**
- `app/globals.css` — new background, font vars, glow/scrollbar utilities
- `app/layout.tsx` — Inter + JetBrains Mono, updated metadata
- `app/page.tsx` — narrower max-width, responsive padding
- `components/Header/index.tsx` — gradient logo + button
- `components/LoL/LoLMarketCard.tsx` — polished cards
- `components/LoL/LeagueFilter.tsx` — uppercase compact pills
- `components/Trading/MarketTabs.tsx` — purple tabs, removed Card wrapper
- `components/PolygonAssets/index.tsx` — cleaner balance card
- `components/ConnectModal.tsx` — refined modal
- `constants/ui.ts` — updated base card styles

### 2026-04-11 — Modern UI Overhaul

**Done:**
- Complete visual redesign — minimal, modern aesthetic (Linear/Vercel-style)
- Ambient purple radial gradient mesh background (`body::before`)
- Glass morphism cards: `backdrop-filter: blur(12px)`, `.glass` / `.glass-hover` CSS classes
- Match cards rewritten: horizontal team layout (logo | name | odds), odds bar visualization
- WalletInfo: compact pill with green status dot (replaced verbose card)
- Header: clean "Poly**League**" text logo, subtle border connect button
- Tabs: underline indicator style (replaced pill buttons)
- League filter: minimal text toggles (no borders/bg on inactive)
- Balance: inline horizontal layout with mono numbers
- All modals: frosted glass, darker backdrop (`bg-black/70`)
- Loading/empty states: much quieter, spinner dot, less visual weight
- Trading session banner: pinging dot animation, inline layout
- Custom selection color, shimmer animation utility
- Order modal: glass card, green outline CTA button

**Updated files (15):**
- `app/globals.css` — ambient bg, glass classes, shimmer, selection
- `components/Header/index.tsx` — text logo, subtle button
- `components/Header/WalletInfo.tsx` — compact pill rewrite
- `components/LoL/LoLMarketCard.tsx` — horizontal layout rewrite
- `components/LoL/LoLMarkets.tsx` — section header, card spacing
- `components/LoL/LeagueFilter.tsx` — minimal text toggles
- `components/Trading/MarketTabs.tsx` — underline tabs
- `components/Trading/OrderModal/index.tsx` — glass modal
- `components/PolygonAssets/index.tsx` — inline balance
- `components/ConnectModal.tsx` — glass modal
- `components/TradingSession/index.tsx` — ping dot banner
- `components/shared/Card.tsx` — glass class
- `components/shared/LoadingState.tsx` — spinner dot
- `components/shared/EmptyState.tsx` — quieter
- `constants/ui.ts` — glass base style

### 2026-04-11 — League Name Cleanup

**Done:**
- Strip "Regular Season", "Playoffs", "Play-Ins", "Groups", "Finals" from league filter labels
- e.g. "TCL Regular Season" → "TCL", "LFL Regular Season" → "LFL"

**Updated files:**
- `app/api/lol-markets/route.ts` — regex strip on parsed league name

**Next steps:**
- ~~Phase 2.1: Top Traders / whale tracking~~ ✅
- ~~Defer session init to first bet~~ ✅

### 2026-04-14 — Phase 2.1: Top Traders & Leaderboard + UX Improvements

**Done:**
- Per-market top holders: expandable "Top Traders" section on each match card (Data API `/holders`)
- Global leaderboard page (`/leaderboard`) aggregating top traders across all active LoL markets
- Lifetime LoL winrate per trader via `/closed-positions` API (wins/losses/PnL)
- Hover card on leaderboard rows: avatar, wallet, winrate %, W-L record, PnL, active positions, winrate bar
- Leaderboard nav link in Header
- Deferred trading session: connect wallet = 0 signatures; init triggers on first bet click
- Centered `SessionSetupModal` replaces old `TradingSession` banner — shows step-by-step progress with spinner, progress bar, step descriptions, error/retry/success states

**New files:**
- `app/api/top-holders/route.ts` — Data API proxy for per-market holders
- `hooks/useTopHolders.ts` — fetch-on-demand hook (only when card expanded)
- `components/LoL/TopHolders.tsx` — ranked holder list with bar visualization
- `app/api/leaderboard/route.ts` — aggregates holders + winrates across all LoL markets
- `hooks/useLeaderboard.ts` — leaderboard data hook
- `app/leaderboard/page.tsx` — leaderboard page with hover cards
- `components/SessionSetupModal.tsx` — centered modal for session setup flow

**Updated files:**
- `components/LoL/LoLMarketCard.tsx` — expandable top traders, `onInitSession` prop
- `components/LoL/LoLMarkets.tsx` — passes `initializeTradingSession` to cards
- `components/Header/index.tsx` — added Leaderboard nav link
- `hooks/useTradingSession.ts` — removed auto-init, session is on-demand only
- `app/page.tsx` — replaced TradingSession banner with SessionSetupModal

**Next steps:**
- ~~Phase 2.2: Odds history charts~~ ✅

### 2026-04-14 — Two-Phase Session Init

**Done:**
- Split trading session into two phases:
  - Phase 1 (on wallet connect): relay client init + Safe deployment (1 signature)
  - Phase 2 (on Place Order): API credentials + token approvals (1-2 signatures)
- SessionSetupModal z-index raised to z-60 (above OrderModal z-50)
- Order modal opens freely without session, triggers phase 2 on submit
- Cleaner derive error handling for first-time users

**Updated files:**
- `hooks/useTradingSession.ts` — split into `initSafeDeployment` + `initTradingCredentials`
- `utils/session.ts` — added `safe-complete` step
- `providers/TradingProvider.tsx` — expose both init functions
- `components/SessionSetupModal.tsx` — per-phase step counts, z-60
- `components/Trading/OrderModal/index.tsx` — triggers `initTradingCredentials` on Place Order
- `components/LoL/LoLMarketCard.tsx` — removed session gate from team click
- `components/LoL/LoLMarkets.tsx` — passes `initTradingCredentials` to OrderModal
- `components/Trading/Markets/index.tsx` — same
- `app/page.tsx` — updated modal logic for two phases

### 2026-04-17 — Phase 2.2: Odds History Charts

**Done:**
- CLOB API `/prices-history` integration via `/api/price-history` proxy
- `OddsChart` component: Recharts area chart with green/red color based on price direction
- 6 time intervals: 1H, 6H, 1D, 1W, 1M, All — with appropriate fidelity per interval
- Custom tooltip showing date/time and percentage
- Chart appears in expandable card section alongside top holders
- Toggle label: "Chart & Top Traders" / "Hide Details"

**New files:**
- `app/api/price-history/route.ts` — CLOB price history proxy
- `hooks/usePriceHistory.ts` — React Query hook with interval support
- `components/LoL/OddsChart.tsx` — area chart with interval selector

**Updated files:**
- `components/LoL/LoLMarketCard.tsx` — added OddsChart to expanded section
- `package.json` — added `recharts`

**Next steps:**
- ~~Resolved match states~~ ✅

### 2026-04-17 — Resolved Match States & Results Tab

**Done:**
- Added "Results" tab alongside Live/Upcoming showing finished matches
- Winner highlighted with green checkmark + "Win" badge, loser dimmed with "Loss" label
- "Final" badge with gray dot replaces Live/time display on resolved cards
- Odds bar hidden for resolved matches (winner/loser is the only info needed)
- User positions on resolved matches show "Won" / "Lost" label
- API route supports `status=resolved` — fetches `closed=true` events from Gamma
- Winner determined from `outcomePrices` (`"1"` = winner, `"0"` = loser)

**Updated files:**
- `app/api/lol-markets/route.ts` — resolved filter, `closed=true` param, `winner` field
- `hooks/useLoLMarkets.ts` — added `"resolved"` to `MatchStatus`, `winner` to `LoLEvent`
- `components/Trading/MarketTabs.tsx` — added Results tab
- `components/LoL/LoLMarketCard.tsx` — resolved styling, winner/loser display, position result
- `components/LoL/LoLMarkets.tsx` — resolved label and sort description

### 2026-04-17 — Settling State for In-Progress Matches

**Done:**
- Added "Settling" status for matches that ended but market hasn't resolved yet
- Detection: `acceptingOrders === false && !closed && gameStarted` → settling
- Amber dot + "Settling" badge on match cards (between Live green and Final gray)
- Settling matches appear in the Live tab (filter includes both `live` and `settling`)
- Status type updated: `"live" | "upcoming" | "resolved" | "settling"`

**Updated files:**
- `app/api/lol-markets/route.ts` — settling status detection, live filter includes settling
- `hooks/useLoLMarkets.ts` — added `"settling"` to status type
- `components/LoL/LoLMarketCard.tsx` — amber settling badge

### 2026-04-18 — Head-to-Head History, Tab Restructure, Clickable Traders

**Done:**
- PandaScore API integration for team head-to-head match history
- Team name → PandaScore ID resolution with 24h cache, H2H data cached 6h server-side
- Two-column expanded layout: left (Chart + Top Holders), right (Head-to-Head)
- H2H shows: win summary bar, team names + scores per match row, league name, last 5 matches
- Skipped for resolved/settling matches
- Tab restructure: Upcoming (default) → Live → Settling → Results → Positions → Orders
- Settling is now its own tab (previously bundled with Live)
- Top Holders names/avatars link to Polymarket profile pages (`polymarket.com/{address}`)

**New files:**
- `app/api/head-to-head/route.ts` — PandaScore proxy, team ID resolution + past matches
- `hooks/useHeadToHead.ts` — React Query hook with 6h staleTime
- `components/LoL/HeadToHead.tsx` — H2H UI with summary bar + match rows

**Updated files:**
- `components/LoL/LoLMarketCard.tsx` — two-column grid layout for expanded section
- `components/LoL/TopHolders.tsx` — clickable names/pfps to Polymarket profiles
- `components/Trading/MarketTabs.tsx` — Upcoming default, Settling as separate tab
- `components/LoL/LoLMarkets.tsx` — settling status label
- `hooks/useLoLMarkets.ts` — `"settling"` added to `MatchStatus`
- `app/api/lol-markets/route.ts` — reverted live filter (settling is its own tab now)

**Env required:**
- `PANDASCORE_API_KEY` in `.env.local`

### 2026-04-21 — H2H Bug Fixes & Performance

**Done:**
- Fixed H2H showing "0:0" scores — PandaScore `filter[opponent_id]` is OR, not AND. Added server-side filter to keep only matches where both teams participated.
- Fixed "No previous matches found" — reduced from OR-filtering both teams (per_page=100) to single-team query (per_page=30) + client filter for opponent. Much faster.
- Made H2H dates more visible (white/20 → white/50)
- Added H2H prefetch on card render — data loads in background before user expands, near-instant when they click
- Investigated Kalshi for Phase 3.2 — no LoL/esports markets exist on Kalshi. Skipping cross-platform odds comparison.

**Updated files:**
- `app/api/head-to-head/route.ts` — single-team query, both-team filter, removed unused constant
- `components/LoL/HeadToHead.tsx` — brighter date text
- `components/LoL/LoLMarketCard.tsx` — H2H prefetch on render
- `hooks/useHeadToHead.ts` — extracted fetchH2H, added usePrefetchHeadToHead hook

**Next steps:**
- ~~Phase 3.3: Team info, rosters, recent form (PandaScore + optional Riot API)~~ ✅

### 2026-04-22 — Phase 3.3: Team Info, UI Polish, Leaderboard Categories

**Done:**
- PandaScore team info API: roster (sorted by role), recent form (W/L streak), last 5 match results
- TeamInfo components displayed side-by-side (Team A | H2H | Team B) in 3-column grid
- H2H now shown for all match statuses (settling/resolved included)
- Expanded card layout restructured: chart full-width, team info 3-col, Top Holders collapsed
- Section headers made more visible (11px, brighter colors, tighter tracking)
- Toggle label changed: "Chart & Top Traders" → "Chart & Team Info"

**League filter redesign:**
- Major leagues (LCK, LPL, LEC, etc.) sorted first via prefix matching
- Overflow leagues in +N dropdown with multi-column grid layout
- Selected overflow league shown as separate pill next to +N button
- League list cached in state so options persist when filtering
- `flex-wrap` for alignment with match cards

**Leaderboard improvements:**
- Batched holder API calls (fix 414 URI Too Long with 10-per-batch)
- 5 category tabs: Volume, Top Profit, Win Rate, Top Loss, Most Active
- Each category sorts/filters/colors differently
- WalletAvatar component: colored initials fallback for missing profile images
- Clickable avatars/names linking to Polymarket profiles
- Leaderboard button restyled (pill with border, more visible)

**Rebrand to RiftMarket:**
- Header: logo image (60px) + "Rift**Market**" text
- Metadata: title, OG image, favicon (16/32/180/192/512px)
- WalletConnect metadata updated
- All PolyLeague references replaced

**New files:**
- `app/api/team-info/route.ts` — PandaScore team detail + roster + recent matches
- `hooks/useTeamInfo.ts` — React Query hook with prefetch
- `components/LoL/TeamInfo.tsx` — roster, form streak, recent matches UI
- `components/shared/WalletAvatar.tsx` — deterministic colored avatar fallback
- `public/` — logo.png, favicon variants, apple-touch-icon

**Updated files:**
- `components/LoL/LoLMarketCard.tsx` — 3-col layout, collapsible Top Holders, prefetch
- `components/LoL/LoLMarkets.tsx` — cached allLeagues state
- `components/LoL/LeagueFilter.tsx` — major league sort, +N dropdown, overflow pill
- `components/LoL/HeadToHead.tsx` — brighter header, shown for all statuses
- `components/LoL/OddsChart.tsx` — brighter section header
- `components/LoL/TopHolders.tsx` — WalletAvatar, brighter header
- `components/Header/index.tsx` — logo image, RiftMarket text, styled leaderboard button
- `app/layout.tsx` — RiftMarket metadata, favicon/OG config
- `app/leaderboard/page.tsx` — 5 category tabs, WalletAvatar, clickable profiles
- `app/api/leaderboard/route.ts` — batched holder fetching
- `app/globals.css` — scrollbar-hide utility
- `hooks/useLeaderboard.ts` — Period type (unused, prepared for future)
- `providers/WagmiProvider.tsx` — RiftMarket name/url

**Next steps:**
- Deploy to Vercel + bind custom domain
- Register X account, post demo, apply for Builder Badge
- V2 migration before April 28 cutover (separate branch)
- Test full betting flow live

### 2026-04-26 — Wallet UX: Balance in Header, Deposit via Bridge API, Withdraw

**Done:**
- Moved balance display from standalone PolygonAssets card into WalletInfo (top-right header, next to Safe address)
- Balance shown as compact `$XX.XX` pill; click to expand dropdown with token breakdown
- Amber pulse dot when balance < $1 to nudge users to deposit
- Deposit notice in dropdown: "Send USDC.e to your Safe wallet address"
- Withdraw button in dropdown opens TransferModal (send USDC.e to any address)
- Removed standalone PolygonAssets from main page (no duplicate)
- Multi-token balance display: USDC.e, USDC, WETH, POL with USD values
- Polymarket Bridge API integration (WIP):
  - API route proxying `bridge.polymarket.com` (deposit addresses, supported assets, status, quote)
  - `useDeposit` hook: generate deposit addresses, poll status, get quotes
  - Supports 13 chains (Ethereum, Polygon, Arbitrum, Base, Optimism, BSC, Solana, Bitcoin, etc.)
  - All deposits auto-convert to pUSD on Polygon via Fun.xyz

**New files:**
- `app/api/bridge/route.ts` — Bridge API proxy (GET supported-assets/status, POST deposit/quote)
- `hooks/useDeposit.ts` — `useDeposit` hook + `useSupportedAssets` hook with types

**Updated files:**
- `components/Header/WalletInfo.tsx` — balance pill, dropdown with token breakdown + deposit notice + withdraw
- `app/page.tsx` — removed PolygonAssets import and usage
- `components/PolygonAssets/index.tsx` — updated to use multi-token balance fields
- `constants/tokens.ts` — added USDC, WETH contract addresses and decimals
- `hooks/usePolygonBalances.ts` — multi-token balance (USDC.e, USDC, WETH, POL) with price feeds

**Next steps (deposit feature):**
- ~~Build DepositModal component~~ ✅
- ~~Wire DepositModal into WalletInfo dropdown~~ ✅
- Test end-to-end deposit/withdraw flow with Bridge API

### 2026-04-26 — DepositModal, Cross-Chain Withdraw, Dropdown Selectors

**Done:**
- DepositModal with Polymarket-style dropdown menus for chain (13 chains) and token selection
- Deposit address generation via Bridge API, click-to-copy, status polling (15s interval)
- Cross-chain withdraw: TransferModal rewritten with destination chain/token dropdowns
  - Polygon = direct Safe Relayer transfer (instant, gasless)
  - Other chains = Bridge `/withdraw` API (USDC.e → bridge address → auto-convert to destination)
  - Bridge tx status polling with live progress display
- SharedSelectDropdown component extracted for reuse across Deposit/Withdraw modals
- Balance dropdown centered on pill (was right-aligned)
- Deposit + Withdraw buttons side-by-side in balance dropdown

**New files:**
- `components/DepositModal.tsx` — cross-chain deposit modal with chain/token dropdowns + status
- `components/shared/SelectDropdown.tsx` — reusable dropdown select component

**Updated files:**
- `app/api/bridge/route.ts` — added `withdraw` action proxy
- `components/Header/WalletInfo.tsx` — centered dropdown, Deposit+Withdraw buttons, wired DepositModal
- `components/PolygonAssets/TransferModal.tsx` — rewritten with chain/token dropdowns + bridge withdraw

**Next steps:**
- Light/dark theme toggle (ThemeProvider started, not wired)
- Test end-to-end deposit/withdraw flow with Bridge API

### 2026-04-29 — Phase 3.4: Per-League Stream Links

**Done:**
- Stream button on each match card now links to the correct league's Twitch/YouTube channel
- Previously all matches fell back to `twitch.tv/riotgames` because ~95% of Polymarket titles lack league info
- Rewrote title parser to handle 4 formats: `LoL: ... (BOx) - League`, `LEC: Team vs Team`, `LoL: ... (BOx)`, `LoL: Team vs Team`
- Added `TEAM_LEAGUE` lookup table (~80 teams) to infer league from team names when title has no league
- Added partial-match fallback in stream hook (e.g. "LCK Challengers" → "LCK" channel)
- Fixed LTA channel: `twitch.tv/lta` (was incorrectly using `twitch.tv/lcs`)
- Added `LCK CL` and `LDL` league channel entries
- Verified all Twitch channels exist (200 status)

**New files:**
- `app/api/stream-links/route.ts` — LoL Esports + PandaScore live stream API, static league channel fallbacks
- `hooks/useStreamLinks.ts` — stream link resolution: live data → league fallback → riotgames last resort

**Updated files:**
- `app/api/lol-markets/route.ts` — multi-format title parser, TEAM_LEAGUE lookup, league inference
- `components/LoL/LoLMarketCard.tsx` — stream button UI (Twitch/YouTube icon + "Watch"/"Stream" label)
- `components/LoL/LoLMarkets.tsx` — wired useStreamLinks, passes streamLink to each card

### 2026-04-30 — Match Detail Modal + Order Book

**Done:**
- Replaced inline card expand with centered MatchDrawer modal
- 3-column desktop layout (1100px wide, 82vh): Chart | Order Book (260px) | H2H + Team Info (280px)
- Mobile: full-width slide-up (94vh), stacked single-column with scroll
- Each column scrolls independently on desktop to minimize page scrolling
- Order book component: bid/ask bars with size visualization, team selector toggle, 5 price levels, spread/midpoint indicator
- Simplified LoLMarketCard: whole card clickable (removed expand/collapse, removed inline chart/H2H/TeamInfo/TopHolders)
- Compact top bar: team bet buttons + match meta (league, BO, volume, stream, position) inline
- Modal animation: slideUp on mobile, scaleIn on desktop (CSS in globals.css)
- Fixed Tailwind dynamic class purge bug: replaced template literals (`bg-${color}-500/5`) with explicit conditional classes

**New files:**
- `components/LoL/MatchDrawer.tsx` — centered modal with 3-column layout
- `components/LoL/OrderBook.tsx` — order book with bid/ask bars and team selector
- `app/api/orderbook/route.ts` — CLOB API `/book` proxy with 10s revalidation
- `hooks/useOrderBook.ts` — React Query hook (10s stale, 15s refetch)

**Updated files:**
- `components/LoL/LoLMarketCard.tsx` — simplified to clickable card, removed expand logic and chart/H2H/TopHolders imports
- `components/LoL/LoLMarkets.tsx` — added drawerEvent state, MatchDrawer, handleDrawerTeamClick, getEventPositions
- `app/globals.css` — added `.modal-animate-in` animation (slideUp mobile, scaleIn desktop)

**Next steps:**
- Verify modal layout in browser (not yet tested visually)
- Deploy updated code to production
- Update leaderboard or consider removing Top Holders from card (now only in modal)

### 2026-05-03 — Mobile Banner + Modal 2-Column Layout + Spacing Fix

**Done:**
- Added MobileBanner: dismissible notice on mobile telling users desktop is recommended (sessionStorage persists dismiss)
- Changed MatchDrawer from 3-column to 2-column layout per user feedback:
  - Left: Chart + Order Book (can place bets)
  - Right (320px/w-80): H2H + Team Info
- Increased spacing between H2H and Team Info sections (space-y-5, pt-4/pt-3) for better readability

**New files:**
- `components/shared/MobileBanner.tsx` — dismissible mobile-only banner (md:hidden)

**Updated files:**
- `app/page.tsx` — added MobileBanner at top of page
- `components/LoL/MatchDrawer.tsx` — 2-col layout, wider right panel, increased spacing

**Next steps:**
- Deploy updated code to production
- Test modal on desktop browser

### 2026-05-03 — Deposit Wallet Migration (WIP)

**Context:**
- Polymarket announced Deposit Wallet system replacing Safe/Proxy flow (live 2026-05-04)
- New signature type `3` (POLY_1271) using ERC-7739/ERC-1271 validation
- Migration guide: docs.polymarket.com/trading/deposit-wallet-migration

**Done so far:**
- Updated SDK packages: `@polymarket/builder-relayer-client@0.0.9`, `@polymarket/clob-client-v2@1.0.3-canary.0`
- Added `DEPOSIT_WALLET_FACTORY` constant
- Created `hooks/useDepositWallet.ts` (replaces `useSafeDeployment.ts`):
  - `deriveDepositWalletAddress()` via `relayClient.deriveDepositWalletAddress()`
  - `isWalletDeployed()` — checks via relayer then RPC fallback
  - `deployDepositWallet()` — `relayClient.deployDepositWallet()` + poll until mined

**Still TODO (migration incomplete, trading currently broken):**
- Rewrite `useTokenApprovals.ts` — use `relayClient.executeDepositWalletBatch()` for approvals
- Update `useClobClient.ts` — `SignatureTypeV2.POLY_1271`, funder = deposit wallet address
- Rewrite `useTradingSession.ts` — replace Safe phases with deposit wallet phases
- Update `utils/session.ts` — session interface: `depositWalletAddress` instead of `safeAddress`
- Update `TradingProvider.tsx` — wire new hooks, expose `depositWalletAddress`
- Update balance sync calls to use `signature_type=3`
- Remove old `hooks/useSafeDeployment.ts` once migration complete
- Build verify + end-to-end test
