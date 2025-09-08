async function fetchJSON(url, options) {
  const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const el = (id) => document.getElementById(id);

async function login() {
  const username = el('adminUser').value.trim();
  const password = el('adminPass').value;
  try {
    await fetchJSON('/api/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    el('authPanel').classList.add('hidden');
    el('adminPanel').classList.remove('hidden');
    await refreshPlayers();
    await refreshRounds();
  } catch (e) {
    alert('登入失敗');
  }
}

async function logout() {
  try {
    await fetchJSON('/api/admin/logout', { method: 'POST' });
  } catch {}
  el('adminPanel').classList.add('hidden');
  el('authPanel').classList.remove('hidden');
}

async function refreshPlayers() {
  const search = el('searchInput').value.trim();
  try {
    const players = await fetchJSON('/api/admin/players' + (search ? ('?search=' + encodeURIComponent(search)) : ''));
    const body = el('playersBody');
    body.innerHTML = '';
    players.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.username}</td><td>${p.maxChips}</td><td>${new Date(p.createdAt).toLocaleString()}</td>`;
      body.appendChild(tr);
    });
    // 在玩家列表載入後，若搜尋字串與玩家名稱完全相符，顯示該玩家最近回合
    const exact = search ? players.find(p => p.username.toLowerCase() === search.toLowerCase()) : null;
    await refreshRounds(exact ? exact.username : null);
  } catch (e) { console.warn('players err', e); }
}

async function refreshRounds(username) {
  const body = el('roundsBody');
  const title = el('roundsTitle');
  body.innerHTML = '';
  title.textContent = '';
  if (!username) { return; }
  try {
    const limit = Number(el('pageSize').value || 100);
    const rounds = await fetchJSON(`/api/admin/rounds?username=${encodeURIComponent(username)}&limit=${limit}`);
    const body = el('roundsBody');
    body.innerHTML = '';
    title.textContent = `(玩家：${username}，筆數：${rounds.length})`;
    rounds.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.player.username}</td><td>${r.roundNo}</td><td>${r.bet}</td><td>${r.result}</td><td>${r.delta >=0 ? '+' : ''}${r.delta}</td><td>${r.chipsAfter}</td><td>${new Date(r.createdAt).toLocaleString()}</td>`;
      body.appendChild(tr);
    });
  } catch (e) { console.warn('rounds err', e); }
}

document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('searchBtn').addEventListener('click', refreshPlayers);
document.getElementById('pageSize').addEventListener('change', async () => {
  const search = el('searchInput').value.trim();
  if (!search) return; // 未搜尋不顯示回合
  await refreshPlayers(); // 會自動帶入精準比對後刷新 rounds
});
