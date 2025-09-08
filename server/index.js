const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const path = require('path');

dotenv.config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'admin_session';
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 24);
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';

app.use(cors({
  origin: (origin, cb) => cb(null, ALLOW_ORIGIN === '*' ? true : origin === ALLOW_ORIGIN),
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '..', 'public')));

async function ensureBootData() {
  // VisitorStat singleton id = 1
  await prisma.visitorStat.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, total: 0 }
  });

  // Admin default user: admin/admin1234 if no admin exists
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

// Visitor stats
app.get('/api/visitor', async (req, res) => {
  try {
    const stat = await prisma.visitorStat.findUnique({ where: { id: 1 } });
    res.json({ total: stat?.total ?? 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch visitor stat' });
  }
});

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

// Admin auth
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

// Admin data views
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

app.get('/api/admin/rounds', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const username = (req.query.username || '').toString().trim();
    if (!username) {
      // 未搜尋時不回傳回合，依需求只顯示玩家列表
      return res.json([]);
    }
    const player = await prisma.player.findUnique({ where: { username } });
    if (!player) return res.json([]);
    const rounds = await prisma.round.findMany({
      where: { playerId: player.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { player: true }
    });
    res.json(rounds);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch rounds' });
  }
});

// Rounds API
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

// Leaderboard API
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

    // Period-based: compute max chipsAfter per player within timeframe
    // Use groupBy Round
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

// Fallback to index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

app.listen(PORT, async () => {
  await ensureBootData();
  console.log(`Server listening on http://localhost:${PORT}`);
});
