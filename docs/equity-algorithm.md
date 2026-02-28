# Equity 计算算法

## 概述

SnapCall 使用两种模式计算德州扑克中各玩家的胜率（equity）：

1. **精确枚举（Exact Enumeration）**— 当可枚举的组合总数 ≤ 请求的迭代次数时自动启用，产出 100% 准确的结果。
2. **Monte Carlo 模拟** — 组合数过大时退化为随机采样。

核心入口函数为 `estimate_equity`，位于 `core/src/estimate.rs`。

## 输入

| 参数 | 类型 | 说明 |
|------|------|------|
| `board` | `&str` | 公共牌，合法长度为 0、3、4、5 张 |
| `hero` | `&str` | Hero 手牌（1-2 张已知牌） |
| `villains` | `&[&str]` | 每个对手的手牌描述 |
| `iterations` | `usize` | 最大采样次数，0 表示默认 10,000 |

## 输出

```rust
EquityResult {
    equities: Vec<f64>,       // 各玩家胜率百分比，总和为 100.0
    mode: EquityEstimateMode, // ExactEnumeration 或 MonteCarlo
    samples: usize,           // 实际有效采样/枚举数
}
```

## 玩家输入格式（HoleCardsInput）

每个玩家的输入字符串被解析为以下四种类型之一：

| 类型 | 输入示例 | 说明 |
|------|----------|------|
| `Exact` | `"AhAd"`, `"Ah Ad"` | 两张确定的手牌 |
| `Partial` | `"Ah"` | 一张已知，另一张随机发 |
| `Unknown` | `""` | 两张都随机发 |
| `Range` | `"AKs"`, `"TT+"`, `"A5s-A2s"` | 范围表达式，展开为多个具体两张牌组合 |

解析优先级：先尝试 `FlatHand::new_from_str` 解析具体牌，失败后尝试 `RangeParser::parse_many` 解析范围表达式。

## 算法流程

### 第一阶段：输入验证

```
1. 检查 villains 非空
2. 解析 board → Vec<Card>，验证张数为 0/3/4/5
3. 解析 hero → HoleCardsInput（必须为 Exact 或 Partial）
4. 逐个解析 villain → Vec<HoleCardsInput>
5. 对 Exact 和 Partial 的已知牌做全局去重检查
6. 对 Range 做 board 冲突过滤
7. 检查 board张数 + 2×玩家数 ≤ 52
```

### 第二阶段：模式选择

计算枚举数量估算：

```
non_range_slots = partial_count + 2 × unknown_count + missing_board
available ≈ 52 − |fixed_known| − 2 × range_count
enum_estimate = range_product × C(available, non_range_slots)

if enum_estimate > 0 AND enum_estimate ≤ iterations:
    → 精确枚举
else:
    → Monte Carlo
```

典型场景：
- **River + Exact hands**: 0 slots → C(n, 0) = 1 → 精确枚举
- **Turn + Exact hands**: 1 slot → C(44, 1) = 44 → 精确枚举
- **Flop + Exact hands**: 2 slots → C(45, 2) = 990 → 精确枚举
- **Preflop + Unknown villain**: 7 slots → C(48, 7) ≈ 3.1 亿 → Monte Carlo

### 第三阶段A：精确枚举（ExactEnumeration）

位于 `core/src/enumeration.rs`。

#### 算法

1. 构建可用牌池 = 全 52 张 − fixed_known（不含 Range 的牌）
2. 递归枚举 Range 玩家的笛卡尔积（跳过相互冲突的组合）
3. 对每个有效的 Range 组合：
   - 从剩余牌池中枚举 C(remaining, non_range_slots) 个组合
   - 每个组合按固定顺序分配：Partial 的第二张 → Unknown 的两张 → Board 补全
4. 评估 7 张牌最佳手牌，记录胜者（平局并列各 +1）
5. 返回 `EquityResult { mode: ExactEnumeration, samples: total_combos, ... }`

### 第三阶段B：Monte Carlo 模拟（MonteCarlo）

位于 `core/src/monte_carlo.rs`。每次迭代执行以下步骤：

#### 步骤 1：构建已用牌集合

```
used = board_cards
     ∪ { c1, c2 | Exact([c1, c2]) }
     ∪ { c | Partial(c) }
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
    Exact([c1, c2]):  直接写入
    Partial(known):   手牌 = [known, available[cursor++]]
    Unknown:          手牌 = [available[cursor], available[cursor+1]], cursor += 2
    Range:            跳过（第一遍已处理）
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

### 第四阶段：归一化输出

```
total = sum(wins)
equities[i] = wins[i] / total × 100.0
```

`samples` 记录实际枚举组合数（精确枚举）或有效迭代次数（Monte Carlo，排除因 rejection sampling 失败而作废的迭代）。

## 平局处理

当多个玩家并列最佳手牌时，每个并列玩家的 `wins` 各 +1。设一次平局有 k 个赢家：

- 每人得到的原始计数：1
- 本次迭代对 total 的贡献：k
- 每人分得的 equity 比例：1/k

这等价于将该局的 100% equity 平均分配给 k 个赢家。

## 性能特征

- **精确枚举**: 时间复杂度 O(enum_count × players)，结果 100% 准确
- **Monte Carlo**: 时间复杂度 O(iterations × players)，每次迭代中洗牌为 O(deck_size)
- 每次迭代重建 `used` 集合和 `available` 向量
- Range 的 rejection sampling 最多尝试 100 次/玩家/迭代
- 如果某次迭代发牌失败（牌不够或 rejection 失败），该迭代被跳过，不计入 samples

## 模块结构

```
core/src/
├── lib.rs            — mod 声明 + pub use 再导出
├── types.rs          — SnapError, EquityEstimateMode, EquityResult
├── input.rs          — HoleCardsInput, BoardCardsInput, FromStr, normalize_cards_str
├── estimate.rs       — estimate_equity（验证 + 模式派发）
├── monte_carlo.rs    — Monte Carlo 模拟实现
├── enumeration.rs    — 精确枚举实现 + 组合工具函数
```
