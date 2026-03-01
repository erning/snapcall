# Web UI 设计文档 — 移动端优先 Equity 计算器

## 概述

Web 应用（`apps/web/`）是一个移动端优先的德州扑克 equity 计算器。基于 Vite + React + Tailwind CSS v4 构建，通过 WASM 调用 Rust 核心引擎进行实时计算。

## 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| CSS 框架 | Tailwind CSS v4 + `@tailwindcss/vite` | 零配置文件，原生 CSS-first |
| 计算触发 | 输入变化后 300ms 防抖自动计算 | 减少不必要的 WASM 调用 |
| 主题 | 浅色主题 | 移动端户外可读性 |
| 视觉风格 | factory.ai 风格改编 — 干净、留白充裕、微妙过渡 | |
| 输入模式 | 文字输入（始终可用）+ 可视化选取控件 | 兼顾高效和直观 |
| 选取控件展示 | 移动端 (<640px) 底部弹出面板，桌面端内联展开 | |
| Villain 默认 | RangePicker 为主，文字输入作为备用；Hero/Board 用 CardPicker | |

## 视觉设计系统

factory.ai 风格改编至浅色模式：

- **背景**: `bg-stone-50`（暖中性色，非冷蓝灰）
- **区块/卡片**: `bg-white rounded-2xl shadow-sm`（细微阴影代替边框）
- **字体**: 系统无衬线字体，14px 基准，紧凑行高，清晰的粗细层级
- **强调色**: `orange-500` 用于交互/激活状态
- **文字颜色**: `text-stone-900` 主文字、`text-stone-500` 次要、`text-stone-400` 提示
- **Equity 高亮**: `text-orange-500 font-bold`
- **错误**: `text-red-500`
- **圆角**: `rounded-2xl`（~16px）卡片/区块、`rounded-xl`（~12px）输入框、`rounded-lg`（~8px）小按钮
- **间距**: 宽松 — `p-5` 区块内、`space-y-4` 区块间、`gap-3` 内部
- **过渡**: `transition-colors duration-200` 交互元素
- **输入框**: `text-base`（防止 iOS 自动缩放）、`py-2.5` 触摸目标
- **按钮**: `bg-stone-100 hover:bg-stone-200` 次要、`bg-orange-500 text-white` 主要

## 组件架构

```
App (useReducer 状态所有者)
├── Header               — "SnapCall" 标题 + 计算模式/样本数信息
├── BoardInput           — 文字输入 + CardPicker（公共牌）
│   └── CardPicker       — 4×13 选牌网格（移动端底部弹出，桌面端内联）
├── HeroSection          — 文字输入 + CardPicker + equity 显示
│   └── CardPicker       — 共享已用牌禁用状态
├── VillainsSection      — 对手列表 + 数量 + 增/删控件
│   └── VillainRow × N   — RangePicker 默认 + equity 显示
│       └── RangePicker  — 13×13 范围矩阵（移动端底部弹出，桌面端内联）
│       └── (文字输入作为备用)
├── PotOddsSection       — 底池 + 跟注金额输入 + 赔率显示
├── BottomSheet          — 可复用的底部弹出容器（移动端 <640px）
└── 错误/加载条           — 内联 WASM 错误消息
```

## CardPicker 选牌控件

用于选择具体牌张的可视化网格，用于 Board 和 Hero 输入。

### 布局

4 行 × 13 列网格：
- 行：♠ ♥ ♦ ♣（黑桃、红心、方块、梅花）
- 列：A K Q J T 9 8 7 6 5 4 3 2

```
     A   K   Q   J   T   9   8   7   6   5   4   3   2
♠   ♠A  ♠K  ♠Q  ♠J  ♠T  ♠9  ♠8  ♠7  ♠6  ♠5  ♠4  ♠3  ♠2   ← 黑色
♥   ♥A  ♥K  ♥Q  ♥J  ♥T  ♥9  ♥8  ♥7  ♥6  ♥5  ♥4  ♥3  ♥2   ← 红色
♦   ♦A  ♦K  ♦Q  ♦J  ♦T  ♦9  ♦8  ♦7  ♦6  ♦5  ♦4  ♦3  ♦2   ← 蓝色
♣   ♣A  ♣K  ♣Q  ♣J  ♣T  ♣9  ♣8  ♣7  ♣6  ♣5  ♣4  ♣3  ♣2   ← 绿色
```

### 单元格状态

| 状态 | 样式 | 说明 |
|------|------|------|
| 可选 | `bg-white` + 花色颜色文字 | 可以被选择 |
| 已选 | `bg-orange-500 text-white ring-2 ring-orange-300` | 当前输入已选中 |
| 禁用 | `bg-stone-100 text-stone-300` | 已被其他位置使用 |

### 花色颜色（四色牌面）

- ♠ `text-stone-800`
- ♥ `text-red-500`
- ♦ `text-blue-500`
- ♣ `text-green-600`

### 交互

- 点击可选牌 → 加入选择
- 点击已选牌 → 取消选择
- 达到 `maxSelect` 上限后，继续点击替换最早选择的牌
- 禁用的牌不可点击

### 接口

```typescript
interface CardPickerProps {
  selected: string[];          // 当前已选牌, e.g. ["Ah", "Kd"]
  disabled: string[];          // 其他位置使用的牌（灰色禁用）
  maxSelect?: number;          // 最大可选数量（Hero=2, Board=5）
  onSelect: (cards: string[]) => void;
}
```

