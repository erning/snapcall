# SnapCall Web App v2 - 技术方案

## 项目概述

使用 React + TypeScript + Vite 重构 SnapCall Web App，采用浅色主题，移动优先设计。

## 技术栈

| 层 | 技术 | 理由 |
|---|---|---|
| 核心计算 | Rust + WASM (现有) | 保留，性能不变 |
| UI 框架 | React 18 + TypeScript | 类型安全，生态成熟 |
| 构建工具 | Vite | 快速 HMR，WASM 支持好 |
| 状态管理 | Zustand | 轻量，适合本地状态 |
| 样式 | Tailwind CSS | 快速开发，响应式 |

## 界面布局（移动优先，浅色主题）

```
┌─────────────────────────────┐
│  SnapCall  [≡]              │
├─────────────────────────────┤
│  底池赔率                    │
│  ┌─────────┬─────────┐      │
│  │ 底池    │ 对手下注 │      │
│  │ [ 100 ] │ [  50  ] │      │
│  ├─────────┴─────────┤      │
│  │ 我跟              │      │
│  │ [      50       ] │      │
│  ├───────────────────┤      │
│  │ 底池赔率: 25.0%   │ ← 自动计算 │
│  │ (需要 >25% 胜率)  │      │
│  └───────────────────┘      │
├─────────────────────────────┤
│  公共牌              [清空]  │
│  ┌────┬────┬────┬────┬────┐ │
│  │ A♠ │ K♦ │ Q♥ │    │    │ │
│  └────┴────┴────┴────┴────┘ │
├─────────────────────────────┤
│  玩家                        │
│  ┌─────────────────────┐    │
│  │ Player 1      [×]   │    │
│  │ ┌────┬────┐  81.5%  │ ← 结果直接显示 │
│  │ │ A♥ │ A♦ │  ████   │    │
│  │ └────┴────┘         │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ Player 2      [×]   │    │
│  │ ┌────┬────┐  18.5%  │    │
│  │ │ ?? │ ?? │  █     │    │
│  │ └────┴────┘         │ ← ?? 表示随机牌 │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ Player 3      [×]   │    │
│  │ ┌────┬────┐   -     │ ← 未计算显示 - │
│  │ │    │    │         │    │
│  │ └────┴────┘         │    │
│  └─────────────────────┘    │
│                             │
│  [+ 添加玩家]                │
├─────────────────────────────┤
│  模拟次数: [10000 ▼]        │
│  [   计算胜率   ]           │
├─────────────────────────────┤
│      选牌键盘（底部固定）      │
│  ┌──────────────────────┐   │
│  │ A  K  Q  J  T 9 8 7  │   │
│  │ 6  5  4  3  2        │   │
│  ├──────────────────────┤   │
│  │ ♠️  ♥️  ♦️  ♣️       │   │
│  ├──────────────────────┤   │
│  │ [← 退格]             │   │
│  └──────────────────────┘   │
└─────────────────────────────┘
```

## 浅色主题配色

```css
--bg: #f8fafc;          /* 背景 */
--card-bg: #ffffff;      /* 卡片背景 */
--border: #e2e8f0;       /* 边框 */
--text: #1e293b;         /* 主文字 */
--muted: #64748b;        /* 次要文字 */
--accent: #3b82f6;       /* 蓝色强调 */
--accent-2: #10b981;     /* 绿色（胜率条）*/
--danger: #ef4444;       /* 红色（删除）*/
```

## 关键功能

### 底池赔率区域
- 三个数字输入框：底池、对手下注、我跟
- 自动计算并显示底池赔率百分比
- 显示"需要 >X% 胜率"的提示
- 公式：`potOdds = call / (pot + opponentBet + call)`

### 玩家卡片
- 每个玩家一个卡片，右上角删除按钮
- 两张牌槽：点击唤起键盘输入
- 空牌槽 = 随机牌（计算时随机发）
- 计算后直接在卡片内显示胜率百分比和进度条
- 无数量限制，最少 2 人

### Two-Tap 键盘
- 底部固定，占屏幕 35-40%
- Rank 行：A K Q J T 9 8 7 6 5 4 3 2
- Suit 行：♠️ ♥️ ♦️ ♣️
- 已使用的牌 Ghost 显示（禁用）
- 退格按钮

### Range Matrix
- **v1 版本暂不实现**，v2 再考虑

## 状态设计

```typescript
interface GameState {
  // 底池赔率（纯数字）
  pot: number;           // 默认 0
  opponentBet: number;   // 默认 0
  callAmount: number;    // 默认 0
  
  // 牌
  board: (Card | null)[];  // 5张，默认 [null,...]
  players: Player[];       // 默认 2 人
  
  // UI
  activeSlot: Slot | null;      // 当前选中的牌槽
  pendingRank: string | null;   // 键盘已选的 Rank
  
  // 计算
  iterations: number;           // 默认 10000
  isCalculating: boolean;
}

interface Player {
  id: string;
  cards: [Card | null, Card | null];  // null = 随机牌
  equity?: number;                     // 计算结果缓存
}
```

## 组件结构

```
src/
├── components/
│   ├── PotOddsPanel.tsx      # 底池赔率（3输入+计算）
│   ├── CommunityCards.tsx    # 公共牌 5 张
│   ├── PlayerCard.tsx        # 单个玩家（牌槽+结果）
│   ├── PlayerList.tsx        # 玩家列表管理
│   ├── CardSlot.tsx          # 单张牌槽（可复用）
│   ├── TwoTapKeyboard.tsx    # 底部固定键盘
│   └── EquityBar.tsx         # 胜率进度条
├── hooks/
│   ├── useWasm.ts            # WASM 加载
│   └── useEquity.ts          # 胜率计算逻辑
├── stores/
│   └── gameStore.ts          # Zustand
├── lib/
│   ├── wasm.ts               # WASM 封装
│   └── utils.ts              # 底池赔率计算等
└── App.tsx
```

## WASM 集成

保留现有的 `web/src/lib.rs` WASM 绑定，React 通过 `useWasm` hook 加载：

```typescript
export function useWasm() {
  const [wasm, setWasm] = useState<typeof import('../wasm/pkg') | null>(null);
  
  useEffect(() => {
    import('../wasm/pkg').then(module => {
      module.default().then(() => setWasm(module));
    });
  }, []);
  
  return wasm;
}
```

## 移动端适配要点

- **底部固定键盘**：占屏幕 35-40%，不遮挡主要内容
- **触摸区域**：牌槽、按钮至少 44x44dp
- **响应式字体**：使用 rem，在小屏幕上适当缩小
- **输入优化**：数字输入框使用 `inputmode="decimal"`

## 开发计划

| 阶段 | 任务 | 预估 |
|---|---|---|
| 1 | Vite + React + Tailwind 脚手架，浅色主题变量 | 1h |
| 2 | WASM 集成 + Card/Player 类型定义 | 1h |
| 3 | Two-Tap Keyboard 组件（底部固定） | 2h |
| 4 | CardSlot + CommunityCards | 2h |
| 5 | PlayerCard（含增删、equity 显示） | 3h |
| 6 | PotOddsPanel（输入+自动计算） | 2h |
| 7 | 胜率计算集成 + 结果展示优化 | 2h |
| 8 | 移动端适配测试 + 细节打磨 | 2h |

**总计：约 15 小时**

## 参考文件

- 现有 WASM: `/web/src/lib.rs`
- 现有 CLI: `/cli/src/main.rs`
- 核心库: `/core/src/lib.rs`
