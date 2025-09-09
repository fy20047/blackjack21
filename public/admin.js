// 共用的 fetch JSON 包裝（自動帶 cookie 與 JSON 標頭）
async function fetchJSON(url, options) {
  const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const el = (id) => document.getElementById(id);

// 分頁狀態（後台最近回合）
const pager = {
  currentPage: 1,
  total: 0,
  limit: 100,
  username: null,
};

// 管理員登入：成功後顯示後台面板
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

// 管理員登出：清除 session，回到登入面板
async function logout() {
  try {
    await fetchJSON('/api/admin/logout', { method: 'POST' });
  } catch {}
  el('adminPanel').classList.add('hidden');
  el('authPanel').classList.remove('hidden');
}

// 載入玩家列表；若搜尋字串與某玩家名稱完全相符，會同時載入其最近回合
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
    pager.username = exact ? exact.username : null;
    pager.currentPage = 1; // 搜尋變動時重置到第 1 頁
    await refreshRounds(pager.username);
  } catch (e) { console.warn('players err', e); }
}

// 依 username 讀取最近回合；未提供 username 則不顯示
async function refreshRounds(username) {
  const body = el('roundsBody');
  const title = el('roundsTitle');
  body.innerHTML = '';
  title.textContent = '';
  if (!username) { return; }
  try {
    pager.limit = Number(el('pageSize').value || 100);
    const data = await fetchJSON(`/api/admin/rounds?username=${encodeURIComponent(username)}&limit=${pager.limit}&page=${pager.currentPage}`);
    const { rounds, total, page, limit } = data;
    pager.total = total;
    pager.currentPage = page;
    const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
    body.innerHTML = '';
    title.textContent = `(玩家：${username}，共 ${total} 筆)`;
    rounds.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.player.username}</td><td>${r.roundNo}</td><td>${r.bet}</td><td>${r.result}</td><td>${r.delta >=0 ? '+' : ''}${r.delta}</td><td>${r.chipsAfter}</td><td>${new Date(r.createdAt).toLocaleString()}</td>`;
      body.appendChild(tr);
    });
    // 更新分頁 UI
    el('pageInfo').textContent = `第 ${pager.currentPage}/${totalPages} 頁`;
    el('prevPage').disabled = pager.currentPage <= 1;
    el('nextPage').disabled = pager.currentPage >= totalPages;
  } catch (e) { console.warn('rounds err', e); }
}

// 事件綁定
document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('searchBtn').addEventListener('click', refreshPlayers);
document.getElementById('pageSize').addEventListener('change', async () => {
  const search = el('searchInput').value.trim();
  if (!search) return; // 未搜尋不顯示回合
  await refreshPlayers(); // 改變頁大小時重抓並回到第 1 頁
});

// 分頁按鈕事件
document.getElementById('prevPage').addEventListener('click', async () => {
  if (!pager.username) return;
  if (pager.currentPage <= 1) return;
  pager.currentPage -= 1;
  await refreshRounds(pager.username);
});
document.getElementById('nextPage').addEventListener('click', async () => {
  if (!pager.username) return;
  const totalPages = Math.max(1, Math.ceil((pager.total || 0) / (pager.limit || 1)));
  if (pager.currentPage >= totalPages) return;
  pager.currentPage += 1;
  await refreshRounds(pager.username);
});
