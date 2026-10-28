require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const store = require('./lib/store');
const ai = require('./lib/ai');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.SESSION_SECRET || 'xolven-dev-secret-change-me';
const COOKIE_NAME = 'xolven_token';
const TOKEN_MAX_AGE = 1000 * 60 * 60 * 8;

// Changes on every deploy (process restart), so index.html always points at a
// fresh ?v= URL for styles.css/app.js. This beats stale CSS/JS even when a
// CDN or browser ignores Cache-Control headers, because the URL itself changes.
const ASSET_VERSION = Date.now();
const INDEX_HTML_PATH = path.join(__dirname, 'public', 'index.html');

function renderIndexHtml() {
  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  return html
    .replace('href="styles.css"', 'href="styles.css?v=' + ASSET_VERSION + '"')
    .replace('src="app.js"', 'src="app.js?v=' + ASSET_VERSION + '"');
}

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

app.post('/api/clients/:id/regenerate-summary', requireAuth, async (req, res) => {
  const user = store.findUserById(req.userId);
  const client = store.getClientForUser(user, req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  try {
    const result = await ai.generateClientProfile(client);
    const updated = store.updateClientProfile(client.id, result);
    res.json({ client: { ...updated, ownerName: store.ownerName(updated.ownerId) } });
  } catch (err) {
    console.error('AI generation failed:', err.message);
    res.status(502).json({ error: 'Could not generate summary right now. Check the AI API key and try again.' });
  }
});

app.get('/api/team', requireAuth, requireAdmin, (req, res) => {
  res.json({ team: store.getTeamOverview() });
});

app.get('/api/handover/:employeeId', requireAuth, requireAdmin, (req, res) => {
  const summary = store.getHandoverSummary(req.params.employeeId);
  if (!summary) return res.status(404).json({ error: 'Employee not found' });
  res.json({ handover: summary });
});

app.post('/api/me/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const user = store.findUserById(req.userId);
  if (!user || !store.verifyPassword(user, currentPassword || '')) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  store.updatePassword(user.id, newPassword);
  res.json({ ok: true });
});

app.get('/api/users', requireAuth, requireAdmin, (req, res) => {
  res.json({ users: store.listUsers() });
});

app.post('/api/users', requireAuth, requireAdmin, (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Name, email and a password of at least 6 characters are required' });
  }
  const result = store.createTeamMember({ name, email, password });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.delete('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  const result = store.deleteTeamMember(req.params.id);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.get('/', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.type('html').send(renderIndexHtml());
});

app.get('/index.html', (req, res) => res.redirect('/'));

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => res.set('Cache-Control', 'no-cache'),
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Xolven.Si backend listening on port ${PORT}`);
});
