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

**Next steps:**
- Test full betting flow end-to-end (connect → sign → place order)
- Debug "Error loading balance" (RPC may need investigation)
- Esports-themed UI polish (fonts, colors, visual design)
