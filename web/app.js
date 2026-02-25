import init, {
  evaluate_hand,
  calculate_equity,
  parse_range,
  format_card,
} from './pkg/snapcall_web.js';

const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
const SUITS = [
  { sym: '♠', ch: 's' },
  { sym: '♥', ch: 'h' },
  { sym: '♦', ch: 'd' },
  { sym: '♣', ch: 'c' },
];

const state = {
  wasmReady: false,
  pendingRank: null,
  activeTarget: null, // { kind: 'player'|'board', playerIndex, slotIndex }
  players: [],
  board: [null, null, null, null, null],
  range: {
    open: false,
    activePlayerIndex: null,
    selectedByPlayer: new Map(), // i -> Set(handLabel)
  },
};

function $(id) {
  return document.getElementById(id);
}

function setStatus(msg, kind = 'info') {
  const el = $('status');
  el.textContent = msg || '';
  el.classList.toggle('error', kind === 'error');
}

function usedCardsSet(exceptTarget = null) {
  const used = new Set();

  for (let pi = 0; pi < state.players.length; pi++) {
    const p = state.players[pi];
    for (let si = 0; si < p.hole.length; si++) {
      if (exceptTarget && exceptTarget.kind === 'player' && exceptTarget.playerIndex === pi && exceptTarget.slotIndex === si) {
        continue;
      }
      const c = p.hole[si];
      if (c) used.add(c);
    }
  }

  for (let i = 0; i < state.board.length; i++) {
    if (exceptTarget && exceptTarget.kind === 'board' && exceptTarget.slotIndex === i) {
      continue;
    }
    const c = state.board[i];
    if (c) used.add(c);
  }

  return used;
}

function compactCards(cardsArr) {
  return cardsArr.filter(Boolean).join('');
}

function formatCardForUI(cardStr) {
  if (!cardStr) return '—';
  if (state.wasmReady) {
    try {
      return format_card(cardStr);
    } catch {
      // fall through
    }
  }
  // Fallback: "Ah" -> "A h"
  return cardStr;
}

function updateActiveTargetLabel() {
  const el = $('active-target');
  const t = state.activeTarget;

  if (!t) {
    el.textContent = 'No slot selected';
    return;
  }

  if (t.kind === 'player') {
    el.textContent = `Player ${t.playerIndex + 1} • Card ${t.slotIndex + 1}`;
  } else {
    el.textContent = `Board • Card ${t.slotIndex + 1}`;
  }
}

function clearActiveHighlights() {
  document.querySelectorAll('.slot.active').forEach((n) => n.classList.remove('active'));
}

function setActiveTarget(target, slotEl) {
  state.activeTarget = target;
  clearActiveHighlights();
  if (slotEl) slotEl.classList.add('active');
  updateActiveTargetLabel();
  // Reset pending rank so the UI is predictable.
  state.pendingRank = null;
  updateKeyboard();
}

function updateKeyboard() {
  const rankButtons = Array.from(document.querySelectorAll('[data-rank]'));
  for (const btn of rankButtons) {
    btn.classList.toggle('selected', btn.dataset.rank === state.pendingRank);
  }

  const suitButtons = Array.from(document.querySelectorAll('[data-suit]'));
  const used = usedCardsSet(state.activeTarget);

  for (const btn of suitButtons) {
    if (!state.pendingRank) {
      btn.disabled = true;
      btn.classList.remove('ghosted');
      continue;
    }

    const card = `${state.pendingRank}${btn.dataset.suit}`;
    const ghosted = used.has(card);
    btn.disabled = ghosted;
    btn.classList.toggle('ghosted', ghosted);
  }
}

