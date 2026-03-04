# SnapCall 改进计划

基于对 Rust Core 和 Web 前端的全面代码审查，按优先级分层整理的改进项。

---

## P0 — 缺陷修复

### 1. `HeaderMenu.tsx` useEffect 缺少依赖数组

**文件:** `apps/web/src/components/HeaderMenu.tsx:12-19`

`useEffect` 未传入依赖数组，导致每次渲染都重新绑定/解绑 `keydown` 事件监听器。

```tsx
// 当前（每次渲染都执行）
useEffect(() => {
  if (!open) return;
  // ...bindlistener
});

// 修复（仅在 open 变化时执行）
useEffect(() => {
  if (!open) return;
  // ...bind listener
}, [open]);
```

### 2. `VillainRow.tsx` 已知 Bug 标注清理

**文件:** `apps/web/src/components/VillainRow.tsx`

代码中保留了大量 `Bug 1` 至 `Bug 6` 的注释标注（第 62、75、101、134、164、182、215、242、252、305、324、383、667 行），表明这些是已修复的 bug 记录。应清理这些注释，仅保留必要的功能说明。

---

## P1 — 质量提升

### 3. Monte Carlo 热路径内存分配优化

**文件:** `core/src/monte_carlo.rs`

当前每次迭代存在多处不必要的堆分配，对高迭代次数场景（10万+）有显著性能影响。

| 行号 | 问题 | 建议 |
|------|------|------|
| 23 | `board_set.clone()` — 每次迭代 clone `HashSet<Card>` | 将 `used` 集合提升到循环外，每次迭代 `clear()` 后重新填入固定牌 |
| 64-68 | 每次迭代 `filter().collect()` 构建可用牌 Vec | 预分配 `available` Vec，每次迭代通过重置长度 + 条件填充复用 |
| 104 | `board_cards.to_vec()` 每次迭代拷贝公共牌 | 预分配 `full_board` Vec，每次迭代 `truncate` 到原始长度后 push |
| 117 | `Vec::with_capacity(7)` 每次迭代分配手牌缓冲区 | 将 7 张牌缓冲区提升到循环外复用，或使用 `[Card; 7]` 栈数组 |

**预估影响:** 对 10 万次迭代场景，减少约 40 万次堆分配。

### 4. Monte Carlo 热路径 unwrap/expect

**文件:** `core/src/monte_carlo.rs`

| 行号 | 调用 | 风险 |
|------|------|------|
| 45 | `hands.choose(&mut rng).expect(...)` | Range 为空时 panic |
| 47-48 | `iter.next().unwrap()` (Range 分支) | FlatHand 不足 2 张时 panic |
| 78 | `iter.next().unwrap()` (Exact 分支) | FlatHand 不足 2 张时 panic |

虽然上游 `estimate.rs` 做了输入验证使得这些路径在正常使用下不会触发 panic，但作为库代码，建议：
- 在 Range 分支使用 `if let Some(hand) = hands.choose(...)` 保护
- 对 `iter.next()` 使用 `let [c1, c2] = ...` 模式匹配或安全解构

### 5. 前端测试基础设施

**现状:** 零前端测试覆盖 — 无 Vitest 配置，无任何 `.test.tsx` 文件。

**建议:**
1. 安装 Vitest + `@testing-library/react` + `jsdom`
2. 配置 `vitest.config.ts` （复用 Vite 配置）
3. 优先编写以下测试：
   - `lib/poker.ts` 的纯函数单元测试（`rangeStringToSet`、`compressRange` 等）
   - `lib/wasm.ts` 的 Worker 通信 mock 测试
   - 关键组件（`HeroSection`、`VillainRow`）的渲染快照测试

**与 ROADMAP 关系:** ROADMAP "技术债务" 中已列出"需要更多单元测试"，此项是其前端部分的具体落地。

---

## P2 — 最佳实践

### 6. 可访问性 (a11y) 改进

**现状:** 全站零 `aria-*` 属性，零 `role` 属性。

**优先改进项:**

| 问题 | 位置 | 修复 |
|------|------|------|
| 卡片插槽按钮无语义标签 | `VillainRow.tsx` CardSlot | 添加 `aria-label={card \|\| "empty card slot"}` |
| 菜单按钮无标签 | `HeaderMenu.tsx:27` | 添加 `aria-label="Menu"` |
| Range Modal 缺少对话框角色 | `VillainRow.tsx` RangeModal | 添加 `role="dialog"` + `aria-modal="true"` |
| 计算结果无实时播报 | equity 显示区域 | 添加 `aria-live="polite"` 区域包裹计算结果 |
| 滑动手势无键盘替代 | `VillainRow.tsx` swipe | 添加键盘事件（Delete 键删除、Tab 切换模式） |

