// 伺服器端主程式：設定 Express、API 路由與資料庫操作
const express = require('express'); // 建立 web 伺服器與路由
const cors = require('cors'); // 設定跨域
const cookieParser = require('cookie-parser'); // 讀 Cookie → req.cookies
const dotenv = require('dotenv'); // 讀 .env
const crypto = require('crypto'); // 產 token（未用到）
const bcrypt = require('bcryptjs'); // 密碼雜湊
const path = require('path'); // 檔案路徑

dotenv.config(); // 把 .env 內容載入 process.env

// Prisma 用於連線 SQLite 並操作資料表
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();

// 環境設定
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'admin_session';
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 24);
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';

// 跨域設定（預設允許任意來源），並允許 Cookie
app.use(cors({
  origin: (origin, cb) => cb(null, ALLOW_ORIGIN === '*' ? true : origin === ALLOW_ORIGIN),
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// 提供前端靜態資源
app.use(express.static(path.join(__dirname, '..', 'public')));

// 啟動時初始化必要資料（訪客統計、預設管理員）
async function ensureBootData() {
  // 訪客統計單例 id = 1，不存在就建立
  await prisma.visitorStat.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, total: 0 }
  });

  // 若無管理員則建立預設帳號：admin/admin1234
  const count = await prisma.adminUser.count();
  if (count === 0) {
    const username = 'admin';
    const password = 'admin1234';
    const hash = await bcrypt.hash(password, 10);
    await prisma.adminUser.create({ data: { username, passwordHash: hash } });
    console.log('Seeded default admin user: admin/admin1234');
  }
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

// 中介層：驗證管理員 Session，保護後台資料 API
async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies[SESSION_COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    const now = new Date();
    const session = await prisma.adminSession.findUnique({ where: { token } });
    if (!session) return res.status(401).json({ error: 'Invalid session' });
    if (session.expiresAt && session.expiresAt < now) {
      await prisma.adminSession.delete({ where: { id: session.id } });
      return res.status(401).json({ error: 'Session expired' });
    }
    req.adminId = session.adminId;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// 訪客統計：查詢
app.get('/api/visitor', async (req, res) => {
  try {
    const stat = await prisma.visitorStat.findUnique({ where: { id: 1 } });
    res.json({ total: stat?.total ?? 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch visitor stat' });
  }
});

// 訪客統計：累加 +1
app.post('/api/visitor/hit', async (req, res) => {
  try {
    const stat = await prisma.visitorStat.update({
      where: { id: 1 },
      data: { total: { increment: 1 } }
    });
    res.json({ total: stat.total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update visitor stat' });
  }
});

// 管理員登入：驗證帳密後發放 Session Cookie
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Missing username/password' });
    const user = await prisma.adminUser.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = addHours(new Date(), SESSION_TTL_HOURS);
    await prisma.adminSession.create({ data: { token, adminId: user.id, expiresAt } });
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      expires: expiresAt
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 管理員登出：清除 Session Cookie 與資料
app.post('/api/admin/logout', requireAdmin, async (req, res) => {
  try {
    const token = req.cookies[SESSION_COOKIE_NAME];
    await prisma.adminSession.deleteMany({ where: { token } });
    res.clearCookie(SESSION_COOKIE_NAME);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// 後台：玩家列表（支援搜尋 username 模糊查詢）
app.get('/api/admin/players', requireAdmin, async (req, res) => {
  try {
    const search = (req.query.search || '').toString().trim();
    const where = search ? { username: { contains: search } } : {};
    const players = await prisma.player.findMany({ where, orderBy: { maxChips: 'desc' }, take: 100 });
    res.json(players);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// 後台：最近回合（只有當 username 完全相符時才回傳）
app.get('/api/admin/rounds', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const page = Math.max(Number(req.query.page || 1), 1);
    const username = (req.query.username || '').toString().trim();
    if (!username) {
      // 未搜尋時不回傳回合，依需求只顯示玩家列表
      return res.json({ rounds: [], total: 0, page, limit });
    }
    const player = await prisma.player.findUnique({ where: { username } });
    if (!player) return res.json({ rounds: [], total: 0, page, limit });
    const total = await prisma.round.count({ where: { playerId: player.id } });
    const rounds = await prisma.round.findMany({
      where: { playerId: player.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: { player: true }
    });
    res.json({ rounds, total, page, limit });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch rounds' });
  }
});

// 前台：取得玩家最近回合（首頁近五戰績）
app.get('/api/rounds', async (req, res) => {
  try {
    const username = (req.query.username || '').toString().trim();
    if (!username) return res.status(400).json({ error: 'Missing username' });
    const limit = Math.min(Number(req.query.limit || 5), 50);
    const player = await prisma.player.findUnique({ where: { username } });
    if (!player) return res.json([]);
    const rounds = await prisma.round.findMany({
      where: { playerId: player.id },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    res.json(rounds);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch rounds' });
  }
});

// 前台：寫入一筆回合紀錄並（必要時）更新玩家歷史最高籌碼
app.post('/api/rounds', async (req, res) => {
  try {
    const { username, roundNo, bet, result, delta, chipsAfter } = req.body || {};
    if (!username || bet == null || !result || delta == null || chipsAfter == null) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const normalizedResult = (result || '').toString().toUpperCase();
    if (!['WIN', 'LOSE', 'PUSH'].includes(normalizedResult)) {
      return res.status(400).json({ error: 'Invalid result' });
    }

    const player = await prisma.player.upsert({
      where: { username },
      update: {},
      create: { username, maxChips: 100 }
    });

    const round = await prisma.round.create({
      data: {
        roundNo: Number(roundNo || 0),
        bet: Number(bet),
        result: normalizedResult,
        delta: Number(delta),
        chipsAfter: Number(chipsAfter),
        playerId: player.id
      }
    });

    // Update maxChips if needed
    if (Number(chipsAfter) > player.maxChips) {
      await prisma.player.update({ where: { id: player.id }, data: { maxChips: Number(chipsAfter) } });
    }

    res.json(round);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to record round' });
  }
});

// 排行榜 API：
// - all：回傳 Player.maxChips 排名前 10
// - day/week/month：以該期間 Round.chipsAfter 的最大值分組排序
app.get('/api/leaderboard', async (req, res) => {
  try {
    const period = (req.query.period || 'all').toString();
    const now = new Date();
    let since = null;
    if (period === 'day') since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    else if (period === 'week') since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (period === 'month') since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (!since) {
      // All-time: based on Player.maxChips
      const top10 = await prisma.player.findMany({ orderBy: { maxChips: 'desc' }, take: 10 });
      res.json({ top10, top5: top10.slice(0, 5) });
      return;
    }

    // 區間排行：針對該期間內各玩家找出 chipsAfter 最大值排序
    const grouped = await prisma.round.groupBy({
      by: ['playerId'],
      where: { createdAt: { gte: since } },
      _max: { chipsAfter: true },
      orderBy: { _max: { chipsAfter: 'desc' } },
      take: 10
    });
    const playerIds = grouped.map(g => g.playerId);
    const players = await prisma.player.findMany({ where: { id: { in: playerIds } } });
    const playerMap = new Map(players.map(p => [p.id, p]));
    const top10 = grouped.map(g => ({
      id: g.playerId,
      username: playerMap.get(g.playerId)?.username || 'Unknown',
      periodMaxChips: g._max.chipsAfter || 0,
      maxChips: playerMap.get(g.playerId)?.maxChips || 0
    }));
    res.json({ top10, top5: top10.slice(0, 5) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to compute leaderboard' });
  }
});

// 首頁與後台頁面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

app.listen(PORT, async () => {
  await ensureBootData();
  console.log(`Server listening on http://localhost:${PORT}`);
});
