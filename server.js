const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const store = require('./lib/store');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.SESSION_SECRET || 'xolven-dev-secret-change-me';
const COOKIE_NAME = 'xolven_token';
const TOKEN_MAX_AGE = 1000 * 60 * 60 * 8;

app.use(express.json());
app.use(cookieParser());

function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not authenticated' });
    return res.redirect('/login.html');
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not authenticated' });
    return res.redirect('/login.html');
  }
}

function requireAdmin(req, res, next) {
  const user = store.findUserById(req.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = email && store.findUserByEmail(email);
  if (!user || !store.verifyPassword(user, password || '')) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '8h' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_MAX_AGE,
  });
  res.json({ user: store.publicUser(user) });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  const user = store.findUserById(req.userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: store.publicUser(user) });
});

app.get('/api/clients', requireAuth, (req, res) => {
  const user = store.findUserById(req.userId);
  const clients = store.getClientsForUser(user).map((c) => ({
    id: c.id,
    name: c.name,
    initials: c.initials,
    avatarBg: c.avatarBg,
    lastMessage: c.lastMessage,
    hasPending: c.hasPending,
  }));
  res.json({ clients });
});

app.get('/api/clients/:id', requireAuth, (req, res) => {
  const user = store.findUserById(req.userId);
  const client = store.getClientForUser(user, req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json({ client: { ...client, ownerName: store.ownerName(client.ownerId) } });
});

app.get('/api/team', requireAuth, requireAdmin, (req, res) => {
  res.json({ team: store.getTeamOverview() });
});

app.get('/api/handover/:employeeId', requireAuth, requireAdmin, (req, res) => {
  const summary = store.getHandoverSummary(req.params.employeeId);
  if (!summary) return res.status(404).json({ error: 'Employee not found' });
  res.json({ handover: summary });
});

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index.html', (req, res) => res.redirect('/'));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Xolven.Si backend listening on port ${PORT}`);
});
