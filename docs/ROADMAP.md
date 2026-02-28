# SnapCall Roadmap

## 已完成 ✅

### Phase 1: Rust Core (使用 rs-poker)
- [x] Workspace 架构 (`Cargo.toml` workspace)
- [x] 依赖 rs-poker 4.1 (高性能扑克库)
- [x] Core API 封装
  - [x] `parse_card()` - 解析单张牌
  - [x] `parse_cards()` - 解析多张牌
  - [x] `evaluate_hand()` - 评估手牌 (5-7张)
  - [x] `calculate_equity()` - 字符串输入统一 API（空串/单张/两张/range），阈值驱动胜率计算（组合数 <= iterations 时精确枚举，否则 Monte Carlo）
  - [x] `parse_range()` - 范围解析 (简化版)
- [x] FFI 层 (UniFFI)
  - [x] `ffi_parse_card()`
  - [x] `ffi_parse_cards()`
  - [x] `ffi_evaluate_hand()`
  - [x] `ffi_calculate_equity()`
- [x] CLI 工具 (`snapcall`)
  - [x] `eval` 子命令 - 评估手牌 (支持无空格格式: "AsKsQsJsTs")
  - [x] `equity` 子命令 - 计算胜率
    - [x] `-p` 多次使用 (每个玩家独立参数)
    - [x] `-b` board 参数 (支持公共牌)
    - [x] `-i` iterations 参数
    - [x] 美观的 Unicode 花色输出 (♠ ♥ ♦ ♣)
    - [x] 范围输入支持 (`AKs`, `TT+`, `AKs-AQs`)
  - [x] `pot-odds` 子命令 - 底池赔率计算
    - [x] `--pot-size` 当前底池参数（跟注前）
    - [x] `--call-amount` 自定义跟注金额参数

### Phase 2: 架构决策
- [x] 放弃自定义 evaluator，改用 rs-poker (位运算，<25ns)
- [x] 放弃自定义 lookup table (复杂，启动慢)
- [x] 使用 workspace 管理多 crate

---

## 待完成 ⏳

### Phase 3: Web App (WASM) 🔄 RESET (Rebuild in progress)
旧版 Web 已移除，当前按新架构重建：`bindings/wasm` + `apps/web`

- [x] 新架构拆分：`core` / `bindings/uniffi` / `bindings/wasm` / `apps/web`
- [x] 新 Web MVP：Hello World + 静态 equity 调用
- [ ] 新 Web UI 重写（不继承旧技术债）

**WASM Build:** `cd apps/web && pnpm run wasm` 或 `cargo build -p snapcall-wasm --target wasm32-unknown-unknown`
**Dev Server:** `cd apps/web && pnpm install && pnpm run dev -- --host`
**Prod Build:** `cd apps/web && pnpm run build`

### Phase 4: UniFFI 绑定生成
- [ ] 配置 `build.rs` 生成绑定
- [ ] 生成 Swift 绑定 (`SnapCall.swift`)
- [ ] 生成 Kotlin 绑定 (`SnapCall.kt`)
- [ ] 测试 FFI 调用

### Phase 5: iOS App
- [ ] Xcode 项目设置
- [ ] 集成 Rust 静态库
- [ ] Two-Tap Poker Keyboard UI
  - [ ] Rank 行 (A, K, Q...)
  - [ ] Suit 行 (♠ ♥ ♣ ♦)
  - [ ] Ghosting (禁用已用牌)
  - [ ] Auto-advance (自动跳转)
- [ ] 13x13 Range Matrix
  - [ ] Grid layout
  - [ ] Drag-to-paint 手势
- [ ] Equity 结果显示

### Phase 6: Android App
- [ ] Android Studio 项目设置
- [ ] 集成 Rust 动态库
- [ ] Compose UI (同 iOS 功能)

### Phase 7: 优化与发布
- [x] Range 解析完整实现 (`TT+`, `AKs-AQs`, `KK+,A2s+`)
- [x] 精确枚举 + Monte Carlo 自适应切换（含 Range 场景）
- [ ] 性能基准测试
- [ ] 发布准备

---

## 技术债务
- [x] Range 解析 (已实现完整支持)
- [ ] CLI 需要更好的错误提示
- [ ] 需要更多单元测试
- [ ] WASM 错误处理

---

## 架构演进

```
Phase 1: CLI (已完成)
   │
   ▼
Phase 3: Web + WASM (已完成)
   │    • 快速验证 UI/UX
   │    • 跨平台访问
   │    • 无需应用商店
   │
   ▼
Phase 5-6: iOS / Android
        • 原生体验
        • 离线使用
        • 应用商店分发
```

**Web 优先策略理由：**
1. 快速迭代 - 无需应用商店审核
2. 验证设计 - Two-Tap Keyboard 和 Range Matrix 的交互可在 Web 先测试
3. 用户反馈 - 更容易收集早期用户反馈
4. 技术验证 - 确保 rs-poker WASM 兼容性
5. 共享代码 - Web 和移动端 100% 共享 core 逻辑
