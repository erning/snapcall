# SnapCall Roadmap

## 已完成 ✅

### Phase 1: Rust Core (使用 rs-poker)
- [x] Workspace 架构 (`Cargo.toml` workspace)
- [x] 依赖 rs-poker 4.1 (高性能扑克库)
- [x] Core API 封装
  - [x] `parse_card()` - 解析单张牌
  - [x] `parse_cards()` - 解析多张牌
  - [x] `evaluate_hand()` - 评估手牌 (5-7张)
  - [x] `calculate_equity()` - Monte Carlo 胜率计算
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
### Phase 2: 架构决策
- [x] 放弃自定义 evaluator，改用 rs-poker (位运算，<25ns)
- [x] 放弃自定义 lookup table (复杂，启动慢)
- [x] 使用 workspace 管理多 crate

---

## 待完成 ⏳

### Phase 3: UniFFI 绑定生成
- [ ] 配置 `build.rs` 生成绑定
- [ ] 生成 Swift 绑定 (`SnapCall.swift`)
- [ ] 生成 Kotlin 绑定 (`SnapCall.kt`)
- [ ] 测试 FFI 调用

### Phase 4: iOS App
- [ ] Xcode 项目设置
- [ ] 集成 Rust 静态库
- [ ] Two-Tap Poker Keyboard UI
  - [ ] Rank 行 (A, K, Q...)
  - [ ] Suit 行 (♠️ ♥️ ♣️ ♦️)
  - [ ] Ghosting (禁用已用牌)
  - [ ] Auto-advance (自动跳转)
- [ ] 13x13 Range Matrix
  - [ ] Grid layout
  - [ ] Drag-to-paint 手势
- [ ] Equity 结果显示

### Phase 5: Android App
- [ ] Android Studio 项目设置
- [ ] 集成 Rust 动态库
- [ ] Compose UI (同 iOS 功能)

### Phase 6: 优化与发布
- [ ] Range 解析完整实现 ("22+", "JTs-87s")
- [ ] 精确枚举 (Turn/River 时)
- [ ] 性能基准测试
- [ ] 发布准备

---

## 技术债务
- [ ] Range 解析目前只支持简单格式 ("AKs", "AKo")
- [ ] CLI 需要更好的错误提示
- [ ] 需要更多单元测试
