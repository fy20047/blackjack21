// Simple client-side Blackjack + API integration

const el = (id) => document.getElementById(id);

const state = {
  username: null,
  chips: 100,
  roundNo: 1,
  deck: [],
  playerHand: [],
  dealerHand: [],
  bet: 0,
  inRound: false,
};

function saveLocal() {
  localStorage.setItem('bj_state', JSON.stringify({ username: state.username, chips: state.chips, roundNo: state.roundNo }));
}

function loadLocal() {
  try {
    const raw = localStorage.getItem('bj_state');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.username) state.username = data.username;
    if (typeof data.chips === 'number') state.chips = data.chips;
    if (typeof data.roundNo === 'number') state.roundNo = data.roundNo;
  } catch {}
}

function updateUI() {
  el('chips').textContent = state.chips;
  el('playerName').textContent = state.username || '';
  el('roundNo').textContent = state.roundNo;
  el('resetBtn').classList.toggle('hidden', state.chips > 0);
  el('betInput').value = Math.min(Math.max(1, Math.floor(state.chips / 5) || 1), state.chips || 1);
}

function cardValue(card) { // card like 'A♠', '10♦', 'K♥'
  const rank = card.rank;
  if (['J','Q','K'].includes(rank)) return 10;
  if (rank === 'A') return 11; // treat as 11 initially
  return Number(rank);
}

