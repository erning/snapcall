# SnapCall 移动端产品需求文档 (PRD)

> **版本**: 1.0
> **日期**: 2026-03-05
> **范围**: Android (Jetpack Compose) + iOS (SwiftUI) 统一规格
> **参考**: Web 端 `apps/web/` 源码

---

## 目录

1. [执行摘要](#1-执行摘要)
2. [用户画像与用户故事](#2-用户画像与用户故事)
3. [页面与组件详细规格](#3-页面与组件详细规格)
4. [交互规格](#4-交互规格)
5. [视觉设计规格](#5-视觉设计规格)
6. [技术架构](#6-技术架构)
7. [平台特定说明](#7-平台特定说明)
8. [非目标](#8-非目标)

---

## 1. 执行摘要

SnapCall 是一款高性能德州扑克权益计算器。Rust 核心引擎支持手牌评估（~25ns）和权益计算（精确枚举 / Monte Carlo 模拟），已通过 WASM 绑定运行于 Web 端。

本文档定义 Android 和 iOS 原生 App 的完整产品规格，确保：

- **功能对齐**：移动端覆盖 Web 端全部 13 个组件的功能
- **体验优化**：在保持 Web 端视觉设计语言一致的基础上，适配原生手势和平台规范
- **性能基准**：计算在后台线程执行，UI 保持 60fps

核心 Rust API 通过 UniFFI 绑定暴露给 Swift/Kotlin：

```rust
pub fn estimate_equity(
    board: &str,
    hero: &str,
    villains: &[&str],
    iterations: usize,
) -> Result<EquityResult, SnapError>
```

---

## 2. 用户画像与用户故事

### 2.1 用户画像

| 画像 | 描述 | 典型场景 |
|------|------|----------|
| **线下牌手** | 在真实牌局间隙快速计算手牌胜率 | 单手操作、需要快速输入 |
| **在线玩家** | 复盘时分析特定局面的决策正确性 | 多对手、范围 vs 范围分析 |
| **学习者** | 通过工具理解底池赔率和 EV 概念 | 反复调整参数观察变化 |

### 2.2 用户故事

| ID | 故事 | 验收标准 |
|----|------|----------|
| US-01 | 作为牌手，我想输入 Hero 手牌和公共牌，计算胜率 | 选中 2 张 Hero 牌 + 0/3/4/5 张公共牌后自动计算 |
| US-02 | 作为牌手，我想添加多个对手（手牌或范围） | 支持 1-9 个对手，每个可设为具体手牌或范围模式 |
| US-03 | 作为牌手，我想看到底池赔率和 EV 判断 | 输入底池和下注后显示 +EV/-EV 及底池赔率 |
| US-04 | 作为牌手，我想快速切换对手的折叠/激活状态 | 左滑操作一键折叠，折叠后不参与计算 |
| US-05 | 作为牌手，我想使用随机牌局进行练习 | 菜单中一键生成随机演示局面 |
| US-06 | 作为牌手，我想切换深色/浅色主题 | 设置页支持浅色/深色/跟随系统 |
| US-07 | 作为牌手，我想调整计算精度和盲注大小 | 设置页可配置迭代次数、大小盲 |
| US-08 | 作为牌手，我想数据在关闭 App 后保留 | 状态和设置自动持久化到本地存储 |

---

## 3. 页面与组件详细规格

### 3.0 整体布局

```
┌─────────────────────────────┐
│░░░░░░ 计算进度条 (h=2dp) ░░░│  ← 计算中显示，fixed top
├─────────────────────────────┤
│  SnapCall            [···]  │  ← Header: 标题 + 菜单按钮
├─────────────────────────────┤
│                             │
│  ┌───────────────────────┐  │
│  │    HeroSection        │  │  ← 白色卡片 rounded-16
│  └───────────────────────┘  │
│           ↕ 16dp            │
│  ┌───────────────────────┐  │
│  │    BoardSection       │  │
│  └───────────────────────┘  │
│           ↕ 16dp            │
│  ┌───────────────────────┐  │
│  │    VillainsSection    │  │
│  │  ┌─────────────────┐  │  │
│  │  │  VillainRow #1  │  │  │
│  │  └─────────────────┘  │  │
│  │       ↕ 12dp          │  │
│  │  ┌─────────────────┐  │  │
│  │  │  VillainRow #2  │  │  │
│  │  └─────────────────┘  │  │
│  │    [+ 添加对手]       │  │
│  └───────────────────────┘  │
│                             │
├─────────────────────────────┤
│  ──────── 分割线 ────────── │
│        v1.0.0 (abc123)      │  ← 版本号
└─────────────────────────────┘
```

**容器规格**：
- 最大内容宽度：512dp（大屏设备居中）
- 水平内边距：16dp
- 顶部内边距：12dp，底部：16dp
- 区块间距：16dp (`space-y-4`)
- 可滚动：整体页面纵向滚动

---

### 3.1 HeaderMenu（菜单）

**触发**：右上角省略号按钮（点击区域 40×40dp）

```
┌──────────────────────────┐
│  SnapCall          [···] │
└──────────────────────────┘
                       │
                  ┌────▼────────┐
                  │ ⚙ 设置      │
                  │ ⓘ 帮助      │
                  │ 🔀 随机演示  │
                  ├─────────────┤
                  │ ↩ 新游戏    │  ← 红色文字
                  └─────────────┘
```

**规格**：
| 属性 | 值 |
|------|-----|
| 菜单最小宽度 | 200dp |
| 菜单圆角 | 12dp |
| 菜单阴影 | elevation 8dp |
| 菜单项高度 | 44dp (padding: 10dp vertical, 16dp horizontal) |
| 菜单项字号 | 14sp |
| 图标尺寸 | 15dp |
| 图标与文字间距 | 8dp |
| 背景遮罩 | 黑色 20% 透明度，全屏 |
| 出现位置 | 锚定按钮右下方，margin-top 4dp |

**菜单项**：
1. **设置** — 图标 Settings，导航到 SettingsPage
2. **帮助** — 图标 CircleHelp，导航到 HelpPage
3. **随机演示** — 图标 Shuffle，填充随机牌局
4. **新游戏** — 图标 RotateCcw，红色文字 `#ef4444`，重置所有状态

**交互**：
- 点击遮罩或按返回键关闭菜单
- 选择菜单项后自动关闭

---

### 3.2 HeroSection（Hero 手牌区）

```
┌─────────────────────────────────────┐
│  ▼ Hero                [Bet ▾] 35%  │  ← 标题行：折叠箭头 + Badge + 胜率
│                                     │
│  ┌──────┐ ┌──────┐        +EV Call  │  ← 胜率详情
│  │  A   │ │  K   │    Pot Odds: 25% │
│  │  ♠   │ │  ♠   │    Max Bet: 150  │
│  └──────┘ └──────┘                  │
│  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔  │
│  │ A  K  Q  J  T  9  8 │           │  ← MiniCardPicker（展开时）
│  │ 7  6  5  4  3  2    │           │
│  │ ♠  ♥  ♦  ♣     ⌫   │           │
│  └──────────────────────┘           │
└─────────────────────────────────────┘
```

**折叠态**：
```
┌─────────────────────────────────────┐
│  ▶ Hero                [Bet ▾]      │  ← 单行，点击展开
└─────────────────────────────────────┘
```

#### 布局规格

| 属性 | 值 |
|------|-----|
| 卡片容器 | 背景白/stone-900, 圆角 16dp, 阴影 sm |
| 水平内边距 | 20dp |
| 上边距 | 12dp |
| 下边距 | 20dp (展开态) / 12dp (折叠态) |
| 标题行下间距 | 12dp |

#### 牌槽规格

| 属性 | 值 |
|------|-----|
| 尺寸 | 56×80dp |
| 圆角 | 8dp |
| 间距 | 6dp |
| 有牌边框 | 1dp 实线, stone-200/stone-700 |
| 空牌边框 | 2dp 虚线, stone-300/stone-600 |
| 选中态 | 2dp 环形, orange-400 |
| 点数字号 | 20sp bold |
| 花色字号 | 16sp |

#### 胜率显示

| 属性 | 值 |
|------|-----|
| 胜率数字 | 18sp bold, orange-500 `#ea580c` |
| +EV 文字 | 12sp, green-600 `#16a34a` |
| -EV 文字 | 12sp, red-500 `#ef4444` |
| 底池赔率 | 12sp, stone-500/stone-400 |
| 最大下注 | 12sp, stone-500/stone-400 |

#### Badge（下注额切换）

| 属性 | 值 |
|------|-----|
| 字号 | 12sp medium |
| 内边距 | 10dp horizontal, 4dp vertical |
| 圆角 | 8dp |
| 激活态 | ring-2 orange-400, 背景 orange-50/orange-500(10%), 文字 orange-700/orange-400 |
| 非激活态 | 背景 stone-100/stone-800, 文字 stone-600/stone-400 |
| 格式 | "Bet {value}" (value>0) 或 "Pot" (value=0) |

---

### 3.3 BoardSection（公共牌区）

```
┌──────────────────────────────────────┐
│  Board                    [Pot ▾]    │
│                                      │
│  ┌────┐ ┌────┐ ┌────┐  ┌────┐ ┌────┐│
│  │ 5  │ │ 6  │ │ 7  │  │ 8  │ │    ││  ← Flop(3) + Turn(1) + River(1)
│  │ ♣  │ │ ♣  │ │ ♣  │  │ ♥  │ │    ││
│  └────┘ └────┘ └────┘  └────┘ └────┘│
│  ╰── Flop ──╯  Turn   River         │
└──────────────────────────────────────┘
```

#### 布局规格

| 属性 | 值 |
|------|-----|
| 卡片容器 | 背景白/stone-900, 圆角 16dp, 阴影 sm |
| 水平内边距 | 20dp |
| 上边距 | 12dp, 下边距 | 20dp |
| 标题行下间距 | 12dp |

#### 牌槽布局

| 属性 | 值 |
|------|-----|
| 牌槽尺寸 | 56×80dp (与 Hero 一致) |
| Flop 三张间距 | 6dp |
| Flop-Turn 间距 | 16dp |
| Turn-River 间距 | 16dp |
| 排列方式 | flex row, align center |

#### 底池编辑器

- 点击 Pot Badge 展开 `NumberEditor`
- 底池步进逻辑（以大小盲为基准）：
  - 上调：尝试 `n*BB+SB` → `(n+1)*BB` → `(n+1)*BB+SB`
  - 下调：尝试 `n*BB+SB` → `n*BB` → `(n-1)*BB+SB` → `(n-1)*BB`
  - 最小值：`BB + SB`

---

### 3.4 VillainsSection（对手区）

```
┌──────────────────────────────────────┐
│  Exact · 1,234,567 samples           │  ← 计算模式 + 样本数
│  Villains (2)        [+ ▾ 添加对手]  │  ← 标题 + 添加按钮
│                                      │
│  ┌────────────────────────────────┐  │
│  │  VillainRow #1                 │  │  ← 可滑动行
│  └────────────────────────────────┘  │
│            ↕ 12dp                    │
│  ┌────────────────────────────────┐  │
│  │  VillainRow #2                 │  │
│  └────────────────────────────────┘  │
│                                      │
│  Error: Invalid range syntax         │  ← 错误信息（红色，可选）
└──────────────────────────────────────┘
```

**添加按钮**：
| 属性 | 值 |
|------|-----|
| 字号 | 12sp medium |
| 内边距 | 12dp horizontal, 6dp vertical |
| 圆角 | 8dp |
| 背景 | stone-100/stone-800 |
| hover | stone-200/stone-700 |

**模式/样本显示**：
| 属性 | 值 |
|------|-----|
| 字号 | 12sp |
| 颜色 | stone-400/stone-500 |
| 格式 | "{mode} · {samples} samples" |
| mode 值 | "Exact" / "MonteCarlo" |

**错误显示**：
| 属性 | 值 |
|------|-----|
| 字号 | 14sp |
| 颜色 | red-500 `#ef4444` |
| 位置 | 区块顶部 |

---

### 3.5 VillainRow（对手行 — 手牌模式）

```
正常态：
┌────────────────────────────────────┐
│  Villain 1                   12.5% │
│  ┌──────┐ ┌──────┐                │
│  │  K   │ │  Q   │                │
│  │  ♠   │ │  ♠   │                │
│  └──────┘ └──────┘                │
└────────────────────────────────────┘

左滑展开操作按钮：
┌────────────────────────┬────┬────┬────┐
│  Villain 1        12.5%│ R  │ F  │ ✕  │
│  ┌──────┐ ┌──────┐    │蓝色│橙色│红色│
│  │  K   │ │  Q   │    │    │    │    │
│  └──────┘ └──────┘    │    │    │    │
└────────────────────────┴────┴────┴────┘
                          56dp 56dp 56dp
```

#### 对手行 — 范围模式

```
┌────────────────────────────────────┐
│  Villain 2                   23.1% │
│  ┌──────┐                          │
│  │ ╱──╲ │  48 combos               │
│  ││ R  ││                          │
│  │ ╲──╱ │                          │
│  └──────┘                          │
└────────────────────────────────────┘
```

当范围有具体组合时，显示最多 6 张迷你卡，溢出显示 "+N"：

```
┌────────────────────────────────────┐
│  Villain 2                   23.1% │
│  ┌────┐┌────┐┌────┐┌────┐┌────┐+3 │
│  │AKs ││AQs ││AJs ││ATs ││KQs │   │
│  └────┘└────┘└────┘└────┘└────┘    │
└────────────────────────────────────┘
```

#### 折叠态

```
┌────────────────────────────────────┐
│  V̶i̶l̶l̶a̶i̶n̶ ̶1̶                 FOLD  │  ← 删除线 + 灰色 + FOLD 标签
│  (内容变灰淡化)                     │
└────────────────────────────────────┘
```

#### 布局规格

| 属性 | 值 |
|------|-----|
| 外容器 | overflow hidden, 圆角 16dp, 阴影 sm |
| 内容区背景 | 白/stone-900 |
| 水平内边距 | 20dp |
| 垂直内边距 | 12dp |
| 标题行下间距 | 6dp |
| 标题字号 | 14sp semibold |
| 胜率字号 | 14sp bold, stone-600/stone-400 |

#### Villain 牌槽规格

| 属性 | 值 |
|------|-----|
| 尺寸 | 40×56dp |
| 圆角 | 8dp |
| 间距 | 6dp |
| 边框样式 | 同 Hero 牌槽 |
| 选中态 | 同 Hero 牌槽 |
| 点数字号 | 16sp bold |
| 花色字号 | 12sp |

#### 滑动操作按钮

| 按钮 | 颜色 | 图标 | 功能 |
|------|------|------|------|
| 范围/手牌切换 | blue-500 `#3b82f6` | 切换图标 | 在 cards/range 模式间切换 |
| 折叠 | amber-500 `#f59e0b` | 折叠图标 | 切换对手折叠状态 |
| 删除 | red-500 `#ef4444` | 删除图标 | 移除对手（仅对手数>1时显示） |

| 按钮属性 | 值 |
|----------|-----|
| 每个按钮宽度 | 56dp |
| 总展开宽度 | 112-168dp (2-3个按钮) |
| 图标颜色 | 白色 |

---

### 3.6 MiniCardPicker（紧凑选牌器）

```
┌───────────────────────────────────┐
│  ┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐ │
│  │ A ││ K ││ Q ││ J ││ T ││ 9 ││ 8 │ │  ← 点数行 1
│  └───┘└───┘└───┘└───┘└───┘└───┘└───┘ │
│  ┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐     │
│  │ 7 ││ 6 ││ 5 ││ 4 ││ 3 ││ 2 │     │  ← 点数行 2
│  └───┘└───┘└───┘└───┘└───┘└───┘     │
│  ┌───┐┌───┐┌───┐┌───┐       ┌───┐   │
│  │ ♠ ││ ♥ ││ ♦ ││ ♣ │       │ ⌫ │   │  ← 花色行 + 退格
│  └───┘└───┘└───┘└───┘       └───┘   │
└───────────────────────────────────┘
```

**工作流程**：先选点数 → 再选花色 → 自动填入并前进到下一槽位

#### 规格

| 属性 | 值 |
|------|-----|
| 容器背景 | stone-100/stone-900 |
| 容器圆角 | 12dp |
| 容器阴影 | elevation 8dp |
| 容器内边距 | 12dp |
| 按钮尺寸 | 36×36dp |
| 按钮圆角 | 8dp |
| 按钮间距 | 4dp |
| 按钮字号 | 14sp bold (点数), 18sp bold (花色) |
| 行间距 | 4dp |

#### 按钮状态

| 状态 | 背景 | 边框 | 文字 |
|------|------|------|------|
| **正常** | 白/stone-800 | 1dp stone-200/stone-700 | stone-800/stone-200 |
| **选中** (当前点数) | orange-500 | 1dp orange-500 | 白色 |
| **禁用** (4花全用) | 白/stone-700, opacity 30% | 1dp stone-200/stone-600 | stone-400/stone-500 |

**花色按钮颜色**：
- ♠ 黑桃: stone-800/stone-200
- ♥ 红心: red-500 `#ef4444`
- ♦ 方块: blue-500 `#3b82f6`
- ♣ 梅花: green-600/green-500 `#16a34a`/`#22c55e`

**过渡动画**: `transition-colors 100ms`

---

### 3.7 CardPicker（全牌选择器）

用于需要从完整 52 张牌中选择的场景（预留，Web 端已实现但当前主要使用 MiniCardPicker）。

```
┌──────────────────────────────────────────────────────┐
│   A    K    Q    J    T    9    8    7    6    5    4    3    2  │  ← 列头
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐│
│ │A♠│ │K♠│ │Q♠│ │J♠│ │T♠│ │9♠│ │8♠│ │7♠│ │6♠│ │5♠│ │4♠│ │3♠│ │2♠││ ← ♠ 行
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘│
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐│
│ │A♥│ │K♥│ │Q♥│ │J♥│ │T♥│ │9♥│ │8♥│ │7♥│ │6♥│ │5♥│ │4♥│ │3♥│ │2♥││ ← ♥ 行
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘│
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐│
│ │A♦│ │K♦│ │Q♦│ │J♦│ │T♦│ │9♦│ │8♦│ │7♦│ │6♦│ │5♦│ │4♦│ │3♦│ │2♦││ ← ♦ 行
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘│
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐│
│ │A♣│ │K♣│ │Q♣│ │J♣│ │T♣│ │9♣│ │8♣│ │7♣│ │6♣│ │5♣│ │4♣│ │3♣│ │2♣││ ← ♣ 行
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘│
└──────────────────────────────────────────────────────┘
```

#### 规格

| 属性 | 值 |
|------|-----|
| 网格 | 4行 × 13列 |
| 单元格 | 正方形 (aspect 1:1), 自适应宽度 |
| 单元格间距 | 4dp |
| 圆角 | 8dp |
| 字号 | 12sp bold |
| 列头字号 | 10sp semibold, stone-400 |
| 行间距 | 4dp |

#### 单元格状态

| 状态 | 背景 | 文字 |
|------|------|------|
| **正常** | 白/stone-800 | 花色颜色 |
| **选中** | orange-500, ring-2 orange-300 | 白色 |
| **禁用** | stone-100/stone-800 | stone-300, cursor 禁用 |

---

### 3.8 RangePicker（范围选择器）

以全屏 Modal 形式展示 13×13 范围网格。

```
┌─────────────────────────────────┐
│            (遮罩层)              │
│  ┌───────────────────────────┐  │
│  │  48 combos    Clear  Done │  │  ← 标题栏
│  │                           │  │
│  │  AA AKs AQs AJs ... A2s  │  │  ← 对角线=口袋对
│  │  AKo KK  KQs KJs ... K2s │  │     上三角=同花
│  │  AQo KQo QQ  QJs ... Q2s │  │     下三角=不同花
│  │  AJo KJo QJo JJ  ... J2s │  │
│  │  ATo KTo QTo JTo ... T2s │  │
│  │   .   .   .   .       .  │  │
│  │   .   .   .   .       .  │  │
│  │  A2o K2o Q2o J2o ... 22  │  │
│  │                           │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

#### 规格

| 属性 | 值 |
|------|-----|
| 遮罩层 | 黑色 40% 透明度 |
| 弹窗容器 | 白/stone-900, 圆角 16dp, 阴影 xl |
| 弹窗最大宽度 | 384dp (max-w-sm) |
| 弹窗内边距 | 16dp |
| 标题栏下间距 | 12dp |
| 网格 | 13行 × 13列 |
| 单元格 | 正方形, gap 0.5dp (极紧密) |
| 单元格圆角 | 4dp |
| 单元格字号 | 10sp medium |

#### 单元格颜色

**未选中**：

| 类型 | 背景(浅/深) | 文字(浅/深) |
|------|-------------|-------------|
| **口袋对** (对角线) | amber-50 / amber-500(10%) | stone-700 / stone-300 |
| **同花** (上三角) | sky-50 / sky-500(10%) | stone-700 / stone-300 |
| **不同花** (下三角) | white / stone-800 | stone-600 / stone-400 |

**选中**：

| 类型 | 背景 | 文字 |
|------|------|------|
| **口袋对** | orange-400 | 白色 |
| **同花** | orange-500 | 白色 |
| **不同花** | orange-300 | stone-800 |

所有单元格边框: 1dp stone-200/stone-700

#### 操作按钮

| 按钮 | 样式 |
|------|------|
| **Combo 计数** | 左对齐, 14sp semibold |
| **Clear** | 文字按钮, 14sp, stone-500 |
| **Done** | 文字按钮, 14sp, orange-500 bold |

---

### 3.9 NumberEditor（数字编辑器）

支持两种模式：全尺寸（用于底池/下注编辑）和紧凑模式（用于设置页）。

```
全尺寸模式：
┌───────────────────────────────┐
│                               │
│   [−]       1,500       [+]   │  ← 步进按钮 + 数值
│                               │
│          drag to adjust       │  ← 提示文字
└───────────────────────────────┘

紧凑模式：
┌──────────────────────────────┐
│  [−]       1,500       [+]   │
└──────────────────────────────┘
```

#### 规格

| 属性 | 全尺寸 | 紧凑 |
|------|--------|------|
| 容器背景 | stone-100/stone-800 | 同左 |
| 圆角 | 12dp | 同左 |
| 水平内边距 | 24dp | 16dp |
| 垂直内边距 | 40dp | 12dp |
| 最小宽度 | 260dp | 自适应 |
| 数值字号 | 30sp bold | 20sp bold |
| 图标尺寸 | 18dp | 18dp |
| 阴影 | elevation 8dp | 无 |
| 提示文字 | "drag to adjust", 12sp | 无 |

---

### 3.10 SettingsPage（设置页）

```
┌─────────────────────────────────┐
│  ← 返回          Settings       │  ← 固定头部
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐    │
│  │  外观                    │    │
│  │  ┌───────┬───────┬─────┐│    │
│  │  │ Light │ Dark  │ Auto ││    │  ← 主题选择（三选一）
│  │  └───────┴───────┴─────┘│    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  计算精度                │    │
│  │  Iterations              │    │
│  │  [−]    100,000    [+]   │    │  ← NumberEditor compact
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  盲注                    │    │
│  │  Big Blind               │    │
│  │  [−]       20       [+]  │    │
│  │  Small Blind             │    │
│  │  [−]       10       [+]  │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌──────────┐ ┌──────────┐     │
│  │  Cancel   │ │   Save   │     │  ← 操作按钮
│  └──────────┘ └──────────┘     │
│                                 │
│  ─────────────────────────────  │
│  Reset to defaults              │  ← 重置链接
│                                 │
└─────────────────────────────────┘
```

#### 规格

| 属性 | 值 |
|------|-----|
| 页面背景 | stone-50/stone-950 |
| 头部固定 | 不滚动，max-w-lg 居中 |
| 返回按钮图标 | ChevronLeft, 20dp |
| 标题字号 | 20sp bold |
| 内容区 | 可滚动, max-w-lg 居中, 底部 padding 96dp |
| 区块间距 | 16dp |

#### 设置卡片

| 属性 | 值 |
|------|-----|
| 背景 | 白/stone-900 |
| 边框 | 1dp stone-100/stone-800 |
| 圆角 | 16dp |
| 内边距 | 16dp |
| 内部间距 | 8dp |
| 标题字号 | 14sp semibold |
| 标签字号 | 12sp medium, stone-500/stone-400 |

#### 主题按钮

| 状态 | 背景 | 文字 |
|------|------|------|
| **激活** | orange-500 | 白色 |
| **未激活** | stone-100/stone-800 | stone-600/stone-400 |
| 圆角 | 8dp |
| 字号 | 12sp medium |
| 高度 | 36dp |

#### 操作按钮

| 按钮 | 背景 | 文字 | 圆角 |
|------|------|------|------|
| **Cancel** | stone-100/stone-800 | stone-600/stone-400 | 12dp |
| **Save** | orange-500 | 白色, hover orange-600 | 12dp |
| 高度 | 44dp (padding 10dp vertical) |
| 字号 | 14sp medium |

#### 重置链接

| 属性 | 值 |
|------|-----|
| 分割线 | 1dp stone-200/stone-700, 上方 16dp padding |
| 字号 | 12sp |
| 颜色 | stone-400/stone-500, hover stone-600 |

---

### 3.11 HelpPage（帮助页）

```
┌─────────────────────────────────┐
│  ← 返回            Help         │  ← 固定头部
├─────────────────────────────────┤
│                                 │
│  BASICS                         │  ← 大写分组标题
│                                 │
│  ┌─────────────────────────┐    │
│  │  How to Use              │    │
│  │  1. 在 Hero 区选择你的   │    │
│  │     两张手牌...          │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  Card Selection          │    │
│  │  点击空白牌槽打开选牌器  │    │
│  │  ...                     │    │
│  └─────────────────────────┘    │
│                                 │
│  ADVANCED                       │
│                                 │
│  ┌─────────────────────────┐    │
│  │  Villain Ranges          │    │
│  │  ...                     │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  Pot Odds & EV           │    │
│  │  ...                     │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

#### 规格

| 属性 | 值 |
|------|-----|
| 整体布局 | 与 SettingsPage 完全一致 |
| 分组标题 | 12sp semibold, stone-400/stone-500, 全大写, letter-spacing wider |
| 分组标题水平内边距 | 4dp |
| 卡片内容字号 | 12sp, stone-500/stone-400, line-height relaxed |
| 关键词高亮 | medium weight, stone-700/stone-300 |
| 代码片段 | 内联 4dp/2dp padding, stone-100/stone-800 背景, 4dp 圆角, 11sp |
| 列表 | disc 样式, 左缩进 16dp, 项间距 4dp |

---

## 4. 交互规格

### 4.1 牌选择交互

| 行为 | 描述 |
|------|------|
| **点击空槽位** | 打开 MiniCardPicker，focus 该槽位 |
| **点击已有牌的槽位** | 打开 MiniCardPicker 并选中当前点数 |
| **选牌流程** | 点选点数 → 点选花色 → 自动填入，光标移到下一个空槽 |
| **退格键** | 清除当前槽位的牌 |
| **点击外部** | 关闭 MiniCardPicker |
| **禁用牌** | 已在其他位置使用的牌不可选（opacity 30%） |

### 4.2 滑动操作（VillainRow）

| 参数 | 值 |
|------|-----|
| 方向锁定阈值 | 10dp 移动距离后锁定水平/垂直方向 |
| 按钮宽度 | 56dp/按钮 |
| 最大展开宽度 | 2-3 个按钮 × 56dp = 112-168dp |
| 回弹动画 | 250ms ease-out |
| 关闭方式 | 右滑回原位 / 点击遮罩 / 点击其他行 |
| 触摸区域 | 内容区指针捕获 (pointer capture) |
| 同时最多展开 | 1 行 |

**滑动状态机**：
```
关闭 ──点击──→ 选牌
  │
  ├──左滑(>10dp)──→ 跟随手指 ──释放──→ 展开(offset > 50%) 或 回弹(offset < 50%)
  │
展开 ──右滑──→ 关闭
  │
  ├──点击按钮──→ 执行操作 + 关闭
```

### 4.3 拖拽编辑（NumberEditor）

| 参数 | 值 |
|------|-----|
| 拖拽方向 | 全尺寸: X + Y 轴, 紧凑: 仅 X 轴 |
| 加速倍率 | `1 + (速度 / 10)`，速度越快步进越大 |
| 步进累积 | 使用小数累积 (`fractional`)，避免跳跃 |
| 光标 | 拖拽前 grab，拖拽中 grabbing |
| Touch Action | none (禁止浏览器默认手势) |

### 4.4 步进按钮长按

| 参数 | 值 |
|------|-----|
| 首次延迟 | 400ms |
| 重复间隔 | 80ms |
| 触发方式 | pointerdown 开始，pointerup/pointerleave 停止 |

### 4.5 范围拖选（RangePicker）

| 参数 | 值 |
|------|-----|
| 启动方式 | pointerdown 在网格单元上 |
| 模式判定 | 首个单元格已选中 → 取消选择模式; 未选中 → 选择模式 |
| 拖拽跟随 | pointermove + `elementFromPoint` 检测当前单元 |
| 完成 | pointerup 结束拖拽 |

### 4.6 计算防抖

| 参数 | 值 |
|------|-----|
| 防抖延迟 | 300ms |
| 超时时间 | 30秒 (WASM worker 超时) |
| 进度指示 | 顶部 2dp 进度条，loading-bar 动画 |
| 触发条件 | board/hero/villains/iterations 任一变化 |
| 去重机制 | sequence 序列号，丢弃过期结果 |
| 双击胜率 | 强制重新计算 (recalc) |

### 4.7 动画参数汇总

| 动画 | 时长 | 缓动 |
|------|------|------|
| 滑动回弹 | 250ms | ease-out |
| 颜色过渡 | 100-200ms | ease (default) |
| 选牌器按钮 | 100ms | ease |
| 进度条 | 1000ms | ease-in-out, infinite |
| 全局 UI 过渡 | 150ms | ease |

---

## 5. 视觉设计规格

### 5.1 色值表

#### 品牌色

| 用途 | 色值 | Token |
|------|------|-------|
| 品牌主色/强调色 | `#ea580c` | orange-500 |
| 品牌主色(亮) | `#fb923c` | orange-400 |
| 品牌主色(淡) | `#fdba74` | orange-300 |
| 品牌悬停 | `#c2410c` | orange-600 |

#### 背景色

| 用途 | 浅色模式 | 深色模式 |
|------|----------|----------|
| 页面背景 | `#fafaf9` stone-50 | `#0c0a09` stone-950 |
| 卡片背景 | `#ffffff` white | `#1c1917` stone-900 |
| 控件背景 | `#f5f5f4` stone-100 | `#292524` stone-800 |

#### 文字色

| 用途 | 浅色模式 | 深色模式 |
|------|----------|----------|
| 主要文字 | `#1c1917` stone-900 | `#f5f5f4` stone-100 |
| 次要文字 | `#78716c` stone-500 | `#a8a29e` stone-400 |
| 辅助文字 | `#a8a29e` stone-400 | `#78716c` stone-500 |
| 禁用文字 | `#d6d3d1` stone-300 | `#57534e` stone-600 |

#### 边框色

| 用途 | 浅色模式 | 深色模式 |
|------|----------|----------|
| 卡片/分割线 | `#e7e5e4` stone-200 | `#44403c` stone-700 |
| 设置卡片边框 | `#f5f5f4` stone-100 | `#292524` stone-800 |
| 空牌槽虚线 | `#d6d3d1` stone-300 | `#57534e` stone-600 |

#### 语义色

| 用途 | 色值 | Token |
|------|------|-------|
| 正 EV (+EV) | `#16a34a` | green-600 |
| 负 EV (-EV) | `#ef4444` | red-500 |
| 滑动-范围按钮 | `#3b82f6` | blue-500 |
| 滑动-折叠按钮 | `#f59e0b` | amber-500 |
| 滑动-删除按钮 | `#ef4444` | red-500 |
| 新游戏菜单项 | `#ef4444` | red-500 |

#### 花色色

| 花色 | 牌槽颜色 | 选牌器颜色 |
|------|----------|------------|
| ♠ 黑桃 | stone-800 / stone-200 | stone-800 / stone-200 |
| ♥ 红心 | red-500 `#ef4444` | red-500 `#ef4444` |
| ♦ 方块 | red-500 `#ef4444` (牌槽简化) | blue-500 `#3b82f6` |
| ♣ 梅花 | stone-800 / stone-200 (牌槽简化) | green-600 / green-500 |

> **注意**：牌槽 (`SLOT_SUIT_COLOR`) 使用简化的 2 色方案（红/黑），选牌器 (`SUIT_DISPLAY`) 使用 4 色方案以提高辨识度。移动端建议统一使用 4 色方案。

#### 范围网格色

| 类型 | 未选中(浅) | 未选中(深) | 选中 |
|------|-----------|-----------|------|
| 口袋对 | amber-50 `#fffbeb` | amber-500/10% | orange-400 + 白字 |
| 同花 | sky-50 `#f0f9ff` | sky-500/10% | orange-500 + 白字 |
| 不同花 | white | stone-800 | orange-300 + stone-800 字 |

#### 遮罩色

| 用途 | 色值 |
|------|------|
| 菜单遮罩 | `rgba(0,0,0,0.2)` 黑 20% |
| 范围选择器遮罩 | `rgba(0,0,0,0.4)` 黑 40% |
| 牌选择器遮罩 | `rgba(0,0,0,0.2)` 黑 20% |

### 5.2 字号规格

| 用途 | 大小 | 字重 |
|------|------|------|
| App 标题 | 20sp | bold |
| 区块标题 | 14sp | semibold |
| 设置页标题 | 20sp | bold |
| 正文/菜单项 | 14sp | regular |
| 胜率数字 | 18sp | bold |
| 数值(全尺寸) | 30sp | bold |
| 数值(紧凑) | 20sp | bold |
| 牌点数(Hero/Board) | 20sp | bold |
| 牌花色(Hero/Board) | 16sp | regular |
| 牌点数(Villain) | 16sp | bold |
| 牌花色(Villain) | 12sp | regular |
| Badge | 12sp | medium |
| 辅助文字 | 12sp | regular |
| 分组标题(Help) | 12sp | semibold, 全大写, letter-spacing wider |
| 范围网格单元 | 10sp | medium |
| 列头(CardPicker) | 10sp | semibold |
| 代码片段(Help) | 11sp | regular |

### 5.3 间距规格

| 用途 | 值(dp) |
|------|--------|
| 页面水平内边距 | 16 |
| 页面顶部内边距 | 12 |
| 页面底部内边距 | 16 |
| 区块间距 | 16 |
| 卡片内水平内边距 | 20 |
| 卡片内上边距 | 12 |
| 卡片内下边距 | 20 |
| 标题行下方间距 | 12 |
| VillainRow 间距 | 12 |
| VillainRow 标题与内容间距 | 6 |
| 牌槽间距 | 6 |
| Flop 与 Turn/River 间距 | 16 |
| MiniCardPicker 按钮间距 | 4 |
| MiniCardPicker 行间距 | 4 |
| 范围网格间距 | 0.5 (极紧密) |
| CardPicker 网格间距 | 4 |
| Footer 上方 padding | 16 |
| Footer 下方 padding | 32 |

### 5.4 圆角规格

| 用途 | 值(dp) |
|------|--------|
| 区块卡片 | 16 |
| 牌槽 | 8 |
| MiniCardPicker 容器 | 12 |
| MiniCardPicker 按钮 | 8 |
| 菜单弹窗 | 12 |
| Badge | 8 |
| 添加按钮 | 8 |
| 主题按钮 | 8 |
| 操作按钮(Save/Cancel) | 12 |
| 范围网格单元 | 4 |
| CardPicker 单元格 | 8 |
| NumberEditor 容器 | 12 |
| 代码片段 | 4 |
| 范围弹窗 | 16 |

### 5.5 阴影规格

| 等级 | 用途 | 建议实现 |
|------|------|----------|
| sm | 区块卡片, VillainRow | elevation 2dp |
| lg | MiniCardPicker, NumberEditor, 菜单弹窗 | elevation 8dp |
| xl | 范围选择器弹窗 | elevation 16dp |

### 5.6 字体

| 平台 | 字体 |
|------|------|
| iOS | SF Pro Text (系统默认) |
| Android | Roboto (系统默认) |

两端统一使用系统默认无衬线字体，不引入自定义字体。

---

## 6. 技术架构

### 6.1 UniFFI 集成

当前 `bindings/uniffi/src/lib.rs` 仅含脚手架代码。需扩展以暴露核心 API：

```rust
// bindings/uniffi/src/lib.rs

#[derive(uniffi::Record)]
pub struct EquityResult {
    pub equities: Vec<f64>,
    pub mode: String,        // "Exact" | "MonteCarlo"
    pub samples: u64,
}

#[derive(Debug, uniffi::Error)]
pub enum SnapError {
    InvalidCard { message: String },
    InvalidHand { message: String },
    InvalidRange { message: String },
}

#[uniffi::export]
pub fn estimate_equity(
    board: &str,
    hero: &str,
    villains: Vec<String>,
    iterations: u64,
) -> Result<EquityResult, SnapError>;
```

### 6.2 线程模型

```
┌──────────────┐     ┌──────────────────┐
│   UI Thread  │────→│ Background Thread│
│              │     │                  │
│  状态管理     │     │  estimate_equity │
│  视图渲染     │     │  (Rust via FFI)  │
│  用户交互     │◀────│                  │
│              │     │  返回 Result     │
└──────────────┘     └──────────────────┘
```

- **计算线程**：所有 `estimate_equity` 调用必须在后台线程执行
- **防抖**：UI 层 300ms 防抖，避免频繁触发计算
- **取消**：新计算请求到来时，丢弃旧结果（sequence 序列号机制）
- **超时**：30 秒超时保护

### 6.3 状态管理

#### 应用状态 (AppState)

```
AppState {
    board: [Card?; 5]         // 0, 3, 4, 或 5 张
    hero: [Card?; 2]          // Hero 手牌
    villains: [VillainData]   // 1-9 个对手
    potSize: Int              // 底池大小
    callAmount: Int           // 下注额
}

VillainData {
    mode: "cards" | "range"
    slots: [Card?; 2]         // cards 模式
    range: String             // range 模式 (如 "AA,AKs,KQo")
    folded: Bool              // 是否折叠
}
```

#### 设置状态 (Settings)

```
Settings {
    iterations: Int = 100000    // 计算迭代次数上限
    bigBlind: Int = 20          // 大盲
    smallBlind: Int = 10        // 小盲
    theme: "system" | "dark" | "light"
}
```

#### 派生状态

| 字段 | 计算方式 |
|------|----------|
| `boardStr` | board 中非空牌拼接: "5c6c7c8h" |
| `heroStr` | hero 中非空牌拼接: "AhKd" |
| `villainStrs` | 每个非折叠对手: cards→拼接, range→原字符串 |
| `activeIndices` | 非折叠对手的下标列表 |
| `disabledCards` | board + hero + 所有 villain cards 的并集 |
| `equities` | rawEquities[0]=hero, 后续按 activeIndices 映射回全列表 |

### 6.4 持久化

| 数据 | 存储键 | 平台实现 |
|------|--------|----------|
| 应用状态 | `snapcall-state` | Android: DataStore / iOS: UserDefaults |
| 设置 | `snapcall-settings` | Android: DataStore / iOS: UserDefaults |

- 每次状态变更自动保存（同步写入）
- App 启动时从持久化恢复状态
- JSON 序列化格式，与 Web 端保持兼容

### 6.5 约束验证

以下规则在 Rust 核心层已实施，移动端也应在 UI 层提前校验：

| 约束 | 说明 |
|------|------|
| 公共牌数量 | 仅允许 0, 3, 4, 5 张（不允许 1-2 张） |
| 牌唯一性 | 同一张牌不能出现在多个位置 |
| Hero 类型 | 必须是具体手牌 (Exact/Partial)，不能是范围 |
| 对手数量 | 1-9 个 |

---

## 7. 平台特定说明

### 7.1 Android (Jetpack Compose)

#### 构建与集成

| 项目 | 说明 |
|------|------|
| 最低 SDK | API 26 (Android 8.0) |
| 目标 SDK | API 35 |
| 构建工具 | Gradle + Kotlin DSL |
| Rust 集成 | cargo-ndk + UniFFI 生成 Kotlin 绑定 |
| 架构模式 | MVVM (ViewModel + StateFlow + Compose) |

#### 核心组件映射

| Web 组件 | Android 实现 |
|----------|-------------|
| App.tsx | `MainScreen` Composable + `MainViewModel` |
| HeaderMenu | `DropdownMenu` (Material 3) |
| HeroSection | 自定义 Composable，用 `Card` (M3) 作容器 |
| BoardSection | 自定义 Composable |
| VillainsSection | `LazyColumn` + 自定义 Item |
| VillainRow | `SwipeToDismissBoxValue` 或自定义滑动手势 |
| MiniCardPicker | 自定义 Composable (Popup) |
| CardPicker | `LazyVerticalGrid` (4×13) |
| RangePicker | 自定义 `Canvas`/Grid Composable + `Dialog` |
| NumberEditor | 自定义 Composable + `detectDragGestures` |
| Badge | `Surface` + `Text` |
| SettingsPage | 独立 Composable Screen |
| HelpPage | 独立 Composable Screen |

#### 状态管理

```kotlin
class MainViewModel : ViewModel() {
    private val _state = MutableStateFlow(loadPersistedState())
    val state: StateFlow<AppState> = _state.asStateFlow()

    private val _settings = MutableStateFlow(loadSettings())
    val settings: StateFlow<Settings> = _settings.asStateFlow()

    // 防抖计算
    private val equityJob = MutableStateFlow<Job?>(null)

    fun dispatch(action: AppAction) {
        _state.update { reduce(it, action) }
        persistState(_state.value)
        scheduleEquityCalculation()
    }

    private fun scheduleEquityCalculation() {
        equityJob.value?.cancel()
        equityJob.value = viewModelScope.launch {
            delay(300) // 防抖
            withContext(Dispatchers.Default) {
                val result = SnapCallLib.estimateEquity(...)
                _equityResult.emit(result)
            }
        }
    }
}
```

#### 深色模式

```kotlin
// 跟随设置中的 theme 字段
val darkTheme = when (settings.theme) {
    "dark" -> true
    "light" -> false
    else -> isSystemInDarkTheme()
}
```

#### 手势实现

- **滑动操作**: `Modifier.pointerInput` + `detectHorizontalDragGestures`
- **拖拽编辑**: `Modifier.pointerInput` + `detectDragGestures`
- **长按重复**: `Modifier.pointerInput` + `awaitFirstDown` → `delay(400)` + `while { delay(80) }`
- **范围拖选**: `Modifier.pointerInput` + `detectDragGestures` + `hitTest`

#### 导航

- 单 Activity + Compose 导航
- 建议使用条件渲染（与 Web 端一致）而非 Navigation Component
- Settings/Help 作为全屏覆盖页面

### 7.2 iOS (SwiftUI)

#### 构建与集成

| 项目 | 说明 |
|------|------|
| 最低版本 | iOS 16.0 |
| 构建工具 | Xcode + Swift Package Manager |
| Rust 集成 | cargo-swift / uniffi-bindgen-swift 生成 XCFramework |
| 架构模式 | MVVM (ObservableObject + @Published + SwiftUI) |

#### 核心组件映射

| Web 组件 | iOS 实现 |
|----------|----------|
| App.tsx | `ContentView` + `AppViewModel` |
| HeaderMenu | `Menu` (SwiftUI 原生) |
| HeroSection | 自定义 View，用 `RoundedRectangle` 背景 |
| BoardSection | 自定义 View |
| VillainsSection | `ScrollView` + `VStack` |
| VillainRow | 自定义滑动手势 (SwiftUI `.gesture(DragGesture())`) |
| MiniCardPicker | 自定义 View + `.overlay` / `.popover` |
| CardPicker | `LazyVGrid` (GridItem, 13列) |
| RangePicker | 自定义 View + `.sheet` / `.fullScreenCover` |
| NumberEditor | 自定义 View + `DragGesture` |
| Badge | 自定义 View |
| SettingsPage | `NavigationStack` 子页面或全屏覆盖 |
| HelpPage | 同上 |

#### 状态管理

```swift
@MainActor
class AppViewModel: ObservableObject {
    @Published var state: AppState
    @Published var settings: Settings
    @Published var equityResult: EquityResult?
    @Published var isCalculating = false

    private var calculationTask: Task<Void, Never>?

    func dispatch(_ action: AppAction) {
        state = reduce(state, action)
        persistState()
        scheduleEquityCalculation()
    }

    private func scheduleEquityCalculation() {
        calculationTask?.cancel()
        calculationTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000) // 300ms
            guard !Task.isCancelled else { return }
            isCalculating = true
            let result = await Task.detached {
                try SnapCallLib.estimateEquity(...)
            }.value
            isCalculating = false
            equityResult = result
        }
    }
}
```

#### 深色模式

```swift
// 在根 View 设置
.preferredColorScheme(
    settings.theme == "dark" ? .dark :
    settings.theme == "light" ? .light : nil  // nil = 跟随系统
)
```

#### 手势实现

- **滑动操作**: `DragGesture` + `offset` + `animation(.easeOut(duration: 0.25))`
- **拖拽编辑**: `DragGesture` + `onChanged` 增量计算
- **长按重复**: `LongPressGesture` → `Timer.publish(every: 0.08)`，初始延迟 0.4s
- **范围拖选**: `DragGesture` + `GeometryReader` 坐标转换

#### 导航

- 使用 `@State` 控制全屏覆盖（与 Web 端一致）
- Settings/Help: `.fullScreenCover` 或条件渲染

---

## 8. 非目标

以下功能明确不在本版本范围内：

| 非目标 | 说明 |
|--------|------|
| 多人联网对战 | 仅限本地单机计算 |
| 手牌历史记录 | 不保存历史牌局列表 |
| 平板横屏优化布局 | 保持竖屏手机优先，平板仅居中显示 |
| 动态表情/贴纸 | 纯工具型应用 |
| 推送通知 | 无需通知功能 |
| 应用内购 / 广告 | 免费开源应用 |
| 服务器端计算 | 所有计算在本地完成 |
| 国际化 (i18n) | 界面暂为英文（与 Web 端一致） |
| CI/CD 流水线 | 不在 PRD 范围内 |
| Widget / 快捷指令 | 不在首版范围内 |

---

## 附录 A：显示文本常量

| Key | 文本 |
|-----|------|
| app_title | "SnapCall" |
| hero_title | "Hero" |
| board_title | "Board" |
| villains_title | "Villains" |
| fold_label | "FOLD" |
| ev_positive | "+EV Call" |
| ev_negative | "-EV Fold" |
| pot_odds_label | "Pot Odds" |
| max_bet_label | "Max Bet" |
| drag_hint | "drag to adjust" |
| settings_title | "Settings" |
| help_title | "Help" |
| random_demo | "Random Demo" |
| new_game | "New Game" |
| appearance | "Appearance" |
| theme_light | "Light" |
| theme_dark | "Dark" |
| theme_auto | "Auto" |
| iterations_label | "Iterations" |
| big_blind_label | "Big Blind" |
| small_blind_label | "Small Blind" |
| btn_cancel | "Cancel" |
| btn_save | "Save" |
| btn_done | "Done" |
| btn_clear | "Clear" |
| reset_defaults | "Reset to defaults" |
| combos_count | "{n} combos" |
| samples_format | "{mode} · {n} samples" |
| badge_bet | "Bet" |
| badge_pot | "Pot" |
| add_villain | "Add" |
| villain_label | "Villain {n}" |

## 附录 B：范围压缩记法

移动端需实现与 Web 端一致的范围压缩算法，用于在 VillainRow 中显示紧凑的范围描述：

| 输入 | 压缩输出 |
|------|----------|
| AA, KK, QQ | QQ+ |
| 88, 77, 66 | 88-66 |
| AKs, AQs, AJs | AJs+ |
| AKs, AQs, ATs | AQs+, ATs |
| AKs, AKo | AKs, AKo |

算法逻辑详见 `apps/web/src/lib/poker.ts` 中的 `compressRange()` 函数，建议在 Rust core 层统一实现后通过 UniFFI 暴露。