function renderBoard() {
  const container = $('board-cards');
  container.innerHTML = '';

  for (let i = 0; i < 5; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.textContent = formatCardForUI(state.board[i]);
    if (state.board[i]) slot.classList.add('filled');

    slot.addEventListener('click', () => {
      if (state.board[i]) {
        // Clicking a filled slot clears it.
        state.board[i] = null;
        renderAll();
        setStatus('');
        return;
      }
      setActiveTarget({ kind: 'board', slotIndex: i }, slot);
      setStatus('');
    });

    container.appendChild(slot);
  }
}

function syncPlayerInputFromHole(playerIndex) {
  const p = state.players[playerIndex];
  if (!p) return;
  const v = compactCards(p.hole);
  if (v.length > 0) p.input.value = v;
}

function renderPlayers() {
  const container = $('players');
  container.innerHTML = '';

  state.players.forEach((p, idx) => {
    const root = document.createElement('div');
    root.className = 'player';

    const header = document.createElement('div');
    header.className = 'player-header';

    const title = document.createElement('div');
    title.className = 'player-title';
    title.textContent = `Player ${idx + 1}`;

    const actions = document.createElement('div');
    actions.className = 'player-actions';

    const rangeBtn = document.createElement('button');
    rangeBtn.type = 'button';
    rangeBtn.className = 'btn ghost';
    rangeBtn.textContent = 'Range';
    rangeBtn.addEventListener('click', () => openRangeMatrix(idx));

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn ghost';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => {
      p.hole = [null, null];
      p.input.value = '';
      const set = state.range.selectedByPlayer.get(idx);
      if (set) set.clear();
      renderAll();
      setStatus('');
    });

    actions.appendChild(rangeBtn);
    actions.appendChild(clearBtn);

    if (state.players.length > 2) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn ghost';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => {
        state.players.splice(idx, 1);
        // Rebuild range map indices (simple approach).
        const newMap = new Map();
        state.range.selectedByPlayer.forEach((set, key) => {
          if (key === idx) return;
          newMap.set(key > idx ? key - 1 : key, set);
        });
        state.range.selectedByPlayer = newMap;

        state.activeTarget = null;
        renderAll();
        setStatus('');
      });
      actions.appendChild(removeBtn);
    }

    header.appendChild(title);
    header.appendChild(actions);

    const slots = document.createElement('div');
    slots.className = 'card-slots';
    slots.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';

    for (let i = 0; i < 2; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.textContent = formatCardForUI(p.hole[i]);
      if (p.hole[i]) slot.classList.add('filled');

      slot.addEventListener('click', () => {
        if (p.hole[i]) {
          p.hole[i] = null;
          syncPlayerInputFromHole(idx);
          renderAll();
          setStatus('');
          return;
        }
        setActiveTarget({ kind: 'player', playerIndex: idx, slotIndex: i }, slot);
        setStatus('');
      });

      slots.appendChild(slot);
    }

    const input = document.createElement('input');
    input.className = 'input';
    input.placeholder = 'AhAd, AKs, TT+';
    input.value = p.input.value;
    input.addEventListener('input', () => {
      // When typing manually, we stop trying to keep slots in sync.
      // Slots remain a quick-entry view.
      p.input.value = input.value;
      setStatus('');
    });

    // Store actual input element reference
    p.input = input;

    root.appendChild(header);
    root.appendChild(slots);
    root.appendChild(input);

    container.appendChild(root);
  });
}

function ensureRangeGridBuilt() {
  const grid = $('range-grid');
  if (grid.childElementCount > 0) return;

  for (let r = 0; r < RANKS.length; r++) {
    for (let c = 0; c < RANKS.length; c++) {
      const cell = document.createElement('div');
      cell.className = 'range-cell';

      const rowRank = RANKS[r];
      const colRank = RANKS[c];

      let label;
      if (r === c) {
        label = `${rowRank}${colRank}`;
      } else if (r < c) {
        label = `${rowRank}${colRank}s`;
        cell.classList.add('suited');
      } else {
        label = `${colRank}${rowRank}o`;
        cell.classList.add('offsuit');
      }

      cell.textContent = label;
      cell.dataset.hand = label;

      cell.addEventListener('click', (ev) => {
        const pi = state.range.activePlayerIndex;
        if (pi == null) return;

        const set = state.range.selectedByPlayer.get(pi) || new Set();
        state.range.selectedByPlayer.set(pi, set);

        if (!ev.shiftKey) {
          set.clear();
          set.add(label);
        } else {
          if (set.has(label)) set.delete(label);
          else set.add(label);
        }

        syncRangeToInput(pi);
        refreshRangeGridSelection();
      });

      grid.appendChild(cell);
    }
  }
}