function handScore(cards) {
  let total = 0; let aces = 0;
  for (const c of cards) { total += cardValue(c); if (c.rank === 'A') aces++; }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function makeDeck() {
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const suits = ['♠','♥','♦','♣'];
  const deck = [];
  for (const s of suits) for (const r of ranks) deck.push({rank: r, suit: s});
  // shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random()* (i+1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function renderHands(hideDealerHole = true) {
  const ph = el('playerHand');
  const dh = el('dealerHand');
  ph.innerHTML = '';
  dh.innerHTML = '';
  for (const c of state.playerHand) {
    const div = document.createElement('div');
    div.className = 'card';
    div.textContent = c.rank + c.suit;
    ph.appendChild(div);
  }
  state.dealerHand.forEach((c, idx) => {
    const div = document.createElement('div');
    div.className = 'card' + (hideDealerHole && idx === 1 ? ' back' : '');
    div.textContent = hideDealerHole && idx === 1 ? '' : (c.rank + c.suit);
    dh.appendChild(div);
  });
  el('playerScore').textContent = handScore(state.playerHand);
  el('dealerScore').textContent = hideDealerHole ? (cardValue(state.dealerHand[0])) : handScore(state.dealerHand);
}

function showBanner(type, bet, delta, chipsAfter) {
  const b = el('banner');
  b.className = 'banner ' + type;
  const label = type === 'win' ? '勝' : type === 'lose' ? '敗' : '平';
  b.textContent = `結算：${label}｜下注：${bet}｜盈虧：${delta >= 0 ? '+' : ''}${delta}｜結算後籌碼：${chipsAfter}`;
  b.classList.remove('hidden');
}

function hideBanner() { el('banner').className = 'banner hidden'; el('banner').textContent = ''; }

async function fetchJSON(url, options) {
  const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function refreshRecent() {
  if (!state.username) return;
  try {
    const data = await fetchJSON(`/api/rounds?username=${encodeURIComponent(state.username)}&limit=5`);
    const tbody = el('recentBody');
    tbody.innerHTML = '';
    data.forEach((r, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.roundNo}</td><td>${r.result}</td><td>${r.bet}</td><td>${r.delta >= 0 ? '+' : ''}${r.delta}</td><td>${r.chipsAfter}</td>`;
      tbody.appendChild(tr);
    });
  } catch (e) { console.warn('recent err', e); }
}

async function refreshLeaderboard() {
  try {
    const period = el('periodSelect').value;
    const data = await fetchJSON(`/api/leaderboard?period=${period}`);
    const top5 = data.top5 || [];
    const list = el('top5');
    list.innerHTML = '';
    top5.forEach((p, i) => {
      const li = document.createElement('li');
      if (period === 'all') li.textContent = `#${i+1} ${p.username} — 最高籌碼 ${p.maxChips}`;
      else li.textContent = `#${i+1} ${p.username} — 本期最高 ${p.periodMaxChips}`;
      list.appendChild(li);
    });
  } catch (e) { console.warn('lb err', e); }
}

async function bumpVisitor() {
  try {
    const res = await fetchJSON('/api/visitor/hit', { method: 'POST' });
    el('visitorCount').textContent = res.total;
  } catch (e) {
    try {
      const res = await fetchJSON('/api/visitor');
      el('visitorCount').textContent = res.total;
    } catch {}
  }
}

function dealInitial() {
  state.deck = makeDeck();
  state.playerHand = [ state.deck.pop(), state.deck.pop() ];
  state.dealerHand = [ state.deck.pop(), state.deck.pop() ];
  renderHands(true);
  state.inRound = true;
}

async function settle(result) {
  const bet = state.bet;
  let delta = 0;
  if (result === 'WIN') delta = bet;
  else if (result === 'LOSE') delta = -bet;
  else delta = 0;
  state.chips = Math.max(0, state.chips + delta);
  saveLocal();
  updateUI();
  const type = result === 'WIN' ? 'win' : result === 'LOSE' ? 'lose' : 'push';
  showBanner(type, bet, delta, state.chips);
  state.inRound = false;
  await refreshRecent();
  await refreshLeaderboard();

  // send round record
  try {
    await fetchJSON('/api/rounds', {
      method: 'POST',
      body: JSON.stringify({
        username: state.username,
        roundNo: state.roundNo,
        bet,
        result,
        delta,
        chipsAfter: state.chips,
      })
    });
  } catch (e) { console.warn('round post failed', e); }
  state.roundNo += 1;
  saveLocal();
  updateUI();
}

function attachEvents() {
  el('startBtn').addEventListener('click', async () => {
    const name = el('usernameInput').value.trim();
    if (!name) return alert('請輸入暱稱');
    state.username = name;
    saveLocal();
    el('loginPanel').classList.add('hidden');
    el('gamePanel').classList.remove('hidden');
    updateUI();
    await refreshRecent();
  });

  el('resetBtn').addEventListener('click', () => {
    state.chips = 100; state.roundNo = 1; saveLocal(); updateUI(); hideBanner();
    // 清空近五戰績顯示，讓回合視覺上重新開始
    const tbody = document.getElementById('recentBody');
    if (tbody) tbody.innerHTML = '';
  });

  // 玩家登出：清空狀態並回到暱稱輸入
  el('logoutPlayerBtn').addEventListener('click', () => {
    state.username = null;
    state.chips = 100;
    state.roundNo = 1;
    state.deck = [];
    state.playerHand = [];
    state.dealerHand = [];
    state.bet = 0;
    state.inRound = false;
    localStorage.removeItem('bj_state');
    hideBanner();
    const tbody = document.getElementById('recentBody');
    if (tbody) tbody.innerHTML = '';
    const input = document.getElementById('usernameInput');
    if (input) input.value = '';
    document.getElementById('gamePanel').classList.add('hidden');
    document.getElementById('loginPanel').classList.remove('hidden');
  });

  el('dealBtn').addEventListener('click', () => {
    if (!state.username) return alert('請先輸入暱稱');
    if (state.inRound) return;
    const v = Number(el('betInput').value || 0);
    if (!Number.isFinite(v) || v <= 0) return alert('請輸入有效下注');
    if (v > state.chips) return alert('籌碼不足');
    state.bet = v;
    hideBanner();
    dealInitial();
    el('actions').classList.remove('hidden');
  });

  el('hitBtn').addEventListener('click', async () => {
    if (!state.inRound) return;
    state.playerHand.push(state.deck.pop());
    renderHands(true);
    const ps = handScore(state.playerHand);
    if (ps > 21) { // bust
      renderHands(false);
      el('actions').classList.add('hidden');
      await settle('LOSE');
    }
  });

  el('standBtn').addEventListener('click', async () => {
    if (!state.inRound) return;
    // dealer plays
    let ds = handScore(state.dealerHand);
    while (ds < 17) { state.dealerHand.push(state.deck.pop()); ds = handScore(state.dealerHand); }
    renderHands(false);
    const ps = handScore(state.playerHand);
    ds = handScore(state.dealerHand);
    el('actions').classList.add('hidden');
    if (ds > 21 || ps > ds) await settle('WIN');
    else if (ps < ds) await settle('LOSE');
    else await settle('PUSH');
  });

  el('periodSelect').addEventListener('change', refreshLeaderboard);
}

async function boot() {
  loadLocal();
  attachEvents();
  updateUI();
  if (state.username) {
    el('loginPanel').classList.add('hidden');
    el('gamePanel').classList.remove('hidden');
    await refreshRecent();
  }
  await bumpVisitor();
  await refreshLeaderboard();
}

boot();