### 7. Criterion Benchmarks

**现状:** `Cargo.toml` 已列 `criterion` 为 dev-dependency，但 `core/benches/` 目录不存在。

**建议创建 `core/benches/equity.rs`:**
- preflop exact 2-player (全枚举基准)
- preflop Monte Carlo 10k/100k iterations
- river evaluation (单次 `FlatHand::rank()`)
- range parsing (`parse_range` 各格式)

**与 ROADMAP 关系:** ROADMAP Phase 7 已列出"性能基准测试"为待完成项。

### 8. 属性测试 (Property-Based Testing)

**建议在 `core/` 添加 `proptest` 或 `quickcheck`:**

不变量示例：
- `sum(equities) ≈ 100.0`（允许浮点误差 ±0.01）
- 每个玩家 `0.0 <= equity <= 100.0`
- `equities.len() == num_players`
- 精确枚举与 Monte Carlo（高迭代）结果应在 ±2% 内收敛

### 9. `enumeration.rs:247` unreachable!() 宏

**文件:** `core/src/enumeration.rs:247`

```rust
let hands = match &players[player_idx] {
    HoleCardsInput::Range(h) => h,
    _ => unreachable!(),
};
```

`enumerate_ranges` 仅对 `range_indices` 中的玩家调用，而 `range_indices` 仅收集 `Range` 类型玩家，所以 `unreachable!()` 在逻辑上确实不可达。但可以通过重构消除：将 `range_indices` 改为 `Vec<(usize, &Vec<FlatHand>)>`，直接携带手牌引用，从类型层面排除非 Range 情况。

---

## P3 — 未来增强

### 10. UniFFI 绑定完善

**文件:** `bindings/uniffi/src/lib.rs` — 仅一行 `uniffi::setup_scaffolding!()`。

**与 ROADMAP 关系:** ROADMAP Phase 4 已详细规划了 UniFFI 绑定生成，此项与之完全对齐，无需额外规划。

### 11. WASM Worker 超时机制

**文件:** `apps/web/src/lib/wasm.ts`

当前 Worker 无超时保护：如果 WASM 计算挂起，Promise 将永远 pending。

**建议:**
```typescript
// 在 estimateEquity 中添加超时
const timeout = setTimeout(() => {
  pending.delete(id);
  reject(new Error("Calculation timed out"));
}, 30_000);
```

同时 Worker 创建后从不终止（`wasm.ts:9` 模块级单例），对长生命周期 PWA 应用可接受，但可考虑空闲超时后 `worker.terminate()` + 按需重建。

### 12. WASM Getter 不必要的 clone

**文件:** `bindings/wasm/src/lib.rs:14-15, 19-20`

```rust
pub fn equities(&self) -> Vec<f64> { self.equities.clone() }
pub fn mode(&self) -> String { self.mode.clone() }
```

`wasm_bindgen` getter 目前需要返回 owned 值，`clone()` 是必需的。但可以考虑：
- 将 `EstimateResult` 改为直接序列化为 `JsValue`（`serde-wasm-bindgen`），一次性传输，避免多次 getter 调用
- 或使用 `#[wasm_bindgen(getter, js_name = "equities")]` 搭配 `js_sys::Float64Array` 零拷贝返回

### 13. CLI pot-odds 负值验证

**文件:** `cli/src/main.rs:137`

`run_pot_odds_command` 不验证 `pot_size` 和 `call_amount` 是否为负值或零值，负数输入会产生无意义结果。

**与 ROADMAP 关系:** ROADMAP "技术债务" 中已列出"CLI 需要更好的错误提示"。

### 14. React Error Boundary

**现状:** 无 Error Boundary。WASM 初始化失败或运行时错误会导致白屏。

**建议:** 在 App 根组件添加 Error Boundary，捕获 WASM 加载/计算异常，展示友好的错误提示和重试按钮。

---

## 与 ROADMAP 技术债务对照

| ROADMAP 技术债务 | 本文对应项 | 状态 |
|-----------------|-----------|------|
| CLI 需要更好的错误提示 | #13 CLI pot-odds 负值验证 | 互补（本文更具体） |
| 需要更多单元测试 | #5 前端测试, #7 Benchmarks, #8 属性测试 | 互补（本文分前后端细化） |
| WASM 错误处理 | #11 Worker 超时, #14 Error Boundary | 互补（本文更具体） |
| 性能基准测试 | #7 Criterion Benchmarks | 完全对齐 |
