# Equity 计算算法

## 概述

SnapCall 使用 Monte Carlo 模拟来计算德州扑克中各玩家的胜率（equity）。核心函数为 `calculate_equity`，位于 `core/src/equity.rs`。

## 输入

| 参数 | 类型 | 说明 |
|------|------|------|
| `player_hands` | `&[String]` | 每个玩家的手牌描述，至少 2 人 |
| `board` | `&str` | 公共牌，合法长度为 0、3、4、5 张 |
| `iterations` | `u32` | Monte Carlo 迭代次数，0 表示默认 10,000 |

## 输出

```rust
EquityResult {
    equities: Vec<f64>,   // 各玩家胜率百分比，总和为 100.0
    mode: EquitySolveMode, // 当前始终为 MonteCarlo
    samples: usize,        // 实际有效采样数
}
```

## 玩家输入格式（PlayerSpec）

每个玩家的输入字符串被解析为以下四种类型之一：

| 类型 | 输入示例 | 说明 |
|------|----------|------|
| `TwoKnown` | `"AhAd"`, `"Ah Ad"` | 两张确定的手牌 |
| `OneKnown` | `"Ah"` | 一张已知，另一张随机发 |
| `Unknown` | `""` | 两张都随机发 |
| `Range` | `"AKs"`, `"TT+"`, `"A5s-A2s"` | 范围表达式，展开为多个具体两张牌组合 |

解析优先级：先尝试 `parse_cards` 解析具体牌，失败后尝试 `RangeParser::parse_many` 解析范围表达式。

## 算法流程

### 第一阶段：输入验证

```
1. 检查玩家数 >= 2
2. 解析 board → Vec<Card>，验证张数为 0/3/4/5，无重复
3. 逐个解析玩家输入 → Vec<PlayerSpec>
4. 对 TwoKnown 和 OneKnown 的已知牌做全局去重检查
5. 检查 board张数 + 2×玩家数 <= 52
```

### 第二阶段：Monte Carlo 模拟主循环

每次迭代执行以下步骤：

#### 步骤 1：构建已用牌集合

```
used = board_cards
     ∪ { c1, c2 | TwoKnown([c1, c2]) }
     ∪ { c | OneKnown(c) }
```

#### 步骤 2：两遍发牌

**第一遍 — Range 玩家（rejection sampling）：**

```
for each player:
    if Range(options):
        重复最多 100 次:
            从 options 中随机选一个 [c1, c2]
            if c1 ∉ used AND c2 ∉ used:
                used += {c1, c2}
                记录该玩家手牌
                break
        如果 100 次都冲突 → 本次迭代作废
    else:
        放入占位符（第二遍覆盖）
```

Range 玩家优先处理的原因：Range 的可选组合有限，需要通过 rejection sampling 确保选中的组合不与已知牌冲突。如果放到第二遍和随机发牌混在一起，会导致 Range 选中的牌可能已经被随机发给了其他玩家。

**构建可用牌堆并洗牌：**

```
available = 52张全牌 - used
shuffle(available)
cursor = 0
```

**第二遍 — 非 Range 玩家顺序发牌：**

```
for each player (按原始顺序):
    TwoKnown([c1, c2]):  直接写入
    OneKnown(known):      手牌 = [known, available[cursor++]]
    Unknown:              手牌 = [available[cursor], available[cursor+1]], cursor += 2
    Range:                跳过（第一遍已处理）
```

#### 步骤 3：补全公共牌

```
full_board = parsed_board + available[cursor .. cursor + missing]
```

从 `available` 中继续按 cursor 取牌，补到 5 张。

#### 步骤 4：评估与计分

```
for each player:
    7cards = hole_cards[2] + full_board[5]
    rank = FlatHand(7cards).rank()    // rs_poker 的 best-5 评估

best = max(ranks)
for each player where rank == best:
    wins[player] += 1
```

平局（tie）时所有并列玩家都 +1。最终归一化时自然得到正确的分摊比例。

### 第三阶段：归一化输出

```
total = sum(wins)
equities[i] = wins[i] / total × 100.0
```

`samples` 记录实际有效的迭代次数（排除因 rejection sampling 失败而作废的迭代）。

## 平局处理

当多个玩家并列最佳手牌时，每个并列玩家的 `wins` 各 +1。设一次平局有 k 个赢家：

- 每人得到的原始计数：1
- 本次迭代对 total 的贡献：k
- 每人分得的 equity 比例：1/k

这等价于将该局的 100% equity 平均分配给 k 个赢家。

## 性能特征

- 时间复杂度：O(iterations × players)，每次迭代中洗牌为 O(deck_size)
- 每次迭代重建 `used` 集合和 `available` 向量
- Range 的 rejection sampling 最多尝试 100 次/玩家/迭代
- 如果某次迭代发牌失败（牌不够或 rejection 失败），该迭代被跳过，不计入 samples