## RangePicker 范围选取控件

标准 13×13 扑克范围矩阵，用于 Villain 范围输入。

### 布局

```
     A    K    Q    J    T    9    8    ...   2
A  [AA ] [AKs] [AQs] [AJs] [ATs] [A9s] [A8s] ... [A2s]
K  [AKo] [KK ] [KQs] [KJs] [KTs] [K9s] [K8s] ... [K2s]
Q  [AQo] [KQo] [QQ ] [QJs] [QTs] [Q9s] [Q8s] ... [Q2s]
...
2  [A2o] [K2o] [Q2o] [J2o] [T2o] [92o] [82o] ... [22 ]
```

- **对角线**: 对子 (AA, KK, ..., 22)
- **上三角**: 同花 (suited, s)
- **下三角**: 不同花 (offsuit, o)

### 选中状态颜色（三级橙色）

| 类别 | 未选中 | 已选中 |
|------|--------|--------|
| 对子 | `bg-stone-50 text-stone-600` | `bg-orange-400 text-white` |
| 同花 | `bg-stone-50 text-stone-600` | `bg-orange-500 text-white` |
| 不同花 | `bg-stone-50 text-stone-600` | `bg-orange-300 text-stone-800` |

### 交互

- 点击切换单个格子选中/取消
- 拖动手势一次选中/取消多个格子（pointer events）
- 预设快捷按钮：`AA`、`KK+`、`QQ+`、`JJ+`、`TT+`、`AKs`、`AQs+`、`AJs+`、`ATs+`
- `Clear` 按钮清除所有选择
- 文字输入框可直接键入范围语法（如 `TT+,AKs`）

### 接口

```typescript
interface RangePickerProps {
  selected: Set<string>;                // 已选组合, e.g. {"AA", "AKs", "AKo"}
  onSelect: (selected: Set<string>) => void;
}
```

## 应用状态

使用 `useReducer` 在 `App` 组件统一管理状态：

```typescript
interface AppState {
  board: string;          // 公共牌字符串
  hero: string;           // Hero 手牌字符串
  villains: string[];     // Villain 列表（至少 1 项）
  potSize: string;        // 底池大小（字符串便于受控输入）
  callAmount: string;     // 跟注金额
}
```

Action 类型：`SET_BOARD`、`SET_HERO`、`SET_VILLAIN(index, value)`、`ADD_VILLAIN`、`REMOVE_VILLAIN`、`SET_POT_SIZE`、`SET_CALL_AMOUNT`。

## useEquity Hook

核心计算 Hook，封装 WASM 调用：

```typescript
function useEquity(board: string, hero: string, villains: string[]): {
  equities: number[] | null;   // 各玩家 equity 百分比
  mode: string | null;         // 计算模式（ExactEnumeration / MonteCarlo）
  samples: number | null;      // 实际采样数
  isCalculating: boolean;      // 计算中标识
  error: string | null;        // WASM/Rust 错误消息
}
```

关键设计点：
- 输入变化后 **300ms 防抖** 再触发 WASM 调用
- Hero 为空时不调用、不显示错误
- 使用递增序列号防止过期结果覆盖
- 错误消息直接来自 WASM/Rust（`SnapError`），前端不做额外校验
- villains 数组通过序列化 key 确保 `useEffect` 依赖稳定

## 文件结构

```
apps/web/src/
├── App.tsx                        # 状态管理 + 组件组合
├── main.tsx                       # 入口（不变）
├── index.css                      # Tailwind v4 入口 + 主题 + 动画
├── types.ts                       # AppState, AppAction 类型定义
├── reducer.ts                     # appReducer + initialState
├── lib/
│   ├── wasm.ts                    # WASM 封装: estimateEquity()
│   ├── potOdds.ts                 # calcPotOdds 纯函数
│   └── poker.ts                   # 牌/范围常量与辅助函数
├── hooks/
│   └── useEquity.ts               # 防抖 WASM 计算 Hook
└── components/
    ├── BoardInput.tsx              # 公共牌输入
    ├── HeroSection.tsx             # Hero 输入 + equity 显示
    ├── VillainsSection.tsx         # Villain 列表管理
    ├── VillainRow.tsx              # 单个 Villain（Range/Text 模式）
    ├── PotOddsSection.tsx          # 底池赔率计算
    ├── CardPicker.tsx              # 4×13 选牌网格
    ├── RangePicker.tsx             # 13×13 范围矩阵
    └── BottomSheet.tsx             # 移动端底部弹出容器
```

## 验证清单

1. `pnpm run dev` — 应用加载，Tailwind 样式渲染，浅色主题橙色强调色
2. Hero 输入 `AhKd`，Villain 留空 → 自动计算 equity（hero vs random）
3. 打开 Hero CardPicker → 点选 A♥ 和 K♦ → 填入输入框 → equity 计算
4. 添加 Villain `KQs` → 重新计算两人对局
5. 打开 Villain RangePicker → 选择 TT+ → 范围字符串更新 → equity 重算
6. 输入公共牌 `AsKc5d` → 带翻牌面重算
7. 通过 +/- 按钮增删 Villain
8. 输入底池 150、跟注 50 → 显示 "25.0% equity to call"
9. 无效输入（如 `Ax`）→ 显示 WASM 错误
10. 375px 宽度下无水平滚动，触摸目标合适
11. `pnpm run typecheck` 通过
12. `pnpm run build` 成功