function refreshRangeGridSelection() {
  const pi = state.range.activePlayerIndex;
  const set = pi == null ? null : (state.range.selectedByPlayer.get(pi) || new Set());

  document.querySelectorAll('.range-cell').forEach((cell) => {
    const label = cell.dataset.hand;
    cell.classList.toggle('selected', !!set && set.has(label));
  });
}

function syncRangeToInput(playerIndex) {
  const set = state.range.selectedByPlayer.get(playerIndex);
  const p = state.players[playerIndex];
  if (!p) return;

  if (!set || set.size === 0) {
    p.input.value = '';
    return;
  }

  p.input.value = Array.from(set).join(',');
}

function openRangeMatrix(playerIndex) {
  state.range.open = true;
  state.range.activePlayerIndex = playerIndex;
  $('range-matrix-section').style.display = 'block';

  ensureRangeGridBuilt();
  refreshRangeGridSelection();

  setStatus(`Range matrix: editing Player ${playerIndex + 1}.`);
}

function closeRangeMatrix() {
  state.range.open = false;
  state.range.activePlayerIndex = null;
  $('range-matrix-section').style.display = 'none';
  setStatus('');
}

function addPlayer() {
  state.players.push({
    hole: [null, null],
    input: document.createElement('input'),
  });
}

function buildKeyboard() {
  const ranks = $('ranks');
  const suits = $('suits');
  ranks.innerHTML = '';
  suits.innerHTML = '';

  for (const r of RANKS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'key';
    btn.textContent = r;
    btn.dataset.rank = r;
    btn.addEventListener('click', () => {
      state.pendingRank = (state.pendingRank === r) ? null : r;
      updateKeyboard();
    });
    ranks.appendChild(btn);
  }

  for (const s of SUITS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'key';
    btn.textContent = s.sym;
    btn.dataset.suit = s.ch;
    btn.disabled = true;
    btn.addEventListener('click', () => {
      if (!state.pendingRank) return;
      commitCard(`${state.pendingRank}${s.ch}`);
    });
    suits.appendChild(btn);
  }
}

function commitCard(cardStr) {
  const t = state.activeTarget;
  if (!t) {
    setStatus('Select a slot (player card or board) first.', 'error');
    return;
  }

  const used = usedCardsSet(t);
  if (used.has(cardStr)) {
    setStatus(`${cardStr} is already used.`, 'error');
    return;
  }

  if (t.kind === 'board') {
    state.board[t.slotIndex] = cardStr;
  } else {
    const p = state.players[t.playerIndex];
    p.hole[t.slotIndex] = cardStr;
    syncPlayerInputFromHole(t.playerIndex);
  }

  // Auto-advance to next slot.
  if (t.kind === 'player') {
    const nextIndex = t.slotIndex === 0 ? 1 : null;
    if (nextIndex != null) {
      // We don't have direct DOM refs for the next slot; re-render and clear active.
      state.activeTarget = { kind: 'player', playerIndex: t.playerIndex, slotIndex: nextIndex };
    } else {
      state.activeTarget = null;
    }
  } else {
    // Advance to next empty board slot.
    let next = null;
    for (let i = 0; i < state.board.length; i++) {
      if (!state.board[i]) { next = i; break; }
    }
    state.activeTarget = next == null ? null : { kind: 'board', slotIndex: next };
  }

  state.pendingRank = null;
  renderAll();
  updateKeyboard();
  setStatus('');
}

function backspace() {
  const t = state.activeTarget;

  if (state.pendingRank) {
    state.pendingRank = null;
    updateKeyboard();
    return;
  }

  if (!t) return;

  if (t.kind === 'board') {
    state.board[t.slotIndex] = null;
  } else {
    const p = state.players[t.playerIndex];
    p.hole[t.slotIndex] = null;
    syncPlayerInputFromHole(t.playerIndex);
  }

  renderAll();
  updateKeyboard();
}

function renderResults(eqs, playerInputs) {
  const results = $('results');
  results.innerHTML = '';

  for (let i = 0; i < eqs.length; i++) {
    const pct = eqs[i];
    const root = document.createElement('div');
    root.className = 'result';

    const top = document.createElement('div');
    top.className = 'result-top';

    const left = document.createElement('div');
    left.textContent = `Player ${i + 1}`;

    const right = document.createElement('div');
    right.textContent = `${pct.toFixed(2)}%`;

    top.appendChild(left);
    top.appendChild(right);

    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('div');
    fill.style.width = '0%';
    bar.appendChild(fill);

    const small = document.createElement('div');
    small.style.color = 'rgba(255,255,255,0.65)';
    small.style.fontSize = '12px';
    small.textContent = playerInputs[i];

    root.appendChild(top);
    root.appendChild(bar);
    root.appendChild(small);
    results.appendChild(root);

    // Let layout happen before animating.
    requestAnimationFrame(() => {
      fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    });
  }
}

function renderAll() {
  renderPlayers();
  renderBoard();
  updateActiveTargetLabel();
  updateKeyboard();

  // Try to restore active highlight after re-render.
  if (state.activeTarget) {
    const t = state.activeTarget;
    if (t.kind === 'board') {
      const slots = $('board-cards').querySelectorAll('.slot');
      slots[t.slotIndex]?.classList.add('active');
    } else {
      const playerEls = $('players').querySelectorAll('.player');
      const pe = playerEls[t.playerIndex];
      const slots = pe?.querySelectorAll('.slot');
      slots?.[t.slotIndex]?.classList.add('active');
    }
  }
}

async function main() {
  setStatus('Loading WASM…');

  try {
    await init();
    state.wasmReady = true;
    setStatus('WASM loaded.');
  } catch (e) {
    state.wasmReady = false;
    setStatus(`Failed to load WASM: ${e?.message || e}`, 'error');
  }

  // Initial UI state
  addPlayer();
  addPlayer();

  buildKeyboard();

  $('add-player').addEventListener('click', () => {
    addPlayer();
    renderAll();
  });

  $('clear-board').addEventListener('click', () => {
    state.board = [null, null, null, null, null];
    state.activeTarget = null;
    renderAll();
    setStatus('');
  });

  $('backspace').addEventListener('click', backspace);
  $('range-done').addEventListener('click', closeRangeMatrix);

  $('calculate').addEventListener('click', () => {
    if (!state.wasmReady) {
      setStatus('WASM not loaded. Run `make build` and reload.', 'error');
      return;
    }

    const iters = Number.parseInt($('iterations').value || '10000', 10);
    const board = compactCards(state.board);

    const playerInputs = state.players.map((p) => (p.input.value || '').trim());

    if (playerInputs.length < 2 || playerInputs.some((v) => v.length === 0)) {
      setStatus('Enter a hand or range for every player (at least 2).', 'error');
      return;
    }

    setStatus('Calculating…');

    try {
      const eqs = calculate_equity(playerInputs, board, Number.isFinite(iters) ? iters : 10000);
      renderResults(eqs, playerInputs);
      setStatus('Done.');
    } catch (e) {
      setStatus(`Error: ${e?.message || e}`, 'error');
    }
  });

  renderAll();
  setStatus(state.wasmReady ? 'WASM loaded.' : 'WASM not loaded.');
}

main();
